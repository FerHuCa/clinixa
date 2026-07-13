type EmptyStateProps = {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
};

/**
 * Estado vacío con la línea de pulso de Clinixa: convierte los paneles en blanco
 * en una invitación a actuar en lugar de una caja vacía.
 */
export function EmptyState({ title, hint, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className ?? ""}`}>
      <svg
        aria-hidden="true"
        className="text-primary/40"
        fill="none"
        height="28"
        viewBox="0 0 140 28"
        width="140"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 14h38l6-8 8 16 8-22 8 26 6-12h66"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
