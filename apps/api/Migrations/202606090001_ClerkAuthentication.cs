using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606090001_ClerkAuthentication")]
public partial class ClerkAuthentication : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS "ClerkUserId" character varying(160);
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_ClerkUserId"
                ON users ("ClerkUserId")
                WHERE "ClerkUserId" IS NOT NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP INDEX IF EXISTS "IX_users_ClerkUserId";
            ALTER TABLE users DROP COLUMN IF EXISTS "ClerkUserId";
            """);
    }
}
