export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export type StreamEvent =
  | { type: "sources"; sources: string[] }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface IngestResult {
  source: string;
  chunks: number;
  upserted: number;
}

export async function ingestFile(file: File): Promise<IngestResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/ingest/file`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Ingest failed: ${await res.text()}`);
  return res.json();
}

export async function ingestUrl(url: string): Promise<IngestResult> {
  const res = await fetch(`${API_URL}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${await res.text()}`);
  return res.json();
}

export async function streamChat(
  message: string,
  onEvent: (event: StreamEvent) => void,
  topK?: number,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, top_k: topK }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.statusText}`);

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
