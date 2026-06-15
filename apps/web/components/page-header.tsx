type PageHeaderProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-white px-5 py-4 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{action}</div>
      </div>
    </header>
  );
}
