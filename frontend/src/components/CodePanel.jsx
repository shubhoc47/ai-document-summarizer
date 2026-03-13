import { cn } from "./cn";

const TONES = {
  dark: {
    shell: "border-app-border bg-slate-950 text-slate-50",
    pre: "text-slate-50",
  },
  light: {
    shell: "border-app-border bg-white text-slate-900",
    pre: "text-slate-900",
  },
};

export function CodePanel({ className, tone = "dark", children }) {
  const t = TONES[tone] || TONES.dark;
  return (
    <div className={cn("mt-3 rounded-xl border", t.shell, className)}>
      <pre className={cn("max-h-[360px] overflow-auto p-4 text-xs leading-relaxed", t.pre)}>
        <code className="whitespace-pre-wrap break-words">{children}</code>
      </pre>
    </div>
  );
}

