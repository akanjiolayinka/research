export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export interface RetrievedChunk {
  source: string;
  chunk_idx: number;
  score: number;
  text: string;
}

export type StreamEvent =
  | { type: "sources"; sources: string[]; chunks?: RetrievedChunk[] }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface IngestResult {
  source: string;
  chunks: number;
  upserted: number;
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

export async function streamChat(
  message: string,
  onEvent: (event: StreamEvent) => void,
  opts?: { topK?: number; signal?: AbortSignal; namespace?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      top_k: opts?.topK,
      namespace: opts?.namespace,
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
