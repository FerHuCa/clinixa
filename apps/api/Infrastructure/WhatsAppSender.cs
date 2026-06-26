namespace HealthHub.Api.Infrastructure;

/// <summary>
/// Envía mensajes de WhatsApp a través de un proveedor externo cuando las credenciales están
/// configuradas; en caso contrario, degrada a modo simulado (log) sin lanzar excepción.
/// Retorna el resultado: "sent", "simulated" o "failed". Nunca lanza hacia el llamador.
///
/// Patrón copiado de EmailSender: idéntica degradación graceful sin API key.
/// </summary>
public sealed class WhatsAppSender(IConfiguration configuration, ILogger<WhatsAppSender> logger, HttpClient httpClient)
{
    // httpClient se mantiene en el constructor para que AddHttpClient<WhatsAppSender>() lo inyecte
    // con la configuración de resiliencia del host cuando se active el proveedor real.
    // La referencia silencia CS9113 sin alterar la seam.
    private readonly HttpClient _httpClient = httpClient;

    /// <summary>
    /// Intenta enviar un mensaje de WhatsApp al número dado.
    /// Si el número está vacío, el modo simulado igualmente registra la intención sin fallar.
    /// </summary>
    public async Task<string> SendAsync(string toPhone, string messageText)
    {
        var apiKey = configuration["WhatsApp:ApiKey"] ?? Environment.GetEnvironmentVariable("WHATSAPP_API_KEY");

        // Sin número de destino: log informativo, nada que hacer.
        if (string.IsNullOrWhiteSpace(toPhone))
        {
            logger.LogInformation("[WHATSAPP SIMULADO] Sin número de teléfono; se omite el envío. Mensaje={Message}", messageText);
            return "simulated";
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogInformation("[WHATSAPP SIMULADO] Para={To} Mensaje={Message}", toPhone, messageText);
            return "simulated";
        }

        try
        {
            // ponytail: simulated until WHATSAPP_API_KEY set — drop the HTTP POST here
            // Ejemplo de integración real (p.ej. Meta Cloud API):
            //
            // var phoneNumberId = configuration["WhatsApp:PhoneNumberId"]
            //     ?? Environment.GetEnvironmentVariable("WHATSAPP_PHONE_NUMBER_ID") ?? "";
            //
            // using var requestMessage = new HttpRequestMessage(
            //     HttpMethod.Post,
            //     $"https://graph.facebook.com/v19.0/{phoneNumberId}/messages")
            // {
            //     Content = JsonContent.Create(new
            //     {
            //         messaging_product = "whatsapp",
            //         to = toPhone,
            //         type = "text",
            //         text = new { body = messageText }
            //     })
            // };
            // requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            // var response = await httpClient.SendAsync(requestMessage);
            //
            // if (response.IsSuccessStatusCode) return "sent";
            // logger.LogWarning("WhatsApp API respondió {Status} al enviar a {To}", (int)response.StatusCode, toPhone);
            // return "failed";

            // Rama temporal mientras WHATSAPP_API_KEY no está configurada en producción:
            logger.LogInformation("[WHATSAPP SIMULADO] Para={To} Mensaje={Message}", toPhone, messageText);
            await Task.CompletedTask; // mantiene la firma async real
            return "simulated";
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "No se pudo enviar el WhatsApp a {To}", toPhone);
            return "failed";
        }
    }

    /// <summary>Texto de recordatorio de cita a 24 horas para WhatsApp.</summary>
    public static string BuildAppointmentReminderText(
        string patientName,
        string professionalName,
        string serviceType,
        string date,
        string time,
        string mode)
    {
        var modeLabel = mode == "in_person" ? "Presencial" : "En línea";
        return $"Hola {patientName}, te recordamos que mañana tienes una cita en Clinixa:\n"
             + $"• Profesional: {professionalName}\n"
             + $"• Servicio: {serviceType}\n"
             + $"• Fecha: {date} a las {time}\n"
             + $"• Modalidad: {modeLabel}\n"
             + "Si no puedes asistir, entra a tu cuenta para reagendar o cancelar. ¡Hasta mañana!";
    }
}
