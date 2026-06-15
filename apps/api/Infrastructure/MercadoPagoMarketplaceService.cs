using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HealthHub.Api.Infrastructure;

public sealed record MercadoPagoOAuthCredentials(
    string AccessToken,
    string RefreshToken,
    string MercadoPagoUserId,
    string PublicKey,
    DateTimeOffset TokenExpiresAt,
    bool Simulated);

public sealed record MercadoPagoAccountInfo(string Email, string Nickname);

public sealed record MercadoPagoMarketplacePreference(string PreferenceId, string InitPoint, string Outcome);

/// <summary>
/// Integracion marketplace (split de pagos) con Mercado Pago via OAuth.
/// El pago del paciente llega DIRECTO a la cuenta MP del profesional y la plataforma
/// recibe automaticamente marketplace_fee: no hay dispersiones ni transfers manuales.
/// Requiere una aplicacion MP tipo marketplace (MERCADOPAGO_CLIENT_ID/CLIENT_SECRET);
/// sin credenciales opera en modo simulado. Nunca lanza excepcion hacia el caller.
/// </summary>
public sealed class MercadoPagoMarketplaceService(
    IConfiguration configuration,
    ILogger<MercadoPagoMarketplaceService> logger,
    HttpClient httpClient)
{
    private const int OAuthStateMaxAgeSeconds = 1800;

    private string? ClientId =>
        configuration["MercadoPago:ClientId"] ?? Environment.GetEnvironmentVariable("MERCADOPAGO_CLIENT_ID");

    private string? ClientSecret =>
        configuration["MercadoPago:ClientSecret"] ?? Environment.GetEnvironmentVariable("MERCADOPAGO_CLIENT_SECRET");

    // Dominio de autorizacion del sitio MLM (Mexico); configurable para otros paises.
    private string AuthorizationBaseUrl =>
        configuration["MercadoPago:AuthorizationBaseUrl"] ?? "https://auth.mercadopago.com.mx";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ClientSecret);

    private byte[] StateKey =>
        SHA256.HashData(Encoding.UTF8.GetBytes(ClientSecret ?? "dev-marketplace-state-secret"));

    /// <summary>
    /// Genera el parametro state firmado (HMAC) que amarra el callback de OAuth al
    /// profesional que inicio la vinculacion. Evita CSRF: un state ajeno o caduco se rechaza.
    /// </summary>
    public string CreateOAuthState(string professionalId)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var payload = $"{professionalId}|{timestamp}";
        var signature = Convert.ToHexString(
            HMACSHA256.HashData(StateKey, Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();

        return Convert.ToBase64String(Encoding.UTF8.GetBytes($"{payload}|{signature}"));
    }

    /// <summary>Valida el state del callback. Devuelve el professionalId o null si es invalido/caduco.</summary>
    public string? TryParseOAuthState(string? state)
    {
        if (string.IsNullOrWhiteSpace(state))
        {
            return null;
        }

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(state));
            var parts = decoded.Split('|');

            if (parts.Length != 3 || !long.TryParse(parts[1], out var timestamp))
            {
                return null;
            }

            var expected = Convert.ToHexString(
                HMACSHA256.HashData(StateKey, Encoding.UTF8.GetBytes($"{parts[0]}|{parts[1]}"))).ToLowerInvariant();

            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(expected),
                    Encoding.UTF8.GetBytes(parts[2].ToLowerInvariant())))
            {
                return null;
            }

            var age = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - timestamp;

            return age is >= -300 and <= OAuthStateMaxAgeSeconds ? parts[0] : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }

    /// <summary>
    /// URL donde el profesional autoriza a la plataforma sobre su cuenta MP.
    /// En modo simulado regresa directo al callback con un codigo ficticio para
    /// poder probar el flujo completo en local sin credenciales.
    /// </summary>
    public string BuildAuthorizationUrl(string state, string redirectUri)
    {
        if (!IsConfigured)
        {
            return $"{redirectUri}?code=sim-auth-code&state={Uri.EscapeDataString(state)}";
        }

        return $"{AuthorizationBaseUrl}/authorization" +
            $"?client_id={Uri.EscapeDataString(ClientId!)}" +
            "&response_type=code" +
            "&platform_id=mp" +
            $"&state={Uri.EscapeDataString(state)}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}";
    }

    /// <summary>Canjea el codigo del callback por las credenciales OAuth del profesional.</summary>
    public async Task<MercadoPagoOAuthCredentials?> ExchangeAuthorizationCodeAsync(string code, string redirectUri)
    {
        if (!IsConfigured)
        {
            logger.LogInformation("[MERCADOPAGO MARKETPLACE SIMULADO] Canje de codigo OAuth {Code}", code);
            return SimulatedCredentials();
        }

        return await RequestTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = redirectUri
        });
    }

    /// <summary>
    /// Renueva las credenciales con el refresh token. Los access tokens OAuth de MP
    /// expiran a los 180 dias; el refresh es de un solo uso y devuelve uno nuevo.
    /// </summary>
    public async Task<MercadoPagoOAuthCredentials?> RefreshAccessTokenAsync(string refreshToken)
    {
        if (!IsConfigured || refreshToken.StartsWith("sim-", StringComparison.Ordinal))
        {
            logger.LogInformation("[MERCADOPAGO MARKETPLACE SIMULADO] Refresh de token OAuth");
            return SimulatedCredentials();
        }

        return await RequestTokenAsync(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken
        });
    }

    /// <summary>Datos basicos de la cuenta MP del profesional (para mostrar y auditar la vinculacion).</summary>
    public async Task<MercadoPagoAccountInfo?> GetAccountInfoAsync(string accessToken)
    {
        if (accessToken.StartsWith("sim-", StringComparison.Ordinal))
        {
            return new MercadoPagoAccountInfo("simulado@mercadopago.test", "SIMULADO");
        }

        try
        {
            using var requestMessage = new HttpRequestMessage(HttpMethod.Get, "https://api.mercadopago.com/users/me");
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await httpClient.SendAsync(requestMessage);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Mercado Pago respondio {Status} al consultar la cuenta del profesional", (int)response.StatusCode);
                return null;
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = document.RootElement;

            return new MercadoPagoAccountInfo(
                root.TryGetProperty("email", out var email) ? email.GetString() ?? string.Empty : string.Empty,
                root.TryGetProperty("nickname", out var nickname) ? nickname.GetString() ?? string.Empty : string.Empty);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo consultar la cuenta de Mercado Pago del profesional");
            return null;
        }
    }

    /// <summary>
    /// Crea la preferencia de pago CON EL TOKEN DEL PROFESIONAL e incluye marketplace_fee:
    /// el dinero llega a la cuenta del profesional y MP acredita la comision a la plataforma.
    /// </summary>
    public async Task<MercadoPagoMarketplacePreference?> CreateMarketplacePreferenceAsync(
        string sellerAccessToken,
        string paymentId,
        string title,
        decimal amount,
        decimal marketplaceFee,
        string currency,
        string payerEmail,
        string webBaseUrl,
        string notificationUrl)
    {
        var returnUrl = $"{webBaseUrl}/portal-paciente/pago";

        if (!IsConfigured || sellerAccessToken.StartsWith("sim-", StringComparison.Ordinal))
        {
            logger.LogInformation(
                "[MERCADOPAGO MARKETPLACE SIMULADO] Preferencia para pago {PaymentId}: {Title} ${Amount} {Currency} (comision ${Fee})",
                paymentId, title, amount, currency, marketplaceFee);

            return new MercadoPagoMarketplacePreference(
                $"sim-mkt-pref-{paymentId}",
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
                ["marketplace_fee"] = marketplaceFee,
                ["back_urls"] = new
                {
                    success = $"{returnUrl}?status=approved",
                    pending = $"{returnUrl}?status=pending",
                    failure = $"{returnUrl}?status=rejected"
                }
            };

            // Mismas reglas que el checkout directo: MP exige HTTPS para auto_return
            // y notification_url; en desarrollo local (http) se omiten.
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
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", sellerAccessToken);

            var response = await httpClient.SendAsync(requestMessage);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Mercado Pago respondio {Status} al crear preferencia marketplace: {Body}", (int)response.StatusCode, body);
                return null;
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var preferenceId = document.RootElement.GetProperty("id").GetString() ?? string.Empty;
            var initPoint = document.RootElement.GetProperty("init_point").GetString() ?? string.Empty;

            return new MercadoPagoMarketplacePreference(preferenceId, initPoint, "created");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo crear la preferencia marketplace para el pago {PaymentId}", paymentId);
            return null;
        }
    }

    private async Task<MercadoPagoOAuthCredentials?> RequestTokenAsync(Dictionary<string, string> grantParameters)
    {
        try
        {
            var payload = new Dictionary<string, string>(grantParameters)
            {
                ["client_id"] = ClientId!,
                ["client_secret"] = ClientSecret!
            };

            var response = await httpClient.PostAsync(
                "https://api.mercadopago.com/oauth/token",
                new FormUrlEncodedContent(payload));

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Mercado Pago respondio {Status} en oauth/token: {Body}", (int)response.StatusCode, body);
                return null;
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = document.RootElement;

            var accessToken = root.GetProperty("access_token").GetString() ?? string.Empty;
            var refreshToken = root.TryGetProperty("refresh_token", out var refresh)
                ? refresh.GetString() ?? string.Empty
                : string.Empty;
            var userId = root.TryGetProperty("user_id", out var user)
                ? (user.ValueKind == JsonValueKind.Number ? user.GetRawText() : user.GetString() ?? string.Empty)
                : string.Empty;
            var publicKey = root.TryGetProperty("public_key", out var key)
                ? key.GetString() ?? string.Empty
                : string.Empty;
            var expiresInSeconds = root.TryGetProperty("expires_in", out var expires)
                ? expires.GetInt64()
                : 15552000; // 180 dias, el default documentado de MP.

            return new MercadoPagoOAuthCredentials(
                accessToken,
                refreshToken,
                userId,
                publicKey,
                DateTimeOffset.UtcNow.AddSeconds(expiresInSeconds),
                Simulated: false);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Fallo la peticion de token OAuth a Mercado Pago");
            return null;
        }
    }

    private static MercadoPagoOAuthCredentials SimulatedCredentials()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];

        return new MercadoPagoOAuthCredentials(
            $"sim-access-{suffix}",
            $"sim-refresh-{suffix}",
            $"sim-user-{suffix}",
            $"sim-public-key-{suffix}",
            DateTimeOffset.UtcNow.AddDays(180),
            Simulated: true);
    }
}
