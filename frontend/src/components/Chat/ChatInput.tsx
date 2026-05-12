import { ArrowUp, Paperclip, Square } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onAttach?: (file: File) => void;
  onAbort?: () => void;
  streaming: boolean;
}

const MAX_ROWS = 6;
const LINE_HEIGHT = 22;

export default function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onAbort,
  streaming,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_HEIGHT + 24)}px`;
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim()) onSend();
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/[0.08] bg-panel px-3 py-2 transition focus-within:border-accent/40">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about your knowledge base…"
          className="block w-full resize-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          style={{
            lineHeight: `${LINE_HEIGHT}px`,
            maxHeight: MAX_ROWS * LINE_HEIGHT + 24,
          }}
          disabled={streaming}
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost h-7 px-2 text-xs"
            disabled={streaming}
          >
            <Paperclip size={12} />
            Attach
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.md,.markdown,.txt,.rst"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onAttach) onAttach(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={onAbort}
              className="btn-secondary h-7 px-2 text-xs"
            >
              <Square size={10} fill="currentColor" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim()}
              className="btn-primary h-7 px-2 text-xs"
              aria-label="Send"
            >
              Send
              <ArrowUp size={12} />
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-slate-500">
        <kbd className="rounded border border-white/[0.06] px-1 text-[10px]">Enter</kbd> to
        send · <kbd className="rounded border border-white/[0.06] px-1 text-[10px]">Shift + Enter</kbd> for newline
      </p>
    </div>
  );
}
