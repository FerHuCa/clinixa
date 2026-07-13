"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getAuthHeaders } from "@/lib/auth-client";
import { useHealthHubStore } from "@/lib/healthhub-store";

type CallbackState = "processing" | "success" | "error";

export function MarketplaceCallbackClient() {
  const { apiBaseUrl } = useHealthHubStore();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const state = searchParams.get("state") ?? "";
  const [callbackState, setCallbackState] = useState<CallbackState>("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const requestedRef = useRef(false);

  const missingParams = !code || !state;

  useEffect(() => {
    if (missingParams || requestedRef.current) {
      return;
    }

    requestedRef.current = true;
    let cancelled = false;

    async function exchange() {
      try {
        // El callback del API es publico; el state firmado es la proteccion. Mandamos
        // los headers de sesion de todos modos (no estorban).
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${apiBaseUrl}/api/professional-marketplace/callback`, {
          body: JSON.stringify({ code, state }),
          headers: {
            ...authHeaders,
            "Content-Type": "application/json"
          },
          method: "POST"
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          let message = "";

          try {
            const payload = (await response.json()) as { error?: string };
            message = payload.error ?? "";
          } catch {
            message = "";
          }

          setErrorMessage(message || "No pudimos vincular tu cuenta de Mercado Pago.");
          setCallbackState("error");
          return;
        }

        setCallbackState("success");
      } catch {
        if (!cancelled) {
          setErrorMessage("No pudimos vincular tu cuenta de Mercado Pago.");
          setCallbackState("error");
        }
      }
    }

    void exchange();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, code, missingParams, state]);

  return (
    <AppShell>
      <PageHeader description="Vinculacion de tu cuenta de Mercado Pago." title="Cobros con Mercado Pago" />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        <Panel title="Vinculacion de cuenta">
          <div className="space-y-4 p-4">
            {missingParams ? (
              <>
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Falta informacion para completar la vinculacion. Vuelve a intentarlo desde el portal.
                </div>
                <Link
                  className="btn-secondary"
                  href="/portal-profesional"
                >
                  <ArrowLeft size={16} />
                  Volver al portal
                </Link>
              </>
            ) : callbackState === "processing" ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Vinculando tu cuenta de Mercado Pago...
              </div>
            ) : callbackState === "success" ? (
              <>
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  Cuenta vinculada. Tu cuenta quedara activa cuando el equipo la verifique.
                </div>
                <Link
                  className="btn-primary"
                  href="/portal-profesional"
                >
                  <ArrowLeft size={16} />
                  Volver al portal
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {errorMessage}
                </div>
                <Link
                  className="btn-secondary"
                  href="/portal-profesional"
                >
                  <ArrowLeft size={16} />
                  Volver al portal
                </Link>
              </>
            )}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
