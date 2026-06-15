# Protección de Rutas por Rol — Clinixa

**Fecha:** 2026-06-08

## Resumen de cambios

Se implementó protección de rutas según el rol del usuario (`patient`, `professional`, `clinic_admin`, `internal_admin`). Las vistas ahora se ocultan y redirigen automáticamente si el usuario intenta acceder a una ruta no autorizada.

## Cambios realizados

### 1. **AppShell filtrado** (`components/app-shell.tsx`)

- ✅ Agregado `useHealthHubStore` para acceder al `currentUser.primaryRole`
- ✅ Cada `NavItem` ahora tiene un array `roles` que especifica qué roles pueden verla
- ✅ Nueva función `getNavItems(userRole)` que devuelve solo las rutas autorizadas
- ✅ El menú ahora muestra solo 1–3 rutas según el rol, no las 9 rutas para todos

**Ejemplo:**
```typescript
const allNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Activity, roles: ["professional", "internal_admin"] },
  { href: "/portal-paciente", label: "Portal paciente", icon: HeartPulse, roles: ["patient", "internal_admin"] },
  // ... más rutas con sus roles
];

function getNavItems(userRole: string): NavItem[] {
  return allNavItems.filter((item) => item.roles.includes(userRole));
}
```

### 2. **Middleware de protección** (`middleware.ts`)

- ✅ Nuevo archivo que intercepta navegación a rutas protegidas
- ✅ Verifica el rol en cookies (`healthhub-user-role`)
- ✅ Redirige a `/sesion` si no hay rol
- ✅ Redirige al portal correcto si el usuario accede a una ruta no autorizada:
  - Profesional → `/`
  - Admin de clínica → `/seguridad`
  - Paciente → `/portal-paciente`

**Rutas protegidas:**
```typescript
const protectedRoutes = ["/", "/pacientes", "/portal-paciente", "/portal-profesional", "/agenda", "/expediente", "/seguridad", "/chat"];
```

**Rutas públicas (sin protección):**
```typescript
const publicRoutes = ["/sesion", "/aceptar-invitacion"];
```

### 3. **Persistencia de rol en cookies** (`lib/healthhub-store.ts`)

- ✅ Nueva función `persistUserRole(role)` que guarda el rol en cookies
- ✅ Nueva función `clearAuthToken()` actualizada para limpiar cookies del rol
- ✅ `login()`, `refreshSession()` y `acceptClinicInvitation()` ahora guardan el rol
- ✅ El rol persiste 24 horas en las cookies para que el middleware pueda acceder

**Cambio en login:**
```typescript
async login(email: string, password: string) {
  const auth = await apiPost<AuthResponse>("/api/auth/login", { email, password });
  persistAuthToken(auth.token, auth.expiresAt);
  persistSelectedUserId(auth.user.id);
  persistUserRole(auth.user.primaryRole);  // ← NUEVO
  // ...
}
```

## Matriz de acceso por rol

| Ruta | Paciente | Profesional | Admin Clínica | Admin Interno |
|------|:---:|:---:|:---:|:---:|
| `/` | ❌ Redir a `/portal-paciente` | ✅ | ❌ Redir a `/seguridad` | ✅ |
| `/pacientes` | ❌ Redir | ✅ | ❌ Redir | ✅ |
| `/portal-paciente` | ✅ | ❌ Redir | ❌ Redir | ✅ |
| `/portal-profesional` | ❌ Redir | ✅ | ❌ Redir | ✅ |
| `/agenda` | ❌ Redir | ✅ | ❌ Redir | ✅ |
| `/expediente` | ❌ Redir | ✅ | ❌ Redir | ✅ |
| `/seguridad` | ❌ Redir | ✅ | ✅ | ✅ |
| `/chat` | ❌ Redir | ✅ | ❌ Redir | ✅ |
| `/sesion` | ✅ Pública | ✅ Pública | ✅ Pública | ✅ Pública |
| `/aceptar-invitacion` | ✅ Pública | ✅ Pública | ✅ Pública | ✅ Pública |

## Cómo probar

### 1. **Filtrado del menú**

```bash
npm run dev:web
# Abre http://localhost:3000/sesion
```

1. Inicia sesión como **paciente** (`ana.martinez@example.com`/`healthhub123`)
   - ✅ Verás solo `Portal paciente` y `Sesion` en el menú
2. Abre la terminal → Sesion → Inicia sesión como **profesional** (`laura.vega@healthhub.demo`/`healthhub123`)
   - ✅ Verás `Dashboard`, `Pacientes`, `Portal profesional`, `Agenda`, `Expediente`, `Seguridad`, `Chat`, `Sesion`
3. Inicia sesión como **admin de clínica** (`admin.clinica@healthhub.demo`/`healthhub123`)
   - ✅ Verás solo `Seguridad` y `Sesion`

### 2. **Redirección forzada (middleware)**

```bash
# Estando logueado como paciente:
# - Intenta manualmente: http://localhost:3000/agenda
# - Serás redirigido automáticamente a http://localhost:3000/portal-paciente

# Estando logueado como profesional:
# - Intenta manualmente: http://localhost:3000/portal-paciente
# - Serás redirigido automáticamente a http://localhost:3000/

# Estando logueado como admin de clínica:
# - Intenta manualmente: http://localhost:3000/agenda
# - Serás redirigido automáticamente a http://localhost:3000/seguridad
```

### 3. **Demo sessions sin cookies (edge case)**

Si usas el selector de demo sessions en `/sesion` (sin hacer login real):
- ✅ El menú se filtra correctamente por el `currentUser.primaryRole` del store
- ⚠️ Si cambias de pestaña o recarga, las cookies vacías redirigirán a `/sesion`
  - Esto es correcto: las demo sessions son para testing, en producción siempre hay token/rol en cookies

## Archivos modificados

```
apps/web/
├── components/app-shell.tsx          [MODIFICADO] Filtro por rol
├── lib/healthhub-store.ts            [MODIFICADO] Persistencia de rol en cookies
└── middleware.ts                      [NUEVO] Protección de rutas
```

## Compilación

```bash
npm run build:web    # ✅ Compila correctamente
npm run lint:web     # ✅ Sin errores
```

## Próximas mejoras recomendadas

1. **Endpoint de autorización en API**
   - Actualmente el middleware solo valida el rol en cookies (cliente)
   - Agregar validación en API para endpoints sensibles

2. **Manejo de expiración**
   - Hoy la cookie del rol expira a los 24 horas
   - Si el token expira antes, debería limpiar la cookie del rol también

3. **Demo sessions más robustas**
   - Las demo sessions no guardan cookies, así que solo funcionan en la misma pestaña
   - Considerar una opción de "demo mode" que simule el middleware sin usar cookies

4. **Error page customizada**
   - Cuando se redirige por falta de autorización, mostrar un error amigable en lugar de una redirección silenciosa
