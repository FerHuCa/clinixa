"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type SubscriptionStatus } from "@/lib/healthhub-store";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    currency: currency || "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function longDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

export function SubscriptionPageClient() {
  const { currentUser, loadSubscription, ready, registerSubscriptionInterest, sessionError } = useHealthHubStore();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [interestError, setInterestError] = useState("");

  const isProfessional = currentUser.primaryRole === "professional";

  useEffect(() => {
    // Sin sesión profesional no hay nada que cargar: el render muestra el aviso
    // de rol sin consultar `loading`, así que no hace falta resetearlo aquí.
    if (!ready || sessionError || !isProfessional) {
      return;
    }

    let cancelled = false;

    loadSubscription()
      .then((next) => {
        if (!cancelled) {
          setSubscription(next);
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
  }, [currentUser.id, isProfessional, loadSubscription, ready, sessionError]);

  async function registerInterest() {
    setRegistering(true);
    setInterestError("");

    try {
      const next = await registerSubscriptionInterest();
      setSubscription(next);
    } catch {
      setInterestError("No pudimos registrar tu solicitud. Inténtalo de nuevo en unos minutos.");
    } finally {
      setRegistering(false);
    }
  }

  const interestRegistered = Boolean(subscription?.interestRegisteredAt);

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Tu prueba gratuita y los planes disponibles durante el piloto."
        title="Suscripción"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {!isProfessional ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Los planes de suscripción aplican a cuentas profesionales. Inicia sesión con tu cuenta profesional para ver tu plan.
          </div>
        ) : loading ? (
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-500">Cargando tu plan...</div>
        ) : !subscription ? (
          <div className="rounded-md border border-border bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No pudimos cargar la información de tu plan en este momento. Inténtalo de nuevo más tarde.
          </div>
        ) : (
          <>
            <Panel title="Tu periodo de prueba">
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <CalendarClock size={20} className="mt-0.5 shrink-0 text-primary" />
                  {subscription.status === "trial" ? (
                    <div>
                      <p className="font-semibold">
                        Prueba gratuita activa:{" "}
                        {subscription.daysLeft === 1 ? "te queda 1 día" : `te quedan ${subscription.daysLeft} días`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Comenzó el {longDate(subscription.trialStartedAt)} y termina el {longDate(subscription.trialEndsAt)}. Durante
                        el piloto puedes seguir usando la plataforma mientras activamos tu plan.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">Tu periodo de prueba terminó</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Terminó el {longDate(subscription.trialEndsAt)}. Activa tu plan para seguir usando Clinixa después del
                        piloto.
                      </p>
                    </div>
                  )}
                </div>
                <StatusPill
                  label={subscription.status === "trial" ? "Prueba activa" : "Prueba terminada"}
                  status={subscription.status === "trial" ? "active" : "pending"}
                />
              </div>
            </Panel>

            <div className="grid gap-5 md:grid-cols-2">
              {subscription.plans.map((plan) => (
                <Panel key={plan.name}>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{plan.name}</p>
                        <p className="mt-1 text-3xl font-semibold">
                          {money(plan.monthlyPrice, plan.currency)}
                          <span className="text-sm font-normal text-slate-500"> /mes</span>
                        </p>
                      </div>
                      {plan.name === "Pro" ? <Sparkles size={20} className="text-amber-500" /> : null}
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {plan.features.map((feature) => (
                        <li className="flex items-start gap-2" key={feature}>
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              ))}
            </div>

            <Panel title="Activar tu plan">
              <div className="space-y-3 p-4">
                {interestRegistered ? (
                  <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Gracias — te contactaremos para activar tu plan durante el piloto.
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Registraste tu interés el {longDate(subscription.interestRegisteredAt ?? "")}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Durante el piloto la suscripción no se cobra en línea: al registrar tu interés, nuestro equipo te contactará
                      para elegir el plan y completar la activación.
                    </p>
                    {interestError ? (
                      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{interestError}</p>
                    ) : null}
                    <button
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      disabled={registering}
                      onClick={registerInterest}
                      type="button"
                    >
                      {registering ? "Registrando..." : "Quiero activar mi plan"}
                    </button>
                  </>
                )}
              </div>
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
}
