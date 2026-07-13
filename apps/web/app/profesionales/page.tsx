import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LegalFooter } from "@/components/legal-footer";
import { ProfessionalCard } from "@/components/professional-card";
import { fetchPublicProfessionals } from "@/lib/public-professionals";
import { SPECIALTY_OPTIONS } from "@/lib/specialty-labels";

export const metadata: Metadata = {
  title: "Directorio de profesionales | Clinixa",
  description:
    "Encuentra médicos, psicólogos, nutriólogos y fisioterapeutas verificados en Clinixa. Agenda tu consulta en línea o presencial.",
};

type SearchParams = {
  especialidad?: string;
  q?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function ProfessionalsDirectoryPage({ searchParams }: Props) {
  const { especialidad, q } = await searchParams;

  const specialty = especialidad && especialidad !== "all" ? especialidad : undefined;
  const query = q?.trim() || undefined;

  const pros = await fetchPublicProfessionals({ specialty, query });

  return (
    <main className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 lg:px-10">
        <Link href="/profesionales" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Activity size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none tracking-tight">Clinixa</p>
            <p className="mt-1 text-xs text-muted-foreground">Directorio de profesionales</p>
          </div>
        </Link>
        <Link
          href="/sign-up"
          className="btn-primary"
        >
          Crear cuenta
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        {/* Heading */}
        <div className="mb-8 text-center">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Profesionales verificados
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Encuentra tu profesional de salud
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Todos los perfiles han sido verificados por Clinixa.
          </p>
        </div>

        {/* Búsqueda */}
        <form method="get" action="/profesionales" className="mb-6 flex gap-2">
          {/* Conservar especialidad al buscar */}
          {especialidad && especialidad !== "all" ? (
            <input type="hidden" name="especialidad" value={especialidad} />
          ) : null}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o ciudad…"
            className="input flex-1 px-4 py-2.5"
          />
          <button
            type="submit"
            className="btn-primary px-5"
          >
            Buscar
          </button>
        </form>

        {/* Chips de especialidad */}
        <div className="mb-8 flex flex-wrap gap-x-2 gap-y-3">
          {/* Chip "Todas" */}
          <Link
            href={query ? `/profesionales?q=${encodeURIComponent(query)}` : "/profesionales"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !especialidad || especialidad === "all"
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            Todas
          </Link>
          {SPECIALTY_OPTIONS.map((opt) => {
            const isActive = especialidad === opt.value;
            const href = query
              ? `/profesionales?especialidad=${opt.value}&q=${encodeURIComponent(query)}`
              : `/profesionales?especialidad=${opt.value}`;
            return (
              <Link
                key={opt.value}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        {/* Grid de tarjetas o empty state */}
        {pros.length === 0 ? (
          <div className="card py-8">
            <EmptyState
              action={
                <Link className="btn-secondary px-5" href="/profesionales">
                  Ver todos los profesionales
                </Link>
              }
              hint="Intenta ampliar tu búsqueda o quitar los filtros activos."
              title="No encontramos profesionales con esos filtros"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pros.map((pro) => (
              <ProfessionalCard key={pro.id} pro={pro} />
            ))}
          </div>
        )}
      </div>

      <LegalFooter />
    </main>
  );
}
