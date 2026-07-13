"use client";

import { BadgeCheck, CalendarDays, Clock, MapPin, Monitor, Star, WalletCards } from "lucide-react";
import type { Patient, Professional, ProfessionalReview } from "@/lib/healthhub-store";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function modeLabel(mode: string) {
  if (mode === "online") {
    return "Online";
  }

  if (mode === "in_person") {
    return "Presencial";
  }

  return "Híbrido";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type Props = {
  currentPatient: Patient | undefined;
  expanded: boolean;
  professional: Professional;
  reviews: ProfessionalReview[];
  onStartBooking: (professional: Professional) => void;
  onToggleReviews: (professionalId: string) => void;
};

export function ProfessionalCard({ currentPatient, expanded, professional, reviews, onStartBooking, onToggleReviews }: Props) {
  const firstService = professional.services[0];

  return (
    <article className="px-4 py-4" key={professional.id}>
      <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">
              {initials(professional.displayName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{professional.displayName}</h2>
                <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{professional.specialtyLabel}</span>
                <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  <Star size={13} />
                  {professional.averageRating.toFixed(1)} · {professional.reviewCount}
                </span>
                {professional.verificationStatus === "verified" ? (
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <BadgeCheck size={13} />
                    Cédula {professional.licenseNumber} verificada
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{professional.bio}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin aria-hidden="true" className="text-muted-foreground/70" size={15} />
                  {professional.location}
                </span>
                <span className="flex items-center gap-1">
                  <Monitor aria-hidden="true" className="text-muted-foreground/70" size={15} />
                  {modeLabel(professional.appointmentMode)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock aria-hidden="true" className="text-muted-foreground/70" size={15} />
                  {professional.nextAvailable}
                </span>
              </div>
            </div>
          </div>

          {firstService ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{firstService.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{firstService.description}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={15} />
                    {firstService.durationMinutes} min
                  </span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <WalletCards size={15} />
                    {money(firstService.price)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="btn-primary"
            disabled={!currentPatient}
            onClick={() => onStartBooking(professional)}
            type="button"
          >
            <CalendarDays size={16} />
            {currentPatient ? "Solicitar cita" : "Sesión de paciente"}
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/80"
            onClick={() => onToggleReviews(professional.id)}
            type="button"
          >
            <Star size={16} />
            {expanded ? "Ocultar opiniones" : "Ver opiniones"}
          </button>
          <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            Desde <span className="font-semibold text-foreground">{money(professional.basePrice)}</span>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div className="rounded-lg border border-border bg-white p-3" key={review.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{review.patientName}</p>
                  <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                    <Star size={14} />
                    {review.rating}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin opiniones publicadas.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
