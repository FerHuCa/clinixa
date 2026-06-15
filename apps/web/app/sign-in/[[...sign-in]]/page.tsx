import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Activity } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Link className="flex items-center gap-3" href="/bienvenida">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
          <Activity size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold">Clinixa</p>
          <p className="text-xs text-slate-500">Iniciar sesion</p>
        </div>
      </Link>

      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/onboarding" />

      <p className="text-center text-xs leading-5 text-slate-400">
        Consulta el{" "}
        <Link className="text-primary underline-offset-2 hover:underline" href="/privacy" target="_blank">
          Aviso de Privacidad
        </Link>{" "}
        y los{" "}
        <Link className="text-primary underline-offset-2 hover:underline" href="/terms" target="_blank">
          Términos y Condiciones
        </Link>
        .
      </p>
    </main>
  );
}
