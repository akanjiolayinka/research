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
      const result = await ingestFile(file, {
        namespace,
        onProgress: (loaded, total) => setProgress(loaded / total),
      });
      persist([
        { ...optimistic, chunks: result.chunks, status: "indexed" },
        ...docs,
      ]);
      toast.success(`Indexed ${result.source}`, {
        description: `${result.chunks} chunks`,
      });
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

    const stepTimer = setTimeout(() => setStep("chunking"), 600);
    const stepTimer2 = setTimeout(() => setStep("embedding"), 1400);

    try {
      const result = await ingestUrl(url, namespace);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setStep("done");
      persist([
        { ...optimistic, chunks: result.chunks, status: "indexed", name: result.source },
        ...docs,
      ]);
      toast.success(`Indexed ${result.source}`, {
        description: `${result.chunks} chunks`,
      });
    } catch (err) {
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setStep("error");
      const e = humanize(err);
      persist([{ ...optimistic, status: "failed", error: e.detail }, ...docs]);
      toast.error(e.title, { description: e.detail });
    } finally {
      setTimeout(() => setStep("idle"), 1200);
    }
  }

  function deleteDoc(id: string) {
    persist(docs.filter((d) => d.id !== id));
    toast.message("Removed from list", {
      description: "Vectors remain in Pinecone until the index is reset.",
    });
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Namespace</span>
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="input-base h-8 w-auto py-0 pr-8 text-xs"
          >
            {[...new Set([namespace, "default", "personal", "work"])].map((ns) => (
              <option key={ns} value={ns} className="bg-panel">
                {ns}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">{visible.length} indexed</span>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-md border border-white/[0.08] bg-panel2 px-3 py-1.5">
          <Search size={13} className="text-slate-500" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search documents"
            className="w-48 bg-transparent text-xs outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <UploadZone onFile={handleFile} busy={busy} progress={progress} />
      <URLIngestor onIngest={handleUrl} step={step} />

      <div>
        <p className="mb-3 text-xs font-medium text-slate-500">Documents</p>
        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-500">
            No documents in <span className="text-slate-300">{namespace}</span>. Upload a
            file or paste a URL above.
          </div>
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
