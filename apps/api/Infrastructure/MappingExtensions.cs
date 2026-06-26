using System.Globalization;
using System.Text;
using HealthHub.Api.Contracts;
using HealthHub.Api.Entities;

namespace HealthHub.Api.Infrastructure;

public static class MappingExtensions
{
    // Quita acentos/diacriticos para comparaciones acento-insensibles (busqueda de
    // profesionales). Mantiene la cadena legible intacta donde se muestra; solo se usa
    // para normalizar antes de comparar.
    public static string Slugify(string displayName, string id)
    {
        var baseSlug = RemoveDiacritics((displayName ?? string.Empty).ToLowerInvariant());
        var sb = new System.Text.StringBuilder();
        foreach (var ch in baseSlug)
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (ch is ' ' or '-' or '_' or '.') sb.Append('-');
        }
        var kebab = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), "-+", "-").Trim('-');
        if (string.IsNullOrEmpty(kebab)) kebab = "profesional";
        // Sufijo estable de 6 hex derivado del Id (unicidad sin columna ni migración).
        using var sha = System.Security.Cryptography.SHA256.Create();
        var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(id ?? string.Empty));
        var suffix = Convert.ToHexString(hash)[..6].ToLowerInvariant();
        return $"{kebab}-{suffix}";
    }

    public static string RemoveDiacritics(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(ch);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    public static CurrentUserDto ToCurrentUserDto(this User user) =>
        new(
            user.Id,
            user.FullName,
            user.Email,
            user.PrimaryRole,
            user.Patient?.Id,
            user.Professional?.Id,
            user.Professional?.Specialty);

    public static DemoSessionDto ToDemoSessionDto(this User user) =>
        new(
            user.Id,
            user.FullName,
            user.Email,
            user.PrimaryRole,
            user.Patient?.Id,
            user.Professional?.Id,
            user.PrimaryRole switch
            {
                "patient" => $"Paciente · {user.FullName}",
                "clinic_admin" => $"Admin clínica · {user.FullName}",
                "internal_admin" => $"Admin HealthHub · {user.FullName}",
                _ => $"Profesional · {user.FullName}"
            },
            user.Professional?.Specialty);

    public static PatientDto ToDto(this Patient patient) =>
        new(
            patient.Id,
            patient.FullName,
            patient.Initials,
            patient.Status,
            patient.StatusLabel,
            patient.Age,
            patient.Email,
            patient.Phone,
            patient.Focus,
            patient.MainReason,
            patient.RiskLevel,
            patient.NextAppointment,
            patient.LastSession,
            patient.Progress,
            patient.Professional);

    public static ProfessionalDto ToDto(this Professional professional)
    {
        var publishedReviews = professional.Reviews
            .Where(review => review.Status == "published")
            .ToList();

        return new ProfessionalDto(
            professional.Id,
            professional.DisplayName,
            professional.Specialty,
            SpecialtyLabel(professional.Specialty),
            professional.Bio,
            professional.Location,
            professional.AppointmentMode,
            professional.BasePrice,
            professional.Status,
            professional.VerificationStatus,
            professional.LicenseNumber,
            professional.WhatsappNumber,
            NextAvailability(professional.Availability),
            publishedReviews.Count == 0 ? 0 : Math.Round(publishedReviews.Average(review => review.Rating), 1),
            publishedReviews.Count,
            professional.Services
                .Where(service => service.Status == "active")
                .OrderBy(service => service.Price)
                .Select(service => service.ToDto())
                .ToList(),
            professional.Availability
                .Where(availability => availability.Status == "active")
                .OrderBy(availability => availability.Weekday)
                .ThenBy(availability => availability.StartsAt)
                .Select(availability => availability.ToDto())
                .ToList(),
            Slugify(professional.DisplayName, professional.Id),
            professional.ProfilePhotoUrl ?? "");
    }

    public static ProfessionalServiceDto ToDto(this ProfessionalService service) =>
        new(
            service.Id,
            service.Name,
            service.Description,
            service.DurationMinutes,
            service.Price,
            service.Mode);

    public static ProfessionalAvailabilityDto ToDto(this ProfessionalAvailability availability) =>
        new(
            availability.Id,
            availability.Weekday,
            WeekdayLabel(availability.Weekday),
            availability.StartsAt,
            availability.EndsAt);

    public static ReviewDto ToDto(this Review review) =>
        new(
            review.Id,
            review.ProfessionalId,
            review.PatientName,
            review.Rating,
            review.Comment,
            review.Status,
            review.CreatedAt);

    // Returns "First L." (first name + last initial) or "F." (single token) so the
    // public endpoint never exposes a full surname (CWE-359).
    internal static string AnonymizePatientName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            return "Paciente";

        var tokens = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length == 1)
            return tokens[0][0] + ".";

        // Use the first token as the display first name and the last token's initial
        // as the anonymized surname, e.g. "María González López" → "María G."
        return $"{tokens[0]} {char.ToUpperInvariant(tokens[^1][0])}.";
    }

    public static PublicReviewDto ToPublicDto(this Review review) =>
        new(
            review.Id,
            review.ProfessionalId,
            AnonymizePatientName(review.PatientName),
            review.Rating,
            review.Comment,
            review.Status,
            review.CreatedAt);

    // lastPayment: ultimo Payment de la cita (por CreatedAt); null cuando no hay pagos.
    public static AppointmentDto ToDto(this Appointment appointment, Payment? lastPayment = null) =>
        new(
            appointment.Id,
            appointment.PatientId,
            appointment.PatientName,
            appointment.ProfessionalId,
            appointment.ProfessionalServiceId,
            string.IsNullOrWhiteSpace(appointment.ProfessionalName) ? "Profesional por asignar" : appointment.ProfessionalName,
            SpecialtyLabel(appointment.Professional?.Specialty ?? "other"),
            appointment.Date,
            appointment.Time,
            appointment.Duration,
            appointment.Type,
            appointment.Mode,
            appointment.Status,
            appointment.StatusLabel,
            appointment.Reason,
            lastPayment?.Status ?? "none",
            lastPayment?.Provider);

    public static PatientPortalAppointmentDto ToPortalDto(this Appointment appointment, Professional? professional, Payment? lastPayment = null) =>
        new(
            appointment.Id,
            appointment.PatientId,
            appointment.PatientName,
            appointment.ProfessionalId,
            string.IsNullOrWhiteSpace(appointment.ProfessionalName) ? professional?.DisplayName ?? "Profesional por asignar" : appointment.ProfessionalName,
            SpecialtyLabel(professional?.Specialty ?? "other"),
            appointment.Date,
            appointment.Time,
            appointment.Duration,
            appointment.Type,
            appointment.Mode,
            appointment.Status,
            appointment.StatusLabel,
            appointment.Reason,
            lastPayment?.Status ?? "none",
            lastPayment?.Provider);

    public static PatientRecordDto ToDto(this PatientRecord record, Professional? professional) =>
        new(
            record.Id,
            record.PatientId,
            record.ProfessionalId,
            professional?.DisplayName ?? "Equipo HealthHub",
            record.RecordType,
            RecordTypeLabel(record.RecordType),
            record.Title,
            record.Summary,
            record.Visibility,
            record.Status);

    public static SoapNoteDto ToDto(this SoapNote note) =>
        new(
            note.Id,
            note.PatientId,
            note.PatientName,
            note.AppointmentId,
            note.Date,
            note.Title,
            note.Status,
            note.StatusLabel,
            note.Subjective,
            note.Objective,
            note.Assessment,
            note.Plan,
            note.AiGenerated);

    public static ClinicDto ToDto(this Clinic clinic) =>
        new(
            clinic.Id,
            clinic.Name,
            clinic.LegalName,
            clinic.Location,
            clinic.Status,
            clinic.Memberships
                .Where(membership => membership.Status == "active")
                .OrderBy(membership => membership.Role)
                .ThenBy(membership => membership.User?.FullName)
                .Select(membership => membership.ToDto())
                .ToList());

    public static ClinicMemberDto ToDto(this ClinicMembership membership) =>
        new(
            membership.Id,
            membership.UserId,
            membership.User?.FullName ?? "Usuario sin cargar",
            membership.User?.Email ?? string.Empty,
            membership.Role,
            membership.ProfessionalId,
            membership.Status);

    public static NotificationDto ToDto(this Notification notification) =>
        new(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Body,
            notification.Priority,
            notification.Status,
            notification.AppointmentId,
            notification.PatientId,
            notification.ProfessionalId,
            notification.CreatedAt,
            notification.ReadAt);

    public static ClinicInvitationDto ToDto(this ClinicInvitation invitation) =>
        new(
            invitation.Id,
            invitation.ClinicId,
            invitation.Email,
            invitation.FullName,
            invitation.Role,
            invitation.Specialty,
            invitation.LicenseNumber,
            invitation.Status,
            invitation.Token,
            invitation.InvitedByUserId,
            invitation.ExpiresAt,
            invitation.CreatedAt);

    public static ClinicInvitationDetailDto ToDetailDto(this ClinicInvitation invitation, string clinicName, bool requiresAccount, DateTimeOffset now) =>
        new(
            invitation.Id,
            invitation.ClinicId,
            clinicName,
            invitation.Email,
            invitation.FullName,
            invitation.Role,
            ClinicRoleLabel(invitation.Role),
            invitation.Specialty,
            SpecialtyLabel(invitation.Specialty),
            invitation.LicenseNumber,
            invitation.Status,
            requiresAccount,
            invitation.ExpiresAt <= now,
            invitation.ExpiresAt,
            invitation.CreatedAt);

    public static NotificationPreferenceDto ToDto(this NotificationPreference preference) =>
        new(
            preference.Id,
            preference.Channel,
            preference.Enabled,
            preference.AppointmentUpdates,
            preference.ClinicUpdates,
            preference.ReminderUpdates);

    public static string SpecialtyLabel(string specialty) =>
        specialty switch
        {
            "doctor" => "Medicina",
            "psychologist" => "Psicología",
            "physiotherapist" => "Fisioterapia",
            "nutritionist" => "Nutrición",
            _ => "Salud"
        };

    public static string ClinicRoleLabel(string role) =>
        role switch
        {
            "clinic_admin" => "Administrador de clínica",
            "internal_admin" => "Administrador HealthHub",
            "patient" => "Paciente",
            _ => "Profesional"
        };

    public static string RecordTypeLabel(string recordType) =>
        recordType switch
        {
            "medical" => "Médico",
            "psychology" => "Psicología",
            "physiotherapy" => "Fisioterapia",
            "nutrition" => "Nutrición",
            _ => "General"
        };

    private static string NextAvailability(IEnumerable<ProfessionalAvailability> availability)
    {
        var next = availability
            .Where(item => item.Status == "active")
            .OrderBy(item => item.Weekday)
            .ThenBy(item => item.StartsAt)
            .FirstOrDefault();

        return next is null ? "Sin disponibilidad publicada" : $"{WeekdayLabel(next.Weekday)} {next.StartsAt}";
    }

    private static string WeekdayLabel(int weekday) =>
        weekday switch
        {
            1 => "Lunes",
            2 => "Martes",
            3 => "Miércoles",
            4 => "Jueves",
            5 => "Viernes",
            6 => "Sábado",
            7 => "Domingo",
            _ => "Por definir"
        };
}
