using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthHub.Api.Migrations;

[DbContext(typeof(HealthHubDbContext))]
[Migration("202606090002_UserConsents")]
public partial class UserConsents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS user_consents (
                "Id" character varying(120) NOT NULL,
                "UserId" character varying(120) NOT NULL,
                "ConsentType" character varying(60) NOT NULL,
                "DocumentVersion" character varying(40) NOT NULL,
                "AcceptedAt" timestamp with time zone NOT NULL,
                "IpAddress" character varying(80) NOT NULL,
                "UserAgent" character varying(500) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_user_consents" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_user_consents_users_UserId" FOREIGN KEY ("UserId")
                    REFERENCES users ("Id") ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_user_consents_UserId_ConsentType_DocumentVersion"
                ON user_consents ("UserId", "ConsentType", "DocumentVersion");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS user_consents;
            """);
    }
}
