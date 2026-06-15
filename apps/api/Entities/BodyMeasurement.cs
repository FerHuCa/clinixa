namespace HealthHub.Api.Entities;

public sealed class BodyMeasurement
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public DateTimeOffset MeasuredAt { get; set; } = DateTimeOffset.UtcNow;
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? HipCm { get; set; }
    public decimal? ArmCm { get; set; }
    public decimal? BodyFatPercentage { get; set; }
    public decimal? MuscleMassKg { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
