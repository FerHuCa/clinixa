/**
 * test-public-features.mjs — Pruebas de features públicas de Clinixa
 *
 * Cubre: directorio público, perfil por slug, avatar upload, loop de verificación,
 * y gate público (pending → no aparece en directorio).
 *
 * Idempotente: teardown restaura el estado de Fernando a "pending".
 *
 * Uso:
 *   node scripts/test-public-features.mjs
 *   HEALTHHUB_API_BASE_URL=http://127.0.0.1:5050 node scripts/test-public-features.mjs
 */

import { createHash } from "node:crypto";

const API_BASE_URL = process.env.HEALTHHUB_API_BASE_URL ?? "http://127.0.0.1:5050";

// PNG 1×1 píxel en base64 (PNG válido mínimo)
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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
    throw new Error(`ASSERT FAILED: ${message}`);
  }
}

async function login(email) {
  const result = await request("/api/auth/login", {
    body: JSON.stringify({ email, password: "healthhub123" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  assert(
    result.status === 200,
    `login ${email} esperaba 200 y devolvio ${result.status}: ${JSON.stringify(result.body)}`
  );
  assert(result.body?.token, `login ${email} no devolvio token`);
  return result.body;
}

/**
 * Calcula el slug que el backend asignaría a un profesional:
 * 1. kebab-case del displayName (sin diacríticos, sin caracteres especiales)
 * 2. sufijo de 6 hex = SHA256(id)[0:6]
 */
function computeSlug(displayName, id) {
  // Quitar diacríticos (simplificado para nombres latinos comunes)
  const normalized = displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const kebab = normalized
    .replace(/[^a-z0-9\s\-_.]/g, "")
    .replace(/[\s\-_.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const hash = createHash("sha256").update(id).digest("hex");
  const suffix = hash.slice(0, 6).toLowerCase();
  return `${kebab}-${suffix}`;
}

async function main() {
  console.log("=== test-public-features.mjs ===");
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log("");

  // ── Logins ──────────────────────────────────────────────────────────────────
  console.log("[setup] Autenticando usuarios de prueba...");
  const lauraAuth = await login("laura.vega@healthhub.demo");
  const masterAuth = await login("master@healthhub.demo");
  console.log("[setup] Logins OK");
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // CASO 1 — Directorio público / integridad
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("[1] GET /api/professionals — directorio público e integridad...");

  const dirResult = await request("/api/professionals");
  assert(dirResult.status === 200, `directorio esperaba 200 y devolvio ${dirResult.status}`);
  assert(
    Array.isArray(dirResult.body) && dirResult.body.length > 0,
    "directorio devolvio lista vacía"
  );

  const professionals = dirResult.body;

  for (const prof of professionals) {
    // Todos deben estar verified + active
    assert(
      prof.verificationStatus === "verified",
      `profesional "${prof.displayName}" tiene verificationStatus="${prof.verificationStatus}", esperaba "verified"`
    );
    assert(
      prof.status === "active",
      `profesional "${prof.displayName}" tiene status="${prof.status}", esperaba "active"`
    );

    // Slug: no vacío, formato "algo-6hex" (termina en -[0-9a-f]{6})
    assert(prof.slug && prof.slug.length > 0, `profesional "${prof.displayName}" no tiene slug`);
    assert(
      /-[0-9a-f]{6}$/.test(prof.slug),
      `slug "${prof.slug}" de "${prof.displayName}" no cumple formato kebab-6hex`
    );

    // profilePhotoUrl: la propiedad debe existir (puede ser cadena vacía para los demo sin foto)
    assert(
      "profilePhotoUrl" in prof,
      `profesional "${prof.displayName}" no tiene campo profilePhotoUrl`
    );

    // Integridad: bio, location, licenseNumber no vacíos
    assert(
      prof.bio && prof.bio.trim().length > 0,
      `profesional "${prof.displayName}" tiene bio vacío`
    );
    assert(
      prof.location && prof.location.trim().length > 0,
      `profesional "${prof.displayName}" tiene location vacío`
    );
    assert(
      prof.licenseNumber && prof.licenseNumber.trim().length > 0,
      `profesional "${prof.displayName}" tiene licenseNumber vacío`
    );

    // Ningún item se llama "Profesional QA" (limpieza funcionó)
    assert(
      prof.displayName !== "Profesional QA",
      `"Profesional QA" aparece en el directorio — la limpieza no funcionó`
    );
  }

  console.log(
    `[1] OK — ${professionals.length} profesional(es) en directorio, todos verified+active+íntegros`
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // CASO 2 — Perfil por slug
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("[2] GET /api/professionals/by-slug/{slug} — perfil por slug...");

  const sampleProf = professionals[0];
  const sampleSlug = sampleProf.slug;

  const bySlugResult = await request(`/api/professionals/by-slug/${sampleSlug}`);
  assert(
    bySlugResult.status === 200,
    `by-slug/${sampleSlug} esperaba 200 y devolvio ${bySlugResult.status}`
  );
  assert(
    bySlugResult.body?.displayName === sampleProf.displayName,
    `by-slug devolvio displayName="${bySlugResult.body?.displayName}", esperaba "${sampleProf.displayName}"`
  );
  assert(Array.isArray(bySlugResult.body?.services), `by-slug no incluye array "services"`);
  assert(
    Array.isArray(bySlugResult.body?.availability),
    `by-slug no incluye array "availability"`
  );

  // Slug inválido → 404
  const notFoundResult = await request("/api/professionals/by-slug/no-existe-xyz");
  assert(
    notFoundResult.status === 404,
    `slug inválido esperaba 404 y devolvio ${notFoundResult.status}`
  );

  console.log(
    `[2] OK — slug "${sampleSlug}" resuelve a "${sampleProf.displayName}"; slug inválido → 404`
  );
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // CASO 3 — Avatar upload (multipart, como Laura)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("[3] POST /api/professional-portal/avatar — upload de avatar...");

  const pngBuffer = Buffer.from(PNG_1X1_BASE64, "base64");

  // ── 3a. PNG válido → 200 ──
  {
    const fd = new FormData();
    const blob = new Blob([pngBuffer], { type: "image/png" });
    fd.append("file", blob, "avatar.png");

    const avatarResult = await request("/api/professional-portal/avatar", {
      body: fd,
      headers: { Authorization: `Bearer ${lauraAuth.token}` },
      method: "POST",
    });
    assert(
      avatarResult.status === 200,
      `avatar PNG esperaba 200 y devolvio ${avatarResult.status}: ${JSON.stringify(avatarResult.body)}`
    );
    const photoUrl = avatarResult.body?.profilePhotoUrl ?? "";
    assert(
      photoUrl.startsWith("/uploads/avatars/"),
      `profilePhotoUrl="${photoUrl}" no empieza con /uploads/avatars/`
    );

    // El archivo debe servirse: GET sin querystring → 200
    const urlWithoutQuery = photoUrl.split("?")[0];
    const serveResult = await request(urlWithoutQuery);
    assert(
      serveResult.status === 200,
      `GET ${urlWithoutQuery} esperaba 200 y devolvio ${serveResult.status}`
    );

    console.log(`[3a] OK — PNG subido → profilePhotoUrl="${photoUrl}"; GET archivo → 200`);
  }

  // ── 3b. Archivo .txt → 400 ──
  {
    const fd = new FormData();
    const blob = new Blob(["texto plano"], { type: "text/plain" });
    fd.append("file", blob, "archivo.txt");

    const txtResult = await request("/api/professional-portal/avatar", {
      body: fd,
      headers: { Authorization: `Bearer ${lauraAuth.token}` },
      method: "POST",
    });
    assert(
      txtResult.status === 400,
      `avatar .txt esperaba 400 y devolvio ${txtResult.status}: ${JSON.stringify(txtResult.body)}`
    );
    console.log(`[3b] OK — archivo .txt rechazado → 400`);
  }

  // ── 3c. Archivo > 2 MB → 400 ──
  {
    // Buffer de 2MB+1 bytes. La extensión es .png para que pase la validación de extensión;
    // el backend verifica tamaño ANTES de extensión según el código fuente.
    const bigBuffer = Buffer.alloc(2 * 1024 * 1024 + 1, 0x42);
    const fd = new FormData();
    const blob = new Blob([bigBuffer], { type: "image/png" });
    fd.append("file", blob, "grande.png");

    const bigResult = await request("/api/professional-portal/avatar", {
      body: fd,
      headers: { Authorization: `Bearer ${lauraAuth.token}` },
      method: "POST",
    });
    assert(
      bigResult.status === 400,
      `avatar >2MB esperaba 400 y devolvio ${bigResult.status}: ${JSON.stringify(bigResult.body)}`
    );
    console.log(`[3c] OK — archivo >2MB rechazado → 400`);
  }

  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // CASO 4 — Loop de verificación (como master)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("[4] Verificación de cédula — queue + verify + reject + teardown...");

  const FERNANDO_ID = "pro-murcielagolambo-gmail-com";

  // ── 4a. Queue de pendientes ──
  const queueResult = await request("/api/admin/professionals?verificationStatus=pending", {
    headers: { Authorization: `Bearer ${masterAuth.token}` },
  });
  assert(
    queueResult.status === 200,
    `admin/professionals pending esperaba 200 y devolvio ${queueResult.status}`
  );
  assert(Array.isArray(queueResult.body), "admin/professionals pending no devolvio array");
  // Cada item debe tener campo email
  for (const item of queueResult.body) {
    assert("email" in item, `item de queue pending sin campo "email": ${JSON.stringify(item)}`);
  }
  const fernandoInQueue = queueResult.body.some((p) => p.id === FERNANDO_ID);
  assert(fernandoInQueue, `Fernando (${FERNANDO_ID}) no aparece en la queue de pending`);
  console.log(
    `[4a] OK — queue pending: ${queueResult.body.length} profesional(es); Fernando presente`
  );

  // ── 4b. Verificar Fernando ──
  const verifyResult = await request(`/api/professionals/${FERNANDO_ID}/verification`, {
    body: JSON.stringify({ status: "verified" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  assert(
    verifyResult.status === 200,
    `PATCH verify esperaba 200 y devolvio ${verifyResult.status}: ${JSON.stringify(verifyResult.body)}`
  );
  assert(
    verifyResult.body?.verificationStatus === "verified",
    `tras verify, verificationStatus="${verifyResult.body?.verificationStatus}", esperaba "verified"`
  );
  console.log(`[4b] OK — Fernando verificado → verificationStatus="verified"`);

  // ── 4c. Rechazar Fernando ──
  const rejectResult = await request(`/api/professionals/${FERNANDO_ID}/verification`, {
    body: JSON.stringify({ status: "rejected", reason: "prueba automatizada" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  assert(
    rejectResult.status === 200,
    `PATCH reject esperaba 200 y devolvio ${rejectResult.status}: ${JSON.stringify(rejectResult.body)}`
  );
  assert(
    rejectResult.body?.verificationStatus === "rejected",
    `tras reject, verificationStatus="${rejectResult.body?.verificationStatus}", esperaba "rejected"`
  );
  console.log(`[4c] OK — Fernando rechazado → verificationStatus="rejected"`);

  // ── 4d. TEARDOWN — volver a pending ─────────────────────────────────────────
  const teardownResult = await request(`/api/professionals/${FERNANDO_ID}/verification`, {
    body: JSON.stringify({ status: "pending", reason: "reset prueba automatizada" }),
    headers: {
      Authorization: `Bearer ${masterAuth.token}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  assert(
    teardownResult.status === 200,
    `PATCH teardown (pending) esperaba 200 y devolvio ${teardownResult.status}: ${JSON.stringify(teardownResult.body)}`
  );
  assert(
    teardownResult.body?.verificationStatus === "pending",
    `tras teardown, verificationStatus="${teardownResult.body?.verificationStatus}", esperaba "pending"`
  );
  console.log(`[4d] TEARDOWN OK — Fernando restaurado → verificationStatus="pending"`);
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // CASO 5 — Gate público: Fernando (pending) no aparece en directorio ni by-slug
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(
    "[5] Gate público — Fernando (pending) NO debe aparecer en directorio ni por slug..."
  );

  // Directorio post-teardown
  const dirPost = await request("/api/professionals");
  assert(
    dirPost.status === 200,
    `directorio post-teardown esperaba 200 y devolvio ${dirPost.status}`
  );
  const fernandoInDir = dirPost.body.some(
    (p) => p.displayName === "Fernando Huerta" || p.id === FERNANDO_ID
  );
  assert(
    !fernandoInDir,
    `Fernando Huerta (pending) aparece en el directorio público — gate no funciona`
  );

  // by-slug de Fernando → 404
  const fernandoSlug = computeSlug("Fernando Huerta", FERNANDO_ID);
  const fernandoSlugResult = await request(`/api/professionals/by-slug/${fernandoSlug}`);
  assert(
    fernandoSlugResult.status === 404,
    `by-slug Fernando (pending) esperaba 404 y devolvio ${fernandoSlugResult.status}`
  );

  console.log(
    `[5] OK — Fernando (pending) ausente del directorio; by-slug "${fernandoSlug}" → 404`
  );
  console.log("");
  console.log("=== Public features tests passed ===");
}

main().catch((err) => {
  console.error("\n[FALLO]", err.message);
  process.exit(1);
});
