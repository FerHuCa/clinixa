namespace HealthHub.Api.Entities;

public sealed class UserSession
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(8);
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
}
