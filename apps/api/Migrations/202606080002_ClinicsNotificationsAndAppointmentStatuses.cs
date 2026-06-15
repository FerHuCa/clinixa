using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606080002_ClinicsNotificationsAndAppointmentStatuses")]
public partial class ClinicsNotificationsAndAppointmentStatuses : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS clinics (
                "Id" character varying(120) NOT NULL,
                "Name" character varying(200) NOT NULL,
                "LegalName" character varying(240) NOT NULL,
                "TaxId" character varying(80) NOT NULL,
                "Location" character varying(240) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_clinics" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS clinic_memberships (
                "Id" character varying(120) NOT NULL,
                "ClinicId" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120),
                "Role" character varying(60) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "JoinedAt" timestamp with time zone NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_clinic_memberships" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS notifications (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "AppointmentId" character varying(120),
                "PatientId" character varying(120),
                "ProfessionalId" character varying(120),
                "Type" character varying(80) NOT NULL,
                "Title" character varying(200) NOT NULL,
                "Body" character varying(1000) NOT NULL,
                "Priority" character varying(40) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "ReadAt" timestamp with time zone,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_notifications" PRIMARY KEY ("Id")
            );

            CREATE INDEX IF NOT EXISTS "IX_clinics_Status" ON clinics ("Status");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_clinic_memberships_ClinicId_UserId" ON clinic_memberships ("ClinicId", "UserId");
            CREATE INDEX IF NOT EXISTS "IX_clinic_memberships_UserId_Status" ON clinic_memberships ("UserId", "Status");
            CREATE INDEX IF NOT EXISTS "IX_notifications_UserId_Status_CreatedAt" ON notifications ("UserId", "Status", "CreatedAt");
            CREATE INDEX IF NOT EXISTS "IX_notifications_AppointmentId_Type" ON notifications ("AppointmentId", "Type");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
