namespace HealthHub.Api.Entities;

/// <summary>
/// Cuenta de Mercado Pago vinculada por OAuth de un profesional independiente.
/// Los tokens se guardan cifrados; nunca se exponen en DTOs ni logs.
/// Status: pending | connected | verified | rejected | disconnected.
/// </summary>
public sealed class ProfessionalMercadoPago
{
    public string Id { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    // user_id (collector_id) de la cuenta Mercado Pago del profesional.
    public string MercadoPagoUserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    public string RefreshTokenEncrypted { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    // El access token de OAuth expira (180 dias); se renueva con el refresh token.
    public DateTimeOffset? TokenExpiresAt { get; set; }
    public string Status { get; set; } = "pending";
    public DateTimeOffset? ConnectedAt { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
}
