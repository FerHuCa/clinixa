# Guía: crear los Projects de cada agente + plan de junio 2026

Fecha: 2026-06-09. Complementa `README.md` y `tablero.md` de esta carpeta. Las instrucciones completas para copiar están en `sistema_operativo_claude.md`, sección 3.

---

## Parte 1 — Crear los 4 Projects (60–90 min, hacerlo una sola vez)

En claude.ai → Projects → New Project. Para cada uno: nombre, instrucciones (copiar de `sistema_operativo_claude.md` §3, sustituyendo `[nombre del SaaS]` por Clinixa y `[tu stack]` por Next.js + ASP.NET Core + PostgreSQL + Azure) y archivos.

### Project 01 · Producto & Ingeniería

Archivos a subir (todos existen en el repo):

- `modelo_de_negocio.md`
- `alcance-mvp.md`
- `modelo-datos.md`
- `plan-fases-a-b.md`
- `tech-stack.md`
- `plan-lanzamiento.md`

Prompt inicial (para validar que el Project entiende el contexto):

> Lee los documentos del Project. Resume en 10 líneas: en qué fase estamos, qué está construido, qué falta para lanzar el 17 de agosto y cuál es la primera tarea técnica (según plan-fases-a-b.md). Señala cualquier contradicción entre documentos.

### Project 02 · Ventas & Marketing

Archivos a subir:

- `modelo_de_negocio.md`
- `plan-lanzamiento.md` (tiene segmento, oferta, canales y proceso de venta)
- `perfil-cliente-ideal.md` — **no existe aún; crearlo es la primera tarea de este Project**
- `faq-objeciones.md` — se crea después de las primeras 10 demos

Prompt inicial:

> Con base en plan-lanzamiento.md, redacta el borrador de `perfil-cliente-ideal.md` (1 página): psicólogo independiente en México — dolores concretos de operar con WhatsApp+Excel+transferencias, objeciones probables a pagar $399/mes, dónde encontrarlo (Instagram, directorios, colegios) y qué señales indican que es buen prospecto para el piloto. Lo corregiré con lo que vea en demos reales.

### Project 03 · Finanzas & Métricas

Archivos a subir:

- `modelo_de_negocio.md` (tiene la simulación financiera)
- `plan-legal-financiero.md`
- `metricas-semanales.md` — **no existe aún; primera tarea de este Project** (siempre datos agregados, nunca nombres de pacientes)

Prompt inicial:

> Diseña la plantilla de `metricas-semanales.md` que actualizaré cada viernes: mensajes outbound enviados, respuestas, demos, altas, profesionales activos pagando, citas pagadas por profesional, churn, MXN procesado. Incluye fila de metas por semana hacia 5–8 piloteadores al 7 de agosto y 100 pagando en marzo 2027. Formato tabla simple.

### Project 04 · Compliance & Datos

Archivos a subir:

- `modelo_de_negocio.md` (sección de riesgos)
- `plan-legal-financiero.md`
- Contenido de `/aviso-privacidad` y `/terminos` (copiar el texto de las páginas del frontend a un md)
- `matriz-datos.md` — **no existe aún; primera tarea de este Project**

Prompt inicial:

> Primera tarea: borrador de `matriz-datos.md` — qué dato vive dónde (PostgreSQL, Clerk, Mercado Pago, Resend, Azure Blob) y quién lo ve (paciente, profesional, clinic_admin, internal_admin). Segunda: prepara la lista de preguntas y el alcance de encargo para cotizar al abogado de privacidad esta semana, según plan-legal-financiero.md sección 2.

### Regla de mantenimiento

Cada decisión importante tomada en un chat → se anota en `agentes/bitacoras/0X-*.md` y, si cambia un documento del Project, se actualiza el archivo en el repo y se re-sube al Project. Los chats se descartan; los documentos son la memoria.

---

## Parte 2 — Día a día de junio

Contexto: etapa 1 del `plan-lanzamiento.md` (cierre técnico Fase A, jun 9–27) + arranque de etapa 2 (deploy, jun 29+). Ritmo: mañanas construir (Claude Code), tardes operar/vender (Projects), viernes cierre (Cowork + Project 03).

### Semana del 9–13 jun — Setup + E2E Clerk + arranque A1

| Día | Mañana (Code) | Tarde (Chat/Cowork) |
|---|---|---|
| Mar 10 | Prueba E2E real Clerk: registrar paciente y profesional nuevos, verificar roles y redirecciones | Crear los 4 Projects (Parte 1) + correr prompts iniciales |
| Mié 11 | Spec A1 Mercado Pago con `spec-writer`; decidir Opción B marketplace (validar con contador) | Project 04: alcance de encargo legal; enviar 3 solicitudes de cotización a abogados |
| Jue 12 | A1: entidad `Payment`, migración, endpoint `checkout` (sandbox) | Iniciar verificación de cuenta Mercado Pago; revisar e.firma vigente |
| Vie 13 | A1: webhook + validación de firma | Cierre: plantilla de métricas (Project 03), actualizar bitácoras y `tablero.md` |

### Semana del 15–19 jun — Terminar A1 + A3

| Día | Mañana (Code) | Tarde |
|---|---|---|
| Lun 15 | Planeación semanal (prompt P1, Project 01) + A1: frontend "Pagar y confirmar" + página de retorno | Project 02: corregir perfil-cliente-ideal; armar lista de 50 prospectos |
| Mar 16 | A1: tests en `test-api.mjs`, `reviewer` sobre todo el flujo de pago | Alta SAT actividad empresarial / RESICO (si falta) |
| Mié 17 | A3: campos de cédula, gate de publicación, endpoint verify-license | Elegir abogado y arrancar encargo |
| Jue 18 | A3: UI de verificación en onboarding + admin | Project 02: redactar variantes de mensaje frío (prompt P4) — aún no enviar |
| Vie 19 | A3: tests + `reviewer` | Cierre viernes: métricas, bitácoras, decisión de la semana |

### Semana del 22–26 jun — A2 + A4 + preparar outbound

| Día | Mañana (Code) | Tarde |
|---|---|---|
| Lun 22 | Planeación P1 + A2: componente `WeeklyAvailabilityGrid` | Project 02: pulir mensajes con feedback; identificar primeros 20 prospectos concretos |
| Mar 23 | A2: detección de traslapes + responsive | Contratar contador; decisión marketplace cerrada |
| Mié 24 | A4: recorrido completo signup individual → publicar; documentarlo | Preparar guion de demo de 20 min con datos sintéticos |
| Jue 25 | Colchón: bugs de A1–A3, correr `security-auditor` | Ensayar demo; grabar video corto de respaldo |
| Vie 26 | Cierre Fase A: criterio = un profesional nuevo publica y un paciente paga en sandbox end-to-end | Cierre viernes + checklist quincenal de compliance (prompt P8, Project 04) |

### Semana del 29 jun – 3 jul — Deploy + primer outbound

| Día | Mañana (Code) | Tarde |
|---|---|---|
| Lun 29 | Planeación P1 + Azure: App Service, PostgreSQL, Key Vault | **Empieza outbound real: 5–10 mensajes/día, todos los días desde hoy** |
| Mar 30 | Deploy de API y web a staging; dominio + Resend (B1 inicio) | Outbound + seguimiento de respuestas (prompt P5 tras cada interacción) |

### Metas de cierre de junio

- Fase A completa y validada en sandbox (pago end-to-end).
- Staging en Azure con dominio real.
- Abogado contratado y trabajando; contador contratado; cuenta MP productiva en trámite o lista.
- 4 Projects operando con sus documentos; bitácoras al día.
- ≥20 mensajes outbound enviados y primeras demos agendadas para julio.

### Reglas del mes

1. Si un día hay que elegir entre construir y vender: en junio gana construir **hasta el 26**; desde el 29, gana vender.
2. Todo código de A1/A3 pasa por `reviewer` antes de merge (toca pagos y publicación).
3. Viernes sin excepción: métricas + bitácoras + tablero (30–60 min). Es lo que mantiene el sistema vivo.
