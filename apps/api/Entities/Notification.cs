namespace HealthHub.Api.Entities;

public sealed class Notification
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? AppointmentId { get; set; }
    public string? PatientId { get; set; }
    public string? ProfessionalId { get; set; }
    public string Type { get; set; } = "appointment";
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Priority { get; set; } = "normal";
    public string Status { get; set; } = "unread";
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public Appointment? Appointment { get; set; }
}
