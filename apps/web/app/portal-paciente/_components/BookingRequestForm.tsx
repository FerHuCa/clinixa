"use client";

import { CheckCircle2 } from "lucide-react";
import { Panel } from "@/components/panel";
import type { AvailableSlot, Patient, Professional, ProfessionalService } from "@/lib/healthhub-store";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

type Props = {
  bookingMode: "online" | "in_person";
  bookingReason: string;
  bookingSaving: boolean;
  bookingServiceId: string;
  bookingSlotId: string;
  bookingSlots: AvailableSlot[];
  currentPatient: Patient | undefined;
  professional: Professional;
  selectedService: ProfessionalService | undefined;
  slotsLoading: boolean;
  onCancel: () => void;
  onModeChange: (mode: "online" | "in_person") => void;
  onReasonChange: (reason: string) => void;
  onServiceChange: (serviceId: string) => void;
  onSlotChange: (slotId: string) => void;
  onSubmit: () => void;
};

export function BookingRequestForm({
  bookingMode,
  bookingReason,
  bookingSaving,
  bookingServiceId,
  bookingSlotId,
  bookingSlots,
  currentPatient,
  professional,
  selectedService,
  slotsLoading,
  onCancel,
  onModeChange,
  onReasonChange,
  onServiceChange,
  onSlotChange,
  onSubmit
}: Props) {
  return (
    <div className="scroll-mt-32" id="solicitar-cita">
      <Panel title="Solicitar cita">
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold">{professional.displayName}</p>
            <p className="mt-1 text-sm text-slate-500">
              {professional.specialtyLabel} · {professional.location}
            </p>
            <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
              El profesional confirmará tu solicitud. Si pagas en línea, tu cita se confirma al instante.
            </p>
          </div>

          <label className="block">
            <span className="text-xs font-medium uppercase text-slate-600">Servicio</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
              onChange={(event) => onServiceChange(event.target.value)}
              value={bookingServiceId}
            >
              {professional.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} min · {money(service.price)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase text-slate-600">{slotsLoading ? "Cargando horarios" : "Horario disponible"}</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
              disabled={slotsLoading || bookingSlots.length === 0}
              onChange={(event) => onSlotChange(event.target.value)}
              value={bookingSlotId}
            >
              {bookingSlots.length > 0 ? (
                bookingSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label} · {slot.date}
                  </option>
                ))
              ) : (
                <option value="">Sin horarios disponibles</option>
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase text-slate-600">Modalidad</span>
            <select
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
              disabled={selectedService?.mode !== "hybrid"}
              onChange={(event) => onModeChange(event.target.value as "online" | "in_person")}
              value={bookingMode}
            >
              <option value="online">Online</option>
              <option value="in_person">Presencial</option>
            </select>
          </label>

          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase text-slate-600">Motivo</span>
            <textarea
              className="mt-1 min-h-20 w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
              onChange={(event) => onReasonChange(event.target.value)}
              value={bookingReason}
            />
          </label>

          <div className="flex flex-col gap-2 lg:col-span-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-md border border-border px-3 py-2 text-sm font-medium"
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={bookingSaving || !currentPatient || !selectedService || bookingSlots.length === 0}
              onClick={onSubmit}
              type="button"
            >
              <CheckCircle2 size={16} />
              {bookingSaving ? "Enviando solicitud..." : "Solicitar cita"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
