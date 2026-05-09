import { motion } from "framer-motion";
import { ChevronDown, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  getEvalResults,
  runEval,
  type EvalResults,
  type EvalRunEvent,
} from "../../lib/api";
import { humanize } from "../../lib/errors";
import Spinner from "../UI/Spinner";

const ACCENT = "#6366F1";
const tooltipStyle = {
  background: "#13161A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  fontSize: 12,
} as const;

const METRIC_LABELS: Record<string, string> = {
  faithfulness: "Faithfulness",
  answer_relevancy: "Answer relevancy",
  context_recall: "Context recall",
};

function colorFor(score: number): string {
  if (score >= 0.8) return "#10B981";
  if (score >= 0.6) return "#6366F1";
  if (score >= 0.4) return "#F59E0B";
  return "#F43F5E";
}

export default function EvalScores() {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getEvalResults()
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        // network errors during initial fetch are non-fatal — fall back to placeholder
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (showLogs && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, showLogs]);

  async function start() {
    setRunning(true);
    setLogs([]);
    setShowLogs(true);
    try {
      await runEval((event: EvalRunEvent) => {
        if (event.type === "log") {
          setLogs((l) => [...l, event.line]);
        } else if (event.type === "done") {
          if (event.exit_code === 0 && event.results) {
            setResults(event.results);
            toast.success("Evaluation complete");
          } else {
            toast.error("Evaluation failed", {
              description: `Exit code ${event.exit_code}. Check the logs above.`,
            });
          }
        } else if (event.type === "error") {
          const e = humanize(event.message);
          toast.error(e.title, { description: e.detail });
        }
      });
    } catch (err) {
      const e = humanize(err);
      toast.error(e.title, { description: e.detail });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-200">Eval scores</p>
          <p className="text-[11px] text-slate-500">
            Ragas — faithfulness, answer relevancy, context recall
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="btn-primary text-xs"
        >
          {running ? (
            <>
              <Spinner size={12} />
              Running
            </>
          ) : results ? (
            <>
              <RotateCcw size={12} />
              Re-run
            </>
          ) : (
            <>
              <Play size={12} />
              Run evaluation
            </>
          )}
        </button>
      </div>

      <Body loading={loading} results={results} />

      {(showLogs || running) && (
        <div className="mt-4 overflow-hidden rounded-md border border-white/[0.06] bg-[#0b0d10]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
            <button
              type="button"
              onClick={() => setShowLogs((v) => !v)}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500 hover:text-slate-300"
            >
              <ChevronDown
                size={12}
                className={"transition " + (showLogs ? "" : "-rotate-90")}
              />
              Logs ({logs.length})
            </button>
            {!running && logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  setShowLogs(false);
                }}
                className="btn-ghost h-6 w-6 p-0"
                aria-label="Clear logs"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {showLogs && (
            <div
              ref={logsRef}
              className="max-h-48 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-400"
            >
              {logs.length === 0 ? (
                <p className="text-slate-600">Waiting for output…</p>
              ) : (
                logs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-words">
                    {line}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Body({
  loading,
  results,
}: {
  loading: boolean;
  results: EvalResults | null;
}) {
  if (loading) {
    return (
      <div className="grid h-[200px] place-items-center">
        <Spinner size={18} />
      </div>
    );
  }
  if (!results) {
    return (
      <div className="grid h-[200px] place-items-center text-center text-xs text-slate-500">
        <div>
          <p>No evaluation results yet.</p>
          <p className="mt-1">
            Click <span className="text-slate-300">Run evaluation</span> to score the
            pipeline against{" "}
            <code className="font-mono text-slate-400">data/eval_set.json</code>.
          </p>
        </div>
      </div>
    );
  }

  const data = Object.entries(METRIC_LABELS)
    .map(([key, label]) => {
      const v = results.summary?.[key];
      return v === undefined ? null : { metric: label, score: Number(v) };
    })
    .filter((d): d is { metric: string; score: number } => d !== null);

  if (data.length === 0) {
    return (
      <div className="grid h-[200px] place-items-center text-xs text-slate-500">
        Results file is missing the expected metrics.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="metric" stroke="#6B7280" fontSize={11} tickLine={false} />
          <YAxis
            domain={[0, 1]}
            stroke="#6B7280"
            fontSize={11}
            tickLine={false}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => v.toFixed(3)}
          />
          <Bar dataKey="score" fill={ACCENT} radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.metric} fill={colorFor(d.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        {data.map((d) => (
          <div
            key={d.metric}
            className="rounded-md border border-white/[0.06] bg-panel2 px-3 py-1.5"
          >
            <p className="text-slate-500">{d.metric}</p>
            <p
              className="font-mono text-base tabular-nums"
              style={{ color: colorFor(d.score) }}
            >
              {(d.score * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
