"use client";

import { useEffect, useState } from "react";
import { Download, Plus, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type Prescription } from "@/lib/healthhub-store";
import { getAuthHeaders } from "@/lib/auth-client";

type PrescriptionDraft = {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
  refills: number;
  patientIdentifier: string;
};

const EMPTY_DRAFT: PrescriptionDraft = {
  patientId: "",
  medicationName: "",
  dosage: "",
  frequency: "",
  duration: "",
  route: "",
  instructions: "",
  refills: 0,
  patientIdentifier: "",
};

// Vías de administración comunes en México (no controladas)
const ROUTES = [
  "Oral",
  "Sublingual",
  "Tópica",
  "Inhalatoria",
  "Ótica",
  "Oftálmica",
  "Nasal",
  "Rectal",
  "Vaginal",
  "Subcutánea",
  "Intramuscular",
  "Intravenosa",
  "Transdérmica",
  "Otra",
];

export function RecetasPageClient() {
  const { currentUser, loadPrescriptions, createPrescription, patients, ready, apiBaseUrl } = useHealthHubStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PrescriptionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    if (!draft.route) {
      setMessage({ kind: "error", text: "La vía de administración es obligatoria para una receta válida." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPrescription({
        patientId: draft.patientId,
        medicationName: draft.medicationName,
        dosage: draft.dosage,
        frequency: draft.frequency,
        duration: draft.duration,
        route: draft.route,
        instructions: draft.instructions,
        refills: draft.refills,
        patientIdentifier: draft.patientIdentifier || undefined,
      });
      setPrescriptions((prev) => [created, ...prev]);
      setDraft(EMPTY_DRAFT);
      setMessage({ kind: "success", text: "Receta creada correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo crear la receta." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf(rx: Prescription) {
    setDownloadingId(rx.id);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${apiBaseUrl}/api/prescriptions/${rx.id}/pdf`, {
        headers,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receta-${rx.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ kind: "error", text: "No se pudo descargar el PDF." });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Historial de recetas por paciente. Solo médicos pueden emitir recetas."
        title="Recetas"
      />
      <div className="space-y-5 px-5 py-6 lg:px-8">
        {message ? (
          <div
            className={
              message.kind === "success"
                ? "rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary-strong"
                : "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            }
          >
            {message.text}
          </div>
        ) : null}

        <Panel title="Nueva receta">
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="text-xs font-medium uppercase text-muted-foreground">Paciente</span>
              <select
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(e) => setDraft((d) => ({ ...d, patientId: e.target.value }))}
                value={draft.patientId}
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-muted-foreground/70">
                Identificador del paciente <span className="normal-case text-muted-foreground/50">(CURP, fecha nac. — opcional)</span>
              </span>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(e) => setDraft((d) => ({ ...d, patientIdentifier: e.target.value }))}
                placeholder="Ej. LOOA881212HDFPLS09 o 12/12/1988"
                value={draft.patientIdentifier}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Medicamento</span>
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(e) => setDraft((d) => ({ ...d, medicationName: e.target.value }))}
                  placeholder="Ej. Paracetamol 500 mg"
                  value={draft.medicationName}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Dosis</span>
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))}
                  placeholder="Ej. 1 tableta"
                  value={draft.dosage}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Vía de administración <span className="text-rose-400">*</span>
                </span>
                <select
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(e) => setDraft((d) => ({ ...d, route: e.target.value }))}
                  value={draft.route}
                >
                  <option value="">Seleccionar vía</option>
                  {ROUTES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Frecuencia</span>
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
                  placeholder="Ej. Cada 8 horas"
                  value={draft.frequency}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-muted-foreground">Duración</span>
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                  placeholder="Ej. 5 días"
                  value={draft.duration}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium uppercase text-muted-foreground">Indicaciones</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
                placeholder="Indicaciones adicionales para el paciente"
                value={draft.instructions}
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Resurtidos:</span>
                <input
                  className="w-16 rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  min={0}
                  onChange={(e) => setDraft((d) => ({ ...d, refills: Number(e.target.value) }))}
                  type="number"
                  value={draft.refills}
                />
              </label>
              <button
                className="btn-primary w-full sm:w-auto"
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
            <div className="p-4 text-sm text-muted-foreground">Cargando recetas...</div>
          ) : prescriptions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Aún no hay recetas registradas.</div>
          ) : (
            <div className="divide-y divide-border">
              {prescriptions.map((rx) => (
                <div className="flex items-start gap-3 p-4" key={rx.id}>
                  <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{rx.medicationName}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {rx.dosage}
                      {rx.route ? ` · ${rx.route}` : ""}
                      {" · "}{rx.frequency} · {rx.duration}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {rx.patientName} · {rx.issuedAt}
                    </p>
                    {rx.prescriberName ? (
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        Dr. {rx.prescriberName}
                        {rx.prescriberLicense ? ` · Céd. ${rx.prescriberLicense}` : ""}
                      </p>
                    ) : null}
                    {rx.instructions ? (
                      <p className="mt-1 text-sm text-muted-foreground">{rx.instructions}</p>
                    ) : null}
                  </div>
                  <button
                    aria-label="Imprimir / Descargar PDF"
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 disabled:opacity-50"
                    disabled={downloadingId === rx.id}
                    onClick={() => handleDownloadPdf(rx)}
                    title="Imprimir / Descargar PDF"
                    type="button"
                  >
                    <Download size={16} />
                    {downloadingId === rx.id ? "..." : "PDF"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
