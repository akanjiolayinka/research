import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../lib/store";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  onRetry: (messageId: string) => void;
  emptyExamples?: string[];
  onPickExample?: (q: string) => void;
}

export default function ChatView({
  messages,
  onRetry,
  emptyExamples = [],
  onPickExample,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-electric shadow-glow"
        >
          <Sparkles size={22} className="text-white" />
        </motion.div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          What do you want to know?
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Ask grounded questions about the documents in your knowledge base. Answers
          stream in with citations to the exact source chunks.
        </p>
        {emptyExamples.length > 0 && (
          <div className="mt-7 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {emptyExamples.map((q, i) => (
              <motion.button
                type="button"
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => onPickExample?.(q)}
                className="glass rounded-xl px-3 py-2.5 text-left text-xs text-slate-300 transition hover:border-violet-400/40 hover:bg-white/[0.06]"
              >
                {q}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      {messages.map((m, i) => (
        <MessageBubble
          key={m.id}
          message={m}
          onRetry={
            m.error && i === messages.length - 1
              ? () => {
                  // retry the previous user message
                  const prev = messages[i - 1];
                  if (prev?.role === "user") onRetry(m.id);
                }
              : undefined
          }
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
