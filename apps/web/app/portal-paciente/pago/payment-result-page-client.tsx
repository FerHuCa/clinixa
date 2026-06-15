"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";

const resultContent = {
  approved: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    title: "Pago aprobado",
    description: "Tu pago fue recibido. Tu cita quedará confirmada en cuanto Mercado Pago nos notifique (normalmente unos segundos)."
  },
  pending: {
    icon: Clock3,
    iconClass: "text-amber-600",
    title: "Pago pendiente",
    description: "Tu pago está en proceso. Si pagaste con OXXO o SPEI puede tardar en acreditarse; te avisaremos cuando tu cita quede confirmada."
  },
  rejected: {
    icon: XCircle,
    iconClass: "text-rose-600",
    title: "Pago rechazado",
    description: "El pago no pudo procesarse. Puedes intentarlo de nuevo desde tus citas con otro método de pago."
  }
} as const;

type ResultStatus = keyof typeof resultContent;

export function PaymentResultPageClient() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") ?? "pending";
  const simulated = searchParams.get("simulated") === "1";
  const status: ResultStatus = statusParam in resultContent ? (statusParam as ResultStatus) : "pending";
  const content = resultContent[status];
  const Icon = content.icon;

  return (
    <AppShell>
      <PageHeader description="Resultado del pago de tu cita." title="Pago de cita" />

      <div className="px-5 py-6 lg:px-8">
        <Panel title="Estado del pago">
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <Icon className={content.iconClass} size={44} />
            <p className="text-lg font-semibold">{content.title}</p>
            <p className="max-w-md text-sm leading-6 text-slate-600">{content.description}</p>

            {simulated ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Modo simulado: no hay credenciales de Mercado Pago configuradas, por lo que no se procesó un pago real.
              </p>
            ) : null}

            <Link
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
              href="/portal-paciente"
            >
              Volver a mi portal
            </Link>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
