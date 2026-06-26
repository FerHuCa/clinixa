"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { useHealthHubStore, type ProfessionalMarketplaceStatus } from "@/lib/healthhub-store";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

// Ejemplo concreto de comisión: ayuda a entender cuánto llega realmente a la cuenta.
function commissionExample(commissionPercentage: number) {
  const examplePrice = 800;
  const net = examplePrice * (1 - commissionPercentage / 100);

  return `Por ejemplo: de una consulta de ${money(examplePrice)} recibes ${money(net)} (comisión del ${commissionPercentage}%).`;
}

export function MarketplacePanel() {
  const { connectMarketplace, loadMarketplaceStatus, ready } = useHealthHubStore();
  const [status, setStatus] = useState<ProfessionalMarketplaceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!ready) {
      return () => {
        cancelled = true;
      };
    }

    loadMarketplaceStatus()
      .then((next) => {
        if (cancelled) {
          return;
        }

        setStatus(next);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadMarketplaceStatus, ready]);

  async function connect() {
    setConnecting(true);
    setConnectError("");

    try {
      const connectResult = await connectMarketplace();
      // Redirige al navegador a Mercado Pago para autorizar (en modo simulado vuelve directo al callback).
      window.location.href = connectResult.authorizationUrl;
    } catch {
      setConnectError("No pudimos iniciar la conexión con Mercado Pago. Inténtalo de nuevo.");
      setConnecting(false);
    }
  }

  return (
    <Panel title="Cobros con Mercado Pago">
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="font-semibold">Pagos directos a tu cuenta</p>
            <p className="mt-1 text-sm text-slate-500">Recibe los pagos de tus pacientes en tu propia cuenta de Mercado Pago.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Cargando estado de cobros...
          </div>
        ) : loadError || !status ? (
          <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-500">
            No pudimos cargar el estado de cobros en este momento.
          </div>
        ) : status.status === "verified" ? (
          <div className="space-y-3">
            <StatusPill label="Cuenta activa" status="active" />
            {status.email ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Cuenta</dt>
                  <dd className="font-medium">{status.email}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Comisión de plataforma</dt>
                  <dd className="font-medium">{status.commissionPercentage}%</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-600">Comisión de plataforma: {status.commissionPercentage}%</p>
            )}
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              {commissionExample(status.commissionPercentage)}
            </p>
            <p className="flex items-start gap-2 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              Los pagos de tus pacientes llegan directo a tu cuenta de Mercado Pago.
            </p>
          </div>
        ) : status.status === "pending" ? (
          <div className="space-y-3">
            <StatusPill label="Verificación en proceso" status="pending" />
            {status.email ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Cuenta</dt>
                  <dd className="font-medium">{status.email}</dd>
                </div>
              </dl>
            ) : null}
            <p className="text-sm text-slate-600">Tu cuenta está en revisión por el equipo de Clinixa.</p>
          </div>
        ) : status.status === "rejected" ? (
          <div className="space-y-3">
            <StatusPill label="Conexión rechazada" status="cancelled" />
            <p className="text-sm text-slate-600">Tu cuenta no pudo verificarse. Vuelve a conectar tu cuenta de Mercado Pago.</p>
            {connectError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{connectError}</p> : null}
            <button
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={connecting}
              onClick={connect}
              type="button"
            >
              <CreditCard size={16} />
              {connecting ? "Conectando..." : "Conectar de nuevo"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Conecta tu cuenta de Mercado Pago para recibir pagos de tus pacientes directamente.
            </p>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              {commissionExample(status.commissionPercentage)}
            </p>
            {connectError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{connectError}</p> : null}
            <button
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={connecting}
              onClick={connect}
              type="button"
            >
              <CreditCard size={16} />
              {connecting ? "Conectando..." : "Conectar Mercado Pago"}
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}
