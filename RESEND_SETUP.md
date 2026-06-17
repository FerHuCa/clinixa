# Configuración de Resend (email transaccional)

**Estado:** infraestructura lista en código (`apps/api/Infrastructure/EmailSender.cs`). Sin `RESEND_API_KEY`, los envíos degradan a `[EMAIL SIMULADO]` en el log y nada se rompe. Esta guía conecta envíos reales.

## Qué envía hoy el sistema (best-effort, todos vía `EmailSender.SendAsync`)

- Invitación de clínica + recordatorio (`BuildInvitationEmail`)
- Cita confirmada / recordatorio / cancelada (`BuildAppointment*Email`)
- **Cédula en revisión** (`BuildVerificationPendingEmail`) — nuevo, 2026-06-17

## Claves de configuración que lee el código

| Clave (appsettings) | Variable de entorno | Default | Uso |
|---------------------|---------------------|---------|-----|
| `Resend:ApiKey` | `RESEND_API_KEY` | — (sin esto → simulado) | Autenticación con Resend |
| `Resend:From` | `RESEND_FROM` | `Clinixa <invitaciones@healthhub.mx>` | Remitente de los correos |
| `Web:BaseUrl` | `WEB_BASE_URL` | `http://localhost:3000` | Base de los enlaces en los correos |

Referencia en código: `EmailSender.cs:14-15`.

## Pasos

### 1. Crear cuenta y verificar dominio
1. Regístrate en [resend.com](https://resend.com).
2. **Domains → Add Domain** → ingresa el dominio real del producto (ej. `clinixa.mx`). Requiere haber registrado el dominio primero (ver `marketplace-plan` / decisión de marca pendiente).
3. Resend muestra registros **DNS** (TXT para SPF, CNAME/TXT para DKIM, opcional DMARC). Agrégalos en el panel DNS de tu registrador (Namecheap, Cloudflare, etc.).
4. Espera la verificación (minutos a horas). El dominio debe quedar en estado **Verified** antes de enviar en producción.

### 2. Crear API key
1. **API Keys → Create API Key**, permiso *Sending access*.
2. Copia el valor `re_...` (solo se muestra una vez).

### 3. Configurar el remitente
- Usa una dirección **del dominio verificado**: ej. `Clinixa <no-reply@clinixa.mx>`.
- No uses Gmail/Outlook como `From`: Resend solo firma dominios verificados.

### 4. Inyectar los secretos (NO commitear)

**Local (dev):** exporta antes de `npm run dev:api`:
```bash
export RESEND_API_KEY="re_xxxxxxxxxxxx"
export RESEND_FROM="Clinixa <no-reply@clinixa.mx>"
export WEB_BASE_URL="http://localhost:3000"
```

**Producción (Azure App Service):** `Configuration → Application settings`, o mejor **Azure Key Vault** + referencia:
```
Resend__ApiKey   = @Microsoft.KeyVault(SecretUri=...)
Resend__From     = Clinixa <no-reply@clinixa.mx>
Web__BaseUrl     = https://app.clinixa.mx
```
(En env vars de .NET, el separador de sección `:` se escribe `__`.)

### 5. Probar
```bash
# Con la API corriendo y RESEND_API_KEY exportada:
# dispara un email real cambiando la cédula de un profesional (→ "cédula en revisión")
curl -s -X PATCH http://localhost:5050/api/professional-portal/profile \
  -H "X-HealthHub-Dev-User: usr-laura-vega" -H "Content-Type: application/json" \
  -d '{"displayName":"Laura Vega","bio":"...20+ chars...","location":"CDMX","specialty":"nutritionist","appointmentMode":"hybrid","basePrice":700,"licenseNumber":"NUEVA-CEDULA-123"}'
# Revisa el log: debe decir envío real (no [EMAIL SIMULADO]) y el correo llega a la bandeja del profesional.
```
> Nota: cambiar la cédula resetea `VerificationStatus` a `pending` (despublica al profesional hasta nueva verificación admin). En dev, re-verifica con el panel `/seguridad` o re-seed.

## Pendiente externo (no es código)
- Registrar el dominio de marca definitivo (bloquea la verificación de Resend).
- Plantillas HTML definitivas (hoy son inline en `EmailSender.cs`, suficientes para MVP).
- Considerar un **monto/volumen**: el plan gratuito de Resend cubre el piloto; revisar límites al escalar.
