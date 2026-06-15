using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606080001_AuditLogsAndAppointmentWorkflow")]
public partial class AuditLogsAndAppointmentWorkflow : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "CancellationReason" character varying(600);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "CancelledAt" timestamp with time zone;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "CancelledByUserId" character varying(120);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "RescheduleReason" character varying(600);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "RescheduledAt" timestamp with time zone;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "RescheduledByUserId" character varying(120);

            CREATE TABLE IF NOT EXISTS audit_logs (
                "Id" character varying(120) NOT NULL,
                "ActorUserId" character varying(120),
                "ActorRole" character varying(40) NOT NULL,
                "Action" character varying(120) NOT NULL,
                "ResourceType" character varying(80) NOT NULL,
                "ResourceId" character varying(160) NOT NULL,
                "PatientId" character varying(120),
                "ProfessionalId" character varying(120),
                "Outcome" character varying(40) NOT NULL,
                "IpAddress" character varying(80) NOT NULL,
                "UserAgent" character varying(500) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_audit_logs" PRIMARY KEY ("Id")
            );

            CREATE INDEX IF NOT EXISTS "IX_audit_logs_PatientId_CreatedAt" ON audit_logs ("PatientId", "CreatedAt");
            CREATE INDEX IF NOT EXISTS "IX_audit_logs_ResourceType_ResourceId" ON audit_logs ("ResourceType", "ResourceId");
            CREATE INDEX IF NOT EXISTS "IX_audit_logs_ActorUserId_CreatedAt" ON audit_logs ("ActorUserId", "CreatedAt");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
