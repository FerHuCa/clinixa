namespace HealthHub.Api.Entities;

public sealed class Clinic
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<ClinicMembership> Memberships { get; set; } = [];
    public List<ClinicInvitation> Invitations { get; set; } = [];
}
