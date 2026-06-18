# Plan HUE-05 — Enriquecer panel de verificación de cédula (admin)

**Fecha:** 2026-06-17 · **Diseñado en:** Opus · **Ejecuta:** 1 agente Sonnet

## Contexto y análisis de gap

HUE-05 ("panel admin de verificación de cédula más rico") **ya está parcialmente hecho**. Lo que existe hoy:

- **Backend completo**: `GET /api/admin/professionals?verificationStatus=` (cola, `Program.cs:1621`) y `PATCH /api/professionals/{id}/verification` (`Program.cs:1571`). Solo `internal_admin`. El PATCH ya actualiza `VerificationStatus`, setea `LicenseVerifiedAt`/`LicenseVerifiedBy`, despublica si pierde verificación, y registra audit log.
- **Frontend funcional**: panel "Verificación de cédulas" en `/seguridad` (`security-page-client.tsx:535-612`) que lista profesionales, permite **Verificar** y **Rechazar con motivo**.
- **Store**: `loadVerificationQueue(status?)` y `updateProfessionalVerification(id, status, reason)` ya existen.

**Los 4 gaps reales de HUE-05:**

1. **El loop no se cierra (CRÍTICO):** cuando el admin verifica o rechaza, el profesional **no recibe ningún correo**. Ya recibe "cédula en revisión" al enviarla (P1-4), pero nunca el desenlace. Sin esto, no sabe que ya puede publicar (o por qué fue rechazado).
2. **Sin filtro por estado:** la cola carga **todos** los profesionales siempre. El admin no puede enfocarse en pendientes. El backend ya soporta `?verificationStatus=`.
3. **Sin conteo de pendientes:** el admin no ve "N pendientes" de un vistazo.
4. **Sin datos de contacto:** la tarjeta muestra cédula pero no el **email** del profesional ni la **fecha de registro** para cotejar.

---

## Cambios — Backend

### B1. `apps/api/Infrastructure/EmailSender.cs` — 2 nuevos builders

Justo después de `BuildVerificationPendingEmail` (termina en `EmailSender.cs:78`), agregar:

```csharp
/// <summary>
/// Notificacion al profesional cuando su cedula es verificada (VerificationStatus = "verified").
/// </summary>
public static string BuildVerificationApprovedEmail(string displayName, string portalUrl) =>
    $"""
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>¡Tu cédula fue verificada!</h2>
      <p>Hola {displayName}, tu cédula profesional fue validada por el equipo de Clinixa.</p>
      <p>Ya puedes <strong>publicar tu perfil</strong> y empezar a recibir pacientes. Solo asegúrate de tener tu descripción, al menos un servicio y tu disponibilidad configurados.</p>
      <p><a href="{portalUrl}" style="background:#0d9488;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">Ir a mi portal</a></p>
      <p style="color:#64748b;font-size:13px;">Si tienes dudas, escríbenos a soporte@clinixa.mx.</p>
    </div>
    """;

/// <summary>
/// Notificacion al profesional cuando su cedula es rechazada (VerificationStatus = "rejected").
/// </summary>
public static string BuildVerificationRejectedEmail(string displayName, string reason) =>
    $"""
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>No pudimos verificar tu cédula</h2>
      <p>Hola {displayName}, revisamos tu cédula profesional pero no pudimos completar la verificación.</p>
      <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;color:#991b1b;"><strong>Motivo:</strong> {reason}</p>
      <p>Puedes corregir el dato en tu portal (sección Configuración) y volver a enviarlo para una nueva revisión.</p>
      <p style="color:#64748b;font-size:13px;">Si crees que es un error, escríbenos a soporte@clinixa.mx.</p>
    </div>
    """;
```

### B2. `apps/api/Contracts/ApiContracts.cs` — agregar `Email` al DTO

`ProfessionalVerificationDto` (`ApiContracts.cs:405`). Agregar `string Email` **como último parámetro, después de `CreatedAt`**:

```csharp
public sealed record ProfessionalVerificationDto(
    string Id,
    string DisplayName,
    string Specialty,
    string SpecialtyLabel,
    string Location,
    string LicenseNumber,
    string Status,
    string VerificationStatus,
    DateTimeOffset? LicenseVerifiedAt,
    string? LicenseVerifiedBy,
    DateTimeOffset CreatedAt,
    string Email);
```

### B3. `GET /api/admin/professionals` — incluir User y mapear Email

En `Program.cs:1637`, cambiar:
```csharp
var query = db.Professionals.AsNoTracking();
```
por:
```csharp
var query = db.Professionals.AsNoTracking().Include(professional => professional.User);
```

Y en la proyección del DTO (`Program.cs:1653-1666`), agregar como último argumento (después de `professional.CreatedAt`):
```csharp
            professional.CreatedAt,
            professional.User?.Email ?? ""))
```

### B4. `PATCH /api/professionals/{id}/verification` — enviar email del desenlace

En `Program.cs:1571`, agregar a la firma del handler los parámetros `EmailSender emailSender, IConfiguration configuration` (después de `UpdateProfessionalVerificationRequest verificationRequest`, antes de `HealthHubDbContext db`):

```csharp
professionalsApi.MapPatch("/{id}/verification", async (HttpRequest request, string id, UpdateProfessionalVerificationRequest verificationRequest, EmailSender emailSender, IConfiguration configuration, HealthHubDbContext db) =>
```

Cambiar la carga del profesional (`Program.cs:1587`) para incluir el User:
```csharp
var professional = await db.Professionals.Include(item => item.User).FirstOrDefaultAsync(item => item.Id == id);
```

Después de `await db.SaveChangesAsync();` (`Program.cs:1614`) y **antes** del `return Results.Ok(...)`, agregar el envío best-effort:

```csharp
    if (status is "verified" or "rejected")
    {
        try
        {
            var professionalEmail = professional.User?.Email;
            if (!string.IsNullOrWhiteSpace(professionalEmail))
            {
                if (status == "verified")
                {
                    var webBaseUrl = (configuration["Web:BaseUrl"] ?? Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');
                    await emailSender.SendAsync(
                        professionalEmail,
                        "¡Tu cédula fue verificada en Clinixa!",
                        EmailSender.BuildVerificationApprovedEmail(professional.DisplayName, $"{webBaseUrl}/portal-profesional"));
                }
                else
                {
                    var reason = string.IsNullOrWhiteSpace(verificationRequest.Reason)
                        ? "No fue posible validar el número de cédula proporcionado."
                        : verificationRequest.Reason.Trim();
                    await emailSender.SendAsync(
                        professionalEmail,
                        "Sobre la verificación de tu cédula en Clinixa",
                        EmailSender.BuildVerificationRejectedEmail(professional.DisplayName, reason));
                }
            }
        }
        catch
        {
            // Best-effort: nunca romper la respuesta por un fallo de email
        }
    }
```

> Verificar que `UpdateProfessionalVerificationRequest` tenga la propiedad `Reason` (en `ApiContracts.cs`). Si el nombre difiere, ajustar. La store ya envía `{ reason, status }`.

---

## Cambios — Frontend

### F1. `apps/web/lib/healthhub-store.ts` — agregar `email` al tipo

En `ProfessionalVerificationItem` (buscar `export type ProfessionalVerificationItem = {`), agregar `email: string;` (p.ej. después de `licenseNumber`).

### F2. `apps/web/app/seguridad/security-page-client.tsx` — filtro + conteo + contacto

1. **Estado de filtro.** Junto a los otros `useState` (cerca de `security-page-client.tsx:135`), agregar:
   ```tsx
   const [verificationFilter, setVerificationFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
   ```
   La carga inicial (`security-page-client.tsx:128`) debe usar el filtro por defecto:
   ```tsx
   isInternalAdmin ? loadVerificationQueue("pending") : Promise.resolve([])
   ```

2. **Cambio de filtro recarga la cola.** Agregar handler:
   ```tsx
   async function changeVerificationFilter(next: "pending" | "verified" | "rejected" | "all") {
     setVerificationFilter(next);
     const queue = await loadVerificationQueue(next === "all" ? undefined : next);
     setVerificationQueue(queue);
   }
   ```

3. **Tras verificar/rechazar, recargar con el filtro actual** (para que el ítem salga de la vista "Pendientes"). En `applyVerification` (`security-page-client.tsx:239`), reemplazar el `setVerificationQueue(current => current.map(...))` por una recarga:
   ```tsx
   const queue = await loadVerificationQueue(verificationFilter === "all" ? undefined : verificationFilter);
   setVerificationQueue(queue);
   ```

4. **Título del panel con conteo de pendientes.** El conteo solo es exacto cuando el filtro es "pending" o "all"; usar la longitud de la cola filtrada a pendientes:
   ```tsx
   const pendingCount = verificationQueue.filter((item) => item.verificationStatus === "pending").length;
   ```
   Cambiar `<Panel title="Verificación de cédulas">` por un título con badge. Opciones: usar prop existente de `Panel` o anteponer un encabezado con tabs. Implementación recomendada — renderizar las tabs dentro del Panel, encima de la lista:
   ```tsx
   <Panel title={pendingCount > 0 ? `Verificación de cédulas · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : "Verificación de cédulas"}>
     <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
       {([["pending", "Pendientes"], ["verified", "Verificadas"], ["rejected", "Rechazadas"], ["all", "Todas"]] as const).map(([value, label]) => (
         <button
           key={value}
           className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${verificationFilter === value ? "bg-primary text-white" : "border border-border bg-slate-50 text-slate-600 hover:border-slate-300"}`}
           onClick={() => changeVerificationFilter(value)}
           type="button"
         >
           {label}
         </button>
       ))}
     </div>
     <div className="divide-y divide-border">
       {/* ...lista existente... */}
     </div>
   </Panel>
   ```

5. **Mostrar email + fecha de registro en cada tarjeta.** Dentro del bloque de datos del profesional (`security-page-client.tsx:542-549`, debajo de la línea de cédula), agregar:
   ```tsx
   <p className="mt-1 text-xs text-slate-500">
     {item.email || "Sin correo"} · Registrado {formatDate(item.createdAt)}
   </p>
   ```

6. **Empty state por filtro.** El mensaje "Sin profesionales registrados" (`security-page-client.tsx:608`) debe variar:
   ```tsx
   <div className="p-4 text-sm text-slate-500">
     {verificationFilter === "pending" ? "No hay cédulas pendientes de revisión." : "Sin profesionales en este estado."}
   </div>
   ```

---

## Verificación

```bash
# Compilar
npm run build:api      # 0 errores
npm run lint:web       # limpio
cd apps/web && npx tsc --noEmit   # limpio

# Reiniciar API (carga .env con RESEND)
pkill -f "HealthHub.Api"; npm run dev:api

# 1. Poner al profesional de prueba en pending (cambiar cédula)
curl -s -X PATCH http://localhost:5050/api/professional-portal/profile \
  -H "X-HealthHub-Dev-User: usr-murcielagolambo-gmail-com" -H "Content-Type: application/json" \
  -d '{"displayName":"Fernando Huerta","bio":"Profesional de salud con amplia experiencia clinica y formacion continua.","location":"CDMX","specialty":"doctor","appointmentMode":"hybrid","basePrice":800,"licenseNumber":"HUE05-TEST-001"}'

# 2. Ver la cola filtrada a pending (como admin). Necesita un internal_admin dev user.
#    Buscar el id del admin en el seed:
#    grep -n "internal_admin\|master@healthhub" apps/api/Data/DatabaseSeeder.cs
curl -s "http://localhost:5050/api/admin/professionals?verificationStatus=pending" \
  -H "X-HealthHub-Dev-User: <USR_ADMIN>" | python3 -m json.tool
#    -> debe incluir el campo "email" y el profesional HUE05-TEST-001

# 3. Verificar la cédula (dispara email "verificada")
curl -s -X PATCH http://localhost:5050/api/professionals/pro-murcielagolambo-gmail-com/verification \
  -H "X-HealthHub-Dev-User: <USR_ADMIN>" -H "Content-Type: application/json" \
  -d '{"status":"verified","reason":"Cédula validada manualmente."}'
#    -> en el log: POST https://api.resend.com/emails (no SIMULADO); email a fernandohuertac@hotmail.com

# 4. Rechazar (probar el otro correo) — repetir paso 1 antes para volver a pending, luego:
curl -s -X PATCH http://localhost:5050/api/professionals/pro-murcielagolambo-gmail-com/verification \
  -H "X-HealthHub-Dev-User: <USR_ADMIN>" -H "Content-Type: application/json" \
  -d '{"status":"rejected","reason":"La cédula no coincide con el registro oficial."}'

# 5. Smoke general
npm run smoke:api      # 31/31
```

**Nota:** el `internal_admin` dev user existe en el seed (`master@healthhub.demo`). Obtener su `Id` con:
`grep -n "internal_admin" apps/api/Data/DatabaseSeeder.cs` y el `Id` del bloque correspondiente.

---

## Fuera de alcance (no tocar)

- Foto/avatar (HUE-04), signup público (HUE-08), páginas SEO (HUE-09).
- No cambiar la lógica de `canPublish` ni el gate de publicación.
- No agregar paginación a la cola (volumen de piloto es bajo).
