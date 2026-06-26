# Plan de Acción — Auditoría del Consejo (2026-06-25)

> **Origen:** auditoría integral de Clinixa realizada por un consejo de 5 revisores (Seguridad, Flujos, UI/UX, Arquitectura/Tech, Profesional de Salud) sobre el repo `FerHuCa/clinixa` y el sitio en producción `https://clinixa.mx`.
>
> **Estado del producto:** ya desplegado en Railway (web + API + Postgres). Por tanto, los puntos "críticos" de este plan deben resolverse **antes de abrir el piloto con datos reales de pacientes**, no antes de desplegar.
>
> **Seguimiento:** este plan se registra y se le dará seguimiento en `seguimiento-proyecto.md` (entrada de la sesión 2026-06-25). Cada paso se marca ahí conforme se completa.

---

## Resumen priorizado

| # | Acción | Prioridad | Esfuerzo | Lente |
|---|--------|-----------|----------|-------|
| 1 | Purgar datos demo y cuentas con password fijo de producción | 🚨 Crítico | S (½–1 día) | Tech / Seguridad |
| 2 | Anonimizar reseñas públicas (iniciales) | 🚨 Crítico | S (1–2 h) | Seguridad |
| 3 | Cifrar PHI clínica en reposo (notas SOAP / expediente) | 🚨 Crítico | M (2–3 días) | Seguridad / Compliance |
| 4 | Quitar auto-elevación de rol + gatear acciones clínicas a cédula verificada | 🚨 Crítico | M (1–2 días) | Seguridad / Clínico |
| 5 | Recetas legalmente válidas y exportables (PDF) | 🚨 Crítico | L (3–5 días) | Clínico / Legal |
| 6 | Corregir bloqueadores de accesibilidad | ⚠️ Alta | S–M (1–2 días) | UI/UX |
| 7 | Higiene de seguridad (rotar secreto, hardening API/headers) | ⚠️ Alta | S–M (1 día) | Seguridad |
| 8 | Decidir monetización (checkout real vs. piloto solo trial) | ⚠️ Media | M–L | Flujos / Negocio |
| 9 | Routing por rol + redirect de logout + cola de verificación | ⚠️ Media | M | Flujos |
| 10 | Suite de pruebas de autorización y refactor de `Program.cs` | ⚠️ Media | L (continuo) | Tech |

Leyenda esfuerzo: **S** ≈ horas/medio día · **M** ≈ 1–3 días · **L** ≈ 3–5+ días.

---

## 🚨 Críticos — antes del piloto con pacientes reales

### 1. Purgar datos demo y cuentas con password fijo de producción
- **Problema:** `DatabaseSeeder.cs:13-21` ejecuta `SeedClinicalDemo` en el arranque sin gatear por `IsDevelopment()`, e inserta usuarios demo con password fijo `healthhub123` (`DatabaseSeeder.cs:9`). **Confirmado en vivo:** `https://clinixa.mx/profesionales` lista perfiles semilla (`dr-miguel-torres`, `dr-andres-campos`, `dra-laura-vega`, `psic-nora-ibarra`).
- **Acciones:** gatear todo `Seed*Demo*` tras `IsDevelopment()`; eliminar la ruta de password fijo en builds de prod; borrar de la BD de producción pacientes/profesionales/usuarios semilla (conservar solo datos reales y `SeedCommissionTiers`).
- **Definición de Hecho:** BD de prod sin registros demo; `/profesionales` solo muestra perfiles reales y verificados; el seeder clínico no corre en prod.

### 2. Anonimizar reseñas públicas
- **Problema:** `Program.cs:1882` guarda `review.PatientName = actor.Patient.FullName` y el endpoint público `GET /api/professionals/{id}/reviews` lo devuelve íntegro. Permite enumerar por nombre completo a pacientes de un psicólogo/especialista → vínculo persona↔condición de salud (CWE-359). *Nota: ya estaba anotado como "gap menor" en `seguimiento-proyecto.md`; esta auditoría lo eleva a crítico por exponer el nombre completo.*
- **Acciones:** que el DTO público devuelva solo iniciales o nombre + inicial del apellido.
- **Definición de Hecho:** el endpoint público no expone el nombre completo; test que lo verifique.

### 3. Cifrar PHI clínica en reposo
- **Problema:** `SoapNote.cs:15-18` almacena Subjetivo/Objetivo/Evaluación/Plan como `string` plano; no hay `ValueConverter`/cifrado en `Data/` ni `Entities/`. Existe `TokenEncryptionService` (AES-GCM) pero solo cifra tokens OAuth de MercadoPago. Bajo la nueva LFPDPPP, los datos de salud son **sensibles**.
- **Acciones:** reutilizar `TokenEncryptionService` como `ValueConverter` de EF sobre las columnas de texto clínico (notas SOAP y `PatientRecord`); migrar datos existentes; mantener lectura/escritura transparente. Complementar con cifrado a nivel BD y credenciales restringidas.
- **Definición de Hecho:** verificado en la BD que el texto clínico aparece cifrado; la app lee/escribe sin cambios funcionales.

### 4. Quitar auto-elevación de rol y gatear acciones clínicas a cédula verificada
- **Problema:** `PATCH /api/me` (`Program.cs:214-240`) acepta `role` del body y auto-provisiona un `Professional` sin verificación (CWE-269). Además `GetAuthorizedProfessional` (`Program.cs:4151-4163`) valida solo la especialidad, nunca `VerificationStatus`: un profesional no verificado puede prescribir y documentar.
- **Acciones:** que `PATCH /api/me` ignore `role`; canalizar el onboarding profesional solo por el flujo verificado; exigir `VerificationStatus == "verified"` para crear receta y finalizar nota (403 si no).
- **Definición de Hecho:** un paciente no puede convertirse en profesional vía API; prescribir/finalizar requiere cédula verificada; tests cubren ambos casos.

### 5. Recetas legalmente válidas y exportables
- **Problema:** `Prescription.cs` no captura nombre + **cédula profesional** del prescriptor, bloque de identificación del paciente ni **vía de administración**; no hay ruta de impresión/PDF (`recetas` solo renderiza lista; export diferido en `Program.cs:3779-3780`). Una receta que el paciente no puede llevar a la farmacia no sirve clínicamente.
- **Acciones:** auto-estampar nombre + cédula + fecha del prescriptor y datos del paciente; añadir campo `Route` (vía); restringir la emisión al rol `doctor`; generar PDF imprimible. Sustancias controladas quedan **fuera de alcance** (documentar).
- **Definición de Hecho:** la receta generada incluye todos los elementos requeridos y se exporta a PDF; solo doctores pueden emitirla.

---

## ⚠️ Alta / Media — inmediatamente después

### 6. Corregir bloqueadores de accesibilidad
- **Problema:** 1 solo `aria-label` en 84 botones; sin indicador `:focus-visible` (inputs con `outline-none`); el menú de usuario no cierra con Escape ni maneja foco/`aria-expanded`. Texto `slate-400` de bajo contraste (268 usos).
- **Acciones:** regla global `:focus-visible` en `globals.css`; `aria-label` en botones de ícono y `aria-hidden` en íconos decorativos; Escape + foco atrapado/retornado + `aria-haspopup/expanded` en el dropdown; subir labels a `slate-600`.
- **Definición de Hecho:** navegación por teclado visible en toda la app; el menú es operable por teclado; sin errores críticos en una revisión WCAG rápida.

### 7. Higiene de seguridad (hardening)
- **Problema:** `RESEND_API_KEY` real en `.env` de trabajo (rotar); falta `UseExceptionHandler`/`UseHsts`/`UseForwardedHeaders` en la API; `next.config.mjs` vacío (sin CSP/X-Frame-Options).
- **Acciones:** rotar la clave Resend y mantener secretos solo en Railway; añadir `UseExceptionHandler` + ProblemDetails, `UseHsts`, `UseForwardedHeaders`; configurar y **verificar** headers de seguridad (HSTS, CSP, X-Frame-Options) en la respuesta de `clinixa.mx`.
- **Definición de Hecho:** clave rotada; errores no filtran stack traces; headers de seguridad presentes en la respuesta de producción.

### 8. Decidir monetización
- **Problema:** la suscripción no cobra ni bloquea: el trial "vence" a los 14 días pero nada restringe el acceso; la única acción solo registra interés (`Program.cs:2584-2639`).
- **Acciones:** o bien implementar checkout real de suscripción MercadoPago + gate al vencer el trial, o documentar explícitamente "piloto solo trial 14 días" con fecha de revisión.
- **Definición de Hecho:** existe checkout con gate de vencimiento, **o** decisión de alcance documentada en `seguimiento-proyecto.md`.

### 9. Routing por rol, redirect de logout y cola de verificación
- **Problema:** `proxy.ts` autentica pero no hace routing por rol (un paciente puede cargar shells del portal profesional; los datos siguen protegidos por la autorización a nivel de API). Logout sin `redirectUrl`. La verificación de cédula es manual sin cola/SLA/visibilidad (`Program.cs:1684-1713`).
- **Acciones:** redirigir paciente↔profesional según rol en `proxy.ts`; `signOut({ redirectUrl: "/bienvenida" })`; panel admin con cola de verificación y estado visible para el profesional.
- **Definición de Hecho:** un paciente es redirigido fuera de rutas profesionales; logout aterriza en `/bienvenida`; el profesional ve el estado de su verificación.

### 10. Pruebas de autorización y refactor de `Program.cs`
- **Problema:** `Program.cs` tiene ~5,510 líneas (75 endpoints, 64 helpers, auth resuelta 60×) y **cero pruebas automatizadas**; lo más riesgoso es la autorización por handler sin tests. Endpoints de listas sin paginación.
- **Acciones:** crear proyecto de pruebas de integración (`WebApplicationFactory` + Testcontainers Postgres) cubriendo `CanAccessPatientAsync` y ramas por rol; **después**, empezar a descomponer `Program.cs` en módulos por feature sin cambiar comportamiento; añadir paginación a las listas.
- **Definición de Hecho:** CI en verde con tests de autorización; primer módulo de endpoints extraído; listas principales paginadas.

---

## Notas de cierre

- Los puntos de compliance (1–5) están fundamentados en ingeniería, **no son asesoría legal**: confirmar con abogado en México. Marcos aplicables: **NOM-024-SSA3-2012** (seguridad/interoperabilidad del sistema, certificación CENETEC), **NOM-004-SSA3-2012** (contenido del expediente) y la **nueva LFPDPPP** vigente desde el 21-mar-2025 (datos de salud = sensibles, consentimiento expreso).
- Fortalezas a conservar mientras se ejecuta el plan: autorización a nivel de objeto sin IDOR, webhook de MercadoPago fail-closed e idempotente, modelo EF bien indexado, servicio de recordatorios 24h (email + WhatsApp), y la base de confianza (verificación de cédula + consentimiento explícito).
