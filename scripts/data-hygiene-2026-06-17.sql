-- Higiene de datos — 2026-06-17
-- Limpia cruft runtime acumulado por test-api.mjs (profesional QA + 60 invitaciones)
-- y normaliza la cuenta de prueba de Fernando a un estado coherente "pending".
-- NO toca el seed canónico (Laura/Miguel/Andres/Nora/admin/master/pacientes)
-- ni el paciente desplazado (fernando-paciente@test.local).
-- Idempotente: seguro re-ejecutar. Ver PLAN-HIGIENE-DATOS-2026-06-17.md.

BEGIN;

-- 1) Invitaciones QA acumuladas (test-api.mjs crea una por corrida y nunca las borra)
DELETE FROM clinic_invitations WHERE "Email" LIKE 'qa.%@healthhub.demo';

-- 2) Profesional QA y su usuario (sin servicios/citas/reviews; sí roles/sessions/prefs/membership)
DELETE FROM clinic_memberships        WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM notification_preferences  WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM user_sessions             WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM user_roles                WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM professionals             WHERE "Id"     = 'pro-profesional-qa';
DELETE FROM users                     WHERE "Id"     = 'usr-profesional-qa';
-- audit_logs se conserva (ledger histórico append-only).

-- 3) Normalizar la cuenta real de prueba de Fernando a estado coherente "pending"
UPDATE professionals
SET "LicenseNumber"      = 'CED-FH-2026',
    "VerificationStatus" = 'pending',
    "LicenseVerifiedAt"  = NULL,
    "LicenseVerifiedBy"  = NULL,
    "Status"             = 'onboarding',
    "Bio"                = 'Médico general con enfoque en atención continua y seguimiento personalizado.',
    "Location"           = 'CDMX',
    "UpdatedAt"          = now()
WHERE "Id" = 'pro-murcielagolambo-gmail-com';

COMMIT;
