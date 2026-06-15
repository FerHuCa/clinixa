# Reporte de Pruebas Internas — Flujos Clinixa (2026-06-15)

## Resumen ejecutivo

Se ejecutaron **4 agentes simulados** contra el API real en `http://127.0.0.1:5050` usando autenticación de desarrollo (header `X-HealthHub-Dev-User`):

- **2 profesionales:** Laura Vega (nutricionista, `usr-laura-vega` / `pro-laura-vega`) y Nora Ibarra (psicóloga, `usr-nora-ibarra` / `pro-nora-ibarra`).
- **2 pacientes:** Ana Martinez (`usr-ana-martinez`) y Sofia Leon (`usr-sofia-leon`), incluyendo un perfil adversario de autorización (`pat:sofia-adversary`).

Cada bug candidato fue verificado adversarialmente re-ejecutando su repro. Se ejercitaron más de **45 flujos** (booking completo, checkout simulado, reseñas, moderación, onboarding profesional, aislamiento cross-tenant, escalada de roles, enumeración de identidad).

**Bugs confirmados: 8** (0 falsos positivos).

| Severidad | Cantidad | Bugs |
|-----------|----------|------|
| **Critical** | 3 | Bypass de auth con header forjado; fuga de notas SOAP cross-paciente; regresión `.RequireAuthorization()` que bloquea toda la API de especialidades |
| **High** | 3 | Agendar cita para paciente ajeno (sin ownership); suplantación de identidad vía `?userId`; endpoints de especialidad inaccesibles bajo dev-auth (pro dueño incluido) |
| **Medium** | 2 | `available-slots` con 28 slots duplicados; el paciente no puede leer sus propios datos clínicos (401) |
| **Low** | 0 | — |

> Nota: dos hallazgos (Critical de Nora y High de Laura) describen **la misma causa raíz** (`.RequireAuthorization()` en los endpoints de especialidad). Se consolidan en un único hallazgo (H-3) por claridad, manteniendo la severidad Critical.

## Cobertura

Flujos probados que **pasaron** correctamente:

**Identidad y portal (ambos roles):**
- `GET /api/me` devuelve la identidad correcta para cada actor (paciente y profesional, con `specialty` y `professionalId` correctos).
- `GET /api/professional-portal/dashboard`, `/onboarding`, `/reviews` → 200 con datos del profesional.
- `GET /api/patient-portal/appointments` y `/records` → 200 con datos del paciente correctos.

**Booking y pagos (paciente Ana):**
- Crear cita en slot libre → 201; reagendar (`/reschedule`) → 200; cancelar (`/cancel`) → 200 con re-GET confirmando `cancelled`.
- Doble-reserva en mismo slot rechazada → 409.
- Checkout simulado → 200 con `paymentId`, `initPoint` y monto correcto (950 MXN).
- `cash-payment` correctamente denegado al paciente → 403 (acción del profesional).

**Validaciones de entrada (paciente Ana):**
- Reseña con rating fuera de rango (7, 0) → 400; reseña de cita no completada → 400; reseña de cita inexistente → 400.
- Booking con fecha basura / campos vacíos / fecha pasada → 400 con mensajes claros por campo.

**Gestión profesional (Laura):**
- Crear/editar servicio (`POST`/`PATCH /services`) → 201/200; crear disponibilidad → 201.

**Notas clínicas legítimas (Nora):**
- `POST /api/soap-notes` para `sofia-leon` (paciente vinculado) → 201.
- Moderación de reseña como no-admin (`PATCH /reviews/{id}/moderate`) → 403 correcto.

**Aislamiento y seguridad que SÍ funciona (adversario Sofia):**
- Escalada de rol bloqueada: `POST` a `/patient-diets`, `/patient-tasks`, `/prescriptions` como paciente → 401.
- Suplantación por body bloqueada: `POST /appointments` con `patientId=ana-martinez` usando identidad real de Sofia → 403.
- Modificación cross-tenant bloqueada: `PATCH` sobre cita ajena → 404.
- Header ausente / vacío → 401.
- Admin bloqueado para paciente (`/admin/professionals`, `/admin/marketplace/pending`) → 403.
- Scoping autenticado: Sofia con su header solo ve sus propias citas y records.

## Hallazgos

### [CRITICAL] C-1 — Bypass de autenticación: cualquier header dev forjado se trata como el usuario demo por defecto y permite leer y ESCRIBIR datos reales

- **Endpoint:** `/api/me`, `/api/patient-portal/appointments`, `POST /api/appointments` (y toda ruta que use el fallback dev).
- **Método:** GET / POST.
- **Encontrado por:** `pat:sofia-adversary`.
- **Esperado:** `401 Unauthorized`. Un header que no corresponde a ningún usuario real no debe autenticar ninguna sesión ni leer/escribir datos en nombre de un usuario por defecto.
- **Observado:** `GET /api/me` con `X-HealthHub-Dev-User: usr-fantasma` → 200 devolviendo el perfil de `usr-ana-martinez`. `GET /api/patient-portal/appointments` → 200 con las citas reales de Ana. `POST /api/appointments` → 201, creó `apt-1781551040280` a nombre de `ana-martinez` (persistido y visible para la sesión real de Ana). Controles: sin header → 401; header vacío → 401. Es decir, basta CUALQUIER valor no vacío para autenticar.
- **Evidencia/repro:**
  ```bash
  curl -s -w '\n[HTTP:%{http_code}]\n' -H 'X-HealthHub-Dev-User: usr-fantasma' http://127.0.0.1:5050/api/me
  # -> 200 {"id":"usr-ana-martinez",...}
  ```
- **Causa probable:** El middleware en `Program.cs:152-154` solo valida que el header sea **no vacío** (`IsDevAuthEnabled` + `!IsNullOrWhiteSpace`), sin resolverlo a un usuario existente. `GetUserFromRequestAsync` (`Program.cs:3919-3930`) hace `FirstOrDefaultAsync(Id == header)` y devuelve `null` para un id desconocido. Los handlers entonces caen al fallback `DefaultDemoUserId = "usr-ana-martinez"` (`Program.cs:128`) en `Program.cs:185` (`/api/me`) y en las rutas de portal (`~1817`, `~1852`). El check `IsNullOrWhiteSpace` allí opera sobre el **query param** `userId`, no sobre el header, por lo que siempre cae al demo.
- **Cambio recomendado:**
  1. **Eliminar el fallback a `DefaultDemoUserId`.** Si `GetUserFromRequestAsync` devuelve `null`, responder `401`, nunca resolver una identidad por defecto. En `/api/me` (`Program.cs:183-191`) reemplazar el bloque `user is null && IsDevAuthEnabled` por un `return Results.Unauthorized();`.
  2. **Validar el header contra la DB en el middleware** (`Program.cs:153-154`): `hasDevSession` debe exigir que el header resuelva a un `User` real, no solo que sea no vacío. Reusar/cachear `GetUserFromRequestAsync` para evitar la doble consulta.
  3. Restringir `IsDevAuthEnabled` a entornos de desarrollo explícitos (`ASPNETCORE_ENVIRONMENT == "Development"` + flag de configuración) para que este modo nunca se active en producción.

---

### [CRITICAL] C-2 — Fuga de datos clínicos entre pacientes: un psicólogo puede crear y leer notas SOAP de un paciente ajeno

- **Endpoint:** `/api/soap-notes`.
- **Método:** POST y GET.
- **Encontrado por:** PRO Nora Ibarra (`usr-nora-ibarra` / `pro-nora-ibarra`, vinculada solo a `sofia-leon`).
- **Esperado:** `POST` → 403 (`CanAccessPatientAsync` debe rechazar a un profesional sin vínculo legítimo). `GET` → solo notas de pacientes propios; nunca las de `ana-martinez`.
- **Observado:** `POST /api/soap-notes` con `patientId=ana-martinez` → 201 (creó nota con `subjective`/`assessment`/`plan`). `GET /api/soap-notes` como Nora → 200 incluyendo el expediente de `ana-martinez`: `soap-001` ("Seguimiento nutricional", finalized, de `pro-laura-vega`) y notas de corridas previas. Lectura y escritura cruzada de PHI confirmadas. Control de aislamiento: `POST` para un paciente realmente sin relación (`zzz-unrelated`) → 403 (el gate sí aplica en general).
- **Evidencia/repro:**
  ```bash
  curl -s -w '\nHTTP:%{http_code}\n' -X POST -H 'X-HealthHub-Dev-User: usr-nora-ibarra' -H 'Content-Type: application/json' \
    -d '{"patientId":"ana-martinez","date":"2026-06-15","title":"Nota cruzada","status":"draft","subjective":"acceso indebido","objective":"o","assessment":"diagnostico filtrado","plan":"p","aiGenerated":false}' \
    http://127.0.0.1:5050/api/soap-notes
  curl -s -H 'X-HealthHub-Dev-User: usr-nora-ibarra' http://127.0.0.1:5050/api/soap-notes
  ```
- **Causa probable:** Este endpoint **hereda** el defecto de C-1. El gate `CanAccessPatientAsync` (`Program.cs:4666-4670`), usado por el filtro GET (`Program.cs:3443-3447`) y el guard POST (`Program.cs:3488-3491`), depende de `GetAccessiblePatientIdsAsync` (`Program.cs:4616-4664`). Para un profesional (`Program.cs:4641-4648`) este hace `Union` de las relaciones `ProfessionalPatients` activas con **`appointmentPatientIds` = todo paciente con CUALQUIER cita del profesional**, sin filtrar por vínculo legítimo. Como la cita cruzada de H-1 hace a `ana-martinez` "accesible", create + read de SOAP quedan habilitados. Viola aislamiento de pacientes y NOM-024.
- **Cambio recomendado:**
  - En `GetAccessiblePatientIdsAsync` (`Program.cs:4641-4648`), **dejar de derivar acceso clínico de la mera existencia de una cita**. El acceso debe basarse exclusivamente en relaciones `ProfessionalPatients` activas. Si se quiere conservar la conveniencia de "cita ⇒ acceso", restringirla a citas **completadas y con servicio propio**, y reflejar esa relación insertando/activando la fila `ProfessionalPatients` correspondiente al crear la cita (ya existe lógica de creación de relación en `Program.cs:786-789`), no derivándola implícitamente en cada lectura.
  - Corregir H-3 (abajo) para impedir la cita cruzada que es la puerta de entrada.

---

### [CRITICAL] C-3 — Regresión: los endpoints de módulos por especialidad usan `.RequireAuthorization()` y devuelven 401 con dev-auth, bloqueando TODA la API de prescriptions/patient-tasks/patient-diets/body-measurements

- **Endpoint:** `/api/prescriptions`, `/api/patient-tasks`, `/api/patient-diets`, `/api/body-measurements` (GET, POST y PATCH).
- **Método:** GET / POST / PATCH.
- **Encontrado por:** PRO Laura Vega (nutricionista) y PRO Nora Ibarra (psicóloga); confirmado también para el profesional **dueño** legítimo de cada recurso.
- **Esperado:** Que la lógica del handler se ejecute: 201/200 en operaciones válidas del dueño; 403 cross-especialidad/ownership; 400 en validación; 404 en id inexistente. El dev-auth debe autenticar igual que en `/api/me` y `/api/appointments`.
- **Observado:** `401 Unauthorized` (`Content-Length: 0`, `WWW-Authenticate: Bearer`) en **todos** los métodos y endpoints, incluso para el profesional dueño (Laura sobre sus propias dietas/medidas de `ana-martinez`; Nora sobre tareas de `sofia-leon`). El handler nunca corre. Controles con el mismo header: `GET /api/me` → 200, `POST /api/appointments` → 400 (llega a validación, no 401). El contraste prueba que el dev-auth funciona salvo donde se aplica `.RequireAuthorization()`.
- **Evidencia/repro:**
  ```bash
  curl -s -i -X POST -H 'X-HealthHub-Dev-User: usr-laura-vega' -H 'Content-Type: application/json' \
    -d '{"patientId":"ana-martinez","title":"Plan","content":"c","validFrom":"2026-06-22"}' \
    http://127.0.0.1:5050/api/patient-diets    # -> 401, WWW-Authenticate: Bearer
  curl -s -o /dev/null -w '%{http_code}' -H 'X-HealthHub-Dev-User: usr-laura-vega' http://127.0.0.1:5050/api/me  # -> 200
  ```
- **Causa probable:** Las llamadas `.RequireAuthorization()` encadenadas a los endpoints de especialidad activan el middleware JWT de Clerk, que rechaza el token dev/legacy y corta con 401 **antes** del handler. Líneas exactas en `Program.cs`: **3603** (GET prescriptions), **3646** (POST prescriptions), **3667** (GET patient-tasks), **3703** (POST patient-tasks), **3731** (PATCH patient-tasks/status), **3752** (GET patient-diets), **3791** (POST patient-diets), **3812** (GET body-measurements), **3848** (POST body-measurements). El comentario en `Program.cs:2532-2533` documenta el patrón correcto: *"La sesión se valida dentro de cada handler con `GetUserFromRequestAsync`… No usamos `.RequireAuthorization()` a nivel grupo porque el middleware JWT de Clerk rechaza los tokens legacy/dev."* Los handlers ya validan vía `GetAuthorizedProfessional` (`Program.cs:3852-3864`), que devuelve 401/403 correctamente; esa lógica nunca se alcanza.
- **Cambio recomendado:** **Eliminar las 9 llamadas `.RequireAuthorization()`** en las líneas indicadas. Ejemplo concreto:
  ```csharp
  // Antes (Program.cs:3603)
      return Results.Ok(items.Select(p => ToPrescriptionDto(p)));
  }).RequireAuthorization();
  // Después
      return Results.Ok(items.Select(p => ToPrescriptionDto(p)));
  });
  ```
  La autenticación queda cubierta por el middleware global (`Program.cs:142-164`) y `GetAuthorizedProfessional` dentro de cada handler, igual que el resto de la API. Tras el fix, validar que escalada de rol y lectura cross-tenant sigan devolviendo 403 (no 401) — ver R-2.

---

### [HIGH] H-1 — Un profesional puede agendar una cita para un paciente que NO le pertenece (sin verificación de ownership en `POST /api/appointments`)

- **Endpoint:** `/api/appointments`.
- **Método:** POST.
- **Encontrado por:** PRO Nora Ibarra (`pro-nora-ibarra`, vinculada solo a `sofia-leon`).
- **Esperado:** `403` (o `404`): un profesional no debería crear una cita para un paciente con el que no tiene relación `ProfessionalPatients`.
- **Observado:** `201 Created`. Nora (psicóloga) agendó para `ana-martinez` (paciente de Laura) bajo su propio `pro-nora-ibarra` + `svc-nora-terapia`. Impacto end-to-end verificado en vivo: tras crear la cita cruzada, `GET /api/patients` como Nora devuelve `['sofia-leon','ana-martinez']` — `ana-martinez` se filtra. Es la puerta de entrada al fallo C-2 (SOAP cross-paciente).
- **Evidencia/repro:**
  ```bash
  curl -s -w '\nHTTP:%{http_code}\n' -X POST -H 'X-HealthHub-Dev-User: usr-nora-ibarra' -H 'Content-Type: application/json' \
    -d '{"patientId":"ana-martinez","date":"2026-07-13","time":"12:30","reason":"cruzada","professionalServiceId":"svc-nora-terapia"}' \
    http://127.0.0.1:5050/api/appointments   # -> 201
  curl -s -H 'X-HealthHub-Dev-User: usr-nora-ibarra' http://127.0.0.1:5050/api/patients   # incluye ana-martinez
  ```
- **Causa probable:** Sí existe un check (`Program.cs:743` → `CanCreateAppointment`, def. `Program.cs:4253-4266`), pero para el rol `professional` (`Program.cs:4260-4263`) solo valida **identidad propia**: `actor.Professional?.Id == professionalId`. No valida ningún vínculo profesional-paciente. Como Nora reserva bajo su propio professionalId, el check pasa. El título original "sin verificación de ownership" es impreciso: el check existe pero no contempla la relación con el paciente.
- **Cambio recomendado:** En `CanCreateAppointment`, para el rol `professional`, exigir además relación `ProfessionalPatients` activa con `patientId` (salvo el flujo de auto-registro donde el paciente agenda y la relación se crea como consecuencia). Como la firma actual es síncrona y sin acceso a la DB, convertir el check en `async` o mover la validación al handler (`Program.cs:743`):
  ```csharp
  if (actor is { PrimaryRole: "professional" })
  {
      var hasRelation = await db.ProfessionalPatients
          .AnyAsync(pp => pp.ProfessionalId == professional!.Id
                       && pp.PatientId == patient.Id
                       && pp.Status == "active");
      if (!hasRelation)
          return Results.StatusCode(StatusCodes.Status403Forbidden);
  }
  ```
  Combinar con el fix de C-2 para que `GetAccessiblePatientIdsAsync` no derive acceso de citas sin relación vinculada.

---

### [HIGH] H-2 — Selección arbitraria de identidad en `/api/me` vía query param `?userId` (enumeración/suplantación de cualquier usuario, incluidos profesionales)

- **Endpoint:** `/api/me`.
- **Método:** GET.
- **Encontrado por:** `pat:sofia-adversary`.
- **Esperado:** El endpoint debe devolver únicamente el perfil del usuario autenticado (resuelto del header/token), nunca un usuario arbitrario elegido por query param. Un `userId` distinto del autenticado debe ignorarse o dar 403.
- **Observado:** `GET /api/me?userId=usr-laura-vega` (con header bogus `usr-fantasma`) → 200 con el perfil completo de la nutrióloga Laura Vega (`pro-laura-vega`). `?userId=usr-nora-ibarra` → Nora (`pro-nora-ibarra`, psychologist). `?userId=usr-sofia-leon` → tercer paciente. Un `userId` inexistente → 404, dando un **oráculo de enumeración** (200=existe, 404=no). Matiz: con header dev **válido**, el header gana y el query param se ignora; la fuga se dispara cuando el header está ausente/inválido pero no vacío (entrelaza con C-1).
- **Evidencia/repro:**
  ```bash
  curl -s -w '\n[HTTP:%{http_code}]\n' -H 'X-HealthHub-Dev-User: usr-fantasma' 'http://127.0.0.1:5050/api/me?userId=usr-laura-vega'
  # -> 200 {"id":"usr-laura-vega","specialty":"nutritionist",...}
  ```
- **Causa probable:** `/api/me` declara `string? userId` como parámetro (`Program.cs:179`) y en el fallback dev (`Program.cs:183-190`) resuelve la identidad desde `userId.Trim()` sin compararla con el principal autenticado. El mismo patrón de fallback por query param aparece en endpoints hermanos: `Program.cs:1815-1817`, `1850-1852`, `1885-1887`, `2093-2095` — probablemente filtran datos de otros dueños igual.
- **Cambio recomendado:**
  1. En `/api/me`, **ignorar `userId` por completo** y resolver solo desde el header/token (queda cubierto al aplicar el fix de C-1: si el header no resuelve a un usuario real, 401). Eliminar el parámetro `string? userId` de la firma o no usarlo.
  2. Hacer un sweep de los endpoints en `Program.cs:1815-1817, 1850-1852, 1885-1887, 2093-2095` para eliminar el mismo fallback por query param.

---

### [HIGH] H-3 — El paciente (y el profesional dueño) no pueden leer/escribir sus datos clínicos de especialidad bajo dev-auth: 401

> Este hallazgo comparte causa raíz con **C-3** (`.RequireAuthorization()`). Se documenta por separado el **ángulo de producto**: el contrato de "el paciente lee sus propios datos" y "el dueño llega al handler". El fix es el mismo que C-3.

- **Endpoint:** `/api/prescriptions`, `/api/patient-tasks`, `/api/patient-diets`, `/api/body-measurements` (GET).
- **Método:** GET.
- **Encontrado por:** PAT Ana Martinez (`usr-ana-martinez`).
- **Esperado:** El paciente debería poder leer sus propios datos clínicos visibles, o como mínimo recibir 403 (autenticado sin permiso) en vez de 401 (no autenticado), ya que la sesión dev sí está autenticada para los endpoints de portal.
- **Observado:** Los 4 endpoints → 401 para Ana. Con el mismo header, Ana obtiene 200 en `/api/me`, `/api/patient-portal/records` y `/api/patient-portal/appointments`. Además, **el profesional dueño también falla** (Laura GET `/api/patient-diets?patientId=ana-martinez` → 401). Gap de producto: el portal del paciente expone `/records` pero no las dietas/tareas/recetas reales.
- **Evidencia/repro:**
  ```bash
  for ep in prescriptions patient-tasks patient-diets body-measurements; do
    curl -s -o /dev/null -w "$ep:%{http_code}\n" "http://127.0.0.1:5050/api/$ep?patientId=ana-martinez" -H 'X-HealthHub-Dev-User: usr-ana-martinez'
  done   # todos 401
  ```
- **Causa probable:** Idéntica a C-3: `.RequireAuthorization()` (`Program.cs:3603,3646,3667,3703,3731,3752,3791,3812,3848`) corta antes del handler. Si la petición llegara, `GetAuthorizedProfessional` (`Program.cs:3852-3864`) devolvería 403 para un no-profesional. No existe hoy una **ruta de lectura para el paciente dueño**: los handlers están gated por `GetAuthorizedProfessional(..., specialty)`.
- **Cambio recomendado:**
  1. Eliminar `.RequireAuthorization()` (ya cubierto por C-3) para que el paciente reciba 403 coherente en vez de 401, y para que el profesional dueño alcance el handler.
  2. **Nuevo (producto):** Exponer una ruta de lectura para el paciente de sus propios datos clínicos visibles. Opción mínima: en `/api/patient-portal/records` incluir dietas/tareas/recetas marcadas como visibles del paciente autenticado. Opción alternativa: permitir en los GET de especialidad que el actor sea el **propio paciente** (`actor.Patient?.Id == patientId`) además del profesional dueño, filtrando por `Status`/visibilidad.

---

### [MEDIUM] M-1 — `available-slots` devuelve 28 slots idénticos (mismo id) y faltan deduplicación y constraint de unicidad de disponibilidad

- **Endpoint:** `/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-inicial&days=21`.
- **Método:** GET.
- **Encontrado por:** PAT Ana Martinez.
- **Esperado:** Lista de slots únicos y bookables, cada uno con id distinto, todos dentro de la disponibilidad declarada.
- **Observado:** 200 con 40 slots, de los cuales **28 son objetos idénticos** (mismo id `pro-laura-vega-svc-laura-inicial-2026-06-18-07:30`, jueves 07:30). Solo 13 `(date,time)` distintos. Mismo patrón con `svc-laura-seguimiento`. Los 28 duplicados consumen el `.Take(40)` y desplazan slots reales de fechas futuras.
- **Evidencia/repro:**
  ```bash
  curl -s 'http://127.0.0.1:5050/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-inicial&days=21' \
    -H 'X-HealthHub-Dev-User: usr-ana-martinez' \
    | python3 -c "import json,sys;from collections import Counter;d=json.load(sys.stdin);c=Counter((s['date'],s['time'],s['id']) for s in d);print('total',len(d));[print('DUP x',v,k) for k,v in c.items() if v>1]"
  ```
- **Causa probable:** Dos defectos.
  1. **Datos:** `POST /api/professional-portal/availability` (`Program.cs:2016-2048`) **no deduplica**: cada llamada inserta una nueva fila sin guard de unicidad (`Program.cs:2032-2043`). Se llamó ~28 veces con la misma ventana de jueves, creando 28 filas idénticas.
  2. **Código:** `BuildAvailableSlots` (`Program.cs:4984-5048`) itera `availabilityForDay` (todas las filas que matchean el weekday, `Program.cs:4997-5002`) y por cada una regenera los mismos slots con el **mismo id** (`Program.cs:5032-5038`), sin deduplicar por id antes de `.OrderBy(...).Take(40)` (`Program.cs:5043-5047`).
- **Cambio recomendado:**
  1. **Deduplicar slots por id** en `BuildAvailableSlots` antes del `Take(40)`:
     ```csharp
     return slots
         .GroupBy(item => item.Id)
         .Select(g => g.First())
         .OrderBy(item => item.Date)
         .ThenBy(item => item.Time)
         .Take(40)
         .ToList();
     ```
  2. **Guard de unicidad** en `POST /availability` (`Program.cs:2032`): antes de insertar, rechazar (o hacer no-op idempotente) si ya existe una fila con el mismo `(ProfessionalId, Weekday, StartsAt, EndsAt, Status="active")`. Añadir además un índice único en EF para esa combinación.

---

### [MEDIUM] M-2 — (consolidado en H-3) El paciente no puede leer sus propios datos clínicos: 401 en vez de 403/200

Este hallazgo es el mismo defecto de auth descrito en **H-3** desde la perspectiva del paciente. Severidad efectiva Medium (testabilidad/gap de producto; probablemente funciona bajo Clerk JWT real). Fix cubierto por C-3 + recomendación de producto de H-3.

## Recomendaciones generales y deuda

- **R-1 — Nunca resolver identidad por defecto ni por query param.** Tanto C-1 como H-2 nacen del mismo antipatrón: cuando la autenticación no resuelve un usuario real, el código cae a `DefaultDemoUserId` o a un `userId` controlado por el cliente. **Toda identidad debe derivar exclusivamente del header/token autenticado.** Eliminar `DefaultDemoUserId` (`Program.cs:128`) de los caminos de producción y los fallbacks por `?userId` (`Program.cs:185, 1815-1817, 1850-1852, 1885-1887, 2093-2095`).

- **R-2 — Un único patrón de auth en toda la API.** Coexisten dos esquemas: (a) handlers que validan internamente con `GetUserFromRequestAsync`/`GetAuthorizedProfessional` (funcionan con dev-auth) y (b) endpoints con `.RequireAuthorization()` (rompen con dev-auth). Estandarizar en el patrón (a), documentado en `Program.cs:2532-2533`, y prohibir `.RequireAuthorization()` salvo donde se use exclusivamente JWT Clerk. Añadir un test de humo que recorra todos los endpoints `/api/*` con dev-auth y verifique que ninguno devuelve 401 cuando el header es válido.

- **R-3 — Acceso clínico por relación explícita, no por citas.** `GetAccessiblePatientIdsAsync` (`Program.cs:4641-4648`) deriva acceso de la mera existencia de una cita, lo que convierte cualquier cita cruzada en una fuga de PHI. El acceso debe basarse en `ProfessionalPatients` activas; las citas deben **crear/activar** esa relación (de forma validada), no sustituirla.

- **R-4 — Validar `patientId` del body contra la autorización real en escrituras.** `POST /api/appointments` (vía `CanCreateAppointment`, `Program.cs:4253-4266`) y por herencia los endpoints clínicos confían en que el profesional es dueño del `professionalId` pero no del `patientId`. Toda escritura que referencie un paciente debe verificar relación activa profesional-paciente.

- **R-5 — Lecturas para el paciente de sus propios datos.** El módulo de especialidades (recetas/tareas/dietas/medidas) no tiene ruta de lectura para el paciente dueño. Exponerla (vía `/patient-portal/records` o autorizando `actor.Patient?.Id == patientId` en los GET) para cerrar el gap de producto.

- **R-6 — Unicidad e idempotencia en disponibilidad.** Añadir constraint único `(ProfessionalId, Weekday, StartsAt, EndsAt)` y deduplicar en `BuildAvailableSlots`. Considerar tests de invariante: "ningún slot repetido por id" y "`Take(N)` nunca expulsa slots reales por duplicados".

- **R-7 — Endurecer `IsDevAuthEnabled`.** El modo dev-auth no debe poder activarse en producción. Gatearlo con `ASPNETCORE_ENVIRONMENT == "Development"` más una flag de configuración explícita, de modo que el blast radius de C-1/H-2 quede confinado a dev/staging.

## Cómo se reprodujo

- **Entorno:** API real corriendo en `http://127.0.0.1:5050` con dev-auth activo.
- **Autenticación:** header `X-HealthHub-Dev-User: <userId>` para impersonar cada actor (p.ej. `usr-laura-vega`, `usr-nora-ibarra`, `usr-ana-martinez`, `usr-sofia-leon`), más un valor forjado `usr-fantasma` para el adversario.
- **Metodología:** 4 agentes simulados ejecutaron flujos funcionales y adversariales con `curl`, usando datos sembrados (`DatabaseSeeder.cs`: relaciones `pp-nora-sofia`, `pp-laura-ana`; servicios `svc-laura-*`, `svc-nora-terapia`) y datos aleatorios (fechas/horas en slots libres, ids inexistentes, ratings fuera de rango). Cada bug candidato fue **verificado adversarialmente** re-ejecutando su repro contra el estado real y comparándolo con endpoints de control (`/api/me`, `/api/appointments`) que comparten la misma identidad y header. Falsos positivos descartados: 0.
- **Artefactos de prueba creados (posible limpieza):** citas `apt-1781551040280`, `apt-1781550856776`, `apt-1781550947057` y notas SOAP `soap-178155094*` generadas durante la verificación de C-1/C-2/H-1.

> Nota técnica: tres de los ocho hallazgos (C-3, H-3, M-2) comparten la misma causa raíz (`.RequireAuthorization()` en los endpoints de especialidad) y se resuelven con un único cambio. C-2 y H-1 también están encadenados (la cita cruzada habilita la fuga SOAP). Priorizar el fix de `.RequireAuthorization()` (1 cambio, desbloquea 3 hallazgos) y el de `GetAccessiblePatientIdsAsync` + `CanCreateAppointment` (corta la cadena C-2/H-1).
