import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChatSession, IngestedDoc } from "../../lib/store";
import ActivityFeed, { type ActivityItem } from "./ActivityFeed";
import StatsRow, { type DashboardStats } from "./StatsRow";

interface Props {
  sessions: ChatSession[];
  docs: IngestedDoc[];
  onQuickAsk: (question: string) => void;
  onJumpToChat: () => void;
}

const examples = [
  "Summarize the key takeaways from the latest paper",
  "What does the documentation say about authentication?",
  "Compare the two reports I uploaded",
];

const tooltipStyle = {
  background: "#13161A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  fontSize: 12,
} as const;

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
      avgResponseMs: 0,
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Overview
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            What's in your index and what's been asked of it.
          </p>
        </div>
        <button type="button" onClick={onJumpToChat} className="btn-primary text-xs">
          Open chat
          <ArrowRight size={12} />
        </button>
      </div>

      <StatsRow stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed items={activity} />
        </div>
        <div className="panel p-4">
          <p className="text-sm font-medium text-slate-200">Index health</p>
          <div className="mt-3 h-40">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
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
                <span className="tabular-nums text-slate-300">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel p-4">
        <p className="mb-3 text-sm font-medium text-slate-200">Quick ask</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {examples.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => onQuickAsk(q)}
              className="group flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-panel2 px-3 py-2 text-left text-xs text-slate-400 transition hover:border-white/[0.12] hover:text-slate-200"
            >
              <span className="truncate">{q}</span>
              <ArrowRight
                size={12}
                className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-300"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
