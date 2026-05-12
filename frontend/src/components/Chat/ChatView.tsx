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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          What would you like to know?
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Ask questions grounded in your indexed documents. Citations and the source
          chunks used appear with every answer.
        </p>
        {emptyExamples.length > 0 && (
          <div className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {emptyExamples.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => onPickExample?.(q)}
                className="rounded-md border border-white/[0.06] bg-panel px-3 py-2 text-left text-xs text-slate-400 transition hover:border-white/[0.12] hover:text-slate-200"
              >
                {q}
              </button>
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
