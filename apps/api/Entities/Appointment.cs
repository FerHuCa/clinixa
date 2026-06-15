namespace HealthHub.Api.Entities;

public sealed class Appointment
{
    public string Id { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? ProfessionalId { get; set; }
    public string? ProfessionalServiceId { get; set; }
    public string ProfessionalName { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public DateTimeOffset? StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public string Duration { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Mode { get; set; } = "in_person";
    public string Status { get; set; } = "scheduled";
    public string StatusLabel { get; set; } = "Programada";
    public string Reason { get; set; } = string.Empty;
    public string? CreatedByUserId { get; set; }
    public string? CancellationReason { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public string? CancelledByUserId { get; set; }
    public string? RescheduleReason { get; set; }
    public DateTimeOffset? RescheduledAt { get; set; }
    public string? RescheduledByUserId { get; set; }
    public DateTimeOffset? ReminderSentAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
    public User? CreatedByUser { get; set; }
    public User? CancelledByUser { get; set; }
    public User? RescheduledByUser { get; set; }
    public List<SoapNote> SoapNotes { get; set; } = [];
}
