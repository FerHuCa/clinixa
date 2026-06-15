using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606080004_ClinicInvitationTokens")]
public partial class ClinicInvitationTokens : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE clinic_invitations ADD COLUMN IF NOT EXISTS "Token" character varying(160);

            UPDATE clinic_invitations
            SET "Token" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
            WHERE "Token" IS NULL OR "Token" = '';

            ALTER TABLE clinic_invitations ALTER COLUMN "Token" SET NOT NULL;

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_clinic_invitations_Token" ON clinic_invitations ("Token");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
