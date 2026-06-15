# Specialty Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar módulos específicos por especialidad en el portal profesional: recetas para médicos generales, tareas de paciente para psicólogos, y dietas + progreso corporal para nutriólogos.

**Architecture:** Se agrega `specialty` al `CurrentUserDto` extendiendo `ToCurrentUserDto()` en `MappingExtensions.cs` (sin tocar los handlers de `/api/me`), para que el `AppShell` filtre la navegación por especialidad. Cada módulo tiene sus propias entidades, endpoints REST y páginas Next.js (`/recetas`, `/tareas-paciente`, `/nutricion`). Una sola migración EF Core crea las 4 nuevas tablas. Los endpoints usan el patrón `HttpRequest request` + `GetUserFromRequestAsync(request, db)` ya establecido en `Program.cs`. Todos los POST verifican que el paciente pertenezca al profesional via `ProfessionalPatients`.

**Tech Stack:** .NET 8 / Entity Framework Core / PostgreSQL (backend) · Next.js 15 / Zustand / Tailwind CSS / lucide-react (frontend) · Clerk JWT / dev auth

---

## File Structure

### Nuevos archivos — Backend
| Archivo | Responsabilidad |
|---------|----------------|
| `apps/api/Entities/Prescription.cs` | Entidad `Prescription` para EF Core |
| `apps/api/Entities/PatientTask.cs` | Entidad `PatientTask` (tareas psicológicas) |
| `apps/api/Entities/PatientDiet.cs` | Entidad `PatientDiet` (planes de dieta) |
| `apps/api/Entities/BodyMeasurement.cs` | Entidad `BodyMeasurement` (medidas corporales) |
| `apps/api/Migrations/<timestamp>_SpecialtyModules.cs` | Migración generada por `dotnet ef migrations add` |

### Archivos modificados — Backend
| Archivo | Cambio |
|---------|--------|
| `apps/api/Contracts/ApiContracts.cs` | Añadir `Specialty?` a `CurrentUserDto` (7.º parámetro) + DTOs nuevos |
| `apps/api/Infrastructure/MappingExtensions.cs:34-41` | Incluir `user.Professional?.Specialty` en `ToCurrentUserDto()` |
| `apps/api/Data/HealthHubDbContext.cs` | Registrar los 4 `DbSet` nuevos |
| `apps/api/Program.cs` | Añadir helper `GetAuthorizedProfessional` + 8 nuevos endpoint groups |

### Nuevos archivos — Frontend
| Archivo | Responsabilidad |
|---------|----------------|
| `apps/web/app/recetas/page.tsx` | Ruta Next.js |
| `apps/web/app/recetas/recetas-page-client.tsx` | Componente cliente: listado y formulario de recetas |
| `apps/web/app/tareas-paciente/page.tsx` | Ruta Next.js |
| `apps/web/app/tareas-paciente/tareas-page-client.tsx` | Componente cliente: tareas por paciente |
| `apps/web/app/nutricion/page.tsx` | Ruta Next.js |
| `apps/web/app/nutricion/nutricion-page-client.tsx` | Componente cliente: dietas + progreso (tabs) |

### Archivos modificados — Frontend
| Archivo | Cambio |
|---------|--------|
| `apps/web/lib/demo-data.ts` | Añadir `specialty: null` a `currentUser` y cada entrada de `demoSessions` |
| `apps/web/lib/healthhub-store.ts` | Añadir `specialty` a `CurrentUser`; `specialty: null` a `guestUser`; 6 nuevas acciones |
| `apps/web/components/app-shell.tsx` | Extender `NavItem` con `specialty?: string[]`; actualizar `getNavItems` |

---

## Task 1: Añadir `specialty` al `CurrentUser`

**Objetivo:** Que el `AppShell` pueda filtrar ítems de navegación por especialidad sin llamadas extra.

### Pasos

- [ ] **Step 1: Extender `CurrentUserDto` en `ApiContracts.cs`**

Localiza el record en la línea 3 del archivo. Agrega `string? Specialty` como 7.º parámetro:

```csharp
// apps/api/Contracts/ApiContracts.cs — reemplaza el record existente
public sealed record CurrentUserDto(
    string Id,
    string FullName,
    string Email,
    string PrimaryRole,
    string? PatientId,
    string? ProfessionalId,
    string? Specialty);
```

- [ ] **Step 2: Actualizar `ToCurrentUserDto()` en `MappingExtensions.cs`**

No se modifica el handler de `/api/me`. Solo actualiza el método de extensión en `apps/api/Infrastructure/MappingExtensions.cs` (líneas 34–41):

```csharp
public static CurrentUserDto ToCurrentUserDto(this User user) =>
    new(
        user.Id,
        user.FullName,
        user.Email,
        user.PrimaryRole,
        user.Patient?.Id,
        user.Professional?.Id,
        user.Professional?.Specialty);   // <-- nuevo
```

> `GetUserFromRequestAsync` ya hace `Include(u => u.Professional)` en los tres modos de auth (Clerk, dev header, legacy bearer). No se requiere ningún cambio adicional al handler.

- [ ] **Step 3: Compilar y verificar que el endpoint devuelve `specialty`**

```bash
cd apps/api && dotnet build
dotnet run &

# Con token de un profesional médico:
curl -H "Authorization: Bearer <token>" http://localhost:5050/api/me | jq .specialty
# Esperado: "doctor"

# Con token de paciente o sin Professional:
# Esperado: null
```

- [ ] **Step 4: Actualizar el tipo `CurrentUser` y `guestUser` en el store**

En `apps/web/lib/healthhub-store.ts`, añade `specialty` al tipo `CurrentUser` (línea ~39):

```typescript
export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  primaryRole: string;
  patientId: string | null;
  professionalId: string | null;
  specialty: string | null;  // <-- nuevo
};
```

Actualiza `guestUser` (línea ~290) para incluir el campo:

```typescript
const guestUser: CurrentUser = {
  id: "",
  fullName: "",
  email: "",
  primaryRole: "guest",
  patientId: null,
  professionalId: null,
  specialty: null,   // <-- nuevo
};
```

En el lugar donde se mapea la respuesta de `/api/me` al tipo `CurrentUser` (busca `specialty` o donde se construye el objeto user), incluye:

```typescript
specialty: data.specialty ?? null,
```

- [ ] **Step 5: Añadir `specialty` a los datos de demostración**

En `apps/web/lib/demo-data.ts`, actualiza `currentUser` (líneas 7–14):

```typescript
export const currentUser = {
  id: "usr-ana-martinez",
  fullName: "Ana Martinez",
  email: "ana.martinez@example.com",
  primaryRole: "patient",
  patientId: "ana-martinez",
  professionalId: null,
  specialty: null,   // <-- nuevo
};
```

Añade `specialty: null` (o el valor correcto) a cada objeto en el array `demoSessions`. Los usuarios pacientes y admins van con `null`; los profesionales demo deben tener su especialidad correspondiente (ej. `"doctor"`, `"psychologist"`) para que la navegación de demo funcione correctamente.

- [ ] **Step 6: Extender `NavItem` en `AppShell`**

En `apps/web/components/app-shell.tsx`, extiende el tipo y la función:

```typescript
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  specialty?: string[];  // si se define, solo aparece para esas especialidades
};

function getNavItems(userRole: string, userSpecialty: string | null): NavItem[] {
  return allNavItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (item.specialty && (!userSpecialty || !item.specialty.includes(userSpecialty))) return false;
    return true;
  });
}
```

Actualiza la llamada en el componente (busca `getNavItems(currentUser.primaryRole)`):

```typescript
const navItems = navReady ? getNavItems(currentUser.primaryRole, currentUser.specialty ?? null) : [];
```

- [ ] **Step 7: Verificar que el nav filtra correctamente (modo demo)**

```bash
cd apps/web && npm run dev
```

En modo demo, cambia la sesión a una que tenga `specialty: "doctor"`. Verifica que los ítems de especialidad aparecen y desaparecen según la sesión activa.

- [ ] **Step 8: Commit**

```bash
git add apps/api/Contracts/ApiContracts.cs \
        apps/api/Infrastructure/MappingExtensions.cs \
        apps/web/lib/demo-data.ts \
        apps/web/lib/healthhub-store.ts \
        apps/web/components/app-shell.tsx
git commit -m "feat: add specialty to CurrentUser for specialty-specific navigation"
```

---

## Task 2: Migración — 4 nuevas tablas

**Files:**
- Create: `apps/api/Entities/Prescription.cs`
- Create: `apps/api/Entities/PatientTask.cs`
- Create: `apps/api/Entities/PatientDiet.cs`
- Create: `apps/api/Entities/BodyMeasurement.cs`
- Modify: `apps/api/Data/HealthHubDbContext.cs`

- [ ] **Step 1: Crear `Prescription.cs`**

```csharp
// apps/api/Entities/Prescription.cs
namespace HealthHub.Api.Entities;

public sealed class Prescription
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string? AppointmentId { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public int Refills { get; set; } = 0;
    public string Status { get; set; } = "active";
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
```

- [ ] **Step 2: Crear `PatientTask.cs`**

```csharp
// apps/api/Entities/PatientTask.cs
namespace HealthHub.Api.Entities;

public sealed class PatientTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string? AppointmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset? DueDate { get; set; }
    public string Status { get; set; } = "pending";  // pending | completed | skipped
    public DateTimeOffset? CompletedAt { get; set; }
    public string? PatientNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
```

- [ ] **Step 3: Crear `PatientDiet.cs`**

```csharp
// apps/api/Entities/PatientDiet.cs
namespace HealthHub.Api.Entities;

public sealed class PatientDiet
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset ValidFrom { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ValidUntil { get; set; }
    public string Status { get; set; } = "active";  // active | archived
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
```

- [ ] **Step 4: Crear `BodyMeasurement.cs`**

```csharp
// apps/api/Entities/BodyMeasurement.cs
namespace HealthHub.Api.Entities;

public sealed class BodyMeasurement
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PatientId { get; set; } = string.Empty;
    public string ProfessionalId { get; set; } = string.Empty;
    public DateTimeOffset MeasuredAt { get; set; } = DateTimeOffset.UtcNow;
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? HipCm { get; set; }
    public decimal? ArmCm { get; set; }
    public decimal? BodyFatPercentage { get; set; }
    public decimal? MuscleMassKg { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    // sin UpdatedAt: las medidas son registros inmutables

    public Patient? Patient { get; set; }
    public Professional? Professional { get; set; }
}
```

- [ ] **Step 5: Registrar en `HealthHubDbContext.cs`**

Añade los `DbSet` junto a los existentes:

```csharp
public DbSet<Prescription> Prescriptions => Set<Prescription>();
public DbSet<PatientTask> PatientTasks => Set<PatientTask>();
public DbSet<PatientDiet> PatientDiets => Set<PatientDiet>();
public DbSet<BodyMeasurement> BodyMeasurements => Set<BodyMeasurement>();
```

Si el `OnModelCreating` define índices explícitos en el proyecto, añade:

```csharp
modelBuilder.Entity<Prescription>()
    .HasIndex(p => new { p.ProfessionalId, p.PatientId });
modelBuilder.Entity<PatientTask>()
    .HasIndex(t => new { t.ProfessionalId, t.Status });
modelBuilder.Entity<PatientDiet>()
    .HasIndex(d => new { d.ProfessionalId, d.PatientId });
modelBuilder.Entity<BodyMeasurement>()
    .HasIndex(b => new { b.PatientId, b.MeasuredAt });
```

- [ ] **Step 6: Generar y aplicar la migración**

```bash
cd apps/api
dotnet ef migrations add SpecialtyModules --output-dir Migrations
# Revisa el archivo generado en Migrations/ antes de aplicar
dotnet ef database update
```

- [ ] **Step 7: Verificar tablas**

```bash
psql $HEALTHHUB_DB_CONNECTION -c "\dt" | grep -E "prescription|patient_task|patient_diet|body_measurement"
```

Esperado: las 4 tablas aparecen.

- [ ] **Step 8: Commit**

```bash
git add apps/api/Entities/ \
        apps/api/Data/HealthHubDbContext.cs \
        apps/api/Migrations/
git commit -m "feat: add specialty module entities and migration"
```

---

## Task 3: API — Módulo de Recetas (Médicos)

**Files:**
- Modify: `apps/api/Contracts/ApiContracts.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Añadir DTOs en `ApiContracts.cs`**

```csharp
public sealed record PrescriptionDto(
    string Id,
    string PatientId,
    string PatientName,
    string MedicationName,
    string Dosage,
    string Frequency,
    string Duration,
    string Instructions,
    int Refills,
    string Status,
    string IssuedAt,
    string? ExpiresAt);

public sealed record CreatePrescriptionRequest(
    string PatientId,
    string? AppointmentId,
    string MedicationName,
    string Dosage,
    string Frequency,
    string Duration,
    string Instructions,
    int Refills,
    string? ExpiresAt);
```

- [ ] **Step 2: Añadir helper `GetAuthorizedProfessional` en `Program.cs`**

Coloca esta función estática al final del archivo, junto a los demás helpers (`GetUserFromRequestAsync`, etc.). Usa `HttpRequest`, igual que todos los handlers existentes:

```csharp
static async Task<(Professional? pro, IResult? error)> GetAuthorizedProfessional(
    HttpRequest request, HealthHubDbContext db, string? requiredSpecialty = null)
{
    var user = await GetUserFromRequestAsync(request, db);

    if (user?.Professional is null)
        return (null, Results.Forbid());

    if (requiredSpecialty is not null && user.Professional.Specialty != requiredSpecialty)
        return (null, Results.Problem(
            "Esta función solo está disponible para tu especialidad.", statusCode: 403));

    return (user.Professional, null);
}
```

- [ ] **Step 3: Añadir helper de conversión `ToPrescriptionDto`**

```csharp
static PrescriptionDto ToPrescriptionDto(Prescription p, string? patientName = null) => new(
    p.Id, p.PatientId, patientName ?? p.Patient?.FullName ?? "",
    p.MedicationName, p.Dosage, p.Frequency, p.Duration,
    p.Instructions, p.Refills, p.Status,
    p.IssuedAt.ToString("yyyy-MM-dd"),
    p.ExpiresAt?.ToString("yyyy-MM-dd"));
```

- [ ] **Step 4: Añadir endpoints de recetas**

```csharp
// GET /api/prescriptions?patientId={id}
app.MapGet("/api/prescriptions", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "doctor");
    if (error is not null) return error;

    var query = db.Prescriptions
        .Include(p => p.Patient)
        .Where(p => p.ProfessionalId == pro!.Id);

    if (!string.IsNullOrEmpty(patientId))
        query = query.Where(p => p.PatientId == patientId);

    var items = await query.OrderByDescending(p => p.IssuedAt).Take(100).ToListAsync();
    return Results.Ok(items.Select(p => ToPrescriptionDto(p)));
}).RequireAuthorization();

// POST /api/prescriptions
app.MapPost("/api/prescriptions", async (HttpRequest request, HealthHubDbContext db, CreatePrescriptionRequest req) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "doctor");
    if (error is not null) return error;

    // Verificar que el paciente pertenece a este profesional
    var patientRelation = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!patientRelation)
        return Results.NotFound("Paciente no encontrado o no asociado a tu cuenta.");

    DateTimeOffset? expiresAt = null;
    if (!string.IsNullOrEmpty(req.ExpiresAt))
    {
        if (!DateTimeOffset.TryParse(req.ExpiresAt, out var parsed))
            return Results.BadRequest(new { error = "Fecha de vencimiento inválida." });
        expiresAt = parsed;
    }

    var prescription = new Prescription
    {
        Id = Guid.NewGuid().ToString(),
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        AppointmentId = req.AppointmentId,
        MedicationName = req.MedicationName.Trim(),
        Dosage = req.Dosage.Trim(),
        Frequency = req.Frequency.Trim(),
        Duration = req.Duration.Trim(),
        Instructions = req.Instructions.Trim(),
        Refills = req.Refills,
        ExpiresAt = expiresAt,
    };

    db.Prescriptions.Add(prescription);
    await db.SaveChangesAsync();

    var patient = await db.Patients.FindAsync(req.PatientId);
    return Results.Created(
        $"/api/prescriptions/{prescription.Id}",
        ToPrescriptionDto(prescription, patient?.FullName));
}).RequireAuthorization();
```

- [ ] **Step 5: Probar los endpoints**

```bash
# Listar recetas (token de médico)
curl -H "Authorization: Bearer <token>" http://localhost:5050/api/prescriptions | jq .

# Crear receta
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"patientId":"<id>","medicationName":"Paracetamol","dosage":"500mg","frequency":"Cada 8h","duration":"5 días","instructions":"Con alimentos","refills":0}' \
  http://localhost:5050/api/prescriptions | jq .
```

Esperado: `GET` → lista vacía o con ítems. `POST` → `201 Created` con el DTO.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Contracts/ApiContracts.cs apps/api/Program.cs
git commit -m "feat: add prescriptions API endpoints (doctors only)"
```

---

## Task 4: Frontend — Página de Recetas

**Files:**
- Create: `apps/web/app/recetas/page.tsx`
- Create: `apps/web/app/recetas/recetas-page-client.tsx`
- Modify: `apps/web/lib/healthhub-store.ts`
- Modify: `apps/web/components/app-shell.tsx`

- [ ] **Step 1: Añadir tipos y acciones al store**

```typescript
export type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refills: number;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
};

// En el objeto de acciones del store:
loadPrescriptions: async (patientId?: string): Promise<Prescription[]> => {
  const url = patientId
    ? `${API_BASE_URL}/api/prescriptions?patientId=${patientId}`
    : `${API_BASE_URL}/api/prescriptions`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar las recetas.");
  return res.json();
},

createPrescription: async (data: {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refills: number;
  expiresAt?: string;
}): Promise<Prescription> => {
  const res = await fetch(`${API_BASE_URL}/api/prescriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("No se pudo crear la receta.");
  return res.json();
},
```

- [ ] **Step 2: Crear la ruta**

```typescript
// apps/web/app/recetas/page.tsx
import { RecetasPageClient } from "./recetas-page-client";

export default function RecetasPage() {
  return <RecetasPageClient />;
}
```

- [ ] **Step 3: Crear el componente cliente**

```typescript
// apps/web/app/recetas/recetas-page-client.tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type Prescription } from "@/lib/healthhub-store";

type PrescriptionDraft = {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refills: number;
};

const EMPTY_DRAFT: PrescriptionDraft = {
  patientId: "",
  medicationName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  refills: 0,
};

export function RecetasPageClient() {
  const { currentUser, loadPrescriptions, createPrescription, patients, ready } = useHealthHubStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PrescriptionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    loadPrescriptions()
      .then(setPrescriptions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, loadPrescriptions]);

  async function handleCreate() {
    if (!draft.patientId || !draft.medicationName) {
      setMessage({ kind: "error", text: "Selecciona un paciente e ingresa el medicamento." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPrescription(draft);
      setPrescriptions((prev) => [created, ...prev]);
      setDraft(EMPTY_DRAFT);
      setMessage({ kind: "success", text: "Receta creada correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo crear la receta." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Historial de recetas por paciente."
        title="Recetas"
      />
      <div className="space-y-5 px-5 py-6 lg:px-8">
        {message ? (
          <div
            className={
              message.kind === "success"
                ? "rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
                : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message.text}
          </div>
        ) : null}

        <Panel title="Nueva receta">
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Paciente</span>
              <select
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))}
                value={draft.patientId}
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Medicamento</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, medicationName: e.target.value }))}
                  placeholder="Ej. Paracetamol 500 mg"
                  value={draft.medicationName}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Dosis</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))}
                  placeholder="Ej. 1 tableta"
                  value={draft.dosage}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Frecuencia</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
                  placeholder="Ej. Cada 8 horas"
                  value={draft.frequency}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Duración</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                  placeholder="Ej. 5 días"
                  value={draft.duration}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Indicaciones</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
                placeholder="Indicaciones adicionales para el paciente"
                value={draft.instructions}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Resurtidos:</span>
                <input
                  className="w-16 rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-teal-400"
                  min={0}
                  onChange={(e) => setDraft((d) => ({ ...d, refills: Number(e.target.value) }))}
                  type="number"
                  value={draft.refills}
                />
              </label>
              <button
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={handleCreate}
                type="button"
              >
                <Plus size={16} />
                {saving ? "Guardando..." : "Crear receta"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Historial de recetas">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Cargando recetas...</div>
          ) : prescriptions.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Aún no hay recetas registradas.</div>
          ) : (
            <div className="divide-y divide-border">
              {prescriptions.map((rx) => (
                <div className="flex items-start gap-3 p-4" key={rx.id}>
                  <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{rx.medicationName}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {rx.dosage} · {rx.frequency} · {rx.duration}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {rx.patientName} · {rx.issuedAt}
                    </p>
                    {rx.instructions ? (
                      <p className="mt-1 text-sm text-slate-600">{rx.instructions}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Añadir ítem de navegación**

En `apps/web/components/app-shell.tsx`, añade a los imports y al array `allNavItems`:

```typescript
import { ..., Pill } from "lucide-react";

// En allNavItems (después de los ítems existentes de profesional):
{
  href: "/recetas",
  label: "Recetas",
  icon: Pill,
  roles: ["professional"],
  specialty: ["doctor"],
},
```

- [ ] **Step 5: Verificar en el navegador**

1. Sesión como médico → "Recetas" aparece en el menú.
2. Crear una receta → aparece en el historial.
3. Sesión como psicólogo → "Recetas" NO aparece.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/recetas/ \
        apps/web/lib/healthhub-store.ts \
        apps/web/components/app-shell.tsx
git commit -m "feat: add prescriptions page for doctor specialty"
```

---

## Task 5: API — Módulo de Tareas de Paciente (Psicólogos)

**Files:**
- Modify: `apps/api/Contracts/ApiContracts.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Añadir DTOs**

```csharp
public sealed record PatientTaskDto(
    string Id,
    string PatientId,
    string PatientName,
    string Title,
    string Description,
    string? DueDate,
    string Status,
    string? CompletedAt,
    string? PatientNotes,
    string CreatedAt);

public sealed record CreatePatientTaskRequest(
    string PatientId,
    string? AppointmentId,
    string Title,
    string Description,
    string? DueDate);

public sealed record UpdatePatientTaskRequest(
    string Status,
    string? PatientNotes);
```

- [ ] **Step 2: Añadir helper `ToPatientTaskDto`**

```csharp
static PatientTaskDto ToPatientTaskDto(PatientTask t, string? patientName = null) => new(
    t.Id, t.PatientId, patientName ?? t.Patient?.FullName ?? "",
    t.Title, t.Description,
    t.DueDate?.ToString("yyyy-MM-dd"),
    t.Status,
    t.CompletedAt?.ToString("yyyy-MM-dd"),
    t.PatientNotes,
    t.CreatedAt.ToString("yyyy-MM-dd"));
```

- [ ] **Step 3: Añadir endpoints**

```csharp
// GET /api/patient-tasks?patientId={id}&status={status}
app.MapGet("/api/patient-tasks", async (HttpRequest request, HealthHubDbContext db, string? patientId, string? status) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "psychologist");
    if (error is not null) return error;

    var query = db.PatientTasks
        .Include(t => t.Patient)
        .Where(t => t.ProfessionalId == pro!.Id);

    if (!string.IsNullOrEmpty(patientId)) query = query.Where(t => t.PatientId == patientId);
    if (!string.IsNullOrEmpty(status))   query = query.Where(t => t.Status == status);

    var items = await query.OrderByDescending(t => t.CreatedAt).Take(200).ToListAsync();
    return Results.Ok(items.Select(t => ToPatientTaskDto(t)));
}).RequireAuthorization();

// POST /api/patient-tasks
app.MapPost("/api/patient-tasks", async (HttpRequest request, HealthHubDbContext db, CreatePatientTaskRequest req) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "psychologist");
    if (error is not null) return error;

    // Verificar propiedad del paciente
    var patientRelation = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!patientRelation)
        return Results.NotFound("Paciente no encontrado o no asociado a tu cuenta.");

    DateTimeOffset? dueDate = null;
    if (!string.IsNullOrEmpty(req.DueDate))
    {
        if (!DateTimeOffset.TryParse(req.DueDate, out var parsed))
            return Results.BadRequest(new { error = "Fecha límite inválida." });
        dueDate = parsed;
    }

    var task = new PatientTask
    {
        Id = Guid.NewGuid().ToString(),
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        AppointmentId = req.AppointmentId,
        Title = req.Title.Trim(),
        Description = req.Description.Trim(),
        DueDate = dueDate,
    };

    db.PatientTasks.Add(task);
    await db.SaveChangesAsync();

    var patient = await db.Patients.FindAsync(req.PatientId);
    return Results.Created($"/api/patient-tasks/{task.Id}", ToPatientTaskDto(task, patient?.FullName));
}).RequireAuthorization();

// PATCH /api/patient-tasks/{id}
app.MapPatch("/api/patient-tasks/{id}", async (HttpRequest request, HealthHubDbContext db, string id, UpdatePatientTaskRequest req) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "psychologist");
    if (error is not null) return error;

    // Validar estado
    string[] validStatuses = ["pending", "completed", "skipped"];
    if (!validStatuses.Contains(req.Status))
        return Results.BadRequest(new { error = $"Estado inválido. Valores permitidos: {string.Join(", ", validStatuses)}." });

    var task = await db.PatientTasks
        .Include(t => t.Patient)
        .FirstOrDefaultAsync(t => t.Id == id && t.ProfessionalId == pro!.Id);

    if (task is null) return Results.NotFound();

    task.Status = req.Status;
    task.PatientNotes = req.PatientNotes;
    task.CompletedAt = req.Status == "completed" ? DateTimeOffset.UtcNow : task.CompletedAt;
    task.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(ToPatientTaskDto(task));
}).RequireAuthorization();
```

- [ ] **Step 4: Probar endpoints**

```bash
# Crear tarea (token de psicólogo)
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"patientId":"<id>","title":"Diario de emociones","description":"Escribir 3 emociones al día","dueDate":"2026-06-21"}' \
  http://localhost:5050/api/patient-tasks | jq .
# Esperado: 201 con status "pending"

# Marcar completada
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"completed"}' \
  http://localhost:5050/api/patient-tasks/<id> | jq .

# Status inválido → 400
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  http://localhost:5050/api/patient-tasks/<id> | jq .
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/Contracts/ApiContracts.cs apps/api/Program.cs
git commit -m "feat: add patient tasks API endpoints (psychologist only)"
```

---

## Task 6: Frontend — Página de Tareas de Paciente

**Files:**
- Create: `apps/web/app/tareas-paciente/page.tsx`
- Create: `apps/web/app/tareas-paciente/tareas-page-client.tsx`
- Modify: `apps/web/lib/healthhub-store.ts`
- Modify: `apps/web/components/app-shell.tsx`

- [ ] **Step 1: Añadir tipos y acciones al store**

```typescript
export type PatientTask = {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "pending" | "completed" | "skipped";
  completedAt: string | null;
  patientNotes: string | null;
  createdAt: string;
};

loadPatientTasks: async (patientId?: string, status?: string): Promise<PatientTask[]> => {
  const params = new URLSearchParams();
  if (patientId) params.set("patientId", patientId);
  if (status) params.set("status", status);
  const res = await fetch(`${API_BASE_URL}/api/patient-tasks?${params}`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar las tareas.");
  return res.json();
},

createPatientTask: async (data: {
  patientId: string;
  title: string;
  description: string;
  dueDate?: string;
}): Promise<PatientTask> => {
  const res = await fetch(`${API_BASE_URL}/api/patient-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("No se pudo crear la tarea.");
  return res.json();
},

updatePatientTask: async (id: string, status: string, patientNotes?: string): Promise<PatientTask> => {
  const res = await fetch(`${API_BASE_URL}/api/patient-tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ status, patientNotes: patientNotes ?? null }),
  });
  if (!res.ok) throw new Error("No se pudo actualizar la tarea.");
  return res.json();
},
```

- [ ] **Step 2: Crear ruta**

```typescript
// apps/web/app/tareas-paciente/page.tsx
import { TareasPageClient } from "./tareas-page-client";

export default function TareasPage() {
  return <TareasPageClient />;
}
```

- [ ] **Step 3: Crear componente cliente**

```typescript
// apps/web/app/tareas-paciente/tareas-page-client.tsx
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type PatientTask } from "@/lib/healthhub-store";

type TaskDraft = {
  patientId: string;
  title: string;
  description: string;
  dueDate: string;
};

const EMPTY_DRAFT: TaskDraft = { patientId: "", title: "", description: "", dueDate: "" };

export function TareasPageClient() {
  const { currentUser, loadPatientTasks, createPatientTask, updatePatientTask, patients, ready } = useHealthHubStore();
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<"" | "pending" | "completed">("pending");

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    loadPatientTasks(undefined, filterStatus || undefined)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, loadPatientTasks, filterStatus]);

  async function handleCreate() {
    if (!draft.patientId || !draft.title) {
      setMessage({ kind: "error", text: "Selecciona un paciente y escribe el título de la tarea." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPatientTask({
        patientId: draft.patientId,
        title: draft.title,
        description: draft.description,
        dueDate: draft.dueDate || undefined,
      });
      setTasks((prev) => [created, ...prev]);
      setDraft(EMPTY_DRAFT);
      setMessage({ kind: "success", text: "Tarea asignada al paciente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo crear la tarea." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(task: PatientTask) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setUpdatingId(task.id);
    try {
      const updated = await updatePatientTask(task.id, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      setMessage({ kind: "error", text: "No se pudo actualizar la tarea." });
    } finally {
      setUpdatingId(null);
    }
  }

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Actividades asignadas a tus pacientes para trabajar entre sesiones."
        title="Tareas de paciente"
      />
      <div className="space-y-5 px-5 py-6 lg:px-8">
        {message ? (
          <div
            className={
              message.kind === "success"
                ? "rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
                : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message.text}
          </div>
        ) : null}

        <Panel title="Asignar nueva tarea">
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Paciente</span>
              <select
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))}
                value={draft.patientId}
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Título de la tarea</span>
              <input
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Ej. Diario de emociones"
                value={draft.title}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Descripción / instrucciones</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Describe la actividad con detalle"
                value={draft.description}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Fecha límite:</span>
                <input
                  className="rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                  type="date"
                  value={draft.dueDate}
                />
              </label>
              <button
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={handleCreate}
                type="button"
              >
                <Plus size={16} />
                {saving ? "Asignando..." : "Asignar tarea"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel
          action={
            <div className="flex gap-2">
              {(["pending", "completed", ""] as const).map((s) => (
                <button
                  className={
                    filterStatus === s
                      ? "rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-teal-200"
                      : "rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                  }
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  type="button"
                >
                  {s === "pending"
                    ? `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ""}`
                    : s === "completed" ? "Completadas" : "Todas"}
                </button>
              ))}
            </div>
          }
          title="Tareas"
        >
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Cargando tareas...</div>
          ) : tasks.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              Sin tareas {filterStatus === "pending" ? "pendientes" : ""} por el momento.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map((task) => (
                <div className="flex items-start gap-3 p-4" key={task.id}>
                  <button
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-primary disabled:opacity-40"
                    disabled={updatingId === task.id}
                    onClick={() => toggleStatus(task)}
                    type="button"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="text-teal-500" size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="mt-0.5 text-sm text-slate-600">{task.description}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>{task.patientName}</span>
                      {task.dueDate ? <span>Límite: {task.dueDate}</span> : null}
                      {task.completedAt ? <span>Completada: {task.completedAt}</span> : null}
                    </div>
                    {task.patientNotes ? (
                      <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                        Nota del paciente: {task.patientNotes}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Añadir ítem de navegación**

```typescript
// En apps/web/components/app-shell.tsx — imports:
import { ..., ClipboardCheck } from "lucide-react";

// En allNavItems:
{
  href: "/tareas-paciente",
  label: "Tareas",
  icon: ClipboardCheck,
  roles: ["professional"],
  specialty: ["psychologist"],
},
```

- [ ] **Step 5: Verificar en el navegador**

1. Sesión como psicólogo → "Tareas" aparece.
2. Asignar tarea → aparece con círculo vacío.
3. Hacer clic en el círculo → se tacha y muestra `CheckCircle2`.
4. Sesión como médico → "Tareas" NO aparece.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/tareas-paciente/ \
        apps/web/lib/healthhub-store.ts \
        apps/web/components/app-shell.tsx
git commit -m "feat: add patient tasks page for psychologist specialty"
```

---

## Task 7: API — Módulo de Nutrición (Dietas y Progreso)

**Files:**
- Modify: `apps/api/Contracts/ApiContracts.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Añadir DTOs**

```csharp
// Dietas
public sealed record PatientDietDto(
    string Id,
    string PatientId,
    string PatientName,
    string Title,
    string Content,
    string ValidFrom,
    string? ValidUntil,
    string Status,
    string CreatedAt);

public sealed record CreatePatientDietRequest(
    string PatientId,
    string Title,
    string Content,
    string ValidFrom,
    string? ValidUntil);

// Medidas corporales
public sealed record BodyMeasurementDto(
    string Id,
    string PatientId,
    string PatientName,
    string MeasuredAt,
    decimal? WeightKg,
    decimal? HeightCm,
    decimal? WaistCm,
    decimal? HipCm,
    decimal? ArmCm,
    decimal? BodyFatPercentage,
    decimal? MuscleMassKg,
    string? Notes);

public sealed record CreateBodyMeasurementRequest(
    string PatientId,
    string MeasuredAt,
    decimal? WeightKg,
    decimal? HeightCm,
    decimal? WaistCm,
    decimal? HipCm,
    decimal? ArmCm,
    decimal? BodyFatPercentage,
    decimal? MuscleMassKg,
    string? Notes);
```

- [ ] **Step 2: Añadir helpers de conversión**

```csharp
static PatientDietDto ToPatientDietDto(PatientDiet d, string? patientName = null) => new(
    d.Id, d.PatientId, patientName ?? d.Patient?.FullName ?? "",
    d.Title, d.Content,
    d.ValidFrom.ToString("yyyy-MM-dd"),
    d.ValidUntil?.ToString("yyyy-MM-dd"),
    d.Status, d.CreatedAt.ToString("yyyy-MM-dd"));

static BodyMeasurementDto ToBodyMeasurementDto(BodyMeasurement m, string? patientName = null) => new(
    m.Id, m.PatientId, patientName ?? m.Patient?.FullName ?? "",
    m.MeasuredAt.ToString("yyyy-MM-dd"),
    m.WeightKg, m.HeightCm, m.WaistCm, m.HipCm, m.ArmCm,
    m.BodyFatPercentage, m.MuscleMassKg, m.Notes);
```

- [ ] **Step 3: Añadir endpoints de dietas**

```csharp
// GET /api/patient-diets?patientId={id}
app.MapGet("/api/patient-diets", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (error is not null) return error;

    var query = db.PatientDiets
        .Include(d => d.Patient)
        .Where(d => d.ProfessionalId == pro!.Id);
    if (!string.IsNullOrEmpty(patientId)) query = query.Where(d => d.PatientId == patientId);

    var items = await query.OrderByDescending(d => d.ValidFrom).Take(100).ToListAsync();
    return Results.Ok(items.Select(d => ToPatientDietDto(d)));
}).RequireAuthorization();

// POST /api/patient-diets
app.MapPost("/api/patient-diets", async (HttpRequest request, HealthHubDbContext db, CreatePatientDietRequest req) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (error is not null) return error;

    var patientRelation = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!patientRelation)
        return Results.NotFound("Paciente no encontrado o no asociado a tu cuenta.");

    if (!DateTimeOffset.TryParse(req.ValidFrom, out var validFrom))
        return Results.BadRequest(new { error = "Fecha de inicio inválida." });

    DateTimeOffset? validUntil = null;
    if (!string.IsNullOrEmpty(req.ValidUntil))
    {
        if (!DateTimeOffset.TryParse(req.ValidUntil, out var parsed))
            return Results.BadRequest(new { error = "Fecha de fin inválida." });
        validUntil = parsed;
    }

    var diet = new PatientDiet
    {
        Id = Guid.NewGuid().ToString(),
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        Title = req.Title.Trim(),
        Content = req.Content.Trim(),
        ValidFrom = validFrom,
        ValidUntil = validUntil,
    };

    db.PatientDiets.Add(diet);
    await db.SaveChangesAsync();

    var patient = await db.Patients.FindAsync(req.PatientId);
    return Results.Created($"/api/patient-diets/{diet.Id}", ToPatientDietDto(diet, patient?.FullName));
}).RequireAuthorization();
```

- [ ] **Step 4: Añadir endpoints de medidas corporales**

```csharp
// GET /api/body-measurements?patientId={id}
app.MapGet("/api/body-measurements", async (HttpRequest request, HealthHubDbContext db, string? patientId) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (error is not null) return error;

    var query = db.BodyMeasurements
        .Include(m => m.Patient)
        .Where(m => m.ProfessionalId == pro!.Id);
    if (!string.IsNullOrEmpty(patientId)) query = query.Where(m => m.PatientId == patientId);

    var items = await query.OrderByDescending(m => m.MeasuredAt).Take(200).ToListAsync();
    return Results.Ok(items.Select(m => ToBodyMeasurementDto(m)));
}).RequireAuthorization();

// POST /api/body-measurements
app.MapPost("/api/body-measurements", async (HttpRequest request, HealthHubDbContext db, CreateBodyMeasurementRequest req) =>
{
    var (pro, error) = await GetAuthorizedProfessional(request, db, "nutritionist");
    if (error is not null) return error;

    var patientRelation = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == pro!.Id && pp.PatientId == req.PatientId);
    if (!patientRelation)
        return Results.NotFound("Paciente no encontrado o no asociado a tu cuenta.");

    if (!DateTimeOffset.TryParse(req.MeasuredAt, out var measuredAt))
        return Results.BadRequest(new { error = "Fecha de medición inválida." });

    var measurement = new BodyMeasurement
    {
        Id = Guid.NewGuid().ToString(),
        PatientId = req.PatientId,
        ProfessionalId = pro!.Id,
        MeasuredAt = measuredAt,
        WeightKg = req.WeightKg,
        HeightCm = req.HeightCm,
        WaistCm = req.WaistCm,
        HipCm = req.HipCm,
        ArmCm = req.ArmCm,
        BodyFatPercentage = req.BodyFatPercentage,
        MuscleMassKg = req.MuscleMassKg,
        Notes = req.Notes,
    };

    db.BodyMeasurements.Add(measurement);
    await db.SaveChangesAsync();

    var patient = await db.Patients.FindAsync(req.PatientId);
    return Results.Created($"/api/body-measurements/{measurement.Id}", ToBodyMeasurementDto(measurement, patient?.FullName));
}).RequireAuthorization();
```

- [ ] **Step 5: Probar endpoints**

```bash
# Crear dieta (token de nutriólogo)
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"patientId":"<id>","title":"Plan semana 1","content":"Desayuno: avena con fruta...","validFrom":"2026-06-14"}' \
  http://localhost:5050/api/patient-diets | jq .

# Registrar medidas
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"patientId":"<id>","measuredAt":"2026-06-14","weightKg":72.5,"bodyFatPercentage":22.1}' \
  http://localhost:5050/api/body-measurements | jq .

# Fecha inválida → debe devolver 400
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"patientId":"<id>","measuredAt":"no-es-fecha","weightKg":70}' \
  http://localhost:5050/api/body-measurements | jq .
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/Contracts/ApiContracts.cs apps/api/Program.cs
git commit -m "feat: add nutrition API endpoints — diets and body measurements (nutritionist only)"
```

---

## Task 8: Frontend — Página de Nutrición

**Files:**
- Create: `apps/web/app/nutricion/page.tsx`
- Create: `apps/web/app/nutricion/nutricion-page-client.tsx`
- Modify: `apps/web/lib/healthhub-store.ts`
- Modify: `apps/web/components/app-shell.tsx`

- [ ] **Step 1: Añadir tipos y acciones al store**

```typescript
export type PatientDiet = {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  content: string;
  validFrom: string;
  validUntil: string | null;
  status: string;
  createdAt: string;
};

export type BodyMeasurement = {
  id: string;
  patientId: string;
  patientName: string;
  measuredAt: string;
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  bodyFatPercentage: number | null;
  muscleMassKg: number | null;
  notes: string | null;
};

loadPatientDiets: async (patientId?: string): Promise<PatientDiet[]> => {
  const url = patientId
    ? `${API_BASE_URL}/api/patient-diets?patientId=${patientId}`
    : `${API_BASE_URL}/api/patient-diets`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar las dietas.");
  return res.json();
},

createPatientDiet: async (data: {
  patientId: string;
  title: string;
  content: string;
  validFrom: string;
  validUntil?: string;
}): Promise<PatientDiet> => {
  const res = await fetch(`${API_BASE_URL}/api/patient-diets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("No se pudo guardar la dieta.");
  return res.json();
},

loadBodyMeasurements: async (patientId?: string): Promise<BodyMeasurement[]> => {
  const url = patientId
    ? `${API_BASE_URL}/api/body-measurements?patientId=${patientId}`
    : `${API_BASE_URL}/api/body-measurements`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar las medidas.");
  return res.json();
},

createBodyMeasurement: async (data: {
  patientId: string;
  measuredAt: string;
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  bodyFatPercentage: number | null;
  muscleMassKg: number | null;
  notes: string | null;
}): Promise<BodyMeasurement> => {
  const res = await fetch(`${API_BASE_URL}/api/body-measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("No se pudieron guardar las medidas.");
  return res.json();
},
```

- [ ] **Step 2: Crear ruta**

```typescript
// apps/web/app/nutricion/page.tsx
import { NutricionPageClient } from "./nutricion-page-client";

export default function NutricionPage() {
  return <NutricionPageClient />;
}
```

- [ ] **Step 3: Crear componente cliente (con tabs Dietas / Progreso)**

```typescript
// apps/web/app/nutricion/nutricion-page-client.tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Salad, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type PatientDiet, type BodyMeasurement } from "@/lib/healthhub-store";

type Tab = "dietas" | "progreso";

type DietDraft = {
  patientId: string;
  title: string;
  content: string;
  validFrom: string;
  validUntil: string;
};

type MeasurementDraft = {
  patientId: string;
  measuredAt: string;
  weightKg: string;
  heightCm: string;
  waistCm: string;
  hipCm: string;
  armCm: string;
  bodyFatPercentage: string;
  muscleMassKg: string;
  notes: string;
};

const EMPTY_DIET: DietDraft = { patientId: "", title: "", content: "", validFrom: "", validUntil: "" };
const EMPTY_MEASUREMENT: MeasurementDraft = {
  patientId: "", measuredAt: "", weightKg: "", heightCm: "",
  waistCm: "", hipCm: "", armCm: "", bodyFatPercentage: "", muscleMassKg: "", notes: "",
};

function toDecimal(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function NutricionPageClient() {
  const {
    currentUser, loadPatientDiets, createPatientDiet,
    loadBodyMeasurements, createBodyMeasurement, patients, ready
  } = useHealthHubStore();
  const [activeTab, setActiveTab] = useState<Tab>("dietas");
  const [diets, setDiets] = useState<PatientDiet[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dietDraft, setDietDraft] = useState<DietDraft>(EMPTY_DIET);
  const [measurementDraft, setMeasurementDraft] = useState<MeasurementDraft>(EMPTY_MEASUREMENT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    Promise.all([loadPatientDiets(), loadBodyMeasurements()])
      .then(([d, m]) => { setDiets(d); setMeasurements(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, loadPatientDiets, loadBodyMeasurements]);

  async function handleCreateDiet() {
    if (!dietDraft.patientId || !dietDraft.title || !dietDraft.content) {
      setMessage({ kind: "error", text: "Completa paciente, título y contenido de la dieta." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPatientDiet({
        patientId: dietDraft.patientId,
        title: dietDraft.title,
        content: dietDraft.content,
        validFrom: dietDraft.validFrom || new Date().toISOString().slice(0, 10),
        validUntil: dietDraft.validUntil || undefined,
      });
      setDiets((prev) => [created, ...prev]);
      setDietDraft(EMPTY_DIET);
      setMessage({ kind: "success", text: "Dieta guardada correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo guardar la dieta." });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateMeasurement() {
    if (!measurementDraft.patientId || !measurementDraft.measuredAt) {
      setMessage({ kind: "error", text: "Selecciona un paciente y la fecha de medición." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createBodyMeasurement({
        patientId: measurementDraft.patientId,
        measuredAt: measurementDraft.measuredAt,
        weightKg: toDecimal(measurementDraft.weightKg),
        heightCm: toDecimal(measurementDraft.heightCm),
        waistCm: toDecimal(measurementDraft.waistCm),
        hipCm: toDecimal(measurementDraft.hipCm),
        armCm: toDecimal(measurementDraft.armCm),
        bodyFatPercentage: toDecimal(measurementDraft.bodyFatPercentage),
        muscleMassKg: toDecimal(measurementDraft.muscleMassKg),
        notes: measurementDraft.notes || null,
      });
      setMeasurements((prev) => [created, ...prev]);
      setMeasurementDraft(EMPTY_MEASUREMENT);
      setMessage({ kind: "success", text: "Medidas registradas." });
    } catch {
      setMessage({ kind: "error", text: "No se pudieron guardar las medidas." });
    } finally {
      setSaving(false);
    }
  }

  const MEASUREMENT_FIELDS = [
    { key: "weightKg" as const, label: "Peso (kg)" },
    { key: "heightCm" as const, label: "Talla (cm)" },
    { key: "waistCm" as const, label: "Cintura (cm)" },
    { key: "hipCm" as const, label: "Cadera (cm)" },
    { key: "armCm" as const, label: "Brazo (cm)" },
    { key: "bodyFatPercentage" as const, label: "% Grasa" },
    { key: "muscleMassKg" as const, label: "M. muscular (kg)" },
  ] as const;

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Planes de alimentación y seguimiento del progreso corporal de tus pacientes."
        title="Nutrición"
      />
      <div className="space-y-5 px-5 py-6 lg:px-8">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-1">
          {(["dietas", "progreso"] as Tab[]).map((tab) => (
            <button
              className={
                activeTab === tab
                  ? "flex items-center gap-2 border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary"
                  : "flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              }
              key={tab}
              onClick={() => { setActiveTab(tab); setMessage(null); }}
              type="button"
            >
              {tab === "dietas" ? <Salad size={16} /> : <TrendingUp size={16} />}
              {tab === "dietas" ? "Dietas" : "Progreso"}
            </button>
          ))}
        </div>

        {message ? (
          <div
            className={
              message.kind === "success"
                ? "rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
                : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message.text}
          </div>
        ) : null}

        {activeTab === "dietas" ? (
          <>
            <Panel title="Nueva dieta">
              <div className="space-y-3 p-4">
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-400">Paciente</span>
                  <select
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(e) => setDietDraft((d) => ({ ...d, patientId: e.target.value }))}
                    value={dietDraft.patientId}
                  >
                    <option value="">Seleccionar paciente</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-400">Título del plan</span>
                  <input
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(e) => setDietDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Ej. Plan 1200 kcal — semana 1"
                    value={dietDraft.title}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-400">Plan de alimentación</span>
                  <textarea
                    className="mt-1 min-h-40 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(e) => setDietDraft((d) => ({ ...d, content: e.target.value }))}
                    placeholder={"Desayuno: ...\nComida: ...\nCena: ..."}
                    value={dietDraft.content}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Válida desde</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(e) => setDietDraft((d) => ({ ...d, validFrom: e.target.value }))}
                      type="date"
                      value={dietDraft.validFrom}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Válida hasta (opcional)</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(e) => setDietDraft((d) => ({ ...d, validUntil: e.target.value }))}
                      type="date"
                      value={dietDraft.validUntil}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={saving}
                    onClick={handleCreateDiet}
                    type="button"
                  >
                    <Plus size={16} />
                    {saving ? "Guardando..." : "Guardar dieta"}
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Historial de dietas">
              {loading ? (
                <div className="p-4 text-sm text-slate-500">Cargando dietas...</div>
              ) : diets.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Aún no hay planes de alimentación registrados.</div>
              ) : (
                <div className="divide-y divide-border">
                  {diets.map((diet) => (
                    <div className="p-4" key={diet.id}>
                      <p className="font-medium">{diet.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {diet.patientName} · Desde {diet.validFrom}
                        {diet.validUntil ? ` hasta ${diet.validUntil}` : ""}
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                        {diet.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        ) : (
          <>
            <Panel title="Registrar medidas">
              <div className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Paciente</span>
                    <select
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(e) => setMeasurementDraft((d) => ({ ...d, patientId: e.target.value }))}
                      value={measurementDraft.patientId}
                    >
                      <option value="">Seleccionar paciente</option>
                      {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Fecha de medición</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(e) => setMeasurementDraft((d) => ({ ...d, measuredAt: e.target.value }))}
                      type="date"
                      value={measurementDraft.measuredAt}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {MEASUREMENT_FIELDS.map(({ key, label }) => (
                    <label className="block" key={key}>
                      <span className="text-xs font-medium uppercase text-slate-400">{label}</span>
                      <input
                        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                        onChange={(e) => setMeasurementDraft((d) => ({ ...d, [key]: e.target.value }))}
                        placeholder="—"
                        step="0.1"
                        type="number"
                        value={measurementDraft[key]}
                      />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-400">Observaciones (opcional)</span>
                  <textarea
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(e) => setMeasurementDraft((d) => ({ ...d, notes: e.target.value }))}
                    rows={2}
                    value={measurementDraft.notes}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={saving}
                    onClick={handleCreateMeasurement}
                    type="button"
                  >
                    <Plus size={16} />
                    {saving ? "Guardando..." : "Registrar medidas"}
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Historial de progreso">
              {loading ? (
                <div className="p-4 text-sm text-slate-500">Cargando medidas...</div>
              ) : measurements.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Aún no hay medidas corporales registradas.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-slate-400">
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Paciente</th>
                        <th className="px-3 py-2 text-right font-medium">Peso (kg)</th>
                        <th className="px-3 py-2 text-right font-medium">Talla</th>
                        <th className="px-3 py-2 text-right font-medium">Cintura</th>
                        <th className="px-3 py-2 text-right font-medium">Cadera</th>
                        <th className="px-3 py-2 text-right font-medium">% Grasa</th>
                        <th className="px-3 py-2 text-right font-medium">M. Muscular</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {measurements.map((m) => (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap px-3 py-2.5">{m.measuredAt}</td>
                          <td className="px-3 py-2.5 font-medium">{m.patientName}</td>
                          <td className="px-3 py-2.5 text-right">{m.weightKg ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right">{m.heightCm ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right">{m.waistCm ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right">{m.hipCm ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right">
                            {m.bodyFatPercentage != null ? `${m.bodyFatPercentage}%` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right">{m.muscleMassKg ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Añadir ítem de navegación (ícono `Salad`)**

```typescript
// En apps/web/components/app-shell.tsx:
import { ..., Salad } from "lucide-react";

// En allNavItems:
{
  href: "/nutricion",
  label: "Nutrición",
  icon: Salad,
  roles: ["professional"],
  specialty: ["nutritionist"],
},
```

> Usar `Salad` (ya importado en el componente de nutrición) en lugar de `Apple`, que fue removido y re-agregado en distintas versiones de lucide-react.

- [ ] **Step 5: Verificar en el navegador**

1. Sesión como nutriólogo → "Nutrición" aparece.
2. Tab "Dietas": crear plan → aparece en historial con formato `pre`.
3. Tab "Progreso": registrar medidas → aparece en tabla.
4. Sesión como médico o psicólogo → "Nutrición" NO aparece.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/nutricion/ \
        apps/web/lib/healthhub-store.ts \
        apps/web/components/app-shell.tsx
git commit -m "feat: add nutrition page for nutritionist specialty — diets and body progress tabs"
```

---

## Verificación final del sistema

- [ ] **Flujos completos por especialidad:**

| Especialidad | Módulo | Verificar |
|---|---|---|
| `doctor` | `/recetas` | Crear receta → aparece en historial |
| `psychologist` | `/tareas-paciente` | Asignar tarea → marcar completada |
| `nutritionist` | `/nutricion` | Crear dieta + registrar medidas |

- [ ] **Aislamiento por especialidad (cada sesión):**
  - Médico: ve "Recetas", NO ve "Tareas" ni "Nutrición"
  - Psicólogo: ve "Tareas", NO ve "Recetas" ni "Nutrición"
  - Nutriólogo: ve "Nutrición", NO ve "Recetas" ni "Tareas"
  - Paciente: no ve ninguno de los tres módulos

- [ ] **Autorización en API (403 cross-specialty):**

```bash
# Médico intentando acceder a endpoint de psicólogo → 403
curl -H "Authorization: Bearer <token-doctor>" http://localhost:5050/api/patient-tasks
# Esperado: 403
```

- [ ] **Validación de fechas (400 en fechas malformadas):**

```bash
curl -X POST -H "Authorization: Bearer <token-nutri>" -H "Content-Type: application/json" \
  -d '{"patientId":"<id>","measuredAt":"abc","weightKg":70}' \
  http://localhost:5050/api/body-measurements
# Esperado: 400 con mensaje de error
```

---

## Orden de ejecución recomendado

```
Task 1 → Task 2                              (foundation + migration — secuencial)
         ↓
Task 3 + Task 5 + Task 7  (en paralelo)      (backends por especialidad)
         ↓
Task 4 + Task 6 + Task 8  (en paralelo)      (frontends por especialidad)
         ↓
Verificación final
```
