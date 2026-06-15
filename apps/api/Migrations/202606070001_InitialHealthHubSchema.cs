using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606070001_InitialHealthHubSchema")]
public partial class InitialHealthHubSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS patients (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120),
                "FullName" character varying(200) NOT NULL,
                "Initials" character varying(8) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "StatusLabel" character varying(80) NOT NULL,
                "Age" integer NOT NULL,
                "Email" character varying(240) NOT NULL,
                "Phone" character varying(80) NOT NULL,
                "Focus" character varying(200) NOT NULL,
                "MainReason" character varying(500) NOT NULL,
                "RiskLevel" character varying(80) NOT NULL,
                "NextAppointment" character varying(120) NOT NULL,
                "LastSession" character varying(120) NOT NULL,
                "Progress" character varying(1000) NOT NULL,
                "Professional" character varying(160) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_patients" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS appointments (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "PatientName" character varying(200) NOT NULL,
                "ProfessionalId" character varying(120),
                "ProfessionalServiceId" character varying(120),
                "ProfessionalName" character varying(200) NOT NULL DEFAULT '',
                "Date" character varying(20) NOT NULL,
                "Time" character varying(20) NOT NULL,
                "StartsAt" timestamp with time zone,
                "EndsAt" timestamp with time zone,
                "Duration" character varying(40) NOT NULL,
                "Type" character varying(100) NOT NULL,
                "Mode" character varying(40) NOT NULL DEFAULT 'in_person',
                "Status" character varying(40) NOT NULL,
                "StatusLabel" character varying(80) NOT NULL,
                "Reason" character varying(600) NOT NULL,
                "CreatedByUserId" character varying(120),
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_appointments" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS soap_notes (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "PatientName" character varying(200) NOT NULL,
                "ProfessionalId" character varying(120),
                "AppointmentId" character varying(120),
                "PatientRecordId" character varying(120),
                "Date" character varying(20) NOT NULL,
                "Title" character varying(200) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "StatusLabel" character varying(80) NOT NULL,
                "Subjective" character varying(3000) NOT NULL,
                "Objective" character varying(3000) NOT NULL,
                "Assessment" character varying(3000) NOT NULL,
                "Plan" character varying(3000) NOT NULL,
                "AiGenerated" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_soap_notes" PRIMARY KEY ("Id")
            );

            ALTER TABLE patients ADD COLUMN IF NOT EXISTS "UserId" character varying(120);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "ProfessionalId" character varying(120);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "ProfessionalServiceId" character varying(120);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "ProfessionalName" character varying(200) NOT NULL DEFAULT '';
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "StartsAt" timestamp with time zone;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "EndsAt" timestamp with time zone;
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "Mode" character varying(40) NOT NULL DEFAULT 'in_person';
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "CreatedByUserId" character varying(120);
            ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS "ProfessionalId" character varying(120);
            ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS "PatientRecordId" character varying(120);
            """);

        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS users (
                "Id" character varying(120) NOT NULL,
                "Email" character varying(240) NOT NULL,
                "Phone" character varying(80) NOT NULL,
                "FullName" character varying(200) NOT NULL,
                "PrimaryRole" character varying(40) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "EmailVerifiedAt" timestamp with time zone,
                "LastLoginAt" timestamp with time zone,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_users" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS user_roles (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "Role" character varying(40) NOT NULL,
                "ScopeType" character varying(60) NOT NULL,
                "ScopeId" character varying(120),
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_user_roles" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS professionals (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "DisplayName" character varying(200) NOT NULL,
                "Specialty" character varying(80) NOT NULL,
                "LicenseNumber" character varying(120) NOT NULL,
                "Bio" character varying(1000) NOT NULL,
                "ProfilePhotoUrl" character varying(500) NOT NULL,
                "Location" character varying(200) NOT NULL,
                "Timezone" character varying(80) NOT NULL,
                "AppointmentMode" character varying(40) NOT NULL,
                "BasePrice" numeric(10,2) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_professionals" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS professional_services (
                "Id" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "Name" character varying(200) NOT NULL,
                "Description" character varying(800) NOT NULL,
                "DurationMinutes" integer NOT NULL,
                "Price" numeric(10,2) NOT NULL,
                "Mode" character varying(40) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_professional_services" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS professional_availability (
                "Id" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "Weekday" integer NOT NULL,
                "StartsAt" character varying(20) NOT NULL,
                "EndsAt" character varying(20) NOT NULL,
                "Timezone" character varying(80) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_professional_availability" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS professional_patients (
                "Id" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedFromAppointmentId" character varying(120),
                "StartedAt" timestamp with time zone NOT NULL,
                "EndedAt" timestamp with time zone,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_professional_patients" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS patient_records (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120),
                "RecordType" character varying(80) NOT NULL,
                "Title" character varying(200) NOT NULL,
                "Summary" character varying(1200) NOT NULL,
                "Visibility" character varying(80) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_patient_records" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS reviews (
                "Id" character varying(120) NOT NULL,
                "AppointmentId" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "PatientName" character varying(200) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "Rating" integer NOT NULL,
                "Comment" character varying(1000) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_reviews" PRIMARY KEY ("Id")
            );
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_Email" ON users ("Email");
            CREATE INDEX IF NOT EXISTS "IX_user_roles_UserId" ON user_roles ("UserId");
            CREATE INDEX IF NOT EXISTS "IX_patients_Email" ON patients ("Email");
            CREATE INDEX IF NOT EXISTS "IX_patients_UserId" ON patients ("UserId");
            CREATE INDEX IF NOT EXISTS "IX_appointments_PatientId_Date_Time" ON appointments ("PatientId", "Date", "Time");
            CREATE INDEX IF NOT EXISTS "IX_appointments_ProfessionalId_Date_Time" ON appointments ("ProfessionalId", "Date", "Time");
            CREATE INDEX IF NOT EXISTS "IX_soap_notes_PatientId_Date" ON soap_notes ("PatientId", "Date");
            CREATE INDEX IF NOT EXISTS "IX_soap_notes_ProfessionalId_Date" ON soap_notes ("ProfessionalId", "Date");
            CREATE INDEX IF NOT EXISTS "IX_professionals_Specialty" ON professionals ("Specialty");
            CREATE INDEX IF NOT EXISTS "IX_professional_services_ProfessionalId_Status" ON professional_services ("ProfessionalId", "Status");
            CREATE INDEX IF NOT EXISTS "IX_professional_availability_ProfessionalId_Weekday" ON professional_availability ("ProfessionalId", "Weekday");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_professional_patients_ProfessionalId_PatientId" ON professional_patients ("ProfessionalId", "PatientId");
            CREATE INDEX IF NOT EXISTS "IX_patient_records_PatientId_Visibility_Status" ON patient_records ("PatientId", "Visibility", "Status");
            CREATE INDEX IF NOT EXISTS "IX_reviews_ProfessionalId_Status" ON reviews ("ProfessionalId", "Status");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
