# Plan de Fixes — Reporte QA de Flujos (2026-06-15)

> **Cómo usar este plan:** está pensado para ejecutarse de corrido en la próxima sesión. Cada fix trae archivo, **ancla de búsqueda** (string único para localizar el sitio aunque los números de línea se hayan corrido por ediciones previas), snippet antes/después y verificación con `curl`. Aplica los fixes **en orden** (hay dependencias encadenadas). Las líneas citadas son del estado en el commit `19debc7`; **localiza por ancla**, no por número de línea, porque cada edición desplaza las líneas siguientes.

Reporte fuente: [REPORTE-QA-FLUJOS-2026-06-15.md](REPORTE-QA-FLUJOS-2026-06-15.md) — 8 bugs confirmados (3 Critical, 3 High, 2 Medium), 0 falsos positivos.

---

## 0. Corrección de encuadre (leer antes de empezar)

Tras releer el código fuente para este plan, dos matices importan para priorizar:

1. **R-7 ya está implementado.** `IsDevAuthEnabled` (`apps/api/Program.cs`, función `static bool IsDevAuthEnabled`) ya exige `environment.IsDevelopment()` **+** flag `Authentication:EnableDevAuth` **+** IP loopback. Por tanto **C-1 (header forjado) y H-2 (`?userId`) sólo aplican en dev local** — en producción (entorno no-Development) el dev-auth está apagado por completo. Siguen siendo bugs reales (rompen aislamiento en dev, permiten que un dev impersone a cualquiera localmente, y son defensa en profundidad), pero **NO son un hueco de seguridad en producción**. Se arreglan igual (identidad limpia), con prioridad media.

2. **C-2 y H-1 SÍ son relevantes en producción.** No dependen del dev-auth: son lógica de autorización (`CanCreateAppointment` + auto-creación de relación `ProfessionalPatients` + `GetAccessiblePatientIdsAsync`). Aplican también bajo Clerk JWT real. **Son la prioridad de seguridad #1.**

**Orden recomendado:** FIX 1 (desbloquea features, riesgo mínimo) → FIX 2 + FIX 3 (cadena de seguridad C-2/H-1, prod-relevante) → FIX 4 (identidad dev) → FIX 5 (slots) → FIX 6 (lectura paciente, opcional).

---

## Prerrequisitos (arrancar entorno)

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub
# Levantar API en :5050 con dev-auth (en background). dotnet vive en ~/.dotnet
ASPNETCORE_ENVIRONMENT=Development $HOME/.dotnet/dotnet run \
  --project apps/api/HealthHub.Api.csproj --urls http://127.0.0.1:5050 > /tmp/healthhub-api.log 2>&1 &
# Esperar a que arranque
until curl -s -m 2 http://127.0.0.1:5050/health >/dev/null 2>&1; do sleep 1; done
curl -s http://127.0.0.1:5050/health   # -> {"status":"ok","database":"connected",...}
```

**Personas dev (header `X-HealthHub-Dev-User: <userId>`):**
| Rol | userId | professionalId / patientId | specialty | Paciente/Pro vinculado |
|-----|--------|----------------------------|-----------|------------------------|
| Pro | `usr-laura-vega` | `pro-laura-vega` | nutritionist | paciente `ana-martinez` |
| Pro | `usr-nora-ibarra` | `pro-nora-ibarra` | psychologist | paciente `sofia-leon` |
| Pat | `usr-ana-martinez` | `ana-martinez` | — | pro `pro-laura-vega` |
| Pat | `usr-sofia-leon` | `sofia-leon` | — | pro `pro-nora-ibarra` |

Servicios: `svc-laura-inicial`, `svc-laura-seguimiento` (Laura); `svc-nora-terapia` (Nora).

---

## FIX 1 — C-3 / H-3 / M-2: quitar las 9 `.RequireAuthorization()` de los endpoints de especialidad

**Resuelve:** C-3 (Critical), H-3 (High), M-2 (Medium) — los 3 comparten esta causa raíz.
**Archivo:** `apps/api/Program.cs`
**Riesgo:** Muy bajo. El comentario en el propio código (ancla: `No usamos .RequireAuthorization() a nivel grupo porque el middleware JWT de Clerk rechaza los tokens legacy/dev`) documenta que este patrón es incorrecto. La auth real ya la hacen el middleware global + `GetAuthorizedProfessional` dentro de cada handler.

**Acción:** Eliminar la cláusula `.RequireAuthorization()` (dejando sólo `});`) en los **9 endpoints** de especialidad. En el commit `19debc7` están en las líneas **3603, 3646, 3667, 3703, 3731, 3752, 3791, 3812, 3848**. Confírmalas con:

```bash
grep -n "}).RequireAuthorization();" apps/api/Program.cs
```

Cada uno pasa de:
```csharp
    return Results.Ok(/* ... */);
}).RequireAuthorization();
```
a:
```csharp
    return Results.Ok(/* ... */);
});
```

> Sólo deben quedar `.RequireAuthorization()` en endpoints que usen **exclusivamente** JWT Clerk (verifica que no quede ninguno sobre prescriptions/patient-tasks/patient-diets/body-measurements). Tras el fix, `grep -c "RequireAuthorization" apps/api/Program.cs` debe bajar de 10 a 1 (queda sólo la línea del comentario).

**Build + verificación:**
```bash
$HOME/.dotnet/dotnet build apps/api/HealthHub.Api.csproj   # 0 errores
# Reiniciar API (matar y relevantar — ver Prerrequisitos), luego:

# Dueño legítimo: ahora debe ejecutar el handler (201/200), no 401
curl -s -o /dev/null -w "diet POST laura(dueña): %{http_code}\n" -X POST \
  -H 'X-HealthHub-Dev-User: usr-laura-vega' -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","title":"Plan QA","content":"Desayuno...","validFrom":"2026-06-22"}' \
  http://127.0.0.1:5050/api/patient-diets        # esperado: 201
curl -s -o /dev/null -w "task  GET  nora(dueña):  %{http_code}\n" \
  -H 'X-HealthHub-Dev-User: usr-nora-ibarra' \
  "http://127.0.0.1:5050/api/patient-tasks?patientId=sofia-leon"   # esperado: 200

# Cross-especialidad: ahora debe ser 403 (no 401)
curl -s -o /dev/null -w "presc POST laura(no-doc):%{http_code}\n" -X POST \
  -H 'X-HealthHub-Dev-User: usr-laura-vega' -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","medicationName":"X","dosage":"1","frequency":"1","duration":"1","instructions":"i","refills":0}' \
  http://127.0.0.1:5050/api/prescriptions        # esperado: 403

# Paciente: ahora 403 coherente (no 401)
curl -s -o /dev/null -w "diet  GET  ana(paciente):%{http_code}\n" \
  -H 'X-HealthHub-Dev-User: usr-ana-martinez' \
  "http://127.0.0.1:5050/api/patient-diets?patientId=ana-martinez"   # esperado: 403 (o 200 si se hace FIX 6)
```

---

## FIX 2 — H-1: exigir relación profesional-paciente al agendar (corta la entrada a C-2)

**Resuelve:** H-1 (High). Es la puerta de entrada de C-2 (un profesional agenda para un paciente ajeno y eso le auto-crea acceso clínico).
**Archivo:** `apps/api/Program.cs`
**Causa:** `CanCreateAppointment` (ancla: `static bool CanCreateAppointment`) para rol `professional` sólo valida identidad propia (`actor.Professional?.Id == professionalId`), no la relación con el paciente. Como `CanCreateAppointment` es síncrono y sin DB, la validación de relación se mueve al **handler** `POST /api/appointments` (ancla del sitio: `if (actor is not null && !CanCreateAppointment(actor, patient.Id, professional?.Id))`).

**Acción:** En el handler `appointmentsApi.MapPost("/", ...)`, justo **después** del bloque `CanCreateAppointment` existente, añadir el guard de relación para profesionales:

```csharp
// (bloque existente — NO tocar)
if (actor is not null && !CanCreateAppointment(actor, patient.Id, professional?.Id))
{
    AddAuditLog(db, httpRequest, actor, "appointment.create.denied", "appointment", "new", patient.Id, professional?.Id, "denied");
    await db.SaveChangesAsync();
    return Results.StatusCode(StatusCodes.Status403Forbidden);
}

// NUEVO: un profesional sólo puede agendar para pacientes con relación activa previa.
// (El flujo legítimo profesional->paciente nuevo se crea cuando el PACIENTE agenda; ver auto-relación abajo.)
if (actor is { PrimaryRole: "professional", Professional: not null } && professional is not null
    && actor.Professional.Id == professional.Id)
{
    var hasRelation = await db.ProfessionalPatients
        .AnyAsync(pp => pp.ProfessionalId == professional.Id
                     && pp.PatientId == patient.Id
                     && pp.Status == "active");
    if (!hasRelation)
    {
        AddAuditLog(db, httpRequest, actor, "appointment.create.denied", "appointment", "new", patient.Id, professional.Id, "no_relation");
        await db.SaveChangesAsync();
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }
}
```

> Nota: el bloque de auto-creación de relación (ancla: `var relationExists = await db.ProfessionalPatients.AnyAsync`) se mantiene — sigue siendo correcto para el flujo donde el **paciente** agenda (ahí no entra el guard nuevo porque `actor.PrimaryRole == "patient"`). El guard nuevo sólo bloquea que un **profesional** se auto-asigne un paciente con el que no tiene relación.

**Verificación:**
```bash
# Nora (psicóloga) intenta agendar para ana-martinez (paciente de Laura, sin relación con Nora) -> 403
curl -s -o /dev/null -w "cross-book nora->ana: %{http_code}\n" -X POST \
  -H 'X-HealthHub-Dev-User: usr-nora-ibarra' -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","date":"2026-07-13","time":"12:30","reason":"x","professionalServiceId":"svc-nora-terapia"}' \
  http://127.0.0.1:5050/api/appointments        # esperado: 403 (antes: 201)

# Control: el paciente sí puede agendar consigo mismo (flujo legítimo) -> 201
#   (usa available-slots de pro-nora-ibarra para un slot real)
curl -s "http://127.0.0.1:5050/api/professionals/pro-nora-ibarra/available-slots?serviceId=svc-nora-terapia&days=21" \
  -H 'X-HealthHub-Dev-User: usr-sofia-leon' | head -c 300
```

---

## FIX 3 — C-2: el acceso clínico se deriva sólo de relaciones activas, no de cualquier cita

**Resuelve:** C-2 (Critical) — fuga de notas SOAP / PHI entre pacientes.
**Archivo:** `apps/api/Program.cs`
**Causa:** `GetAccessiblePatientIdsAsync` (ancla: `static async Task<List<string>?> GetAccessiblePatientIdsAsync`) para rol `professional` hace `relationPatientIds.Union(appointmentPatientIds)`, donde `appointmentPatientIds` = **todo paciente con cualquier cita** del profesional, sin filtrar por relación activa. Eso convierte cualquier cita (incluida una cruzada) en acceso a PHI.

**Acción:** Eliminar la derivación por citas. Como toda cita legítima ya crea/activa una fila `ProfessionalPatients` (auto-relación en `POST /appointments`), la relación activa es la única fuente de verdad necesaria.

Antes (rama `professional`):
```csharp
var professionalId = actor.Professional.Id;
var relationPatientIds = await db.ProfessionalPatients
    .AsNoTracking()
    .Where(relation => relation.ProfessionalId == professionalId && relation.Status == "active")
    .Select(relation => relation.PatientId)
    .ToListAsync();
var appointmentPatientIds = await db.Appointments
    .AsNoTracking()
    .Where(appointment => appointment.ProfessionalId == professionalId)
    .Select(appointment => appointment.PatientId)
    .Distinct()
    .ToListAsync();

return relationPatientIds.Union(appointmentPatientIds).Distinct().ToList();
```
Después:
```csharp
var professionalId = actor.Professional.Id;
return await db.ProfessionalPatients
    .AsNoTracking()
    .Where(relation => relation.ProfessionalId == professionalId && relation.Status == "active")
    .Select(relation => relation.PatientId)
    .Distinct()
    .ToListAsync();
```

> Combinado con FIX 2, ya no es posible crear la relación cruzada que habilitaba la fuga. Si se quiere conservar "cita ⇒ acceso", restringirlo a citas **completadas con servicio propio** — pero con la auto-relación existente no hace falta.

**Verificación (requiere FIX 1 aplicado para que SOAP responda):**
```bash
# Nora intenta leer/crear SOAP de ana-martinez (no es su paciente) -> 403
curl -s -o /dev/null -w "SOAP POST nora->ana: %{http_code}\n" -X POST \
  -H 'X-HealthHub-Dev-User: usr-nora-ibarra' -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","date":"2026-06-15","title":"x","status":"draft","subjective":"s","objective":"o","assessment":"a","plan":"p","aiGenerated":false}' \
  http://127.0.0.1:5050/api/soap-notes          # esperado: 403
# GET de Nora NO debe incluir notas de ana-martinez
curl -s -H 'X-HealthHub-Dev-User: usr-nora-ibarra' http://127.0.0.1:5050/api/soap-notes \
  | grep -c "ana-martinez"                       # esperado: 0
```

---

## FIX 4 — C-1 / H-2: resolución de identidad limpia (sin usuario por defecto ni `?userId`)

**Resuelve:** C-1 (Critical, dev-local), H-2 (High, dev-local). Defensa en profundidad + correctitud de dev.
**Archivo:** `apps/api/Program.cs`
**Causa:** Cuando `GetUserFromRequestAsync` devuelve `null` (header inválido/ausente), varios handlers caen a `DefaultDemoUserId` o a un `?userId` controlado por el cliente. `GetUserFromRequestAsync` **ya** resuelve el header dev a un usuario real; basta con eliminar los fallbacks.

**7 sitios** (todos GET). Localiza por ancla:

**4a. Identidad por defecto (C-1)** — 3 sitios con ancla `string.IsNullOrWhiteSpace(userId) ? DefaultDemoUserId : userId.Trim()`:
- `/api/me` (`app.MapGet("/api/me"`)
- `/api/patient-portal/appointments` (`patientPortalApi.MapGet("/appointments"`)
- `/api/patient-portal/records` (`patientPortalApi.MapGet("/records"`)

En cada uno, **borrar** el bloque:
```csharp
if (<user> is null && IsDevAuthEnabled(request))
{
    var sessionUserId = string.IsNullOrWhiteSpace(userId) ? DefaultDemoUserId : userId.Trim();
    <user> = await db.Users.AsNoTracking().Include(...).FirstOrDefaultAsync(item => item.Id == sessionUserId);
}
```
- En `/api/me`: además cambiar el retorno final de `Results.NotFound()` a `Results.Unauthorized()` cuando `user is null`, y quitar el parámetro `string? userId` de la firma.
- En `/appointments` y `/records`: el código ya retorna lista vacía si `currentUser?.Patient is null`, así que sólo borra el bloque y quita `string? userId` de la firma.

**4b. Impersonación por `?userId` (H-2)** — 4 sitios con ancla `.FirstOrDefaultAsync(user => user.Id == userId.Trim())`:
- `/api/professional-portal/dashboard`
- `/api/professional-portal/onboarding`
- `/api/professional-portal/payments`
- `/api/professional-portal/subscription`

En cada uno, **borrar** el bloque:
```csharp
if (currentUser is null && IsDevAuthEnabled(request) && !string.IsNullOrWhiteSpace(userId))
{
    currentUser = await db.Users.AsNoTracking().Include(user => user.Professional).FirstOrDefaultAsync(user => user.Id == userId.Trim());
}
```
y quitar `string? userId` de la firma (en `/payments` la firma es `string? month, string? userId` — conserva `month`, quita `userId`). El handler ya retorna `Results.Unauthorized()` si `currentUser?.Professional is null`.

**4c.** Finalmente, eliminar la constante ya sin usos: `const string DefaultDemoUserId = "usr-ana-martinez";` (ancla `DefaultDemoUserId =`). Verifica con `grep -c DefaultDemoUserId apps/api/Program.cs` → debe ser 0.

> **Opcional (defensa en profundidad en middleware):** en el bloque `app.Use(async (context, next) =>`, `hasDevSession` valida sólo que el header sea no vacío. Se puede endurecer para exigir que el header resuelva a un usuario real, pero implica una consulta extra a DB en el middleware. Dado que cada handler ya resolverá `null → 401` tras 4a/4b, esto es opcional.

**Verificación:**
```bash
# Header forjado: ya NO debe autenticar como Ana
curl -s -o /dev/null -w "me  bogus-header: %{http_code}\n" -H 'X-HealthHub-Dev-User: usr-fantasma' http://127.0.0.1:5050/api/me                      # esperado: 401 (antes: 200 como Ana)
# ?userId: ya NO debe devolver el perfil de otro
curl -s -o /dev/null -w "me  ?userId=laura: %{http_code}\n" -H 'X-HealthHub-Dev-User: usr-fantasma' 'http://127.0.0.1:5050/api/me?userId=usr-laura-vega'  # esperado: 401
# Control: header válido sigue funcionando
curl -s -o /dev/null -w "me  laura-real:   %{http_code}\n" -H 'X-HealthHub-Dev-User: usr-laura-vega' http://127.0.0.1:5050/api/me                    # esperado: 200
# Impersonación de payments por ?userId -> ya no
curl -s -o /dev/null -w "payments ?userId:  %{http_code}\n" -H 'X-HealthHub-Dev-User: usr-ana-martinez' 'http://127.0.0.1:5050/api/professional-portal/payments?userId=usr-laura-vega'  # esperado: 401
```

---

## FIX 5 — M-1: deduplicar `available-slots` + unicidad de disponibilidad

**Resuelve:** M-1 (Medium).
**Archivo:** `apps/api/Program.cs`

**5a. Deduplicar slots por id** en `BuildAvailableSlots` (ancla: `static List<AvailableSlotDto> BuildAvailableSlots`). Cambiar el `return` final:

Antes:
```csharp
return slots
    .OrderBy(item => item.Date)
    .ThenBy(item => item.Time)
    .Take(40)
    .ToList();
```
Después:
```csharp
return slots
    .GroupBy(item => item.Id)
    .Select(group => group.First())
    .OrderBy(item => item.Date)
    .ThenBy(item => item.Time)
    .Take(40)
    .ToList();
```

**5b. Guard de idempotencia** en `POST /api/professional-portal/availability` (ancla: `professionalPortalApi.MapPost("/availability"`). Antes de construir/insertar la nueva fila (justo después de la validación `errors`), rechazar duplicados activos:
```csharp
var duplicate = await db.ProfessionalAvailability.AnyAsync(item =>
    item.ProfessionalId == actor.Professional.Id &&
    item.Weekday == availabilityRequest.Weekday &&
    item.StartsAt == availabilityRequest.StartsAt.Trim() &&
    item.EndsAt == availabilityRequest.EndsAt.Trim() &&
    item.Status == "active");
if (duplicate)
{
    return Results.Conflict(new { errors = new[] { "Ya existe una franja activa idéntica." } });
}
```

> **Opcional (datos):** limpiar las ~28 filas duplicadas de `pro-laura-vega` que ya existen en la DB dev (se eliminan al resetear la DB — ver Limpieza). En prod, un índice único `(ProfessionalId, Weekday, StartsAt, EndsAt)` con migración EF cerraría el caso de forma definitiva.

**Verificación:**
```bash
curl -s "http://127.0.0.1:5050/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-inicial&days=21" \
  -H 'X-HealthHub-Dev-User: usr-ana-martinez' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);ids=[s['id'] for s in d];print('total',len(ids),'únicos',len(set(ids)))"
# esperado: total == únicos (sin duplicados)
```

---

## FIX 6 — H-3 (producto, OPCIONAL): lectura del paciente de sus propios datos clínicos

**Resuelve:** el gap de producto de H-3 (el paciente no tiene ruta para ver sus recetas/tareas/dietas).
**Archivo:** `apps/api/Program.cs`
**Decisión de diseño (elegir una):**
- **Opción A (mínima):** en `/api/patient-portal/records` (o un nuevo `/api/patient-portal/clinical`) incluir las dietas/tareas/recetas marcadas como visibles del paciente autenticado.
- **Opción B:** en los GET de especialidad (`/api/patient-diets`, `/api/patient-tasks`, `/api/prescriptions`), permitir que el actor sea el **propio paciente** (`actor.Patient?.Id == patientId`) además del profesional dueño, filtrando por `Status`/visibilidad.

> Marcar este fix como pendiente de decisión de producto; no bloquea los demás. Si no se hace, dejar documentado que el paciente no ve sus datos de especialidad (sólo `/records`).

---

## Validación final

```bash
cd /Users/fernandohuerta/Documents/GPT/HealthHub
$HOME/.dotnet/dotnet build apps/api/HealthHub.Api.csproj   # 0 errores
npm run lint:web                                           # limpio (no se tocó web salvo FIX 6 opción A)

# Re-correr el suite de pruebas existente (necesita ASPNETCORE_ENVIRONMENT=Development en la API)
#   Ojo: sensible a 409 por slot residual (verde en run 2) y 429 por rate-limit de /api/auth (reiniciar API resetea).
npm run test:api
```

**Re-verificación end-to-end (opcional pero recomendado):** re-lanzar el workflow de QA multi-agente que generó el reporte para confirmar que los 8 hallazgos quedan cerrados (0 confirmados). Script guardado en:
`~/.claude/.../workflows/scripts/healthhub-flow-qa-wf_0593e974-e20.js` (o re-describir las 4 personas + verificación). Esperado tras los fixes: C-1/H-2 → 401, H-1 → 403, C-2 → sin fuga, C-3/H-3 → 200/403 coherentes, M-1 → slots únicos.

## Limpieza de datos de prueba

Las corridas de QA dejaron artefactos en la DB dev (citas cruzadas `apt-1781551040280`, `apt-1781550856776`, `apt-1781550947057`; notas SOAP `soap-178155094*`; ~28 filas duplicadas de disponibilidad de Laura; usuarios `usr-profesional-qa-*` y `usr-dra-demo-curl` de sesiones previas). La forma limpia de resetear:

```bash
# Recrea la DB dev desde cero (el seeder vuelve a sembrar las 4 personas + relaciones).
# Postgres local: healthhub_dev. Confirmar credenciales en appsettings.Development.json.
PGPASSWORD=healthhub_dev psql -h localhost -U healthhub -d postgres \
  -c "DROP DATABASE IF EXISTS healthhub WITH (FORCE);" -c "CREATE DATABASE healthhub OWNER healthhub;"
# Al reiniciar la API, DatabaseSeeder.InitializeAsync corre las migraciones y re-siembra.
```

> Si no quieres perder datos, basta con borrar selectivamente las filas `apt-178155*` / `soap-178155*` y las disponibilidades duplicadas. El reset completo es lo más simple para un entorno de QA.

---

## Checklist de ejecución

- [ ] Prerrequisitos: API en :5050 con dev-auth, `/health` ok
- [ ] **FIX 1** — quitar 9 `.RequireAuthorization()` → build → verificar (diet 201, cross 403, paciente 403)
- [ ] **FIX 2** — guard de relación en POST /appointments → verificar (cross-book 403)
- [ ] **FIX 3** — `GetAccessiblePatientIdsAsync` sólo relaciones activas → verificar (SOAP 403, grep 0)
- [ ] **FIX 4** — quitar 7 fallbacks de identidad + `DefaultDemoUserId` → verificar (forjado 401, ?userId 401, real 200)
- [ ] **FIX 5** — dedup slots + guard disponibilidad → verificar (total == únicos)
- [ ] **FIX 6** — (opcional, decisión de producto) lectura paciente de datos clínicos
- [ ] Validación final: build api, lint web, test:api
- [ ] Limpieza de DB dev
- [ ] Commit (`git checkout -b fix/qa-flow-findings` antes de empezar, ya que `main` es la rama por defecto)
- [ ] Actualizar seguimiento-proyecto.md / comentarios_claude.md con el resultado
