import { useRef, useState } from "react";
import { Link2, Loader2, Upload } from "lucide-react";
import { ingestFile, ingestUrl, type IngestResult } from "../lib/api";

interface ToastState {
  type: "success" | "error";
  text: string;
}

export default function IngestPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [history, setHistory] = useState<IngestResult[]>([]);

  function showResult(result: IngestResult) {
    setHistory((h) => [result, ...h].slice(0, 8));
    setToast({
      type: "success",
      text: `Ingested ${result.source}: ${result.chunks} chunks`,
    });
    setTimeout(() => setToast(null), 4000);
  }

  function showError(err: unknown) {
    setToast({ type: "error", text: err instanceof Error ? err.message : String(err) });
    setTimeout(() => setToast(null), 5000);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await ingestFile(file);
      showResult(result);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onUrl() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const result = await ingestUrl(url.trim());
      showResult(result);
      setUrl("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full flex-col gap-4 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Knowledge sources
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Upload PDFs, Markdown, or text files — or paste a URL.
        </p>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        Upload file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.md,.markdown,.txt,.rst"
        className="hidden"
        onChange={onFile}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-slate-500" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onUrl()}
            placeholder="https://example.com/article"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={onUrl}
          disabled={busy || !url.trim()}
          className="w-full rounded-lg bg-indigo-600 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          Ingest URL
        </button>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recently ingested
          </h3>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {history.map((h, i) => (
              <li key={i} className="truncate" title={h.source}>
                • {h.source} <span className="text-slate-400">({h.chunks} chunks)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && (
        <div
          className={`mt-auto rounded-lg px-3 py-2 text-xs ${
            toast.type === "success"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
          }`}
        >
          {toast.text}
        </div>
      )}
    </aside>
  );
}
