"use client";

import { useEffect, useState } from "react";
import { Plus, Salad, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import {
  useHealthHubStore,
  type PatientDiet,
  type BodyMeasurement,
} from "@/lib/healthhub-store";

// ── Dietas tab ──────────────────────────────────────────────────────────────

type DietDraft = {
  patientId: string;
  title: string;
  content: string;
  validFrom: string;
  validUntil: string;
};
const EMPTY_DIET: DietDraft = { patientId: "", title: "", content: "", validFrom: "", validUntil: "" };

// ── Progreso tab ─────────────────────────────────────────────────────────────

type MeasurementDraft = {
  patientId: string;
  measuredAt: string;
  weightKg: string;
  heightCm: string;
  waistCm: string;
  hipCm: string;
  armCm: string;
  bodyFatPercentage: string;
  muscleMassKg: string;
  notes: string;
};
const EMPTY_MEASUREMENT: MeasurementDraft = {
  patientId: "", measuredAt: "", weightKg: "", heightCm: "",
  waistCm: "", hipCm: "", armCm: "", bodyFatPercentage: "", muscleMassKg: "", notes: "",
};

function parseOptionalDecimal(val: string): number | undefined {
  if (!val.trim()) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

// ── Page ────────────────────────────────────────────────────────────────────

type ActiveTab = "dietas" | "progreso";

export function NutricionPageClient() {
  const {
    currentUser, patients, ready,
    loadPatientDiets, createPatientDiet,
    loadBodyMeasurements, createBodyMeasurement,
  } = useHealthHubStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("dietas");
  const [diets, setDiets] = useState<PatientDiet[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(true);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);
  const [dietDraft, setDietDraft] = useState<DietDraft>(EMPTY_DIET);
  const [measurementDraft, setMeasurementDraft] = useState<MeasurementDraft>(EMPTY_MEASUREMENT);
  const [savingDiet, setSavingDiet] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    loadPatientDiets()
      .then(setDiets)
      .catch(() => setMessage({ kind: "error", text: "No se pudieron cargar las dietas." }))
      .finally(() => setLoadingDiets(false));
    loadBodyMeasurements()
      .then(setMeasurements)
      .catch(() => setMessage({ kind: "error", text: "No se pudieron cargar las medidas." }))
      .finally(() => setLoadingMeasurements(false));
  }, [ready, loadPatientDiets, loadBodyMeasurements]);

  async function handleCreateDiet() {
    if (!dietDraft.patientId || !dietDraft.title || !dietDraft.validFrom) {
      setMessage({ kind: "error", text: "Selecciona un paciente, ingresa el título y la fecha de inicio." });
      return;
    }
    setSavingDiet(true);
    setMessage(null);
    try {
      const created = await createPatientDiet({
        patientId: dietDraft.patientId,
        title: dietDraft.title,
        content: dietDraft.content,
        validFrom: dietDraft.validFrom,
        validUntil: dietDraft.validUntil || undefined,
      });
      setDiets((prev) => [created, ...prev]);
      setDietDraft(EMPTY_DIET);
      setMessage({ kind: "success", text: "Dieta creada correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo crear la dieta." });
    } finally {
      setSavingDiet(false);
    }
  }

  async function handleCreateMeasurement() {
    if (!measurementDraft.patientId || !measurementDraft.measuredAt) {
      setMessage({ kind: "error", text: "Selecciona un paciente y la fecha de medición." });
      return;
    }
    setSavingMeasurement(true);
    setMessage(null);
    try {
      const created = await createBodyMeasurement({
        patientId: measurementDraft.patientId,
        measuredAt: measurementDraft.measuredAt,
        weightKg: parseOptionalDecimal(measurementDraft.weightKg),
        heightCm: parseOptionalDecimal(measurementDraft.heightCm),
        waistCm: parseOptionalDecimal(measurementDraft.waistCm),
        hipCm: parseOptionalDecimal(measurementDraft.hipCm),
        armCm: parseOptionalDecimal(measurementDraft.armCm),
        bodyFatPercentage: parseOptionalDecimal(measurementDraft.bodyFatPercentage),
        muscleMassKg: parseOptionalDecimal(measurementDraft.muscleMassKg),
        notes: measurementDraft.notes || undefined,
      });
      setMeasurements((prev) => [created, ...prev]);
      setMeasurementDraft(EMPTY_MEASUREMENT);
      setMessage({ kind: "success", text: "Medidas registradas correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudieron guardar las medidas." });
    } finally {
      setSavingMeasurement(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Gestiona planes de alimentación y el progreso corporal de tus pacientes."
        title="Nutrición"
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

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "dietas"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
            onClick={() => setActiveTab("dietas")}
            type="button"
          >
            <Salad size={16} />
            Dietas
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "progreso"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
            onClick={() => setActiveTab("progreso")}
            type="button"
          >
            <TrendingUp size={16} />
            Progreso
          </button>
        </div>

        {/* Dietas tab */}
        {activeTab === "dietas" ? (
          <>
            <Panel title="Nueva dieta">
              <div className="space-y-3 p-4">
                <label className="block">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Paciente</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    onChange={(e) => setDietDraft((d) => ({ ...d, patientId: e.target.value }))}
                    value={dietDraft.patientId}
                  >
                    <option value="">Seleccionar paciente</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Título del plan</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    onChange={(e) => setDietDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Ej. Dieta hipocalórica semana 1"
                    value={dietDraft.title}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Plan detallado</span>
                  <textarea
                    className="mt-1 min-h-32 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    onChange={(e) => setDietDraft((d) => ({ ...d, content: e.target.value }))}
                    placeholder="Desayuno: ...\nComida: ...\nCena: ..."
                    value={dietDraft.content}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Válido desde</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      onChange={(e) => setDietDraft((d) => ({ ...d, validFrom: e.target.value }))}
                      type="date"
                      value={dietDraft.validFrom}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Válido hasta (opcional)</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      onChange={(e) => setDietDraft((d) => ({ ...d, validUntil: e.target.value }))}
                      type="date"
                      value={dietDraft.validUntil}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    className="btn-primary"
                    disabled={savingDiet}
                    onClick={handleCreateDiet}
                    type="button"
                  >
                    <Plus size={16} />
                    {savingDiet ? "Guardando..." : "Guardar dieta"}
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Planes de dieta">
              {loadingDiets ? (
                <div className="p-4 text-sm text-muted-foreground">Cargando planes...</div>
              ) : diets.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Aún no hay planes de dieta registrados.</div>
              ) : (
                <div className="divide-y divide-border">
                  {diets.map((diet) => (
                    <div className="p-4" key={diet.id}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{diet.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            diet.status === "active"
                              ? "bg-primary-soft text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {diet.status === "active" ? "Activo" : "Archivado"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {diet.patientName} · desde {diet.validFrom}
                        {diet.validUntil ? ` hasta ${diet.validUntil}` : ""}
                      </p>
                      {diet.content ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{diet.content}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        ) : null}

        {/* Progreso tab */}
        {activeTab === "progreso" ? (
          <>
            <Panel title="Nueva medición">
              <div className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Paciente</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      onChange={(e) => setMeasurementDraft((d) => ({ ...d, patientId: e.target.value }))}
                      value={measurementDraft.patientId}
                    >
                      <option value="">Seleccionar paciente</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.fullName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Fecha de medición</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      onChange={(e) => setMeasurementDraft((d) => ({ ...d, measuredAt: e.target.value }))}
                      type="date"
                      value={measurementDraft.measuredAt}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([
                    ["weightKg", "Peso (kg)"],
                    ["heightCm", "Talla (cm)"],
                    ["waistCm", "Cintura (cm)"],
                    ["hipCm", "Cadera (cm)"],
                    ["armCm", "Brazo (cm)"],
                    ["bodyFatPercentage", "% Grasa"],
                    ["muscleMassKg", "Masa muscular (kg)"],
                  ] as Array<[keyof MeasurementDraft, string]>).map(([field, label]) => (
                    <label className="block" key={field}>
                      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                        min={0}
                        onChange={(e) => setMeasurementDraft((d) => ({ ...d, [field]: e.target.value }))}
                        placeholder="—"
                        step="0.01"
                        type="number"
                        value={measurementDraft[field]}
                      />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Notas</span>
                  <textarea
                    className="mt-1 min-h-16 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    onChange={(e) => setMeasurementDraft((d) => ({ ...d, notes: e.target.value }))}
                    placeholder="Observaciones adicionales"
                    value={measurementDraft.notes}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    className="btn-primary"
                    disabled={savingMeasurement}
                    onClick={handleCreateMeasurement}
                    type="button"
                  >
                    <Plus size={16} />
                    {savingMeasurement ? "Guardando..." : "Registrar medidas"}
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Historial de medidas">
              {loadingMeasurements ? (
                <div className="p-4 text-sm text-muted-foreground">Cargando historial...</div>
              ) : measurements.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Aún no hay medidas registradas.</div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
                          <th className="px-4 py-2">Fecha</th>
                          <th className="px-4 py-2">Paciente</th>
                          <th className="px-4 py-2">Peso</th>
                          <th className="px-4 py-2">Talla</th>
                          <th className="px-4 py-2">Cintura</th>
                          <th className="px-4 py-2">Cadera</th>
                          <th className="px-4 py-2">% Grasa</th>
                          <th className="px-4 py-2">Músculo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {measurements.map((m) => (
                          <tr className="hover:bg-muted/60" key={m.id}>
                            <td className="px-4 py-3 text-muted-foreground">{m.measuredAt.slice(0, 10)}</td>
                            <td className="px-4 py-3 font-medium">{m.patientName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.weightKg ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.heightCm ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.waistCm ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.hipCm ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.bodyFatPercentage != null ? `${m.bodyFatPercentage}%` : "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.muscleMassKg ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-3 p-4 md:hidden">
                    {measurements.map((m) => (
                      <div className="rounded-lg border border-border bg-white p-4" key={m.id}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{m.patientName}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">{m.measuredAt.slice(0, 10)}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">Peso</span>
                          <span>{m.weightKg ?? "—"}</span>
                          <span className="text-muted-foreground">Talla</span>
                          <span>{m.heightCm ?? "—"}</span>
                          <span className="text-muted-foreground">Cintura</span>
                          <span>{m.waistCm ?? "—"}</span>
                          <span className="text-muted-foreground">Cadera</span>
                          <span>{m.hipCm ?? "—"}</span>
                          <span className="text-muted-foreground">% Grasa</span>
                          <span>{m.bodyFatPercentage != null ? `${m.bodyFatPercentage}%` : "—"}</span>
                          <span className="text-muted-foreground">Músculo</span>
                          <span>{m.muscleMassKg ?? "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
