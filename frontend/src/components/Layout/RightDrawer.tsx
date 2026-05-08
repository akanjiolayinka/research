import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, Info, X } from "lucide-react";
import { useState } from "react";
import type { RetrievedChunk } from "../../lib/api";
import Badge from "../UI/Badge";

interface Props {
  open: boolean;
  onClose: () => void;
  chunks: RetrievedChunk[];
  sources: string[];
}

function scoreTone(score: number) {
  if (score >= 0.75) return "success" as const;
  if (score >= 0.5) return "electric" as const;
  if (score >= 0.3) return "warning" as const;
  return "danger" as const;
}

export default function RightDrawer({ open, onClose, chunks, sources }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const visibleChunks =
    chunks.length > 0
      ? chunks
      : sources.map<RetrievedChunk>((s, i) => ({
          source: s,
          chunk_idx: i,
          score: 0,
          text: "(text not available — backend did not include chunk text)",
        }));

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="flex h-full w-[320px] shrink-0 flex-col border-l border-white/10 bg-ink-950/70 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold">Context Inspector</p>
              <p className="text-[11px] text-slate-500">Retrieved chunks for last query</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
              aria-label="Close inspector"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {visibleChunks.length === 0 ? (
              <div className="mt-12 text-center text-xs text-slate-500">
                <Info size={20} className="mx-auto mb-2 opacity-50" />
                Ask something to see retrieved chunks here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleChunks.map((c, i) => (
                  <motion.div
                    key={`${c.source}-${c.chunk_idx}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-xl p-3"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-300">
                        <FileText size={12} className="shrink-0 text-slate-500" />
                        <span className="truncate">{c.source}</span>
                      </div>
                      {c.score > 0 && (
                        <Badge tone={scoreTone(c.score)}>{c.score.toFixed(2)}</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chunk #{c.chunk_idx}
                    </p>
                    <p className="mt-1.5 line-clamp-6 text-xs leading-relaxed text-slate-300">
                      {c.text}
                    </p>
                  </motion.div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <span>Why these results?</span>
                  <ChevronDown
                    size={14}
                    className={"transition " + (showWhy ? "rotate-180" : "")}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {showWhy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
                        Your question was embedded with{" "}
                        <span className="text-violet-300">all-MiniLM-L6-v2</span> and the
                        top-K most similar chunks from your Pinecone index were retrieved
                        by cosine similarity, then passed to{" "}
                        <span className="text-electric-400">Llama 3.3 70B</span> on Groq.
                        Higher scores mean more relevant context.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
