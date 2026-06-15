import { redirect } from "next/navigation";

// Ruta legacy: el contenido vigente se renderiza desde docs/legal en /privacy.
export default function PrivacyNoticeRedirect() {
  redirect("/privacy");
}
