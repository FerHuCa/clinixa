using HealthHub.Api.Data;
using HealthHub.Api.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace HealthHub.Api.Tests;

/// <summary>
/// WebApplicationFactory que levanta la API contra un contenedor PostgreSQL efimero
/// (Testcontainers). Implementa IAsyncLifetime para gestionar el ciclo de vida del
/// contenedor con xUnit. Uso: IClassFixture&lt;HealthHubApiFactory&gt;.
/// </summary>
public sealed class HealthHubApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("healthhub_test")
        .WithUsername("healthhub")
        .WithPassword("healthhub_test_pw")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.StopAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Development => IsDevAuthEnabled() devuelve true si Authentication:EnableDevAuth=true.
        builder.UseEnvironment("Development");

        builder.UseSetting("ConnectionStrings:HealthHubDb", _postgres.GetConnectionString());

        // Sin Clerk en tests: no hay JWTs reales.
        builder.UseSetting("Clerk:Issuer", "");
        builder.UseSetting("CLERK_ISSUER", "");

        // DevAuth habilitado: acepta X-HealthHub-Dev-User como identidad del actor.
        builder.UseSetting("Authentication:EnableDevAuth", "true");
        builder.UseSetting("Authentication:EnableLegacyAuth", "false");

        builder.ConfigureServices(services =>
        {
            // Sustituir el DbContext con la cadena del contenedor efimero.
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<HealthHubDbContext>));

            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            var connectionString = _postgres.GetConnectionString();
            services.AddDbContext<HealthHubDbContext>(options =>
                options.UseNpgsql(connectionString));
        });
    }

    /// <summary>
    /// Abre un scope y ejecuta la accion sobre el DbContext del test.
    /// Util para insertar fixtures adicionales despues del seed inicial.
    /// </summary>
    public async Task WithDbAsync(Func<HealthHubDbContext, Task> action)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HealthHubDbContext>();
        await action(db);
    }

    /// <summary>
    /// Crea un HttpClient con X-HealthHub-Dev-User predefinido.
    /// Requiere Authentication:EnableDevAuth=true (ya configurado en ConfigureWebHost).
    /// </summary>
    public HttpClient CreateClientAs(string userId)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
        client.DefaultRequestHeaders.Add("X-HealthHub-Dev-User", userId);
        return client;
    }

    /// <summary>
    /// Crea un HttpClient anonimo (sin X-HealthHub-Dev-User).
    /// </summary>
    public HttpClient CreateAnonymousClient()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }
}
