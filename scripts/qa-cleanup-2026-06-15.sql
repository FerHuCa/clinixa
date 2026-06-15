-- QA pollution cleanup — deferred from fix/qa-flow-findings session (2026-06-15)
-- Removes: 8 QA appointments (+4 cascaded payments), 31 QA users (usr-profesional-qa-*, usr-dra-demo-curl)
--          and their professionals + owned rows (services, availability, memberships, roles, sessions, notif-prefs, notifications).
-- PRESERVES: audit_logs (no FK; audit trail kept intentionally — orphaned QA references are harmless).
-- Targets the LEGIT personas' polluting appointments by EXACT id (no LIKE) so a concurrent verify run cannot collide.
-- Runs in a single transaction with before/after counts.

\set ON_ERROR_STOP on
BEGIN;

-- ── Snapshot BEFORE ────────────────────────────────────────────────────────
\echo '=== BEFORE ==='
SELECT 'qa_users'            AS what, count(*) FROM users        WHERE "Id" LIKE 'usr-profesional-qa-%' OR "Id"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_pros',          count(*) FROM professionals WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_appts',         count(*) FROM appointments  WHERE "Id" IN ('apt-1781550660848','apt-1781550685855','apt-1781550687804','apt-1781551040280','apt-1781553574289','apt-1781553574387','apt-1781553574608','apt-1781553574645')
UNION ALL SELECT 'qa_payments',      count(*) FROM payments      WHERE "AppointmentId" IN ('apt-1781550660848','apt-1781550685855','apt-1781550687804','apt-1781551040280','apt-1781553574289','apt-1781553574387','apt-1781553574608','apt-1781553574645');

-- ── 1. QA appointments (exact ids) → payments cascade via FK [CASCADE] ───────
DELETE FROM payments WHERE "AppointmentId" IN
  ('apt-1781550660848','apt-1781550685855','apt-1781550687804','apt-1781551040280',
   'apt-1781553574289','apt-1781553574387','apt-1781553574608','apt-1781553574645');
DELETE FROM appointments WHERE "Id" IN
  ('apt-1781550660848','apt-1781550685855','apt-1781550687804','apt-1781551040280',
   'apt-1781553574289','apt-1781553574387','apt-1781553574608','apt-1781553574645');

-- ── 2. Rows owned by QA professionals (pro-*) ───────────────────────────────
DELETE FROM professional_services      WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl';
DELETE FROM professional_availability  WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl';
DELETE FROM professional_mercado_pagos WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl';
DELETE FROM notifications              WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl'
                                          OR "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';
DELETE FROM clinic_memberships         WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl'
                                          OR "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';

-- ── 3. QA professionals ─────────────────────────────────────────────────────
DELETE FROM professionals WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';

-- ── 4. Rows owned by QA users (usr-*) ───────────────────────────────────────
DELETE FROM user_roles               WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';
DELETE FROM user_sessions            WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';
DELETE FROM notification_preferences WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';
DELETE FROM user_consents            WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';

-- ── 5. QA users ─────────────────────────────────────────────────────────────
DELETE FROM users WHERE "Id" LIKE 'usr-profesional-qa-%' OR "Id"='usr-dra-demo-curl';

-- ── Snapshot AFTER (must all be 0) ──────────────────────────────────────────
\echo '=== AFTER (expect all 0) ==='
SELECT 'qa_users'            AS what, count(*) FROM users        WHERE "Id" LIKE 'usr-profesional-qa-%' OR "Id"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_pros',          count(*) FROM professionals WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_appts',         count(*) FROM appointments  WHERE "Id" IN ('apt-1781550660848','apt-1781550685855','apt-1781550687804','apt-1781551040280','apt-1781553574289','apt-1781553574387','apt-1781553574608','apt-1781553574645')
UNION ALL SELECT 'qa_payments',      count(*) FROM payments      WHERE "AppointmentId" IN ('apt-1781550660848','apt-1781550685855','apt-1781550687804','apt-1781551040280','apt-1781553574289','apt-1781553574387','apt-1781553574608','apt-1781553574645')
UNION ALL SELECT 'qa_services',      count(*) FROM professional_services     WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl'
UNION ALL SELECT 'qa_availability',  count(*) FROM professional_availability WHERE "ProfessionalId" LIKE 'pro-profesional-qa-%' OR "ProfessionalId"='pro-dra-demo-curl'
UNION ALL SELECT 'qa_memberships',   count(*) FROM clinic_memberships        WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_roles',         count(*) FROM user_roles                WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_sessions',      count(*) FROM user_sessions             WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl'
UNION ALL SELECT 'qa_notif_prefs',   count(*) FROM notification_preferences  WHERE "UserId" LIKE 'usr-profesional-qa-%' OR "UserId"='usr-dra-demo-curl';

COMMIT;
\echo '=== COMMITTED ==='
