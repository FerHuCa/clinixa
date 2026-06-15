# Tech Stack - Clinixa

## Objetivos
- Desarrollo rápido.
- Escalabilidad.
- Bajo costo inicial.
- Separación clara entre el MVP operativo y las capacidades futuras.

## Frontend
- Next.js
- React
- TypeScript
- TailwindCSS
- shadcn/ui

## Mobile
- React Native
- Expo

## Backend
- ASP.NET Core
- REST API
- SignalR

## Base de datos
- PostgreSQL
- pgvector (Fase 4 - IA)

## Cache
- Redis

## Almacenamiento
- Azure Blob Storage

## Autenticación
- Clerk (vigente en el MVP)
- Azure AD B2C (alternativa futura)

## Fase 4 - Inteligencia Artificial

No forma parte del MVP inicial.

- OpenAI API
- Whisper

Funciones:
- Transcripción.
- Resúmenes.
- Notas SOAP.
- Asistente del paciente.

## Videollamadas
- Daily.co
- Alternativa: Twilio Video

## Comunicación profesional-paciente
- WhatsApp vía enlace wa.me (Básico; chat propio eliminado 2026-06-09)
- WhatsApp Business API / Meta Cloud API (Pro, Fase 3: recordatorios y confirmaciones desde el número del profesional)

## Pagos
- Mercado Pago (decisión vigente: primero, por tarjeta + OXXO + SPEI en México)
- Stripe (alternativa futura)

## Facturación SAT
- Facturama
- SW Sapien

## Notificaciones
- Resend
- WhatsApp Business API
- Firebase Cloud Messaging

## Infraestructura
Azure:
- App Service
- PostgreSQL
- Redis
- Blob Storage
- Key Vault
- Application Insights

## DevOps
- GitHub Enterprise
- GitHub Actions

## Observabilidad
- OpenTelemetry
- Grafana
- Prometheus

## Seguridad
- JWT
- HTTPS
- AES-256
- MFA
- Auditoría

## Arquitectura MVP

Cliente Web/Móvil
        ↓
   ASP.NET API
        ↓
PostgreSQL + Redis + Blob

## Arquitectura Fase 4 (IA)

ASP.NET API
        ↓
OpenAI API + servicios de transcripción

## Costos estimados MVP

Infraestructura total:
6,000 a 12,000 MXN por mes.
