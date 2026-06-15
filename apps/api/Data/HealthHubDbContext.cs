using HealthHub.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HealthHub.Api.Data;

public sealed class HealthHubDbContext(DbContextOptions<HealthHubDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<Clinic> Clinics => Set<Clinic>();
    public DbSet<ClinicMembership> ClinicMemberships => Set<ClinicMembership>();
    public DbSet<ClinicInvitation> ClinicInvitations => Set<ClinicInvitation>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Professional> Professionals => Set<Professional>();
    public DbSet<ProfessionalService> ProfessionalServices => Set<ProfessionalService>();
    public DbSet<ProfessionalAvailability> ProfessionalAvailability => Set<ProfessionalAvailability>();
    public DbSet<ProfessionalPatient> ProfessionalPatients => Set<ProfessionalPatient>();
    public DbSet<PatientRecord> PatientRecords => Set<PatientRecord>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<SoapNote> SoapNotes => Set<SoapNote>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserConsent> UserConsents => Set<UserConsent>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ProfessionalMercadoPago> ProfessionalMercadoPagos => Set<ProfessionalMercadoPago>();
    public DbSet<CommissionTier> CommissionTiers => Set<CommissionTier>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PatientTask> PatientTasks => Set<PatientTask>();
    public DbSet<PatientDiet> PatientDiets => Set<PatientDiet>();
    public DbSet<BodyMeasurement> BodyMeasurements => Set<BodyMeasurement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Id).HasMaxLength(120);
            entity.Property(user => user.ClerkUserId).HasMaxLength(160);
            entity.Property(user => user.Email).HasMaxLength(240).IsRequired();
            entity.Property(user => user.Phone).HasMaxLength(80).IsRequired();
            entity.Property(user => user.FullName).HasMaxLength(200).IsRequired();
            entity.Property(user => user.PrimaryRole).HasMaxLength(40).IsRequired();
            entity.Property(user => user.Status).HasMaxLength(40).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(160).IsRequired();
            entity.Property(user => user.PasswordSalt).HasMaxLength(80).IsRequired();
            entity.HasIndex(user => user.Email).IsUnique();
            entity.HasIndex(user => user.ClerkUserId).IsUnique();
        });

        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.ToTable("user_sessions");
            entity.HasKey(session => session.Id);
            entity.Property(session => session.Id).HasMaxLength(120);
            entity.Property(session => session.UserId).HasMaxLength(120).IsRequired();
            entity.Property(session => session.TokenHash).HasMaxLength(160).IsRequired();
            entity.Property(session => session.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(session => session.User)
                .WithMany(user => user.Sessions)
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(session => session.TokenHash).IsUnique();
            entity.HasIndex(session => new { session.UserId, session.Status, session.ExpiresAt });
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");
            entity.HasKey(role => role.Id);
            entity.Property(role => role.Id).HasMaxLength(120);
            entity.Property(role => role.UserId).HasMaxLength(120).IsRequired();
            entity.Property(role => role.Role).HasMaxLength(40).IsRequired();
            entity.Property(role => role.ScopeType).HasMaxLength(60).IsRequired();
            entity.Property(role => role.ScopeId).HasMaxLength(120);
            entity.HasOne(role => role.User)
                .WithMany(user => user.UserRoles)
                .HasForeignKey(role => role.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(role => new { role.UserId, role.Role, role.ScopeType, role.ScopeId }).IsUnique();
        });

        modelBuilder.Entity<Clinic>(entity =>
        {
            entity.ToTable("clinics");
            entity.HasKey(clinic => clinic.Id);
            entity.Property(clinic => clinic.Id).HasMaxLength(120);
            entity.Property(clinic => clinic.Name).HasMaxLength(200).IsRequired();
            entity.Property(clinic => clinic.LegalName).HasMaxLength(240).IsRequired();
            entity.Property(clinic => clinic.TaxId).HasMaxLength(80).IsRequired();
            entity.Property(clinic => clinic.Location).HasMaxLength(240).IsRequired();
            entity.Property(clinic => clinic.Status).HasMaxLength(40).IsRequired();
            entity.HasIndex(clinic => clinic.Status);
        });

        modelBuilder.Entity<ClinicMembership>(entity =>
        {
            entity.ToTable("clinic_memberships");
            entity.HasKey(membership => membership.Id);
            entity.Property(membership => membership.Id).HasMaxLength(120);
            entity.Property(membership => membership.ClinicId).HasMaxLength(120).IsRequired();
            entity.Property(membership => membership.UserId).HasMaxLength(120).IsRequired();
            entity.Property(membership => membership.ProfessionalId).HasMaxLength(120);
            entity.Property(membership => membership.Role).HasMaxLength(60).IsRequired();
            entity.Property(membership => membership.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(membership => membership.Clinic)
                .WithMany(clinic => clinic.Memberships)
                .HasForeignKey(membership => membership.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(membership => membership.User)
                .WithMany(user => user.ClinicMemberships)
                .HasForeignKey(membership => membership.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(membership => membership.Professional)
                .WithMany(professional => professional.ClinicMemberships)
                .HasForeignKey(membership => membership.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(membership => new { membership.ClinicId, membership.UserId }).IsUnique();
            entity.HasIndex(membership => new { membership.UserId, membership.Status });
        });

        modelBuilder.Entity<ClinicInvitation>(entity =>
        {
            entity.ToTable("clinic_invitations");
            entity.HasKey(invitation => invitation.Id);
            entity.Property(invitation => invitation.Id).HasMaxLength(120);
            entity.Property(invitation => invitation.ClinicId).HasMaxLength(120).IsRequired();
            entity.Property(invitation => invitation.Email).HasMaxLength(240).IsRequired();
            entity.Property(invitation => invitation.FullName).HasMaxLength(200).IsRequired();
            entity.Property(invitation => invitation.Role).HasMaxLength(60).IsRequired();
            entity.Property(invitation => invitation.Specialty).HasMaxLength(80).IsRequired();
            entity.Property(invitation => invitation.LicenseNumber).HasMaxLength(120).IsRequired();
            entity.Property(invitation => invitation.Status).HasMaxLength(40).IsRequired();
            entity.Property(invitation => invitation.Token).HasMaxLength(160).IsRequired();
            entity.Property(invitation => invitation.InvitedByUserId).HasMaxLength(120).IsRequired();
            entity.Property(invitation => invitation.AcceptedUserId).HasMaxLength(120);
            entity.Property(invitation => invitation.ExpiryReminderSentAt);
            entity.HasOne(invitation => invitation.Clinic)
                .WithMany(clinic => clinic.Invitations)
                .HasForeignKey(invitation => invitation.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(invitation => invitation.InvitedByUser)
                .WithMany()
                .HasForeignKey(invitation => invitation.InvitedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(invitation => invitation.AcceptedUser)
                .WithMany()
                .HasForeignKey(invitation => invitation.AcceptedUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(invitation => new { invitation.ClinicId, invitation.Status, invitation.CreatedAt });
            entity.HasIndex(invitation => new { invitation.Email, invitation.Status });
            entity.HasIndex(invitation => invitation.Token).IsUnique();
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("patients");
            entity.HasKey(patient => patient.Id);
            entity.Property(patient => patient.Id).HasMaxLength(120);
            entity.Property(patient => patient.UserId).HasMaxLength(120);
            entity.Property(patient => patient.FullName).HasMaxLength(200).IsRequired();
            entity.Property(patient => patient.Initials).HasMaxLength(8).IsRequired();
            entity.Property(patient => patient.Status).HasMaxLength(40).IsRequired();
            entity.Property(patient => patient.StatusLabel).HasMaxLength(80).IsRequired();
            entity.Property(patient => patient.Email).HasMaxLength(240).IsRequired();
            entity.Property(patient => patient.Phone).HasMaxLength(80).IsRequired();
            entity.Property(patient => patient.Focus).HasMaxLength(200).IsRequired();
            entity.Property(patient => patient.MainReason).HasMaxLength(500).IsRequired();
            entity.Property(patient => patient.RiskLevel).HasMaxLength(80).IsRequired();
            entity.Property(patient => patient.NextAppointment).HasMaxLength(120).IsRequired();
            entity.Property(patient => patient.LastSession).HasMaxLength(120).IsRequired();
            entity.Property(patient => patient.Progress).HasMaxLength(1000).IsRequired();
            entity.Property(patient => patient.Professional).HasMaxLength(160).IsRequired();
            entity.HasOne(patient => patient.User)
                .WithOne(user => user.Patient)
                .HasForeignKey<Patient>(patient => patient.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(patient => patient.Email);
            entity.HasIndex(patient => patient.UserId).IsUnique();
        });

        modelBuilder.Entity<Professional>(entity =>
        {
            entity.ToTable("professionals");
            entity.HasKey(professional => professional.Id);
            entity.Property(professional => professional.Id).HasMaxLength(120);
            entity.Property(professional => professional.UserId).HasMaxLength(120).IsRequired();
            entity.Property(professional => professional.DisplayName).HasMaxLength(200).IsRequired();
            entity.Property(professional => professional.Specialty).HasMaxLength(80).IsRequired();
            entity.Property(professional => professional.LicenseNumber).HasMaxLength(120).IsRequired();
            entity.Property(professional => professional.VerificationStatus).HasMaxLength(40).IsRequired();
            entity.Property(professional => professional.LicenseVerifiedBy).HasMaxLength(120);
            entity.Property(professional => professional.WhatsappNumber).HasMaxLength(40).IsRequired();
            entity.Property(professional => professional.Bio).HasMaxLength(1000).IsRequired();
            entity.Property(professional => professional.ProfilePhotoUrl).HasMaxLength(500).IsRequired();
            entity.Property(professional => professional.Location).HasMaxLength(200).IsRequired();
            entity.Property(professional => professional.Timezone).HasMaxLength(80).IsRequired();
            entity.Property(professional => professional.AppointmentMode).HasMaxLength(40).IsRequired();
            entity.Property(professional => professional.BasePrice).HasPrecision(10, 2);
            entity.Property(professional => professional.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(professional => professional.User)
                .WithOne(user => user.Professional)
                .HasForeignKey<Professional>(professional => professional.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(professional => professional.Specialty);
            entity.HasIndex(professional => professional.UserId).IsUnique();
            entity.HasIndex(professional => professional.VerificationStatus);
        });

        modelBuilder.Entity<ProfessionalService>(entity =>
        {
            entity.ToTable("professional_services");
            entity.HasKey(service => service.Id);
            entity.Property(service => service.Id).HasMaxLength(120);
            entity.Property(service => service.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(service => service.Name).HasMaxLength(200).IsRequired();
            entity.Property(service => service.Description).HasMaxLength(800).IsRequired();
            entity.Property(service => service.Price).HasPrecision(10, 2);
            entity.Property(service => service.Mode).HasMaxLength(40).IsRequired();
            entity.Property(service => service.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(service => service.Professional)
                .WithMany(professional => professional.Services)
                .HasForeignKey(service => service.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(service => new { service.ProfessionalId, service.Status });
        });

        modelBuilder.Entity<ProfessionalAvailability>(entity =>
        {
            entity.ToTable("professional_availability");
            entity.HasKey(availability => availability.Id);
            entity.Property(availability => availability.Id).HasMaxLength(120);
            entity.Property(availability => availability.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(availability => availability.StartsAt).HasMaxLength(20).IsRequired();
            entity.Property(availability => availability.EndsAt).HasMaxLength(20).IsRequired();
            entity.Property(availability => availability.Timezone).HasMaxLength(80).IsRequired();
            entity.Property(availability => availability.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(availability => availability.Professional)
                .WithMany(professional => professional.Availability)
                .HasForeignKey(availability => availability.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(availability => new { availability.ProfessionalId, availability.Weekday });
        });

        modelBuilder.Entity<ProfessionalPatient>(entity =>
        {
            entity.ToTable("professional_patients");
            entity.HasKey(relation => relation.Id);
            entity.Property(relation => relation.Id).HasMaxLength(120);
            entity.Property(relation => relation.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(relation => relation.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(relation => relation.Status).HasMaxLength(40).IsRequired();
            entity.Property(relation => relation.CreatedFromAppointmentId).HasMaxLength(120);
            entity.HasOne(relation => relation.Professional)
                .WithMany(professional => professional.Patients)
                .HasForeignKey(relation => relation.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(relation => relation.Patient)
                .WithMany(patient => patient.Professionals)
                .HasForeignKey(relation => relation.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(relation => new { relation.ProfessionalId, relation.PatientId }).IsUnique();
        });

        modelBuilder.Entity<PatientRecord>(entity =>
        {
            entity.ToTable("patient_records");
            entity.HasKey(record => record.Id);
            entity.Property(record => record.Id).HasMaxLength(120);
            entity.Property(record => record.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(record => record.ProfessionalId).HasMaxLength(120);
            entity.Property(record => record.RecordType).HasMaxLength(80).IsRequired();
            entity.Property(record => record.Title).HasMaxLength(200).IsRequired();
            entity.Property(record => record.Summary).HasMaxLength(1200).IsRequired();
            entity.Property(record => record.Visibility).HasMaxLength(80).IsRequired();
            entity.Property(record => record.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(record => record.Patient)
                .WithMany(patient => patient.PatientRecords)
                .HasForeignKey(record => record.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(record => record.Professional)
                .WithMany(professional => professional.PatientRecords)
                .HasForeignKey(record => record.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(record => new { record.PatientId, record.Visibility, record.Status });
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(review => review.Id);
            entity.Property(review => review.Id).HasMaxLength(120);
            entity.Property(review => review.AppointmentId).HasMaxLength(120).IsRequired();
            entity.Property(review => review.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(review => review.PatientName).HasMaxLength(200).IsRequired();
            entity.Property(review => review.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(review => review.Comment).HasMaxLength(1000).IsRequired();
            entity.Property(review => review.Status).HasMaxLength(40).IsRequired();
            entity.Property(review => review.ModeratedByUserId).HasMaxLength(120);
            entity.Property(review => review.ModerationReason).HasMaxLength(500).IsRequired();
            entity.HasOne(review => review.Professional)
                .WithMany(professional => professional.Reviews)
                .HasForeignKey(review => review.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(review => review.Patient)
                .WithMany(patient => patient.Reviews)
                .HasForeignKey(review => review.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(review => new { review.ProfessionalId, review.Status });
            entity.HasIndex(review => review.AppointmentId).IsUnique();
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");
            entity.HasKey(appointment => appointment.Id);
            entity.Property(appointment => appointment.Id).HasMaxLength(120);
            entity.Property(appointment => appointment.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(appointment => appointment.PatientName).HasMaxLength(200).IsRequired();
            entity.Property(appointment => appointment.ProfessionalId).HasMaxLength(120);
            entity.Property(appointment => appointment.ProfessionalServiceId).HasMaxLength(120);
            entity.Property(appointment => appointment.ProfessionalName).HasMaxLength(200).IsRequired();
            entity.Property(appointment => appointment.Date).HasMaxLength(20).IsRequired();
            entity.Property(appointment => appointment.Time).HasMaxLength(20).IsRequired();
            entity.Property(appointment => appointment.Duration).HasMaxLength(40).IsRequired();
            entity.Property(appointment => appointment.Type).HasMaxLength(100).IsRequired();
            entity.Property(appointment => appointment.Mode).HasMaxLength(40).IsRequired();
            entity.Property(appointment => appointment.Status).HasMaxLength(40).IsRequired();
            entity.Property(appointment => appointment.StatusLabel).HasMaxLength(80).IsRequired();
            entity.Property(appointment => appointment.Reason).HasMaxLength(600).IsRequired();
            entity.Property(appointment => appointment.CreatedByUserId).HasMaxLength(120);
            entity.Property(appointment => appointment.CancellationReason).HasMaxLength(600);
            entity.Property(appointment => appointment.CancelledByUserId).HasMaxLength(120);
            entity.Property(appointment => appointment.RescheduleReason).HasMaxLength(600);
            entity.Property(appointment => appointment.RescheduledByUserId).HasMaxLength(120);
            entity.Property(appointment => appointment.ReminderSentAt);
            entity.HasOne(appointment => appointment.Patient)
                .WithMany(patient => patient.Appointments)
                .HasForeignKey(appointment => appointment.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(appointment => appointment.Professional)
                .WithMany()
                .HasForeignKey(appointment => appointment.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<ProfessionalService>()
                .WithMany()
                .HasForeignKey(appointment => appointment.ProfessionalServiceId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(appointment => appointment.CreatedByUser)
                .WithMany()
                .HasForeignKey(appointment => appointment.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(appointment => appointment.CancelledByUser)
                .WithMany()
                .HasForeignKey(appointment => appointment.CancelledByUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(appointment => appointment.RescheduledByUser)
                .WithMany()
                .HasForeignKey(appointment => appointment.RescheduledByUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(appointment => new { appointment.PatientId, appointment.Date, appointment.Time });
            entity.HasIndex(appointment => new { appointment.ProfessionalId, appointment.Date, appointment.Time });
        });

        modelBuilder.Entity<SoapNote>(entity =>
        {
            entity.ToTable("soap_notes");
            entity.HasKey(note => note.Id);
            entity.Property(note => note.Id).HasMaxLength(120);
            entity.Property(note => note.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(note => note.PatientName).HasMaxLength(200).IsRequired();
            entity.Property(note => note.ProfessionalId).HasMaxLength(120);
            entity.Property(note => note.AppointmentId).HasMaxLength(120);
            entity.Property(note => note.PatientRecordId).HasMaxLength(120);
            entity.Property(note => note.Date).HasMaxLength(20).IsRequired();
            entity.Property(note => note.Title).HasMaxLength(200).IsRequired();
            entity.Property(note => note.Status).HasMaxLength(40).IsRequired();
            entity.Property(note => note.StatusLabel).HasMaxLength(80).IsRequired();
            entity.Property(note => note.Subjective).HasMaxLength(3000).IsRequired();
            entity.Property(note => note.Objective).HasMaxLength(3000).IsRequired();
            entity.Property(note => note.Assessment).HasMaxLength(3000).IsRequired();
            entity.Property(note => note.Plan).HasMaxLength(3000).IsRequired();
            entity.HasOne(note => note.Patient)
                .WithMany(patient => patient.SoapNotes)
                .HasForeignKey(note => note.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(note => note.Professional)
                .WithMany()
                .HasForeignKey(note => note.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(note => note.Appointment)
                .WithMany(appointment => appointment.SoapNotes)
                .HasForeignKey(note => note.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(note => note.PatientRecord)
                .WithMany(record => record.SoapNotes)
                .HasForeignKey(note => note.PatientRecordId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(note => new { note.PatientId, note.Date });
            entity.HasIndex(note => new { note.ProfessionalId, note.Date });
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(log => log.Id);
            entity.Property(log => log.Id).HasMaxLength(120);
            entity.Property(log => log.ActorUserId).HasMaxLength(120);
            entity.Property(log => log.ActorRole).HasMaxLength(40).IsRequired();
            entity.Property(log => log.Action).HasMaxLength(120).IsRequired();
            entity.Property(log => log.ResourceType).HasMaxLength(80).IsRequired();
            entity.Property(log => log.ResourceId).HasMaxLength(160).IsRequired();
            entity.Property(log => log.PatientId).HasMaxLength(120);
            entity.Property(log => log.ProfessionalId).HasMaxLength(120);
            entity.Property(log => log.Outcome).HasMaxLength(40).IsRequired();
            entity.Property(log => log.IpAddress).HasMaxLength(80).IsRequired();
            entity.Property(log => log.UserAgent).HasMaxLength(500).IsRequired();
            entity.HasOne(log => log.ActorUser)
                .WithMany()
                .HasForeignKey(log => log.ActorUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(log => new { log.PatientId, log.CreatedAt });
            entity.HasIndex(log => new { log.ResourceType, log.ResourceId });
            entity.HasIndex(log => new { log.ActorUserId, log.CreatedAt });
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(notification => notification.Id);
            entity.Property(notification => notification.Id).HasMaxLength(120);
            entity.Property(notification => notification.UserId).HasMaxLength(120).IsRequired();
            entity.Property(notification => notification.AppointmentId).HasMaxLength(120);
            entity.Property(notification => notification.PatientId).HasMaxLength(120);
            entity.Property(notification => notification.ProfessionalId).HasMaxLength(120);
            entity.Property(notification => notification.Type).HasMaxLength(80).IsRequired();
            entity.Property(notification => notification.Title).HasMaxLength(200).IsRequired();
            entity.Property(notification => notification.Body).HasMaxLength(1000).IsRequired();
            entity.Property(notification => notification.Priority).HasMaxLength(40).IsRequired();
            entity.Property(notification => notification.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(notification => notification.User)
                .WithMany(user => user.Notifications)
                .HasForeignKey(notification => notification.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(notification => notification.Appointment)
                .WithMany()
                .HasForeignKey(notification => notification.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(notification => new { notification.UserId, notification.Status, notification.CreatedAt });
            entity.HasIndex(notification => new { notification.AppointmentId, notification.Type });
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.ToTable("notification_preferences");
            entity.HasKey(preference => preference.Id);
            entity.Property(preference => preference.Id).HasMaxLength(120);
            entity.Property(preference => preference.UserId).HasMaxLength(120).IsRequired();
            entity.Property(preference => preference.Channel).HasMaxLength(40).IsRequired();
            entity.HasOne(preference => preference.User)
                .WithMany(user => user.NotificationPreferences)
                .HasForeignKey(preference => preference.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(preference => new { preference.UserId, preference.Channel }).IsUnique();
        });

        modelBuilder.Entity<UserConsent>(entity =>
        {
            entity.ToTable("user_consents");
            entity.HasKey(consent => consent.Id);
            entity.Property(consent => consent.Id).HasMaxLength(120);
            entity.Property(consent => consent.UserId).HasMaxLength(120).IsRequired();
            entity.Property(consent => consent.ConsentType).HasMaxLength(60).IsRequired();
            entity.Property(consent => consent.DocumentVersion).HasMaxLength(40).IsRequired();
            entity.Property(consent => consent.IpAddress).HasMaxLength(80).IsRequired();
            entity.Property(consent => consent.UserAgent).HasMaxLength(500).IsRequired();
            entity.HasOne(consent => consent.User)
                .WithMany(user => user.Consents)
                .HasForeignKey(consent => consent.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(consent => new { consent.UserId, consent.ConsentType, consent.DocumentVersion }).IsUnique();
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(payment => payment.Id);
            entity.Property(payment => payment.Id).HasMaxLength(120);
            entity.Property(payment => payment.AppointmentId).HasMaxLength(120).IsRequired();
            entity.Property(payment => payment.PatientUserId).HasMaxLength(120).IsRequired();
            entity.Property(payment => payment.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(payment => payment.Amount).HasColumnType("numeric(12,2)");
            entity.Property(payment => payment.Currency).HasMaxLength(10).IsRequired();
            entity.Property(payment => payment.Status).HasMaxLength(40).IsRequired();
            entity.Property(payment => payment.Provider).HasMaxLength(60).IsRequired();
            entity.Property(payment => payment.ProviderPreferenceId).HasMaxLength(160);
            entity.Property(payment => payment.ProviderPaymentId).HasMaxLength(160);
            entity.Property(payment => payment.CommissionPercentage).HasColumnType("numeric(5,2)");
            entity.Property(payment => payment.CommissionAmount).HasColumnType("numeric(12,2)");
            entity.Property(payment => payment.ProfessionalAmount).HasColumnType("numeric(12,2)");
            entity.Property(payment => payment.TransferStatus).HasMaxLength(40).IsRequired();
            entity.Property(payment => payment.ProviderTransferId).HasMaxLength(160);
            entity.HasOne(payment => payment.Appointment)
                .WithMany()
                .HasForeignKey(payment => payment.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(payment => payment.AppointmentId);
            entity.HasIndex(payment => payment.Status);
            entity.HasIndex(payment => payment.ProviderPaymentId);
            entity.HasIndex(payment => payment.TransferStatus);
        });

        modelBuilder.Entity<ProfessionalMercadoPago>(entity =>
        {
            entity.ToTable("professional_mercado_pagos");
            entity.HasKey(account => account.Id);
            entity.Property(account => account.Id).HasMaxLength(120);
            entity.Property(account => account.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(account => account.MercadoPagoUserId).HasMaxLength(120);
            entity.Property(account => account.Email).HasMaxLength(240);
            entity.Property(account => account.AccessTokenEncrypted).HasMaxLength(1000);
            entity.Property(account => account.RefreshTokenEncrypted).HasMaxLength(1000);
            entity.Property(account => account.PublicKey).HasMaxLength(240);
            entity.Property(account => account.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(account => account.Professional)
                .WithOne(professional => professional.MercadoPagoAccount)
                .HasForeignKey<ProfessionalMercadoPago>(account => account.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(account => account.ProfessionalId).IsUnique();
            entity.HasIndex(account => account.Status);
        });

        modelBuilder.Entity<CommissionTier>(entity =>
        {
            entity.ToTable("commission_tiers");
            entity.HasKey(tier => tier.Id);
            entity.Property(tier => tier.Id).HasMaxLength(120);
            entity.Property(tier => tier.LicenseType).HasMaxLength(60).IsRequired();
            entity.Property(tier => tier.CommissionPercentage).HasColumnType("numeric(5,2)");
            entity.Property(tier => tier.Status).HasMaxLength(40).IsRequired();
            entity.HasIndex(tier => new { tier.LicenseType, tier.MinAppointmentsThreshold }).IsUnique();
        });

        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.ToTable("prescriptions");
            entity.HasKey(prescription => prescription.Id);
            entity.Property(prescription => prescription.Id).HasMaxLength(120);
            entity.Property(prescription => prescription.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(prescription => prescription.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(prescription => prescription.AppointmentId).HasMaxLength(120);
            entity.Property(prescription => prescription.MedicationName).HasMaxLength(200).IsRequired();
            entity.Property(prescription => prescription.Dosage).HasMaxLength(200).IsRequired();
            entity.Property(prescription => prescription.Frequency).HasMaxLength(200).IsRequired();
            entity.Property(prescription => prescription.Duration).HasMaxLength(200).IsRequired();
            entity.Property(prescription => prescription.Instructions).HasMaxLength(1000).IsRequired();
            entity.Property(prescription => prescription.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(prescription => prescription.Patient)
                .WithMany()
                .HasForeignKey(prescription => prescription.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(prescription => prescription.Professional)
                .WithMany()
                .HasForeignKey(prescription => prescription.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(prescription => new { prescription.PatientId, prescription.Status });
            entity.HasIndex(prescription => new { prescription.ProfessionalId, prescription.Status });
        });

        modelBuilder.Entity<PatientTask>(entity =>
        {
            entity.ToTable("patient_tasks");
            entity.HasKey(task => task.Id);
            entity.Property(task => task.Id).HasMaxLength(120);
            entity.Property(task => task.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(task => task.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(task => task.AppointmentId).HasMaxLength(120);
            entity.Property(task => task.Title).HasMaxLength(200).IsRequired();
            entity.Property(task => task.Description).HasMaxLength(1000).IsRequired();
            entity.Property(task => task.Status).HasMaxLength(40).IsRequired();
            entity.Property(task => task.PatientNotes).HasMaxLength(1000);
            entity.HasOne(task => task.Patient)
                .WithMany()
                .HasForeignKey(task => task.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(task => task.Professional)
                .WithMany()
                .HasForeignKey(task => task.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(task => new { task.PatientId, task.Status });
            entity.HasIndex(task => new { task.ProfessionalId, task.Status });
        });

        modelBuilder.Entity<PatientDiet>(entity =>
        {
            entity.ToTable("patient_diets");
            entity.HasKey(diet => diet.Id);
            entity.Property(diet => diet.Id).HasMaxLength(120);
            entity.Property(diet => diet.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(diet => diet.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(diet => diet.Title).HasMaxLength(200).IsRequired();
            entity.Property(diet => diet.Content).HasMaxLength(3000).IsRequired();
            entity.Property(diet => diet.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(diet => diet.Patient)
                .WithMany()
                .HasForeignKey(diet => diet.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(diet => diet.Professional)
                .WithMany()
                .HasForeignKey(diet => diet.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(diet => new { diet.PatientId, diet.Status });
            entity.HasIndex(diet => new { diet.ProfessionalId, diet.Status });
        });

        modelBuilder.Entity<BodyMeasurement>(entity =>
        {
            entity.ToTable("body_measurements");
            entity.HasKey(measurement => measurement.Id);
            entity.Property(measurement => measurement.Id).HasMaxLength(120);
            entity.Property(measurement => measurement.PatientId).HasMaxLength(120).IsRequired();
            entity.Property(measurement => measurement.ProfessionalId).HasMaxLength(120).IsRequired();
            entity.Property(measurement => measurement.WeightKg).HasColumnType("numeric(7,2)");
            entity.Property(measurement => measurement.HeightCm).HasColumnType("numeric(7,2)");
            entity.Property(measurement => measurement.WaistCm).HasColumnType("numeric(7,2)");
            entity.Property(measurement => measurement.HipCm).HasColumnType("numeric(7,2)");
            entity.Property(measurement => measurement.ArmCm).HasColumnType("numeric(7,2)");
            entity.Property(measurement => measurement.BodyFatPercentage).HasColumnType("numeric(5,2)");
            entity.Property(measurement => measurement.MuscleMassKg).HasColumnType("numeric(7,2)");
            entity.Property(measurement => measurement.Notes).HasMaxLength(500);
            entity.HasOne(measurement => measurement.Patient)
                .WithMany()
                .HasForeignKey(measurement => measurement.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(measurement => measurement.Professional)
                .WithMany()
                .HasForeignKey(measurement => measurement.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(measurement => new { measurement.PatientId, measurement.MeasuredAt });
        });
    }
}
