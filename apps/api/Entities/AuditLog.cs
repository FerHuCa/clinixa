namespace HealthHub.Api.Entities;

public sealed class AuditLog
{
    public string Id { get; set; } = string.Empty;
    public string? ActorUserId { get; set; }
    public string ActorRole { get; set; } = "anonymous";
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string? PatientId { get; set; }
    public string? ProfessionalId { get; set; }
    public string Outcome { get; set; } = "success";
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? ActorUser { get; set; }
}
