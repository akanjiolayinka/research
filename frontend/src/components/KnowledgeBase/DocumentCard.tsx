import { File, FileText, Globe, RefreshCw, Trash2, type LucideIcon } from "lucide-react";
import type { IngestedDoc } from "../../lib/store";
import Badge from "../UI/Badge";

const typeIcons: Record<IngestedDoc["type"], LucideIcon> = {
  pdf: File,
  md: FileText,
  txt: FileText,
  url: Globe,
};

interface Props {
  doc: IngestedDoc;
  onDelete: (id: string) => void;
  onReindex?: (id: string) => void;
}

export default function DocumentCard({ doc, onDelete, onReindex }: Props) {
  const Icon = typeIcons[doc.type];
  const date = new Date(doc.ingestedAt);

  return (
    <div className="group flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-panel p-4 transition hover:border-white/[0.12]">
      <div className="flex items-start gap-3">
        <Icon size={16} className="mt-0.5 shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-200" title={doc.name}>
            {doc.name}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {doc.chunks} chunks
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge
          tone={
            doc.status === "indexed"
              ? "success"
              : doc.status === "processing"
                ? "warning"
                : "danger"
          }
        >
          {doc.status === "indexed"
            ? "Indexed"
            : doc.status === "processing"
              ? "Processing"
              : "Failed"}
        </Badge>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {onReindex && (
            <button
              type="button"
              onClick={() => onReindex(doc.id)}
              className="btn-ghost h-7 w-7 p-0"
              aria-label="Re-index"
              title="Re-index"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(doc.id)}
            className="btn-ghost h-7 w-7 p-0 hover:text-rose-400"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
