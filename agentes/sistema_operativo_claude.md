# Sistema operativo: 1-person company con Claude

Diseñado para tu SaaS de profesionales de salud (psicólogos, nutriólogos, fisioterapeutas). Principio rector: **Claude produce borradores y análisis; tú decides, vendes y haces deploy.** Nada de datos reales de pacientes entra jamás a Claude.

---

## 1. Projects en Claude (solo 4)

Menos Projects = menos burocracia. Cada uno con instrucciones de Project y documentos propios.

| Project | Cubre | Por qué existe |
|---|---|---|
| **01 · Producto & Ingeniería** | Specs, decisiones técnicas, código (con Claude Code), QA | Es donde vives 60% del tiempo en fase MVP |
| **02 · Ventas & Marketing** | Outbound, demos, landing, contenido, objeciones | Tu segunda prioridad: validación con clientes reales |
| **03 · Finanzas & Métricas** | Modelo financiero, pricing, métricas semanales | Revisión semanal, no diaria |
| **04 · Compliance & Datos** | Privacidad, avisos legales, seguridad, políticas | Aislado a propósito: sus respuestas requieren más rigor |

No crees un Project de "Operaciones" ni de "Estrategia". Eso eres tú.

---

## 2. Roles / agentes

Dos capas:

**A) Roles dentro de los Projects** (vía instrucciones del Project — no necesitas nada más para 02, 03 y 04).

**B) Subagents en Claude Code** (solo para el Project 01, donde el trabajo es técnico y repetitivo):

| Subagent | Función |
|---|---|
| `spec-writer` | Convierte una idea de feature en spec corta con criterios de aceptación |
| `implementer` | Escribe el código de la feature según la spec |
| `reviewer` | Revisa PRs: bugs, seguridad, manejo de datos sensibles |
| `security-auditor` | Pasa checklist de seguridad (auth, cifrado, logs, permisos) antes de cada release |

No crees subagents de marketing o ventas. Para una persona, un chat dentro del Project correcto es más rápido que orquestar agentes.

---

## 3. Instrucciones por Project (copia y pega)

### 01 · Producto & Ingeniería
> Eres mi CTO y PM combinados para [nombre del SaaS], un portal para psicólogos, nutriólogos y fisioterapeutas independientes en México. Stack: [tu stack]. Estamos en Fase 1 (MVP): agendar, cobrar, dar seguimiento. Reglas: (1) Toda feature se evalúa contra "¿es mejor que WhatsApp + Excel + transferencias?" — si no, se rechaza. (2) Specs de máximo 1 página con criterios de aceptación. (3) Todo dato de paciente se trata como sensible: cifrado en reposo, control de acceso por rol, bitácora de actividad, separación entre notas privadas del profesional y archivos visibles al paciente. (4) Prefiere soluciones simples y aburridas sobre arquitectura elegante. (5) Si propongo algo de Fase 2-4, recuérdame que estamos en Fase 1 y pregúntame si quiero romper la regla conscientemente.

### 02 · Ventas & Marketing
> Eres mi equipo de growth y ventas. Cliente: psicólogos, nutriólogos y fisioterapeutas independientes en México que hoy operan con WhatsApp, Excel y transferencias. Promesa central: "Agenda, cobra, organiza pacientes y da seguimiento desde un solo portal." Pricing: Básico $399, Pro $699, Clínica $1,499 MXN/mes + 2.5% por cita pagada. Reglas: (1) Tono directo, cero jerga de startup, español de México. (2) Todo mensaje outbound debe caber en 5 líneas y terminar con una pregunta. (3) Vende la herramienta, no el marketplace futuro. (4) Cuando te pida copy, dame 2-3 variantes con ángulos distintos, no 10. (5) Nunca prometas funciones que no existen en el MVP.

### 03 · Finanzas & Métricas
> Eres mi CFO fraccional. Modelo: suscripción + 2.5% de comisión por cita. Break-even ~90-100 profesionales pagando. Métricas que importan: profesionales activos pagando, citas pagadas por profesional, churn, CAC, payback, volumen procesado. Reglas: (1) Siempre muestra supuestos antes de conclusiones. (2) Si un análisis depende de un dato que no te di, pídelo en vez de inventarlo. (3) Recomienda decisiones, no solo números. (4) No eres asesor fiscal ni legal: marca cuándo necesito un contador.

### 04 · Compliance & Datos
> Eres mi oficial de privacidad y seguridad. La plataforma maneja datos sensibles de salud en México: aplican LFPDPPP (datos sensibles requieren consentimiento expreso y por escrito) y, para expedientes clínicos, NOM-004-SSA3 y NOM-024-SSA3. Reglas: (1) Sé conservador: ante la duda, recomienda la opción más protectora. (2) Distingue siempre entre lo que aplica a psicólogos/nutriólogos/fisios vs. médicos (los médicos disparan más regulación: pospón ese segmento si complica el MVP). (3) Todo entregable termina con una sección "Esto debe validarlo un abogado: sí/no y por qué". (4) Nunca asumas que algo es legal porque es común en la industria.

---

## 4. Documentos a subir por Project

| Project | Documentos |
|---|---|
| **01** | `modelo_de_negocio.md` (el que ya tienes) · spec del MVP (las 13 prioridades de Fase 1) · esquema de base de datos · decisiones técnicas (1 archivo `decisiones.md` que creces con el tiempo) |
| **02** | `modelo_de_negocio.md` · perfil del cliente ideal (1 página: dolores, objeciones, dónde está) · tabla de pricing · FAQ de objeciones (lo construyes después de las primeras 10 demos) |
| **03** | `modelo_de_negocio.md` (tiene la simulación financiera) · hoja de métricas reales (actualizada semanalmente, **siempre agregadas, nunca con nombres de pacientes**) |
| **04** | `modelo_de_negocio.md` (sección de riesgos) · borrador de aviso de privacidad · matriz de qué dato vive dónde y quién lo ve |

Regla de mantenimiento: cuando tomes una decisión importante en cualquier chat, agrégala al documento del Project correspondiente. Los documentos son tu memoria institucional; los chats son desechables.

---

## 5. Qué automatizar vs. qué revisar manualmente

### Claude lo hace casi solo (revisas en 2 minutos)
- Specs de features y user stories.
- Código de features no críticas (UI, CRUD simple) vía Claude Code.
- Borradores de copy: landing, emails, posts, scripts de demo.
- Análisis de métricas semanales y resúmenes de feedback.
- Documentación interna y changelogs.

### Claude propone, tú revisas a fondo antes de usar
- Código que toca **auth, pagos, permisos o datos de pacientes** (siempre pasa por el subagent `reviewer` + tu lectura).
- Aviso de privacidad, términos y consentimientos (Claude redacta, un abogado valida antes de publicar).
- Cambios de pricing.
- Respuestas a clientes molestos o casos delicados.

### Nunca lo delegas
- Deploy a producción.
- Envío final de cualquier email a un cliente o prospecto.
- Decisiones de roadmap (Claude argumenta, tú decides).
- **Cualquier cosa que implique datos reales de pacientes.** Para debugging o pruebas, usa datos sintéticos. Esto no es paranoia: es tu principal riesgo regulatorio y reputacional, y además es el estándar que tus propios clientes (psicólogos) te van a exigir.

---

## 6. Flujo semanal (≈ 5-6 horas de "operar", el resto es construir y vender)

| Día | Bloque | Qué haces |
|---|---|---|
| **Lunes** (45 min) | Planeación | Project 01: prompt de planeación semanal (abajo). Eliges máx. 3 entregables de producto y 1 meta de ventas. |
| **Mar-Jue** | Build + ventas | Mañanas: Claude Code en las features. Tardes: 5-10 mensajes outbound/día con Project 02 + demos. |
| **Viernes** (60 min) | Cierre | Project 03: actualizas hoja de métricas, corres el prompt de revisión semanal. Anotas decisiones en los docs. |
| **Quincenal** (30 min) | Compliance | Project 04: revisas si algo construido esta quincena tocó datos sensibles y corres el checklist. |

Si una semana hay que elegir entre construir y vender: **vende**. El MVP sin usuarios no valida nada.

---

## 7. Prompts reutilizables

Guárdalos como nota o como snippets. `[corchetes]` = lo que llenas tú.

**P1 · Planeación semanal** (Project 01, lunes)
> Esta semana tengo [X horas]. Estado actual: [qué funciona ya del MVP]. De las 13 prioridades de Fase 1, ¿cuáles 3 me acercan más a tener un profesional usándolo de punta a punta (agendar → cobrar → dar seguimiento)? Justifica y dame el orden de ataque.

**P2 · Spec de feature** (Project 01)
> Feature: [descripción en 2 líneas]. Genera una spec de máximo 1 página: problema, solución mínima, criterios de aceptación, qué NO incluye, y si toca datos de pacientes (si sí, qué controles necesita).

**P3 · Review de código sensible** (Claude Code, subagent reviewer)
> Revisa este cambio como si manejara expedientes de salud: auth, permisos por rol, cifrado, qué se loggea (¿hay datos sensibles en logs?), separación notas privadas/archivos del paciente. Lista problemas por severidad.

**P4 · Outbound** (Project 02)
> Escribe 3 variantes de mensaje frío para [psicólogo/nutriólogo/fisio] que encontré en [Instagram/directorio/colegio profesional]. Contexto del prospecto: [lo que sepas]. Máx. 5 líneas, terminar con pregunta, sin sonar a spam de software.

**P5 · Post-demo** (Project 02)
> Acabo de dar una demo. Notas crudas: [pega tus notas]. Dame: (1) objeciones detectadas y cómo responderlas, (2) email de seguimiento listo para enviar, (3) si este prospecto vale la pena perseguir y por qué.

**P6 · Síntesis de feedback** (Project 02 o 01)
> Feedback acumulado de usuarios/prospectos: [pega todo, sin nombres de pacientes]. Agrupa por tema, separa "señal" de "ruido", y dime qué implica para las prioridades de Fase 1. ¿Algo sugiere que la promesa central está mal?

**P7 · Revisión semanal** (Project 03, viernes)
> Métricas de la semana: [profesionales pagando, demos dadas, demos→cierre, citas procesadas, churn]. Compara contra la semana pasada y contra el camino a 100 profesionales. Dame: 1 cosa que va bien, 1 alarma, 1 decisión que debería tomar.

**P8 · Checklist de compliance** (Project 04, quincenal)
> Esta quincena construí/cambié: [lista]. Para cada punto: ¿toca datos sensibles?, ¿qué control falta (consentimiento, cifrado, bitácora, acceso por rol)?, ¿algo requiere abogado antes de lanzar? Sé conservador.

---

## Errores a evitar (dado que eres una persona)

1. **No crees más Projects ni agentes de los listados.** Cada pieza extra es mantenimiento, no avance.
2. **No uses Claude para simular validación.** Claude puede redactar la encuesta, pero las respuestas tienen que venir de profesionales reales.
3. **No subas exports de tu base de datos a ningún Project**, ni "solo para analizar". Agregados sí, registros individuales no.
4. **No automatices el envío de outbound.** 10 mensajes personalizados al día cierran más que 100 genéricos, y en tu nicho la confianza lo es todo.
