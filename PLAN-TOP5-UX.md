# Plan Top-5 UX — Implementación con agentes paralelos

> **Para trabajadores agénticos:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Los pasos usan checkboxes (`- [ ]`) para seguimiento. Este proyecto **NO tiene git**: no hay commits; el respaldo es `../HealthHub-snapshot-2026-06-12-pre-top5.tar.gz`. La verificación por tarea sustituye al commit.

**Goal:** Implementar los 5 cambios de mayor impacto de la revisión UX (2026-06-12) para que un profesional real pague la suscripción: home unificado del profesional, panel de cobros/ingresos (con efectivo), superficie de trial/suscripción, estados honestos de agendamiento, y barrida de credibilidad (copy/acentos/UI muerta).

**Architecture:** 3 olas. Ola 1 (3 agentes en paralelo, archivos disjuntos): backend completo (API), frontend del portal paciente, frontend del home profesional. Ola 2 (2 agentes en paralelo): UI de cobros+trial (consume endpoints de la ola 1 sobre el home ya estable) y barrida de copy en el resto de archivos. Ola 3: build integrado + test:api + verificación visual por el orquestador. El glosario compartido `apps/web/lib/appointment-states.ts` ya fue creado por el orquestador ANTES de la ola 1 — ningún agente lo edita.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind con componentes propios (`Panel`, `StatCard`, `StatusPill`, `PageHeader`, `AppShell`); ASP.NET Core minimal API (`Program.cs` monolítico) + EF Core/PostgreSQL con migraciones SQL idempotentes; pruebas de API en `scripts/test-api.mjs`.

---

## Reglas globales (todas las olas)

1. **Propiedad estricta de archivos**: cada agente SOLO toca los archivos listados como suyos. Si necesita un cambio en archivo ajeno, lo reporta como "pendiente de integración", no lo edita.
2. **Sin dependencias npm nuevas** (el cache de npm está dañado/root-owned y `package.json` es punto de choque). Nada de `npm install`, nada de shadcn CLI en esta iteración.
3. **Sin `npm run build:web` ni `npm run lint:web` durante olas paralelas** (chocan en `.next`/cache). Verificación frontend por agente: `cd apps/web && npx tsc --noEmit`. El build integrado lo corre el orquestador en la ola 3.
4. **Copy en español CON acentos** en todo texto nuevo o tocado. Tono: profesional de salud, no jerga técnica.
5. **Estados de cita/pago**: SIEMPRE vía `apps/web/lib/appointment-states.ts` (`citaStatusUiFor`, `pagoStatusUiFor`) + `StatusPill`. Prohibido hardcodear etiquetas de estado.
6. **No git**: no intentar `git` (no hay repo). No borrar archivos sin instrucción explícita del plan.
7. Backend builds: `$HOME/.dotnet/dotnet build apps/api/HealthHub.Api.csproj` (dotnet vive en `~/.dotnet`).

---

## OLA 1 — tres agentes en paralelo

### Workstream A — Backend: pagos, efectivo, trial (P2 + P3 + enablers de P4)

**Files (propiedad exclusiva de TODO `apps/api/**` y `scripts/test-api.mjs`):**
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/Contracts/ApiContracts.cs`
- Modify: `apps/api/Infrastructure/MappingExtensions.cs`
- Modify: `apps/api/Entities/Professional.cs` (campo `SubscriptionInterestAt`)
- Create: `apps/api/Migrations/202606120002_SubscriptionInterest.cs` (patrón SQL idempotente IF NOT EXISTS, con `Down`)
- Modify: `scripts/test-api.mjs`

**Contratos a implementar:**

- [ ] **A1. DTOs de cita exponen pago.** Agregar a los DTOs de appointment (los que consumen ambos portales): `paymentStatus` (`"none"|"pending"|"approved"|"rejected"|"refunded"`, del último `Payment` de la cita; `"none"` si no hay) y `paymentProvider` (`"mercadopago"|"cash"|null`). Leer `Payment.cs` primero para los nombres reales de columnas.
- [ ] **A2. `POST /api/appointments/{id}/cash-payment`** — registrar cobro en efectivo. Solo el profesional dueño de la cita (o admin con alcance, mismo patrón `GetUserFromRequestAsync` del resto). Cita en `scheduled|confirmed|completed`; rechazar con 400 si ya existe Payment `approved`. Crea Payment: monto = precio del servicio (400 si la cita no tiene servicio/precio), `provider="cash"`, status `approved`, comisión 0, `ProfessionalAmount` = monto, `TransferStatus="none"`. Si la cita estaba `scheduled` → pasa a `confirmed` (+ notificaciones como las demás transiciones). Auditar (`payment.cash.registered`). Idempotente.
- [ ] **A3. `GET /api/professional-portal/payments?month=YYYY-MM`** — estado de cuenta del profesional autenticado (default: mes actual). Respuesta: `items[]` (fecha, paciente, servicio, monto bruto, comisión, neto, provider, status) + `summary` (`grossTotal`, `commissionTotal`, `netTotal`, `cashTotal`, `onlineTotal`, `count`). Solo pagos de SUS citas. Auditado como lectura.
- [ ] **A4. `GET /api/professional-portal/subscription`** — `{ trialStartedAt, trialEndsAt, daysLeft, status: "trial"|"expired", interestRegisteredAt, plans: [{name:"Básico", monthlyPrice:399, currency:"MXN", features:[...]}, {name:"Pro", monthlyPrice:699, ...}] }`. Trial = `User.CreatedAt + 14 días` (verificar nombre real del campo; daysLeft con clamp ≥ 0). Features según `modelo_de_negocio.md` líneas 64-65.
- [ ] **A5. `POST /api/professional-portal/subscription/interest`** — registra interés de compra: `Professional.SubscriptionInterestAt = now` (migración nueva), idempotente, audit `subscription.interest`, `Notification` a usuarios `internal_admin`. Devuelve el DTO de A4.
- [ ] **A6. Pruebas en `test-api.mjs`**: cash-payment (401 sin sesión / 403 cita ajena / 200 y cita confirmed / repetido 400), payments list (200 con summary correcto tras el cash payment; paciente 403), subscription (200 con daysLeft; interest 200 idempotente + notificación creada). Seguir el estilo/secciones existentes del script.
- [ ] **A7. Verificar**: `dotnet build` 0 errores → levantar API en :5050 con `ConnectionStrings__HealthHubDb='Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev'` y `ASPNETCORE_ENVIRONMENT=Development` → `npm run test:api` verde (dos corridas) → apagar API.

**Prohibido:** tocar `apps/web/**`. No tocar el webhook ni el flujo marketplace existente salvo lo mínimo de A1.

### Workstream B — Portal paciente: estados honestos + pantalla de éxito (P4 frontend)

**Files (propiedad exclusiva):**
- Modify: `apps/web/app/portal-paciente/portal-patient-page-client.tsx`
- Modify: `apps/web/app/portal-paciente/pago/payment-result-page-client.tsx` (solo copy/acentos)
- Create (opcional): componentes nuevos SOLO dentro de `apps/web/app/portal-paciente/`

**Tareas:**
- [ ] **B1. Renombrar el flujo de solicitud.** Título del formulario y CTA "Confirmar cita" → "Solicitar cita". Texto auxiliar: "El profesional confirmará tu solicitud. Si pagas en línea, tu cita se confirma al instante."
- [ ] **B2. Estados vía glosario.** Toda etiqueta de estado de cita en "Mis citas" usa `citaStatusUiFor` + `StatusPill` (el badge "Programada" desaparece; `scheduled` se muestra "Por confirmar"). Badge secundario de pago con `pagoStatusUiFor(appointment)` (degrada a "Sin pagar" si la API aún no manda el campo).
- [ ] **B3. Pantalla/panel de éxito post-solicitud**: al crear la cita, en lugar de volver silenciosamente a la lista, mostrar panel de confirmación con resumen (profesional, servicio, fecha/hora, modalidad, precio si está disponible en los datos ya cargados, estado "Por confirmar"), pasos siguientes y acciones: "Pagar ahora" (si hay servicio con precio — reusar `startAppointmentCheckout` ya existente en el store) y "Ver mis citas".
- [ ] **B4. Above the fold**: la sección "Tu próxima cita" (próxima cita futura con sus dos badges y CTA de pago si aplica) se muestra ANTES del buscador de profesionales cuando el paciente tiene citas. Renombrar "Expedientes visibles" → "Mis documentos".
- [ ] **B5. Copy y acentos** en todos los archivos propios.
- [ ] **B6. Verificar**: `cd apps/web && npx tsc --noEmit` sin errores.

**Prohibido:** editar `lib/healthhub-store.ts`, `lib/demo-data.ts`, `lib/appointment-states.ts`, `components/**`, cualquier ruta fuera de `portal-paciente/`. Si falta un dato/acción del store: degradar con elegancia y reportarlo.

### Workstream C — Home unificado del profesional (P1)

**Files (propiedad exclusiva):**
- Modify: `apps/web/app/page.tsx` (+ su client component si existe dentro del mismo archivo/carpeta)
- Modify: `apps/web/app/portal-profesional/professional-portal-page-client.tsx`
- Modify: `apps/web/components/app-shell.tsx`
- Modify: `apps/web/lib/healthhub-store.ts` (solo si es estrictamente necesario)
- Modify: `apps/web/lib/demo-data.ts` (solo para retirar los datos demo de "Trabajo pendiente")

**Tareas:**
- [ ] **C1. El home (`/`) se convierte en el centro de operación**: (1) si el perfil no está publicado, el checklist de publicación arriba (datos de `loadProfessionalOnboarding` ya en el store) + paso extra "Conecta Mercado Pago" leyendo `loadMarketplaceStatus` (no bloquea publicar; marca ✓ si status ≠ `not_connected`), con contador "N de 5 completados"; (2) sección "Hoy": citas de hoy con hora, paciente, servicio y DOS badges (cita + pago, vía glosario); (3) "Solicitudes por confirmar": citas `scheduled` futuras con acciones inline Confirmar/Rechazar (acciones de estado ya existentes en el store del portal profesional); (4) tarjetas resumen (citas de la semana, pacientes activos, completadas). Los datos vienen del dashboard profesional ya existente en el store.
- [ ] **C2. Eliminar la fuga de datos demo**: el panel "Trabajo pendiente" con Ana Martínez/Carlos Ruiz/Sofía León desaparece del home (y sus datos de `demo-data.ts` si solo los usa ese panel). El panel "Comunicación con pacientes" (disclaimer WhatsApp) se conserva con copy corregido.
- [ ] **C3. `portal-profesional` se convierte en "Configuración"**: conserva perfil editable, servicios, disponibilidad y el panel de Mercado Pago; PIERDE "Agenda propia", "Solicitudes entrantes" y las tarjetas de métricas (ahora viven en el home). Encabezado y descripción nuevos.
- [ ] **C4. Navegación en `app-shell.tsx`**: "Dashboard" → "Inicio"; "Portal profesional" → "Configuración"; eliminar el subtítulo "MVP operativo" bajo el logo (dejar solo "Clinixa"). No tocar la matriz de roles.
- [ ] **C5. Copy y acentos** en todos los archivos propios (incluye stat cards: "Pendientes por atender/Relacionados al perfil/Historial cerrado" → lenguaje claro).
- [ ] **C6. Verificar**: `cd apps/web && npx tsc --noEmit` sin errores.

**Prohibido:** tocar `portal-paciente/**`, `apps/api/**`, `pacientes/**`, `agenda/**`, `expediente/**`, `seguridad/**`, `bienvenida/**`, `components/legal-footer.tsx`, `components/marketplace-panel.tsx` (se queda donde está, solo se monta en la nueva sección de Configuración).

---

## OLA 2 — dos agentes en paralelo (arranca cuando termina TODA la ola 1)

### Workstream D — UI de Cobros + Trial/Suscripción (P2 + P3 frontend)

**Files (propiedad exclusiva):**
- Modify: `apps/web/lib/healthhub-store.ts` (acciones nuevas: `loadProfessionalPayments`, `registerCashPayment`, `loadSubscription`, `registerSubscriptionInterest`)
- Modify: `apps/web/components/app-shell.tsx` (banner de trial)
- Modify: `apps/web/app/page.tsx` (tarjeta "Ingresos del mes" + botón "Registrar pago en efectivo" en citas del día/solicitudes)
- Modify: `apps/web/app/portal-profesional/professional-portal-page-client.tsx` (sección "Cobros": estado de cuenta del mes)
- Modify: `apps/web/components/marketplace-panel.tsx` (copy/acentos + mostrar desglose ejemplo "De una consulta de $X recibes $Y" usando `commissionPercentage` ya disponible)
- Create: `apps/web/app/suscripcion/page.tsx` + `apps/web/app/suscripcion/subscription-page-client.tsx`
- Modify: `apps/web/proxy.ts` SOLO si la ruta nueva lo exige (verificar patrón de rutas protegidas)

**Tareas:**
- [ ] **D1. Acciones del store** contra los endpoints de A2–A5 (mismos patrones fetch/auth del store).
- [ ] **D2. Sección "Cobros"** en Configuración: tabla del mes (fecha, paciente, servicio, bruto, comisión, neto, método con badge), summary (bruto/comisión/neto/efectivo/en línea) y selector de mes simple (mes actual / anterior).
- [ ] **D3. Home**: tarjeta "Ingresos del mes (neto)" con enlace a Cobros; botón "Registrar pago en efectivo" en cada cita sin pago aprobado (confirmación inline antes de ejecutar, toast/result junto al botón, refrescar datos al éxito).
- [ ] **D4. Banner de trial** en `app-shell` solo para rol profesional: trial activo → "Prueba gratuita: te quedan N días · Ver planes" (link `/suscripcion`); expirado → "Tu periodo de prueba terminó · Activa tu plan". Sin bloqueo duro en el piloto. Degradar (no mostrar nada) si el endpoint falla.
- [ ] **D5. Página `/suscripcion`**: tarjetas Básico $399 / Pro $699 (datos del endpoint, no hardcodear), estado del trial, CTA "Quiero activar mi plan" → `subscription/interest` → estado de éxito honesto ("Te contactaremos para activar tu plan durante el piloto"). Si ya registró interés, mostrarlo.
- [ ] **D6. Verificar**: `npx tsc --noEmit` sin errores.

**Prohibido:** tocar `portal-paciente/**` y todo lo que es del workstream E.

### Workstream E — Barrida de credibilidad (P5)

**Files (propiedad exclusiva):**
- Modify: `apps/web/app/bienvenida/page.tsx` · `app/sesion/session-page-client.tsx` · `app/pacientes/patients-page-client.tsx` · `app/pacientes/[id]/patient-profile-client.tsx` · `app/agenda/agenda-page-client.tsx` · `app/expediente/expediente-page-client.tsx` · `app/onboarding/onboarding-page-client.tsx` · `app/aceptar-invitacion/accept-invitation-client.tsx` · `app/seguridad/security-page-client.tsx` · `components/legal-footer.tsx` · `components/marketplace-admin-panel.tsx` · `components/page-header.tsx` · `components/user-menu.tsx`
- Create: `apps/web/lib/specialty-labels.ts` (mapa slug → etiqueta legible: `nutri/nutritionist` → "Nutrición", `psychologist` → "Psicología", `physiotherapist` → "Fisioterapia", `doctor` → "Medicina", fallback capitalizado)

**Tareas:**
- [ ] **E1. Acentos y ortografía** en TODO el copy de los archivos propios ("atencion"→"atención", "Sesion"→"Sesión", etc.).
- [ ] **E2. Footer legal**: mientras haya placeholders `[RAZON_SOCIAL]`/`[EMAIL_PRIVACIDAD]`, renderizar solo "© 2026 Clinixa" + enlaces legales (detectar `[` en el valor).
- [ ] **E3. UI muerta en perfil de paciente** (`pacientes/[id]`): quitar tarjeta "Conversación activa" (chat eliminado del producto), quitar botón "Resumir avances" (IA pospuesta a Fase 4), "Paciente creado desde API MVP." → copy neutro o nada, slug de especialidad crudo → `specialty-labels`.
- [ ] **E4. Landing honesta** (`bienvenida`): el hero ya no promete "comunicación segura"; propuesta real: agenda, expediente y cobros en un solo lugar. Ocultar "Acceso de desarrollo" fuera de Development (`process.env.NODE_ENV !== "production"` como condición de render).
- [ ] **E5. Empty states con CTA** en pacientes ("Aún no tienes pacientes. Crea el primero →" botón Nuevo paciente), agenda y expediente (icono + 1 línea + acción).
- [ ] **E6. Verificar**: `npx tsc --noEmit` sin errores.

**Prohibido:** tocar `app/page.tsx`, `portal-profesional/**`, `portal-paciente/**`, `app-shell.tsx`, `healthhub-store.ts`, `demo-data.ts`, `marketplace-panel.tsx`, `appointment-states.ts`, `apps/api/**`.

---

## OLA 3 — integración y verificación (orquestador)

- [ ] `npm run lint:web` y `npm run build:web` (correcciones menores inline; si hay rotura mayor → agente fixer).
- [ ] `dotnet build` + API arriba + `npm run test:api` (doble corrida).
- [ ] Verificación visual con preview (web :3000 + API :5050): home profesional unificado, flujo solicitar cita como paciente, cobro en efectivo, banner trial y `/suscripcion`.
- [ ] Actualizar `seguimiento-proyecto.md` con el avance.

## Fuera de alcance (decisiones registradas)

- **Auto-liberación de slots no pagados (TTL duro)**: contradice el flujo de efectivo (citas legítimas sin pago en línea). Se difiere a una política por-profesional post-piloto. La honestidad de estados (P4) se logra con etiquetas + confirmación manual/por pago.
- **Instalar shadcn/ui real, chips de horario tipo Doctoralia, Command ⌘K, rediseño de Expediente**: siguientes iteraciones.
- **Cobro real de la suscripción (MP Suscripciones)**: el CTA registra interés auditado — señal suficiente para el piloto.
