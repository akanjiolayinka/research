import { AlertTriangle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  title: string;
  detail: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorBanner({ title, detail, onRetry, retryLabel = "Retry" }: Props) {
  return (
    <motion.div
      className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      key={title + detail}
    >
      <div className="mt-0.5 rounded-lg bg-rose-500/20 p-1.5 text-rose-300">
        <AlertTriangle size={16} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-200">{title}</p>
        <p className="mt-0.5 text-xs text-rose-200/80">{detail}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            <RotateCcw size={12} />
            {retryLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}
