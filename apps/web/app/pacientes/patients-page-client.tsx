"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Plus, UserRound, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { useHealthHubStore } from "@/lib/healthhub-store";

const emptyForm = {
  fullName: "",
  age: "30",
  email: "",
  phone: "",
  focus: "",
  mainReason: ""
};

export function PatientsPageClient() {
  const { patients, addPatient } = useHealthHubStore();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createdPatientName, setCreatedPatientName] = useState("");
  const [saving, setSaving] = useState(false);

  const patientStats = useMemo(
    () => ({
      total: patients.length,
      active: patients.filter((patient) => patient.status === "active").length,
      pending: patients.filter((patient) => patient.status === "pending").length
    }),
    [patients]
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);

    try {
      const patient = await addPatient({
        fullName: String(formData.get("fullName") || "").trim(),
        age: Number(formData.get("age") || "0"),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        focus: String(formData.get("focus") || "").trim(),
        mainReason: String(formData.get("mainReason") || "").trim()
      });

      setCreatedPatientName(patient.fullName);
      setForm(emptyForm);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <button
            className="btn-primary"
            onClick={() => setFormOpen((current) => !current)}
            type="button"
          >
            {formOpen ? <X size={16} /> : <Plus size={16} />}
            {formOpen ? "Cerrar" : "Nuevo paciente"}
          </button>
        }
        description="Gestión de pacientes, estado de seguimiento y acceso al expediente."
        title="Pacientes"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {formOpen ? (
          <Panel title="Nuevo paciente">
            <form className="grid gap-4 p-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Nombre completo</span>
                <input
                  className="mt-1 w-full input"
                  name="fullName"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  required
                  value={form.fullName}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Edad</span>
                <input
                  className="mt-1 w-full input"
                  min="1"
                  name="age"
                  onChange={(event) => updateField("age", event.target.value)}
                  required
                  type="number"
                  value={form.age}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Correo</span>
                <input
                  className="mt-1 w-full input"
                  name="email"
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  type="email"
                  value={form.email}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Teléfono</span>
                <input
                  className="mt-1 w-full input"
                  name="phone"
                  onChange={(event) => updateField("phone", event.target.value)}
                  required
                  value={form.phone}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Foco de atención</span>
                <input
                  className="mt-1 w-full input"
                  name="focus"
                  onChange={(event) => updateField("focus", event.target.value)}
                  placeholder="Ej. Seguimiento nutricional"
                  required
                  value={form.focus}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Motivo principal</span>
                <input
                  className="mt-1 w-full input"
                  name="mainReason"
                  onChange={(event) => updateField("mainReason", event.target.value)}
                  placeholder="Ej. Control de hábitos"
                  required
                  value={form.mainReason}
                />
              </label>
              <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
                  onClick={() => setFormOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="btn-primary" disabled={saving} type="submit">
                  {saving ? "Guardando..." : "Guardar paciente"}
                </button>
              </div>
            </form>
          </Panel>
        ) : null}

        {createdPatientName ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Paciente creado: {createdPatientName}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={UserRound} label="Total registrados" value={`${patientStats.total}`} />
          <StatCard icon={UserRound} label="Activos" value={`${patientStats.active}`} />
          <StatCard icon={UserRound} label="Pendientes" value={`${patientStats.pending}`} />
        </div>

        <Panel title="Lista de pacientes">
          {patients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <UserRound size={22} />
              </div>
              <p className="text-sm text-muted-foreground">Aún no tienes pacientes registrados.</p>
              <button
                className="btn-primary"
                onClick={() => setFormOpen(true)}
                type="button"
              >
                <Plus size={16} />
                Registrar mi primer paciente
              </button>
            </div>
          ) : (
          <div className="divide-y divide-border">
            {patients.map((patient) => (
              <Link
                className="grid gap-4 px-4 py-4 transition hover:bg-muted/60 lg:grid-cols-[64px_1fr_130px_160px_140px]"
                href={`/pacientes/${patient.id}`}
                key={patient.id}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground/80">
                  {patient.initials}
                </div>
                <div>
                  <p className="font-medium">{patient.fullName}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {patient.email} · {patient.phone}
                  </p>
                </div>
                <StatusPill label={patient.statusLabel} status={patient.status} />
                <div>
                  <p className="text-sm font-medium">{patient.nextAppointment}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Próxima cita</p>
                </div>
                <p className="text-sm text-muted-foreground">{patient.focus}</p>
              </Link>
            ))}
          </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
