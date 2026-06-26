using HealthHub.Api.Contracts;
using HealthHub.Api.Data;
using HealthHub.Api.Entities;
using HealthHub.Api.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var connectionString =
    builder.Configuration.GetConnectionString("HealthHubDb")
    ?? builder.Configuration["HEALTHHUB_DB_CONNECTION"];

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Define la cadena de conexion en ConnectionStrings__HealthHubDb o HEALTHHUB_DB_CONNECTION.");
}

builder.Services.AddDbContext<HealthHubDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddHttpClient<EmailSender>();
builder.Services.AddHttpClient<WhatsAppSender>();
builder.Services.AddHttpClient<MercadoPagoService>();
builder.Services.AddHttpClient<MercadoPagoMarketplaceService>();
builder.Services.AddSingleton<TokenEncryptionService>();
builder.Services.AddHostedService<MercadoPagoTokenRefreshService>();
builder.Services.AddHostedService<EmailReminderService>();
builder.Services.AddHttpClient("Clerk", client =>
{
    client.BaseAddress = new Uri("https://api.clerk.com/v1/");
});

var clerkIssuer = (builder.Configuration["Clerk:Issuer"] ?? builder.Configuration["CLERK_ISSUER"])?.Trim().TrimEnd('/');
var clerkAuthorizedParties = (builder.Configuration["Clerk:AuthorizedParties"] ?? builder.Configuration["CLERK_AUTHORIZED_PARTIES"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var allowedOrigins = (builder.Configuration["Web:AllowedOrigins"] ?? "http://localhost:3000,http://localhost:3001")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var authRateLimitPermitLimit = builder.Configuration.GetValue("RateLimiting:Auth:PermitLimit", 10);
var authRateLimitWindowMinutes = builder.Configuration.GetValue("RateLimiting:Auth:WindowMinutes", 1);
var bookingRateLimitPermitLimit = builder.Configuration.GetValue("RateLimiting:Booking:PermitLimit", 30);
var bookingRateLimitWindowMinutes = builder.Configuration.GetValue("RateLimiting:Booking:WindowMinutes", 1);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.RequireHttpsMetadata = true;

        if (!string.IsNullOrWhiteSpace(clerkIssuer))
        {
            options.Authority = clerkIssuer;
        }

        options.TokenValidationParameters = new TokenValidationParameters
        {
            NameClaimType = "sub",
            ValidateAudience = false,
            ValidateIssuer = !string.IsNullOrWhiteSpace(clerkIssuer),
            ValidIssuer = clerkIssuer,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                if (clerkAuthorizedParties.Length == 0)
                {
                    return Task.CompletedTask;
                }

                var authorizedParty = context.Principal?.FindFirstValue("azp");

                if (string.IsNullOrWhiteSpace(authorizedParty) ||
                    !clerkAuthorizedParties.Contains(authorizedParty, StringComparer.OrdinalIgnoreCase))
                {
                    context.Fail("El token no pertenece a una aplicacion autorizada.");
                }

                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        GetRateLimitPartitionKey(context),
        _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = authRateLimitPermitLimit,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(authRateLimitWindowMinutes)
        }));
    options.AddPolicy("booking", context => RateLimitPartition.GetFixedWindowLimiter(
        GetRateLimitPartitionKey(context),
        _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = bookingRateLimitPermitLimit,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(bookingRateLimitWindowMinutes)
        }));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebApp", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();
const int SessionHours = 8;
const int MaxActiveSessionsPerUser = 5;

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HealthHubDbContext>();
    await DatabaseSeeder.InitializeAsync(db);
}

app.UseCors("WebApp");
app.UseStaticFiles();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    var request = context.Request;

    if (!request.Path.StartsWithSegments("/api") || IsPublicApiRequest(request))
    {
        await next();
        return;
    }

    var hasClerkSession = context.User.Identity?.IsAuthenticated == true;
    var hasDevSession = IsDevAuthEnabled(request) &&
        !string.IsNullOrWhiteSpace(request.Headers["X-HealthHub-Dev-User"]);
    var hasLegacySession = IsLegacyAuthEnabled(request) && GetBearerToken(request) is not null;

    if (!hasClerkSession && !hasDevSession && !hasLegacySession)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }

    await next();
});

app.MapGet("/health", async (HealthHubDbContext db, IConfiguration configuration) =>
{
    var canConnect = await db.Database.CanConnectAsync();

    return Results.Ok(new
    {
        service = "HealthHub.Api",
        status = canConnect ? "ok" : "database_unavailable",
        database = canConnect ? "connected" : "unavailable",
        pilotMode = IsPilotEnabled(configuration),
        timestamp = DateTimeOffset.UtcNow
    });
});

app.MapGet("/api/me", async (HttpRequest request, HealthHubDbContext db) =>
{
    var user = await GetUserFromRequestAsync(request, db);

    return user is null ? Results.Unauthorized() : Results.Ok(user.ToCurrentUserDto());
});

app.MapPatch("/api/me", async (HttpRequest request, UpdateMyProfileRequest updateRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var fullName = updateRequest.FullName?.Trim() ?? string.Empty;

    if (fullName.Length < 3)
    {
        return Results.BadRequest(new { errors = new[] { "El nombre completo es obligatorio." } });
    }

    var now = DateTimeOffset.UtcNow;
    var user = await db.Users
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstAsync(item => item.Id == actor.Id);
    var previousName = user.FullName;

    user.FullName = fullName;
    user.UpdatedAt = now;

    var requestedRole = updateRequest.Role?.Trim().ToLowerInvariant();

    if (requestedRole is "patient" or "professional" &&
        user.PrimaryRole is "patient" or "professional" &&
        user.PrimaryRole != requestedRole)
    {
        user.PrimaryRole = requestedRole;

        if (!await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == requestedRole))
        {
            db.UserRoles.Add(new UserRole
            {
                Id = $"role-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
                UserId = user.Id,
                Role = requestedRole,
                ScopeType = "global",
                ScopeId = null,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        if ((requestedRole == "patient" && user.Patient is null) ||
            (requestedRole == "professional" && user.Professional is null))
        {
            await EnsureProvisionedProfileAsync(db, user, requestedRole, now);
        }
    }

    if (user.Patient is not null)
    {
        user.Patient.FullName = fullName;
        user.Patient.Initials = TextHelpers.InitialsFromName(fullName);
        user.Patient.UpdatedAt = now;
    }

    if (user.Professional is not null)
    {
        if (user.Professional.DisplayName == previousName || user.Professional.DisplayName == user.Email)
        {
            user.Professional.DisplayName = fullName;
        }

        if (!string.IsNullOrWhiteSpace(updateRequest.Specialty))
        {
            var normalized = NormalizeSpecialty(updateRequest.Specialty);
            if (user.Professional.Specialty == "other" || user.Professional.Specialty != normalized)
            {
                user.Professional.Specialty = normalized;
            }
        }

        user.Professional.UpdatedAt = now;
    }

    AddAuditLog(db, request, user, "user_profile.update", "user", user.Id, user.Patient?.Id, user.Professional?.Id);
    await db.SaveChangesAsync();

    var refreshed = await db.Users
        .AsNoTracking()
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstAsync(item => item.Id == user.Id);

    return Results.Ok(refreshed.ToCurrentUserDto());
});

app.MapGet("/api/demo-sessions", async (HttpRequest request, HealthHubDbContext db) =>
{
    if (!IsDevAuthEnabled(request))
    {
        return Results.NotFound();
    }

    var users = await db.Users
        .AsNoTracking()
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .Where(item => item.Status == "active")
        .OrderBy(item => item.PrimaryRole)
        .ThenBy(item => item.FullName)
        .Select(item => item.ToDemoSessionDto())
        .ToListAsync();

    return Results.Ok(users);
});

var authApi = app.MapGroup("/api/auth").RequireRateLimiting("auth");

authApi.MapPost("/login", async (HttpRequest httpRequest, LoginRequest request, HealthHubDbContext db) =>
{
    if (!IsLegacyAuthEnabled(httpRequest))
    {
        return Results.NotFound();
    }

    var email = request.Email.Trim().ToLowerInvariant();
    var user = await db.Users
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstOrDefaultAsync(item => item.Email == email && item.Status == "active");

    if (user is null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt))
    {
        return Results.Unauthorized();
    }

    var token = PasswordHasher.CreateToken();
    var now = DateTimeOffset.UtcNow;
    var expiresAt = now.AddHours(SessionHours);

    user.LastLoginAt = now;
    user.UpdatedAt = now;
    await DisableExpiredSessionsAsync(db, now);
    await EnforceSessionLimitAsync(db, user.Id, MaxActiveSessionsPerUser - 1);
    db.UserSessions.Add(new UserSession
    {
        Id = $"sess-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        UserId = user.Id,
        TokenHash = PasswordHasher.HashToken(token),
        Status = "active",
        ExpiresAt = expiresAt,
        CreatedAt = now,
        UpdatedAt = now
    });

    await db.SaveChangesAsync();

    return Results.Ok(new AuthResponseDto(token, expiresAt, user.ToCurrentUserDto()));
});

authApi.MapPost("/refresh", async (HttpRequest request, HealthHubDbContext db) =>
{
    if (!IsLegacyAuthEnabled(request))
    {
        return Results.NotFound();
    }

    var existingToken = GetBearerToken(request);

    if (existingToken is null)
    {
        return Results.Unauthorized();
    }

    var now = DateTimeOffset.UtcNow;
    var existingTokenHash = PasswordHasher.HashToken(existingToken);
    var session = await db.UserSessions
        .Include(item => item.User!)
        .ThenInclude(user => user.Patient)
        .Include(item => item.User!)
        .ThenInclude(user => user.Professional)
        .FirstOrDefaultAsync(item =>
            item.TokenHash == existingTokenHash &&
            item.Status == "active" &&
            item.ExpiresAt > now);

    if (session?.User is null)
    {
        return Results.Unauthorized();
    }

    var nextToken = PasswordHasher.CreateToken();
    var expiresAt = now.AddHours(SessionHours);
    session.Status = "rotated";
    session.UpdatedAt = now;

    await DisableExpiredSessionsAsync(db, now);
    await EnforceSessionLimitAsync(db, session.UserId, MaxActiveSessionsPerUser - 1);
    db.UserSessions.Add(new UserSession
    {
        Id = $"sess-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        UserId = session.UserId,
        TokenHash = PasswordHasher.HashToken(nextToken),
        Status = "active",
        ExpiresAt = expiresAt,
        CreatedAt = now,
        UpdatedAt = now
    });

    await db.SaveChangesAsync();

    return Results.Ok(new AuthResponseDto(nextToken, expiresAt, session.User.ToCurrentUserDto()));
});

authApi.MapPost("/logout", async (HttpRequest request, HealthHubDbContext db) =>
{
    if (!IsLegacyAuthEnabled(request))
    {
        return Results.NotFound();
    }

    await DisableBearerSessionAsync(request, db);
    return Results.NoContent();
});

var patientsApi = app.MapGroup("/api/patients");

patientsApi.MapGet("/", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var accessiblePatientIds = await GetAccessiblePatientIdsAsync(actor, db);
    var query = db.Patients.AsNoTracking().AsQueryable();

    if (accessiblePatientIds is not null)
    {
        query = query.Where(patient => accessiblePatientIds.Contains(patient.Id));
    }

    var patients = await query
        .OrderByDescending(patient => patient.CreatedAt)
        .Select(patient => patient.ToDto())
        .ToListAsync();

    return Results.Ok(patients);
});

patientsApi.MapGet("/{id}", async (HttpRequest request, string id, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (!await CanAccessPatientAsync(actor, id, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var patient = await db.Patients.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
    return patient is null ? Results.NotFound() : Results.Ok(patient.ToDto());
});

patientsApi.MapPost("/", async (HttpRequest httpRequest, CreatePatientRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole is not ("professional" or "internal_admin" or "clinic_admin"))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var errors = RequestValidation.ValidatePatient(request);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    var baseId = TextHelpers.Slugify(request.FullName);
    var existingIds = await db.Patients.Select(patient => patient.Id).ToListAsync();
    var patient = new Patient
    {
        Id = CreateUniqueId(baseId, existingIds),
        FullName = request.FullName.Trim(),
        Initials = TextHelpers.InitialsFromName(request.FullName),
        Status = "active",
        StatusLabel = "Activo",
        Age = request.Age,
        Email = request.Email.Trim(),
        Phone = request.Phone.Trim(),
        Focus = request.Focus.Trim(),
        MainReason = request.MainReason.Trim(),
        RiskLevel = "Por evaluar",
        NextAppointment = "Sin cita",
        LastSession = "Sin historial",
        Progress = "Paciente creado desde API MVP.",
        Professional = actor.Professional?.DisplayName ?? "Profesional asignado"
    };

    db.Patients.Add(patient);

    if (actor.Professional is not null)
    {
        db.ProfessionalPatients.Add(new ProfessionalPatient
        {
            Id = $"propat-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            ProfessionalId = actor.Professional.Id,
            PatientId = patient.Id,
            Status = "active"
        });
    }

    await db.SaveChangesAsync();

    return Results.Created($"/api/patients/{patient.Id}", patient.ToDto());
});

patientsApi.MapGet("/{id}/appointments", async (HttpRequest request, string id, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (!await CanAccessPatientAsync(actor, id, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var patientExists = await db.Patients.AnyAsync(item => item.Id == id);

    if (!patientExists)
    {
        return Results.NotFound();
    }

    var appointments = await db.Appointments
        .AsNoTracking()
        .Where(item => item.PatientId == id)
        .OrderBy(item => item.Date)
        .ThenBy(item => item.Time)
        .ToListAsync();

    var lastPayments = await GetLatestPaymentsByAppointmentAsync(db, appointments.Select(item => item.Id).ToList());

    return Results.Ok(appointments
        .Select(item => item.ToDto(lastPayments.GetValueOrDefault(item.Id)))
        .ToList());
});

patientsApi.MapGet("/{id}/soap-notes", async (HttpRequest request, string id, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (!await CanAccessPatientAsync(actor, id, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var patientExists = await db.Patients.AnyAsync(item => item.Id == id);

    if (!patientExists)
    {
        return Results.NotFound();
    }

    var notes = await db.SoapNotes
        .AsNoTracking()
        .Where(item => item.PatientId == id && item.Status != "deleted")
        .OrderByDescending(item => item.Date)
        .Select(item => item.ToDto())
        .ToListAsync();

    // NOM-024: toda consulta al expediente queda en bitacora.
    AddAuditLog(db, request, actor, "soap_notes.read", "patient", id, id, actor.Professional?.Id);
    await db.SaveChangesAsync();

    return Results.Ok(notes);
});

var appointmentsApi = app.MapGroup("/api/appointments").RequireRateLimiting("booking");

appointmentsApi.MapGet("/", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var query = db.Appointments
        .AsNoTracking()
        .Include(item => item.Professional)
        .AsQueryable();

    if (actor.PrimaryRole == "professional")
    {
        if (actor.Professional is null)
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var professionalId = actor.Professional.Id;
        query = query.Where(item => item.ProfessionalId == professionalId);
    }
    else if (actor.PrimaryRole == "patient")
    {
        if (actor.Patient is null)
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        var patientId = actor.Patient.Id;
        query = query.Where(item => item.PatientId == patientId);
    }
    else if (actor.PrimaryRole == "clinic_admin")
    {
        var professionalIds = await GetClinicProfessionalIdsAsync(actor, db);
        query = query.Where(item => item.ProfessionalId != null && professionalIds.Contains(item.ProfessionalId));
    }
    else if (actor.PrimaryRole != "internal_admin")
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var appointments = await query
        .OrderBy(item => item.Date)
        .ThenBy(item => item.Time)
        .ToListAsync();

    var lastPayments = await GetLatestPaymentsByAppointmentAsync(db, appointments.Select(item => item.Id).ToList());

    return Results.Ok(appointments
        .Select(item => item.ToDto(lastPayments.GetValueOrDefault(item.Id)))
        .ToList());
});

appointmentsApi.MapPost("/", async (HttpRequest httpRequest, CreateAppointmentRequest request, HealthHubDbContext db) =>
{
    var errors = RequestValidation.ValidateAppointment(request);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    var patient = await db.Patients.FirstOrDefaultAsync(item => item.Id == request.PatientId);

    if (patient is null)
    {
        return Results.BadRequest(new { errors = new[] { "patientId no existe." } });
    }

    Professional? professional = null;
    ProfessionalService? service = null;

    if (!string.IsNullOrWhiteSpace(request.ProfessionalId))
    {
        professional = await db.Professionals.FirstOrDefaultAsync(item => item.Id == request.ProfessionalId);

        if (professional is null)
        {
            return Results.BadRequest(new { errors = new[] { "professionalId no existe." } });
        }
    }

    if (!string.IsNullOrWhiteSpace(request.ProfessionalServiceId))
    {
        service = await db.ProfessionalServices.FirstOrDefaultAsync(item => item.Id == request.ProfessionalServiceId);

        if (service is null)
        {
            return Results.BadRequest(new { errors = new[] { "professionalServiceId no existe." } });
        }

        if (professional is null)
        {
            professional = await db.Professionals.FirstOrDefaultAsync(item => item.Id == service.ProfessionalId);
        }

        if (professional is null || service.ProfessionalId != professional.Id)
        {
            return Results.BadRequest(new { errors = new[] { "professionalServiceId no pertenece al profesional." } });
        }
    }

    if (professional is not null && professional.Status != "active")
    {
        return Results.Conflict(new { errors = new[] { "El profesional no esta disponible para recibir citas." } });
    }

    var duration = service is null ? request.Duration?.Trim() ?? string.Empty : $"{service.DurationMinutes} min";
    var appointmentType = service is null ? request.Type?.Trim() ?? string.Empty : service.Name;
    var appointmentMode = NormalizeAppointmentMode(request.Mode, service?.Mode, professional?.AppointmentMode);
    var timezone = professional?.Timezone ?? "America/Mexico_City";
    var (startsAt, endsAt) = BuildAppointmentRange(request.Date, request.Time, service?.DurationMinutes, timezone);
    var requestedDate = request.Date.Trim();
    var requestedTime = request.Time.Trim();
    var appointmentRangeAvailable = startsAt.HasValue && endsAt.HasValue;

    var patientConflict = await db.Appointments.AnyAsync(item =>
        item.PatientId == patient.Id &&
        (item.Status == "scheduled" || item.Status == "confirmed") &&
        (appointmentRangeAvailable
            ? item.StartsAt.HasValue && item.EndsAt.HasValue && item.StartsAt.Value < endsAt!.Value && item.EndsAt.Value > startsAt!.Value
            : item.Date == requestedDate && item.Time == requestedTime));

    if (patientConflict)
    {
        return Results.Conflict(new { errors = new[] { "El paciente ya tiene una cita programada que se traslapa con ese horario." } });
    }

    if (professional is not null)
    {
        var professionalConflict = await db.Appointments.AnyAsync(item =>
            item.ProfessionalId == professional.Id &&
            (item.Status == "scheduled" || item.Status == "confirmed") &&
            (appointmentRangeAvailable
                ? item.StartsAt.HasValue && item.EndsAt.HasValue && item.StartsAt.Value < endsAt!.Value && item.EndsAt.Value > startsAt!.Value
                : item.Date == requestedDate && item.Time == requestedTime));

        if (professionalConflict)
        {
            return Results.Conflict(new { errors = new[] { "El profesional ya tiene una cita programada que se traslapa con ese horario." } });
        }

        if (service is not null && !await IsWithinProfessionalAvailabilityAsync(db, professional.Id, requestedDate, requestedTime, service.DurationMinutes, timezone))
        {
            return Results.BadRequest(new { errors = new[] { "El profesional no tiene disponibilidad publicada para ese horario." } });
        }
    }

    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is not null && !CanCreateAppointment(actor, patient.Id, professional?.Id))
    {
        AddAuditLog(db, httpRequest, actor, "appointment.create.denied", "appointment", "new", patient.Id, professional?.Id, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    // NUEVO: un profesional sólo puede agendar para pacientes con relación activa previa.
    // (El flujo legítimo profesional->paciente nuevo se crea cuando el PACIENTE agenda; ver auto-relación abajo.)
    if (actor is { PrimaryRole: "professional", Professional: not null } && professional is not null
        && actor.Professional.Id == professional.Id)
    {
        var hasRelation = await db.ProfessionalPatients
            .AnyAsync(pp => pp.ProfessionalId == professional.Id
                         && pp.PatientId == patient.Id
                         && pp.Status == "active");
        if (!hasRelation)
        {
            AddAuditLog(db, httpRequest, actor, "appointment.create.denied", "appointment", "new", patient.Id, professional.Id, "no_relation");
            await db.SaveChangesAsync();
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }
    }

    var appointment = new Appointment
    {
        Id = $"apt-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
        PatientId = patient.Id,
        PatientName = patient.FullName,
        ProfessionalId = professional?.Id,
        ProfessionalServiceId = service?.Id,
        ProfessionalName = professional?.DisplayName ?? "Profesional por asignar",
        Date = requestedDate,
        Time = requestedTime,
        StartsAt = startsAt,
        EndsAt = endsAt,
        Duration = duration,
        Type = appointmentType,
        Mode = appointmentMode,
        Status = "scheduled",
        StatusLabel = "Programada",
        Reason = request.Reason.Trim(),
        CreatedByUserId = actor?.Id ?? (string.IsNullOrWhiteSpace(request.CreatedByUserId) ? null : request.CreatedByUserId.Trim())
    };

    patient.NextAppointment = $"{appointment.Date} {appointment.Time}";
    patient.Professional = professional?.DisplayName ?? patient.Professional;
    patient.UpdatedAt = DateTimeOffset.UtcNow;

    db.Appointments.Add(appointment);
    AddAuditLog(db, httpRequest, actor, "appointment.create", "appointment", appointment.Id, patient.Id, professional?.Id);
    AddAppointmentNotifications(
        db,
        appointment,
        patient.UserId,
        professional?.UserId,
        "appointment_created",
        "Cita agendada",
        $"{appointment.PatientName} tiene cita con {appointment.ProfessionalName} el {appointment.Date} a las {appointment.Time}.");

    if (professional is not null)
    {
        var relationExists = await db.ProfessionalPatients.AnyAsync(item => item.ProfessionalId == professional.Id && item.PatientId == patient.Id);

        if (!relationExists)
        {
            db.ProfessionalPatients.Add(new ProfessionalPatient
            {
                Id = $"pp-{professional.Id}-{patient.Id}",
                ProfessionalId = professional.Id,
                PatientId = patient.Id,
                CreatedFromAppointmentId = appointment.Id,
                StartedAt = DateTimeOffset.UtcNow,
                Status = "active"
            });
        }
    }

    await db.SaveChangesAsync();

    return Results.Created($"/api/appointments/{appointment.Id}", appointment.ToDto());
});

appointmentsApi.MapPatch("/{id}/cancel", async (HttpRequest httpRequest, string id, CancelAppointmentRequest request, EmailSender emailSender, ILoggerFactory loggerFactory, MercadoPagoService mercadoPago, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var appointment = await db.Appointments
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (appointment is null)
    {
        return Results.NotFound();
    }

    if (!CanManageAppointment(actor, appointment))
    {
        AddAuditLog(db, httpRequest, actor, "appointment.cancel.denied", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (appointment.Status is not ("scheduled" or "confirmed"))
    {
        return Results.BadRequest(new { errors = new[] { "Solo se pueden cancelar citas programadas o confirmadas." } });
    }

    appointment.Status = "cancelled";
    appointment.StatusLabel = "Cancelada";
    appointment.CancellationReason = string.IsNullOrWhiteSpace(request.Reason) ? "Cancelada por usuario." : request.Reason.Trim();
    appointment.CancelledAt = DateTimeOffset.UtcNow;
    appointment.CancelledByUserId = actor.Id;
    appointment.UpdatedAt = DateTimeOffset.UtcNow;
    AddAuditLog(db, httpRequest, actor, "appointment.cancel", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId);
    AddAppointmentNotifications(
        db,
        appointment,
        appointment.Patient?.UserId,
        appointment.Professional?.UserId,
        "appointment_cancelled",
        "Cita cancelada",
        $"{appointment.PatientName} tenía cita con {appointment.ProfessionalName} el {appointment.Date} a las {appointment.Time}.",
        "high");
    await db.SaveChangesAsync();

    // Reembolso best-effort: si la cita tiene un pago aprobado, emite el reembolso.
    // Un fallo en el reembolso NO rompe la cancelacion ya confirmada.
    try
    {
        var payment = await db.Payments
            .Where(p => p.AppointmentId == appointment.Id)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .FirstOrDefaultAsync();

        if (payment is not null && payment.Status == "approved" && payment.Provider != "cash")
        {
            // Idempotencia: evitar doble reembolso.
            if (payment.Status != "refunded")
            {
                // Solo marcamos "refunded" si Mercado Pago confirmo el reembolso (en simulado siempre true).
                // Si MP rechaza, el pago queda "approved" para reintento/seguimiento y se audita el fallo.
                var refunded = await mercadoPago.RefundPaymentAsync(payment.ProviderPaymentId);

                if (refunded)
                {
                    payment.Status = "refunded";
                    if (payment.TransferStatus == "completed")
                    {
                        payment.TransferStatus = "reversed";
                    }
                    payment.UpdatedAt = DateTimeOffset.UtcNow;

                    var fechaCita = $"{appointment.Date} a las {appointment.Time}";
                    AddAppointmentNotifications(
                        db,
                        appointment,
                        appointment.Patient?.UserId,
                        appointment.Professional?.UserId,
                        "appointment_refund",
                        "Pago reembolsado",
                        $"Se reembolsó el pago de tu cita del {fechaCita}.",
                        "high");

                    AddAuditLog(db, httpRequest, actor, "payment.refunded", "payment", payment.Id, appointment.PatientId, appointment.ProfessionalId);
                    await db.SaveChangesAsync();
                }
                else
                {
                    AddAuditLog(db, httpRequest, actor, "payment.refund.failed", "payment", payment.Id, appointment.PatientId, appointment.ProfessionalId, "failed");
                    await db.SaveChangesAsync();
                }
            }
        }
    }
    catch (Exception refundEx)
    {
        var refundLogger = loggerFactory.CreateLogger("AppointmentRefund");
        refundLogger.LogWarning(refundEx, "El reembolso del pago de la cita {AppointmentId} fallo; la cancelacion continua.", appointment.Id);
        try
        {
            AddAuditLog(db, httpRequest, actor, "payment.refund.failed", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId, "failed");
            await db.SaveChangesAsync();
        }
        catch
        {
            // Ignoramos errores secundarios del audit log de fallo.
        }
    }

    // Correo best-effort de cancelacion al paciente (no bloquea ni rompe la respuesta).
    await SendAppointmentEmailAsync(db, emailSender, appointment, "cancelled", loggerFactory.CreateLogger("AppointmentEmail"));

    return Results.Ok(appointment.ToDto(await GetLatestPaymentAsync(db, appointment.Id)));
});

appointmentsApi.MapPatch("/{id}/reschedule", async (HttpRequest httpRequest, string id, RescheduleAppointmentRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var appointment = await db.Appointments
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (appointment is null)
    {
        return Results.NotFound();
    }

    if (!CanManageAppointment(actor, appointment))
    {
        AddAuditLog(db, httpRequest, actor, "appointment.reschedule.denied", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (appointment.Status is not ("scheduled" or "confirmed"))
    {
        return Results.BadRequest(new { errors = new[] { "Solo se pueden reprogramar citas programadas o confirmadas." } });
    }

    var service = string.IsNullOrWhiteSpace(appointment.ProfessionalServiceId)
        ? null
        : await db.ProfessionalServices.FirstOrDefaultAsync(item => item.Id == appointment.ProfessionalServiceId);
    var durationMinutes = service?.DurationMinutes ?? ExtractDurationMinutes(appointment.Duration);
    var timezone = appointment.Professional?.Timezone ?? "America/Mexico_City";
    var requestedDate = request.Date.Trim();
    var requestedTime = request.Time.Trim();
    var (startsAt, endsAt) = BuildAppointmentRange(requestedDate, requestedTime, durationMinutes, timezone);

    if (!startsAt.HasValue || !endsAt.HasValue)
    {
        return Results.BadRequest(new { errors = new[] { "Fecha u hora invalida." } });
    }

    if (appointment.ProfessionalId is not null && service is not null &&
        !await IsWithinProfessionalAvailabilityAsync(db, appointment.ProfessionalId, requestedDate, requestedTime, durationMinutes, timezone))
    {
        return Results.BadRequest(new { errors = new[] { "El profesional no tiene disponibilidad publicada para ese horario." } });
    }

    var patientConflict = await db.Appointments.AnyAsync(item =>
        item.Id != appointment.Id &&
        item.PatientId == appointment.PatientId &&
        (item.Status == "scheduled" || item.Status == "confirmed") &&
        item.StartsAt.HasValue &&
        item.EndsAt.HasValue &&
        item.StartsAt.Value < endsAt.Value &&
        item.EndsAt.Value > startsAt.Value);

    if (patientConflict)
    {
        return Results.Conflict(new { errors = new[] { "El paciente ya tiene una cita programada que se traslapa con ese horario." } });
    }

    if (appointment.ProfessionalId is not null)
    {
        var professionalConflict = await db.Appointments.AnyAsync(item =>
            item.Id != appointment.Id &&
            item.ProfessionalId == appointment.ProfessionalId &&
            (item.Status == "scheduled" || item.Status == "confirmed") &&
            item.StartsAt.HasValue &&
            item.EndsAt.HasValue &&
            item.StartsAt.Value < endsAt.Value &&
            item.EndsAt.Value > startsAt.Value);

        if (professionalConflict)
        {
            return Results.Conflict(new { errors = new[] { "El profesional ya tiene una cita programada que se traslapa con ese horario." } });
        }
    }

    appointment.Date = requestedDate;
    appointment.Time = requestedTime;
    appointment.StartsAt = startsAt;
    appointment.EndsAt = endsAt;
    appointment.RescheduleReason = string.IsNullOrWhiteSpace(request.Reason) ? "Reprogramada por usuario." : request.Reason.Trim();
    appointment.RescheduledAt = DateTimeOffset.UtcNow;
    appointment.RescheduledByUserId = actor.Id;
    appointment.UpdatedAt = DateTimeOffset.UtcNow;
    AddAuditLog(db, httpRequest, actor, "appointment.reschedule", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId);
    AddAppointmentNotifications(
        db,
        appointment,
        appointment.Patient?.UserId,
        appointment.Professional?.UserId,
        "appointment_rescheduled",
        "Cita reprogramada",
        $"{appointment.PatientName} tiene nuevo horario con {appointment.ProfessionalName}: {appointment.Date} a las {appointment.Time}.",
        "high");
    await db.SaveChangesAsync();

    return Results.Ok(appointment.ToDto(await GetLatestPaymentAsync(db, appointment.Id)));
});

appointmentsApi.MapPatch("/{id}/status", async (HttpRequest httpRequest, string id, UpdateAppointmentStatusRequest request, EmailSender emailSender, ILoggerFactory loggerFactory, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var appointment = await db.Appointments
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (appointment is null)
    {
        return Results.NotFound();
    }

    if (!CanUpdateAppointmentStatus(actor, appointment))
    {
        AddAuditLog(db, httpRequest, actor, "appointment.status_update.denied", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var status = request.Status.Trim().ToLowerInvariant();

    if (status is not ("confirmed" or "completed" or "no_show"))
    {
        return Results.BadRequest(new { errors = new[] { "Estatus operativo invalido. Usa confirmed, completed o no_show." } });
    }

    if (appointment.Status == "cancelled")
    {
        return Results.BadRequest(new { errors = new[] { "No se puede cambiar el estatus operativo de una cita cancelada." } });
    }

    appointment.Status = status;
    appointment.StatusLabel = AppointmentStatusLabel(status);
    appointment.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, httpRequest, actor, "appointment.status_update", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId);
    AddAppointmentNotifications(
        db,
        appointment,
        appointment.Patient?.UserId,
        appointment.Professional?.UserId,
        "appointment_status",
        "Estado de cita actualizado",
        $"{appointment.PatientName} ahora tiene la cita en estado {appointment.StatusLabel}.",
        status == "no_show" ? "high" : "normal");

    await db.SaveChangesAsync();

    // Correo best-effort de confirmacion al paciente cuando la cita pasa a confirmada.
    if (status == "confirmed")
    {
        await SendAppointmentEmailAsync(db, emailSender, appointment, "confirmed", loggerFactory.CreateLogger("AppointmentEmail"));
    }

    return Results.Ok(appointment.ToDto(await GetLatestPaymentAsync(db, appointment.Id)));
});

// Crea la preferencia de pago en Mercado Pago para una cita programada con servicio y precio.
appointmentsApi.MapPost("/{id}/checkout", async (HttpRequest httpRequest, string id, MercadoPagoService mercadoPago, MercadoPagoMarketplaceService marketplace, TokenEncryptionService encryptionService, IConfiguration configuration, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var appointment = await db.Appointments
        .Include(item => item.Patient)
        .Include(item => item.Professional)
            .ThenInclude(professional => professional!.MercadoPagoAccount)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (appointment is null)
    {
        return Results.NotFound();
    }

    var isPatientOwner = actor.PrimaryRole == "patient" && actor.Patient?.Id == appointment.PatientId;

    if (!isPatientOwner && actor.PrimaryRole is not ("clinic_admin" or "internal_admin"))
    {
        AddAuditLog(db, httpRequest, actor, "payment.checkout.denied", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (appointment.Status != "scheduled")
    {
        return Results.BadRequest(new { errors = new[] { "Solo se pueden pagar citas en estado programada." } });
    }

    if (string.IsNullOrWhiteSpace(appointment.ProfessionalServiceId))
    {
        return Results.BadRequest(new { errors = new[] { "La cita no tiene un servicio con precio asociado." } });
    }

    var service = await db.ProfessionalServices
        .AsNoTracking()
        .FirstOrDefaultAsync(item => item.Id == appointment.ProfessionalServiceId);

    if (service is null || service.Price <= 0)
    {
        return Results.BadRequest(new { errors = new[] { "El servicio de la cita no tiene un precio valido." } });
    }

    var hasApprovedPayment = await db.Payments
        .AnyAsync(payment => payment.AppointmentId == appointment.Id && payment.Status == "approved");

    if (hasApprovedPayment)
    {
        return Results.BadRequest(new { errors = new[] { "La cita ya tiene un pago aprobado." } });
    }

    var pendingPayment = await db.Payments
        .FirstOrDefaultAsync(payment => payment.AppointmentId == appointment.Id && payment.Status == "pending");

    if (pendingPayment is null)
    {
        pendingPayment = new Payment
        {
            Id = $"pay-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            AppointmentId = appointment.Id,
            PatientUserId = actor.Id,
            ProfessionalId = appointment.ProfessionalId ?? string.Empty,
            Amount = service.Price,
            Currency = "MXN",
            Status = "pending",
            Provider = "mercadopago"
        };
        db.Payments.Add(pendingPayment);
    }

    var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');
    var notificationUrl = $"{httpRequest.Scheme}://{httpRequest.Host}/api/webhooks/mercadopago";
    var preferenceTitle = $"{service.Name} - {appointment.ProfessionalName}";

    var professional = appointment.Professional;
    var mpAccount = professional?.MercadoPagoAccount;

    // Rama marketplace: solo si el profesional esta verificado y tiene cuenta MP vinculada.
    // Descifra el token, lo renueva proactivamente si esta por vencer, calcula la comision
    // por tier y crea la preferencia con el token del vendedor incluyendo marketplace_fee.
    var useMarketplace = professional is not null
        && professional.MercadoPagoStatus == "verified"
        && mpAccount is not null;

    string? sellerToken = null;

    if (useMarketplace)
    {
        sellerToken = encryptionService.Unprotect(mpAccount!.AccessTokenEncrypted);

        if (sellerToken is null)
        {
            // Token ilegible (clave ausente o dato manipulado): degrada a flujo legacy.
            useMarketplace = false;
            AddAuditLog(db, httpRequest, actor, "marketplace.token_unreadable", "payment", pendingPayment.Id, appointment.PatientId, appointment.ProfessionalId, "failed");
        }
        else
        {
            // Refresh proactivo: si el token no tiene vencimiento o vence en menos de 7 dias,
            // se intenta renovar. El refresh token de MP es de un solo uso, por eso se persiste
            // de inmediato antes de crear la preferencia para no desincronizar la cuenta.
            var needsRefresh = mpAccount.TokenExpiresAt is null
                || mpAccount.TokenExpiresAt.Value <= DateTimeOffset.UtcNow.AddDays(7);
            var tokenExpired = mpAccount.TokenExpiresAt is not null
                && mpAccount.TokenExpiresAt.Value <= DateTimeOffset.UtcNow;

            if (needsRefresh)
            {
                var refreshToken = encryptionService.Unprotect(mpAccount.RefreshTokenEncrypted);
                MercadoPagoOAuthCredentials? renewed = refreshToken is null
                    ? null
                    : await marketplace.RefreshAccessTokenAsync(refreshToken);

                if (renewed is not null)
                {
                    mpAccount.AccessTokenEncrypted = encryptionService.Protect(renewed.AccessToken);
                    mpAccount.RefreshTokenEncrypted = encryptionService.Protect(renewed.RefreshToken);
                    mpAccount.PublicKey = renewed.PublicKey;
                    mpAccount.TokenExpiresAt = renewed.TokenExpiresAt;
                    mpAccount.UpdatedAt = DateTimeOffset.UtcNow;
                    sellerToken = renewed.AccessToken;
                    await db.SaveChangesAsync();
                }
                else if (tokenExpired)
                {
                    // No se pudo renovar y el token ya vencio: degrada a legacy.
                    useMarketplace = false;
                    AddAuditLog(db, httpRequest, actor, "marketplace.token_refresh_failed", "payment", pendingPayment.Id, appointment.PatientId, appointment.ProfessionalId, "failed");
                }
                // Si fallo pero el token sigue vigente, se usa el actual.
            }
        }
    }

    if (useMarketplace)
    {
        var pct = await ResolveCommissionPercentageAsync(db, professional!);
        var commissionAmount = Math.Round(pendingPayment.Amount * pct / 100m, 2, MidpointRounding.AwayFromZero);
        var professionalAmount = pendingPayment.Amount - commissionAmount;

        pendingPayment.CommissionPercentage = pct;
        pendingPayment.CommissionAmount = commissionAmount;
        pendingPayment.ProfessionalAmount = professionalAmount;
        pendingPayment.TransferStatus = "pending";

        var mktPreference = await marketplace.CreateMarketplacePreferenceAsync(
            sellerToken!,
            pendingPayment.Id,
            preferenceTitle,
            pendingPayment.Amount,
            commissionAmount,
            pendingPayment.Currency,
            actor.Email,
            webBaseUrl,
            notificationUrl);

        if (mktPreference is null)
        {
            return Results.StatusCode(StatusCodes.Status502BadGateway);
        }

        pendingPayment.ProviderPreferenceId = mktPreference.PreferenceId;
        pendingPayment.UpdatedAt = DateTimeOffset.UtcNow;

        AddAuditLog(db, httpRequest, actor, $"payment.checkout.marketplace.{mktPreference.Outcome}", "payment", pendingPayment.Id, appointment.PatientId, appointment.ProfessionalId);
        await db.SaveChangesAsync();

        return Results.Ok(new CheckoutResponseDto(
            pendingPayment.Id,
            pendingPayment.Status,
            pendingPayment.Amount,
            pendingPayment.Currency,
            mktPreference.InitPoint,
            mktPreference.Outcome == "simulated"));
    }

    // Rama legacy: profesional sin cuenta MP verificada. Sin comision ni split; el pago
    // entra a la cuenta plataforma y nunca queda atorado esperando un split imposible.
    var preference = await mercadoPago.CreatePreferenceAsync(
        pendingPayment.Id,
        preferenceTitle,
        pendingPayment.Amount,
        pendingPayment.Currency,
        actor.Email,
        webBaseUrl,
        notificationUrl);

    if (preference is null)
    {
        return Results.StatusCode(StatusCodes.Status502BadGateway);
    }

    pendingPayment.ProviderPreferenceId = preference.PreferenceId;
    pendingPayment.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, httpRequest, actor, $"payment.checkout.{preference.Outcome}", "payment", pendingPayment.Id, appointment.PatientId, appointment.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Ok(new CheckoutResponseDto(
        pendingPayment.Id,
        pendingPayment.Status,
        pendingPayment.Amount,
        pendingPayment.Currency,
        preference.InitPoint,
        preference.Outcome == "simulated"));
});

// Registra un cobro en efectivo hecho fuera de la plataforma. Solo el profesional dueno de la
// cita (o admin con alcance, mismo criterio que los cambios de estado). El pago queda approved
// de inmediato, sin comision (el dinero ya esta en manos del profesional) y la cita programada
// pasa a confirmada. Idempotente: si ya hay un pago aprobado responde 400.
appointmentsApi.MapPost("/{id}/cash-payment", async (HttpRequest httpRequest, string id, EmailSender emailSender, ILoggerFactory loggerFactory, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var appointment = await db.Appointments
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (appointment is null)
    {
        return Results.NotFound();
    }

    if (!CanUpdateAppointmentStatus(actor, appointment))
    {
        AddAuditLog(db, httpRequest, actor, "payment.cash.denied", "appointment", appointment.Id, appointment.PatientId, appointment.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (appointment.Status is not ("scheduled" or "confirmed" or "completed"))
    {
        return Results.BadRequest(new { errors = new[] { "Solo se puede registrar efectivo en citas programadas, confirmadas o completadas." } });
    }

    var hasApprovedPayment = await db.Payments
        .AnyAsync(payment => payment.AppointmentId == appointment.Id && payment.Status == "approved");

    if (hasApprovedPayment)
    {
        return Results.BadRequest(new { errors = new[] { "La cita ya tiene un pago aprobado." } });
    }

    if (string.IsNullOrWhiteSpace(appointment.ProfessionalServiceId))
    {
        return Results.BadRequest(new { errors = new[] { "La cita no tiene un servicio con precio asociado." } });
    }

    var service = await db.ProfessionalServices
        .AsNoTracking()
        .FirstOrDefaultAsync(item => item.Id == appointment.ProfessionalServiceId);

    if (service is null || service.Price <= 0)
    {
        return Results.BadRequest(new { errors = new[] { "El servicio de la cita no tiene un precio valido." } });
    }

    var cashPayment = new Payment
    {
        Id = $"pay-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        AppointmentId = appointment.Id,
        PatientUserId = appointment.Patient?.UserId ?? actor.Id,
        ProfessionalId = appointment.ProfessionalId ?? string.Empty,
        Amount = service.Price,
        Currency = "MXN",
        Status = "approved",
        Provider = "cash",
        CommissionPercentage = 0,
        CommissionAmount = 0,
        ProfessionalAmount = service.Price,
        TransferStatus = "none"
    };
    db.Payments.Add(cashPayment);

    var confirmationNote = "El pago quedo registrado.";
    var transitionedToConfirmed = false;

    if (appointment.Status == "scheduled")
    {
        appointment.Status = "confirmed";
        appointment.StatusLabel = AppointmentStatusLabel("confirmed");
        confirmationNote = "El pago quedó registrado y la cita quedó confirmada.";
        transitionedToConfirmed = true;
    }

    appointment.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, httpRequest, actor, "payment.cash.registered", "payment", cashPayment.Id, appointment.PatientId, appointment.ProfessionalId);
    AddAppointmentNotifications(
        db,
        appointment,
        appointment.Patient?.UserId,
        appointment.Professional?.UserId,
        "appointment_payment",
        "Pago en efectivo registrado",
        $"{appointment.ProfessionalName} registró el pago en efectivo de la cita de {appointment.PatientName} del {appointment.Date} a las {appointment.Time}. {confirmationNote}");

    await db.SaveChangesAsync();

    // Correo best-effort de confirmacion solo si el pago en efectivo confirmo la cita.
    if (transitionedToConfirmed)
    {
        await SendAppointmentEmailAsync(db, emailSender, appointment, "confirmed", loggerFactory.CreateLogger("AppointmentEmail"));
    }

    return Results.Ok(new CashPaymentResponseDto(
        cashPayment.Id,
        cashPayment.Status,
        cashPayment.Provider,
        cashPayment.Amount,
        cashPayment.Currency,
        appointment.ToDto(cashPayment)));
});

// Webhook de Mercado Pago. Publico, pero exige firma valida (x-signature) — sin secreto
// configurado en produccion rechaza todo. Con credenciales consulta el pago a Mercado Pago;
// en modo simulado (sin MERCADOPAGO_ACCESS_TOKEN) usa status y external_reference del cuerpo.
app.MapPost("/api/webhooks/mercadopago", async (HttpRequest httpRequest, MercadoPagoService mercadoPago, HealthHubDbContext db) =>
{
    string? notificationType = httpRequest.Query["type"].FirstOrDefault();
    string? dataId = httpRequest.Query["data.id"].FirstOrDefault();
    string? bodyStatus = null;
    string? bodyReference = null;

    try
    {
        using var document = await JsonDocument.ParseAsync(httpRequest.Body);
        var root = document.RootElement;

        if (root.TryGetProperty("type", out var typeElement))
        {
            notificationType = typeElement.GetString() ?? notificationType;
        }

        if (root.TryGetProperty("data", out var dataElement))
        {
            if (dataElement.TryGetProperty("id", out var idElement))
            {
                dataId = idElement.ValueKind == JsonValueKind.Number
                    ? idElement.GetRawText()
                    : idElement.GetString() ?? dataId;
            }

            if (dataElement.TryGetProperty("status", out var statusElement))
            {
                bodyStatus = statusElement.GetString();
            }

            if (dataElement.TryGetProperty("external_reference", out var referenceElement))
            {
                bodyReference = referenceElement.GetString();
            }
        }
    }
    catch (JsonException)
    {
        // Cuerpo vacio o invalido: Mercado Pago tambien notifica solo por query string.
    }

    var signature = httpRequest.Headers["x-signature"].ToString();
    var requestId = httpRequest.Headers["x-request-id"].ToString();

    if (!mercadoPago.ValidateWebhookSignature(signature, requestId, dataId ?? string.Empty))
    {
        AddAuditLog(db, httpRequest, null, "payment.webhook.invalid_signature", "payment", dataId ?? "unknown", null, null, "denied");
        await db.SaveChangesAsync();
        return Results.Unauthorized();
    }

    if (notificationType != "payment" || string.IsNullOrWhiteSpace(dataId))
    {
        return Results.Ok(new { received = true, processed = false });
    }

    var paymentInfo = await mercadoPago.GetPaymentAsync(dataId);

    if (paymentInfo is null && !string.IsNullOrWhiteSpace(bodyStatus) && !string.IsNullOrWhiteSpace(bodyReference))
    {
        paymentInfo = new MercadoPagoPaymentInfo(dataId, bodyStatus, bodyReference);
    }

    if (paymentInfo is null || string.IsNullOrWhiteSpace(paymentInfo.ExternalReference))
    {
        return Results.BadRequest(new { errors = new[] { "No se pudo resolver el pago notificado." } });
    }

    var payment = await db.Payments
        .FirstOrDefaultAsync(item => item.Id == paymentInfo.ExternalReference);

    if (payment is null)
    {
        return Results.NotFound();
    }

    if (payment.Status == "approved")
    {
        // Idempotente: una notificacion repetida no reprocesa el pago.
        return Results.Ok(new { received = true, processed = false, status = payment.Status });
    }

    var mappedStatus = paymentInfo.Status switch
    {
        "approved" => "approved",
        "rejected" or "cancelled" => "rejected",
        "refunded" or "charged_back" => "refunded",
        _ => "pending"
    };

    payment.Status = mappedStatus;
    payment.ProviderPaymentId = paymentInfo.ProviderPaymentId;
    payment.UpdatedAt = DateTimeOffset.UtcNow;

    // Pagos marketplace: el split de MP es atomico dentro del pago, asi que al aprobarse
    // la comision ya quedo acreditada a la plataforma. Marcamos el transfer en consecuencia.
    // Nota: en modo real el pago vive en la cuenta del vendedor y GetPaymentAsync con el token
    // plataforma puede no resolverlo; el fallback a external_reference del cuerpo cubre el modo
    // simulado, y el endurecimiento real-mode (consultar el pago con el token del vendedor)
    // queda para Fase 7.
    if (mappedStatus == "approved" && payment.TransferStatus == "pending")
    {
        payment.TransferStatus = "completed";
    }
    else if (mappedStatus == "refunded" && payment.TransferStatus == "completed")
    {
        payment.TransferStatus = "reversed";
    }

    if (mappedStatus == "approved")
    {
        var appointment = await db.Appointments
            .Include(item => item.Patient)
            .Include(item => item.Professional)
            .FirstOrDefaultAsync(item => item.Id == payment.AppointmentId);

        if (appointment is not null && appointment.Status == "scheduled")
        {
            appointment.Status = "confirmed";
            appointment.StatusLabel = AppointmentStatusLabel("confirmed");
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            AddAppointmentNotifications(
                db,
                appointment,
                appointment.Patient?.UserId,
                appointment.Professional?.UserId,
                "appointment_payment",
                "Pago recibido",
                $"El pago de la cita de {appointment.PatientName} fue aprobado y la cita quedó confirmada.");
        }

        AddAuditLog(db, httpRequest, null, "payment.approved", "payment", payment.Id, appointment?.PatientId, appointment?.ProfessionalId);
    }
    else
    {
        AddAuditLog(db, httpRequest, null, $"payment.{mappedStatus}", "payment", payment.Id, null, payment.ProfessionalId);
    }

    await db.SaveChangesAsync();

    return Results.Ok(new { received = true, processed = true, status = payment.Status });
});

var professionalsApi = app.MapGroup("/api/professionals");

professionalsApi.MapGet("/", async (string? specialty, string? query, HealthHubDbContext db) =>
{
    var professionals = await db.Professionals
        .AsNoTracking()
        .AsSplitQuery()
        .Include(professional => professional.Services)
        .Include(professional => professional.Availability)
        .Include(professional => professional.Reviews)
        // Regla legal: un profesional no aparece publicamente sin cedula verificada.
        .Where(professional => professional.Status == "active" && professional.VerificationStatus == "verified")
        .ToListAsync();

    if (!string.IsNullOrWhiteSpace(specialty) && specialty != "all")
    {
        professionals = professionals
            .Where(professional => professional.Specialty == specialty)
            .ToList();
    }

    if (!string.IsNullOrWhiteSpace(query))
    {
        // Acento-insensible: las etiquetas (p.ej. SpecialtyLabel) ya llevan acentos, pero
        // en Mexico la busqueda se escribe sin ellos. Normalizamos query y campos comparados.
        var normalizedQuery = MappingExtensions.RemoveDiacritics(query.Trim().ToLowerInvariant());
        professionals = professionals
            .Where(professional =>
                MappingExtensions.RemoveDiacritics(professional.DisplayName.ToLowerInvariant()).Contains(normalizedQuery) ||
                MappingExtensions.RemoveDiacritics(professional.Location.ToLowerInvariant()).Contains(normalizedQuery) ||
                MappingExtensions.RemoveDiacritics(professional.Bio.ToLowerInvariant()).Contains(normalizedQuery) ||
                MappingExtensions.RemoveDiacritics(MappingExtensions.SpecialtyLabel(professional.Specialty).ToLowerInvariant()).Contains(normalizedQuery) ||
                professional.Services.Any(service => MappingExtensions.RemoveDiacritics(service.Name.ToLowerInvariant()).Contains(normalizedQuery)))
            .ToList();
    }

    return Results.Ok(professionals
        .Select(professional => professional.ToDto())
        .OrderByDescending(professional => professional.AverageRating)
        .ThenBy(professional => professional.BasePrice)
        .ToList());
});

professionalsApi.MapGet("/by-slug/{slug}", async (string slug, HealthHubDbContext db) =>
{
    var candidates = await db.Professionals
        .AsNoTracking()
        .AsSplitQuery()
        .Include(item => item.Services)
        .Include(item => item.Availability)
        .Include(item => item.Reviews)
        .Where(item => item.Status == "active" && item.VerificationStatus == "verified")
        .ToListAsync();

    var match = candidates.FirstOrDefault(item =>
        MappingExtensions.Slugify(item.DisplayName, item.Id) == slug);

    return match is null ? Results.NotFound() : Results.Ok(match.ToDto());
});

professionalsApi.MapGet("/{id}", async (string id, HealthHubDbContext db) =>
{
    var professional = await db.Professionals
        .AsNoTracking()
        .AsSplitQuery()
        .Include(item => item.Services)
        .Include(item => item.Availability)
        .Include(item => item.Reviews)
        .FirstOrDefaultAsync(item => item.Id == id && item.Status == "active" && item.VerificationStatus == "verified");

    return professional is null ? Results.NotFound() : Results.Ok(professional.ToDto());
});

// Verificacion de cedula profesional. Solo internal_admin puede cambiar el estatus.
professionalsApi.MapPatch("/{id}/verification", async (HttpRequest request, string id, UpdateProfessionalVerificationRequest verificationRequest, EmailSender emailSender, IConfiguration configuration, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole != "internal_admin")
    {
        AddAuditLog(db, request, actor, "professional.verification.denied", "professional", id, null, id, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var professional = await db.Professionals.Include(item => item.User).FirstOrDefaultAsync(item => item.Id == id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    var status = verificationRequest.Status.Trim().ToLowerInvariant();

    if (status is not ("verified" or "rejected" or "pending"))
    {
        return Results.BadRequest(new { errors = new[] { "Estatus invalido. Usa pending, verified o rejected." } });
    }

    var now = DateTimeOffset.UtcNow;
    professional.VerificationStatus = status;
    professional.LicenseVerifiedAt = status == "verified" ? now : null;
    professional.LicenseVerifiedBy = status == "verified" ? actor.Id : null;

    if (status != "verified" && professional.Status == "active")
    {
        // Perder la verificacion retira el perfil del listado publico.
        professional.Status = "onboarding";
    }

    professional.UpdatedAt = now;
    AddAuditLog(db, request, actor, $"professional.verification.{status}", "professional", professional.Id, null, professional.Id);
    await db.SaveChangesAsync();

    if (status is "verified" or "rejected")
    {
        try
        {
            var professionalEmail = professional.User?.Email;
            if (!string.IsNullOrWhiteSpace(professionalEmail))
            {
                if (status == "verified")
                {
                    var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');
                    await emailSender.SendAsync(
                        professionalEmail,
                        "¡Tu cédula fue verificada en Clinixa!",
                        EmailSender.BuildVerificationApprovedEmail(professional.DisplayName, $"{webBaseUrl}/portal-profesional"));
                }
                else
                {
                    var reason = string.IsNullOrWhiteSpace(verificationRequest.Reason)
                        ? "No fue posible validar el número de cédula proporcionado."
                        : verificationRequest.Reason.Trim();
                    await emailSender.SendAsync(
                        professionalEmail,
                        "Sobre la verificación de tu cédula en Clinixa",
                        EmailSender.BuildVerificationRejectedEmail(professional.DisplayName, reason));
                }
            }
        }
        catch
        {
            // Best-effort: nunca romper la respuesta por un fallo de email
        }
    }

    return Results.Ok(professional.ToDto());
});

// Cola de verificacion de cedulas. Solo internal_admin: incluye perfiles en onboarding
// y pendientes que el listado publico oculta.
app.MapGet("/api/admin/professionals", async (HttpRequest request, string? verificationStatus, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole != "internal_admin")
    {
        AddAuditLog(db, request, actor, "professional.verification_queue.denied", "professional", "all", null, null, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    IQueryable<Professional> query = db.Professionals.AsNoTracking().Include(professional => professional.User);

    if (!string.IsNullOrWhiteSpace(verificationStatus) && verificationStatus != "all")
    {
        var normalizedStatus = verificationStatus.Trim().ToLowerInvariant();
        query = query.Where(professional => professional.VerificationStatus == normalizedStatus);
    }

    var professionals = await query
        .OrderBy(professional => professional.VerificationStatus == "pending" ? 0 : 1)
        .ThenByDescending(professional => professional.CreatedAt)
        .ToListAsync();

    AddAuditLog(db, request, actor, "professional.verification_queue.read", "professional", "all", null, null);
    await db.SaveChangesAsync();

    return Results.Ok(professionals
        .Select(professional => new ProfessionalVerificationDto(
            professional.Id,
            professional.DisplayName,
            professional.Specialty,
            MappingExtensions.SpecialtyLabel(professional.Specialty),
            professional.Location,
            professional.LicenseNumber,
            professional.Status,
            professional.VerificationStatus,
            professional.LicenseVerifiedAt,
            professional.LicenseVerifiedBy,
            professional.CreatedAt,
            professional.User?.Email ?? ""))
        .ToList());
});

professionalsApi.MapGet("/{id}/reviews", async (string id, HealthHubDbContext db) =>
{
    var professionalExists = await db.Professionals.AnyAsync(item => item.Id == id);

    if (!professionalExists)
    {
        return Results.NotFound();
    }

    var reviews = await db.Reviews
        .AsNoTracking()
        .Where(review => review.ProfessionalId == id && review.Status == "published")
        .OrderByDescending(review => review.CreatedAt)
        .Select(review => review.ToDto())
        .ToListAsync();

    return Results.Ok(reviews);
});

// Reglas de resenas: solo pacientes reales (cita completada con el profesional),
// una resena por cita, sin edicion posterior. La moderacion es exclusiva del admin.
professionalsApi.MapPost("/{id}/reviews", async (HttpRequest request, string id, CreateReviewRequest reviewRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole != "patient" || actor.Patient is null)
    {
        AddAuditLog(db, request, actor, "review.create.denied", "review", "new", actor.Patient?.Id, id, "denied");
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
    AddAuditLog(db, request, actor, "review.create", "review", review.Id, actor.Patient.Id, id);
    await db.SaveChangesAsync();

    return Results.Created($"/api/professionals/{id}/reviews", review.ToDto());
});

professionalsApi.MapGet("/{id}/available-slots", async (string id, string serviceId, int? days, HealthHubDbContext db) =>
{
    var professional = await db.Professionals
        .AsNoTracking()
        .FirstOrDefaultAsync(item => item.Id == id && item.Status == "active" && item.VerificationStatus == "verified");

    if (professional is null)
    {
        return Results.NotFound();
    }

    var service = await db.ProfessionalServices
        .AsNoTracking()
        .FirstOrDefaultAsync(item => item.Id == serviceId && item.ProfessionalId == professional.Id && item.Status == "active");

    if (service is null)
    {
        return Results.BadRequest(new { errors = new[] { "serviceId no existe para el profesional." } });
    }

    var rangeDays = Math.Clamp(days ?? 21, 1, 60);
    var availability = await db.ProfessionalAvailability
        .AsNoTracking()
        .Where(item => item.ProfessionalId == professional.Id && item.Status == "active")
        .ToListAsync();

    var startsOn = DateOnly.FromDateTime(DateTime.UtcNow.Date);
    var endsOn = startsOn.AddDays(rangeDays);
    var appointments = await db.Appointments
        .AsNoTracking()
        .Where(item =>
            item.ProfessionalId == professional.Id &&
            (item.Status == "scheduled" || item.Status == "confirmed") &&
            item.StartsAt != null &&
            item.EndsAt != null)
        .ToListAsync();

    var slots = BuildAvailableSlots(professional, service, availability, appointments, startsOn, endsOn);
    return Results.Ok(slots);
});

var patientPortalApi = app.MapGroup("/api/patient-portal");

patientPortalApi.MapGet("/appointments", async (HttpRequest request, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser?.Patient is null)
    {
        return Results.Ok(Array.Empty<PatientPortalAppointmentDto>());
    }

    var patientId = currentUser.Patient.Id;

    var appointments = await db.Appointments
        .AsNoTracking()
        .Include(appointment => appointment.Professional)
        .Where(appointment => appointment.PatientId == patientId)
        .OrderBy(appointment => appointment.Date)
        .ThenBy(appointment => appointment.Time)
        .ToListAsync();

    var lastPayments = await GetLatestPaymentsByAppointmentAsync(db, appointments.Select(appointment => appointment.Id).ToList());

    return Results.Ok(appointments
        .Select(appointment => appointment.ToPortalDto(appointment.Professional, lastPayments.GetValueOrDefault(appointment.Id)))
        .ToList());
});

patientPortalApi.MapGet("/records", async (HttpRequest request, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser?.Patient is null)
    {
        return Results.Ok(Array.Empty<PatientRecordDto>());
    }

    var patientId = currentUser.Patient.Id;

    var records = await db.PatientRecords
        .AsNoTracking()
        .Include(record => record.Professional)
        .Where(record => record.PatientId == patientId && record.Visibility == "patient_visible" && record.Status == "active")
        .OrderByDescending(record => record.UpdatedAt)
        .ToListAsync();

    AddAuditLog(db, request, currentUser, "patient_records.read", "patient", patientId, patientId, null);
    await db.SaveChangesAsync();

    return Results.Ok(records
        .Select(record => record.ToDto(record.Professional))
        .ToList());
});

var professionalPortalApi = app.MapGroup("/api/professional-portal");

professionalPortalApi.MapGet("/dashboard", async (HttpRequest request, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser is null)
    {
        return Results.Unauthorized();
    }

    if (currentUser.Professional is null)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var professional = await db.Professionals
        .AsNoTracking()
        .AsSplitQuery()
        .Include(item => item.Services)
        .Include(item => item.Availability)
        .Include(item => item.Reviews)
        .FirstOrDefaultAsync(item => item.Id == currentUser.Professional.Id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    var appointments = await db.Appointments
        .AsNoTracking()
        .Include(appointment => appointment.Professional)
        .Where(appointment => appointment.ProfessionalId == professional.Id)
        .OrderBy(appointment => appointment.Date)
        .ThenBy(appointment => appointment.Time)
        .ToListAsync();

    var patientCount = await db.ProfessionalPatients
        .AsNoTracking()
        .CountAsync(item => item.ProfessionalId == professional.Id && item.Status == "active");

    var lastPayments = await GetLatestPaymentsByAppointmentAsync(db, appointments.Select(appointment => appointment.Id).ToList());

    AddAuditLog(db, request, currentUser, "professional_dashboard.read", "professional", professional.Id, null, professional.Id);
    await db.SaveChangesAsync();

    return Results.Ok(new ProfessionalDashboardDto(
        professional.ToDto(),
        appointments.Select(appointment => appointment.ToPortalDto(professional, lastPayments.GetValueOrDefault(appointment.Id))).ToList(),
        appointments.Count(appointment => appointment.Status is "scheduled" or "confirmed"),
        appointments.Count(appointment => appointment.Status == "completed"),
        patientCount));
});

professionalPortalApi.MapPost("/services", async (HttpRequest request, CreateProfessionalServiceRequest serviceRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.Professional is null)
    {
        return Results.Unauthorized();
    }

    var errors = ValidateCreateProfessionalService(serviceRequest);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    var service = new ProfessionalService
    {
        Id = $"svc-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        ProfessionalId = actor.Professional.Id,
        Name = serviceRequest.Name.Trim(),
        Description = serviceRequest.Description.Trim(),
        DurationMinutes = serviceRequest.DurationMinutes,
        Price = serviceRequest.Price,
        Mode = NormalizeServiceMode(serviceRequest.Mode),
        Status = "active"
    };

    db.ProfessionalServices.Add(service);
    AddAuditLog(db, request, actor, "professional_service.create", "professional_service", service.Id, null, service.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Created($"/api/professional-portal/services/{service.Id}", service.ToDto());
});

professionalPortalApi.MapPatch("/services/{id}", async (HttpRequest request, string id, UpdateProfessionalServiceRequest serviceRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var service = await db.ProfessionalServices.FirstOrDefaultAsync(item => item.Id == id);

    if (service is null)
    {
        return Results.NotFound();
    }

    if (!await CanManageProfessionalConfigAsync(actor, service.ProfessionalId, db))
    {
        AddAuditLog(db, request, actor, "professional_service.update.denied", "professional_service", service.Id, null, service.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var errors = ValidateUpdateProfessionalService(serviceRequest);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    service.Name = serviceRequest.Name.Trim();
    service.Description = serviceRequest.Description.Trim();
    service.DurationMinutes = serviceRequest.DurationMinutes;
    service.Price = serviceRequest.Price;
    service.Mode = NormalizeServiceMode(serviceRequest.Mode);
    service.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, request, actor, "professional_service.update", "professional_service", service.Id, null, service.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Ok(service.ToDto());
});

professionalPortalApi.MapPost("/availability", async (HttpRequest request, CreateProfessionalAvailabilityRequest availabilityRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.Professional is null)
    {
        return Results.Unauthorized();
    }

    var errors = ValidateProfessionalAvailability(availabilityRequest.Weekday, availabilityRequest.StartsAt, availabilityRequest.EndsAt);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    var duplicate = await db.ProfessionalAvailability.AnyAsync(item =>
        item.ProfessionalId == actor.Professional.Id &&
        item.Weekday == availabilityRequest.Weekday &&
        item.StartsAt == availabilityRequest.StartsAt.Trim() &&
        item.EndsAt == availabilityRequest.EndsAt.Trim() &&
        item.Status == "active");
    if (duplicate)
    {
        return Results.Conflict(new { errors = new[] { "Ya existe una franja activa idéntica." } });
    }

    var availability = new ProfessionalAvailability
    {
        Id = $"av-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        ProfessionalId = actor.Professional.Id,
        Weekday = availabilityRequest.Weekday,
        StartsAt = availabilityRequest.StartsAt.Trim(),
        EndsAt = availabilityRequest.EndsAt.Trim(),
        Timezone = actor.Professional.Timezone,
        Status = "active"
    };

    db.ProfessionalAvailability.Add(availability);
    AddAuditLog(db, request, actor, "professional_availability.create", "professional_availability", availability.Id, null, availability.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Created($"/api/professional-portal/availability/{availability.Id}", availability.ToDto());
});

professionalPortalApi.MapPatch("/availability/{id}", async (HttpRequest request, string id, UpdateProfessionalAvailabilityRequest availabilityRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var availability = await db.ProfessionalAvailability.FirstOrDefaultAsync(item => item.Id == id);

    if (availability is null)
    {
        return Results.NotFound();
    }

    if (!await CanManageProfessionalConfigAsync(actor, availability.ProfessionalId, db))
    {
        AddAuditLog(db, request, actor, "professional_availability.update.denied", "professional_availability", availability.Id, null, availability.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var errors = ValidateProfessionalAvailability(availabilityRequest.Weekday, availabilityRequest.StartsAt, availabilityRequest.EndsAt);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    availability.Weekday = availabilityRequest.Weekday;
    availability.StartsAt = availabilityRequest.StartsAt.Trim();
    availability.EndsAt = availabilityRequest.EndsAt.Trim();
    availability.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, request, actor, "professional_availability.update", "professional_availability", availability.Id, null, availability.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Ok(availability.ToDto());
});

professionalPortalApi.MapGet("/onboarding", async (HttpRequest request, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser is null)
    {
        return Results.Unauthorized();
    }

    if (currentUser.Professional is null)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var professional = await db.Professionals
        .AsNoTracking()
        .AsSplitQuery()
        .Include(item => item.Services)
        .Include(item => item.Availability)
        .FirstOrDefaultAsync(item => item.Id == currentUser.Professional.Id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    return Results.Ok(BuildOnboardingStatus(professional));
});

professionalPortalApi.MapPatch("/profile", async (HttpRequest request, UpdateProfessionalProfileRequest profileRequest, EmailSender emailSender, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.Professional is null)
    {
        return Results.Unauthorized();
    }

    var errors = ValidateProfessionalProfile(profileRequest);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    var professional = await db.Professionals
        .AsSplitQuery()
        .Include(item => item.Services)
        .Include(item => item.Availability)
        .Include(item => item.Reviews)
        .FirstOrDefaultAsync(item => item.Id == actor.Professional.Id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    professional.DisplayName = profileRequest.DisplayName.Trim();
    professional.Bio = profileRequest.Bio.Trim();
    professional.Location = profileRequest.Location.Trim();
    professional.Specialty = NormalizeSpecialty(profileRequest.Specialty);
    professional.AppointmentMode = NormalizeServiceMode(profileRequest.AppointmentMode);
    professional.BasePrice = profileRequest.BasePrice;

    if (profileRequest.WhatsappNumber is not null)
    {
        professional.WhatsappNumber = profileRequest.WhatsappNumber.Trim();
    }

    var verificationReset = false;
    if (!string.IsNullOrWhiteSpace(profileRequest.LicenseNumber) &&
        profileRequest.LicenseNumber.Trim() != professional.LicenseNumber)
    {
        // Cambiar la cedula invalida la verificacion previa: vuelve a pending y el
        // perfil deja de ser elegible para publicacion hasta una nueva revision.
        professional.LicenseNumber = profileRequest.LicenseNumber.Trim();
        professional.VerificationStatus = "pending";
        professional.LicenseVerifiedAt = null;
        professional.LicenseVerifiedBy = null;
        verificationReset = true;
    }

    if (!string.IsNullOrWhiteSpace(profileRequest.Timezone))
    {
        professional.Timezone = profileRequest.Timezone.Trim();
    }

    professional.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, request, actor, "professional_profile.update", "professional", professional.Id, null, professional.Id);

    if (verificationReset)
    {
        AddAuditLog(db, request, actor, "professional_license.verification.pending", "professional", professional.Id, null, professional.LicenseNumber);
    }

    await db.SaveChangesAsync();

    if (verificationReset)
    {
        try
        {
            var professionalEmail = actor.Email;
            if (!string.IsNullOrWhiteSpace(professionalEmail))
            {
                await emailSender.SendAsync(
                    professionalEmail,
                    "Tu cédula profesional está en revisión",
                    EmailSender.BuildVerificationPendingEmail(professional.DisplayName));
            }
        }
        catch
        {
            // Best-effort: nunca romper la respuesta por un fallo de email
        }
    }

    return Results.Ok(professional.ToDto());
});

professionalPortalApi.MapPost("/avatar", async (HttpRequest request, IWebHostEnvironment env, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);
    if (actor is null) return Results.Unauthorized();
    if (actor.Professional is null) return Results.StatusCode(StatusCodes.Status403Forbidden);

    if (!request.HasFormContentType) return Results.BadRequest(new { errors = new[] { "Se esperaba multipart/form-data." } });
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0) return Results.BadRequest(new { errors = new[] { "Falta el archivo 'file'." } });
    if (file.Length > 2 * 1024 * 1024) return Results.BadRequest(new { errors = new[] { "La imagen no debe exceder 2 MB." } });

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
    if (!allowed.Contains(ext)) return Results.BadRequest(new { errors = new[] { "Formato no soportado (usa JPG, PNG o WEBP)." } });

    var professional = await db.Professionals.FirstAsync(p => p.Id == actor.Professional.Id);
    var webRoot = string.IsNullOrEmpty(env.WebRootPath) ? Path.Combine(env.ContentRootPath, "wwwroot") : env.WebRootPath;
    var dir = Path.Combine(webRoot, "uploads", "avatars");
    Directory.CreateDirectory(dir);
    // Nombre estable por profesional; sufijo de versión para cache-busting.
    var fileName = $"{professional.Id}{ext}";
    var fullPath = Path.Combine(dir, fileName);
    using (var stream = File.Create(fullPath))
    {
        await file.CopyToAsync(stream);
    }
    var now = DateTimeOffset.UtcNow;
    professional.ProfilePhotoUrl = $"/uploads/avatars/{fileName}?v={now.ToUnixTimeSeconds()}";
    professional.UpdatedAt = now;
    AddAuditLog(db, request, actor, "professional.avatar.update", "professional", professional.Id, null, professional.Id);
    await db.SaveChangesAsync();

    var refreshed = await db.Professionals.AsNoTracking().AsSplitQuery()
        .Include(p => p.Services).Include(p => p.Availability).Include(p => p.Reviews)
        .FirstAsync(p => p.Id == professional.Id);
    return Results.Ok(refreshed.ToDto());
});

professionalPortalApi.MapPost("/publish", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.Professional is null)
    {
        return Results.Unauthorized();
    }

    var professional = await db.Professionals
        .AsSplitQuery()
        .Include(item => item.Services)
        .Include(item => item.Availability)
        .Include(item => item.Reviews)
        .FirstOrDefaultAsync(item => item.Id == actor.Professional.Id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    var onboarding = BuildOnboardingStatus(professional);

    if (!onboarding.CanPublish)
    {
        return Results.BadRequest(new { errors = onboarding.Missing });
    }

    professional.Status = "active";
    professional.UpdatedAt = DateTimeOffset.UtcNow;
    AddAuditLog(db, request, actor, "professional.publish", "professional", professional.Id, null, professional.Id);
    await db.SaveChangesAsync();

    return Results.Ok(professional.ToDto());
});

// Estado de cuenta mensual del profesional autenticado: pagos de sus citas con desglose
// bruto/comision/neto y totales por metodo. month=YYYY-MM (default: mes actual UTC).
professionalPortalApi.MapGet("/payments", async (HttpRequest request, string? month, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser is null)
    {
        return Results.Unauthorized();
    }

    if (currentUser.Professional is null)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var now = DateTimeOffset.UtcNow;
    var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

    if (!string.IsNullOrWhiteSpace(month))
    {
        if (!DateOnly.TryParseExact($"{month.Trim()}-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedMonth))
        {
            return Results.BadRequest(new { errors = new[] { "El parametro month debe usar formato YYYY-MM." } });
        }

        monthStart = new DateTimeOffset(parsedMonth.Year, parsedMonth.Month, 1, 0, 0, 0, TimeSpan.Zero);
    }

    var monthEnd = monthStart.AddMonths(1);
    var professionalId = currentUser.Professional.Id;

    var payments = await db.Payments
        .AsNoTracking()
        .Where(payment => payment.ProfessionalId == professionalId && payment.CreatedAt >= monthStart && payment.CreatedAt < monthEnd)
        .OrderByDescending(payment => payment.CreatedAt)
        .ToListAsync();

    var appointmentIds = payments.Select(payment => payment.AppointmentId).Distinct().ToList();
    var paymentAppointments = await db.Appointments
        .AsNoTracking()
        .Where(appointment => appointmentIds.Contains(appointment.Id))
        .ToDictionaryAsync(appointment => appointment.Id);

    var items = payments
        .Select(payment =>
        {
            var appointment = paymentAppointments.GetValueOrDefault(payment.AppointmentId);

            return new ProfessionalPaymentItemDto(
                payment.Id,
                payment.AppointmentId,
                payment.CreatedAt,
                appointment?.Date ?? string.Empty,
                appointment?.PatientName ?? "Paciente",
                string.IsNullOrWhiteSpace(appointment?.Type) ? "Consulta" : appointment.Type,
                payment.Amount,
                payment.CommissionAmount,
                payment.Amount - payment.CommissionAmount,
                payment.Provider,
                payment.Status);
        })
        .ToList();

    // Los totales solo consideran pagos approved: lo demas es ruido contable (pendientes,
    // rechazados). CashTotal y OnlineTotal son netos y suman exactamente NetTotal.
    var approved = payments.Where(payment => payment.Status == "approved").ToList();
    var grossTotal = approved.Sum(payment => payment.Amount);
    var commissionTotal = approved.Sum(payment => payment.CommissionAmount);
    var summary = new ProfessionalPaymentsSummaryDto(
        grossTotal,
        commissionTotal,
        grossTotal - commissionTotal,
        approved.Where(payment => payment.Provider == "cash").Sum(payment => payment.Amount - payment.CommissionAmount),
        approved.Where(payment => payment.Provider != "cash").Sum(payment => payment.Amount - payment.CommissionAmount),
        approved.Count);

    AddAuditLog(db, request, currentUser, "professional_payments.read", "payment", "list", null, professionalId);
    await db.SaveChangesAsync();

    return Results.Ok(new ProfessionalPaymentsDto(
        monthStart.ToString("yyyy-MM", CultureInfo.InvariantCulture),
        items,
        summary));
});

// Analytics del profesional autenticado: totales del mes en curso y de todos los tiempos
// para citas, pacientes activos y pagos (bruto/comision/neto). Solo pagos "approved" cuentan.
professionalPortalApi.MapGet("/analytics", async (HttpRequest request, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser is null)
    {
        return Results.Unauthorized();
    }

    if (currentUser.Professional is null)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var professionalId = currentUser.Professional.Id;
    var now = DateTimeOffset.UtcNow;
    var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
    var monthEnd = monthStart.AddMonths(1);

    // --- Citas ---
    var allAppointments = await db.Appointments
        .AsNoTracking()
        .Where(appointment => appointment.ProfessionalId == professionalId)
        .Select(appointment => new { appointment.Status, appointment.CreatedAt })
        .ToListAsync();

    var thisMonthAppts = allAppointments
        .Where(appointment => appointment.CreatedAt >= monthStart && appointment.CreatedAt < monthEnd)
        .ToList();

    // --- Pacientes activos (mismo valor en ambos períodos: es un conteo puntual) ---
    var activePatients = await db.ProfessionalPatients
        .AsNoTracking()
        .CountAsync(item => item.ProfessionalId == professionalId && item.Status == "active");

    // --- Pagos ---
    var allPayments = await db.Payments
        .AsNoTracking()
        .Where(payment => payment.ProfessionalId == professionalId && payment.Status == "approved")
        .Select(payment => new { payment.Amount, payment.CommissionAmount, payment.CreatedAt })
        .ToListAsync();

    var thisMonthPayments = allPayments
        .Where(payment => payment.CreatedAt >= monthStart && payment.CreatedAt < monthEnd)
        .ToList();

    var thisMonth = new ProfessionalAnalyticsPeriodDto(
        AppointmentsScheduled: thisMonthAppts.Count(appointment => appointment.Status is "scheduled" or "confirmed"),
        AppointmentsCompleted: thisMonthAppts.Count(appointment => appointment.Status == "completed"),
        ActivePatients: activePatients,
        GrossTotal: thisMonthPayments.Sum(payment => payment.Amount),
        CommissionTotal: thisMonthPayments.Sum(payment => payment.CommissionAmount),
        NetTotal: thisMonthPayments.Sum(payment => payment.Amount - payment.CommissionAmount));

    var lifetime = new ProfessionalAnalyticsPeriodDto(
        AppointmentsScheduled: allAppointments.Count(appointment => appointment.Status is "scheduled" or "confirmed"),
        AppointmentsCompleted: allAppointments.Count(appointment => appointment.Status == "completed"),
        ActivePatients: activePatients,
        GrossTotal: allPayments.Sum(payment => payment.Amount),
        CommissionTotal: allPayments.Sum(payment => payment.CommissionAmount),
        NetTotal: allPayments.Sum(payment => payment.Amount - payment.CommissionAmount));

    return Results.Ok(new ProfessionalAnalyticsDto(
        monthStart.ToString("yyyy-MM", CultureInfo.InvariantCulture),
        thisMonth,
        lifetime));
});

// Estado del trial y planes de suscripcion del piloto. El trial corre desde la creacion de la
// cuenta (User.CreatedAt) y dura 14 dias. Lectura ligera de configuracion propia: no se audita.
professionalPortalApi.MapGet("/subscription", async (HttpRequest request, HealthHubDbContext db) =>
{
    var currentUser = await GetUserFromRequestAsync(request, db);

    if (currentUser is null)
    {
        return Results.Unauthorized();
    }

    if (currentUser.Professional is null)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    return Results.Ok(BuildSubscriptionStatus(currentUser, currentUser.Professional));
});

// Registra interes de compra de suscripcion durante el piloto. Idempotente: la primera llamada
// fija SubscriptionInterestAt, audita y notifica a los internal_admin; las siguientes solo
// devuelven el estado vigente sin duplicar nada.
professionalPortalApi.MapPost("/subscription/interest", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.Professional is null)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var professional = await db.Professionals.FirstOrDefaultAsync(item => item.Id == actor.Professional.Id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    if (professional.SubscriptionInterestAt is null)
    {
        var now = DateTimeOffset.UtcNow;
        professional.SubscriptionInterestAt = now;
        professional.UpdatedAt = now;

        AddAuditLog(db, request, actor, "subscription.interest", "professional", professional.Id, null, professional.Id);

        var adminUserIds = await db.Users
            .AsNoTracking()
            .Where(user => user.PrimaryRole == "internal_admin" && user.Status == "active")
            .Select(user => user.Id)
            .ToListAsync();

        foreach (var adminUserId in adminUserIds)
        {
            db.Notifications.Add(new Notification
            {
                Id = $"notif-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
                UserId = adminUserId,
                ProfessionalId = professional.Id,
                Type = "subscription_interest",
                Title = "Interés en activar un plan",
                Body = $"{professional.DisplayName} quiere activar su plan de suscripción. Contáctalo para completar la activación del piloto.",
                Priority = "high",
                Status = "unread",
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await db.SaveChangesAsync();
    }

    return Results.Ok(BuildSubscriptionStatus(actor, professional));
});

// Fase 4: Endpoints Mercado Pago Marketplace
var professionalMarketplaceApi = app.MapGroup("/api/professional-marketplace");

professionalMarketplaceApi.MapGet("/connect", async (HttpRequest request, MercadoPagoMarketplaceService mpService, IConfiguration configuration, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.Professional is null)
    {
        return Results.Unauthorized();
    }

    // El redirect del OAuth aterriza en el navegador del usuario, por eso apunta al WEB y no al host del API.
    // Debe coincidir exactamente con el redirectUri del canje en /callback (MP lo valida).
    var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');
    var redirectUri = $"{webBaseUrl}/portal-profesional/marketplace-callback";
    var state = mpService.CreateOAuthState(actor.Professional.Id);
    var authUrl = mpService.BuildAuthorizationUrl(state, redirectUri);

    AddAuditLog(db, request, actor, "marketplace.authorization_requested", "professional", actor.Professional.Id, null, actor.Professional.Id);
    await db.SaveChangesAsync();

    return Results.Ok(new { authorizationUrl = authUrl, redirectUri });
});

professionalMarketplaceApi.MapGet("/status", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.Professional is null)
    {
        return Results.Unauthorized();
    }

    // Lectura ligera del estado de configuracion propia: no se audita para no inflar audit_logs.
    var account = await db.ProfessionalMercadoPagos
        .AsNoTracking()
        .FirstOrDefaultAsync(m => m.ProfessionalId == actor.Professional.Id);

    var commissionPercentage = await ResolveCommissionPercentageAsync(db, actor.Professional);

    // Nunca exponemos los campos de tokens cifrados.
    return Results.Ok(new
    {
        status = actor.Professional.MercadoPagoStatus,
        email = string.IsNullOrWhiteSpace(account?.Email) ? null : account!.Email,
        connectedAt = account?.ConnectedAt,
        verifiedAt = account?.VerifiedAt,
        tokenExpiresAt = account?.TokenExpiresAt,
        commissionPercentage
    });
});

professionalMarketplaceApi.MapPost("/callback", async (HttpRequest request, MercadoPagoMarketplaceOAuthCallbackRequest callbackRequest, MercadoPagoMarketplaceService mpService, TokenEncryptionService encryptionService, IConfiguration configuration, HealthHubDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(callbackRequest.Code) || string.IsNullOrWhiteSpace(callbackRequest.State))
    {
        return Results.BadRequest(new { error = "Código o estado no válido" });
    }

    var professionalId = mpService.TryParseOAuthState(callbackRequest.State);
    if (string.IsNullOrWhiteSpace(professionalId))
    {
        return Results.BadRequest(new { error = "State inválido o expirado" });
    }

    var professional = await db.Professionals.FirstOrDefaultAsync(p => p.Id == professionalId);
    if (professional is null)
    {
        return Results.NotFound();
    }

    // Mismo redirectUri que en /connect: MP valida que coincida con el usado para generar el code.
    var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');
    var redirectUri = $"{webBaseUrl}/portal-profesional/marketplace-callback";
    var oauthCredentials = await mpService.ExchangeAuthorizationCodeAsync(callbackRequest.Code, redirectUri);

    if (oauthCredentials is null)
    {
        AddAuditLog(db, null, null, "marketplace.oauth_exchange_failed", "professional", professional.Id, null, professional.Id);
        await db.SaveChangesAsync();
        return Results.BadRequest(new { error = "No se pudo canjear el código" });
    }

    var accountInfo = await mpService.GetAccountInfoAsync(oauthCredentials.AccessToken);

    var existingMpAccount = await db.ProfessionalMercadoPagos.FirstOrDefaultAsync(m => m.ProfessionalId == professional.Id);

    if (existingMpAccount is not null)
    {
        existingMpAccount.MercadoPagoUserId = oauthCredentials.MercadoPagoUserId;
        existingMpAccount.Status = "pending";
        existingMpAccount.AccessTokenEncrypted = encryptionService.Protect(oauthCredentials.AccessToken);
        existingMpAccount.RefreshTokenEncrypted = encryptionService.Protect(oauthCredentials.RefreshToken);
        existingMpAccount.PublicKey = oauthCredentials.PublicKey;
        existingMpAccount.TokenExpiresAt = oauthCredentials.TokenExpiresAt;
        existingMpAccount.Email = accountInfo?.Email ?? string.Empty;
        existingMpAccount.ConnectedAt = DateTimeOffset.UtcNow;
        existingMpAccount.UpdatedAt = DateTimeOffset.UtcNow;
    }
    else
    {
        var newMpAccount = new ProfessionalMercadoPago
        {
            Id = $"mp-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            ProfessionalId = professional.Id,
            MercadoPagoUserId = oauthCredentials.MercadoPagoUserId,
            Status = "pending",
            AccessTokenEncrypted = encryptionService.Protect(oauthCredentials.AccessToken),
            RefreshTokenEncrypted = encryptionService.Protect(oauthCredentials.RefreshToken),
            PublicKey = oauthCredentials.PublicKey,
            TokenExpiresAt = oauthCredentials.TokenExpiresAt,
            Email = accountInfo?.Email ?? string.Empty,
            ConnectedAt = DateTimeOffset.UtcNow
        };
        db.ProfessionalMercadoPagos.Add(newMpAccount);
    }

    professional.MercadoPagoStatus = "pending";
    professional.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, request, null, "marketplace.oauth_linked", "professional", professional.Id, null, professional.Id);
    await db.SaveChangesAsync();

    return Results.Created($"/api/professional-marketplace/{professional.Id}", new { status = "pending", message = "Cuenta vinculada. Pendiente de verificación." });
}).WithName("MarketplaceCallback");

// La sesion se valida dentro de cada handler con GetUserFromRequestAsync (acepta tokens legacy/dev y Clerk JWT).
// No usamos .RequireAuthorization() a nivel grupo porque el middleware JWT de Clerk rechaza los tokens legacy/dev.
var adminMarketplaceApi = app.MapGroup("/api/admin/marketplace");

adminMarketplaceApi.MapGet("/pending", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor?.PrimaryRole != "internal_admin" && actor?.PrimaryRole != "clinic_admin")
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    IQueryable<Professional> query = db.Professionals
        .AsNoTracking()
        .Include(p => p.User)
        .Include(p => p.MercadoPagoAccount);

    if (actor.PrimaryRole == "clinic_admin")
    {
        var clinicIds = await db.ClinicMemberships
            .AsNoTracking()
            .Where(m => m.UserId == actor.Id && m.Status == "active" && m.Role == "clinic_admin")
            .Select(m => m.ClinicId)
            .ToListAsync();

        if (clinicIds.Count == 0)
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        query = query.Where(p => p.ClinicMemberships.Any(m => clinicIds.Contains(m.ClinicId) && m.Status == "active"));
    }

    var pendingProfessionals = await query
        .Where(p => p.MercadoPagoStatus == "pending")
        .Select(p => new
        {
            p.Id,
            p.DisplayName,
            Email = p.User != null ? p.User.Email : string.Empty,
            p.MercadoPagoStatus,
            p.VerificationStatus,
            ConnectedAt = p.MercadoPagoAccount != null ? p.MercadoPagoAccount.ConnectedAt : null
        })
        .ToListAsync();

    // resourceId no puede ser null (columna NOT NULL); usamos el sentinel "list" como el resto de lecturas de listas.
    AddAuditLog(db, request, actor, "marketplace.pending_list", "professional", "list", null, null);
    await db.SaveChangesAsync();

    return Results.Ok(pendingProfessionals);
});

adminMarketplaceApi.MapPatch("/professionals/{id}/verify", async (HttpRequest request, string id, VerifyMercadoPagoRequest verifyRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var professional = await db.Professionals
        .Include(p => p.MercadoPagoAccount)
        .FirstOrDefaultAsync(p => p.Id == id);

    if (professional is null)
    {
        return Results.NotFound();
    }

    if (!await CanManageMarketplaceAsync(actor, professional, db))
    {
        AddAuditLog(db, request, actor, "marketplace.verify.denied", "professional", professional.Id, null, professional.Id, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var validStatuses = new[] { "verified", "rejected" };
    if (!validStatuses.Contains(verifyRequest.Status))
    {
        return Results.BadRequest(new { error = "Estado inválido. Debe ser 'verified' o 'rejected'." });
    }

    professional.MercadoPagoStatus = verifyRequest.Status;
    professional.UpdatedAt = DateTimeOffset.UtcNow;

    if (professional.MercadoPagoAccount is not null)
    {
        professional.MercadoPagoAccount.Status = verifyRequest.Status;
        if (verifyRequest.Status == "verified")
        {
            professional.MercadoPagoAccount.VerifiedAt = DateTimeOffset.UtcNow;
        }
        professional.MercadoPagoAccount.UpdatedAt = DateTimeOffset.UtcNow;
    }

    AddAuditLog(db, request, actor, $"marketplace.{verifyRequest.Status}", "professional", professional.Id, null, professional.Id);
    await db.SaveChangesAsync();

    return Results.Ok(new { status = professional.MercadoPagoStatus, message = $"Profesional {verifyRequest.Status}." });
});

var clinicsApi = app.MapGroup("/api/clinics");

clinicsApi.MapGet("/", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole == "patient")
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var clinics = db.Clinics
        .AsNoTracking()
        .AsSplitQuery()
        .Include(clinic => clinic.Memberships)
        .ThenInclude(membership => membership.User)
        .Include(clinic => clinic.Memberships)
        .ThenInclude(membership => membership.Professional)
        .Where(clinic => clinic.Status == "active");

    if (actor.PrimaryRole != "internal_admin")
    {
        var clinicIds = await db.ClinicMemberships
            .AsNoTracking()
            .Where(membership => membership.UserId == actor.Id && membership.Status == "active")
            .Select(membership => membership.ClinicId)
            .ToListAsync();

        clinics = clinics.Where(clinic => clinicIds.Contains(clinic.Id));
    }

    var clinicList = await clinics
        .OrderBy(clinic => clinic.Name)
        .ToListAsync();
    var result = clinicList.Select(clinic => clinic.ToDto()).ToList();

    AddAuditLog(db, request, actor, "clinics.read", "clinic", "list", actor.Patient?.Id, actor.Professional?.Id);
    await db.SaveChangesAsync();

    return Results.Ok(result);
});

clinicsApi.MapGet("/{clinicId}/invitations", async (HttpRequest request, string clinicId, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (!await CanManageClinicAsync(actor, clinicId, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var invitations = await db.ClinicInvitations
        .AsNoTracking()
        .Where(invitation => invitation.ClinicId == clinicId)
        .OrderByDescending(invitation => invitation.CreatedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(invitations.Select(invitation => invitation.ToDto()).ToList());
});

clinicsApi.MapPost("/{clinicId}/invitations", async (HttpRequest request, string clinicId, CreateClinicInvitationRequest invitationRequest, EmailSender emailSender, IConfiguration configuration, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (!await CanManageClinicAsync(actor, clinicId, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var clinic = await db.Clinics.FirstOrDefaultAsync(item => item.Id == clinicId && item.Status == "active");

    if (clinic is null)
    {
        return Results.NotFound();
    }

    var errors = ValidateClinicInvitation(invitationRequest);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    var email = invitationRequest.Email.Trim().ToLowerInvariant();
    var invitation = new ClinicInvitation
    {
        Id = $"invite-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        ClinicId = clinicId,
        Email = email,
        FullName = invitationRequest.FullName.Trim(),
        Role = NormalizeClinicRole(invitationRequest.Role),
        Specialty = string.IsNullOrWhiteSpace(invitationRequest.Specialty) ? "other" : invitationRequest.Specialty.Trim(),
        LicenseNumber = string.IsNullOrWhiteSpace(invitationRequest.LicenseNumber) ? "Por definir" : invitationRequest.LicenseNumber.Trim(),
        Status = "pending",
        Token = PasswordHasher.CreateToken(),
        InvitedByUserId = actor.Id,
        ExpiresAt = DateTimeOffset.UtcNow.AddDays(14)
    };

    db.ClinicInvitations.Add(invitation);
    db.Notifications.Add(new Notification
    {
        Id = $"notif-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        UserId = actor.Id,
        Type = "clinic_invitation",
        Title = "Invitación creada",
        Body = $"{invitation.FullName} fue invitado a la clínica.",
        Priority = "normal",
        Status = "unread",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    });
    AddAuditLog(db, request, actor, "clinic_invitation.create", "clinic", clinicId, null, actor.Professional?.Id);
    await db.SaveChangesAsync();

    await SendInvitationEmailAsync(emailSender, configuration, db, request, actor, invitation, clinic.Name);
    await db.SaveChangesAsync();

    return Results.Created($"/api/clinics/{clinicId}/invitations/{invitation.Id}", invitation.ToDto());
});

var clinicInvitationsApi = app.MapGroup("/api/clinic-invitations");

clinicInvitationsApi.MapGet("/{token}", async (string token, HealthHubDbContext db) =>
{
    var invitation = await db.ClinicInvitations
        .AsNoTracking()
        .Include(item => item.Clinic)
        .FirstOrDefaultAsync(item => item.Token == token);

    if (invitation is null)
    {
        return Results.NotFound();
    }

    var accountExists = await db.Users.AnyAsync(user => user.Email == invitation.Email);
    var clinicName = invitation.Clinic?.Name ?? "Clinica";

    return Results.Ok(invitation.ToDetailDto(clinicName, !accountExists, DateTimeOffset.UtcNow));
});

clinicInvitationsApi.MapPost("/{token}/accept", async (HttpRequest request, string token, AcceptClinicInvitationRequest acceptRequest, HealthHubDbContext db) =>
{
    var invitation = await db.ClinicInvitations.FirstOrDefaultAsync(item => item.Token == token);

    if (invitation is null)
    {
        return Results.NotFound();
    }

    var now = DateTimeOffset.UtcNow;

    if (invitation.Status != "pending")
    {
        return Results.Conflict(new { errors = new[] { "Esta invitación ya fue procesada." } });
    }

    if (invitation.ExpiresAt <= now)
    {
        invitation.Status = "expired";
        invitation.UpdatedAt = now;
        await db.SaveChangesAsync();
        return Results.Conflict(new { errors = new[] { "La invitación expiró. Pide una nueva al administrador de la clínica." } });
    }

    var clinicExists = await db.Clinics.AnyAsync(clinic => clinic.Id == invitation.ClinicId && clinic.Status == "active");

    if (!clinicExists)
    {
        return Results.Conflict(new { errors = new[] { "La clínica de la invitación ya no está activa." } });
    }

    var email = invitation.Email.Trim().ToLowerInvariant();
    var targetRole = NormalizeClinicRole(invitation.Role);
    var clerkSubject = request.HttpContext.User.FindFirstValue("sub");
    var clerkEmail = request.HttpContext.User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(clerkSubject)
        ? (await GetClerkProfileAsync(request, clerkSubject))?.Email
        : null;
    var usesClerkSession = !string.IsNullOrWhiteSpace(clerkSubject) &&
        string.Equals(clerkEmail, email, StringComparison.OrdinalIgnoreCase);
    var existingUser = await db.Users
        .Include(user => user.Professional)
        .FirstOrDefaultAsync(user => user.Email == email);

    User user;

    if (existingUser is null)
    {
        if (!usesClerkSession && !IsLegacyAuthEnabled(request))
        {
            return Results.Unauthorized();
        }

        var password = usesClerkSession ? PasswordHasher.CreateToken() : acceptRequest.Password?.Trim() ?? string.Empty;

        if (!usesClerkSession && password.Length < 8)
        {
            return Results.BadRequest(new { errors = new[] { "Define una contrasena de al menos 8 caracteres para crear tu cuenta." } });
        }

        var fullName = string.IsNullOrWhiteSpace(acceptRequest.FullName) ? invitation.FullName.Trim() : acceptRequest.FullName.Trim();
        var existingUserIds = await db.Users.Select(item => item.Id).ToListAsync();
        var (hash, salt) = PasswordHasher.HashPassword(password);

        user = new User
        {
            Id = CreateUniqueId($"usr-{TextHelpers.Slugify(fullName)}", existingUserIds),
            ClerkUserId = usesClerkSession ? clerkSubject : null,
            Email = email,
            Phone = "Por definir",
            FullName = fullName,
            PrimaryRole = targetRole,
            Status = "active",
            PasswordHash = hash,
            PasswordSalt = salt,
            EmailVerifiedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Users.Add(user);
        db.UserRoles.Add(new UserRole
        {
            Id = $"role-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            UserId = user.Id,
            Role = targetRole,
            ScopeType = "clinic",
            ScopeId = invitation.ClinicId,
            CreatedAt = now,
            UpdatedAt = now
        });
    }
    else
    {
        var actor = await GetUserFromRequestAsync(request, db);

        if (actor is null || !string.Equals(actor.Id, existingUser.Id, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Conflict(new { errors = new[] { "Ya existe una cuenta con este correo. Inicia sesión con esa cuenta para aceptar la invitación." } });
        }

        user = existingUser;

        var hasClinicRole = await db.UserRoles.AnyAsync(role =>
            role.UserId == user.Id && role.Role == targetRole && role.ScopeType == "clinic" && role.ScopeId == invitation.ClinicId);

        if (!hasClinicRole)
        {
            db.UserRoles.Add(new UserRole
            {
                Id = $"role-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
                UserId = user.Id,
                Role = targetRole,
                ScopeType = "clinic",
                ScopeId = invitation.ClinicId,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }

    Professional? professional = user.Professional;

    if (targetRole == "professional" && professional is null)
    {
        var existingProfessionalIds = await db.Professionals.Select(item => item.Id).ToListAsync();
        professional = new Professional
        {
            Id = CreateUniqueId($"pro-{TextHelpers.Slugify(user.FullName)}", existingProfessionalIds),
            UserId = user.Id,
            DisplayName = user.FullName,
            Specialty = string.IsNullOrWhiteSpace(invitation.Specialty) ? "other" : invitation.Specialty,
            LicenseNumber = string.IsNullOrWhiteSpace(invitation.LicenseNumber) ? "Por definir" : invitation.LicenseNumber,
            Bio = "Perfil creado desde una invitacion de clinica. Completa tu biografia desde el portal profesional.",
            ProfilePhotoUrl = string.Empty,
            Location = string.Empty,
            Timezone = "America/Mexico_City",
            AppointmentMode = "hybrid",
            BasePrice = 0,
            Status = "onboarding",
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Professionals.Add(professional);
    }

    var membership = await db.ClinicMemberships
        .FirstOrDefaultAsync(item => item.ClinicId == invitation.ClinicId && item.UserId == user.Id);

    if (membership is null)
    {
        db.ClinicMemberships.Add(new ClinicMembership
        {
            Id = $"cm-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            ClinicId = invitation.ClinicId,
            UserId = user.Id,
            ProfessionalId = professional?.Id,
            Role = targetRole,
            Status = "active",
            JoinedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        });
    }
    else
    {
        membership.Role = targetRole;
        membership.ProfessionalId = professional?.Id ?? membership.ProfessionalId;
        membership.Status = "active";
        membership.UpdatedAt = now;
    }

    invitation.Status = "accepted";
    invitation.AcceptedUserId = user.Id;
    invitation.AcceptedAt = now;
    invitation.UpdatedAt = now;

    db.Notifications.Add(new Notification
    {
        Id = $"notif-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        UserId = invitation.InvitedByUserId,
        Type = "clinic_invitation",
        Title = "Invitación aceptada",
        Body = $"{user.FullName} aceptó la invitación y se unió a la clínica.",
        Priority = "normal",
        Status = "unread",
        CreatedAt = now,
        UpdatedAt = now
    });

    user.LastLoginAt = now;
    user.UpdatedAt = now;
    var sessionToken = string.Empty;
    var expiresAt = now;

    if (!usesClerkSession)
    {
        sessionToken = PasswordHasher.CreateToken();
        expiresAt = now.AddHours(SessionHours);
        await DisableExpiredSessionsAsync(db, now);
        await EnforceSessionLimitAsync(db, user.Id, MaxActiveSessionsPerUser - 1);
        db.UserSessions.Add(new UserSession
        {
            Id = $"sess-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            UserId = user.Id,
            TokenHash = PasswordHasher.HashToken(sessionToken),
            Status = "active",
            ExpiresAt = expiresAt,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    AddAuditLog(db, request, user, "clinic_invitation.accept", "clinic", invitation.ClinicId, null, professional?.Id);
    await db.SaveChangesAsync();
    await EnsureNotificationPreferencesAsync(db, user.Id);

    var savedUser = await db.Users
        .AsNoTracking()
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstAsync(item => item.Id == user.Id);

    return Results.Ok(new AuthResponseDto(sessionToken, expiresAt, savedUser.ToCurrentUserDto()));
});

clinicInvitationsApi.MapPatch("/{id}/revoke", async (HttpRequest request, string id, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var invitation = await db.ClinicInvitations.FirstOrDefaultAsync(item => item.Id == id);

    if (invitation is null)
    {
        return Results.NotFound();
    }

    if (!await CanManageClinicAsync(actor, invitation.ClinicId, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (invitation.Status != "pending")
    {
        return Results.Conflict(new { errors = new[] { "Solo se pueden revocar invitaciones pendientes." } });
    }

    invitation.Status = "revoked";
    invitation.UpdatedAt = DateTimeOffset.UtcNow;
    AddAuditLog(db, request, actor, "clinic_invitation.revoke", "clinic", invitation.ClinicId, null, actor.Professional?.Id);
    await db.SaveChangesAsync();

    return Results.Ok(invitation.ToDto());
});

clinicInvitationsApi.MapPost("/{id}/remind", async (HttpRequest request, string id, EmailSender emailSender, IConfiguration configuration, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var invitation = await db.ClinicInvitations
        .Include(item => item.Clinic)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (invitation is null)
    {
        return Results.NotFound();
    }

    if (!await CanManageClinicAsync(actor, invitation.ClinicId, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (invitation.Status != "pending")
    {
        return Results.Conflict(new { errors = new[] { "Solo se pueden reenviar invitaciones pendientes." } });
    }

    if (invitation.ExpiresAt <= DateTimeOffset.UtcNow)
    {
        return Results.Conflict(new { errors = new[] { "La invitación expiró. Crea una nueva para volver a invitar." } });
    }

    var outcome = await SendInvitationEmailAsync(emailSender, configuration, db, request, actor, invitation, invitation.Clinic?.Name ?? "la clinica");
    db.Notifications.Add(new Notification
    {
        Id = $"notif-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        UserId = actor.Id,
        Type = "clinic_invitation",
        Title = "Recordatorio enviado",
        Body = $"Se reenvió la invitación a {invitation.FullName} ({outcome}).",
        Priority = "normal",
        Status = "unread",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    });
    await db.SaveChangesAsync();

    return Results.Ok(invitation.ToDto());
});

var notificationsApi = app.MapGroup("/api/notifications");

notificationsApi.MapGet("/", async (HttpRequest request, string? status, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var notifications = db.Notifications
        .AsNoTracking()
        .Where(notification => notification.UserId == actor.Id);

    if (!string.IsNullOrWhiteSpace(status))
    {
        notifications = notifications.Where(notification => notification.Status == status.Trim());
    }

    var notificationList = await notifications
        .OrderByDescending(notification => notification.CreatedAt)
        .Take(50)
        .ToListAsync();
    var result = notificationList.Select(notification => notification.ToDto()).ToList();

    return Results.Ok(result);
});

notificationsApi.MapPatch("/{id}/read", async (HttpRequest request, string id, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var notification = await db.Notifications.FirstOrDefaultAsync(item => item.Id == id && item.UserId == actor.Id);

    if (notification is null)
    {
        return Results.NotFound();
    }

    notification.Status = "read";
    notification.ReadAt = DateTimeOffset.UtcNow;
    notification.UpdatedAt = DateTimeOffset.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(notification.ToDto());
});

var notificationPreferencesApi = app.MapGroup("/api/notification-preferences");

notificationPreferencesApi.MapGet("/", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    await EnsureNotificationPreferencesAsync(db, actor.Id);

    var preferences = await db.NotificationPreferences
        .AsNoTracking()
        .Where(preference => preference.UserId == actor.Id)
        .OrderBy(preference => preference.Channel)
        .ToListAsync();

    return Results.Ok(preferences.Select(preference => preference.ToDto()).ToList());
});

notificationPreferencesApi.MapPatch("/{channel}", async (HttpRequest request, string channel, UpdateNotificationPreferenceRequest preferenceRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var normalizedChannel = NormalizeNotificationChannel(channel);

    if (normalizedChannel is null)
    {
        return Results.BadRequest(new { errors = new[] { "Canal invalido. Usa app, email o whatsapp." } });
    }

    await EnsureNotificationPreferencesAsync(db, actor.Id);

    var preference = await db.NotificationPreferences.FirstAsync(item => item.UserId == actor.Id && item.Channel == normalizedChannel);
    preference.Enabled = preferenceRequest.Enabled;
    preference.AppointmentUpdates = preferenceRequest.AppointmentUpdates;
    preference.ClinicUpdates = preferenceRequest.ClinicUpdates;
    preference.ReminderUpdates = preferenceRequest.ReminderUpdates;
    preference.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, request, actor, "notification_preferences.update", "notification_preference", normalizedChannel, actor.Patient?.Id, actor.Professional?.Id);
    await db.SaveChangesAsync();

    return Results.Ok(preference.ToDto());
});

var consentApi = app.MapGroup("/api/me/consent");

consentApi.MapGet("/", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var status = await BuildConsentStatusAsync(db, actor);
    return Results.Ok(status);
});

consentApi.MapPost("/", async (HttpRequest request, RecordConsentRequest consentRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var requestedTypes = (consentRequest.Accepted ?? [])
        .Select(type => (type ?? string.Empty).Trim().ToLowerInvariant())
        .Where(ConsentDocuments.IsKnown)
        .Distinct()
        .ToList();

    if (requestedTypes.Count == 0)
    {
        return Results.BadRequest(new { errors = new[] { "Debes aceptar al menos un documento valido." } });
    }

    var now = DateTimeOffset.UtcNow;
    var ip = request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var rawUserAgent = request.Headers.UserAgent.ToString();
    var userAgent = string.IsNullOrEmpty(rawUserAgent) ? "unknown" : rawUserAgent;

    foreach (var consentType in requestedTypes)
    {
        var version = ConsentDocuments.VersionFor(consentType);
        var alreadyRecorded = await db.UserConsents.AnyAsync(consent =>
            consent.UserId == actor.Id && consent.ConsentType == consentType && consent.DocumentVersion == version);

        if (alreadyRecorded)
        {
            continue;
        }

        db.UserConsents.Add(new UserConsent
        {
            Id = $"consent-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            UserId = actor.Id,
            ConsentType = consentType,
            DocumentVersion = version,
            AcceptedAt = now,
            IpAddress = ip,
            UserAgent = userAgent,
            CreatedAt = now,
            UpdatedAt = now
        });

        AddAuditLog(db, request, actor, "user_consent.accepted", "user_consent", $"{consentType}@{version}", actor.Patient?.Id, actor.Professional?.Id);
    }

    await db.SaveChangesAsync();

    var status = await BuildConsentStatusAsync(db, actor);
    return Results.Ok(status);
});

var auditApi = app.MapGroup("/api/audit-logs");

auditApi.MapGet("/", async (HttpRequest request, string? patientId, string? resourceType, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var logs = db.AuditLogs.AsNoTracking().AsQueryable();

    if (actor.PrimaryRole == "patient")
    {
        if (actor.Patient is null)
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        logs = logs.Where(log => log.PatientId == actor.Patient.Id);
    }
    else if (actor.PrimaryRole == "professional")
    {
        if (actor.Professional is null)
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        logs = logs.Where(log => log.ProfessionalId == actor.Professional.Id);
    }
    else if (actor.PrimaryRole == "clinic_admin")
    {
        var clinicIds = await db.ClinicMemberships
            .AsNoTracking()
            .Where(membership => membership.UserId == actor.Id && membership.Status == "active" && membership.Role == "clinic_admin")
            .Select(membership => membership.ClinicId)
            .ToListAsync();
        var professionalIds = await db.ClinicMemberships
            .AsNoTracking()
            .Where(membership => clinicIds.Contains(membership.ClinicId) && membership.ProfessionalId != null && membership.Status == "active")
            .Select(membership => membership.ProfessionalId!)
            .Distinct()
            .ToListAsync();
        var patientIds = await db.ProfessionalPatients
            .AsNoTracking()
            .Where(relation => professionalIds.Contains(relation.ProfessionalId) && relation.Status == "active")
            .Select(relation => relation.PatientId)
            .Distinct()
            .ToListAsync();

        logs = logs.Where(log =>
            (log.ProfessionalId != null && professionalIds.Contains(log.ProfessionalId)) ||
            (log.PatientId != null && patientIds.Contains(log.PatientId)));
    }
    else if (actor.PrimaryRole != "internal_admin")
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (!string.IsNullOrWhiteSpace(patientId))
    {
        logs = logs.Where(log => log.PatientId == patientId.Trim());
    }

    if (!string.IsNullOrWhiteSpace(resourceType))
    {
        logs = logs.Where(log => log.ResourceType == resourceType.Trim());
    }

    var result = await logs
        .OrderByDescending(log => log.CreatedAt)
        .Take(100)
        .Select(log => new AuditLogDto(
            log.Id,
            log.ActorUserId,
            log.ActorRole,
            log.Action,
            log.ResourceType,
            log.ResourceId,
            log.PatientId,
            log.ProfessionalId,
            log.Outcome,
            log.CreatedAt))
        .ToListAsync();

    AddAuditLog(db, request, actor, "audit_logs.read", "audit_log", "list", actor.Patient?.Id, actor.Professional?.Id);
    await db.SaveChangesAsync();

    return Results.Ok(result);
});

var reviewsApi = app.MapGroup("/api/reviews");

// Moderacion administrativa: las resenas nunca se eliminan fisicamente ni se editan;
// solo se ocultan (hidden) o restauran (published) dejando rastro de auditoria.
reviewsApi.MapPatch("/{id}/moderate", async (HttpRequest request, string id, ModerateReviewRequest moderateRequest, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole != "internal_admin")
    {
        AddAuditLog(db, request, actor, "review.moderate.denied", "review", id, null, null, "denied");
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

    AddAuditLog(db, request, actor, $"review.moderate.{status}", "review", review.Id, review.PatientId, review.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Ok(review.ToDto());
});

var soapNotesApi = app.MapGroup("/api/soap-notes");

soapNotesApi.MapGet("/", async (HttpRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var query = db.SoapNotes.AsNoTracking().Where(item => item.Status != "deleted");

    if (actor.PrimaryRole is "professional" or "patient" or "clinic_admin")
    {
        var accessiblePatientIds = await GetAccessiblePatientIdsAsync(actor, db);

        if (accessiblePatientIds is not null)
        {
            query = query.Where(item => accessiblePatientIds.Contains(item.PatientId));
        }
    }
    else if (actor.PrimaryRole != "internal_admin")
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var notes = await query
        .OrderByDescending(item => item.Date)
        .Select(item => item.ToDto())
        .ToListAsync();

    // NOM-024: toda consulta al expediente queda en bitacora.
    AddAuditLog(db, request, actor, "soap_notes.read", "soap_note", "list", actor.Patient?.Id, actor.Professional?.Id);
    await db.SaveChangesAsync();

    return Results.Ok(notes);
});

soapNotesApi.MapPost("/", async (HttpRequest httpRequest, CreateSoapNoteRequest request, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(httpRequest, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    if (actor.PrimaryRole is not ("professional" or "internal_admin"))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var errors = RequestValidation.ValidateSoapNote(request);

    if (errors.Count > 0)
    {
        return Results.BadRequest(new { errors });
    }

    if (actor.PrimaryRole == "professional" && !await CanAccessPatientAsync(actor, request.PatientId, db))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var patient = await db.Patients.FirstOrDefaultAsync(item => item.Id == request.PatientId);

    if (patient is null)
    {
        return Results.BadRequest(new { errors = new[] { "patientId no existe." } });
    }

    if (!string.IsNullOrWhiteSpace(request.AppointmentId))
    {
        var appointmentExists = await db.Appointments.AnyAsync(item => item.Id == request.AppointmentId && item.PatientId == patient.Id);

        if (!appointmentExists)
        {
            return Results.BadRequest(new { errors = new[] { "appointmentId no existe para el paciente." } });
        }
    }

    var status = request.Status == "finalized" ? "finalized" : "draft";
    var note = new SoapNote
    {
        Id = $"soap-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
        PatientId = patient.Id,
        ProfessionalId = actor.Professional?.Id,
        PatientName = patient.FullName,
        AppointmentId = string.IsNullOrWhiteSpace(request.AppointmentId) ? null : request.AppointmentId,
        Date = request.Date.Trim(),
        Title = request.Title.Trim(),
        Status = status,
        StatusLabel = status == "finalized" ? "Finalizada" : "Borrador",
        Subjective = request.Subjective.Trim(),
        Objective = request.Objective.Trim(),
        Assessment = request.Assessment.Trim(),
        Plan = request.Plan.Trim(),
        AiGenerated = request.AiGenerated
    };

    patient.LastSession = note.Date;
    patient.Progress = note.Assessment;
    patient.UpdatedAt = DateTimeOffset.UtcNow;

    db.SoapNotes.Add(note);
    AddAuditLog(db, httpRequest, actor, "soap_note.create", "soap_note", note.Id, patient.Id, note.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.Created($"/api/soap-notes/{note.Id}", note.ToDto());
});

// El expediente clinico nunca se elimina fisicamente (NOM-004): solo soft delete con
// rastro de auditoria. El registro permanece en base de datos para conservacion legal.
// TODO auditoria de modificacion y descarga: agregar cuando existan los endpoints de
// edicion de notas y exportacion/descarga de expediente.
soapNotesApi.MapDelete("/{id}", async (HttpRequest request, string id, HealthHubDbContext db) =>
{
    var actor = await GetUserFromRequestAsync(request, db);

    if (actor is null)
    {
        return Results.Unauthorized();
    }

    var note = await db.SoapNotes.FirstOrDefaultAsync(item => item.Id == id);

    if (note is null || note.Status == "deleted")
    {
        return Results.NotFound();
    }

    var isAuthor = actor.PrimaryRole == "professional" && actor.Professional?.Id == note.ProfessionalId;

    if (!isAuthor && actor.PrimaryRole != "internal_admin")
    {
        AddAuditLog(db, request, actor, "soap_note.delete.denied", "soap_note", note.Id, note.PatientId, note.ProfessionalId, "denied");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    note.Status = "deleted";
    note.StatusLabel = "Eliminada";
    note.UpdatedAt = DateTimeOffset.UtcNow;

    AddAuditLog(db, request, actor, "soap_note.delete", "soap_note", note.Id, note.PatientId, note.ProfessionalId);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

// TODO Pagos (Fase A1, pasarela candidata Mercado Pago = [PASARELA_PAGOS] sin confirmar):
// - El checkout debe mostrar referencias a los Terminos y Condiciones (seccion 14: pagos,
//   suscripciones, comisiones, reembolsos, contracargos) antes de confirmar el cobro.
// - Definir [POLITICA_CANCELACION], [POLITICA_REEMBOLSO], [POLITICA_NO_SHOW] y
//   [COMISION_PLATAFORMA] en docs/legal antes de habilitar cobros reales.
// TODO IA futura (NO implementar todavia): Consentimiento IA (tipo nuevo en ConsentDocuments),
// transcripcion (Whisper), integracion OpenAI y SOAP asistido con revision profesional obligatoria.

// GET /api/prescriptions?patientId={id}
app.MapGet("/api/prescriptions", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var actor = await GetUserFromRequestAsync(request, db);
    if (actor is null) return Results.Unauthorized();

    // FIX 6 (opción B): el propio paciente puede leer sus recetas activas.
    if (actor is { PrimaryRole: "patient", Patient: not null })
    {
        var ownPrescriptions = await db.Prescriptions
            .AsNoTracking()
            .Include(p => p.Patient)
            .Where(p => p.PatientId == actor.Patient.Id && p.Status == "active")
            .OrderByDescending(p => p.IssuedAt)
            .Take(100)
            .ToListAsync();
        return Results.Ok(ownPrescriptions.Select(p => ToPrescriptionDto(p)));
    }

    var (pro, error) = await GetAuthorizedProfessional(request, db, "doctor");
    if (error is not null) return error;

    var query = db.Prescriptions
        .AsNoTracking()
        .Include(p => p.Patient)
        .Where(p => p.ProfessionalId == pro!.Id);

    if (!string.IsNullOrEmpty(patientId))
        query = query.Where(p => p.PatientId == patientId);

    var items = await query.OrderByDescending(p => p.IssuedAt).Take(100).ToListAsync();
    return Results.Ok(items.Select(p => ToPrescriptionDto(p)));
});

// POST /api/prescriptions
// AUDIT #5: Solo médicos (specialty=="doctor") pueden emitir recetas.
// Psicólogos y nutriólogos verificados tienen acceso a GetAuthorizedProfessional pero NO a este endpoint.
// Medicamentos controlados (grupos I-IV COFEPRIS) están FUERA DE ALCANCE; requieren Receta Especial con folio oficial.
app.MapPost("/api/prescriptions", async (HttpRequest request, HealthHubDbContext db, CreatePrescriptionRequest req) =>
{
    // GetAuthorizedProfessional con requiredSpecialty="doctor" ya verifica verified+doctor; 403 para otros roles.
    var (pro, error) = await GetAuthorizedProfessional(request, db, "doctor");
    if (error is not null) return error;

    if (string.IsNullOrWhiteSpace(req.Route))
        return Results.BadRequest(new { errors = new[] { "La vía de administración (route) es obligatoria." } });

    var patientRelation = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!patientRelation)
        return Results.NotFound(new { errors = new[] { "Paciente no encontrado o no asociado a tu cuenta." } });

    DateTimeOffset? expiresAt = null;
    if (!string.IsNullOrEmpty(req.ExpiresAt))
    {
        if (!DateTimeOffset.TryParse(req.ExpiresAt, out var parsed))
            return Results.BadRequest(new { errors = new[] { "Fecha de vencimiento inválida." } });
        expiresAt = parsed.ToUniversalTime();
    }

    // Cargar datos del paciente para estamparlos en la receta
    var patient = await db.Patients.FindAsync(req.PatientId);

    var prescription = new Prescription
    {
        Id = Guid.NewGuid().ToString(),
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        AppointmentId = req.AppointmentId,
        // Estampar datos del prescriptor (cédula profesional + nombre completo) en el momento de emisión
        PrescriberName = pro.DisplayName,
        PrescriberLicense = pro.LicenseNumber,
        // Estampar datos del paciente para que el PDF sea autocontenido
        PatientFullName = patient?.FullName ?? string.Empty,
        PatientIdentifier = req.PatientIdentifier?.Trim(),
        Route = req.Route.Trim(),
        MedicationName = req.MedicationName.Trim(),
        Dosage = req.Dosage.Trim(),
        Frequency = req.Frequency.Trim(),
        Duration = req.Duration.Trim(),
        Instructions = req.Instructions.Trim(),
        Refills = req.Refills,
        ExpiresAt = expiresAt,
    };

    db.Prescriptions.Add(prescription);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/prescriptions/{prescription.Id}",
        ToPrescriptionDto(prescription, patient?.FullName));
});

// GET /api/prescriptions/{id}/pdf
// Genera un PDF imprimible con todos los elementos legales de una receta médica.
// Accesible por el médico que la emitió o por el propio paciente.
// NOTA: Medicamentos controlados (grupos I-IV COFEPRIS) están FUERA DE ALCANCE;
//       requieren Receta Especial con folio oficial SSA/COFEPRIS (sistema SIFAR).
app.MapGet("/api/prescriptions/{id}/pdf", async (HttpRequest request, HealthHubDbContext db, string id) =>
{
    var actor = await GetUserFromRequestAsync(request, db);
    if (actor is null) return Results.Unauthorized();

    var prescription = await db.Prescriptions
        .AsNoTracking()
        .Include(p => p.Patient)
        .Include(p => p.Professional)
        .FirstOrDefaultAsync(p => p.Id == id);

    if (prescription is null) return Results.NotFound();

    // El médico que emitió la receta o el paciente dueño pueden descargarla
    var isOwnerDoctor = actor.Professional?.Id == prescription.ProfessionalId;
    var isOwnerPatient = actor.Patient?.Id == prescription.PatientId;
    if (!isOwnerDoctor && !isOwnerPatient)
        return Results.StatusCode(StatusCodes.Status403Forbidden);

    var pdfBytes = PrescriptionPdfGenerator.Generate(prescription);
    return Results.Bytes(pdfBytes, "application/pdf",
        $"receta-{prescription.Id[..8]}.pdf",
        enableRangeProcessing: false);
});

app.MapGet("/api/patient-tasks", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var actor = await GetUserFromRequestAsync(request, db);
    if (actor is null) return Results.Unauthorized();

    // FIX 6 (opción B): el propio paciente puede leer sus tareas.
    if (actor is { PrimaryRole: "patient", Patient: not null })
    {
        var ownTasks = await db.PatientTasks
            .AsNoTracking()
            .Include(t => t.Patient)
            .Where(t => t.PatientId == actor.Patient.Id)
            .OrderByDescending(t => t.CreatedAt)
            .Take(100)
            .ToListAsync();
        return Results.Ok(ownTasks.Select(t => ToPatientTaskDto(t, t.Patient?.FullName)).ToList());
    }

    var (pro, err) = await GetAuthorizedProfessional(request, db, "psychologist");
    if (err is not null) return err;

    var query = db.PatientTasks
        .AsNoTracking()
        .Include(t => t.Patient)
        .Where(t => t.ProfessionalId == pro!.Id);

    if (!string.IsNullOrWhiteSpace(patientId))
        query = query.Where(t => t.PatientId == patientId);

    var tasks = await query
        .OrderByDescending(t => t.CreatedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(tasks.Select(t => ToPatientTaskDto(t, t.Patient?.FullName)).ToList());
});

app.MapPost("/api/patient-tasks", async (HttpRequest request, HealthHubDbContext db, CreatePatientTaskRequest req) =>
{
    var (pro, err) = await GetAuthorizedProfessional(request, db, "psychologist");
    if (err is not null) return err;

    var owned = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!owned) return Results.StatusCode(StatusCodes.Status403Forbidden);

    DateTimeOffset? dueDate = null;
    if (!string.IsNullOrWhiteSpace(req.DueDate))
    {
        if (!DateTimeOffset.TryParse(req.DueDate, out var parsed))
            return Results.BadRequest(new { errors = new[] { "Fecha de vencimiento inválida." } });
        dueDate = parsed.ToUniversalTime();
    }

    var patient = await db.Patients.FindAsync(req.PatientId);
    if (patient is null) return Results.NotFound();

    var task = new PatientTask
    {
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        AppointmentId = req.AppointmentId,
        Title = req.Title,
        Description = req.Description,
        DueDate = dueDate,
    };

    db.PatientTasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/patient-tasks/{task.Id}", ToPatientTaskDto(task, patient.FullName));
});

app.MapPatch("/api/patient-tasks/{id}/status", async (HttpRequest request, HealthHubDbContext db, string id, UpdatePatientTaskStatusRequest req) =>
{
    var allowed = new[] { "pending", "completed", "skipped" };
    if (!allowed.Contains(req.Status))
        return Results.BadRequest(new { errors = new[] { $"Estado inválido. Usa: {string.Join(", ", allowed)}" } });

    var actor = await GetUserFromRequestAsync(request, db);
    if (actor is null) return Results.Unauthorized();

    PatientTask? task;

    // FIX 6 (opción B): el propio paciente puede actualizar el estado de sus tareas.
    if (actor is { PrimaryRole: "patient", Patient: not null })
    {
        task = await db.PatientTasks
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.Id == id && t.PatientId == actor.Patient.Id);
    }
    else
    {
        var (pro, err) = await GetAuthorizedProfessional(request, db, "psychologist");
        if (err is not null) return err;
        task = await db.PatientTasks
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.Id == id && t.ProfessionalId == pro!.Id);
    }

    if (task is null) return Results.NotFound();

    task.Status = req.Status;
    task.UpdatedAt = DateTimeOffset.UtcNow;
    task.PatientNotes = req.PatientNotes ?? task.PatientNotes;

    if (req.Status == "completed" && task.CompletedAt is null)
        task.CompletedAt = DateTimeOffset.UtcNow;
    else if (req.Status != "completed")
        task.CompletedAt = null;

    await db.SaveChangesAsync();
    return Results.Ok(ToPatientTaskDto(task, task.Patient?.FullName));
});

app.MapGet("/api/patient-diets", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var actor = await GetUserFromRequestAsync(request, db);
    if (actor is null) return Results.Unauthorized();

    // FIX 6 (opción B): el propio paciente puede leer sus dietas activas.
    if (actor is { PrimaryRole: "patient", Patient: not null })
    {
        var ownDiets = await db.PatientDiets
            .AsNoTracking()
            .Include(d => d.Patient)
            .Where(d => d.PatientId == actor.Patient.Id && d.Status == "active")
            .OrderByDescending(d => d.CreatedAt)
            .Take(100)
            .ToListAsync();
        return Results.Ok(ownDiets.Select(d => ToPatientDietDto(d, d.Patient?.FullName)).ToList());
    }

    var (pro, err) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (err is not null) return err;

    var query = db.PatientDiets
        .AsNoTracking()
        .Include(d => d.Patient)
        .Where(d => d.ProfessionalId == pro!.Id);

    if (!string.IsNullOrWhiteSpace(patientId))
        query = query.Where(d => d.PatientId == patientId);

    var diets = await query
        .OrderByDescending(d => d.CreatedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(diets.Select(d => ToPatientDietDto(d, d.Patient?.FullName)).ToList());
});

app.MapPost("/api/patient-diets", async (HttpRequest request, HealthHubDbContext db, CreatePatientDietRequest req) =>
{
    var (pro, err) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (err is not null) return err;

    var owned = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!owned) return Results.StatusCode(StatusCodes.Status403Forbidden);

    var patient = await db.Patients.FindAsync(req.PatientId);
    if (patient is null) return Results.NotFound();

    if (!DateTimeOffset.TryParse(req.ValidFrom, out var validFrom))
        return Results.BadRequest(new { errors = new[] { "Fecha de inicio inválida." } });

    DateTimeOffset? validUntil = null;
    if (!string.IsNullOrWhiteSpace(req.ValidUntil))
    {
        if (!DateTimeOffset.TryParse(req.ValidUntil, out var parsed))
            return Results.BadRequest(new { errors = new[] { "Fecha de fin inválida." } });
        validUntil = parsed.ToUniversalTime();
    }

    var diet = new PatientDiet
    {
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        Title = req.Title,
        Content = req.Content,
        ValidFrom = validFrom.ToUniversalTime(),
        ValidUntil = validUntil,
    };

    db.PatientDiets.Add(diet);
    await db.SaveChangesAsync();

    return Results.Created($"/api/patient-diets/{diet.Id}", ToPatientDietDto(diet, patient.FullName));
});

app.MapGet("/api/body-measurements", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var (pro, err) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (err is not null) return err;

    var query = db.BodyMeasurements
        .AsNoTracking()
        .Include(m => m.Patient)
        .Where(m => m.ProfessionalId == pro!.Id);

    if (!string.IsNullOrWhiteSpace(patientId))
        query = query.Where(m => m.PatientId == patientId);

    var measurements = await query
        .OrderByDescending(m => m.MeasuredAt)
        .Take(50)
        .ToListAsync();

    return Results.Ok(measurements.Select(m => ToBodyMeasurementDto(m, m.Patient?.FullName)).ToList());
});

app.MapPost("/api/body-measurements", async (HttpRequest request, HealthHubDbContext db, CreateBodyMeasurementRequest req) =>
{
    var (pro, err) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (err is not null) return err;

    var owned = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!owned) return Results.StatusCode(StatusCodes.Status403Forbidden);

    var patient = await db.Patients.FindAsync(req.PatientId);
    if (patient is null) return Results.NotFound();

    if (!DateTimeOffset.TryParse(req.MeasuredAt, out var measuredAt))
        return Results.BadRequest(new { errors = new[] { "Fecha de medición inválida." } });

    var measurement = new BodyMeasurement
    {
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        MeasuredAt = measuredAt.ToUniversalTime(),
        WeightKg = req.WeightKg,
        HeightCm = req.HeightCm,
        WaistCm = req.WaistCm,
        HipCm = req.HipCm,
        ArmCm = req.ArmCm,
        BodyFatPercentage = req.BodyFatPercentage,
        MuscleMassKg = req.MuscleMassKg,
        Notes = req.Notes,
    };

    db.BodyMeasurements.Add(measurement);
    await db.SaveChangesAsync();

    return Results.Created($"/api/body-measurements/{measurement.Id}", ToBodyMeasurementDto(measurement, patient.FullName));
});

app.Run();

static async Task<(Professional? pro, IResult? error)> GetAuthorizedProfessional(
    HttpRequest request, HealthHubDbContext db, string? requiredSpecialty = null)
{
    var user = await GetUserFromRequestAsync(request, db);

    if (user is null) return (null, Results.Unauthorized());
    if (user.Professional is null) return (null, Results.StatusCode(StatusCodes.Status403Forbidden));

    if (requiredSpecialty is not null && user.Professional.Specialty != requiredSpecialty)
        return (null, Results.StatusCode(StatusCodes.Status403Forbidden));

    return (user.Professional, null);
}

static PrescriptionDto ToPrescriptionDto(Prescription p, string? patientName = null) => new(
    p.Id, p.PatientId, patientName ?? p.Patient?.FullName ?? "",
    p.MedicationName, p.Dosage, p.Frequency, p.Duration,
    p.Instructions, p.Refills, p.Status,
    p.IssuedAt.ToString("yyyy-MM-dd"),
    p.ExpiresAt?.ToString("yyyy-MM-dd"),
    p.PrescriberName, p.PrescriberLicense,
    p.PatientFullName, p.PatientIdentifier, p.Route);

static PatientTaskDto ToPatientTaskDto(PatientTask t, string? patientName = null) => new(
    t.Id, t.PatientId, patientName ?? t.Patient?.FullName ?? "",
    t.AppointmentId, t.Title, t.Description,
    t.DueDate?.ToString("yyyy-MM-dd"), t.Status,
    t.CompletedAt?.ToString("o"), t.PatientNotes,
    t.CreatedAt.ToString("o"));

static PatientDietDto ToPatientDietDto(PatientDiet d, string? patientName = null) => new(
    d.Id, d.PatientId, patientName ?? d.Patient?.FullName ?? "",
    d.Title, d.Content,
    d.ValidFrom.ToString("yyyy-MM-dd"), d.ValidUntil?.ToString("yyyy-MM-dd"),
    d.Status, d.CreatedAt.ToString("o"));

static BodyMeasurementDto ToBodyMeasurementDto(BodyMeasurement m, string? patientName = null) => new(
    m.Id, m.PatientId, patientName ?? m.Patient?.FullName ?? "",
    m.MeasuredAt.ToString("o"),
    m.WeightKg, m.HeightCm, m.WaistCm, m.HipCm, m.ArmCm,
    m.BodyFatPercentage, m.MuscleMassKg, m.Notes,
    m.CreatedAt.ToString("o"));

static async Task<User?> GetUserFromRequestAsync(HttpRequest request, HealthHubDbContext db)
{
    var clerkSubject = request.HttpContext.User.FindFirstValue("sub");

    if (request.HttpContext.User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(clerkSubject))
    {
        var clerkUser = await db.Users
            .Include(item => item.Patient)
            .Include(item => item.Professional)
            .FirstOrDefaultAsync(item => item.ClerkUserId == clerkSubject);

        if (clerkUser is not null)
        {
            return clerkUser;
        }

        var clerkProfile = await GetClerkProfileAsync(request, clerkSubject);
        var clerkEmail = clerkProfile?.Email;

        if (!string.IsNullOrWhiteSpace(clerkEmail))
        {
            var normalizedEmail = clerkEmail.Trim().ToLowerInvariant();
            return await ProvisionClerkUserAsync(db, clerkSubject, normalizedEmail, clerkProfile);
        }
    }

    if (IsDevAuthEnabled(request))
    {
        var devUserId = request.Headers["X-HealthHub-Dev-User"].ToString().Trim();

        if (!string.IsNullOrWhiteSpace(devUserId))
        {
            return await db.Users
                .AsNoTracking()
                .Include(item => item.Patient)
                .Include(item => item.Professional)
                .FirstOrDefaultAsync(item => item.Id == devUserId);
        }
    }

    if (!IsLegacyAuthEnabled(request))
    {
        return null;
    }

    var token = GetBearerToken(request);

    if (token is null)
    {
        return null;
    }

    var tokenHash = PasswordHasher.HashToken(token);
    var now = DateTimeOffset.UtcNow;
    var session = await db.UserSessions
        .AsNoTracking()
        .Include(item => item.User!)
        .ThenInclude(user => user.Patient)
        .Include(item => item.User!)
        .ThenInclude(user => user.Professional)
        .FirstOrDefaultAsync(item =>
            item.TokenHash == tokenHash &&
            item.Status == "active" &&
            item.ExpiresAt > now);

    return session?.User;
}

static async Task<ClerkProfile?> GetClerkProfileAsync(HttpRequest request, string clerkUserId)
{
    var configuration = request.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
    var secretKey = configuration["Clerk:SecretKey"] ?? configuration["CLERK_SECRET_KEY"];

    if (string.IsNullOrWhiteSpace(secretKey))
    {
        return null;
    }

    var clientFactory = request.HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>();
    var client = clientFactory.CreateClient("Clerk");
    using var clerkRequest = new HttpRequestMessage(HttpMethod.Get, $"users/{Uri.EscapeDataString(clerkUserId)}");
    clerkRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", secretKey);
    using var response = await client.SendAsync(clerkRequest);

    if (!response.IsSuccessStatusCode)
    {
        return null;
    }

    await using var stream = await response.Content.ReadAsStreamAsync();
    using var payload = await JsonDocument.ParseAsync(stream);
    var root = payload.RootElement;

    var email = ExtractClerkEmail(root);
    var role = ExtractClerkRole(root);
    var fullName = ExtractClerkFullName(root);

    return new ClerkProfile(email, role, fullName);
}

static string? ExtractClerkEmail(JsonElement root)
{
    var primaryEmailId = root.TryGetProperty("primary_email_address_id", out var primaryIdElement)
        ? primaryIdElement.GetString()
        : null;

    if (!root.TryGetProperty("email_addresses", out var addresses) || addresses.ValueKind != JsonValueKind.Array)
    {
        return null;
    }

    string? fallbackEmail = null;

    foreach (var address in addresses.EnumerateArray())
    {
        var id = address.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
        var email = address.TryGetProperty("email_address", out var emailElement) ? emailElement.GetString() : null;
        var isVerified = address.TryGetProperty("verification", out var verification) &&
            verification.ValueKind == JsonValueKind.Object &&
            verification.TryGetProperty("status", out var verificationStatus) &&
            string.Equals(verificationStatus.GetString(), "verified", StringComparison.OrdinalIgnoreCase);

        if (!isVerified)
        {
            continue;
        }

        fallbackEmail ??= email;

        if (!string.IsNullOrWhiteSpace(primaryEmailId) && id == primaryEmailId)
        {
            return email?.Trim().ToLowerInvariant();
        }
    }

    return fallbackEmail?.Trim().ToLowerInvariant();
}

static string? ExtractClerkRole(JsonElement root)
{
    if (!root.TryGetProperty("unsafe_metadata", out var metadata) || metadata.ValueKind != JsonValueKind.Object)
    {
        return null;
    }

    if (!metadata.TryGetProperty("role", out var roleElement) || roleElement.ValueKind != JsonValueKind.String)
    {
        return null;
    }

    var role = roleElement.GetString()?.Trim().ToLowerInvariant();

    return role is "patient" or "professional" ? role : null;
}

static string? ExtractClerkFullName(JsonElement root)
{
    var firstName = root.TryGetProperty("first_name", out var firstElement) ? firstElement.GetString() : null;
    var lastName = root.TryGetProperty("last_name", out var lastElement) ? lastElement.GetString() : null;
    var fullName = string.Join(" ", new[] { firstName, lastName }.Where(part => !string.IsNullOrWhiteSpace(part))).Trim();

    return string.IsNullOrWhiteSpace(fullName) ? null : fullName;
}

static async Task<User> ProvisionClerkUserAsync(HealthHubDbContext db, string clerkSubject, string normalizedEmail, ClerkProfile? profile)
{
    var now = DateTimeOffset.UtcNow;
    var role = profile?.Role is "patient" or "professional" ? profile.Role! : "patient";
    var fullName = string.IsNullOrWhiteSpace(profile?.FullName) ? normalizedEmail : profile!.FullName!;
    var existingUserIds = await db.Users.Select(item => item.Id).ToListAsync();
    var (hash, salt) = PasswordHasher.HashPassword(PasswordHasher.CreateToken());
    var userId = CreateUniqueId($"usr-{TextHelpers.Slugify(fullName)}", existingUserIds);

    var user = new User
    {
        Id = userId,
        ClerkUserId = clerkSubject,
        Email = normalizedEmail,
        Phone = "Por definir",
        FullName = fullName,
        PrimaryRole = role,
        Status = "active",
        PasswordHash = hash,
        PasswordSalt = salt,
        EmailVerifiedAt = now,
        LastLoginAt = now,
        CreatedAt = now,
        UpdatedAt = now
    };

    db.Users.Add(user);
    db.UserRoles.Add(new UserRole
    {
        Id = $"role-{now.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        UserId = user.Id,
        Role = role,
        ScopeType = "global",
        ScopeId = null,
        CreatedAt = now,
        UpdatedAt = now
    });
    await EnsureProvisionedProfileAsync(db, user, role, now);
    await EnsureNotificationPreferencesAsync(db, user.Id);

    await db.SaveChangesAsync();

    return await db.Users
        .Include(item => item.Patient)
        .Include(item => item.Professional)
        .FirstAsync(item => item.Id == user.Id);
}

static async Task EnsureProvisionedProfileAsync(HealthHubDbContext db, User user, string role, DateTimeOffset now)
{
    if (role == "patient")
    {
        var existingPatientIds = await db.Patients.Select(item => item.Id).ToListAsync();
        db.Patients.Add(new Patient
        {
            Id = CreateUniqueId($"pat-{TextHelpers.Slugify(user.FullName)}", existingPatientIds),
            UserId = user.Id,
            FullName = user.FullName,
            Initials = TextHelpers.InitialsFromName(user.FullName),
            Status = "active",
            StatusLabel = "Activo",
            Age = 0,
            Email = user.Email,
            Phone = user.Phone,
            Focus = "Por definir",
            MainReason = "Registro inicial desde HealthHub.",
            RiskLevel = "Por evaluar",
            NextAppointment = "Sin cita",
            LastSession = "Sin historial",
            Progress = "Perfil de paciente creado automaticamente desde Clerk.",
            Professional = "Por asignar",
            CreatedAt = now,
            UpdatedAt = now
        });
        return;
    }

    if (role == "professional")
    {
        var existingProfessionalIds = await db.Professionals.Select(item => item.Id).ToListAsync();
        db.Professionals.Add(new Professional
        {
            Id = CreateUniqueId($"pro-{TextHelpers.Slugify(user.FullName)}", existingProfessionalIds),
            UserId = user.Id,
            DisplayName = user.FullName,
            Specialty = "other",
            LicenseNumber = "Por verificar",
            Bio = "Perfil creado desde registro publico. Completa tu biografia desde el portal profesional.",
            ProfilePhotoUrl = string.Empty,
            Location = string.Empty,
            Timezone = "America/Mexico_City",
            AppointmentMode = "hybrid",
            BasePrice = 0,
            Status = "onboarding",
            CreatedAt = now,
            UpdatedAt = now
        });
    }
}

static bool IsDevAuthEnabled(HttpRequest request)
{
    var environment = request.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
    var configuration = request.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
    var remoteAddress = request.HttpContext.Connection.RemoteIpAddress;

    return environment.IsDevelopment() &&
        configuration.GetValue<bool>("Authentication:EnableDevAuth") &&
        (remoteAddress is null || IPAddress.IsLoopback(remoteAddress));
}

static bool IsLegacyAuthEnabled(HttpRequest request)
{
    var configuration = request.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
    return IsDevAuthEnabled(request) && configuration.GetValue<bool>("Authentication:EnableLegacyAuth");
}

/// <summary>
/// Modo piloto controlado: activo cuando CLINIXA_PILOT_MODE=true.
/// Expuesto en /health como "pilotMode". Sigue el patrón de IsDevAuthEnabled —
/// env var → IConfiguration → bool. Sin lógica de cohort ni tablas adicionales (YAGNI).
/// </summary>
static bool IsPilotEnabled(IConfiguration configuration)
{
    return configuration.GetValue<bool>("CLINIXA_PILOT_MODE")
        || string.Equals(
            Environment.GetEnvironmentVariable("CLINIXA_PILOT_MODE"),
            "true",
            StringComparison.OrdinalIgnoreCase);
}

static string GetRateLimitPartitionKey(HttpContext context)
{
    var subject = context.User.FindFirstValue("sub");

    if (!string.IsNullOrWhiteSpace(subject))
    {
        return $"clerk:{subject}";
    }

    var devUserId = context.Request.Headers["X-HealthHub-Dev-User"].ToString().Trim();

    if (!string.IsNullOrWhiteSpace(devUserId))
    {
        return $"dev:{devUserId}";
    }

    return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
}

static bool IsPublicApiRequest(HttpRequest request)
{
    if (request.Path.StartsWithSegments("/api/auth") ||
        request.Path.StartsWithSegments("/api/demo-sessions"))
    {
        return true;
    }

    // Webhook de Mercado Pago: publico por diseno (server-to-server); la seguridad
    // la da la validacion de firma x-signature dentro del endpoint.
    if (request.Path.StartsWithSegments("/api/webhooks/mercadopago"))
    {
        return true;
    }

    // Callback OAuth del marketplace: el navegador del profesional aterriza aqui tras autorizar
    // en Mercado Pago, sin headers de sesion. La proteccion es el state firmado (HMAC) que se valida
    // dentro del handler. Solo el POST de /callback es publico; connect/status siguen exigiendo sesion.
    if (HttpMethods.IsPost(request.Method) &&
        request.Path.StartsWithSegments("/api/professional-marketplace/callback"))
    {
        return true;
    }

    if (HttpMethods.IsGet(request.Method) && request.Path.StartsWithSegments("/api/professionals"))
    {
        return true;
    }

    if (request.Path.StartsWithSegments("/api/clinic-invitations"))
    {
        return HttpMethods.IsGet(request.Method) ||
            (HttpMethods.IsPost(request.Method) && request.Path.Value?.EndsWith("/accept", StringComparison.OrdinalIgnoreCase) == true);
    }

    return false;
}

static async Task DisableBearerSessionAsync(HttpRequest request, HealthHubDbContext db)
{
    var token = GetBearerToken(request);

    if (token is null)
    {
        return;
    }

    var tokenHash = PasswordHasher.HashToken(token);
    var session = await db.UserSessions.FirstOrDefaultAsync(item => item.TokenHash == tokenHash && item.Status == "active");

    if (session is null)
    {
        return;
    }

    session.Status = "disabled";
    session.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();
}

static bool CanCreateAppointment(User actor, string patientId, string? professionalId)
{
    if (actor.PrimaryRole == "patient")
    {
        return actor.Patient?.Id == patientId;
    }

    if (actor.PrimaryRole == "professional")
    {
        return string.IsNullOrWhiteSpace(professionalId) || actor.Professional?.Id == professionalId;
    }

    return actor.PrimaryRole is "clinic_admin" or "internal_admin";
}

static bool CanManageAppointment(User actor, Appointment appointment)
{
    if (actor.PrimaryRole == "patient")
    {
        return actor.Patient?.Id == appointment.PatientId;
    }

    if (actor.PrimaryRole == "professional")
    {
        return actor.Professional?.Id == appointment.ProfessionalId;
    }

    return actor.PrimaryRole is "clinic_admin" or "internal_admin";
}

static bool CanUpdateAppointmentStatus(User actor, Appointment appointment)
{
    if (actor.PrimaryRole == "professional")
    {
        return actor.Professional?.Id == appointment.ProfessionalId;
    }

    return actor.PrimaryRole is "clinic_admin" or "internal_admin";
}

static async Task<bool> CanManageProfessionalConfigAsync(User actor, string professionalId, HealthHubDbContext db)
{
    if (actor.PrimaryRole == "professional" && actor.Professional?.Id == professionalId)
    {
        return true;
    }

    if (actor.PrimaryRole == "internal_admin")
    {
        return true;
    }

    if (actor.PrimaryRole != "clinic_admin")
    {
        return false;
    }

    var clinicIds = await db.ClinicMemberships
        .AsNoTracking()
        .Where(membership => membership.UserId == actor.Id && membership.Role == "clinic_admin" && membership.Status == "active")
        .Select(membership => membership.ClinicId)
        .ToListAsync();

    return await db.ClinicMemberships
        .AsNoTracking()
        .AnyAsync(membership =>
            clinicIds.Contains(membership.ClinicId) &&
            membership.ProfessionalId == professionalId &&
            membership.Status == "active");
}

static async Task<bool> CanManageMarketplaceAsync(User actor, Professional professional, HealthHubDbContext db)
{
    if (actor.PrimaryRole == "internal_admin")
    {
        return true;
    }

    if (actor.PrimaryRole != "clinic_admin")
    {
        return false;
    }

    var clinicIds = await db.ClinicMemberships
        .AsNoTracking()
        .Where(m => m.UserId == actor.Id && m.Role == "clinic_admin" && m.Status == "active")
        .Select(m => m.ClinicId)
        .ToListAsync();

    if (clinicIds.Count == 0)
    {
        return false;
    }

    return await db.ClinicMemberships
        .AsNoTracking()
        .AnyAsync(m =>
            clinicIds.Contains(m.ClinicId) &&
            m.ProfessionalId == professional.Id &&
            m.Status == "active");
}

static async Task<bool> CanManageClinicAsync(User actor, string clinicId, HealthHubDbContext db)
{
    if (actor.PrimaryRole == "internal_admin")
    {
        return true;
    }

    if (actor.PrimaryRole != "clinic_admin")
    {
        return false;
    }

    return await db.ClinicMemberships
        .AsNoTracking()
        .AnyAsync(membership =>
            membership.ClinicId == clinicId &&
            membership.UserId == actor.Id &&
            membership.Role == "clinic_admin" &&
            membership.Status == "active");
}

static List<string> ValidateCreateProfessionalService(CreateProfessionalServiceRequest request) =>
    ValidateProfessionalServiceFields(request.Name, request.Description, request.DurationMinutes, request.Price, request.Mode);

static List<string> ValidateUpdateProfessionalService(UpdateProfessionalServiceRequest request) =>
    ValidateProfessionalServiceFields(request.Name, request.Description, request.DurationMinutes, request.Price, request.Mode);

static List<string> ValidateProfessionalServiceFields(string name, string description, int durationMinutes, decimal price, string mode)
{
    var errors = new List<string>();

    if (string.IsNullOrWhiteSpace(name))
    {
        errors.Add("El nombre del servicio es obligatorio.");
    }

    if (string.IsNullOrWhiteSpace(description))
    {
        errors.Add("La descripcion del servicio es obligatoria.");
    }

    if (durationMinutes is < 15 or > 240)
    {
        errors.Add("La duracion debe estar entre 15 y 240 minutos.");
    }

    if (price < 0)
    {
        errors.Add("El precio no puede ser negativo.");
    }

    if (NormalizeServiceMode(mode) is not ("online" or "in_person" or "hybrid"))
    {
        errors.Add("La modalidad debe ser online, in_person o hybrid.");
    }

    return errors;
}

static List<string> ValidateProfessionalAvailability(int weekday, string startsAt, string endsAt)
{
    var errors = new List<string>();

    if (weekday is < 1 or > 7)
    {
        errors.Add("El día debe estar entre 1 y 7.");
    }

    if (!TimeOnly.TryParseExact(startsAt, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start))
    {
        errors.Add("La hora de inicio debe usar formato HH:mm.");
    }

    if (!TimeOnly.TryParseExact(endsAt, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end))
    {
        errors.Add("La hora de fin debe usar formato HH:mm.");
    }

    if (errors.Count == 0 && start >= end)
    {
        errors.Add("La hora de inicio debe ser anterior a la hora de fin.");
    }

    return errors;
}

static List<string> ValidateClinicInvitation(CreateClinicInvitationRequest request)
{
    var errors = new List<string>();

    if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
    {
        errors.Add("Email invalido.");
    }

    if (string.IsNullOrWhiteSpace(request.FullName))
    {
        errors.Add("El nombre completo es obligatorio.");
    }

    if (NormalizeClinicRole(request.Role) is not ("professional" or "clinic_admin"))
    {
        errors.Add("Rol invalido. Usa professional o clinic_admin.");
    }

    return errors;
}

static string NormalizeServiceMode(string mode)
{
    var normalized = mode.Trim();
    return normalized is "online" or "in_person" or "hybrid" ? normalized : "hybrid";
}

static string NormalizeSpecialty(string specialty)
{
    var normalized = specialty.Trim().ToLowerInvariant();
    return normalized is "doctor" or "psychologist" or "physiotherapist" or "nutritionist" ? normalized : "other";
}

static List<string> ValidateProfessionalProfile(UpdateProfessionalProfileRequest request)
{
    var errors = new List<string>();

    if (string.IsNullOrWhiteSpace(request.DisplayName))
    {
        errors.Add("El nombre para mostrar es obligatorio.");
    }

    if (request.BasePrice < 0)
    {
        errors.Add("El precio base no puede ser negativo.");
    }

    return errors;
}

static ProfessionalOnboardingDto BuildOnboardingStatus(Professional professional)
{
    var profileComplete =
        !string.IsNullOrWhiteSpace(professional.Location) &&
        professional.Bio.Trim().Length >= 20 &&
        !professional.Bio.StartsWith("Perfil creado desde una invitacion", StringComparison.OrdinalIgnoreCase);
    var hasServices = professional.Services.Any(service => service.Status == "active");
    var hasAvailability = professional.Availability.Any(item => item.Status == "active");
    var isPublished = professional.Status == "active";
    var missing = new List<string>();

    if (!profileComplete)
    {
        missing.Add("Completa tu biografía (mínimo 20 caracteres) y tu ubicación.");
    }

    if (!hasServices)
    {
        missing.Add("Agrega al menos un servicio con precio y duracion.");
    }

    if (!hasAvailability)
    {
        missing.Add("Publica al menos un bloque de disponibilidad.");
    }

    if (professional.VerificationStatus != "verified")
    {
        missing.Add(professional.VerificationStatus == "rejected"
            ? "Tu cédula profesional fue rechazada. Actualízala para solicitar una nueva revisión."
            : "Tu cédula profesional está en revisión. No puedes publicar tu perfil hasta que sea verificada.");
    }

    return new ProfessionalOnboardingDto(
        professional.Id,
        professional.DisplayName,
        professional.Status,
        profileComplete,
        hasServices,
        hasAvailability,
        isPublished,
        missing.Count == 0,
        missing);
}

static string NormalizeClinicRole(string role)
{
    var normalized = role.Trim();
    return normalized is "clinic_admin" ? "clinic_admin" : "professional";
}

static string? NormalizeNotificationChannel(string channel)
{
    var normalized = channel.Trim().ToLowerInvariant();
    return normalized is "app" or "email" or "whatsapp" ? normalized : null;
}

static async Task EnsureNotificationPreferencesAsync(HealthHubDbContext db, string userId)
{
    foreach (var channel in new[] { "app", "email", "whatsapp" })
    {
        var exists = await db.NotificationPreferences.AnyAsync(preference => preference.UserId == userId && preference.Channel == channel);

        if (exists)
        {
            continue;
        }

        db.NotificationPreferences.Add(new NotificationPreference
        {
            Id = $"pref-{userId}-{channel}",
            UserId = userId,
            Channel = channel,
            Enabled = channel == "app",
            AppointmentUpdates = true,
            ClinicUpdates = true,
            ReminderUpdates = true
        });
    }

    await db.SaveChangesAsync();
}

static async Task<ConsentStatusDto> BuildConsentStatusAsync(HealthHubDbContext db, User user)
{
    var accepted = await db.UserConsents
        .AsNoTracking()
        .Where(consent => consent.UserId == user.Id)
        .ToListAsync();

    var documents = ConsentDocuments.RequiredFor(user.PrimaryRole)
        .Select(doc =>
        {
            var match = accepted
                .Where(consent => consent.ConsentType == doc.Type && consent.DocumentVersion == doc.Version)
                .OrderByDescending(consent => consent.AcceptedAt)
                .FirstOrDefault();

            return new ConsentDocumentDto(doc.Type, doc.Title, doc.Version, true, match is not null, match?.AcceptedAt);
        })
        .ToList();

    var completed = documents.All(doc => doc.Accepted);

    return new ConsentStatusDto(completed, ConsentDocuments.PrivacyVersion, ConsentDocuments.TermsVersion, documents);
}

static async Task<List<string>> GetClinicProfessionalIdsAsync(User actor, HealthHubDbContext db)
{
    var clinicIds = await db.ClinicMemberships
        .AsNoTracking()
        .Where(membership => membership.UserId == actor.Id && membership.Status == "active" && membership.Role == "clinic_admin")
        .Select(membership => membership.ClinicId)
        .ToListAsync();

    return await db.ClinicMemberships
        .AsNoTracking()
        .Where(membership => clinicIds.Contains(membership.ClinicId) && membership.ProfessionalId != null && membership.Status == "active")
        .Select(membership => membership.ProfessionalId!)
        .Distinct()
        .ToListAsync();
}

// Devuelve null cuando el actor puede ver todos los pacientes (internal_admin).
static async Task<List<string>?> GetAccessiblePatientIdsAsync(User actor, HealthHubDbContext db)
{
    if (actor.PrimaryRole == "internal_admin")
    {
        return null;
    }

    if (actor.PrimaryRole == "patient")
    {
        return actor.Patient is null ? new List<string>() : new List<string> { actor.Patient.Id };
    }

    if (actor.PrimaryRole == "professional")
    {
        if (actor.Professional is null)
        {
            return new List<string>();
        }

        var professionalId = actor.Professional.Id;
        return await db.ProfessionalPatients
            .AsNoTracking()
            .Where(relation => relation.ProfessionalId == professionalId && relation.Status == "active")
            .Select(relation => relation.PatientId)
            .Distinct()
            .ToListAsync();
    }

    if (actor.PrimaryRole == "clinic_admin")
    {
        var professionalIds = await GetClinicProfessionalIdsAsync(actor, db);

        return await db.ProfessionalPatients
            .AsNoTracking()
            .Where(relation => professionalIds.Contains(relation.ProfessionalId) && relation.Status == "active")
            .Select(relation => relation.PatientId)
            .Distinct()
            .ToListAsync();
    }

    return new List<string>();
}

static async Task<bool> CanAccessPatientAsync(User actor, string patientId, HealthHubDbContext db)
{
    var accessiblePatientIds = await GetAccessiblePatientIdsAsync(actor, db);
    return accessiblePatientIds is null || accessiblePatientIds.Contains(patientId.Trim());
}

// Resuelve el porcentaje de comision marketplace aplicable a un profesional segun su tier.
// Cuenta las citas completadas y elige el tier activo de mayor umbral alcanzado para su
// especialidad; si no hay, cae a los tiers "default"; si tampoco, usa 20% como respaldo duro.
// El calculo nunca debe fallar.
static async Task<decimal> ResolveCommissionPercentageAsync(HealthHubDbContext db, Professional professional)
{
    var completedAppointments = await db.Appointments
        .CountAsync(a => a.ProfessionalId == professional.Id && a.Status == "completed");

    var tier = await db.CommissionTiers
        .Where(t => t.Status == "active"
            && t.LicenseType == professional.Specialty
            && t.MinAppointmentsThreshold <= completedAppointments)
        .OrderByDescending(t => t.MinAppointmentsThreshold)
        .FirstOrDefaultAsync();

    tier ??= await db.CommissionTiers
        .Where(t => t.Status == "active"
            && t.LicenseType == "default"
            && t.MinAppointmentsThreshold <= completedAppointments)
        .OrderByDescending(t => t.MinAppointmentsThreshold)
        .FirstOrDefaultAsync();

    return tier?.CommissionPercentage ?? 20m;
}

// Ultimo Payment de una cita (por fecha de creacion); null cuando la cita no tiene pagos.
static async Task<Payment?> GetLatestPaymentAsync(HealthHubDbContext db, string appointmentId) =>
    await db.Payments
        .AsNoTracking()
        .Where(payment => payment.AppointmentId == appointmentId)
        .OrderByDescending(payment => payment.CreatedAt)
        .ThenByDescending(payment => payment.Id)
        .FirstOrDefaultAsync();

// Ultimo Payment por cita para listados: una sola consulta y agrupacion en memoria.
static async Task<Dictionary<string, Payment>> GetLatestPaymentsByAppointmentAsync(HealthHubDbContext db, IReadOnlyCollection<string> appointmentIds)
{
    if (appointmentIds.Count == 0)
    {
        return new Dictionary<string, Payment>();
    }

    var payments = await db.Payments
        .AsNoTracking()
        .Where(payment => appointmentIds.Contains(payment.AppointmentId))
        .ToListAsync();

    return payments
        .GroupBy(payment => payment.AppointmentId)
        .ToDictionary(
            group => group.Key,
            group => group
                .OrderByDescending(payment => payment.CreatedAt)
                .ThenByDescending(payment => payment.Id)
                .First());
}

// Trial del piloto: 14 dias desde la creacion de la cuenta del usuario, daysLeft nunca negativo.
static SubscriptionStatusDto BuildSubscriptionStatus(User user, Professional professional)
{
    var trialStartedAt = user.CreatedAt;
    var trialEndsAt = trialStartedAt.AddDays(SubscriptionPlans.TrialDays);
    var now = DateTimeOffset.UtcNow;
    var daysLeft = Math.Max(0, (int)Math.Ceiling((trialEndsAt - now).TotalDays));

    return new SubscriptionStatusDto(
        trialStartedAt,
        trialEndsAt,
        daysLeft,
        now < trialEndsAt ? "trial" : "expired",
        professional.SubscriptionInterestAt,
        SubscriptionPlans.All);
}

static void AddAuditLog(
    HealthHubDbContext db,
    HttpRequest request,
    User? actor,
    string action,
    string resourceType,
    string resourceId,
    string? patientId,
    string? professionalId,
    string outcome = "success")
{
    db.AuditLogs.Add(new AuditLog
    {
        Id = $"audit-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
        ActorUserId = actor?.Id,
        ActorRole = actor?.PrimaryRole ?? "anonymous",
        Action = action,
        ResourceType = resourceType,
        ResourceId = resourceId,
        PatientId = patientId,
        ProfessionalId = professionalId,
        Outcome = outcome,
        IpAddress = request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        UserAgent = request.Headers.UserAgent.ToString(),
        CreatedAt = DateTimeOffset.UtcNow
    });
}

static async Task<string> SendInvitationEmailAsync(
    EmailSender emailSender,
    IConfiguration configuration,
    HealthHubDbContext db,
    HttpRequest request,
    User actor,
    ClinicInvitation invitation,
    string clinicName)
{
    var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');
    var acceptUrl = $"{webBaseUrl}/aceptar-invitacion?token={invitation.Token}";
    var roleLabel = MappingExtensions.ClinicRoleLabel(invitation.Role);
    var subject = $"Invitacion para unirte a {clinicName} en Clinixa";
    var html = EmailSender.BuildInvitationEmail(clinicName, roleLabel, acceptUrl);
    var outcome = await emailSender.SendAsync(invitation.Email, subject, html);
    AddAuditLog(db, request, actor, $"clinic_invitation.email.{outcome}", "clinic", invitation.ClinicId, null, actor.Professional?.Id);
    return outcome;
}

// Envia el correo transaccional de una cita (confirmada / cancelada) en best-effort:
// carga el email del paciente de forma defensiva (prefiere Patient.Email, luego Patient.User.Email),
// arma la plantilla segun kind ("confirmed" | "cancelled") y nunca lanza hacia el request.
static async Task SendAppointmentEmailAsync(
    HealthHubDbContext db,
    EmailSender emailSender,
    Appointment appointment,
    string kind,
    ILogger? logger = null)
{
    try
    {
        var patientEmail = appointment.Patient?.Email;

        if (string.IsNullOrWhiteSpace(patientEmail))
        {
            patientEmail = appointment.Patient?.User?.Email;
        }

        if (string.IsNullOrWhiteSpace(patientEmail))
        {
            // La cita puede no traer el paciente cargado: busca el email directamente.
            patientEmail = await db.Patients
                .AsNoTracking()
                .Where(patient => patient.Id == appointment.PatientId)
                .Select(patient => string.IsNullOrWhiteSpace(patient.Email) ? (patient.User != null ? patient.User.Email : null) : patient.Email)
                .FirstOrDefaultAsync();
        }

        if (string.IsNullOrWhiteSpace(patientEmail))
        {
            return;
        }

        string subject;
        string html;

        switch (kind)
        {
            case "confirmed":
                subject = "Tu cita está confirmada";
                html = EmailSender.BuildAppointmentConfirmedEmail(
                    appointment.PatientName,
                    appointment.ProfessionalName,
                    appointment.Type,
                    appointment.Date,
                    appointment.Time,
                    appointment.Mode);
                break;
            case "cancelled":
                subject = "Tu cita fue cancelada";
                html = EmailSender.BuildAppointmentCancelledEmail(
                    appointment.PatientName,
                    appointment.ProfessionalName,
                    appointment.Type,
                    appointment.Date,
                    appointment.Time,
                    appointment.Mode,
                    appointment.CancellationReason);
                break;
            default:
                return;
        }

        await emailSender.SendAsync(patientEmail, subject, html);
    }
    catch (Exception exception)
    {
        logger?.LogWarning(exception, "No se pudo enviar el correo de cita {Kind} para {AppointmentId}", kind, appointment.Id);
    }
}

static void AddAppointmentNotifications(
    HealthHubDbContext db,
    Appointment appointment,
    string? patientUserId,
    string? professionalUserId,
    string type,
    string title,
    string body,
    string priority = "normal")
{
    var recipients = new[] { patientUserId, professionalUserId }
        .Where(userId => !string.IsNullOrWhiteSpace(userId))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    foreach (var recipient in recipients)
    {
        db.Notifications.Add(new Notification
        {
            Id = $"notif-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
            UserId = recipient!,
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            ProfessionalId = appointment.ProfessionalId,
            Type = type,
            Title = title,
            Body = body,
            Priority = priority,
            Status = "unread",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
    }
}

static string AppointmentStatusLabel(string status) =>
    status switch
    {
        "confirmed" => "Confirmada",
        "completed" => "Completada",
        "cancelled" => "Cancelada",
        "no_show" => "No asistio",
        _ => "Programada"
    };

static int ExtractDurationMinutes(string duration)
{
    var digits = new string(duration.TakeWhile(char.IsDigit).ToArray());
    return int.TryParse(digits, CultureInfo.InvariantCulture, out var minutes) && minutes > 0 ? minutes : 50;
}

static async Task DisableExpiredSessionsAsync(HealthHubDbContext db, DateTimeOffset now)
{
    var expiredSessions = await db.UserSessions
        .Where(item => item.Status == "active" && item.ExpiresAt <= now)
        .ToListAsync();

    foreach (var session in expiredSessions)
    {
        session.Status = "expired";
        session.UpdatedAt = now;
    }
}

static async Task EnforceSessionLimitAsync(HealthHubDbContext db, string userId, int allowedActiveSessions)
{
    var activeSessions = await db.UserSessions
        .Where(item => item.UserId == userId && item.Status == "active")
        .OrderByDescending(item => item.CreatedAt)
        .ToListAsync();

    foreach (var session in activeSessions.Skip(Math.Max(allowedActiveSessions, 0)))
    {
        session.Status = "replaced";
        session.UpdatedAt = DateTimeOffset.UtcNow;
    }
}

static string? GetBearerToken(HttpRequest request)
{
    var authorization = request.Headers.Authorization.ToString();

    if (string.IsNullOrWhiteSpace(authorization) || !authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return null;
    }

    var token = authorization["Bearer ".Length..].Trim();
    return string.IsNullOrWhiteSpace(token) ? null : token;
}

static string CreateUniqueId(string baseId, IEnumerable<string> existingIds)
{
    var existing = existingIds.ToHashSet(StringComparer.OrdinalIgnoreCase);
    var candidate = baseId;
    var index = 2;

    while (existing.Contains(candidate))
    {
        candidate = $"{baseId}-{index}";
        index += 1;
    }

    return candidate;
}

static string NormalizeAppointmentMode(string? requestedMode, string? serviceMode, string? professionalMode)
{
    var mode = string.IsNullOrWhiteSpace(requestedMode) ? serviceMode ?? professionalMode ?? "in_person" : requestedMode.Trim();

    if (mode == "hybrid")
    {
        return "online";
    }

    return mode is "online" or "in_person" ? mode : "in_person";
}

static List<AvailableSlotDto> BuildAvailableSlots(
    Professional professional,
    ProfessionalService service,
    IReadOnlyList<ProfessionalAvailability> availability,
    IReadOnlyList<Appointment> appointments,
    DateOnly startsOn,
    DateOnly endsOn)
{
    var slots = new List<AvailableSlotDto>();

    for (var date = startsOn; date <= endsOn; date = date.AddDays(1))
    {
        var weekday = ToHealthHubWeekday(date.DayOfWeek);
        var availabilityForDay = availability
            .Where(item => item.Weekday == weekday)
            .OrderBy(item => item.StartsAt)
            .ToList();

        foreach (var window in availabilityForDay)
        {
            if (!TimeOnly.TryParseExact(window.StartsAt, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var windowStart) ||
                !TimeOnly.TryParseExact(window.EndsAt, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var windowEnd))
            {
                continue;
            }

            for (var slotStart = windowStart; slotStart.AddMinutes(service.DurationMinutes) <= windowEnd; slotStart = slotStart.AddMinutes(30))
            {
                var slotTime = slotStart.ToString("HH:mm", CultureInfo.InvariantCulture);
                var slotDate = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                var (startsAt, endsAt) = BuildAppointmentRange(slotDate, slotTime, service.DurationMinutes, professional.Timezone);

                if (!startsAt.HasValue || !endsAt.HasValue)
                {
                    continue;
                }

                var overlaps = appointments.Any(item =>
                    item.StartsAt.HasValue &&
                    item.EndsAt.HasValue &&
                    item.StartsAt.Value < endsAt.Value &&
                    item.EndsAt.Value > startsAt.Value);

                if (overlaps)
                {
                    continue;
                }

                slots.Add(new AvailableSlotDto(
                    $"{professional.Id}-{service.Id}-{slotDate}-{slotTime}",
                    slotDate,
                    slotTime,
                    $"{WeekdayLabel(weekday)} {slotTime}",
                    startsAt.Value,
                    endsAt.Value));
            }
        }
    }

    return slots
        .GroupBy(item => item.Id)
        .Select(group => group.First())
        .OrderBy(item => item.Date)
        .ThenBy(item => item.Time)
        .Take(40)
        .ToList();
}

static async Task<bool> IsWithinProfessionalAvailabilityAsync(
    HealthHubDbContext db,
    string professionalId,
    string date,
    string time,
    int durationMinutes,
    string timezone)
{
    if (!DateOnly.TryParseExact(date.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate) ||
        !TimeOnly.TryParseExact(time.Trim(), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedTime))
    {
        return false;
    }

    var weekday = ToHealthHubWeekday(parsedDate.DayOfWeek);
    var requestedEnd = parsedTime.AddMinutes(durationMinutes);
    var availability = await db.ProfessionalAvailability
        .AsNoTracking()
        .Where(item => item.ProfessionalId == professionalId && item.Weekday == weekday && item.Status == "active")
        .ToListAsync();

    return availability.Any(item =>
        TimeOnly.TryParseExact(item.StartsAt, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var startsAt) &&
        TimeOnly.TryParseExact(item.EndsAt, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var endsAt) &&
        parsedTime >= startsAt &&
        requestedEnd <= endsAt &&
        BuildAppointmentRange(date, time, durationMinutes, timezone).StartsAt.HasValue);
}

static (DateTimeOffset? StartsAt, DateTimeOffset? EndsAt) BuildAppointmentRange(string date, string time, int? durationMinutes, string timezone = "America/Mexico_City")
{
    if (!DateOnly.TryParseExact(date.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
    {
        return (null, null);
    }

    if (!TimeOnly.TryParseExact(time.Trim(), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedTime))
    {
        return (null, null);
    }

    var localDateTime = DateTime.SpecifyKind(parsedDate.ToDateTime(parsedTime), DateTimeKind.Unspecified);
    var zone = ResolveTimezone(timezone);
    var utcStartsAt = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localDateTime, zone), TimeSpan.Zero);
    return (utcStartsAt, durationMinutes is null ? null : utcStartsAt.AddMinutes(durationMinutes.Value));
}

static TimeZoneInfo ResolveTimezone(string timezone)
{
    try
    {
        return TimeZoneInfo.FindSystemTimeZoneById(timezone);
    }
    catch (TimeZoneNotFoundException)
    {
        return TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City");
    }
    catch (InvalidTimeZoneException)
    {
        return TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City");
    }
}

static int ToHealthHubWeekday(DayOfWeek dayOfWeek) =>
    dayOfWeek == DayOfWeek.Sunday ? 7 : (int)dayOfWeek;

static string WeekdayLabel(int weekday) =>
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

internal sealed record ClerkProfile(string? Email, string? Role, string? FullName);

// Planes de suscripcion del piloto, alineados a modelo_de_negocio.md (Basico $399 / Pro $699).
// El cobro real de la suscripcion llega despues; por ahora el CTA registra interes auditado.
internal static class SubscriptionPlans
{
    public const int TrialDays = 14;

    public static readonly IReadOnlyList<SubscriptionPlanDto> All =
    [
        new SubscriptionPlanDto(
            "Básico",
            399m,
            "MXN",
            [
                "Agenda y citas en línea",
                "Perfil profesional público",
                "Gestión de pacientes",
                "Expediente clínico",
                "Cobros en línea con Mercado Pago",
                "Botón de WhatsApp en tu perfil y citas"
            ]),
        new SubscriptionPlanDto(
            "Pro",
            699m,
            "MXN",
            [
                "Todo lo del plan Básico",
                "WhatsApp Business API: recordatorios y confirmaciones automáticas",
                "Paquetes de sesiones",
                "Reportes de ingresos y citas"
            ])
    ];
}

internal static class ConsentDocuments
{
    // Las versiones deben coincidir con docs/legal/*.md. Un cambio de version obliga a
    // re-aceptar: user_consents conserva el historial completo, nunca se sobrescribe.
    public const string PrivacyVersion = "1.0";
    public const string TermsVersion = "1.0";
    public const string HealthDataVersion = "1.0";
    public const string ProfessionalDataVersion = "1.0";

    public const string PrivacyNotice = "privacy_notice";
    public const string TermsOfService = "terms_of_service";
    public const string HealthDataProcessing = "health_data_processing";
    public const string ProfessionalDataProcessing = "professional_data_processing";

    // TODO Consentimiento IA: agregar tipo "ai_processing" (transcripcion Whisper, OpenAI,
    // SOAP asistido) con consentimiento especifico antes de habilitar cualquier funcion de IA.

    public static readonly IReadOnlyList<(string Type, string Title, string Version)> All =
    [
        (PrivacyNotice, "Aviso de Privacidad Integral (LFPDPPP)", PrivacyVersion),
        (TermsOfService, "Terminos y Condiciones de Uso", TermsVersion),
        (HealthDataProcessing, "Consentimiento de tratamiento de datos sensibles de salud", HealthDataVersion),
        (ProfessionalDataProcessing, "Consentimiento de tratamiento de datos profesionales y de identificacion", ProfessionalDataVersion)
    ];

    public static IReadOnlyList<(string Type, string Title, string Version)> RequiredFor(string role) =>
        role switch
        {
            "patient" => All.Where(doc => doc.Type != ProfessionalDataProcessing).ToList(),
            "professional" => All.Where(doc => doc.Type != HealthDataProcessing).ToList(),
            _ => All.Where(doc => doc.Type is PrivacyNotice or TermsOfService).ToList()
        };

    public static bool IsKnown(string consentType) =>
        All.Any(doc => doc.Type == consentType);

    public static string VersionFor(string consentType) =>
        All.FirstOrDefault(doc => doc.Type == consentType).Version ?? PrivacyVersion;
}
