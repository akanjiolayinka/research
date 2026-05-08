import { useEffect, useState } from "react";
import type { RetrievedChunk } from "./api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  chunks?: RetrievedChunk[];
  pending?: boolean;
  error?: { title: string; detail: string };
  rewrittenQuery?: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const SESSIONS_KEY = "rag.sessions.v1";
const THEME_KEY = "rag.theme.v1";
const NAMESPACE_KEY = "rag.namespace.v1";
const ACTIVE_KEY = "rag.activeSession.v1";
const DOCS_KEY = "rag.docs.v1";

export function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // ignore quota errors
  }
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}
export function saveActiveId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function useTheme(): [string, (t: string) => void] {
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem(THEME_KEY) ?? "dark",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return [theme, setTheme];
}

export function useNamespace(): [string, (ns: string) => void] {
  const [ns, setNs] = useState<string>(
    () => localStorage.getItem(NAMESPACE_KEY) ?? "default",
  );
  useEffect(() => {
    localStorage.setItem(NAMESPACE_KEY, ns);
  }, [ns]);
  return [ns, setNs];
}

// --- ingested docs (UI-only registry; backend doesn't track them yet) ---
export interface IngestedDoc {
  id: string;
  name: string;
  type: "pdf" | "md" | "txt" | "url";
  chunks: number;
  status: "indexed" | "processing" | "failed";
  ingestedAt: number;
  namespace: string;
  error?: string;
}

export function loadDocs(): IngestedDoc[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as IngestedDoc[];
  } catch {
    return [];
  }
}
export function saveDocs(docs: IngestedDoc[]) {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch {
    // ignore
  }
}

export function inferDocType(name: string): IngestedDoc["type"] {
  if (/^https?:/i.test(name)) return "url";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "md" || ext === "markdown") return "md";
  return "txt";
}

export function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? trimmed.slice(0, 45) + "…" : trimmed || "New chat";
}

export function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfDay - 86_400_000;
  const startOfWeek = startOfDay - 7 * 86_400_000;

  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const week: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const s of [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (s.updatedAt >= startOfDay) today.push(s);
    else if (s.updatedAt >= startOfYesterday) yesterday.push(s);
    else if (s.updatedAt >= startOfWeek) week.push(s);
    else older.push(s);
  }
  return { today, yesterday, week, older };
}
