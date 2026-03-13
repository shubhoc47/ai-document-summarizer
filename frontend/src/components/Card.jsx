import { cn } from "./cn";

export function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-app-border bg-app-card shadow-soft",
        "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, title, subtitle, children }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {title && <h2 className="text-base font-semibold text-app-text sm:text-lg">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

