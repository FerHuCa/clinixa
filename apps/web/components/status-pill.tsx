import { clsx } from "clsx";

const variants = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paused: "bg-muted text-foreground/80 ring-border",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200",
  confirmed: "bg-primary-soft text-primary ring-primary/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  no_show: "bg-rose-50 text-rose-700 ring-rose-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  finalized: "bg-emerald-50 text-emerald-700 ring-emerald-200"
};

type StatusPillProps = {
  label: string;
  status: keyof typeof variants;
};

export function StatusPill({ label, status }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        variants[status]
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
