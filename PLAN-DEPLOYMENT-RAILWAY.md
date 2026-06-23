# Plan: Montar Clinixa en producción (Railway)

**Fecha:** 2026-06-22
**Hosting elegido:** Railway (PaaS) — build desde GitHub, Postgres de un clic, TLS y deploy automáticos, cero administración de Linux.
**Estado:** Andamiaje listo (Dockerfiles + builds verificados). Falta ejecutar los pasos en Railway + DNS + post-deploy.

---

## Arquitectura en producción

```
clinixa.mx        → Web (Next.js)  ─┐ el navegador llama DIRECTO a la API
api.clinixa.mx    → API (.NET 8)   ─┴→ Postgres (Railway)
```

- **Dos dominios** porque el navegador habla directo con la API (`healthhub-store.ts` usa `NEXT_PUBLIC_API_BASE_URL`) → **CORS importa** (`Web__AllowedOrigins`).
- El **schema de DB se crea solo** al arrancar la API (`MigrateAsync` en `DatabaseSeeder.cs`).

## Andamiaje ya en el repo

| Archivo | Qué hace |
|---|---|
| `apps/api/Dockerfile` | Build .NET 8 multi-stage; mapea `$PORT`→Kestrel en `0.0.0.0` |
| `apps/web/Dockerfile` | Build Next 16; hornea `NEXT_PUBLIC_*` y fuerza `NEXT_PUBLIC_ENABLE_DEV_AUTH=false` en prod |
| `.dockerignore` | Excluye `node_modules`/`.next`/`bin`/`obj`/`.env` |
| `apps/web/package.json` | `start` script (`next start`) |

Contexto de build = **raíz del repo** (monorepo npm workspaces). En Railway: Dockerfile Path por servicio, Root Directory vacío.

**Builds verificados en host** (sin Docker en la máquina): `dotnet publish -c Release` ✅ · `next build` ✅ (26 rutas). Host node `20.18.0` / dotnet `8.0.421` ≈ `node:20` / `sdk:8.0`.

---

## Pasos en Railway

1. **railway.app** → New Project → *Deploy from GitHub repo* → `FerHuCa/clinixa`.
2. **Postgres**: New → Database → **PostgreSQL**.
3. **Servicio API**: New → GitHub repo (mismo) → Settings → Build:
   - **Dockerfile Path** = `apps/api/Dockerfile` · **Root Directory** = vacío
   - Variables (tabla API ↓) · Networking → **Generate Domain** o custom `api.clinixa.mx`
4. **Servicio Web**: New → mismo repo → Settings → Build:
   - **Dockerfile Path** = `apps/web/Dockerfile` · **Root Directory** = vacío
   - Variables (tabla Web ↓) · dominio `clinixa.mx`

### Variables — Servicio API

| Variable | Valor |
|---|---|
| `ConnectionStrings__HealthHubDb` | `Host=${{Postgres.PGHOST}};Port=${{Postgres.PGPORT}};Database=${{Postgres.PGDATABASE}};Username=${{Postgres.PGUSER}};Password=${{Postgres.PGPASSWORD}};SSL Mode=Require;Trust Server Certificate=true` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Authentication__EnableDevAuth` | `false` |
| `Clerk__Issuer` | issuer Clerk **live** |
| `Clerk__SecretKey` | `sk_live_…` |
| `Clerk__AuthorizedParties` | `https://clinixa.mx` |
| `Web__AllowedOrigins` | `https://clinixa.mx` |
| `Web__BaseUrl` | `https://clinixa.mx` |
| `RESEND_API_KEY` · `RESEND_FROM` | `re_…` · `Clinixa <no-reply@clinixa.mx>` |
| `MERCADOPAGO_ACCESS_TOKEN` / `_PUBLIC_KEY` / `_CLIENT_ID` / `_CLIENT_SECRET` | producción (secret **rotado**) |
| `MERCADOPAGO_WEBHOOK_SECRET` | del dashboard MP prod (post-deploy) |
| `ENCRYPTION_KEY` | **nueva** para prod: `openssl rand -base64 32` |

### Variables — Servicio Web

| Variable | Valor | Nota |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.clinixa.mx` | build-time (rebuild si cambia) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | build-time |
| `CLERK_SECRET_KEY` | `sk_live_…` | runtime (middleware) |

## DNS (registrador de clinixa.mx)

- `api` → CNAME al target que Railway da al añadir el custom domain.
- apex `@`: DNS estándar no acepta CNAME en el apex → usar Cloudflare (CNAME flattening) o registrar `www.clinixa.mx` y redirigir apex→www.

## Post-deploy

1. **Logs del primer deploy de la API** → debe decir *Applying migration…* (crea el schema). `GET https://api.clinixa.mx/health` OK.
2. **Clerk dashboard** (Production): añadir `https://clinixa.mx` a dominios/redirect URLs permitidos.
3. **MP webhook prod** → `https://api.clinixa.mx/api/webhooks/mercadopago` (`payment.created`, `payment.updated`); copiar secret a `MERCADOPAGO_WEBHOOK_SECRET`.
4. **MP OAuth marketplace** redirect → `https://clinixa.mx/portal-profesional/marketplace-callback`
   ⚠️ Es `marketplace-callback`, NO `mercadopago-callback`. El backend lo deriva de `Web__BaseUrl` (`Program.cs:2580/2639`) y MP valida coincidencia exacta.
5. **Rotar `client_secret`** de MP (se compartió por chat).
6. **1 transacción real** de bajo monto end-to-end (valida reembolso real + OAuth marketplace, no testeable headless).

---

## Notas

- Las `NEXT_PUBLIC_*` se hornean en **build-time** → cambiar el dominio de la API exige **redeploy** de la web.
- `next start` (imagen grande, sin rutas frágiles de standalone). Cambiar a `output:standalone` si el tamaño/arranque molesta.
- Skipped: health checks de Railway, CI, imagen standalone → agregar cuando el piloto crezca.
