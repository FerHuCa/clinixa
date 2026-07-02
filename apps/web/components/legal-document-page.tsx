import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Activity, ArrowLeft } from "lucide-react";
import type { LegalDocument } from "@/lib/legal-docs";
import { LegalFooter } from "@/components/legal-footer";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
            <Activity size={20} />
          </div>
          <p className="text-sm font-semibold">Clinixa</p>
        </div>
        <Link className="-mx-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-primary" href="/bienvenida">
          <ArrowLeft size={15} />
          Volver
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 text-sm leading-7 text-slate-700">
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Versión {document.version} · {document.date}. Documento pendiente de validación por abogado mexicano y de
          completar los campos marcados entre corchetes antes de operar con usuarios reales.
        </p>

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-semibold text-foreground">{children}</h1>,
            h2: ({ children }) => <h2 className="mt-8 text-lg font-semibold text-foreground">{children}</h2>,
            h3: ({ children }) => <h3 className="mt-6 text-base font-semibold text-foreground">{children}</h3>,
            p: ({ children }) => <p className="mt-3">{children}</p>,
            ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-6">{children}</ol>,
            blockquote: ({ children }) => (
              <blockquote className="mt-3 border-l-4 border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border bg-slate-100 px-3 py-2 font-semibold text-foreground">{children}</th>
            ),
            td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
            hr: () => <hr className="my-8 border-border" />,
            a: ({ href, children }) => (
              <a className="font-medium text-primary underline-offset-2 hover:underline" href={href}>
                {children}
              </a>
            )
          }}
        >
          {document.markdown}
        </ReactMarkdown>
      </article>

      <LegalFooter />
    </main>
  );
}
