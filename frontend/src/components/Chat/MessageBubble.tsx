import clsx from "clsx";
import { motion } from "framer-motion";
import { Check, Copy, Sparkles, ThumbsDown, ThumbsUp, User } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={clsx("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-electric shadow-glow-sm">
          <Sparkles size={14} className="text-white" />
        </div>
      )}
      <div
        className={clsx(
          "group relative max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-electric-600 to-violet-600 text-white shadow-glow-sm"
            : "rounded-bl-md glass-strong",
        )}
      >
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
                "markdown",
                !isUser && "text-slate-100",
                message.pending && !isUser && "stream-caret",
              )}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
            {!isUser && message.sources && (
              <SourcesAccordion sources={message.sources} chunks={message.chunks} />
            )}
          </>
        )}

        {!isUser && !message.pending && !message.error && (
          <div className="absolute -bottom-7 left-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Copy"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              className={clsx(
                "rounded-lg p-1.5 transition",
                feedback === "up"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
              )}
              aria-label="Good response"
            >
              <ThumbsUp size={12} />
            </button>
            <button
              type="button"
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              className={clsx(
                "rounded-lg p-1.5 transition",
                feedback === "down"
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
              )}
              aria-label="Bad response"
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
          <User size={14} className="text-slate-300" />
        </div>
      )}
    </motion.div>
  );
}
