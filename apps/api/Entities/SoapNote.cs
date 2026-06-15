namespace HealthHub.Api.Entities;

public sealed class SoapNote
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? ProfessionalId { get; set; }
    public string? AppointmentId { get; set; }
    public string? PatientRecordId { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string StatusLabel { get; set; } = "Borrador";
    public string Subjective { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string Assessment { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public bool AiGenerated { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Appointment? Appointment { get; set; }
    public PatientRecord? PatientRecord { get; set; }
}
