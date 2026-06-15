using HealthHub.Api.Entities;
using HealthHub.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HealthHub.Api.Data;

public static class DatabaseSeeder
{
    private const string DemoPassword = "healthhub123";

    public static async Task InitializeAsync(HealthHubDbContext db)
    {
        await db.Database.MigrateAsync();

        if (!await db.Patients.AnyAsync())
        {
            SeedClinicalDemo(db);
        }

        await SeedIdentityAndPortalDemoAsync(db);
        await SeedCommissionTiersAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task SeedCommissionTiersAsync(HealthHubDbContext db)
    {
        if (await db.CommissionTiers.AnyAsync())
        {
            return;
        }

        // Tier "default" es el respaldo obligatorio: aplica cuando la especialidad
        // del profesional no tiene tier propio. Los porcentajes son editables desde admin.
        db.CommissionTiers.AddRange(
            new CommissionTier { Id = "tier-default", LicenseType = "default", CommissionPercentage = 20.00m },
            new CommissionTier { Id = "tier-doctor", LicenseType = "doctor", CommissionPercentage = 15.00m },
            new CommissionTier { Id = "tier-psychologist", LicenseType = "psychologist", CommissionPercentage = 15.00m },
            new CommissionTier { Id = "tier-physiotherapist", LicenseType = "physiotherapist", CommissionPercentage = 12.00m },
            new CommissionTier { Id = "tier-nutritionist", LicenseType = "nutritionist", CommissionPercentage = 12.00m });
    }

    private static void SeedClinicalDemo(HealthHubDbContext db)
    {
        db.Patients.AddRange(
            new Patient
            {
                Id = "ana-martinez",
                UserId = "usr-ana-martinez",
                FullName = "Ana Martinez",
                Initials = "AM",
                Status = "active",
                StatusLabel = "Activo",
                Age = 34,
                Email = "ana.martinez@example.com",
                Phone = "+52 55 1030 4412",
                Focus = "Seguimiento nutricional",
                MainReason = "Control de habitos y adherencia al plan",
                RiskLevel = "Estable",
                NextAppointment = "Hoy 11:30",
                LastSession = "2026-05-30",
                Progress = "Mejor adherencia durante las ultimas 2 semanas.",
                Professional = "Dra. Laura Vega"
            },
            new Patient
            {
                Id = "carlos-ruiz",
                UserId = "usr-carlos-ruiz",
                FullName = "Carlos Ruiz",
                Initials = "CR",
                Status = "active",
                StatusLabel = "Activo",
                Age = 41,
                Email = "carlos.ruiz@example.com",
                Phone = "+52 55 7891 2104",
                Focus = "Plan de rehabilitacion",
                MainReason = "Dolor lumbar recurrente",
                RiskLevel = "Moderado",
                NextAppointment = "Manana 09:00",
                LastSession = "2026-06-01",
                Progress = "Dolor menor despues de ejercicios guiados.",
                Professional = "Dr. Miguel Torres"
            },
            new Patient
            {
                Id = "sofia-leon",
                UserId = "usr-sofia-leon",
                FullName = "Sofia Leon",
                Initials = "SL",
                Status = "pending",
                StatusLabel = "Pendiente",
                Age = 29,
                Email = "sofia.leon@example.com",
                Phone = "+52 33 1402 8821",
                Focus = "Primera consulta",
                MainReason = "Evaluacion inicial de ansiedad",
                RiskLevel = "Por evaluar",
                NextAppointment = "Viernes 16:00",
                LastSession = "Sin historial",
                Progress = "Paciente pendiente de primera valoracion.",
                Professional = "Psic. Nora Ibarra"
            });

        db.Appointments.AddRange(
            new Appointment
            {
                Id = "apt-001",
                PatientId = "ana-martinez",
                PatientName = "Ana Martinez",
                ProfessionalId = "pro-laura-vega",
                ProfessionalName = "Dra. Laura Vega",
                Date = "2026-06-06",
                Time = "11:30",
                StartsAt = DateTimeOffset.Parse("2026-06-06T11:30:00-06:00").ToUniversalTime(),
                EndsAt = DateTimeOffset.Parse("2026-06-06T12:20:00-06:00").ToUniversalTime(),
                Duration = "50 min",
                Type = "Seguimiento",
                Mode = "online",
                Status = "scheduled",
                StatusLabel = "Programada",
                Reason = "Revision de plan alimenticio",
                CreatedByUserId = "usr-ana-martinez"
            },
            new Appointment
            {
                Id = "apt-002",
                PatientId = "carlos-ruiz",
                PatientName = "Carlos Ruiz",
                ProfessionalId = "pro-miguel-torres",
                ProfessionalName = "Dr. Miguel Torres",
                Date = "2026-06-07",
                Time = "09:00",
                StartsAt = DateTimeOffset.Parse("2026-06-07T09:00:00-06:00").ToUniversalTime(),
                EndsAt = DateTimeOffset.Parse("2026-06-07T09:45:00-06:00").ToUniversalTime(),
                Duration = "45 min",
                Type = "Rehabilitacion",
                Mode = "in_person",
                Status = "scheduled",
                StatusLabel = "Programada",
                Reason = "Progresion de ejercicios",
                CreatedByUserId = "usr-carlos-ruiz"
            },
            new Appointment
            {
                Id = "apt-003",
                PatientId = "sofia-leon",
                PatientName = "Sofia Leon",
                ProfessionalId = "pro-nora-ibarra",
                ProfessionalName = "Psic. Nora Ibarra",
                Date = "2026-06-12",
                Time = "16:00",
                StartsAt = DateTimeOffset.Parse("2026-06-12T16:00:00-06:00").ToUniversalTime(),
                EndsAt = DateTimeOffset.Parse("2026-06-12T17:00:00-06:00").ToUniversalTime(),
                Duration = "60 min",
                Type = "Primera consulta",
                Mode = "online",
                Status = "scheduled",
                StatusLabel = "Programada",
                Reason = "Historia inicial",
                CreatedByUserId = "usr-sofia-leon"
            });

        db.SoapNotes.Add(new SoapNote
        {
            Id = "soap-001",
            PatientId = "ana-martinez",
            PatientName = "Ana Martinez",
            ProfessionalId = "pro-laura-vega",
            AppointmentId = "apt-001",
            PatientRecordId = "record-ana-nutrition",
            Date = "2026-05-30",
            Title = "Seguimiento nutricional",
            Status = "finalized",
            StatusLabel = "Finalizada",
            Subjective = "Refiere mejor energia y menor ansiedad por alimentos entre comidas.",
            Objective = "Peso estable, registro alimenticio completo 10 de 14 dias.",
            Assessment = "Buena adherencia general con areas de ajuste en cenas.",
            Plan = "Mantener desayuno actual, ajustar colaciones y revisar cena en 7 dias.",
            AiGenerated = true
        });
    }

    private static async Task SeedIdentityAndPortalDemoAsync(HealthHubDbContext db)
    {
        await SeedUsersAsync(db);
        await SeedProfessionalsAsync(db);
        await EnsureSeedSpecialtiesAsync(db);
        await SeedPortalRelationsAsync(db);
        await SeedClinicsAndMembershipsAsync(db);
        await SeedOperationalNotificationsAsync(db);
        await SeedNotificationPreferencesAsync(db);
        await LinkExistingClinicalDemoAsync(db);
    }

    private static async Task EnsureSeedSpecialtiesAsync(HealthHubDbContext db)
    {
        var specialties = new Dictionary<string, string>
        {
            ["pro-laura-vega"] = "nutritionist",
            ["pro-miguel-torres"] = "physiotherapist",
            ["pro-nora-ibarra"] = "psychologist",
            ["pro-andres-campos"] = "doctor"
        };

        foreach (var (id, specialty) in specialties)
        {
            var pro = await db.Professionals.FindAsync(id);
            if (pro is not null && pro.Specialty != specialty)
            {
                pro.Specialty = specialty;
            }
        }
    }

    private static async Task SeedUsersAsync(HealthHubDbContext db)
    {
        if (!await db.Users.AnyAsync())
        {
            db.Users.AddRange(
                CreateSeedUser(new User
                {
                    Id = "usr-ana-martinez",
                    Email = "ana.martinez@example.com",
                    Phone = "+52 55 1030 4412",
                    FullName = "Ana Martinez",
                    PrimaryRole = "patient",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddDays(-20),
                    LastLoginAt = DateTimeOffset.UtcNow.AddHours(-3)
                }),
                CreateSeedUser(new User
                {
                    Id = "usr-carlos-ruiz",
                    Email = "carlos.ruiz@example.com",
                    Phone = "+52 55 7891 2104",
                    FullName = "Carlos Ruiz",
                    PrimaryRole = "patient",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddDays(-12),
                    LastLoginAt = DateTimeOffset.UtcNow.AddDays(-1)
                }),
                CreateSeedUser(new User
                {
                    Id = "usr-sofia-leon",
                    Email = "sofia.leon@example.com",
                    Phone = "+52 33 1402 8821",
                    FullName = "Sofia Leon",
                    PrimaryRole = "patient",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddDays(-4),
                    LastLoginAt = DateTimeOffset.UtcNow.AddHours(-9)
                }),
                CreateSeedUser(new User
                {
                    Id = "usr-laura-vega",
                    Email = "laura.vega@healthhub.demo",
                    Phone = "+52 55 2900 1188",
                    FullName = "Dra. Laura Vega",
                    PrimaryRole = "professional",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddMonths(-5)
                }),
                CreateSeedUser(new User
                {
                    Id = "usr-miguel-torres",
                    Email = "miguel.torres@healthhub.demo",
                    Phone = "+52 55 3104 2090",
                    FullName = "Dr. Miguel Torres",
                    PrimaryRole = "professional",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddMonths(-4)
                }),
                CreateSeedUser(new User
                {
                    Id = "usr-nora-ibarra",
                    Email = "nora.ibarra@healthhub.demo",
                    Phone = "+52 33 1901 8877",
                    FullName = "Psic. Nora Ibarra",
                    PrimaryRole = "professional",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddMonths(-3)
                }),
                CreateSeedUser(new User
                {
                    Id = "usr-andres-campos",
                    Email = "andres.campos@healthhub.demo",
                    Phone = "+52 81 5551 2200",
                    FullName = "Dr. Andres Campos",
                    PrimaryRole = "professional",
                    Status = "active",
                    EmailVerifiedAt = DateTimeOffset.UtcNow.AddMonths(-2)
                }));
        }

        await AddUserIfMissingAsync(db, CreateSeedUser(new User
        {
            Id = "usr-clinic-admin",
            Email = "admin.clinica@healthhub.demo",
            Phone = "+52 55 4400 7700",
            FullName = "Admin Clinica Bienestar",
            PrimaryRole = "clinic_admin",
            Status = "active",
            EmailVerifiedAt = DateTimeOffset.UtcNow.AddMonths(-6),
            LastLoginAt = DateTimeOffset.UtcNow.AddDays(-2)
        }));

        await AddUserIfMissingAsync(db, CreateSeedUser(new User
        {
            Id = "usr-master",
            Email = "master@healthhub.demo",
            Phone = "+52 55 0000 0001",
            FullName = "Administrador Maestro",
            PrimaryRole = "internal_admin",
            Status = "active",
            EmailVerifiedAt = DateTimeOffset.UtcNow.AddMonths(-6),
            LastLoginAt = DateTimeOffset.UtcNow.AddDays(-1)
        }));

        var usersWithoutPassword = await db.Users
            .Where(user => user.PasswordHash == string.Empty || user.PasswordSalt == string.Empty)
            .ToListAsync();

        foreach (var user in usersWithoutPassword)
        {
            ApplyDemoPassword(user);
            user.UpdatedAt = DateTimeOffset.UtcNow;
        }

        if (!await db.UserRoles.AnyAsync())
        {
            db.UserRoles.AddRange(
                CreateUserRole("usr-ana-martinez", "patient"),
                CreateUserRole("usr-carlos-ruiz", "patient"),
                CreateUserRole("usr-sofia-leon", "patient"),
                CreateUserRole("usr-laura-vega", "professional", "professional_profile", "pro-laura-vega"),
                CreateUserRole("usr-miguel-torres", "professional", "professional_profile", "pro-miguel-torres"),
                CreateUserRole("usr-nora-ibarra", "professional", "professional_profile", "pro-nora-ibarra"),
                CreateUserRole("usr-andres-campos", "professional", "professional_profile", "pro-andres-campos"));
        }

        await AddUserRoleIfMissingAsync(db, CreateUserRole("usr-clinic-admin", "clinic_admin", "clinic", "clinic-bienestar-integral"));
        await AddUserRoleIfMissingAsync(db, CreateUserRole("usr-master", "internal_admin"));
        await AddUserRoleIfMissingAsync(db, CreateUserRole("usr-laura-vega", "clinic_admin", "clinic", "clinic-bienestar-integral"));
        await AddUserRoleIfMissingAsync(db, CreateUserRole("usr-miguel-torres", "professional", "clinic", "clinic-bienestar-integral"));
        await AddUserRoleIfMissingAsync(db, CreateUserRole("usr-nora-ibarra", "professional", "clinic", "clinic-bienestar-integral"));
        await AddUserRoleIfMissingAsync(db, CreateUserRole("usr-andres-campos", "professional", "clinic", "clinic-bienestar-integral"));
    }

    private static async Task SeedProfessionalsAsync(HealthHubDbContext db)
    {
        if (!await db.Professionals.AnyAsync())
        {
            db.Professionals.AddRange(
                new Professional
                {
                    Id = "pro-laura-vega",
                    UserId = "usr-laura-vega",
                    DisplayName = "Dra. Laura Vega",
                    Specialty = "nutritionist",
                    LicenseNumber = "NUT-49201",
                    VerificationStatus = "verified",
                    LicenseVerifiedAt = DateTimeOffset.UtcNow,
                    LicenseVerifiedBy = "seed",
                    WhatsappNumber = "+525511112222",
                    Bio = "Nutriologa clinica enfocada en cambios sostenibles, salud metabolica y acompanamiento continuo.",
                    Location = "Roma Norte, CDMX",
                    AppointmentMode = "hybrid",
                    BasePrice = 950,
                    Status = "active"
                },
                new Professional
                {
                    Id = "pro-miguel-torres",
                    UserId = "usr-miguel-torres",
                    DisplayName = "Dr. Miguel Torres",
                    Specialty = "physiotherapist",
                    LicenseNumber = "FIS-11872",
                    VerificationStatus = "verified",
                    LicenseVerifiedAt = DateTimeOffset.UtcNow,
                    LicenseVerifiedBy = "seed",
                    WhatsappNumber = "+525533334444",
                    Bio = "Fisioterapeuta deportivo con foco en dolor lumbar, movilidad y regreso progresivo a actividad.",
                    Location = "Del Valle, CDMX",
                    AppointmentMode = "in_person",
                    BasePrice = 780,
                    Status = "active"
                },
                new Professional
                {
                    Id = "pro-nora-ibarra",
                    UserId = "usr-nora-ibarra",
                    DisplayName = "Psic. Nora Ibarra",
                    Specialty = "psychologist",
                    LicenseNumber = "PSI-73044",
                    VerificationStatus = "verified",
                    LicenseVerifiedAt = DateTimeOffset.UtcNow,
                    LicenseVerifiedBy = "seed",
                    WhatsappNumber = "+523355556666",
                    Bio = "Psicologa cognitivo conductual para ansiedad, manejo de estres y procesos de cambio.",
                    Location = "Zapopan, Jalisco",
                    AppointmentMode = "online",
                    BasePrice = 850,
                    Status = "active"
                },
                new Professional
                {
                    Id = "pro-andres-campos",
                    UserId = "usr-andres-campos",
                    DisplayName = "Dr. Andres Campos",
                    Specialty = "doctor",
                    LicenseNumber = "MED-88412",
                    VerificationStatus = "verified",
                    LicenseVerifiedAt = DateTimeOffset.UtcNow,
                    LicenseVerifiedBy = "seed",
                    WhatsappNumber = "+528177778888",
                    Bio = "Medico general con enfoque preventivo, control metabolico y coordinacion con especialistas.",
                    Location = "San Pedro, Nuevo Leon",
                    AppointmentMode = "hybrid",
                    BasePrice = 900,
                    Status = "active"
                });
        }

        if (!await db.ProfessionalServices.AnyAsync())
        {
            db.ProfessionalServices.AddRange(
                CreateService("svc-laura-inicial", "pro-laura-vega", "Consulta nutricional inicial", "Evaluacion completa, objetivos y primer plan de accion.", 60, 950, "online"),
                CreateService("svc-laura-seguimiento", "pro-laura-vega", "Seguimiento nutricional", "Ajuste de plan y revision de adherencia.", 50, 700, "hybrid"),
                CreateService("svc-miguel-valoracion", "pro-miguel-torres", "Valoracion fisioterapeutica", "Revision de movilidad, dolor y plan de ejercicios.", 45, 780, "in_person"),
                CreateService("svc-nora-terapia", "pro-nora-ibarra", "Sesion de terapia individual", "Sesion online para ansiedad, estres o acompanamiento emocional.", 60, 850, "online"),
                CreateService("svc-andres-consulta", "pro-andres-campos", "Consulta medica general", "Revision preventiva y seguimiento de indicadores de salud.", 45, 900, "hybrid"));
        }

        if (!await db.ProfessionalAvailability.AnyAsync())
        {
            db.ProfessionalAvailability.AddRange(
                CreateAvailability("av-laura-1", "pro-laura-vega", 1, "09:00", "13:00"),
                CreateAvailability("av-laura-2", "pro-laura-vega", 3, "16:00", "20:00"),
                CreateAvailability("av-miguel-1", "pro-miguel-torres", 2, "08:00", "12:00"),
                CreateAvailability("av-miguel-2", "pro-miguel-torres", 4, "15:00", "19:00"),
                CreateAvailability("av-nora-1", "pro-nora-ibarra", 1, "10:00", "14:00"),
                CreateAvailability("av-nora-2", "pro-nora-ibarra", 5, "15:00", "18:00"),
                CreateAvailability("av-andres-1", "pro-andres-campos", 2, "09:30", "13:30"),
                CreateAvailability("av-andres-2", "pro-andres-campos", 6, "09:00", "12:00"));
        }
    }

    private static async Task SeedPortalRelationsAsync(HealthHubDbContext db)
    {
        if (!await db.ProfessionalPatients.AnyAsync())
        {
            db.ProfessionalPatients.AddRange(
                CreateProfessionalPatient("pp-laura-ana", "pro-laura-vega", "ana-martinez", "apt-001"),
                CreateProfessionalPatient("pp-miguel-carlos", "pro-miguel-torres", "carlos-ruiz", "apt-002"),
                CreateProfessionalPatient("pp-nora-sofia", "pro-nora-ibarra", "sofia-leon", "apt-003"));
        }

        if (!await db.PatientRecords.AnyAsync())
        {
            db.PatientRecords.AddRange(
                new PatientRecord
                {
                    Id = "record-ana-nutrition",
                    PatientId = "ana-martinez",
                    ProfessionalId = "pro-laura-vega",
                    RecordType = "nutrition",
                    Title = "Expediente nutricional",
                    Summary = "Resumen visible para paciente: objetivos de adherencia, energia estable y ajustes de colaciones.",
                    Visibility = "patient_visible",
                    Status = "active"
                },
                new PatientRecord
                {
                    Id = "record-carlos-physio",
                    PatientId = "carlos-ruiz",
                    ProfessionalId = "pro-miguel-torres",
                    RecordType = "physiotherapy",
                    Title = "Plan de rehabilitacion lumbar",
                    Summary = "Rutina progresiva y seguimiento de dolor con ejercicios guiados.",
                    Visibility = "patient_visible",
                    Status = "active"
                },
                new PatientRecord
                {
                    Id = "record-sofia-psychology",
                    PatientId = "sofia-leon",
                    ProfessionalId = "pro-nora-ibarra",
                    RecordType = "psychology",
                    Title = "Resumen de primera consulta",
                    Summary = "Pendiente de primera valoracion; el resumen visible aparecera despues de la cita.",
                    Visibility = "patient_visible",
                    Status = "active"
                });
        }

        if (!await db.Reviews.AnyAsync())
        {
            db.Reviews.AddRange(
                CreateReview("rev-laura-1", "review-laura-1", "ana-martinez", "Ana M.", "pro-laura-vega", 5, "Me ayudo a convertir el plan en habitos realistas y faciles de seguir."),
                CreateReview("rev-laura-2", "review-laura-2", "carlos-ruiz", "Carlos R.", "pro-laura-vega", 5, "Muy clara explicando cambios pequenos sin sentir que todo era restriccion."),
                CreateReview("rev-miguel-1", "review-miguel-1", "carlos-ruiz", "Carlos R.", "pro-miguel-torres", 5, "La rutina fue progresiva y pude entender que movimientos evitar al inicio."),
                CreateReview("rev-nora-1", "review-nora-1", "sofia-leon", "Sofia L.", "pro-nora-ibarra", 4, "Me senti escuchada y sali con pasos concretos para la semana."),
                CreateReview("rev-andres-1", "review-andres-1", "ana-martinez", "Ana M.", "pro-andres-campos", 5, "Integra muy bien prevencion y explicaciones sencillas."));
        }
    }

    private static async Task LinkExistingClinicalDemoAsync(HealthHubDbContext db)
    {
        await LinkPatientAsync(db, "ana-martinez", "usr-ana-martinez");
        await LinkPatientAsync(db, "carlos-ruiz", "usr-carlos-ruiz");
        await LinkPatientAsync(db, "sofia-leon", "usr-sofia-leon");
        await LinkAppointmentAsync(db, "apt-001", "pro-laura-vega", "Dra. Laura Vega", "online", "usr-ana-martinez");
        await LinkAppointmentAsync(db, "apt-002", "pro-miguel-torres", "Dr. Miguel Torres", "in_person", "usr-carlos-ruiz");
        await LinkAppointmentAsync(db, "apt-003", "pro-nora-ibarra", "Psic. Nora Ibarra", "online", "usr-sofia-leon");
        await LinkSoapNoteAsync(db, "soap-001", "pro-laura-vega", "record-ana-nutrition");
    }

    private static async Task SeedClinicsAndMembershipsAsync(HealthHubDbContext db)
    {
        if (!await db.Clinics.AnyAsync(item => item.Id == "clinic-bienestar-integral"))
        {
            db.Clinics.Add(new Clinic
            {
                Id = "clinic-bienestar-integral",
                Name = "Clinica Bienestar Integral",
                LegalName = "Clinica Bienestar Integral S.C.",
                TaxId = "CBI260608MX0",
                Location = "Roma Norte, CDMX",
                Status = "active"
            });
        }

        await AddClinicMembershipIfMissingAsync(db, CreateClinicMembership("cm-admin-bienestar", "clinic-bienestar-integral", "usr-clinic-admin", null, "clinic_admin"));
        await AddClinicMembershipIfMissingAsync(db, CreateClinicMembership("cm-laura-bienestar", "clinic-bienestar-integral", "usr-laura-vega", "pro-laura-vega", "clinic_admin"));
        await AddClinicMembershipIfMissingAsync(db, CreateClinicMembership("cm-miguel-bienestar", "clinic-bienestar-integral", "usr-miguel-torres", "pro-miguel-torres", "professional"));
        await AddClinicMembershipIfMissingAsync(db, CreateClinicMembership("cm-nora-bienestar", "clinic-bienestar-integral", "usr-nora-ibarra", "pro-nora-ibarra", "professional"));
        await AddClinicMembershipIfMissingAsync(db, CreateClinicMembership("cm-andres-bienestar", "clinic-bienestar-integral", "usr-andres-campos", "pro-andres-campos", "professional"));
    }

    private static async Task SeedOperationalNotificationsAsync(HealthHubDbContext db)
    {
        if (await db.Notifications.AnyAsync())
        {
            return;
        }

        db.Notifications.AddRange(
            CreateNotification(
                "notif-ana-expediente",
                "usr-ana-martinez",
                "record_visible",
                "Expediente actualizado",
                "Tu expediente nutricional visible fue actualizado por Dra. Laura Vega.",
                "normal",
                "record-ana-nutrition",
                "ana-martinez",
                "pro-laura-vega"),
            CreateNotification(
                "notif-laura-clinic",
                "usr-laura-vega",
                "clinic_scope",
                "Permiso de clinica activo",
                "Tienes rol de admin en Clinica Bienestar Integral para revisar auditoria y equipo.",
                "normal",
                null,
                null,
                "pro-laura-vega"));
    }

    private static async Task SeedNotificationPreferencesAsync(HealthHubDbContext db)
    {
        var userIds = await db.Users
            .Where(user => user.Status == "active")
            .Select(user => user.Id)
            .ToListAsync();

        foreach (var userId in userIds)
        {
            await AddNotificationPreferenceIfMissingAsync(db, CreateNotificationPreference(userId, "app", true));
            await AddNotificationPreferenceIfMissingAsync(db, CreateNotificationPreference(userId, "email", false));
            await AddNotificationPreferenceIfMissingAsync(db, CreateNotificationPreference(userId, "whatsapp", false));
        }
    }

    private static UserRole CreateUserRole(string userId, string role, string scopeType = "global", string? scopeId = null) =>
        new()
        {
            Id = scopeType == "global" && scopeId is null ? $"role-{userId}-{role}" : $"role-{userId}-{role}-{scopeType}-{scopeId}",
            UserId = userId,
            Role = role,
            ScopeType = scopeType,
            ScopeId = scopeId
        };

    private static ClinicMembership CreateClinicMembership(string id, string clinicId, string userId, string? professionalId, string role) =>
        new()
        {
            Id = id,
            ClinicId = clinicId,
            UserId = userId,
            ProfessionalId = professionalId,
            Role = role,
            Status = "active",
            JoinedAt = DateTimeOffset.UtcNow.AddDays(-30)
        };

    private static Notification CreateNotification(
        string id,
        string userId,
        string type,
        string title,
        string body,
        string priority,
        string? appointmentId,
        string? patientId,
        string? professionalId) =>
        new()
        {
            Id = id,
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            Priority = priority,
            AppointmentId = appointmentId,
            PatientId = patientId,
            ProfessionalId = professionalId,
            Status = "unread"
        };

    private static NotificationPreference CreateNotificationPreference(string userId, string channel, bool enabled) =>
        new()
        {
            Id = $"pref-{userId}-{channel}",
            UserId = userId,
            Channel = channel,
            Enabled = enabled,
            AppointmentUpdates = true,
            ClinicUpdates = true,
            ReminderUpdates = true
        };

    private static async Task AddUserIfMissingAsync(HealthHubDbContext db, User user)
    {
        if (db.Users.Local.Any(item => item.Id == user.Id) || await db.Users.AnyAsync(item => item.Id == user.Id))
        {
            return;
        }

        db.Users.Add(user);
    }

    private static async Task AddUserRoleIfMissingAsync(HealthHubDbContext db, UserRole role)
    {
        var existsInLocal = db.UserRoles.Local.Any(item =>
            item.UserId == role.UserId &&
            item.Role == role.Role &&
            item.ScopeType == role.ScopeType &&
            item.ScopeId == role.ScopeId);

        if (existsInLocal || await db.UserRoles.AnyAsync(item =>
            item.UserId == role.UserId &&
            item.Role == role.Role &&
            item.ScopeType == role.ScopeType &&
            item.ScopeId == role.ScopeId))
        {
            return;
        }

        db.UserRoles.Add(role);
    }

    private static async Task AddClinicMembershipIfMissingAsync(HealthHubDbContext db, ClinicMembership membership)
    {
        var existsInLocal = db.ClinicMemberships.Local.Any(item => item.ClinicId == membership.ClinicId && item.UserId == membership.UserId);

        if (existsInLocal || await db.ClinicMemberships.AnyAsync(item => item.ClinicId == membership.ClinicId && item.UserId == membership.UserId))
        {
            return;
        }

        db.ClinicMemberships.Add(membership);
    }

    private static async Task AddNotificationPreferenceIfMissingAsync(HealthHubDbContext db, NotificationPreference preference)
    {
        var existsInLocal = db.NotificationPreferences.Local.Any(item => item.UserId == preference.UserId && item.Channel == preference.Channel);

        if (existsInLocal || await db.NotificationPreferences.AnyAsync(item => item.UserId == preference.UserId && item.Channel == preference.Channel))
        {
            return;
        }

        db.NotificationPreferences.Add(preference);
    }

    private static User CreateSeedUser(User user)
    {
        ApplyDemoPassword(user);
        return user;
    }

    private static void ApplyDemoPassword(User user)
    {
        var credentials = PasswordHasher.HashPassword(DemoPassword);
        user.PasswordHash = credentials.Hash;
        user.PasswordSalt = credentials.Salt;
    }

    private static ProfessionalService CreateService(string id, string professionalId, string name, string description, int duration, decimal price, string mode) =>
        new()
        {
            Id = id,
            ProfessionalId = professionalId,
            Name = name,
            Description = description,
            DurationMinutes = duration,
            Price = price,
            Mode = mode,
            Status = "active"
        };

    private static ProfessionalAvailability CreateAvailability(string id, string professionalId, int weekday, string startsAt, string endsAt) =>
        new()
        {
            Id = id,
            ProfessionalId = professionalId,
            Weekday = weekday,
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = "active"
        };

    private static ProfessionalPatient CreateProfessionalPatient(string id, string professionalId, string patientId, string appointmentId) =>
        new()
        {
            Id = id,
            ProfessionalId = professionalId,
            PatientId = patientId,
            CreatedFromAppointmentId = appointmentId,
            Status = "active",
            StartedAt = DateTimeOffset.UtcNow.AddDays(-20)
        };

    private static Review CreateReview(string id, string appointmentId, string patientId, string patientName, string professionalId, int rating, string comment) =>
        new()
        {
            Id = id,
            AppointmentId = appointmentId,
            PatientId = patientId,
            PatientName = patientName,
            ProfessionalId = professionalId,
            Rating = rating,
            Comment = comment,
            Status = "published",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-10)
        };

    private static async Task LinkPatientAsync(HealthHubDbContext db, string patientId, string userId)
    {
        var patient = await db.Patients.FirstOrDefaultAsync(item => item.Id == patientId);

        if (patient is null || patient.UserId == userId)
        {
            return;
        }

        patient.UserId = userId;
        patient.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static async Task LinkAppointmentAsync(HealthHubDbContext db, string appointmentId, string professionalId, string professionalName, string mode, string createdByUserId)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(item => item.Id == appointmentId);

        if (appointment is null)
        {
            return;
        }

        appointment.ProfessionalId = professionalId;
        appointment.ProfessionalName = professionalName;
        appointment.Mode = mode;
        appointment.CreatedByUserId = createdByUserId;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static async Task LinkSoapNoteAsync(HealthHubDbContext db, string noteId, string professionalId, string recordId)
    {
        var note = await db.SoapNotes.FirstOrDefaultAsync(item => item.Id == noteId);

        if (note is null)
        {
            return;
        }

        note.ProfessionalId = professionalId;
        note.PatientRecordId = recordId;
        note.UpdatedAt = DateTimeOffset.UtcNow;
    }
}
