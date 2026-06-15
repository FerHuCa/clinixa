using HealthHub.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace HealthHub.Api.Infrastructure;

/// <summary>
/// Job en segundo plano que envia correos transaccionales de recordatorio en best-effort:
/// recordatorios de citas dentro de las proximas 24 horas y avisos de invitaciones de clinica
/// proximas a expirar (dentro de 48 horas). Corre 1 minuto despues del arranque y luego cada
/// 30 minutos. Cada correo se marca con su columna de dedup (ReminderSentAt / ExpiryReminderSentAt)
/// para no reenviarlo. Jamas lanza hacia el host: toda la corrida y cada envio van en try/catch,
/// y el envio mismo nunca falla la peticion porque EmailSender degrada a log simulado sin API key.
/// </summary>
public sealed class EmailReminderService(
    IServiceScopeFactory scopeFactory,
    ILogger<EmailReminderService> logger) : BackgroundService
{
    private static readonly TimeSpan InitialDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);
    // Ventana de recordatorio de citas: las que arrancan dentro de las proximas 24 horas.
    private static readonly TimeSpan AppointmentWindow = TimeSpan.FromHours(24);
    // Ventana de aviso de expiracion: invitaciones que vencen dentro de las proximas 48 horas.
    private static readonly TimeSpan InvitationExpiryWindow = TimeSpan.FromHours(48);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(InitialDelay, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync(stoppingToken);

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HealthHubDbContext>();
            var emailSender = scope.ServiceProvider.GetRequiredService<EmailSender>();
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

            await SendAppointmentRemindersAsync(db, emailSender, stoppingToken);
            await SendInvitationExpiryRemindersAsync(db, emailSender, configuration, stoppingToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "[EMAIL REMINDER JOB] Error en la corrida de recordatorios");
        }
    }

    // Recordatorios de citas dentro de las proximas 24 horas, una sola vez por cita.
    private async Task SendAppointmentRemindersAsync(HealthHubDbContext db, EmailSender emailSender, CancellationToken stoppingToken)
    {
        var now = DateTimeOffset.UtcNow;
        var horizon = now.Add(AppointmentWindow);
        var statuses = new[] { "scheduled", "confirmed" };

        var appointments = await db.Appointments
            .Include(appointment => appointment.Patient)
                .ThenInclude(patient => patient!.User)
            .Where(appointment => appointment.StartsAt != null
                && appointment.StartsAt >= now
                && appointment.StartsAt <= horizon
                && statuses.Contains(appointment.Status)
                && appointment.ReminderSentAt == null)
            .ToListAsync(stoppingToken);

        if (appointments.Count == 0)
        {
            return;
        }

        logger.LogInformation("[EMAIL REMINDER JOB] {Count} cita(s) por recordar", appointments.Count);

        foreach (var appointment in appointments)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                return;
            }

            try
            {
                var patientEmail = appointment.Patient?.Email;

                if (string.IsNullOrWhiteSpace(patientEmail))
                {
                    patientEmail = appointment.Patient?.User?.Email;
                }

                if (!string.IsNullOrWhiteSpace(patientEmail))
                {
                    var html = EmailSender.BuildAppointmentReminderEmail(
                        appointment.PatientName,
                        appointment.ProfessionalName,
                        appointment.Type,
                        appointment.Date,
                        appointment.Time,
                        appointment.Mode);

                    await emailSender.SendAsync(patientEmail, "Recordatorio: tu cita es mañana", html);
                }
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "[EMAIL REMINDER JOB] Fallo al recordar la cita {AppointmentId}", appointment.Id);
            }

            // Marca el recordatorio como enviado aunque no haya email: evita reintentos infinitos.
            appointment.ReminderSentAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(stoppingToken);
    }

    // Avisos de invitaciones de clinica proximas a expirar (dentro de 48 horas), una sola vez.
    private async Task SendInvitationExpiryRemindersAsync(HealthHubDbContext db, EmailSender emailSender, IConfiguration configuration, CancellationToken stoppingToken)
    {
        var now = DateTimeOffset.UtcNow;
        var horizon = now.Add(InvitationExpiryWindow);

        var invitations = await db.ClinicInvitations
            .Include(invitation => invitation.Clinic)
            .Where(invitation => invitation.Status == "pending"
                && invitation.ExpiresAt >= now
                && invitation.ExpiresAt <= horizon
                && invitation.ExpiryReminderSentAt == null)
            .ToListAsync(stoppingToken);

        if (invitations.Count == 0)
        {
            return;
        }

        logger.LogInformation("[EMAIL REMINDER JOB] {Count} invitacion(es) por expirar", invitations.Count);

        var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');

        foreach (var invitation in invitations)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                return;
            }

            try
            {
                var clinicName = invitation.Clinic?.Name ?? "la clinica";
                var acceptUrl = $"{webBaseUrl}/aceptar-invitacion?token={invitation.Token}";
                var roleLabel = MappingExtensions.ClinicRoleLabel(invitation.Role);
                var subject = $"Tu invitacion para unirte a {clinicName} esta por expirar";
                var html = EmailSender.BuildInvitationEmail(clinicName, roleLabel, acceptUrl);

                await emailSender.SendAsync(invitation.Email, subject, html);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "[EMAIL REMINDER JOB] Fallo al avisar la expiracion de la invitacion {InvitationId}", invitation.Id);
            }

            // Marca el aviso como enviado aunque falle el correo: evita reintentos infinitos.
            invitation.ExpiryReminderSentAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(stoppingToken);
    }
}
