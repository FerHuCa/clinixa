import Link from "next/link";
import { Activity, CalendarDays, ClipboardList, ShieldCheck, UserRound } from "lucide-react";
import { LegalFooter } from "@/components/legal-footer";

const features = [
  { icon: UserRound, title: "Pacientes", detail: "Expediente único y continuidad de atención." },
  { icon: CalendarDays, title: "Agenda", detail: "Solicitudes, confirmaciones y citas del día en un solo calendario." },
  { icon: ClipboardList, title: "Notas SOAP", detail: "Documentación clínica estructurada." },
  { icon: ShieldCheck, title: "Seguridad", detail: "Roles, permisos y acceso protegido." }
];

export default function WelcomePage() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-5 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold">Clinixa</p>
            <p className="text-xs text-slate-500">Continuidad de atención</p>
          </div>
        </div>
        <Link className="-m-2 p-2 text-sm font-medium text-primary" href="/sign-in">
          Iniciar sesión
        </Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center lg:py-24">
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-primary">
          Plataforma clínica para profesionales de la salud
        </span>
        <h1 className="mt-6 text-3xl font-semibold leading-tight text-foreground lg:text-5xl">
          Agenda, pacientes, expediente y cobros en un solo lugar
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
          Clinixa reúne la agenda, el expediente clínico y los cobros de tu consulta para que dediques tu
          tiempo a la atención de cada paciente, no a la administración.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            href="/sign-up"
          >
            Crear cuenta
          </Link>
          <Link
            className="rounded-md border border-border bg-white px-6 py-3 text-sm font-medium text-foreground transition hover:bg-slate-50"
            href="/sign-in"
          >
            Iniciar sesión
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" ? (
          <Link className="mt-6 text-sm text-slate-500 underline-offset-4 hover:underline" href="/sesion">
            Acceso de desarrollo
          </Link>
        ) : null}
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <div className="rounded-md border border-border bg-white p-5" key={feature.title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-primary">
                <Icon size={20} />
              </div>
              <p className="mt-4 font-semibold">{feature.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{feature.detail}</p>
            </div>
          );
        })}
      </section>

      <LegalFooter />
    </main>
  );
}
