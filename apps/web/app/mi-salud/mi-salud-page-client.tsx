"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ClipboardList, Clock, FileText, Pill, Salad } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { UserMenu } from "@/components/user-menu";
import {
  useHealthHubStore,
  type Prescription,
  type PatientDiet,
  type PatientTask,
} from "@/lib/healthhub-store";

// ── Status helpers ───────────────────────────────────────────────────────────

function prescriptionStatusLabel(status: string): string {
  if (status === "active") return "Activa";
  if (status === "expired") return "Expirada";
  if (status === "cancelled") return "Cancelada";
  return status;
}

function prescriptionStatusClass(status: string): string {
  if (status === "active") return "bg-teal-100 text-teal-700";
  if (status === "expired") return "bg-slate-100 text-slate-500";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-500";
}

function dietStatusLabel(status: "active" | "archived"): string {
  return status === "active" ? "Activo" : "Archivado";
}

function dietStatusClass(status: "active" | "archived"): string {
  return status === "active" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500";
}

function taskStatusIcon(status: "pending" | "completed" | "skipped") {
  if (status === "completed") return <CheckCircle2 size={18} className="text-teal-500" />;
  if (status === "skipped") return <Clock size={18} className="text-slate-400" />;
  return <Circle size={18} className="text-amber-400" />;
}

function taskStatusLabel(status: "pending" | "completed" | "skipped"): string {
  if (status === "completed") return "Completada";
  if (status === "skipped") return "Omitida";
  return "Pendiente";
}

// ── Tab type ─────────────────────────────────────────────────────────────────

type ActiveTab = "recetas" | "tareas" | "nutricion";

// ── Component ────────────────────────────────────────────────────────────────

export function MiSaludPageClient() {
  const {
    currentUser,
    ready,
    sessionError,
    loadPrescriptions,
    loadPatientTasks,
    loadPatientDiets,
    updatePatientTaskStatus,
  } = useHealthHubStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("recetas");

  // Per-tab data
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [diets, setDiets] = useState<PatientDiet[]>([]);

  // Per-tab loading
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingDiets, setLoadingDiets] = useState(true);

  // Per-tab errors
  const [errorPrescriptions, setErrorPrescriptions] = useState<string | null>(null);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);
  const [errorDiets, setErrorDiets] = useState<string | null>(null);

  // Task status update state
  const [savingTaskIds, setSavingTaskIds] = useState<Set<string>>(new Set());
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  const patientId = currentUser.patientId;

  async function handleToggleTaskStatus(task: PatientTask) {
    const newStatus: "completed" | "pending" =
      task.status === "completed" ? "pending" : "completed";

    setSavingTaskIds((prev) => {
      const next = new Set(prev);
      next.add(task.id);
      return next;
    });
    setTaskErrors((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });

    try {
      const updated = await updatePatientTaskStatus(task.id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    } catch {
      setTaskErrors((prev) => ({
        ...prev,
        [task.id]: "No se pudo actualizar. Intenta de nuevo.",
      }));
    } finally {
      setSavingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  useEffect(() => {
    if (!patientId) return;

    loadPrescriptions(patientId)
      .then((data) => {
        setPrescriptions(data);
        setLoadingPrescriptions(false);
      })
      .catch(() => {
        setErrorPrescriptions("No se pudieron cargar tus recetas.");
        setLoadingPrescriptions(false);
      });

    loadPatientTasks(patientId)
      .then((data) => {
        setTasks(data);
        setLoadingTasks(false);
      })
      .catch(() => {
        setErrorTasks("No se pudieron cargar tus tareas.");
        setLoadingTasks(false);
      });

    loadPatientDiets(patientId)
      .then((data) => {
        setDiets(data);
        setLoadingDiets(false);
      })
      .catch(() => {
        setErrorDiets("No se pudieron cargar tus planes de nutrición.");
        setLoadingDiets(false);
      });
  }, [patientId, loadPrescriptions, loadPatientTasks, loadPatientDiets]);

  // ── Guard states ────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <AppShell>
        <PageHeader
          description="Tus recetas, tareas y planes de nutrición."
          title="Mi salud"
        />
        <div className="px-5 py-8 text-sm text-slate-500 lg:px-8">Cargando...</div>
      </AppShell>
    );
  }

  if (sessionError) {
    return (
      <AppShell>
        <PageHeader
          description="Tus recetas, tareas y planes de nutrición."
          title="Mi salud"
        />
        <div className="px-5 py-8 lg:px-8">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No pudimos validar tu sesión. Por favor inicia sesión de nuevo.
          </div>
        </div>
      </AppShell>
    );
  }

  if (currentUser.primaryRole !== "patient" || !patientId) {
    return (
      <AppShell>
        <PageHeader
          description="Tus recetas, tareas y planes de nutrición."
          title="Mi salud"
        />
        <div className="px-5 py-8 lg:px-8">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta sección es exclusiva para pacientes. Si eres un profesional de la salud, accede desde el panel de profesionales.
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <PageHeader
        action={<UserMenu fullName={currentUser.fullName} />}
        description="Tus recetas, tareas y planes de nutrición."
        title="Mi salud"
      />

      <div className="space-y-5 px-5 py-6 lg:px-8">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "recetas"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("recetas")}
            type="button"
          >
            <Pill size={16} />
            Recetas
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "tareas"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("tareas")}
            type="button"
          >
            <ClipboardList size={16} />
            Tareas
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "nutricion"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("nutricion")}
            type="button"
          >
            <Salad size={16} />
            Nutrición
          </button>
        </div>

        {/* Recetas tab */}
        {activeTab === "recetas" ? (
          <Panel title="Mis recetas">
            {errorPrescriptions ? (
              <div className="p-4 text-sm text-red-600">{errorPrescriptions}</div>
            ) : loadingPrescriptions ? (
              <div className="p-4 text-sm text-slate-500">Cargando recetas...</div>
            ) : prescriptions.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">Aún no tienes recetas registradas.</div>
            ) : (
              <div className="divide-y divide-border">
                {prescriptions.map((rx) => (
                  <div className="flex items-start gap-3 p-4" key={rx.id}>
                    <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium">{rx.medicationName}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${prescriptionStatusClass(rx.status)}`}
                        >
                          {prescriptionStatusLabel(rx.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {rx.dosage}
                        {rx.frequency ? ` · ${rx.frequency}` : ""}
                        {rx.duration ? ` · ${rx.duration}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Emitida: {rx.issuedAt}
                        {rx.expiresAt ? ` · Vence: ${rx.expiresAt}` : ""}
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
        ) : null}

        {/* Tareas tab */}
        {activeTab === "tareas" ? (
          <Panel title="Mis tareas">
            {errorTasks ? (
              <div className="p-4 text-sm text-red-600">{errorTasks}</div>
            ) : loadingTasks ? (
              <div className="p-4 text-sm text-slate-500">Cargando tareas...</div>
            ) : tasks.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">Aún no tienes tareas asignadas.</div>
            ) : (
              <div className="divide-y divide-border">
                {tasks.map((task) => {
                  const isSaving = savingTaskIds.has(task.id);
                  const rowError = taskErrors[task.id];
                  return (
                    <div className="flex items-start gap-3 p-4" key={task.id}>
                      <button
                        aria-label={
                          task.status === "completed"
                            ? "Marcar pendiente"
                            : "Marcar completada"
                        }
                        className="mt-0.5 shrink-0 disabled:opacity-50"
                        disabled={isSaving}
                        onClick={() => { void handleToggleTaskStatus(task); }}
                        type="button"
                      >
                        {taskStatusIcon(task.status)}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p
                            className={`font-medium ${
                              task.status === "completed" ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              task.status === "completed"
                                ? "bg-teal-100 text-teal-700"
                                : task.status === "skipped"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {taskStatusLabel(task.status)}
                          </span>
                        </div>
                        {task.description ? (
                          <p className="mt-0.5 text-sm text-slate-600">{task.description}</p>
                        ) : null}
                        {task.dueDate ? (
                          <p className="mt-0.5 text-xs text-slate-400">Límite: {task.dueDate}</p>
                        ) : null}
                        {task.patientNotes ? (
                          <p className="mt-1 text-sm italic text-slate-500">Nota: {task.patientNotes}</p>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          {task.status !== "completed" && (
                            <button
                              className="text-xs font-medium text-teal-600 hover:text-teal-800 disabled:opacity-50"
                              disabled={isSaving}
                              onClick={() => { void handleToggleTaskStatus(task); }}
                              type="button"
                            >
                              {isSaving ? "Guardando..." : "Marcar completada"}
                            </button>
                          )}
                          {task.status === "completed" && (
                            <button
                              className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                              disabled={isSaving}
                              onClick={() => { void handleToggleTaskStatus(task); }}
                              type="button"
                            >
                              {isSaving ? "Guardando..." : "Marcar pendiente"}
                            </button>
                          )}
                          {task.status === "skipped" && (
                            <button
                              className="text-xs font-medium text-amber-600 hover:text-amber-800 disabled:opacity-50"
                              disabled={isSaving}
                              onClick={() => { void handleToggleTaskStatus(task); }}
                              type="button"
                            >
                              {isSaving ? "Guardando..." : "Marcar pendiente"}
                            </button>
                          )}
                        </div>
                        {rowError ? (
                          <p className="mt-1 text-xs text-red-500">{rowError}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        ) : null}

        {/* Nutrición tab */}
        {activeTab === "nutricion" ? (
          <Panel title="Mis planes de nutrición">
            {errorDiets ? (
              <div className="p-4 text-sm text-red-600">{errorDiets}</div>
            ) : loadingDiets ? (
              <div className="p-4 text-sm text-slate-500">Cargando planes...</div>
            ) : diets.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">Aún no tienes planes de nutrición asignados.</div>
            ) : (
              <div className="divide-y divide-border">
                {diets.map((diet) => (
                  <div className="p-4" key={diet.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Salad size={16} className="shrink-0 text-primary" />
                        <p className="font-medium">{diet.title}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${dietStatusClass(diet.status)}`}
                      >
                        {dietStatusLabel(diet.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Desde {diet.validFrom}
                      {diet.validUntil ? ` hasta ${diet.validUntil}` : ""}
                    </p>
                    {diet.content ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{diet.content}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
