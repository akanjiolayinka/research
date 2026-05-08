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
  background: "#13161A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  fontSize: 12,
} as const;

const ACCENT = "#6366F1";
const GRID = "rgba(255,255,255,0.05)";
const AXIS = "#6B7280";

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
    const labels = ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"];
    const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
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
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-y-auto px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Computed from your local chat history.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Queries — last 7 days">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={queriesPerDay}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="day" stroke={AXIS} fontSize={11} tickLine={false} />
              <YAxis stroke={AXIS} fontSize={11} allowDecimals={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={ACCENT}
                strokeWidth={2}
                dot={{ r: 2.5, fill: ACCENT, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top retrieved documents">
          {topDocs.length === 0 ? (
            <Empty>No retrievals yet</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topDocs} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="source"
                  stroke={AXIS}
                  fontSize={11}
                  width={120}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Relevance score distribution">
          {allChunks.length === 0 ? (
            <Empty>Ask questions to populate this chart</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={histogram}>
                <CartesianGrid stroke={GRID} />
                <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} />
                <YAxis stroke={AXIS} fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Token usage">
          <div className="grid h-[200px] grid-cols-2 gap-3">
            <Stat label="Total messages" value={allMessages.length} />
            <Stat label="User questions" value={userMessages.length} />
            <Stat label="Tokens (est.)" value={tokenEstimate.toLocaleString()} />
            <Stat label="Sessions" value={sessions.length} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <p className="mb-3 text-sm font-medium text-slate-200">{title}</p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[200px] place-items-center text-xs text-slate-500">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col justify-center rounded-md border border-white/[0.06] bg-panel2 p-3">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
        {value}
      </span>
    </div>
  );
}
