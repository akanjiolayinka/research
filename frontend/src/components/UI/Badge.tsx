import clsx from "clsx";

type Tone = "default" | "electric" | "violet" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  default: "bg-white/5 text-slate-300 border-white/10",
  electric: "bg-electric-500/15 text-electric-400 border-electric-500/30",
  violet: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 border-rose-500/30",
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
