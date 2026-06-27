using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HealthHub.Api.Tests;

/// <summary>
/// Tests de integracion para las ramas de autorizacion de alto riesgo.
///
/// Los IDs de usuario/profesional/paciente son los sembrados por DatabaseSeeder:
///   - usr-ana-martinez    -> paciente "Ana Martinez" (paciente-id: ana-martinez)
///   - usr-carlos-ruiz     -> paciente "Carlos Ruiz"  (paciente-id: carlos-ruiz)
///   - usr-laura-vega      -> profesional nutriologa   (pro-id: pro-laura-vega)
///     * tiene relacion activa con ana-martinez (seeded en SeedPortalRelationsAsync)
///   - usr-miguel-torres   -> profesional fisioterapeuta (pro-id: pro-miguel-torres)
///     * NO tiene relacion directa con ana-martinez
///   - usr-master          -> internal_admin (puede ver todos los pacientes)
///
/// Prerequisito: Docker disponible (Testcontainers levanta postgres:16-alpine).
/// </summary>
[Collection("Authorization")]
public sealed class AuthorizationTests : IClassFixture<HealthHubApiFactory>
{
    private readonly HealthHubApiFactory _factory;

    // User IDs seeded por DatabaseSeeder
    private const string PatientAnaUserId = "usr-ana-martinez";
    private const string PatientCarlosUserId = "usr-carlos-ruiz";
    private const string ProfessionalLauraUserId = "usr-laura-vega";
    private const string ProfessionalMiguelUserId = "usr-miguel-torres";
    private const string AdminUserId = "usr-master";

    // Entity IDs seeded
    private const string PatientAnaId = "ana-martinez";
    private const string PatientCarlosId = "carlos-ruiz";
    private const string ProfessionalLauraId = "pro-laura-vega";
    private const string ProfessionalMiguelId = "pro-miguel-torres";

    public AuthorizationTests(HealthHubApiFactory factory)
    {
        _factory = factory;
        // El factory ya aplico migraciones y seed en startup (DatabaseSeeder).
    }

    // ── A1. Profesional vinculado SÍ puede acceder a su paciente ──────────────
    [Fact]
    public async Task LinkedProfessional_CanAccessLinkedPatient_Returns200()
    {
        // Laura Vega está vinculada con Ana Martinez (SeedPortalRelationsAsync).
        var client = _factory.CreateClientAs(ProfessionalLauraUserId);

        var response = await client.GetAsync($"/api/patients/{PatientAnaId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Ana", body, StringComparison.OrdinalIgnoreCase);
    }

    // ── A2. Profesional NO vinculado DEBE recibir 403 ────────────────────────
    [Fact]
    public async Task UnlinkedProfessional_CannotAccessOtherPatient_Returns403()
    {
        // Miguel Torres NO tiene relacion activa con Ana Martinez.
        var client = _factory.CreateClientAs(ProfessionalMiguelUserId);

        var response = await client.GetAsync($"/api/patients/{PatientAnaId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── A3. Paciente solo puede acceder a sus propios datos ──────────────────
    [Fact]
    public async Task Patient_CanAccessOwnPatientRecord_Returns200()
    {
        var client = _factory.CreateClientAs(PatientAnaUserId);

        var response = await client.GetAsync($"/api/patients/{PatientAnaId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Patient_CannotAccessOtherPatientRecord_Returns403()
    {
        var client = _factory.CreateClientAs(PatientAnaUserId);

        // Ana intenta acceder al expediente de Carlos.
        var response = await client.GetAsync($"/api/patients/{PatientCarlosId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── A4. Admin puede acceder a cualquier paciente ─────────────────────────
    [Fact]
    public async Task InternalAdmin_CanAccessAnyPatient_Returns200()
    {
        var client = _factory.CreateClientAs(AdminUserId);

        var response = await client.GetAsync($"/api/patients/{PatientCarlosId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── A5. Profesional sin licencia verificada NO puede publicar perfil ──────
    // Verifica el gate de audit-#4: solo profesionales "verified" son visibles.
    [Fact]
    public async Task UnverifiedProfessional_IsNotReturnedInPublicListing()
    {
        // pro-andres-campos ESTA verificado en el seed; creamos un profesional sin verificar
        // directamente en la DB para este test.
        const string unverifiedUserId = "usr-test-unverified";
        const string unverifiedProId = "pro-test-unverified";

        await _factory.WithDbAsync(async db =>
        {
            if (!db.Users.Any(u => u.Id == unverifiedUserId))
            {
                db.Users.Add(new HealthHub.Api.Entities.User
                {
                    Id = unverifiedUserId,
                    Email = "unverified-test@example.com",
                    Phone = "+52 55 0000 9999",
                    FullName = "Test Unverified",
                    PrimaryRole = "professional",
                    Status = "active",
                    PasswordHash = string.Empty,
                    PasswordSalt = string.Empty
                });

                db.Professionals.Add(new HealthHub.Api.Entities.Professional
                {
                    Id = unverifiedProId,
                    UserId = unverifiedUserId,
                    DisplayName = "Dr. Sin Cedula",
                    Specialty = "doctor",
                    LicenseNumber = "TEST-0000",
                    VerificationStatus = "pending",   // <-- NO verificado
                    Bio = "Perfil de prueba sin cedula verificada.",
                    Location = "CDMX",
                    AppointmentMode = "online",
                    BasePrice = 500,
                    Status = "active"
                });

                await db.SaveChangesAsync();
            }
        });

        var client = _factory.CreateAnonymousClient();
        var response = await client.GetAsync("/api/professionals");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();

        // El profesional sin cedula verificada NO debe aparecer.
        Assert.DoesNotContain(unverifiedProId, body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Sin Cedula", body, StringComparison.OrdinalIgnoreCase);
    }

    // ── A6. Endpoint publico de resenas NO expone nombre completo del paciente ─
    // Verifica audit-#2: ReviewDto expone PatientName pero el valor es el nombre
    // que grabo el sistema. Aqui validamos que la forma de la respuesta nunca
    // devuelve un campo "patientId" (PII directa) en la respuesta publica.
    [Fact]
    public async Task PublicReviews_DoNotExposePatientFullId()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.GetAsync($"/api/professionals/{ProfessionalLauraId}/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();

        // El campo "patientId" no debe estar en la respuesta publica de resenas.
        // ReviewDto.cs expone PatientName (apodo/nombre), no el patientId.
        Assert.DoesNotContain("\"patientId\"", body, StringComparison.OrdinalIgnoreCase);
    }

    // ── A7. Endpoint publico de resenas no devuelve nombre completo interno ────
    // Cuando se crea una resena, PatientName se almacena con FullName del paciente.
    // La API publica DEBE exponer PatientName (es parte del ReviewDto), pero
    // NO debe exponer el campo "patientId" (enlace con el expediente).
    // Verificamos que el DTO es correcto y no filtra PII extra.
    [Fact]
    public async Task PublicReviews_ResponseShape_MatchesReviewDto()
    {
        // Insertar una resena de prueba para Laura Vega.
        const string reviewId = "rev-test-shape-001";
        await _factory.WithDbAsync(async db =>
        {
            if (!db.Reviews.Any(r => r.Id == reviewId))
            {
                // Necesitamos una cita completada para poder insertar la resena.
                const string aptId = "apt-shape-test-001";
                if (!db.Appointments.Any(a => a.Id == aptId))
                {
                    db.Appointments.Add(new HealthHub.Api.Entities.Appointment
                    {
                        Id = aptId,
                        PatientId = PatientAnaId,
                        PatientName = "Ana Martinez",
                        ProfessionalId = ProfessionalLauraId,
                        ProfessionalName = "Dra. Laura Vega",
                        Date = "2026-01-10",
                        Time = "10:00",
                        Duration = "50 min",
                        Type = "Seguimiento",
                        Mode = "online",
                        Status = "completed",
                        StatusLabel = "Completada",
                        Reason = "Test review shape"
                    });
                }

                db.Reviews.Add(new HealthHub.Api.Entities.Review
                {
                    Id = reviewId,
                    AppointmentId = aptId,
                    PatientId = PatientAnaId,
                    PatientName = "Ana Martinez",
                    ProfessionalId = ProfessionalLauraId,
                    Rating = 5,
                    Comment = "Excelente atencion",
                    Status = "published",
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                });

                await db.SaveChangesAsync();
            }
        });

        var client = _factory.CreateAnonymousClient();
        var response = await client.GetAsync($"/api/professionals/{ProfessionalLauraId}/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var reviews = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.NotNull(reviews);
        Assert.NotEmpty(reviews);

        var review = reviews.First();

        // El DTO de resena publica debe tener estos campos. El nombre se expone
        // anonimizado como 'patientDisplayName' (nombre + inicial), no 'patientName'
        // (privacidad CWE-359, ver PublicReviewDto).
        Assert.True(review.TryGetProperty("id", out _), "Falta campo 'id'");
        Assert.True(review.TryGetProperty("rating", out _), "Falta campo 'rating'");
        Assert.True(review.TryGetProperty("comment", out _), "Falta campo 'comment'");
        Assert.True(review.TryGetProperty("patientDisplayName", out _), "Falta campo 'patientDisplayName'");
        Assert.False(review.TryGetProperty("patientName", out _), "El campo 'patientName' (sin anonimizar) no debe estar en la respuesta publica");

        // NO debe exponer patientId en la respuesta publica.
        Assert.False(review.TryGetProperty("patientId", out _), "El campo 'patientId' no debe estar en la respuesta publica");
    }

    // ── A8. Moderacion de resenas requiere internal_admin ────────────────────
    [Fact]
    public async Task ReviewModeration_RequiresAdminRole_Returns403ForPatient()
    {
        var client = _factory.CreateClientAs(PatientAnaUserId);

        var response = await client.PatchAsJsonAsync("/api/reviews/rev-inexistente/moderate",
            new { status = "hidden", reason = "Intento de moderacion no autorizado" });

        // El paciente no tiene rol admin: debe recibir 403.
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── A9. Listado de pacientes: profesional solo ve sus propios pacientes ───
    [Fact]
    public async Task ProfessionalPatientsListing_OnlyReturnsLinkedPatients()
    {
        var client = _factory.CreateClientAs(ProfessionalLauraUserId);

        var response = await client.GetAsync("/api/patients");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var patients = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.NotNull(patients);

        // Laura solo debe ver a ana-martinez (su relacion activa seeded).
        var ids = patients.Select(p =>
            p.TryGetProperty("id", out var id) ? id.GetString() : null).ToHashSet();

        Assert.Contains(PatientAnaId, ids);
        // Carlos Ruiz pertenece a Miguel Torres, no a Laura.
        Assert.DoesNotContain(PatientCarlosId, ids);
    }

    // ── A10. Peticion sin autenticacion a endpoint protegido => 401 ──────────
    [Fact]
    public async Task ProtectedEndpoint_WithoutAuth_Returns401()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.GetAsync("/api/patients");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── A11. Verificacion de cedula: solo internal_admin puede cambiar estado ─
    [Fact]
    public async Task VerifyLicense_ByNonAdmin_Returns403()
    {
        // Un profesional intenta verificar la licencia de otro.
        var client = _factory.CreateClientAs(ProfessionalLauraUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/professionals/{ProfessionalMiguelId}/verification",
            new { status = "verified" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
