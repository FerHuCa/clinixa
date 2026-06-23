using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HealthHub.Api.Infrastructure;

public sealed record MercadoPagoPreference(string PreferenceId, string InitPoint, string Outcome);

public sealed record MercadoPagoPaymentInfo(string ProviderPaymentId, string Status, string ExternalReference);

/// <summary>
/// Integracion con Mercado Pago Checkout Pro. Si existe MERCADOPAGO_ACCESS_TOKEN crea
/// preferencias reales; si no, opera en modo simulado (no rompe build ni pruebas locales).
/// Nunca lanza excepcion hacia el caller.
/// </summary>
public sealed class MercadoPagoService(
    IConfiguration configuration,
    ILogger<MercadoPagoService> logger,
    HttpClient httpClient,
    IHostEnvironment environment)
{
    private string? AccessToken =>
        configuration["MercadoPago:AccessToken"] ?? Environment.GetEnvironmentVariable("MERCADOPAGO_ACCESS_TOKEN");

    public bool IsConfigured => !string.IsNullOrWhiteSpace(AccessToken);

    /// <summary>
    /// Secreto para validar la firma de webhooks. En desarrollo sin configuracion usa un
    /// secreto fijo para que las pruebas locales puedan firmar; en produccion sin secreto
    /// el webhook rechaza todo (fail closed).
    /// </summary>
    public string? WebhookSecret =>
        configuration["MercadoPago:WebhookSecret"]
        ?? Environment.GetEnvironmentVariable("MERCADOPAGO_WEBHOOK_SECRET")
        ?? (environment.IsDevelopment() ? "dev-webhook-secret" : null);

    public async Task<MercadoPagoPreference?> CreatePreferenceAsync(
        string paymentId,
        string title,
        decimal amount,
        string currency,
        string payerEmail,
        string webBaseUrl,
        string notificationUrl)
    {
        var returnUrl = $"{webBaseUrl}/portal-paciente/pago";

        if (!IsConfigured)
        {
            logger.LogInformation("[MERCADOPAGO SIMULADO] Preferencia para pago {PaymentId}: {Title} ${Amount} {Currency}", paymentId, title, amount, currency);
            return new MercadoPagoPreference(
                $"sim-pref-{paymentId}",
                $"{returnUrl}?status=pending&simulated=1&paymentId={paymentId}",
                "simulated");
        }

        try
        {
            var payload = new Dictionary<string, object>
            {
                ["items"] = new[]
                {
                    new { title, quantity = 1, unit_price = amount, currency_id = currency }
                },
                ["payer"] = new { email = payerEmail },
                ["external_reference"] = paymentId,
                ["back_urls"] = new
                {
                    success = $"{returnUrl}?status=approved",
                    pending = $"{returnUrl}?status=pending",
                    failure = $"{returnUrl}?status=rejected"
                }
            };

            // Mercado Pago exige HTTPS para auto_return y notification_url; en desarrollo
            // local (http) se omiten y el comprador regresa con el boton "Volver al sitio".
            if (returnUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                payload["auto_return"] = "approved";
            }

            if (notificationUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                payload["notification_url"] = notificationUrl;
            }

            using var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.mercadopago.com/checkout/preferences")
            {
                Content = JsonContent.Create(payload)
            };
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var response = await httpClient.SendAsync(requestMessage);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Mercado Pago respondio {Status} al crear preferencia: {Body}", (int)response.StatusCode, body);
                return null;
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var preferenceId = document.RootElement.GetProperty("id").GetString() ?? string.Empty;
            var initPoint = document.RootElement.GetProperty("init_point").GetString() ?? string.Empty;

            return new MercadoPagoPreference(preferenceId, initPoint, "created");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo crear la preferencia de Mercado Pago para el pago {PaymentId}", paymentId);
            return null;
        }
    }

    /// <summary>
    /// Consulta un pago en Mercado Pago. Devuelve null sin credenciales (el webhook usa
    /// entonces los datos del cuerpo, modo simulado) o ante cualquier error.
    /// </summary>
    public async Task<MercadoPagoPaymentInfo?> GetPaymentAsync(string providerPaymentId)
    {
        if (!IsConfigured)
        {
            return null;
        }

        try
        {
            using var requestMessage = new HttpRequestMessage(HttpMethod.Get, $"https://api.mercadopago.com/v1/payments/{providerPaymentId}");
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var response = await httpClient.SendAsync(requestMessage);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Mercado Pago respondio {Status} al consultar el pago {PaymentId}", (int)response.StatusCode, providerPaymentId);
                return null;
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var status = document.RootElement.GetProperty("status").GetString() ?? "pending";
            var externalReference = document.RootElement.TryGetProperty("external_reference", out var reference)
                ? reference.GetString() ?? string.Empty
                : string.Empty;

            return new MercadoPagoPaymentInfo(providerPaymentId, status, externalReference);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo consultar el pago {PaymentId} en Mercado Pago", providerPaymentId);
            return null;
        }
    }

    /// <summary>
    /// Emite un reembolso en Mercado Pago. Si amount es null hace un reembolso total.
    /// En modo simulado (sin credenciales) registra el evento y retorna true.
    /// Best-effort: NUNCA lanza hacia el caller.
    /// </summary>
    public async Task<bool> RefundPaymentAsync(string providerPaymentId, decimal? amount = null)
    {
        if (!IsConfigured)
        {
            logger.LogInformation("[REFUND SIMULADO] payment={ProviderPaymentId}", providerPaymentId);
            return true;
        }

        if (string.IsNullOrWhiteSpace(providerPaymentId))
        {
            logger.LogWarning("Reembolso omitido: ProviderPaymentId vacio — el pago no fue confirmado por Mercado Pago.");
            return false;
        }

        try
        {
            var url = $"https://api.mercadopago.com/v1/payments/{providerPaymentId}/refunds";
            object? payload = amount.HasValue ? new { amount } : null;

            using var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = payload is not null ? JsonContent.Create(payload) : new StringContent("{}", Encoding.UTF8, "application/json")
            };
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var response = await httpClient.SendAsync(requestMessage);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Mercado Pago respondio {Status} al emitir reembolso del pago {ProviderPaymentId}: {Body}", (int)response.StatusCode, providerPaymentId, body);
                return false;
            }

            logger.LogInformation("Reembolso emitido en Mercado Pago para pago {ProviderPaymentId}", providerPaymentId);
            return true;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo emitir el reembolso en Mercado Pago para el pago {ProviderPaymentId}", providerPaymentId);
            return false;
        }
    }

    /// <summary>
    /// Valida la firma x-signature de Mercado Pago: "ts=...,v1=..." donde v1 es
    /// HMAC-SHA256(secreto, "id:{dataId};request-id:{xRequestId};ts:{ts};").
    /// Las partes sin valor se omiten del manifiesto, igual que en la especificacion oficial.
    /// </summary>
    public bool ValidateWebhookSignature(string? signatureHeader, string? requestIdHeader, string dataId)
    {
        var secret = WebhookSecret;

        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signatureHeader))
        {
            return false;
        }

        string? ts = null;
        string? v1 = null;

        foreach (var part in signatureHeader.Split(','))
        {
            var pair = part.Split('=', 2);

            if (pair.Length != 2)
            {
                continue;
            }

            switch (pair[0].Trim())
            {
                case "ts":
                    ts = pair[1].Trim();
                    break;
                case "v1":
                    v1 = pair[1].Trim();
                    break;
            }
        }

        if (string.IsNullOrWhiteSpace(ts) || string.IsNullOrWhiteSpace(v1))
        {
            return false;
        }

        if (!long.TryParse(ts, out var tsSeconds))
        {
            return false;
        }

        // ponytail: ventana de 5 min contra replay de webhooks; ampliar si MP ajusta su tolerancia de reloj
        const long maxSignatureAgeSeconds = 300;
        var nowSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        if (Math.Abs(nowSeconds - tsSeconds) > maxSignatureAgeSeconds)
        {
            return false;
        }

        var manifestBuilder = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(dataId))
        {
            manifestBuilder.Append($"id:{dataId.ToLowerInvariant()};");
        }

        if (!string.IsNullOrWhiteSpace(requestIdHeader))
        {
            manifestBuilder.Append($"request-id:{requestIdHeader};");
        }

        manifestBuilder.Append($"ts:{ts};");

        var computed = Convert.ToHexString(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(manifestBuilder.ToString())))
            .ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(v1.ToLowerInvariant()));
    }
}
