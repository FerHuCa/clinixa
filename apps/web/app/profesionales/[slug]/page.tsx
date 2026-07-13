import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, MapPin, Star, Clock, UserRound } from "lucide-react";
import { LegalFooter } from "@/components/legal-footer";
import {
  fetchProfessionalBySlug,
  WEEKDAY_LABELS,
  type PublicProfessional,
} from "@/lib/public-professionals";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pro = await fetchProfessionalBySlug(slug);

  if (!pro) {
    return { title: "Profesional no encontrado | Clinixa" };
  }

  const description = pro.bio ? pro.bio.slice(0, 150) : `${pro.displayName} — ${pro.specialtyLabel} en Clinixa.`;
  const images = pro.profilePhotoUrl ? [{ url: pro.profilePhotoUrl }] : [];

  return {
    title: `${pro.displayName} · ${pro.specialtyLabel} | Clinixa`,
    description,
    openGraph: {
      title: `${pro.displayName} · ${pro.specialtyLabel} | Clinixa`,
      description,
      images,
    },
  };
}

// Formatear precio en MXN
function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Placeholder con iniciales
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Label legible del modo de consulta
function modeLabel(mode: string): string {
  if (mode === "online") return "En línea";
  if (mode === "in_person") return "Presencial";
  if (mode === "both") return "Presencial y en línea";
  return mode;
}

function AvatarSection({ pro }: { pro: PublicProfessional }) {
  if (pro.profilePhotoUrl) {
    return (
      <img
        alt={`Foto de perfil de ${pro.displayName}`}
        className="h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-md"
        src={pro.profilePhotoUrl}
      />
    );
  }

  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-white text-3xl font-semibold ring-4 ring-white shadow-md">
      {getInitials(pro.displayName)}
    </div>
  );
}

export default async function ProfessionalProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const pro = await fetchProfessionalBySlug(slug);

  if (!pro) notFound();

  return (
    <main className="min-h-screen bg-muted/40">
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
        <Link
          className="btn-primary"
          href="/sign-up"
        >
          Crear cuenta
        </Link>
      </header>

      {/* Hero */}
      <section className="bg-white border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <AvatarSection pro={pro} />
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">{pro.displayName}</h1>
              <span className="mt-1 rounded-full bg-primary-soft px-3 py-0.5 text-sm font-medium text-primary">
                {pro.specialtyLabel}
              </span>
              {pro.location && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin size={14} className="shrink-0" />
                  {pro.location}
                </p>
              )}
              {(pro.averageRating > 0 || pro.reviewCount > 0) && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{pro.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({pro.reviewCount} {pro.reviewCount === 1 ? "reseña" : "reseñas"})</span>
                </p>
              )}
              {pro.basePrice > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Consulta desde{" "}
                  <span className="font-semibold text-foreground">{formatMXN(pro.basePrice)}</span>
                </p>
              )}
              {/* CTAs */}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/60"
                  href="/sign-up"
                >
                  <UserRound size={16} />
                  Crear cuenta para agendar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            {/* Bio */}
            {pro.bio && (
              <section className="rounded-lg border border-border bg-white p-6">
                <h2 className="mb-3 text-base font-semibold text-foreground">Acerca de</h2>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line break-words">{pro.bio}</p>
              </section>
            )}

            {/* Servicios */}
            {pro.services.length > 0 && (
              <section className="rounded-lg border border-border bg-white p-6">
                <h2 className="mb-4 text-base font-semibold text-foreground">Servicios</h2>
                <ul className="divide-y divide-border">
                  {pro.services.map((svc) => (
                    <li className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0" key={svc.id}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{svc.name}</p>
                        {svc.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2">
                          {svc.durationMinutes > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock size={11} />
                              {svc.durationMinutes} min
                            </span>
                          )}
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {modeLabel(svc.mode)}
                          </span>
                        </div>
                      </div>
                      {svc.price > 0 && (
                        <p className="shrink-0 text-sm font-semibold text-foreground">{formatMXN(svc.price)}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Disponibilidad */}
            {pro.availability.length > 0 && (
              <section className="rounded-lg border border-border bg-white p-6">
                <h2 className="mb-4 text-base font-semibold text-foreground">Horarios</h2>
                <ul className="space-y-2">
                  {pro.availability
                    .slice()
                    .sort((a, b) => a.weekday - b.weekday)
                    .map((slot) => (
                      <li className="flex items-center justify-between text-sm" key={slot.id}>
                        <span className="font-medium text-foreground/80">{WEEKDAY_LABELS[slot.weekday]}</span>
                        <span className="text-muted-foreground">
                          {slot.startsAt}–{slot.endsAt}
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {/* Modo de consulta */}
            <section className="rounded-lg border border-border bg-white p-6">
              <h2 className="mb-3 text-base font-semibold text-foreground">Modalidad</h2>
              <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
                {modeLabel(pro.appointmentMode)}
              </span>
            </section>

            {/* CTA lateral */}
            <div className="rounded-lg border border-border bg-white p-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿Quieres agendar una cita con {pro.displayName.split(" ")[0]}?
              </p>
              <Link
                className="mt-3 block btn-primary"
                href="/sign-up"
              >
                Crear cuenta para agendar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LegalFooter />
    </main>
  );
}
