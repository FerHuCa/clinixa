using HealthHub.Api.Contracts;
using HealthHub.Api.Data;
using HealthHub.Api.Entities;
using HealthHub.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HealthHub.Api.Endpoints;

/// <summary>
/// Endpoints de resenas de profesionales extraidos de Program.cs como primer
/// paso de la descomposicion modular.
///
/// PATRON DE DESCOMPOSICION:
///   Program.cs llama app.MapReviewsEndpoints(getUser, addAudit) pasando los
///   helpers compartidos como delegados. Cuando todos los endpoints se migren,
///   estos helpers se mueven a una clase interna compartida (ApiHelpers) y los
///   delegados se eliminan.
///
/// Endpoints cubiertos:
///   GET  /api/professionals/{id}/reviews   — listado publico paginado
///   POST /api/professionals/{id}/reviews   — paciente crea resena
///   PATCH /api/reviews/{id}/moderate       — admin oculta / restaura resena
/// </summary>
public static class ReviewsEndpoints
{
    public static WebApplication MapReviewsEndpoints(
        this WebApplication app,
        Func<HttpRequest, HealthHubDbContext, Task<User?>> getUser,
        Action<HealthHubDbContext, HttpRequest, User?, string, string, string, string?, string?, string> addAudit,
        Func<HttpRequest, (int page, int pageSize, bool requested)> getPagination,
        Func<IReadOnlyList<ReviewDto>, int, int, bool, IResult> applyPagination)
    {
        var professionalsApi = app.MapGroup("/api/professionals");

        // ── GET /api/professionals/{id}/reviews ──────────────────────────────
        // Listado publico: solo resenas con status "published". No requiere auth.
        professionalsApi.MapGet("/{id}/reviews", async (HttpRequest httpRequest, string id, HealthHubDbContext db) =>
        {
            var professionalExists = await db.Professionals.AnyAsync(item => item.Id == id);

            if (!professionalExists)
            {
                return Results.NotFound();
            }

            var (page, pageSize, paginated) = getPagination(httpRequest);

            var reviews = await db.Reviews
                .AsNoTracking()
                .Where(review => review.ProfessionalId == id && review.Status == "published")
                .OrderByDescending(review => review.CreatedAt)
                .Select(review => review.ToDto())
                .ToListAsync();

            return applyPagination(reviews, page, pageSize, paginated);
        });

        // ── POST /api/professionals/{id}/reviews ─────────────────────────────
        // Reglas: solo pacientes reales (cita completada), una resena por cita,
        // sin edicion posterior. La moderacion es exclusiva del admin.
        professionalsApi.MapPost("/{id}/reviews", async (HttpRequest request, string id, CreateReviewRequest reviewRequest, HealthHubDbContext db) =>
        {
            var actor = await getUser(request, db);

            if (actor is null)
            {
                return Results.Unauthorized();
            }

            if (actor.PrimaryRole != "patient" || actor.Patient is null)
            {
                addAudit(db, request, actor, "review.create.denied", "review", "new", actor.Patient?.Id, id, "denied");
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var errors = new List<string>();

            if (reviewRequest.Rating is < 1 or > 5)
            {
                errors.Add("La calificacion debe estar entre 1 y 5.");
            }

            var comment = reviewRequest.Comment?.Trim() ?? string.Empty;

            if (comment.Length is < 3 or > 1000)
            {
                errors.Add("El comentario debe tener entre 3 y 1000 caracteres.");
            }

            if (string.IsNullOrWhiteSpace(reviewRequest.AppointmentId))
            {
                errors.Add("appointmentId es obligatorio.");
            }

            if (errors.Count > 0)
            {
                return Results.BadRequest(new { errors });
            }

            var appointment = await db.Appointments.FirstOrDefaultAsync(item =>
                item.Id == reviewRequest.AppointmentId &&
                item.PatientId == actor.Patient.Id &&
                item.ProfessionalId == id);

            if (appointment is null)
            {
                return Results.BadRequest(new { errors = new[] { "Solo puedes resenar profesionales con los que tuviste una cita." } });
            }

            if (appointment.Status != "completed")
            {
                return Results.BadRequest(new { errors = new[] { "Solo puedes resenar citas completadas." } });
            }

            var alreadyReviewed = await db.Reviews.AnyAsync(item => item.AppointmentId == appointment.Id);

            if (alreadyReviewed)
            {
                return Results.Conflict(new { errors = new[] { "Esta cita ya tiene una resena. Las resenas no se pueden editar." } });
            }

            var now = DateTimeOffset.UtcNow;
            var review = new Review
            {
                Id = $"rev-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
                AppointmentId = appointment.Id,
                PatientId = actor.Patient.Id,
                PatientName = actor.Patient.FullName,
                ProfessionalId = id,
                Rating = reviewRequest.Rating,
                Comment = comment,
                Status = "published",
                CreatedAt = now,
                UpdatedAt = now
            };

            db.Reviews.Add(review);
            addAudit(db, request, actor, "review.create", "review", review.Id, actor.Patient.Id, id, "success");
            await db.SaveChangesAsync();

            return Results.Created($"/api/professionals/{id}/reviews", review.ToDto());
        });

        // ── PATCH /api/reviews/{id}/moderate ────────────────────────────────
        // Moderacion administrativa: las resenas nunca se eliminan fisicamente
        // ni se editan; solo se ocultan (hidden) o restauran (published)
        // dejando rastro de auditoria.
        var reviewsApi = app.MapGroup("/api/reviews");

        reviewsApi.MapPatch("/{id}/moderate", async (HttpRequest request, string id, ModerateReviewRequest moderateRequest, HealthHubDbContext db) =>
        {
            var actor = await getUser(request, db);

            if (actor is null)
            {
                return Results.Unauthorized();
            }

            if (actor.PrimaryRole != "internal_admin")
            {
                addAudit(db, request, actor, "review.moderate.denied", "review", id, null, null, "denied");
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var review = await db.Reviews.FirstOrDefaultAsync(item => item.Id == id);

            if (review is null)
            {
                return Results.NotFound();
            }

            var status = moderateRequest.Status.Trim().ToLowerInvariant();

            if (status is not ("hidden" or "published"))
            {
                return Results.BadRequest(new { errors = new[] { "Estatus invalido. Usa hidden o published." } });
            }

            if (status == "hidden" && string.IsNullOrWhiteSpace(moderateRequest.Reason))
            {
                return Results.BadRequest(new { errors = new[] { "Indica el motivo para ocultar la resena." } });
            }

            var now = DateTimeOffset.UtcNow;
            review.Status = status;
            review.ModeratedByUserId = actor.Id;
            review.ModeratedAt = now;
            review.ModerationReason = moderateRequest.Reason?.Trim() ?? string.Empty;
            review.UpdatedAt = now;

            addAudit(db, request, actor, $"review.moderate.{status}", "review", review.Id, review.PatientId, review.ProfessionalId, "success");
            await db.SaveChangesAsync();

            return Results.Ok(review.ToDto());
        });

        return app;
    }
}
