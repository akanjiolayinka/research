import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Database,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
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
      animate={{ width: collapsed ? 76 : 268 }}
      transition={{ type: "spring", stiffness: 280, damping: 32 }}
      className="relative z-20 flex h-full shrink-0 flex-col border-r border-white/10 bg-ink-950/70 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-electric shadow-glow-sm">
          <Sparkles size={18} className="text-white" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex-1 overflow-hidden"
            >
              <p className="truncate font-display text-base font-bold tracking-wide">
                RAG Studio
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Retrieval Intelligence
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onNewChat}
          className="btn-primary w-full"
          title="New chat"
        >
          <Plus size={16} />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      <nav className="mt-5 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onView(item.id)}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-white/[0.06] text-white shadow-inner-soft"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute inset-0 rounded-xl border border-violet-500/40 bg-gradient-to-r from-electric-500/10 via-violet-500/10 to-violet-500/0"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <Icon size={16} />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            History
          </p>
          {sessions.length === 0 && (
            <p className="px-2 text-xs text-slate-500">
              Past conversations will appear here.
            </p>
          )}
          {(
            [
              ["Today", grouped.today],
              ["Yesterday", grouped.yesterday],
              ["This Week", grouped.week],
              ["Older", grouped.older],
            ] as const
          ).map(
            ([label, list]) =>
              list.length > 0 && (
                <div key={label} className="mb-3">
                  <p className="mb-1 px-2 text-[10px] uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {list.map((s) => (
                      <div
                        key={s.id}
                        className={clsx(
                          "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition",
                          activeId === s.id && view === "chat"
                            ? "bg-white/[0.06] text-white"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
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
                          <Trash2 size={12} className="text-rose-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </motion.aside>
  );
}
