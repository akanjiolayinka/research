import { Link2 } from "lucide-react";
import { useState } from "react";

export type IngestStep = "idle" | "fetching" | "chunking" | "embedding" | "done" | "error";

interface Props {
  onIngest: (url: string) => Promise<void>;
  step: IngestStep;
}

const stepLabels: Record<Exclude<IngestStep, "idle" | "done" | "error">, string> = {
  fetching: "Fetching",
  chunking: "Chunking",
  embedding: "Embedding",
};

const order: Array<keyof typeof stepLabels> = ["fetching", "chunking", "embedding"];

export default function URLIngestor({ onIngest, step }: Props) {
  const [url, setUrl] = useState("");
  const busy = step !== "idle" && step !== "done" && step !== "error";

  async function submit() {
    if (!url.trim() || busy) return;
    await onIngest(url.trim());
    setUrl("");
  }

  return (
    <div className="panel p-4">
      <p className="mb-3 text-xs font-medium text-slate-400">Ingest from URL</p>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-white/[0.08] bg-panel2 px-3 py-2 transition focus-within:border-accent/40">
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
          className="btn-primary text-xs"
        >
          {busy ? "Ingesting" : "Ingest"}
        </button>
      </div>

      {step !== "idle" && (
        <div className="mt-4 flex items-center gap-2">
          {order.map((s) => {
            const reachedIdx = step === "done" ? order.length : order.indexOf(step as typeof s);
            const myIdx = order.indexOf(s);
            const reached = reachedIdx >= myIdx;
            const active = step === s;
            const failed = step === "error" && active;
            return (
              <div
                key={s}
                className={
                  "flex flex-1 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] " +
                  (failed
                    ? "border-rose-500/30 text-rose-300"
                    : reached
                      ? "border-white/[0.08] text-slate-300"
                      : "border-white/[0.05] text-slate-500")
                }
              >
                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (active && !failed
                      ? "animate-pulse bg-accent"
                      : reached
                        ? "bg-slate-500"
                        : "bg-slate-700")
                  }
                />
                {stepLabels[s]}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
