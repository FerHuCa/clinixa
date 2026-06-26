"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Home } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MarketplacePanel } from "@/components/marketplace-panel";
import { OnboardingChecklist, buildChecklistSteps } from "@/components/onboarding-checklist";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import {
  useHealthHubStore,
  type ProfessionalAvailability,
  type ProfessionalDashboard,
  type ProfessionalOnboarding,
  type ProfessionalService,
  type Professional
} from "@/lib/healthhub-store";
import { AvailabilityPanel } from "./_components/availability-panel";
import { PaymentsSection } from "./_components/payments-section";
import { ProfileSection } from "./_components/profile-section";
import { ServicesPanel } from "./_components/services-panel";

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

function monthKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function ProfessionalPortalPageClient() {
  const {
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
  const [paymentsState, setPaymentsState] = useState<{ month: string; data: import("@/lib/healthhub-store").ProfessionalPayments | null } | null>(null);
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
            {professional && profileDraft ? (
              <ProfileSection
                avatarFile={avatarFile}
                avatarMessage={avatarMessage}
                avatarPreview={avatarPreview}
                avatarUploading={avatarUploading}
                onAvatarFileChange={handleAvatarFileChange}
                onProfileDraftChange={setProfileDraft}
                onSaveProfile={saveProfile}
                onUploadAvatar={uploadAvatar}
                profileDraft={profileDraft}
                profileMessage={profileMessage}
                profileSaving={profileSaving}
                professional={professional}
              />
            ) : (
              <Panel title="Perfil profesional">
                <div className="p-4 text-sm text-slate-500">Sin perfil profesional activo.</div>
              </Panel>
            )}

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
            <ServicesPanel
              configActionId={configActionId}
              newService={newService}
              onAddService={addService}
              onNewServiceChange={setNewService}
              onSaveService={saveService}
              onServiceDraftChange={setServiceDrafts}
              serviceDrafts={serviceDrafts}
              services={professional?.services ?? []}
            />

            <AvailabilityPanel
              availability={professional?.availability ?? []}
              availabilityDrafts={availabilityDrafts}
              configActionId={configActionId}
              newAvailability={newAvailability}
              onAddAvailability={addAvailability}
              onAvailabilityDraftChange={setAvailabilityDrafts}
              onNewAvailabilityChange={setNewAvailability}
              onSaveAvailability={saveAvailability}
            />
          </div>
        </div>

        {currentUser.primaryRole === "professional" ? (
          <PaymentsSection
            currentMonth={currentMonth}
            onSetPaymentsMonth={setPaymentsMonth}
            payments={payments}
            paymentsLoading={paymentsLoading}
            paymentsMonth={paymentsMonth}
            previousMonth={previousMonth}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
