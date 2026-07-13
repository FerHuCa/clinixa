"use client";

import { clsx } from "clsx";
import { Search, SlidersHorizontal } from "lucide-react";

const specialties = [
  { value: "all", label: "Todas" },
  { value: "doctor", label: "Medicina" },
  { value: "psychologist", label: "Psicología" },
  { value: "physiotherapist", label: "Fisioterapia" },
  { value: "nutritionist", label: "Nutrición" }
];

const modeFilters = [
  { value: "all", label: "Todos" },
  { value: "online", label: "Online" },
  { value: "in_person", label: "Presencial" }
];

type Props = {
  mode: string;
  query: string;
  specialty: string;
  onModeChange: (mode: string) => void;
  onQueryChange: (query: string) => void;
  onSpecialtyChange: (specialty: string) => void;
};

export function SearchFilters({ mode, query, specialty, onModeChange, onQueryChange, onSpecialtyChange }: Props) {
  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
          <Search aria-hidden="true" className="text-muted-foreground/70" size={18} />
          <input
            aria-label="Buscar profesional"
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Nombre, especialidad, servicio o ubicación"
            value={query}
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
          <SlidersHorizontal aria-hidden="true" className="text-muted-foreground/70" size={18} />
          <select
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => onSpecialtyChange(event.target.value)}
            value={specialty}
          >
            {specialties.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {modeFilters.map((item) => (
          <button
            className={clsx(
              "rounded-lg border px-3 py-2 text-sm transition",
              mode === item.value ? "border-primary/20 bg-primary-soft font-medium text-primary" : "border-border bg-white text-foreground/80 hover:bg-muted/60"
            )}
            key={item.value}
            onClick={() => onModeChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
