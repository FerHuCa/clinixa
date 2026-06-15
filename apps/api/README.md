# HealthHub API

API ASP.NET Core para el MVP de Clinixa.

## Estado

El SDK de .NET 8 se instalo localmente en `~/.dotnet` para poder compilar y ejecutar la API sin instalacion global.

La API usa Entity Framework Core con PostgreSQL mediante `Npgsql.EntityFrameworkCore.PostgreSQL`.

La API no guarda cadenas de conexion ni secretos en `appsettings*.json`. Define la cadena local con variable de entorno:

```bash
export ConnectionStrings__HealthHubDb="Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev"
```

Tambien se acepta `HEALTHHUB_DB_CONNECTION`. Las llaves de Clerk deben venir de `Clerk__Issuer`, `Clerk__SecretKey` y `Clerk__AuthorizedParties`.

> **Importante (2026-06-10):** sin `Clerk__SecretKey`, el provisioning de cuentas nuevas de Clerk falla en silencio (la API no puede leer el perfil del usuario y no crea el registro local; la UI cae a datos demo). Para probar registro/login real exporta las tres variables:

```bash
export Clerk__Issuer="https://<tu-instancia>.clerk.accounts.dev"
export Clerk__SecretKey="sk_test_..."
export Clerk__AuthorizedParties="http://localhost:3000"
```

### Variables de entorno opcionales

El envio de correo y la URL base del frontend tampoco se versionan; se leen de variables de entorno con degradacion elegante (si faltan, el correo se simula en el log y la URL base usa `http://localhost:3000`):

```bash
export RESEND_API_KEY="re_xxx"                       # opcional: si falta, los correos se simulan
export RESEND_FROM="Clinixa <invitaciones@healthhub.mx>"  # opcional: remitente
export WEB_BASE_URL="http://localhost:3000"          # base para enlaces de invitacion
```

Mercado Pago (pagos de citas) tambien degrada con elegancia: sin `MERCADOPAGO_ACCESS_TOKEN`, `POST /api/appointments/{id}/checkout` devuelve una preferencia simulada que apunta a la pagina de retorno local en lugar de un checkout real.

```bash
export MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."   # opcional: si falta, el checkout se simula
export MERCADOPAGO_PUBLIC_KEY="APP_USR-..."     # opcional: para el frontend cuando se use el SDK JS
export MERCADOPAGO_WEBHOOK_SECRET="..."         # firma de webhooks; en Development sin valor usa "dev-webhook-secret"
```

> El webhook `POST /api/webhooks/mercadopago` es publico pero valida la firma `x-signature`. En produccion sin `MERCADOPAGO_WEBHOOK_SECRET` rechaza todas las notificaciones (fail closed).

`npm run dev:api` no inyecta secretos automaticamente: exporta estas variables (al menos `ConnectionStrings__HealthHubDb`) en tu shell antes de levantar la API.

## Base de datos local

Con Docker:

```bash
docker compose up -d postgres
```

Con Homebrew en macOS:

```bash
brew install postgresql@16
brew services start postgresql@16
/opt/homebrew/opt/postgresql@16/bin/psql -d postgres -c "CREATE ROLE healthhub LOGIN PASSWORD 'healthhub_dev';"
/opt/homebrew/opt/postgresql@16/bin/createdb -O healthhub healthhub
```

La API aplica migraciones EF Core con `Database.MigrateAsync()` al iniciar.

## Endpoints iniciales

- `GET /health`.
- JWT de Clerk para autenticacion de produccion.
- `POST /api/auth/login`, `/refresh` y `/logout` disponibles solo en Development como compatibilidad temporal.
- `GET /api/me`.
- `GET /api/demo-sessions`.
- `GET /api/patients`.
- `GET /api/patients/{id}`.
- `POST /api/patients`.
- `GET /api/patients/{id}/appointments`.
- `GET /api/patients/{id}/soap-notes`.
- `GET /api/appointments`.
- `POST /api/appointments`.
- `PATCH /api/appointments/{id}/cancel`.
- `PATCH /api/appointments/{id}/reschedule`.
- `PATCH /api/appointments/{id}/status`.
- `POST /api/appointments/{id}/checkout` (crea preferencia de Mercado Pago y pago `pending`).
- `POST /api/webhooks/mercadopago` (publico con firma; aprueba pago y confirma la cita).
- `GET /api/audit-logs`.
- `GET /api/clinics`.
- `GET /api/clinics/{clinicId}/invitations`.
- `POST /api/clinics/{clinicId}/invitations`.
- `GET /api/notifications`.
- `PATCH /api/notifications/{id}/read`.
- `GET /api/notification-preferences`.
- `PATCH /api/notification-preferences/{channel}`.
- `GET /api/me/consent`.
- `POST /api/me/consent`.
- `GET /api/soap-notes`.
- `POST /api/soap-notes`.

## Endpoints portal paciente

- `GET /api/professionals`.
- `GET /api/professionals/{id}`.
- `GET /api/professionals/{id}/available-slots?serviceId=...`.
- `GET /api/professionals/{id}/reviews`.
- `GET /api/patient-portal/appointments`.
- `GET /api/patient-portal/records`.

Los endpoints de portal leen `Authorization: Bearer <token>` cuando hay sesion autenticada. El parametro `userId` sigue disponible como respaldo demo para pruebas locales.

## Endpoints portal profesional

- `GET /api/professional-portal/dashboard`.
- `POST /api/professional-portal/services`.
- `PATCH /api/professional-portal/services/{id}`.
- `POST /api/professional-portal/availability`.
- `PATCH /api/professional-portal/availability/{id}`.

Devuelve el perfil profesional autenticado, sus citas, conteo de programadas/completadas y pacientes activos. Los endpoints de servicios y disponibilidad permiten al profesional autenticado administrar su configuracion publicada.

## Ejecutar localmente

Compilar:

```bash
$HOME/.dotnet/dotnet build apps/api/HealthHub.Api.csproj
```

Ejecutar:

```bash
export ConnectionStrings__HealthHubDb="Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev"
$HOME/.dotnet/dotnet run --project apps/api/HealthHub.Api.csproj --urls http://127.0.0.1:5050
```

Health check:

```bash
curl http://127.0.0.1:5050/health
```

## Ejemplos

Crear paciente:

```bash
curl -X POST http://127.0.0.1:5050/api/patients \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Paciente API","age":32,"email":"api@example.com","phone":"+52 55 1111 2222","focus":"Validacion API","mainReason":"Prueba de endpoint"}'
```

Login MVP:

```bash
curl -X POST http://127.0.0.1:5050/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana.martinez@example.com","password":"healthhub123"}'
```

Refresh de sesion:

```bash
curl -X POST http://127.0.0.1:5050/api/auth/refresh \
  -H 'Authorization: Bearer TOKEN'
```

Consultar usuario autenticado:

```bash
curl http://127.0.0.1:5050/api/me \
  -H 'Authorization: Bearer TOKEN'
```

Dashboard profesional:

```bash
curl http://127.0.0.1:5050/api/professional-portal/dashboard \
  -H 'Authorization: Bearer TOKEN_PROFESIONAL'
```

Consultar slots disponibles:

```bash
curl "http://127.0.0.1:5050/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-seguimiento"
```

Crear cita:

```bash
curl -X POST http://127.0.0.1:5050/api/appointments \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","date":"2026-06-20","time":"13:45","duration":"50 min","type":"Seguimiento","reason":"Validacion POST de cita"}'
```

Crear cita desde portal paciente con profesional y servicio:

```bash
curl -X POST http://127.0.0.1:5050/api/appointments \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","professionalId":"pro-laura-vega","professionalServiceId":"svc-laura-seguimiento","date":"2026-06-15","time":"09:00","mode":"online","reason":"Consulta desde portal paciente","createdByUserId":"usr-ana-martinez"}'
```

Si el paciente o profesional ya tiene una cita `scheduled` que se traslapa por rango de tiempo, `POST /api/appointments` responde `409 Conflict`. Si el profesional no tiene disponibilidad publicada para ese horario, responde `400 Bad Request`.

Cancelar cita:

```bash
curl -X PATCH http://127.0.0.1:5050/api/appointments/APPOINTMENT_ID/cancel \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"El paciente necesita reagendar."}'
```

Reprogramar cita:

```bash
curl -X PATCH http://127.0.0.1:5050/api/appointments/APPOINTMENT_ID/reschedule \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-06-22","time":"10:00","reason":"Cambio solicitado por paciente."}'
```

Actualizar estado operativo de cita:

```bash
curl -X PATCH http://127.0.0.1:5050/api/appointments/APPOINTMENT_ID/status \
  -H 'Authorization: Bearer TOKEN_PROFESIONAL' \
  -H 'Content-Type: application/json' \
  -d '{"status":"confirmed","reason":"Confirmada por el profesional."}'
```

Estados soportados: `confirmed`, `completed`, `no_show`.

Consultar auditoria:

```bash
curl "http://127.0.0.1:5050/api/audit-logs?patientId=ana-martinez" \
  -H 'Authorization: Bearer TOKEN'
```

Consultar clinicas/equipo:

```bash
curl http://127.0.0.1:5050/api/clinics \
  -H 'Authorization: Bearer TOKEN_ADMIN_CLINICA'
```

Consultar invitaciones de una clinica:

```bash
curl http://127.0.0.1:5050/api/clinics/clinic-bienestar-integral/invitations \
  -H 'Authorization: Bearer TOKEN_ADMIN_CLINICA'
```

Crear invitacion de profesional:

```bash
curl -X POST http://127.0.0.1:5050/api/clinics/clinic-bienestar-integral/invitations \
  -H 'Authorization: Bearer TOKEN_ADMIN_CLINICA' \
  -H 'Content-Type: application/json' \
  -d '{"email":"nuevo.profesional@healthhub.demo","fullName":"Nuevo Profesional","role":"professional","specialty":"nutritionist","licenseNumber":"CED-12345"}'
```

Consultar notificaciones:

```bash
curl http://127.0.0.1:5050/api/notifications \
  -H 'Authorization: Bearer TOKEN'
```

Consultar preferencias de notificacion:

```bash
curl http://127.0.0.1:5050/api/notification-preferences \
  -H 'Authorization: Bearer TOKEN'
```

Actualizar canal de notificacion:

```bash
curl -X PATCH http://127.0.0.1:5050/api/notification-preferences/email \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true,"appointmentUpdates":true,"clinicUpdates":true,"reminderUpdates":false}'
```

Crear servicio profesional:

```bash
curl -X POST http://127.0.0.1:5050/api/professional-portal/services \
  -H 'Authorization: Bearer TOKEN_PROFESIONAL' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Consulta de seguimiento","description":"Ajuste de plan y revision de adherencia.","durationMinutes":50,"price":950,"mode":"online"}'
```

Crear bloque de disponibilidad:

```bash
curl -X POST http://127.0.0.1:5050/api/professional-portal/availability \
  -H 'Authorization: Bearer TOKEN_PROFESIONAL' \
  -H 'Content-Type: application/json' \
  -d '{"weekday":1,"startsAt":"09:00","endsAt":"13:00"}'
```

Permisos actuales:

- Paciente: solo puede gestionar citas y auditoria de su propio perfil.
- Profesional: solo puede gestionar citas y auditoria vinculadas a su perfil profesional.
- `clinic_admin`: puede revisar clinicas/equipo y auditoria acotada a profesionales/pacientes de su clinica.
- `internal_admin`: queda preparado para acceso administrativo global.

Credenciales demo adicionales:

```text
Admin clinica: admin.clinica@healthhub.demo / healthhub123
```

Crear nota SOAP:

```bash
curl -X POST http://127.0.0.1:5050/api/soap-notes \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","appointmentId":null,"date":"2026-06-20","title":"Nota API","status":"draft","subjective":"Paciente refiere avance estable.","objective":"Datos revisados en sesion.","assessment":"Evolucion favorable.","plan":"Continuar seguimiento semanal.","aiGenerated":false}'
```

## Siguiente trabajo tecnico

- Agregar SignalR para chat.
- Implementar aceptacion de invitaciones y alta de usuario/profesional desde invitacion.
- Conectar notificaciones reales a email/WhatsApp/app y recordatorios programados.
- Agregar pruebas E2E de UI para configuracion profesional y admin de clinica.
- Evaluar proveedor externo de auth o cookies seguras para etapa productiva.
