export interface DashboardStats {
  documents: number;
  queries: number;
  avgRelevance: number;
  avgResponseMs: number;
}

const items = [
  { key: "documents" as const, label: "Documents indexed" },
  { key: "queries" as const, label: "Queries run" },
  { key: "avgRelevance" as const, label: "Avg relevance" },
  { key: "avgResponseMs" as const, label: "Avg response" },
];

function format(key: keyof DashboardStats, n: number) {
  if (key === "avgRelevance") return n > 0 ? `${(n * 100).toFixed(0)}%` : "—";
  if (key === "avgResponseMs") return n > 0 ? `${(n / 1000).toFixed(1)}s` : "—";
  return Math.round(n).toLocaleString();
}

export default function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-lg border border-white/[0.06] bg-panel p-4"
        >
          <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
            {format(item.key, stats[item.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
