# Auditoría: Onboarding → Activación → Go Live (Publicar)
**Fecha:** 2026-06-15  
**Alcance:** flujo completo del profesional desde sign-up hasta que su perfil queda visible para pacientes  
**Tipo:** read-only — no se modificó ningún archivo  

---

## 1. Estado actual — cómo funciona el flujo hoy

### 1.1 Sign-up y selección de rol

**Archivo:** `apps/web/app/sign-up/[[...sign-up]]/page.tsx`

El profesional elige su tipo de cuenta (Paciente / Profesional) antes de completar el formulario de Clerk. La selección se pasa como `unsafeMetadata={{ role }}` al componente `<SignUp>`. Tras crear la cuenta en Clerk, Clerk redirige a `/onboarding` (`fallbackRedirectUrl="/onboarding"`).

No se solicita especialidad en este paso.

### 1.2 Onboarding inicial (un solo formulario)

**Archivo:** `apps/web/app/onboarding/onboarding-page-client.tsx`

Un formulario de una sola pantalla que captura:
- Nombre completo
- Rol (Paciente / Profesional) — puede cambiar el rol elegido en sign-up
- Especialidad — solo si el rol es Profesional; campo requerido; opciones: Medicina General, Psicología, Fisioterapia, Nutrición, Otra
- Consentimientos: Aviso de Privacidad + tratamiento de datos (dos checkboxes)

Al enviar, el cliente llama a `PATCH /api/me` con `{ fullName, role, specialty }` y luego `POST /api/me/consent`. El backend en `/api/me` (Program.cs:185) crea el perfil de Professional (o Patient) si no existe, con `Status = "onboarding"` y `VerificationStatus = "pending"` (valor por defecto en la entidad: `Professional.cs:12`). La especialidad se normaliza y se guarda.

Tras el onboarding, el cliente redirige a `/portal-profesional` (alias "Configuración" en el nav).

**Esto ya funciona:** la especialidad se captura en el onboarding y se guarda en `Professional.Specialty`.

### 1.3 Portal del profesional — "Configuración"

**Archivo:** `apps/web/app/portal-profesional/professional-portal-page-client.tsx`  
**Route:** `/portal-profesional` (nav label: "Configuración", icono Settings)

Al cargar, el cliente ejecuta en paralelo:
- `GET /api/professional-portal/dashboard` — devuelve el `ProfessionalDto` completo con servicios, disponibilidad y citas
- `GET /api/professional-portal/onboarding` — devuelve `ProfessionalOnboardingDto` con las flags `profileComplete`, `hasServices`, `hasAvailability`, `canPublish`, `isPublished` y la lista `missing`

La página muestra un banner amber si `!onboarding.isPublished` con el botón "Publicar perfil" (deshabilitado si `!onboarding.canPublish`). El banner incluye un enlace a Inicio ("Revisa tus pasos pendientes en Inicio").

Los paneles disponibles en la página son:
1. **Perfil profesional** — nombre para mostrar, bio, ubicación, especialidad, modalidad, precio base, WhatsApp. El campo cédula está en el contrato `UpdateProfessionalProfileRequest.LicenseNumber` pero **no está expuesto en la UI** del portal; solo es visible en el panel de verificación de seguridad.
2. **Marketplace (Mercado Pago)** — componente `<MarketplacePanel>`, conectar cuenta de cobros en línea
3. **Servicios** — agregar/editar servicios (nombre, descripción, duración, precio, modalidad)
4. **Disponibilidad** — agregar/editar franjas semanales (día, hora inicio, hora fin)
5. **Cobros** — estado de cuenta mensual

### 1.4 Lógica de publicación (backend)

**Archivo:** `apps/api/Program.cs:4531` — `BuildOnboardingStatus`

Los cuatro requisitos para publicar:
1. `profileComplete`: `Location` no vacío AND `Bio.Length >= 20` AND bio no empieza con "Perfil creado desde una invitacion"
2. `hasServices`: al menos un `ProfessionalService` con `Status = "active"`
3. `hasAvailability`: al menos una `ProfessionalAvailability` con `Status = "active"`
4. `VerificationStatus == "verified"` — bloqueante; sin esto el profesional **nunca puede publicar**

`POST /api/professional-portal/publish` (Program.cs:2170) solo cambia `Professional.Status = "active"` si `canPublish == true`. Si algún requisito falta, devuelve 400 con `errors[]` con mensajes en español.

### 1.5 Verificación de cédula (proceso admin)

La verificación es manual. El admin con rol `internal_admin` accede a `/seguridad` > panel "Verificación de cédulas" (`apps/web/app/seguridad/security-page-client.tsx:536`), que consume `GET /api/admin/professionals`. Puede aprobar o rechazar con motivo. El endpoint de acción es `PATCH /api/professionals/{id}/verification` (Program.cs:1571), solo accesible para `internal_admin`.

Cuando la verificación se revoca (pasa de `verified` a otro estado), el perfil vuelve a `Status = "onboarding"` automáticamente (Program.cs:1609).

El profesional **no puede ingresar su cédula** desde ningún formulario de la UI del portal (el campo `licenseNumber` en `UpdateProfessionalProfileRequest` existe en el contrato pero no está mapeado en el frontend). La cédula solo llega al sistema a través de la invitación de clínica (`/aceptar-invitacion`) o mediante el seeder.

### 1.6 Checklist en Inicio (home)

**Archivo:** `apps/web/app/page.tsx:263`

Cuando el profesional aterriza en Inicio (`/`) y no está publicado, se muestra un bloque "Publica tu perfil para recibir pacientes" con:
- Checklist de 5 pasos (profile, services, availability, cédula verificada, Mercado Pago)
- Contador "X de 5 completados"
- Botón "Publicar perfil" (deshabilitado si `!onboarding.canPublish`)
- Enlace "Completar pasos en Configuración" → `/portal-profesional`

El paso de Mercado Pago se marca explícitamente como no requisito para publicar.

---

## 2. Huecos y bugs

### HUE-01. No existe un wizard de activación guiado (brecha principal)

El flujo actual lleva al profesional de /onboarding directo al portal completo (página de "Configuración") sin ninguna guía paso a paso. El profesional debe adivinar qué hacer. Los pasos están fragmentados en tres superficies distintas: `/onboarding` (nombre, rol, especialidad, consents), `Inicio` (checklist informativo), y `/portal-profesional` (todos los formularios mezclados). No existe una secuencia wizard que lleve al profesional por los pasos 1-2-3-4 en orden.

**Evidencia:** no existe ningún componente de wizard/stepper en `apps/web`; la función `checklistSteps` en `page.tsx:263` es solo informativa, no es navegable.

### HUE-02. La cédula profesional no tiene UI de entrada

`LicenseNumber` en `UpdateProfessionalProfileRequest` existe (Program.cs:2146-2155), cambia `VerificationStatus` a `"pending"` al actualizarse, y es requisito para publicar (vía `VerificationStatus != "verified"`). Pero no hay ningún campo de texto para la cédula en `professional-portal-page-client.tsx`. El profesional que se registra por sign-up público (no por invitación) llega con `LicenseNumber = "Por verificar"` (Program.cs:4182) y nunca puede modificarla.

**Evidencia:** `professional-portal-page-client.tsx` no incluye ningún input para `licenseNumber`; el `profileDraft` (líneas 22-32) no tiene el campo.

### HUE-03. El bloqueo de publicación por cédula es opaco

El banner de borrador dice "Tu perfil está en modo borrador. Revisa tus pasos pendientes en Inicio." El mensaje `missing[]` del backend ("Tu cédula profesional está en revisión. No puedes publicar tu perfil hasta que sea verificada.") aparece como error solo cuando alguien clickea "Publicar perfil" y el POST falla — no como indicación proactiva de lo que falta. El checklist en Inicio sí muestra "Cédula profesional verificada por HealthHub" pero no explica cómo activar esa verificación ni qué debe hacer el profesional.

**Evidencia:** `page.tsx:268` muestra el paso de cédula pero sin call-to-action; `professional-portal-page-client.tsx:386-406` muestra el banner sin lista de pasos.

### HUE-04. La disponibilidad está enterrada en la segunda columna de Configuración

El panel de disponibilidad está en la columna derecha de `/portal-profesional`, por debajo de "Servicios". No hay ninguna indicación visual de que este es un paso requerido para publicar, más allá del texto estático "Aún no defines tu disponibilidad". No existe un indicador de "paso 3 de 4" ni un enlace directo desde el checklist de Inicio hacia la sección exacta.

**Evidencia:** `professional-portal-page-client.tsx:709` — el panel de disponibilidad es el cuarto panel en la página sin ningún marcador de requerido.

### HUE-05. "Configuración" no tiene indicador de progreso

El banner "modo borrador" en `/portal-profesional` (líneas 385-407) es un bloque de texto amber genérico. No lista los pasos pendientes (a diferencia de Inicio). El profesional que llega directamente a Configuración no ve cuántos pasos le faltan ni cuáles son.

**Evidencia:** la página de Inicio tiene `checklistSteps` y contadores (page.tsx:263-275); la página de Configuración no los reutiliza.

### HUE-06. La especialidad puede desincronizarse

En el onboarding, la especialidad se guarda en `Professional.Specialty` vía `/api/me`. En el perfil de Configuración hay un `<select>` que también edita `specialty` vía `PATCH /api/professional-portal/profile`. Son dos caminos de edición independientes para el mismo campo. No hay un bug funcional, pero el select en Configuración muestra solo cinco opciones ("doctor", "psychologist", "physiotherapist", "nutritionist", "other") mientras que el onboarding muestra las mismas cinco con labels distintos. El valor "other" se guarda si se selecciona en onboarding pero el select muestra "Salud" para "other" — esto puede confundir.

**Evidencia:** `onboarding-page-client.tsx:23` vs `professional-portal-page-client.tsx:484-490`.

### HUE-07. No hay flujo de re-verificación tras rechazo

Cuando el admin rechaza una cédula, el profesional ve el mensaje "Tu cédula fue rechazada. Actualízala para solicitar una nueva revisión." (Program.cs:4559) — pero no hay ningún campo en la UI donde pueda actualizar la cédula (HUE-02). El flujo queda en un callejón sin salida: el profesional no puede corregir su cédula desde el portal.

**Evidencia:** `professional-portal-page-client.tsx` no tiene campo `licenseNumber`; `Program.cs:2146` acepta el valor en el PATCH solo si se envía.

### HUE-08. El specialty elegido en sign-up puede no coincidir con el guardado

El rol se pasa como `unsafeMetadata` en Clerk (sign-up/page.tsx:100: `unsafeMetadata={{ role }}`), pero la especialidad no. La especialidad se captura solo en el formulario de onboarding. Si el flujo de Clerk falla antes del onboarding (timeout, cierre de ventana), el Professional se crea con `Specialty = "other"` (Program.cs:4181) sin que el profesional haya elegido nada. No hay recuperación automática de este estado.

### HUE-09. Sin feedback de tiempo de espera para verificación

Después de entregar su cédula (si se implementa HUE-02), el profesional queda bloqueado sin saber cuánto tiempo tarda la revisión ni si puede hacer algo. No hay email de confirmación de "tu solicitud de verificación está en revisión" (el sistema tiene EmailSender pero no hay un envío de correo en el path de cambio de VerificationStatus a "pending").

**Evidencia:** `PATCH /api/professional-portal/profile` (Program.cs:2162) cambia `VerificationStatus` a "pending" sin enviar email; no hay llamada a `emailSender` en ese bloque.

---

## 3. Plan priorizado

### P0 — Desbloqueadores críticos (un profesional nuevo no puede publicar sin estos)

**P0-1. Agregar campo de cédula en la UI del portal (build)**  
- Archivo: `apps/web/app/portal-profesional/professional-portal-page-client.tsx`
- Añadir `licenseNumber: string` al tipo `ProfileDraft` (línea 22) y al `setProfileDraft` inicial (línea 161)
- Añadir `<input>` para cédula dentro del Panel "Perfil profesional", justo antes del botón "Guardar perfil"
- Pasar `licenseNumber` en el objeto que llama a `updateProfessionalProfile` (la store ya acepta el campo: `healthhub-store.ts:1445`)
- Mostrar estado actual de verificación (`verificationStatus`) en un badge junto al campo
- PR size: ~30 líneas de JSX

**P0-2. Mostrar el checklist de pasos en la página de Configuración (build)**  
- Archivo: `apps/web/app/portal-profesional/professional-portal-page-client.tsx`
- El estado `onboarding` ya existe en la página (línea 111); reutilizar el patrón de `checklistSteps` de `page.tsx:263-275`
- Reemplazar el banner amber genérico (líneas 385-407) con el banner + lista de pasos pendientes + contador
- PR size: extraer un componente `<OnboardingChecklist onboarding={onboarding} />` que se use en ambas páginas; ~50 líneas

### P1 — Experiencia mejorada (profesional puede publicar, pero el flujo es áspero)

**P1-1. Exponer mensajes `missing[]` proactivamente antes de clickear "Publicar" (build)**  
- El array `onboarding.missing` ya viene del backend con los mensajes exactos
- Mostrarlo como lista con bullets debajo del botón "Publicar perfil" en ambas páginas (Inicio y Configuración), no solo como error post-intento
- Archivo: `apps/web/app/page.tsx` (ya tiene el banner amber) y `professional-portal-page-client.tsx`
- PR size: ~10 líneas adicionales en cada página

**P1-2. Añadir texto de orientación para el paso de verificación de cédula (build)**  
- Dentro del checklist, el ítem "Cédula verificada" debe incluir un sub-texto explicando el proceso: "Ingresa tu número de cédula en Configuración. El equipo de Clinixa la revisará manualmente. Puede tardar 1-2 días hábiles."
- Archivo: `apps/web/app/page.tsx:268` y el nuevo `<OnboardingChecklist>`
- PR size: ~5 líneas

**P1-3. Añadir enlace desde checklist a la sección exacta (build)**  
- El enlace "Completar pasos en Configuración" → `/portal-profesional` es genérico. Añadir enlace directo a `/portal-profesional#servicios` y `/portal-profesional#disponibilidad` desde los pasos relevantes del checklist
- Requiere añadir `id="servicios"` y `id="disponibilidad"` a los paneles en `professional-portal-page-client.tsx`
- PR size: ~8 líneas

**P1-4. Añadir notificación por email al cambiar a "pending" (build, backend)**  
- Archivo: `apps/api/Program.cs:2162` — después de `professional.VerificationStatus = "pending"`, enviar email al profesional informando que su cédula está en revisión
- El `EmailSender` ya está disponible como servicio DI en otros endpoints (buscar el patrón en los endpoints de citas)
- PR size: ~15 líneas en Program.cs + plantilla de email

**P1-5. Verificar que la especialidad elegida en onboarding aparezca correcta en Configuración (verify-only)**  
- Verificar manualmente que seleccionar "Medicina General" en onboarding resulta en `specialty = "doctor"` guardado, y que el select en Configuración muestre la opción correcta
- Si hay discrepancia con el label "other" → "Salud", unificar labels entre `onboarding-page-client.tsx:23-28` y `professional-portal-page-client.tsx:484-490`
- PR size: mínimo (~3 líneas de label)

### P2 — Wizard guiado (mejora UX mayor, requiere decisión de producto)

**P2-1. Wizard post-onboarding (build)**  
- Nueva ruta: `apps/web/app/activacion/page.tsx` — un wizard de 4 pasos secuenciales
  - Paso 1: Completar perfil (bio, ubicación) — `PATCH /api/professional-portal/profile`
  - Paso 2: Agregar primer servicio — `POST /api/professional-portal/services`
  - Paso 3: Definir disponibilidad — `POST /api/professional-portal/availability`
  - Paso 4: Ingresar cédula + estado de verificación (explicar el proceso manual)
- Redirigir desde `/onboarding` a `/activacion` en lugar de directamente a `/portal-profesional` cuando `!onboarding.isPublished`
- Requiere decisión de producto: ¿el wizard es obligatorio o saltable? ¿se vuelve a mostrar si el profesional sale y vuelve?
- PR size: ~200-300 líneas (componente nuevo + lógica de pasos)

**P2-2. Indicador de progreso persistente en app-shell (build)**  
- Para profesionales con `!isPublished`, mostrar un indicador de progreso pequeño en la barra lateral (e.g., "Activación: 2/4 pasos")
- Archivo: `apps/web/components/app-shell.tsx` — el shell ya tiene acceso al store y podría cargar `loadProfessionalOnboarding` una sola vez
- Requiere decisión: ¿cargar el onboarding en el shell es aceptable en cuanto a performance? Actualmente se carga por separado en `page.tsx` y `professional-portal-page-client.tsx`

---

## 4. Riesgos y preguntas abiertas

**R1. El paso de verificación de cédula es un cuello de botella humano sin SLA definido**  
El modelo actual requiere que un `internal_admin` verifique manualmente cada cédula antes de que el profesional pueda publicar. Si el volumen crece, o si el primer admin tarda horas/días, el profesional queda bloqueado. Preguntas: ¿hay un SLA de respuesta? ¿hay un mecanismo de auto-verificación contra RENIECYT/Cédula MX en el futuro? ¿se puede permitir una publicación temporal "pendiente de verificación" con disclaimer para pacientes?

**R2. El wizard es saltable vs. obligatorio — decisión de producto pendiente**  
Si el wizard es saltable, el profesional puede llegar al portal completo sin completar ningún paso. Si es obligatorio, puede frustrar a profesionales con cuenta de invitación de clínica (que llegan con cédula pre-cargada y ya más adelantados). El backlog item no especifica esto.

**R3. El specialty "other" es un callejón sin salida de especialidad**  
El sistema tiene módulos específicos por especialidad (`/recetas`, `/tareas-paciente`, `/nutricion`) que se muestran en el nav solo según `currentUser.specialty`. Un profesional con `specialty = "other"` no ve ninguno de esos módulos. ¿Es intencional? ¿Se le debería preguntar al profesional si su especialidad corresponde a alguna de las disponibles, o crear una lista más amplia?

**R4. Sin mecanismo de soft-delete de disponibilidad desde la UI**  
El panel de disponibilidad permite agregar y editar franjas, pero no eliminarlas. `BuildOnboardingStatus` verifica que haya al menos una franja activa. Si un profesional agrega una franja incorrecta, no puede eliminarla. Esto puede dejar disponibilidad "sucia" y bloquear la UX. Falta un endpoint `DELETE /api/professional-portal/availability/{id}` y el botón correspondiente.

**R5. El VerificationStatus puede ser "pending" para perfiles creados por invitación sin LicenseNumber válido**  
Perfiles creados por invitación de clínica pueden tener `LicenseNumber = "Por definir"` (Program.cs:2901). El admin de verificación verá "Por definir" como cédula y no podrá verificarla. ¿Se debe bloquear la invitación si no trae cédula? ¿O existe un flujo de "completar cédula post-invitación"?

**R6. Dos fuentes de verdad para la lista de especialidades**  
`SPECIALTIES` en `onboarding-page-client.tsx` y las `<option>` en `professional-portal-page-client.tsx` están definidas por separado y deben mantenerse en sync manualmente. Se recomienda extraer a una constante compartida en `apps/web/lib/specialty-labels.ts` (que ya existe para otras funciones).

---

*Fin del documento de auditoría.*
