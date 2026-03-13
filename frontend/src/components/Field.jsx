import { cn } from "./cn";

export function Field({ className, label, hint, children }) {
  return (
    <label className={cn("block", className)}>
      {label ? <div className="text-sm font-medium text-slate-900">{label}</div> : null}
      {hint ? <div className="mt-0.5 text-xs text-slate-600">{hint}</div> : null}
      <div className={cn(label || hint ? "mt-2" : null)}>{children}</div>
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-app-border bg-white px-3 py-2 text-sm text-slate-900",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-app-primary/30 focus:border-app-primary/60",
        "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export function NumberInput({ className, ...props }) {
  return <TextInput inputMode="numeric" className={className} {...props} />;
}

