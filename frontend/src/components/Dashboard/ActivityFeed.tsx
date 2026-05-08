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
    <div className="panel p-4">
      <p className="mb-3 text-sm font-medium text-slate-200">Recent activity</p>
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No queries yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it, i) => (
            <li
              key={it.id}
              className={
                "flex flex-col gap-1 py-3 " +
                (i < items.length - 1 ? "border-b border-white/[0.06]" : "")
              }
            >
              <p className="truncate text-sm text-slate-200" title={it.question}>
                {it.question}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>{relative(it.at)}</span>
                {it.sources.length > 0 && <span aria-hidden="true">·</span>}
                {it.sources.slice(0, 3).map((s, idx) => (
                  <span key={s + idx} className="truncate max-w-[160px]" title={s}>
                    {s}
                  </span>
                ))}
                {it.sources.length > 3 && <span>+{it.sources.length - 3}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
