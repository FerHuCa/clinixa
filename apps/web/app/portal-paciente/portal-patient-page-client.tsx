"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Monitor,
  Star,
  Stethoscope,
  WalletCards
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { UserMenu } from "@/components/user-menu";
import { citaStatusUiFor, pagoStatusUiFor } from "@/lib/appointment-states";
import { useHealthHubStore, type Appointment, type AvailableSlot, type Professional } from "@/lib/healthhub-store";
import { NextAppointmentHero } from "./_components/NextAppointmentHero";
import { SearchFilters } from "./_components/SearchFilters";
import { BookingRequestForm } from "./_components/BookingRequestForm";
import { ProfessionalCard } from "./_components/ProfessionalCard";
import { SidebarMyAppointments } from "./_components/SidebarMyAppointments";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function modeLabel(mode: string) {
  if (mode === "online") {
    return "Online";
  }

  if (mode === "in_person") {
    return "Presencial";
  }

  return "Híbrido";
}

function dateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", weekday: "long", year: "numeric" }).format(parsed);
}

function localDateTimeStamp() {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// La API está incorporando paymentStatus/paymentProvider a los DTOs de cita;
// el tipo Appointment del store todavía no los declara, así que se leen de forma segura.
function paymentStatusOf(appointment: Appointment) {
  return (appointment as { paymentStatus?: string | null }).paymentStatus ?? "none";
}

function canPayOnline(appointment: Appointment) {
  const paymentStatus = paymentStatusOf(appointment);
  return appointment.status === "scheduled" && Boolean(appointment.professionalServiceId) && (paymentStatus === "none" || paymentStatus === "rejected");
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function scrollToElement(id: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function professionalMatchesMode(professional: Professional, mode: string) {
  if (mode === "all") {
    return true;
  }

  return professional.appointmentMode === mode || professional.appointmentMode === "hybrid";
}

function nextDateForWeekday(weekday: number) {
  const today = new Date();
  const currentWeekday = today.getDay() === 0 ? 7 : today.getDay();
  const daysUntil = (weekday - currentWeekday + 7) % 7 || 7;
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);
  return nextDate.toISOString().slice(0, 10);
}

function bookingSlotsFor(professional: Professional) {
  return professional.availability.map((slot) => ({
    date: nextDateForWeekday(slot.weekday),
    endsAt: "",
    id: slot.id,
    label: `${slot.weekdayLabel} ${slot.startsAt}`,
    startsAt: "",
    time: slot.startsAt
  }));
}

type BookingSuccess = {
  appointment: Appointment;
  durationMinutes: number;
  professionalName: string;
  serviceName: string;
  servicePrice: number | null;
};

export function PatientPortalPageClient() {
  const {
    addAppointment,
    appointments,
    cancelAppointment,
    currentUser,
    loadAvailableSlots,
    patientRecords,
    patients,
    professionals,
    rescheduleAppointment,
    reviews,
    startAppointmentCheckout
  } = useHealthHubStore();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [mode, setMode] = useState("all");
  const [expandedProfessionalId, setExpandedProfessionalId] = useState(professionals[0]?.id ?? "");
  const [bookingNotice, setBookingNotice] = useState("");
  const [bookingProfessionalId, setBookingProfessionalId] = useState("");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingSlotId, setBookingSlotId] = useState("");
  const [bookingMode, setBookingMode] = useState<"online" | "in_person">("online");
  const [bookingReason, setBookingReason] = useState("Quiero agendar una consulta desde mi portal.");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingNoticeTone, setBookingNoticeTone] = useState<"success" | "error">("success");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [appointmentActionId, setAppointmentActionId] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccess | null>(null);

  const currentPatient = patients.find((patient) => patient.id === currentUser.patientId);
  const currentPatientId = currentPatient?.id;
  const bookingProfessional = professionals.find((professional) => professional.id === bookingProfessionalId);
  const bookingService = bookingProfessional?.services.find((service) => service.id === bookingServiceId);
  const bookingSlots = availableSlots.length > 0 ? availableSlots : bookingProfessional ? bookingSlotsFor(bookingProfessional) : [];
  const bookingSlot = bookingSlots.find((slot) => slot.id === bookingSlotId) ?? bookingSlots[0];

  const patientAppointments = appointments
    .filter((appointment) => appointment.patientId === currentPatientId)
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));

  const upcomingAppointments = patientAppointments.filter((appointment) => appointment.status === "scheduled" || appointment.status === "confirmed");

  const nowStamp = localDateTimeStamp();
  const nextAppointment = upcomingAppointments.find((appointment) => `${appointment.date} ${appointment.time}` >= nowStamp);

  const visibleRecords = patientRecords.filter((record) => record.patientId === currentPatientId && record.visibility === "patient_visible");

  const filteredProfessionals = (() => {
    const normalizedQuery = stripAccents(query.trim().toLowerCase());

    return professionals.filter((professional) => {
      const matchesSpecialty = specialty === "all" || professional.specialty === specialty;
      const matchesMode = professionalMatchesMode(professional, mode);
      const matchesQuery =
        !normalizedQuery ||
        stripAccents(professional.displayName.toLowerCase()).includes(normalizedQuery) ||
        stripAccents(professional.specialtyLabel.toLowerCase()).includes(normalizedQuery) ||
        stripAccents(professional.location.toLowerCase()).includes(normalizedQuery) ||
        stripAccents(professional.bio.toLowerCase()).includes(normalizedQuery) ||
        professional.services.some((service) => stripAccents(service.name.toLowerCase()).includes(normalizedQuery));

      return matchesSpecialty && matchesMode && matchesQuery;
    });
  })();

  function toggleReviews(professionalId: string) {
    setExpandedProfessionalId((current) => (current === professionalId ? "" : professionalId));
  }

  async function loadSlotsFor(professional: Professional, serviceId: string) {
    setSlotsLoading(true);

    try {
      const slots = await loadAvailableSlots(professional.id, serviceId);
      setAvailableSlots(slots);
      setBookingSlotId(slots[0]?.id ?? "");
    } finally {
      setSlotsLoading(false);
    }
  }

  function startBooking(professional: Professional) {
    const firstService = professional.services[0];
    const firstSlot = bookingSlotsFor(professional)[0];

    setBookingSuccess(null);
    setBookingNotice("");
    setBookingNoticeTone("success");
    setAvailableSlots(firstSlot ? [firstSlot] : []);
    setBookingProfessionalId(professional.id);
    setBookingServiceId(firstService?.id ?? "");
    setBookingSlotId(firstSlot?.id ?? "");
    setBookingMode(firstService?.mode === "in_person" ? "in_person" : "online");
    setExpandedProfessionalId(professional.id);

    if (firstService) {
      void loadSlotsFor(professional, firstService.id);
    }

    scrollToElement("solicitar-cita");
  }

  async function submitBookingRequest() {
    if (!currentPatient || !bookingProfessional || !bookingService || !bookingSlot) {
      return;
    }

    setBookingSaving(true);

    try {
      const appointment = await addAppointment({
        createdByUserId: currentUser.id,
        date: bookingSlot.date,
        duration: `${bookingService.durationMinutes} min`,
        mode: bookingMode,
        patientId: currentPatient.id,
        professionalId: bookingProfessional.id,
        professionalServiceId: bookingService.id,
        reason: bookingReason,
        time: bookingSlot.time,
        type: bookingService.name
      });

      if (appointment) {
        setBookingNoticeTone("success");
        setBookingNotice("");
        setBookingSuccess({
          appointment,
          durationMinutes: bookingService.durationMinutes,
          professionalName: bookingProfessional.displayName,
          serviceName: bookingService.name,
          servicePrice: typeof bookingService.price === "number" ? bookingService.price : null
        });
        setBookingProfessionalId("");
        scrollToElement("solicitud-enviada");
      }
    } catch (error) {
      setBookingNoticeTone("error");
      setBookingNotice(error instanceof Error ? error.message : "No pudimos registrar tu solicitud de cita.");
    } finally {
      setBookingSaving(false);
    }
  }

  async function payPatientAppointment(appointment: Appointment) {
    setAppointmentActionId(appointment.id);

    try {
      const checkout = await startAppointmentCheckout(appointment.id);
      window.location.assign(checkout.initPoint);
    } catch (error) {
      setBookingNoticeTone("error");
      setBookingNotice(error instanceof Error ? error.message : "No pudimos iniciar el pago de la cita.");
      setAppointmentActionId("");
    }
  }

  async function cancelPatientAppointment(appointment: Appointment) {
    if (!window.confirm("¿Cancelar esta cita? Si ya pagaste, se emitirá un reembolso.")) {
      return;
    }

    setAppointmentActionId(appointment.id);

    const hadApprovedPayment = paymentStatusOf(appointment) === "approved";

    try {
      await cancelAppointment(appointment.id, "Cancelada desde el portal del paciente.");
      setBookingNoticeTone("success");
      const baseMsg = `Cita cancelada: ${appointment.date} ${appointment.time}.`;
      setBookingNotice(hadApprovedPayment ? `${baseMsg} El pago será reembolsado en breve.` : baseMsg);
    } catch (error) {
      setBookingNoticeTone("error");
      setBookingNotice(error instanceof Error ? error.message : "No pudimos cancelar la cita.");
    } finally {
      setAppointmentActionId("");
    }
  }

  async function reschedulePatientAppointment(appointment: Appointment) {
    if (!appointment.professionalId || !appointment.professionalServiceId) {
      setBookingNoticeTone("error");
      setBookingNotice("Esta cita no tiene profesional o servicio para calcular horarios disponibles.");
      return;
    }

    setAppointmentActionId(appointment.id);

    try {
      const slots = await loadAvailableSlots(appointment.professionalId, appointment.professionalServiceId);
      const nextSlot = slots.find((slot) => slot.date !== appointment.date || slot.time !== appointment.time) ?? slots[0];

      if (!nextSlot) {
        setBookingNoticeTone("error");
        setBookingNotice("No hay horarios disponibles para reprogramar esta cita.");
        return;
      }

      const updated = await rescheduleAppointment(appointment.id, nextSlot.date, nextSlot.time, "Reprogramada desde el portal del paciente.");
      setBookingNoticeTone("success");
      setBookingNotice(`Cita reprogramada para ${updated.date} ${updated.time}.`);
    } catch (error) {
      setBookingNoticeTone("error");
      setBookingNotice(error instanceof Error ? error.message : "No pudimos reprogramar la cita.");
    } finally {
      setAppointmentActionId("");
    }
  }

  // Handler passed to BookingRequestForm for service changes (updates service, mode, and reloads slots)
  function handleBookingServiceChange(serviceId: string) {
    const nextService = bookingProfessional?.services.find((service) => service.id === serviceId);
    setBookingServiceId(serviceId);
    setBookingMode(nextService?.mode === "in_person" ? "in_person" : "online");
    setAvailableSlots([]);

    if (nextService && bookingProfessional) {
      void loadSlotsFor(bookingProfessional, nextService.id);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Busca profesionales, solicita tus citas y consulta tus documentos en un solo lugar."
        title="Portal del paciente"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {bookingNotice ? (
          <div
            className={clsx(
              "rounded-md border px-4 py-3 text-sm",
              bookingNoticeTone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
            )}
          >
            {bookingNotice}
          </div>
        ) : null}

        {currentUser.primaryRole !== "patient" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta es una sesión profesional. Cambia a una sesión de paciente en el acceso de demostración para solicitar citas y ver tus documentos.
          </div>
        ) : !currentPatient ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No pudimos cargar tu perfil de paciente. Revisa tu conexión o vuelve a iniciar sesión.
          </div>
        ) : null}

        {nextAppointment ? (
          <NextAppointmentHero
            appointment={nextAppointment}
            appointmentActionId={appointmentActionId}
            onPay={payPatientAppointment}
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard detail={currentPatient?.fullName ?? "Paciente demo"} icon={CalendarDays} label="Próximas citas" value={`${upcomingAppointments.length}`} />
          <StatCard detail="Con perfil activo" icon={Stethoscope} label="Profesionales" value={`${professionals.length}`} />
          <StatCard detail="Compartidos contigo" icon={FileText} label="Mis documentos" value={`${visibleRecords.length}`} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {bookingSuccess
              ? (() => {
                  const successCitaUi = citaStatusUiFor(bookingSuccess.appointment.status);
                  const successPagoUi = pagoStatusUiFor(bookingSuccess.appointment);
                  const paying = appointmentActionId === bookingSuccess.appointment.id;

                  return (
                    <div className="scroll-mt-32" id="solicitud-enviada">
                      <Panel
                        action={
                          <button
                            className="-m-2 p-2 text-xs font-medium text-slate-500 hover:text-slate-700"
                            onClick={() => setBookingSuccess(null)}
                            type="button"
                          >
                            Cerrar
                          </button>
                        }
                        className="border-emerald-200"
                        title="Solicitud enviada"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                            <div>
                              <p className="text-sm font-semibold">Recibimos tu solicitud de cita</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                El profesional confirmará tu solicitud. Si pagas en línea, tu cita se confirma al instante.
                              </p>
                            </div>
                          </div>

                          <dl className="mt-4 grid gap-3 rounded-md border border-border bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-medium uppercase text-slate-600">Profesional</dt>
                              <dd className="mt-0.5 font-medium text-slate-800">{bookingSuccess.professionalName}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase text-slate-600">Servicio</dt>
                              <dd className="mt-0.5 font-medium text-slate-800">
                                {bookingSuccess.serviceName} · {bookingSuccess.durationMinutes} min
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase text-slate-600">Fecha y hora</dt>
                              <dd className="mt-0.5 font-medium text-slate-800">
                                {dateLabel(bookingSuccess.appointment.date)} · {bookingSuccess.appointment.time} h
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase text-slate-600">Modalidad</dt>
                              <dd className="mt-0.5 font-medium text-slate-800">{modeLabel(bookingSuccess.appointment.mode)}</dd>
                            </div>
                            {bookingSuccess.servicePrice !== null ? (
                              <div>
                                <dt className="text-xs font-medium uppercase text-slate-600">Precio</dt>
                                <dd className="mt-0.5 font-medium text-slate-800">{money(bookingSuccess.servicePrice)}</dd>
                              </div>
                            ) : null}
                            <div>
                              <dt className="text-xs font-medium uppercase text-slate-600">Estado</dt>
                              <dd className="mt-1 flex flex-wrap gap-1.5">
                                <StatusPill label={successCitaUi.label} status={successCitaUi.pill} />
                                <StatusPill label={successPagoUi.label} status={successPagoUi.pill} />
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            {bookingSuccess.servicePrice !== null && canPayOnline(bookingSuccess.appointment) ? (
                              <button
                                className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                disabled={paying}
                                onClick={() => payPatientAppointment(bookingSuccess.appointment)}
                                type="button"
                              >
                                <WalletCards size={16} />
                                {paying ? "Procesando..." : `Pagar ahora · ${money(bookingSuccess.servicePrice)}`}
                              </button>
                            ) : null}
                            <a
                              className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              href="#mis-citas"
                            >
                              Ver mis citas
                            </a>
                          </div>
                        </div>
                      </Panel>
                    </div>
                  );
                })()
              : null}

            <Panel title="Buscar profesionales">
              <SearchFilters
                mode={mode}
                query={query}
                specialty={specialty}
                onModeChange={setMode}
                onQueryChange={setQuery}
                onSpecialtyChange={setSpecialty}
              />
            </Panel>

            {bookingProfessional ? (
              <BookingRequestForm
                bookingMode={bookingMode}
                bookingReason={bookingReason}
                bookingSaving={bookingSaving}
                bookingServiceId={bookingServiceId}
                bookingSlotId={bookingSlotId}
                bookingSlots={bookingSlots}
                currentPatient={currentPatient}
                professional={bookingProfessional}
                selectedService={bookingService}
                slotsLoading={slotsLoading}
                onCancel={() => setBookingProfessionalId("")}
                onModeChange={setBookingMode}
                onReasonChange={setBookingReason}
                onServiceChange={handleBookingServiceChange}
                onSlotChange={setBookingSlotId}
                onSubmit={submitBookingRequest}
              />
            ) : null}

            <Panel title={`${filteredProfessionals.length} profesionales encontrados`}>
              <div className="divide-y divide-border">
                {filteredProfessionals.map((professional) => {
                  const professionalReviews = reviews.filter((review) => review.professionalId === professional.id);
                  const expanded = expandedProfessionalId === professional.id;

                  return (
                    <ProfessionalCard
                      currentPatient={currentPatient}
                      expanded={expanded}
                      key={professional.id}
                      professional={professional}
                      reviews={professionalReviews}
                      onStartBooking={startBooking}
                      onToggleReviews={toggleReviews}
                    />
                  );
                })}
              </div>
              <p className="border-t border-border px-4 py-3 text-xs leading-5 text-slate-500">
                La comunicación realizada mediante WhatsApp ocurre fuera de Clinixa y no forma parte
                automáticamente del expediente clínico.
              </p>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Mi perfil">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
                    {currentPatient?.initials ?? initials(currentUser.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{currentPatient?.fullName ?? currentUser.fullName}</p>
                    <p className="truncate text-sm text-slate-500">{currentUser.email}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Estado</span>
                    {currentPatient ? <StatusPill label={currentPatient.statusLabel} status={currentPatient.status} /> : null}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cuenta</span>
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <BadgeCheck size={15} />
                      Activa
                    </span>
                  </div>
                </div>
              </div>
            </Panel>

            <SidebarMyAppointments
              appointmentActionId={appointmentActionId}
              upcomingAppointments={upcomingAppointments}
              onCancel={cancelPatientAppointment}
              onPay={payPatientAppointment}
              onReschedule={reschedulePatientAppointment}
            />

            <Panel title="Mis documentos">
              <div className="divide-y divide-border">
                {visibleRecords.length > 0 ? (
                  visibleRecords.map((record) => (
                    <div className="px-4 py-4" key={record.id}>
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        <p className="text-sm font-medium">{record.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {record.recordTypeLabel} · {record.professionalName}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{record.summary}</p>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-4 text-sm text-slate-500">Aún no tienes documentos compartidos por tu profesional.</p>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
