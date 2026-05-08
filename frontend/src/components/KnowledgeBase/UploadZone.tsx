import { motion } from "framer-motion";
import { CloudUpload } from "lucide-react";
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
    <motion.div
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
      animate={drag ? { scale: 1.01 } : { scale: 1 }}
      className={
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition " +
        (drag
          ? "border-violet-400 bg-violet-500/10 shadow-glow"
          : "border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]")
      }
    >
      {drag && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(124,58,237,0)",
              "0 0 0 8px rgba(124,58,237,0.15)",
              "0 0 0 0 rgba(124,58,237,0)",
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-electric shadow-glow-sm">
        <CloudUpload size={22} className="text-white" />
      </div>
      <div>
        <p className="font-display text-base font-semibold">
          Drop a file to ingest
        </p>
        <p className="mt-1 text-xs text-slate-400">
          PDF, Markdown, or plain text · Max ~25MB
        </p>
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="btn-primary"
      >
        Browse files
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.md,.markdown,.txt,.rst"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {busy && (
        <div className="mt-3 w-full max-w-sm">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full bg-gradient-electric"
              animate={{ width: `${Math.max(8, progress * 100)}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {progress < 1
              ? `Uploading… ${(progress * 100).toFixed(0)}%`
              : "Indexing…"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
