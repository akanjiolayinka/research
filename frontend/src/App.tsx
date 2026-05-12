import { AnimatePresence, motion } from "framer-motion";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import ChatInput from "./components/Chat/ChatInput";
import RightDrawer from "./components/Layout/RightDrawer";
import Sidebar, { type View } from "./components/Layout/Sidebar";
import TopBar from "./components/Layout/TopBar";
import Spinner from "./components/UI/Spinner";
import { ingestFile, streamChat, type IngestResult, type RetrievedChunk } from "./lib/api";

// Lazy-loaded view modules. Each one becomes its own JS chunk so the initial
// bundle stays under 200KB gzipped.
const DashboardView = lazy(() => import("./components/Dashboard/DashboardView"));
const ChatView = lazy(() => import("./components/Chat/ChatView"));
const KnowledgeBaseView = lazy(
  () => import("./components/KnowledgeBase/KnowledgeBaseView"),
);
const AnalyticsView = lazy(() => import("./components/Analytics/AnalyticsView"));
const SettingsView = lazy(() => import("./components/Settings/SettingsView"));

function ViewFallback() {
  return (
    <div className="flex h-full items-center justify-center text-slate-500">
      <Spinner size={20} />
    </div>
  );
}

function dedupSummary(result: IngestResult): string {
  const parts: string[] = [`${result.total_chunks} chunks`];
  if (result.new_chunks > 0) parts.push(`${result.new_chunks} new`);
  if (result.skipped_chunks > 0)
    parts.push(`${result.skipped_chunks} skipped (already indexed)`);
  return parts.join(" · ");
}
import { humanize } from "./lib/errors";
import {
  deriveTitle,
  loadActiveId,
  loadDocs,
  loadSessions,
  saveActiveId,
  saveDocs,
  saveSessions,
  uid,
  useNamespace,
  useTheme,
  type ChatMessage,
  type ChatSession,
  type IngestedDoc,
} from "./lib/store";

const EXAMPLE_QUESTIONS = [
  "What are the main themes across my documents?",
  "Summarize the most recent paper I uploaded",
  "Find contradictions between any two sources",
  "List all action items mentioned anywhere",
];

export default function App() {
  const [theme, setTheme] = useTheme();
  const [namespace, setNamespace] = useNamespace();

  const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveId());
  const [docs, setDocs] = useState<IngestedDoc[]>(() => loadDocs());

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastChunks, setLastChunks] = useState<RetrievedChunk[]>([]);
  const [lastSources, setLastSources] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  const updateSession = useCallback(
    (id: string, updater: (s: ChatSession) => ChatSession) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...updater(s), updatedAt: Date.now() } : s)),
      );
    },
    [],
  );

  const newChat = useCallback((): ChatSession => {
    const session: ChatSession = {
      id: uid(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
    setView("chat");
    return session;
  }, []);

  function pickSession(id: string) {
    setActiveId(id);
    setView("chat");
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
    toast.message("Chat deleted");
  }

  async function send(rawText: string, sessionOverride?: ChatSession) {
    const text = rawText.trim();
    if (!text || streaming) return;

    let session = sessionOverride ?? activeSession;
    if (!session) {
      session = newChat();
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
      originalQuery: text,
      createdAt: Date.now(),
    };

    const sessionId = session.id;
    updateSession(sessionId, (s) => ({
      ...s,
      title: s.messages.length === 0 ? deriveTitle(text) : s.title,
      messages: [...s.messages, userMsg, assistantMsg],
    }));
    setActiveId(sessionId);
    setView("chat");
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        text,
        (event) => {
          if (event.type === "session") {
            // backend may have generated one — adopt it for future turns
            return;
          } else if (event.type === "rewrite") {
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, rewrittenQuery: event.rewritten }
                  : m,
              ),
            }));
          } else if (event.type === "sources") {
            setLastSources(event.sources);
            setLastChunks(event.chunks ?? []);
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, sources: event.sources, chunks: event.chunks }
                  : m,
              ),
            }));
          } else if (event.type === "token") {
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.text, pending: true }
                  : m,
              ),
            }));
          } else if (event.type === "done") {
            const guardrail = event.guardrail;
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, pending: false, guardrail }
                  : m,
              ),
            }));
          } else if (event.type === "error") {
            const e = humanize(event.message);
            updateSession(sessionId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, pending: false, error: { title: e.title, detail: e.detail } }
                  : m,
              ),
            }));
            toast.error(e.title, { description: e.detail });
          }
        },
        { signal: controller.signal, namespace, sessionId },
      );
    } catch (err) {
      if (controller.signal.aborted) {
        updateSession(sessionId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, pending: false, content: m.content || "_(stopped)_" }
              : m,
          ),
        }));
      } else {
        const e = humanize(err);
        updateSession(sessionId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, pending: false, error: { title: e.title, detail: e.detail } }
              : m,
          ),
        }));
        toast.error(e.title, { description: e.detail });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function abort() {
    abortRef.current?.abort();
  }

  function retry(messageId: string) {
    if (!activeSession) return;
    const idx = activeSession.messages.findIndex((m) => m.id === messageId);
    if (idx <= 0) return;
    const userMsg = activeSession.messages[idx - 1];
    if (userMsg.role !== "user") return;
    updateSession(activeSession.id, (s) => ({
      ...s,
      messages: s.messages.filter((m) => m.id !== messageId),
    }));
    void send(userMsg.content, activeSession);
  }

  async function attachInChat(file: File) {
    const optimistic: IngestedDoc = {
      id: uid(),
      name: file.name,
      type: file.name.endsWith(".pdf") ? "pdf" : file.name.endsWith(".md") ? "md" : "txt",
      chunks: 0,
      status: "processing",
      ingestedAt: Date.now(),
      namespace,
    };
    const next = [optimistic, ...docs];
    setDocs(next);
    saveDocs(next);
    toast.message(`Ingesting ${file.name}…`);
    try {
      const result = await ingestFile(file, { namespace });
      const updated = next.map((d) =>
        d.id === optimistic.id
          ? { ...d, chunks: result.total_chunks, status: "indexed" as const }
          : d,
      );
      setDocs(updated);
      saveDocs(updated);
      toast.success(`Indexed ${result.source}`, {
        description: dedupSummary(result),
      });
    } catch (err) {
      const e = humanize(err);
      const updated = next.map((d) =>
        d.id === optimistic.id
          ? { ...d, status: "failed" as const, error: e.detail }
          : d,
      );
      setDocs(updated);
      saveDocs(updated);
      toast.error(e.title, { description: e.detail });
    }
  }

  const messages = activeSession?.messages ?? [];

  function renderMain() {
    switch (view) {
      case "dashboard":
        return (
          <DashboardView
            sessions={sessions}
            docs={docs}
            onJumpToChat={() => setView("chat")}
            onQuickAsk={(q) => {
              newChat();
              void send(q);
            }}
          />
        );
      case "knowledge":
        return (
          <KnowledgeBaseView
            docs={docs}
            setDocs={(d) => {
              setDocs(d);
              saveDocs(d);
            }}
            namespace={namespace}
            setNamespace={setNamespace}
          />
        );
      case "analytics":
        return <AnalyticsView sessions={sessions} />;
      case "settings":
        return (
          <SettingsView
            theme={theme}
            onTheme={setTheme}
            namespace={namespace}
            onNamespace={setNamespace}
            onClearHistory={() => {
              setSessions([]);
              setActiveId(null);
              saveSessions([]);
              saveActiveId(null);
            }}
          />
        );
      case "chat":
      default:
        return (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
              <ChatView
                messages={messages}
                onRetry={retry}
                emptyExamples={EXAMPLE_QUESTIONS}
                onPickExample={(q) => {
                  if (!activeSession) newChat();
                  void send(q);
                }}
              />
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 pb-5">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={() => void send(input)}
                onAttach={attachInChat}
                onAbort={abort}
                streaming={streaming}
              />
            </div>
          </div>
        );
    }
  }

  const titles: Record<View, string> = {
    dashboard: "Dashboard",
    chat: activeSession?.title ?? "New chat",
    knowledge: "Knowledge Base",
    analytics: "Analytics",
    settings: "Settings",
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar
        view={view}
        onView={setView}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        sessions={sessions}
        activeId={activeId}
        onPickSession={pickSession}
        onNewChat={() => newChat()}
        onDeleteSession={deleteSession}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={titles[view]}
          subtitle={
            view === "chat"
              ? `Namespace: ${namespace}`
              : view === "dashboard"
                ? "Overview of your retrieval system"
                : undefined
          }
          modelLabel={view === "chat" ? "Groq · Llama 3.3 70B" : undefined}
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onToggleDrawer={view === "chat" ? () => setDrawerOpen((v) => !v) : undefined}
          drawerOpen={drawerOpen}
        />

        <div className="relative flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex h-full min-h-0 flex-1 flex-col"
              >
                <Suspense fallback={<ViewFallback />}>{renderMain()}</Suspense>
              </motion.div>
            </AnimatePresence>
          </main>

          {view === "chat" && (
            <RightDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              chunks={lastChunks}
              sources={lastSources}
            />
          )}
        </div>
      </div>
    </div>
  );
}
