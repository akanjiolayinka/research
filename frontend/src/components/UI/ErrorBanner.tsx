import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  title: string;
  detail: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorBanner({
  title,
  detail,
  onRetry,
  retryLabel = "Retry",
}: Props) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-rose-500/30 bg-rose-500/[0.08] p-3">
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-400" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-rose-300">{title}</p>
        <p className="mt-0.5 text-xs text-rose-200/70">{detail}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            <RotateCcw size={12} />
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
