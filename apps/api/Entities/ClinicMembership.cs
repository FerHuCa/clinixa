namespace HealthHub.Api.Entities;

public sealed class ClinicMembership
{
    public string Id { get; set; } = string.Empty;
    public string ClinicId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? ProfessionalId { get; set; }
    public string Role { get; set; } = "professional";
    public string Status { get; set; } = "active";
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Clinic? Clinic { get; set; }
    public User? User { get; set; }
    public Professional? Professional { get; set; }
}
