# Alcance MVP - Clinixa

Fecha: 2026-06-06

## Objetivo

Validar una primera version web de Clinixa para profesionales independientes de la salud, enfocada en administrar pacientes, citas, expedientes, notas SOAP y comunicacion segura en un mismo espacio.

## Principio de alcance

El MVP debe demostrar continuidad de atencion. Todo lo que no ayude directamente a crear, atender, documentar o dar seguimiento a un paciente queda fuera de la primera version.

## Usuarios incluidos

### Profesional

Usuario principal del MVP. Puede administrar su agenda, registrar pacientes, consultar expedientes, generar notas SOAP y comunicarse con pacientes.

### Paciente

Usuario secundario del MVP. Puede consultar su perfil, ver citas, revisar tareas o indicaciones basicas y comunicarse con su profesional.

### Administrador interno

Rol operativo minimo para pruebas, soporte y revision de cuentas. No es un modulo completo de clinica.

## Modulos incluidos

### 1. Autenticacion

Alcance:

- Registro e inicio de sesion.
- Roles basicos: profesional, paciente, administrador interno.
- Proteccion de rutas privadas.
- Recuperacion de acceso si el proveedor elegido lo soporta.

Fuera de alcance:

- SSO empresarial.
- MFA obligatorio.
- Gestion avanzada de organizaciones.

### 2. Dashboard del profesional

Alcance:

- Resumen de citas proximas.
- Acceso rapido a pacientes.
- Acceso rapido a notas recientes.
- Indicadores simples: pacientes activos, citas de hoy, notas pendientes.

Fuera de alcance:

- Analytics avanzado.
- Reportes financieros.
- Comparativas historicas complejas.

### 3. Gestion de pacientes

Alcance:

- Crear paciente.
- Editar datos basicos.
- Consultar lista de pacientes.
- Buscar pacientes por nombre, correo o telefono.
- Ver estado del paciente: activo, inactivo, archivado.

Fuera de alcance:

- Importacion masiva.
- Vinculacion entre multiples profesionales.
- Portal familiar o tutores legales avanzado.

### 4. Perfil del paciente

Alcance:

- Datos personales basicos.
- Datos de contacto.
- Motivo de atencion.
- Resumen de seguimiento.
- Historial de citas.
- Acceso a expediente y notas.

Fuera de alcance:

- Perfil interoperable entre clinicas.
- Integraciones con aseguradoras.
- Wearables.

### 5. Agenda y citas

Alcance:

- Crear cita.
- Editar cita.
- Cancelar cita.
- Ver calendario por dia, semana o lista.
- Estados de cita: programada, completada, cancelada, no asistio.
- Asociar cita con paciente y profesional.

Fuera de alcance:

- Reservas publicas con disponibilidad avanzada.
- Pagos al reservar.
- Videollamadas integradas.
- Recordatorios por WhatsApp.

### 6. Expediente clinico basico

Alcance:

- Crear expediente por paciente.
- Registrar antecedentes relevantes.
- Registrar observaciones generales.
- Consultar historial.
- Guardar cambios con fecha y usuario responsable.

Fuera de alcance:

- Expediente clinico completo por especialidad.
- Firmas digitales.
- Certificaciones regulatorias avanzadas.
- Plantillas clinicas por disciplina.

### 7. Notas SOAP

Alcance:

- Crear nota SOAP asociada a paciente y cita.
- Campos: subjetivo, objetivo, evaluacion, plan.
- Guardar borrador.
- Marcar nota como finalizada.
- Captura y edicion manual por el profesional.

Fuera de alcance:

- Generacion asistida por IA.
- Resumenes automaticos.
- Transcripcion de audio.
- Diagnostico automatico.
- Recomendaciones medicas autonomas.
- Firma clinica formal.

### 8. Comunicacion via WhatsApp (sustituye al chat propio)

Decision 2026-06-09: el chat propio queda eliminado del producto. La maqueta `/chat` se retira.

Alcance:

- Campo de numero WhatsApp en el perfil del profesional.
- Boton wa.me con mensaje prellenado en el perfil publico y en el detalle de cita del paciente.
- Deslinde en Terminos: la comunicacion ocurre fuera de plataforma, no es para urgencias y no forma parte del expediente.

Fuera de alcance (MVP):

- Chat o mensajeria propia (eliminado).
- WhatsApp Business API automatizada (plan Pro, Fase 3).
- Grupos, adjuntos, mensajes de voz, moderacion automatica.

## Pantallas MVP

- Login.
- Registro.
- Dashboard del profesional.
- Lista de pacientes.
- Crear/editar paciente.
- Perfil del paciente.
- Agenda.
- Crear/editar cita.
- Expediente del paciente.
- Crear/editar nota SOAP.
- Boton WhatsApp en perfil del profesional y detalle de cita.
- Vista simple del paciente.
- Administracion interna minima.

## Flujos principales

### Flujo 1: Profesional crea paciente

1. Profesional inicia sesion.
2. Entra a pacientes.
3. Crea un paciente con datos basicos.
4. El sistema crea el perfil y expediente base.
5. El paciente queda visible en la lista.

### Flujo 2: Profesional agenda cita

1. Profesional abre agenda.
2. Crea cita.
3. Selecciona paciente, fecha, hora y motivo.
4. El sistema guarda la cita como programada.
5. La cita aparece en dashboard y perfil del paciente.

### Flujo 3: Profesional documenta atencion

1. Profesional abre perfil del paciente.
2. Entra a expediente o cita.
3. Crea nota SOAP.
4. Llena manualmente los campos SOAP.
5. Revisa y guarda la nota.

### Flujo 4: Paciente contacta al profesional por WhatsApp

1. Paciente abre el perfil del profesional o el detalle de su cita.
2. Toca el boton WhatsApp.
3. Se abre WhatsApp con mensaje prellenado (nombre y cita).
4. La conversacion continua fuera de plataforma, en el WhatsApp del profesional.

## Criterios de aceptacion generales

- El profesional puede completar el ciclo: crear paciente, agendar cita, registrar nota y ser contactado por WhatsApp.
- Cada nota SOAP queda asociada a paciente, profesional y fecha.
- El paciente solo puede ver su propia informacion.
- Las acciones sensibles quedan preparadas para auditoria.
- El MVP puede operar sin IA, pagos, facturacion, video, mobile ni marketplace.

## Fuera del MVP

- App movil.
- Marketplace de especialistas.
- Integracion con wearables.
- Integracion con aseguradoras.
- Facturacion SAT.
- Pagos.
- Videollamadas.
- WhatsApp Business API.
- Mensajeria propia de cualquier tipo.
- API publica para terceros.
- Organizaciones clinicas complejas.
- OpenAI u otros proveedores de IA.
- Borradores SOAP generados automaticamente.
- Resumenes automaticos del expediente.
- Transcripcion de audio.
- Asistente del paciente.

## Fase 4 - IA y automatizacion clinica

(Antes "Fase 2". Renumerada el 2026-06-09: la monetización y la retención se adelantaron como Fases 2 y 3; ver `modelo_de_negocio.md` v2.0.)

La IA se evaluara despues de validar el MVP operativo con usuarios reales.

Alcance previsto:

- Generar borradores SOAP desde texto libre.
- Resumir avances desde notas existentes.
- Transcribir audio para revision del profesional.
- Mantener revision y confirmacion humana obligatorias.
- Registrar solicitudes y resultados para auditoria.
