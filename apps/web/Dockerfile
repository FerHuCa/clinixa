# Contexto de build = raíz del repo (monorepo npm workspaces).
# En Railway/Render: Dockerfile Path = apps/web/Dockerfile, Root Directory = vacío (raíz).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci
COPY apps/web/ apps/web/
COPY docs/ docs/
# Las NEXT_PUBLIC_* se hornean en el bundle en BUILD-time → deben existir aquí.
# Railway/Render inyectan estas service-vars como build-args si el ARG está declarado.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_ENABLE_DEV_AUTH=false \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/web

ENV NODE_ENV=production
EXPOSE 3000
# ponytail: `next start` (imagen grande pero sin las rutas frágiles de standalone en monorepo).
# Para un piloto el tamaño no importa; cambiar a output:standalone si la imagen molesta.
CMD ["npm", "run", "start", "-w", "apps/web"]
