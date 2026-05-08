import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import type { RetrievedChunk } from "../../lib/api";

interface Props {
  sources: string[];
  chunks?: RetrievedChunk[];
}

function scoreColor(score: number) {
  if (score >= 0.75) return "text-emerald-400";
  if (score >= 0.5) return "text-slate-300";
  if (score >= 0.3) return "text-amber-400";
  return "text-rose-400";
}

export default function SourcesAccordion({ sources, chunks }: Props) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs text-slate-400 transition hover:text-slate-200"
      >
        <span className="flex items-center gap-1.5">
          <FileText size={12} />
          <span className="font-medium">Sources</span>
          <span className="text-slate-500">({sources.length})</span>
        </span>
        <ChevronDown
          size={14}
          className={"transition " + (open ? "rotate-180" : "")}
        />
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <span
            key={`${s}-${i}`}
            className="inline-flex max-w-[220px] items-center gap-1 truncate rounded border border-white/[0.08] bg-panel2 px-1.5 py-0.5 text-[11px] text-slate-300"
            title={s}
          >
            <FileText size={10} className="shrink-0 text-slate-500" />
            <span className="truncate">{s}</span>
          </span>
        ))}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {chunks && chunks.length > 0 ? (
            chunks.map((c, i) => (
              <div
                key={`${c.source}-${c.chunk_idx}-${i}`}
                className="rounded-md border border-white/[0.06] bg-panel/60 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-slate-300">
                    {c.source}
                    <span className="ml-2 text-slate-500">#{c.chunk_idx}</span>
                  </p>
                  {c.score > 0 && (
                    <span className={`font-mono text-[11px] ${scoreColor(c.score)}`}>
                      {c.score.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="line-clamp-4 text-[11px] leading-relaxed text-slate-400">
                  {c.text}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-500">
              Open the Context inspector for full chunk details.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
