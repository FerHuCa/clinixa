# Plan legal y financiero — Clinixa

Fecha: 2026-06-09. Complementa `plan-lanzamiento.md`. Nada de esto es asesoría legal/fiscal: cada paso se valida con abogado y contador.

## 1. Ruta legal (escalera)

| Etapa | Cuándo | Figura | Notas |
|---|---|---|---|
| Piloto | Ahora | **Persona física con actividad empresarial** (o RESICO) | Alta gratuita en SAT. Suficiente para facturar y abrir cuenta Mercado Pago. Respondes con patrimonio personal. |
| Lanzamiento | Jul–Ago 2026 | **SAS** | Gratuita, en línea ([gob.mx/tuempresa](https://www.gob.mx/tuempresa/articulos/crea-tu-sociedad-por-acciones)), 1 accionista, sin notario. Límite de ingresos 2026: ~$7.68M MXN/año. Desde 2026 el RFC y e.firma de la SAS se tramitan presencialmente. Requiere e.firma personal vigente. |
| Inversión / escala | 2027+ | **S.A.P.I. de C.V.** | Transformación con notario (~$15–30k MXN). Es la figura que piden inversionistas. |

## 2. Abogado (camino crítico — iniciar esta semana)

Perfil: privacidad de datos / salud digital. Alcance del encargo:

1. Validar aviso de privacidad, términos y consentimiento de datos de salud (ya en el repo como plantillas, rutas `/aviso-privacidad` y `/terminos`).
2. Definir rol de HealthHub como responsable vs. encargado del tratamiento (LFPDPPP) frente a profesionales y pacientes.
3. Revisar deslinde por comunicación vía WhatsApp (fuera de plataforma, no urgencias, no forma parte del expediente) y limitación de responsabilidad clínica. (El chat propio fue eliminado el 2026-06-09.)
4. Confirmar aplicabilidad de NOM-024 al alcance del piloto (psicólogos/nutriólogos/fisios) **y revisar NOM-004 para la entrada de médicos al lanzamiento oficial** — esta revisión corre en paralelo durante el piloto y es prerrequisito para abrir el segmento médico.

Costo estimado: $15,000–40,000 MXN una vez. Plazo: 2–4 semanas. **No lanzar sin esto.**

## 3. Mercado Pago — cuenta productiva (iniciar en paralelo a A1)

- Requisitos: cuenta verificada (identidad), RFC y régimen fiscal, cuenta bancaria vinculada. La activación puede tardar días–semanas.
- **Decisión de arquitectura pendiente (validar con contador antes de implementar A1):**
  - Opción A — pagos entran a cuenta HealthHub y se dispersa a profesionales: convierte a HealthHub en intermediario de fondos (mayor carga fiscal/regulatoria). Evitar.
  - Opción B (recomendada) — **modo marketplace con OAuth**: cada profesional conecta su propia cuenta MP, el paciente le paga directo y HealthHub cobra su 2.5% como `application_fee`. Simplifica impuestos y riesgo.
- Comisión MP: ~3.5% + IVA por transacción (sin costo fijo).

## 4. Pasos financieros en orden

1. e.firma personal vigente (SAT).
2. Alta como persona física con actividad empresarial / RESICO.
3. Contador desde el primer mes con ingresos (~$1,500–3,000 MXN/mes). Emisión de CFDI por cada suscripción.
4. Cuenta bancaria separada para el negocio.
5. Cuenta Mercado Pago productiva (trámite en semana 1 de Fase A).
6. Constituir SAS antes del lanzamiento oficial.
7. Encargo del abogado (corre en paralelo desde ya).

## 5. Inversión inicial estimada (lanzamiento + 6 meses)

| Concepto | MXN aprox. |
|---|---|
| Abogado (una vez) | 15,000–40,000 |
| SAS constitución | 0 |
| Contador (6 meses) | 9,000–18,000 |
| Azure (6 meses) | 12,000–30,000 |
| Clerk, Resend, dominio, misc | 3,000–8,000 |
| Mercado Pago | 0 fijo (% por transacción) |
| **Total** | **~$40,000–95,000** |

Referencia: break-even (~100 profesionales ≈ $70k MXN/mes) cubre este monto en ~1 mes una vez alcanzado.

## 6. Checklist de seguimiento

- [ ] Cotizar 2–3 abogados de privacidad/salud digital (esta semana)
- [ ] Verificar e.firma vigente
- [ ] Alta SAT actividad empresarial / RESICO
- [ ] Iniciar verificación de cuenta Mercado Pago
- [ ] Decisión marketplace (Opción B) validada con contador
- [ ] Contratar contador
- [ ] Constituir SAS (julio)
- [ ] Documentos legales validados antes del 14 de agosto
