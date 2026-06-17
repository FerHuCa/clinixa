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

/** Opciones canónicas de especialidad para usar en los <select> del onboarding y del portal.
 *  Mantenerlas aquí garantiza que los labels sean idénticos en ambas superficies. */
export const SPECIALTY_OPTIONS: { value: string; label: string }[] = [
  { label: "Medicina", value: "doctor" },
  { label: "Psicología", value: "psychologist" },
  { label: "Fisioterapia", value: "physiotherapist" },
  { label: "Nutrición", value: "nutritionist" },
  { label: "Otra especialidad", value: "other" }
];

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
