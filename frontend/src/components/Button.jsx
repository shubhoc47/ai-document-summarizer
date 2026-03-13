import { cn } from "./cn";
import { Spinner } from "./Spinner";

const VARIANTS = {
  primary:
    "bg-app-primary text-white hover:bg-app-primaryHover focus-visible:outline-app-primary disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900 disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300",
  ghost:
    "bg-transparent text-slate-900 hover:bg-slate-100 border border-app-border focus-visible:outline-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100",
};

export function Button({
  className,
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...props
}) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
        "transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed",
        loading && variant === "primary" && "bg-app-primary text-white",
        !loading && (VARIANTS[variant] || VARIANTS.primary),
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Spinner className="text-white" /> : null}
      <span className={cn(loading ? "opacity-90" : null)}>{children}</span>
    </button>
  );
}

