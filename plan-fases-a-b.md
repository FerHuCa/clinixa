# Plan de ejecución — Fases A y B

Fecha de creación: 2026-06-09

Este documento define el plan accionable para las Fases A (desbloquear cobro) y B (retención y adquisición orgánica), con tareas, toques al modelo de datos, criterios de aceptación y dependencias. Sustituye las listas dispersas de "siguientes pasos" en `seguimiento-proyecto.md` y `comentarios_claude.md` mientras estas fases estén activas.

> Prerrequisito transversal pendiente (Paso 1, diferido): prueba E2E real de registro Clerk (paciente y profesional) verificando que no se vinculan cuentas y que `primaryRole` se respeta. No bloquea el diseño de A/B, pero sí su lanzamiento a usuarios reales.

---

## Fase A — Desbloquear cobro

Objetivo: que un profesional pueda publicar su perfil con confianza legal y que un paciente pueda pagar una cita en línea, cambiando el estado de la cita automáticamente.

### A1. Integración Mercado Pago (prioridad máxima)

Por qué primero: es el corazón de la monetización; el modelo de datos ya tiene `professional_service_id` con precio y duración.

Modelo de datos:
- Nueva entidad `Payment`: `Id`, `AppointmentId`, `PatientUserId`, `ProfessionalId`, `Amount`, `Currency` (MXN), `Status` (`pending`, `approved`, `rejected`, `refunded`), `Provider` (`mercadopago`), `ProviderPreferenceId`, `ProviderPaymentId`, `CreatedAt`, `UpdatedAt`.
- Migración EF Core idempotente `2026XXXX_Payments` (patrón SQL manual `CREATE TABLE IF NOT EXISTS`).

Backend:
- `POST /api/appointments/{id}/checkout` → crea una preferencia de Mercado Pago con el precio del servicio y devuelve `init_point`. Crea `Payment` en `pending`.
- `POST /api/webhooks/mercadopago` (público, validar firma) → al recibir `payment.approved`, marca `Payment.approved` y la cita pasa a `status = confirmed` (reutilizar la lógica de `PATCH /api/appointments/{id}/status`).
- Variables de entorno: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET` (degradación elegante a "modo simulado" como `EmailSender`, para entornos sin credenciales).

Frontend:
- En el portal paciente, tras seleccionar slot/servicio, botón "Pagar y confirmar" → llama a `checkout` → redirige a `init_point`.
- Página de retorno `/portal-paciente/pago?status=...` que refleja aprobado/pendiente/rechazado.

Criterios de aceptación:
- Pago aprobado en sandbox → cita `confirmed` automáticamente vía webhook + notificación generada.
- Sin credenciales → flujo simulado documentado (no rompe build ni tests).
- `test-api.mjs` cubre: creación de preferencia (mock), webhook aprobado → cita confirmada, webhook con firma inválida → 401.

Métodos a cubrir (vía Mercado Pago Checkout Pro): tarjeta, OXXO, SPEI. Comisión de plataforma: 2.5% (definida en `modelo_de_negocio.md`).

### A2. Vista calendario semanal de disponibilidad

Por qué: hoy el profesional define disponibilidad sin feedback visual de traslapes; integra al gate de onboarding.

Backend: reutilizar `GET /api/professionals/{id}/available-slots` y los bloques de `professional_availability`. No requiere migración.

Frontend:
- Componente `WeeklyAvailabilityGrid` en `/portal-profesional`: vista de 7 días × franjas horarias.
- Detección visual de traslapes y huecos ANTES de guardar (validación cliente + la validación servidor ya existente).
- Integrado al checklist de onboarding (`hasAvailability`).

Criterios de aceptación:
- Crear/editar bloque desde la grilla refleja conflictos en rojo sin guardar inválidos.
- Verificación responsive (mobile-first).

### A3. Verificación de cédula profesional (gate de publicación)

Por qué: requisito de confianza y apoyo a NOM-024 antes de aparecer en búsqueda pública. El gate de publicación ya existe (`POST /api/professional-portal/publish`).

Modelo de datos:
- Campos en `professionals`: `LicenseVerificationStatus` (`unverified`, `pending`, `verified`, `rejected`), `LicenseVerifiedAt`. Migración idempotente.

Backend:
- Extender el checklist de `BuildOnboardingStatus` y la validación de `publish` para exigir `LicenseVerificationStatus = verified`.
- MVP de verificación: validación manual por `internal_admin` mediante `PATCH /api/professionals/{id}/verify-license`. (Integración futura con el Registro Nacional de Profesionistas / consulta SEP queda como mejora.)

Frontend:
- Banner de onboarding muestra estado de verificación y bloquea "Publicar perfil" hasta `verified`.

Criterios de aceptación:
- Profesional `unverified` no puede publicar ni aparece en `GET /api/professionals`.
- Admin puede verificar; tras verificar, el profesional completa el resto del checklist y publica.

### A4. Signup público de profesional (cierre del canal individual)

Estado: en gran parte resuelto. El registro Clerk ya pregunta rol y provisiona `Professional` en estado `onboarding`. Falta:
- Confirmar el recorrido completo: signup → onboarding (perfil + consentimiento, ya implementado) → completar servicios/disponibilidad → verificación de cédula (A3) → publicar.
- Documentar el flujo individual (sin clínica) como camino de primera clase.

---

## Fase B — Retención y adquisición orgánica

### B1. Email transaccional con Resend (eventos de cita)

Estado: infraestructura lista (`EmailSender`, degradación a simulado). Falta dominio verificado, plantillas y conexión de eventos.

Backend:
- Plantillas para: cita agendada, cita confirmada, recordatorio 24h antes, cita cancelada, nota clínica disponible.
- Disparar en los puntos donde ya se generan notificaciones (`AddAppointmentNotifications`).
- Recordatorio 24h y recordatorio de invitación por vencer: migrar de manual a job programado (BackgroundService / hosted service o cron externo).

Variables: `RESEND_API_KEY`, `RESEND_FROM`, `WEB_BASE_URL` (ya documentadas).

Criterios de aceptación:
- Cada evento dispara correo (real con key, simulado sin key) y queda auditado.
- Job de recordatorios procesa citas en ventana de 24h sin duplicar envíos.

### B2. Páginas públicas de profesionales (SEO)

Por qué: adquisición orgánica de pacientes a costo ~$0.

Frontend:
- Ruta pública `/profesionales/[slug]` (ej. `laura-vega-psicologa-cdmx`), pública en `proxy.ts`.
- `schema.org` tipo `MedicalBusiness` / `Physician`, metadatos Open Graph, reviews visibles, botón "Agendar".
- Sólo profesionales `active` (publicados y con cédula verificada).

Backend: reutilizar `GET /api/professionals/{id}` + reviews; agregar resolución por slug.

Criterios de aceptación:
- Página indexable (SSR, metadatos correctos), datos estructurados válidos, CTA de agendar enlaza al flujo de reserva/pago.

### B3. Conexión WhatsApp del profesional (sustituye al chat propio)

Decisión 2026-06-09: el chat propio se elimina del alcance. La maqueta `/chat` se retira del frontend (tarea de limpieza, sin backend que borrar). La comunicación profesional-paciente vive en el WhatsApp de cada profesional, en dos niveles por plan:

**Nivel 1 — Botón wa.me (plan Básico, parte de esta fase):**

Modelo de datos:
- Campo `WhatsAppNumber` (E.164) en el perfil profesional. Migración idempotente.

Backend:
- Incluir `whatsAppNumber` en `GET /api/professionals/{id}` y en el portal profesional (editable).

Frontend:
- Botón "WhatsApp" en el perfil público del profesional y en el detalle de cita del paciente → `https://wa.me/{numero}?text=` con mensaje prellenado (nombre del paciente + cita).
- Eliminar la ruta `/chat` y sus enlaces de navegación.

Alcance clínico: la comunicación ocurre fuera de plataforma; los Términos deben deslindar responsabilidad (no urgencias, no forma parte del expediente). Sustituye la cláusula del chat en el encargo del abogado.

Criterios de aceptación:
- Profesional captura/edita su número; paciente ve el botón y abre WhatsApp con mensaje prellenado; perfil sin número no muestra botón.
- `/chat` eliminado del build sin enlaces rotos.

**Nivel 2 — WhatsApp Business API (plan Pro, Fase 3, no en esta fase):**
- Cada profesional conecta su número de WhatsApp Business (Meta Cloud API, embedded signup); recordatorios y confirmaciones automáticas salen desde su número, conectado a `notification_preferences`. Costo por conversación de Meta se traslada o se incluye con tope en Pro — decidir con datos del piloto.

---

## Orden recomendado de ejecución

1. **A1 Mercado Pago** (desbloquea ingresos).
2. **A3 Verificación de cédula** + **A2 calendario** (confianza + completar onboarding).
3. **A4** cierre/documentación del signup individual.
4. **B1 Resend** (retención inmediata, infra ya lista).
5. **B2 páginas públicas** (adquisición orgánica).
6. **B3 conexión WhatsApp** (campo + botón wa.me + retiro de `/chat`; esfuerzo bajo).

## Riesgos / decisiones abiertas

- Firma y validación de webhooks de Mercado Pago: tratar como secreto y validar siempre.
- Verificación de cédula automatizada vs. manual: arrancar manual, evaluar integración oficial después del piloto.
- WhatsApp Business API (Fase 3): costos por conversación de Meta y proceso de verificación del número del profesional; validar disposición en el piloto antes de construir.
- Job programado: definir si vive como `BackgroundService` en la API o como cron externo (Azure) para recordatorios.
