namespace HealthHub.Api.Entities;

public sealed class ProfessionalService
{
    public string Id { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string Mode { get; set; } = "hybrid";
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
}
