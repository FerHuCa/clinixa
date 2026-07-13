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
  if (status === "completed") return <CheckCircle2 size={18} className="text-primary/70" />;
  if (status === "skipped") return <Clock size={18} className="text-muted-foreground/70" />;
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
                ? "rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary-strong"
                : "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            }
          >
            {message.text}
          </div>
        ) : null}

        <Panel title="Nueva tarea">
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
              <span className="text-xs font-medium uppercase text-muted-foreground">Título</span>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Ej. Ejercicio de respiración diario"
                value={draft.title}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-muted-foreground">Descripción</span>
              <textarea
                className="mt-1 min-h-20 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Instrucciones para el paciente"
                value={draft.description}
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="block flex-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">Fecha límite (opcional)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                  type="date"
                  value={draft.dueDate}
                />
              </label>
              <button
                className="btn-primary w-full sm:w-auto"
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
          <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-2">
            {STATUS_TABS.map((tab) => (
              <button
                className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.value
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground/80"
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
            <div className="p-4 text-sm text-muted-foreground">Cargando tareas...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No hay tareas en esta categoría.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((task) => (
                <div className="flex items-start gap-3 p-4" key={task.id}>
                  <button
                    aria-label={task.status === "pending" ? "Marcar como completada" : "Marcar como pendiente"}
                    className="-mb-2.5 -ml-2.5 -mr-2.5 -mt-2 shrink-0 p-2.5 transition hover:opacity-70"
                    onClick={() => handleToggle(task)}
                    title={task.status === "pending" ? "Marcar como completada" : "Marcar como pendiente"}
                    type="button"
                  >
                    {statusIcon(task.status)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground/70" : ""}`}>
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
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
