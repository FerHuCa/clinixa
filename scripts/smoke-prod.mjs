/**
 * smoke-prod.mjs — Production post-deploy smoke test (READ-ONLY / idempotent)
 *
 * Runs against live prod and exits 1 if ANY check fails. Safe to run repeatedly.
 * Guards the two config bugs that caused today's outage:
 *   (a) CSP missing clerk.clinixa.mx (login broke), and
 *   (b) the web bundle baking the raw Railway API URL instead of api.clinixa.mx.
 *
 * Targets (override via env):
 *   CLINIXA_WEB_URL    web origin           default https://clinixa.mx
 *   CLINIXA_API_URL    API origin           default https://api.clinixa.mx
 *   CLINIXA_CLERK_FAPI Clerk Frontend API   default https://clerk.clinixa.mx
 */

const WEB_URL = process.env.CLINIXA_WEB_URL ?? "https://clinixa.mx";
const API_URL = process.env.CLINIXA_API_URL ?? "https://api.clinixa.mx";
const CLERK_FAPI = process.env.CLINIXA_CLERK_FAPI ?? "https://clerk.clinixa.mx";

const TIMEOUT_MS = 15000;
const MAX_CHUNKS = 25;

// ---------------------------------------------------------------------------
// HTTP helper (mirrors smoke-api.mjs) — adds a per-request timeout
// ---------------------------------------------------------------------------
async function request(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), ...options });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { body, response, status: response.status, text };
}

// ---------------------------------------------------------------------------
// Check runner — each check is an async fn that throws on failure
// ---------------------------------------------------------------------------
const CHECKS = [];
function check(label, fn) {
  CHECKS.push({ label, fn });
}

// 1. Web reachable + all six security headers present
check("web 200 + security headers", async () => {
  const { response, status } = await request(WEB_URL);
  if (status !== 200) throw new Error(`GET ${WEB_URL} returned ${status}, expected 200`);
  const required = [
    "strict-transport-security",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "content-security-policy",
  ];
  const missing = required.filter((h) => !response.headers.has(h));
  if (missing.length > 0) throw new Error(`missing security headers: ${missing.join(", ")}`);
});

// 2. CSP carries the Clerk + API + worker directives that broke login today
check("CSP allows clerk + api + blob worker", async () => {
  const { response } = await request(WEB_URL);
  const csp = response.headers.get("content-security-policy");
  if (!csp) throw new Error("no content-security-policy header");
  const directive = (name) => {
    const m = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ") || d === name);
    return m ?? "";
  };
  const problems = [];
  if (!directive("script-src").includes("clerk.clinixa.mx")) problems.push("script-src missing clerk.clinixa.mx");
  const connect = directive("connect-src");
  if (!connect.includes("clerk.clinixa.mx")) problems.push("connect-src missing clerk.clinixa.mx");
  if (!connect.includes("api.clinixa.mx")) problems.push("connect-src missing api.clinixa.mx");
  if (!directive("worker-src").includes("blob:")) problems.push("worker-src missing blob:");
  if (problems.length > 0) throw new Error(problems.join("; "));
});

// 3. Web bundle must NOT bake the raw Railway API URL (today's regression).
//    Note: api.clinixa.mx itself lives only in auth-gated route chunks (the API
//    client), which Next.js 16's app router loads dynamically and are NOT
//    reachable from public HTML. So the positive "uses api.clinixa.mx" assertion
//    is enforced against the CSP connect-src (the build-emitted API origin) in
//    check 2; here we scan the publicly-served chunks for the negative regression.
check("served bundle has no raw Railway URL", async () => {
  const pages = ["/", "/bienvenida", "/profesionales"];
  const chunks = new Set();
  for (const page of pages) {
    const { text: html } = await request(WEB_URL + page);
    for (const m of html.matchAll(/\/_next\/static\/chunks\/[^"'\s)]+\.js/g)) chunks.add(m[0]);
  }
  const list = [...chunks].slice(0, MAX_CHUNKS);
  if (list.length === 0) throw new Error("no /_next/static/chunks/*.js URLs found in public HTML");
  let scanned = 0;
  for (const path of list) {
    const { status, text } = await request(WEB_URL + path);
    if (status !== 200) continue;
    scanned++;
    if (text.includes("up.railway.app"))
      throw new Error(`chunk ${path} contains raw Railway URL (up.railway.app)`);
  }
  if (scanned === 0) throw new Error("could not fetch any chunk to scan");
});

// 4. API health gate (mirror smoke-api.mjs)
check("api /health database connected", async () => {
  const { status, body } = await request(API_URL + "/health");
  if (status !== 200) throw new Error(`GET ${API_URL}/health returned ${status}, expected 200`);
  if (body?.database !== "connected")
    throw new Error(`health does not report database connected (got: ${JSON.stringify(body?.database)})`);
});

// 5. CORS preflight reflects the web origin
check("CORS preflight reflects web origin", async () => {
  const { response } = await request(API_URL + "/api/me", {
    method: "OPTIONS",
    headers: {
      Origin: WEB_URL,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  const allow = response.headers.get("access-control-allow-origin");
  if (allow !== WEB_URL) throw new Error(`access-control-allow-origin is ${JSON.stringify(allow)}, expected ${WEB_URL}`);
});

// 6. Clerk Frontend API alive + issuer matches (clerk-js source domain)
check("clerk FAPI openid-configuration issuer", async () => {
  const { status, body } = await request(CLERK_FAPI + "/.well-known/openid-configuration");
  if (status !== 200) throw new Error(`GET ${CLERK_FAPI}/.well-known/openid-configuration returned ${status}, expected 200`);
  if (body?.issuer !== CLERK_FAPI) throw new Error(`issuer is ${JSON.stringify(body?.issuer)}, expected ${CLERK_FAPI}`);
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Smoke (prod): web=${WEB_URL} api=${API_URL} clerk=${CLERK_FAPI}\n`);

  const failures = [];
  let passed = 0;

  for (const { label, fn } of CHECKS) {
    try {
      await fn();
      passed++;
      console.log(`PASS ${label}`);
    } catch (err) {
      console.log(`FAIL ${label} — ${err.message}`);
      failures.push({ label, message: err.message });
    }
  }

  console.log(`\nSummary: ${passed}/${CHECKS.length} passed`);

  if (failures.length > 0) {
    console.error(`\nFAILED checks (${failures.length}):`);
    for (const f of failures) {
      console.error(`  ${f.label} — ${f.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err.message);
  process.exit(1);
});
