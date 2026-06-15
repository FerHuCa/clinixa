namespace HealthHub.Api.Entities;

public sealed class UserRole
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Role { get; set; } = "patient";
    public string ScopeType { get; set; } = "global";
    public string? ScopeId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
}
