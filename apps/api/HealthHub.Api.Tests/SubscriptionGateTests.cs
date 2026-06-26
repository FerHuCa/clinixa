using System.Net;
using System.Net.Http.Json;
using HealthHub.Api.Data;
using HealthHub.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HealthHub.Api.Tests;

/// <summary>
/// Verifica el gate de suscripcion (CheckSubscriptionGate): un profesional con el
/// trial vencido y sin suscripcion activa recibe 402 al crear registros clinicos;
/// con suscripcion activa el gate lo deja pasar.
///
/// Reusa a Laura Vega (nutriologa verificada, vinculada a Ana) mutando su estado de
/// suscripcion y restaurandolo en finally para no contaminar otros tests de la coleccion.
///
/// Prerequisito: Docker disponible (Testcontainers levanta postgres).
/// </summary>
[Collection("Authorization")]
public sealed class SubscriptionGateTests : IClassFixture<HealthHubApiFactory>
{
    private readonly HealthHubApiFactory _factory;

    private const string ProfessionalLauraUserId = "usr-laura-vega";
    private const string ProfessionalLauraId = "pro-laura-vega";
    private const string PatientAnaId = "ana-martinez";

    public SubscriptionGateTests(HealthHubApiFactory factory)
    {
        _factory = factory;
    }

    private async Task SetLauraSubscriptionAsync(string status, DateTimeOffset createdAt)
    {
        await _factory.WithDbAsync(async db =>
        {
            var pro = await db.Professionals.FirstAsync(p => p.Id == ProfessionalLauraId);
            pro.SubscriptionStatus = status;
            pro.CreatedAt = createdAt;
            await db.SaveChangesAsync();
        });
    }

    private static HttpContent DietBody() => JsonContent.Create(new
    {
        patientId = PatientAnaId,
        title = "Plan nutricional",
        content = "Contenido de prueba.",
        validFrom = DateTimeOffset.UtcNow.ToString("o")
    });

    [Fact]
    public async Task ExpiredTrial_NoActiveSubscription_CreateClinicalRecord_Returns402()
    {
        // Trial de 14 dias vencido (alta hace 20 dias) y sin suscripcion.
        await SetLauraSubscriptionAsync("none", DateTimeOffset.UtcNow.AddDays(-20));

        try
        {
            var client = _factory.CreateClientAs(ProfessionalLauraUserId);
            var response = await client.PostAsync("/api/patient-diets", DietBody());

            Assert.Equal(HttpStatusCode.PaymentRequired, response.StatusCode);
        }
        finally
        {
            // Restaurar: trial activo (alta "ahora"), como el seed original.
            await SetLauraSubscriptionAsync("none", DateTimeOffset.UtcNow);
        }
    }

    [Fact]
    public async Task ActiveSubscription_PastTrial_CreateClinicalRecord_NotBlockedByGate()
    {
        // Trial vencido PERO suscripcion activa: el gate debe dejar pasar.
        await SetLauraSubscriptionAsync("active", DateTimeOffset.UtcNow.AddDays(-20));

        try
        {
            var client = _factory.CreateClientAs(ProfessionalLauraUserId);
            var response = await client.PostAsync("/api/patient-diets", DietBody());

            // El gate no bloquea: no debe ser 402 (Laura crea la dieta de Ana, su paciente).
            Assert.NotEqual(HttpStatusCode.PaymentRequired, response.StatusCode);
        }
        finally
        {
            await SetLauraSubscriptionAsync("none", DateTimeOffset.UtcNow);
        }
    }
}
