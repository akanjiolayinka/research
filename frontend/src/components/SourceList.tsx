import { FileText } from "lucide-react";

export default function SourceList({ sources }: { sources: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/10 pt-2 dark:border-white/10">
      {sources.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          title={s}
        >
          <FileText size={12} />
          {s}
        </span>
      ))}
    </div>
  );
}
