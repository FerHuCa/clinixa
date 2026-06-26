#!/usr/bin/env node
// Self-contained assertion: verifies the review name-anonymization logic.
// Mirrors MappingExtensions.AnonymizePatientName (C#) in plain JS.
// Run: node scripts/test-anonymize-review.mjs

function anonymizePatientName(fullName) {
  if (!fullName || !fullName.trim()) return "Paciente";

  const tokens = fullName.trim().split(/\s+/);
  if (tokens.length === 1) return tokens[0][0].toUpperCase() + ".";

  // First token as display name, last token initial as anonymized surname.
  const firstInitial = tokens[tokens.length - 1][0].toUpperCase();
  return `${tokens[0]} ${firstInitial}.`;
}

let passed = 0;
let failed = 0;

function assert(description, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS  ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${description}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertNoSurname(description, fullName) {
  const result = anonymizePatientName(fullName);
  const tokens = fullName.trim().split(/\s+/);
  const surname = tokens.length > 1 ? tokens[tokens.length - 1] : null;
  const exposesFullSurname = surname ? result.includes(surname) : false;
  if (!exposesFullSurname) {
    console.log(`  PASS  ${description} (got: "${result}")`);
    passed++;
  } else {
    console.error(`  FAIL  ${description} — full surname exposed in "${result}"`);
    failed++;
  }
}

console.log("=== test-anonymize-review ===\n");

// Core cases
assert("two-token name", anonymizePatientName("María González"), "María G.");
assert("three-token name (uses last token initial)", anonymizePatientName("Ana Lucía Ramírez"), "Ana R.");
assert("single-token", anonymizePatientName("Guadalupe"), "G.");
assert("extra whitespace", anonymizePatientName("  Carlos  López  "), "Carlos L.");
assert("empty string → Paciente", anonymizePatientName(""), "Paciente");
assert("whitespace-only → Paciente", anonymizePatientName("   "), "Paciente");

// Property: full surname never appears in output
assertNoSurname("full surname not exposed: María González", "María González");
assertNoSurname("full surname not exposed: Ana Lucía Ramírez", "Ana Lucía Ramírez");
assertNoSurname("full surname not exposed: Juan Martínez Soto", "Juan Martínez Soto");

console.log(`\n${passed + failed} assertions: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
