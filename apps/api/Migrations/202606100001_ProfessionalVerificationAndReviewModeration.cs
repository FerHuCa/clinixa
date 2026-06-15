using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606100001_ProfessionalVerificationAndReviewModeration")]
public partial class ProfessionalVerificationAndReviewModeration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Verificacion de cedula profesional: pending | verified | rejected.
            ALTER TABLE professionals
                ADD COLUMN IF NOT EXISTS "VerificationStatus" character varying(40) NOT NULL DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS "LicenseVerifiedAt" timestamp with time zone,
                ADD COLUMN IF NOT EXISTS "LicenseVerifiedBy" character varying(120),
                ADD COLUMN IF NOT EXISTS "WhatsappNumber" character varying(40) NOT NULL DEFAULT '';

            CREATE INDEX IF NOT EXISTS "IX_professionals_VerificationStatus"
                ON professionals ("VerificationStatus");

            -- Profesionales ya publicados antes de esta migracion se consideran verificados
            -- para no romper el marketplace existente (datos demo/seed).
            UPDATE professionals
            SET "VerificationStatus" = 'verified',
                "LicenseVerifiedAt" = NOW(),
                "LicenseVerifiedBy" = 'migration-202606100001'
            WHERE "Status" = 'active' AND "VerificationStatus" = 'pending';

            -- Moderacion de resenas: solo ocultar (sin edicion ni borrado fisico).
            ALTER TABLE reviews
                ADD COLUMN IF NOT EXISTS "ModeratedByUserId" character varying(120),
                ADD COLUMN IF NOT EXISTS "ModeratedAt" timestamp with time zone,
                ADD COLUMN IF NOT EXISTS "ModerationReason" character varying(500) NOT NULL DEFAULT '';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE professionals
                DROP COLUMN IF EXISTS "VerificationStatus",
                DROP COLUMN IF EXISTS "LicenseVerifiedAt",
                DROP COLUMN IF EXISTS "LicenseVerifiedBy",
                DROP COLUMN IF EXISTS "WhatsappNumber";

            ALTER TABLE reviews
                DROP COLUMN IF EXISTS "ModeratedByUserId",
                DROP COLUMN IF EXISTS "ModeratedAt",
                DROP COLUMN IF EXISTS "ModerationReason";
            """);
    }
}
