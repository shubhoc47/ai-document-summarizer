import { cn } from "./cn";

export function SectionHeader({ className, eyebrow, title, subtitle, right }) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</div>
        ) : null}
        {title ? <h2 className="mt-0.5 text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2> : null}
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

