namespace HealthHub.Api.Entities;

public sealed class UserConsent
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ConsentType { get; set; } = string.Empty;
    public string DocumentVersion { get; set; } = string.Empty;
    public DateTimeOffset AcceptedAt { get; set; } = DateTimeOffset.UtcNow;
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
}
