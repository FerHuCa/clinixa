"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Home, MapPin, Plus, Save, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MarketplacePanel } from "@/components/marketplace-panel";
import { OnboardingChecklist, buildChecklistSteps } from "@/components/onboarding-checklist";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { UserMenu } from "@/components/user-menu";
import { pagoStatusUiFor } from "@/lib/appointment-states";
import { SPECIALTY_OPTIONS } from "@/lib/specialty-labels";
import {
  useHealthHubStore,
  type ProfessionalAvailability,
  type ProfessionalDashboard,
  type ProfessionalOnboarding,
  type ProfessionalPayments,
  type ProfessionalService,
  type Professional
} from "@/lib/healthhub-store";

type ProfileDraft = {
  displayName: string;
  bio: string;
  location: string;
  specialty: string;
  appointmentMode: string;
  basePrice: number;
  whatsappNumber: string;
  licenseNumber: string;
};

type ServiceDraft = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  mode: string;
};

type AvailabilityDraft = {
  weekday: number;
  startsAt: string;
  endsAt: string;
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

// Para el estado de cuenta no se redondea: las comisiones pueden traer centavos.
function moneyExact(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
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

function modeLabel(mode: string) {
  if (mode === "online") {
    return "En línea";
  }

  if (mode === "in_person") {
    return "Presencial";
  }

  return "Híbrido";
}

export function ProfessionalPortalPageClient() {
  const {
    apiBaseUrl,
    createProfessionalAvailability,
    createProfessionalService,
    currentUser,
    loadProfessionalDashboard,
    loadProfessionalOnboarding,
    loadProfessionalPayments,
    professionals,
    publishProfessional,
    ready,
    updateProfessionalAvailability,
    updateProfessionalProfile,
    updateProfessionalService,
    uploadProfessionalAvatar
  } = useHealthHubStore();
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null);
  const [onboarding, setOnboarding] = useState<ProfessionalOnboarding | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [configActionId, setConfigActionId] = useState("");
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({});
  const [newService, setNewService] = useState<ServiceDraft>({
    description: "",
    durationMinutes: 50,
    mode: "hybrid",
    name: "",
    price: 700
  });
  const [availabilityDrafts, setAvailabilityDrafts] = useState<Record<string, AvailabilityDraft>>({});
  const [newAvailability, setNewAvailability] = useState<AvailabilityDraft>({
    endsAt: "13:00",
    startsAt: "09:00",
    weekday: 1
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [paymentsState, setPaymentsState] = useState<{ month: string; data: ProfessionalPayments | null } | null>(null);
  const [paymentsMonth, setPaymentsMonth] = useState(() => monthKey(new Date()));

  const currentMonth = monthKey(new Date());
  const previousMonth = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

  useEffect(() => {
    let cancelled = false;

    if (!ready) {
      return () => {
        cancelled = true;
      };
    }

    Promise.all([loadProfessionalDashboard(), loadProfessionalOnboarding()])
      .then(([nextDashboard, nextOnboarding]) => {
        if (cancelled) {
          return;
        }

        setDashboard(nextDashboard);
        setOnboarding(nextOnboarding);

        const source = nextDashboard?.professional;

        if (source) {
          setProfileDraft({
            appointmentMode: source.appointmentMode,
            basePrice: source.basePrice,
            bio: source.bio.startsWith("Perfil creado desde una invitacion") ? "" : source.bio,
            displayName: source.displayName,
            licenseNumber: source.licenseNumber ?? "",
            location: source.location,
            specialty: source.specialty,
            whatsappNumber: source.whatsappNumber ?? ""
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, loadProfessionalDashboard, loadProfessionalOnboarding, ready]);

  // Estado de cuenta del mes seleccionado. Solo aplica a cuentas profesionales;
  // si la carga falla, el panel lo dice sin romper el resto de la configuración.
  useEffect(() => {
    if (!ready || currentUser.primaryRole !== "professional") {
      return;
    }

    let cancelled = false;

    loadProfessionalPayments(paymentsMonth).then((next) => {
      if (!cancelled) {
        setPaymentsState({ data: next, month: paymentsMonth });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, currentUser.primaryRole, loadProfessionalPayments, paymentsMonth, ready]);

  // Derivados del mes seleccionado: mientras no haya respuesta para ese mes se
  // considera cargando; una respuesta null significa que la carga falló.
  const payments = paymentsState && paymentsState.month === paymentsMonth ? paymentsState.data : null;
  const paymentsLoading =
    ready && currentUser.primaryRole === "professional" && paymentsState?.month !== paymentsMonth;

  const currentProfessionalId = dashboard?.professional.id ?? currentUser.professionalId;
  const professional = dashboard?.professional ?? professionals.find((item) => item.id === currentProfessionalId);

  // Checklist de activación compartido con Inicio. La conexión de Mercado Pago vive
  // en su propio panel (MarketplacePanel) y no es requisito para publicar, así que aquí
  // el paso de cobros se muestra como pendiente; el gate real de publicación es canPublish.
  const checklistSteps = onboarding
    ? buildChecklistSteps(onboarding, professional?.verificationStatus, false)
    : [];
  const completedSteps = checklistSteps.filter((step) => step.done).length;

  function syncService(service: ProfessionalService) {
    setDashboard((current) =>
      current
        ? {
            ...current,
            professional: {
              ...current.professional,
              services: [...current.professional.services.filter((item) => item.id !== service.id), service].sort((left, right) => left.price - right.price)
            }
          }
        : current
    );
  }

  function syncAvailability(availability: ProfessionalAvailability) {
    setDashboard((current) =>
      current
        ? {
            ...current,
            professional: {
              ...current.professional,
              availability: [...current.professional.availability.filter((item) => item.id !== availability.id), availability].sort(
                (left, right) => left.weekday - right.weekday || left.startsAt.localeCompare(right.startsAt)
              )
            }
          }
        : current
    );
  }

  async function saveService(serviceId: string) {
    const draft = serviceDrafts[serviceId];

    if (!draft) {
      return;
    }

    setConfigActionId(serviceId);
    setStatusMessage("");

    try {
      const service = await updateProfessionalService(serviceId, draft);
      syncService(service);
      setStatusMessage("Servicio actualizado.");
    } catch {
      setStatusMessage("No se pudo guardar el servicio.");
    } finally {
      setConfigActionId("");
    }
  }

  async function addService() {
    setConfigActionId("new-service");
    setStatusMessage("");

    try {
      const service = await createProfessionalService(newService);
      syncService(service);
      setNewService({ description: "", durationMinutes: 50, mode: "hybrid", name: "", price: 700 });
      setStatusMessage("Servicio agregado.");
      await refreshOnboarding();
    } catch {
      setStatusMessage("No se pudo agregar el servicio.");
    } finally {
      setConfigActionId("");
    }
  }

  async function saveAvailability(availabilityId: string) {
    const draft = availabilityDrafts[availabilityId];

    if (!draft) {
      return;
    }

    setConfigActionId(availabilityId);
    setStatusMessage("");

    try {
      const availability = await updateProfessionalAvailability(availabilityId, draft);
      syncAvailability(availability);
      setStatusMessage("Disponibilidad actualizada.");
    } catch {
      setStatusMessage("No se pudo guardar la disponibilidad.");
    } finally {
      setConfigActionId("");
    }
  }

  async function addAvailability() {
    setConfigActionId("new-availability");
    setStatusMessage("");

    try {
      const availability = await createProfessionalAvailability(newAvailability);
      syncAvailability(availability);
      setNewAvailability({ endsAt: "13:00", startsAt: "09:00", weekday: 1 });
      setStatusMessage("Disponibilidad agregada.");
      await refreshOnboarding();
    } catch {
      setStatusMessage("No se pudo agregar la disponibilidad.");
    } finally {
      setConfigActionId("");
    }
  }

  async function refreshOnboarding() {
    const next = await loadProfessionalOnboarding();

    if (next) {
      setOnboarding(next);
    }
  }

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({ kind: "error", text: "La imagen no debe exceder 2 MB." });
      return;
    }

    setAvatarMessage(null);

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar() {
    if (!avatarFile) {
      return;
    }

    setAvatarUploading(true);
    setAvatarMessage(null);

    try {
      const updated = await uploadProfessionalAvatar(avatarFile);
      setDashboard((current) => (current ? { ...current, professional: { ...current.professional, ...(updated as Professional) } } : current));

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarMessage({ kind: "success", text: "Foto de perfil actualizada." });
    } catch (error) {
      const text = error instanceof Error && error.message ? error.message : "No se pudo subir la foto.";
      setAvatarMessage({ kind: "error", text });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    if (!profileDraft) {
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const updated = await updateProfessionalProfile(profileDraft);
      setDashboard((current) => (current ? { ...current, professional: { ...current.professional, ...updated } } : current));
      await refreshOnboarding();
      setProfileMessage({ kind: "success", text: "Perfil actualizado." });
    } catch (error) {
      const text = error instanceof Error && error.message ? error.message : "No se pudo guardar el perfil.";
      setProfileMessage({ kind: "error", text });
    } finally {
      setProfileSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setStatusMessage("");

    try {
      const updated = await publishProfessional();
      setDashboard((current) => (current ? { ...current, professional: { ...current.professional, ...updated } } : current));
      await refreshOnboarding();
      setStatusMessage("Perfil publicado. Ya eres visible para pacientes.");
    } catch (error) {
      setStatusMessage(error instanceof Error && error.message ? error.message : "Aún faltan datos para publicar.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Tu perfil público, servicios, disponibilidad y cobros. Tu agenda y solicitudes viven en Inicio."
        title="Configuración"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {currentUser.primaryRole !== "professional" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Inicia sesión con una cuenta profesional para editar esta configuración.
          </div>
        ) : null}

        {loadingDashboard ? (
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-500">Cargando tu configuración...</div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{statusMessage}</div>
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

        {onboarding?.isPublished ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={16} />
            Tu perfil está publicado y visible para pacientes.
          </div>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div className="space-y-5">
            <Panel title="Perfil profesional">
              {professional && profileDraft ? (
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
                        <Stethoscope size={20} />
                      </div>
                      <div>
                        <p className="font-semibold">{professional.displayName}</p>
                        <p className="mt-1 text-sm text-slate-500">{professional.specialtyLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Cédula {professional.licenseNumber || "sin registrar"} ·{" "}
                          {professional.verificationStatus === "verified"
                            ? "Verificada"
                            : professional.verificationStatus === "rejected"
                              ? "Rechazada"
                              : "En revisión"}
                        </p>
                      </div>
                    </div>
                    <StatusPill
                      label={professional.status === "active" ? "Publicado" : "Borrador"}
                      status={professional.status === "active" ? "active" : "pending"}
                    />
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Nombre para mostrar</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setProfileDraft((current) => (current ? { ...current, displayName: event.target.value } : current))}
                      value={profileDraft.displayName}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Biografía</span>
                    <textarea
                      className="mt-1 min-h-24 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setProfileDraft((current) => (current ? { ...current, bio: event.target.value } : current))}
                      placeholder="Cuenta tu enfoque, experiencia y a quién ayudas."
                      value={profileDraft.bio}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Ubicación</span>
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <MapPin size={16} className="text-primary" />
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        onChange={(event) => setProfileDraft((current) => (current ? { ...current, location: event.target.value } : current))}
                        placeholder="Colonia, ciudad"
                        value={profileDraft.location}
                      />
                    </div>
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium uppercase text-slate-400">Especialidad</span>
                      <select
                        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                        onChange={(event) => setProfileDraft((current) => (current ? { ...current, specialty: event.target.value } : current))}
                        value={profileDraft.specialty}
                      >
                        {SPECIALTY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium uppercase text-slate-400">Modalidad</span>
                      <select
                        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                        onChange={(event) => setProfileDraft((current) => (current ? { ...current, appointmentMode: event.target.value } : current))}
                        value={profileDraft.appointmentMode}
                      >
                        <option value="hybrid">Híbrido</option>
                        <option value="online">En línea</option>
                        <option value="in_person">Presencial</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Precio base (MXN)</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      min={0}
                      onChange={(event) => setProfileDraft((current) => (current ? { ...current, basePrice: Number(event.target.value) } : current))}
                      type="number"
                      value={profileDraft.basePrice}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Cédula profesional</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setProfileDraft((current) => (current ? { ...current, licenseNumber: event.target.value } : current))}
                      placeholder="Ej. 12345678"
                      value={profileDraft.licenseNumber}
                    />
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Requerida para publicar tu perfil. Se mostrará en tu página pública para que los pacientes puedan verificarla.
                    </span>
                  </label>

                  <div className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Foto de perfil</span>
                    <div className="mt-2 flex items-start gap-4">
                      {/* Avatar actual o preview */}
                      {avatarPreview ?? (professional.profilePhotoUrl ? (professional.profilePhotoUrl.startsWith("/") ? `${apiBaseUrl}${professional.profilePhotoUrl}` : professional.profilePhotoUrl) : null) ? (
                        <img
                          alt="Foto de perfil"
                          className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
                          src={
                            avatarPreview ??
                            (professional.profilePhotoUrl.startsWith("/")
                              ? `${apiBaseUrl}${professional.profilePhotoUrl}`
                              : professional.profilePhotoUrl)
                          }
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-50 text-lg font-semibold text-primary">
                          {(professional.displayName ?? "")
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0] ?? "")
                            .join("")
                            .toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <input
                          accept="image/png,image/jpeg,image/webp"
                          className="block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-teal-200 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
                          onChange={handleAvatarFileChange}
                          type="file"
                        />
                        <span className="block text-xs leading-5 text-slate-500">
                          JPG, PNG o WEBP, máx 2 MB. Tu foto aparecerá en tu perfil público.
                        </span>
                        {avatarFile ? (
                          <button
                            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            disabled={avatarUploading}
                            onClick={uploadAvatar}
                            type="button"
                          >
                            {avatarUploading ? "Subiendo..." : "Subir foto"}
                          </button>
                        ) : null}
                        {avatarMessage ? (
                          <p
                            className={
                              avatarMessage.kind === "success"
                                ? "rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800"
                                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                            }
                          >
                            {avatarMessage.text}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">WhatsApp de contacto</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setProfileDraft((current) => (current ? { ...current, whatsappNumber: event.target.value } : current))}
                      placeholder="+52 55 0000 0000"
                      type="tel"
                      value={profileDraft.whatsappNumber}
                    />
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      La comunicación realizada mediante WhatsApp ocurre fuera de Clinixa y no forma parte
                      automáticamente del expediente clínico. Registra en la plataforma la información clínicamente relevante.
                    </span>
                  </label>

                  <button
                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={profileSaving}
                    onClick={saveProfile}
                    type="button"
                  >
                    <Save size={16} />
                    {profileSaving ? "Guardando..." : "Guardar perfil"}
                  </button>

                  {profileMessage ? (
                    <p
                      className={
                        profileMessage.kind === "success"
                          ? "rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800"
                          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      }
                    >
                      {profileMessage.text}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-500">Sin perfil profesional activo.</div>
              )}
            </Panel>

            {currentUser.primaryRole === "professional" ? <MarketplacePanel /> : null}

            <Panel>
              <div className="flex items-start gap-3 p-4">
                <Home size={18} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-slate-600">
                  ¿Buscas tu agenda o las solicitudes de tus pacientes? Ahora viven en{" "}
                  <Link className="font-medium text-primary underline underline-offset-2" href="/">
                    Inicio
                  </Link>
                  .
                </p>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel id="servicios" title="Servicios">
              <div className="divide-y divide-border">
                {professional?.services.length ? (
                  professional.services.map((service) => {
                    const draft = serviceDrafts[service.id] ?? {
                      description: service.description,
                      durationMinutes: service.durationMinutes,
                      mode: service.mode,
                      name: service.name,
                      price: service.price
                    };

                    return (
                      <div className="space-y-3 p-4" key={service.id}>
                        <input
                          className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium outline-none focus:border-teal-400"
                          onChange={(event) =>
                            setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, name: event.target.value } }))
                          }
                          value={draft.name}
                        />
                        <textarea
                          className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                          onChange={(event) =>
                            setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, description: event.target.value } }))
                          }
                          value={draft.description}
                        />
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                            min={15}
                            onChange={(event) =>
                              setServiceDrafts((current) => ({
                                ...current,
                                [service.id]: { ...draft, durationMinutes: Number(event.target.value) }
                              }))
                            }
                            type="number"
                            value={draft.durationMinutes}
                          />
                          <input
                            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                            min={0}
                            onChange={(event) =>
                              setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, price: Number(event.target.value) } }))
                            }
                            type="number"
                            value={draft.price}
                          />
                          <select
                            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                            onChange={(event) =>
                              setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, mode: event.target.value } }))
                            }
                            value={draft.mode}
                          >
                            <option value="hybrid">Híbrido</option>
                            <option value="online">En línea</option>
                            <option value="in_person">Presencial</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            {draft.durationMinutes} min · {money(draft.price)} · {modeLabel(draft.mode)}
                          </p>
                          <button
                            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            disabled={configActionId === service.id}
                            onClick={() => saveService(service.id)}
                            type="button"
                          >
                            <Save size={14} />
                            Guardar
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm text-slate-500">Aún no tienes servicios publicados. Agrega el primero aquí abajo.</div>
                )}
                <div className="space-y-3 bg-slate-50 p-4">
                  <input
                    className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium outline-none focus:border-teal-400"
                    onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nuevo servicio"
                    value={newService.name}
                  />
                  <textarea
                    className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                    onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Descripción"
                    value={newService.description}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      min={15}
                      onChange={(event) => setNewService((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
                      type="number"
                      value={newService.durationMinutes}
                    />
                    <input
                      className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      min={0}
                      onChange={(event) => setNewService((current) => ({ ...current, price: Number(event.target.value) }))}
                      type="number"
                      value={newService.price}
                    />
                    <select
                      className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) => setNewService((current) => ({ ...current, mode: event.target.value }))}
                      value={newService.mode}
                    >
                      <option value="hybrid">Híbrido</option>
                      <option value="online">En línea</option>
                      <option value="in_person">Presencial</option>
                    </select>
                  </div>
                  <button
                    className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
                    disabled={configActionId === "new-service"}
                    onClick={addService}
                    type="button"
                  >
                    <Plus size={14} />
                    Agregar servicio
                  </button>
                </div>
              </div>
            </Panel>

            <Panel id="disponibilidad" title="Disponibilidad">
              <div className="divide-y divide-border">
                {professional?.availability.length ? (
                  professional.availability.map((slot) => {
                    const draft = availabilityDrafts[slot.id] ?? {
                      endsAt: slot.endsAt,
                      startsAt: slot.startsAt,
                      weekday: slot.weekday
                    };

                    return (
                      <div className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_90px_90px_auto]" key={slot.id}>
                        <select
                          className="rounded-md border border-border px-3 py-2 outline-none focus:border-teal-400"
                          onChange={(event) =>
                            setAvailabilityDrafts((current) => ({ ...current, [slot.id]: { ...draft, weekday: Number(event.target.value) } }))
                          }
                          value={draft.weekday}
                        >
                          <option value={1}>Lunes</option>
                          <option value={2}>Martes</option>
                          <option value={3}>Miércoles</option>
                          <option value={4}>Jueves</option>
                          <option value={5}>Viernes</option>
                          <option value={6}>Sábado</option>
                          <option value={7}>Domingo</option>
                        </select>
                        <input
                          className="rounded-md border border-border px-3 py-2 outline-none focus:border-teal-400"
                          onChange={(event) =>
                            setAvailabilityDrafts((current) => ({ ...current, [slot.id]: { ...draft, startsAt: event.target.value } }))
                          }
                          type="time"
                          value={draft.startsAt}
                        />
                        <input
                          className="rounded-md border border-border px-3 py-2 outline-none focus:border-teal-400"
                          onChange={(event) =>
                            setAvailabilityDrafts((current) => ({ ...current, [slot.id]: { ...draft, endsAt: event.target.value } }))
                          }
                          type="time"
                          value={draft.endsAt}
                        />
                        <button
                          className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={configActionId === slot.id}
                          onClick={() => saveAvailability(slot.id)}
                          type="button"
                        >
                          <Save size={14} />
                          Guardar
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm text-slate-500">Aún no defines tu disponibilidad. Agrega tu primer horario aquí abajo.</div>
                )}
                <div className="grid gap-2 bg-slate-50 p-4 text-sm sm:grid-cols-[1fr_90px_90px_auto]">
                  <select
                    className="rounded-md border border-border px-3 py-2 outline-none focus:border-teal-400"
                    onChange={(event) => setNewAvailability((current) => ({ ...current, weekday: Number(event.target.value) }))}
                    value={newAvailability.weekday}
                  >
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miércoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                    <option value={6}>Sábado</option>
                    <option value={7}>Domingo</option>
                  </select>
                  <input
                    className="rounded-md border border-border px-3 py-2 outline-none focus:border-teal-400"
                    onChange={(event) => setNewAvailability((current) => ({ ...current, startsAt: event.target.value }))}
                    type="time"
                    value={newAvailability.startsAt}
                  />
                  <input
                    className="rounded-md border border-border px-3 py-2 outline-none focus:border-teal-400"
                    onChange={(event) => setNewAvailability((current) => ({ ...current, endsAt: event.target.value }))}
                    type="time"
                    value={newAvailability.endsAt}
                  />
                  <button
                    className="flex items-center justify-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
                    disabled={configActionId === "new-availability"}
                    onClick={addAvailability}
                    type="button"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {currentUser.primaryRole === "professional" ? (
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
                    onClick={() => setPaymentsMonth(currentMonth)}
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
                    onClick={() => setPaymentsMonth(previousMonth)}
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
        ) : null}
      </div>
    </AppShell>
  );
}
