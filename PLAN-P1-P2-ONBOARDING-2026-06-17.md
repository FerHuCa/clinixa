# Plan P1/P2 — Onboarding/Activación del profesional
**Fecha:** 2026-06-17 · **Origen:** `AUDIT-ONBOARDING-ACTIVACION-2026-06-15.md` §3
**Diseño:** Opus · **Ejecución:** 3 agentes Sonnet en paralelo, divididos por propiedad de archivo

## Contexto

El P0 (input de cédula + checklist en Configuración) ya está hecho (2026-06-17). Este plan cubre **P1** (experiencia mejorada) y **P2** (wizard guiado) del audit. Excluye explícitamente las preguntas abiertas R1–R6 (decisiones de producto / fuera de P1-P2), salvo R6 (constante compartida de especialidades) que se folda en P1-5 por ser trivial y reducir deuda.

## División por propiedad de archivo (sin colisiones)

| Agente | Dominio | Archivos propios |
|--------|---------|------------------|
| **A** (Sonnet) | Frontend UX de onboarding | `app/portal-profesional/professional-portal-page-client.tsx`, `app/page.tsx`, `app/onboarding/onboarding-page-client.tsx`, NUEVO `components/onboarding-checklist.tsx`, `lib/specialty-labels.ts` |
| **B** (Sonnet) | Backend email de verificación | `apps/api/Program.cs` (solo PATCH profile) |
| **C** (Sonnet) | Wizard + shell | NUEVOS `app/activacion/*`, `components/app-shell.tsx` |

`healthhub-store.ts` **no se edita** (todas las acciones necesarias ya existen). Cero archivos compartidos entre agentes. El único acoplamiento es por *string href*: A apunta el redirect de onboarding a `/activacion`, C crea esa ruta — se resuelve al hacer build conjunto.

---

## Agente A — Frontend UX de onboarding (P1-1, P1-2, P1-3, P1-5)

- **P1-1** — Mostrar `onboarding.missing[]` proactivamente (lista con bullets) bajo el botón "Publicar perfil" en **ambas** páginas (Inicio `page.tsx` y Configuración `professional-portal-page-client.tsx`), no solo como error post-click.
- **P1-2** — En el ítem "Cédula verificada" del checklist, sub-texto: *"Ingresa tu número de cédula en Configuración. El equipo de Clinixa la revisará manualmente (1-2 días hábiles)."*
- **P1-3** — Anclas `id="servicios"` e `id="disponibilidad"` en los paneles de `professional-portal-page-client.tsx`; deep-links desde los pasos del checklist (`/portal-profesional#servicios`, `#disponibilidad`).
- **P1-5 / R6** — Extraer `SPECIALTY_OPTIONS` exportado en `lib/specialty-labels.ts` (slug + label) y usarlo en los `<select>` de onboarding y de Configuración para unificar labels (hoy "other" muestra "Salud" en uno y otro label).
- Extraer componente reutilizable `components/onboarding-checklist.tsx` y consumirlo en Inicio y Configuración (DRY del P0).
- Redirect: en `onboarding-page-client.tsx`, cuando el rol es profesional y NO está publicado, redirigir a `/activacion` en lugar de `/portal-profesional` (líneas ~76 y ~124).

## Agente B — Backend email de verificación (P1-4)

- En `Program.cs`, dentro del `PATCH /api/professional-portal/profile`, en el bloque donde `VerificationStatus` cambia a `"pending"` (cuando se actualiza `LicenseNumber`), enviar email best-effort al profesional: *"Tu cédula está en revisión"*.
- Inyectar `EmailSender emailSender` en la firma del handler (patrón existente: ver `appointmentsApi.MapPatch(...)`).
- Agregar `EmailSender.BuildVerificationPendingEmail(displayName)` estático (espejo de `BuildInvitationEmail`).
- Best-effort: no debe romper el PATCH si el email falla (el `SendAsync` ya degrada a simulado). Auditar con `professional_license.verification.email.{sent|simulated|failed}` si es trivial.

## Agente C — Wizard de activación + progreso en shell (P2-1, P2-2)

- **P2-1** — Nueva ruta `app/activacion/` (`page.tsx` + `activacion-page-client.tsx`): wizard de 4 pasos secuenciales reusando acciones del store (todas ya existen):
  1. Perfil (bio, ubicación) → `updateProfessionalProfile`
  2. Primer servicio → `createProfessionalService`
  3. Disponibilidad → `createProfessionalAvailability`
  4. Cédula + estado de verificación (explica el proceso manual) → `updateProfessionalProfile`
  - Stepper visual con "Paso N de 4". Botón "Ir al portal" siempre visible (wizard **saltable** — decisión: no bloqueante, para no frustrar a profesionales por invitación). Al completar los 4 → botón "Publicar perfil" si `canPublish`, o mensaje de qué falta.
  - Usar `loadProfessionalOnboarding` para marcar pasos ya cumplidos al entrar (idempotente si el profesional vuelve).
- **P2-2** — En `components/app-shell.tsx`, para profesionales con `!isPublished`, indicador pequeño en la barra lateral ("Activación: N/4") enlazando a `/activacion`. Cargar `loadProfessionalOnboarding` una sola vez en el shell.

---

## Verificación final (post-merge de los 3 agentes)

```bash
npm run build:api    # 0 errores
npm run lint:web     # limpio
cd apps/web && npx tsc --noEmit   # limpio
npm run build:web    # incluye nueva ruta /activacion
npm run smoke:api    # 31/31 (no debe regresar)
```

Verificación visual (servicios ya levantados :3000/:5050): login Laura Vega → `/activacion` muestra wizard; Configuración muestra `missing[]` + anclas; shell muestra "Activación: N/4".
