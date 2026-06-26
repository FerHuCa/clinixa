using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

// Migración: agrega los campos legales obligatorios para la validez jurídica de una receta médica.
//
// Campos añadidos a la tabla prescriptions:
//   PrescriberName     – Nombre completo del médico (estampado al emitir)
//   PrescriberLicense  – Cédula profesional COFEPRIS/DGP (estampada al emitir)
//   PatientFullName    – Nombre completo del paciente (estampado al emitir)
//   PatientIdentifier  – CURP, fecha de nacimiento u otro identificador del paciente (opcional)
//   Route              – Vía de administración: oral, IV, tópica, etc.
//
// Todas las columnas usan DEFAULT '' para registros históricos que no tienen estos datos.
// Los registros nuevos siempre recibirán valores correctos gracias al endpoint actualizado.
[DbContext(typeof(HealthHubDbContext))]
[Migration("202606250002_PrescriptionLegalFields")]
public partial class PrescriptionLegalFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE prescriptions
                ADD COLUMN IF NOT EXISTS "PrescriberName"    character varying(200) NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS "PrescriberLicense" character varying(80)  NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS "PatientFullName"   character varying(200) NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS "PatientIdentifier" character varying(120) NULL,
                ADD COLUMN IF NOT EXISTS "Route"             character varying(100) NOT NULL DEFAULT '';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE prescriptions
                DROP COLUMN IF EXISTS "PrescriberName",
                DROP COLUMN IF EXISTS "PrescriberLicense",
                DROP COLUMN IF EXISTS "PatientFullName",
                DROP COLUMN IF EXISTS "PatientIdentifier",
                DROP COLUMN IF EXISTS "Route";
            """);
    }
}
