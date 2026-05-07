import { useEffect, useState } from "react";
import { Moon, Sun, Sparkles } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import ComposerInput from "./components/ComposerInput";
import IngestPanel from "./components/IngestPanel";
import type { ChatMessage } from "./components/MessageBubble";
import { streamChat } from "./lib/api";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    try {
      await streamChat(text, (event) => {
        setMessages((m) =>
          m.map((msg) => {
            if (msg.id !== assistantId) return msg;
            switch (event.type) {
              case "sources":
                return { ...msg, sources: event.sources };
              case "token":
                return { ...msg, content: msg.content + event.text, pending: false };
              case "done":
                return { ...msg, pending: false };
              case "error":
                return {
                  ...msg,
                  pending: false,
                  content:
                    msg.content +
                    `\n\n_Error: ${event.message}_`,
                };
              default:
                return msg;
            }
          }),
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? { ...msg, pending: false, content: `_Request failed: ${message}_` }
            : msg,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr] bg-slate-50 dark:bg-slate-950">
      <IngestPanel />

      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-500" />
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              RAG Chatbot
            </h1>
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Groq + Pinecone
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDark((v) => !v)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4">
          <ChatWindow messages={messages} />
        </main>

        <footer className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
          <ComposerInput
            value={input}
            onChange={setInput}
            onSend={send}
            disabled={streaming}
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            Answers are grounded in the documents you ingest. Press Enter to send,
            Shift+Enter for newline.
          </p>
        </footer>
      </div>
    </div>
  );
}
