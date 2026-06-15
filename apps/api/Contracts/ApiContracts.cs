namespace HealthHub.Api.Contracts;

public sealed record CurrentUserDto(
    string Id,
    string FullName,
    string Email,
    string PrimaryRole,
    string? PatientId,
    string? ProfessionalId,
    string? Specialty);

public sealed record DemoSessionDto(
    string Id,
    string FullName,
    string Email,
    string PrimaryRole,
    string? PatientId,
    string? ProfessionalId,
    string Label,
    string? Specialty);

public sealed record AuthResponseDto(
    string Token,
    DateTimeOffset ExpiresAt,
    CurrentUserDto User);

public sealed record UpdateMyProfileRequest(
    string FullName,
    string? Role);

public sealed record PatientDto(
    string Id,
    string FullName,
    string Initials,
    string Status,
    string StatusLabel,
    int Age,
    string Email,
    string Phone,
    string Focus,
    string MainReason,
    string RiskLevel,
    string NextAppointment,
    string LastSession,
    string Progress,
    string Professional);

public sealed record ProfessionalServiceDto(
    string Id,
    string Name,
    string Description,
    int DurationMinutes,
    decimal Price,
    string Mode);

public sealed record ProfessionalAvailabilityDto(
    string Id,
    int Weekday,
    string WeekdayLabel,
    string StartsAt,
    string EndsAt);

public sealed record ProfessionalDto(
    string Id,
    string DisplayName,
    string Specialty,
    string SpecialtyLabel,
    string Bio,
    string Location,
    string AppointmentMode,
    decimal BasePrice,
    string Status,
    string VerificationStatus,
    string LicenseNumber,
    string WhatsappNumber,
    string NextAvailable,
    double AverageRating,
    int ReviewCount,
    IReadOnlyList<ProfessionalServiceDto> Services,
    IReadOnlyList<ProfessionalAvailabilityDto> Availability);

public sealed record ReviewDto(
    string Id,
    string ProfessionalId,
    string PatientName,
    int Rating,
    string Comment,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record AppointmentDto(
    string Id,
    string PatientId,
    string PatientName,
    string? ProfessionalId,
    string? ProfessionalServiceId,
    string ProfessionalName,
    string SpecialtyLabel,
    string Date,
    string Time,
    string Duration,
    string Type,
    string Mode,
    string Status,
    string StatusLabel,
    string Reason,
    // Estado del ultimo Payment de la cita: none | pending | approved | rejected | refunded.
    string PaymentStatus,
    // Proveedor del ultimo Payment: mercadopago | cash | null (sin pagos).
    string? PaymentProvider);

public sealed record PatientPortalAppointmentDto(
    string Id,
    string PatientId,
    string PatientName,
    string? ProfessionalId,
    string ProfessionalName,
    string SpecialtyLabel,
    string Date,
    string Time,
    string Duration,
    string Type,
    string Mode,
    string Status,
    string StatusLabel,
    string Reason,
    // Estado del ultimo Payment de la cita: none | pending | approved | rejected | refunded.
    string PaymentStatus,
    // Proveedor del ultimo Payment: mercadopago | cash | null (sin pagos).
    string? PaymentProvider);

public sealed record PatientRecordDto(
    string Id,
    string PatientId,
    string? ProfessionalId,
    string ProfessionalName,
    string RecordType,
    string RecordTypeLabel,
    string Title,
    string Summary,
    string Visibility,
    string Status);

public sealed record ProfessionalDashboardDto(
    ProfessionalDto Professional,
    IReadOnlyList<PatientPortalAppointmentDto> Appointments,
    int ScheduledCount,
    int CompletedCount,
    int PatientCount);

public sealed record AvailableSlotDto(
    string Id,
    string Date,
    string Time,
    string Label,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt);

public sealed record AuditLogDto(
    string Id,
    string? ActorUserId,
    string ActorRole,
    string Action,
    string ResourceType,
    string ResourceId,
    string? PatientId,
    string? ProfessionalId,
    string Outcome,
    DateTimeOffset CreatedAt);

public sealed record ClinicMemberDto(
    string Id,
    string UserId,
    string FullName,
    string Email,
    string Role,
    string? ProfessionalId,
    string Status);

public sealed record ClinicDto(
    string Id,
    string Name,
    string LegalName,
    string Location,
    string Status,
    IReadOnlyList<ClinicMemberDto> Members);

public sealed record ClinicInvitationDto(
    string Id,
    string ClinicId,
    string Email,
    string FullName,
    string Role,
    string Specialty,
    string LicenseNumber,
    string Status,
    string Token,
    string InvitedByUserId,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record ClinicInvitationDetailDto(
    string Id,
    string ClinicId,
    string ClinicName,
    string Email,
    string FullName,
    string Role,
    string RoleLabel,
    string Specialty,
    string SpecialtyLabel,
    string LicenseNumber,
    string Status,
    bool RequiresAccount,
    bool IsExpired,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record AcceptClinicInvitationRequest(
    string? Password,
    string? FullName);

public sealed record UpdateProfessionalProfileRequest(
    string DisplayName,
    string Bio,
    string Location,
    string Specialty,
    string AppointmentMode,
    decimal BasePrice,
    string? Timezone,
    string? WhatsappNumber,
    string? LicenseNumber);

public sealed record UpdateProfessionalVerificationRequest(
    string Status,
    string? Reason);

public sealed record CreateReviewRequest(
    string AppointmentId,
    int Rating,
    string Comment);

public sealed record ModerateReviewRequest(
    string Status,
    string? Reason);

public sealed record ProfessionalOnboardingDto(
    string ProfessionalId,
    string DisplayName,
    string Status,
    bool ProfileComplete,
    bool HasServices,
    bool HasAvailability,
    bool IsPublished,
    bool CanPublish,
    IReadOnlyList<string> Missing);

public sealed record NotificationDto(
    string Id,
    string Type,
    string Title,
    string Body,
    string Priority,
    string Status,
    string? AppointmentId,
    string? PatientId,
    string? ProfessionalId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt);

public sealed record NotificationPreferenceDto(
    string Id,
    string Channel,
    bool Enabled,
    bool AppointmentUpdates,
    bool ClinicUpdates,
    bool ReminderUpdates);

public sealed record ConsentDocumentDto(
    string ConsentType,
    string Title,
    string Version,
    bool Required,
    bool Accepted,
    DateTimeOffset? AcceptedAt);

public sealed record ConsentStatusDto(
    bool Completed,
    string PrivacyVersion,
    string TermsVersion,
    IReadOnlyList<ConsentDocumentDto> Documents);

public sealed record RecordConsentRequest(
    IReadOnlyList<string> Accepted);

public sealed record SoapNoteDto(
    string Id,
    string PatientId,
    string PatientName,
    string? AppointmentId,
    string Date,
    string Title,
    string Status,
    string StatusLabel,
    string Subjective,
    string Objective,
    string Assessment,
    string Plan,
    bool AiGenerated);

public sealed record CreatePatientRequest(
    string FullName,
    int Age,
    string Email,
    string Phone,
    string Focus,
    string MainReason);

public sealed record CreateAppointmentRequest(
    string PatientId,
    string Date,
    string Time,
    string? Duration,
    string? Type,
    string Reason,
    string? ProfessionalId,
    string? ProfessionalServiceId,
    string? Mode,
    string? CreatedByUserId);

public sealed record CancelAppointmentRequest(
    string? Reason);

public sealed record RescheduleAppointmentRequest(
    string Date,
    string Time,
    string? Reason);

public sealed record UpdateAppointmentStatusRequest(
    string Status,
    string? Reason);

public sealed record CreateProfessionalServiceRequest(
    string Name,
    string Description,
    int DurationMinutes,
    decimal Price,
    string Mode);

public sealed record UpdateProfessionalServiceRequest(
    string Name,
    string Description,
    int DurationMinutes,
    decimal Price,
    string Mode);

public sealed record CreateProfessionalAvailabilityRequest(
    int Weekday,
    string StartsAt,
    string EndsAt);

public sealed record UpdateProfessionalAvailabilityRequest(
    int Weekday,
    string StartsAt,
    string EndsAt);

public sealed record CreateClinicInvitationRequest(
    string Email,
    string FullName,
    string Role,
    string Specialty,
    string LicenseNumber);

public sealed record UpdateNotificationPreferenceRequest(
    bool Enabled,
    bool AppointmentUpdates,
    bool ClinicUpdates,
    bool ReminderUpdates);

public sealed record CreateSoapNoteRequest(
    string PatientId,
    string? AppointmentId,
    string Date,
    string Title,
    string Status,
    string Subjective,
    string Objective,
    string Assessment,
    string Plan,
    bool AiGenerated);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record CheckoutResponseDto(
    string PaymentId,
    string Status,
    decimal Amount,
    string Currency,
    string InitPoint,
    bool Simulated);

public sealed record ProfessionalVerificationDto(
    string Id,
    string DisplayName,
    string Specialty,
    string SpecialtyLabel,
    string Location,
    string LicenseNumber,
    string Status,
    string VerificationStatus,
    DateTimeOffset? LicenseVerifiedAt,
    string? LicenseVerifiedBy,
    DateTimeOffset CreatedAt);

// Top-5 UX: cobro en efectivo registrado por el profesional.
public sealed record CashPaymentResponseDto(
    string PaymentId,
    string Status,
    string Provider,
    decimal Amount,
    string Currency,
    AppointmentDto Appointment);

// Top-5 UX: estado de cuenta mensual del profesional.
public sealed record ProfessionalPaymentItemDto(
    string PaymentId,
    string AppointmentId,
    DateTimeOffset CreatedAt,
    string AppointmentDate,
    string PatientName,
    string ServiceName,
    decimal GrossAmount,
    decimal CommissionAmount,
    decimal NetAmount,
    string Provider,
    string Status);

// Totales del mes calculados solo sobre pagos approved.
// CashTotal y OnlineTotal son montos netos: CashTotal + OnlineTotal = NetTotal.
public sealed record ProfessionalPaymentsSummaryDto(
    decimal GrossTotal,
    decimal CommissionTotal,
    decimal NetTotal,
    decimal CashTotal,
    decimal OnlineTotal,
    int Count);

public sealed record ProfessionalPaymentsDto(
    string Month,
    IReadOnlyList<ProfessionalPaymentItemDto> Items,
    ProfessionalPaymentsSummaryDto Summary);

// Top-5 UX: trial y planes de suscripcion del piloto.
public sealed record SubscriptionPlanDto(
    string Name,
    decimal MonthlyPrice,
    string Currency,
    IReadOnlyList<string> Features);

public sealed record SubscriptionStatusDto(
    DateTimeOffset TrialStartedAt,
    DateTimeOffset TrialEndsAt,
    int DaysLeft,
    string Status,
    DateTimeOffset? InterestRegisteredAt,
    IReadOnlyList<SubscriptionPlanDto> Plans);

// Fase 4: Mercado Pago Marketplace
public sealed record MercadoPagoMarketplaceOAuthCallbackRequest(
    string Code,
    string State);

public sealed record VerifyMercadoPagoRequest(
    string Status,
    string? Notes = null);
