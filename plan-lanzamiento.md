# Plan de lanzamiento y primeros clientes — Clinixa

Fecha: 2026-06-09. Basado en el estado real del repo (`seguimiento-proyecto.md`, `plan-fases-a-b.md`).

## Punto de partida

Construido y validado localmente: portales paciente/profesional/admin, agenda con disponibilidad real, expediente y notas SOAP, invitaciones de clínica, onboarding con gate de publicación, auditoría, permisos por rol, Clerk, consentimiento LFPDPPP/NOM-024 y pruebas de API.

Faltante crítico para lanzar: ~~prueba E2E real de Clerk~~ ✅ · ~~Resend infraestructura (B1)~~ ✅ · **nombre de marca y dominio** (bloqueador: "HealthHub" tomado) · Mercado Pago en producción (A1) · verificación de cédula (A3) · calendario semanal (A2) · signup individual (A4) · conexión WhatsApp wa.me (B3) · deploy a Azure · validación legal de documentos.

## Línea de tiempo (lanzamiento oficial: ~17 de agosto 2026)

Supuesto: 1 persona, ~25–30 h/semana efectivas con Claude Code acelerando el build.

| Etapa | Fechas | Entregables | Criterio de salida |
|---|---|---|---|
| **1. Cierre técnico Fase A** | Jun 9 – Jun 27 (sem 1–3) | E2E Clerk real · A1 Mercado Pago (sandbox→prod) · A3 cédula · A2 calendario · A4 signup individual | Un profesional nuevo se registra, publica y un paciente paga una cita end-to-end en sandbox |
| **2. Deploy + hardening** | Jun 29 – Jul 10 (sem 4–5) | **Definir nombre de marca + registrar dominio** · Deploy a Azure (App Service, PostgreSQL, Key Vault) · Resend con dominio verificado (B1 — infraestructura ya lista, falta dominio y API key) · security-auditor completo · abogado revisa aviso/términos/consentimiento | Staging estable con dominio real; documentos legales validados o en revisión formal |
| **3. Piloto cerrado** | Jul 13 – Ago 7 (sem 6–9) | 5–8 profesionales reales usándolo gratis · B3 conexión WhatsApp en paralelo · iterar sobre feedback semanal | ≥3 profesionales completan el ciclo agendar→cobrar→documentar con pacientes reales; sin incidentes de datos |
| **4. Pre-lanzamiento** | Ago 10 – Ago 14 (sem 10) | Correcciones del piloto · B2 páginas públicas SEO · pricing definitivo · landing de venta | Checklist de compliance del Project 04 en verde |
| **5. Lanzamiento oficial** | **Lun 17 ago 2026** | Apertura de registro público + campaña outbound a full | — |

Buffer realista: si el piloto revela problemas serios, mover lanzamiento a inicios de septiembre. No lanzar sin validación legal de documentos ni sin Mercado Pago en producción probado.

Regla de la etapa 3 en adelante: mañanas construir, tardes vender. Reclutar el piloto empieza la **semana 4**, no la 6 — conseguir 5–8 profesionales toma 2+ semanas de outbound.

## Plan de primeros clientes

### Objetivos
- Fin del piloto (ago 7): 5–8 profesionales activos.
- Mes 1 post-lanzamiento (mediados sep): 15–20 profesionales pagando.
- Mes 3 (mediados nov): 40–50 pagando.
- Break-even (85–110 pagando, según adopción de cobros; ver `modelo_de_negocio.md`): meta marzo–abril 2027.

### Segmento inicial
Piloto (decisión 2026-06-09): **psicólogos, nutriólogos y fisioterapeutas independientes** en México. Los psicólogos siguen siendo el ancla del outbound (sesiones recurrentes = más citas por paciente). **Médicos entran al lanzamiento oficial**, condicionados a la revisión NOM-004 del abogado que corre en paralelo durante el piloto.

### Canales (en orden)
1. **Outbound personal**: 5–10 mensajes/día vía Instagram, directorios de psicólogos y colegios profesionales. Usar prompts P4/P5 del sistema operativo (Project 02). Nunca automatizado.
2. **Referidos del piloto**: cada piloteador satisfecho → pedir 2 introducciones. Incentivo: meses gratis.
3. **Páginas públicas SEO (B2)**: cada profesional publicado es una landing indexable que atrae pacientes → el producto se vende solo a colegas.
4. **Contenido**: 1 post/semana sobre operar consulta privada (Project 02 redacta, tú publicas).

### Oferta
- **Piloto (jul–ago)**: gratis 8 semanas + tarifa "fundador" de por vida (Básico $299 en vez de $399 MXN/mes) a cambio de feedback semanal y testimonio.
- **Lanzamiento**: Básico $399 · Pro $699 · Clínica $1,299 base + $349 por profesional adicional MXN/mes + 2.5% por cita pagada en plataforma. 14 días de prueba, sin tarjeta.

### Proceso de venta (manual, tuyo)
1. Mensaje frío (5 líneas, termina en pregunta) → 2. Demo de 20 min con datos sintéticos → 3. Email de seguimiento mismo día (prompt P5) → 4. Alta acompañada: tú lo ayudas a publicar su perfil en la primera sesión.

### Métricas semanales (Project 03, viernes)
Mensajes enviados → respuestas → demos → altas → activos pagando · citas pagadas por profesional · churn. Alarma: si demos→alta < 25% tras 10 demos, revisar oferta antes de escalar outbound.

### Riesgos principales
- Reclutar el piloto tarda más de lo esperado → empezar outbound en semana 4, no esperar al producto "perfecto".
- Validación legal se atrasa → contratar abogado esta semana (es el camino crítico más largo fuera del código).
- Mercado Pago: la aprobación de cuenta productiva puede tardar → iniciar trámite en semana 1 en paralelo al sandbox.
