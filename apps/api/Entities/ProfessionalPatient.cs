namespace HealthHub.Api.Entities;

public sealed class ProfessionalPatient
{
    public string Id { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public string? CreatedFromAppointmentId { get; set; }
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EndedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
    public Patient? Patient { get; set; }
}
