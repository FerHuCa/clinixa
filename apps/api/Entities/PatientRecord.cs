namespace HealthHub.Api.Entities;

public sealed class PatientRecord
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string? ProfessionalId { get; set; }
    public string RecordType { get; set; } = "general";
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Visibility { get; set; } = "patient_visible";
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
    public List<SoapNote> SoapNotes { get; set; } = [];
}
