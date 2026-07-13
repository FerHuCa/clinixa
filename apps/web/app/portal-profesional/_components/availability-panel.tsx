"use client";

import { Plus, Save } from "lucide-react";
import { Panel } from "@/components/panel";
import type { ProfessionalAvailability } from "@/lib/healthhub-store";

type AvailabilityDraft = {
  weekday: number;
  startsAt: string;
  endsAt: string;
};

type Props = {
  availability: ProfessionalAvailability[];
  availabilityDrafts: Record<string, AvailabilityDraft>;
  newAvailability: AvailabilityDraft;
  configActionId: string;
  onAvailabilityDraftChange: (updater: (current: Record<string, AvailabilityDraft>) => Record<string, AvailabilityDraft>) => void;
  onNewAvailabilityChange: (updater: (current: AvailabilityDraft) => AvailabilityDraft) => void;
  onSaveAvailability: (availabilityId: string) => void;
  onAddAvailability: () => void;
};

export function AvailabilityPanel({
  availability,
  availabilityDrafts,
  configActionId,
  newAvailability,
  onAddAvailability,
  onAvailabilityDraftChange,
  onNewAvailabilityChange,
  onSaveAvailability,
}: Props) {
  return (
    <Panel id="disponibilidad" title="Disponibilidad">
      <div className="divide-y divide-border">
        {availability.length ? (
          availability.map((slot) => {
            const draft = availabilityDrafts[slot.id] ?? {
              endsAt: slot.endsAt,
              startsAt: slot.startsAt,
              weekday: slot.weekday,
            };

            return (
              <div className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_90px_90px_auto]" key={slot.id}>
                <select
                  className="rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  onChange={(event) =>
                    onAvailabilityDraftChange((current) => ({ ...current, [slot.id]: { ...draft, weekday: Number(event.target.value) } }))
                  }
                  value={draft.weekday}
                >
                  <option value={1}>Lunes</option>
                  <option value={2}>Martes</option>
                  <option value={3}>Miércoles</option>
                  <option value={4}>Jueves</option>
                  <option value={5}>Viernes</option>
                  <option value={6}>Sábado</option>
                  <option value={7}>Domingo</option>
                </select>
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">De</span>
                    <input
                      className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      onChange={(event) =>
                        onAvailabilityDraftChange((current) => ({ ...current, [slot.id]: { ...draft, startsAt: event.target.value } }))
                      }
                      type="time"
                      value={draft.startsAt}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">A</span>
                    <input
                      className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      onChange={(event) =>
                        onAvailabilityDraftChange((current) => ({ ...current, [slot.id]: { ...draft, endsAt: event.target.value } }))
                      }
                      type="time"
                      value={draft.endsAt}
                    />
                  </label>
                </div>
                <button
                  className="btn-primary"
                  disabled={configActionId === slot.id}
                  onClick={() => onSaveAvailability(slot.id)}
                  type="button"
                >
                  <Save size={14} />
                  Guardar
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-sm text-muted-foreground">Aún no defines tu disponibilidad. Agrega tu primer horario aquí abajo.</div>
        )}
        <div className="grid gap-2 bg-muted/40 p-4 text-sm sm:grid-cols-[1fr_90px_90px_auto]">
          <select
            className="rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            onChange={(event) => onNewAvailabilityChange((current) => ({ ...current, weekday: Number(event.target.value) }))}
            value={newAvailability.weekday}
          >
            <option value={1}>Lunes</option>
            <option value={2}>Martes</option>
            <option value={3}>Miércoles</option>
            <option value={4}>Jueves</option>
            <option value={5}>Viernes</option>
            <option value={6}>Sábado</option>
            <option value={7}>Domingo</option>
          </select>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">De</span>
              <input
                className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(event) => onNewAvailabilityChange((current) => ({ ...current, startsAt: event.target.value }))}
                type="time"
                value={newAvailability.startsAt}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">A</span>
              <input
                className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                onChange={(event) => onNewAvailabilityChange((current) => ({ ...current, endsAt: event.target.value }))}
                type="time"
                value={newAvailability.endsAt}
              />
            </label>
          </div>
          <button
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
            disabled={configActionId === "new-availability"}
            onClick={onAddAvailability}
            type="button"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      </div>
    </Panel>
  );
}
