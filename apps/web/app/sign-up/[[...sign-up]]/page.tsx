"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Activity, ArrowLeft, Stethoscope, UserRound } from "lucide-react";
import { useState } from "react";

type SignUpRole = "patient" | "professional";

const roleOptions: { value: SignUpRole; title: string; detail: string; icon: typeof UserRound }[] = [
  {
    value: "patient",
    title: "Soy paciente",
    detail: "Quiero agendar citas, ver mi expediente y dar seguimiento a mi atencion.",
    icon: UserRound
  },
  {
    value: "professional",
    title: "Soy profesional",
    detail: "Quiero gestionar pacientes, agenda y documentacion clinica.",
    icon: Stethoscope
  }
];

export default function SignUpPage() {
  const [role, setRole] = useState<SignUpRole | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link className="flex items-center gap-3" href="/bienvenida">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
          <Activity size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold">Clinixa</p>
          <p className="text-xs text-slate-500">Crear cuenta</p>
        </div>
      </Link>

      {role === null ? (
        <div className="w-full max-w-md rounded-md border border-border bg-white p-6">
          <h1 className="text-lg font-semibold">Como usaras Clinixa?</h1>
          <p className="mt-1 text-sm text-slate-500">
            Elige el tipo de cuenta. Definira tu portal y permisos al iniciar sesion.
          </p>

          <div className="mt-5 space-y-3">
            {roleOptions.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  className="flex w-full items-start gap-4 rounded-md border border-border bg-white p-4 text-left transition hover:border-primary hover:bg-slate-50"
                  key={option.value}
                  onClick={() => setRole(option.value)}
                  type="button"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-primary">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{option.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{option.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Ya tienes cuenta?{" "}
            <Link className="font-medium text-primary" href="/sign-in">
              Iniciar sesion
            </Link>
          </p>

          <p className="mt-4 text-center text-xs leading-5 text-slate-600">
            Al crear una cuenta aceptas el{" "}
            <Link className="text-primary underline-offset-2 hover:underline" href="/privacy" target="_blank">
              Aviso de Privacidad
            </Link>{" "}
            y los{" "}
            <Link className="text-primary underline-offset-2 hover:underline" href="/terms" target="_blank">
              Términos
            </Link>
            . Confirmarás tu consentimiento al completar tu perfil.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <button
            className="flex items-center gap-1 text-sm font-medium text-primary"
            onClick={() => setRole(null)}
            type="button"
          >
            <ArrowLeft size={15} />
            Cambiar tipo de cuenta ({role === "patient" ? "Paciente" : "Profesional"})
          </button>

          <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/onboarding" unsafeMetadata={{ role }} />
        </div>
      )}
    </main>
  );
}
