import { LegalDocumentPage } from "@/components/legal-document-page";
import { loadLegalDocument } from "@/lib/legal-docs";

export const metadata = {
  title: "Aviso de Privacidad — Clinixa",
  description: "Aviso de Privacidad Integral conforme a la LFPDPPP, su Reglamento y la normativa sanitaria aplicable."
};

export default async function PrivacyPage() {
  const document = await loadLegalDocument("aviso-de-privacidad");
  return <LegalDocumentPage document={document} />;
}
