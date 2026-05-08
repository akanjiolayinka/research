import clsx from "clsx";

type Tone = "default" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  default: "border-white/[0.08] bg-panel2 text-slate-400",
  accent: "border-accent/30 bg-accent/10 text-accent-400",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export default function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
