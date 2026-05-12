import { Upload } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
  progress: number; // 0..1
}

export default function UploadZone({ onFile, busy, progress }: Props) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center transition " +
        (drag
          ? "border-accent/60 bg-accent/[0.04]"
          : "border-white/[0.10] bg-panel")
      }
    >
      <Upload size={20} className="text-slate-500" />
      <div>
        <p className="text-sm font-medium text-slate-200">Drop a file to ingest</p>
        <p className="mt-1 text-xs text-slate-500">
          PDF, Markdown, or plain text · up to ~25MB
        </p>
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="btn-secondary text-xs"
      >
        Choose file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.md,.markdown,.txt,.rst"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {busy && (
        <div className="mt-2 w-full max-w-sm">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.max(8, progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {progress < 1 ? `Uploading ${(progress * 100).toFixed(0)}%` : "Indexing"}
          </p>
        </div>
      )}
    </div>
  );
}
