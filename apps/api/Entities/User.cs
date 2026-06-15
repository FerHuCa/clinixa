namespace HealthHub.Api.Entities;

public sealed class User
{
    public string Id { get; set; } = string.Empty;
    public string? ClerkUserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PrimaryRole { get; set; } = "patient";
    public string Status { get; set; } = "active";
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<UserRole> UserRoles { get; set; } = [];
    public List<UserSession> Sessions { get; set; } = [];
    public List<ClinicMembership> ClinicMemberships { get; set; } = [];
    public List<Notification> Notifications { get; set; } = [];
    public List<NotificationPreference> NotificationPreferences { get; set; } = [];
    public List<UserConsent> Consents { get; set; } = [];
    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
