import { motion } from "framer-motion";
import { FileStack, MessageCircle, Target, Zap } from "lucide-react";
import AnimatedCounter from "../UI/AnimatedCounter";

export interface DashboardStats {
  documents: number;
  queries: number;
  avgRelevance: number; // 0..1
  avgResponseMs: number;
}

const items = [
  {
    key: "documents" as const,
    label: "Documents Indexed",
    icon: FileStack,
    tint: "from-electric-500/30 to-electric-500/0",
  },
  {
    key: "queries" as const,
    label: "Queries Run",
    icon: MessageCircle,
    tint: "from-violet-500/30 to-violet-500/0",
  },
  {
    key: "avgRelevance" as const,
    label: "Avg Relevance",
    icon: Target,
    tint: "from-emerald-500/30 to-emerald-500/0",
  },
  {
    key: "avgResponseMs" as const,
    label: "Avg Response",
    icon: Zap,
    tint: "from-amber-500/25 to-amber-500/0",
  },
];

function format(key: keyof DashboardStats, n: number) {
  if (key === "avgRelevance") return `${(n * 100).toFixed(0)}%`;
  if (key === "avgResponseMs") return `${(n / 1000).toFixed(1)}s`;
  return Math.round(n).toLocaleString();
}

export default function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        const value = stats[item.key];
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 240, damping: 24 }}
            className={
              "glass relative overflow-hidden rounded-2xl p-4 " +
              "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-30 before:" +
              item.tint
            }
          >
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-white">
                  <AnimatedCounter
                    value={value}
                    format={(n) => format(item.key, n)}
                  />
                </p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
                <Icon size={16} className="text-violet-300" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
