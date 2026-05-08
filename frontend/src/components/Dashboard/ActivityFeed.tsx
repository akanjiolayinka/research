import { motion } from "framer-motion";
import { Clock, MessageCircle } from "lucide-react";
import Badge from "../UI/Badge";

export interface ActivityItem {
  id: string;
  question: string;
  sources: string[];
  at: number;
}

function relative(ts: number) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold tracking-wide">
          Recent Activity
        </p>
        <Badge>last {items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          <MessageCircle size={20} className="mx-auto mb-2 opacity-50" />
          No queries yet — head to <span className="text-violet-300">Chat</span> to ask
          something.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it, i) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
                <MessageCircle size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200" title={it.question}>
                  {it.question}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock size={11} /> {relative(it.at)}
                  </span>
                  {it.sources.slice(0, 3).map((s) => (
                    <Badge key={s} tone="electric">
                      {s}
                    </Badge>
                  ))}
                  {it.sources.length > 3 && (
                    <span className="text-[11px] text-slate-500">
                      +{it.sources.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
