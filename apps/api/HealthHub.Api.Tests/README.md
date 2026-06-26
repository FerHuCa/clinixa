# HealthHub.Api.Tests

Integration test suite for the Clinixa API (HealthHub.Api). Tests run against an
ephemeral PostgreSQL container managed by Testcontainers.

## Requirements

- .NET 8 SDK
- **Docker** (required for Testcontainers to spin up postgres:16-alpine)

## Running locally

```bash
# From repo root
$HOME/.dotnet/dotnet test apps/api/HealthHub.Api.Tests

# Or with solution
$HOME/.dotnet/dotnet test HealthHub.sln
```

## CI configuration

In CI (GitHub Actions, Railway, etc.) you need a Docker daemon available:

```yaml
# Example GitHub Actions step
- name: Run integration tests
  run: dotnet test HealthHub.sln --no-build --logger "trx;LogFileName=test-results.trx"
```

Testcontainers automatically pulls `postgres:16-alpine` and binds to an ephemeral
port. No external Postgres is needed.

## What is tested

All tests live in `AuthorizationTests.cs` and cover the highest-risk authorization
branches in `Program.cs`:

| Test | Covered branch |
|------|---------------|
| A1 | Linked professional CAN access their patient (CanAccessPatientAsync → true) |
| A2 | Unlinked professional gets 403 (CanAccessPatientAsync → false) |
| A3 | Patient CAN access own record (GetAccessiblePatientIdsAsync for patient role) |
| A4 | Patient gets 403 for another patient's record |
| A5 | internal_admin can access any patient (returns null from GetAccessiblePatientIdsAsync) |
| A6 | Unverified professional does not appear in public listing |
| A7 | Public reviews endpoint does NOT expose patientId field (audit-#2 PII gate) |
| A8 | Review DTO shape: correct fields present, patientId absent |
| A9 | Review moderation requires internal_admin role (non-admin gets 403) |
| A10 | Professional patient listing only returns linked patients |
| A11 | Unauthenticated request to protected endpoint returns 401 |
| A12 | Only internal_admin can change license verification status |

## Notes on DevAuth

Tests authenticate by sending `X-HealthHub-Dev-User: <userId>` header instead of a
real Clerk JWT. This header is accepted only when:
- `ASPNETCORE_ENVIRONMENT=Development`
- `Authentication:EnableDevAuth=true`

Both are configured automatically by `HealthHubApiFactory.ConfigureWebHost`.
