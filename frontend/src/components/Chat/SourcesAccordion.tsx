import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, Paperclip } from "lucide-react";
import { useState } from "react";
import type { RetrievedChunk } from "../../lib/api";
import Badge from "../UI/Badge";

interface Props {
  sources: string[];
  chunks?: RetrievedChunk[];
}

function scoreTone(score: number) {
  if (score >= 0.75) return "success" as const;
  if (score >= 0.5) return "electric" as const;
  if (score >= 0.3) return "warning" as const;
  return "danger" as const;
}

export default function SourcesAccordion({ sources, chunks }: Props) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-xs text-slate-400 transition hover:text-white"
      >
        <span className="flex items-center gap-1.5">
          <Paperclip size={12} />
          <span className="font-medium text-slate-300">Sources</span>
          <span className="text-slate-500">({sources.length})</span>
        </span>
        <ChevronDown
          size={14}
          className={"transition " + (open ? "rotate-180" : "")}
        />
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <motion.span
            key={`${s}-${i}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 22, delay: i * 0.04 }}
          >
            <Badge tone="electric">
              <FileText size={10} />
              {s}
            </Badge>
          </motion.span>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-2">
              {chunks && chunks.length > 0 ? (
                chunks.map((c, i) => (
                  <div
                    key={`${c.source}-${c.chunk_idx}-${i}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-slate-300">
                        {c.source}{" "}
                        <span className="text-slate-500">· chunk #{c.chunk_idx}</span>
                      </p>
                      {c.score > 0 && (
                        <Badge tone={scoreTone(c.score)}>{c.score.toFixed(2)}</Badge>
                      )}
                    </div>
                    <p className="line-clamp-4 text-[11px] leading-relaxed text-slate-400">
                      {c.text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-500">
                  Open the Context Inspector for full chunk details.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
