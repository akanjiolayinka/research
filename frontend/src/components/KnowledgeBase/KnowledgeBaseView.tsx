import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ingestFile, ingestUrl } from "../../lib/api";
import { humanize } from "../../lib/errors";
import {
  inferDocType,
  saveDocs,
  uid,
  type IngestedDoc,
} from "../../lib/store";
import Badge from "../UI/Badge";
import DocumentCard from "./DocumentCard";
import UploadZone from "./UploadZone";
import URLIngestor, { type IngestStep } from "./URLIngestor";

interface Props {
  docs: IngestedDoc[];
  setDocs: (d: IngestedDoc[]) => void;
  namespace: string;
  setNamespace: (ns: string) => void;
}

export default function KnowledgeBaseView({
  docs,
  setDocs,
  namespace,
  setNamespace,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<IngestStep>("idle");
  const [filter, setFilter] = useState("");

  const visible = useMemo(
    () =>
      docs
        .filter((d) => d.namespace === namespace)
        .filter((d) =>
          filter ? d.name.toLowerCase().includes(filter.toLowerCase()) : true,
        )
        .sort((a, b) => b.ingestedAt - a.ingestedAt),
    [docs, namespace, filter],
  );

  function persist(next: IngestedDoc[]) {
    setDocs(next);
    saveDocs(next);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setProgress(0);
    const optimistic: IngestedDoc = {
      id: uid(),
      name: file.name,
      type: inferDocType(file.name),
      chunks: 0,
      status: "processing",
      ingestedAt: Date.now(),
      namespace,
    };
    persist([optimistic, ...docs]);

    try {
      const result = await ingestFile(file, (loaded, total) =>
        setProgress(loaded / total),
      );
      persist([
        {
          ...optimistic,
          chunks: result.chunks,
          status: "indexed",
        },
        ...docs,
      ]);
      toast.success(`Indexed ${result.source} (${result.chunks} chunks)`);
    } catch (err) {
      const e = humanize(err);
      persist([{ ...optimistic, status: "failed", error: e.detail }, ...docs]);
      toast.error(e.title, { description: e.detail });
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function handleUrl(url: string) {
    setStep("fetching");
    const optimistic: IngestedDoc = {
      id: uid(),
      name: url,
      type: "url",
      chunks: 0,
      status: "processing",
      ingestedAt: Date.now(),
      namespace,
    };
    persist([optimistic, ...docs]);

    // visual step indicator (backend is one round trip)
    const stepTimer = setTimeout(() => setStep("chunking"), 600);
    const stepTimer2 = setTimeout(() => setStep("embedding"), 1400);

    try {
      const result = await ingestUrl(url);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setStep("done");
      persist([
        { ...optimistic, chunks: result.chunks, status: "indexed", name: result.source },
        ...docs,
      ]);
      toast.success(`Indexed ${result.source} (${result.chunks} chunks)`);
    } catch (err) {
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setStep("error");
      const e = humanize(err);
      persist([{ ...optimistic, status: "failed", error: e.detail }, ...docs]);
      toast.error(e.title, { description: e.detail });
    } finally {
      setTimeout(() => setStep("idle"), 1500);
    }
  }

  function deleteDoc(id: string) {
    persist(docs.filter((d) => d.id !== id));
    toast.message("Removed from knowledge base", {
      description: "Vectors remain in Pinecone until you reset the index.",
    });
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 overflow-y-auto px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Namespace
          </span>
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm outline-none focus:border-violet-400"
          >
            {[...new Set([namespace, "default", "personal", "work"])].map((ns) => (
              <option key={ns} value={ns} className="bg-ink-900">
                {ns}
              </option>
            ))}
          </select>
          <Badge tone="electric">{visible.length} docs</Badge>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5">
          <Search size={14} className="text-slate-500" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search documents…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <UploadZone onFile={handleFile} busy={busy} progress={progress} />
      <URLIngestor onIngest={handleUrl} step={step} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-semibold tracking-wide">
            Documents
          </p>
        </div>
        {visible.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-slate-500"
          >
            Nothing indexed yet in <code className="text-violet-300">{namespace}</code>.
            Drop a file above or paste a URL.
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((d) => (
              <DocumentCard key={d.id} doc={d} onDelete={deleteDoc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
