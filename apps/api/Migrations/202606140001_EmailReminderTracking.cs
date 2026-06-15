using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606140001_EmailReminderTracking")]
public partial class EmailReminderTracking : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Deduplicacion de correos transaccionales en segundo plano:
            -- ReminderSentAt marca cuando se envio el recordatorio de 24h de una cita;
            -- ExpiryReminderSentAt marca cuando se aviso que una invitacion esta por expirar.
            -- null significa que el correo aun no se ha enviado.
            ALTER TABLE appointments
                ADD COLUMN IF NOT EXISTS "ReminderSentAt" timestamp with time zone NULL;

            ALTER TABLE clinic_invitations
                ADD COLUMN IF NOT EXISTS "ExpiryReminderSentAt" timestamp with time zone NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE appointments DROP COLUMN IF EXISTS "ReminderSentAt";
            ALTER TABLE clinic_invitations DROP COLUMN IF EXISTS "ExpiryReminderSentAt";
            """);
    }
}
