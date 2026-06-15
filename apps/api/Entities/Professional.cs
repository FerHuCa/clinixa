namespace HealthHub.Api.Entities;

public sealed class Professional
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Specialty { get; set; } = "other";
    public string LicenseNumber { get; set; } = string.Empty;
    // Verificacion de cedula profesional: pending | verified | rejected.
    // Un profesional no aparece publicamente hasta estar verified.
    public string VerificationStatus { get; set; } = "pending";
    public DateTimeOffset? LicenseVerifiedAt { get; set; }
    public string? LicenseVerifiedBy { get; set; }
    public string WhatsappNumber { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string ProfilePhotoUrl { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Timezone { get; set; } = "America/Mexico_City";
    public string AppointmentMode { get; set; } = "hybrid";
    public decimal BasePrice { get; set; }
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Estado de la cuenta Mercado Pago vinculada (denormalizado de ProfessionalMercadoPago):
    // not_connected | pending | connected | verified | rejected.
    public string MercadoPagoStatus { get; set; } = "not_connected";

    // Momento en que el profesional registro interes en activar un plan de suscripcion
    // (CTA "Quiero activar mi plan" durante el piloto). Null = sin interes registrado.
    public DateTimeOffset? SubscriptionInterestAt { get; set; }

    public User? User { get; set; }
    public ProfessionalMercadoPago? MercadoPagoAccount { get; set; }
    public List<ProfessionalService> Services { get; set; } = [];
    public List<ProfessionalAvailability> Availability { get; set; } = [];
    public List<ProfessionalPatient> Patients { get; set; } = [];
    public List<PatientRecord> PatientRecords { get; set; } = [];
    public List<Review> Reviews { get; set; } = [];
    public List<ClinicMembership> ClinicMemberships { get; set; } = [];
}
