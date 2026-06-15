# Modelo de datos inicial - Clinixa

Fecha: 2026-06-06

## Objetivo

Definir las entidades base del MVP para soportar pacientes, profesionales, agenda, expediente, notas SOAP y chat.

Para el diseno detallado de identidad, portal del paciente, profesionales, roles y permisos, ver `modelo-usuarios-roles.md`.

## Convenciones

- Todos los registros principales deben tener `id`, `created_at`, `updated_at` y, cuando aplique, `deleted_at`.
- Los IDs pueden ser UUID para facilitar integraciones futuras.
- Los registros clinicos no deben eliminarse fisicamente en operacion normal; deben archivarse o marcarse como inactivos.

## Entidades principales

### users

Representa la cuenta autenticada.

Campos:

- id.
- auth_provider_id.
- email.
- phone.
- full_name.
- role: professional, patient, internal_admin.
- status: active, invited, disabled.
- created_at.
- updated_at.

Relaciones:

- Un usuario puede tener perfil de profesional.
- Un usuario puede tener perfil de paciente.

### professionals

Representa al profesional de salud.

Campos:

- id.
- user_id.
- specialty.
- professional_license.
- bio.
- timezone.
- status.
- created_at.
- updated_at.

Relaciones:

- Pertenece a un usuario.
- Tiene muchos pacientes mediante `professional_patients`.
- Tiene muchas citas.
- Tiene muchas notas SOAP.

### patients

Representa el perfil central del paciente.

Campos:

- id.
- user_id, opcional para pacientes invitados o aun sin cuenta.
- first_name.
- last_name.
- email.
- phone.
- birth_date.
- gender.
- emergency_contact_name.
- emergency_contact_phone.
- status: active, inactive, archived.
- created_at.
- updated_at.

Relaciones:

- Puede pertenecer a un usuario autenticado.
- Tiene un expediente.
- Tiene muchas citas.
- Tiene muchas notas SOAP.
- Tiene conversaciones.

### professional_patients

Relacion entre profesionales y pacientes.

Campos:

- id.
- professional_id.
- patient_id.
- relationship_status: active, paused, ended.
- started_at.
- ended_at.
- created_at.
- updated_at.

Relaciones:

- Permite que un paciente pueda ser atendido por mas de un profesional en el futuro.
- En MVP puede limitarse a un profesional por paciente desde la interfaz.

### medical_records

Expediente base del paciente.

Campos:

- id.
- patient_id.
- summary.
- main_reason.
- relevant_history.
- allergies.
- medications.
- notes.
- created_at.
- updated_at.

Relaciones:

- Pertenece a un paciente.
- Tiene muchas notas SOAP.

### appointments

Citas entre profesional y paciente.

Campos:

- id.
- professional_id.
- patient_id.
- starts_at.
- ends_at.
- timezone.
- appointment_type: initial, follow_up, evaluation, other.
- status: scheduled, completed, cancelled, no_show.
- reason.
- cancellation_reason.
- created_at.
- updated_at.

Relaciones:

- Pertenece a profesional.
- Pertenece a paciente.
- Puede tener una nota SOAP asociada.

### soap_notes

Notas clinicas estructuradas.

Campos:

- id.
- patient_id.
- professional_id.
- appointment_id, opcional.
- medical_record_id.
- subjective.
- objective.
- assessment.
- plan.
- status: draft, finalized, archived.
- finalized_at.
- created_at.
- updated_at.

Relaciones:

- Pertenece a paciente.
- Pertenece a profesional.
- Pertenece a expediente.
- Opcionalmente pertenece a una cita.

### conversations

Canal de comunicacion entre profesional y paciente.

Campos:

- id.
- professional_id.
- patient_id.
- status: active, archived.
- created_at.
- updated_at.

Relaciones:

- Tiene muchos mensajes.

### messages

Mensajes de chat.

Campos:

- id.
- conversation_id.
- sender_user_id.
- body.
- status: sent, delivered, read.
- sent_at.
- read_at.
- created_at.
- updated_at.

Relaciones:

- Pertenece a una conversacion.
- Pertenece a un usuario remitente.

### audit_logs

Registro de acciones sensibles.

Campos:

- id.
- actor_user_id.
- action.
- entity_type.
- entity_id.
- metadata.
- occurred_at.

Relaciones:

- Pertenece al usuario que ejecuto la accion.

## Relaciones resumidas

- `users` 1 a 1 `professionals`.
- `users` 1 a 1 opcional `patients`.
- `professionals` muchos a muchos `patients` mediante `professional_patients`.
- `patients` 1 a 1 `medical_records`.
- `patients` 1 a muchos `appointments`.
- `professionals` 1 a muchos `appointments`.
- `medical_records` 1 a muchos `soap_notes`.
- `appointments` 0 o 1 a 1 `soap_notes`.
- `conversations` 1 a muchos `messages`.

## Reglas de permisos MVP

- Un profesional solo puede ver pacientes relacionados con el.
- Un paciente solo puede ver su propio perfil, citas, mensajes y contenido autorizado.
- Un administrador interno puede ver datos operativos para soporte, sujeto a auditoria.
- Una nota SOAP finalizada no debe modificarse sin dejar rastro de auditoria.

## Pendientes tecnicos

- Definir si se usara soft delete global.
- Definir estrategia de versionado para notas finalizadas.
- Definir campos minimos obligatorios por tipo de profesional.
- Definir estructura JSON para `metadata` en auditoria.

## Extension prevista para Fase 2

### ai_requests

Registro de solicitudes de IA para auditoria y trazabilidad.

Campos:

- id.
- requested_by_user_id.
- patient_id, opcional.
- soap_note_id, opcional.
- request_type: soap_draft, patient_summary, transcription.
- input_reference.
- output_text.
- model.
- status: pending, completed, failed.
- reviewed_by_user_id, opcional.
- reviewed_at, opcional.
- created_at.
- updated_at.

Relaciones:

- Puede asociarse a paciente.
- Puede asociarse a nota SOAP.
- Pertenece al usuario que hizo la solicitud.

## Reglas previstas para Fase 2

- La IA solo puede ejecutarse desde contexto autenticado y con permisos sobre el paciente.
- Los resultados deben guardarse como borradores revisables, nunca como decisiones clinicas autonomas.
- Definir si `ai_requests.input_reference` guarda texto directo, referencia a archivo o ambos.
