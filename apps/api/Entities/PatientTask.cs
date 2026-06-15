namespace HealthHub.Api.Entities;

public sealed class PatientTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string? AppointmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset? DueDate { get; set; }
    public string Status { get; set; } = "pending";
    public DateTimeOffset? CompletedAt { get; set; }
    public string? PatientNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
