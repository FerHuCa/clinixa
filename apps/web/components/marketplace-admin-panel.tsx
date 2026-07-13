"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { useHealthHubStore, type MarketplacePendingItem } from "@/lib/healthhub-store";

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function verificationStatusLabel(status: string) {
  if (status === "verified") {
    return "Cédula verificada";
  }

  if (status === "rejected") {
    return "Cédula rechazada";
  }

  return "Cédula pendiente";
}

export function MarketplaceAdminPanel() {
  const { loadMarketplacePending, verifyMarketplaceProfessional, ready } = useHealthHubStore();
  const [pending, setPending] = useState<MarketplacePendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!ready) {
      return () => {
        cancelled = true;
      };
    }

    loadMarketplacePending()
      .then((next) => {
        if (!cancelled) {
          setPending(next);
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
  }, [loadMarketplacePending, ready]);

  async function applyVerification(item: MarketplacePendingItem, status: "verified" | "rejected") {
    setActingId(item.id);
    setFeedback(null);

    try {
      await verifyMarketplaceProfessional(item.id, status);
      // Tras la accion el profesional sale de la lista de pendientes; refrescamos para reflejarlo.
      const next = await loadMarketplacePending();
      setPending(next);
      setFeedback({
        kind: "success",
        text: status === "verified" ? `Cuenta de ${item.displayName} verificada.` : `Cuenta de ${item.displayName} rechazada.`
      });
    } catch {
      setFeedback({ kind: "error", text: "No pudimos actualizar la cuenta. Inténtalo de nuevo." });
    } finally {
      setActingId("");
    }
  }

  return (
    <Panel title="Marketplace Mercado Pago">
      <div className="divide-y divide-border">
        {feedback ? (
          <div
            className={
              feedback.kind === "success"
                ? "m-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                : "m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            }
          >
            {feedback.text}
          </div>
        ) : null}

        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Cargando cuentas pendientes...</div>
        ) : pending.length > 0 ? (
          pending.map((item) => (
            <div className="space-y-3 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.displayName}</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{item.email || "Sin correo"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Conexión: {formatDate(item.connectedAt)}</p>
                </div>
                <StatusPill
                  label={verificationStatusLabel(item.verificationStatus)}
                  status={item.verificationStatus === "verified" ? "active" : item.verificationStatus === "rejected" ? "cancelled" : "pending"}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
                  disabled={actingId === item.id}
                  onClick={() => applyVerification(item, "verified")}
                  type="button"
                >
                  <BadgeCheck size={13} />
                  {actingId === item.id ? "Guardando..." : "Verificar"}
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-50"
                  disabled={actingId === item.id}
                  onClick={() => applyVerification(item, "rejected")}
                  type="button"
                >
                  <X size={13} />
                  Rechazar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No hay cuentas pendientes de verificación.</div>
        )}
      </div>
    </Panel>
  );
}
