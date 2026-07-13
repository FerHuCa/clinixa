import Link from "next/link";
import { Activity, SearchX } from "lucide-react";
import { LegalFooter } from "@/components/legal-footer";

export default function ProfessionalNotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 lg:px-10">
        <Link className="flex items-center gap-3" href="/profesionales">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">Clinixa</p>
            <p className="text-xs text-muted-foreground">Directorio de profesionales</p>
          </div>
        </Link>
      </header>

      {/* Contenido */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
          <SearchX size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">Profesional no encontrado</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          El perfil que buscas no existe o ya no está disponible en el directorio de Clinixa.
        </p>
        <Link
          className="mt-8 btn-primary px-6 py-3"
          href="/profesionales"
        >
          Ver directorio de profesionales
        </Link>
      </section>

      <LegalFooter />
    </main>
  );
}
