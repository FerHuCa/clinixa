"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquare,
  UserRound,
  Wallet
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OnboardingChecklist, buildChecklistSteps } from "@/components/onboarding-checklist";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { UserMenu } from "@/components/user-menu";
import { citaStatusUiFor, pagoStatusUiFor } from "@/lib/appointment-states";
import {
  useHealthHubStore,
  type Appointment,
  type ProfessionalDashboard,
  type ProfessionalMarketplaceStatus,
  type ProfessionalOnboarding,
  type ProfessionalPayments
} from "@/lib/healthhub-store";

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Semana calendario (lunes a domingo) que contiene la fecha dada.
function weekRange(reference: Date) {
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - ((reference.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { end: toIsoDate(sunday), start: toIsoDate(monday) };
}

function modeLabel(mode: string) {
  if (mode === "online") {
    return "En línea";
  }

  if (mode === "in_person") {
    return "Presencial";
  }

  return "Híbrida";
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

// Una cita admite cobro en efectivo si sigue activa y aún no tiene pago aprobado.
function canRegisterCash(appointment: Appointment) {
  return (
    (appointment.status === "scheduled" || appointment.status === "confirmed" || appointment.status === "completed") &&
    appointment.paymentStatus !== "approved"
  );
}

type CashMessage = { kind: "success" | "error"; text: string };

type CashPaymentControlProps = {
  amount: number | null;
  busy: boolean;
  confirming: boolean;
  message: CashMessage | undefined;
  onCancel: () => void;
  onConfirm: () => void;
  onStart: () => void;
};

// Botón de cobro en efectivo con confirmación inline. El resultado (éxito o error)
// se muestra junto al botón, no arriba de la página.
function CashPaymentControl({ amount, busy, confirming, message, onCancel, onConfirm, onStart }: CashPaymentControlProps) {
  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">
            {amount !== null ? `¿Recibiste ${money(amount)} en efectivo por esta cita?` : "¿Recibiste el pago en efectivo de esta cita?"}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              disabled={busy}
              onClick={onConfirm}
              type="button"
            >
              {busy ? "Registrando..." : "Sí, registrar pago"}
            </button>
            <button
              className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50"
              disabled={busy}
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
          disabled={busy}
          onClick={onStart}
          type="button"
        >
          <Banknote size={14} className="text-emerald-600" />
          Registrar pago en efectivo
        </button>
      )}
      {message ? (
        <p className={message.kind === "success" ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-rose-700"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    appointments,
    cancelAppointment,
    currentUser,
    loadMarketplaceStatus,
    loadProfessionalDashboard,
    loadProfessionalOnboarding,
    loadProfessionalPayments,
    publishProfessional,
    ready,
    registerCashPayment,
    sessionError,
    updateAppointmentStatus
  } = useHealthHubStore();
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null);
  const [onboarding, setOnboarding] = useState<ProfessionalOnboarding | null>(null);
  const [marketplace, setMarketplace] = useState<ProfessionalMarketplaceStatus | null>(null);
  const [payments, setPayments] = useState<ProfessionalPayments | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [actionId, setActionId] = useState("");
  const [actionMessage, setActionMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [cashConfirmId, setCashConfirmId] = useState("");
  const [cashBusyId, setCashBusyId] = useState("");
  const [cashMessages, setCashMessages] = useState<Record<string, CashMessage>>({});

  const isProfessional = currentUser.primaryRole === "professional";
  const canViewDashboard = isProfessional || currentUser.primaryRole === "internal_admin";

  useEffect(() => {
    // No redirigir hasta que la identidad esté resuelta: evita redirigir con el
    // rol seed/stale. Con error de sesión tampoco se redirige (se muestra aviso).
    if (!ready || sessionError) {
      return;
    }

    if (currentUser.primaryRole === "patient") {
      router.replace("/portal-paciente");
    } else if (currentUser.primaryRole === "clinic_admin") {
      router.replace("/seguridad");
    }
  }, [currentUser.primaryRole, ready, sessionError, router]);

  useEffect(() => {
    let cancelled = false;

    if (!ready || !isProfessional) {
      if (ready) {
        setLoadingData(false);
      }

      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      loadProfessionalDashboard(),
      loadProfessionalOnboarding(),
      // El estado de Mercado Pago no debe tirar el home: si falla, el paso
      // del checklist simplemente se muestra como pendiente.
      loadMarketplaceStatus().catch(() => null),
      // Lo mismo para los ingresos del mes: si falla, la tarjeta lo dice sin romper nada.
      loadProfessionalPayments()
    ])
      .then(([nextDashboard, nextOnboarding, nextMarketplace, nextPayments]) => {
        if (cancelled) {
          return;
        }

        setDashboard(nextDashboard);
        setOnboarding(nextOnboarding);
        setMarketplace(nextMarketplace);
        setPayments(nextPayments);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingData(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, isProfessional, loadMarketplaceStatus, loadProfessionalDashboard, loadProfessionalOnboarding, loadProfessionalPayments, ready]);

  const todayIso = toIsoDate(new Date());
  const week = weekRange(new Date());

  const professionalAppointments = useMemo(() => {
    const source =
      dashboard?.appointments ??
      (currentUser.professionalId
        ? appointments.filter((appointment) => appointment.professionalId === currentUser.professionalId)
        : appointments);

    return source.slice().sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
  }, [appointments, currentUser.professionalId, dashboard]);

  const todaysAppointments = professionalAppointments.filter(
    (appointment) => appointment.date === todayIso && appointment.status !== "cancelled"
  );
  // Además de las solicitudes "scheduled", se conservan visibles las que acaban de
  // confirmarse con un cobro en efectivo: así el mensaje de resultado queda junto
  // al botón que lo originó en lugar de desaparecer con la fila.
  const pendingRequests = professionalAppointments.filter(
    (appointment) =>
      appointment.date >= todayIso &&
      (appointment.status === "scheduled" || (appointment.status === "confirmed" && cashMessages[appointment.id]?.kind === "success"))
  );
  const weekCount = professionalAppointments.filter(
    (appointment) => appointment.date >= week.start && appointment.date <= week.end && appointment.status !== "cancelled"
  ).length;
  const completedCount =
    dashboard?.completedCount ?? professionalAppointments.filter((appointment) => appointment.status === "completed").length;
  const patientCount =
    dashboard?.patientCount ?? new Set(professionalAppointments.map((appointment) => appointment.patientId).filter(Boolean)).size;

  const checklistSteps = onboarding
    ? buildChecklistSteps(
        onboarding,
        dashboard?.professional?.verificationStatus,
        marketplace !== null && marketplace.status !== "not_connected"
      )
    : [];
  const completedSteps = checklistSteps.filter((step) => step.done).length;

  // Precio del servicio asociado a la cita, si lo conocemos: se usa solo para que
  // la confirmación del cobro en efectivo muestre el monto exacto.
  function servicePriceFor(appointment: Appointment) {
    const service = dashboard?.professional?.services?.find((item) => item.id === appointment.professionalServiceId);

    return service && service.price > 0 ? service.price : null;
  }

  async function registerCash(appointmentId: string) {
    setCashBusyId(appointmentId);
    setCashMessages((current) => {
      const next = { ...current };
      delete next[appointmentId];
      return next;
    });

    try {
      const result = await registerCashPayment(appointmentId);
      setDashboard((current) =>
        current
          ? {
              ...current,
              appointments: current.appointments.map((appointment) =>
                appointment.id === result.appointment.id ? result.appointment : appointment
              )
            }
          : current
      );
      setCashMessages((current) => ({
        ...current,
        [appointmentId]: { kind: "success", text: `Pago en efectivo registrado: ${money(result.amount)}.` }
      }));
      // Refresca la tarjeta "Ingresos del mes" con el cobro recién registrado.
      // Si el refresco falla se conserva el resumen anterior (el cobro ya quedó registrado).
      const nextPayments = await loadProfessionalPayments();

      if (nextPayments) {
        setPayments(nextPayments);
      }
    } catch (error) {
      setCashMessages((current) => ({
        ...current,
        [appointmentId]: {
          kind: "error",
          text: error instanceof Error && error.message ? error.message : "No se pudo registrar el pago. Inténtalo de nuevo."
        }
      }));
    } finally {
      setCashBusyId("");
      setCashConfirmId("");
    }
  }

  async function confirmRequest(appointmentId: string) {
    setActionId(appointmentId);
    setActionMessage(null);

    try {
      const updated = await updateAppointmentStatus(appointmentId, "confirmed", "Confirmada por el profesional desde Inicio.");
      setDashboard((current) =>
        current
          ? {
              ...current,
              appointments: current.appointments.map((appointment) => (appointment.id === updated.id ? updated : appointment))
            }
          : current
      );
      setActionMessage({ kind: "success", text: "Cita confirmada. El paciente recibirá el aviso." });
    } catch {
      setActionMessage({ kind: "error", text: "No se pudo confirmar la cita. Inténtalo de nuevo." });
    } finally {
      setActionId("");
    }
  }

  async function rejectRequest(appointmentId: string) {
    setActionId(appointmentId);
    setActionMessage(null);

    try {
      const updated = await cancelAppointment(appointmentId, "Rechazada por el profesional.");
      setDashboard((current) =>
        current
          ? {
              ...current,
              appointments: current.appointments.map((appointment) => (appointment.id === updated.id ? updated : appointment))
            }
          : current
      );
      setActionMessage({ kind: "success", text: "Solicitud rechazada. El paciente recibirá el aviso." });
    } catch {
      setActionMessage({ kind: "error", text: "No se pudo rechazar la solicitud. Inténtalo de nuevo." });
    } finally {
      setActionId("");
    }
  }

  async function publish() {
    setPublishing(true);
    setActionMessage(null);

    try {
      const updated = await publishProfessional();
      setDashboard((current) => (current ? { ...current, professional: { ...current.professional, ...updated } } : current));
      const nextOnboarding = await loadProfessionalOnboarding();

      if (nextOnboarding) {
        setOnboarding(nextOnboarding);
      }

      setActionMessage({ kind: "success", text: "Perfil publicado. Ya eres visible para pacientes." });
    } catch (error) {
      setActionMessage({
        kind: "error",
        text: error instanceof Error && error.message ? error.message : "Aún faltan pasos para publicar tu perfil."
      });
    } finally {
      setPublishing(false);
    }
  }

  // Error de sesión: no inventamos un inicio; enlazamos a /sesion.
  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-6 py-5 text-center text-sm text-amber-800">
          <p>No pudimos validar tu sesión.</p>
          <Link className="mt-2 inline-block font-medium underline underline-offset-2" href="/sesion">
            Inicia sesión de nuevo
          </Link>
        </div>
      </div>
    );
  }

  if (!canViewDashboard) {
    return null;
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Tu día de un vistazo: citas de hoy, solicitudes por confirmar y el avance de tu perfil."
        title="Inicio"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {loadingData ? (
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-500">Cargando tu información...</div>
        ) : null}

        {actionMessage ? (
          <div
            className={
              actionMessage.kind === "success"
                ? "rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
                : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {actionMessage.text}
          </div>
        ) : null}

        {onboarding && !onboarding.isPublished ? (
          <OnboardingChecklist
            canPublish={onboarding.canPublish}
            completedSteps={completedSteps}
            missing={onboarding.missing}
            onPublish={publish}
            publishing={publishing}
            steps={checklistSteps}
          />
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="space-y-5">
            <Panel title="Hoy">
              <div className="divide-y divide-border">
                {todaysAppointments.length > 0 ? (
                  todaysAppointments.map((appointment) => {
                    const citaUi = citaStatusUiFor(appointment.status);
                    const pagoUi = pagoStatusUiFor(appointment);
                    const showCash = canRegisterCash(appointment);
                    const cashMessage = cashMessages[appointment.id];

                    return (
                      <div className="grid gap-3 px-4 py-4 md:grid-cols-[90px_1fr_auto]" key={appointment.id}>
                        <p className="flex items-center gap-1 text-sm font-semibold">
                          <Clock size={14} className="text-primary" />
                          {appointment.time}
                        </p>
                        <div className="min-w-0">
                          <p className="font-medium">{appointment.patientName}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {appointment.type} · {modeLabel(appointment.mode)}
                          </p>
                          {showCash || cashMessage ? (
                            <div className="mt-3">
                              {showCash ? (
                                <CashPaymentControl
                                  amount={servicePriceFor(appointment)}
                                  busy={cashBusyId === appointment.id}
                                  confirming={cashConfirmId === appointment.id}
                                  message={cashMessage}
                                  onCancel={() => setCashConfirmId("")}
                                  onConfirm={() => registerCash(appointment.id)}
                                  onStart={() => setCashConfirmId(appointment.id)}
                                />
                              ) : (
                                <p className="text-xs font-medium text-emerald-700">{cashMessage?.text}</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-start gap-2">
                          <StatusPill label={citaUi.label} status={citaUi.pill} />
                          <StatusPill label={pagoUi.label} status={pagoUi.pill} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">No tienes citas programadas para hoy.</div>
                )}
              </div>
            </Panel>

            <Panel title="Solicitudes por confirmar">
              <div className="divide-y divide-border">
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((appointment) => {
                    const citaUi = citaStatusUiFor(appointment.status);
                    const pagoUi = pagoStatusUiFor(appointment);
                    const showCash = canRegisterCash(appointment);
                    const cashMessage = cashMessages[appointment.id];

                    return (
                      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between" key={appointment.id}>
                        <div className="min-w-0">
                          <p className="font-medium">{appointment.patientName}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {appointment.type} · {appointment.date} {appointment.time} · {modeLabel(appointment.mode)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusPill label={citaUi.label} status={citaUi.pill} />
                            <StatusPill label={pagoUi.label} status={pagoUi.pill} />
                          </div>
                          {showCash || cashMessage ? (
                            <div className="mt-3">
                              {showCash ? (
                                <CashPaymentControl
                                  amount={servicePriceFor(appointment)}
                                  busy={cashBusyId === appointment.id}
                                  confirming={cashConfirmId === appointment.id}
                                  message={cashMessage}
                                  onCancel={() => setCashConfirmId("")}
                                  onConfirm={() => registerCash(appointment.id)}
                                  onStart={() => setCashConfirmId(appointment.id)}
                                />
                              ) : (
                                <p className="text-xs font-medium text-emerald-700">{cashMessage?.text}</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                        {appointment.status === "scheduled" ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                              disabled={actionId === appointment.id}
                              onClick={() => confirmRequest(appointment.id)}
                              type="button"
                            >
                              Confirmar
                            </button>
                            <button
                              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-50"
                              disabled={actionId === appointment.id}
                              onClick={() => rejectRequest(appointment.id)}
                              type="button"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">No tienes solicitudes pendientes. Las nuevas aparecerán aquí.</div>
                )}
              </div>
            </Panel>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard detail="De lunes a domingo" icon={CalendarDays} label="Citas de esta semana" value={`${weekCount}`} />
              <StatCard detail="Con al menos una cita contigo" icon={UserRound} label="Pacientes activos" value={`${patientCount}`} />
              <StatCard detail="Consultas ya realizadas" icon={CheckCircle2} label="Citas completadas" value={`${completedCount}`} />
              <Link
                className="block rounded-md border border-border bg-white p-4 transition hover:border-teal-300"
                href="/portal-profesional#cobros"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Ingresos del mes (neto)</p>
                  <Wallet size={18} className="text-primary" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{payments ? money(payments.summary.netTotal) : "—"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {payments
                    ? `Efectivo ${money(payments.summary.cashTotal)} · En línea ${money(payments.summary.onlineTotal)} · Ver cobros →`
                    : "Consulta el detalle en Configuración → Cobros"}
                </p>
              </Link>
            </div>
          </section>

          <aside className="space-y-5">
            <Panel>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList size={18} className="text-accent" />
                  <h2 className="text-sm font-semibold">Documentación clínica</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Registra y revisa notas SOAP dentro del expediente de cada paciente.
                </p>
                <Link
                  className="mt-4 flex w-full justify-center rounded-md border border-border px-3 py-2 text-sm font-medium"
                  href="/expediente"
                >
                  Crear nota SOAP
                </Link>
              </div>
            </Panel>

            {/* El chat interno se eliminó del producto (2026-06-09): la comunicación
                paciente-profesional ocurre por el WhatsApp del profesional. */}
            <Panel title="Comunicación con pacientes">
              <div className="p-4">
                <div className="flex items-start gap-3 rounded-md bg-slate-50 p-3">
                  <MessageSquare size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">WhatsApp directo</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tus pacientes te contactan por el WhatsApp que registraste en Configuración. Esa conversación ocurre
                      fuera de Clinixa y no se integra automáticamente al expediente clínico: registra en la plataforma
                      la información clínicamente relevante.
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
