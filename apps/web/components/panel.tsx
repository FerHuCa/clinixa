import { clsx } from "clsx";

type PanelProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  id?: string;
};

export function Panel({ title, children, className, action, id }: PanelProps) {
  return (
    <section className={clsx("rounded-md border border-border bg-white", className)} id={id}>
      {title || action ? (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
