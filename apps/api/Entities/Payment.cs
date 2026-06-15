namespace HealthHub.Api.Entities;

public sealed class Payment
{
    public string Id { get; set; } = string.Empty;
    public string AppointmentId { get; set; } = string.Empty;
    public string PatientUserId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "MXN";
    public string Status { get; set; } = "pending";
    public string Provider { get; set; } = "mercadopago";
    public string ProviderPreferenceId { get; set; } = string.Empty;
    public string ProviderPaymentId { get; set; } = string.Empty;
    // Desglose marketplace: comision retenida por la plataforma segun CommissionTier.
    public decimal CommissionPercentage { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ProfessionalAmount { get; set; }
    // Transferencia al profesional: none | pending | completed | failed.
    public string TransferStatus { get; set; } = "none";
    public string ProviderTransferId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Appointment? Appointment { get; set; }
}
