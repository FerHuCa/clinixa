# Contexto de build = raíz del repo (monorepo).
# En Railway/Render: Dockerfile Path = apps/api/Dockerfile, Root Directory = vacío (raíz).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY global.json ./
COPY apps/api/HealthHub.Api.csproj apps/api/
RUN dotnet restore apps/api/HealthHub.Api.csproj
COPY apps/api/ apps/api/
RUN dotnet publish apps/api/HealthHub.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
# ponytail: shell-form para expandir $PORT en runtime (Railway/Render lo asignan dinámico; fallback 8080).
# .NET no lee $PORT solo — hay que mapearlo a ASPNETCORE_URLS y escuchar en 0.0.0.0.
CMD ASPNETCORE_URLS="http://0.0.0.0:${PORT:-8080}" dotnet HealthHub.Api.dll
