using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606120001_MarketplaceSetup")]
public partial class MarketplaceSetup : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Marketplace Mercado Pago: cada profesional cobra en su propia cuenta MP
            -- y la plataforma retiene una comision variable por tier de licencia.

            -- Estado de vinculacion MP denormalizado en el perfil profesional.
            ALTER TABLE professionals
                ADD COLUMN IF NOT EXISTS "MercadoPagoStatus" character varying(40) NOT NULL DEFAULT 'not_connected';

            -- Cuenta MP vinculada por OAuth. Tokens cifrados, nunca en claro.
            -- Status: pending | connected | verified | rejected | disconnected.
            CREATE TABLE IF NOT EXISTS professional_mercado_pagos (
                "Id" character varying(120) NOT NULL,
                "ProfessionalId" character varying(120) NOT NULL,
                "MercadoPagoUserId" character varying(120) NOT NULL DEFAULT '',
                "Email" character varying(240) NOT NULL DEFAULT '',
                "AccessTokenEncrypted" character varying(1000) NOT NULL DEFAULT '',
                "RefreshTokenEncrypted" character varying(1000) NOT NULL DEFAULT '',
                "PublicKey" character varying(240) NOT NULL DEFAULT '',
                "TokenExpiresAt" timestamp with time zone NULL,
                "Status" character varying(40) NOT NULL DEFAULT 'pending',
                "ConnectedAt" timestamp with time zone NULL,
                "VerifiedAt" timestamp with time zone NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_professional_mercado_pagos" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_professional_mercado_pagos_professionals_ProfessionalId"
                    FOREIGN KEY ("ProfessionalId") REFERENCES professionals ("Id") ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_professional_mercado_pagos_ProfessionalId"
                ON professional_mercado_pagos ("ProfessionalId");
            CREATE INDEX IF NOT EXISTS "IX_professional_mercado_pagos_Status"
                ON professional_mercado_pagos ("Status");

            -- Tiers de comision por tipo de licencia/especialidad.
            CREATE TABLE IF NOT EXISTS commission_tiers (
                "Id" character varying(120) NOT NULL,
                "LicenseType" character varying(60) NOT NULL,
                "CommissionPercentage" numeric(5,2) NOT NULL DEFAULT 0,
                "MinAppointmentsThreshold" integer NOT NULL DEFAULT 0,
                "Status" character varying(40) NOT NULL DEFAULT 'active',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_commission_tiers" PRIMARY KEY ("Id")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_commission_tiers_LicenseType_MinAppointmentsThreshold"
                ON commission_tiers ("LicenseType", "MinAppointmentsThreshold");

            -- Desglose marketplace del pago: comision y transferencia al profesional.
            -- TransferStatus: none | pending | completed | failed.
            ALTER TABLE payments
                ADD COLUMN IF NOT EXISTS "CommissionPercentage" numeric(5,2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS "CommissionAmount" numeric(12,2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS "ProfessionalAmount" numeric(12,2) NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS "TransferStatus" character varying(40) NOT NULL DEFAULT 'none',
                ADD COLUMN IF NOT EXISTS "ProviderTransferId" character varying(160) NOT NULL DEFAULT '';

            CREATE INDEX IF NOT EXISTS "IX_payments_TransferStatus" ON payments ("TransferStatus");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP INDEX IF EXISTS "IX_payments_TransferStatus";
            ALTER TABLE payments
                DROP COLUMN IF EXISTS "CommissionPercentage",
                DROP COLUMN IF EXISTS "CommissionAmount",
                DROP COLUMN IF EXISTS "ProfessionalAmount",
                DROP COLUMN IF EXISTS "TransferStatus",
                DROP COLUMN IF EXISTS "ProviderTransferId";
            DROP TABLE IF EXISTS commission_tiers;
            DROP TABLE IF EXISTS professional_mercado_pagos;
            ALTER TABLE professionals DROP COLUMN IF EXISTS "MercadoPagoStatus";
            """);
    }
}
