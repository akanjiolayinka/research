import { Moon, PanelRight, Sun } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  modelLabel?: string;
  rightSlot?: React.ReactNode;
  theme: string;
  onToggleTheme: () => void;
  onToggleDrawer?: () => void;
  drawerOpen?: boolean;
}

export default function TopBar({
  title,
  subtitle,
  modelLabel,
  rightSlot,
  theme,
  onToggleTheme,
  onToggleDrawer,
  drawerOpen,
}: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-surface px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-sm font-semibold text-slate-100">{title}</h1>
          {modelLabel && (
            <span className="rounded border border-white/[0.08] bg-panel2 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              {modelLabel}
            </span>
          )}
        </div>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        {rightSlot}
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn-ghost h-8 w-8 p-0"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className={
              "btn-ghost h-8 w-8 p-0 " +
              (drawerOpen ? "bg-white/[0.05] text-slate-100" : "")
            }
            aria-label="Toggle context inspector"
          >
            <PanelRight size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
