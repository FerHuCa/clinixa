# Modelo de usuarios y roles - Clinixa

Fecha: 2026-06-07

## Objetivo

Definir el modelo de identidad, roles y permisos para que HealthHub soporte dos experiencias principales:

- Portal del paciente.
- Portal del profesional de salud.

El modelo debe permitir que un paciente tenga su propio usuario, busque profesionales, agende citas, vea sus expedientes y consulte opiniones. Tambien debe permitir que profesionales como doctores, psicologos, fisioterapeutas y nutriologos administren su agenda, pacientes y notas clinicas.

## Principio base

La cuenta de acceso no debe ser lo mismo que el expediente clinico.

Separacion propuesta:

- `users`: cuenta autenticada para iniciar sesion.
- `patients`: perfil clinico/persona paciente.
- `professionals`: perfil publico y operativo del profesional.
- `roles`: tipo de acceso global.
- `permissions`: acciones permitidas dentro del sistema.

Esto permite escenarios importantes:

- Un paciente puede existir primero como registro clinico sin haber creado usuario.
- Un paciente puede crear usuario despues y vincularse a su expediente.
- Un profesional tambien puede ser paciente en algun momento.
- Una clinica puede tener administradores que no son profesionales clinicos.

## Roles iniciales

### patient

Usuario final que recibe atencion.

Puede:

- Ver y editar datos basicos de su perfil.
- Buscar profesionales por especialidad, ubicacion, modalidad, precio, disponibilidad y calificacion.
- Ver perfiles publicos de profesionales.
- Agendar, cancelar o reagendar citas segun reglas.
- Ver sus citas proximas y pasadas.
- Ver expedientes o resumenes clinicos autorizados.
- Dejar opiniones solo sobre citas completadas.

No puede:

- Editar notas clinicas creadas por profesionales.
- Ver expedientes de otros pacientes.
- Ver datos privados internos de profesionales.

### professional

Usuario que ofrece servicios de salud.

Puede:

- Administrar su perfil profesional.
- Definir especialidad, servicios, precios, modalidad y disponibilidad.
- Ver agenda propia.
- Ver pacientes vinculados a su atencion.
- Crear y editar notas clinicas propias.
- Crear borradores SOAP y finalizarlos.
- Ver reseñas recibidas.

No puede:

- Ver pacientes no vinculados a su atencion.
- Modificar notas finalizadas de otros profesionales.
- Acceder a configuraciones administrativas globales.

### clinic_admin

Usuario administrativo de una clinica o grupo.

Puede:

- Invitar profesionales.
- Administrar horarios, ubicaciones y servicios del grupo.
- Ver agenda operativa de la clinica.
- Gestionar pacientes de la clinica segun permisos.
- Revisar reportes administrativos.

No puede:

- Editar contenido clinico sin permiso profesional explicito.
- Firmar notas clinicas si no tiene perfil profesional habilitado.

### internal_admin

Usuario interno de HealthHub para soporte y operacion.

Puede:

- Gestionar configuracion global.
- Revisar auditoria y estado operativo.
- Atender soporte tecnico con permisos restringidos.

No debe:

- Acceder a informacion clinica sensible salvo flujo de soporte autorizado y auditado.

## Entidades propuestas

### users

Cuenta autenticada.

Campos:

- `id`.
- `email`.
- `phone`.
- `full_name`.
- `password_hash` o `auth_provider_id`.
- `primary_role`: `patient`, `professional`, `clinic_admin`, `internal_admin`.
- `status`: `active`, `invited`, `disabled`.
- `email_verified_at`.
- `last_login_at`.
- `created_at`.
- `updated_at`.

Notas:

- Si usamos proveedor externo como Clerk/Auth0, `password_hash` no se guarda localmente y se usa `auth_provider_id`.
- Para MVP local podemos simular sesion, pero el modelo debe quedar listo para autenticacion real.

### user_roles

Permite multiples roles por usuario.

Campos:

- `id`.
- `user_id`.
- `role`.
- `scope_type`: `global`, `clinic`, `professional_profile`.
- `scope_id`, opcional.
- `created_at`.
- `updated_at`.

Ejemplo:

- Un usuario puede ser `professional` en su perfil propio.
- Ese mismo usuario puede ser `clinic_admin` dentro de una clinica.

### clinics

Organizacion o grupo operativo.

Campos:

- `id`.
- `name`.
- `legal_name`.
- `tax_id`.
- `location`.
- `status`: `active`, `disabled`.
- `created_at`.
- `updated_at`.

### clinic_memberships

Relaciona usuarios/profesionales con una clinica.

Campos:

- `id`.
- `clinic_id`.
- `user_id`.
- `professional_id`, opcional.
- `role`: `clinic_admin`, `professional`, `assistant`.
- `status`: `active`, `invited`, `disabled`.
- `joined_at`.
- `created_at`.
- `updated_at`.

Regla:

- El alcance administrativo de `clinic_admin` debe resolverse por membresia activa, no solo por rol global.

### clinic_invitations

Invitaciones emitidas por una clinica para sumar profesionales o asistentes.

Campos:

- `id`.
- `clinic_id`.
- `email`.
- `full_name`.
- `role`: `clinic_admin`, `professional`, `assistant`.
- `specialty`.
- `license_number`.
- `status`: `pending`, `accepted`, `expired`, `cancelled`.
- `invited_by_user_id`.
- `accepted_user_id`, opcional.
- `expires_at`.
- `accepted_at`.
- `created_at`.
- `updated_at`.

Regla:

- Solo un `clinic_admin` con membresia activa en la clinica, o `internal_admin`, puede crear invitaciones.
- Aceptar una invitacion debe crear o vincular un `user`, crear o vincular un `professional` cuando aplique y activar una `clinic_membership`.

### patients

Perfil clinico del paciente.

Campos nuevos o ajustados:

- `id`.
- `user_id`, opcional.
- `full_name`.
- `date_of_birth`.
- `age`, derivable o temporal en MVP.
- `email`.
- `phone`.
- `gender`, opcional.
- `status`: `active`, `inactive`, `archived`.
- `created_at`.
- `updated_at`.

Regla:

- `user_id` puede ser nulo si el profesional creo al paciente antes de que el paciente tenga cuenta.

### professionals

Perfil del profesional de salud.

Campos:

- `id`.
- `user_id`.
- `display_name`.
- `specialty`: `doctor`, `psychologist`, `physiotherapist`, `nutritionist`, `other`.
- `license_number`, opcional para MVP pero requerido para verificacion.
- `bio`.
- `profile_photo_url`.
- `location`.
- `timezone`.
- `appointment_mode`: `in_person`, `online`, `hybrid`.
- `base_price`.
- `status`: `draft`, `active`, `paused`, `disabled`.
- `created_at`.
- `updated_at`.

### professional_services

Servicios ofrecidos por un profesional.

Campos:

- `id`.
- `professional_id`.
- `name`.
- `description`.
- `duration_minutes`.
- `price`.
- `mode`: `in_person`, `online`, `hybrid`.
- `status`: `active`, `inactive`.
- `created_at`.
- `updated_at`.

### professional_availability

Disponibilidad para agenda.

Campos:

- `id`.
- `professional_id`.
- `weekday`.
- `starts_at`.
- `ends_at`.
- `timezone`.
- `status`: `active`, `inactive`.
- `created_at`.
- `updated_at`.

### professional_patients

Relacion entre profesional y paciente.

Campos:

- `id`.
- `professional_id`.
- `patient_id`.
- `status`: `active`, `paused`, `ended`.
- `created_from_appointment_id`, opcional.
- `started_at`.
- `ended_at`, opcional.
- `created_at`.
- `updated_at`.

Regla:

- La relacion se crea cuando un paciente agenda una cita o cuando el profesional registra manualmente al paciente.

### patient_records

Expedientes o carpetas clinicas del paciente por contexto de atencion.

Campos:

- `id`.
- `patient_id`.
- `professional_id`, opcional.
- `record_type`: `general`, `psychology`, `nutrition`, `physiotherapy`, `medical`.
- `title`.
- `summary`.
- `visibility`: `patient_visible`, `professional_only`, `shared_with_care_team`.
- `status`: `active`, `archived`.
- `created_at`.
- `updated_at`.

Regla:

- Un paciente puede tener diferentes expedientes por especialidad o por profesional.
- El portal del paciente solo muestra lo marcado como visible para paciente.

### reviews

Opiniones de pacientes sobre profesionales.

Campos:

- `id`.
- `appointment_id`.
- `patient_id`.
- `professional_id`.
- `rating`.
- `comment`.
- `status`: `pending`, `published`, `hidden`.
- `created_at`.
- `updated_at`.

Reglas:

- Solo se puede crear una opinion si la cita esta completada.
- Una cita solo puede tener una opinion.
- La opinion publica no debe mostrar informacion clinica sensible.

### appointments

Debe evolucionar para soportar portal del paciente.

Campos nuevos o ajustados:

- `id`.
- `patient_id`.
- `professional_id`.
- `professional_service_id`, opcional.
- `starts_at`.
- `ends_at`.
- `timezone`.
- `mode`: `in_person`, `online`.
- `status`: `requested`, `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`.
- `reason`.
- `created_by_user_id`.
- `cancellation_reason`.
- `cancelled_at`.
- `cancelled_by_user_id`.
- `reschedule_reason`.
- `rescheduled_at`.
- `rescheduled_by_user_id`.
- `created_at`.
- `updated_at`.

Regla:

- `scheduled` y `confirmed` bloquean disponibilidad.

### notifications

Avisos persistentes para eventos operativos.

Campos:

- `id`.
- `user_id`.
- `appointment_id`, opcional.
- `patient_id`, opcional.
- `professional_id`, opcional.
- `type`: `appointment_created`, `appointment_status`, `appointment_rescheduled`, `appointment_cancelled`, `clinic_scope`.
- `title`.
- `body`.
- `priority`: `normal`, `high`.
- `status`: `unread`, `read`.
- `read_at`.
- `created_at`.
- `updated_at`.

### notification_preferences

Preferencias por usuario y canal para futuros envios app/email/WhatsApp.

Campos:

- `id`.
- `user_id`.
- `channel`: `app`, `email`, `whatsapp`.
- `enabled`.
- `appointment_updates`.
- `clinic_updates`.
- `reminder_updates`.
- `created_at`.
- `updated_at`.

Regla:

- Cada usuario debe tener una preferencia por canal.
- La preferencia controla si un evento operativo se muestra o se envia por el canal correspondiente; no reemplaza la auditoria ni las notificaciones persistentes.

## Reglas de acceso iniciales

| Accion | patient | professional | clinic_admin | internal_admin |
| --- | --- | --- | --- | --- |
| Ver su perfil | Si | Si | Si | Si |
| Buscar profesionales | Si | Si | Si | Si |
| Ver perfil publico profesional | Si | Si | Si | Si |
| Agendar cita propia | Si | No aplica | Si, para clinica | Soporte |
| Ver citas propias | Si | Si, si participa | Si, si pertenece a clinica | Soporte auditado |
| Ver expediente propio visible | Si | Si, si esta vinculado | Limitado | Soporte auditado |
| Crear nota clinica | No | Si | No, salvo rol profesional | No |
| Publicar opinion | Si, con cita completada | No | No | Moderacion |
| Administrar disponibilidad | No | Si | Si, si pertenece a clinica | Soporte |

## Flujo de paciente

```txt
Paciente crea cuenta
→ completa perfil basico
→ busca profesional
→ revisa perfil publico y opiniones
→ elige servicio y horario
→ agenda cita
→ se crea appointment
→ se crea relacion professional_patient
→ despues de la cita puede ver resumen autorizado
→ puede dejar opinion si la cita fue completada
```

## Flujo de profesional

```txt
Profesional crea cuenta
→ completa perfil profesional
→ define servicios y disponibilidad
→ recibe citas
→ atiende paciente
→ crea nota SOAP o expediente
→ marca que contenido es visible para el paciente
```

## Decisiones MVP

Para avanzar rapido, el MVP debe implementar primero:

- Usuario con un rol principal.
- Portal de paciente con sesion simulada o login basico.
- Profesionales demo consultables.
- Perfil publico de profesional.
- Citas vinculadas a `patient_id` y `professional_id`.
- Opiniones solo de lectura al inicio, con escritura despues de citas completadas.

Dejar para despues:

- Multirol complejo.
- Administracion de clinicas.
- Moderacion avanzada de opiniones.
- Verificacion documental completa.
- Permisos granulares por expediente.

## Cambios necesarios en la API actual

1. Agregar entidades `User`, `UserRole`, `Professional`, `ProfessionalService`, `ProfessionalAvailability`, `ProfessionalPatient`, `PatientRecord` y `Review`.
2. Agregar `UserId` opcional a `Patient`.
3. Agregar `ProfessionalId`, `StartsAt`, `EndsAt`, `Mode` y `CreatedByUserId` a `Appointment`.
4. Agregar `ProfessionalId` y `PatientRecordId` a `SoapNote`.
5. Crear endpoints iniciales:
   - `GET /api/me`.
   - `GET /api/professionals`.
   - `GET /api/professionals/{id}`.
   - `GET /api/professionals/{id}/reviews`.
   - `GET /api/patient-portal/appointments`.
   - `GET /api/patient-portal/records`.
6. Reemplazar `EnsureCreated` por migraciones antes de cambiar tablas en serio.

## Siguientes 3 pasos

1. Crear las entidades base en `apps/api/Entities` y mapearlas en `HealthHubDbContext`.
2. Sembrar profesionales demo con servicios, disponibilidad y opiniones.
3. Crear la primera pantalla del portal paciente: buscar profesionales y ver proximas citas.

## Actualizacion implementada

Fecha: 2026-06-08

- Ya existen `users`, `user_roles`, `professionals`, `professional_services`, `professional_availability`, `professional_patients`, `patient_records`, `reviews`, `audit_logs`, `clinics`, `clinic_memberships` y `notifications`.
- El portal paciente puede buscar profesionales, ver opiniones, agendar, reprogramar y cancelar citas.
- El portal profesional puede ver agenda, cambiar estados operativos a `confirmed`, `completed` o `no_show`, y editar servicios/disponibilidad.
- La vista `/seguridad` muestra auditoria visible por rol, equipo de clinica, notificaciones, invitaciones y preferencias por canal.
- El usuario demo `admin.clinica@healthhub.demo` tiene rol `clinic_admin` con alcance en `clinic-bienestar-integral`.
- Ya existen `clinic_invitations` y `notification_preferences`; falta implementar el flujo de aceptar invitacion y los envios reales por canal.
