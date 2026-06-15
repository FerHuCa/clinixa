"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList, Mail, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { useHealthHubStore } from "@/lib/healthhub-store";
import { specialtyLabelFor } from "@/lib/specialty-labels";

type PatientProfileClientProps = {
  patientId: string;
};

// Textos internos que la API guarda como avance por defecto; no aportan nada
// al profesional, así que se sustituyen por un mensaje neutro.
const placeholderProgress = [
  "Paciente creado desde API MVP.",
  "Paciente creado desde el prototipo MVP.",
  "Perfil de paciente creado automaticamente desde Clerk."
];

function progressTextFor(progress: string) {
  const normalized = progress.trim();

  if (!normalized || placeholderProgress.includes(normalized)) {
    return "Aún sin avances registrados.";
  }

  return normalized;
}

export function PatientProfileClient({ patientId }: PatientProfileClientProps) {
  const { appointments, patients, soapNotes } = useHealthHubStore();
  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    return (
      <AppShell>
        <PageHeader
          action={
            <Link className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white" href="/pacientes">
              Volver a pacientes
            </Link>
          }
          description="No encontramos este paciente. Verifica el enlace o regresa a la lista de pacientes."
          title="Paciente no encontrado"
        />
      </AppShell>
    );
  }

  const patientAppointments = appointments.filter((appointment) => appointment.patientId === patient.id);
  const notes = soapNotes.filter((note) => note.patientId === patient.id);

  return (
    <AppShell>
      <PageHeader
        action={
          <Link className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white" href="/agenda">
            Agendar cita
          </Link>
        }
        description={`${specialtyLabelFor(patient.focus)} · ${patient.professional}`}
        title={patient.fullName}
      />

      <div className="grid gap-5 px-5 py-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <aside className="space-y-5">
          <Panel>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-teal-50 text-lg font-semibold text-primary">
                  {patient.initials}
                </div>
                <div>
                  <p className="font-semibold">{patient.fullName}</p>
                  <p className="text-sm text-slate-500">{patient.age} años</p>
                </div>
              </div>
              <div className="mt-4">
                <StatusPill label={patient.statusLabel} status={patient.status} />
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={16} />
                  {patient.email}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={16} />
                  {patient.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarDays size={16} />
                  {patient.nextAppointment}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Resumen de seguimiento">
            <div className="space-y-4 p-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Motivo principal</p>
                <p className="mt-1 text-slate-700">{patient.mainReason}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Riesgo</p>
                <p className="mt-1 text-slate-700">{patient.riskLevel}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Avance</p>
                <p className="mt-1 leading-6 text-slate-700">{progressTextFor(patient.progress)}</p>
              </div>
            </div>
          </Panel>
        </aside>

        <section className="space-y-5">
          <Panel title="Expediente">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <ClipboardList size={18} className="text-primary" />
                <p className="mt-3 text-2xl font-semibold">{notes.length}</p>
                <p className="text-sm text-slate-500">Notas SOAP</p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <CalendarDays size={18} className="text-primary" />
                <p className="mt-3 text-2xl font-semibold">{patientAppointments.length}</p>
                <p className="text-sm text-slate-500">Citas registradas</p>
              </div>
            </div>
          </Panel>

          <Panel title="Notas SOAP">
            <div className="divide-y divide-border">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div className="px-4 py-4" key={note.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{note.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{note.date}</p>
                      </div>
                      <StatusPill label={note.statusLabel} status={note.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{note.assessment}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-start gap-2 px-4 py-6 text-sm text-slate-500">
                  <p>Aún no hay notas SOAP para este paciente.</p>
                  <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/expediente">
                    Crear la primera nota →
                  </Link>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Historial de citas">
            <div className="divide-y divide-border">
              {patientAppointments.length > 0 ? (
                patientAppointments.map((appointment) => (
                  <div className="grid gap-3 px-4 py-4 md:grid-cols-[110px_1fr_130px]" key={appointment.id}>
                    <div>
                      <p className="text-sm font-semibold">{appointment.date}</p>
                      <p className="text-sm text-slate-500">{appointment.time}</p>
                    </div>
                    <div>
                      <p className="font-medium">{appointment.type}</p>
                      <p className="mt-1 text-sm text-slate-500">{appointment.reason}</p>
                    </div>
                    <StatusPill label={appointment.statusLabel} status={appointment.status} />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-start gap-2 px-4 py-6 text-sm text-slate-500">
                  <p>Aún no hay citas con este paciente.</p>
                  <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/agenda">
                    Agendar la primera cita →
                  </Link>
                </div>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
