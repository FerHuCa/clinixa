namespace HealthHub.Api.Entities;

/// <summary>
/// Tier de comision de la plataforma por tipo de licencia/especialidad.
/// LicenseType usa los valores de Professional.Specialty (doctor, psychologist,
/// physiotherapist, nutritionist) mas "default" como respaldo obligatorio.
/// </summary>
public sealed class CommissionTier
{
    public string Id { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty;
    // Porcentaje que retiene la plataforma (ej. 15.00 = 15%).
    public decimal CommissionPercentage { get; set; }
    // Citas completadas minimas para que el tier aplique (0 = siempre).
    public int MinAppointmentsThreshold { get; set; }
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
