namespace HealthHub.Api.Entities;

public sealed class ProfessionalAvailability
{
    public string Id { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public int Weekday { get; set; }
    public string StartsAt { get; set; } = string.Empty;
    public string EndsAt { get; set; } = string.Empty;
    public string Timezone { get; set; } = "America/Mexico_City";
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
}
