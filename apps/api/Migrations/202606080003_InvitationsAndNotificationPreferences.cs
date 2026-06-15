using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606080003_InvitationsAndNotificationPreferences")]
public partial class InvitationsAndNotificationPreferences : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS clinic_invitations (
                "Id" character varying(120) NOT NULL,
                "ClinicId" character varying(120) NOT NULL,
                "Email" character varying(240) NOT NULL,
                "FullName" character varying(200) NOT NULL,
                "Role" character varying(60) NOT NULL,
                "Specialty" character varying(80) NOT NULL,
                "LicenseNumber" character varying(120) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "InvitedByUserId" character varying(120) NOT NULL,
                "AcceptedUserId" character varying(120),
                "ExpiresAt" timestamp with time zone NOT NULL,
                "AcceptedAt" timestamp with time zone,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_clinic_invitations" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS notification_preferences (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "Channel" character varying(40) NOT NULL,
                "Enabled" boolean NOT NULL,
                "AppointmentUpdates" boolean NOT NULL,
                "ClinicUpdates" boolean NOT NULL,
                "ReminderUpdates" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("Id")
            );

            CREATE INDEX IF NOT EXISTS "IX_clinic_invitations_ClinicId_Status_CreatedAt" ON clinic_invitations ("ClinicId", "Status", "CreatedAt");
            CREATE INDEX IF NOT EXISTS "IX_clinic_invitations_Email_Status" ON clinic_invitations ("Email", "Status");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_notification_preferences_UserId_Channel" ON notification_preferences ("UserId", "Channel");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
