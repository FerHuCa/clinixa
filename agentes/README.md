# Agentes — Seguimiento y forma de trabajo

Carpeta para dar seguimiento al trabajo de los "agentes" (Projects de Claude Chat, sesiones de Cowork y subagentes de Claude Code) de Clinixa.

## Estructura

```
agentes/
├── README.md                      ← esta guía
├── tablero.md                     ← estado actual de cada frente (se actualiza cada sesión)
├── sistema_operativo_claude.md    ← referencia: cómo opera la empresa de 1 persona con Claude
└── bitacoras/
    ├── 01-producto-ingenieria.md
    ├── 02-ventas-marketing.md
    ├── 03-finanzas-metricas.md
    └── 04-compliance-datos.md
```

Regla: los chats son desechables; las bitácoras son la memoria. Toda decisión importante tomada en cualquier herramienta se anota en la bitácora correspondiente antes de cerrar la sesión.

## Qué herramienta usar para qué

### Claude Chat (Projects) — pensar y redactar
- 4 Projects: **01 Producto & Ingeniería**, **02 Ventas & Marketing**, **03 Finanzas & Métricas**, **04 Compliance & Datos** (instrucciones listas para copiar en `sistema_operativo_claude.md`, sección 3).
- Úsalo para: specs, copy de ventas, análisis de métricas, revisión de compliance, decisiones de roadmap.
- Sube a cada Project los documentos listados en la sección 4 del sistema operativo (`modelo_de_negocio.md`, pricing, etc.).
- Nunca subas datos reales de pacientes ni exports de la base.

### Claude Code — construir
- Trabaja sobre este repo. Es donde se ejecuta el `plan-fases-a-b.md`.
- Subagentes (solo Project 01): `spec-writer`, `implementer`, `reviewer`, `security-auditor`.
- Todo código que toque auth, pagos, permisos o datos de pacientes pasa por `reviewer` + tu lectura antes de merge.
- `security-auditor` corre antes de cada release.
- Al cerrar sesión: actualizar `seguimiento-proyecto.md` (avance técnico) y `bitacoras/01-producto-ingenieria.md` (decisiones).

### Cowork — operar el negocio
- Tareas con archivos del repo que no son código: actualizar bitácoras, generar reportes semanales, preparar presentaciones/demos, hojas de métricas, documentos legales borrador.
- Útil para el cierre de viernes (métricas) y la revisión quincenal de compliance.
- También para orquestar: leer el repo completo, cruzar documentos y planear (como esta sesión).

## Flujo semanal (resumen)

| Día | Herramienta | Acción |
|---|---|---|
| Lunes (45 min) | Chat · Project 01 | Planeación: elegir máx. 3 entregables + 1 meta de ventas |
| Mar–Jue mañanas | Claude Code | Construir features del plan A/B |
| Mar–Jue tardes | Chat · Project 02 | 5–10 mensajes outbound/día + demos |
| Viernes (60 min) | Cowork + Project 03 | Actualizar métricas, revisión semanal, anotar decisiones en bitácoras |
| Quincenal (30 min) | Chat · Project 04 | Checklist de compliance sobre lo construido |

Si hay que elegir entre construir y vender: **vende**.

## Reglas duras
1. Datos reales de pacientes jamás entran a Claude (ninguna herramienta). Debug con datos sintéticos.
2. Deploy a producción y envío final de emails: siempre tú.
3. No crear más Projects ni agentes que los listados.
4. Outbound manual y personalizado, nunca automatizado.
