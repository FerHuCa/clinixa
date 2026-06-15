# Comentarios y recomendaciones — Claude
Fecha: 2026-06-07

> Decision vigente desde 2026-06-09: toda integracion con IA, OpenAI, Whisper, resumenes y generacion asistida de notas SOAP se mueve a la fase de IA (hoy **Fase 4**, tras la renumeracion de `modelo_de_negocio.md` v2.0). Las recomendaciones anteriores que la colocan dentro del MVP o como prioridad inmediata quedan reemplazadas por esta decision.

> **Nota (2026-06-09):** este documento es registro histórico. Los precios ($499/$999/$2,999), la comisión "2–3%" y la numeración de fases que aparecen abajo fueron reemplazados por `modelo_de_negocio.md` v2.0: Básico $399 · Pro $699 · Clínica $1,299 + $349/asiento · comisión 2.5% · trial 14 días · Fases: 2 = Monetización, 3 = Retención, 4 = IA, 5 = Marketplace. Además, el chat propio fue eliminado (lo sustituye la conexión WhatsApp por profesional: wa.me en Básico, Business API en Pro) y el piloto se amplió a psicólogos, nutriólogos y fisioterapeutas, con médicos al lanzamiento tras revisión NOM-004.

---

## Estado general del proyecto

El proyecto está en mejor forma de lo que parece para tener 2-3 días de trabajo. La base técnica es sólida y el modelo de datos ya soporta la mayoría de los flujos de negocio relevantes. El riesgo principal no es técnico, es de secuencia: hay decisiones de producto y monetización que si no se toman pronto van a generar retrabajo en la arquitectura.

---

## Lo que está bien y no hay que tocar

- Separación `users` / `patients` / `professionals` — decisión correcta. Evita acoplamiento clínico-autenticación.
- Migraciones EF Core versionadas — bien hecho, no volver a `EnsureCreated`.
- Modelo de `clinic_memberships` + `clinic_invitations` — soporta el flujo B2B sin sobreingeniería.
- `audit_logs` desde el inicio — necesario para cumplimiento NOM-024 y eventual certificación.
- `professional_services` con precio y duración — modelo de datos listo para cobrar, solo falta la integración de pagos.
- `notification_preferences` por canal — el modelo está bien, solo falta conectarlo a envíos reales.
- Suite de pruebas `test-api.mjs` — mantenerla y extenderla con cada módulo nuevo.

---

## Deuda técnica que hay que pagar antes de usuarios reales

### Crítica (antes de primer usuario de pago)

1. **Autenticación para producción**
   - Los tokens bearer actuales no tienen refresh robusto ni cookies httpOnly.
   - Recomendación: integrar Clerk. Tiene SDK para Next.js y .NET, maneja MFA, magic links y social login. Costo insignificante al inicio. Alternativa si se quiere control total: JWT con refresh tokens en httpOnly cookies.
   - No usar Azure AD B2C todavía — es para etapa empresarial/clínicas grandes.

2. **Variables de entorno y secretos**
   - El `appsettings.json` tiene la cadena de conexión con contraseña en texto plano.
   - Antes de cualquier deploy: Azure Key Vault para producción, `.env.local` para desarrollo, nunca credenciales en el repo.

3. **CORS en producción**
   - El `Program.cs` solo tiene `localhost:3000` y `localhost:3001` en la política CORS.
   - Necesita configuración dinámica por ambiente antes de deploy.

4. **`Program 2.cs` en el repositorio**
   - Hay un archivo `apps/api/Program 2.cs` que fue excluido del build manualmente.
   - Eliminarlo del repo para no generar confusión.

### Importante (antes de escalar)

5. **Reemplazar `EnsureCreated` residual**
   - Según las notas, `DatabaseSchema.EnsurePortalSchemaAsync` todavía existe como puente temporal.
   - Reemplazarlo completamente por migraciones antes de cualquier dato real.

6. **No hay rate limiting en la API**
   - Los endpoints de login y reservas son vulnerables a fuerza bruta y abuso.
   - Agregar rate limiting con `AspNetCoreRateLimit` o middleware propio.

7. **Vulnerabilidad moderada en PostCSS / Next.js**
   - Documentada en el seguimiento. Monitorear actualizaciones de Next.js; no bloquea el MVP pero hay que resolverla en la siguiente actualización de dependencias.

---

## Modelo de negocio — anotaciones

### La oportunidad real es un marketplace de dos lados

El proyecto no es solo un CRM médico con suscripción. Ya tiene búsqueda de profesionales, perfiles públicos, reviews y agendamiento desde el lado del paciente. Eso es un marketplace. Los marketplaces tienen ventajas defensivas que el SaaS puro no tiene.

Implicación práctica: las páginas de perfil de profesional deben ser públicas, indexables por Google y bien estructuradas semánticamente desde el inicio. URL tipo `/profesionales/laura-vega-psicologa-cdmx` + schema.org `MedicalBusiness` + reviews visibles = adquisición orgánica de pacientes sin costo.

### Pricing actual en business-model.md

Los precios están bien en orden de magnitud pero les falta estructura. Sugerencias:

| Plan | Precio actual | Precio sugerido | Razón |
|------|--------------|----------------|-------|
| Individual | $499 MXN/mes | $499 MXN/mes | OK |
| Pro | $999 MXN/mes | $999 MXN/mes | OK, diferenciarlo mejor con IA ilimitada |
| Clínica | $2,999 MXN/mes | $2,499 base + $399/profesional adicional | Escala mejor con el tamaño real de la clínica |
| Gratuito | No existe | $0, hasta 10 pacientes, sin IA | Gancho de adquisición |

Agregar comisión de transacción del 2–3% sobre pagos procesados en plataforma. Es la capa de ingresos que escala sin costo marginal.

### Fase 2: la IA puede evaluarse como límite de plan

Limitar generaciones SOAP en el plan Individual (ej. 30/mes) y desbloquear ilimitado en Pro. Esto crea presión de upgrade natural cuando el profesional crece.

---

## Roadmap recomendado por prioridad de impacto en ingresos

### Fase A — Desbloquear cobro (2-3 semanas)

1. Integración Mercado Pago — cobro de citas online desde el portal paciente.
   - API ya tiene `professional_service_id` con precio. El modelo de datos está listo.
   - Priorizar Mercado Pago sobre Stripe para México: cubre OXXO, SPEI y tarjeta.
   - Flujo: paciente selecciona cita → paga → `appointment.status = confirmed` automáticamente.

2. Onboarding autónomo del profesional.
   - Hoy no existe forma de que alguien se registre sin intervención manual.
   - Flujo necesario: signup → verificar email → completar perfil profesional → definir servicios → configurar disponibilidad → publicar perfil.
   - Sin esto el producto no escala.

3. IA real con OpenAI. **Movido a Fase 2; no es parte de esta fase.**
   - Evaluar el proveedor, modelos y experiencia clínica después del piloto del MVP.
   - Incluir transcripción y borradores SOAP solo si la validación demuestra valor suficiente.

### Fase B — Retención y engagement (2-3 semanas)

4. Email transaccional con Resend.
   - Sin confirmaciones y recordatorios el sistema es invisible.
   - Eventos prioritarios: cita agendada, cita confirmada, recordatorio 24h antes, cita cancelada, nota clínica disponible.
   - Resend tiene SDK para Node.js y plantillas React.

5. Páginas públicas de profesionales (SEO).
   - URL pública, schema.org, reviews visibles, botón de agendar.
   - Costo de adquisición $0 a largo plazo.

6. Flujo completo de aceptar invitaciones de clínica.
   - Está pendiente desde el cierre del 2026-06-08.
   - Desbloquea el canal B2B: una clínica trae 3–10 profesionales de golpe.

### Fase C — Expansión de ingresos (1-2 meses)

7. WhatsApp Business API (Twilio o 360dialog).
   - Recordatorios de cita por WhatsApp reducen no-shows ~40%.
   - En México y LATAM es el canal más efectivo. Tasa de apertura 95% vs 20% email.
   - Conectar con `notification_preferences` que ya existe.

8. Video integrado (Daily.co).
   - Consultas online = profesionales en más ciudades = más volumen de transacciones.
   - Daily.co tiene precios por minuto y SDK React. Integración de 1-2 días.

9. Analytics del profesional.
   - Dashboard con ingresos, ocupación de agenda, pacientes activos vs inactivos, tasa de cancelación.
   - Necesario para justificar el plan Pro frente al Individual.

---

## Riesgos que hay que resolver antes de usuarios reales

### Privacidad y datos de salud en México

El proyecto maneja datos clínicos sensibles. NOM-024-SSA3-2012 regula los expedientes clínicos electrónicos en México. Puntos mínimos a cubrir:

- Aviso de privacidad con alcance de datos sensibles de salud (LFPDPPP).
- Consentimiento explícito del paciente para que el profesional acceda a su expediente.
- Los `audit_logs` ya existen — documentar que se usan para cumplimiento.
- Cifrado en tránsito (HTTPS) y en reposo (Azure Transparent Data Encryption ya incluido).
- No es necesaria certificación formal para el MVP, pero sí documentar la estrategia antes de usuarios reales.

### Fase 2: IA sin revisión humana

Cuando se habilite la Fase 2, la IA no debe guardar sin confirmación del profesional y la UI debe advertir que todo contenido generado requiere revisión.

### El chat no tiene cifrado de extremo a extremo

El chat actual usa SignalR sobre HTTPS, que protege en tránsito pero los mensajes están en texto plano en PostgreSQL. Para datos clínicos sensibles, en algún punto hay que decidir si se cifran los mensajes en reposo o si el chat se limita a coordinación administrativa (citas, indicaciones) y no a comunicación clínica sensible.

---

## Notas de arquitectura

- El `healthhub-store.ts` con `localStorage` como fallback es útil para el prototipo pero debe documentarse como temporal. En producción, el estado debe venir 100% de la API.
- El seeding actual siembra datos demo mezclados con la lógica de migración. Antes de producción, separar seeding de datos iniciales del sistema (roles, configuración) vs datos de prueba.
- `pgvector` está en el `docker-compose.yml` pero no se usa todavía. Cuando se implemente búsqueda semántica de expedientes o el asistente del paciente, ese es el lugar correcto.
- Node.js `20.18.0` — actualizar a `20.19.0+` o `22.x` LTS antes del primer deploy para evitar warnings de dependencias.

---

## Pregunta abierta importante

El seguimiento menciona que "el primer producto será web antes que mobile". Correcto para el MVP. Pero el flujo del paciente (buscar profesional, agendar, ver citas) es naturalmente mobile. Conviene diseñar el frontend con mobile-first desde ahora aunque no haya app nativa, para que la PWA sea usable desde teléfono sin retrabajo de CSS. La pantalla `/portal-paciente` ya tiene verificación responsive — mantener esa disciplina en todo lo nuevo.

---

## Actualización — 2026-06-08

Avances desde la primera versión de este archivo. El proyecto ya tiene cerrado el flujo B2B de invitaciones y el onboarding del profesional.

### Lo que ya se resolvió

- **Aceptar invitaciones de clínica (end-to-end).** Crea o vincula usuario, crea perfil profesional si aplica, activa membresía y deja la sesión iniciada. Cubre el pendiente "flujo completo de aceptar invitaciones de clínica" de la Fase B.
- **Token de invitación de un solo uso.** El enlace usa `?token=` (aleatorio, se invalida al cambiar de estado) en vez del id directo. Mitiga el riesgo de enlaces predecibles.
- **Correo de invitación con degradación elegante.** `EmailSender` envía por Resend si hay API key y, si no, registra un envío simulado. Ya existe el punto de integración para la Fase B (email transaccional); falta dominio verificado y plantillas.
- **Recordatorio de invitación.** Botón "Reenviar" para el admin y etiqueta "Por vencer" (≤3 días). Falta automatizarlo con un job programado.
- **Onboarding autónomo del profesional con gate de publicación.** El profesional invitado nace en estado `onboarding` y no es visible ni agendable hasta completar perfil + servicios + disponibilidad y pulsar "Publicar". Cubre el punto 2 de la Fase A ("onboarding autónomo") salvo el signup público desde cero.

### Ajustes a las recomendaciones previas

- **Resend (Fase B) ya tiene cimientos.** La arquitectura de envío está lista; lo que resta es la cuenta/dominio y conectar los eventos transaccionales de cita (agendada, confirmada, recordatorio 24h, cancelada). El recordatorio de invitaciones debería migrar de manual a job programado.
- **Onboarding (Fase A) parcialmente hecho.** Falta el signup público de un profesional sin invitación (hoy solo entra vía invitación de clínica). Es el complemento para que el lado individual escale sin tocar una clínica.
- **Gate de publicación = base para verificación.** Ahora que existe un paso explícito de "publicar", es el lugar correcto para exigir verificación de cédula profesional y aceptación de aviso de privacidad/consentimiento antes de quedar visible (apoya NOM-024 y LFPDPPP).

### Deuda técnica que sigue vigente (sin cambios)

- Autenticación de producción (Clerk o JWT httpOnly). **Sube de prioridad**: ahora se crean cuentas reales desde invitaciones.
- Secretos fuera de `appsettings.json` → Key Vault (incluye ahora `RESEND_API_KEY` y `WEB_BASE_URL`).
- CORS dinámico por ambiente; eliminar `apps/api/Program 2.cs`; rate limiting; vulnerabilidad PostCSS/Next.js.
- El token de invitación se guarda en texto plano (aleatorio). Endurecimiento opcional: almacenar solo el hash y mostrar el enlace solo al crear/reenviar.

### Próximo foco sugerido

1. Disponibilidad con vista calendario semanal (detección de traslapes) integrada al onboarding.
2. Resend productivo + eventos transaccionales de cita + automatizar recordatorios de invitación.
3. Verificación de cédula y consentimiento como requisito de publicación; después, pagos (Mercado Pago) sobre `professional_service_id`.

---

## Actualización — 2026-06-08 (sesión 2)

Se implementó protección de rutas por rol: el menú filtra ítems según `currentUser.primaryRole` y un middleware de Next.js redirige si el usuario accede a una ruta no autorizada. Detalles en `PROTECCION_RUTAS.md`.

### Siguientes pasos inmediatos (bloqueadores)

**1. Autenticación para producción — Clerk**

- Reemplazar los tokens bearer actuales por Clerk. Tiene SDK para Next.js y .NET, maneja MFA, magic links y social login sin infraestructura propia.
- Prioridad máxima: ahora que se crean cuentas reales desde invitaciones, la autenticación actual no es suficiente para producción.
- Junto con esto: mover `RESEND_API_KEY`, `WEB_BASE_URL` y la cadena de conexión a variables de entorno / Azure Key Vault; configurar CORS dinámico por ambiente; agregar rate limiting en `/api/auth/login`.

**2. Integración Mercado Pago**

- El modelo de datos ya tiene `professional_service_id` con precio; solo falta el flujo de pago.
- Flujo: paciente selecciona cita → paga (OXXO, SPEI o tarjeta) → `appointment.status = confirmed` automáticamente.
- Priorizar sobre Stripe para México por cobertura de métodos locales.
- Considerar comisión de transacción del 2–3% como capa de ingresos que escala sin costo marginal.

### Recomendaciones posteriores (Fase A–C)

Con los bloqueadores resueltos, continuar en este orden de impacto:

**3. Vista calendario semanal de disponibilidad** (Fase A restante)
- UI semanal que detecte traslapes y huecos antes de guardar.
- Integrada al checklist de onboarding; hoy el profesional define disponibilidad sin feedback visual de conflictos.

**4. Email transaccional con Resend** (Fase B)
- La infraestructura `EmailSender` ya existe; falta: cuenta/dominio verificado y plantillas para cada evento.
- Eventos prioritarios: cita agendada, confirmada, recordatorio 24h antes, cancelada, nota clínica disponible.
- Automatizar el recordatorio de invitaciones por vencer (hoy es botón manual del admin).

**5. Signup público de profesional** (Fase A restante)
- Hoy solo entra vía invitación de clínica; falta el registro independiente.
- Flujo: signup → verificar email → completar perfil → definir servicios → disponibilidad → publicar.
- Sin esto el canal individual no escala y el producto depende de que una clínica invite.

**Fase B adicional — Páginas públicas de profesionales**
- URL pública tipo `/profesionales/laura-vega-psicologa-cdmx`, schema.org `MedicalBusiness`, reviews visibles, botón de agendar.
- Costo de adquisición de pacientes $0. Necesario para posicionamiento orgánico en Google.

**Fase C — Expansión de ingresos**
- WhatsApp Business API (Twilio o 360dialog): recordatorios de cita, ~40% menos no-shows, tasa de apertura 95% vs 20% email. Conectar con `notification_preferences` que ya existe.
- Video integrado (Daily.co): consultas online, SDK React, precios por minuto. Integración de 1–2 días.
- Analytics del profesional: dashboard de ingresos, ocupación de agenda, pacientes activos vs inactivos, tasa de cancelación. Necesario para justificar el plan Pro sobre el Individual.

---

## Actualización — 2026-06-09 (sesión 2)

### Convención de archivo proxy/middleware en Next.js v16

En Next.js v16, el archivo de proxy/middleware se llama `proxy.ts`, no `middleware.ts`. La convención `middleware.ts` está deprecada en esta versión. El archivo `apps/web/proxy.ts` estaba correcto desde el inicio y no requería cambios.

### Configuración de Clerk completada

- Se creó cuenta en clerk.com con la aplicación `Clinixa` (instancia: `sunny-tomcat-26`).
- `apps/web/.env.local` creado con las tres llaves reales: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` y la URL del issuer.
- `apps/api/appsettings.Development.json` configurado con `Clerk__Issuer`, `Clerk__SecretKey` y `Clerk__AuthorizedParties`.
- El log del browser confirma: `Clerk has been loaded with development keys`.

### Fix del flujo de registro en /sesion

Con `routing="hash"` en Clerk v7, el componente `<SignIn>` necesita un `<SignUp routing="hash">` en la misma página para poder intercambiar el formulario al hacer clic en "Sign up". Sin él, el clic actualizaba el hash pero no mostraba nada.

Cambio aplicado en `apps/web/app/sesion/session-page-client.tsx`:

- `ClerkAccessPanel` escucha cambios en el hash de la URL.
- Muestra `<SignIn routing="hash" signUpUrl="#/sign-up">` por defecto.
- Muestra `<SignUp routing="hash" signInUrl="#/sign-in">` cuando el hash empieza con `#/sign-up`.

### Deuda técnica — estado actualizado

Pendiente (sin cambios desde sesiones anteriores):

- `apps/api/Program 2.cs` en el repositorio — excluido del build pero debe eliminarse.
- Chat completamente estático — única pantalla del MVP sin backend real. Necesita entidad `Message`, migración EF Core, endpoint REST y conectar el botón de enviar.
- Cadena de conexión con contraseña en `appsettings.json` — mover a variables de entorno antes de cualquier deploy.
- Rate limiting en endpoints de login y reservas — no implementado.
- Vulnerabilidad moderada PostCSS/Next.js — monitorear actualizaciones.

### Próximos pasos en orden de impacto

1. **Probar Clerk end-to-end** — login y registro reales en `/sign-up`, verificar redirección por rol.
2. **Eliminar `Program 2.cs`** — limpieza sin riesgo.
3. **Implementar chat funcional** — último flujo del MVP sin cerrar.
4. **Integración Mercado Pago** — modelo de datos listo; falta el flujo de pago y cambio automático de estado a `confirmed`.
5. **Email transaccional con Resend** — infraestructura `EmailSender` lista; falta cuenta/dominio verificado y plantillas.

## Actualización — 2026-06-09 (sesión 3)

### El "sign up no hace nada" era el toggle por hash

El fix anterior (alternar `<SignIn>` / `<SignUp>` con `routing="hash"` + listener de `hashchange` en `/sesion`) era frágil: Clerk gestiona su propio enrutado por hash en cada paso del registro y entra en conflicto con el toggle manual, así que el formulario de registro no avanzaba. Lección: para App Router, usar el patrón recomendado de Clerk —rutas catch-all dedicadas con path routing— en vez de hacks de hash.

Se reemplazó por:

- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` y `apps/web/app/sign-up/[[...sign-up]]/page.tsx`.
- `/sesion` ya no alterna formularios; solo enlaza a `/sign-in` y `/sign-up`.
- Env actualizado: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.

### Página de bienvenida

`/bienvenida` es ahora la entrada pública (landing con CTAs). Los no autenticados se redirigen ahí desde `proxy.ts` (antes a `/sesion`).

### Registro define el rol desde el inicio

El registro pide Paciente o Profesional antes del widget de Clerk y guarda la elección en `unsafeMetadata.role`. El backend (`GetClerkProfileAsync` + `ProvisionClerkUserAsync` en `Program.cs`) lee ese rol y crea el `User` + `UserRole` con el `PrimaryRole` correcto al primer acceso de una cuenta Clerk nueva (antes ese caso no provisionaba usuario).

### Riesgo abierto a verificar

- **Backend sin compilar**: no hay `dotnet` en el entorno de esta sesión, así que el cambio en `Program.cs` se revisó a mano pero no se compiló ni se probó el flujo Clerk → API. Validar con `dotnet build` y una prueba real de registro de paciente y de profesional.
- `Program 2.cs` (duplicado con top-level statements) **rompe** el build .NET; eliminarlo antes de compilar.

---

## Actualización — 2026-06-09 (sesión 4)

### Primer bloque de estabilización resuelto

Se trabajo el primer foco recomendado: limpieza de build, validación de API, provisioning Clerk y endurecimiento mínimo.

Resuelto:

- `apps/api/Program 2.cs` eliminado.
- `apps/api/HealthHub.Api.csproj` ya no excluye manualmente el duplicado.
- `Program.cs` compila; se corrigió la referencia inexistente `GetClerkEmailAsync` usando `GetClerkProfileAsync`.
- El provisioning de nuevas cuentas Clerk ahora crea no solo `User` + `UserRole`, sino también el perfil base:
  - `Patient` para rol `patient`.
  - `Professional` en `onboarding` para rol `professional`.
  - Preferencias iniciales de notificación.
- Se agregó rate limiting con políticas separadas:
  - `/api/auth` → `auth`.
  - `/api/appointments` → `booking`.
- `appsettings.Development.json` ya no contiene la llave real de Clerk.
- `appsettings.json` ya no contiene la cadena de conexión con contraseña; la API exige `ConnectionStrings__HealthHubDb` o `HEALTHHUB_DB_CONNECTION`.
- `apps/api/README.md` documenta las variables necesarias para ejecución local.

Validado:

- `npm run build:api` pasa con 0 warnings y 0 errores.
- API levantada localmente con `ConnectionStrings__HealthHubDb` por variable de entorno.
- `npm run test:api` pasa (`API tests passed`).
- Rate limiting verificado manualmente: `/api/auth/login` devuelve `429` al exceder el límite.
- Búsqueda local confirma que en `apps/api` ya no quedan `sk_test_`, `sunny-tomcat`, `Program 2` ni `GetClerkEmailAsync` en archivos fuente.

### Riesgo que baja de prioridad

- **Backend sin compilar** queda cerrado. Ya compila y la suite API pasa.
- **`Program 2.cs` rompe build** queda cerrado.
- **Cadena de conexión en appsettings** queda cerrada para archivos fuente versionables.
- **Rate limiting no implementado** queda cerrado para login legacy/dev y reservas.

### Pendiente real

- Falta una prueba E2E en navegador con cuentas Clerk nuevas de paciente y profesional desde `/sign-up`. El backend ya tiene el camino implementado, pero esta sesión no creó usuarios reales en Clerk desde el widget.
- El `npm run dev:api` actual requiere que el entorno ya tenga `ConnectionStrings__HealthHubDb`; no debe volver a meter secretos en scripts versionados.
- Chat sigue estático y fuera de este bloque.

### Próximo foco recomendado

1. Consentimiento y aviso de privacidad en registro.
2. Verificación de cédula profesional como requisito de publicación.
3. Después de eso, Mercado Pago para validar cobro en plataforma.

## Testing y UX — Mejoras aplicadas (2026-06-09)

### Problema detectado

Cuando el usuario creaba una **nueva cuenta con Clerk**, el backend buscaba usuarios existentes por email e incorrectamente **vinculaba la cuenta nueva con un perfil existente** (ej: Dra. Laura Vega), sin crear un nuevo registro.

Causa raíz: en `apps/api/Program.cs`, `GetUserFromRequestAsync` primero buscaba `ClerkUserId`, y si no encontraba, buscaba por email en la tabla `users`. Si el email coincidía con uno existente, lo vinculaba directamente.

### Soluciones implementadas

#### 1. Backend — Crear siempre usuarios nuevos

En `apps/api/Program.cs`:
- Se eliminó la búsqueda de usuarios por email en `GetUserFromRequestAsync`.
- Ahora solo intenta buscar por `ClerkUserId`.
- Si no existe, **siempre llama a `ProvisionClerkUserAsync`** para crear un nuevo.
- Cada cuenta Clerk obtiene su propio registro en `users`, evitando colisiones.

Impacto: no habrá más vinculación accidental de cuentas nuevas con existentes.

#### 2. Frontend — Página de onboarding post-signup

Se creó una pantalla de confirmación en `/onboarding`:

- **Componentes nuevos:**
  - `apps/web/app/onboarding/page.tsx` — servidor component que renderiza el cliente.
  - `apps/web/app/onboarding/onboarding-page-client.tsx` — formulario interactivo.
  - Pregunta: "Completa tu perfil" con nombre completo + confirmación de rol (Paciente / Profesional).
  - Botón "Continuar" que llama a `refreshSession()` y redirige al portal correcto.

- **Rutas actualizadas:**
  - `apps/web/app/sign-up/[[...sign-up]]/page.tsx`: cambió `fallbackRedirectUrl` de `/` a `/onboarding`.
  - `apps/web/app/sign-in/[[...sign-in]]/page.tsx`: cambió `fallbackRedirectUrl` de `/` a `/onboarding`.
  - `apps/web/proxy.ts`: agregó `/onboarding` a rutas públicas.

Impacto: flujo transparente tras signup. El usuario no llega sin aviso al dashboard.

#### 3. Frontend — Menú de usuario con logout

Se agregó dropdown en la esquina superior derecha (donde aparece el nombre) con opciones:
- **Página de sesión** — enlace a `/sesion`.
- **Logout** — cierra sesión de Clerk y redirige a `/bienvenida`.

- **Componentes nuevos:**
  - `apps/web/components/user-menu.tsx` — dropdown reutilizable.
  - `apps/web/lib/use-click-outside.ts` — hook para cerrar el menú al hacer clic fuera.

- **Integración en:**
  - `apps/web/app/portal-profesional/professional-portal-page-client.tsx`
  - `apps/web/app/portal-paciente/portal-patient-page-client.tsx`
  - `apps/web/app/seguridad/security-page-client.tsx`

Impacto: logout explícito ya es posible (antes faltaba). Acceso rápido a `/sesion` desde cualquier panel.

### Validaciones ejecutadas

- **Build:** `npm run build:web` sin errores.
- **Lint:** `npm run lint:web` sin errores.
- **Visualización:** dropdown abre/cierra correctamente, menú desaparece al hacer clic fuera, opciones funcionales.

### Flujo post-fix

1. Usuario → `/bienvenida` → "Crear cuenta" → `/sign-up`.
2. Elige rol (Paciente/Profesional).
3. Llena Clerk y se crea cuenta → `/onboarding`.
4. Completa nombre y confirma rol → "Continuar" → `/portal-paciente` o `/portal-profesional`.
5. Click en nombre → menú → "Logout" → `/bienvenida`.

### Pendientes validación real

- Crear una **cuenta verdaderamente nueva** en Clerk y verificar que **no se vincula** con Laura Vega.
- Verificar que el rol elegido en signup se respeta en la BD tras crear el usuario.
- Prueba E2E: registrar profesional nuevo → debe ir a portal profesional; registrar paciente nuevo → debe ir a portal paciente.

### Recomendación para siguiente sesión

1. Hacer prueba E2E real de registro nuevas (paciente y profesional) y validar que `primaryRole` en la BD es el correcto.
2. Luego proceder con: consentimiento/privacidad → Mercado Pago → verificación de cédula.

---

## Actualización — 2026-06-09 (sesión 5): consentimiento y deuda técnica

Se ejecutaron los pasos 2 y 3 del arranque y se dejó preparado el plan de Fases A/B (`plan-fases-a-b.md`). El paso 1 (E2E Clerk) se difirió por decisión del usuario.

### Lo que se resolvió (riesgo de privacidad — antes "abierto")

- **Consentimiento y aviso de privacidad implementados.** Era el primer riesgo de cumplimiento listado para "antes de usuarios reales" (LFPDPPP + NOM-024). Ahora existe:
  - Tabla `user_consents` con migración versionada `202606090002_UserConsents` (no `EnsureCreated`).
  - Registro auditado de consentimiento con **versión del documento, IP y user-agent** (`POST /api/me/consent` → evento `user_consent.accepted` en `audit_logs`). Esto da trazabilidad de "quién aceptó qué versión y cuándo", que es justo lo que pide la normativa.
  - Documentos versionados (`privacy_notice`, `terms_of_service`, `health_data_processing`) — el versionado permite re-pedir consentimiento cuando cambie el aviso, sin perder el histórico.
  - Páginas públicas `/aviso-privacidad` y `/terminos` (plantilla, **requieren revisión legal** antes de producción) y captura obligatoria en `/onboarding`.
- **Deuda técnica residual cerrada/documentada.** `Program 2.cs` confirmado eliminado; `RESEND_API_KEY`, `RESEND_FROM` y `WEB_BASE_URL` documentadas en `apps/api/README.md` y `.env.example` (el código ya las leía con degradación elegante).

### Observaciones de arquitectura sobre lo implementado

- **El consentimiento es la base correcta para el gate de cédula de la Fase A.** Ahora que existe un registro de consentimiento auditado y un paso de onboarding con checklist, el lugar natural para exigir verificación de cédula (A3) es el mismo `publish`. Quedan alineados.
- **Falta enforcement global.** El consentimiento se captura en onboarding pero no se exige por middleware si el usuario navega directo a un portal. Recomendación: cuando se conecte el piloto real, agregar gate por `consent.completed` en `proxy.ts` o en los endpoints que tocan expediente. No es bloqueante para el diseño, sí antes de pacientes reales.
- **El IP/UA del consentimiento se captura server-side** (igual que `audit_logs`), no se confía en el cliente. Correcto.

### Próximo foco (sin cambios de fondo, ahora con plan formal)

El roadmap A/B quedó formalizado en `plan-fases-a-b.md`. Orden de impacto en ingresos sin cambios:

1. **Fase A1 — Mercado Pago.** Sigue siendo el desbloqueador de monetización. Modelo de datos listo (`professional_service_id`). El plan ya detalla entidad `Payment`, webhook con validación de firma y cambio automático a `confirmed`.
2. **Fase A3/A2 — Verificación de cédula + calendario semanal.** Completan onboarding y confianza.
3. **Fase B1 — Resend.** Infra lista; falta dominio + plantillas + job de recordatorios 24h.
4. **Fase B2/B3 — Páginas públicas (SEO) y chat funcional.**

El único pendiente de validación de esta sesión es la prueba E2E en navegador del onboarding con sesión Clerk real (paso 1 diferido); el backend y las páginas públicas quedaron validados (build, lint, `test:api`, filas en BD y auditoría).

---

## Actualización — 2026-06-10: la prueba E2E destapó una fuga de datos real

### Lección principal de la sesión

La prueba E2E diferida (paso 1) resultó ser la más valiosa hasta ahora: al crear una cuenta Clerk real, el usuario nuevo **veía los pacientes, citas y expedientes de toda la base**. Ni `test-api.mjs` ni los builds lo detectaron porque los endpoints legacy (`GET /api/patients`, `/api/appointments`, `/api/soap-notes`) nunca tuvieron casos de prueba de aislamiento — solo se probaba que respondieran. Lección: las suites cubrían los endpoints nuevos (portales, invitaciones, consentimiento) pero los endpoints más viejos del MVP quedaron con el supuesto implícito de "un solo profesional".

### Lo que se corrigió (era bloqueador absoluto para el piloto)

1. **Aislamiento de datos por rol en endpoints legacy.** Helper central `GetAccessiblePatientIdsAsync` (null = admin ve todo; lista de IDs para el resto). Profesional: pacientes vinculados por `professional_patients` o citas. Paciente: solo él. `clinic_admin`: pacientes de su clínica. Todos los endpoints legacy exigen sesión (`401`).
2. **Provisioning Clerk estaba roto en local**: `Clerk:SecretKey` vacío en `appsettings.Development.json` hacía que `GetClerkProfileAsync` devolviera `null` y el usuario nunca se creara — la UI caía en silencio a los datos demo. Esto explica el síntoma "aparece como Ana Martínez". La degradación silenciosa a datos demo es útil para prototipo pero **enmascaró un fallo de autenticación**; considerar un banner visible de "modo fallback" en la UI.
3. **Onboarding repetido y datos no persistidos**: el formulario de onboarding nunca guardaba nombre/rol (solo consentimiento) y se mostraba en cada login. Ahora existe `PATCH /api/me` y el onboarding se salta si `consent.completed` — el consentimiento funciona como señal de "onboarding completado", lo cual es consistente con su rol normativo.
4. **Perfil maestro** (`master@healthhub.demo`, rol `internal_admin`) para revisar accesos y auditoría; `/seguridad` queda solo para `clinic_admin` (su portal operativo) e `internal_admin`.
5. **Chat retirado** (decisión B3): ruta, menú y enlaces eliminados. Queda pendiente la parte constructiva de B3 (campo `WhatsAppNumber` + wa.me).

### Observaciones de arquitectura

- **La protección de rutas por rol es solo de cliente.** `proxy.ts` valida sesión pero no rol; el menú y los gates de página hacen el resto. Con el scoping de API esto es aceptable (los datos ya no se filtran), pero antes del piloto conviene mover la matriz de roles al proxy con el rol en cookie/claim.
- **El scoping centralizado en helpers es la base correcta para clínicas.** Cuando lleguen equipos reales (Fase B/C), `GetAccessiblePatientIdsAsync` es el único lugar a extender.
- **Deuda de pruebas concreta**: agregar a `test-api.mjs` casos de aislamiento (profesional A no ve datos de profesional B; paciente no lista pacientes; 401 sin sesión en legacy). Es regresión barata contra el bug más grave encontrado hasta ahora.
- **Levantar la API local ahora requiere 3 variables**: `ConnectionStrings__HealthHubDb`, `Clerk__Issuer`, `Clerk__SecretKey`. Documentarlo en `apps/api/README.md` para no repetir el diagnóstico de hoy.

### Próximo foco recomendado

1. Cerrar E2E de cuenta **paciente** nueva (la de profesional ya quedó verificada end-to-end: registro → provisioning → onboarding único → portal con datos aislados).
2. Pruebas de aislamiento en `test-api.mjs`.
3. **A1 Mercado Pago** — sin cambios: sigue siendo el desbloqueador de monetización y el modelo de datos está listo.

---

## Actualización — 2026-06-10 (sesión 6): documentos legales v1.0 integrados al producto

### Decisiones tomadas y su razonamiento

1. **`docs/legal/` como fuente única de verdad.** Las páginas `/privacy` y `/terms` renderizan el markdown directamente (react-markdown + remark-gfm, SSR). Antes el contenido legal vivía duplicado como JSX; ahora un cambio legal es un cambio de un solo archivo. Costo aceptado: las páginas se prerenderizan en build, así que en producción un cambio de documento requiere redeploy — razonable porque un cambio de versión legal *debe* pasar por release (y por re-aceptación de usuarios).
2. **Rutas `/privacy` y `/terms` canónicas, rutas en español como redirects 307.** Ningún enlace viejo se rompe y el requerimiento queda cumplido sin mantener dos copias.
3. **Consentimiento por rol en vez de uniforme.** El tipo `health_data_processing` ya no se exige a profesionales (no tiene sentido jurídico pedirle a un profesional consentimiento de *sus* datos de salud); se agregó `professional_data_processing`. `ConsentDocuments.RequiredFor(role)` centraliza la regla. Las versiones pasaron de fecha ("2026-06-09") a versión semántica ("1.0") alineada con el encabezado de los documentos.
4. **Verificación de cédula como gate duro del marketplace.** El filtro está en el API (listado, detalle, slots y publish), no solo en UI. Backfill en la migración: los perfiles `active` preexistentes quedan `verified` para no vaciar el marketplace demo. Cambiar la cédula re-pendientiza la verificación — evita el truco de verificar con una cédula y luego cambiarla.
5. **Reseñas: cita completada + sin edición + moderación con rastro.** La unicidad por `AppointmentId` ya existía en el esquema y resultó el anclaje natural de "solo pacientes reales". No hay PATCH de contenido a propósito; la moderación solo oculta/restaura con motivo y autor.
6. **Expediente: soft delete y bitácora de consulta.** `DELETE /api/soap-notes/{id}` es lógico (status=deleted) y queda auditado; las lecturas del expediente ahora también se auditan (NOM-024). No existe ninguna ruta de borrado físico en el API.

### Riesgos que el equipo debe tener presentes

- **El consentimiento se puede esquivar por deep-link** (el gate vive en el onboarding del frontend). Endurecer server-side antes del piloto.
- **La verificación manual de cédula es ahora un cuello operativo**: sin un admin que verifique, ningún profesional nuevo aparece públicamente. Falta UI de admin (los endpoints ya existen: `PATCH /api/professionals/{id}/verification`, `PATCH /api/reviews/{id}/moderate`).
- **Seguridad pendiente** (detalle en seguimiento-proyecto.md): backups sin política, cifrado en reposo delegado al proveedor cloud aún no elegido, rate limiting solo en auth/booking, HTTPS a terminar en el proxy de producción.
- **Los documentos siguen sin validación de abogado** y con placeholders visibles ([RAZON_SOCIAL], correos, jurisdicción, políticas comerciales). Es el camino crítico real del piloto, no el código.

### Deuda intencional (no implementar todavía)

- Pagos: TODOs en `Program.cs` — el checkout debe nacer mostrando las referencias a la sección 14 de Términos y con [POLITICA_CANCELACION]/[POLITICA_REEMBOLSO]/[POLITICA_NO_SHOW]/[COMISION_PLATAFORMA] definidos.
- IA: TODOs para consentimiento IA, transcripción Whisper, OpenAI y SOAP asistido (con revisión profesional obligatoria). Nada de esto entra al MVP.
- Auditoría de modificación/descarga de expediente: se agregará junto con los endpoints de edición y exportación cuando existan.

### Validación

`dotnet build` (0/0), `npm run build:web`, `npm run lint:web` y verificación HTTP de `/privacy`, `/terms` y redirects — todo en verde. Pendiente `test:api` (necesita Postgres+API arriba) y E2E del onboarding con los textos nuevos.

---

## Actualización — 2026-06-11 (sesión 8): decisión de modelo marketplace y Fase 1 implementada

### La decisión de negocio y por qué importa

Se resolvió la pregunta abierta de "¿cómo cobran los profesionales independientes?": **marketplace con OAuth de Mercado Pago**. Cada profesional vincula su propia cuenta MP; la plataforma retiene una comisión variable por tier de licencia y el resto se transfiere al profesional. Alternativa descartada: centralizar todo en la cuenta de la plataforma y dispersar a fin de mes — operativamente frágil (conciliación manual, retención de dinero ajeno, posible implicación regulatoria como agregador de pagos). Con OAuth, MP conoce y verifica la identidad fiscal de cada profesional; la plataforma nunca custodia el dinero del profesional más allá del split.

### Por qué el modelo de datos quedó así

1. **`CommissionTier` con `(LicenseType, MinAppointmentsThreshold)` único** en vez de un porcentaje fijo en código o una columna en `professionals`: los porcentajes son política comercial, cambiarán sin deploy, y el threshold deja la puerta abierta a tiers por volumen ("después de 50 citas baja al 12%") sin tocar el esquema. El tier `default` (20%) es respaldo obligatorio — el cálculo de comisión nunca debe fallar por especialidad sin tier. Esto además materializa el placeholder [COMISION_PLATAFORMA] de los Términos: cuando los abogados definan el número, se edita la fila, no el código.
2. **Tokens OAuth cifrados en columnas dedicadas** (`AccessTokenEncrypted`/`RefreshTokenEncrypted`): el access token OAuth de un vendedor MP permite crear pagos y transfers en su nombre — es material sensible equiparable a credenciales. Cifrado a nivel aplicación (la clave vendrá de `ENCRYPTION_KEY`, eventualmente Key Vault), no solo cifrado en reposo del proveedor.
3. **Desglose de comisión persistido en `Payment`** (`CommissionPercentage/CommissionAmount/ProfessionalAmount`) en vez de calcularse al vuelo: el porcentaje del tier puede cambiar mañana, pero lo que se cobró en cada pago es un hecho contable inmutable. Sin esto, un cambio de tier reescribiría la historia financiera.
4. **`TransferStatus` arranca en `none`, no `pending`**: distingue "pago sin flujo marketplace" (citas viejas, profesional sin cuenta vinculada) de "transfer encolado". Evita que un job de reintentos procese pagos que nunca debieron transferirse.
5. **`MercadoPagoStatus` denormalizado en `professionals`**: el listado público y el checkout necesitan saber si el profesional puede cobrar sin hacer join a la tabla de tokens. Mismo patrón que `VerificationStatus`.

### Riesgos a vigilar en las siguientes fases

- **El webhook hará el split**: si la transfer falla después de que el paciente pagó, queda dinero del profesional retenido en la cuenta plataforma. El diseño contempla `TransferStatus=failed` + reintentos, pero hace falta visibilidad admin (dashboard de transfers fallidas) desde el día uno — es la nueva versión del "cuello operativo" que ya vimos con la verificación de cédulas.
- **Renovación de tokens OAuth**: expiran a 180 días. Sin un job de refresh, los profesionales dejarán de cobrar silenciosamente medio año después de conectarse. Hay que decidir dónde vive ese job (hosted service vs cron externo).
- **Gate de checkout**: un paciente no debería poder pagar una cita de un profesional sin cuenta MP verificada — si paga, el dinero queda atorado. El checkout debe validar `MercadoPagoStatus=verified` antes de crear la preferencia (Fase 5).
- **Sandbox OAuth**: probar OAuth de marketplace requiere una app MP tipo marketplace (`client_id`/`client_secret`) y cuentas de prueba vendedor/comprador — más ceremonia que el access token directo de A1. Anticipar fricción al llegar a Fase 3.

### Estado

Fase 1 de 7 completada y verificada contra PostgreSQL local: entidades, migración `202606120001_MarketplaceSetup`, seed de 5 tiers, build limpio. Plan completo en `PLAN-MARKETPLACE.md`. Las fases 2-7 (servicio OAuth+cifrado, endpoints, webhook con split, UI, pruebas) no requieren decisiones de esquema adicionales — el modelo de datos ya soporta todo el flujo.

---

## Actualización — 2026-06-11 (sesión 8, continuación): Fases 2-3 del marketplace y una corrección de arquitectura importante

### La corrección: de "transfers" a `marketplace_fee`

El plan original (y la sección de riesgos de la entrada anterior) asumía el modelo "el dinero entra a la plataforma y luego se transfiere al profesional". Al implementar el servicio se adoptó el modelo correcto y oficial de MP: **split de pagos con `marketplace_fee`** — la preferencia se crea con el access token OAuth del profesional, el dinero llega directo a su cuenta y MP acredita la comisión a la plataforma automáticamente. Tres consecuencias:

1. **Desaparece el riesgo #1 de la entrada anterior** (transfer falla → dinero ajeno retenido). No hay segunda operación que pueda fallar: el split es atómico dentro del pago.
2. **La plataforma nunca custodia dinero del profesional**, lo que reduce la exposición regulatoria (no operamos como agregador/dispersor de fondos).
3. **El API de transfers de MP ni siquiera es de acceso general** — el plan original habría chocado con un muro de permisos al llegar a producción. Lección: validar el mecanismo financiero contra la documentación del proveedor *antes* de diseñar el esquema alrededor de él. El esquema de Fase 1 sobrevivió porque persiste el *desglose* (qué comisión se cobró), no el *mecanismo*.

`Payment.TransferStatus` queda semánticamente reutilizado (registrar si el split se aplicó) y `ProviderTransferId` probablemente quede sin uso — deuda menor aceptada antes que migrar de nuevo.

### Decisiones de implementación y su porqué

1. **AES-256-GCM con nonce aleatorio por valor** para los tokens en BD: autenticado (la manipulación se detecta, no descifra basura) y no determinista (dos profesionales con el mismo token no producen el mismo ciphertext). Asimetría deliberada de fallos: `Protect` lanza sin clave en producción (escribir un secreto en claro jamás), `Unprotect` devuelve null (una fila corrupta no debe tirar un listado completo; el caller degrada a "cuenta desconectada").
2. **El state de OAuth va firmado (HMAC + timestamp de 30 min)**, no es un id pelado: el callback es un endpoint público y el state es la única amarra entre "quien inició la vinculación" y "quien regresa de MP". Sin firma, un atacante podría vincular SU cuenta MP al perfil de otro profesional (y cobrar sus consultas). Mismo razonamiento que llevó los tokens de invitación de clínica a un solo uso.
3. **Modo simulado de extremo a extremo**: sin `client_id`/`client_secret`, la auth URL regresa directo al callback con `sim-auth-code` y el exchange devuelve credenciales `sim-*`. Esto permite que las Fases 4-7 (endpoints, UI, test-api.mjs) se desarrollen y prueben completas sin la cuenta marketplace de MP — que requiere trámite del usuario. El patrón ya demostró su valor con el checkout de A1.
4. **La prueba standalone enseñó algo**: el primer test de "state manipulado" pasaba en verde falso porque `Replace("a","b")` sobre esa base64 particular no cambiaba nada (no contenía 'a'). Tamper determinista (decodificar, alterar el payload, recodificar) o no es tamper. Anotado como patrón para las pruebas de Fase 7.

### Riesgos actualizados

- ~~Transfers fallidas~~ — eliminado por diseño (ver arriba).
- **Renovación de tokens a 180 días** — sigue vigente y ahora es *el* riesgo operativo principal: con `marketplace_fee`, un token vencido significa que el paciente no puede pagar a ese profesional. El refresh token de MP es además de un solo uso: si el guardado del nuevo token falla a mitad de la renovación, la cuenta queda desincronizada y el profesional debe re-vincular. El job de refresh (Fase 5) debe guardar de forma transaccional.
- **Gate de checkout por `MercadoPagoStatus=verified`** — sin cambios, va en Fase 5.
- **Trámite de la app marketplace en MP** — sin cambios; el modo simulado lo saca del camino crítico del desarrollo.

### Estado

Fases 1-3 de 7 completadas. Build limpio; 21 verificaciones standalone en verde (cifrado round-trip, manipulación, fail-closed, state OAuth, flujo simulado completo). Falta: endpoints (F4), checkout/webhook con split (F5), UI (F6), pruebas integradas (F7).

---

*Archivo generado por Claude el 2026-06-07. Actualizar con cada sesión de trabajo relevante.*

## Actualización — 2026-06-12 (sesión 9): Fase 4 Marketplace Endpoints completada

### Estado de Mercado Pago Marketplace

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1-2 | Entidades + Migración | ✅ Completada (2026-06-11) |
| 3 | Servicio OAuth (cifrado, state, etc) | ✅ Completada (2026-06-11) |
| 4 | **3 endpoints: connect, callback, admin-verify** | **✅ Completada (2026-06-12)** |
| 5 | Webhook + desglose de comisión | ⏳ Próximo |
| 6 | UI profesional + desconectar | ⏳ Pendiente |
| 7 | UI admin + tests | ⏳ Pendiente |

### Cambios en Fase 4

**Nuevos endpoints (programa de grupo en Program.cs):**
- `GET /api/professional-marketplace/connect` — Genera authorization URL con state firmado
- `POST /api/professional-marketplace/callback` — Canjea OAuth code por credenciales cifradas
- `PATCH /api/admin/marketplace/professionals/{id}/verify` — Admin verifica cuenta MP
- `GET /api/admin/marketplace/pending` — Lista profesionales pendientes de verificación

**Seguridad implementada:**
- State OAuth con HMAC (plazo 30 min anti-CSRF)
- Tokens encriptados AES-256-GCM en BD (nunca expuestos en DTO)
- Validación de permisos por role (internal_admin + clinic_admin)
- Auditoría de todos los eventos (authorization_requested, oauth_linked, verify denied/verified/rejected)

**Integraciones:**
- `TokenEncryptionService.Protect/Unprotect` para cifrado de access_token + refresh_token
- `MercadoPagoMarketplaceService.BuildAuthorizationUrl, CreateOAuthState, TryParseOAuthState, ExchangeAuthorizationCodeAsync, GetAccountInfoAsync`
- `MercadoPagoOAuthCredentials` con expiración a 180 días (requiere refresh job en Fase 5)

### Deuda técnica mínima

- El endpoint de callback es público (necesario para OAuth pero sin validaciones adicionales — está limitado por state validation)
- Falta UI del lado del profesional (botón en `/portal-profesional`)
- Falta UI del lado del admin (tabla de verificación en `/seguridad`)
- Falta job de refresh automático de tokens a 180 días (temporalmente manual)
- Falta test-api.mjs con casos de OAuth simulado

### Próximo foco recomendado: Fase 5

El webhook es la pieza crítica que cierra el ciclo de ingresos:
1. Paciente paga → Mercado Pago envía notificación al webhook
2. Webhook calcula comisión según tier del profesional
3. Guarda desglose en `Payment` (commission_amount, commission_percentage, professional_amount)
4. Profesional no custodia dinero; MP acredita comisión a la plataforma automáticamente

Sin Fase 5, el checkout funciona pero no hay desglose contable de ingresos por profesional.

## Actualización — 2026-06-12 (sesión 9, continuación): Fase 5 y la lección de dónde vive la comisión

### Corrección de diseño respecto al plan original

El plan (PLAN-MARKETPLACE.md) ubicaba el cálculo de comisión en el webhook. Con el modelo `marketplace_fee` adoptado en Fase 3 eso es imposible: la comisión viaja DENTRO de la preferencia de pago, así que debe resolverse en el checkout. El webhook quedó reducido a registrar el hecho (`TransferStatus: pending → completed`). Patrón que se repite: cada vez que el mecanismo financiero del proveedor cambia, hay que re-validar en qué punto del flujo se conoce cada dato.

### Decisiones de implementación

1. **Degradación a legacy, no bloqueo**: si el profesional no tiene cuenta MP verificada (o su token es ilegible/incanjeable), el checkout cae al flujo plataforma con comisión 0 y `TransferStatus=none`. Alternativa descartada: bloquear el pago — dejaría citas impagables y el gate correcto es de UI (Fase 6), no de API.
2. **Refresh proactivo en el checkout + job nocturno**: doble cobertura para el riesgo de tokens a 180 días. En checkout se renueva si vence en <7 días (persistiendo ANTES de usar el token nuevo — el refresh de MP es de un solo uso); el `MercadoPagoTokenRefreshService` renueva en background los que vencen en <30 días, fila por fila para que una corrida interrumpida no desincronice cuentas.
3. **Respaldo de comisión en 3 niveles**: tier por especialidad+umbral → tier `default` → 20% duro. El cobro nunca falla por configuración faltante.

### Hallazgo: desajuste de auth en endpoints de Fase 4

Los endpoints marketplace de Fase 4 usan `.RequireAuthorization()` (middleware JWT de Clerk), pero el resto del API usa `GetUserFromRequestAsync` que también acepta tokens de sesión dev. Resultado: con login dev devuelven 401 y test-api.mjs no puede ejercitarlos. **Pendiente Fase 7**: quitarles `.RequireAuthorization()` y validar sesión dentro del handler como hace todo lo demás. La prueba E2E de Fase 5 lo esquivó sembrando la vinculación por SQL con tokens sim-* cifrados.

### Validación de Fase 5

Build 0 errores; test:api en verde; flujo simulado completo verificado: tier nutritionist 12% sobre $950 → comisión $114.00 / profesional $836.00; webhook approved movió transfer_status a completed y la cita a confirmed; refresh proactivo comprobado (token a 5 días renovado a 180).

### Próximo foco

1. **Fase 6 — UI profesional**: sección Mercado Pago en /portal-profesional (conectar, estado, comisión aplicable).
2. **Fase 7 — UI admin + pruebas + fix auth F4**: tabla de verificación en /seguridad, casos marketplace en test-api.mjs (incluido el tamper determinista de state anotado en Fase 3), y alinear auth de los endpoints F4.

## Actualización — 2026-06-12 (sesión 9, cierre): Fases 6-7 y el marketplace queda completo

### El patrón de la sesión: los bugs vivían en el código nunca ejercitado

Las tres fallas reales que aparecieron al construir UI y pruebas estaban todas en código de Fase 4 que compilaba perfecto pero nunca se había llamado por HTTP:

1. **redirectUri apuntaba al host del API** (:5050) en vez del web (:3000) — el flujo OAuth habría aterrizado en un 404 con la primera cuenta real. Se detectó al planear la página de callback.
2. **`.RequireAuthorization()` rechazaba los tokens de sesión legacy/dev** — los endpoints marketplace eran los únicos del API gateados por el middleware JWT en vez de validar sesión en el handler. La UI en dev habría dado 401 silencioso.
3. **`AddAuditLog(resourceId: null)` contra columna NOT NULL** — `GET /api/admin/marketplace/pending` devolvía 500 en TODA llamada. Lo encontró el assert 2d de test-api.mjs en su primera ejecución.

Lección consistente con la fuga de datos del 2026-06-10: *un endpoint sin prueba que lo ejercite es un endpoint que no funciona; solo aún no se sabe.* Los 20 asserts nuevos de marketplace son la respuesta estructural.

### Decisiones de Fases 6-7

- **El callback es ruta pública por diseño**: el navegador regresa de MP sin sesión de la app; la amarra es el state HMAC de 30 min. Se registró explícitamente en `IsPublicApiRequest` con esa justificación.
- **`GET /status` no audita**: lectura ligera del propio estado de configuración; auditarla inflaría audit_logs sin valor normativo (criterio distinto al de lecturas de expediente, que sí se auditan por NOM-024).
- **El tamper test del state es determinista**: decodifica el base64, sustituye el professionalId del payload y recodifica — aplicando la lección de Fase 3 (el `Replace("a","b")` que pasaba en verde falso).
- **La tabla admin muestra el estado de cédula junto al de MP**: el admin decide la verificación de marketplace viendo si la cédula ya fue verificada — son dos gates independientes pero la decisión es conjunta.
- **Tests re-ejecutables por diseño**: cada corrida rehace connect→pending→verify sobre la profesional demo, así el estado final siempre queda consistente (verified) y la siguiente corrida parte de un escenario válido.

### Trabajo con subagentes (patrón de esta sesión)

Fable 5 planificó (con lectura previa del código real: contratos, auth, store del web) y dos subagentes Opus implementaron Fase 6 y Fase 7 secuencialmente — secuencial porque ambos tocaban Program.cs y la Fase 7 dependía del redirectUri corregido en la 6. Cada prompt incluyó: contexto de entorno (dotnet path, BD, qué no tocar), las piezas existentes con sus firmas exactas, validación obligatoria con criterios de salida, y formato de reporte. Ambos reportaron desviaciones honestas (estado inicial ya verified; bug del audit log) — ese campo de "desviaciones con porqué" en el prompt demostró valer la pena.

### Estado: marketplace 7/7 ✅ — camino crítico restante para cobrar en producción

1. **Trámite de cuenta/app marketplace en Mercado Pago** (client_id/client_secret) — es trámite del usuario, no código; todo opera en modo simulado mientras tanto.
2. Secretos de producción: `ENCRYPTION_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`, credenciales MP — junto con el resto de la deuda de deploy (Key Vault, CORS, HTTPS).
3. Endurecimiento real-mode del webhook (consultar el pago con token del vendedor) — comentado en el código, no bloquea el sandbox.
4. Documentos legales: definir [COMISION_PLATAFORMA] y políticas de cancelación/reembolso — los Términos lo referencian y el checkout debe mostrarlos.

### Próximo foco sugerido (post-marketplace)

Con la monetización cerrada a nivel código, lo de mayor impacto vuelve a ser lo de antes del marketplace:
1. **E2E de cuenta paciente nueva con Clerk** (pendiente desde el 2026-06-10).
2. **Resend productivo** (B1): dominio verificado + plantillas de eventos de cita + recordatorio 24h.
3. **Páginas públicas de profesionales con SEO** (B2) — adquisición orgánica.
4. Revisión legal de documentos (camino crítico real del piloto).

## Actualización — 2026-06-12 (sesión 9, tarde): la degradación silenciosa cobró su segunda víctima

### El bug de "Ana Martinez" y por qué era inevitable

El usuario reportó que, con sesión de paciente, el clic en el logo lo convertía en "Ana Martinez" y le re-pedía el onboarding. No era un bug nuevo: era la MISMA degradación silenciosa a datos demo que el 2026-06-10 enmascaró el fallo de provisioning de Clerk. Aquella vez se anotó "considerar un banner visible de modo fallback" y quedó como recomendación; hoy escaló a bug visible de identidad. Lección reforzada: un fallback silencioso de IDENTIDAD no es una degradación elegante, es un cambio de usuario sin aviso — la peor clase de bug en una app de salud.

### Anatomía (5 causas apiladas)

1. Identidad demo como estado inicial del store + una instancia de store POR COMPONENTE (useState local, no singleton): AppShell y página podían "ser" personas distintas a la vez.
2. `Promise.all` de 8 endpoints en el bootstrap: el fallo de UNO (incluido el race de ~2s del token de Clerk al cargar) tiraba la identidad real y dejaba la seed.
3. Rehidratación de identidad desde localStorage entre sesiones.
4. Banner con condición equivocada que diagnosticaba "sesion profesional" cuando el problema era otro.
5. Onboarding que interpretaba "error al consultar consentimiento" como "usuario nuevo" → re-pedía el perfil.

### Principios que fija la corrección

- **La identidad se resuelve una vez, aislada de los datos**: dedupe module-level de `/api/me`; los datos usan `allSettled` y pueden degradar, la identidad jamás.
- **Con credenciales presentes, no hay identidad de respaldo**: error de sesión explícito (`guest` + banner) en vez de suplantación demo. El seed queda solo para modo prototipo sin credencial alguna.
- **Todo fallback es visible**: franja "Modo demostracion" cuando los datos vienen de respaldo. Cierra la deuda anotada del 2026-06-10.
- **Errores transitorios no destruyen estado del usuario**: el onboarding distingue "incompleto" (formulario) de "no pude verificar" (reintentar). Regla general aplicable a cualquier gate futuro (consentimiento, verificación, pagos).

### Deuda que queda anotada (no urgente)

- El store sigue siendo una instancia por componente con ~8 fetches por montaje; el dedupe de identidad mitiga lo crítico, pero la migración a un store global (zustand/context) sigue pendiente como mejora de arquitectura/perf.

---

## Actualización — 2026-06-14 (sesión 10): copy con acentos, Resend transaccional y dominio pendiente

### Qué se hizo

- **Paso 2 (copy con acentos):** etiquetas de especialidad, rol, tipo de récord y días de la semana acentuados en `MappingExtensions.cs`. Copy de notificaciones/errores acentuado en `Program.cs`. Búsqueda de profesionales ahora insensible a acentos (`RemoveDiacritics` en API, `stripAccents` en portal paciente web). `demo-data.ts` acentuado íntegro. `specialty-labels.ts` ya estaba correcto.

- **Paso 3 (Resend transaccional):** plantillas HTML para cita confirmada / recordatorio 24h / cancelada en `EmailSender.cs`. Wiring en los tres endpoints de ciclo de vida de cita. `EmailReminderService` (background job, cada 30 min): recordatorios 24h de citas y avisos de invitaciones por vencer (48h). Migración `202606140001_EmailReminderTracking`. Todo opera en modo simulado hasta tener dominio y API key.

- **E2E Clerk:** verificado visualmente por el usuario (selector de demo en `/sesion`, rutas protegidas correctas). ✅

### Bloqueador de producción: nombre de marca y dominio

"HealthHub" como dominio está tomado (`.com` y `.mx`). Se necesita definir un nuevo nombre antes de:
- Registrar dominio y verificar en Resend → activar email real.
- Actualizar Clerk, landing, copy y `README.md`.

El stack técnico no cambia; el renaming es solo copy y config (`WEB_BASE_URL`, `Resend:From`, nombre en Clerk dashboard, copy de `app-shell.tsx` y landing).

**Acción pendiente del usuario:** elegir nombre → verificar disponibilidad en [namecheap.com](https://namecheap.com) → registrar `.mx` + `.com`.

### Próximo foco (orden de impacto)

1. **Definir y registrar nombre de marca + dominio** (desbloquea Resend y la identidad pública del producto).
2. **Resend productivo** — dominio verificado + `RESEND_API_KEY`/`RESEND_FROM` en el entorno → emails reales automáticos (infraestructura ya lista).
3. **Páginas públicas SEO de profesionales** (B2) — adquisición orgánica: `/profesionales/{slug}`, og:tags, schema.org, botón "Agendar".
4. **Signup público de profesional** (sin clínica) — canal individual no escala solo con invitaciones.
5. **Revisión legal de documentos** (camino crítico del piloto; sin el abogado no se puede lanzar).
- Verificación visual del flujo en navegador quedó del lado del usuario (hot-reload aplicado; hard refresh recomendado para purgar estado viejo).

---

## Actualización — 2026-06-15: especialidad en onboarding y consistencia de perfiles demo

### Qué se hizo

- **Selección de especialidad en onboarding:** cuando el usuario elige el rol Profesional, aparece un selector de tarjetas (5 opciones con ícono). El submit queda bloqueado hasta elegir. La especialidad viaja en el mismo PATCH `/api/me` junto al nombre y rol. Los módulos del nav (recetas, tareas, nutrición) se activan inmediatamente sin pasos adicionales.

- **Sincronización de seed en cada arranque:** `EnsureSeedSpecialtiesAsync` en el seeder garantiza que los 4 profesionales demo tengan siempre sus especialidades correctas aunque la BD fuera creada antes de que el campo tuviera sentido.

- **Bug fixes de sesión (sesión anterior, ahora commiteados):**
  - `app-shell.tsx`: `navReady = ready` (no depende de `sessionError`) + `"guest"` incluido en el item de "Sesión" → el usuario siempre puede re-autenticarse.
  - `appsettings.Development.json`: cadena de conexión `HealthHubDb` agregada → el API ya no crashea al arrancar.

### Recomendación: portal del profesional como próximo foco de UX

El onboarding ahora captura nombre + rol + especialidad. El paso natural siguiente es que el portal profesional oriente al usuario recién registrado hacia completar su perfil (bio, precio, disponibilidad) antes de que empiece a operar. La bandera `ProfessionalOnboardingStatus` ya existe en el backend — falta consumirla en el frontend con un checklist o wizard de activación.

Este flujo de "activación post-registro" es crítico para el piloto: sin él, un profesional nuevo no sabrá qué hacer después del onboarding y el perfil quedará incompleto (bio genérica, precio en 0, sin servicios). La tasa de conversión del signup a "profesional activo" depende directamente de este paso.

### Próximo foco (orden de impacto)

1. **Verificar onboarding en navegador** — confirmar selector de especialidad funciona con cuenta Clerk real.
2. **Wizard de activación en portal profesional** — consumir `ProfessionalOnboardingStatus`, guiar a completar bio/precio/disponibilidad/servicios.
3. **Definir y registrar nombre de marca + dominio** — desbloquea Resend real y la identidad pública.
4. **Páginas públicas SEO de profesionales** — `/profesionales/{slug}`, og:tags, schema.org.
5. **Revisión legal de documentos** (camino crítico del piloto).

---

## Actualización — 2026-06-15: QA multi-agente de flujos + plan de fixes

### Qué se hizo

Corrida de QA con 4 agentes simulados (2 profesionales + 2 pacientes, uno adversario de autorización) contra el API real con dev-auth. 8 bugs confirmados, 0 falsos positivos. Reporte: [REPORTE-QA-FLUJOS-2026-06-15.md](REPORTE-QA-FLUJOS-2026-06-15.md). Plan de remediación listo para correr: [PLAN-FIXES-QA-2026-06-15.md](PLAN-FIXES-QA-2026-06-15.md).

### Recomendación: priorizar la cadena de autorización antes de cualquier piloto

De los 8 hallazgos, **C-2 (fuga de PHI entre pacientes) y H-1 (agendar para paciente ajeno) son los únicos relevantes en producción** — son lógica de autorización independiente del dev-auth, así que aplican también bajo Clerk JWT real. C-1 y H-2 (header forjado, `?userId`) están confinados a dev local porque `IsDevAuthEnabled` ya exige `IsDevelopment()` + flag + loopback; siguen valiendo la pena por correctitud y defensa en profundidad, pero no son un hueco de prod.

C-3 es el de mejor relación impacto/esfuerzo: un solo patrón (`.RequireAuthorization()` sobre 9 endpoints de especialidad, en contra del antipatrón documentado en `Program.cs`) deja **/recetas, /tareas-paciente y /nutricion devolviendo 401 en dev local** — es decir, los módulos de especialidad recién construidos no se pueden ejercitar localmente. Quitarlo es de bajo riesgo y desbloquea 3 hallazgos.

**Lección de proceso:** los módulos de especialidad se añadieron con `.RequireAuthorization()` pese a que el código ya documentaba explícitamente que rompe los tokens dev/legacy. Vale la pena un test de humo que recorra todos los `/api/*` con dev-auth y falle si alguno devuelve 401 con header válido (recomendación R-2 del reporte), para que esta regresión no se repita.

### Próximo foco actualizado

1. **Aplicar PLAN-FIXES-QA-2026-06-15.md** (empezar por FIX 1, luego la cadena C-2/H-1) — antes de exponer los módulos a usuarios reales.
2. **Verificar onboarding en navegador** (especialidad).
3. **Wizard de activación en portal profesional.**
4. **Nombre de marca + dominio → Resend productivo.**
5. **Revisión legal de documentos.**

---

## Actualización — 2026-06-15: aplicación del plan de fixes QA

### Qué se hizo

Se aplicó el plan completo en `apps/api/Program.cs` (rama `fix/qa-flow-findings`, commit `effefd2`, sin push). Los 8 hallazgos quedan cubiertos por 6 fixes, cada uno verificado con `curl` antes de avanzar al siguiente. Validación final verde: `build:api` 0 errores, `lint:web` limpio, `test:api` passed. Detalle operativo en `seguimiento-proyecto.md`.

### El hallazgo que el plan no anticipó: la misma "degradación silenciosa" otra vez

Quitar `.RequireAuthorization()` (FIX 1) destapó un **500 latente**: los POST de especialidad parseaban fechas a `DateTimeOffset` con offset local y las escribían a columnas `timestamptz`, que en Npgsql exige offset 0 (UTC). Nunca se había disparado porque el `.RequireAuthorization()` devolvía 401 **antes** de llegar al `SaveChangesAsync` — exactamente el patrón "el bug vive en el código nunca ejercitado" que ya mordió en la sesión 9 (caso "Ana Martínez"). El arreglo fue normalizar a `.ToUniversalTime()` en los 5 sitios (`prescriptions.ExpiresAt`, `patient-tasks.DueDate`, `patient-diets.ValidFrom`/`ValidUntil`, `body-measurements.MeasuredAt`). **Refuerza la recomendación R-2:** un smoke test que recorra todos los `/api/*` con dev-auth habría atrapado tanto el 401 como, al pasar el 401, el 500.

### Nota sobre payments

`/professional-portal/payments` responde **403** (no 401) a un paciente autenticado que no es profesional. Es la semántica correcta (autenticado pero no autorizado) y es preexistente; se dejó como está. Hay una inconsistencia menor: `dashboard`/`onboarding`/`subscription` usan 401 para el mismo caso. Vale la pena unificar a 403 en algún momento, pero no es bloqueante.

### Próximo foco actualizado

1. **`git push` + PR** de `fix/qa-flow-findings` (o merge) — el código está verde y commiteado, falta integrarlo.
2. **Frontend de FIX 6 (Opción B):** el backend ya deja al paciente leer sus recetas/tareas/dietas, pero no hay UI que lo consuma.
3. **Smoke test R-2** (recorrer `/api/*` con dev-auth y fallar ante 401/500 con header válido) para que la regresión de especialidad no vuelva.
4. **Reset de DB dev** para la pollución QA diferida (8 citas `apt-17815*` + 4 pagos + 31 usuarios QA) cuando convenga.
5. Verificar onboarding en navegador · wizard de activación · marca/dominio → Resend · revisión legal (sin cambios respecto al foco anterior).
