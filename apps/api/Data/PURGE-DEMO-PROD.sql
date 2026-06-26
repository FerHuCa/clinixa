-- MANUAL — run against prod by a human after backup; never executed automatically.
--
-- Purpose: Remove ONLY the seed/demo records inserted by DatabaseSeeder
--          (the 4 named professionals, 3 demo patients, their appointments,
--           soap notes, patient records, reviews, portal relations, services,
--           availability, clinic memberships, clinic, user roles, notification
--           preferences, notifications, and seed users).
--
-- Real-user data and CommissionTiers rows are NOT touched.
--
-- Execution order respects FK constraints (children before parents).
-- Wrap in a transaction — if anything fails, ROLLBACK before investigating.
--
-- Seed user IDs targeted:
--   usr-laura-vega, usr-miguel-torres, usr-nora-ibarra, usr-andres-campos
--   usr-ana-martinez, usr-carlos-ruiz, usr-sofia-leon
--   usr-clinic-admin, usr-master
--
-- Seed professional IDs: pro-laura-vega, pro-miguel-torres, pro-nora-ibarra, pro-andres-campos
-- Seed patient IDs:      ana-martinez, carlos-ruiz, sofia-leon
-- Seed clinic ID:        clinic-bienestar-integral

BEGIN;

-- ── 1. SOAP notes (refs appointments + patient records + professionals) ──────
DELETE FROM soap_notes
WHERE "Id" IN ('soap-001');

-- ── 2. Patient records (refs patients + professionals) ───────────────────────
DELETE FROM patient_records
WHERE "Id" IN ('record-ana-nutrition', 'record-carlos-physio', 'record-sofia-psychology');

-- ── 3. Reviews (refs patients + professionals + appointments) ─────────────────
DELETE FROM reviews
WHERE "Id" IN ('rev-laura-1', 'rev-laura-2', 'rev-miguel-1', 'rev-nora-1', 'rev-andres-1');

-- ── 4. Appointments (refs patients + professionals + users) ──────────────────
DELETE FROM appointments
WHERE "Id" IN ('apt-001', 'apt-002', 'apt-003');

-- ── 5. Professional–patient relations ────────────────────────────────────────
DELETE FROM professional_patients
WHERE "Id" IN ('pp-laura-ana', 'pp-miguel-carlos', 'pp-nora-sofia');

-- ── 6. Professional availability ─────────────────────────────────────────────
DELETE FROM professional_availability
WHERE "Id" IN (
    'av-laura-1', 'av-laura-2',
    'av-miguel-1', 'av-miguel-2',
    'av-nora-1',  'av-nora-2',
    'av-andres-1','av-andres-2'
);

-- ── 7. Professional services ──────────────────────────────────────────────────
DELETE FROM professional_services
WHERE "Id" IN (
    'svc-laura-inicial', 'svc-laura-seguimiento',
    'svc-miguel-valoracion',
    'svc-nora-terapia',
    'svc-andres-consulta'
);

-- ── 8. Professionals ──────────────────────────────────────────────────────────
DELETE FROM professionals
WHERE "Id" IN ('pro-laura-vega', 'pro-miguel-torres', 'pro-nora-ibarra', 'pro-andres-campos');

-- ── 9. Patients ───────────────────────────────────────────────────────────────
DELETE FROM patients
WHERE "Id" IN ('ana-martinez', 'carlos-ruiz', 'sofia-leon');

-- ── 10. Notifications (refs users + professionals) ───────────────────────────
DELETE FROM notifications
WHERE "Id" IN ('notif-ana-expediente', 'notif-laura-clinic');

-- ── 11. Notification preferences for seed users ──────────────────────────────
-- Uses a safe list — does not touch real users.
DELETE FROM notification_preferences
WHERE "UserId" IN (
    'usr-laura-vega', 'usr-miguel-torres', 'usr-nora-ibarra', 'usr-andres-campos',
    'usr-ana-martinez', 'usr-carlos-ruiz', 'usr-sofia-leon',
    'usr-clinic-admin', 'usr-master'
);

-- ── 12. Clinic memberships ────────────────────────────────────────────────────
DELETE FROM clinic_memberships
WHERE "Id" IN (
    'cm-admin-bienestar', 'cm-laura-bienestar',
    'cm-miguel-bienestar', 'cm-nora-bienestar', 'cm-andres-bienestar'
);

-- ── 13. Clinic ────────────────────────────────────────────────────────────────
DELETE FROM clinics
WHERE "Id" = 'clinic-bienestar-integral';

-- ── 14. User roles for seed users ────────────────────────────────────────────
DELETE FROM user_roles
WHERE "UserId" IN (
    'usr-laura-vega', 'usr-miguel-torres', 'usr-nora-ibarra', 'usr-andres-campos',
    'usr-ana-martinez', 'usr-carlos-ruiz', 'usr-sofia-leon',
    'usr-clinic-admin', 'usr-master'
);

-- ── 15. Users ─────────────────────────────────────────────────────────────────
-- LAST — only after every FK child has been removed above.
DELETE FROM users
WHERE "Id" IN (
    'usr-laura-vega', 'usr-miguel-torres', 'usr-nora-ibarra', 'usr-andres-campos',
    'usr-ana-martinez', 'usr-carlos-ruiz', 'usr-sofia-leon',
    'usr-clinic-admin', 'usr-master'
);

-- ── Verify nothing was missed ─────────────────────────────────────────────────
-- Run these SELECTs before committing to confirm zero rows remain.
-- If any returns > 0, ROLLBACK and investigate.
SELECT COUNT(*) AS remaining_seed_users    FROM users          WHERE "Id" LIKE 'usr-%' AND "Email" LIKE '%healthhub.demo%';
SELECT COUNT(*) AS remaining_seed_pros     FROM professionals  WHERE "Id" IN ('pro-laura-vega','pro-miguel-torres','pro-nora-ibarra','pro-andres-campos');
SELECT COUNT(*) AS remaining_demo_patients FROM patients       WHERE "Id" IN ('ana-martinez','carlos-ruiz','sofia-leon');
SELECT COUNT(*) AS remaining_seed_apts     FROM appointments   WHERE "Id" IN ('apt-001','apt-002','apt-003');

-- If all counts are 0, commit:
COMMIT;

-- NOTE: CommissionTiers rows (tier-default, tier-doctor, etc.) are intentionally
--       NOT deleted — they are legitimate business configuration required in prod.
