"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ClipboardList, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { useHealthHubStore } from "@/lib/healthhub-store";
import type { SoapStatus } from "@/lib/demo-data";

const emptyForm = {
  patientId: "",
  title: "Nota SOAP",
  date: new Date().toISOString().slice(0, 10),
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  status: "draft" as SoapStatus
};

export function ExpedientePageClient() {
  const { patients, soapNotes, addSoapNote } = useHealthHubStore();
  const [form, setForm] = useState(emptyForm);
  const [savedNote, setSavedNote] = useState("");
  const [saving, setSaving] = useState(false);

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
      title: String(formData.get("title") || "").trim(),
      date: String(formData.get("date") || form.date),
      subjective: String(formData.get("subjective") || "").trim(),
      objective: String(formData.get("objective") || "").trim(),
      assessment: String(formData.get("assessment") || "").trim(),
      plan: String(formData.get("plan") || "").trim(),
      status: String(formData.get("status") || "draft") as SoapStatus
    };

    try {
      const note = await addSoapNote({
        ...nextForm,
        aiGenerated: false
      });

      if (!note) {
        return;
      }

      setSavedNote(`${note.patientName} · ${note.title}`);
      setForm({ ...emptyForm, patientId: nextForm.patientId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        description="Notas SOAP y seguimiento clínico documentado por el profesional."
        title="Expediente"
      />

      <div className="grid gap-5 px-5 py-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <section className="space-y-5">
          {savedNote ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Nota guardada: {savedNote}
            </div>
          ) : null}

          <Panel title="Notas SOAP recientes">
            {soapNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-50 text-primary">
                  <ClipboardList size={22} />
                </div>
                <p className="text-sm text-slate-600">Aún no hay notas SOAP en el expediente.</p>
                <a
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
                  href="#borrador-soap"
                >
                  <Save size={16} />
                  Crear la primera nota
                </a>
              </div>
            ) : (
            <div className="divide-y divide-border">
              {soapNotes.map((note) => (
                <Link className="block px-4 py-4 transition hover:bg-slate-50" href={`/pacientes/${note.patientId}`} key={note.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{note.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {note.patientName} · {note.date}
                      </p>
                    </div>
                    <StatusPill label={note.statusLabel} status={note.status} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase text-slate-600">Evaluación</p>
                      <p className="mt-1 text-slate-700">{note.assessment}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase text-slate-600">Plan</p>
                      <p className="mt-1 text-slate-700">{note.plan}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            )}
          </Panel>
        </section>

        <aside className="space-y-5">
          <Panel title="Borrador SOAP">
            <form className="scroll-mt-28 space-y-4 p-4 text-sm" id="borrador-soap" onSubmit={handleSubmit}>
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

              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-600">Título</span>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                    name="title"
                    onChange={(event) => updateField("title", event.target.value)}
                    required
                    value={form.title}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-slate-600">Fecha</span>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                    name="date"
                    onChange={(event) => updateField("date", event.target.value)}
                    required
                    type="date"
                    value={form.date}
                  />
                </label>
              </div>

              <div className="grid gap-3">
                {[
                  ["subjective", "Subjetivo"],
                  ["objective", "Objetivo"],
                  ["assessment", "Evaluación"],
                  ["plan", "Plan"]
                ].map(([field, label]) => (
                  <label className="block" key={field}>
                    <span className="text-xs font-medium uppercase text-slate-600">{label}</span>
                    <textarea
                      className="mt-1 min-h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                      name={field}
                      onChange={(event) => updateField(field as keyof typeof form, event.target.value)}
                      placeholder={`Escribir contenido de ${label.toLowerCase()}`}
                      required
                      value={form[field as keyof typeof form]}
                    />
                  </label>
                ))}
              </div>

              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-600">Estado</span>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
                  name="status"
                  onChange={(event) => updateField("status", event.target.value)}
                  value={form.status}
                >
                  <option value="draft">Borrador</option>
                  <option value="finalized">Finalizada</option>
                </select>
              </label>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 font-medium text-white disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Save size={16} />
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </Panel>

          <Panel title="Alcance actual">
            <div className="p-4 text-sm leading-6 text-slate-600">
              Las notas SOAP se capturan manualmente. La generación asistida y los resúmenes automáticos llegarán en una fase posterior.
            </div>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}
