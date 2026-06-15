namespace HealthHub.Api.Entities;

public sealed class Review
{
    public string Id { get; set; } = string.Empty;
    public string AppointmentId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    // published | hidden. Las resenas no son editables por el paciente; solo un
    // administrador puede ocultarlas (moderacion) y queda rastro de quien y por que.
    public string Status { get; set; } = "published";
    public string? ModeratedByUserId { get; set; }
    public DateTimeOffset? ModeratedAt { get; set; }
    public string ModerationReason { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
    public Patient? Patient { get; set; }
}
