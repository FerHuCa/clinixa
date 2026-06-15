import { clsx } from "clsx";

const variants = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paused: "bg-slate-100 text-slate-700 ring-slate-200",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200",
  confirmed: "bg-teal-50 text-teal-700 ring-teal-200",
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
    <span className={clsx("inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium ring-1", variants[status])}>
      {label}
    </span>
  );
}
