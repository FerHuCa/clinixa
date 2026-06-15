// Etiquetas legibles para los slugs de especialidad que maneja la API.
// Evita mostrar valores crudos como "nutri" o "psychologist" al usuario.
const SPECIALTY_LABELS: Record<string, string> = {
  doctor: "Medicina",
  nutri: "Nutrición",
  nutritionist: "Nutrición",
  physiotherapist: "Fisioterapia",
  psychologist: "Psicología",
  other: "Salud"
};

export function specialtyLabelFor(specialty: string | null | undefined): string {
  const normalized = (specialty ?? "").trim();

  if (!normalized) {
    return "Salud";
  }

  const mapped = SPECIALTY_LABELS[normalized.toLowerCase()];

  if (mapped) {
    return mapped;
  }

  // Fallback: convertir el slug en texto legible con inicial mayúscula.
  const readable = normalized.replaceAll("_", " ").replaceAll("-", " ");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}
