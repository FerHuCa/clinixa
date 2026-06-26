"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, ChevronRight, Clock, MapPin, Rocket, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import {
  useHealthHubStore,
  type ProfessionalOnboarding
} from "@/lib/healthhub-store";

// ─── tipos locales ────────────────────────────────────────────────────────────

type StepId = 0 | 1 | 2 | 3;

type StepState = {
  completed: boolean;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Perfil", "Servicio", "Disponibilidad", "Cédula"] as const;

function stepsDone(onboarding: ProfessionalOnboarding): boolean[] {
  const cedulaVerificada =
    onboarding.profileComplete &&
    onboarding.hasServices &&
    onboarding.hasAvailability &&
    onboarding.canPublish;

  return [
    onboarding.profileComplete,
    onboarding.hasServices,
    onboarding.hasAvailability,
    cedulaVerificada
  ];
}

function countDone(flags: boolean[]): number {
  return flags.filter(Boolean).length;
}

// ─── sub-formularios por paso ─────────────────────────────────────────────────

type StepPanelProps = {
  onNext: () => void;
  onSkip: () => void;
};

// Paso 1 — Perfil

type ProfileValues = {
  bio: string;
  location: string;
};

type StepPerfilProps = StepPanelProps & {
  initial: ProfileValues;
  onSave: (values: ProfileValues) => Promise<void>;
};

function StepPerfil({ initial, onNext, onSave, onSkip }: StepPerfilProps) {
  const [bio, setBio] = useState(initial.bio);
  const [location, setLocation] = useState(initial.location);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bioValid = bio.trim().length >= 20;

  async function handleSave() {
    if (!bioValid) {
      setError("La biografía debe tener al menos 20 caracteres.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({ bio: bio.trim(), location: location.trim() });
      onNext();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-slate-600">
        Cuéntales a tus futuros pacientes quién eres, cuál es tu enfoque y dónde atiendes.
      </p>

      <label className="block">
        <span className="text-xs font-medium uppercase text-slate-600">
          Biografía <span className="text-slate-300">(mín. 20 caracteres)</span>
        </span>
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
          onChange={(event) => setBio(event.target.value)}
          placeholder="Describe tu enfoque, experiencia y a quién ayudas."
          value={bio}
        />
        <span className="mt-1 block text-xs text-slate-600">{bio.trim().length} / 20+ caracteres</span>
      </label>

      <label className="block">
        <span className="text-xs font-medium uppercase text-slate-600">Ubicación</span>
        <div className="mt-1 flex items-center gap-2 rounded-md border border-border px-3 py-2">
          <MapPin size={16} className="shrink-0 text-primary" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Colonia, ciudad"
            value={location}
          />
        </div>
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
          onClick={onSkip}
          type="button"
        >
          Omitir por ahora
        </button>
        <button
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={saving}
          onClick={handleSave}
          type="button"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar y continuar"}
        </button>
      </div>
    </div>
  );
}

// Paso 2 — Servicio

type ServiceValues = {
  description: string;
  durationMinutes: number;
  mode: string;
  name: string;
  price: number;
};

type StepServicioProps = StepPanelProps & {
  onSave: (values: ServiceValues) => Promise<void>;
};

function StepServicio({ onNext, onSave, onSkip }: StepServicioProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [price, setPrice] = useState(700);
  const [mode, setMode] = useState("hybrid");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) {
      setError("El nombre del servicio es requerido.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({ description: description.trim(), durationMinutes, mode, name: name.trim(), price });
      onNext();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo crear el servicio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-slate-600">
        Define al menos un servicio con precio para que los pacientes puedan agendar contigo.
      </p>

      <label className="block">
        <span className="text-xs font-medium uppercase text-slate-600">Nombre del servicio</span>
        <input
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm font-medium outline-none focus:border-teal-400"
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Consulta inicial"
          value={name}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium uppercase text-slate-600">Descripción</span>
        <textarea
          className="mt-1 min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Breve descripción del servicio."
          value={description}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Duración (min)</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            min={15}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            type="number"
            value={durationMinutes}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Precio (MXN)</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            min={0}
            onChange={(event) => setPrice(Number(event.target.value))}
            type="number"
            value={price}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Modalidad</span>
          <select
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => setMode(event.target.value)}
            value={mode}
          >
            <option value="hybrid">Híbrido</option>
            <option value="online">En línea</option>
            <option value="in_person">Presencial</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
          onClick={onSkip}
          type="button"
        >
          Omitir por ahora
        </button>
        <button
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={saving}
          onClick={handleSave}
          type="button"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar y continuar"}
        </button>
      </div>
    </div>
  );
}

// Paso 3 — Disponibilidad

type AvailabilityValues = {
  endsAt: string;
  startsAt: string;
  weekday: number;
};

type StepDisponibilidadProps = StepPanelProps & {
  onSave: (values: AvailabilityValues) => Promise<void>;
};

function StepDisponibilidad({ onNext, onSave, onSkip }: StepDisponibilidadProps) {
  const [weekday, setWeekday] = useState(1);
  const [startsAt, setStartsAt] = useState("09:00");
  const [endsAt, setEndsAt] = useState("13:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      await onSave({ endsAt, startsAt, weekday });
      onNext();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo crear la disponibilidad.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-slate-600">
        Define tu primer horario de atención. Podrás agregar más franjas desde Configuración.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_110px_110px]">
        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Día</span>
          <select
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => setWeekday(Number(event.target.value))}
            value={weekday}
          >
            <option value={1}>Lunes</option>
            <option value={2}>Martes</option>
            <option value={3}>Miércoles</option>
            <option value={4}>Jueves</option>
            <option value={5}>Viernes</option>
            <option value={6}>Sábado</option>
            <option value={7}>Domingo</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Inicio</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => setStartsAt(event.target.value)}
            type="time"
            value={startsAt}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-600">Fin</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => setEndsAt(event.target.value)}
            type="time"
            value={endsAt}
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
          onClick={onSkip}
          type="button"
        >
          Omitir por ahora
        </button>
        <button
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={saving}
          onClick={handleSave}
          type="button"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar y continuar"}
        </button>
      </div>
    </div>
  );
}

// Paso 4 — Cédula

type StepCedulaProps = {
  initialLicenseNumber: string;
  onboarding: ProfessionalOnboarding | null;
  onPublish: () => Promise<void>;
  onSave: (licenseNumber: string) => Promise<void>;
};

function StepCedula({ initialLicenseNumber, onboarding, onPublish, onSave }: StepCedulaProps) {
  const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!licenseNumber.trim()) {
      setError("Ingresa tu número de cédula profesional.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave(licenseNumber.trim());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo guardar la cédula.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError("");

    try {
      await onPublish();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo publicar el perfil.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-slate-600">
        Tu cédula profesional es necesaria para publicar tu perfil. El equipo de Clinixa la revisará
        manualmente. <strong>Este proceso tarda 1-2 días hábiles.</strong>
      </p>

      <label className="block">
        <span className="text-xs font-medium uppercase text-slate-600">Número de cédula profesional</span>
        <input
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
          onChange={(event) => {
            setLicenseNumber(event.target.value);
            setSaved(false);
          }}
          placeholder="Ej. 12345678"
          value={licenseNumber}
        />
      </label>

      <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <Clock size={16} className="mt-0.5 shrink-0 text-sky-600" />
          <div className="text-sm text-sky-800">
            <p className="font-medium">Proceso de verificación</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-sky-700">
              <li>Ingresa tu número de cédula y guárdalo.</li>
              <li>El equipo de Clinixa revisará tu cédula contra el registro oficial (1-2 días hábiles).</li>
              <li>Recibirás una confirmación cuando tu perfil esté verificado y listo para publicar.</li>
            </ol>
          </div>
        </div>
      </div>

      {saved ? (
        <div className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          <CheckCircle2 size={16} />
          Cédula guardada. Tu solicitud de verificación está en proceso.
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={saving}
          onClick={handleSave}
          type="button"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar cédula"}
        </button>

        {onboarding?.canPublish ? (
          <button
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={publishing}
            onClick={handlePublish}
            type="button"
          >
            <Rocket size={16} />
            {publishing ? "Publicando..." : "Publicar perfil"}
          </button>
        ) : onboarding && onboarding.missing.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="mb-2 text-xs font-medium uppercase text-amber-700">Pasos pendientes para publicar</p>
            <ul className="space-y-1">
              {onboarding.missing.map((msg) => (
                <li className="flex items-start gap-2 text-sm text-amber-800" key={msg}>
                  <span className="mt-0.5 text-amber-500">○</span>
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function ActivacionPageClient() {
  const {
    createProfessionalAvailability,
    createProfessionalService,
    currentUser,
    loadProfessionalDashboard,
    loadProfessionalOnboarding,
    publishProfessional,
    ready,
    updateProfessionalProfile
  } = useHealthHubStore();

  const [onboarding, setOnboarding] = useState<ProfessionalOnboarding | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [currentStep, setCurrentStep] = useState<StepId>(0);
  const [stepStates, setStepStates] = useState<StepState[]>([
    { completed: false },
    { completed: false },
    { completed: false },
    { completed: false }
  ]);

  // Perfil precargado para el paso 1
  const [initialBio, setInitialBio] = useState("");
  const [initialLocation, setInitialLocation] = useState("");
  const [initialLicenseNumber, setInitialLicenseNumber] = useState("");

  // Contexto extra para el paso de cédula
  const [displayName, setDisplayName] = useState("");
  const [specialty, setSpecialty] = useState("other");
  const [appointmentMode, setAppointmentMode] = useState("hybrid");
  const [basePrice, setBasePrice] = useState(700);

  // Publicación completada
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) {
        return;
      }

      if (currentUser.primaryRole !== "professional") {
        setLoadingInitial(false);
        return;
      }

      const [nextOnboarding, nextDashboard] = await Promise.all([
        loadProfessionalOnboarding(),
        loadProfessionalDashboard()
      ]);

      if (cancelled) {
        return;
      }

      if (nextOnboarding) {
        setOnboarding(nextOnboarding);

        const flags = stepsDone(nextOnboarding);
        setStepStates(flags.map((done) => ({ completed: done })));

        // Avanzar al primer paso incompleto
        const firstIncomplete = flags.findIndex((done) => !done);
        if (firstIncomplete !== -1) {
          setCurrentStep(firstIncomplete as StepId);
        } else {
          setCurrentStep(3);
        }

        if (nextOnboarding.isPublished) {
          setPublished(true);
        }
      }

      const source = nextDashboard?.professional;

      if (source) {
        const rawBio = source.bio.startsWith("Perfil creado desde una invitacion") ? "" : source.bio;
        setInitialBio(rawBio);
        setInitialLocation(source.location ?? "");
        setInitialLicenseNumber(source.licenseNumber ?? "");
        setDisplayName(source.displayName);
        setSpecialty(source.specialty ?? "other");
        setAppointmentMode(source.appointmentMode ?? "hybrid");
        setBasePrice(source.basePrice ?? 700);
      }

      setLoadingInitial(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, currentUser.primaryRole, loadProfessionalDashboard, loadProfessionalOnboarding, ready]);

  async function refreshOnboarding() {
    const next = await loadProfessionalOnboarding();

    if (next) {
      setOnboarding(next);
      const flags = stepsDone(next);
      setStepStates(flags.map((done) => ({ completed: done })));

      if (next.isPublished) {
        setPublished(true);
      }
    }
  }

  function markStep(index: number, completed: boolean) {
    setStepStates((current) => current.map((state, i) => (i === index ? { completed } : state)));
  }

  function goToStep(index: StepId) {
    setCurrentStep(index);
  }

  function goNext() {
    markStep(currentStep, true);
    const next = (currentStep + 1) as StepId;

    if (next < 4) {
      setCurrentStep(next);
    }
  }

  function skipStep() {
    const next = (currentStep + 1) as StepId;

    if (next < 4) {
      setCurrentStep(next);
    }
  }

  // ── acciones del store ──

  async function savePerfil(values: { bio: string; location: string }) {
    await updateProfessionalProfile({
      appointmentMode,
      basePrice,
      bio: values.bio,
      displayName,
      location: values.location,
      specialty
    });
    await refreshOnboarding();
  }

  async function saveServicio(values: {
    description: string;
    durationMinutes: number;
    mode: string;
    name: string;
    price: number;
  }) {
    await createProfessionalService(values);
    await refreshOnboarding();
  }

  async function saveDisponibilidad(values: { endsAt: string; startsAt: string; weekday: number }) {
    await createProfessionalAvailability(values);
    await refreshOnboarding();
  }

  async function saveCedula(licenseNumber: string) {
    await updateProfessionalProfile({
      appointmentMode,
      basePrice,
      displayName,
      bio: initialBio,
      licenseNumber,
      location: initialLocation,
      specialty
    });
    await refreshOnboarding();
  }

  async function handlePublish() {
    await publishProfessional();
    await refreshOnboarding();
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  const doneFlags = onboarding ? stepsDone(onboarding) : stepStates.map((s) => s.completed);
  const doneCuenta = countDone(doneFlags);

  return (
    <AppShell>
      <PageHeader
        action={
          <div className="flex items-center gap-3">
            <Link
              className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              href="/portal-profesional"
            >
              Ir al portal
              <ArrowRight size={15} />
            </Link>
            <UserMenu fullName={currentUser.fullName} />
          </div>
        }
        description="Completa estos pasos para publicar tu perfil y recibir pacientes."
        title="Activa tu perfil"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {/* Aviso: rol incorrecto */}
        {ready && currentUser.primaryRole !== "professional" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta página es solo para cuentas profesionales.{" "}
            <Link className="font-medium underline underline-offset-2" href="/portal-paciente">
              Ir a tu portal
            </Link>
            .
          </div>
        ) : null}

        {/* Cargando */}
        {loadingInitial ? (
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-500">
            Cargando tu perfil...
          </div>
        ) : null}

        {/* Publicado */}
        {published ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <BadgeCheck size={18} />
            Tu perfil ya está publicado y visible para pacientes.{" "}
            <Link className="underline underline-offset-2" href="/">
              Ver tu dashboard
            </Link>
            .
          </div>
        ) : null}

        {!loadingInitial && currentUser.primaryRole === "professional" ? (
          <>
            {/* Stepper */}
            <div className="flex items-center gap-0 overflow-x-auto">
              {STEP_LABELS.map((label, index) => {
                const done = doneFlags[index] ?? stepStates[index]?.completed;
                const active = currentStep === index;

                return (
                  <button
                    className="flex shrink-0 items-center gap-0"
                    key={label}
                    onClick={() => goToStep(index as StepId)}
                    type="button"
                  >
                    <div
                      className={[
                        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition",
                        active
                          ? "bg-primary text-white"
                          : done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
                          active ? "bg-white text-primary" : done ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"
                        ].join(" ")}
                      >
                        {done && !active ? "✓" : index + 1}
                      </span>
                      {label}
                    </div>
                    {index < STEP_LABELS.length - 1 ? (
                      <ChevronRight className="mx-0.5 shrink-0 text-slate-300" size={16} />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Contador */}
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{doneCuenta} de 4</span> pasos completados
            </p>

            {/* Paso activo */}
            <Panel title={`Paso ${currentStep + 1} de 4 — ${STEP_LABELS[currentStep]}`}>
              {currentStep === 0 ? (
                <StepPerfil
                  initial={{ bio: initialBio, location: initialLocation }}
                  onNext={goNext}
                  onSave={savePerfil}
                  onSkip={skipStep}
                />
              ) : currentStep === 1 ? (
                <StepServicio onNext={goNext} onSave={saveServicio} onSkip={skipStep} />
              ) : currentStep === 2 ? (
                <StepDisponibilidad onNext={goNext} onSave={saveDisponibilidad} onSkip={skipStep} />
              ) : (
                <StepCedula
                  initialLicenseNumber={initialLicenseNumber}
                  onboarding={onboarding}
                  onPublish={handlePublish}
                  onSave={saveCedula}
                />
              )}
            </Panel>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
