import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, X } from "lucide-react";
import { useState } from "react";
import type { RetrievedChunk } from "../../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  chunks: RetrievedChunk[];
  sources: string[];
}

function scoreColor(score: number) {
  if (score >= 0.75) return "text-emerald-400";
  if (score >= 0.5) return "text-slate-300";
  if (score >= 0.3) return "text-amber-400";
  return "text-rose-400";
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
          text: "Chunk text not available.",
        }));

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex h-full w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-surface"
        >
          <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">Context</p>
              <p className="text-[11px] text-slate-500">Retrieved chunks</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost h-8 w-8 p-0"
              aria-label="Close inspector"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {visibleChunks.length === 0 ? (
              <p className="mt-12 text-center text-xs text-slate-500">
                Ask something to see retrieved chunks here.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleChunks.map((c, i) => (
                  <div
                    key={`${c.source}-${c.chunk_idx}-${i}`}
                    className="rounded-md border border-white/[0.06] bg-panel p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-300">
                        <FileText size={12} className="shrink-0 text-slate-500" />
                        <span className="truncate">{c.source}</span>
                      </div>
                      {c.score > 0 && (
                        <span className={`font-mono text-[11px] ${scoreColor(c.score)}`}>
                          {c.score.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Chunk #{c.chunk_idx}</p>
                    <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-slate-300">
                      {c.text}
                    </p>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="mt-2 flex items-center justify-between rounded-md border border-white/[0.06] bg-panel px-3 py-2 text-xs text-slate-400 transition hover:bg-panel2 hover:text-slate-200"
                >
                  <span>Why these results?</span>
                  <ChevronDown
                    size={14}
                    className={"transition " + (showWhy ? "rotate-180" : "")}
                  />
                </button>
                {showWhy && (
                  <p className="rounded-md border border-white/[0.06] bg-panel/60 p-3 text-[11px] leading-relaxed text-slate-400">
                    Your question is embedded with all-MiniLM-L6-v2, the top-K most
                    similar chunks are retrieved from Pinecone by cosine similarity, and
                    Llama 3.3 70B on Groq generates an answer constrained to that
                    context. Higher scores mean more relevant chunks.
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
