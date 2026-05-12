import clsx from "clsx";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Database,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { ChatSession } from "../../lib/store";
import { groupSessionsByDate } from "../../lib/store";

export type View = "dashboard" | "chat" | "knowledge" | "analytics" | "settings";

interface Props {
  view: View;
  onView: (v: View) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  sessions: ChatSession[];
  activeId: string | null;
  onPickSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "knowledge", label: "Knowledge Base", icon: Database },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar(props: Props) {
  const {
    view,
    onView,
    collapsed,
    onToggleCollapsed,
    sessions,
    activeId,
    onPickSession,
    onNewChat,
    onDeleteSession,
  } = props;

  const grouped = groupSessionsByDate(sessions);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex h-full shrink-0 flex-col border-r border-white/[0.06] bg-surface"
    >
      <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-accent" />
            <span className="text-sm font-semibold tracking-tight text-slate-100">
              RAG Studio
            </span>
          </div>
        )}
        {collapsed && <div className="mx-auto h-6 w-6 rounded-md bg-accent" />}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="btn-ghost h-8 w-8 p-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onNewChat}
          className={clsx(
            "btn-primary w-full",
            collapsed && "h-9 w-9 px-0 py-0",
          )}
          title="New chat"
        >
          <Plus size={15} />
          {!collapsed && <span>New chat</span>}
        </button>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onView(item.id)}
              className={clsx(
                "group relative flex h-9 items-center gap-3 rounded-md px-2 text-sm font-medium transition",
                active
                  ? "bg-white/[0.05] text-slate-100"
                  : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <motion.span
                  layoutId="active-marker"
                  className="absolute left-0 top-1.5 h-6 w-0.5 rounded-r bg-accent"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                />
              )}
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
          {sessions.length === 0 ? (
            <p className="px-2 py-4 text-xs text-slate-500">
              Past conversations will appear here.
            </p>
          ) : (
            (
              [
                ["Today", grouped.today],
                ["Yesterday", grouped.yesterday],
                ["This week", grouped.week],
                ["Older", grouped.older],
              ] as const
            ).map(
              ([label, list]) =>
                list.length > 0 && (
                  <div key={label} className="mb-3">
                    <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <div className="flex flex-col">
                      {list.map((s) => (
                        <div
                          key={s.id}
                          className={clsx(
                            "group flex h-8 items-center gap-2 rounded-md px-2 text-xs transition",
                            activeId === s.id && view === "chat"
                              ? "bg-white/[0.05] text-slate-100"
                              : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onPickSession(s.id)}
                            className="flex-1 truncate text-left"
                            title={s.title}
                          >
                            {s.title}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(s.id)}
                            className="opacity-0 transition group-hover:opacity-100"
                            aria-label="Delete chat"
                          >
                            <Trash2 size={12} className="text-slate-500 hover:text-rose-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
            )
          )}
        </div>
      )}
    </motion.aside>
  );
}
