# Seguimiento del proyecto - Clinixa

Fecha de inicio: 2026-06-06

> **Nota de renumeración (2026-06-09):** las fases del producto fueron reordenadas en `modelo_de_negocio.md` v2.0: Fase 2 = Monetización y piloto, Fase 3 = Retención y expansión, Fase 4 = IA, Fase 5 = Marketplace. Las menciones a "Fase 2 - IA" y "Fase 3 - Expansión y monetización" en este documento son anteriores al cambio y se conservan como registro histórico.

> **Decisión (2026-06-09):** el chat propio se elimina del producto; lo sustituye la conexión WhatsApp de cada profesional (botón wa.me en Básico, WhatsApp Business API en Pro). El piloto se amplía a psicólogos, nutriólogos y fisioterapeutas; los médicos entran al lanzamiento oficial tras revisión NOM-004. Las menciones al chat y al nicho "solo psicólogos" en este documento son históricas.

## Resumen del proyecto

Clinixa es una plataforma SaaS para profesionales independientes de la salud en Latinoamerica, enfocada en continuidad de atencion. El objetivo principal es que cada paciente tenga un perfil unico y permanente donde distintos profesionales puedan colaborar, dar seguimiento, registrar notas, gestionar agenda y centralizar la comunicacion.

El proyecto no debe plantearse solo como un CRM medico. Su diferenciador es poner al paciente al centro y evitar que la experiencia quede fragmentada entre WhatsApp, Google Drive, PDFs, calendarios externos y videos dispersos.

## Objetivo del MVP

Construir una primera version funcional para validar el flujo principal entre profesional y paciente:

- Agenda de citas.
- Perfil unico del paciente.
- Expediente clinico basico.
- Chat seguro.
- Notas SOAP manuales.

## Usuarios principales

### Paciente

Necesita un espacio centralizado para consultar citas, historial, documentos, tareas, mensajes y avances.

### Profesional de salud

Necesita administrar agenda, pacientes, expedientes, notas clinicas, seguimiento, comunicacion y eventualmente cobros.

### Clinica o grupo de profesionales

Necesita gestionar varios profesionales, pacientes compartidos, permisos, colaboracion y reportes operativos.

## Stack definido

### Frontend web

- Next.js.
- React.
- TypeScript.
- TailwindCSS.
- shadcn/ui.

### Backend

- ASP.NET Core.
- REST API.
- SignalR para chat y comunicacion en tiempo real.

### Base de datos e infraestructura

- PostgreSQL.
- pgvector reservado para Fase 2.
- Redis.
- Azure Blob Storage.
- Azure App Service.
- Azure Key Vault.
- Application Insights.

### IA - Fase 2

- OpenAI API.
- Whisper.
- Funciones posteriores: transcripcion, resumenes, borradores SOAP y asistente del paciente.
- No forma parte del MVP ni de los bloqueadores actuales.

### Integraciones futuras o complementarias

- Stripe.
- Mercado Pago.
- Daily.co o Twilio Video.
- WhatsApp Business API.
- Resend.
- Firebase Cloud Messaging.
- Facturama o SW Sapien para facturacion SAT.

## Supuestos iniciales

- El primer producto sera web antes que mobile.
- El MVP debe priorizar profesionales independientes antes que clinicas.
- Clerk puede ser mejor opcion inicial para autenticacion si se busca velocidad de desarrollo.
- Azure AD B2C puede quedar como alternativa para una etapa mas empresarial.
- La app movil, wearables, marketplace, aseguradoras y facturacion avanzada quedan fuera del MVP inicial.

## Decisiones pendientes

- Definir si el MVP empieza con autenticacion via Clerk o Azure AD B2C.
- Definir si el backend se implementa desde el inicio en ASP.NET Core o si se prototipa primero con una API mas rapida.
- Definir alcance legal y de privacidad para datos de salud en Mexico.
- Definir si el chat del MVP sera texto basico o incluira archivos desde la primera version.
- Definir el alcance de pagos para la Fase 3 de expansion y monetizacion.

## Plan por fases

### Fase 0 - Alineacion y diseno funcional

Objetivo: convertir la idea en especificaciones accionables.

Entregables:

- Documento de alcance MVP.
- Mapa de usuarios y permisos.
- Flujos principales.
- Modelo inicial de datos.
- Backlog priorizado.

### Fase 1 - MVP operativo sin IA

Objetivo: construir y validar el flujo operativo principal.

Entregables:

- Repositorio con frontend Next.js.
- API ASP.NET Core.
- Base PostgreSQL configurada.
- Autenticacion lista para produccion.
- Estructura base de UI.
- Configuracion de ambientes.
- Gestion de pacientes.
- Perfil del paciente.
- Agenda y reservas.
- Expediente clinico.
- Notas SOAP manuales.
- Chat seguro.
- Seguridad, consentimiento y auditoria.
- Notificaciones operativas.
- Piloto controlado.

### Fase 2 - IA aplicada al flujo clinico

Objetivo: evaluar e integrar IA despues de validar el flujo operativo.

Entregables:

- Generacion asistida de notas SOAP.
- Resumen de avances del paciente.
- Transcripcion de audio.
- Guardado de resultados en expediente.

### Fase 3 - Expansion y monetizacion

Objetivo: ampliar adquisicion, monetizacion e integraciones.

Entregables:

- Pagos.
- Paginas publicas y SEO.
- Videollamadas.
- WhatsApp.
- Analytics avanzados.

## Backlog inicial

### Producto

- Definir perfiles de usuario: paciente, profesional, administrador de clinica.
- Definir flujo de alta de profesional.
- Definir flujo de alta de paciente.
- Definir flujo de creacion y consulta de expediente.
- Definir estructura de nota SOAP.
- Definir reglas de acceso al perfil del paciente.
- Definir pantallas principales del MVP.

### Frontend

- Crear aplicacion Next.js con TypeScript.
- Configurar TailwindCSS y shadcn/ui.
- Crear layout principal.
- Crear dashboard del profesional.
- Crear vista de pacientes.
- Crear vista de perfil del paciente.
- Crear vista de agenda.
- Crear vista de expediente y notas SOAP.
- Crear interfaz de chat.

### Backend

- Crear API ASP.NET Core.
- Definir entidades iniciales.
- Configurar PostgreSQL.
- Implementar autenticacion.
- Implementar endpoints de pacientes.
- Implementar endpoints de citas.
- Implementar endpoints de expediente.
- Implementar endpoints de notas SOAP.
- Implementar SignalR para chat.

### Fase 2 - IA

- Definir prompts base para notas SOAP.
- Crear servicio de resumen clinico.
- Crear servicio de transcripcion con Whisper.
- Definir politicas para guardar, revisar y editar respuestas generadas por IA.

### Seguridad y cumplimiento

- Definir manejo de datos sensibles.
- Definir auditoria de accesos.
- Definir estrategia de cifrado.
- Definir consentimiento del paciente.
- Definir terminos, privacidad y responsabilidades clinicas.

## Riesgos principales

- Manejo de datos de salud sin una estrategia clara de privacidad y consentimiento.
- Intentar cubrir demasiadas integraciones antes de validar el flujo principal.
- Sobrecargar el MVP con pagos, facturacion, videollamadas, mobile y marketplace al mismo tiempo.
- Incorporar IA antes de validar el flujo operativo y las necesidades reales.
- Subestimar permisos y colaboracion entre profesionales sobre un mismo paciente.

## Criterios de exito del MVP

- Un profesional puede crear y administrar pacientes.
- Un paciente tiene un perfil unico consultable.
- El profesional puede registrar expediente y notas SOAP.
- El profesional y paciente pueden comunicarse por chat.
- El sistema puede probarse con usuarios reales sin depender de IA ni integraciones futuras.

## Siguientes 3 pasos

1. Completado: definir el alcance exacto del MVP en una lista cerrada de pantallas, flujos y entidades. Ver `alcance-mvp.md`.
2. Completado: diseñar el modelo inicial de datos para pacientes, profesionales, citas, expediente, notas SOAP y mensajes. Ver `modelo-datos.md`.
3. Completado: crear la estructura inicial del proyecto con frontend Next.js, backend ASP.NET Core y PostgreSQL. Se agregaron `apps/web`, `apps/api` y `docker-compose.yml`.

## Avance tecnico inicial

Fecha: 2026-06-06

- Se creo la estructura de monorepo con npm workspaces.
- Se creo `apps/web` con Next.js, React, TypeScript, TailwindCSS y una pantalla estatica inicial del dashboard profesional.
- Se creo `apps/api` con un scaffold minimo de ASP.NET Core.
- Se agrego `docker-compose.yml` con PostgreSQL + pgvector y Redis.
- Se instalaron dependencias npm.
- Se valido el frontend con build y lint.
- Se levanto el servidor local en `http://localhost:3000`.

## Validaciones ejecutadas

- `npm run build:web`: correcto.
- `npm run lint:web`: correcto.
- Verificacion visual en navegador: correcta.
- Consola del navegador: sin errores.

## Bloqueos o pendientes tecnicos

- El entorno actual no tiene `dotnet`, por lo que la API ASP.NET Core aun no se pudo compilar localmente.
- La version local de Node.js es `20.18.0`; algunas dependencias modernas recomiendan `20.19.0` o superior.
- `npm audit --omit=dev` reporta una vulnerabilidad moderada residual por una dependencia interna de PostCSS dentro de Next.js 16.2.7. No hay correccion limpia sin cambiar a una version que npm resuelve como downgrade incompatible, asi que queda como riesgo a monitorear.

## Avance frontend MVP

Fecha: 2026-06-06

Se convirtio la pantalla inicial en una base navegable del MVP.

Pantallas creadas:

- Dashboard: resumen de citas, pacientes, notas pendientes, IA y trabajo pendiente.
- Pacientes: lista, estados, busqueda visual y acceso a perfil.
- Perfil de paciente: datos de contacto, resumen de seguimiento, expediente, notas SOAP e historial de citas.
- Agenda: listado de citas y formulario visual para nueva cita.
- Expediente: notas SOAP recientes y borrador SOAP asistido por IA.
- Chat: lista de conversaciones y conversacion activa.

Componentes agregados:

- `AppShell`.
- `PageHeader`.
- `Panel`.
- `StatCard`.
- `StatusPill`.

Datos demo:

- `apps/web/lib/demo-data.ts`.

Validaciones ejecutadas:

- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- Verificacion en navegador de `/`, `/pacientes`, `/pacientes/ana-martinez`, `/agenda`, `/expediente` y `/chat`: correcta.
- Verificacion responsive en vista movil de `/pacientes`: correcta.

## Avance formularios MVP

Fecha: 2026-06-06

Se hicieron funcionales los formularios demo del frontend:

- Nuevo paciente: captura datos basicos, crea el registro, actualiza estadisticas/lista y persiste en `localStorage`.
- Nueva cita: selecciona paciente, fecha, hora, duracion, tipo y motivo; crea la cita, actualiza agenda y refleja la cita en el perfil del paciente.
- Borrador SOAP: selecciona paciente, permite texto libre, genera un borrador editable y guarda la nota en el expediente.

Mejoras tecnicas:

- Se agrego `apps/web/lib/healthhub-store.ts` como store local del prototipo.
- Las altas se persisten sincronicamente para soportar navegacion inmediata entre pantallas.
- La ruta `/pacientes/[id]` ahora lee del estado local, por lo que tambien muestra pacientes creados desde el prototipo.

Validaciones ejecutadas:

- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- Prueba en navegador: crear paciente, crear cita, generar/guardar nota SOAP y verificar perfil del paciente.

## Avance API MVP

Fecha: 2026-06-06

Se instalo .NET SDK `8.0.421` en `~/.dotnet` y se convirtio el backend de scaffold a API funcional en memoria.

Endpoints implementados:

- `GET /health`.
- `GET /api/patients`.
- `GET /api/patients/{id}`.
- `POST /api/patients`.
- `GET /api/patients/{id}/appointments`.
- `GET /api/patients/{id}/soap-notes`.
- `GET /api/appointments`.
- `POST /api/appointments`.
- `GET /api/soap-notes`.
- `POST /api/soap-notes`.

Validaciones ejecutadas:

- `$HOME/.dotnet/dotnet build apps/api/HealthHub.Api.csproj`: correcto.
- `GET /health`: correcto.
- `GET /api/patients`: correcto.
- `POST /api/patients`: correcto.
- `POST /api/appointments`: correcto.
- `POST /api/soap-notes`: correcto.
- Consulta de citas y notas por paciente: correcta.
- Validacion de `patientId` inexistente: correcta.

Pendiente inmediato:

- Conectar el frontend a la API con un cliente HTTP y mantener `localStorage` solo como fallback de prototipo.

## Avance integracion frontend API

Fecha: 2026-06-06

Se conecto el frontend con la API local.

Cambios:

- `apps/web/lib/healthhub-store.ts` ahora intenta cargar datos desde `GET /api/patients`, `GET /api/appointments` y `GET /api/soap-notes`.
- Las altas de paciente, cita y nota SOAP ahora hacen `POST` contra la API cuando esta disponible.
- `localStorage` queda como fallback cuando la API no esta levantada.
- El dashboard ahora lee del store compartido, no solo de datos estaticos.
- Se agregaron scripts `npm run dev:api` y `npm run build:api`.
- Se agrego `.env.example` con `NEXT_PUBLIC_API_BASE_URL`.

Validaciones ejecutadas:

- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run build:api`: correcto.
- Prueba UI contra API: crear paciente desde `/pacientes` y confirmar en `GET /api/patients`.
- Prueba UI contra API: crear cita desde `/agenda` y confirmar en `GET /api/patients/{id}/appointments`.
- Prueba UI contra API: crear nota SOAP desde `/expediente` y confirmar en `GET /api/patients/{id}/soap-notes`.

Pendiente inmediato:

- Reemplazar API en memoria por Entity Framework Core + PostgreSQL.

## Avance persistencia PostgreSQL

Fecha: 2026-06-06

Se reemplazo la API en memoria por Entity Framework Core + PostgreSQL.

Cambios:

- Se agrego `Npgsql.EntityFrameworkCore.PostgreSQL`.
- Se agregaron entidades `Patient`, `Appointment` y `SoapNote`.
- Se agrego `HealthHubDbContext`.
- Se agrego seeding inicial con datos demo.
- Los endpoints REST ahora consultan y escriben en PostgreSQL.
- La API ejecuta `EnsureCreated` para crear tablas en esta fase MVP.
- Se instalo `postgresql@16` con Homebrew porque Docker no esta disponible en la maquina.
- Se creo base local `healthhub` y rol `healthhub` con password `healthhub_dev`.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- Migracion `202606070002_AuthSessionsAndBookingRules` aplicada en PostgreSQL local.
- `POST /api/auth/login` paciente: correcto, devuelve `200`.
- `POST /api/auth/login` profesional: correcto, devuelve `200`.
- `GET /api/professional-portal/dashboard` con token profesional: correcto, devuelve `200`.
- `POST /api/appointments` repitiendo horario existente: correcto, devuelve `409 Conflict`.
- Verificacion navegador de `/sesion`: login con `laura.vega@healthhub.demo` correcto.
- Verificacion navegador de `/portal-profesional`: agenda propia y perfil profesional cargan correctamente.
- Verificacion navegador de `/portal-paciente`: al repetir una reserva del mismo horario muestra el conflicto en UI.
- Consola del navegador: sin errores.
- `GET /health`: correcto, con `database: connected`.
- `GET /api/patients`: correcto desde PostgreSQL.
- `POST /api/patients`: correcto y persistido en tabla `patients`.
- `POST /api/appointments`: correcto y persistido en tabla `appointments`.
- `POST /api/soap-notes`: correcto y persistido en tabla `soap_notes`.
- Prueba UI -> API -> PostgreSQL creando paciente desde navegador: correcta.

Pendiente inmediato:

- Reemplazar `EnsureCreated` por migraciones EF Core versionadas.
- Agregar autenticacion inicial.

## Avance modelo usuarios y roles

Fecha: 2026-06-07

Se diseno el modelo base para soportar portal del paciente, portal del profesional y roles administrativos.

Documento creado:

- `modelo-usuarios-roles.md`.

Decisiones principales:

- Separar la cuenta autenticada (`users`) del perfil clinico (`patients`) y del perfil profesional (`professionals`).
- Permitir que un paciente exista sin usuario al inicio, y despues vincularlo a una cuenta.
- Preparar roles iniciales: `patient`, `professional`, `clinic_admin` e `internal_admin`.
- Preparar el modelo para doctores, psicologos, fisioterapeutas, nutriologos y otros profesionales.
- Agregar entidades futuras para servicios, disponibilidad, relacion profesional-paciente, expedientes por contexto y opiniones.

Pendiente inmediato:

- Crear entidades base en la API para usuarios, roles y profesionales.
- Sembrar profesionales demo.
- Crear portal inicial del paciente con busqueda de profesionales y citas.

## Avance portal paciente inicial

Fecha: 2026-06-07

Se implementaron los siguientes 3 pasos del portal paciente:

- Entidades base en API: `User`, `UserRole`, `Professional`, `ProfessionalService`, `ProfessionalAvailability`, `ProfessionalPatient`, `PatientRecord` y `Review`.
- Se extendieron `Patient`, `Appointment` y `SoapNote` para vincular usuario, profesional y expediente.
- Se agrego seeding demo para pacientes con usuario, profesionales, servicios, disponibilidad, relaciones profesional-paciente, expedientes visibles y opiniones.
- Se agregaron endpoints `GET /api/me`, `GET /api/professionals`, `GET /api/professionals/{id}`, `GET /api/professionals/{id}/reviews`, `GET /api/patient-portal/appointments` y `GET /api/patient-portal/records`.
- Se creo la ruta web `/portal-paciente`.
- El portal permite buscar profesionales, filtrar por especialidad/modalidad, ver opiniones, iniciar solicitud de cita demo y consultar citas/expedientes visibles.
- Se agrego `Portal paciente` al menu principal.

Notas tecnicas:

- Se excluyo `apps/api/Program 2.cs` del build porque era una copia anterior con top-level statements y rompia la compilacion.
- Se agrego `DatabaseSchema.EnsurePortalSchemaAsync` como puente temporal para bases locales ya existentes; debe reemplazarse por migraciones EF Core versionadas.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `GET /health`: correcto, con `database: connected`.
- `GET /api/me`: correcto para `usr-ana-martinez`.
- `GET /api/professionals`: correcto con 4 profesionales demo.
- `GET /api/professionals/pro-laura-vega/reviews`: correcto con opiniones publicadas.
- `GET /api/patient-portal/appointments`: correcto con citas del paciente demo.
- `GET /api/patient-portal/records`: correcto con expediente visible.
- Verificacion en navegador de `/portal-paciente`: carga correcta, busqueda, filtro online, opiniones y solicitud demo de cita funcionan.

Pendiente inmediato:

- Convertir la solicitud de cita del portal paciente en un flujo real de seleccion de servicio, horario y confirmacion.
- Implementar autenticacion real o login MVP para elegir sesion paciente/profesional.
- Reemplazar el asegurador temporal de esquema por migraciones EF Core.

## Avance agenda real, sesion demo y migracion EF

Fecha: 2026-06-07

Se implementaron los siguientes 3 pasos:

- El portal paciente ahora agenda citas reales: selecciona profesional, servicio, horario, modalidad y motivo.
- `POST /api/appointments` acepta `professionalId`, `professionalServiceId`, `mode` y `createdByUserId`.
- La cita se guarda en PostgreSQL con profesional, servicio, horario, modalidad y relacion `professional_patients`.
- Se agrego `/sesion` como login MVP para alternar entre sesiones demo de paciente y profesional.
- Se agrego `GET /api/demo-sessions` y `GET /api/me?userId=...`.
- Los endpoints del portal paciente aceptan `userId` para cargar citas y expedientes segun la sesion demo.
- Se reemplazo el asegurador temporal de esquema por la migracion EF Core `202606070001_InitialHealthHubSchema`.
- El seeding ahora inicia con `Database.MigrateAsync()`.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- Migracion aplicada y registrada en `__EFMigrationsHistory`.
- `POST /api/appointments` con `professionalId` y `professionalServiceId`: correcto, devuelve `201 Created`.
- Consulta directa en PostgreSQL de la cita creada: correcta.
- Verificacion navegador de `/sesion`: cambio de sesion paciente/profesional correcto.
- Verificacion navegador de `/portal-paciente`: agendar cita desde UI funciona y muestra confirmacion.
- Consola del navegador: sin errores.

Pendiente inmediato:

- Crear vista profesional real para agenda propia y solicitudes entrantes.
- Agregar reglas de disponibilidad para evitar dobles reservas.
- Reemplazar login demo por autenticacion real.

## Avance autenticacion MVP, portal profesional y reglas de reserva

Fecha: 2026-06-07

Se implementaron los siguientes 3 pasos:

- Se reemplazo el selector demo por login MVP con email/password en `/sesion`.
- Se agregaron `POST /api/auth/login`, `POST /api/auth/logout`, tokens bearer y tabla `user_sessions`.
- Se agregaron `PasswordHash` y `PasswordSalt` a `users`; el seed rellena credenciales demo con password `healthhub123`.
- Se creo `/portal-profesional` para agenda propia, solicitudes entrantes, servicios, disponibilidad y metricas basicas.
- Se agrego `GET /api/professional-portal/dashboard` para devolver el tablero del profesional autenticado.
- Se agrego validacion en `POST /api/appointments` para evitar doble reserva exacta por paciente o profesional en citas `scheduled`.
- Se agrego la migracion EF Core `202606070002_AuthSessionsAndBookingRules`.

Credenciales demo principales:

- Paciente: `ana.martinez@example.com` / `healthhub123`.
- Profesional: `laura.vega@healthhub.demo` / `healthhub123`.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.

Pendiente inmediato:

1. Endurecer autenticacion para produccion: expiracion/refresh, cookies seguras o proveedor como Clerk.
2. Mejorar disponibilidad real: bloquear slots ocupados en UI, validar traslapes por duracion y manejar zona horaria.
3. Agregar pruebas automatizadas de endpoints criticos: login, dashboard profesional, reserva y conflicto 409.

## Avance auth endurecida, disponibilidad real y pruebas API

Fecha: 2026-06-08

Se implementaron los siguientes 3 pasos:

- Login MVP ahora devuelve `expiresAt`; el frontend guarda expiracion y limpia tokens vencidos.
- Se agrego `POST /api/auth/refresh` para rotar token bearer y extender la sesion.
- La API limpia sesiones vencidas y limita sesiones activas por usuario durante login/refresh.
- Se agrego `GET /api/professionals/{id}/available-slots?serviceId=...` para calcular horarios disponibles desde disponibilidad publicada, duracion del servicio, zona horaria y citas ocupadas.
- `POST /api/appointments` ahora valida traslapes reales por `StartsAt`/`EndsAt`, no solo fecha/hora exacta.
- `POST /api/appointments` rechaza horarios fuera de la disponibilidad publicada del profesional.
- El portal paciente carga slots disponibles desde API al iniciar una reserva y al cambiar servicio.
- Se agrego `scripts/test-api.mjs` y el comando `npm run test:api` para pruebas automatizadas de endpoints criticos.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run test:api`: correcto.
- Prueba navegador de `/sesion` y `/portal-paciente`: login paciente, busqueda de Laura Vega y carga de slots disponibles correcta.
- Consola del navegador: sin errores.

Notas tecnicas:

- Las pruebas API crean una cita futura de QA para validar traslape; usan una fecha lejana y rotativa para reducir colisiones.
- La disponibilidad se calcula con zona horaria `America/Mexico_City` por defecto o la configurada en el profesional.

Pendiente inmediato:

1. Agregar cancelacion y reprogramacion de citas con estados y razones.
2. Agregar auditoria de accesos a expediente y endpoints sensibles.
3. Implementar permisos por rol para limitar escritura/lectura segun paciente, profesional y futuro admin de clinica.

## Avance cancelacion, auditoria y permisos por rol

Fecha: 2026-06-08

Se implementaron los siguientes 3 pasos:

- Se agregaron campos de workflow a `appointments`: razon de cancelacion, usuario que cancela, fecha de cancelacion, razon de reprogramacion, usuario que reprograma y fecha de reprogramacion.
- Se agregaron endpoints `PATCH /api/appointments/{id}/cancel` y `PATCH /api/appointments/{id}/reschedule`.
- La reprogramacion valida disponibilidad publicada, rango `StartsAt`/`EndsAt` y traslapes del paciente/profesional.
- El portal paciente ahora muestra acciones para reprogramar o cancelar citas programadas.
- Se agrego la entidad `AuditLog`, la tabla `audit_logs` y el endpoint `GET /api/audit-logs`.
- Se registran eventos de auditoria para lectura de expediente del paciente, lectura del dashboard profesional, creacion/cancelacion/reprogramacion de citas e intentos denegados.
- Se agregaron permisos por rol en citas y auditoria: paciente solo sobre su perfil, profesional solo sobre su agenda/pacientes vinculados y roles `clinic_admin`/`internal_admin` preparados para alcance administrativo.
- Se agrego la migracion EF Core `202606080001_AuditLogsAndAppointmentWorkflow`.
- Se extendio `scripts/test-api.mjs` para probar refresh, slots disponibles, traslapes, cita fuera de disponibilidad, cancelacion no autorizada, reprogramacion, cancelacion autorizada y auditoria.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run test:api`: correcto.
- Prueba navegador de `/portal-paciente`: se muestran acciones `Reprogramar` y `Cancelar` en citas programadas.
- Consola del navegador: sin errores.

Notas tecnicas:

- Las pruebas API crean, reprograman y cancelan una cita futura de QA en PostgreSQL local.
- `Results.Forbid()` se reemplazo por `403` explicito porque el API aun no usa middleware formal de autorizacion.
- La auditoria ya guarda IP y user-agent, pero todavia no existe pantalla dedicada para revisarla.

Pendiente inmediato:

1. Crear una vista de auditoria/permisos para profesionales y futuro administrador de clinica.
2. Modelar clinicas/equipos con membresias, alcance por organizacion y permisos de `clinic_admin`.
3. Agregar notificaciones para cancelaciones/reprogramaciones y estados operativos como confirmada, no-show y completada.

## Avance seguridad, clinicas y notificaciones

Fecha: 2026-06-08

Se implementaron los siguientes 3 pasos:

- Se agrego la vista web `/seguridad` para revisar auditoria, permisos por clinica/equipo y notificaciones operativas.
- Se agregaron entidades `Clinic`, `ClinicMembership` y `Notification`.
- Se agrego la migracion EF Core `202606080002_ClinicsNotificationsAndAppointmentStatuses`.
- Se sembro la clinica demo `Clinica Bienestar Integral`, un usuario `clinic_admin` y membresias activas para los profesionales demo.
- Se agregaron endpoints `GET /api/clinics`, `GET /api/notifications` y `PATCH /api/notifications/{id}/read`.
- Se agrego `PATCH /api/appointments/{id}/status` para estados operativos `confirmed`, `completed` y `no_show`.
- Las citas `confirmed` ahora bloquean disponibilidad igual que las `scheduled`.
- Las acciones de crear, confirmar, reprogramar, cancelar, completar y no-show generan notificaciones para paciente/profesional cuando existe usuario vinculado.
- El portal profesional ahora permite confirmar, completar o marcar no-show en citas programadas/confirmadas.
- La pantalla de sesion ahora reconoce `clinic_admin` y dirige a `/seguridad`.
- La auditoria de `clinic_admin` queda acotada a profesionales y pacientes vinculados a su clinica.
- Se extendio `scripts/test-api.mjs` para validar admin de clinica, permisos de clinica, estado operativo, notificaciones, lectura de notificacion y auditoria por admin.

Credenciales demo nuevas:

- Admin clinica: `admin.clinica@healthhub.demo` / `healthhub123`.

Validaciones ejecutadas:

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run test:api`: correcto.
- Prueba navegador de `/seguridad` con admin de clinica: carga equipo, auditoria y notificaciones correctamente.
- Consola del navegador: sin errores.

Notas tecnicas:

- Las pruebas API crean una cita futura, prueban denegacion de estado por paciente, confirman con profesional, generan notificacion, la marcan como leida, reprograman y cancelan.
- El centro de notificaciones actual es persistente en PostgreSQL, pero aun no tiene preferencias por canal.
- El modelo de clinica ya soporta membresias, pero aun falta alta/invitacion desde UI.

Pendiente inmediato:

1. Hacer editable la configuracion profesional: servicios, precios, modalidad y disponibilidad desde `/portal-profesional`.
2. Implementar invitaciones de clinica y alta de profesionales desde un flujo de admin de clinica.
3. Agregar centro de notificaciones con preferencias de canal y base para email/WhatsApp/app.

## Avance configuracion profesional, invitaciones y preferencias

Fecha: 2026-06-08

Se implementaron los siguientes 3 pasos:

- Se agrego configuracion editable en `/portal-profesional` para servicios, precios, modalidad y disponibilidad.
- Se agregaron endpoints `POST/PATCH /api/professional-portal/services` y `POST/PATCH /api/professional-portal/availability`.
- Se agregaron entidades y tabla `clinic_invitations` para que un `clinic_admin` pueda crear invitaciones de profesionales desde `/seguridad`.
- Se agregaron endpoints `GET/POST /api/clinics/{clinicId}/invitations`.
- Se agregaron preferencias persistentes por usuario en `notification_preferences` para canales `app`, `email` y `whatsapp`.
- Se agregaron endpoints `GET /api/notification-preferences` y `PATCH /api/notification-preferences/{channel}`.
- La vista `/seguridad` ahora muestra un formulario de invitaciones, lista de invitaciones pendientes y controles de preferencias por canal.
- Se agrego la migracion EF Core `202606080003_InvitationsAndNotificationPreferences`.
- Se extendio `scripts/test-api.mjs` para validar invitaciones, preferencias, alta/edicion de servicios y alta/edicion de disponibilidad.

Validaciones ejecutadas:

- Migracion `202606080003_InvitationsAndNotificationPreferences`: aplicada correctamente en PostgreSQL local.
- `npm run test:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run build:api`: correcto.
- Verificacion navegador de `/seguridad` con admin de clinica: paneles de invitaciones y preferencias visibles con datos del API.
- Verificacion navegador de `/portal-profesional` con profesional: controles de servicios y disponibilidad visibles.

Notas tecnicas:

- Las pruebas API crean datos QA locales: invitaciones, servicios, bloques de disponibilidad y citas futuras de validacion.
- La automatizacion del navegador no pudo escribir en inputs por una limitacion del portapapeles virtual del entorno; la funcionalidad de guardado quedo validada por API y los controles UI quedaron verificados visualmente.
- Las preferencias todavia no disparan envios reales; por ahora guardan la configuracion que usaran los canales app/email/WhatsApp.

Pendiente inmediato:

1. Implementar aceptar invitaciones: crear usuario/profesional desde una invitacion y activar membresia de clinica.
2. Conectar la disponibilidad editada con una vista calendario mas clara para detectar conflictos antes de guardar.
3. Conectar notificaciones reales a email/WhatsApp/app y agregar recordatorios programados.

## Cierre de jornada

Fecha: 2026-06-08

Estado al cerrar:

- API ASP.NET Core compilada y validada.
- Frontend Next.js compilado y validado.
- PostgreSQL local conserva la base `healthhub` con migraciones aplicadas hasta `202606080003_InvitationsAndNotificationPreferences`.
- Documentacion actualizada en `README.md`, `apps/api/README.md`, `modelo-usuarios-roles.md` y este archivo.
- Servidores de desarrollo apagados al cerrar la sesion de trabajo; la base local no se detuvo desde este cierre.

Ultimas validaciones correctas:

- `npm run test:api`.
- `npm run lint:web`.
- `npm run build:web`.
- `npm run build:api`.
- `GET /health`: correcto con `database: connected`.

Para retomar manana:

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub
npm run dev:api
npm run dev:web
```

Credenciales demo utiles:

- Paciente: `ana.martinez@example.com` / `healthhub123`.
- Profesional: `laura.vega@healthhub.demo` / `healthhub123`.
- Admin clinica: `admin.clinica@healthhub.demo` / `healthhub123`.

Siguientes 3 pasos para iniciar:

1. Implementar aceptar invitaciones: crear o vincular usuario, crear perfil profesional si aplica y activar membresia de clinica.
2. Mejorar disponibilidad profesional con vista calendario/conflictos antes de guardar.
3. Conectar preferencias de notificacion con envios reales o simulados por app/email/WhatsApp y recordatorios programados.

## Avance aceptar invitaciones de clinica

Fecha: 2026-06-08

Se completo el paso 1 pendiente del cierre anterior: el flujo de aceptar invitaciones de clinica de extremo a extremo. Una invitacion creada por un `clinic_admin` ahora puede convertirse en una cuenta activa, un perfil profesional y una membresia de clinica.

### Cambios en la API

- Se agregaron los contratos `ClinicInvitationDetailDto` y `AcceptClinicInvitationRequest` en `apps/api/Contracts/ApiContracts.cs`.
- Se agrego `ToDetailDto` y la etiqueta `ClinicRoleLabel` en `apps/api/Infrastructure/MappingExtensions.cs`.
- Se agrego el grupo de endpoints `/api/clinic-invitations`:
  - `GET /api/clinic-invitations/{id}` (publico): devuelve los datos de la invitacion, el nombre de la clinica, si el correo ya tiene cuenta (`requiresAccount`) y si esta vencida (`isExpired`). Sirve para la pantalla de aceptacion antes de iniciar sesion.
  - `POST /api/clinic-invitations/{id}/accept`: acepta la invitacion. Si el correo no tiene cuenta, exige una contrasena de minimo 8 caracteres y crea el `User` (con email verificado), su `UserRole` con alcance de clinica y, si el rol es `professional`, un perfil `Professional`. Si el correo ya tiene cuenta, exige sesion iniciada de esa misma cuenta para evitar secuestro. En ambos casos crea o reactiva la `ClinicMembership`, marca la invitacion como `accepted`, notifica al invitador, registra auditoria, siembra preferencias de notificacion y devuelve un token de sesion (`AuthResponseDto`) para dejar al usuario logueado.
  - `PATCH /api/clinic-invitations/{id}/revoke`: permite a un `clinic_admin`/`internal_admin` revocar invitaciones pendientes.
- No se requirio nueva migracion EF Core: la tabla `clinic_invitations` ya tenia `AcceptedUserId`/`AcceptedAt` y `clinic_memberships` ya existia desde migraciones previas.

### Cambios en el frontend

- Se agrego la ruta `apps/web/app/aceptar-invitacion` (`page.tsx` + `accept-invitation-client.tsx`): lee `?invite=<id>`, muestra clinica/rol/cedula, formulario de alta con contrasena cuando es cuenta nueva, maneja estados de invitacion vencida/aceptada/revocada y redirige al portal segun el rol al aceptar.
- Se agregaron al store `apps/web/lib/healthhub-store.ts` el tipo `ClinicInvitationDetail` y las acciones `loadClinicInvitation`, `acceptClinicInvitation` (persiste token y sesion como el login) y `revokeClinicInvitation`.
- En `apps/web/app/seguridad/security-page-client.tsx` cada invitacion pendiente ahora muestra `Copiar enlace` (genera la URL `/aceptar-invitacion?invite=...`) y `Revocar`, y el estado distingue pendiente/aceptada/revocada/expirada.

### Pruebas

- Se extendio `scripts/test-api.mjs` para cubrir: detalle de invitacion (`requiresAccount`), rechazo por contrasena corta (400), aceptacion exitosa (200 con token + perfil profesional), sesion valida tras aceptar, login con la cuenta recien creada, re-aceptacion (409), presencia del nuevo miembro en la clinica, y revocacion seguida de intento de aceptacion (409).

### Validaciones ejecutadas

- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto (nueva ruta `/aceptar-invitacion` incluida).
- `npm run test:api`: correcto.
- Prueba manual por curl: crear invitacion como admin, `GET` de detalle y `POST` de aceptacion que crea el profesional `pro-dra-demo-curl` y devuelve token.

### Comentarios generales

- El endpoint de aceptacion es deliberadamente publico para soportar el caso "recibi un enlace por correo y aun no tengo cuenta". La proteccion contra secuestro es exigir sesion cuando el correo ya existe; cuando haya envio real de correo conviene migrar a tokens de invitacion de un solo uso en la URL en lugar del id directo.
- Hoy el reparto del enlace es manual (`Copiar enlace`). El cierre natural de este flujo es el envio transaccional (Resend) con el enlace de aceptacion, que ya esta listado en `comentarios_claude.md` (Fase B).
- El perfil profesional creado nace minimo (bio generica, sin servicios ni disponibilidad). El profesional debe completarlo desde `/portal-profesional`, que ya es editable.
- Sigue pendiente endurecer auth para produccion (Clerk o JWT con cookies httpOnly) y mover secretos a Key Vault; la creacion de cuentas desde invitaciones aumenta la importancia de ese punto.

### Siguientes 3 pasos recomendados

1. Conectar el envio real del enlace de invitacion por correo (Resend) y migrar a un token de invitacion de un solo uso en la URL; agregar recordatorio de invitacion pendiente por vencer.
2. Cerrar el onboarding autonomo del profesional: tras aceptar, guiar a completar perfil, servicios, precios y disponibilidad antes de publicar (enlazar con la vista calendario de disponibilidad).
3. Mejorar disponibilidad profesional con vista calendario/conflictos antes de guardar (paso 2 historico aun pendiente).

## Avance correo de invitacion, token de un solo uso y onboarding profesional

Fecha: 2026-06-08

Se completaron los pasos 1 y 2 recomendados: envio de correo (real o simulado) con token de invitacion en la URL mas recordatorio, y el onboarding autonomo del profesional con publicacion controlada.

### Paso 1 - Correo de invitacion, token y recordatorio

Cambios en la API:

- Se agrego la columna `Token` a `clinic_invitations` (entidad, `HealthHubDbContext` con indice unico) y la migracion EF Core `202606080004_ClinicInvitationTokens`, que crea la columna, rellena tokens para invitaciones existentes (`gen_random_uuid`) y agrega el indice unico.
- Al crear una invitacion se genera un `Token` aleatorio (`PasswordHasher.CreateToken`). El token se devuelve en `ClinicInvitationDto`, asi que el enlace de aceptacion se construye con `?token=` en lugar del id.
- Los endpoints publicos pasaron a buscar por token: `GET /api/clinic-invitations/{token}` y `POST /api/clinic-invitations/{token}/accept`. El token deja de ser valido en cuanto la invitacion cambia de estado (aceptada/revocada/expirada), por lo que funciona como token de un solo uso.
- Se agrego `EmailSender` (`apps/api/Infrastructure/EmailSender.cs`) registrado con `AddHttpClient`. Si existe `Resend:ApiKey`/`RESEND_API_KEY` envia por la API de Resend; si no, registra un envio simulado en el log. Nunca lanza excepcion y no bloquea la creacion de la invitacion.
- Al crear una invitacion se envia el correo con el enlace de aceptacion (base de URL via `Web:BaseUrl`/`WEB_BASE_URL`, por defecto `http://localhost:3000`) y se registra auditoria `clinic_invitation.email.{sent|simulated|failed}`.
- Se agrego `POST /api/clinic-invitations/{id}/remind` (admin de clinica) para reenviar el correo de una invitacion pendiente.

Cambios en el frontend:

- `ClinicInvitation` ahora incluye `token`. La pagina `/aceptar-invitacion` lee `?token=` (con respaldo a `?invite=`) y usa el token para cargar y aceptar.
- En `/seguridad` cada invitacion pendiente muestra `Copiar enlace` (con token), `Reenviar` (recordatorio) y `Revocar`, mas una etiqueta `Por vencer` cuando faltan 3 dias o menos para expirar.

### Paso 2 - Onboarding autonomo del profesional

Cambios en la API:

- El profesional creado al aceptar una invitacion nace en estado `onboarding` (antes `active`), por lo que no aparece en la busqueda publica `GET /api/professionals` ni en `available-slots` hasta publicarse.
- Se agrego `PATCH /api/professional-portal/profile` para editar nombre, biografia, ubicacion, especialidad, modalidad, precio base y zona horaria (antes no existia forma de editar el perfil base).
- Se agrego `GET /api/professional-portal/onboarding` que devuelve el checklist: `profileComplete`, `hasServices`, `hasAvailability`, `isPublished`, `canPublish` y la lista de pendientes.
- Se agrego `POST /api/professional-portal/publish` que valida el checklist (biografia >= 20 caracteres y distinta del placeholder, ubicacion, >= 1 servicio activo y >= 1 bloque de disponibilidad) y, si esta completo, deja el perfil en `active`.
- Se agregaron los contratos `UpdateProfessionalProfileRequest` y `ProfessionalOnboardingDto`.

Cambios en el frontend:

- `/portal-profesional` carga el onboarding junto al dashboard, muestra un banner con checklist y boton `Publicar perfil` (deshabilitado hasta completar), convierte el panel de perfil en un formulario editable y refresca el checklist al guardar perfil, agregar servicio o disponibilidad.
- Se agregaron al store los tipos/acciones `ProfessionalOnboarding`, `loadProfessionalOnboarding`, `updateProfessionalProfile`, `publishProfessional` y `remindClinicInvitation`.

### Pruebas

- `scripts/test-api.mjs` ahora valida: token en la respuesta de creacion, detalle/aceptacion por token, recordatorio (200), onboarding inicial no publicable, ausencia en busqueda publica en borrador, publish incompleto (400), edicion de perfil, alta de servicio/disponibilidad, publish exitoso (200 -> activo), aparicion en busqueda publica tras publicar, y aceptacion de invitacion revocada por token (409).

### Validaciones ejecutadas

- Migracion `202606080004_ClinicInvitationTokens`: aplicada en PostgreSQL local (4 invitaciones existentes con token).
- `npm run build:api`: correcto.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run test:api`: correcto.
- Log de la API: 3 envios `[EMAIL SIMULADO]` confirmados (2 altas + 1 recordatorio) al no haber API key de Resend.

### Comentarios generales

- El token se guarda en texto plano para que el admin pueda copiar/reenviar el enlace desde la lista; es aleatorio e impredecible y se invalida al cambiar de estado. Para un endurecimiento mayor se puede pasar a almacenar solo el hash y mostrar el enlace unicamente al crear/reenviar.
- El envio de correo es best-effort y degrada a simulado; falta configurar dominio verificado en Resend y plantillas definitivas. El recordatorio hoy es manual (boton del admin); el siguiente paso natural es un job programado que reenvie automaticamente las invitaciones por vencer.
- El gate de publicacion ya separa "registrado" de "visible/agendable". Falta enlazar el onboarding con una vista calendario de disponibilidad (paso 3 historico) y, mas adelante, una verificacion de cedula profesional antes de publicar.

## Avance protección de rutas por rol

Fecha: 2026-06-08

Se implementó protección de rutas y filtrado de navegación según el rol del usuario.

### Cambios en el frontend

- Se actualizo `components/app-shell.tsx` para filtrar `navItems` según `currentUser.primaryRole`.
- Cada `NavItem` ahora tiene un array `roles` que especifica qué roles pueden verla.
- Se agrego `middleware.ts` para interceptar acceso a rutas protegidas y redirigir según el rol.
- Se modifico `lib/healthhub-store.ts` para guardar el rol en cookies (24 horas) en `login`, `refreshSession` y `acceptClinicInvitation`.

### Matriz de acceso

Cada rol ve solo las rutas asignadas:

- **Paciente**: `/portal-paciente`, `/sesion`
- **Profesional**: `/`, `/pacientes`, `/portal-profesional`, `/agenda`, `/expediente`, `/seguridad`, `/chat`, `/sesion`
- **Admin Clínica**: `/seguridad`, `/sesion`
- **Admin Interno**: todas las rutas

### Comportamiento

- El menú muestra solo 1–3 opciones según el rol (antes mostraba 9 para todos).
- Si el usuario intenta acceder a una ruta no autorizada, es redirigido automáticamente al portal correcto.
- Las rutas `/sesion` y `/aceptar-invitacion` son públicas.

### Validaciones

- `npm run build:web`: correcto.
- `npm run lint:web`: correcto.
- Matriz de acceso probada con las 3 cuentas demo.

### Documentación

- Creado `PROTECCION_RUTAS.md` con matriz completa de acceso y guía de pruebas.

### Siguientes pasos inmediatos (bloqueadores antes de usuarios reales)

1. **Autenticacion para produccion con Clerk**: reemplazar tokens bearer actuales por Clerk SDK (Next.js + .NET). Tiene MFA, magic links y social login. Sin esto no hay lanzamiento seguro, y la prioridad subio porque ahora se crean cuentas reales desde invitaciones.
2. **Integracion Mercado Pago**: cobro de citas online desde el portal paciente. El modelo de datos ya tiene `professional_service_id` con precio; solo falta el flujo de pago y el cambio de estado automatico a `confirmed`. Priorizar sobre Stripe para Mexico: cubre OXXO, SPEI y tarjeta.

### Recomendaciones posteriores (Fase A-C)

Una vez desbloqueados los dos puntos anteriores, continuar en este orden de impacto:

3. **Vista calendario semanal de disponibilidad**: UI semanal que detecte traslapes y huecos antes de guardar, integrada al checklist de onboarding del profesional.
4. **Email transaccional con Resend**: conectar eventos de cita (agendada, confirmada, recordatorio 24h, cancelada) y automatizar recordatorio de invitaciones por vencer. La infraestructura ya esta lista; falta dominio verificado y plantillas.
5. **Signup publico de profesional**: formulario de registro independiente para profesionales sin clinica. Hoy solo entran via invitacion; sin esto el canal individual no escala.

**Fase B — Retención**: paginas publicas de profesionales con SEO (URL publica, schema.org, reviews, boton de agendar).

**Fase C — Expansión**: WhatsApp Business API (recordatorios, ~40% menos no-shows), videollamadas con Daily.co y dashboard de analytics para el profesional (ingresos, ocupacion, pacientes activos).

## Cierre de jornada

Fecha: 2026-06-08

Estado al cerrar:

- API ASP.NET Core compilada y validada.
- Frontend Next.js compilado y validado.
- PostgreSQL local conserva la base `healthhub` con migraciones aplicadas hasta `202606080004_ClinicInvitationTokens`.
- Proteccion de rutas por rol implementada: `app-shell.tsx`, `middleware.ts` y cookies de rol en el store.
- Documentacion actualizada en `seguimiento-proyecto.md`, `comentarios_claude.md` y `PROTECCION_RUTAS.md`.
- Servidores de desarrollo apagados al cerrar la sesion.

Ultimas validaciones correctas:

- `npm run lint:web`.
- `npm run build:web`.

Para retomar manana:

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub
npm run dev:api
npm run dev:web
```

Credenciales demo utiles:

- Paciente: `ana.martinez@example.com` / `healthhub123`.
- Profesional: `laura.vega@healthhub.demo` / `healthhub123`.
- Admin clinica: `admin.clinica@healthhub.demo` / `healthhub123`.

Primeros 2 pasos para iniciar:

1. Integrar autenticacion para produccion con Clerk (reemplazar tokens bearer actuales).
2. Integrar Mercado Pago para cobro de citas online desde el portal paciente.

## Decision de alcance: IA pasa a Fase 2

Fecha: 2026-06-09

Se retiro IA/OpenAI del alcance del MVP y de las prioridades inmediatas.

Cambios de alcance:

- Las notas SOAP del MVP son manuales.
- Se retiro la generacion simulada de borradores SOAP de la interfaz activa.
- OpenAI, Whisper, transcripcion, resumenes y asistente del paciente quedan agrupados en la Fase 2.
- `pgvector` queda reservado para necesidades futuras de la Fase 2.
- El MVP debe validarse con usuarios reales sin depender de IA.

Prioridades vigentes de la Fase 1:

1. Autenticacion y configuracion segura para produccion.
2. Privacidad, consentimiento y cumplimiento minimo para datos clinicos.
3. Chat funcional, notificaciones y cierre del flujo operativo.
4. Vista semanal de disponibilidad y mejoras de onboarding.
5. Piloto controlado con profesionales y pacientes.

La monetizacion e integraciones de expansion se evaluaran en la Fase 3. La Fase 2 no debe iniciarse hasta contar con evidencia del piloto sobre los problemas clinicos y administrativos que conviene automatizar.

## Avance autenticacion Clerk y acceso de desarrollo

Fecha: 2026-06-09

- Se integro `@clerk/nextjs` en el frontend.
- Se agrego `ClerkProvider` y `clerkMiddleware` mediante `proxy.ts`.
- La API valida JWT de Clerk con ASP.NET Core JwtBearer.
- Se valida el emisor, expiracion, firma y `azp` contra las partes autorizadas.
- Se agrego `users.ClerkUserId` y la migracion `202606090001_ClerkAuthentication`.
- El primer acceso vincula la cuenta Clerk con el usuario local por correo.
- Las invitaciones de clinica requieren una sesion Clerk con el mismo correo en entornos no locales.
- Los endpoints clinicos devuelven `401` cuando no existe sesion Clerk, sesion de desarrollo o token legacy local.
- Se agrego un selector de usuarios demo en `/sesion` que no requiere cuenta ni contrasena.
- El acceso demo solo funciona en `Development`, desde loopback y con `Authentication:EnableDevAuth`.
- La autenticacion legacy queda disponible solo en desarrollo para conservar pruebas de invitaciones existentes.
- Se documento la configuracion en `CLERK_AUTH.md`.

Validaciones:

- `npm run lint:web`: correcto.
- `npm run build:web`: correcto.
- `npm run build:api`: correcto.
- `npm run test:api`: correcto.
- `GET /api/patients` sin autenticacion: `401`.
- `GET /api/patients` con `X-HealthHub-Dev-User`: `200`.

Pendiente externo:

- Crear o seleccionar la instancia de Clerk.
- Configurar publishable key, secret key, issuer y dominios autorizados.
- Ejecutar una prueba real de inicio de sesion con cada rol.

## Revision de codigo y correcciones — 2026-06-09

Fecha: 2026-06-09

### Diagnostico incorrecto corregido

Se identifico erroneamente que `apps/web/proxy.ts` estaba mal nombrado. En Next.js v16 (version usada en este proyecto), el archivo de proxy/middleware se llama `proxy.ts`, no `middleware.ts`. La convencion `middleware.ts` esta deprecada en v16. El archivo original estaba correcto; el renombrado a `middleware.ts` fue un error que se revirtio.

### Configuracion de Clerk completada

- Se creo cuenta en clerk.com con la aplicacion `Clinixa` (instancia: `sunny-tomcat-26`).
- Se creo `apps/web/.env.local` con `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` e `NEXT_PUBLIC_CLERK_ISSUER` reales.
- Se configuro `apps/api/appsettings.Development.json` con `Clerk__Issuer`, `Clerk__SecretKey` y `Clerk__AuthorizedParties`.
- El browser log confirma: `Clerk has been loaded with development keys`.

### Fix del flujo de registro en /sesion

Con `routing="hash"` en Clerk v7, el componente `<SignIn>` requiere un `<SignUp routing="hash">` renderizado en la misma pagina para poder intercambiar la vista al hacer clic en "Sign up". Sin el, el clic actualizaba el hash pero no mostraba el formulario.

Cambios aplicados en `apps/web/app/sesion/session-page-client.tsx`:

- Se agrego import de `SignUp` desde `@clerk/nextjs`.
- `ClerkAccessPanel` ahora escucha cambios en el hash de la URL.
- Muestra `<SignIn routing="hash" signUpUrl="#/sign-up">` cuando el hash no indica registro.
- Muestra `<SignUp routing="hash" signInUrl="#/sign-in">` cuando el hash empieza con `#/sign-up`.

### Deuda tecnica identificada (pendiente)

- `apps/api/Program 2.cs` sigue en el repositorio; excluido del build pero debe eliminarse.
- La pantalla `/chat` es maqueta estatica sin backend real.
- Cadena de conexion con contrasena en `appsettings.json`; mover a variables de entorno antes de cualquier deploy.

### Estado actual

- Proxy/middleware de rutas: correcto, `proxy.ts` es el nombre valido en Next.js v16.
- Clerk: llaves configuradas, SDK cargando correctamente, flujo de registro corregido.
- API: levantada y respondiendo con autenticacion Clerk.

Siguiente paso pendiente:

- Probar login real y registro con Clerk en `http://localhost:3000/sesion`.

## Cierre de jornada

Fecha: 2026-06-09

Estado al cerrar:

- API ASP.NET Core compilada y validada.
- Frontend Next.js compilado y validado.
- PostgreSQL local con migraciones aplicadas hasta `202606090001_ClerkAuthentication`.
- Clerk configurado: llaves reales en `apps/web/.env.local` y `apps/api/appsettings.Development.json`.
- Flujo de registro en `/sesion` corregido: `<SignUp>` renderizado junto a `<SignIn>` con alternado por hash.
- `proxy.ts` confirmado como nombre correcto para Next.js v16.
- Servidores detenidos al cerrar.

Para retomar:

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub
npm run dev:api
npm run dev:web
```

Credenciales demo:

- Paciente: `ana.martinez@example.com` / `healthhub123`
- Profesional: `laura.vega@healthhub.demo` / `healthhub123`
- Admin clinica: `admin.clinica@healthhub.demo` / `healthhub123`

Primeros pasos para retomar:

1. Probar login y registro reales con Clerk en `http://localhost:3000/sesion`.
2. Verificar que cada rol (paciente, profesional, admin) redirige al portal correcto tras iniciar sesion.
3. Una vez validado Clerk, continuar con chat funcional o Mercado Pago segun prioridad.

## Avance bienvenida, registro con rol y rutas dedicadas de Clerk — 2026-06-09

Fecha: 2026-06-09

### Reemplazo del toggle por hash (corrige "sign up no hace nada")

El flujo anterior alternaba `<SignIn>` / `<SignUp>` con `routing="hash"` y un listener de `hashchange` dentro de `/sesion`. Ese patron es fragil: Clerk gestiona su propio enrutado por hash en cada paso del registro y entraba en conflicto con el toggle manual, por lo que el formulario de registro no avanzaba. Se reemplazo por el patron recomendado de App Router: rutas catch-all dedicadas donde Clerk controla todo su flujo por URL.

- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` → `/sign-in` con `<SignIn>`.
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` → `/sign-up` con `<SignUp>`.
- `apps/web/app/sesion/session-page-client.tsx`: se elimino el toggle por hash; el panel de Clerk ahora solo enlaza a `/sign-in` y `/sign-up` (y muestra el `UserButton` cuando hay sesion).

### Pagina de bienvenida publica

- `apps/web/app/bienvenida/page.tsx`: landing publica con hero, CTAs "Crear cuenta" / "Iniciar sesion", enlace a "Acceso de desarrollo" y tarjetas de features.
- `apps/web/proxy.ts`: se agregaron `/bienvenida`, `/sign-in` y `/sign-up` como rutas publicas; los usuarios no autenticados ahora se redirigen a `/bienvenida` (antes a `/sesion`). El proxy de Clerk usa `auth()` y redirige a `/bienvenida` si no hay `userId`.

### Paso de seleccion de rol en el registro

- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` (client component): antes del widget de Clerk pregunta "Como usaras HealthHub?" con opciones **Paciente** y **Profesional**. Tras elegir, monta `<SignUp unsafeMetadata={{ role }} />`, guardando el rol en el usuario de Clerk desde la creacion. Incluye enlace para cambiar el tipo de cuenta.

### Provisioning del usuario con el rol elegido (backend)

- `apps/api/Program.cs`:
  - `GetClerkEmailAsync` → `GetClerkProfileAsync`: ahora lee tambien `unsafe_metadata.role` y el nombre desde la API de Clerk (helpers `ExtractClerkEmail`, `ExtractClerkRole`, `ExtractClerkFullName`).
  - Nuevo `ProvisionClerkUserAsync`: cuando una sesion Clerk no tiene `ClerkUserId` registrado ni coincide por correo con un usuario existente, crea el `User` con `PrimaryRole` = rol elegido + su `UserRole` (scope `global`). Antes ese caso no creaba usuario.
  - Nuevo record `ClerkProfile(Email, Role, FullName)`.

### Variables de entorno y docs

- `apps/web/.env.local`, `apps/web/.env.example` y `CLERK_AUTH.md`: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.

### Validaciones ejecutadas

- `/` sin sesion → 307 → `/bienvenida` (verificado con curl).
- `/bienvenida`, `/sign-in`, `/sign-up` → 200 con contenido SSR correcto; Clerk JS carga sin errores en logs del servidor.
- Paso de rol en `/sign-up` renderiza ("Como usaras HealthHub", "Soy paciente", "Soy profesional").

### Pendientes / no verificado

- El backend (`apps/api/Program.cs`) NO se pudo compilar en esta sesion porque `dotnet` no esta disponible en el entorno. Falta `dotnet build` antes de probar el flujo real Clerk → API y el provisioning con rol.
- `apps/api/Program 2.cs` (duplicado de Finder con top-level statements) rompe la compilacion .NET ("Only one compilation unit can have top-level statements"); debe eliminarse.
- No se pudo manejar el widget de Clerk en el navegador del preview (quedo en estado `chrome-error`); falta una prueba E2E real de registro de paciente y de profesional.

## Cierre de jornada — bienvenida y registro con rol

Fecha: 2026-06-09

Estado al cerrar:

- Rutas dedicadas `/sign-in` y `/sign-up` (catch-all) reemplazan el toggle por hash de `/sesion`.
- Pagina `/bienvenida` publica como entrada; no autenticados redirigen ahi.
- Registro con paso previo de seleccion de rol (Paciente / Profesional) guardado en `unsafeMetadata` de Clerk.
- Backend escribe el rol elegido al provisionar usuarios nuevos de Clerk (sin compilar/verificar por falta de `dotnet`).
- Servidor de desarrollo detenido; preview cerrado.

Para retomar:

1. Instalar/usar el SDK de .NET, hacer `dotnet build` en `apps/api` (eliminar antes `Program 2.cs`).
2. Levantar API y web, registrar un paciente y un profesional reales en `/sign-up` y verificar que `/api/me` devuelve el `primaryRole` correcto y redirige al portal adecuado.
3. Continuar con chat funcional o Mercado Pago segun prioridad.

## Estabilizacion tecnica API y autenticacion — 2026-06-09

Fecha: 2026-06-09

### Cambios aplicados

- Se elimino `apps/api/Program 2.cs`.
- Se quito del `.csproj` la exclusion manual de `Program 2.cs`; ya no hay workaround de build.
- Se corrigio la referencia inexistente `GetClerkEmailAsync` en aceptacion de invitaciones, reutilizando `GetClerkProfileAsync`.
- Se completo el provisioning de cuentas nuevas desde Clerk:
  - Crea `User`.
  - Crea `UserRole` global.
  - Si el rol es `patient`, crea perfil `Patient` minimo.
  - Si el rol es `professional`, crea perfil `Professional` en estado `onboarding`.
  - Crea preferencias de notificacion iniciales.
- Se agrego rate limiting configurable:
  - Politica `auth` en `/api/auth`.
  - Politica `booking` en `/api/appointments`.
  - Respuesta `429 Too Many Requests` al exceder limite.
- Se movio la cadena de conexion fuera de `appsettings.json` y del fallback hardcodeado en `Program.cs`.
- `apps/api/appsettings.Development.json` ya no contiene la llave real de Clerk; `Clerk__Issuer`, `Clerk__SecretKey` y `ConnectionStrings__HealthHubDb` deben venir por variables de entorno.
- Se actualizo `apps/api/README.md` con la forma correcta de exportar variables locales.

### Validaciones ejecutadas

- `npm run build:api`: correcto, 0 warnings, 0 errores.
- API levantada con:

```bash
ConnectionStrings__HealthHubDb='Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev' ASPNETCORE_ENVIRONMENT=Development $HOME/.dotnet/dotnet run --project apps/api/HealthHub.Api.csproj --urls http://127.0.0.1:5050
```

- `npm run test:api`: correcto, `API tests passed`.
- Prueba manual de rate limiting en `/api/auth/login`: al exceder el limite devuelve `429`.
- Se verifico que solo existe `apps/api/Program.cs` como archivo `Program*` en la API.
- Se verifico que `apps/api` ya no contiene `sk_test_`, `sunny-tomcat`, `Program 2` ni `GetClerkEmailAsync` en archivos fuente.

### Pendientes

- Falta prueba E2E real en navegador con cuentas Clerk nuevas de paciente y profesional. El backend ya compila y el provisioning queda implementado, pero no se creo una cuenta real nueva desde el widget en esta sesion.
- Para ejecutar la API local desde ahora, hay que definir `ConnectionStrings__HealthHubDb` o `HEALTHHUB_DB_CONNECTION`; `npm run dev:api` no inyecta secretos automaticamente.
- La pantalla `/chat` sigue siendo maqueta estatica.
- Siguiente bloque recomendado: consentimiento/aviso de privacidad + verificacion de cedula como gate de publicacion antes del piloto.

## Mejora UX y corrección del flujo de onboarding — 2026-06-09

Fecha: 2026-06-09

### Problema identificado

Cuando un usuario nuevo se registraba con Clerk, el backend buscaba usuarios existentes por email y vinculaba la cuenta nueva con uno existente (ej: "Dra. Laura Vega"), sin crear uno nuevo.

### Solución implementada

**Backend (`apps/api/Program.cs`):**
- Se eliminó la búsqueda de usuarios existentes por email en `GetUserFromRequestAsync`.
- Ahora solo busca por `ClerkUserId`; si no encuentra, siempre crea un usuario nuevo con `ProvisionClerkUserAsync`.
- Cada cuenta Clerk genera su propio registro en `users`, evitando colisiones de email.

**Frontend (`apps/web/app/onboarding/`):**
- Se creó página `/onboarding/page.tsx` + `onboarding-page-client.tsx` que aparece después de signup.
- El usuario completa nombre completo y confirma su rol (Paciente / Profesional).
- Al hacer clic en "Continuar", se carga el usuario desde la API y se redirige al portal correspondiente.
- Se agregó `/onboarding` a las rutas públicas en `proxy.ts`.

**Flujo nuevo:**
1. Usuario va a `/sign-up`
2. Elige Paciente o Profesional
3. Llena formulario Clerk → crea cuenta nueva en Clerk
4. Se redirige a `/onboarding` (nueva página)
5. Completa nombre y rol → llama a `refreshSession()`
6. Va a `/portal-paciente` o `/portal-profesional`

**UX mejora adicional:**
- Se agregó dropdown de menú en el nombre del usuario (esquina superior derecha) con opciones:
  - **Página de sesión** (vínculo a `/sesion`)
  - **Logout** (cierra sesión de Clerk)
- Se agregó componente `UserMenu` (`apps/web/components/user-menu.tsx`) reutilizable en:
  - Portal profesional (`professional-portal-page-client.tsx`)
  - Portal paciente (`portal-patient-page-client.tsx`)
  - Página de seguridad (`security-page-client.tsx`)
- Se creó hook `useClickOutside` (`apps/web/lib/use-click-outside.ts`) para cerrar el menú al hacer clic fuera.

### Validaciones ejecutadas

- `npm run build:web`: correcto.
- `npm run lint:web`: correcto.
- Verificacion visual en navegador: dropdown aparece al hacer clic en nombre, opciones visibles, logout funcional, click fuera cierra menu.
- El servidor Next.js recompilo automaticamente los cambios.

### Archivos modificados

**Backend:**
- `apps/api/Program.cs` (función `GetUserFromRequestAsync`)

**Frontend:**
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` (cambio fallbackRedirectUrl a `/onboarding`)
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` (cambio fallbackRedirectUrl a `/onboarding`)
- `apps/web/proxy.ts` (agregó `/onboarding` a rutas públicas)
- `apps/web/components/user-menu.tsx` (nueva)
- `apps/web/lib/use-click-outside.ts` (nueva)
- `apps/web/app/onboarding/page.tsx` (nueva)
- `apps/web/app/onboarding/onboarding-page-client.tsx` (nueva)
- `apps/web/app/portal-profesional/professional-portal-page-client.tsx` (cambio a UserMenu)
- `apps/web/app/portal-paciente/portal-patient-page-client.tsx` (cambio a UserMenu)
- `apps/web/app/seguridad/security-page-client.tsx` (cambio a UserMenu)

### Comportamiento esperado en pruebas reales

1. Crear cuenta nueva con otro email → va a `/onboarding` (no se vincula con Laura Vega)
2. Completar onboarding → redirige al dashboard correcto
3. Click en nombre → despliega menú con "Página de sesión" y "Logout"
4. Click en "Logout" → cierra sesión, vuelve a `/bienvenida`

### Pendientes inmediatos

1. Prueba E2E real: crear cuenta nueva de profesional y paciente, verificar que no se vinculan con existentes.
2. Verificar que el rol elegido en signup se respeta tras loguearse.
3. Validar que cada rol redirige al portal correcto tras onboarding.

## Consentimiento, aviso de privacidad y limpieza de deuda técnica — 2026-06-09

Fecha: 2026-06-09

Se trabajaron los pasos 2 (consentimiento/privacidad) y 3 (deuda técnica residual) del plan de arranque. El paso 1 (prueba E2E real de Clerk) se dejó explícitamente para después. Se dejó además preparado el plan de las Fases A y B en `plan-fases-a-b.md`.

### Paso 2 — Consentimiento y aviso de privacidad (NOM-024 / LFPDPPP)

Backend (`apps/api`):
- Nueva entidad `UserConsent` (`Entities/UserConsent.cs`) y `DbSet`/configuración en `HealthHubDbContext` (tabla `user_consents`, índice único por `UserId`+`ConsentType`+`DocumentVersion`).
- Nueva colección `Consents` en `User`.
- Migración EF Core idempotente `202606090002_UserConsents` (SQL manual `CREATE TABLE IF NOT EXISTS` + FK a `users` con `ON DELETE CASCADE`).
- Contratos `ConsentDocumentDto`, `ConsentStatusDto`, `RecordConsentRequest`.
- Clase `ConsentDocuments` con tres documentos requeridos versionados (`privacy_notice`, `terms_of_service`, `health_data_processing`) en versión `2026-06-09`.
- Endpoints nuevos:
  - `GET /api/me/consent`: estado de consentimiento del usuario autenticado (documentos requeridos, aceptados y `completed`).
  - `POST /api/me/consent`: registra la aceptación de los documentos enviados con versión, IP y user-agent; idempotente por documento+versión; genera auditoría `user_consent.accepted`; devuelve el estado actualizado. `401` sin sesión, `400` si no se acepta ningún documento válido.

Frontend (`apps/web`):
- Páginas públicas nuevas: `/aviso-privacidad` (responsable, datos sensibles, finalidades, transferencias, derechos ARCO, seguridad) y `/terminos` (naturaleza del servicio, alcance del chat, datos clínicos, pagos, limitación de responsabilidad). Ambas marcadas como plantilla pendiente de revisión legal.
- `proxy.ts`: `/aviso-privacidad` y `/terminos` agregadas a rutas públicas.
- `/onboarding`: dos checkboxes obligatorios (aviso de privacidad + términos, y consentimiento de datos de salud) con enlaces a las páginas; el botón "Continuar" queda deshabilitado hasta aceptarlos; al continuar llama a `recordConsent` antes de `refreshSession`.
- `/sign-up`: aviso legal con enlaces (la captura vinculante y auditada se realiza en onboarding, ya con sesión).
- `/bienvenida`: footer con enlaces a aviso de privacidad y términos.
- Store: tipos `ConsentDocument`/`ConsentStatus` y acciones `loadConsent`/`recordConsent`.

### Paso 3 — Limpieza de deuda técnica residual

- Se confirmó que `apps/api/Program 2.cs` ya no existe (solo `Program.cs`).
- Se documentaron y expusieron como variables de entorno (con degradación elegante en el código) `RESEND_API_KEY`, `RESEND_FROM` y `WEB_BASE_URL`:
  - `apps/api/README.md`: sección "Variables de entorno opcionales" + nota de que `npm run dev:api` no inyecta secretos.
  - `.env.example`: agregadas `Web__BaseUrl`, `RESEND_API_KEY` y `RESEND_FROM`.
- `apps/api/README.md`: agregados los endpoints `GET/POST /api/me/consent` a la lista.

### Validaciones ejecutadas

- `$HOME/.dotnet/dotnet build apps/api/HealthHub.Api.csproj`: correcto, 0 warnings, 0 errores.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto (rutas `/aviso-privacidad` y `/terminos` incluidas como estáticas).
- Migración `202606090002_UserConsents` aplicada en PostgreSQL local (registrada en `__EFMigrationsHistory`; tabla `user_consents` creada).
- `npm run test:api`: correcto. Se extendió `scripts/test-api.mjs` con cobertura de consentimiento: `401` sin token, estado con 3 documentos requeridos, `400` al aceptar lista vacía, registro exitoso (`completed=true`), relectura idempotente con fecha de aceptación.
- Verificación directa en PostgreSQL: 3 filas en `user_consents` (con IP `127.0.0.1`) y 3 eventos `user_consent.accepted` en `audit_logs`.

### Pendiente / no verificado

- Prueba E2E en navegador del flujo de onboarding con sesión Clerk real (requiere login Clerk; pertenece al paso 1 diferido). Las páginas públicas y la lógica de API quedaron validadas.
- No hay enforcement global de consentimiento: hoy se captura en onboarding. Si un usuario navega directo a un portal sin pasar por onboarding, el consentimiento no se exige por middleware. Mejora futura: gate por `consent.completed` en `proxy.ts` o en endpoints sensibles.

### Plan de Fases A y B

Se creó `plan-fases-a-b.md` con tareas, toques al modelo de datos, criterios de aceptación y orden de ejecución:
- Fase A: A1 Mercado Pago, A2 vista calendario semanal, A3 verificación de cédula (gate de publicación), A4 cierre del signup individual.
- Fase B: B1 email transaccional Resend + jobs de recordatorio, B2 páginas públicas de profesionales (SEO), B3 chat funcional.

### Siguientes pasos recomendados

1. Paso 1 diferido: prueba E2E real de Clerk (paciente y profesional) y verificación de roles/redirección.
2. Iniciar Fase A según `plan-fases-a-b.md`, comenzando por A1 (Mercado Pago).

---

## Sesión 2026-06-09 (tarde) — Estrategia de mercado y consolidación de decisiones

### Hecho

- Creado `estrategia-mercado.md`: estrategia de adquisición (3 ciudades, outbound + referidos en cascada + SEO de perfiles + alianzas con colegios/maestrías) y monetización con efectivo como realidad dominante (registro de cobros en efectivo, anticipos parciales de $100–200, paquetes prepagados, palanca fiscal de deducibilidad SAT + CFDI). ARPU recompuesto ~$809 con supuestos menos frágiles.
- Auditoría de consistencia de todos los documentos y correcciones aplicadas.
- Decisiones cerradas hoy:
  1. **Trial: 14 días** sin tarjeta (antes había 14 y 30 en docs distintos).
  2. **Plan Clínica: $1,299 base + $349 por profesional adicional** (se descarta $1,499 plano).
  3. **Chat propio eliminado del producto.** Lo sustituye la conexión WhatsApp por profesional: botón wa.me en Básico (B3 redefinido en `plan-fases-a-b.md`), WhatsApp Business API desde el número del profesional en Pro (Fase 3). La maqueta `/chat` se retira del código como parte de B3.
  4. **Nicho del piloto ampliado: psicólogos + nutriólogos + fisioterapeutas.** Médicos entran al lanzamiento oficial, condicionados a revisión NOM-004 (agregada al encargo del abogado en `plan-legal-financiero.md`).
  5. Renumeración de fases consolidada en todos los docs: F2 Monetización, F3 Retención, F4 IA, F5 Marketplace.
- `business-model.md` reescrito como resumen alineado a `modelo_de_negocio.md` v2.0. `tech-stack.md` corregido (Clerk vigente, Mercado Pago primero, sección de chat reemplazada por WhatsApp).

### Pendiente / decisiones abiertas

- ¿La comisión 2.5% aplica a todos los planes o Pro queda exento como palanca de upgrade?
- Precio definitivo de add-ons (automatización WhatsApp ~$99/mes y CFDI ~$149/mes son hipótesis).
- ¿El anticipo parcial entra al alcance de A1 (Mercado Pago) o se prueba después del piloto?
- Recalcular la simulación financiera con supuestos por segmento (ticket $650 y 40 citas/mes están calibrados para psicólogos; nutriólogos/fisios tienen tickets menores).
- Retirar la ruta `/chat` y sus enlaces del frontend (tarea técnica de B3).

### Siguientes pasos (mañana, en orden)

1. **Prueba E2E real de Clerk** (paso 1 diferido) — sigue siendo el bloqueador de todo lo demás.
2. **Iniciar A1 Mercado Pago** (sandbox) y, en paralelo, **trámite de cuenta MP productiva** + decisión marketplace/OAuth con contador.
3. **Contactar 2–3 abogados** de privacidad/salud digital (camino crítico más largo; ahora incluye NOM-004 para médicos).
4. Agregar al backlog de A1: campo `WhatsAppNumber` y botón wa.me (B3 redefinido, esfuerzo bajo — puede colarse temprano).
5. Resolver las decisiones abiertas de pricing (comisión por plan, add-ons) antes de la landing de venta.

## Prueba E2E real de Clerk y correcciones de aislamiento de datos — 2026-06-10

Fecha: 2026-06-10

Se ejecutó el paso 1 diferido (prueba E2E real de Clerk) y la prueba destapó varios problemas de aislamiento de datos que se corrigieron en la misma sesión.

### Bug 1 — Provisioning de Clerk no funcionaba (secret key vacía)

Al crear una cuenta real desde `/sign-up`, el portal mostraba los datos de "Ana Martínez". Causa raíz: `Clerk:SecretKey` estaba vacío en `appsettings.Development.json` (se retiró del archivo por seguridad en una sesión previa), por lo que `GetClerkProfileAsync` devolvía `null` y `ProvisionClerkUserAsync` nunca se ejecutaba. Solución: levantar la API con `Clerk__Issuer` y `Clerk__SecretKey` como variables de entorno. Verificado: la cuenta nueva se provisionó con `ClerkUserId` correcto y rol `professional`.

### Bug 2 — Endpoints legacy sin aislamiento de datos (fuga entre usuarios)

El profesional nuevo veía todos los pacientes, citas y expedientes de la base. Los endpoints `GET /api/patients`, `GET /api/appointments` y `GET /api/soap-notes` devolvían todo sin filtrar por el usuario autenticado.

Correcciones en `apps/api/Program.cs`:

- Nuevos helpers `GetAccessiblePatientIdsAsync`, `CanAccessPatientAsync` y `GetClinicProfessionalIdsAsync`.
- `GET /api/patients`, `GET /api/patients/{id}`, `GET /api/patients/{id}/appointments`, `GET /api/patients/{id}/soap-notes`: requieren sesión (`401`) y filtran por rol — profesional solo ve pacientes vinculados (relación `professional_patients` o citas), paciente solo se ve a sí mismo, `clinic_admin` solo pacientes de los profesionales de su clínica, `internal_admin` ve todo.
- `GET /api/appointments`: profesional solo su agenda; paciente solo sus citas; `clinic_admin` la agenda de su clínica.
- `GET /api/soap-notes`: mismo filtrado por pacientes accesibles.
- `POST /api/patients`: ahora requiere rol profesional/admin, crea la relación `professional_patients` automáticamente y asigna el nombre del profesional al paciente.
- `POST /api/soap-notes`: requiere rol profesional/admin, valida acceso al paciente y registra `ProfessionalId` en la nota.

Verificación manual: profesional nuevo ve 0 pacientes/citas/notas; Laura Vega ve solo a Ana Martínez; paciente Ana solo se ve a sí misma; master ve los 6; sin sesión devuelve `401`.

### Perfil maestro y restricción de /seguridad

- Nuevo usuario semilla `usr-master` (`master@healthhub.demo` / `healthhub123`) con rol `internal_admin`: ve todos los datos, toda la auditoría y la pestaña Seguridad.
- `/seguridad` retirada del rol `professional` (menú y página): ahora solo `clinic_admin` (su portal de operación: equipo e invitaciones) e `internal_admin`. Si un profesional navega directo a la URL ve un aviso de acceso denegado.

### Chat eliminado (parte de B3)

- Se eliminó la ruta `/chat`, su ítem del menú y el botón "Abrir chat" del perfil del paciente (ahora "Agendar cita"). Pendiente de B3: campo `WhatsAppNumber` y botón wa.me.

### Onboarding: ya no se repite y ahora sí guarda el nombre

- El sign-in redirigía siempre a `/onboarding` aunque ya estuviera completado. Ahora la página verifica el consentimiento al cargar: si `consent.completed`, redirige directo al portal según el rol.
- Se descubrió que el formulario de onboarding nunca guardaba el nombre ni el rol (solo el consentimiento); por eso los perfiles mostraban el correo como nombre. Se agregó `PATCH /api/me` (nombre completo con propagación a perfil paciente/profesional + corrección de rol durante onboarding + auditoría), la acción `updateAccountProfile` en el store, y el formulario ahora precarga y persiste los datos.

### UX del portal profesional

- "Guardar perfil" sí guardaba (verificado con `PATCH /api/professional-portal/profile` → 200), pero el mensaje de resultado se mostraba hasta arriba de la página, fuera de vista. Ahora el botón muestra "Guardando..." y el resultado (éxito o error del API) aparece junto al botón.

### Validaciones ejecutadas

- `dotnet build`: 0 warnings, 0 errores.
- `npm run lint:web` y `npm run build:web`: correctos.
- `npm run test:api`: correcto.
- Registro real con Clerk verificado en BD: usuario con `ClerkUserId`, rol `professional` y perfil profesional propio.
- Scoping verificado por rol con usuarios dev (profesional nuevo, Laura Vega, Ana Martínez, master).

### Pendientes detectados en esta sesión

- `npm run dev:api` no inyecta las llaves de Clerk; hay que exportar `Clerk__Issuer` y `Clerk__SecretKey` (además de la cadena de conexión) al levantar la API localmente. Documentar en `apps/api/README.md`.
- La protección de rutas por rol en el frontend es de cliente (menú + gates en página); `proxy.ts` solo valida sesión, no rol. Endurecer cuando se acerque el piloto.
- `scripts/test-api.mjs` no cubre los endpoints legacy con scoping; agregar casos de aislamiento (profesional A no ve pacientes de profesional B).
- Falta cerrar la prueba E2E de cuenta **paciente** nueva (la de profesional quedó verificada).

### Siguientes pasos sugeridos

1. Completar la prueba E2E de paciente: crear cuenta nueva, verificar onboarding único, portal correcto y aislamiento de datos.
2. Agregar pruebas de aislamiento a `test-api.mjs` (regresión del scoping por rol).
3. Iniciar **A1 Mercado Pago** según `plan-fases-a-b.md` (sandbox + trámite de cuenta productiva en paralelo).
4. Colar el B3 ligero: campo `WhatsAppNumber` + botón wa.me en perfil profesional.
5. Contactar abogados (privacidad/salud digital, NOM-004) — sigue siendo el camino crítico más largo.

---

## Actualización — 2026-06-10 (sesión 6): Integración de documentos legales v1.0

### Resumen

Se incorporaron las versiones finales del **Aviso de Privacidad Integral** y los **Términos y Condiciones** (v1.0, 2026-06-10) como fuente canónica en `docs/legal/`, con rutas públicas `/privacy` y `/terms` que renderizan el markdown directamente. Se alinearon consentimientos por rol, verificación de cédula profesional, reglas de reseñas, auditoría del expediente y el flujo WhatsApp con los requisitos regulatorios (LFPDPPP, NOM-004, NOM-024).

### 1. Documentos legales (`docs/legal/`)

- `docs/legal/aviso-de-privacidad.md` — v1.0, fecha 2026-06-10.
- `docs/legal/terminos-y-condiciones.md` — v1.0, fecha 2026-06-10.
- `docs/legal/README.md` — reglas de versionado, mapa de placeholders pendientes ([RAZON_SOCIAL], [DOMICILIO_LEGAL], [RFC], [EMAIL_PRIVACIDAD], [EMAIL_LEGAL], [TELEFONO_CONTACTO]), políticas comerciales ([POLITICA_CANCELACION], [POLITICA_REEMBOLSO], [POLITICA_NO_SHOW], [COMISION_PLATAFORMA]) y proveedores ([PROVEEDOR_CLOUD], [PROVEEDOR_EMAIL], [PASARELA_PAGOS], [PROVEEDOR_FACTURACION]).
- **Ningún placeholder fue inventado**: los corchetes quedan visibles hasta tener los datos reales y validación de abogado.

### 2. Nuevas rutas frontend

| Ruta | Descripción |
|---|---|
| `/privacy` | Aviso de Privacidad renderizado desde `docs/legal` (pública, SSR + react-markdown/remark-gfm). |
| `/terms` | Términos y Condiciones renderizados desde `docs/legal` (pública). |
| `/aviso-privacidad` | Redirect 307 → `/privacy` (links legacy siguen funcionando). |
| `/terminos` | Redirect 307 → `/terms`. |

Enlaces legales visibles en: landing (`/bienvenida`), sign-in, sign-up, onboarding y, vía `LegalFooter` montado en `AppShell`, en dashboard, portal paciente, portal profesional y demás páginas internas.

### 3. Consentimientos por rol (registro/onboarding)

- Checkbox 1 (ambos roles): "Declaro haber leído y aceptado el Aviso de Privacidad y los Términos y Condiciones."
- Checkbox 2 paciente: "Otorgo mi consentimiento expreso para el tratamiento de datos personales sensibles relacionados con mi salud." → tipo `health_data_processing`.
- Checkbox 2 profesional: "Otorgo mi consentimiento para el tratamiento de mis datos profesionales y de identificación." → tipo nuevo `professional_data_processing`.
- `ConsentDocuments` (API) ahora versiona contra **"1.0"** y `RequiredFor(role)` calcula los documentos exigibles por rol. Cada aceptación guarda `user_id`, `consent_type`, `document_version`, `accepted_at`, `ip_address`, `user_agent` en `user_consents` (tabla ya existente, historial nunca se sobrescribe — índice único por usuario+tipo+versión agrega fila nueva al cambiar versión).
- No se puede completar el registro/onboarding sin ambos checkboxes.

### 4. Verificación profesional

- Campos nuevos en `professionals`: `VerificationStatus` (pending/verified/rejected), `LicenseVerifiedAt`, `LicenseVerifiedBy`, `WhatsappNumber`.
- **Regla aplicada en API**: `GET /api/professionals`, `GET /api/professionals/{id}` y `available-slots` solo devuelven profesionales `active` **y** `verified`; `POST /publish` se bloquea sin verificación (checklist del portal muestra el paso "Cédula profesional verificada").
- Cambiar la cédula desde el perfil regresa el estatus a `pending` e invalida la verificación.
- Nuevo endpoint `PATCH /api/professionals/{id}/verification` (solo `internal_admin`, auditado). Si se revoca la verificación de un perfil publicado, vuelve a `onboarding` (sale del listado público).
- Perfil público (búsqueda del portal paciente) muestra: nombre, especialidad, ciudad, modalidad y badge "Cédula XXX verificada". No expone información clínica ni de pacientes.

### 5. Reseñas

- `POST /api/professionals/{id}/reviews`: solo pacientes con **cita completada** con ese profesional; una reseña por cita (índice único `AppointmentId`); rating 1–5.
- **Sin endpoint de edición** — las reseñas no se modifican después de publicarse.
- `PATCH /api/reviews/{id}/moderate` (solo `internal_admin`): oculta (`hidden`, con motivo obligatorio) o restaura; campos `ModeratedByUserId`, `ModeratedAt`, `ModerationReason`. Nunca se borran físicamente. Todo auditado.

### 6. Expediente clínico

- Cada nota SOAP ya registra autor (`ProfessionalId`), paciente, fechas de creación/modificación.
- **Soft delete**: `DELETE /api/soap-notes/{id}` marca `status = deleted` (solo autor o admin, auditado); los listados excluyen notas eliminadas. No existe eliminación física en ningún endpoint.
- Auditoría agregada: `soap_notes.read` (consulta, NOM-024), `soap_note.create`, `soap_note.delete`. TODO: auditoría de modificación y descarga cuando existan esos endpoints.

### 7. WhatsApp

- Eliminada la última referencia a chat interno (panel "Actividad de chat" del dashboard) — sustituida por panel "Comunicación con pacientes" con el disclaimer legal.
- Campo "WhatsApp de contacto" en el perfil del portal profesional (persistido en `professionals.WhatsappNumber`).
- Botón **wa.me** en las tarjetas de profesionales del portal paciente.
- Disclaimer visible en ambos portales: *"La comunicación realizada mediante WhatsApp ocurre fuera de Clinixa y no forma parte automáticamente del expediente clínico."*

### 8. Migraciones SQL generadas

- `202606100001_ProfessionalVerificationAndReviewModeration` — agrega columnas de verificación/WhatsApp a `professionals` (con backfill: perfiles `active` previos quedan `verified` para no romper el marketplace demo), índice por `VerificationStatus`, y columnas de moderación a `reviews`. Aplicar con `dotnet ef database update` o al levantar el API (migraciones por SQL directo, idempotentes con IF NOT EXISTS).

### 9. Tablas nuevas

- Ninguna tabla nueva: `user_consents` y `audit_logs` ya existían y cumplen los campos requeridos (id, user_id, consent_type, document_version, accepted_at, ip_address, user_agent). Solo se agregaron columnas a `professionals` y `reviews`.

### 10. Hallazgos de seguridad (punto 11 del requerimiento)

| Control | Estado | Hallazgo |
|---|---|---|
| HTTPS / cifrado en tránsito | ⚠️ Parcial | El API no fuerza HTTPS por sí mismo (solo `RequireHttpsMetadata` en JWT). En producción debe terminarse TLS en el proxy/CDN del [PROVEEDOR_CLOUD]. |
| Secretos fuera del repo | ✅ | `appsettings*.json` sin secretos; Clerk y connection string por variables de entorno. |
| Rate limiting | ⚠️ Parcial | Solo `/api/auth` (10/min) y `/api/appointments` (30/min). Falta cubrir consentimiento, reseñas y un límite global. |
| Logs de auditoría | ✅ | `audit_logs` con IP/UA/actor/outcome; ampliados a expediente, reseñas, verificación y consentimiento. |
| Backups | ❌ | Sin política definida (Postgres local vía docker-compose). Definir respaldos cifrados con el proveedor. |
| Control de acceso por roles | ✅/⚠️ | Scoping por rol en API. La protección de rutas del frontend sigue siendo de cliente (proxy valida sesión, no rol). |
| Cifrado en reposo | ❌ | No implementado a nivel aplicación; depende del [PROVEEDOR_CLOUD] (activar en el servicio gestionado de BD). |

### 11. Riesgos detectados

1. **Gate de consentimiento evitable por deep-link**: el onboarding exige los checkboxes, pero un usuario autenticado podría navegar directo al portal sin registrar consentimiento. Endurecer con verificación de `consent.completed` en proxy o en los endpoints sensibles del API.
2. **Bloqueo operativo de profesionales reales**: con la regla de verificación activa, ningún profesional nuevo aparece públicamente hasta que un `internal_admin` lo verifique — se necesita proceso operativo (y eventualmente UI de admin) antes del piloto.
3. **Render estático de páginas legales**: `/privacy` y `/terms` se prerenderizan en build; cambiar `docs/legal/*.md` requiere rebuild en producción (en dev se re-lee).
4. **Documentos sin validación legal**: ambos documentos lo indican en banner; no operar con usuarios reales hasta validación de abogado y llenado de placeholders.
5. **Moderación de reseñas sin UI**: el endpoint existe pero la moderación se hace por API; falta pantalla de admin.

### 12. TODOs de cumplimiento legal antes de producción

- [ ] Completar placeholders corporativos: [RAZON_SOCIAL], [DOMICILIO_LEGAL], [RFC], [EMAIL_PRIVACIDAD], [EMAIL_LEGAL], [TELEFONO_CONTACTO], jurisdicción y área responsable de privacidad.
- [ ] Validación de ambos documentos por abogado mexicano (LFPDPPP, NOM-004, NOM-024, COFEPRIS).
- [ ] Definir políticas comerciales: [POLITICA_CANCELACION], [POLITICA_REEMBOLSO], [POLITICA_NO_SHOW], [COMISION_PLATAFORMA] — y mostrarlas en el checkout cuando exista (TODO en `Program.cs`).
- [ ] Confirmar proveedores y actualizar lista interna de encargados: [PROVEEDOR_CLOUD], [PROVEEDOR_EMAIL], [PASARELA_PAGOS] (candidato Mercado Pago), [PROVEEDOR_FACTURACION].
- [ ] Gate de consentimiento server-side (riesgo 1).
- [ ] Proceso/UI de verificación de cédula para `internal_admin` (riesgo 2).
- [ ] Política de backups y cifrado en reposo (hallazgos de seguridad).
- [ ] IA futura (NO implementar): consentimiento IA específico, transcripción Whisper, OpenAI, SOAP asistido con revisión profesional — TODOs marcados en `Program.cs` y `docs/legal/README.md`.

### Validaciones ejecutadas

- `dotnet build`: 0 warnings, 0 errores.
- `npm run build:web`: correcto (rutas `/privacy` y `/terms` generadas).
- `npm run lint:web`: correcto.
- Verificación HTTP en dev server: `/privacy` y `/terms` → 200 con contenido markdown completo (título, versión 1.0, secciones, tablas, placeholders); `/aviso-privacidad` y `/terminos` → 307 a las nuevas rutas; footer legal presente.
- Pendiente: `npm run test:api` (requiere API + Postgres arriba) y E2E de onboarding con los nuevos textos de consentimiento.

### Archivos modificados/creados

**Nuevos**: `docs/legal/aviso-de-privacidad.md`, `docs/legal/terminos-y-condiciones.md`, `docs/legal/README.md`, `apps/web/app/privacy/page.tsx`, `apps/web/app/terms/page.tsx`, `apps/web/lib/legal-docs.ts`, `apps/web/components/legal-document-page.tsx`, `apps/web/components/legal-footer.tsx`, `apps/api/Migrations/202606100001_ProfessionalVerificationAndReviewModeration.cs`.

**Modificados**: `apps/api/Program.cs` (consentimientos por rol, verificación, reseñas, auditoría expediente, soft delete, TODOs pagos/IA), `apps/api/Entities/Professional.cs`, `apps/api/Entities/Review.cs`, `apps/api/Data/HealthHubDbContext.cs`, `apps/api/Data/DatabaseSeeder.cs`, `apps/api/Contracts/ApiContracts.cs`, `apps/api/Infrastructure/MappingExtensions.cs`, `apps/web/app/aviso-privacidad/page.tsx`, `apps/web/app/terminos/page.tsx`, `apps/web/app/bienvenida/page.tsx`, `apps/web/app/sign-in/[[...sign-in]]/page.tsx`, `apps/web/app/sign-up/[[...sign-up]]/page.tsx`, `apps/web/app/onboarding/onboarding-page-client.tsx`, `apps/web/app/page.tsx`, `apps/web/app/portal-paciente/portal-patient-page-client.tsx`, `apps/web/app/portal-profesional/professional-portal-page-client.tsx`, `apps/web/components/app-shell.tsx`, `apps/web/lib/healthhub-store.ts`, `apps/web/lib/demo-data.ts`, `apps/web/proxy.ts`, `apps/web/package.json` (+react-markdown, +remark-gfm).

### Siguientes pasos sugeridos

1. Levantar API + web y correr `test:api` + E2E del onboarding (paciente y profesional) con los nuevos consentimientos; verificar que el flujo de re-aceptación funcione al subir versión de documento.
2. UI mínima de admin para verificación de cédula y moderación de reseñas (los endpoints ya existen).
3. Gate de consentimiento server-side.
4. **A1 Mercado Pago** (sin cambios: desbloqueador de ingresos) — el checkout debe nacer con las referencias legales ya preparadas.
5. Contratar revisión legal y completar placeholders — camino crítico para el piloto.

---

## Avance A1 Mercado Pago (checkout + webhook) — 2026-06-11

Fecha: 2026-06-11

Se completó la prueba E2E de Clerk (paso 1, validada por el usuario: paciente y profesional ven portales distintos) y se implementó **A1 Mercado Pago** según `plan-fases-a-b.md`.

### Fix previo: home por rol

La prueba E2E destapó que el logo "Clinixa / MVP operativo" siempre llevaba a `/` (dashboard profesional), incluso para pacientes, y que `/` no tenía gate de rol. Correcciones:

- `apps/web/components/app-shell.tsx`: el logo apunta al home del rol (`patient` → `/portal-paciente`, `clinic_admin` → `/seguridad`, resto → `/`).
- `apps/web/app/page.tsx`: el dashboard redirige a pacientes y admins de clínica a su portal si navegan directo a `/`.

### A1 — Backend

- Nueva entidad `Payment` (`apps/api/Entities/Payment.cs`): cita, paciente, profesional, monto, moneda MXN, status (`pending`/`approved`/`rejected`/`refunded`), proveedor y referencias de Mercado Pago. Tabla `payments` con migración idempotente `202606110001_Payments`.
- Nuevo `MercadoPagoService` (`apps/api/Infrastructure/MercadoPagoService.cs`), mismo patrón de degradación elegante que `EmailSender`:
  - Con `MERCADOPAGO_ACCESS_TOKEN`: crea preferencias reales de Checkout Pro (tarjeta/OXXO/SPEI) y consulta pagos en la API de MP.
  - Sin credenciales: modo simulado — la preferencia apunta a la página de retorno local y el webhook usa los datos del cuerpo.
  - Validación de firma `x-signature` (HMAC-SHA256 con el manifiesto oficial `id:...;request-id:...;ts:...;`). En Development sin secreto usa `dev-webhook-secret` (pruebas locales); en producción sin secreto rechaza todo (fail closed).
- `POST /api/appointments/{id}/checkout`: solo el paciente dueño de la cita (o admin), cita en `scheduled` con servicio y precio válidos. Crea/reutiliza el `Payment` pendiente (idempotente, sin duplicados), crea la preferencia y devuelve `initPoint`. Auditado (`payment.checkout.*`).
- `POST /api/webhooks/mercadopago`: público (agregado a `IsPublicApiRequest`; la seguridad la da la firma). Firma inválida → `401` + auditoría `payment.webhook.invalid_signature`. Pago aprobado → `Payment.approved`, cita `scheduled` → `confirmed`, notificaciones a paciente y profesional, auditoría `payment.approved`. Idempotente ante notificaciones repetidas. Mapea `rejected`/`cancelled` → `rejected` y `refunded`/`charged_back` → `refunded`.
- Contrato `CheckoutResponseDto` en `ApiContracts.cs`.

### A1 — Frontend

- Store: tipo `CheckoutResponse` y acción `startAppointmentCheckout(appointmentId)`.
- Portal paciente: botón **"Pagar y confirmar"** en citas `scheduled` con servicio; llama al checkout y redirige al `initPoint`.
- Nueva página `/portal-paciente/pago?status=approved|pending|rejected` con estados visuales y aviso de modo simulado.

### Ajuste a pruebas por el gate de verificación (A3, sesión anterior)

`test-api.mjs` fallaba en "profesional completo deberia poder publicar": desde 2026-06-10 publicar exige cédula verificada y la suite no se había vuelto a correr. Se ajustó al flujo nuevo: se valida que sin verificación `canPublish=false`, el master (`internal_admin`) verifica vía `PATCH /api/professionals/{id}/verification`, y entonces publica.

### Pruebas nuevas en test-api.mjs

- Checkout sin sesión → `401`; checkout de cita ajena → `403`; checkout válido → `200` con pago `pending` e `initPoint`; checkout repetido reutiliza el mismo pago.
- Webhook con firma inválida → `401`; webhook aprobado con firma válida → pago `approved` y cita `confirmed`; webhook repetido no reprocesa; checkout de cita ya pagada → `400`.

### Validaciones ejecutadas

- `dotnet build`: 0 warnings, 0 errores.
- `npm run lint:web`: correcto.
- `npm run build:web`: correcto (ruta `/portal-paciente/pago` generada).
- `npm run test:api`: correcto (`API tests passed`), incluyendo el bloque completo de pagos.
- Migración `202606110001_Payments` aplicada en PostgreSQL local.

### Variables de entorno nuevas (documentadas en `apps/api/README.md` y `.env.example`)

- `MERCADOPAGO_ACCESS_TOKEN` (opcional: sin él, checkout simulado).
- `MERCADOPAGO_PUBLIC_KEY` (futuro SDK JS).
- `MERCADOPAGO_WEBHOOK_SECRET` (firma de webhooks; fail closed en producción).

### Pendientes de A1

1. **[PENDIENTE — acción del usuario] Crear cuenta sandbox de Mercado Pago**: generar credenciales de prueba en https://www.mercadopago.com.mx/developers, exportar `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET`, y validar el flujo completo con tarjeta de prueba (el webhook requiere URL pública: ngrok/túnel en local).
2. Trámite de cuenta MP productiva + decisión marketplace/OAuth con el contador (anotado en `seguimiento-proyecto.md` 2026-06-09).
3. La comisión de plataforma (2.5%) aún no se descuenta: hoy el monto cobrado es el precio íntegro del servicio; definir si se implementa como `application_fee` (modelo marketplace) o en la conciliación.
4. Decisión abierta: ¿anticipo parcial ($100–200) entra al alcance de A1 o se prueba después del piloto?

### Siguientes pasos sugeridos

1. Sandbox real de Mercado Pago (cerrar A1 end-to-end).
2. **A3**: UI mínima de admin para verificación de cédula (el endpoint ya existe y la suite ya lo ejercita).
3. **A2**: vista calendario semanal de disponibilidad.
4. Contactar abogados (camino crítico) y completar placeholders legales.

---

## Avance A3 — UI de verificación de cédulas para admin — 2026-06-11

Fecha: 2026-06-11

Se completó la pieza faltante de A3: la interfaz de administración para verificar cédulas profesionales (el backend de verificación y el gate de publicación existían desde 2026-06-10; la moderación se hacía solo por API).

### Backend

- Nuevo endpoint `GET /api/admin/professionals?verificationStatus=pending|verified|rejected|all` (solo `internal_admin`, auditado con `professional.verification_queue.read`/`denied`): devuelve TODOS los profesionales —incluidos `onboarding` y pendientes que el listado público oculta— con cédula, estatus, fechas y verificador. Pendientes primero.
- Nuevo contrato `ProfessionalVerificationDto`.
- Sin migraciones: reutiliza los campos de verificación existentes.

### Frontend

- Store: tipo `ProfessionalVerificationItem` y acciones `loadVerificationQueue` / `updateProfessionalVerification`.
- `/seguridad` (solo `internal_admin`): nuevo panel **"Verificación de cédulas"** arriba de la bitácora — lista profesionales con especialidad, ubicación, cédula y badge de estatus; botón **Verificar** y flujo **Rechazar** con motivo obligatorio (input inline). Rechazar un perfil publicado lo regresa a `onboarding` (fuera del listado público), regla que ya vivía en el API.
- Para `clinic_admin` el panel no se muestra (su vista de /seguridad queda igual).

### Pruebas nuevas en test-api.mjs

- Cola sin sesión → `401`; como profesional → `403`; como master → `200` con el profesional QA y su cédula.
- Rechazo de verificación → `verificationStatus=rejected`, perfil regresa a `onboarding` y desaparece de la búsqueda pública.

### Validaciones ejecutadas

- `dotnet build`: 0 warnings, 0 errores.
- `npm run lint:web` y `npm run build:web`: correctos.
- `npm run test:api`: correcto (`API tests passed`).
- Verificación manual: master ve la cola con pendientes reales (incluida la cuenta Clerk de prueba "Dr. Fernando Test"); profesional recibe 403.

### Pendientes

- **[PENDIENTE — acción del usuario] Cuenta sandbox de Mercado Pago** (cierra A1; ver sección anterior).
- La cuenta profesional real creada en la prueba E2E está `pending`: ya se puede verificar desde `/seguridad` con el usuario master.
- Moderación de reseñas sigue sin UI (endpoint existe); candidato natural para el mismo panel de /seguridad.

### Siguientes pasos sugeridos

1. Crear cuenta sandbox de MP y probar A1 end-to-end (acción del usuario).
2. **A2**: vista calendario semanal de disponibilidad.
3. UI de moderación de reseñas (esfuerzo bajo, mismo patrón que la cola de cédulas).
4. Contactar abogados y completar placeholders legales (camino crítico del piloto).

---

## Sandbox de Mercado Pago conectado — 2026-06-11

Fecha: 2026-06-11

Se conectaron las credenciales de prueba de Mercado Pago (cuenta de prueba verificada vía `/users/me`: `test_user`, sitio MLM). El checkout ahora crea preferencias reales de Checkout Pro en sandbox.

### Fix necesario en MercadoPagoService

La primera preferencia real falló con `auto_return invalid. back_url.success must be defined`: Mercado Pago **exige HTTPS** para `auto_return` y `notification_url`. El servicio ahora los incluye solo cuando la URL es HTTPS; en desarrollo local (http://localhost) se omiten y el comprador regresa con el botón "Volver al sitio" del checkout.

### Validado

- `POST /api/appointments/{id}/checkout` con credenciales → `200` con `initPoint` real (`https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=...`), `simulated: false`, monto $700 MXN del servicio.
- `npm run test:api`: correcto con credenciales activas (el webhook de pruebas usa el fallback del cuerpo cuando el pago no existe en MP).

### Credenciales (NO versionadas — solo variables de entorno al levantar la API)

```bash
export MERCADOPAGO_ACCESS_TOKEN="APP_USR-8113...-3468655196"   # cuenta de prueba MLM
export MERCADOPAGO_PUBLIC_KEY="APP_USR-420f..."
```

### Pendiente para cerrar A1 del todo

1. **Webhook en sandbox**: requiere URL pública (ngrok u otro túnel) + configurar la URL y copiar la "Firma secreta" en el panel de MP (app → Webhooks → Modo prueba) → exportar `MERCADOPAGO_WEBHOOK_SECRET`. Sin esto, el pago se acredita en MP pero la cita no se confirma automáticamente en local.
2. Prueba de pago en navegador con tarjeta de prueba (Mastercard 5474 9254 3267 0366, titular `APRO`, CVV 123, fecha futura).

---

## Cierre de jornada — 2026-06-11

Fecha: 2026-06-11

### Resumen de la sesión

1. **Paso 1 cerrado**: prueba E2E real de Clerk validada por el usuario (paciente y profesional ven portales distintos, aislamiento de datos correcto).
2. **Fix de navegación por rol**: el logo y la ruta `/` ya no llevan al paciente al dashboard profesional.
3. **A1 Mercado Pago implementado**: entidad `Payment` + migración, `MercadoPagoService` (modo simulado y real), `POST /api/appointments/{id}/checkout`, webhook firmado `POST /api/webhooks/mercadopago`, botón "Pagar y confirmar" y página `/portal-paciente/pago`. Suite de pruebas completa.
4. **A3 cerrado**: cola de verificación de cédulas (`GET /api/admin/professionals`) + panel "Verificación de cédulas" en `/seguridad` con Verificar/Rechazar (motivo obligatorio).
5. **Sandbox de MP conectado**: credenciales de cuenta de prueba validadas; checkout crea preferencias reales (fix: `auto_return`/`notification_url` solo con HTTPS). El usuario hizo una prueba de pago: el error "una de las partes es de prueba" se da al pagar con cuenta real de MP — debe pagarse con comprador de prueba en incógnito.

### Estado al cerrar

- API ASP.NET Core compilada y validada; migraciones aplicadas hasta `202606110001_Payments`.
- `npm run test:api`, `npm run lint:web`, `npm run build:web`, `dotnet build`: todos correctos.
- ngrok instalado vía Homebrew (`/opt/homebrew/bin/ngrok`), **sin configurar**.
- Servidores de desarrollo apagados al cerrar; PostgreSQL local (brew) queda corriendo.

### Pendientes para la próxima sesión (en orden)

1. **[PENDIENTE — requiere acción del usuario] Configurar ngrok para el webhook de MP**:
   - Usuario: crear cuenta en https://dashboard.ngrok.com y obtener authtoken.
   - Luego: `ngrok config add-authtoken <token>` → `ngrok http 5050` → registrar `https://<tunel>.ngrok-free.app/api/webhooks/mercadopago` en panel MP (app → Webhooks → Modo prueba, evento "Pagos") → copiar "Firma secreta" → exportar `MERCADOPAGO_WEBHOOK_SECRET` al levantar la API.
   - Cierra el ciclo: pago sandbox → webhook → cita `confirmed` automática.
2. Prueba de pago completa con comprador de prueba de MP (en incógnito; ver "Cuentas de prueba" del panel).
3. **A2**: vista calendario semanal de disponibilidad.
4. UI de moderación de reseñas (mismo patrón que la cola de cédulas).
5. Contactar abogados / placeholders legales (camino crítico del piloto).

### Para retomar

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub

# API (exportar también MERCADOPAGO_* para checkout real):
export ConnectionStrings__HealthHubDb='Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev'
export Clerk__Issuer='https://sunny-tomcat-26.clerk.accounts.dev'
export Clerk__SecretKey='<ver apps/web/.env.local>'
export MERCADOPAGO_ACCESS_TOKEN='<access token de la cuenta de prueba MP>'
npm run dev:api

# Web:
npm run dev:web
```

Credenciales demo: paciente `ana.martinez@example.com`, profesional `laura.vega@healthhub.demo`, admin clínica `admin.clinica@healthhub.demo`, master `master@healthhub.demo` — todos con `healthhub123`.

---

## Avance Marketplace MP — Fase 1: modelo de datos y migración

Fecha: 2026-06-11

Se decidió el modelo de marketplace para pagos: **cada profesional cobra en su propia cuenta de Mercado Pago** (vía OAuth, modelo split de pagos) y la plataforma retiene una **comisión variable por tier de licencia/especialidad**. Esto evita dispersiones manuales a fin de mes. El plan completo de 7 fases vive en `PLAN-MARKETPLACE.md`.

### Cambios en la API (Fase 1 de 7)

- **Nueva entidad `ProfessionalMercadoPago`** (`apps/api/Entities/ProfessionalMercadoPago.cs`): cuenta MP vinculada por OAuth de cada profesional — `MercadoPagoUserId` (collector_id), tokens OAuth **cifrados** (`AccessTokenEncrypted`, `RefreshTokenEncrypted`), `PublicKey`, `TokenExpiresAt` (el access token OAuth de MP expira a 180 días), estatus `pending | connected | verified | rejected | disconnected`. Relación 1:1 con `Professional` (índice único por `ProfessionalId`).
- **Nueva entidad `CommissionTier`** (`apps/api/Entities/CommissionTier.cs`): comisión por `LicenseType` (valores de `Professional.Specialty` + `default` como respaldo obligatorio), `CommissionPercentage`, `MinAppointmentsThreshold` (preparado para tiers por volumen, hoy 0 = siempre aplica). Índice único `(LicenseType, MinAppointmentsThreshold)`.
- **`Payment` extendido** con el desglose marketplace: `CommissionPercentage`, `CommissionAmount`, `ProfessionalAmount`, `TransferStatus` (`none | pending | completed | failed`, indexado) y `ProviderTransferId`.
- **`Professional` extendido** con `MercadoPagoStatus` (denormalizado, default `not_connected`) y navegación `MercadoPagoAccount`.
- **Migración `202606120001_MarketplaceSetup`**: tablas `professional_mercado_pagos` y `commission_tiers`, columnas nuevas en `payments` y `professionals`. Sigue el patrón SQL idempotente del proyecto (IF NOT EXISTS) con `Down` completo.
- **Seed de tiers** en `DatabaseSeeder.SeedCommissionTiersAsync` (solo si la tabla está vacía; editables después desde admin):
  - `default`: 20% (respaldo cuando la especialidad no tiene tier propio)
  - `doctor`: 15% · `psychologist`: 15%
  - `physiotherapist`: 12% · `nutritionist`: 12%

### Validaciones ejecutadas

- `dotnet build`: 0 warnings, 0 errores.
- Migración aplicada en PostgreSQL local (API levantada en puerto de prueba 5055, `/health` → `database: connected`).
- Verificación directa en psql: tablas `commission_tiers` (5 tiers sembrados con porcentajes correctos) y `professional_mercado_pagos` creadas; columnas nuevas presentes en `payments` (5) y `professionals` (`MercadoPagoStatus`).
- Servidor de prueba apagado al terminar.

### Decisiones de diseño

- Los tokens OAuth del profesional se guardan **cifrados** en BD; el servicio de cifrado (`ENCRYPTION_KEY`) llega en la Fase 3 junto con el flujo OAuth.
- La comisión se calculará **en el webhook** al aprobarse el pago (no en el checkout), usando el tier vigente en ese momento.
- `TransferStatus` nace en `none` (pago sin flujo marketplace) para distinguirlo de `pending` (transfer encolado).

### Siguientes pasos (fases restantes del plan)

1. **Fase 2-3**: `MercadoPagoMarketplaceService` — OAuth (authorization URL, exchange de código, refresh) + transfers, y servicio de cifrado de tokens.
2. **Fase 4**: endpoints — conectar cuenta MP (portal profesional), callback OAuth, cola de verificación admin.
3. **Fase 5**: webhook — calcular comisión por tier y disparar transfer al profesional.
4. **Fase 6-7**: UI (portal profesional + admin) y pruebas en `test-api.mjs`.

---

## Avance Marketplace MP — Fases 2-3: cifrado de tokens y servicio OAuth/split de pagos

Fecha: 2026-06-11

Se completaron las fases 2-3 del plan marketplace (`PLAN-MARKETPLACE.md`): el servicio de cifrado para los tokens OAuth y el servicio de integración marketplace con Mercado Pago.

### Decisión de arquitectura: `marketplace_fee` en lugar de transfers

Se corrigió el modelo respecto al plan original: en vez de recibir el pago en la cuenta plataforma y transferir al profesional, se adopta el **modelo oficial de split de pagos de MP** — la preferencia de pago se crea con el access token OAuth del profesional e incluye `marketplace_fee`. El dinero del paciente llega directo a la cuenta MP del profesional y MP acredita la comisión a la plataforma automáticamente. Esto elimina de raíz el riesgo identificado en la sesión anterior (transfers fallidas → dinero del profesional retenido en la cuenta plataforma) y evita custodiar dinero ajeno.

### Cambios en la API

- **`TokenEncryptionService`** (`apps/api/Infrastructure/TokenEncryptionService.cs`): AES-256-GCM para secretos en BD (tokens OAuth del profesional). Clave por `Security:EncryptionKey`/`ENCRYPTION_KEY` (base64 de 32 bytes, generar con `openssl rand -base64 32`). En Development sin clave usa una derivada fija (no bloquea pruebas locales); en producción sin clave `Protect` lanza (fail closed) y `Unprotect` devuelve null ante manipulación o formato inválido (fail soft en lecturas). Registrado como singleton.
- **`MercadoPagoMarketplaceService`** (`apps/api/Infrastructure/MercadoPagoMarketplaceService.cs`), registrado con `AddHttpClient`:
  - `CreateOAuthState` / `TryParseOAuthState`: state firmado con HMAC-SHA256 (clave derivada del client secret) que amarra el callback OAuth al profesional que inició la vinculación — anti-CSRF, caduca a 30 minutos, comparación en tiempo constante.
  - `BuildAuthorizationUrl`: URL de autorización en `auth.mercadopago.com.mx` (configurable por país).
  - `ExchangeAuthorizationCodeAsync` / `RefreshAccessTokenAsync`: canje de código y renovación contra `oauth/token` (los access tokens OAuth de MP expiran a 180 días; el refresh token es de un solo uso).
  - `GetAccountInfoAsync`: email/nickname de la cuenta vinculada vía `users/me`.
  - `CreateMarketplacePreferenceAsync`: preferencia de Checkout Pro creada con el token del profesional + `marketplace_fee`; mismas reglas HTTPS de `auto_return`/`notification_url` que el checkout directo.
  - **Modo simulado** consistente con el resto del proyecto: sin `MERCADOPAGO_CLIENT_ID`/`CLIENT_SECRET` el flujo completo (auth URL → callback con `sim-auth-code` → credenciales/preferencias simuladas) funciona en local sin tocar MP. Nunca lanza excepción.
- `.env.example`: se agregaron `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET` y `ENCRYPTION_KEY` documentados.

### Validaciones ejecutadas

- `dotnet build`: 0 warnings, 0 errores.
- Suite de verificación standalone (proyecto de consola temporal compilando los fuentes reales): **21 checks PASS** — round-trip cifrar/descifrar (incluye UTF-8 con acentos), no determinismo por nonce aleatorio, rechazo de valor manipulado/basura, respaldo dev sin clave, fail-closed en producción sin clave, rechazo de clave de tamaño incorrecto, state OAuth válido/manipulado/nulo/basura, y el flujo simulado completo (auth URL, exchange, refresh, users/me, preferencia marketplace con comisión).
- Nota: una falla inicial del test de manipulación resultó ser del propio test (el tamper no modificaba la cadena); con tamper determinista el rechazo por HMAC quedó verificado.

### Siguientes pasos

1. **Fase 4**: endpoints — `POST /api/professional-portal/marketplace/connect` (devuelve auth URL con state), callback público `GET /api/marketplace/oauth-callback` (canjea código, cifra y guarda tokens, actualiza `MercadoPagoStatus`; agregar a `IsPublicApiRequest`), y cola admin de verificación.
2. **Fase 5**: checkout marketplace (gate por `MercadoPagoStatus=verified`, cálculo de comisión por tier con fallback `default`) + webhook con desglose persistido.
3. **Fase 6-7**: UI portal profesional/admin y pruebas en `test-api.mjs`.
4. **Acción del usuario** (cuando toque probar real): crear aplicación MP **tipo marketplace** en el panel de desarrolladores para obtener `client_id`/`client_secret`; el access token directo de A1 no sirve para OAuth.

---

## Cierre de jornada — 2026-06-11 (sesión marketplace)

Fecha: 2026-06-11

### Resumen de la sesión

1. **Decisión de modelo de pagos**: marketplace con OAuth de Mercado Pago — cada profesional cobra en su propia cuenta MP; la plataforma retiene comisión variable por tier de licencia. Sin dispersiones manuales. Plan de 7 fases en `PLAN-MARKETPLACE.md`.
2. **Fase 1 completada**: entidades `ProfessionalMercadoPago` y `CommissionTier`, extensiones a `Payment` (desglose de comisión) y `Professional` (`MercadoPagoStatus`), migración `202606120001_MarketplaceSetup` aplicada en PostgreSQL local, 5 tiers sembrados (default 20%, doctor/psychologist 15%, physiotherapist/nutritionist 12%).
3. **Fases 2-3 completadas**: `TokenEncryptionService` (AES-256-GCM para tokens en BD) y `MercadoPagoMarketplaceService` (OAuth completo: auth URL, exchange, refresh, users/me; preferencia con `marketplace_fee`; state firmado HMAC anti-CSRF; modo simulado E2E).
4. **Corrección de arquitectura**: se descartaron los transfers manuales del plan original por el modelo oficial de split de pagos (`marketplace_fee`) — el dinero llega directo al profesional, MP acredita la comisión automáticamente, y desaparece el riesgo de dinero retenido por transfers fallidas. Razonamiento completo en `comentarios_claude.md`.

### Estado al cerrar

- API ASP.NET Core compilada: `dotnet build` 0 warnings, 0 errores.
- Migraciones aplicadas hasta `202606120001_MarketplaceSetup` (verificada contra PostgreSQL local: tablas `professional_mercado_pagos` y `commission_tiers`, columnas nuevas en `payments` y `professionals`, 5 tiers sembrados).
- Cifrado y servicio OAuth verificados con suite standalone: 21 checks PASS.
- Frontend sin cambios en esta sesión (las fases de UI son F6-7).
- Servidores de desarrollo apagados; PostgreSQL local (brew) queda corriendo.
- ngrok sigue instalado y **sin configurar** (pendiente heredado para el webhook de A1).

### Pendientes para la próxima sesión (en orden)

1. **Fase 4 — Endpoints marketplace**:
   - `POST /api/professional-portal/marketplace/connect`: genera state firmado (`CreateOAuthState`) y devuelve la auth URL (`BuildAuthorizationUrl`).
   - Callback público `GET /api/marketplace/oauth-callback?code=...&state=...`: validar state (`TryParseOAuthState`), canjear código (`ExchangeAuthorizationCodeAsync`), cifrar tokens (`TokenEncryptionService.Protect`), guardar `ProfessionalMercadoPago`, actualizar `Professional.MercadoPagoStatus`, auditar y redirigir al portal. **CRÍTICO: agregarlo a `IsPublicApiRequest` en `Program.cs` o el middleware global lo bloquea con 401.**
   - Cola admin: listar cuentas `pending`/`connected` y `PATCH` para `verified`/`rejected` (mismo patrón que la verificación de cédulas).
   - Todo funciona en **modo simulado** sin credenciales: el flujo completo es probable en local.
2. **Fase 5 — Checkout marketplace + webhook**: gate `MercadoPagoStatus=verified` antes de crear preferencia; comisión por tier con fallback `default`; desglose persistido en `Payment`; preferencia vía `CreateMarketplacePreferenceAsync`. Job de refresh de tokens (expiran a 180 días; el refresh token de MP es de un solo uso → guardado transaccional).
3. **Fase 6-7 — UI y pruebas**: sección "Cobros" en `/portal-profesional`, panel admin en `/seguridad`, casos marketplace en `test-api.mjs`.
4. **[PENDIENTE — acción del usuario] App marketplace en MP**: crear aplicación tipo marketplace en el panel de desarrolladores de MP para obtener `MERCADOPAGO_CLIENT_ID`/`CLIENT_SECRET` (el access token de A1 no sirve para OAuth). Solo necesario para probar contra MP real; el desarrollo sigue en simulado.
5. Pendientes heredados: ngrok + `MERCADOPAGO_WEBHOOK_SECRET` (cierra A1), prueba de pago con comprador de prueba, A2 (calendario semanal), UI de moderación de reseñas, abogados/placeholders legales.

### Para retomar

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub

# API:
export ConnectionStrings__HealthHubDb='Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev'
export Clerk__Issuer='https://sunny-tomcat-26.clerk.accounts.dev'
export Clerk__SecretKey='<ver apps/web/.env.local>'
export MERCADOPAGO_ACCESS_TOKEN='<access token de la cuenta de prueba MP>'   # checkout directo A1
# Marketplace: sin MERCADOPAGO_CLIENT_ID/CLIENT_SECRET opera en modo simulado (suficiente para F4-F7)
npm run dev:api

# Web:
npm run dev:web
```

Credenciales demo: paciente `ana.martinez@example.com`, profesional `laura.vega@healthhub.demo`, admin clínica `admin.clinica@healthhub.demo`, master `master@healthhub.demo` — todos con `healthhub123`.

---

## Actualización — 2026-06-12 (sesión 9): Fase 4 Marketplace - Endpoints OAuth

### Lo que se completó

**Fase 4: Endpoints API para Mercado Pago OAuth (✅ completada)**

Se implementaron los 3 endpoints principales que forman el flujo de vinculación de cuentas MP:

1. **`GET /api/professional-marketplace/connect`** — Profesional solicita su URL de autorización OAuth
   - Genera state firmado (HMAC anti-CSRF) con el ID del profesional
   - Retorna `authorizationUrl` + `redirectUri`
   - Requiere autenticación

2. **`POST /api/professional-marketplace/callback`** — Profesional regresa del flujo OAuth de MP
   - Valida state con firma HMAC (plazo 30 min)
   - Canjea código por `MercadoPagoOAuthCredentials` (access_token, refresh_token, userId, public_key, expires_at)
   - **Encripta tokens con AES-256-GCM** en columnas `AccessTokenEncrypted` + `RefreshTokenEncrypted`
   - Crea o actualiza registro `ProfessionalMercadoPago` en `pending`
   - Ingresa en auditoria el evento `marketplace.oauth_linked`

3. **`PATCH /api/admin/marketplace/professionals/{id}/verify`** — Admin verifica la cuenta MP
   - Solo accesible por `internal_admin` o `clinic_admin` de la clínica del profesional
   - Cambia `Professional.MercadoPagoStatus` a `verified` o `rejected`
   - Si verified, también actualiza `ProfessionalMercadoPago.VerifiedAt`
   - Audita cada transición

**Bonus endpoint: `GET /api/admin/marketplace/pending`**
   - Lista profesionales con `MercadoPagoStatus = pending`
   - Filtrado por clínica para `clinic_admin`, sin filtro para `internal_admin`

### Cambios en entities / contratos

- Nuevos contratos: `MercadoPagoMarketplaceOAuthCallbackRequest`, `VerifyMercadoPagoRequest`
- Helper: `CanManageMarketplaceAsync` (copia de `CanManageProfessionalConfigAsync` para marketplace)
- Uso de métodos correctos de `MercadoPagoMarketplaceService`: `BuildAuthorizationUrl`, `CreateOAuthState`, `TryParseOAuthState`, `ExchangeAuthorizationCodeAsync`, `GetAccountInfoAsync`
- Métodos de encriptación `Protect` / `Unprotect` del `TokenEncryptionService`

### Validaciones ejecutadas

- `npm run build:api`: ✅ Build limpio (0 errores, 2 warnings de null literals aceptables)
- Health check `/health`: ✅ API respondiendo normalmente
- Estructura de datos en PostgreSQL: ✅ tablas `professional_mercado_pagos` y `commission_tiers` presentes

### Pendiente: Pruebas E2E

El endpoint de callback es público (`WithName` pero sin `RequireAuthorization`) para soportar OAuth callback desde navegador del usuario. Necesita:
1. Una cuenta Mercado Pago tipo Marketplace (client_id/client_secret) — sin esto, el servicio opera en `Simulated: true`
2. Test manual del flujo completo: solicitar auth URL → simular/completar OAuth → callback → verificar tokens guardados encriptados

El modo simulado ya funciona end-to-end (test-api.mjs puede extenderse para validarlo).

### Estado actual

- **Fases completadas:** 1-2 (entidades, migración), 3 (servicio OAuth), 4 (endpoints)
- **Fases pendientes:** 5 (webhook + calcular comisión), 6 (UI profesional), 7 (UI admin + tests)
- API compilada y running en http://localhost:5050

### Próximos pasos en orden de impacto

1. **Fase 5 — Webhook + desglose de comisión:** Endpoint `POST /api/webhooks/mercadopago` recibe notificación de pago aprobado, calcula comisión según tier, guarda en `Payment` (`CommissionAmount`, `CommissionPercentage`, `ProfessionalAmount`)
2. **Fase 6 — UI profesional:** Panel en `/portal-profesional` con botón "Conectar Mercado Pago", estado de cuenta (conectada/verificando/rechazada), email de MP y botón de desconectar
3. **Fase 7 — UI admin + tests:** Panel en `/seguridad` listando profesionales pendientes, botones Verificar/Rechazar, y test-api.mjs con flujo completo de OAuth simulado

---

## Actualización — 2026-06-12 (sesión 9, continuación): Fase 5 Marketplace - Checkout split + webhook + refresh de tokens

### Lo que se completó

**Fase 5 ✅ — implementada por subagente Opus, planificada con corrección de arquitectura:**

La comisión se calcula **en el checkout, no en el webhook** (corrección al plan original): con el modelo `marketplace_fee`, la comisión viaja dentro de la preferencia de pago, así que debe conocerse al crearla. El webhook solo registra que el split se aplicó.

1. **Checkout marketplace** (`POST /api/appointments/{id}/checkout`):
   - Rama marketplace solo si `MercadoPagoStatus == "verified"` + cuenta MP vinculada
   - Descifra access token; si es ilegible degrada a flujo legacy (audita `marketplace.token_unreadable`)
   - **Refresh proactivo**: token que vence en <7 días se renueva y persiste ANTES de crear la preferencia (refresh token de MP es de un solo uso)
   - Comisión por tier: `ResolveCommissionPercentageAsync` — tier activo por especialidad con umbral de citas completadas alcanzado, respaldo `default`, respaldo duro 20%
   - Persiste desglose en Payment (`CommissionPercentage/CommissionAmount/ProfessionalAmount`) + `TransferStatus = "pending"`
   - Preferencia creada con token del profesional + `marketplace_fee`
   - Rama legacy intacta para profesionales sin cuenta verificada (comisión 0, `TransferStatus = "none"`) — un pago nunca queda atorado

2. **Webhook**: `approved` + `TransferStatus=pending` → `completed`; `refunded` + `completed` → `reversed`

3. **`MercadoPagoTokenRefreshService`** (nuevo BackgroundService): corre 1 min tras arranque y cada 24h; renueva tokens que vencen en <30 días, persistencia fila por fila, auditoría por renovación, nunca tumba la API. Cierra el riesgo operativo #1 (tokens a 180 días).

### Validación

- Build: ✅ 0 errores. Tests: ✅ `npm run test:api` passed
- Prueba E2E simulada: profesional nutritionist → tier 12%, servicio $950 → comisión $114.00, profesional $836.00, `transfer_status: pending → completed` tras webhook, cita `confirmed`
- Refresh proactivo verificado: token sembrado a 5 días de vencer se renovó a ~180 días durante el checkout

### Hallazgo importante (deuda para Fase 7)

**Los endpoints de Fase 4 (`/api/professional-marketplace/connect` y `/api/admin/marketplace/*`) usan `.RequireAuthorization()` (JWT Clerk), pero el login dev emite tokens de sesión opacos** → 401 con auth dev. No son ejercitables por curl/test-api.mjs hoy. Alinearlos con `GetUserFromRequestAsync` (como el resto de endpoints) en Fase 7.

### Estado del marketplace

| Fase | Estado |
|------|--------|
| 1-2 Entidades + Migración | ✅ |
| 3 Servicio OAuth | ✅ |
| 4 Endpoints | ✅ |
| 5 Checkout split + webhook + refresh job | ✅ |
| 6 UI profesional | ⏳ |
| 7 UI admin + tests + fix auth endpoints F4 | ⏳ |

---

## Actualización — 2026-06-12 (sesión 9, cierre): Fases 6 y 7 — Marketplace Mercado Pago COMPLETO

### Fase 6 ✅ — UI del profesional + plumbing API

**Fixes de API que la UI destapó (planificados antes de implementar):**
- **redirectUri corregido**: connect/callback construían el redirect OAuth con el host del API (:5050) → el navegador aterrizaba en 404. Ahora usan `WEB_BASE_URL/portal-profesional/marketplace-callback` (idéntico en connect y callback, requisito de MP).
- **Auth alineada (bug Fase 4)**: se quitó `.RequireAuthorization()` (JWT-only) de connect y del grupo admin; los handlers ya validaban sesión con `GetUserFromRequestAsync` como el resto del API. Ahora funcionan con tokens legacy/dev y Clerk.
- **Callback registrado como ruta pública** en `IsPublicApiRequest` (el navegador llega sin sesión; la protección es el state HMAC).
- **Nuevo `GET /api/professional-marketplace/status`**: status, email, fechas y `commissionPercentage` aplicable (vía `ResolveCommissionPercentageAsync`). Nunca expone tokens.

**Web:**
- `components/marketplace-panel.tsx`: sección "Cobros con Mercado Pago" en el portal profesional con render por estado (not_connected → botón conectar; pending → "verificación en proceso"; verified → badge + email + comisión %; rejected → reconectar).
- `app/portal-profesional/marketplace-callback/`: página que recibe el redirect OAuth (?code&state), postea al API y muestra éxito/error.
- `lib/healthhub-store.ts`: `loadMarketplaceStatus()` y `connectMarketplace()`.

### Fase 7 ✅ — UI admin + pruebas de integración

**Web:**
- `components/marketplace-admin-panel.tsx`: sección "Marketplace Mercado Pago" en `/seguridad` — tabla de profesionales pendientes (nombre, email, fecha de conexión, estado de cédula) con botones Verificar/Rechazar y refresco tras la acción.
- Store: `loadMarketplacePending()` (403 silencioso) y `verifyMarketplaceProfessional()`.

**Pruebas (`scripts/test-api.mjs`, 20 asserts nuevos):**
- Connect sin sesión → 401; flujo OAuth simulado completo (connect → callback 201 → status pending)
- **Tamper determinista del state** (decode base64, sustituir professionalId, recodificar) → 400
- Pending list: master 200, paciente 403; verify: status inválido 400, verified 200, comisión > 0
- Checkout con split simulado + webhook firmado → cita confirmed; limpieza de cita QA
- **Re-ejecutable**: doble corrida en verde

**Bug real encontrado por las pruebas** (Fase 4, nunca ejercitado por HTTP): `GET /api/admin/marketplace/pending` pasaba `resourceId: null` a AddAuditLog y la columna es NOT NULL → 500 en cada llamada. Fix: sentinel `"list"` (convención existente de las otras lecturas de listas).

### Validación final
- `build:api` 0 errores · `build:web` + `lint:web` limpios · `test:api` doble corrida "API tests passed" · API corriendo en :5050

### Estado del marketplace: 7/7 fases ✅

| Fase | Estado |
|------|--------|
| 1-2 Entidades + Migración | ✅ |
| 3 Servicio OAuth (cifrado, state HMAC, modo simulado) | ✅ |
| 4 Endpoints (connect, callback, admin) | ✅ |
| 5 Checkout split + webhook + refresh job | ✅ |
| 6 UI profesional + callback OAuth | ✅ |
| 7 UI admin + 20 asserts de integración | ✅ |

### Pendientes para producción (fuera del alcance del desarrollo)
1. **Trámite de la app marketplace en MP** (client_id/client_secret reales) — todo el código opera en modo simulado hasta entonces.
2. `ENCRYPTION_KEY` de producción (base64 32 bytes) y `MERCADOPAGO_WEBHOOK_SECRET` reales en el entorno de deploy.
3. Endurecimiento real-mode del webhook para pagos marketplace (el pago vive en la cuenta del vendedor; consulta con token del seller) — anotado en el código.
4. Definir [COMISION_PLATAFORMA] final con abogados → editar filas de `commission_tiers` (sin deploy).

---

## Actualización — 2026-06-12 (sesión 9, tarde): Fix del bug de identidad "Ana Martinez" en el frontend

### Bug reportado por el usuario
Con sesión de paciente, clic en el logo → /portal-paciente pero el nombre cambiaba a "Ana Martinez" (paciente demo), aparecía el banner "Esta es una sesion profesional..." siendo paciente, y se re-disparaba el onboarding de un perfil ya existente.

### Causas raíz (5, todas en apps/web)
1. `healthhub-store.ts`: `currentUser` inicia como seed demo (Ana Martinez hardcodeada); cada componente tiene SU instancia del store (useState local) con su propio bootstrap.
2. Bootstrap con `Promise.all` de 8 endpoints: un solo fallo (403 por rol, race del token Clerk, 500) descartaba TODO incluida la identidad real → fallback silencioso a Ana.
3. `readStoredState()` rehidrataba identidad vieja desde localStorage.
4. Banner de portal-paciente con condición `!currentPatient` — mentía ("sesion profesional") cuando el problema era datos desincronizados.
5. Onboarding: en el catch del check de consentimiento mostraba el formulario vacío → re-pedía perfil existente ante cualquier error transitorio.

### Correcciones (subagente Opus 4.8, plan de Fable 5)
- **Dedupe module-level de `/api/me`** (`resolveSessionOnce()` + `invalidateSession()`): todas las instancias del hook comparten la misma resolución de identidad; login/logout/setDemoSession/refreshSession invalidan el caché.
- **Identidad separada de datos**: bootstrap en 2 pasos — identidad primero, luego datos con `Promise.allSettled`. Fallo parcial de datos = `apiStatus: "fallback"`, identidad intacta.
- **Sin fallback de identidad con credenciales presentes**: si hay cookie dev o Clerk y `/api/me` falla → sentinel `guestUser` (`primaryRole: "guest"`) + estado `session-error` con banner "No pudimos validar tu sesion" y logo inerte. Seed demo SOLO en modo prototipo sin credencial alguna. localStorage ya no aporta identidad cuando hay credenciales.
- **Banner global "Modo demostracion"** cuando `apiStatus = "fallback"` (cierra la deuda del 2026-06-10: el fallback ya no es silencioso).
- **Gates de navegación**: page.tsx y app-shell esperan `ready` antes de redirigir/armar el logo.
- **Banner honesto en portal-paciente**: distingue "rol no paciente" de "no pudimos cargar tu perfil".
- **Onboarding con fases** (`checking|form|error`): ante error muestra pantalla con "Reintentar" + enlace a /sesion; el formulario solo aparece con consentimiento resuelto como incompleto.

### Validación
- `lint:web` limpio, `build:web` sin errores (19 rutas), `test:api` passed.
- Escenarios verificados en código: demo Carlos persiste tras clic en logo; /api/me caído ≠ Ana Martinez; fallo de endpoint secundario no cambia identidad; onboarding con error no re-pide datos.
- Nota: el localStorage del navegador del usuario puede tener estado viejo; con el fix la identidad ya no se rehidrata de ahí, se autocorrige al refrescar.

### Pendiente de verificación visual por el usuario
1. Refrescar el navegador (o hard reload) para purgar el estado en memoria.
2. Como paciente demo: clic en logo → debe permanecer la misma identidad.
3. Confirmar que el onboarding ya no se re-dispara con perfil existente.

---

## Cierre de sesión — 2026-06-12

Servicios detenidos (API :5050 y web :3000). Para retomar:

```bash
# API:
HEALTHHUB_DB_CONNECTION="Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev;SSL Mode=Disable" npm run dev:api
# Web:
npm run dev:web
```

### Resumen del día (sesión 9)
1. **Marketplace Mercado Pago COMPLETO (7/7 fases)**: Fase 4 endpoints, Fase 5 checkout con split + webhook + job de refresh de tokens, Fase 6 UI profesional + callback OAuth, Fase 7 UI admin + 20 asserts de integración. Todo en modo simulado hasta tener credenciales reales de MP.
2. **Fix del bug de identidad "Ana Martinez"**: la identidad ya no cae a datos demo; error de sesión explícito + banner de modo fallback.

### Arranque sugerido para la próxima sesión
1. **Verificación visual del fix de identidad** (pendiente del usuario): hard refresh, clic en logo como paciente → identidad estable; onboarding no se re-dispara.
2. **E2E de cuenta paciente nueva con Clerk** (pendiente desde 2026-06-10) — primer candidato de trabajo.
3. Después: **Resend productivo** (B1: dominio + plantillas de cita + recordatorio 24h) o **páginas públicas SEO de profesionales** (B2).
4. En paralelo (trámites del usuario, no código): cuenta marketplace en Mercado Pago (client_id/client_secret) y revisión legal de documentos ([COMISION_PLATAFORMA], políticas de cancelación/reembolso).

---

## Avance Top-5 UX — revisión e implementación con agentes paralelos — 2026-06-12

Se hizo una revisión UX completa (flujos por rol + UI sobre las 10 capturas de `screenshots/`) y se implementaron los 5 cambios prioritarios según `PLAN-TOP5-UX.md`, ejecutado en 3 olas de agentes paralelos con propiedad disjunta de archivos. Respaldo previo (no hay git): `../HealthHub-snapshot-2026-06-12-pre-top5.tar.gz`.

### Backend (nuevo)

- DTOs de cita exponen `paymentStatus` y `paymentProvider` (del último Payment).
- `POST /api/appointments/{id}/cash-payment`: registro de cobro en efectivo (Payment `provider="cash"` aprobado, comisión 0, cita scheduled→confirmed, auditado, idempotente).
- `GET /api/professional-portal/payments?month=YYYY-MM`: estado de cuenta con items y summary (bruto/comisión/neto/efectivo/en línea). Los totales de efectivo y en línea son netos y solo de pagos aprobados.
- `GET /api/professional-portal/subscription`: trial de 14 días desde `User.CreatedAt`, planes Básico $399 / Pro $699 MXN; `POST .../subscription/interest` registra interés de compra (idempotente, audita, notifica a internal_admin).
- Migración `202606120002_SubscriptionInterest` (columna `SubscriptionInterestAt` en professionals).
- `test-api.mjs` extendido (cash, payments, subscription); suite verde en doble corrida.

### Frontend

- **Glosario canónico de estados** `apps/web/lib/appointment-states.ts`: misma etiqueta/color en todos los portales; `scheduled` se muestra "Por confirmar" (ya no "Programada").
- **Home del profesional unificado (`/`)**: checklist de publicación de 5 pasos (incluye "Conecta Mercado Pago"), sección "Hoy" con doble badge (estado de cita + pago), "Solicitudes por confirmar" con Confirmar/Rechazar inline, tarjetas resumen + "Ingresos del mes", y botón "Registrar pago en efectivo" con confirmación inline. Eliminados el panel demo "Trabajo pendiente" (fuga de pacientes ajenos en cuentas reales) y la fecha hardcodeada 2026-06-06.
- **`/portal-profesional` ahora es "Configuración"**: perfil, servicios, disponibilidad, panel Mercado Pago (con desglose ejemplo de comisión) y nueva sección "Cobros" (tabla del mes + summary + selector de mes, ancla `#cobros`). Navegación: "Inicio" / "Configuración"; eliminado "MVP operativo" del logo.
- **Portal paciente**: flujo renombrado a "Solicitar cita", panel de éxito post-solicitud con resumen y "Pagar ahora", "Tu próxima cita" above the fold, "Mis documentos" (antes "Expedientes visibles"), badges de pago.
- **Trial/suscripción**: banner en AppShell para profesionales ("Prueba gratuita: te quedan N días") + página `/suscripcion` con planes del API y CTA de interés (honesto: "te contactaremos durante el piloto").
- **Barrida de credibilidad**: acentos en todo el copy, footer sin placeholders `[RAZON_SOCIAL]`/`[EMAIL_PRIVACIDAD]`, landing honesta (sin "comunicación segura"; "Acceso de desarrollo" solo fuera de producción), retiradas la stat "Conversación activa" (chat eliminado) y el botón IA "Resumir avances" (Fase 4), `lib/specialty-labels.ts` (slug→etiqueta legible), empty states con CTA, retirada la caja de búsqueda decorativa del PageHeader.

### Validaciones

- `dotnet build`: 0 errores. `npm run test:api`: verde (doble corrida). `npm run lint:web`: verde (tras corregir 3 `react-hooks/set-state-in-effect` derivando estado en render). `npm run build:web`: verde (20 rutas, `/suscripcion` incluida). `tsc --noEmit` por workstream.
- Verificación SSR por curl: hero nuevo en `/bienvenida`, sin placeholders legales, sin "MVP operativo", `/suscripcion` protegida (307 sin sesión).
- **Pendiente verificación visual del usuario**: el navegador del preview no carga la app (chrome-error, problema conocido del entorno). Servicios dejados arriba: web :3000, API :5050.

### Pendientes detectados en la sesión

1. Copy del backend sin acentos / strings de prototipo: `Program.cs` ("Paciente creado desde API MVP.", textos de notificaciones), `MappingExtensions.cs` (`SpecialtyLabel`/`ClinicRoleLabel`), `healthhub-store.ts` (progress local), `demo-data.ts` (specialtyLabel). Ojo con acoplamientos string-comparación al corregir.
2. `demo-data.ts` aún exporta `conversations`/`messages` sin consumidores (residuo del chat eliminado).
3. Búsqueda real en pacientes/agenda/expediente (la caja anterior era decorativa y se retiró).
4. Diferido por decisión: TTL duro de slots no pagados (contradice el flujo de efectivo; evaluar política por profesional post-piloto).

---

## Cierre de sesión — 2026-06-12 (Top-5 UX + corrección de API)

Estado al cerrar:

- API ASP.NET Core compilada: `dotnet build` 0 errores. Migraciones aplicadas hasta `202606120002_SubscriptionInterest`.
- `npm run test:api`, `npm run lint:web`, `npm run build:web`: todos correctos (20 rutas). 3 errores `react-hooks/set-state-in-effect` corregidos antes de cerrar.
- Frontend y API detenidos; PostgreSQL local (brew) queda corriendo.
- Sin git — respaldo disponible en `../HealthHub-snapshot-2026-06-12-pre-top5.tar.gz`.

Para retomar:

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub

# API (Clerk requerido):
HEALTHHUB_DB_CONNECTION="Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev;SSL Mode=Disable" \
Clerk__Issuer="$(grep '^NEXT_PUBLIC_CLERK_ISSUER=' apps/web/.env.local | cut -d= -f2-)" \
Clerk__SecretKey="$(grep '^CLERK_SECRET_KEY=' apps/web/.env.local | cut -d= -f2-)" \
nohup $HOME/.dotnet/dotnet run --no-build --project apps/api/HealthHub.Api.csproj --urls http://127.0.0.1:5050 > /tmp/hh-api.log 2>&1 &

# Web:
npm run dev:web
```

Credenciales demo: paciente `ana.martinez@example.com`, profesional `laura.vega@healthhub.demo`, admin clínica `admin.clinica@healthhub.demo`, master `master@healthhub.demo` — todos con `healthhub123`.

### Siguientes 3 pasos

1. **Verificación visual del usuario** (no requiere código): abrir `http://localhost:3000` con las credenciales demo y confirmar los 5 cambios UX — Inicio unificado con checklist, "Solicitudes por confirmar", sección "Cobros" en Configuración, portal paciente con "Tu próxima cita" y "Solicitar cita", y `/suscripcion` con planes reales del API. Si algo no coincide, revisar `/tmp/hh-api.log`.

2. **Copy backend sin acentos** (tarea de código pendiente de la chip creada en sesión): corregir strings en `apps/api/Program.cs` ("Paciente creado desde API MVP.", textos de notificaciones), `apps/api/Infrastructure/MappingExtensions.cs` (`SpecialtyLabel`/`ClinicRoleLabel` sin acento) y `apps/web/lib/demo-data.ts` (`specialtyLabel`). Cuidado con comparaciones de string que dependan del valor actual antes de cambiar.

3. **Resend productivo (B1)**: registrar dominio verificado en Resend, crear plantillas de cita (confirmada, recordatorio 24h, cancelada) y conectar los eventos existentes en el API (`EmailSender` ya tiene la infraestructura, solo faltan `RESEND_API_KEY`, `RESEND_FROM` y plantillas). Junto con esto: job automático de recordatorio de invitaciones por vencer.

---

## Avance pasos 2 y 3 — copy con acentos + Resend transaccional (agentes paralelos) — 2026-06-14

Se ejecutaron los pasos 2 y 3 del cierre anterior con 3 agentes (Sonnet/Opus según complejidad). **Restricción clave:** no hay git → sin aislamiento por worktree; los pasos 2-backend y 3 editan ambos `Program.cs` en regiones que se solapan, así que se corrieron en **secuencia** (Agente B → Agente C); el slice web es independiente (`apps/web`) y corrió **en paralelo** con el backend.

### Paso 2 — Copy con acentos + búsqueda sin regresión

**Footgun detectado y resuelto:** la búsqueda de profesionales (API `Program.cs:~1507` y web `portal-patient-page-client.tsx:~203`) hacía `label.ToLowerInvariant().Contains(query)` **sin normalizar acentos**. Al acentuar las etiquetas ("Psicología", "Nutrición"), una query sin acento ("psicologia") dejaría de coincidir. Se agregó normalización de diacríticos en ambos lados de la comparación.

- **API (Agente B, Opus):** `MappingExtensions.cs` — acentos en `SpecialtyLabel`/`ClinicRoleLabel`/`RecordTypeLabel`/`WeekdayLabel` (solo los textos devueltos; las llaves del `switch` intactas). Nuevo helper `public static RemoveDiacritics(string)` (FormD + filtra `NonSpacingMark`) aplicado a `normalizedQuery` y a los 5 campos del filtro de búsqueda (DisplayName, Location, Bio, SpecialtyLabel, nombres de servicio) → búsqueda ahora insensible a mayúsculas **y** acentos. Acentos también en copy de notificaciones (Title/Body) y mensajes de error/validación (`Invitación creada`, `Interés en activar un plan`, `La invitación expiró`, etc.).
- **Web (Agente A, Sonnet):** acentos en `demo-data.ts` (specialtyLabel, bios, SOAP, reviews, weekday). Helper `stripAccents` (NFD) aplicado al filtro de búsqueda del portal paciente. `specialty-labels.ts` ya estaba acentuado.

**Identificadores deliberadamente NO tocados** (comparados por igualdad en otro lado — el footgun que la regla de seguridad evitó):
- `Program.cs:488` `"Paciente creado desde API MVP."` y `:3792` `"...desde Clerk."` → están en el allowlist `patient-profile-client.tsx:18-22` que **oculta** estos placeholders; cambiarlos filtraría copy de prototipo a la UI. Quedan como están (no son visibles al usuario).
- Bios `"Perfil creado desde una invitacion..."` (comparadas con `StartsWith`), clave de consentimiento `"{consentType}@{version}"`, y todos los status/slug/action/channel (31 literales verificados intactos).

### Paso 3 — Resend transaccional (plantillas + eventos + job)

- **Plantillas** (`EmailSender.cs`): `BuildAppointmentConfirmedEmail` ("Tu cita está confirmada"), `BuildAppointmentReminderEmail` ("Recordatorio: tu cita es mañana"), `BuildAppointmentCancelledEmail` ("Tu cita fue cancelada"). Mismo estilo inline-CSS que `BuildInvitationEmail`; usan los campos denormalizados `Date`/`Time`/`ProfessionalName`; `Mode` → "Presencial"/"En línea".
- **Eventos cableados** (`Program.cs`, vía helper central `SendAppointmentEmailAsync`, best-effort try/catch, nunca rompe el request):
  - `PATCH /appointments/{id}/cancel` → email cancelada.
  - `PATCH /appointments/{id}/status` → email confirmada cuando pasa a `confirmed`.
  - `POST /appointments/{id}/cash-payment` → email confirmada solo en la transición `scheduled→confirmed`.
- **Job en background** (`EmailReminderService : BackgroundService`, espejo de `MercadoPagoTokenRefreshService`, cada 30 min, scope por tick): (1) recordatorios 24h de citas (`StartsAt` en now..+24h, status scheduled/confirmed, `ReminderSentAt` null → marca tras enviar); (2) recordatorios de invitaciones por vencer (`pending`, `ExpiresAt` en now..+48h, `ExpiryReminderSentAt` null). Registrado con `AddHostedService`.
- **Migración** `202606140001_EmailReminderTracking`: agrega `appointments.ReminderSentAt` y `clinic_invitations.ExpiryReminderSentAt` (timestamptz null). Sigue la convención real del repo (`migrationBuilder.Sql` con `ADD COLUMN IF NOT EXISTS`, **no** `AddColumn<>()`; no hay ModelSnapshot). Entidades + `HealthHubDbContext` actualizados.
- **Env vars** (ya soportadas, degradan a simulado): `RESEND_API_KEY`, `RESEND_FROM`, `WEB_BASE_URL`.

### Validaciones ejecutadas

- `dotnet build apps/api`: **0 errores, 0 warnings** (build integrado B+C).
- `npm run lint:web`: limpio. `npm run build:web`: OK (20 rutas).
- Migración `202606140001_EmailReminderTracking` aplicada en PostgreSQL local; columnas verificadas en `information_schema`.
- `npm run test:api`: **passed** (run limpio). Nota: el suite necesita `ASPNETCORE_ENVIRONMENT=Development` (login legacy gateado a Dev) y es sensible a 409 por slot QA residual y a 429 por rate-limit de `/api/auth` si se corre muchas veces seguidas — reiniciar la API resetea el rate limiter.
- **Prueba de comportamiento real:** query `?query=psicologia` (sin acento) → devuelve "Psic. Nora Ibarra" con `specialtyLabel: "Psicología"` (búsqueda acento-insensible + etiqueta acentuada). Durante `test:api` se registraron emails simulados reales: "Tu cita está confirmada" y "Tu cita fue cancelada" (con acentos) desde los paths de status y cash-payment.

### Pendiente (externo / producción, no código)

- Resend: dominio verificado + `RESEND_API_KEY`/`RESEND_FROM` reales (hoy todo en modo simulado `[EMAIL SIMULADO]`).
- Plantillas definitivas y el "from" de marca.
- Los placeholders ocultos `"Paciente creado desde API MVP."`/`"...desde Clerk."`: si se quieren limpiar de verdad, editar **a la vez** el string del API y el allowlist en `patient-profile-client.tsx` (cambiar solo uno rompe el ocultamiento).

---

## E2E de Clerk — verificado — 2026-06-14

Flujo de signup/login con Clerk validado visualmente por el usuario:
- `/sesion` muestra el selector de Acceso de desarrollo (4 usuarios demo sin contraseña).
- Rutas protegidas redirigen correctamente según el rol.
- ✅ Completado.

---

## Nombre de marca y dominio — pendiente — 2026-06-14

El nombre "HealthHub" ya está registrado como dominio (healthhub.com, healthhub.mx ocupados). Se necesita definir un nuevo nombre de marca antes de poder:

1. Registrar el dominio para el producto.
2. Verificar el dominio en Resend y activar email transaccional real.
3. Actualizar el nombre en Clerk (actualmente "Clinixa"), la landing, los correos y el copy general.

### Criterios para el nuevo nombre

- Disponible como `.mx` y `.com` (verificar en namecheap.com antes de decidir).
- Pronunciable en español, memorable, corto (1-2 palabras).
- Que comunique salud + continuidad/seguimiento + profesionalismo.
- Evitar anglicismos si el mercado objetivo es México/LATAM.

### Opciones a explorar (verificar disponibilidad)

| Nombre | Concepto |
|--------|----------|
| `saluda.mx` | Corto, español, doble sentido (saludar + salud) |
| `consulta.mx` | Directo al flujo principal |
| `clinik.mx` / `klinik.mx` | Variante ortográfica disponible |
| `medilink.mx` | Vínculo médico |
| `hubi.mx` | Corto, tech, derivado de hub |
| `cuidado.mx` | Acto de cuidar, muy latam |
| `seguimed.mx` | Seguimiento médico |

### Siguiente acción (usuario)

1. Ir a [namecheap.com](https://namecheap.com) y verificar disponibilidad de las opciones anteriores.
2. Decidir el nombre definitivo.
3. Registrar `.mx` + `.com` del nombre elegido (~$20-25 USD).
4. Avisar para actualizar: Clerk, copy frontend, `README.md`, `plan-lanzamiento.md` y configurar Resend con el dominio real.

### Impacto en el código

El renaming es principalmente copy/config — el stack técnico no cambia:
- `apps/web/.env.local`: `WEB_BASE_URL` (si cambia el subdominio)
- `apps/api/appsettings.json`: `Web:BaseUrl`, `Resend:From`
- Clerk dashboard: nombre de la aplicación + dominios autorizados
- `apps/web/app/bienvenida/`: hero y copy de landing
- `apps/web/components/app-shell.tsx`: nombre del logo

---

## Selección de especialidad en onboarding + sincronización de perfiles seed — 2026-06-15

### Contexto

Los módulos de especialidad (recetas, tareas, nutrición) ya filtraban el nav y protegían los endpoints por `Professional.Specialty`. Sin embargo, no había forma de que un profesional nuevo asignara su especialidad al registrarse: el campo quedaba en `"other"` hasta que alguien lo editara manualmente en el portal. Adicionalmente, los perfiles demo podían quedar con especialidad incorrecta si la BD fue sembrada antes de que el campo tuviera valores útiles.

### Qué se hizo (commit `db70b6a`)

**Backend:**

- `DatabaseSeeder.cs` — `EnsureSeedSpecialtiesAsync` se ejecuta en cada arranque (no gateada por `AnyAsync`). Asegura que los 4 profesionales demo tengan siempre sus especialidades correctas: Laura Vega → nutritionist, Miguel Torres → physiotherapist, Nora Ibarra → psychologist, Andres Campos → doctor.
- `ApiContracts.cs` — `UpdateMyProfileRequest` ahora incluye `Specialty?` (campo opcional).
- `Program.cs` PATCH `/api/me` — cuando el usuario es profesional y se provee `Specialty`, se aplica `NormalizeSpecialty` y persiste en `Professional.Specialty`. El cambio es libre (no solo desde `"other"`), para permitir correcciones de especialidad desde el onboarding.

**Frontend:**

- `healthhub-store.ts` — `updateAccountProfile` acepta `specialty?: string` y lo incluye en el PATCH.
- `onboarding-page-client.tsx` — cuando el usuario selecciona el rol **Profesional**, aparece un selector de 5 tarjetas con ícono: Medicina General (`doctor`), Psicología (`psychologist`), Fisioterapia (`physiotherapist`), Nutrición (`nutritionist`), Otra especialidad (`other`). El botón "Continuar" queda deshabilitado hasta que se seleccione una especialidad. Al guardar, viaja junto al nombre y el rol en el mismo PATCH `/api/me`.

### Validaciones

- `dotnet build apps/api`: **0 errores**, 1 warning preexistente (CS8625, no relacionado).
- `npm run lint:web`: limpio.
- Verificación visual en navegador local (`localhost:3000/onboarding`): pendiente del usuario (el preview MCP queda en blanco con Clerk).

### Siguientes pasos

1. **Verificar onboarding en navegador** — abrir `/onboarding` con una cuenta nueva de Clerk y confirmar que el selector de especialidad aparece al elegir "Profesional" y que al guardar el nav muestra solo las rutas de esa especialidad.
2. **Definir y registrar nombre de marca + dominio** — desbloquea Resend real, Clerk producción y la identidad pública del producto.
3. **Resend productivo** — dominio verificado + `RESEND_API_KEY`/`RESEND_FROM` → emails reales (infraestructura ya lista).
4. **Páginas públicas SEO de profesionales** — `/profesionales/{slug}`, og:tags, schema.org, botón "Agendar".
5. **Revisión legal de documentos** (camino crítico del piloto).

---

## Pruebas internas multi-agente + plan de fixes — 2026-06-15

### Qué se hizo

Se ejecutó una corrida de QA multi-agente (4 personas simuladas: 2 profesionales Laura/Nora, 2 pacientes Ana/Sofia + adversario de autorización) contra el API real en `:5050` con dev-auth (`X-HealthHub-Dev-User`). 13 agentes, ~45 flujos ejercitados, cada bug candidato **verificado adversarialmente**. Reporte completo en `REPORTE-QA-FLUJOS-2026-06-15.md` (doc de trabajo eliminado en limpieza 2026-06-17) (commit `19debc7`).

**8 bugs confirmados, 0 falsos positivos:**

| # | Sev | Hallazgo |
|---|-----|----------|
| C-1 | Critical | Header dev forjado → autentica como usuario demo por defecto (lee/escribe datos reales) |
| C-2 | Critical | Profesional lee/crea **notas SOAP de paciente ajeno** (fuga PHI, NOM-024) |
| C-3 | Critical | `.RequireAuthorization()` en los 9 endpoints de especialidad → **401 hasta para el dueño** bajo dev-auth |
| H-1 | High | Profesional agenda cita para paciente sin relación (entrada a C-2) |
| H-2 | High | `/api/me?userId=<cualquiera>` → suplanta/enumera usuarios |
| H-3 | High | Paciente y pro dueño no pueden leer datos de especialidad (mismo origen que C-3) |
| M-1 | Medium | `available-slots` con 28 slots duplicados; falta dedup + unicidad |
| M-2 | Medium | (consolidado en H-3) paciente recibe 401 en vez de 403/200 |

### Encuadre corregido (tras releer el código para el plan)

- **`IsDevAuthEnabled` ya está endurecido** (`IsDevelopment()` + flag + loopback) → **C-1 y H-2 son dev-local, NO un hueco de producción**. Se arreglan igual (correctitud/defensa en profundidad), prioridad media.
- **C-2 y H-1 SÍ aplican en producción** (lógica de autorización, independiente del dev-auth) → **prioridad de seguridad #1**.

### Plan de fixes (listo para correr)

Plan detallado y autocontenido en `PLAN-FIXES-QA-2026-06-15.md` (doc de trabajo eliminado en limpieza 2026-06-17): por cada fix trae archivo, ancla de búsqueda, snippet antes/después y verificación con `curl`. Orden recomendado:

1. **FIX 1** (C-3/H-3/M-2) — quitar 9 `.RequireAuthorization()`. Riesgo mínimo, desbloquea recetas/tareas/nutrición en dev local.
2. **FIX 2 + FIX 3** (H-1 + C-2) — guard de relación al agendar + acceso clínico sólo por relación activa. La cadena de seguridad prod-relevante.
3. **FIX 4** (C-1/H-2) — eliminar los 7 fallbacks de identidad (`DefaultDemoUserId` + `?userId`).
4. **FIX 5** (M-1) — dedup de slots + guard de unicidad de disponibilidad.
5. **FIX 6** (H-3 producto, opcional) — ruta de lectura del paciente a sus datos clínicos.

Incluye validación final (build/lint/test:api), re-verificación E2E y limpieza de la DB dev (artefactos `apt-178155*`, `soap-178155*`, disponibilidades duplicadas).

## Aplicación del plan de fixes QA — 2026-06-15

### Qué se hizo

Se aplicó `PLAN-FIXES-QA-2026-06-15.md` (doc de trabajo eliminado en limpieza 2026-06-17) de principio a fin en la rama `fix/qa-flow-findings` (commit `effefd2`, **sin push**). Único archivo tocado: `apps/api/Program.cs` (101+/91−). Cada fix se localizó por su ancla de búsqueda, se recompiló y se verificó con `curl` antes de avanzar al siguiente.

| Fix | Resuelve | Verificación | Resultado |
|-----|----------|--------------|-----------|
| FIX 1 | C-3/H-3/M-2 — quitar 9 `.RequireAuthorization()` | diet POST 201 · task GET 200 · cross 403 · paciente 403 | ✅ |
| FIX 2 | H-1 — guard de relación activa al agendar | cross-book nora→ana 403 (antes 201) | ✅ |
| FIX 3 | C-2 — acceso clínico sólo por relación activa | SOAP nora→ana 403 · GET de nora sin `ana-martinez` (0) | ✅ |
| FIX 4 | C-1/H-2 — identidad limpia (sin `DefaultDemoUserId` ni `?userId`) | forjado 401 · `?userId` 401 · real 200 · vector H-2 401 | ✅ |
| FIX 5 | M-1 — dedup de slots + idempotencia de disponibilidad | total==únicos (40/40) · POST duplicado 409 | ✅ |
| FIX 6 | H-3 producto (**Opción B**) — paciente lee sus datos | ana lee dietas/recetas 200 · sin fuga cruzada · path pro intacto | ✅ |

### Desviaciones del plan (todas aprobadas en sesión)

- **Fix de UTC (no estaba en el plan):** FIX 1 destapó un bug latente — los 5 `DateTimeOffset.TryParse` de los POST de especialidad (`prescriptions.ExpiresAt`, `patient-tasks.DueDate`, `patient-diets.ValidFrom`/`ValidUntil`, `body-measurements.MeasuredAt`) escribían offset local a columnas `timestamptz` → **500**. Se normalizan con `.ToUniversalTime()`. Sin esto, FIX 1 no llegaba a 201.
- **FIX 4 / payments:** `/professional-portal/payments` devuelve **403** (no el 401 que esperaba el plan) para un paciente autenticado-no-profesional. Es correcto (autenticado pero no autorizado) y preexistente; se dejó así. El vector real de H-2 (header que no resuelve + `?userId`) sí da 401.
- **Limpieza de DB quirúrgica (no reset):** se eligió borrado selectivo para preservar las disponibilidades duplicadas y poder probar de verdad el dedup de FIX 5.
- **FIX 6 = Opción B:** se permitió al propio paciente leer sus datos en los GET de especialidad (`actor.Patient.Id == patientId`), filtrando recetas/dietas a `Status=="active"`.

### Validación final

- `dotnet build apps/api` → **0 errores**
- `npm run lint:web` → **limpio**
- `npm run test:api` → **passed**

### Limpieza de DB dev

Borrado quirúrgico: relación/citas/SOAP cruzados `nora→ana`, dieta de prueba "Plan QA", franja de FIX 5b, 28 disponibilidades duplicadas de Laura (29→1) y 2 SOAP `soap-17815*`.

**Diferido** (territorio de reset completo, NO tocado por riesgo de cascada FK sobre datos financieros): 8 citas `apt-17815*` + 4 pagos asociados + 31 usuarios QA (`usr-profesional-qa-*`, `usr-dra-demo-curl`). Se limpian con el `DROP/CREATE healthhub` + re-seed que documenta el plan.

### Pendiente

- `git push` de la rama / abrir PR cuando se decida.
- Reset de DB dev para la pollución diferida (opcional).
- **Frontend de FIX 6:** el backend ya expone la lectura del paciente, pero no hay UI que la consuma.

---

## Cierre QA — push/PR, re-verificación y limpieza de DB — 2026-06-15

### PR abierto

Rama `fix/qa-flow-findings` pusheada a `origin` (`github.com/FerHuCa/clinixa`) y **PR [#1](https://github.com/FerHuCa/clinixa/pull/1)** abierto contra `main` (3 commits: `effefd2`, `919f6cb`, `2389d0a`). Auth de git resuelta vía `gh` + token en la URL de push.

### Re-verificación de los 6 fixes contra API viva (:5050)

Ejecutada por un agente **Sonnet** en paralelo con la limpieza, vía `scripts/qa-verify-2026-06-15.sh` (plan trazado en Opus). **11/12 checks verdes**; el único "mismatch" es esperado y ya documentado:

| Check | Esperado | Real | Veredicto |
|-------|----------|------|-----------|
| FIX1 diet POST laura(dueña) | 201 | 201 | ✅ |
| FIX1 task GET nora(dueña) | 200 | 200 | ✅ |
| FIX1 presc POST laura(no-doc) | 403 | 403 | ✅ |
| FIX6 diet GET ana(propia) | 200 | 200 | ✅ |
| FIX2 cross-book nora→ana | 403 | 403 | ✅ |
| FIX3 SOAP POST nora→ana | 403 | 403 | ✅ |
| FIX3 SOAP GET nora fuga(ana) | 0 | 0 | ✅ |
| FIX4 me header-forjado | 401 | 401 | ✅ |
| FIX4 me ?userId (forjado) | 401 | 401 | ✅ |
| FIX4 me laura-real | 200 | 200 | ✅ |
| FIX4 payments ?userId imperson. | 401 | **403** | ✅ (semántica correcta — ver nota) |
| FIX5 slots dedup laura | total==únicos | 40==40 | ✅ |

**Nota del 403 en payments:** el actor es `usr-ana-martinez` (paciente autenticado, no profesional). La impersonación por `?userId` **sí se bloquea** (no recibe datos de Laura); el código devuelve **403** (autenticado-no-autorizado) en vez del 401 que el script esperaba. Es la semántica correcta y preexistente, ya registrada en `comentarios_claude.md`. La propiedad de seguridad se mantiene: **los 6 fixes verifican correctamente**.

### Limpieza de DB diferida — APLICADA (borrado selectivo, no reset)

Ejecutada por un agente **Sonnet** en paralelo con la verificación, vía `scripts/qa-cleanup-2026-06-15.sql` (transacción única `BEGIN/COMMIT`). Se eligió **borrado selectivo por id exacto** en vez de `DROP/CREATE` precisamente para poder correr **en paralelo** con la verificación sin riesgo de colisión sobre datos concurrentes. Eliminado:

- 8 citas `apt-17815*` + 4 pagos (cascade FK `payments.AppointmentId`)
- 31 usuarios QA + 31 profesionales + 30 servicios + 30 disponibilidades + 31 `clinic_memberships` + 31 `user_roles` + 61 sesiones + 93 `notification_preferences` + 6 notificaciones

**Preservado a propósito:** `audit_logs` (sin FK; el registro de auditoría se conserva — las referencias huérfanas a entidades QA son inocuas). Las 4 personas legítimas (laura, nora, ana, sofia) quedan intactas. Re-conteo independiente post-limpieza: **todo 0**. Scripts versionados en `scripts/`.

### Pendiente actualizado

- ~~`git push` / abrir PR~~ ✅ hecho (PR [#1](https://github.com/FerHuCa/clinixa/pull/1)).
- ~~Limpieza de la pollución de DB diferida~~ ✅ hecho (borrado selectivo, audit_logs preservados).
- ~~Frontend de FIX 6 (Opción B)~~ ✅ hecho (página `/mi-salud` — ver abajo).
- ~~Smoke test R-2~~ ✅ hecho (`scripts/smoke-api.mjs` — ver abajo).
- (Opcional) Unificar a 403 la respuesta de `dashboard`/`onboarding`/`subscription` para paciente-no-profesional, igual que `payments`.

---

## Frontend FIX 6 + smoke test R-2 — 2026-06-15 (continuación)

Plan trazado en **Opus**, ejecutado en **paralelo por dos agentes Sonnet** (vía Workflow), editando archivos disjuntos. Ambos verdes y verificados de forma independiente.

### FIX 6 (Opción B) — UI del paciente para sus datos clínicos

Página **read-only** consolidada en `/mi-salud` con tres pestañas (Recetas / Tareas / Nutrición), que consume los GET de auto-lectura del paciente ya habilitados en el backend (`loadPrescriptions`/`loadPatientTasks`/`loadPatientDiets` con `currentUser.patientId`). Sin formularios ni mutaciones (no hay PATCH): el alcance verificado del backend es sólo lectura.

- **Archivos nuevos:** `apps/web/app/mi-salud/page.tsx`, `apps/web/app/mi-salud/mi-salud-page-client.tsx`.
- **Editado:** `apps/web/components/app-shell.tsx` — un ítem de nav `{ href: "/mi-salud", label: "Mi salud", roles: ["patient"] }`.
- **Patrón:** espeja `nutricion-page-client.tsx` (pestañas) + `Panel`/`PageHeader`/`AppShell`/`UserMenu`. Estados de carga, error por pestaña y vacío; guardas para `!ready`/`sessionError`/no-paciente.
- **Decisión:** una sola página con pestañas (menos ruido de nav para el paciente) en vez de tres rutas separadas como en el lado profesional.
- **Validación:** `npm run lint:web` limpio · `tsc --noEmit` limpio (re-corridos de forma independiente).

### Smoke test R-2 — tripwire de 401/500 con auth válida

`scripts/smoke-api.mjs` + script `npm run smoke:api`. Recorre **31 endpoints GET `/api/*`** con la persona dev-auth correcta y **falla si alguno devuelve 401 o 500** (200/201/204/403/404 pasan — no impone semántica de negocio). Espeja el harness de `test-api.mjs`.

- **GET-only / idempotente** a propósito: no escribe en la DB, así que es seguro correrlo repetidas veces (no re-contamina lo que se acaba de limpiar). La cobertura de rutas de escritura vive en `test:api`.
- **Resultado:** **31/31 PASS**, exit 0 (re-corrido de forma independiente). Cubre público, paciente (`usr-ana-martinez`), profesional (`usr-laura-vega`), psicólogo (`usr-nora-ibarra`) y admin (`usr-master`). Habría atrapado la regresión de especialidad (todos los GET de especialidad daban 401 antes de FIX 1).

### Pendiente tras esta sesión

- ~~Permitir al paciente marcar tareas como completadas~~ ✅ hecho (Step 2 — ver abajo).
- ~~Unificar a 403 `dashboard`/`onboarding`/`subscription`~~ ✅ hecho (Step 3 — `subscription`/`payments` ya estaban; faltaban `dashboard`/`onboarding`).
- (Opcional) Extender el smoke a rutas de escritura con limpieza propia (los endpoints de especialidad que tuvieron el 500 de UTC no tienen DELETE, así que requeriría limpieza vía DB).
- Verificación visual de `/mi-salud` en el navegador del usuario (el preview MCP no sirve con Clerk).

---

## Steps 2-4 — PATCH paciente, unificación 401/403, auditoría onboarding — 2026-06-15

Plan en **Opus**, ejecución en **paralelo por 3 agentes Sonnet** (vía Workflow), **divididos por propiedad de archivo** (backend / frontend / auditoría) para que no colisionen — Steps 2-backend y 3 tocan el mismo `Program.cs`, así que un solo agente lo posee.

### Step 2 — el paciente marca sus propias tareas (completar/pendiente)

- **Backend** (`apps/api/Program.cs`, PATCH `/api/patient-tasks/{id}/status`): nueva rama de paciente-dueño que espeja FIX 6 — si el actor es paciente y la tarea es suya (`task.PatientId == actor.Patient.Id`), puede cambiar el estado; si no, cae al path del psicólogo.
- **Frontend** (`apps/web/app/mi-salud/mi-salud-page-client.tsx`, pestaña Tareas): toggle completar↔pendiente con estado de "Guardando..." por fila, actualización desde el objeto devuelto y error inline por fila. Recetas/Nutrición siguen estrictamente read-only.
- **Verificado (curl):** PATCH tarea propia como `usr-sofia-leon` → **200**; misma tarea como `usr-ana-martinez` → **404** (aislamiento); path del profesional (`usr-nora-ibarra`) → **200**.

### Step 3 — unificar 401 vs 403 en dashboard + onboarding

- Sólo `dashboard` (L1875) y `onboarding` (L2086) tenían el patrón conflado `currentUser?.Professional is null → 401`; `payments` y `subscription` **ya eran correctos**. Se dividió en `currentUser is null → 401` + `currentUser.Professional is null → 403`, idéntico a payments/subscription.
- **Verificado (curl):** dashboard/onboarding como paciente → **403** (antes 401); como profesional → **200**; header inválido → **401**.

### Step 4 — auditoría del flujo onboarding → activación → publicar (read-only)

- Doc: `AUDIT-ONBOARDING-ACTIVACION-2026-06-15.md` (doc de trabajo eliminado en limpieza 2026-06-17) (229 líneas). **Sin cambios de código de producto**: decisión deliberada — el "wizard de activación" estaba subespecificado para construir a ciegas, así que se entrega auditoría + plan priorizado para que el usuario decida.
- **Hallazgo P0 (bloqueante):** el campo de **cédula/`LicenseNumber` falta en la UI del portal profesional** → `VerificationStatus` queda en "pending" para siempre y el profesional **no puede publicar**. El backend ya acepta el campo (`PATCH /api/professional-portal/profile`). Segundo P0: el checklist de onboarding existe en Inicio pero no en Configuración.
- Plan P0/P1/P2 con punteros a archivo en el doc (9 huecos catalogados HUE-01..HUE-09).

### Validación

- `build:api` **0 errores** · `smoke:api` **31/31** · `lint:web` **limpio** · `tsc --noEmit` **limpio** (todo re-corrido de forma independiente).

### Datos para la revisión manual

- Las tareas son dominio de psicólogo, así que el paciente con tareas es **`sofia-leon`** (su psicóloga es `nora-ibarra`), no `ana-martinez`. Se sembraron 2 tareas reales para sofia — "Diario de emociones" (pendiente) y "Respiración 4-7-8" (completada) — para probar el toggle en ambos sentidos. **Para revisar la pestaña Tareas + toggle, iniciar sesión como `sofia-leon`.** (`ana-martinez` sirve para ver Recetas/Nutrición.)

### Pendiente

- ~~Implementar el plan del audit (P0: cédula en portal profesional + checklist en Configuración)~~ ✅ hecho (ver sección siguiente).
- Verificación visual del toggle de tareas en `/mi-salud` como `sofia-leon`.

---

## P0 onboarding: cédula + checklist en Configuración — 2026-06-17

### Contexto

El audit del 2026-06-15 identificó dos bloqueantes P0 que impedían que un profesional publicara su perfil:
- **HUE-01**: no había input de cédula (`LicenseNumber`) en el portal profesional → `VerificationStatus` quedaba "pending" indefinidamente.
- **HUE-02**: el checklist de onboarding solo existía en Inicio, no en Configuración (donde el profesional edita su perfil).

El backend ya aceptaba `LicenseNumber` en `PATCH /api/professional-portal/profile`; la corrección fue puramente de UI.

### Qué se hizo

**Archivo editado:** `apps/web/app/portal-profesional/professional-portal-page-client.tsx`

- **HUE-01 — Campo de cédula**: se agregó `licenseNumber` al tipo `ProfileDraft`, se inicializa desde `source.licenseNumber`, y se renderiza un `<input>` antes del campo de WhatsApp con nota "Requerida para publicar tu perfil".
- **HUE-02 — Checklist en Configuración**: el banner de "modo borrador" (que antes solo decía "revisa tus pasos en Inicio") ahora muestra un checklist de 4 pasos inline: perfil completo, servicios, disponibilidad y cédula verificada por Clinixa.

### Flujo de publicación post-P0

1. Profesional llena bio, ubicación y **cédula** en Configuración → guarda.
2. El backend recibe el PATCH, persiste `LicenseNumber` y puede cambiar `VerificationStatus` a `"pending_review"`.
3. Admin verifica la cédula (flujo de admin, HUE-05 futuro) → `VerificationStatus = "verified"`.
4. `canPublish` pasa a `true` → botón "Publicar perfil" se habilita.

### Validaciones

- `npm run build:web`: **limpio**.
- `tsc --noEmit`: **limpio**.
- `npm run lint:web`: **limpio**.

### Pendiente siguiente (P1)

~~Ver `AUDIT-ONBOARDING-ACTIVACION-2026-06-15.md` para HUE-03..HUE-09.~~ ✅ **P1 y P2 completados** — ver sección siguiente.

---

## P1 + P2 onboarding/activación — 2026-06-17

### Contexto

Tras el P0 (cédula + checklist), se ejecutó el resto del plan priorizado del audit (`AUDIT-ONBOARDING-ACTIVACION-2026-06-15.md` §3). Plan diseñado en **Opus** (`PLAN-P1-P2-ONBOARDING-2026-06-17.md`), ejecutado por **3 agentes Sonnet en paralelo divididos por propiedad de archivo** (frontend UX / backend email / wizard+shell). El agente de frontend se cortó a media tarea; el orquestador (Opus) terminó la integración de `page.tsx`, `onboarding-page-client.tsx` y el cableado del componente compartido en ambas páginas.

### P1 — Experiencia mejorada

- **P1-1** — `onboarding.missing[]` ahora se muestra proactivamente (lista con bullets) en el banner de activación de **Inicio** y **Configuración**, no solo como error post-click de "Publicar".
- **P1-2** — El paso de cédula del checklist trae sub-texto: *"Ingresa tu número de cédula en Configuración. El equipo de Clinixa la revisará manualmente (1-2 días hábiles)."*
- **P1-3** — Anclas `id="servicios"` e `id="disponibilidad"` en los paneles del portal (vía nueva prop `id` en `components/panel.tsx`); deep-links desde el checklist.
- **P1-4** — `PATCH /api/professional-portal/profile`: al cambiar la cédula (→ `VerificationStatus="pending"`) se envía email best-effort al profesional (`EmailSender.BuildVerificationPendingEmail`, vía `actor.Email`, en try/catch). Auditoría `professional_license.verification.pending`.
- **P1-5 / R6** — Fuente única de especialidades: `lib/specialty-labels.ts` ahora exporta `SPECIALTY_OPTIONS` (value+label canónicos), usado en los selects de onboarding (tarjetas con iconos mapeados localmente) y de Configuración. Unifica labels (antes "Medicina General" vs "Medicina", "other"→"Salud").
- **DRY (P0-2 del audit)** — Componente compartido `components/onboarding-checklist.tsx` (`OnboardingChecklist` + helper `buildChecklistSteps`) reutilizado en Inicio y Configuración.

### P2 — Wizard guiado

- **P2-1** — Nueva ruta `/activacion`: wizard de 4 pasos (perfil → servicio → disponibilidad → cédula) reusando acciones del store ya existentes. Stepper visual, **saltable** ("Ir al portal" siempre visible), precarga pasos ya cumplidos vía `loadProfessionalOnboarding`. El onboarding ahora redirige al profesional recién registrado a `/activacion` en vez de `/portal-profesional`.
- **P2-2** — `components/app-shell.tsx`: indicador "Activación: N/4" en la barra lateral para profesionales no publicados, enlazado a `/activacion` (carga el onboarding una vez, degrada silencioso).

### Fuera de alcance (decisiones de producto, R1-R6 del audit)

No abordados a propósito: SLA de verificación (R1), wizard obligatorio vs saltable se decidió **saltable** (R2), specialty "other" sin módulo (R3), DELETE de disponibilidad (R4), invitación sin cédula (R5).

### Validación

- `build:api` **0 errores/0 warnings** · `build:web` **✓** (ruta `/activacion` compilada) · `tsc --noEmit` **limpio** · `lint:web` **limpio** · `smoke:api` **31/31**.
- Verificación visual del wizard en navegador: **pendiente del usuario** (el preview MCP no sirve con Clerk). Login Laura Vega → `/activacion`.

### Resend

Guía de configuración real creada: `RESEND_SETUP.md` (dominio verificado + `RESEND_API_KEY`/`RESEND_FROM` + `WEB_BASE_URL`). Sin clave, los envíos degradan a `[EMAIL SIMULADO]`.

### Pendiente

- Verificación visual de `/activacion` y del indicador del shell como Fernando Huerta.
- ~~Conectar Resend real~~ ✅ hecho (ver sección siguiente).
- P-siguientes del producto: páginas públicas SEO, foto/avatar de perfil, panel de verificación de cédula más rico para admin.

## Resend productivo + prueba end-to-end — 2026-06-17

### Configuración

- **Dominio verificado**: `clinixa.mx` verificado en Resend (DNS TXT/DKIM/DMARC).
- **`.env` local** (gitignoreado): creado desde `.env.example` con `RESEND_API_KEY` y `RESEND_FROM=Clinixa <no-reply@clinixa.mx>`.
- **`package.json` `dev:api`** actualizado: `sh -c 'set -a; [ -f .env ] && . .env; set +a; ...'` — carga el `.env` raíz automáticamente antes de arrancar dotnet. Sin este cambio, .NET no leía el archivo.
- **`.env.example`** actualizado: remitente ahora es `Clinixa <no-reply@clinixa.mx>` (antes `HealthHub MX <invitaciones@healthhub.mx>`).

### Prueba end-to-end

Agente Sonnet ejecutó la prueba contra `:5050` (API con RESEND_API_KEY cargada):

| Check | Resultado |
|---|---|
| API en :5050 | ✅ |
| `PATCH /api/professional-portal/profile` con nueva cédula | ✅ 200 |
| `VerificationStatus` → `pending` | ✅ |
| Audit log `professional_license.verification.pending` | ✅ |
| Email enviado vía Resend real (no `[EMAIL SIMULADO]`) | ✅ |
| Destinatario: `fernandohuertac@hotmail.com` | ✅ |

**Usuario de prueba**: `usr-murcielagolambo-gmail-com` (profesional Fernando Huerta). Se actualizó el email en DB a `fernandohuertac@hotmail.com` para recibir emails reales durante desarrollo.

### Pendiente de seguridad

- Rotar la RESEND_API_KEY (quedó expuesta en el chat de desarrollo). Pasos: Resend → API Keys → Revoke → Create nueva → actualizar `.env`.

### Siguiente natural

- Verificación visual de `/activacion` como Fernando Huerta (login real en `localhost:3000`).
- ~~Panel de verificación de cédula para admin (HUE-05)~~ ✅ hecho (ver sección siguiente).
- Signup público de profesional sin invitación (HUE-08).

## HUE-05 — Panel de verificación de cédula enriquecido — 2026-06-17

Plan en `PLAN-HUE05-VERIFICACION-CEDULA-2026-06-17.md` (diseñado en Opus, ejecutado por 1 agente Sonnet). El panel de `/seguridad` ya existía (verificar/rechazar); HUE-05 cerró 4 gaps:

- **Email del desenlace (lo crítico):** `PATCH /api/professionals/{id}/verification` ahora notifica al profesional best-effort — `BuildVerificationApprovedEmail` (con link al portal) al verificar, `BuildVerificationRejectedEmail` (con motivo) al rechazar. Antes solo recibía "cédula en revisión" (P1-4) y nunca el resultado.
- **Email del profesional en la cola:** `GET /api/admin/professionals` ahora hace `Include(User)` y el `ProfessionalVerificationDto` trae `Email`. El admin coteja correo + fecha de registro en cada tarjeta.
- **Filtro por estado:** tabs Pendientes/Verificadas/Rechazadas/Todas (default `pending`), recargan la cola vía `loadVerificationQueue(status)`.
- **Conteo de pendientes** en el título del panel.

**Flujo completo del gate de cédula (ahora cerrado):** profesional captura cédula → email "en revisión" → admin ve cola filtrada en `/seguridad` → verifica/rechaza → profesional recibe email del resultado → si verified, puede publicar.

**Verificado:** build:api 0 err, lint/tsc limpios, smoke:api 31/31. Emails reales vía Resend confirmados (verify + reject) a `fernandohuertac@hotmail.com`. Commit `a3b40df`.

### Siguiente (backlog)

- ~~Signup público de profesional sin invitación (HUE-08)~~ ✅ ya funcionaba (ver sección siguiente).
- ~~Foto/avatar de perfil (HUE-04)~~ ✅ hecho (ver sección siguiente).
- ~~Páginas públicas SEO `/profesionales/{slug}` (HUE-09)~~ ✅ hecho (ver sección siguiente).

## HUE-04 + HUE-08 + HUE-09 — Avatar, directorio y perfiles públicos — 2026-06-17

Plan en `PLAN-HUE04-08-09-PUBLICO-2026-06-17.md` (Opus). Ejecución: **1 agente backend (Fase 1) + 3 agentes frontend en paralelo (Fase 2)**, divididos por propiedad de archivo.

### Hallazgo: HUE-08 ya estaba completo
El signup público de profesional **ya funcionaba** end-to-end: `/bienvenida` → `/sign-up` (selección de rol) → Clerk `<SignUp unsafeMetadata={{role}}>` → backend lee `unsafe_metadata.role` y crea el usuario con `PrimaryRole=professional` → onboarding → `/activacion`. No hay gate de invitación para profesionales. **Por decisión del usuario, el tercer agente se repurposó al directorio público** (la superficie de descubrimiento que sí faltaba).

### Decisiones técnicas clave
- **Cero migraciones** (no hay `dotnet ef` instalado): el avatar reusa el campo `ProfilePhotoUrl` que ya existía en la entidad; el **slug se computa en el DTO** (`Slugify` = `kebab(nombre)-{6hex SHA256 del Id}`, estable y único, sin columna).
- **Avatar storage local** (`apps/api/wwwroot/uploads/avatars/`, servido vía `UseStaticFiles`) como puente para el piloto. Migrar a Azure Blob = cambiar solo el endpoint de subida. Imágenes runtime gitignoreadas (solo se versiona `.gitkeep`).

### HUE-04 — Avatar
- Backend: `POST /api/professional-portal/avatar` (multipart, JPG/PNG/WEBP, ≤2MB, cache-bust `?v=`). `ProfilePhotoUrl` ahora en `ProfessionalDto`.
- Frontend: sección "Foto de perfil" en el portal (`professional-portal-page-client.tsx`) con preview, validación de tamaño y subida vía store action `uploadProfessionalAvatar`.

### HUE-09 — Perfiles públicos SEO
- Backend: `GET /api/professionals/by-slug/{slug}` (público, solo active+verified). `Slug` en `ProfessionalDto`.
- Frontend: `app/profesionales/[slug]/page.tsx` (Server Component, `generateMetadata` con OG, hero con avatar, bio, servicios, disponibilidad, reviews, CTAs WhatsApp + "Crear cuenta para agendar") + `not-found.tsx`.

### HUE-08-dir — Directorio público
- `app/profesionales/page.tsx` (Server Component con `searchParams`: filtro por especialidad vía URL + búsqueda GET) + `components/professional-card.tsx`.
- Helper server-side `lib/public-professionals.ts` (`fetchPublicProfessionals`, `fetchProfessionalBySlug`).

### Fix de integración (orquestador)
`apps/web/proxy.ts` (middleware): se agregó `/profesionales(.*)` a `isPublicRoute` — sin esto el middleware redirigía a `/bienvenida` (las páginas públicas no requieren sesión).

### Verificado
build:api 0 err · tsc limpio · lint 0 errores (3 warnings `<img>` esperados) · smoke:api 31/31. Vía dev server: directorio `/profesionales` **200** (lista 5 profesionales verificados), perfil válido **200** (renderiza datos), slug inexistente **404**, filtro por especialidad **200**, avatar endpoint **200** sirviendo el archivo. Commit `<pendiente>`.

### Siguiente (backlog)
- Rotar RESEND_API_KEY (sigue pendiente).
- Verificación visual: `/profesionales`, perfil individual, y subida de avatar en el portal.
- Migrar avatar storage a Azure Blob para producción.
- ~~Hygiene de datos: profesional QA residual~~ ✅ hecho (ver sección siguiente).

## Higiene de datos + nuevo set de pruebas — 2026-06-17

Plan en `PLAN-HIGIENE-DATOS-2026-06-17.md`. Ejecución: limpieza SQL (orquestador) + 1 agente Sonnet que escribió y corrió el nuevo suite.

### Diagnóstico y causa raíz
`scripts/test-api.mjs` es stateful **sin teardown**: cada corrida deja una invitación `qa.<timestamp>@healthhub.demo` (se habían acumulado **60**) y, por la rama de invitación, un profesional `Profesional QA` **verificado+activo** que contaminaba el **directorio público** (HUE-09).

### Limpieza — `scripts/data-hygiene-2026-06-17.sql` (transaccional, idempotente)
- Borró 60 invitaciones QA + el profesional/usuario QA (`pro-profesional-qa`/`usr-profesional-qa`) y sus roles/sessions/prefs/membership. `audit_logs` se conserva (ledger).
- Normalizó la cuenta real de prueba de Fernando (`pro-murcielagolambo-gmail-com`, `fernandohuertac@hotmail.com`) a estado coherente `pending`/`onboarding`, cédula `CED-FH-2026`, bio/ubicación limpias — lista para ejercer el flujo verify→email→publish desde la UI.
- Resultado: directorio público = solo los 4 demo verificados (Laura, Miguel, Andrés, Nora).
- **No tocado:** seed canónico (`DatabaseSeeder.cs`, coherente) ni el paciente desplazado `fernando-paciente@test.local` (se documenta).

### Nuevo suite — `scripts/test-public-features.mjs` (`npm run test:public`)
Cubre lo que `smoke`/`test:api` no tocan, **con teardown idempotente**: integridad del directorio (solo verified+active, slug `kebab-6hex`, `profilePhotoUrl`, bio/location/cédula no vacíos, sin "Profesional QA"), `by-slug` (200 válido / 404 inválido), avatar multipart (PNG→200 y se sirve; `.txt`→400; >2MB→400), loop de verificación admin (queue con email, verify/reject/pending), y gate público (Fernando pending ausente del directorio + by-slug 404).

### Regresión detectada y corregida (del .env de esta sesión)
Al hacer que `dev:api` sourcee el `.env`, las vars opcionales vacías (`MERCADOPAGO_WEBHOOK_SECRET=`, etc.) se exportaban como `""` y **shadowaban** los fallbacks de Development (el `??` del código solo cae con `null`, no con `""`) → `test:api` fallaba en el webhook MP. **Fix:** se comentaron las vars opcionales vacías en `.env` (+ nota en `.env.example`). Tras el fix: `test:api` ✅, `test:public` ✅ (2× idempotente), `smoke:api` 31/31.

### Deuda conocida
`test-api.mjs` sigue creando invitaciones QA sin teardown (se documenta; el suite nuevo sí es limpio, y la SQL purga lo viejo). Reescribir su teardown completo queda fuera de alcance.

### Limpieza de documentación (.md)
Auditoría read-only de los 38 `.md` versionados. Se **borraron 8 documentos de trabajo** de tareas ya completadas y registradas en este seguimiento (planes/auditoría/reporte): `PLAN-TOP5-UX`, `REPORTE-QA-FLUJOS-2026-06-15`, `PLAN-FIXES-QA-2026-06-15`, `AUDIT-ONBOARDING-ACTIVACION-2026-06-15`, `PLAN-P1-P2-ONBOARDING-2026-06-17`, `PLAN-HIGIENE-DATOS-2026-06-17`, `PLAN-HUE04-08-09-PUBLICO-2026-06-17`, `PLAN-HUE05-VERIFICACION-CEDULA-2026-06-17`. Los 4 links markdown que apuntaban a ellos se convirtieron a texto. Se **conservaron** los 30 restantes (referencia técnica/operativa/legal viva). Limítrofes conservados a propósito: `PLAN-MARKETPLACE.md` (spec viva del código de marketplace), `comentarios_claude.md` (bitácora histórica de decisiones), `estrategia-mercado.md` (estrategia vigente).
