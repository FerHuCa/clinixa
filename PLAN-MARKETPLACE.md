# Plan: Mercado Pago Marketplace con Comisiones Variables

**Objetivo:** Cada profesional usa su propia cuenta MP. Sistema cobra comisión variable según tier de licencia.

> **CAMBIO DE ARQUITECTURA (2026-06-11, Fase 3):** se adoptó el modelo oficial de
> split de pagos de MP con `marketplace_fee` en lugar de transfers manuales. La
> preferencia de pago se crea **con el access token OAuth del profesional** e incluye
> `marketplace_fee`: el dinero del paciente llega DIRECTO a la cuenta MP del
> profesional y MP acredita la comisión a la plataforma automáticamente. No hay
> transfers que puedan fallar ni dinero ajeno retenido. Las secciones de "transfer"
> más abajo quedan como registro histórico; `Payment.TransferStatus` se reutiliza
> para registrar si el split se aplicó.

**Arquitectura (actualizada):**
```
Paciente paga $100 (preferencia creada con token OAuth del profesional + marketplace_fee)
    ↓
Cuenta MP del PROFESIONAL recibe $100 - comisión - fee MP
Tu cuenta MP recibe la comisión (ej: 15% = $15) automáticamente
```

**Avance:**
- ✅ Fase 1-2 (2026-06-11): entidades, migración `202606120001_MarketplaceSetup`, seed de tiers
- ✅ Fase 3 (2026-06-11): `TokenEncryptionService` (AES-256-GCM) + `MercadoPagoMarketplaceService` (OAuth completo, state firmado anti-CSRF, preferencia marketplace, modo simulado)
- ⬜ Fase 4: endpoints (connect, callback, admin)
- ✅ Fase 5 (2026-06-12): checkout marketplace con comisión por tier + refresh proactivo del token, webhook que marca el split (`TransferStatus` pending→completed al aprobar, completed→reversed al reembolsar), y job en segundo plano `MercadoPagoTokenRefreshService` que renueva tokens OAuth por vencer
- ✅ Fase 6 (2026-06-12): UI del profesional `MarketplacePanel` en `/seguridad` (estado conectar/pending/verified/rejected) sobre `loadMarketplaceStatus`/`connectMarketplace`
- ✅ Fase 7 (2026-06-12): UI de admin `MarketplaceAdminPanel` en `/seguridad` (lista de pendientes + verificar/rechazar) y bloque de pruebas de integración marketplace en `scripts/test-api.mjs` (connect/callback OAuth simulado, tamper del state firmado, permisos de la lista, verify y checkout con split + webhook)

---

## Fase 1: Entidades y Base de Datos

### 1.1 Crear `ProfessionalMercadoPago.cs`
**Ubicación:** `apps/api/Entities/ProfessionalMercadoPago.cs`

```csharp
namespace HealthHub.Api.Entities;

public sealed class ProfessionalMercadoPago
{
    public string Id { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    // Mercado Pago user_id del profesional
    public string MercadoPagoUserId { get; set; } = string.Empty;
    // Estado: pending | verified | rejected
    public string Status { get; set; } = "pending";
    // Email registrado en MP
    public string Email { get; set; } = string.Empty;
    // Nombre de cuenta en MP
    public string AccountHolderName { get; set; } = string.Empty;
    // CLABE/CBU para verificación (encriptado en BD)
    public string BankAccountEncrypted { get; set; } = string.Empty;
    
    public DateTimeOffset ConnectedAt { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
}
```

### 1.2 Crear `CommissionTier.cs`
**Ubicación:** `apps/api/Entities/CommissionTier.cs`

```csharp
namespace HealthHub.Api.Entities;

public sealed class CommissionTier
{
    public string Id { get; set; } = string.Empty;
    // Ej: "psychologist", "nutritionist", "general"
    public string LicenseType { get; set; } = string.Empty;
    // Ej: 15.0 para 15%
    public decimal CommissionPercentage { get; set; }
    // min_appointments para aplicar tier
    public int MinAppointmentsThreshold { get; set; } = 0;
    public string Status { get; set; } = "active";
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

### 1.3 Extender `Payment.cs`
Agregar campos:
```csharp
public string? MercadoPagoTransferId { get; set; } // ID de transfer a profesional
public string? TransferStatus { get; set; } = "pending"; // pending | completed | failed
public decimal CommissionAmount { get; set; } // Tu comisión
public decimal ProfessionalAmount { get; set; } // Del profesional
public decimal CommissionPercentage { get; set; } // % aplicado
```

### 1.4 Actualizar `Professional.cs`
Agregar:
```csharp
public string? MercadoPagoAccountId { get; set; }
public string MercadoPagoStatus { get; set; } = "not_connected"; // not_connected | pending | verified | rejected
```

### 1.5 Agregación en `HealthHubDbContext.cs`
```csharp
public DbSet<ProfessionalMercadoPago> ProfessionalMercadoPagos => Set<ProfessionalMercadoPago>();
public DbSet<CommissionTier> CommissionTiers => Set<CommissionTier>();
```

---

## Fase 2: Migración de Base de Datos

**Archivo:** `apps/api/Migrations/202606120001_MarketplaceSetup.cs`

Crear fields en `professionals`:
- `mercado_pago_account_id` VARCHAR(120)
- `mercado_pago_status` VARCHAR(40) DEFAULT 'not_connected'

Crear tabla `professional_mercado_pagos`:
- PK: id
- FK: professional_id
- unique(professional_id)
- Campos del entity

Crear tabla `commission_tiers`:
- PK: id
- Campos del entity

Extender tabla `payments`:
- `mercado_pago_transfer_id` VARCHAR(120)
- `transfer_status` VARCHAR(40)
- `commission_amount` DECIMAL(12,2)
- `professional_amount` DECIMAL(12,2)
- `commission_percentage` DECIMAL(5,2)

---

## Fase 3: Servicio MercadoPago Marketplace

**Archivo:** `apps/api/Infrastructure/MercadoPagoMarketplaceService.cs`

```csharp
public sealed class MercadoPagoMarketplaceService(
    IConfiguration configuration,
    ILogger<MercadoPagoMarketplaceService> logger,
    HttpClient httpClient)
{
    // 1. OAuth: Obtener cuenta del profesional
    public async Task<string?> GetAuthorizationUrlAsync(
        string professionalId, 
        string redirectUrl)
    {
        // URL para que profesional autorice su cuenta MP
        var clientId = configuration["MercadoPago:ClientId"];
        return $"https://auth.mercadopago.com/authorization?client_id={clientId}&response_type=code&platform_id=mp&redirect_uri={redirectUrl}&state={professionalId}";
    }

    // 2. Canjear código por access token del profesional
    public async Task<(string accessToken, string userId)?> ExchangeAuthCodeAsync(string code)
    {
        // POST a https://api.mercadopago.com/oauth/token
        // Retorna { access_token, user_id }
    }

    // 3. Transferir dinero a profesional después de pago
    public async Task<string?> TransferToProfessionalAsync(
        string accessTokenProfesional,
        decimal amount,
        string externalRef)
    {
        // POST a https://api.mercadopago.com/v1/transfers
        // Con bearer = accessTokenProfesional
        // Retorna transfer_id
    }

    // 4. Consultar estado de transfer
    public async Task<(string status, string? errorMsg)?> GetTransferStatusAsync(
        string accessTokenProfesional,
        string transferId)
    {
        // GET transfer status
    }
}
```

---

## Fase 4: Endpoints API

### 4.1 Profesional: Conectar Mercado Pago
**Endpoint:** `PATCH /api/professional-portal/marketplace/connect`

```csharp
// Profesional pide su authorization URL
Response:
{
  "authorizationUrl": "https://auth.mercadopago.com/...",
  "redirectUri": "https://tuapp.com/professional/marketplace-callback"
}
```

### 4.2 Profesional: Callback de MP (OAuth)
**Endpoint:** `GET /professional/marketplace-callback?code=...&state=prof_xxx`

- Canjear código por access_token del profesional
- Guardar en `ProfessionalMercadoPago` con status="pending"
- Verificar cuenta (si MP requiere)
- Redirigir a dashboard

### 4.3 Admin: Listar profesionales pendientes de verificación
**Endpoint:** `GET /api/admin/marketplace/pending`

```csharp
Response:
[
  {
    "professionalId": "prof_123",
    "name": "Dr. García",
    "mercadoPagoStatus": "pending",
    "email": "doctor@example.com",
    "connectedAt": "2026-06-12T10:30:00Z"
  }
]
```

### 4.4 Admin: Verificar profesional
**Endpoint:** `PATCH /api/admin/marketplace/professionals/{id}/verify`

```csharp
Request:
{
  "status": "verified" // o "rejected"
  "notes": "Cuenta validada"
}

// Actualiza Professional.MercadoPagoStatus
```

---

## Fase 5: Flujo de Pago (Actualizado)

### Checkout (CAMBIOS MÍNIMOS)
**Endpoint:** `POST /api/appointments/{id}/checkout`

```csharp
// El checkout sigue igual, la comisión se calcula EN EL WEBHOOK
// NO cambiar esta lógica por ahora
```

### Webhook (CAMBIO PRINCIPAL)
**Endpoint:** `POST /api/webhooks/mercadopago`

```csharp
if (mappedStatus == "approved")
{
    // 1. Obtener profesional
    var professional = await db.Professionals
        .Include(p => p.MercadoPagoAccount)
        .FirstAsync(p => p.Id == payment.ProfessionalId);

    // 2. Obtener tier de comisión
    var tier = await db.CommissionTiers
        .FirstAsync(t => t.LicenseType == professional.Specialty);

    // 3. Calcular montos
    decimal commission = payment.Amount * (tier.CommissionPercentage / 100);
    decimal professionalAmount = payment.Amount - commission;

    // 4. Guardar en Payment
    payment.CommissionAmount = commission;
    payment.ProfessionalAmount = professionalAmount;
    payment.CommissionPercentage = tier.CommissionPercentage;
    payment.TransferStatus = "pending";

    // 5. Crear transfer (ASYNC, no esperar)
    _ = TransferToProfessionalAsync(payment, professional, professionalAmount);
}
```

### Transfer (BACKGROUND TASK)
```csharp
private async Task TransferToProfessionalAsync(
    Payment payment, 
    Professional professional, 
    decimal amount)
{
    try
    {
        var mpAccount = professional.MercadoPagoAccount;
        if (mpAccount?.Status != "verified")
        {
            payment.TransferStatus = "failed";
            payment.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return;
        }

        // Usar access_token del profesional (guardado encriptado)
        var transferId = await marketplaceService.TransferToProfessionalAsync(
            mpAccount.AccessTokenEncrypted,
            amount,
            payment.Id);

        if (transferId is not null)
        {
            payment.MercadoPagoTransferId = transferId;
            payment.TransferStatus = "pending";
        }
        else
        {
            payment.TransferStatus = "failed";
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Transfer failed for payment {PaymentId}", payment.Id);
        payment.TransferStatus = "failed";
    }

    payment.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();
}
```

---

## Fase 6: UI Cambios

### 6.1 Portal Profesional: Onboarding MP
**Nueva sección en Professional Portal:**

```
Marketplace de Mercado Pago
┌─────────────────────────┐
│ Estado: No conectado     │
│ [Conectar cuenta MP]     │ → Redirige a OAuth
└─────────────────────────┘

DESPUÉS:
┌─────────────────────────┐
│ Email: doctor@mp.com    │
│ Estado: Verificando...  │
│ Comisión: 15%           │
└─────────────────────────┘
```

### 6.2 Admin Panel: Marketplace
**Nueva sección en Admin:**

```
Profesionales Pendientes de Verificación MP
┌────────────────────────┐
│ Dr. García  | pending  │
│ [✓ Verificar] [✗ Rechazar]
└────────────────────────┘

Listado de Transfers
┌────────────────────────┐
│ pay-123 | $1500 | completed
│ pay-124 | $2000 | failed
└────────────────────────┘
```

---

## Fase 7: Configuración y Secrets

**Variables de entorno necesarias:**

```bash
# Mercado Pago Marketplace
MERCADOPAGO_CLIENT_ID=tu_client_id
MERCADOPAGO_CLIENT_SECRET=tu_client_secret
MERCADOPAGO_MARKETPLACE_ACCOUNT_ID=tu_cuenta_mp_id

# Encryption para tokens (nueva)
ENCRYPTION_KEY=base64_de_32_bytes
```

**Secrets a guardar en DB (encriptados):**
- `ProfessionalMercadoPago.AccessTokenEncrypted`
- `ProfessionalMercadoPago.BankAccountEncrypted`

---

## Orden de Ejecución

1. ✅ **Crear entidades** (ProfessionalMercadoPago, CommissionTier)
2. ✅ **Migración BD** (nuevas tablas y campos)
3. ✅ **MercadoPagoMarketplaceService** (OAuth + transfers)
4. ✅ **Endpoints API** (connect, callback, admin verify)
5. ✅ **Webhook actualizado** (calcular comisión + transfer)
6. ✅ **UI profesional** (vincular cuenta)
7. ✅ **UI admin** (verificar cuentas + dashboard)
8. ✅ **Tests e2e** (flujo completo de pago)

---

## Notas Críticas

- **Access tokens de profesionales:** Guardar encriptados con `EncryptionService`
- **OAuth redirect:** Usar URL segura (HTTPS) en prod
- **Transfers:** Son async, usar background job o scheduled task para reintentar fallos
- **Auditoría:** Registrar todos los cambios de estado MP en AuditLog
- **Comisión:** Si un tier no existe, usar comisión default (ej: 20%)

---

## Estimación

| Fase | Horas |
|------|-------|
| 1-2: BD + Entidades | 1-2h |
| 3: Servicio MP | 3-4h |
| 4: Endpoints | 2-3h |
| 5: Webhook + Transfer | 2-3h |
| 6: UI | 4-5h |
| 7: Tests | 3-4h |
| **TOTAL** | **15-21h** |

Recomendación: Dividir en 3 PRs:
- PR1: BD + Entidades + Servicio
- PR2: Endpoints + Webhook
- PR3: UI + Tests
