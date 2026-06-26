"use client";

import { Plus, Save } from "lucide-react";
import { Panel } from "@/components/panel";
import type { ProfessionalService } from "@/lib/healthhub-store";

type ServiceDraft = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  mode: string;
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function modeLabel(mode: string) {
  if (mode === "online") return "En línea";
  if (mode === "in_person") return "Presencial";
  return "Híbrido";
}

type Props = {
  services: ProfessionalService[];
  serviceDrafts: Record<string, ServiceDraft>;
  newService: ServiceDraft;
  configActionId: string;
  onServiceDraftChange: (updater: (current: Record<string, ServiceDraft>) => Record<string, ServiceDraft>) => void;
  onNewServiceChange: (updater: (current: ServiceDraft) => ServiceDraft) => void;
  onSaveService: (serviceId: string) => void;
  onAddService: () => void;
};

export function ServicesPanel({
  configActionId,
  newService,
  onAddService,
  onNewServiceChange,
  onSaveService,
  onServiceDraftChange,
  serviceDrafts,
  services,
}: Props) {
  return (
    <Panel id="servicios" title="Servicios">
      <div className="divide-y divide-border">
        {services.length ? (
          services.map((service) => {
            const draft = serviceDrafts[service.id] ?? {
              description: service.description,
              durationMinutes: service.durationMinutes,
              mode: service.mode,
              name: service.name,
              price: service.price,
            };

            return (
              <div className="space-y-3 p-4" key={service.id}>
                <input
                  className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium outline-none focus:border-teal-400"
                  onChange={(event) =>
                    onServiceDraftChange((current) => ({ ...current, [service.id]: { ...draft, name: event.target.value } }))
                  }
                  value={draft.name}
                />
                <textarea
                  className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                  onChange={(event) =>
                    onServiceDraftChange((current) => ({ ...current, [service.id]: { ...draft, description: event.target.value } }))
                  }
                  value={draft.description}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Duración (min)</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      min={15}
                      onChange={(event) =>
                        onServiceDraftChange((current) => ({
                          ...current,
                          [service.id]: { ...draft, durationMinutes: Number(event.target.value) },
                        }))
                      }
                      type="number"
                      value={draft.durationMinutes}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Precio (MXN)</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      min={0}
                      onChange={(event) =>
                        onServiceDraftChange((current) => ({ ...current, [service.id]: { ...draft, price: Number(event.target.value) } }))
                      }
                      type="number"
                      value={draft.price}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-slate-400">Modalidad</span>
                    <select
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                      onChange={(event) =>
                        onServiceDraftChange((current) => ({ ...current, [service.id]: { ...draft, mode: event.target.value } }))
                      }
                      value={draft.mode}
                    >
                      <option value="hybrid">Híbrido</option>
                      <option value="online">En línea</option>
                      <option value="in_person">Presencial</option>
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {draft.durationMinutes} min · {money(draft.price)} · {modeLabel(draft.mode)}
                  </p>
                  <button
                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={configActionId === service.id}
                    onClick={() => onSaveService(service.id)}
                    type="button"
                  >
                    <Save size={14} />
                    Guardar
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-sm text-slate-500">Aún no tienes servicios publicados. Agrega el primero aquí abajo.</div>
        )}
        <div className="space-y-3 bg-slate-50 p-4">
          <input
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium outline-none focus:border-teal-400"
            onChange={(event) => onNewServiceChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="Nuevo servicio"
            value={newService.name}
          />
          <textarea
            className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
            onChange={(event) => onNewServiceChange((current) => ({ ...current, description: event.target.value }))}
            placeholder="Descripción"
            value={newService.description}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Duración (min)</span>
              <input
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                min={15}
                onChange={(event) => onNewServiceChange((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
                type="number"
                value={newService.durationMinutes}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Precio (MXN)</span>
              <input
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                min={0}
                onChange={(event) => onNewServiceChange((current) => ({ ...current, price: Number(event.target.value) }))}
                type="number"
                value={newService.price}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-slate-400">Modalidad</span>
              <select
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-teal-400"
                onChange={(event) => onNewServiceChange((current) => ({ ...current, mode: event.target.value }))}
                value={newService.mode}
              >
                <option value="hybrid">Híbrido</option>
                <option value="online">En línea</option>
                <option value="in_person">Presencial</option>
              </select>
            </label>
          </div>
          <button
            className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
            disabled={configActionId === "new-service"}
            onClick={onAddService}
            type="button"
          >
            <Plus size={14} />
            Agregar servicio
          </button>
        </div>
      </div>
    </Panel>
  );
}
