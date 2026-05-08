import { motion } from "framer-motion";
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-violet-400/40"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-electric-500/20 to-violet-500/20 text-violet-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100" title={doc.name}>
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
              className="rounded-lg bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Re-index"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(doc.id)}
            className="rounded-lg bg-white/5 p-1.5 text-rose-300 hover:bg-rose-500/20"
            aria-label="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
