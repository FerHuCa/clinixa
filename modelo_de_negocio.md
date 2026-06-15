# Modelo de negocio - Clinixa

Versión 2.0 - 2026-06-09
Reemplaza la versión anterior. Alineado con `seguimiento-proyecto.md` y el estado real del producto.

## Resumen ejecutivo

Clinixa es un SaaS para profesionales independientes de salud y bienestar (psicólogos, nutriólogos, fisioterapeutas, médicos) que centraliza agenda, pacientes, expediente, comunicación y cobros en un solo portal. El paciente accede a un portal propio donde consulta citas, documentos, busca profesionales y agenda en línea.

La tesis comercial: el producto se vende como software al profesional. El componente de portal paciente con búsqueda y reseñas ya existe en el producto y se capitalizará como canal de adquisición orgánica (perfiles públicos indexables), pero no se operará como marketplace abierto hasta tener oferta y tráfico suficientes.

El cliente que paga es el profesional. El paciente usa la plataforma como parte del servicio, sin costo.

La propuesta central no cambia:

> "Agenda, cobra, organiza pacientes y da seguimiento desde un solo portal."

El producto debe resolver tres problemas mejor que WhatsApp, Excel y transferencias: agendar, cobrar y dar seguimiento. De los tres, cobrar es el único que WhatsApp no resuelve y es donde está el ingreso por comisión, por eso los pagos se adelantan en el roadmap respecto a la versión anterior de este documento.

## Estado actual del producto (construido y validado)

El MVP operativo de la Fase 1 está sustancialmente construido. Stack: Next.js + TypeScript en frontend, ASP.NET Core + EF Core + PostgreSQL en backend, Clerk como proveedor de identidad.

Funcional hoy:

- Registro y login con Clerk, con selección de rol (paciente o profesional) en el registro y provisioning automático del usuario con su rol.
- Portal del profesional: agenda propia, solicitudes entrantes, confirmación, no-show, edición de servicios, precios, modalidad y disponibilidad.
- Portal del paciente: búsqueda de profesionales con filtros, reseñas, agendamiento real contra disponibilidad publicada, reprogramación y cancelación.
- Gestión de pacientes, perfil único de paciente, expediente clínico y notas SOAP manuales persistidas en PostgreSQL.
- Reglas de reserva: cálculo de slots disponibles, validación de traslapes por duración y rechazo de horarios fuera de disponibilidad.
- Equipos de clínica: membresías, invitaciones de profesionales y permisos por rol.
- Auditoría de accesos a expediente y acciones sensibles de citas.
- Preferencias de notificación por canal (app, email, WhatsApp) a nivel de modelo de datos.
- Suite de pruebas de API y migraciones EF Core versionadas.

Pendiente del MVP:

- Conexión WhatsApp del profesional: botón wa.me en perfil y citas. (Decisión 2026-06-09: el chat propio se elimina del alcance; la comunicación vive en el WhatsApp de cada profesional.)
- Email transaccional real (infraestructura lista, falta Resend productivo).
- Pagos en línea (modelo de datos listo con `professional_service_id` y precio; falta la integración).
- Consentimiento, aviso de privacidad y verificación de cédula profesional.
- Endurecimiento para producción: secretos fuera del repo, CORS por ambiente, rate limiting.

Decisión vigente del 2026-06-09: toda la IA (OpenAI, Whisper, transcripción, borradores SOAP) queda fuera del MVP y no se inicia hasta tener evidencia del piloto.

## Cliente y nicho inicial

Cliente que paga: el profesional independiente.

Nicho del piloto (decisión 2026-06-09): **psicólogos, nutriólogos y fisioterapeutas independientes**.

- Psicólogos siguen siendo el segmento ancla: sesiones semanales recurrentes (máximo volumen por profesional), encajan con paquetes y son el mejor caso de continuidad de atención.
- Nutriólogos y fisioterapeutas entran al piloto desde el inicio: el producto ya los soporta sin cambios y comparten el mismo dolor (WhatsApp+Excel+transferencias).
- **Médicos (otros doctores)** entran al **lanzamiento oficial**, no al piloto: requieren revisión de NOM-004 (expediente clínico médico) por el abogado, que corre en paralelo durante el piloto (ver `plan-legal-financiero.md`).

## Modelo de ingresos

Tres fuentes, en este orden de prioridad de validación:

### 1. Suscripción mensual

| Plan | Precio mensual | Incluye |
|---|---:|---|
| Básico | $399 MXN | Agenda, perfil, pacientes, expediente, cobros en línea, botón WhatsApp (wa.me) en perfil y citas |
| Pro | $699 MXN | Básico + conexión WhatsApp Business API (recordatorios y confirmaciones automáticas desde el número del profesional), paquetes de sesiones, reportes |
| Clínica | $1,299 MXN base + $349 por profesional adicional | Pro + multiusuario, permisos, panel administrativo |

Cambios respecto a la versión anterior:

- El plan Clínica deja de ser precio plano y escala por asiento. Una clínica de 5 profesionales paga $2,695, no $1,499.
- Se define el diferenciador de Pro sin depender de IA: conexión WhatsApp Business API (automatización desde el número del profesional), paquetes y reportes. Cuando exista IA, las funciones asistidas se suman a Pro como límite de plan (por ejemplo, borradores SOAP ilimitados en Pro, limitados en Básico).
- **Trial de 14 días en lugar de plan gratuito permanente.** Un free de 10 pacientes crea usuarios estacionados que consumen soporte sin convertir. El trial fuerza la decisión de compra con el producto completo. (Decisión 2026-06-09: 14 días, alineado con `plan-lanzamiento.md`.)

### 2. Comisión por pagos procesados

- 2.5% de comisión de plataforma sobre citas cobradas en línea.
- La comisión de la pasarela (Mercado Pago, ~3.5% + IVA) se traslada al profesional de forma transparente. Costo efectivo total para el profesional: ~6.5% por cita cobrada en plataforma.
- Pasarela: Mercado Pago antes que Stripe, por cobertura de tarjeta, OXXO y SPEI en México.
- Riesgo a validar en el piloto: disposición del profesional a pagar ~$42 por cita de $650 a cambio de cobro automático, confirmación automática de cita y reducción de no-shows. Si la fricción es alta, alternativas: comisión solo en plan Básico (Pro sin comisión) o tope mensual de comisión.

### 3. Add-ons

- Automatización WhatsApp (recordatorios/confirmaciones vía Business API) como add-on para plan Básico; incluida en Pro. El botón wa.me es gratis en todos los planes.
- Almacenamiento adicional.
- Facturación CFDI (Facturama o SW Sapien).
- Perfil destacado, cuando exista tráfico real en los perfiles públicos.
- Funciones de IA, cuando lleguen, con consentimiento explícito.

## Simulación financiera

Corrección principal respecto a la versión anterior: asumir que el 100% de las citas del profesional se cobra por la plataforma es irreal. Muchos seguirán cobrando por transferencia para evitar comisión. Se modelan dos escenarios de adopción de cobro en plataforma.

Supuestos base:

| Variable | Supuesto |
|---|---:|
| Ticket promedio por cita | $650 MXN |
| Citas al mes por profesional (psicólogo activo) | 40 |
| Citas cobradas en plataforma - escenario conservador | 40% (16 citas) |
| Citas cobradas en plataforma - escenario optimista | 70% (28 citas) |
| Comisión de plataforma | 2.5% |
| Ingreso promedio por suscripción | $529 MXN |
| Costo variable por profesional | $210 MXN |
| Costo fijo mensual estimado | $45,000 MXN |

Ingreso por profesional al mes:

| Escenario | Comisión | Suscripción | Total |
|---|---:|---:|---:|
| Conservador (40%) | $260 | $529 | $789 |
| Optimista (70%) | $455 | $529 | $984 |

Resultado mensual por número de profesionales activos pagando (escenario conservador):

| Profesionales | Ingreso mensual | Costos | Resultado |
|---:|---:|---:|---:|
| 50 | $39,450 | $55,500 | -$16,050 |
| 100 | $78,900 | $66,000 | $12,900 |
| 250 | $197,250 | $97,500 | $99,750 |

Punto de equilibrio: entre 85 y 110 profesionales activos pagando según adopción de cobros. Nota: el costo fijo de $45,000 no incluye salarios fundadores ni equipo de soporte a escala; a partir de ~250 profesionales debe remodelarse.

Métricas que faltaban en la versión anterior y deben medirse desde el piloto:

- Churn mensual objetivo: menor a 5%. Con ARPU de $789 y churn de 5-8%, el LTV queda entre $9,900 y $15,800, lo que limita el CAC máximo sostenible a ~$3,000-4,000 por profesional.
- % del volumen de citas cobrado en plataforma (el supuesto más frágil del modelo).
- Payback de CAC objetivo: menor a 6 meses.

## Riesgos y puntos críticos

### 1. Datos de salud y cumplimiento (bloqueador de piloto)

- LFPDPPP: aviso de privacidad y consentimiento informado como requisito de registro, no opcional.
- NOM-024-SSA3-2012 como referencia para expediente clínico electrónico.
- Ya construido: control de acceso por roles, bitácora de auditoría, separación entre notas privadas del profesional y documentos visibles para el paciente.
- Pendiente: cifrado de datos sensibles en reposo, consentimiento explícito en el flujo y verificación de cédula profesional como requisito para publicar perfil. La verificación de cédula es además el diferenciador de confianza frente a directorios sin verificar.

### 2. Adopción del cobro en plataforma

El riesgo de negocio número uno. Si el profesional agenda en HealthHub pero cobra por transferencia, la capa de comisión no existe y el ARPU cae a solo la suscripción. Mitigaciones: confirmación automática de cita solo con pago, política de anticipo configurable, reducción de no-shows como argumento de venta.

### 3. Comunicación: integrarse a WhatsApp, no competir con él

Decisión 2026-06-09: **el chat propio se elimina del producto.** Los usuarios ya tienen WhatsApp y lo prefieren; construir mensajería propia era el feature menos defendible. La estrategia es integrarse: Básico expone botón wa.me al WhatsApp del profesional; Pro conecta el WhatsApp Business del profesional vía API para recordatorios y confirmaciones automáticas desde su propio número. Implicación de cumplimiento: la comunicación clínica ocurre fuera de plataforma; los términos deben deslindar responsabilidad (no urgencias, sin registro en expediente) — incluido en el encargo del abogado.

### 4. Doble producto a medias

El portal paciente con búsqueda y reseñas ya existe pero no es público ni indexable. Mantenerlo cerrado dentro del portal es costo sin adquisición. Decisión tomada: hacer los perfiles profesionales públicos e indexables en la fase de monetización (URLs tipo `/profesionales/laura-vega-psicologa-cdmx`, schema.org, reseñas visibles, botón de agendar). El marketplace completo (buscador público masivo, campañas) sigue siendo fase posterior.

## Fases del producto

Reordenadas respecto al seguimiento: la monetización (antes Fase 3) se adelanta por encima de la IA (antes Fase 2). Razón: el propio seguimiento condiciona la IA a evidencia del piloto, y el riesgo real del negocio es la disposición a pagar, no la capacidad técnica. Validar cobro primero.

### Fase 1 - Cierre del MVP y cumplimiento (en curso)

Objetivo: producto listo para usuarios reales.

1. Clerk validado end-to-end: registro real de paciente y profesional, redirección por rol.
2. Limpieza técnica: eliminar `Program 2.cs`, secretos a variables de entorno / Key Vault, CORS por ambiente, rate limiting en login y reservas.
3. Consentimiento y aviso de privacidad integrados al registro.
4. Verificación de cédula profesional como gate de publicación de perfil.
5. Conexión WhatsApp básica: campo de número en el perfil profesional y botón wa.me visible para el paciente. (Sustituye al chat propio, eliminado del alcance.)
6. Vista semanal de disponibilidad con detección de traslapes en onboarding.

### Fase 2 - Monetización y piloto

Objetivo: validar que un profesional real paga.

1. Integración Mercado Pago: paciente paga al agendar, `appointment.status = confirmed` automático, liquidación al profesional.
2. Suscripciones con trial de 14 días.
3. Email transaccional con Resend: cita agendada, confirmada, recordatorio 24h, cancelada.
4. Panel de ingresos del profesional.
5. Perfiles públicos indexables con SEO.
6. Piloto controlado: 5 a 10 psicólogos independientes con pacientes reales, midiendo churn, % de cobro en plataforma y uso semanal.

### Fase 3 - Retención y expansión de ingresos

Objetivo: uso semanal y ARPU creciente. Condicionada a evidencia del piloto.

1. Conexión WhatsApp Business API por profesional (Pro): recordatorios y confirmaciones automáticas desde el número de cada profesional (reduce no-shows; conectar a `notification_preferences` ya existente).
2. Paquetes de sesiones y control de pagos pendientes.
3. Políticas de cancelación y anticipo configurables.
4. Reportes del profesional: ocupación, ingresos, pacientes activos vs inactivos.
5. Apertura del nicho a médicos (con revisión NOM-004 completada; nutriólogos y fisioterapeutas ya están desde el piloto).
6. Activación comercial del plan Clínica (la infraestructura de equipos, invitaciones y permisos ya está construida).

### Fase 4 - IA aplicada al flujo clínico

Objetivo: diferenciación del plan Pro. No inicia sin evidencia del piloto sobre qué conviene automatizar.

1. Transcripción de sesiones (Whisper).
2. Borradores SOAP asistidos con revisión obligatoria del profesional.
3. Resúmenes de avance del paciente.
4. Límites por plan: asistencia limitada en Básico, ilimitada en Pro.
5. `pgvector` ya provisionado para búsqueda semántica en expediente.

### Fase 5 - Marketplace

Objetivo: generar demanda para los profesionales. Solo con oferta y tráfico suficientes.

1. Buscador público con filtros por especialidad, ubicación, modalidad y precio.
2. Perfiles destacados como add-on.
3. Reviews verificadas (el modelo `Review` ya existe).
4. SEO programático por especialidad y ciudad.
5. Videollamadas integradas (Daily.co) para ampliar cobertura geográfica.

## Métricas clave

| Métrica | Qué mide |
|---|---|
| Profesionales activos pagando | Salud real del negocio |
| % de citas cobradas en plataforma | Viabilidad de la capa de comisión |
| Churn mensual | Retención |
| Citas agendadas por profesional | Uso operativo |
| Uso de expediente y notas | Dependencia del producto |
| No-shows antes vs después de recordatorios | Argumento de venta de Pro |
| CAC y payback | Eficiencia comercial |
| LTV / CAC | Sostenibilidad (objetivo mayor a 3) |

## Recomendación final

El producto ya superó la pregunta de "¿se puede construir?". La pregunta abierta es "¿alguien paga?". Todo lo que no contribuya a responderla en las próximas semanas es secundario. Eso significa: cerrar cumplimiento mínimo, integrar pagos, lanzar piloto con psicólogos y medir cobro en plataforma y churn antes de invertir en IA, clínicas a escala o marketplace.
