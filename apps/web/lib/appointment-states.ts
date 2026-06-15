// Glosario canónico de estados de cita y de pago.
// Regla: la MISMA etiqueta y el MISMO color en todos los portales
// (paciente, profesional, admin). Ningún portal define sus propias etiquetas.
// Los valores `pill` corresponden a las variantes de components/status-pill.tsx.

export type CitaStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export type PagoStatus = "none" | "pending" | "approved" | "approved_cash" | "rejected" | "refunded";

type PillVariant =
  | "active"
  | "pending"
  | "paused"
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "draft"
  | "finalized";

type StatusUi = { label: string; pill: PillVariant };

export const citaStatusUi: Record<CitaStatus, StatusUi> = {
  // "scheduled" en el backend significa "solicitud sin confirmar":
  // nunca mostrarla al paciente como si la cita estuviera asegurada.
  scheduled: { label: "Por confirmar", pill: "pending" },
  confirmed: { label: "Confirmada", pill: "confirmed" },
  completed: { label: "Completada", pill: "completed" },
  cancelled: { label: "Cancelada", pill: "paused" },
  no_show: { label: "No asistió", pill: "no_show" }
};

export const pagoStatusUi: Record<PagoStatus, StatusUi> = {
  none: { label: "Sin pagar", pill: "paused" },
  pending: { label: "Pago en proceso", pill: "pending" },
  approved: { label: "Pagada", pill: "active" },
  approved_cash: { label: "Pagada en efectivo", pill: "active" },
  rejected: { label: "Pago rechazado", pill: "cancelled" },
  refunded: { label: "Reembolsada", pill: "paused" }
};

export function citaStatusUiFor(status: string | null | undefined): StatusUi {
  return citaStatusUi[(status ?? "") as CitaStatus] ?? { label: status ?? "Sin estado", pill: "paused" };
}

// La API expone paymentStatus/paymentProvider en los DTOs de cita; el tipo
// Appointment del store se deriva de los datos demo y puede no incluirlos.
// Este helper lee esos campos de forma segura sin acoplar tipos.
export function pagoStatusUiFor(appointment: unknown): StatusUi {
  const record = (appointment ?? {}) as { paymentStatus?: string | null; paymentProvider?: string | null };
  const raw = record.paymentStatus ?? "none";
  const key: PagoStatus =
    raw === "approved" && record.paymentProvider === "cash" ? "approved_cash" : (raw as PagoStatus);
  return pagoStatusUi[key] ?? pagoStatusUi.none;
}
