import { Moon, PanelRight, Sun } from "lucide-react";
import Badge from "../UI/Badge";

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
    <header className="flex items-center gap-3 border-b border-white/10 bg-ink-950/40 px-6 py-3 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="truncate font-display text-base font-semibold tracking-wide">
            {title}
          </h1>
          {modelLabel && <Badge tone="violet">{modelLabel}</Badge>}
        </div>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn-ghost"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className={
              "btn-ghost " +
              (drawerOpen ? "bg-white/10 text-white" : "")
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
