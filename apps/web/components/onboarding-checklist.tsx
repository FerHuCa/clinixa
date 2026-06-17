"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Rocket, Settings } from "lucide-react";
import type { ProfessionalOnboarding } from "@/lib/healthhub-store";

type ChecklistStep = {
  done: boolean;
  href?: string;
  label: string;
  subText?: string;
};

type Props = {
  /** Llamado cuando el usuario hace clic en "Publicar perfil". */
  canPublish: boolean;
  /** Número de pasos completados (para el badge). */
  completedSteps: number;
  /** Lista de pasos del checklist. */
  steps: ChecklistStep[];
  /** Mensajes de bloqueo que vienen de `onboarding.missing[]`. */
  missing: string[];
  /** Si el formulario de publicación está en curso. */
  publishing: boolean;
  onPublish: () => void;
};

/**
 * Bloque amber que muestra el checklist de activación del perfil profesional.
 * Se usa tanto en Inicio (`app/page.tsx`) como en Configuración
 * (`app/portal-profesional/professional-portal-page-client.tsx`).
 */
export function OnboardingChecklist({ canPublish, completedSteps, steps, missing, publishing, onPublish }: Props) {
  return (
    <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Rocket size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Publica tu perfil para recibir pacientes</p>
            <p className="mt-1 text-sm text-amber-800">
              Tu perfil está en modo borrador. Completa estos pasos para aparecer en la búsqueda de pacientes.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          {completedSteps} de {steps.length} completados
        </span>
      </div>

      <ul className="space-y-2 text-sm">
        {steps.map((step) => (
          <li className="flex items-start gap-2" key={step.label}>
            {step.done ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <Circle size={16} className="mt-0.5 shrink-0 text-slate-400" />
            )}
            <div>
              {step.href && !step.done ? (
                <Link
                  className="text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  href={step.href}
                >
                  {step.label}
                </Link>
              ) : (
                <span className={step.done ? "text-slate-700" : "text-slate-500"}>{step.label}</span>
              )}
              {step.subText && !step.done ? (
                <p className="mt-0.5 text-xs leading-5 text-amber-700">{step.subText}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {missing.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-amber-300 bg-white px-3 py-2">
          {missing.map((msg) => (
            <li className="flex items-start gap-1.5 text-xs text-amber-800" key={msg}>
              <span className="mt-0.5 shrink-0">•</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={publishing || !canPublish}
          onClick={onPublish}
          type="button"
        >
          <Rocket size={16} />
          {publishing ? "Publicando..." : "Publicar perfil"}
        </button>
        <Link
          className="flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800"
          href="/portal-profesional"
        >
          <Settings size={16} />
          Completar pasos en Configuración
        </Link>
      </div>
    </div>
  );
}

/** Genera los pasos del checklist a partir del estado `onboarding`.
 *  Se usa tanto en Inicio como en Configuración para mantener la lógica DRY. */
export function buildChecklistSteps(
  onboarding: ProfessionalOnboarding,
  verificationStatus: string | undefined,
  marketplaceConnected: boolean
): ChecklistStep[] {
  return [
    {
      done: onboarding.profileComplete,
      href: "/portal-profesional",
      label: "Completa tu perfil (biografía y ubicación)"
    },
    {
      done: onboarding.hasServices,
      href: "/portal-profesional#servicios",
      label: "Agrega al menos un servicio con precio"
    },
    {
      done: onboarding.hasAvailability,
      href: "/portal-profesional#disponibilidad",
      label: "Define tu disponibilidad semanal"
    },
    {
      done: verificationStatus === "verified",
      href: "/portal-profesional",
      label: "Cédula profesional verificada por el equipo de Clinixa",
      subText:
        "Ingresa tu número de cédula en Configuración. El equipo de Clinixa la revisará manualmente (1-2 días hábiles)."
    },
    {
      done: marketplaceConnected,
      label: "Conecta Mercado Pago para cobrar en línea (no es requisito para publicar)"
    }
  ];
}
