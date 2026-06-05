// src/modules/daily-lists/components/ImportDropzone.tsx
import { useRef, useState, type DragEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function ImportDropzone({ onFile, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handle(file: File | null | undefined) {
    if (!file || disabled) return;
    onFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files[0]);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        group relative flex flex-col items-center justify-center gap-3
        rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all
        ${dragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.xls"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handle(e.target.files?.[0])}
      />

      <div className="text-4xl">📋</div>

      <div>
        <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">
          Déposer la liste journalière ici
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          PDF (L1/L2/L3) ou Excel — glisser-déposer ou cliquer
        </p>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
        <span className="border border-zinc-300 dark:border-zinc-600 rounded px-2 py-0.5">PDF</span>
        <span className="border border-zinc-300 dark:border-zinc-600 rounded px-2 py-0.5">XLSX</span>
      </div>
    </div>
  );
}
