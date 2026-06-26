"use client";

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

function canPayOnline(appointment: Appointment) {
  const paymentStatus = (appointment as { paymentStatus?: string | null }).paymentStatus ?? "none";
  return appointment.status === "scheduled" && Boolean(appointment.professionalServiceId) && (paymentStatus === "none" || paymentStatus === "rejected");
}

type Props = {
  appointmentActionId: string;
  upcomingAppointments: Appointment[];
  onCancel: (appointment: Appointment) => void;
  onPay: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
};

export function SidebarMyAppointments({ appointmentActionId, upcomingAppointments, onCancel, onPay, onReschedule }: Props) {
  return (
    <div className="scroll-mt-24" id="mis-citas">
      <Panel title="Mis citas">
        <div className="divide-y divide-border">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => {
              const citaUi = citaStatusUiFor(appointment.status);
              const pagoUi = pagoStatusUiFor(appointment);

              return (
                <div className="px-4 py-4" key={appointment.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{appointment.professionalName || "Profesional por asignar"}</p>
                      <p className="mt-1 text-xs text-slate-500">{appointment.specialtyLabel ?? appointment.type}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill label={citaUi.label} status={citaUi.pill} />
                      <StatusPill label={pagoUi.label} status={pagoUi.pill} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>{appointment.date}</span>
                    <span>{appointment.time}</span>
                    <span>{modeLabel(appointment.mode)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canPayOnline(appointment) ? (
                      <button
                        className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        disabled={appointmentActionId === appointment.id}
                        onClick={() => onPay(appointment)}
                        type="button"
                      >
                        {appointmentActionId === appointment.id ? "Procesando..." : "Pagar y confirmar"}
                      </button>
                    ) : null}
                    <button
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
                      disabled={appointmentActionId === appointment.id}
                      onClick={() => onReschedule(appointment)}
                      type="button"
                    >
                      {appointmentActionId === appointment.id ? "Procesando..." : "Reprogramar"}
                    </button>
                    <button
                      className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-60"
                      disabled={appointmentActionId === appointment.id}
                      onClick={() => onCancel(appointment)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="px-4 py-4 text-sm text-slate-500">Aún no tienes citas. Busca un profesional y envía tu primera solicitud.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
