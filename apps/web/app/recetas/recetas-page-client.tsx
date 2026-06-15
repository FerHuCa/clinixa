"use client";

import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type Prescription } from "@/lib/healthhub-store";

type PrescriptionDraft = {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refills: number;
};

const EMPTY_DRAFT: PrescriptionDraft = {
  patientId: "",
  medicationName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  refills: 0,
};

export function RecetasPageClient() {
  const { currentUser, loadPrescriptions, createPrescription, patients, ready } = useHealthHubStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PrescriptionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    loadPrescriptions()
      .then(setPrescriptions)
      .catch(() => {
        setMessage({ kind: "error", text: "No se pudieron cargar las recetas." });
      })
      .finally(() => setLoading(false));
  }, [ready, loadPrescriptions]);

  async function handleCreate() {
    if (!draft.patientId || !draft.medicationName) {
      setMessage({ kind: "error", text: "Selecciona un paciente e ingresa el medicamento." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPrescription(draft);
      setPrescriptions((prev) => [created, ...prev]);
      setDraft(EMPTY_DRAFT);
      setMessage({ kind: "success", text: "Receta creada correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo crear la receta." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Historial de recetas por paciente."
        title="Recetas"
      />
      <div className="space-y-5 px-5 py-6 lg:px-8">
        {message ? (
          <div
            className={
              message.kind === "success"
                ? "rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
                : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message.text}
          </div>
        ) : null}

        <Panel title="Nueva receta">
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Paciente</span>
              <select
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))}
                value={draft.patientId}
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Medicamento</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, medicationName: e.target.value }))}
                  placeholder="Ej. Paracetamol 500 mg"
                  value={draft.medicationName}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Dosis</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))}
                  placeholder="Ej. 1 tableta"
                  value={draft.dosage}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Frecuencia</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
                  placeholder="Ej. Cada 8 horas"
                  value={draft.frequency}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-slate-400">Duración</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                  placeholder="Ej. 5 días"
                  value={draft.duration}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Indicaciones</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
                placeholder="Indicaciones adicionales para el paciente"
                value={draft.instructions}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Resurtidos:</span>
                <input
                  className="w-16 rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-teal-400"
                  min={0}
                  onChange={(e) => setDraft((d) => ({ ...d, refills: Number(e.target.value) }))}
                  type="number"
                  value={draft.refills}
                />
              </label>
              <button
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={handleCreate}
                type="button"
              >
                <Plus size={16} />
                {saving ? "Guardando..." : "Crear receta"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Historial de recetas">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Cargando recetas...</div>
          ) : prescriptions.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Aún no hay recetas registradas.</div>
          ) : (
            <div className="divide-y divide-border">
              {prescriptions.map((rx) => (
                <div className="flex items-start gap-3 p-4" key={rx.id}>
                  <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{rx.medicationName}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {rx.dosage} · {rx.frequency} · {rx.duration}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {rx.patientName} · {rx.issuedAt}
                    </p>
                    {rx.instructions ? (
                      <p className="mt-1 text-sm text-slate-600">{rx.instructions}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
