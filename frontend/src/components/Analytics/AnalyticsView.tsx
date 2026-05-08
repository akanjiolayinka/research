import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChatSession } from "../../lib/store";

interface Props {
  sessions: ChatSession[];
}

const tooltipStyle = {
  background: "rgba(13,17,23,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
} as const;

export default function AnalyticsView({ sessions }: Props) {
  const allMessages = sessions.flatMap((s) => s.messages);
  const userMessages = allMessages.filter((m) => m.role === "user");
  const allChunks = allMessages.flatMap((m) => m.chunks ?? []);

  const queriesPerDay = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      buckets[key] = 0;
    }
    for (const m of userMessages) {
      const d = new Date(m.createdAt);
      const key = d.toISOString().slice(5, 10);
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([day, count]) => ({ day, count }));
  }, [userMessages]);

  const topDocs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of allChunks) counts[c.source] = (counts[c.source] ?? 0) + 1;
    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [allChunks]);

  const histogram = useMemo(() => {
    const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const labels = ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"];
    const counts = labels.map(() => 0);
    for (const c of allChunks) {
      for (let i = 0; i < bins.length - 1; i++) {
        if (c.score >= bins[i] && c.score < bins[i + 1]) {
          counts[i]++;
          break;
        }
      }
    }
    return labels.map((label, i) => ({ label, count: counts[i] }));
  }, [allChunks]);

  const tokenEstimate = allMessages.reduce(
    (acc, m) => acc + Math.ceil(m.content.length / 4),
    0,
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 overflow-y-auto px-6 py-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Queries over the last 7 days">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={queriesPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#7C3AED"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#7C3AED" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top retrieved documents">
          {topDocs.length === 0 ? (
            <Empty>No retrievals yet</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDocs} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="source"
                  stroke="#94A3B8"
                  fontSize={11}
                  width={120}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Relevance score distribution">
          {allChunks.length === 0 ? (
            <Empty>Ask questions to populate this chart</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#A78BFA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Token usage (est.)">
          <div className="grid h-[220px] grid-cols-2 gap-3">
            <Stat label="Total messages" value={allMessages.length} />
            <Stat label="User questions" value={userMessages.length} />
            <Stat
              label="Tokens (rough est.)"
              value={tokenEstimate.toLocaleString()}
            />
            <Stat label="Sessions" value={sessions.length} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="mb-3 font-display text-sm font-semibold tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[220px] place-items-center text-xs text-slate-500">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className="mt-0.5 font-display text-2xl font-bold text-white">{value}</span>
    </div>
  );
}
