import clsx from "clsx";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../../lib/store";
import ErrorBanner from "../UI/ErrorBanner";
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

  return (
    <div className="group flex flex-col gap-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Assistant
      </div>
      {message.rewrittenQuery && (
        <p className="text-[11px] text-slate-500">
          Searched as:{" "}
          <span className="font-mono text-slate-400">{message.rewrittenQuery}</span>
        </p>
      )}
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
        </>
      )}

      {!message.pending && !message.error && (
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
        </div>
      )}
    </div>
  );
}
