# Plan: Integración Mercado Pago a Producción

**Fecha:** 2026-06-22  
**Bloqueador para:** Piloto controlado con usuarios reales  
**Esfuerzo estimado:** 4-6 horas (1h gestión + 2-3h config + 1-2h testing)

---

## Contexto actual

- ✅ MP **completamente implementado** en modo simulado
- ✅ Checkout profesional → paciente → MP → webhook → confirmación automática de cita
- ✅ Reembolso automático al cancelar citas pagadas
- ✅ Marketplace con split de comisiones por tier
- ✅ OAuth para vinculación de cuentas profesional (sin credenciales de producción)
- ❌ Sin credenciales reales: todas las transacciones son simuladas

---

## Paso 1: Crear aplicación Marketplace en MP (1h)

### 1.1 Accede a Mercado Pago
1. Ve a [**seller.mercadopago.com.mx**](https://seller.mercadopago.com.mx)
2. Login con tu cuenta (la de Fernando)
3. Ve a **Aplicaciones** → **Credenciales**

### 1.2 Crear aplicación tipo "Marketplace"
1. **Nueva aplicación**
2. **Nombre:** "Clinixa Marketplace" (o similar)
3. **Tipo:** Marketplace
4. **Descripción:** "Plataforma SaaS para profesionales de salud. Cobranza de citas, split automático por comisión."

### 1.3 Registrar URLs de callback OAuth
En la sección **Configuración de OAuth**:
- **URL de redirección:** 
  - Desarrollo: `http://localhost:3000/portal-profesional/mercadopago-callback`
  - Producción: `https://tu-dominio.mx/portal-profesional/mercadopago-callback`

### 1.4 Obtener credenciales
La app te dará:
- **Client ID** (p.ej., `1234567890123456`)
- **Client Secret** (p.ej., `abcdef1234...`) — **GUARDAR SEGURO**
- **Public Key** (para el frontend, p.ej., `APP_USR_1234...`)

**⚠️ IMPORTANTE:** Mercado Pago te genera credenciales de SANDBOX (testing) y PRODUCCIÓN. Para el piloto, usa SANDBOX primero.

---

## Paso 2: Generar credenciales de seguridad (30min)

### 2.1 ENCRYPTION_KEY (para cifrar tokens OAuth)
En terminal:
```bash
openssl rand -base64 32
```
Salida ejemplo:
```
aB1cD2eF3gH4iJ5kL6mN7oP8qR9sTuVwXyZ0aBcDeFgHiJkL==
```
**Guardar este valor.**

### 2.2 MERCADOPAGO_WEBHOOK_SECRET (para firmar webhooks)
Mercado Pago genera esto automáticamente en el dashboard:
1. Ve a **Notificaciones** → **Webhooks** en Mercado Pago
2. Localiza el webhook URL: `https://tu-api.mx/api/webhooks/mercadopago`
3. Copia el **Webhook Secret** (HMAC key)

Si no existe webhook en MP aún, lo crearemos en el paso 3.

---

## Paso 3: Configurar deployment y variables de entorno (1-1.5h)

### 3.1 Variables para desarrollo local (`.env` raíz)

```bash
# Mercado Pago — SANDBOX (testing)
MERCADOPAGO_ACCESS_TOKEN=APP_USR_<tu-sandbox-token>
MERCADOPAGO_PUBLIC_KEY=APP_USR_<tu-sandbox-public>
MERCADOPAGO_CLIENT_ID=<client-id-sandbox>
MERCADOPAGO_CLIENT_SECRET=<client-secret-sandbox>
MERCADOPAGO_WEBHOOK_SECRET=<webhook-secret-mp>
ENCRYPTION_KEY=<tu-base64-32-bytes>
```

### 3.2 Variables para producción (Azure Key Vault o similar)

```
MERCADOPAGO_ACCESS_TOKEN=APP_USR_<tu-prod-token>
MERCADOPAGO_PUBLIC_KEY=APP_USR_<tu-prod-public>
MERCADOPAGO_CLIENT_ID=<client-id-prod>
MERCADOPAGO_CLIENT_SECRET=<client-secret-prod>
MERCADOPAGO_WEBHOOK_SECRET=<webhook-secret-mp>
ENCRYPTION_KEY=<tu-base64-32-bytes>
```

### 3.3 Registrar webhook en Mercado Pago

En el dashboard de MP (Notificaciones → Webhooks):
1. **URL:** `https://tu-dominio.mx/api/webhooks/mercadopago`
2. **Eventos a escuchar:**
   - `payment.created`
   - `payment.updated`
3. **Activar webhook**

---

## Paso 4: Test end-to-end (1-2h)

### 4.1 Setup local con credenciales SANDBOX

1. Actualiza `.env` con credenciales de Mercado Pago SANDBOX
2. Reinicia la API:
   ```bash
   npm run dev:api
   ```
3. Verifica que MP está configurado:
   ```bash
   curl http://localhost:5050/health | grep -i mercado
   ```

### 4.2 Flujo completo: cita → pago → confirmación

**Persona 1: Profesional (Laura)**
1. Login como profesional en `http://localhost:3000`
2. Ve a `/portal-profesional` → Marketplace
3. Haz clic en **"Conectar Mercado Pago"**
4. Se abre OAuth → aprueba acceso a tu cuenta SANDBOX de MP
5. Vuelve a la app → debería decir **"Conectado"** con tu ID de MP

**Persona 2: Paciente (Ana)**
1. Logout → login como paciente en `http://localhost:3000`
2. Ve a `/portal-paciente`
3. Busca un profesional (Laura) y selecciona servicio con precio (p.ej., $500 MXN)
4. Elige fecha/hora disponible
5. Haz clic en **"Agendar cita"** → se crea con estado `scheduled`

**Persona 1: Profesional confirma cita (opcional)**
1. Login como Laura
2. Ve a `/portal-profesional` → Solicitudes
3. Haz clic en **"Confirmar"** en la cita de Ana
4. La cita pasa a `confirmed`

**Persona 2: Paciente paga**
1. Login como Ana
2. Ve a `/portal-paciente` → Mis citas
3. Haz clic en **"Pagar"** en la cita
4. Se abre **Checkout de Mercado Pago** (SANDBOX)
5. Usa tarjeta de prueba SANDBOX: `4111 1111 1111 1111`, exp `11/25`, CVV `123`
6. Completa el pago → regresa a la app

**Validación en la app:**
- La cita debería pasar a `confirmed` automáticamente (webhook)
- Status de pago: `approved`
- Cantidad recibida: $500 (menos comisión MP y comisión Clinixa)

**Persona 2: Paciente cancela para probar reembolso**
1. Desde `/portal-paciente` → Mis citas
2. Haz clic en **"Cancelar cita"**
3. Completa motivo
4. Cita pasa a `cancelled`
5. Pago se marca como `refunded`
6. El reembolso debería reflejarse en la cuenta SANDBOX de MP en ~5 minutos

### 4.3 Validaciones esperadas

| Punto | Esperado | Real |
|-------|----------|------|
| OAuth conecta Laura a MP | `MercadoPagoStatus = "verified"` | ✓/✗ |
| Cita se crea en estado `scheduled` | Visible en portal paciente | ✓/✗ |
| Checkout abre sin errores | Formulario MP aparece | ✓/✗ |
| Webhook recibe el pago | Cita pasa a `confirmed` automáticamente | ✓/✗ |
| Reembolso procesa | Pago marcado `refunded`, DB audita evento | ✓/✗ |
| Email de pago enviado | Log muestra confirmación (Resend real o simulado) | ✓/✗ |

---

## Paso 5: Migrar a producción (30min setup + 1h testing)

### 5.1 Cambiar a credenciales PRODUCCIÓN en MP
1. En el dashboard de MP, cambia de **SANDBOX** a **PRODUCCIÓN**
2. Obtén las nuevas credenciales (Client ID/Secret/Public Key/Access Token)
3. Actualiza **Azure Key Vault** o tu sistema de secretos

### 5.2 Registrar webhook PRODUCCIÓN
En el dashboard de MP (Producción):
- **URL:** `https://tu-dominio-produccion.mx/api/webhooks/mercadopago`
- Copiar el nuevo **Webhook Secret**

### 5.3 Desplegar a producción
1. Actualiza variables en tu hosting (Azure App Service, Vercel, etc.)
2. Redeploy de la API y web
3. Verifica `GET /health` en la URL de producción

### 5.4 Test de humo en producción
1. Profesional real conecta su cuenta MP (para recibir dinero real)
2. Paciente agenda cita con precio real
3. Paciente paga en MP real (con tarjeta verdadera)
4. Verifica que el pago refleja en su cuenta MP (demora ~24h para liquidación)

---

## Checklist de implementación

- [ ] Aplicación Marketplace creada en MP
- [ ] Credenciales SANDBOX obtenidas (Client ID, Secret, Access Token, Public Key)
- [ ] ENCRYPTION_KEY generada (`openssl rand -base64 32`)
- [ ] Webhook Secret obtenido
- [ ] Variables `.env` locales actualizadas
- [ ] API reiniciada y `GET /health` responde bien
- [ ] Test OAuth: profesional conecta a MP SANDBOX
- [ ] Test cita: paciente agenda cita con precio
- [ ] Test pago: paciente paga en checkout de MP SANDBOX
- [ ] Test webhook: cita se confirma automáticamente tras pago
- [ ] Test reembolso: cancelación marca pago como `refunded`
- [ ] Credenciales PRODUCCIÓN obtenidas
- [ ] Variables en Azure Key Vault actualizadas
- [ ] Webhook PRODUCCIÓN registrado en MP
- [ ] Deploay a producción ejecutado
- [ ] Test de humo en producción completado

---

## Notas de seguridad

1. **Client Secret nunca en código:** Almacena en Key Vault, no en git
2. **Webhook Secret:** Crítico para validar que los webhooks vienen de MP
3. **ENCRYPTION_KEY:** Genera nueva para cada ambiente; nunca reutilizar entre desarrollo y producción
4. **Tarjetas de prueba SANDBOX:**
   - Débito: `4111 1111 1111 1111`
   - Crédito: `5555 5555 5555 4444`
   - Expiry: cualquiera futura
   - CVV: 3 dígitos cualquiera

---

## Contactos útiles

- **Docs MP:** https://developer.mercadopago.com.mx
- **Soporte MP:** https://www.mercadopago.com.mx/ayuda
- **API Reference:** https://developer.mercadopago.com/es/reference

