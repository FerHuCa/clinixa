namespace HealthHub.Api.Entities;

// AVISO: Este modelo cubre recetas de medicamentos de prescripción ordinaria (no controlados).
// Los medicamentos controlados (Grupos I-IV del COFEPRIS) requieren Receta Especial de Control
// con folio oficial y formato específico de la SSA/COFEPRIS. Esos flujos están FUERA DE ALCANCE
// de esta plataforma hasta que se implemente integración con el sistema SIFAR de COFEPRIS.
public sealed class Prescription
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string? AppointmentId { get; set; }

    // ── Campos legales para validez jurídica de la receta ──────────────────────────────
    // Datos del prescriptor (estampados en el momento de emitir; no dependen de cambios futuros al perfil)
    public string PrescriberName { get; set; } = string.Empty;     // Nombre completo del médico
    public string PrescriberLicense { get; set; } = string.Empty;  // Cédula profesional (DGETI/SSA)

    // Datos del paciente (estampados al emitir para que el PDF sea autocontenido)
    public string PatientFullName { get; set; } = string.Empty;    // Nombre completo del paciente
    public string? PatientIdentifier { get; set; }                 // CURP, fecha de nacimiento u otro ID

    // Vía de administración (oral, IV, tópica, etc.)
    public string Route { get; set; } = string.Empty;
    // ────────────────────────────────────────────────────────────────────────────────────

    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public int Refills { get; set; } = 0;
    public string Status { get; set; } = "active";
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
