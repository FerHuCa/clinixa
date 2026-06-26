"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { useHealthHubStore } from "@/lib/healthhub-store";

const emptyForm = {
  patientId: "",
  date: new Date().toISOString().slice(0, 10),
  time: "11:30",
  duration: "50 min",
  type: "Seguimiento",
  reason: ""
};

export function AgendaPageClient() {
  const { appointments, patients, addAppointment } = useHealthHubStore();
  const [form, setForm] = useState(emptyForm);
  const [createdAppointment, setCreatedAppointment] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((first, second) => {
        const firstValue = `${first.date} ${first.time}`;
        const secondValue = `${second.date} ${second.time}`;
        return firstValue.localeCompare(secondValue);
      }),
    [appointments]
  );

  const formPatientId = form.patientId || patients[0]?.id || "";

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    const nextForm = {
      patientId: String(formData.get("patientId") || formPatientId),
      date: String(formData.get("date") || form.date),
      time: String(formData.get("time") || form.time),
      duration: String(formData.get("duration") || form.duration),
      type: String(formData.get("type") || form.type),
      reason: String(formData.get("reason") || "").trim()
    };

    try {
      const appointment = await addAppointment(nextForm);

      if (!appointment) {
        return;
      }

      setCreatedAppointment(`${appointment.patientName} · ${appointment.date} ${appointment.time}`);
      setForm({ ...emptyForm, patientId: nextForm.patientId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <a className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white" href="#crear-cita">
            <CalendarPlus size={16} />
            Nueva cita
          </a>
        }
        description="Calendario operativo para programar, completar y revisar citas."
        title="Agenda"
      />

      <div className="grid gap-5 px-5 py-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="space-y-5">
          {createdAppointment ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Cita creada: {createdAppointment}
            </div>
          ) : null}

          <Panel title="Próximas citas">
            {sortedAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-50 text-primary">
                  <CalendarPlus size={22} />
                </div>
                <p className="text-sm text-slate-600">Aún no tienes citas programadas.</p>
                <a
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
                  href="#crear-cita"
                >
                  <CalendarPlus size={16} />
                  Crear la primera cita
                </a>
              </div>
            ) : (
            <div className="divide-y divide-border">
              {sortedAppointments.map((appointment) => (
                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[100px_1fr_140px_130px]" key={appointment.id}>
                  <div>
                    <p className="text-sm font-semibold">{appointment.date}</p>
                    <p className="mt-1 text-sm text-slate-500">{appointment.time}</p>
                  </div>
                  <div>
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="mt-1 text-sm text-slate-500">{appointment.reason}</p>
                  </div>
                  <p className="text-sm text-slate-600">{appointment.type}</p>
                  <StatusPill label={appointment.statusLabel} status={appointment.status} />
                </div>
              ))}
            </div>
            )}
          </Panel>
        </section>

        <aside className="space-y-5">
          <Panel title="Crear cita">
            <form className="space-y-4 p-4 text-sm" id="crear-cita" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-600">Paciente</span>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                  name="patientId"
                  onChange={(event) => updateField("patientId", event.target.value)}
                  required
                  value={formPatientId}
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-600">Fecha</span>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                    name="date"
                    onChange={(event) => updateField("date", event.target.value)}
                    onInput={(event) => updateField("date", event.currentTarget.value)}
                    required
                    type="date"
                    value={form.date}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-600">Hora</span>
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
                    <Clock size={16} className="text-slate-400" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      name="time"
                      onChange={(event) => updateField("time", event.target.value)}
                      onInput={(event) => updateField("time", event.currentTarget.value)}
                      required
                      type="time"
                      value={form.time}
                    />
                  </div>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-600">Duración</span>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                    name="duration"
                    onChange={(event) => updateField("duration", event.target.value)}
                    value={form.duration}
                  >
                    <option>30 min</option>
                    <option>45 min</option>
                    <option>50 min</option>
                    <option>60 min</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-600">Tipo</span>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                    name="type"
                    onChange={(event) => updateField("type", event.target.value)}
                    value={form.type}
                  >
                    <option>Primera consulta</option>
                    <option>Seguimiento</option>
                    <option>Evaluación</option>
                    <option>Rehabilitación</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-600">Motivo</span>
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                  name="reason"
                  onChange={(event) => updateField("reason", event.target.value)}
                  placeholder="Escribir motivo de consulta"
                  required
                  value={form.reason}
                />
              </label>

              <button className="w-full rounded-md bg-primary px-3 py-2 font-medium text-white disabled:opacity-60" disabled={saving} type="submit">
                {saving ? "Guardando..." : "Guardar cita"}
              </button>
            </form>
          </Panel>

          <Panel title="Estados">
            <div className="space-y-3 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Programadas</span>
                <strong>{appointments.filter((appointment) => appointment.status === "scheduled" || appointment.status === "confirmed").length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Completadas</span>
                <strong>{appointments.filter((appointment) => appointment.status === "completed").length}</strong>
              </div>
            </div>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}
