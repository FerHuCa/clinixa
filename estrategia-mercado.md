# Estrategia de mercado — Clinixa

Fecha: 2026-06-09. Complementa `modelo_de_negocio.md` (v2.0) y `plan-lanzamiento.md`. Responde dos preguntas: cómo ganar mercado en México y cómo monetizar cuando la mayoría de las consultas se cobran en efectivo.

## 1. Realidad del mercado

- ~80% de las transacciones cotidianas en México siguen siendo en efectivo, aunque >50% de usuarios de smartphone ya usa billeteras digitales. El gobierno lanza un ecosistema unificado de pagos digitales en septiembre 2026 (modelo India/Brasil). El viento sopla a favor del pago digital, pero el efectivo dominará los próximos 2-3 años.
- **Palanca fiscal clave:** las consultas médicas/psicológicas solo son deducibles ante el SAT si se pagan por medios electrónicos. Esto convierte el pago en línea en un beneficio para el *paciente*, no solo para la plataforma.
- Competidor principal: Doctoralia (caro para independientes, quejas por aumentos frecuentes, enfocado en visibilidad más que en operación). El espacio "operar tu consulta completa a precio de independiente" está abierto.

**Conclusión estratégica:** no pelear contra el efectivo. Diseñar el modelo para que HealthHub gane dinero aunque el 100% de las citas se cobre en efectivo, y tratar cada cobro digital adicional como upside.

## 2. Estrategia de adquisición de mercado

### Posicionamiento

Contra Doctoralia: "ellos te venden visibilidad; nosotros te organizamos la consulta entera por la mitad del precio". Contra WhatsApp+Excel: "deja de perseguir pagos y confirmaciones". El diferenciador de confianza es la **verificación de cédula profesional** — usarlo en todo el marketing.

### Playa de desembarco: salud y bienestar independiente en 3 ciudades

No "México" como mercado: CDMX, Guadalajara y Monterrey concentran la mayor densidad de consulta privada. Piloto (decisión 2026-06-09): **psicólogos, nutriólogos y fisioterapeutas**, con psicólogos como ancla del outbound (sesiones recurrentes = más volumen). **Médicos entran al lanzamiento oficial**, tras la revisión NOM-004 del abogado que corre en paralelo al piloto.

### Canales, en orden de costo-eficiencia

1. **Outbound personal (ya en `plan-lanzamiento.md`)** — 5-10 mensajes/día vía Instagram y directorios. Añadir: pescar específicamente psicólogos que ya publican su disponibilidad en historias de Instagram o usan linktree — ya demostraron dolor de agendamiento.
2. **Referidos con incentivo en cascada** — cada profesional activo que refiere: 1 mes gratis por alta convertida; el referido recibe tarifa fundador. Los psicólogos están agrupados (supervisión, colegios, generaciones de universidad): un cliente satisfecho llega a 10.
3. **SEO de perfiles públicos (B2)** — cada profesional publicado = landing indexable (`/profesionales/laura-vega-psicologa-cdmx`). El paciente que llega por Google y agenda es valor que Doctoralia cobra aparte; aquí va incluido. Comunicarlo así: "te regalamos lo que Doctoralia te cobra".
4. **Alianzas institucionales (nuevo)** — colegios de psicólogos estatales, maestrías/especialidades (egresados que abren consulta privada = cliente ideal sin vicios de herramienta previa), y supervisores clínicos que influyen en grupos de 8-15 terapeutas. Oferta: descuento de grupo o webinar "cómo profesionalizar tu consulta privada".
5. **Contenido con ángulo fiscal y operativo** — 1 post/semana ya planeado. Priorizar temas que nadie cubre para psicólogos: "cómo facturar tus sesiones", "qué pasa con tus notas clínicas ante la ley", "cómo cobrar anticipos sin incomodar". Esto posiciona y precalifica.

### Oferta de entrada

Mantener lo definido: piloto gratis 8 semanas + tarifa fundador ($299 de por vida), lanzamiento con trial de 14 días sin tarjeta. Añadir garantía de migración: "te ayudamos a pasar tus pacientes desde Excel/WhatsApp en una sesión de 30 min" — la migración de datos es la fricción #1 de cambio de herramienta.

## 3. Monetización con efectivo como realidad dominante

Principio: **la suscripción es el negocio; la comisión es el upside.** El modelo financiero ya lo refleja (escenario conservador 40% de citas en plataforma); esta estrategia lo lleva más lejos: el producto debe ser rentable incluso con 0% de cobro en línea.

### 3.1 Registrar el efectivo, no ignorarlo

Agregar al producto el **registro de cobros en efectivo** (un tap: "cobrada en efectivo" al completar cita). Sin comisión. Beneficios:

- El profesional ve TODOS sus ingresos en el panel → el panel de ingresos se vuelve indispensable aunque nunca cobre en línea → retención de suscripción.
- HealthHub obtiene el dato real de % efectivo vs digital por profesional → permite vender la migración a digital con números del propio usuario ("pierdes X por no-shows en citas sin anticipo").
- Habilita reportes fiscales y CFDI sobre todos los ingresos (add-on).

Es un cambio menor de producto (estado de pago en `appointment`) con impacto alto en retención. Candidato a Fase 2.

### 3.2 Anticipo parcial: el caballo de Troya del pago digital

No pedir el pago completo en línea (fricción alta); pedir **anticipo configurable** ($100-200) para confirmar la cita, y el resto en efectivo en consulta. Argumentos:

- Para el profesional: mata el no-show (el argumento de venta más fuerte; un no-show de $650 paga 1.5 meses de plan Básico).
- Para HealthHub: comisión del 2.5% + pasarela sobre el anticipo. Menos ingreso por cita que el pago completo, pero sobre un % de adopción mucho mayor.
- Para el paciente: monto bajo, OXXO/SPEI disponibles vía Mercado Pago (no requiere tarjeta).

Con el tiempo, profesionales que adoptan anticipos migran naturalmente al cobro completo.

### 3.3 Paquetes prepagados de sesiones

Ya en Fase 3. Subrayar su rol anti-efectivo: un paquete de 4 sesiones con 10% de descuento se paga **una vez, en línea** ($2,340) y se consume en consultas. Convierte 4 cobros en efectivo en 1 cobro digital grande con comisión, y ata al paciente 4 semanas (retención del paciente → retención del profesional).

### 3.4 La carta fiscal

Campaña dirigida a ambos lados: "tu paciente solo puede deducir la terapia si paga por medios electrónicos". El profesional que ofrece pago en línea + CFDI atrae pacientes que deducen (los de mayor ticket). HealthHub empaqueta: pago en línea + factura automática (Facturama) = add-on "Cobro fiscal" (~$149/mes o $10 por factura). Nadie más lo está vendiendo así a psicólogos.

### 3.5 Otras fuentes de ingreso (más allá de comisión)

| Fuente | Mecánica | Fase |
|---|---|---|
| Automatización WhatsApp (Básico) | Add-on ~$99/mes; incluida en Pro vía Business API del propio profesional. Reduce no-shows también en citas de efectivo → valor sin depender del pago en línea. El botón wa.me es gratis en todos los planes (el chat propio fue eliminado) | 3 |
| Facturación CFDI | Add-on por suscripción o por factura emitida | 3 |
| Perfil destacado | Cuando haya tráfico SEO real; cobrar posición, no presencia | 5 |
| Plan Clínica por asiento | Ya definido; activar comercialmente cuando 2+ piloteadores pregunten por equipo | 3 |
| SPEI/CoDi con QR en consultorio | Cobro digital presencial sin terminal ni comisión de tarjeta; HealthHub registra y concilia. Vigilar el ecosistema de pagos de sept 2026 para integrarse temprano | 3-4 |
| Adelanto de ingresos (futuro) | Con historial de cobros en plataforma, adelantar flujo al profesional por una comisión. Solo con volumen y socio financiero | Post-5 |

### 3.6 Qué NO hacer

- No forzar "confirmación solo con pago" como única opción: en un mercado 80% efectivo expulsa al cliente. Debe ser configurable por el profesional.
- No subsidiar la comisión de pasarela: el ~6.5% efectivo ya está al límite; absorberlo destruye margen.
- No lanzar marketplace abierto para "generar demanda" antes de tener oferta: el plan vigente ya lo difiere, sostenerlo.

## 4. Impacto en el modelo financiero

Con registro de efectivo + anticipos, el ARPU se recompone:

| Componente | Conservador actual | Con esta estrategia |
|---|---:|---:|
| Suscripción | $529 | $529 |
| Comisión (40% citas completas) | $260 | — |
| Comisión (anticipos en 60% de citas, $150 prom.) | — | ~$90 |
| Comisión (20% citas completas) | — | ~$130 |
| Add-ons (WhatsApp/CFDI, 30% adopción) | — | ~$60 |
| **Total ARPU** | **$789** | **~$809** |

ARPU similar pero con supuestos mucho menos frágiles: la adopción de un anticipo de $150 es más creíble que la del cobro completo de $650. El break-even (~85-110 profesionales) no cambia; cambia la probabilidad de alcanzarlo.

## 5. Métricas nuevas a medir desde el piloto

- % de citas con anticipo vs pago completo vs efectivo puro (sustituye la métrica única de "% cobrado en plataforma").
- No-shows en citas con anticipo vs sin anticipo (el dato que vende Pro y anticipos).
- Adopción del registro de efectivo (proxy de que el panel de ingresos retiene).
- Altas por referido vs outbound (decide dónde invertir tiempo comercial).

## 6. Resumen ejecutivo

Ganar mercado: psicólogos, nutriólogos y fisioterapeutas en 3 ciudades (médicos al lanzamiento, tras NOM-004), outbound + referidos en cascada + SEO de perfiles + alianzas con colegios y maestrías, posicionados contra Doctoralia por precio/operación y contra WhatsApp por cobro y no-shows. Monetizar con efectivo: la suscripción es el negocio base; registrar el efectivo para retener; anticipos parciales como puente al pago digital; paquetes prepagados y la palanca fiscal (deducibilidad + CFDI) como conversores; add-ons (WhatsApp, CFDI, destacados) como ARPU adicional que no depende de cómo cobra el profesional.
