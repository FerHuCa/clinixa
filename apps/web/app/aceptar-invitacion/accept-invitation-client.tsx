"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, CheckCircle2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { clerkEnabled, readDevUserId } from "@/lib/auth-client";
import { useHealthHubStore, type ClinicInvitationDetail } from "@/lib/healthhub-store";
import { specialtyLabelFor } from "@/lib/specialty-labels";

function invitationRoleLabel(role: string, fallback: string) {
  if (role === "clinic_admin") {
    return "Administrador de clínica";
  }

  if (role === "internal_admin") {
    return "Administrador Clinixa";
  }

  if (role === "professional") {
    return "Profesional";
  }

  if (role === "patient") {
    return "Paciente";
  }

  return fallback;
}

function invitationStatusLabel(status: string) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "accepted") {
    return "Aceptada";
  }

  if (status === "revoked") {
    return "Revocada";
  }

  if (status === "expired") {
    return "Expirada";
  }

  return status;
}

function portalForRole(role: string) {
  if (role === "clinic_admin" || role === "internal_admin") {
    return "/seguridad";
  }

  return "/portal-profesional";
}

export function AcceptInvitationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? searchParams.get("invite") ?? "";
  const { acceptClinicInvitation, currentUser, loadClinicInvitation, ready } = useHealthHubStore();

  const [invitation, setInvitation] = useState<ClinicInvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const usesClerkFlow = clerkEnabled && !readDevUserId();
  const returnUrl = typeof window === "undefined" ? "/aceptar-invitacion" : window.location.href;

  const missingInvite = ready && !token;

  useEffect(() => {
    let cancelled = false;

    if (!ready || !token) {
      return () => {
        cancelled = true;
      };
    }

    loadClinicInvitation(token)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        setInvitation(detail);
        setFullName(detail.fullName);
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("No pudimos cargar la invitación. Es posible que el enlace ya no sea válido.");
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
  }, [token, loadClinicInvitation, ready]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invitation) {
      return;
    }

    setActionError("");
    setNotice("");

    if (invitation.requiresAccount && !usesClerkFlow) {
      if (password.length < 8) {
        setActionError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        setActionError("Las contraseñas no coinciden.");
        return;
      }
    }

    setSaving(true);

    try {
      const user = await acceptClinicInvitation(token, {
        fullName: fullName.trim() || invitation.fullName,
        password: invitation.requiresAccount && !usesClerkFlow ? password : undefined
      });
      setNotice(`Listo, ${user.fullName}. Te uniste a ${invitation.clinicName}.`);
      setTimeout(() => router.push(portalForRole(user.primaryRole)), 900);
    } catch (error) {
      setActionError(error instanceof Error && error.message ? error.message : "No pudimos aceptar la invitación.");
    } finally {
      setSaving(false);
    }
  }

  const blocked =
    invitation && (invitation.status !== "pending" || invitation.isExpired)
      ? invitation.isExpired
        ? "Esta invitación expiró. Pide una nueva al administrador de la clínica."
        : invitation.status === "accepted"
          ? "Esta invitación ya fue aceptada."
          : "Esta invitación ya no está disponible."
      : "";

  return (
    <AppShell>
      <PageHeader description="Únete a una clínica en Clinixa." title="Aceptar invitación" />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {missingInvite ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No se encontró la invitación. Verifica el enlace que recibiste.
          </div>
        ) : null}

        {loading && token && !loadError ? (
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-500">Cargando invitación...</div>
        ) : null}

        {loadError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div> : null}

        {invitation ? (
          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <Panel title="Invitación">
              <div className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{invitation.clinicName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {invitationRoleLabel(invitation.role, invitation.roleLabel)} · {specialtyLabelFor(invitation.specialty)}
                    </p>
                  </div>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Correo</dt>
                    <dd className="font-medium">{invitation.email}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Cédula</dt>
                    <dd className="font-medium">{invitation.licenseNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Estado</dt>
                    <dd className="font-medium">{invitationStatusLabel(invitation.status)}</dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <Panel title={usesClerkFlow ? "Confirma tu cuenta Clerk" : invitation.requiresAccount ? "Crea tu cuenta" : "Confirma tu cuenta"}>
              <div className="space-y-4 p-4">
                {notice ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 size={16} />
                    {notice}
                  </div>
                ) : null}

                {actionError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</div>
                ) : null}

                {blocked ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{blocked}</div>
                    <Link className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm text-slate-700" href="/sesion">
                      <LogIn size={16} />
                      Ir a iniciar sesión
                    </Link>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={submit}>
                    <label className="block">
                      <span className="text-xs font-medium uppercase text-slate-400">Nombre completo</span>
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                        onChange={(event) => setFullName(event.target.value)}
                        value={fullName}
                      />
                    </label>

                    {usesClerkFlow ? (
                      <div className="space-y-3 rounded-md border border-border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <p>Inicia sesión en Clerk con el correo de la invitación y después confirma para unirte.</p>
                        <Link className="inline-flex items-center gap-2 font-medium text-primary" href={`/sesion?redirect_url=${encodeURIComponent(returnUrl)}`}>
                          <LogIn size={16} />
                          Abrir acceso Clerk
                        </Link>
                      </div>
                    ) : invitation.requiresAccount ? (
                      <>
                        <label className="block">
                          <span className="text-xs font-medium uppercase text-slate-400">Contraseña</span>
                          <input
                            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            type="password"
                            value={password}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium uppercase text-slate-400">Confirmar contraseña</span>
                          <input
                            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            type="password"
                            value={confirmPassword}
                          />
                        </label>
                      </>
                    ) : (
                      <div className="rounded-md border border-border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Ya existe una cuenta con este correo.{" "}
                        {currentUser.email === invitation.email
                          ? "Confirma para unirte a la clínica."
                          : "Inicia sesión con esa cuenta y vuelve a este enlace para aceptar."}
                      </div>
                    )}

                    <button
                      className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      disabled={saving}
                      type="submit"
                    >
                      {invitation.requiresAccount && !usesClerkFlow ? <UserPlus size={16} /> : <ShieldCheck size={16} />}
                      {invitation.requiresAccount && !usesClerkFlow ? "Crear cuenta y unirme" : "Aceptar invitación"}
                    </button>
                  </form>
                )}
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
