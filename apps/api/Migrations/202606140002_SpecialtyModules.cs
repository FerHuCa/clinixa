using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606140002_SpecialtyModules")]
public partial class SpecialtyModules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Recetas medicas: paciente + profesional + medicamento + dosificacion
            CREATE TABLE IF NOT EXISTS prescriptions (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "AppointmentId" character varying(120) NULL,
                "MedicationName" character varying(200) NOT NULL,
                "Dosage" character varying(200) NOT NULL,
                "Frequency" character varying(200) NOT NULL,
                "Duration" character varying(200) NOT NULL,
                "Instructions" character varying(1000) NOT NULL,
                "Refills" integer NOT NULL DEFAULT 0,
                "Status" character varying(40) NOT NULL DEFAULT 'active',
                "IssuedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "ExpiresAt" timestamp with time zone NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_prescriptions" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_prescriptions_patients_PatientId"
                    FOREIGN KEY ("PatientId") REFERENCES patients ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_prescriptions_professionals_ProfessionalId"
                    FOREIGN KEY ("ProfessionalId") REFERENCES professionals ("Id") ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_prescriptions_PatientId_Status" ON prescriptions ("PatientId", "Status");
            CREATE INDEX IF NOT EXISTS "IX_prescriptions_ProfessionalId_Status" ON prescriptions ("ProfessionalId", "Status");

            -- Tareas de paciente: asignadas por profesional, para que el paciente complete
            CREATE TABLE IF NOT EXISTS patient_tasks (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "AppointmentId" character varying(120) NULL,
                "Title" character varying(200) NOT NULL,
                "Description" character varying(1000) NOT NULL,
                "DueDate" timestamp with time zone NULL,
                "Status" character varying(40) NOT NULL DEFAULT 'pending',
                "CompletedAt" timestamp with time zone NULL,
                "PatientNotes" character varying(1000) NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_patient_tasks" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_patient_tasks_patients_PatientId"
                    FOREIGN KEY ("PatientId") REFERENCES patients ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_patient_tasks_professionals_ProfessionalId"
                    FOREIGN KEY ("ProfessionalId") REFERENCES professionals ("Id") ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_patient_tasks_PatientId_Status" ON patient_tasks ("PatientId", "Status");
            CREATE INDEX IF NOT EXISTS "IX_patient_tasks_ProfessionalId_Status" ON patient_tasks ("ProfessionalId", "Status");

            -- Dietas: planes de nutricion para un paciente, valido en un rango de fechas
            CREATE TABLE IF NOT EXISTS patient_diets (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "Title" character varying(200) NOT NULL,
                "Content" character varying(3000) NOT NULL,
                "ValidFrom" timestamp with time zone NOT NULL DEFAULT NOW(),
                "ValidUntil" timestamp with time zone NULL,
                "Status" character varying(40) NOT NULL DEFAULT 'active',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_patient_diets" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_patient_diets_patients_PatientId"
                    FOREIGN KEY ("PatientId") REFERENCES patients ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_patient_diets_professionals_ProfessionalId"
                    FOREIGN KEY ("ProfessionalId") REFERENCES professionals ("Id") ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_patient_diets_PatientId_Status" ON patient_diets ("PatientId", "Status");
            CREATE INDEX IF NOT EXISTS "IX_patient_diets_ProfessionalId_Status" ON patient_diets ("ProfessionalId", "Status");

            -- Medidas corporales: peso, altura, circunferencias corporales, etc. Historico por paciente
            CREATE TABLE IF NOT EXISTS body_measurements (
                "Id" character varying(120) NOT NULL,
                "PatientId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "MeasuredAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "WeightKg" numeric(7,2) NULL,
                "HeightCm" numeric(7,2) NULL,
                "WaistCm" numeric(7,2) NULL,
                "HipCm" numeric(7,2) NULL,
                "ArmCm" numeric(7,2) NULL,
                "BodyFatPercentage" numeric(5,2) NULL,
                "MuscleMassKg" numeric(7,2) NULL,
                "Notes" character varying(500) NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_body_measurements" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_body_measurements_patients_PatientId"
                    FOREIGN KEY ("PatientId") REFERENCES patients ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_body_measurements_professionals_ProfessionalId"
                    FOREIGN KEY ("ProfessionalId") REFERENCES professionals ("Id") ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_body_measurements_PatientId_MeasuredAt" ON body_measurements ("PatientId", "MeasuredAt");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS body_measurements;
            DROP TABLE IF EXISTS patient_diets;
            DROP TABLE IF EXISTS patient_tasks;
            DROP TABLE IF EXISTS prescriptions;
            """);
    }
}
