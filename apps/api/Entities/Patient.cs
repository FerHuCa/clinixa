namespace HealthHub.Api.Entities;

public sealed class Patient
{
    public string Id { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public string StatusLabel { get; set; } = "Activo";
    public int Age { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Focus { get; set; } = string.Empty;
    public string MainReason { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = "Por evaluar";
    public string NextAppointment { get; set; } = "Sin cita";
    public string LastSession { get; set; } = "Sin historial";
    public string Progress { get; set; } = string.Empty;
    public string Professional { get; set; } = "Profesional asignado";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public List<Appointment> Appointments { get; set; } = [];
    public List<SoapNote> SoapNotes { get; set; } = [];
    public List<ProfessionalPatient> Professionals { get; set; } = [];
    public List<PatientRecord> PatientRecords { get; set; } = [];
    public List<Review> Reviews { get; set; } = [];
}
