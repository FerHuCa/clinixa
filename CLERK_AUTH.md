# Autenticacion con Clerk

Fecha: 2026-06-09

## Arquitectura

- Clerk administra registro, inicio de sesion, recuperacion de acceso y sesiones.
- Next.js obtiene el token de la sesion Clerk y lo envia como bearer token a la API.
- ASP.NET Core valida firma, emisor, expiracion y `azp` del JWT.
- PostgreSQL conserva roles, perfiles clinicos y permisos de HealthHub.
- En el primer acceso, la API vincula el `ClerkUserId` con el usuario local usando el correo principal verificado.

## Configuracion de Clerk

Crear una aplicacion en Clerk y obtener:

- Publishable key.
- Secret key.
- Issuer de la instancia.

Crear `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5050
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_ENABLE_DEV_AUTH=true
```

Configurar la API mediante variables de entorno:

```bash
export Clerk__SecretKey=sk_test_...
export Clerk__Issuer=https://tu-instancia.clerk.accounts.dev
export Clerk__AuthorizedParties=http://localhost:3000
export Web__AllowedOrigins=http://localhost:3000
```

En produccion, `Clerk__AuthorizedParties` y `Web__AllowedOrigins` deben contener solo los dominios reales de HealthHub.

## Vinculacion de usuarios

Los usuarios demo existentes se vinculan automaticamente cuando el correo principal de Clerk coincide con `users.Email`. La API guarda el identificador en `users.ClerkUserId`.

Para evitar vinculaciones incorrectas:

- El correo de Clerk debe estar verificado.
- No se debe reutilizar un correo clinico entre cuentas.
- Las invitaciones de clinica exigen que la sesion Clerk use el mismo correo de la invitacion.

## Acceso de desarrollo

El acceso sin cuenta esta disponible en `/sesion` cuando:

- Next.js se ejecuta con `next dev`.
- La API usa `ASPNETCORE_ENVIRONMENT=Development`.
- `Authentication:EnableDevAuth` esta habilitado.
- La peticion a la API viene desde loopback.

El frontend envia `X-HealthHub-Dev-User` con el usuario demo seleccionado. Este mecanismo:

- No crea sesiones Clerk.
- No usa contrasenas.
- No funciona en builds de produccion.
- No debe habilitarse en un servidor compartido.

Para deshabilitarlo localmente:

```env
NEXT_PUBLIC_ENABLE_DEV_AUTH=false
```

## Produccion

Verificar antes del despliegue:

- `Authentication__EnableDevAuth=false`.
- `Authentication__EnableLegacyAuth=false`.
- Secretos fuera del repositorio.
- HTTPS obligatorio.
- `Clerk__AuthorizedParties` restringido.
- CORS restringido.
- Pruebas con cuentas reales de paciente, profesional y administrador.
