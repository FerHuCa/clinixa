/**
 * smoke-api.mjs — R-2 Smoke Test (GET-only / read-only / idempotent)
 *
 * Scope: every GET /api/* endpoint exercised with a VALID dev-auth header.
 * Failure class guarded: 401 (valid auth wrongly rejected) and 500 (exposed handler crash).
 * 200 / 201 / 204 / 403 / 404 all PASS — the test does not enforce business semantics.
 * Write-path coverage lives in test:api (scripts/test-api.mjs).
 *
 * Safe to run repeatedly — no DB writes are performed.
 */

const API_BASE_URL = process.env.HEALTHHUB_API_BASE_URL ?? "http://127.0.0.1:5050";

// ---------------------------------------------------------------------------
// Endpoint manifest
// ---------------------------------------------------------------------------
// user: userId string  → send X-HealthHub-Dev-User header
// user: null           → public endpoint, no auth header
// ---------------------------------------------------------------------------
const ENDPOINTS = [
  // --- PUBLIC (no auth) ---
  { label: "professionals list",                  path: "/api/professionals",                                                        user: null },
  { label: "professional profile",                path: "/api/professionals/pro-laura-vega",                                        user: null },
  { label: "professional available slots",        path: "/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-inicial&days=14", user: null },
  { label: "professional reviews",                path: "/api/professionals/pro-laura-vega/reviews",                                user: null },

  // --- PATIENT: usr-ana-martinez ---
  { label: "me",                                  path: "/api/me",                                                                  user: "usr-ana-martinez" },
  { label: "me consent",                          path: "/api/me/consent",                                                          user: "usr-ana-martinez" },
  { label: "patient-portal appointments",         path: "/api/patient-portal/appointments",                                         user: "usr-ana-martinez" },
  { label: "patient-portal records",              path: "/api/patient-portal/records",                                              user: "usr-ana-martinez" },
  { label: "prescriptions (patient)",             path: "/api/prescriptions?patientId=ana-martinez",                               user: "usr-ana-martinez" },
  { label: "patient diets (patient)",             path: "/api/patient-diets?patientId=ana-martinez",                               user: "usr-ana-martinez" },
  { label: "patient tasks (patient)",             path: "/api/patient-tasks?patientId=ana-martinez",                               user: "usr-ana-martinez" },
  { label: "notifications",                       path: "/api/notifications",                                                       user: "usr-ana-martinez" },
  { label: "notification-preferences",            path: "/api/notification-preferences",                                            user: "usr-ana-martinez" },

  // --- PROFESSIONAL: usr-laura-vega ---
  { label: "appointments (pro)",                  path: "/api/appointments",                                                        user: "usr-laura-vega" },
  { label: "audit-logs",                          path: "/api/audit-logs",                                                          user: "usr-laura-vega" },
  { label: "patients list",                       path: "/api/patients",                                                            user: "usr-laura-vega" },
  { label: "patient detail",                      path: "/api/patients/ana-martinez",                                               user: "usr-laura-vega" },
  { label: "patient appointments",                path: "/api/patients/ana-martinez/appointments",                                  user: "usr-laura-vega" },
  { label: "patient soap-notes",                  path: "/api/patients/ana-martinez/soap-notes",                                   user: "usr-laura-vega" },
  { label: "soap-notes list",                     path: "/api/soap-notes",                                                          user: "usr-laura-vega" },
  { label: "body-measurements (pro)",             path: "/api/body-measurements?patientId=ana-martinez",                           user: "usr-laura-vega" },
  { label: "patient diets (pro)",                 path: "/api/patient-diets?patientId=ana-martinez",                               user: "usr-laura-vega" },
  { label: "professional-portal dashboard",       path: "/api/professional-portal/dashboard",                                      user: "usr-laura-vega" },
  { label: "professional-portal onboarding",      path: "/api/professional-portal/onboarding",                                     user: "usr-laura-vega" },
  { label: "professional-portal payments",        path: "/api/professional-portal/payments",                                       user: "usr-laura-vega" },
  { label: "professional-portal subscription",    path: "/api/professional-portal/subscription",                                   user: "usr-laura-vega" },
  { label: "professional-marketplace status",     path: "/api/professional-marketplace/status",                                    user: "usr-laura-vega" },
  { label: "clinics",                             path: "/api/clinics",                                                             user: "usr-laura-vega" },

  // --- PSYCHOLOGIST: usr-nora-ibarra ---
  { label: "patient tasks (psych)",               path: "/api/patient-tasks?patientId=sofia-leon",                                 user: "usr-nora-ibarra" },

  // --- ADMIN: usr-master ---
  { label: "admin professionals",                 path: "/api/admin/professionals",                                                 user: "usr-master" },
  { label: "admin marketplace pending",           path: "/api/admin/marketplace/pending",                                          user: "usr-master" },
];

// ---------------------------------------------------------------------------
// HTTP helper (mirrors test-api.mjs)
// ---------------------------------------------------------------------------
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { body, response, status: response.status };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // --- Health gate ---
  let health;
  try {
    health = await request("/health");
  } catch (err) {
    console.error(`FATAL: cannot reach API at ${API_BASE_URL} — ${err.message}`);
    process.exit(1);
  }
  assert(health.status === 200, `health returned ${health.status}, expected 200`);
  assert(
    health.body?.database === "connected",
    `health does not report PostgreSQL connected (got: ${JSON.stringify(health.body?.database)})`
  );
  console.log(`OK  health check passed (database: ${health.body.database})\n`);

  // --- Run endpoints ---
  const failures = [];
  let passed = 0;

  for (const endpoint of ENDPOINTS) {
    const headers = {};
    if (endpoint.user) {
      headers["X-HealthHub-Dev-User"] = endpoint.user;
    }

    let status;
    let networkError = null;
    try {
      const result = await request(endpoint.path, { headers });
      status = result.status;
    } catch (err) {
      networkError = err.message;
      status = null;
    }

    const isPass = status !== null && status !== 401 && status !== 500;

    if (isPass) {
      passed++;
      console.log(`PASS ${String(status).padEnd(3)} ${endpoint.label.padEnd(40)} ${endpoint.path}`);
    } else {
      const displayStatus = status ?? "ERR";
      const reason = networkError ? ` (${networkError})` : "";
      console.log(`FAIL ${String(displayStatus).padEnd(3)} ${endpoint.label.padEnd(40)} ${endpoint.path}${reason}`);
      failures.push({ status: displayStatus, label: endpoint.label, path: endpoint.path });
    }
  }

  const total = ENDPOINTS.length;
  console.log(`\nSummary: ${passed}/${total} passed`);

  if (failures.length > 0) {
    console.error(`\nFAILED endpoints (${failures.length}):`);
    for (const f of failures) {
      console.error(`  ${f.status} ${f.label} ${f.path}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err.message);
  process.exit(1);
});
