export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export interface RetrievedChunk {
  source: string;
  chunk_idx: number;
  score: number;
  rerank_score?: number;
  text: string;
}

export type StreamEvent =
  | { type: "session"; session_id: string }
  | { type: "rewrite"; original: string; rewritten: string }
  | { type: "sources"; sources: string[]; chunks?: RetrievedChunk[] }
  | { type: "token"; text: string }
  | { type: "done"; guardrail?: string }
  | { type: "error"; message: string };

export interface IngestResult {
  source: string;
  total_chunks: number;
  new_chunks: number;
  skipped_chunks: number;
  upserted: number;
  // legacy field retained for older clients/tests
  chunks?: number;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data?.detail) return String(data.detail);
  } catch {
    // fall through
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
    // ignore
  }
  return `${res.status} ${res.statusText}`;
}

export async function health(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function ingestFile(
  file: File,
  opts?: {
    namespace?: string;
    onProgress?: (loaded: number, total: number) => void;
  },
): Promise<IngestResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = opts?.namespace
      ? `${API_URL}/ingest/file?namespace=${encodeURIComponent(opts.namespace)}`
      : `${API_URL}/ingest/file`;
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts?.onProgress) opts.onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Malformed server response"));
        }
      } else {
        reject(new Error(xhr.responseText || `${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Failed to fetch"));
    xhr.ontimeout = () => reject(new Error("Request timed out"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export async function ingestUrl(url: string, namespace?: string): Promise<IngestResult> {
  const res = await fetch(`${API_URL}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, namespace }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export interface EvalResults {
  summary: {
    faithfulness?: number;
    answer_relevancy?: number;
    context_recall?: number;
    [key: string]: number | undefined;
  };
  rows?: Array<Record<string, unknown>>;
}

export async function getEvalResults(): Promise<EvalResults | null> {
  const res = await fetch(`${API_URL}/eval/results`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export type EvalRunEvent =
  | { type: "log"; line: string }
  | { type: "done"; exit_code: number; results: EvalResults | null }
  | { type: "error"; message: string };

export async function runEval(
  onEvent: (event: EvalRunEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/eval/run`, { method: "POST", signal });
  if (!res.ok || !res.body) throw new Error(await readError(res));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx: number;
    while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        onEvent(JSON.parse(payload) as EvalRunEvent);
      } catch {
        // ignore malformed event
      }
    }
  }
}

export async function streamChat(
  message: string,
  onEvent: (event: StreamEvent) => void,
  opts?: {
    topK?: number;
    signal?: AbortSignal;
    namespace?: string;
    sessionId?: string;
  },
): Promise<void> {
  const res = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      top_k: opts?.topK,
      namespace: opts?.namespace,
      session_id: opts?.sessionId,
    }),
    signal: opts?.signal,
  });
  if (!res.ok || !res.body) throw new Error(await readError(res));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIdx: number;
    while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        onEvent(JSON.parse(payload) as StreamEvent);
      } catch {
        // ignore malformed event
      }
    }
  }
}
