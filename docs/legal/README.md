# Documentos legales - Clinixa

Fuente canónica de los documentos legales publicados en la plataforma. Las rutas públicas
`/privacy` y `/terms` (apps/web) renderizan estos archivos markdown directamente.

| Documento | Archivo | Versión vigente | Fecha |
|---|---|---|---|
| Aviso de Privacidad Integral | `aviso-de-privacidad.md` | 1.0 | 2026-06-10 |
| Términos y Condiciones de Uso | `terminos-y-condiciones.md` | 1.0 | 2026-06-10 |

## Reglas de versionado

1. Cada cambio sustancial incrementa la versión (`1.0` → `1.1` o `2.0`) y actualiza la fecha.
2. La versión del documento debe coincidir con `ConsentDocuments` en `apps/api/Program.cs`
   (`PrivacyVersion` / `TermsVersion`). Un cambio de versión obliga a los usuarios a
   re-aceptar: el historial en `user_consents` nunca se sobrescribe, se agrega una fila nueva.
3. No publicar a usuarios reales sin validación de abogado mexicano (ver pendientes abajo).

## Placeholders pendientes (NO inventar valores)

Información corporativa — aparecen en ambos documentos:

| Token operativo | Texto en documentos | Estado |
|---|---|---|
| `[RAZON_SOCIAL]` | `[RAZÓN SOCIAL COMPLETA]` | Pendiente |
| `[DOMICILIO_LEGAL]` | `[DOMICILIO COMPLETO]` | Pendiente |
| `[RFC]` | (identidad fiscal, ver nota de campos pendientes) | Pendiente |
| `[EMAIL_PRIVACIDAD]` | `[CORREO DE PRIVACIDAD]` | Pendiente |
| `[EMAIL_LEGAL]` | `[CORREO LEGAL]` | Pendiente |
| `[TELEFONO_CONTACTO]` | (no referenciado aún; agregar al definir soporte telefónico) | Pendiente |
| — | `[CORREO DE SOPORTE]` | Pendiente |
| — | `[CIUDAD Y ENTIDAD FEDERATIVA]` (jurisdicción) | Pendiente |
| — | `[ÁREA O PERSONA RESPONSABLE DE PRIVACIDAD]` | Pendiente |

Políticas comerciales (sección 13/14 de Términos) — definir antes de habilitar pagos:

- `[POLITICA_CANCELACION]` — ventana y penalización de cancelación.
- `[POLITICA_REEMBOLSO]` — criterios y plazos de reembolso.
- `[POLITICA_NO_SHOW]` — cargo o regla por inasistencia.
- `[COMISION_PLATAFORMA]` — % de comisión por cita cobrada en línea.

Proveedores definitivos — confirmar y documentar en la lista interna de encargados (sección 13 del Aviso):

- `[PROVEEDOR_CLOUD]` — infraestructura/hosting.
- `[PROVEEDOR_EMAIL]` — correo transaccional.
- `[PASARELA_PAGOS]` — candidato: Mercado Pago (sin confirmar contrato).
- `[PROVEEDOR_FACTURACION]` — facturación CFDI.

## IA futura (no implementar todavía)

Pendientes con TODO en código y documentos (sección 22 del Aviso, sección 23 de Términos):

- TODO: Consentimiento IA (`ConsentDocuments`, tipo nuevo de consentimiento específico).
- TODO: Transcripción de sesiones (Whisper u otro proveedor).
- TODO: Integración OpenAI/Anthropic para borradores.
- TODO: SOAP asistido con revisión obligatoria del profesional antes de guardar.
