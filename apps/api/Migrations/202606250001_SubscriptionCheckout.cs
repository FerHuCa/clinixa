using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606250001_SubscriptionCheckout")]
public partial class SubscriptionCheckout : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Suscripciones de profesionales via MercadoPago preapproval (cobro recurrente).
            -- Una sola fila activa por profesional; el historial se conserva (status != active).
            -- Status: pending_checkout | authorized | paused | cancelled | expired.
            -- PlanId: "basico" | "pro"  (alineado a SubscriptionPlans en Program.cs).
            CREATE TABLE IF NOT EXISTS professional_subscriptions (
                "Id"                    character varying(120) NOT NULL,
                "ProfessionalId"        character varying(120) NOT NULL,
                "PlanId"                character varying(40)  NOT NULL DEFAULT 'basico',
                "MpPreapprovalId"       character varying(120) NOT NULL DEFAULT '',
                "CheckoutUrl"           character varying(500) NOT NULL DEFAULT '',
                "Status"                character varying(40)  NOT NULL DEFAULT 'pending_checkout',
                "AmountMxn"             numeric(12,2)          NOT NULL DEFAULT 0,
                "AuthorizedAt"          timestamp with time zone NULL,
                "CancelledAt"           timestamp with time zone NULL,
                "NextPaymentDate"       timestamp with time zone NULL,
                "LastWebhookAt"         timestamp with time zone NULL,
                -- Anti-replay: guarda el ID de la ultima notificacion procesada para idempotencia.
                "LastWebhookEventId"    character varying(120) NOT NULL DEFAULT '',
                "CreatedAt"             timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt"             timestamp with time zone NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_professional_subscriptions" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_professional_subscriptions_professionals_ProfessionalId"
                    FOREIGN KEY ("ProfessionalId") REFERENCES professionals ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS "IX_professional_subscriptions_ProfessionalId"
                ON professional_subscriptions ("ProfessionalId");
            CREATE INDEX IF NOT EXISTS "IX_professional_subscriptions_MpPreapprovalId"
                ON professional_subscriptions ("MpPreapprovalId");
            CREATE INDEX IF NOT EXISTS "IX_professional_subscriptions_Status"
                ON professional_subscriptions ("Status");

            -- Campo denormalizado en professionals para acelerar el gate de acceso
            -- sin JOIN. Valores: none | pending_checkout | active | paused | cancelled.
            ALTER TABLE professionals
                ADD COLUMN IF NOT EXISTS "SubscriptionStatus" character varying(40) NOT NULL DEFAULT 'none';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS professional_subscriptions;
            ALTER TABLE professionals DROP COLUMN IF EXISTS "SubscriptionStatus";
            """);
    }
}
