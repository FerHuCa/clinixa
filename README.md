# Clinixa

Plataforma SaaS para continuidad de atencion entre profesionales independientes de la salud y pacientes.

## Estructura

- `apps/web`: frontend web con Next.js, React, TypeScript y TailwindCSS.
- `apps/api`: API ASP.NET Core.
- `docker-compose.yml`: PostgreSQL con pgvector y Redis para desarrollo local.
- `alcance-mvp.md`: alcance cerrado del MVP.
- `modelo-datos.md`: modelo de datos inicial.
- `modelo-usuarios-roles.md`: modelo de usuarios, roles, portal paciente y profesionales.
- `CLERK_AUTH.md`: configuracion de Clerk y acceso local de desarrollo.
- `seguimiento-proyecto.md`: plan de seguimiento del proyecto.

## Comandos previstos

Instalar dependencias:

```bash
npm install
```

Ejecutar web:

```bash
npm run dev:web
```

Ejecutar API:

```bash
npm run dev:api
```

Levantar servicios locales:

```bash
docker compose up -d
```

Alternativa local sin Docker en macOS:

```bash
brew install postgresql@16
brew services start postgresql@16
/opt/homebrew/opt/postgresql@16/bin/psql -d postgres -c "CREATE ROLE healthhub LOGIN PASSWORD 'healthhub_dev';"
/opt/homebrew/opt/postgresql@16/bin/createdb -O healthhub healthhub
```

Ejecutar API cuando `dotnet` este instalado:

```bash
$HOME/.dotnet/dotnet run --project apps/api/HealthHub.Api.csproj --urls http://127.0.0.1:5050
```

## Estado actual

El frontend ya tiene una base navegable del MVP con flujo completo de autenticación y onboarding. El backend usa ASP.NET Core, Entity Framework Core y PostgreSQL local.

Los formularios de paciente, cita y nota SOAP ya son funcionales y persisten en PostgreSQL cuando la API está activa. El MVP también incluye:
- **Clerk como proveedor de identidad** con signup/signin dedicados.
- **Flujo de onboarding post-signup** en `/onboarding` para confirmar rol y datos.
- **Cada cuenta Clerk crea su propio usuario** (no vinculación por email existente).
- **Menú de usuario** con logout en la esquina superior derecha.
- **Acceso local de desarrollo** por rol desde `/sesion`.
- **Portal paciente**, portal profesional, disponibilidad real.
- **Cancelación/reprogramación de citas**, auditoría básica, permisos por rol.
- **Equipo de clínica**, invitaciones de profesionales, configuración editable de servicios/disponibilidad.
- **Preferencias de notificaciones** por canal (app/email/WhatsApp).

Si la API no está disponible, el frontend usa `localStorage` como fallback.

## Rutas web disponibles

**Públicas (sin autenticación requerida):**
- `/bienvenida`: landing page de inicio con CTAs "Crear cuenta" e "Iniciar sesión".
- `/sign-in`: acceso Clerk (flujo de login).
- `/sign-up`: creación de cuenta con Clerk (flujo de registro con paso previo de selección de rol: Paciente/Profesional).
- `/onboarding`: confirmación post-signup para completar nombre y rol; redirige al portal correspondiente.
- `/sesion`: acceso Clerk + selector local de usuarios demo en desarrollo.
- `/aceptar-invitacion`: aceptar invitación de clínica por token único.

**Protegidas por rol:**
- `/`: dashboard del profesional.
- `/pacientes`: lista de pacientes (profesional).
- `/pacientes/ana-martinez`: perfil de paciente demo (profesional).
- `/portal-paciente`: búsqueda de profesionales, citas y expedientes visibles para paciente.
- `/portal-profesional`: agenda propia, solicitudes entrantes, servicios y disponibilidad del profesional.
- `/seguridad`: auditoría, permisos por clínica y notificaciones (admin de clínica).
- `/agenda`: agenda de citas (profesional).
- `/expediente`: notas SOAP y prototipo visual de borrador (profesional).
- `/chat`: maqueta de mensajería (OBSOLETA — el chat fue eliminado del alcance el 2026-06-09; pendiente retirar la ruta del código).

## Flujos funcionales actuales

**Autenticación y onboarding:**
- Acceder a `/bienvenida` → "Crear cuenta" → `/sign-up`.
- Seleccionar rol (Paciente/Profesional) en `/sign-up`.
- Llenar formulario Clerk → crear cuenta → redirige a `/onboarding`.
- Completar nombre y confirmar rol en `/onboarding` → redirige al portal correspondiente.
- Dropdown de usuario (esquina superior derecha) con opciones "Página de sesión" y "Logout".
- Iniciar sesión con Clerk desde `/sign-in`.
- Entrar como paciente, profesional o administrador sin cuenta cuando se ejecuta en modo Development (desde `/sesion`).
- Aceptar invitación de clínica desde `/aceptar-invitacion?token=...` (crea usuario nuevo si no existe).

**Operaciones del paciente:**
- Buscar profesionales desde `/portal-paciente`.
- Ver opiniones y citas del paciente demo desde `/portal-paciente`.
- Agendar cita real desde `/portal-paciente` seleccionando profesional, servicio, horario disponible y modalidad.
- Reprogramar y cancelar citas desde `/portal-paciente`.

**Operaciones del profesional:**
- Crear paciente desde `/pacientes`.
- Crear cita desde `/agenda`.
- Crear y guardar notas SOAP desde `/expediente`.
- Consultar el perfil de pacientes creados en `/pacientes/[id]`.
- Consultar agenda y solicitudes desde `/portal-profesional`.
- Confirmar, completar o marcar no-show desde `/portal-profesional`.
- Editar servicios, precios, modalidad y disponibilidad desde `/portal-profesional`.

**Operaciones administrativas:**
- Evitar doble reserva por traslape de horario y validar disponibilidad publicada del profesional.
- Registrar auditoría de accesos a expediente, dashboard profesional y acciones sensibles de citas.
- Revisar permisos por clínica, notificaciones y bitácora desde `/seguridad`.
- Crear invitaciones de profesionales desde `/seguridad`.
- Configurar preferencias de notificaciones app/email/WhatsApp desde `/seguridad`.

Los usuarios demo se seleccionan desde `/sesion` y no requieren contraseña en modo Development.

## Validacion

Comandos ejecutados correctamente:

```bash
npm run build:web
npm run lint:web
npm run build:api
npm run test:api
```

Servidor local:

```bash
npm run dev:web
```

URL:

```text
http://localhost:3000
```

## Pendientes de entorno

- Actualizar Node.js a `20.19.0` o superior para evitar advertencias de engine en dependencias modernas.
- Monitorear la alerta moderada de `npm audit` relacionada con PostCSS interno de Next.js.

## Fases del producto

Numeración vigente (definida en `modelo_de_negocio.md` v2.0, 2026-06-09):

- Fase 1: MVP operativo sin IA, centrado en pacientes, agenda, expediente, notas SOAP manuales, conexión WhatsApp (wa.me), seguridad y notificaciones. El chat propio fue eliminado del alcance (2026-06-09).
- Fase 2: monetización y piloto (Mercado Pago, suscripciones con trial de 14 días, perfiles públicos SEO; piloto con psicólogos, nutriólogos y fisioterapeutas).
- Fase 3: retención y expansión de ingresos (WhatsApp Business API por profesional, paquetes, reportes, apertura a médicos tras revisión NOM-004).
- Fase 4: IA aplicada al flujo clínico (OpenAI, transcripción, resúmenes y borradores SOAP asistidos; condicionada a evidencia del piloto). El prototipo visual actual no representa una integración real de IA.
- Fase 5: marketplace (buscador público, perfiles destacados, videollamadas).

## API local

La API ASP.NET Core compila con .NET SDK `8.0.421` instalado en `~/.dotnet` y usa Entity Framework Core + PostgreSQL.

Validar API:

```bash
npm run build:api
npm run test:api
curl http://127.0.0.1:5050/health
```

El frontend usa `NEXT_PUBLIC_API_BASE_URL` y por defecto apunta a:

```text
http://127.0.0.1:5050
```

Si la API no esta activa, el frontend usa datos locales y `localStorage` como fallback de prototipo.

La cadena de conexion por defecto es:

```text
Host=localhost;Port=5432;Database=healthhub;Username=healthhub;Password=healthhub_dev
```

Se puede sobrescribir con:

```bash
ConnectionStrings__HealthHubDb="Host=...;Port=...;Database=...;Username=...;Password=..."
```

La API aplica migraciones EF Core al iniciar mediante `Database.MigrateAsync()`.

Endpoints sensibles actuales:

- `PATCH /api/appointments/{id}/cancel`.
- `PATCH /api/appointments/{id}/reschedule`.
- `PATCH /api/appointments/{id}/status`.
- `GET /api/audit-logs`.
- `GET /api/clinics`.
- `GET /api/clinics/{clinicId}/invitations`.
- `POST /api/clinics/{clinicId}/invitations`.
- `GET /api/notifications`.
- `GET /api/notification-preferences`.
- `PATCH /api/notification-preferences/{channel}`.
- `POST /api/professional-portal/services`.
- `PATCH /api/professional-portal/services/{id}`.
- `POST /api/professional-portal/availability`.
- `PATCH /api/professional-portal/availability/{id}`.
