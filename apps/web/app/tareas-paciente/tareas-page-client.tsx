"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import { useHealthHubStore, type PatientTask } from "@/lib/healthhub-store";

type Draft = {
  patientId: string;
  title: string;
  description: string;
  dueDate: string;
};

const EMPTY_DRAFT: Draft = { patientId: "", title: "", description: "", dueDate: "" };

const STATUS_TABS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completadas" },
  { value: "skipped", label: "Omitidas" },
] as const;

function statusIcon(status: string) {
  if (status === "completed") return <CheckCircle2 size={18} className="text-teal-500" />;
  if (status === "skipped") return <Clock size={18} className="text-slate-400" />;
  return <Circle size={18} className="text-amber-400" />;
}

export function TareasPageClient() {
  const { currentUser, patients, ready, loadPatientTasks, createPatientTask, updatePatientTaskStatus } = useHealthHubStore();
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]["value"]>("pending");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    loadPatientTasks()
      .then(setTasks)
      .catch(() => {
        setMessage({ kind: "error", text: "No se pudieron cargar las tareas." });
      })
      .finally(() => setLoading(false));
  }, [ready, loadPatientTasks]);

  async function handleCreate() {
    if (!draft.patientId || !draft.title) {
      setMessage({ kind: "error", text: "Selecciona un paciente e ingresa el título." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPatientTask({
        patientId: draft.patientId,
        title: draft.title,
        description: draft.description,
        dueDate: draft.dueDate || undefined,
      });
      setTasks((prev) => [created, ...prev]);
      setDraft(EMPTY_DRAFT);
      setMessage({ kind: "success", text: "Tarea asignada correctamente." });
    } catch {
      setMessage({ kind: "error", text: "No se pudo crear la tarea." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(task: PatientTask) {
    if (task.status === "skipped") return;
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    try {
      const updated = await updatePatientTaskStatus(task.id, nextStatus);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setMessage({ kind: "error", text: "No se pudo actualizar el estado." });
    }
  }

  const filtered = activeTab === "all" ? tasks : tasks.filter((t) => t.status === activeTab);

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Asigna actividades y tareas a tus pacientes entre sesiones."
        title="Tareas de paciente"
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

        <Panel title="Nueva tarea">
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
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Título</span>
              <input
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Ej. Ejercicio de respiración diario"
                value={draft.title}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Descripción</span>
              <textarea
                className="mt-1 min-h-20 w-full resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Instrucciones para el paciente"
                value={draft.description}
              />
            </label>
            <div className="flex items-end justify-between gap-3">
              <label className="block flex-1">
                <span className="text-xs font-medium uppercase text-slate-400">Fecha límite (opcional)</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                  type="date"
                  value={draft.dueDate}
                />
              </label>
              <button
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={handleCreate}
                type="button"
              >
                <Plus size={16} />
                {saving ? "Guardando..." : "Asignar tarea"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Tareas asignadas">
          <div className="flex gap-1 border-b border-border px-4 pt-2">
            {STATUS_TABS.map((tab) => (
              <button
                className={`px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.value
                    ? "border-b-2 border-primary text-primary"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Cargando tareas...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No hay tareas en esta categoría.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((task) => (
                <div className="flex items-start gap-3 p-4" key={task.id}>
                  <button
                    className="mt-0.5 shrink-0 transition hover:opacity-70"
                    onClick={() => handleToggle(task)}
                    title={task.status === "pending" ? "Marcar como completada" : "Marcar como pendiente"}
                    type="button"
                  >
                    {statusIcon(task.status)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="mt-0.5 text-sm text-slate-600">{task.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {task.patientName}
                      {task.dueDate ? ` · Límite: ${task.dueDate}` : ""}
                    </p>
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
