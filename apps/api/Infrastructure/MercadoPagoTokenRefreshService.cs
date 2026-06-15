using HealthHub.Api.Data;
using HealthHub.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HealthHub.Api.Infrastructure;

/// <summary>
/// Job en segundo plano que renueva proactivamente los access tokens OAuth de Mercado Pago
/// de los profesionales antes de que venzan. Corre 1 minuto despues del arranque y luego
/// cada 24 horas. Cada token renovado se persiste de inmediato (no en batch) porque el
/// refresh token de MP es de un solo uso: si el proceso muere a mitad, las filas ya
/// renovadas quedan consistentes. Jamas lanza hacia el host: toda la corrida va en try/catch.
/// </summary>
public sealed class MercadoPagoTokenRefreshService(
    IServiceScopeFactory scopeFactory,
    ILogger<MercadoPagoTokenRefreshService> logger) : BackgroundService
{
    private static readonly TimeSpan InitialDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    // Margen amplio: renueva cualquier token que venza dentro de los proximos 30 dias.
    private static readonly TimeSpan RenewalWindow = TimeSpan.FromDays(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(InitialDelay, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync(stoppingToken);

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HealthHubDbContext>();
            var marketplace = scope.ServiceProvider.GetRequiredService<MercadoPagoMarketplaceService>();
            var encryption = scope.ServiceProvider.GetRequiredService<TokenEncryptionService>();

            var threshold = DateTimeOffset.UtcNow.Add(RenewalWindow);
            var statuses = new[] { "pending", "verified", "connected" };

            var accounts = await db.ProfessionalMercadoPagos
                .Where(a => statuses.Contains(a.Status)
                    && a.TokenExpiresAt != null
                    && a.TokenExpiresAt <= threshold)
                .ToListAsync(stoppingToken);

            if (accounts.Count == 0)
            {
                return;
            }

            logger.LogInformation("[MERCADOPAGO REFRESH JOB] {Count} cuenta(s) por renovar", accounts.Count);

            foreach (var account in accounts)
            {
                if (stoppingToken.IsCancellationRequested)
                {
                    return;
                }

                var refreshToken = encryption.Unprotect(account.RefreshTokenEncrypted);

                if (refreshToken is null)
                {
                    logger.LogWarning("[MERCADOPAGO REFRESH JOB] Refresh token ilegible para profesional {ProfessionalId}", account.ProfessionalId);
                    AddAuditLog(db, account.ProfessionalId, "marketplace.token_refresh_failed", "failed");
                    await db.SaveChangesAsync(stoppingToken);
                    continue;
                }

                MercadoPagoOAuthCredentials? renewed;
                try
                {
                    renewed = await marketplace.RefreshAccessTokenAsync(refreshToken);
                }
                catch (Exception exception)
                {
                    logger.LogWarning(exception, "[MERCADOPAGO REFRESH JOB] Fallo al renovar token de profesional {ProfessionalId}", account.ProfessionalId);
                    renewed = null;
                }

                if (renewed is null)
                {
                    logger.LogWarning("[MERCADOPAGO REFRESH JOB] No se pudo renovar el token de profesional {ProfessionalId}", account.ProfessionalId);
                    AddAuditLog(db, account.ProfessionalId, "marketplace.token_refresh_failed", "failed");
                    await db.SaveChangesAsync(stoppingToken);
                    continue;
                }

                account.AccessTokenEncrypted = encryption.Protect(renewed.AccessToken);
                account.RefreshTokenEncrypted = encryption.Protect(renewed.RefreshToken);
                account.PublicKey = renewed.PublicKey;
                account.TokenExpiresAt = renewed.TokenExpiresAt;
                account.UpdatedAt = DateTimeOffset.UtcNow;

                AddAuditLog(db, account.ProfessionalId, "marketplace.token_refresh", "success");

                // Persistencia inmediata por fila: el refresh token de MP es de un solo uso.
                await db.SaveChangesAsync(stoppingToken);
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "[MERCADOPAGO REFRESH JOB] Error en la corrida de renovacion de tokens");
        }
    }

    // Escribe una fila de auditoria del sistema (actor null) replicando el patron de AddAuditLog
    // de Program.cs. No hay HttpRequest disponible en el job.
    private static void AddAuditLog(HealthHubDbContext db, string professionalId, string action, string outcome)
    {
        db.AuditLogs.Add(new AuditLog
        {
            Id = $"audit-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            ActorUserId = null,
            ActorRole = "system",
            Action = action,
            ResourceType = "professional",
            ResourceId = professionalId,
            PatientId = null,
            ProfessionalId = professionalId,
            Outcome = outcome,
            IpAddress = "system",
            UserAgent = "MercadoPagoTokenRefreshService",
            CreatedAt = DateTimeOffset.UtcNow
        });
    }
}
