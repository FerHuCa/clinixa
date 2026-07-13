import Link from "next/link";
import type { PublicProfessional } from "@/lib/public-professionals";

function appointmentModeLabel(mode: string): string {
  switch (mode) {
    case "online":
      return "En línea";
    case "in_person":
      return "Presencial";
    case "hybrid":
      return "Híbrido";
    default:
      return mode;
  }
}

function appointmentModeClass(mode: string): string {
  switch (mode) {
    case "online":
      return "bg-primary-soft text-primary";
    case "in_person":
      return "bg-blue-50 text-blue-700";
    case "hybrid":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-muted text-foreground/80";
  }
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] ?? "") + (parts[1][0] ?? "")
      : (parts[0]?.[0] ?? "?");
  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold uppercase text-primary">
      {initials.toUpperCase()}
    </div>
  );
}

type Props = {
  pro: PublicProfessional;
};

export function ProfessionalCard({ pro }: Props) {
  return (
    <Link
      href={`/profesionales/${pro.slug}`}
      className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lifted motion-reduce:transform-none"
    >
      {/* Avatar + nombre */}
      <div className="flex items-center gap-3">
        {pro.profilePhotoUrl ? (
          <img
            src={pro.profilePhotoUrl}
            alt={pro.displayName}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <Initials name={pro.displayName} />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{pro.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{pro.specialtyLabel}</p>
        </div>
      </div>

      {/* Ubicación */}
      {pro.location ? (
        <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-4 w-4 flex-shrink-0"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
            />
          </svg>
          <span className="truncate">{pro.location}</span>
        </p>
      ) : null}

      {/* Rating */}
      {pro.reviewCount > 0 ? (
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4 text-amber-400"
            aria-hidden="true"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span className="font-medium">{pro.averageRating.toFixed(1)}</span>
          <span className="text-muted-foreground">({pro.reviewCount})</span>
        </p>
      ) : null}

      {/* Footer: precio + modalidad */}
      <div className="mt-auto pt-4 flex items-center justify-between gap-2">
        {pro.basePrice > 0 ? (
          <span className="text-sm font-medium text-foreground">
            desde{" "}
            <span className="text-primary">
              ${pro.basePrice.toLocaleString("es-MX")} MXN
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Consultar precio</span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${appointmentModeClass(pro.appointmentMode)}`}
        >
          {appointmentModeLabel(pro.appointmentMode)}
        </span>
      </div>
    </Link>
  );
}
