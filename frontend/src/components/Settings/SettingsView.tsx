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
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto px-6 py-6">
      <Section title="Appearance">
        <Row label="Theme" hint="Switch between dark and light modes">
          <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            {(["dark", "light"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => onTheme(t)}
                className={
                  "rounded-lg px-3 py-1 text-xs font-medium transition " +
                  (theme === t
                    ? "bg-gradient-electric text-white shadow-glow-sm"
                    : "text-slate-400 hover:text-white")
                }
              >
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Pinecone">
        <Row label="Active namespace" hint="Switch which subset of vectors to query">
          <input
            value={namespace}
            onChange={(e) => onNamespace(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm outline-none focus:border-violet-400"
          />
        </Row>
      </Section>

      <Section title="Backend">
        <Row label="API URL" hint="Configured via VITE_API_URL">
          <code className="rounded-lg bg-white/5 px-2 py-1 text-xs text-violet-300">
            {API_URL}
          </code>
        </Row>
      </Section>

      <Section title="Data">
        <Row
          label="Local chat history"
          hint="Stored in your browser. Clearing does not delete vectors."
        >
          <button
            type="button"
            onClick={() => {
              onClearHistory();
              toast.success("Chat history cleared");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
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
    <div className="glass rounded-2xl p-5">
      <p className="mb-3 font-display text-sm font-semibold tracking-wide">{title}</p>
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
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
