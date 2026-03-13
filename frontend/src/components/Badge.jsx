import { cn } from "./cn";

export function Badge({ className, tone = "neutral", children }) {
  const styles =
    tone === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", styles, className)}>
      {children}
    </span>
  );
}

