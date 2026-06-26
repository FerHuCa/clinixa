"use client";

import { Banknote } from "lucide-react";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { pagoStatusUiFor } from "@/lib/appointment-states";
import type { ProfessionalPayments } from "@/lib/healthhub-store";

// Para el estado de cuenta no se redondea: las comisiones pueden traer centavos.
function moneyExact(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) {
    return month;
  }

  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
}

// Método de cobro como badge: efectivo registrado a mano vs. pago en línea (Mercado Pago).
function paymentMethodUi(provider: string): { label: string; status: "paused" | "scheduled" } {
  return provider === "cash" ? { label: "Efectivo", status: "paused" } : { label: "En línea", status: "scheduled" };
}

type Props = {
  payments: ProfessionalPayments | null;
  paymentsLoading: boolean;
  paymentsMonth: string;
  currentMonth: string;
  previousMonth: string;
  onSetPaymentsMonth: (month: string) => void;
};

export function PaymentsSection({
  currentMonth,
  onSetPaymentsMonth,
  payments,
  paymentsLoading,
  paymentsMonth,
  previousMonth,
}: Props) {
  return (
    <div id="cobros">
      <Panel
        action={
          <div className="flex items-center gap-2">
            <button
              className={
                paymentsMonth === currentMonth
                  ? "rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-teal-200"
                  : "rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
              }
              onClick={() => onSetPaymentsMonth(currentMonth)}
              type="button"
            >
              Mes actual
            </button>
            <button
              className={
                paymentsMonth === previousMonth
                  ? "rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-teal-200"
                  : "rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
              }
              onClick={() => onSetPaymentsMonth(previousMonth)}
              type="button"
            >
              Mes anterior
            </button>
          </div>
        }
        title="Cobros"
      >
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <Banknote size={18} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-slate-600">
              Estado de cuenta de <span className="font-medium capitalize">{monthLabel(paymentsMonth)}</span>: pagos en línea
              (Mercado Pago) y cobros en efectivo que registraste. Los totales solo consideran pagos aprobados.
            </p>
          </div>

          {paymentsLoading ? (
            <div className="rounded-md border border-border bg-white px-3 py-2 text-sm text-slate-500">Cargando tus cobros...</div>
          ) : !payments ? (
            <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No pudimos cargar tus cobros en este momento. Inténtalo de nuevo más tarde.
            </div>
          ) : (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-md border border-border bg-white p-3">
                  <dt className="text-xs text-slate-500">Ingreso bruto</dt>
                  <dd className="mt-1 text-lg font-semibold">{moneyExact(payments.summary.grossTotal)}</dd>
                </div>
                <div className="rounded-md border border-border bg-white p-3">
                  <dt className="text-xs text-slate-500">Comisión de plataforma</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-600">−{moneyExact(payments.summary.commissionTotal)}</dd>
                </div>
                <div className="rounded-md border border-teal-200 bg-teal-50 p-3">
                  <dt className="text-xs text-teal-700">Neto para ti</dt>
                  <dd className="mt-1 text-lg font-semibold text-teal-800">{moneyExact(payments.summary.netTotal)}</dd>
                </div>
                <div className="rounded-md border border-border bg-white p-3">
                  <dt className="text-xs text-slate-500">En efectivo (neto)</dt>
                  <dd className="mt-1 text-lg font-semibold">{moneyExact(payments.summary.cashTotal)}</dd>
                </div>
                <div className="rounded-md border border-border bg-white p-3">
                  <dt className="text-xs text-slate-500">En línea (neto)</dt>
                  <dd className="mt-1 text-lg font-semibold">{moneyExact(payments.summary.onlineTotal)}</dd>
                </div>
              </dl>

              {payments.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-slate-400">
                        <th className="px-2 py-2 font-medium">Fecha</th>
                        <th className="px-2 py-2 font-medium">Paciente</th>
                        <th className="px-2 py-2 font-medium">Servicio</th>
                        <th className="px-2 py-2 text-right font-medium">Bruto</th>
                        <th className="px-2 py-2 text-right font-medium">Comisión</th>
                        <th className="px-2 py-2 text-right font-medium">Neto</th>
                        <th className="px-2 py-2 font-medium">Método</th>
                        <th className="px-2 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.items.map((item) => {
                        const methodUi = paymentMethodUi(item.provider);
                        const estadoUi = pagoStatusUiFor({ paymentStatus: item.status });

                        return (
                          <tr key={item.paymentId}>
                            <td className="whitespace-nowrap px-2 py-2.5">{item.appointmentDate || item.createdAt.slice(0, 10)}</td>
                            <td className="px-2 py-2.5 font-medium">{item.patientName}</td>
                            <td className="px-2 py-2.5 text-slate-600">{item.serviceName}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-right">{moneyExact(item.grossAmount)}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-500">
                              {item.commissionAmount > 0 ? `−${moneyExact(item.commissionAmount)}` : moneyExact(0)}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-right font-medium">{moneyExact(item.netAmount)}</td>
                            <td className="px-2 py-2.5">
                              <StatusPill label={methodUi.label} status={methodUi.status} />
                            </td>
                            <td className="px-2 py-2.5">
                              <StatusPill label={estadoUi.label} status={estadoUi.pill} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-border bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  Sin cobros registrados en {monthLabel(paymentsMonth)}. Los pagos en línea y los cobros en efectivo que
                  registres aparecerán aquí.
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
