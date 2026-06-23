# Reporte de Pruebas — Clinixa — 2026-06-22

> Orquestador: Opus 4.8 (evalúa). Ejecutores: 8 sub-agentes Sonnet 4.6 (read-only) + backbone de 3 scripts canónicos. API en modo simulado (MP/Resend/Clerk vacíos → cero efectos externos). Postgres local seedeado.

## Resumen ejecutivo

- **Flujos probados: 8**
- **Pasaron: 8 ✅**
- **Fallaron: 0 ❌**
- **Errores de agente: 0 ⚠️**

**Backbone (escritor secuencial):**
- `smoke:api` → **31/31 PASS** (ningún GET 401/500).
- `test:api` (write-path E2E, 1,139 líneas de asserts) → **PASS** (login/refresh · invitaciones crear→accept→re-accept 409→revoke · onboarding+publish gate · verificación de cédula 401/403/200 · suscripción trial+interés idempotente · checkout · efectivo · webhook MP firmado · cancelación con reembolso).
- `test:public` → **3/4 pasos PASS** (directorio íntegro 4 pros · by-slug + 404 · avatar PNG/.txt/>2MB). **Paso 4 FAIL = drift de datos de prueba** (la precondición "Fernando en cola pending" ya no aplica tras normalización + verificación MP prod 2026-06-22). Falló *antes* de mutar. **No es regresión de código.**

Veredicto global: **el sistema está verde en todos los flujos críticos.** Los hallazgos abajo son de **endurecimiento** (no fallos) — relevantes porque el proyecto está en fase de deployment a producción.

## Resultados por flujo

| ID  | Flujo                                  | Resultado | Observación |
|-----|----------------------------------------|-----------|-------------|
| F01 | Auth & sesión                          | ✅ PASS   | `/api/me` 401 sin auth / 200 con dev-header; logout invalida sesión bearer (Status→disabled). Gap: Clerk JWT no se revoca server-side en logout (arquitectura estándar Clerk). |
| F02 | Directorio público + gate publicación  | ✅ PASS   | 4 GET = 200; doble gate `status=active && verificationStatus=verified` en list/by-slug/by-id/slots. Gap: `/{id}/reviews` no aplica el gate (legible por ID conocido). |
| F03 | Booking de citas                       | ✅ PASS   | Guards de doble-booking (409) y fuera-de-disponibilidad (400) presentes; transiciones de estado validadas. Gap: el create no re-chequea `professional.Status` (race de desactivación). |
| F04 | Pagos: checkout/efectivo/webhook/reembolso | ✅ PASS | Firma HMAC inválida → 401 (probe en vivo); modo simulado no llama MP real; reembolso registra `refunded`+`reversed`. **Doble-read = falso positivo** (ramas excluyentes). Gaps: replay de webhook, refund con `ProviderPaymentId` vacío en prod. |
| F05 | Onboarding + verificación + publish     | ✅ PASS   | `canPublish=false` sin cédula; publish prematuro → 400; solo `internal_admin` verifica (probe: pro → 403). |
| F06 | Clínicas & invitaciones                | ✅ PASS   | Ciclo íntegro; re-accept → 409; password < 8 → 400; revoke invalida token. Probes: `/api/clinics` 200 admin / 403 paciente / 401 sin auth. |
| F07 | Módulos especialidad + RBAC            | ✅ PASS   | Paciente lee solo lo suyo (200); `GetAuthorizedProfessional` bloquea por rol+especialidad (probe: nutriólogo→recetas 403). Gap: cross-patient devuelve 200+`[]` en vez de 403. |
| F08 | Cross-cutting + suscripción            | ✅ PASS   | notif/prefs/consent/audit/subscription = 200; interés idempotente; audit-logs scoped por rol. Gap: canal `whatsapp` sin emisor (feature muerta). |

## Hallazgos de sobre-ingeniería (ponytail)

> **No se generó diff durante las pruebas** (Opus no escribió código de prod; los sub-agentes fueron read-only), por lo que `/ponytail-review` sobre el diff no aplica. Se reporta en su lugar el inventario del **`/ponytail-audit` repo-wide** (Fase 1, 8 subsistemas) — neto recortable **≈ 2,047 líneas, −1 dependencia, −1 contenedor**:

| Subsistema | Líneas | Top hallazgo (confianza) |
|------------|--------|--------------------------|
| root (docs/scripts) | ~1,287 | `comentarios_claude.md` 933 ln histórico · helpers `request/assert/login` copy-paste en 3 `.mjs` (alta) · `Redis` en docker-compose sin referencias (alta) |
| api-core | 209 | `PasswordHasher` usa SHA-256, debería PBKDF2 (alta) · stack legacy-auth muerto en prod ~120 ln (media) · `Slugify` duplicado (alta) |
| web-routes | 124 | 14 `page.tsx` que solo re-exportan el client (alta) · banner/select copy-paste en 3 páginas especialidad |
| api-payments | 127 | builder de preference duplicado en 2 servicios MP (alta) · `TokenEncryptionService` reimplementa `IDataProtectionProvider` (media) |
| api-infra | 102 | pares de records Create/Update idénticos (alta) · nav props de `Appointment` nunca cargadas (alta) |
| web-components-lib | 83 (+1 dep) | `demo-data.ts` 68 ln de exports muertos (alta) · dep `tailwind-merge` sin usar (alta) · `use-click-outside` 1 caller (alta) |
| api-clinics-modules | 77 | 4 CRUD de especialidad casi idénticos · canal `whatsapp` sin emisor (alta) · `CanManageMarketplaceAsync` clon (alta) |
| api-pro | 38 | `webBaseUrl` triple-fallback copy-paste ×5 (alta) · filtros en memoria que deberían ser SQL (alta) |

**Corrección de evaluación (verificación adversarial Opus sobre Sonnet):** el audit marcó como bug (alta confianza) el doble `ReadAsStringAsync` en `MercadoPagoService`. **Refutado** por lectura directa (líneas 97-104): las dos llamadas están en ramas mutuamente excluyentes (`if (!IsSuccessStatusCode) return null;` vs. path de éxito). El contenido se lee **una vez**. Severidad real: **ninguna**.

## Acciones recomendadas

> Ordenadas por impacto. Solo lo que importa para producción. Los hallazgos de sobre-ingeniería son deuda de mantenibilidad, no bloqueantes — atender post-piloto.

1. **[Seguridad · prod] Validar antigüedad del `ts` en el webhook MP.** `ValidateWebhookSignature` acepta cualquier firma válida sin chequear la edad del timestamp → un webhook capturado puede reenviarse (replay). MP recomienda rechazar `ts` > 5 min. *(F04, med)*
2. **[Correctness · prod] Refund con `ProviderPaymentId` vacío.** Con token MP real, cancelar un pago `pending` que nunca recibió webhook llama `POST /v1/payments//refunds` (URL malformada). Enmascarado en modo simulado. Guardar contra `ProviderPaymentId` vacío antes de reembolsar. *(F04, med)*
3. **[Correctness] Re-chequear `professional.Status` al crear cita.** El handler de create no revalida que el profesional siga activo entre el fetch de slots y el POST → un pro desactivado en esa ventana puede recibir citas. Añadir guard de status en el create. *(F03, med)*
4. **[Higiene de datos] Hacer `test:public` hermético.** El paso 4 depende de que Fernando esté `pending`; el drift de prod lo rompe. Crear/teardown un profesional `pending` sintético propio en el test en vez de asumir el estado de una cuenta real. *(test infra)*
5. **[Limpieza ponytail rápida, bajo riesgo] Quitar lo muerto verificado:** dep `tailwind-merge` sin usar · `Redis` en docker-compose sin referencias · ~68 ln de exports muertos en `demo-data.ts` · canal `whatsapp` sin emisor. ~145 líneas + 1 dep + 1 contenedor, sin tocar lógica viva. *(audit, alta confianza)*

### Gaps menores registrados (no accionar ahora)
`/{id}/reviews` sin gate de status (F02, info-disclosure por ID) · cross-patient read devuelve 200+`[]` en vez de 403 (F07, semántica) · Clerk JWT sin revocación server-side en logout (F01, arquitectura estándar) · queue admin sin null-guard explícito antes de chequear rol (F05) · audit-logs crece sin paginación más allá de `Take(100)` (F08).
