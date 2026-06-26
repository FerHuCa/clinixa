using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace HealthHub.Api.Infrastructure;

public sealed record MpPreapprovalResult(
    string PreapprovalId,
    string CheckoutUrl,
    string Outcome);

/// <summary>
/// Integracion con MercadoPago preapproval (cobro recurrente de suscripciones).
/// Modo simulado: sin MERCADOPAGO_ACCESS_TOKEN devuelve datos ficticios y no llama a MP.
/// Nunca lanza excepcion hacia el caller.
/// </summary>
public sealed class MercadoPagoSubscriptionService(
    IConfiguration configuration,
    ILogger<MercadoPagoSubscriptionService> logger,
    HttpClient httpClient)
{
    private string? AccessToken =>
        configuration["MercadoPago:AccessToken"] ?? Environment.GetEnvironmentVariable("MERCADOPAGO_ACCESS_TOKEN");

    public bool IsConfigured => !string.IsNullOrWhiteSpace(AccessToken);

    /// <summary>
    /// Crea un preapproval (suscripcion recurrente) en MercadoPago y devuelve la URL
    /// de checkout a la que se redirige al profesional para autorizar el cobro.
    /// En modo simulado devuelve una URL local sin llamar a MP.
    /// </summary>
    public async Task<MpPreapprovalResult?> CreatePreapprovalAsync(
        string subscriptionId,
        string planId,
        decimal amountMxn,
        string payerEmail,
        string webBaseUrl,
        string notificationUrl)
    {
        var successUrl = $"{webBaseUrl}/suscripcion?checkout=success&subId={subscriptionId}";
        var planLabel = planId == "pro" ? "Plan Pro Clinixa" : "Plan Básico Clinixa";

        if (!IsConfigured)
        {
            logger.LogInformation(
                "[MP PREAPPROVAL SIMULADO] subscriptionId={SubId} plan={Plan} amount={Amount}",
                subscriptionId, planId, amountMxn);

            // En modo simulado redirigimos a la pagina de suscripcion con flag de exito
            // para que la UI pueda mostrar el estado sin llamar al proveedor.
            return new MpPreapprovalResult(
                $"sim-preapproval-{subscriptionId}",
                $"{successUrl}&simulated=1",
                "simulated");
        }

        try
        {
            var payload = new
            {
                preapproval_plan_id = (string?)null,       // sin plan externo; usamos ad-hoc
                reason = planLabel,
                external_reference = subscriptionId,
                payer_email = payerEmail,
                auto_recurring = new
                {
                    frequency = 1,
                    frequency_type = "months",
                    transaction_amount = amountMxn,
                    currency_id = "MXN"
                },
                back_url = successUrl,
                notification_url = notificationUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                    ? notificationUrl
                    : (string?)null,
                status = "pending"                          // pending = el usuario aun no autorizo
            };

            using var requestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                "https://api.mercadopago.com/preapproval")
            {
                Content = JsonContent.Create(payload)
            };
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var response = await httpClient.SendAsync(requestMessage);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning(
                    "MercadoPago respondio {Status} al crear preapproval para {SubId}: {Body}",
                    (int)response.StatusCode, subscriptionId, body);
                return null;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var preapprovalId = doc.RootElement.GetProperty("id").GetString() ?? string.Empty;
            var checkoutUrl = doc.RootElement.TryGetProperty("init_point", out var ip)
                ? ip.GetString() ?? successUrl
                : successUrl;

            return new MpPreapprovalResult(preapprovalId, checkoutUrl, "created");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo crear el preapproval de MP para {SubId}", subscriptionId);
            return null;
        }
    }

    /// <summary>
    /// Consulta el estado actual de un preapproval en MP.
    /// Devuelve null en modo simulado o ante cualquier error.
    /// </summary>
    public async Task<(string Status, DateTimeOffset? NextPaymentDate)?> GetPreapprovalStatusAsync(string preapprovalId)
    {
        if (!IsConfigured || preapprovalId.StartsWith("sim-", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        try
        {
            using var req = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://api.mercadopago.com/preapproval/{preapprovalId}");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var resp = await httpClient.SendAsync(req);

            if (!resp.IsSuccessStatusCode)
            {
                return null;
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            var status = doc.RootElement.TryGetProperty("status", out var st)
                ? st.GetString() ?? "pending"
                : "pending";

            DateTimeOffset? nextPayment = null;

            if (doc.RootElement.TryGetProperty("next_payment_date", out var np) &&
                np.ValueKind == JsonValueKind.String &&
                DateTimeOffset.TryParse(np.GetString(), out var npDate))
            {
                nextPayment = npDate;
            }

            return (status, nextPayment);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo consultar el preapproval {PreapprovalId}", preapprovalId);
            return null;
        }
    }
}
