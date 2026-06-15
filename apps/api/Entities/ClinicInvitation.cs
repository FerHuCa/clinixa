namespace HealthHub.Api.Entities;

public sealed class ClinicInvitation
{
    public string Id { get; set; } = string.Empty;
    public string ClinicId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "professional";
    public string Specialty { get; set; } = "other";
    public string LicenseNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public string Token { get; set; } = string.Empty;
    public string InvitedByUserId { get; set; } = string.Empty;
    public string? AcceptedUserId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddDays(14);
    public DateTimeOffset? ExpiryReminderSentAt { get; set; }
    public DateTimeOffset? AcceptedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Clinic? Clinic { get; set; }
    public User? InvitedByUser { get; set; }
    public User? AcceptedUser { get; set; }
}
