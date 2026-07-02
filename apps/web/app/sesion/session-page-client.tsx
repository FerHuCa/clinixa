"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { CheckCircle2, LogIn, ShieldCheck, Stethoscope, UserPlus, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { clearDevUserId, clerkEnabled, devAuthEnabled, readDevUserId } from "@/lib/auth-client";
import { useHealthHubStore, type DemoSession } from "@/lib/healthhub-store";

function roleLabel(role: string) {
  if (role === "professional") {
    return "Profesional";
  }

  if (role === "clinic_admin") {
    return "Admin de clínica";
  }

  if (role === "internal_admin") {
    return "Admin Clinixa";
  }

  return "Paciente";
}

function roleIcon(session: DemoSession) {
  if (session.primaryRole === "professional") {
    return Stethoscope;
  }

  if (session.primaryRole === "clinic_admin" || session.primaryRole === "internal_admin") {
    return ShieldCheck;
  }

  return UserRound;
}

function ClerkAccessPanel() {
  const { isLoaded, isSignedIn } = useAuth();
  const { refreshSession } = useHealthHubStore();
  const synchronized = useRef(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && !readDevUserId() && !synchronized.current) {
      synchronized.current = true;
      void refreshSession();
    }
  }, [isLoaded, isSignedIn, refreshSession]);

  return (
    <Panel title="Acceso con Clerk">
      <div className="flex min-h-48 items-center justify-center p-4">
        {!isSignedIn ? (
          <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
            <p className="text-sm text-slate-600">
              Inicia sesión o crea una cuenta para acceder a Clinixa con tu usuario real.
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                href="/sign-in"
              >
                <LogIn size={16} />
                Iniciar sesión
              </Link>
              <Link
                className="flex items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
                href="/sign-up"
              >
                <UserPlus size={16} />
                Crear cuenta
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-md border border-border bg-white p-4">
            <UserButton />
            <div>
              <p className="font-semibold">Sesión Clerk activa</p>
              <p className="mt-1 text-sm text-slate-500">La API valida el JWT y aplica los permisos guardados en Clinixa.</p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function SessionPageClient() {
  const { currentUser, demoSessions, refreshSession, setDemoSession } = useHealthHubStore();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const portalHref =
    currentUser.primaryRole === "professional"
      ? "/portal-profesional"
      : currentUser.primaryRole === "clinic_admin" || currentUser.primaryRole === "internal_admin"
        ? "/seguridad"
        : "/portal-paciente";

  async function activateDeveloperSession(session: DemoSession) {
    setSaving(true);
    setNotice("");
    setError("");

    try {
      await setDemoSession(session.id);
      setNotice(`Sesión de desarrollo activa: ${session.fullName}`);
    } catch {
      setError("No se pudo activar la sesión de desarrollo.");
    } finally {
      setSaving(false);
    }
  }

  async function returnToClerkSession() {
    clearDevUserId();
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const user = await refreshSession();
      setNotice(`Sesión Clerk activa: ${user.fullName}`);
    } catch {
      setError("Inicia sesión con Clerk para salir del modo de desarrollo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Link className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white" href={portalHref}>
            <LogIn size={16} />
            Ir al portal
          </Link>
        }
        description="Clerk para usuarios reales y acceso aislado para pruebas locales."
        title="Sesión"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {notice ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>
        ) : null}

        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        {clerkEnabled ? <ClerkAccessPanel /> : null}

        {!clerkEnabled ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Clerk no está configurado. Define las variables `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`.
          </div>
        ) : null}

        {devAuthEnabled ? (
          <Panel
            action={
              clerkEnabled && readDevUserId() ? (
                <button className="text-sm font-medium text-primary" disabled={saving} onClick={returnToClerkSession} type="button">
                  Volver a Clerk
                </button>
              ) : null
            }
            title="Acceso de desarrollo"
          >
            <div className="border-b border-border bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Disponible solamente en entorno de desarrollo. Permite revisar roles sin crear cuentas en Clerk.
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {demoSessions.map((session) => {
                const Icon = roleIcon(session);
                const active = readDevUserId() === session.id;

                return (
                  <button
                    className="flex min-h-32 items-start gap-4 rounded-md border border-border bg-white p-4 text-left transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={saving}
                    key={session.id}
                    onClick={() => activateDeveloperSession(session)}
                    type="button"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{session.fullName}</p>
                        {active ? (
                          <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={13} />
                            Activa
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-500">{session.email}</p>
                      <p className="mt-3 text-sm font-medium text-slate-700">{roleLabel(session.primaryRole)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
