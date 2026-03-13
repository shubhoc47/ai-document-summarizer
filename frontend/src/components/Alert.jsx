import { cn } from "./cn";

const STYLES = {
  info: "border-slate-200 bg-white text-slate-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export function Alert({ className, tone = "info", title, children }) {
  return (
    <div className={cn("mt-3 rounded-xl border px-4 py-3 text-sm", STYLES[tone] || STYLES.info, className)}>
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={cn(title ? "mt-1 text-[13px]" : null)}>{children}</div> : null}
    </div>
  );
}

