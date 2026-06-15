using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606070002_AuthSessionsAndBookingRules")]
public partial class AuthSessionsAndBookingRules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS "PasswordHash" character varying(160) NOT NULL DEFAULT '';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS "PasswordSalt" character varying(80) NOT NULL DEFAULT '';

            CREATE TABLE IF NOT EXISTS user_sessions (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "TokenHash" character varying(160) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "ExpiresAt" timestamp with time zone NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_user_sessions" PRIMARY KEY ("Id")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_user_sessions_TokenHash" ON user_sessions ("TokenHash");
            CREATE INDEX IF NOT EXISTS "IX_user_sessions_UserId_Status_ExpiresAt" ON user_sessions ("UserId", "Status", "ExpiresAt");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
