import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
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
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 lg:px-10">
        <Link href="/profesionales" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold">Clinixa</p>
            <p className="text-xs text-slate-500">Directorio de profesionales</p>
          </div>
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Crear cuenta
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        {/* Heading */}
        <div className="mb-8 text-center">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-primary">
            Profesionales verificados
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-foreground lg:text-3xl">
            Encuentra tu profesional de salud
          </h1>
          <p className="mt-2 text-sm text-slate-500">
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
            className="flex-1 rounded-md border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
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
                : "border-border bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
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
                    : "border-border bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        {/* Grid de tarjetas o empty state */}
        {pros.length === 0 ? (
          <div className="rounded-lg border border-border bg-white py-16 text-center">
            <p className="text-base font-medium text-foreground">
              No encontramos profesionales con esos filtros.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Intenta ampliar tu búsqueda o quitar los filtros activos.
            </p>
            <Link
              href="/profesionales"
              className="mt-5 inline-block rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
            >
              Ver todos los profesionales
            </Link>
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
