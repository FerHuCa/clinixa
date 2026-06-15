using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606110001_Payments")]
public partial class Payments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Pagos de citas via Mercado Pago (Checkout Pro).
            -- Status: pending | approved | rejected | refunded.
            CREATE TABLE IF NOT EXISTS payments (
                "Id" character varying(120) NOT NULL,
                "AppointmentId" character varying(120) NOT NULL,
                "PatientUserId" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "Amount" numeric(12,2) NOT NULL DEFAULT 0,
                "Currency" character varying(10) NOT NULL DEFAULT 'MXN',
                "Status" character varying(40) NOT NULL DEFAULT 'pending',
                "Provider" character varying(60) NOT NULL DEFAULT 'mercadopago',
                "ProviderPreferenceId" character varying(160) NOT NULL DEFAULT '',
                "ProviderPaymentId" character varying(160) NOT NULL DEFAULT '',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_payments" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_payments_appointments_AppointmentId"
                    FOREIGN KEY ("AppointmentId") REFERENCES appointments ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS "IX_payments_AppointmentId" ON payments ("AppointmentId");
            CREATE INDEX IF NOT EXISTS "IX_payments_Status" ON payments ("Status");
            CREATE INDEX IF NOT EXISTS "IX_payments_ProviderPaymentId" ON payments ("ProviderPaymentId");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS payments;
            """);
    }
}
