namespace HealthHub.Api.Entities;

public sealed class NotificationPreference
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Channel { get; set; } = "app";
    public bool Enabled { get; set; } = true;
    public bool AppointmentUpdates { get; set; } = true;
    public bool ClinicUpdates { get; set; } = true;
    public bool ReminderUpdates { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
}
