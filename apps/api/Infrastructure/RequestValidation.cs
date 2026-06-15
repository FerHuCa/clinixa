using HealthHub.Api.Contracts;

namespace HealthHub.Api.Infrastructure;

public static class RequestValidation
{
    public static List<string> ValidatePatient(CreatePatientRequest request)
    {
        var errors = new List<string>();

        Require(request.FullName, "fullName es requerido.", errors);
        Require(request.Email, "email es requerido.", errors);
        Require(request.Phone, "phone es requerido.", errors);
        Require(request.Focus, "focus es requerido.", errors);
        Require(request.MainReason, "mainReason es requerido.", errors);

        if (request.Age <= 0)
        {
            errors.Add("age debe ser mayor a 0.");
        }

        return errors;
    }

    public static List<string> ValidateAppointment(CreateAppointmentRequest request)
    {
        var errors = new List<string>();

        Require(request.PatientId, "patientId es requerido.", errors);
        Require(request.Date, "date es requerido.", errors);
        Require(request.Time, "time es requerido.", errors);
        Require(request.Reason, "reason es requerido.", errors);

        if (string.IsNullOrWhiteSpace(request.ProfessionalServiceId))
        {
            Require(request.Duration, "duration es requerido.", errors);
            Require(request.Type, "type es requerido.", errors);
        }

        return errors;
    }

    public static List<string> ValidateSoapNote(CreateSoapNoteRequest request)
    {
        var errors = new List<string>();

        Require(request.PatientId, "patientId es requerido.", errors);
        Require(request.Date, "date es requerido.", errors);
        Require(request.Title, "title es requerido.", errors);
        Require(request.Subjective, "subjective es requerido.", errors);
        Require(request.Objective, "objective es requerido.", errors);
        Require(request.Assessment, "assessment es requerido.", errors);
        Require(request.Plan, "plan es requerido.", errors);

        return errors;
    }

    private static void Require(string? value, string message, ICollection<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(message);
        }
    }
}
