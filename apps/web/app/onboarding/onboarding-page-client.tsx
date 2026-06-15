"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Stethoscope, UserRound } from "lucide-react";
import { useHealthHubStore } from "@/lib/healthhub-store";

type OnboardingData = {
  fullName: string;
  role: "patient" | "professional";
};

const PRIVACY_AND_TERMS = ["privacy_notice", "terms_of_service"];
// Consentimiento especifico por rol: datos sensibles de salud (paciente) o datos
// profesionales y de identificacion (profesional). Versionado en docs/legal.
const ROLE_CONSENT: Record<"patient" | "professional", string> = {
  patient: "health_data_processing",
  professional: "professional_data_processing"
};

export function OnboardingPageClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { refreshSession, recordConsent, loadConsent, updateAccountProfile } = useHealthHubStore();
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    role: "patient"
  });
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptDataProcessing, setAcceptDataProcessing] = useState(false);
  // Fase del check inicial: "checking" (resolviendo sesion/consent), "form"
  // (consent resuelto incompleto), "error" (fallo transitorio: NO mostrar formulario
  // vacio para no re-pedir un perfil existente).
  const [phase, setPhase] = useState<"checking" | "form" | "error">("checking");
  const [retryToken, setRetryToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-up");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    (async () => {
      // Reinicia la fase a "checking" en cada (re)ejecucion del check (incluye
      // reintentos via retryToken) sin llamar setState en el cuerpo del efecto.
      setPhase("checking");

      try {
        const user = await refreshSession();
        const consent = await loadConsent();

        if (cancelled) {
          return;
        }

        // loadConsent devuelve null ante error de API: lo tratamos como fallo, no
        // como "sin consentimiento", para no re-pedir el perfil de un usuario existente.
        if (consent === null) {
          setPhase("error");
          return;
        }

        // Onboarding ya completado: ir directo al portal sin volver a pedir datos.
        if (consent.completed) {
          router.replace(user.primaryRole === "professional" ? "/portal-profesional" : "/portal-paciente");
          return;
        }

        // Consent resuelto como incompleto: mostrar el formulario.
        setData({
          fullName: user.fullName && user.fullName !== user.email ? user.fullName : "",
          role: user.primaryRole === "professional" ? "professional" : "patient"
        });
        setPhase("form");
      } catch {
        // Error al resolver sesion/consent: NO mostrar formulario vacio.
        if (!cancelled) {
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, loadConsent, refreshSession, router, retryToken]);

  const consentComplete = acceptPrivacy && acceptDataProcessing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentComplete) {
      setError("Debes aceptar el Aviso de Privacidad y otorgar el consentimiento de tratamiento de datos para continuar.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateAccountProfile({ fullName: data.fullName.trim(), role: data.role });
      await recordConsent([...PRIVACY_AND_TERMS, ROLE_CONSENT[data.role]]);
      const user = await refreshSession();
      const portalHref = user.primaryRole === "professional" ? "/portal-profesional" : "/portal-paciente";
      router.push(portalHref);
    } catch {
      setError("No se pudo guardar tu perfil o consentimiento. Intenta de nuevo o ve a sesión.");
      setTimeout(() => router.push("/sesion"), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || !isSignedIn || phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-primary mx-auto mb-4" />
          <p className="text-sm text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Fallo transitorio al cargar sesion/consent: ofrecer reintentar en vez de
  // presentar un formulario vacio que re-pediria un perfil ya existente.
  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-amber-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">No pudimos cargar tu perfil</h1>
          <p className="text-sm text-slate-600">
            Hubo un problema al validar tu sesión. Revisa tu conexión e intenta de nuevo.
          </p>
          <button
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
            onClick={() => setRetryToken((token) => token + 1)}
            type="button"
          >
            Reintentar
          </button>
          <Link className="inline-block text-sm font-medium text-primary underline-offset-2 hover:underline" href="/sesion">
            Ir a sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white mx-auto mb-3">
            <UserRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Completa tu perfil</h1>
          <p className="mt-2 text-sm text-slate-600">Necesitamos algunos datos para configurar tu cuenta</p>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-900">Nombre completo</label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={saving}
              placeholder="Tu nombre"
              required
              type="text"
              value={data.fullName}
              onChange={(e) => setData((d) => ({ ...d, fullName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900">¿Cuál es tu rol?</label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                className={`flex items-center gap-2 rounded-md border-2 px-4 py-3 text-sm font-medium transition ${
                  data.role === "patient"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-slate-600 hover:border-slate-300"
                }`}
                disabled={saving}
                onClick={() => setData((d) => ({ ...d, role: "patient" }))}
                type="button"
              >
                <UserRound size={18} />
                Paciente
              </button>
              <button
                className={`flex items-center gap-2 rounded-md border-2 px-4 py-3 text-sm font-medium transition ${
                  data.role === "professional"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-slate-600 hover:border-slate-300"
                }`}
                disabled={saving}
                onClick={() => setData((d) => ({ ...d, role: "professional" }))}
                type="button"
              >
                <Stethoscope size={18} />
                Profesional
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
              <input
                checked={acceptPrivacy}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                disabled={saving}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                type="checkbox"
              />
              <span>
                Declaro haber leído y aceptado el{" "}
                <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/privacy" target="_blank">
                  Aviso de Privacidad
                </Link>{" "}
                y los{" "}
                <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/terms" target="_blank">
                  Términos y Condiciones
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
              <input
                checked={acceptDataProcessing}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                disabled={saving}
                onChange={(e) => setAcceptDataProcessing(e.target.checked)}
                type="checkbox"
              />
              <span>
                {data.role === "patient"
                  ? "Otorgo mi consentimiento expreso para el tratamiento de datos personales sensibles relacionados con mi salud."
                  : "Otorgo mi consentimiento para el tratamiento de mis datos profesionales y de identificación."}
              </span>
            </label>
          </div>

          <button
            className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            disabled={saving || !data.fullName.trim() || !consentComplete}
            type="submit"
          >
            {saving ? "Completando..." : "Continuar"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Podrás cambiar estos datos más adelante desde la página de sesión.
        </p>
      </div>
    </div>
  );
}
