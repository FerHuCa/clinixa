namespace HealthHub.Api.Entities;

/// <summary>
/// Suscripcion recurrente de un profesional via MercadoPago preapproval.
/// Un profesional puede tener multiples filas (historial), pero solo una activa.
/// Status: pending_checkout | authorized | paused | cancelled | expired.
/// </summary>
public sealed class ProfessionalSubscription
{
    public string Id { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string PlanId { get; set; } = "basico";

    /// <summary>ID del preapproval en MercadoPago (vacio hasta confirmar por webhook).</summary>
    public string MpPreapprovalId { get; set; } = string.Empty;

    /// <summary>URL de checkout de MP a la que se redirige al profesional.</summary>
    public string CheckoutUrl { get; set; } = string.Empty;

    public string Status { get; set; } = "pending_checkout";
    public decimal AmountMxn { get; set; }

    public DateTimeOffset? AuthorizedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public DateTimeOffset? NextPaymentDate { get; set; }

    // Anti-replay
    public DateTimeOffset? LastWebhookAt { get; set; }
    public string LastWebhookEventId { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
}
