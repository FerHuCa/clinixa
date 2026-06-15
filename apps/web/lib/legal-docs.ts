import { promises as fs } from "fs";
import path from "path";

export type LegalDocument = {
  slug: "aviso-de-privacidad" | "terminos-y-condiciones";
  title: string;
  version: string;
  date: string;
  markdown: string;
};

const DOCUMENT_FILES: Record<LegalDocument["slug"], string> = {
  "aviso-de-privacidad": "aviso-de-privacidad.md",
  "terminos-y-condiciones": "terminos-y-condiciones.md"
};

// La fuente canonica vive en docs/legal en la raiz del monorepo. En dev el cwd es
// apps/web; en despliegues standalone puede ser la raiz, por eso probamos candidatos.
async function readLegalFile(fileName: string): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "..", "..", "docs", "legal", fileName),
    path.join(process.cwd(), "docs", "legal", fileName)
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      // Probar siguiente candidato.
    }
  }

  throw new Error(`Documento legal no encontrado: ${fileName}. Verifica docs/legal/ en la raiz del repositorio.`);
}

function extractMeta(markdown: string, pattern: RegExp): string {
  return markdown.match(pattern)?.[1]?.trim() ?? "";
}

export async function loadLegalDocument(slug: LegalDocument["slug"]): Promise<LegalDocument> {
  const markdown = await readLegalFile(DOCUMENT_FILES[slug]);

  return {
    slug,
    title: extractMeta(markdown, /^#\s+(.+)$/m) || slug,
    version: extractMeta(markdown, /\*\*Versi[oó]n:\*\*\s*(.+?)\s{2}/) || extractMeta(markdown, /\*\*Versi[oó]n:\*\*\s*(.+)$/m),
    date: extractMeta(markdown, /\*\*Fecha:\*\*\s*(.+?)\s{2}/) || extractMeta(markdown, /\*\*Fecha:\*\*\s*(.+)$/m),
    markdown
  };
}
