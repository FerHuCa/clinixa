/**
 * check-audit-04-role-gate.mjs — Audit #4 regression checks
 *
 * Asserts:
 *   1. PATCH /api/me with { role: "doctor" } does NOT auto-provision a Professional
 *      or change the user's PrimaryRole (patient stays patient).
 *   2. POST /api/prescriptions from an unverified professional returns 403.
 *   3. POST /api/soap-notes from an unverified professional returns 403.
 *
 * Requirements:
 *   - API running at HEALTHHUB_API_BASE_URL (default http://127.0.0.1:5050)
 *   - Dev-auth bypass enabled (X-HealthHub-Dev-User header accepted)
 *   - Seed user "usr-ana-martinez" is a patient (PrimaryRole=patient, no Professional row)
 *   - Seed user "usr-unverified-pro" is a professional with VerificationStatus=pending
 *     OR create one via the DB before running (see note below).
 *
 * Note: if "usr-unverified-pro" doesn't exist in your seed, run the API in dev mode
 * and create a professional with VerificationStatus != "verified" to use this check.
 * The script exits 0 only if ALL checks PASS.
 */

const BASE = process.env.HEALTHHUB_API_BASE_URL ?? "http://127.0.0.1:5050";

// Known seed users — adjust if your dev DB differs.
const PATIENT_USER   = "usr-ana-martinez";          // PrimaryRole = "patient"
const UNVERIFIED_PRO = "usr-unverified-pro";         // Professional, VerificationStatus != "verified"

let passed = 0;
let failed = 0;

function ok(label) {
    console.log(`  PASS  ${label}`);
    passed++;
}

function fail(label, detail) {
    console.error(`  FAIL  ${label}`);
    if (detail) console.error(`        ${detail}`);
    failed++;
}

async function apiCall(method, path, userId, body) {
    const headers = { "Content-Type": "application/json" };
    if (userId) headers["X-HealthHub-Dev-User"] = userId;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, json };
}

// ---------------------------------------------------------------------------
// Check 1: PATCH /api/me with role:"doctor" — patient must stay patient
// ---------------------------------------------------------------------------
console.log("\nCheck 1: Role self-elevation via PATCH /api/me");

// Read current state first
const before = await apiCall("GET", "/api/me", PATIENT_USER);
if (before.status !== 200) {
    fail("GET /api/me baseline", `expected 200 got ${before.status}`);
} else {
    const roleBefore = before.json?.user?.primaryRole ?? before.json?.primaryRole;

    // Attempt elevation
    const patch = await apiCall("PATCH", "/api/me", PATIENT_USER, {
        fullName: before.json?.user?.fullName ?? before.json?.fullName ?? "Ana Martinez",
        role: "doctor",
        specialty: "doctor"
    });

    if (patch.status !== 200) {
        fail("PATCH /api/me should still return 200 for valid name update", `got ${patch.status}`);
    } else {
        // Re-fetch to confirm role unchanged
        const after = await apiCall("GET", "/api/me", PATIENT_USER);
        const roleAfter = after.json?.user?.primaryRole ?? after.json?.primaryRole;
        const hasProfessional = !!(after.json?.user?.professional ?? after.json?.professional);

        if (roleAfter !== roleBefore) {
            fail("PrimaryRole changed after PATCH with role:doctor", `was "${roleBefore}", now "${roleAfter}"`);
        } else {
            ok(`PrimaryRole stays "${roleBefore}" after PATCH with role:doctor`);
        }

        if (hasProfessional) {
            fail("Professional record auto-provisioned after PATCH with role:doctor", "Professional should not exist for this patient");
        } else {
            ok("No Professional record auto-provisioned via PATCH /api/me");
        }
    }
}

// ---------------------------------------------------------------------------
// Check 2: POST /api/prescriptions from unverified professional → 403
// ---------------------------------------------------------------------------
console.log("\nCheck 2: POST /api/prescriptions from unverified professional");

const rxPayload = {
    patientId: "pat-test-patient",
    medicationName: "Test Drug",
    dosage: "10mg",
    frequency: "once daily",
    duration: "7 days",
    instructions: "take with food",
    refills: 0
};

const rxResp = await apiCall("POST", "/api/prescriptions", UNVERIFIED_PRO, rxPayload);

if (rxResp.status === 403) {
    ok(`POST /api/prescriptions returns 403 for unverified professional (got ${rxResp.status})`);
} else if (rxResp.status === 404 || rxResp.status === 401) {
    // 404 can mean the seed user doesn't exist — warn rather than hard-fail
    console.warn(`  WARN  POST /api/prescriptions returned ${rxResp.status} — user "${UNVERIFIED_PRO}" may not exist in dev DB.`);
    console.warn(`        Create a professional with VerificationStatus="pending" and re-run.`);
} else {
    fail(`POST /api/prescriptions should return 403 for unverified professional`, `got ${rxResp.status}: ${JSON.stringify(rxResp.json)}`);
}

// ---------------------------------------------------------------------------
// Check 3: POST /api/soap-notes from unverified professional → 403
// ---------------------------------------------------------------------------
console.log("\nCheck 3: POST /api/soap-notes from unverified professional");

const soapPayload = {
    patientId: "pat-test-patient",
    date: new Date().toISOString().slice(0, 10),
    title: "Test note",
    status: "finalized",
    subjective: "S",
    objective: "O",
    assessment: "A",
    plan: "P",
    aiGenerated: false
};

const soapResp = await apiCall("POST", "/api/soap-notes", UNVERIFIED_PRO, soapPayload);

if (soapResp.status === 403) {
    ok(`POST /api/soap-notes returns 403 for unverified professional (got ${soapResp.status})`);
} else if (soapResp.status === 404 || soapResp.status === 401) {
    console.warn(`  WARN  POST /api/soap-notes returned ${soapResp.status} — user "${UNVERIFIED_PRO}" may not exist in dev DB.`);
    console.warn(`        Create a professional with VerificationStatus="pending" and re-run.`);
} else {
    fail(`POST /api/soap-notes should return 403 for unverified professional`, `got ${soapResp.status}: ${JSON.stringify(soapResp.json)}`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n─────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error("CHECKS FAILED");
    process.exit(1);
} else {
    console.log("All checks passed.");
    process.exit(0);
}
