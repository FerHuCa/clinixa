using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606120002_SubscriptionInterest")]
public partial class SubscriptionInterest : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Interes de compra de suscripcion durante el piloto: el CTA "Quiero activar mi plan"
            -- registra la fecha; null significa que el profesional aun no levanta la mano.
            ALTER TABLE professionals
                ADD COLUMN IF NOT EXISTS "SubscriptionInterestAt" timestamp with time zone NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE professionals DROP COLUMN IF EXISTS "SubscriptionInterestAt";
            """);
    }
}
