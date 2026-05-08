import { motion } from "framer-motion";
import { Globe, Link2 } from "lucide-react";
import { useState } from "react";

export type IngestStep = "idle" | "fetching" | "chunking" | "embedding" | "done" | "error";

interface Props {
  onIngest: (url: string) => Promise<void>;
  step: IngestStep;
}

const stepLabels: Record<IngestStep, string> = {
  idle: "",
  fetching: "Fetching page",
  chunking: "Chunking text",
  embedding: "Embedding & upserting",
  done: "Done",
  error: "Failed",
};

const order: IngestStep[] = ["fetching", "chunking", "embedding", "done"];

export default function URLIngestor({ onIngest, step }: Props) {
  const [url, setUrl] = useState("");
  const busy = step !== "idle" && step !== "done" && step !== "error";

  async function submit() {
    if (!url.trim() || busy) return;
    await onIngest(url.trim());
    setUrl("");
  }

  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Globe size={12} /> Ingest from URL
      </p>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-violet-400/50">
          <Link2 size={14} className="text-slate-500" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="https://example.com/article"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
            disabled={busy}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !url.trim()}
          className="btn-primary"
        >
          {busy ? "Ingesting…" : "Ingest"}
        </button>
      </div>

      {step !== "idle" && (
        <div className="mt-4 flex items-center gap-1.5">
          {order.map((s, i) => {
            const reached = order.indexOf(step) >= i || step === "done";
            const active = step === s;
            return (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <motion.div
                  animate={{ scale: active ? 1.05 : 1 }}
                  className={
                    "flex flex-1 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] " +
                    (step === "error" && active
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : reached
                        ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                        : "border-white/10 bg-white/[0.02] text-slate-500")
                  }
                >
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (active && step !== "error"
                        ? "animate-pulse bg-violet-300"
                        : reached
                          ? "bg-violet-400"
                          : "bg-slate-600")
                    }
                  />
                  {stepLabels[s]}
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
