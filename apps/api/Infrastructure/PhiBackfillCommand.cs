using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace HealthHub.Api.Infrastructure;

/// <summary>
/// Comando de backfill para re-cifrar filas de texto clínico PHI creadas antes de que
/// se introdujeran los ValueConverters en el DbContext.
///
/// Invocación: dotnet run -- backfill-phi
///
/// Seguridad:
///   - Idempotente: filas ya cifradas (Unprotect exitoso) se omiten.
///   - Opera en lotes de 100 filas para minimizar el tamaño de transacción.
///   - Requiere que ENCRYPTION_KEY / Security:EncryptionKey esté configurado.
///
/// ADVERTENCIA: no ejecutar contra producción con datos reales sin backup y ventana de
/// mantenimiento. Nota: el piloto Clinixa (2026-06-25) no tiene aún datos clínicos reales
/// en producción, por lo que este comando es principalmente para dev/staging.
/// </summary>
public static class PhiBackfillCommand
{
    private const int BatchSize = 100;

    public static async Task<int> RunAsync(IServiceProvider services)
    {
        var enc = services.GetRequiredService<TokenEncryptionService>();

        if (!enc.IsConfigured)
        {
            Console.Error.WriteLine("[backfill-phi] ERROR: ENCRYPTION_KEY no está configurado. Abortando.");
            return 1;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HealthHubDbContext>();

        // Trabajar directamente con SQL raw para evitar que el ValueConverter
        // intente descifrar valores que aún son plaintext (podría producir texto incorrecto
        // al devolver el valor tal cual). Leemos la columna raw, decidimos si cifrar, y
        // escribimos el ciphertext de vuelta ignorando el converter.
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();

        int soapUpdated = 0, recordsUpdated = 0;

        // --- soap_notes ---
        Console.WriteLine("[backfill-phi] Procesando soap_notes...");
        var soapIds = await db.SoapNotes.AsNoTracking().Select(n => n.Id).ToListAsync();

        foreach (var batch in Chunk(soapIds, BatchSize))
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            foreach (var id in batch)
            {
                await using var cmd = conn.CreateCommand();
                cmd.Transaction = tx.GetDbTransaction();
                cmd.CommandText = """
                    SELECT "Subjective", "Objective", "Assessment", "Plan"
                    FROM soap_notes WHERE "Id" = @id
                    """;
                var pId = cmd.CreateParameter();
                pId.ParameterName = "@id";
                pId.Value = id;
                cmd.Parameters.Add(pId);

                string? subj = null, obj = null, assess = null, plan = null;

                await using (var reader = await cmd.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        subj   = reader.IsDBNull(0) ? null : reader.GetString(0);
                        obj    = reader.IsDBNull(1) ? null : reader.GetString(1);
                        assess = reader.IsDBNull(2) ? null : reader.GetString(2);
                        plan   = reader.IsDBNull(3) ? null : reader.GetString(3);
                    }
                }

                var encSubj   = EncryptIfNeeded(enc, subj);
                var encObj    = EncryptIfNeeded(enc, obj);
                var encAssess = EncryptIfNeeded(enc, assess);
                var encPlan   = EncryptIfNeeded(enc, plan);

                // Solo escribir si algún campo cambió
                if (encSubj != subj || encObj != obj || encAssess != assess || encPlan != plan)
                {
                    await using var upd = conn.CreateCommand();
                    upd.Transaction = tx.GetDbTransaction();
                    upd.CommandText = """
                        UPDATE soap_notes
                        SET "Subjective"  = @s,
                            "Objective"   = @o,
                            "Assessment"  = @a,
                            "Plan"        = @p,
                            "UpdatedAt"   = NOW()
                        WHERE "Id" = @id
                        """;
                    AddParam(upd, "@s",  encSubj   ?? string.Empty);
                    AddParam(upd, "@o",  encObj    ?? string.Empty);
                    AddParam(upd, "@a",  encAssess ?? string.Empty);
                    AddParam(upd, "@p",  encPlan   ?? string.Empty);
                    AddParam(upd, "@id", id);
                    await upd.ExecuteNonQueryAsync();
                    soapUpdated++;
                }
            }
            await tx.CommitAsync();
        }

        // --- patient_records ---
        Console.WriteLine("[backfill-phi] Procesando patient_records...");
        var recordIds = await db.PatientRecords.AsNoTracking().Select(r => r.Id).ToListAsync();

        foreach (var batch in Chunk(recordIds, BatchSize))
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            foreach (var id in batch)
            {
                await using var cmd = conn.CreateCommand();
                cmd.Transaction = tx.GetDbTransaction();
                cmd.CommandText = """
                    SELECT "Summary" FROM patient_records WHERE "Id" = @id
                    """;
                var pId = cmd.CreateParameter();
                pId.ParameterName = "@id";
                pId.Value = id;
                cmd.Parameters.Add(pId);

                string? summary = null;
                await using (var reader = await cmd.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        summary = reader.IsDBNull(0) ? null : reader.GetString(0);
                    }
                }

                var encSummary = EncryptIfNeeded(enc, summary);

                if (encSummary != summary)
                {
                    await using var upd = conn.CreateCommand();
                    upd.Transaction = tx.GetDbTransaction();
                    upd.CommandText = """
                        UPDATE patient_records
                        SET "Summary"   = @s,
                            "UpdatedAt" = NOW()
                        WHERE "Id" = @id
                        """;
                    AddParam(upd, "@s",  encSummary ?? string.Empty);
                    AddParam(upd, "@id", id);
                    await upd.ExecuteNonQueryAsync();
                    recordsUpdated++;
                }
            }
            await tx.CommitAsync();
        }

        Console.WriteLine($"[backfill-phi] Completo. soap_notes cifradas: {soapUpdated}, patient_records cifradas: {recordsUpdated}");
        return 0;
    }

    // Cifra el valor solo si no está ya cifrado (Unprotect exitoso = ya es ciphertext).
    private static string? EncryptIfNeeded(TokenEncryptionService enc, string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        // Si Unprotect tiene éxito, el valor ya es ciphertext válido → omitir.
        var decrypted = enc.Unprotect(value);
        if (decrypted is not null)
        {
            return value; // ya cifrado
        }

        // Valor en plaintext → cifrar.
        return enc.Protect(value);
    }

    private static void AddParam(System.Data.Common.DbCommand cmd, string name, string value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value;
        cmd.Parameters.Add(p);
    }

    private static IEnumerable<IEnumerable<T>> Chunk<T>(IEnumerable<T> source, int size)
    {
        var list = source.ToList();
        for (int i = 0; i < list.Count; i += size)
        {
            yield return list.Skip(i).Take(size);
        }
    }
}
