import { LegalDocumentPage } from "@/components/legal-document-page";
import { loadLegalDocument } from "@/lib/legal-docs";

export const metadata = {
  title: "Términos y Condiciones — Clinixa",
  description: "Términos y Condiciones de Uso de la plataforma Clinixa."
};

export default async function TermsPage() {
  const document = await loadLegalDocument("terminos-y-condiciones");
  return <LegalDocumentPage document={document} />;
}
