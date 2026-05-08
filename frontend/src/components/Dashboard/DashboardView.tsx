import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChatSession, IngestedDoc } from "../../lib/store";
import StatsRow, { type DashboardStats } from "./StatsRow";
import ActivityFeed, { type ActivityItem } from "./ActivityFeed";

interface Props {
  sessions: ChatSession[];
  docs: IngestedDoc[];
  onQuickAsk: (question: string) => void;
  onJumpToChat: () => void;
}

const greetings = ["Hello", "Welcome back", "Good to see you", "Hey there"];

const examples = [
  "Summarize the key takeaways from the latest paper",
  "What does the documentation say about authentication?",
  "Compare the two reports I uploaded",
];

export default function DashboardView({
  sessions,
  docs,
  onQuickAsk,
  onJumpToChat,
}: Props) {
  const stats = useMemo<DashboardStats>(() => {
    const allMessages = sessions.flatMap((s) => s.messages);
    const queries = allMessages.filter((m) => m.role === "user").length;
    const allChunks = allMessages.flatMap((m) => m.chunks ?? []);
    const avgRelevance =
      allChunks.length > 0
        ? allChunks.reduce((acc, c) => acc + c.score, 0) / allChunks.length
        : 0;
    return {
      documents: docs.length,
      queries,
      avgRelevance,
      avgResponseMs: 0, // backend doesn't expose timing yet
    };
  }, [sessions, docs]);

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const s of sessions) {
      for (let i = 0; i < s.messages.length; i++) {
        const m = s.messages[i];
        if (m.role !== "user") continue;
        const next = s.messages[i + 1];
        items.push({
          id: m.id,
          question: m.content,
          sources: next?.sources ?? [],
          at: m.createdAt,
        });
      }
    }
    return items.sort((a, b) => b.at - a.at).slice(0, 5);
  }, [sessions]);

  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    [],
  );

  const indexedCount = docs.filter((d) => d.status === "indexed").length;
  const failedCount = docs.filter((d) => d.status === "failed").length;
  const processingCount = docs.filter((d) => d.status === "processing").length;
  const pieData = [
    { name: "Indexed", value: indexedCount, color: "#10B981" },
    { name: "Processing", value: processingCount, color: "#F59E0B" },
    { name: "Failed", value: failedCount, color: "#F43F5E" },
  ].filter((d) => d.value > 0);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 overflow-y-auto px-6 py-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grain-overlay glass relative overflow-hidden rounded-3xl p-6 sm:p-8"
      >
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gradient-to-br from-violet-500/30 to-electric-500/0 blur-3xl" />
        <p className="text-xs uppercase tracking-[0.18em] text-violet-300">
          {greeting}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Your retrieval intelligence, at a glance.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Ask grounded questions, ingest new sources, and inspect exactly which chunks
          your model used to answer.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onJumpToChat} className="btn-primary">
            <Sparkles size={14} />
            Open chat
          </button>
        </div>
      </motion.div>

      <StatsRow stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed items={activity} />
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="font-display text-sm font-semibold tracking-wide">
            Knowledge base health
          </p>
          <div className="mt-2 h-44">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={42}
                    outerRadius={64}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(13,17,23,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-slate-500">
                No documents yet
              </div>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: d.color }}
                  />
                  {d.name}
                </span>
                <span className="text-slate-300">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mb-3 font-display text-sm font-semibold tracking-wide">
          Quick ask
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {examples.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => onQuickAsk(q)}
              className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs text-slate-300 transition hover:border-violet-400/40 hover:bg-white/[0.06]"
            >
              <span className="truncate">{q}</span>
              <ArrowRight
                size={13}
                className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-violet-300"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
