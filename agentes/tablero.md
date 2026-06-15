# Tablero de agentes — estado actual

Última actualización: 2026-06-09

| Frente | Herramienta principal | Estado | Siguiente acción | Bloqueado por |
|---|---|---|---|---|
| 01 Producto & Ingeniería | Claude Code | MVP funcional local; Clerk integrado; consentimiento listo | Prueba E2E real de Clerk, luego A1 Mercado Pago (`plan-fases-a-b.md`) | — |
| 02 Ventas & Marketing | Chat · Project 02 | Estrategia definida en `estrategia-mercado.md` (3 ciudades, 3 verticales) | Crear Project, lista de 50 prospectos (psicólogos ancla + nutriólogos/fisios) | Tener demo desplegada |
| 03 Finanzas & Métricas | Chat · Project 03 | Sin iniciar | Crear Project, hoja de métricas semanal vacía | — |
| 04 Compliance & Datos | Chat · Project 04 | Aviso de privacidad y términos en plantilla (pendiente abogado) | Cotizar 2–3 abogados esta semana; encargo ahora incluye NOM-004 (médicos al lanzamiento) y deslinde WhatsApp | Contratar abogado |
| 05 Legal & Finanzas setup | Cowork / tú | Plan definido en `plan-legal-financiero.md` | e.firma → alta SAT → cuenta MP productiva → decisión marketplace con contador → SAS en julio | — |

## Subagentes Claude Code (Project 01)

| Subagent | Último uso | Notas |
|---|---|---|
| spec-writer | — | Usar para specs de A1–A4 y B1–B3 |
| implementer | — | Features según spec |
| reviewer | — | Obligatorio en auth/pagos/permisos/datos de pacientes |
| security-auditor | — | Correr antes del deploy del piloto |

## Decisiones recientes clave
- 2026-06-09: IA fuera del MVP; pasa a la fase de IA (Fase 4 tras la renumeración de `modelo_de_negocio.md` v2.0).
- 2026-06-09: Clerk como auth de producción; Mercado Pago sobre Stripe para México.
- 2026-06-09: Plan A/B formalizado en `plan-fases-a-b.md`.
- 2026-06-09: Trial 14 días · Clínica $1,299 + $349/asiento · comisión 2.5%.
- 2026-06-09: Chat propio eliminado; B3 = conexión WhatsApp (wa.me en Básico, Business API en Pro/Fase 3).
- 2026-06-09: Piloto con psicólogos + nutriólogos + fisioterapeutas; médicos al lanzamiento tras NOM-004.
- 2026-06-09: `estrategia-mercado.md` creado (efectivo como realidad: registro de efectivo, anticipos parciales, paquetes prepagados, palanca fiscal CFDI).

## Abiertas para la próxima sesión
1. E2E real de Clerk (bloqueador) → luego A1 Mercado Pago.
2. Comisión 2.5%: ¿todos los planes o Pro exento?
3. Precios de add-ons (WhatsApp ~$99, CFDI ~$149: hipótesis).
4. ¿Anticipo parcial dentro del alcance de A1?
5. Recalcular simulación financiera por segmento (ticket/frecuencia distintos a psicólogos).
6. Retirar `/chat` del frontend (parte de B3).
