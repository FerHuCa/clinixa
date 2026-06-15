"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, CalendarDays, ClipboardCheck, ClipboardList, HeartPulse, Home, LogIn, Pill, Settings, ShieldCheck, UserRound } from "lucide-react";
import { clsx } from "clsx";
import { LegalFooter } from "@/components/legal-footer";
import { useHealthHubStore, type SubscriptionStatus } from "@/lib/healthhub-store";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  specialty?: string[];
};

const allNavItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, roles: ["professional", "internal_admin"] },
  { href: "/pacientes", label: "Pacientes", icon: UserRound, roles: ["professional", "internal_admin"] },
  { href: "/portal-paciente", label: "Portal paciente", icon: HeartPulse, roles: ["patient", "internal_admin"] },
  { href: "/portal-profesional", label: "Configuración", icon: Settings, roles: ["professional", "internal_admin"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["professional", "internal_admin"] },
  { href: "/expediente", label: "Expediente", icon: ClipboardList, roles: ["professional", "internal_admin"] },
  { href: "/recetas", label: "Recetas", icon: Pill, roles: ["professional"], specialty: ["doctor"] },
  { href: "/tareas-paciente", label: "Tareas", icon: ClipboardCheck, roles: ["professional"], specialty: ["psychologist"] },
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, roles: ["clinic_admin", "internal_admin"] },
  { href: "/sesion", label: "Sesión", icon: LogIn, roles: ["patient", "professional", "clinic_admin", "internal_admin"] }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

function getNavItems(userRole: string, userSpecialty: string | null): NavItem[] {
  return allNavItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (item.specialty && (!userSpecialty || !item.specialty.includes(userSpecialty))) return false;
    return true;
  });
}

function getHomeHref(userRole: string): string {
  switch (userRole) {
    case "patient":
      return "/portal-paciente";
    case "clinic_admin":
      return "/seguridad";
    default:
      return "/";
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, loadSubscription, ready, sessionError, apiStatus } = useHealthHubStore();
  const [subscriptionState, setSubscriptionState] = useState<{ userId: string; data: SubscriptionStatus | null } | null>(null);

  const isProfessional = ready && !sessionError && currentUser.primaryRole === "professional";

  // Estado del trial solo para profesionales. loadSubscription degrada a null si el
  // endpoint falla (sin errores en consola): en ese caso no se muestra ningún banner.
  useEffect(() => {
    if (!isProfessional) {
      return;
    }

    let cancelled = false;

    loadSubscription().then((next) => {
      if (!cancelled) {
        setSubscriptionState({ data: next, userId: currentUser.id });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, isProfessional, loadSubscription]);

  // El estado queda amarrado al usuario que lo cargó: al cambiar de sesión no se
  // muestra el trial de la identidad anterior mientras llega el nuevo.
  const subscription = subscriptionState && subscriptionState.userId === currentUser.id ? subscriptionState.data : null;

  // En /suscripcion la página ya muestra el estado completo del plan: sin banner.
  const trialBanner = isProfessional && subscription && !pathname.startsWith("/suscripcion") ? subscription : null;
  // Hasta que la sesion no este resuelta no filtramos el nav por rol ni enlazamos
  // el logo a una ruta por rol: evita renderizar el menu/destino de una identidad
  // seed/stale. Con sessionError el rol es "guest" y tampoco hay menu.
  const navReady = ready && !sessionError;
  const navItems = navReady ? getNavItems(currentUser.primaryRole, currentUser.specialty ?? null) : [];
  // Logo inerte mientras no haya sesion: apunta a la ruta actual (no a "/" con rol
  // equivocado).
  const homeHref = navReady ? getHomeHref(currentUser.primaryRole) : pathname || "#";

  return (
    <main className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-white px-5 py-6 lg:block">
        <Link className="flex items-center gap-3" href={homeHref}>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
            <Activity size={22} />
          </div>
          <p className="text-sm font-semibold">Clinixa</p>
        </Link>

        <nav className="mt-10 space-y-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                className={clsx(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition",
                  active ? "bg-teal-50 font-medium text-primary" : "text-slate-700 hover:bg-slate-100"
                )}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Link className="flex items-center gap-2" href={homeHref}>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
              <Activity size={19} />
            </div>
            <span className="text-sm font-semibold">Clinixa</span>
          </Link>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                className={clsx(
                  "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2",
                  active ? "border-teal-200 bg-teal-50 text-primary" : "border-border bg-white text-slate-700"
                )}
                href={item.href}
                key={item.href}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="lg:pl-64">
        {sessionError ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:px-8">
            No pudimos validar tu sesión.{" "}
            <Link className="font-medium underline underline-offset-2" href="/sesion">
              Inicia sesión de nuevo
            </Link>
            .
          </div>
        ) : apiStatus === "fallback" ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:px-8">
            Modo demostración: mostrando datos de ejemplo sin conexión al servidor.
          </div>
        ) : null}
        {trialBanner ? (
          trialBanner.status === "trial" ? (
            <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800 lg:px-8">
              Prueba gratuita: {trialBanner.daysLeft === 1 ? "te queda 1 día" : `te quedan ${trialBanner.daysLeft} días`} ·{" "}
              <Link className="font-medium underline underline-offset-2" href="/suscripcion">
                Ver planes
              </Link>
            </div>
          ) : (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:px-8">
              Tu periodo de prueba terminó ·{" "}
              <Link className="font-medium underline underline-offset-2" href="/suscripcion">
                Activa tu plan
              </Link>
            </div>
          )
        ) : null}
        {children}
        <LegalFooter />
      </section>
    </main>
  );
}
