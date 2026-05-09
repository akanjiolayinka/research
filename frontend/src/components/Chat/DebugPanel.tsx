import { motion } from "framer-motion";
import { ShieldAlert, Sparkles } from "lucide-react";
import type { ChatMessage } from "../../lib/store";

interface Props {
  message: ChatMessage;
}

function scoreColor(score: number) {
  if (score >= 0.75) return "text-emerald-400";
  if (score >= 0.5) return "text-slate-300";
  if (score >= 0.3) return "text-amber-400";
  return "text-rose-400";
}

function rerankColor(score: number) {
  if (score >= 5) return "text-emerald-400";
  if (score >= 1) return "text-slate-300";
  if (score >= 0.1) return "text-amber-400";
  return "text-rose-400";
}

export default function DebugPanel({ message }: Props) {
  const guardrailFired = message.guardrail === "no_relevant_context";
  const original = message.originalQuery;
  const rewritten = message.rewrittenQuery;
  const chunks = message.chunks ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div className="rounded-md border border-white/[0.08] bg-panel2 p-3 text-xs">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-slate-500">
          Pipeline trace
        </p>

        {original && (
          <Row label="Original">
            <span className="text-slate-300">{original}</span>
          </Row>
        )}

        {rewritten && rewritten !== original && (
          <Row label="Rewritten">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles size={11} className="text-accent-400" />
              {rewritten}
            </span>
          </Row>
        )}

        {guardrailFired ? (
          <Row label="Guardrail">
            <span className="flex items-center gap-1.5 text-amber-400">
              <ShieldAlert size={11} />
              No relevant context found — LLM was not called.
            </span>
          </Row>
        ) : (
          <Row label="Chunks">
            {chunks.length === 0 ? (
              <span className="text-slate-500">none</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {chunks.map((c, i) => (
                  <div
                    key={`${c.source}-${c.chunk_idx}-${i}`}
                    className="flex items-center justify-between gap-3 font-mono text-[11px]"
                  >
                    <span className="min-w-0 truncate text-slate-300" title={c.source}>
                      {c.source}
                      <span className="ml-1.5 text-slate-500">#{c.chunk_idx}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums">
                      {c.score > 0 && (
                        <span className={scoreColor(c.score)} title="Vector similarity">
                          sim {c.score.toFixed(2)}
                        </span>
                      )}
                      {c.rerank_score !== undefined && (
                        <span
                          className={rerankColor(c.rerank_score)}
                          title="Cross-encoder rerank"
                        >
                          rr {c.rerank_score.toFixed(2)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Row>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 grid grid-cols-[80px_1fr] items-start gap-3 last:mb-0">
      <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
