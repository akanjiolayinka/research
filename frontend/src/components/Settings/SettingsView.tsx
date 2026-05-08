import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "../../lib/api";

interface Props {
  theme: string;
  onTheme: (t: string) => void;
  namespace: string;
  onNamespace: (ns: string) => void;
  onClearHistory: () => void;
}

export default function SettingsView({
  theme,
  onTheme,
  namespace,
  onNamespace,
  onClearHistory,
}: Props) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Settings
        </h1>
      </div>

      <Section title="Appearance">
        <Row label="Theme" hint="Switch between dark and light modes">
          <div className="flex gap-1 rounded-md border border-white/[0.08] bg-panel2 p-1">
            {(["dark", "light"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => onTheme(t)}
                className={
                  "rounded px-3 py-1 text-xs font-medium transition " +
                  (theme === t
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-slate-200")
                }
              >
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Pinecone">
        <Row label="Active namespace" hint="The subset of vectors used for queries">
          <input
            value={namespace}
            onChange={(e) => onNamespace(e.target.value)}
            className="input-base h-8 w-48 py-0 text-xs"
          />
        </Row>
      </Section>

      <Section title="Backend">
        <Row label="API URL" hint="Configured via VITE_API_URL">
          <code className="rounded border border-white/[0.06] bg-panel2 px-2 py-1 font-mono text-[11px] text-slate-300">
            {API_URL}
          </code>
        </Row>
      </Section>

      <Section title="Data">
        <Row
          label="Local chat history"
          hint="Stored only in your browser. Pinecone vectors are not affected."
        >
          <button
            type="button"
            onClick={() => {
              onClearHistory();
              toast.success("Chat history cleared");
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/[0.12]"
          >
            <Trash2 size={12} />
            Clear history
          </button>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <p className="mb-3 text-sm font-medium text-slate-200">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
