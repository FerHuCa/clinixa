import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  detail?: string;
};

export function StatCard({ label, value, icon: Icon, detail }: StatCardProps) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon size={18} className="text-primary" />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}
