using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace HealthHub.Api.Infrastructure;

/// <summary>
/// EF Core ValueConverter que cifra datos clínicos PHI en reposo usando AES-256-GCM
/// (misma lógica que TokenEncryptionService, que ya protege los tokens OAuth de MP).
///
/// Comportamiento de degradación (fail-safe para datos clínicos):
///   - Escritura: siempre cifra.  Sin clave válida en producción, lanza — fail closed.
///   - Lectura: si Unprotect devuelve null (clave ausente, formato antiguo, etc.) retorna
///     el valor tal como está en BD para no bloquear acceso a datos creados antes del
///     cifrado; el caller recibe texto plano o ciphertext sin descifrar según el caso.
///     Esto es intencional durante el período de backfill.
/// </summary>
public sealed class ClinicalEncryptionConverter : ValueConverter<string, string>
{
    public ClinicalEncryptionConverter(TokenEncryptionService enc)
        : base(
            // Model → Store: cifrar al escribir
            plaintext => enc.Protect(plaintext),
            // Store → Model: descifrar al leer; devuelve texto como está si falla
            ciphertext => enc.Unprotect(ciphertext) ?? ciphertext)
    {
    }

    /// <summary>
    /// Verificación de ida y vuelta mínima (sin framework): cifra un valor de referencia,
    /// lo descifra, y comprueba que el resultado coincide con el original.
    /// Lanza <see cref="InvalidOperationException"/> si la verificación falla.
    /// Llamar una vez al arranque (p.ej. en Development) para detectar configuraciones rotas.
    /// </summary>
    public static void SelfCheck(TokenEncryptionService enc)
    {
        const string original = "Clinixa PHI round-trip check 2026";

        var ciphertext = enc.Protect(original);

        if (string.IsNullOrEmpty(ciphertext) || ciphertext == original)
        {
            throw new InvalidOperationException(
                "[PHI SelfCheck] Protect devolvió vacío o no cifró el texto.");
        }

        var decrypted = enc.Unprotect(ciphertext);

        if (decrypted != original)
        {
            throw new InvalidOperationException(
                $"[PHI SelfCheck] El ciclo encrypt→decrypt no coincide. " +
                $"Esperado: '{original}', obtenido: '{decrypted ?? "(null)"}'.");
        }

        Console.WriteLine("[PHI SelfCheck] OK — cifrado clínico AES-256-GCM funcionando correctamente.");
    }
}
