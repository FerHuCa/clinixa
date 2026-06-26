"use client";

import { useEffect, useState } from "react";
import { BarChart2, CheckCircle2, DollarSign, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { UserMenu } from "@/components/user-menu";
import { getAuthHeaders } from "@/lib/auth-client";
import { useHealthHubStore } from "@/lib/healthhub-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5050";

type AnalyticsPeriod = {
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  activePatients: number;
  grossTotal: number;
  commissionTotal: number;
  netTotal: number;
};

type AnalyticsData = {
  currentMonth: string;
  thisMonth: AnalyticsPeriod;
  lifetime: AnalyticsPeriod;
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1)
  );
}

/** Bar que muestra `value` como proporción de `max` (mínimo 4px para que sea visible). */
function ProportionBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

function PeriodSection({ label, data, lifetime }: { label: string; data: AnalyticsPeriod; lifetime: AnalyticsPeriod }) {
  const totalAppts = data.appointmentsScheduled + data.appointmentsCompleted;
  const lifetimeAppts = lifetime.appointmentsScheduled + lifetime.appointmentsCompleted;

  return (
    <Panel>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas programadas"
          value={String(data.appointmentsScheduled)}
          icon={BarChart2}
        />
        <StatCard
          label="Citas completadas"
          value={String(data.appointmentsCompleted)}
          icon={CheckCircle2}
        />
        <StatCard
          label="Pacientes activos"
          value={String(data.activePatients)}
          icon={Users}
        />
        <StatCard
          label="Ingresos netos"
          value={money(data.netTotal)}
          icon={DollarSign}
          detail={`Bruto ${money(data.grossTotal)} · Comisión ${money(data.commissionTotal)}`}
        />
      </div>

      {/* Barras de proporción para citas y pagos */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-500">
            Citas completadas vs. total ({totalAppts > 0 ? Math.round((data.appointmentsCompleted / totalAppts) * 100) : 0}%)
          </p>
          <ProportionBar
            value={data.appointmentsCompleted}
            max={totalAppts}
            colorClass="bg-teal-500"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-600">
            <span>{data.appointmentsCompleted} completadas</span>
            <span>{totalAppts} total</span>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-slate-500">
            Este período vs. todos los tiempos ({lifetimeAppts > 0 ? Math.round((totalAppts / lifetimeAppts) * 100) : 0}%)
          </p>
          <ProportionBar
            value={totalAppts}
            max={lifetimeAppts}
            colorClass="bg-blue-500"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-600">
            <span>{totalAppts} citas</span>
            <span>{lifetimeAppts} en total</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function AnalyticsClient() {
  const { currentUser } = useHealthHubStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/api/professional-portal/analytics`, { headers });

        if (!res.ok) {
          setError(`Error ${res.status}: no se pudieron cargar los datos.`);
          return;
        }

        const json = (await res.json()) as AnalyticsData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("No se pudo conectar con el servidor.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = currentUser?.fullName ?? "";
  const header = (
    <PageHeader
      title="Analytics"
      description="Resumen de tu actividad"
      action={<UserMenu fullName={fullName} />}
    />
  );

  if (loading) {
    return (
      <AppShell>
        {header}
        <div className="p-8 text-center text-slate-500">Cargando...</div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        {header}
        <div className="p-8 text-center text-red-500">{error ?? "Sin datos."}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {header}
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <PeriodSection
          label={monthLabel(data.currentMonth)}
          data={data.thisMonth}
          lifetime={data.lifetime}
        />
        <PeriodSection
          label="Todos los tiempos"
          data={data.lifetime}
          lifetime={data.lifetime}
        />
      </div>
    </AppShell>
  );
}
