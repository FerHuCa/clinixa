using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace HealthHub.Api.Infrastructure;

public sealed class EmailSender(IConfiguration configuration, ILogger<EmailSender> logger, HttpClient httpClient)
{
    /// <summary>
    /// Sends an email via Resend when an API key is configured; otherwise logs a simulated send.
    /// Returns the outcome: "sent", "simulated" or "failed". Never throws.
    /// </summary>
    public async Task<string> SendAsync(string toEmail, string subject, string htmlBody)
    {
        var apiKey = configuration["Resend:ApiKey"] ?? Environment.GetEnvironmentVariable("RESEND_API_KEY");
        var from = configuration["Resend:From"] ?? Environment.GetEnvironmentVariable("RESEND_FROM") ?? "Clinixa <invitaciones@healthhub.mx>";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogInformation("[EMAIL SIMULADO] Para={To} Asunto={Subject}", toEmail, subject);
            return "simulated";
        }

        try
        {
            using var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
            {
                Content = JsonContent.Create(new
                {
                    from,
                    to = new[] { toEmail },
                    subject,
                    html = htmlBody
                })
            };
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await httpClient.SendAsync(requestMessage);

            if (response.IsSuccessStatusCode)
            {
                return "sent";
            }

            logger.LogWarning("Resend respondio {Status} al enviar a {To}", (int)response.StatusCode, toEmail);
            return "failed";
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo enviar el correo a {To}", toEmail);
            return "failed";
        }
    }

    public static string BuildInvitationEmail(string clinicName, string roleLabel, string acceptUrl) =>
        $"""
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>Te invitaron a {clinicName}</h2>
          <p>Fuiste invitado a unirte a <strong>{clinicName}</strong> en Clinixa como <strong>{roleLabel}</strong>.</p>
          <p>Para aceptar la invitacion y activar tu cuenta, abre el siguiente enlace:</p>
          <p><a href="{acceptUrl}" style="background:#0d9488;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">Aceptar invitacion</a></p>
          <p style="color:#64748b;font-size:13px;">Si el boton no funciona, copia y pega esta direccion en tu navegador:<br/>{acceptUrl}</p>
          <p style="color:#64748b;font-size:13px;">Este enlace es personal y expira en unos dias.</p>
        </div>
        """;

    /// <summary>
    /// Traduce el modo de la cita a una etiqueta legible en espanol.
    /// </summary>
    private static string ModeLabel(string mode) =>
        mode == "in_person" ? "Presencial" : "En linea";

    /// <summary>
    /// Correo que confirma la cita al paciente. Usa los campos denormalizados
    /// Date/Time/ProfessionalName para evitar calculos de zona horaria.
    /// </summary>
    public static string BuildAppointmentConfirmedEmail(
        string patientName,
        string professionalName,
        string serviceType,
        string date,
        string time,
        string mode) =>
        $"""
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>Tu cita está confirmada</h2>
          <p>Hola {patientName}, tu cita en Clinixa quedó confirmada. Estos son los detalles:</p>
          <table style="border-collapse:collapse;font-size:15px;color:#0f172a;margin:12px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Profesional</td><td style="padding:4px 0;"><strong>{professionalName}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Servicio</td><td style="padding:4px 0;">{serviceType}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Fecha</td><td style="padding:4px 0;">{date}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Hora</td><td style="padding:4px 0;">{time}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Modalidad</td><td style="padding:4px 0;">{ModeLabel(mode)}</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;">Si necesitas reagendar o cancelar, entra a tu cuenta de Clinixa.</p>
        </div>
        """;

    /// <summary>
    /// Recordatorio de 24 horas antes de la cita. Mismos detalles, enmarcado como aviso.
    /// </summary>
    public static string BuildAppointmentReminderEmail(
        string patientName,
        string professionalName,
        string serviceType,
        string date,
        string time,
        string mode) =>
        $"""
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>Recordatorio: tu cita es mañana</h2>
          <p>Hola {patientName}, te recordamos que tienes una cita programada en Clinixa dentro de las próximas 24 horas:</p>
          <table style="border-collapse:collapse;font-size:15px;color:#0f172a;margin:12px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Profesional</td><td style="padding:4px 0;"><strong>{professionalName}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Servicio</td><td style="padding:4px 0;">{serviceType}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Fecha</td><td style="padding:4px 0;">{date}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Hora</td><td style="padding:4px 0;">{time}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Modalidad</td><td style="padding:4px 0;">{ModeLabel(mode)}</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;">Si ya no puedes asistir, entra a tu cuenta de Clinixa para reagendar o cancelar con tiempo.</p>
        </div>
        """;

    /// <summary>
    /// Aviso de cancelacion de la cita al paciente, con motivo opcional e invitacion a reagendar.
    /// </summary>
    public static string BuildAppointmentCancelledEmail(
        string patientName,
        string professionalName,
        string serviceType,
        string date,
        string time,
        string mode,
        string? cancellationReason = null) =>
        $"""
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>Tu cita fue cancelada</h2>
          <p>Hola {patientName}, te informamos que tu cita en Clinixa fue cancelada. Estos eran los detalles:</p>
          <table style="border-collapse:collapse;font-size:15px;color:#0f172a;margin:12px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Profesional</td><td style="padding:4px 0;"><strong>{professionalName}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Servicio</td><td style="padding:4px 0;">{serviceType}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Fecha</td><td style="padding:4px 0;">{date}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Hora</td><td style="padding:4px 0;">{time}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Modalidad</td><td style="padding:4px 0;">{ModeLabel(mode)}</td></tr>
          </table>
          {(string.IsNullOrWhiteSpace(cancellationReason) ? string.Empty : $"<p style=\"color:#64748b;font-size:14px;\">Motivo: {cancellationReason}</p>")}
          <p>¿Quieres volver a verlo? Puedes reagendar una nueva cita desde tu cuenta de Clinixa.</p>
        </div>
        """;
}
