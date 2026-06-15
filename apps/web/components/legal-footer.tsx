import Link from "next/link";

// Datos legales configurables. Mientras un valor conserve el placeholder
// sin resolver (contiene "["), no se muestra al usuario.
const legalEntityName = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME ?? "[RAZON_SOCIAL]";
const privacyContactEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ?? "[EMAIL_PRIVACIDAD]";

function isResolved(value: string) {
  return value.trim().length > 0 && !value.includes("[");
}

export function LegalFooter() {
  const parts = ["© 2026 Clinixa"];

  if (isResolved(legalEntityName)) {
    parts.push(legalEntityName);
  }

  if (isResolved(privacyContactEmail)) {
    parts.push(`Contacto: ${privacyContactEmail}`);
  }

  return (
    <footer className="border-t border-border px-5 py-6 text-center text-xs text-slate-500">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link className="hover:text-primary" href="/privacy">
          Aviso de Privacidad
        </Link>
        <Link className="hover:text-primary" href="/terms">
          Términos y Condiciones
        </Link>
      </div>
      <p className="mt-3">{parts.join(" · ")}</p>
    </footer>
  );
}
