import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import { Bug, Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../../lib/store";
import ErrorBanner from "../UI/ErrorBanner";
import DebugPanel from "./DebugPanel";
import SourcesAccordion from "./SourcesAccordion";
import TypingIndicator from "./TypingIndicator";

interface Props {
  message: ChatMessage;
  onRetry?: () => void;
}

export default function MessageBubble({ message, onRetry }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-md bg-panel2 px-3 py-2 text-sm text-slate-100">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const hasDebug =
    !!message.rewrittenQuery ||
    !!message.guardrail ||
    (message.chunks?.length ?? 0) > 0;

  return (
    <div className="group flex flex-col gap-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Assistant
      </div>
      {message.error ? (
        <ErrorBanner
          title={message.error.title}
          detail={message.error.detail}
          onRetry={onRetry}
        />
      ) : message.pending && !message.content ? (
        <TypingIndicator />
      ) : (
        <>
          <div
            className={clsx(
              "markdown text-slate-200",
              message.pending && "stream-caret",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          {message.sources && (
            <SourcesAccordion sources={message.sources} chunks={message.chunks} />
          )}
          <AnimatePresence initial={false}>
            {debugOpen && hasDebug && <DebugPanel message={message} />}
          </AnimatePresence>
        </>
      )}

      {!message.pending && !message.error && (
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 has-[button[aria-pressed=true]]:opacity-100">
          <button
            type="button"
            onClick={copy}
            className="btn-ghost h-7 w-7 p-0"
            aria-label="Copy"
            title="Copy"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            className={clsx(
              "btn-ghost h-7 w-7 p-0",
              feedback === "up" && "text-emerald-400",
            )}
            aria-label="Good response"
            title="Good"
          >
            <ThumbsUp size={12} />
          </button>
          <button
            type="button"
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            className={clsx(
              "btn-ghost h-7 w-7 p-0",
              feedback === "down" && "text-rose-400",
            )}
            aria-label="Bad response"
            title="Bad"
          >
            <ThumbsDown size={12} />
          </button>
          {hasDebug && (
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              aria-pressed={debugOpen}
              className={clsx(
                "btn-ghost h-7 w-7 p-0",
                debugOpen && "text-accent-400",
              )}
              aria-label="Toggle debug panel"
              title="Pipeline trace"
            >
              <Bug size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
