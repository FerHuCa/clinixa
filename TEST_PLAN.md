# Plan de Pruebas — Clinixa — 2026-06-22

> Orquestador: Opus 4.8 (planea/evalúa, no escribe código de prod). Ejecutores: sub-agentes Sonnet 4.6 (leen, ejecutan read-only, reportan). Ponytail `full`.
>
> **Modelo de ejecución (decisión clave):** el write-path muta estado compartido en una BD seedeada única. Para evitar carreras de mutación concurrente se usa **un solo escritor / muchos lectores**:
> - **Escritor (Opus, secuencial):** corre los 3 scripts canónicos existentes una vez — `smoke:api`, `test:api`, `test:public` — y captura su salida. Ese es el backbone dinámico del write-path.
> - **Lectores (Sonnet, concurrentes):** por flujo hacen (a) revisión estática del handler en `Program.cs`, (b) probes **GET idempotentes** vía `curl` contra el API vivo, (c) interpretan la salida capturada de los scripts, (d) cazan gaps de edge-cases. **No** ejecutan mutaciones.
>
> API bajo prueba: `http://127.0.0.1:5050` arrancado en **modo simulado** (sin `.env` real → MP/Resend/Clerk vacíos → cero efectos externos). Postgres local seedeado por `DatabaseSeeder` al boot. Auth de prueba: header `X-HealthHub-Dev-User: <userId>` o `POST /api/auth/login` (`password: healthhub123`, legacy habilitado en Development).

## Flujos a probar

| ID  | Flujo                                              | Ruta/Endpoint principal                                                      | Prioridad | Cobertura existente |
|-----|----------------------------------------------------|-----------------------------------------------------------------------------|-----------|---------------------|
| F01 | Auth & sesión                                      | `/api/auth/login\|refresh\|logout`, `/api/me`, dev-header                    | Alta      | test:api, smoke     |
| F02 | Directorio público + gate de publicación           | `GET /api/professionals`, `/by-slug/{slug}`, `/available-slots`, `/reviews`  | Alta      | test:public, smoke  |
| F03 | Booking de citas (crear/cancelar/reprogramar/status)| `/api/appointments` (+`/cancel`,`/reschedule`,`/status`,`/available-slots`) | Alta      | test:api            |
| F04 | Pagos: checkout + efectivo + webhook MP + reembolso | `/{id}/checkout`, `/{id}/cash-payment`, `/api/webhooks/mercadopago`          | Alta ⚠️   | test:api            |
| F05 | Onboarding profesional + verificación cédula + publish | `/api/professional-portal/onboarding\|profile\|publish`, `/verification`  | Alta      | test:api            |
| F06 | Clínicas & invitaciones                            | `/api/clinics`, `/api/clinic-invitations/{token}/accept`                     | Media     | test:api            |
| F07 | Módulos por especialidad + RBAC paciente/pro       | `/api/prescriptions\|patient-tasks\|patient-diets\|body-measurements`, reviews/soap | Media | smoke (GET)     |
| F08 | Cross-cutting: notif/prefs/consentimiento/audit + suscripción | `/api/notifications`, `/notification-preferences`, `/me/consent`, `/audit-logs`, `/subscription` | Media | smoke, test:api |

## Datos sintéticos

> Nuevos por sesión (nonce `r6k2`). Emails en TLD `.test` (no enrutable). Inyectados como **contexto**, no como fixture en disco. Nunca datos reales de pacientes. Los IDs seedeados (`pro-laura-vega`, `usr-ana-martinez`, `clinic-bienestar-integral`, `master`) son fixtures demo del seeder y se usan solo como sujetos de lectura/admin.

```typescript
const TEST_DATA = {
  sessionNonce: "r6k2",

  // 3 usuarios, roles distintos
  users: {
    patient: {
      role: "patient",
      name: "Valentina Ríos",
      email: "paciente.qa+r6k2@clinixa.test",
      seededProbeId: "usr-ana-martinez", // sujeto de lectura existente
    },
    professional: {
      role: "professional",
      name: "Dr. Mateo Fuentes",
      email: "pro.qa+r6k2@clinixa.test",
      specialty: "psychologist",
      cedula: "9988776",                 // cédula sintética a verificar por admin
      seededProbeId: "usr-laura-vega",
    },
    admin: {
      role: "internal_admin",
      email: "admin.qa+r6k2@clinixa.test",
      seededProbeId: "master",           // admin seedeado para acciones de verificación
    },
  },

  // Invitación de clínica sintética (F06)
  invitation: {
    clinicId: "clinic-bienestar-integral",
    inviteEmail: "invitado.qa+r6k2@clinixa.test",
    acceptPasswordValid: "Synthetic#2026r6k2",
    acceptPasswordTooShort: "abc123",    // < 8 → debe dar 400
  },

  // Payloads de escritura (los corre el escritor, no los lectores)
  appointment: {
    professionalId: "pro-laura-vega",
    serviceId: "svc-laura-inicial",
    notes: "Cita sintética QA r6k2 — no es paciente real",
  },

  // 2 escenarios de error (globales)
  errorScenarios: {
    E1_unauthorized: { desc: "endpoint protegido sin sesión", expect: 401 },
    E2_forbidden: { desc: "paciente accede a endpoint solo-profesional", expect: 403,
                    probe: "GET /api/professional-portal/dashboard con X-HealthHub-Dev-User: usr-ana-martinez" },
  },

  // 1 edge-case por flujo
  edgeCases: {
    F01: "refresh con token revocado/logout previo → 401",
    F02: "profesional en estado pending NO aparece en /api/professionals (gate)",
    F03: "reservar slot fuera de disponibilidad o ya ocupado → 400/409",
    F04: "webhook MP con firma HMAC inválida → rechazado (401/400); checkout de cita ya pagada → idempotente/409",
    F05: "publish sin cédula verificada → 400 (canPublish=false)",
    F06: "re-aceptar invitación ya aceptada → 409; password < 8 → 400",
    F07: "paciente intenta POST receta/tarea/dieta → 403; pro lee datos de paciente que no es suyo → 403/vacío",
    F08: "registrar interés de suscripción dos veces → idempotente (mismo timestamp)",
  },
} as const;
```

## Prompts para sub-agentes Sonnet

> Formato común a todos: **leen** handlers + asserts del script existente del flujo, **ejecutan** solo `curl` GET idempotentes contra `http://127.0.0.1:5050`, **interpretan** la salida capturada de los scripts, **reportan** veredicto + gaps. No mutan, no tocan código de prod. Devuelven JSON estructurado `{flow, verdict: PASS|FAIL|SKIP, evidence[], gaps[], notes}`.
>
> Ponytail aplicado: F02 y F07 comparten el criterio "gate/RBAC: estado/rol incorrecto → no expone datos". Se mantienen separados porque tocan código distinto (directorio público vs. módulos clínicos), pero comparten plantilla de criterio. No hay prompts duplicados.

### Prompt F01 — Auth & sesión
**Modelo:** claude-sonnet-4-6
**Contexto:** `apps/api/Program.cs` grupo `authApi` (líneas 299-406: login/refresh/logout) + middleware de auth (152-157) + `GetUserFromRequestAsync`. Asserts en `scripts/test-api.mjs` (login, refresh).
**Datos de entrada:** `TEST_DATA.users` (login con seeded `usr-laura-vega`/`master`, password `healthhub123`), `TEST_DATA.edgeCases.F01`.
**Tarea:** Probe `GET /api/me` (a) sin header → 401, (b) con `X-HealthHub-Dev-User: usr-ana-martinez` → 200 con email correcto. Revisar estáticamente que logout invalida la sesión bearer y que refresh tras logout daría 401. Confirmar en la salida de test:api que login→refresh→/me encadenan 200.
**Criterio de éxito:** `/api/me` sin auth = 401; con dev-header válido = 200 y `id` coincide; revisión confirma invalidación de sesión en logout.
**Criterio de fallo:** `/api/me` sin auth devuelve 200 (auth rota), o dev-header válido devuelve 401, o no hay invalidación de sesión.

### Prompt F02 — Directorio público + gate de publicación
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` grupo `professionalsApi` (1580-1930: list, by-slug, available-slots, reviews) + lógica de filtro `active+verified`. `scripts/test-public-features.mjs` (gate pending→no aparece).
**Datos de entrada:** seeded `pro-laura-vega` / `svc-laura-inicial`; `TEST_DATA.edgeCases.F02`.
**Tarea:** Probes GET: `/api/professionals` (lista), `/api/professionals/pro-laura-vega`, `/available-slots?serviceId=svc-laura-inicial&days=14`, `/reviews`. Verificar que cada uno responde 200 con shape esperado y que un profesional `pending`/no verificado NO aparece en la lista (leer el filtro en el handler + confirmar con la salida de test:public).
**Criterio de éxito:** los 4 GET = 200 con datos coherentes; el filtro excluye no-verificados/pending (gate íntegro).
**Criterio de fallo:** algún GET 500/401; o un profesional pending aparece en el directorio público.

### Prompt F03 — Booking de citas
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` grupo `appointmentsApi` (583-1105: POST crear, `/cancel`, `/reschedule`, `/status`) + `available-slots` (1891). Asserts de booking en `test-api.mjs`.
**Datos de entrada:** `TEST_DATA.appointment`, `TEST_DATA.edgeCases.F03`.
**Tarea:** Probe GET `/api/professionals/pro-laura-vega/available-slots` y `/api/appointments` (como pro). Revisión estática: validar que crear cita en slot ocupado/fuera de disponibilidad retorna 400/409, que cancel/reschedule respetan transiciones de estado (`apps/web/lib/appointment-states.ts` como referencia de máquina de estados). Confirmar en salida de test:api que el ciclo crear→reschedule→cancel pasa.
**Criterio de éxito:** slots y lista = 200; salida de test:api confirma ciclo de vida; guardas de slot inválido presentes en el handler.
**Criterio de fallo:** doble-booking permitido, o transición de estado inválida aceptada, o el ciclo en test:api falla.

### Prompt F04 — Pagos: checkout + efectivo + webhook MP + reembolso ⚠️ CRÍTICO
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` `/{id}/checkout` (1106), `/{id}/cash-payment` (1322), `/api/webhooks/mercadopago` (1435) + `apps/api/Infrastructure/MercadoPagoService.cs` (validación HMAC, modo simulado) y reembolso en `/cancel`. Asserts de pago/webhook en `test-api.mjs` (incluye `mercadoPagoSignature`).
**Datos de entrada:** `TEST_DATA.edgeCases.F04`. Webhook secret en Development = `dev-webhook-secret`.
**Tarea:** **Solo lectura.** Revisión estática: (1) el webhook rechaza firma HMAC inválida (verificar `ValidateWebhookSignature`/equivalente), (2) checkout en modo simulado retorna `initPoint` simulado sin llamar a MP real, (3) cancelar cita pagada dispara reembolso (estado `refunded`/registro contable). Interpretar la salida de test:api para confirmar webhook firmado→aprobado y reembolso al cancelar. **Reportar explícitamente el hallazgo del audit:** doble `ReadAsStringAsync` en `MercadoPagoService` (la 2ª lectura vuelve vacía) — validar si afecta el parseo de respuesta real.
**Criterio de éxito:** firma inválida rechazada; modo simulado no llama a MP real; reembolso registrado; test:api de pagos pasa.
**Criterio de fallo:** webhook acepta firma inválida (riesgo de fraude), o no hay reembolso al cancelar, o el doble-read corrompe el parseo en path real.

### Prompt F05 — Onboarding + verificación de cédula + publish
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` `professionalPortalApi` onboarding/profile/publish (2204-2400) + verificación admin `/verification` (1654) y cola `/pending` (2696). Asserts de onboarding/publish/verificación en `test-api.mjs`.
**Datos de entrada:** `TEST_DATA.users.professional` (cédula `9988776`), `TEST_DATA.edgeCases.F05`.
**Tarea:** Probe GET `/api/professional-portal/onboarding` (con dev-header de un pro). Revisión estática: confirmar que `canPublish=false` sin cédula verificada y que `POST /publish` retorna 400 en ese estado; que solo admin puede cambiar `verificationStatus`. Interpretar salida de test:api: publish temprano→400, verificación admin→canPublish=true, publish→active, aparece en directorio.
**Criterio de éxito:** gate de publicación exige cédula verificada; publish prematuro = 400; salida de test:api confirma el ciclo.
**Criterio de fallo:** un pro sin cédula verificada puede publicar, o un no-admin puede verificar cédulas.

### Prompt F06 — Clínicas & invitaciones
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` `clinicsApi` (2796) + `clinicInvitationsApi` (2933: detalle `{token}`, `/accept`, re-accept 409, revoke). Asserts de invitaciones en `test-api.mjs`.
**Datos de entrada:** `TEST_DATA.invitation`, `TEST_DATA.edgeCases.F06`.
**Tarea:** Probe GET `/api/clinics` (como admin de clínica). Revisión estática: aceptar con password < 8 → 400; re-aceptar invitación usada → 409; revoke invalida el token. Interpretar salida de test:api del ciclo invitación (crear→detalle→remind→accept→re-accept 409→revoke).
**Criterio de éxito:** ciclo de invitación íntegro; 400 en password corta; 409 en re-accept; revoke efectivo.
**Criterio de fallo:** invitación aceptable dos veces, o password < 8 aceptada, o token revocado sigue siendo válido.

### Prompt F07 — Módulos por especialidad + RBAC
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` líneas 3748-4070 (prescriptions, patient-tasks, diets, body-measurements) + reviews (3536) + soap-notes (3588). Guardas de rol y ownership (`GetAuthorizedProfessional`, `ProfessionalPatients`).
**Datos de entrada:** `TEST_DATA.users` (patient vs professional), `TEST_DATA.edgeCases.F07`.
**Tarea:** Probes GET con dev-header: `/api/prescriptions?patientId=ana-martinez`, `/api/patient-tasks?...`, `/api/patient-diets?...`, `/api/body-measurements?...` como paciente (200, solo sus datos) y revisión estática del guard: un paciente que hace POST a estos módulos → 403; un profesional accediendo a un paciente que no es suyo → 403/vacío. Reportar el patrón de 4 CRUD casi idénticos (hallazgo de audit) como gap de mantenibilidad.
**Criterio de éxito:** GET de paciente = 200 solo con sus datos; guards de rol/ownership presentes (POST de paciente bloqueado, cross-patient bloqueado).
**Criterio de fallo:** un paciente puede escribir recetas/tareas, o un profesional lee datos de pacientes ajenos.

### Prompt F08 — Cross-cutting: notif/prefs/consentimiento/audit + suscripción
**Modelo:** claude-sonnet-4-6
**Contexto:** `Program.cs` `notificationsApi` (3264), `notificationPreferencesApi` (3318), `consentApi` (3371), `auditApi` (3444), suscripción/interés (2487-2567). Asserts de suscripción/interés/notif en `test-api.mjs`.
**Datos de entrada:** seeded `usr-ana-martinez`, `master`; `TEST_DATA.edgeCases.F08`.
**Tarea:** Probes GET: `/api/notifications`, `/api/notification-preferences`, `/api/me/consent`, `/api/audit-logs` (como pro), `/api/professional-portal/subscription`. Revisión estática: registrar interés dos veces es idempotente (mismo `interestRegisteredAt`); `internal_admin` recibe notificación `subscription_interest`. **Reportar el canal `whatsapp` sin emisor** (hallazgo de audit) como feature scaffolded muerta.
**Criterio de éxito:** todos los GET = 200 con shape esperado; idempotencia de interés confirmada en salida de test:api.
**Criterio de fallo:** algún GET 500/401 indebido, o el interés no es idempotente, o audit-logs expuesto a rol sin permiso.

## SKIP / fuera de alcance dinámico

- **Clerk JWT (prod):** no se prueba dinámicamente (sin credenciales en modo simulado). Cobertura por revisión estática del middleware. `SKIP` dinámico — criterio de éxito requiere infra de Clerk no disponible en local seguro.
- **MP real (transacción productiva):** `SKIP` — modo simulado a propósito; 1 tx real ya verificada manualmente el 2026-06-22 (ver memoria), fuera de este plan automatizado.
- **Envío real de email (Resend):** `SKIP` — modo simulado; se valida que el código cae a `[EMAIL SIMULADO]`.
