import { redirect } from "next/navigation";

// Ruta legacy: el contenido vigente se renderiza desde docs/legal en /terms.
export default function TermsRedirect() {
  redirect("/terms");
}
