"use client";

import { CalendarDays, Clock, Monitor, WalletCards } from "lucide-react";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { citaStatusUiFor, pagoStatusUiFor } from "@/lib/appointment-states";
import type { Appointment } from "@/lib/healthhub-store";

function modeLabel(mode: string) {
  if (mode === "online") {
    return "Online";
  }

  if (mode === "in_person") {
    return "Presencial";
  }

  return "Híbrido";
}

function dateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", weekday: "long", year: "numeric" }).format(parsed);
}

type Props = {
  appointment: Appointment;
  appointmentActionId: string;
  onPay: (appointment: Appointment) => void;
};

function canPayOnline(appointment: Appointment) {
  const paymentStatus = (appointment as { paymentStatus?: string | null }).paymentStatus ?? "none";
  return appointment.status === "scheduled" && Boolean(appointment.professionalServiceId) && (paymentStatus === "none" || paymentStatus === "rejected");
}

export function NextAppointmentHero({ appointment, appointmentActionId, onPay }: Props) {
  const citaUi = citaStatusUiFor(appointment.status);
  const pagoUi = pagoStatusUiFor(appointment);

  return (
    <Panel
      action={
        <a className="inline-flex items-center -m-2 p-2 text-xs font-medium text-primary hover:underline" href="#mis-citas">
          Ver todas mis citas
        </a>
      }
      title="Tu próxima cita"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{appointment.professionalName || "Profesional por asignar"}</p>
            <StatusPill label={citaUi.label} status={citaUi.pill} />
            <StatusPill label={pagoUi.label} status={pagoUi.pill} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{appointment.specialtyLabel ?? appointment.type}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <CalendarDays aria-hidden="true" className="text-slate-400" size={15} />
              {dateLabel(appointment.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock aria-hidden="true" className="text-slate-400" size={15} />
              {appointment.time} h
            </span>
            <span className="flex items-center gap-1">
              <Monitor aria-hidden="true" className="text-slate-400" size={15} />
              {modeLabel(appointment.mode)}
            </span>
          </div>
        </div>
        {canPayOnline(appointment) ? (
          <button
            className="flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={appointmentActionId === appointment.id}
            onClick={() => onPay(appointment)}
            type="button"
          >
            <WalletCards size={16} />
            {appointmentActionId === appointment.id ? "Procesando..." : "Pagar y confirmar"}
          </button>
        ) : null}
      </div>
      {appointment.status === "scheduled" ? (
        <p className="border-t border-border px-4 py-3 text-xs leading-5 text-slate-500">
          Tu solicitud está pendiente de confirmación por el profesional. Si pagas en línea, tu cita se confirma al instante.
        </p>
      ) : null}
    </Panel>
  );
}
