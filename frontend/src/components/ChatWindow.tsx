import { useEffect, useRef } from "react";
import MessageBubble, { type ChatMessage } from "./MessageBubble";

export default function ChatWindow({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-slate-400">
        <div className="max-w-md">
          <p className="text-base font-medium text-slate-600 dark:text-slate-300">
            Ingest a document, then ask away.
          </p>
          <p className="mt-1 text-sm">
            Upload a PDF or paste a URL on the left, then ask questions grounded in that
            content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
