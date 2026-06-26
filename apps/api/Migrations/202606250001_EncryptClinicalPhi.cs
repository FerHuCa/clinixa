using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

/// <summary>
/// Amplía las columnas de texto clínico PHI a tipo `text` (sin límite de longitud).
/// Esto es necesario porque el ciphertext AES-256-GCM codificado en base64 es
/// ~1.37x el tamaño del plaintext + 28 bytes fijos de overhead (nonce 12 + tag 16),
/// por lo que los límites anteriores (Subjective/Objective/Assessment/Plan: 3000 chars;
/// Summary: 1200 chars) quedarían cortos para entradas cercanas al tope.
///
/// No ejecutar backfill aquí: ver scripts/backfill-phi-encryption.sql para el
/// procedimiento de re-cifrado de filas antiguas. Nota: el piloto no tiene datos
/// clínicos reales aún (2026-06-25), así que esta migración es segura sin backfill previo.
/// </summary>
[DbContext(typeof(HealthHubDbContext))]
[Migration("202606250001_EncryptClinicalPhi")]
public partial class EncryptClinicalPhi : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- SOAP notes: ampliar columnas clínicas PHI de varchar(3000) a text
            ALTER TABLE soap_notes
                ALTER COLUMN "Subjective"  TYPE text,
                ALTER COLUMN "Objective"   TYPE text,
                ALTER COLUMN "Assessment"  TYPE text,
                ALTER COLUMN "Plan"        TYPE text;

            -- Patient records: ampliar Summary de varchar(1200) a text
            ALTER TABLE patient_records
                ALTER COLUMN "Summary" TYPE text;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // ADVERTENCIA: reducir de text a varchar trunca datos cifrados
        // si el ciphertext supera el límite original. Solo seguro si
        // primero se descifran y las filas caben en el límite.
        migrationBuilder.Sql("""
            ALTER TABLE soap_notes
                ALTER COLUMN "Subjective"  TYPE character varying(3000),
                ALTER COLUMN "Objective"   TYPE character varying(3000),
                ALTER COLUMN "Assessment"  TYPE character varying(3000),
                ALTER COLUMN "Plan"        TYPE character varying(3000);

            ALTER TABLE patient_records
                ALTER COLUMN "Summary" TYPE character varying(1200);
            """);
    }
}
