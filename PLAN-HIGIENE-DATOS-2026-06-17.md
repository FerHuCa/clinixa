# Plan de higiene de datos + nuevo set de pruebas — 2026-06-17

## Diagnóstico

### Cruft runtime acumulado (DB de dev)
| Entidad | Origen | Problema |
|---|---|---|
| `pro-profesional-qa` / `usr-profesional-qa` | `test-api.mjs` (flujo invitación→onboarding→verify, sin teardown) | Profesional `active`+`verified` → **aparece en el directorio público** (HUE-09). Email `qa.<timestamp>@healthhub.demo`. |
| **60 `clinic_invitations`** `qa.*@healthhub.demo` | `test-api.mjs` crea una invitación QA por corrida (líneas 88, 306) y nunca las borra | 60 invitaciones basura acumuladas en 60 runs. |
| `pro-murcielagolambo-gmail-com` (Fernando) | Pruebas de esta sesión (Resend, HUE-05) | Estado incoherente: `rejected`/`onboarding`, cédula de prueba `HUE05-TEST-002`. Es la cuenta real de prueba del usuario (`fernandohuertac@hotmail.com`). |
| `usr-fernandohuertac-hotmail-com` (`fernando-paciente@test.local`) | Swap de email de esta sesión | Paciente con email renombrado (desvinculado de Clerk). 3 consents + 1 patient. **Se deja** (posible cuenta real); solo se documenta. |

### Causa raíz
`scripts/test-api.mjs` es **stateful y sin teardown**: cada corrida deja invitaciones QA y (en la rama de invitación) un profesional QA verificado. El nuevo set de pruebas debe ser **auto-limpiante**.

### Seed canónico — OK
`DatabaseSeeder.cs` define datos coherentes: 4 profesionales demo (Laura/nutrición, Miguel/fisio, Andrés/medicina, Nora/psicología) verificados, 3 pacientes, `clinic-admin`, `master` (internal_admin). No incluye QA ni Fernando (son runtime). **No requiere cambios**, salvo nota: los demo no tienen avatar (HUE-04 nuevo); el directorio se ve sin fotos — aceptable para el piloto.

---

## Parte 1 — Limpieza runtime: `scripts/data-hygiene-2026-06-17.sql`

Transacción única, idempotente. Borra el cruft QA y normaliza Fernando. **No** toca el seed canónico ni el paciente desplazado.

```sql
BEGIN;

-- 1) Invitaciones QA acumuladas (60 de test-api.mjs)
DELETE FROM clinic_invitations WHERE "Email" LIKE 'qa.%@healthhub.demo';

-- 2) Profesional QA y su usuario (sin servicios/citas/reviews; sí roles/sessions/prefs/membership)
DELETE FROM clinic_memberships        WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM notification_preferences  WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM user_sessions             WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM user_roles                WHERE "UserId" = 'usr-profesional-qa';
DELETE FROM professionals             WHERE "Id"     = 'pro-profesional-qa';
DELETE FROM users                     WHERE "Id"     = 'usr-profesional-qa';
-- (audit_logs se conserva: ledger histórico append-only)

-- 3) Normalizar la cuenta de prueba real de Fernando a un estado coherente "pending"
--    (lista para que el usuario ejerza el flujo verify→email→publish desde la UI)
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
```

**Verificación post-limpieza:**
```sql
-- directorio público debe quedar con SOLO los 4 demo verificados
SELECT "DisplayName","Status","VerificationStatus" FROM professionals ORDER BY "CreatedAt";
SELECT COUNT(*) AS qa_invites FROM clinic_invitations WHERE "Email" LIKE 'qa.%@healthhub.demo';  -- 0
```
```bash
curl -s "http://localhost:5050/api/professionals" | python3 -c "import sys,json;print([p['displayName'] for p in json.load(sys.stdin)])"
# -> exactamente: Laura Vega, Miguel Torres, Andres Campos, Nora Ibarra (sin QA, sin Fernando)
```

---

## Parte 2 — Nuevo set de pruebas: `scripts/test-public-features.mjs`

Cubre las features de esta sesión (no cubiertas por `smoke-api.mjs` ni `test-api.mjs`), **con teardown**. Reusa el patrón de `test-api.mjs`: `request()` helper, login legacy (`/api/auth/login`, password `healthhub123`), `assert()`.

**Usuarios:** profesional `laura.vega@healthhub.demo`, admin `master@healthhub.demo`.

### Casos
1. **Directorio público / integridad** (`GET /api/professionals`):
   - 200, devuelve lista.
   - **Todos** los items tienen `VerificationStatus === "verified"` y `Status === "active"`.
   - Cada item trae `slug` (no vacío, formato `kebab-6hex`) y campo `profilePhotoUrl` presente.
   - Integridad: cada item tiene `bio`, `location`, `licenseNumber` no vacíos.
   - **Ningún** item se llama "Profesional QA" (la limpieza funcionó).
2. **Perfil por slug** (`GET /api/professionals/by-slug/{slug}`):
   - Tomar un slug del listado → 200, `displayName` coincide, incluye `services`/`availability`.
   - Slug inválido (`no-existe-xyz`) → 404.
3. **Avatar** (`POST /api/professional-portal/avatar`, multipart, como Laura):
   - PNG válido (generado en memoria) → 200, `profilePhotoUrl` no vacío y empieza con `/uploads/avatars/`.
   - El archivo se sirve: `GET {profilePhotoUrl sin query}` → 200.
   - Archivo no-imagen (.txt) → 400. Archivo > 2MB → 400.
   - **Teardown:** restaurar `profilePhotoUrl` previo vía `PATCH /profile` no aplica (no hay campo); dejar nota — el avatar de Laura queda seteado (aceptable; o borrar el archivo). Para no ensuciar, usar un profesional dedicado: **no**, usar Laura y al final no se puede limpiar la URL fácilmente → **alternativa:** subir el avatar pero registrar que es esperado. Mejor: el test sube y luego verifica; documenta que Laura queda con avatar de prueba (idempotente, mismo archivo se sobreescribe por id).
4. **Loop de verificación** (como `master`):
   - `GET /api/admin/professionals?verificationStatus=pending` → 200, incluye `email` por item.
   - Tomar un profesional de prueba (Fernando `pro-murcielagolambo-gmail-com`, que quedó `pending`): `PATCH /api/professionals/{id}/verification {status:"verified"}` → 200, `verificationStatus==="verified"`.
   - `PATCH ... {status:"rejected", reason:"prueba"}` → 200, `verificationStatus==="rejected"`.
   - **Teardown:** volver a dejar Fernando en `pending` (`PATCH {status:"pending"}`).
   - Verificar audit logs `professional.verification.verified` / `.rejected` vía la respuesta (no hace falta consultar DB).
5. **Gate público:** un profesional `pending`/`rejected` (Fernando) **no** aparece en `GET /api/professionals` ni responde por su slug (404).

### Integración
- Agregar script a `package.json`: `"test:public": "node scripts/test-public-features.mjs"`.
- Debe pasar de forma **idempotente** (correr 2× seguidas sin dejar cruft nuevo). El teardown restaura el estado de Fernando.

---

## Parte 3 — Ejecución
1. Aplicar `data-hygiene-2026-06-17.sql` (orquestador).
2. Un agente Sonnet **escribe** `scripts/test-public-features.mjs` + lo **corre** hasta verde, e idempotente (2 corridas). También corre `smoke:api` (31/31) y `test:api` para confirmar que la limpieza no rompió nada.
3. Commit.

## Fuera de alcance
- Reescribir `test-api.mjs` para teardown completo (es grande; el nuevo suite ya es limpio y la SQL purga lo viejo). Se documenta el leak de invitaciones QA como deuda conocida.
- Avatares en el seed (sin fuente de imágenes; el piloto va sin fotos demo).
