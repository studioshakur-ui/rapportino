// src/modules/daily-lists/components/ImportDropzone.tsx
import { useRef, useState, type DragEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function ImportDropzone({ onFile, disabled = false }: Props): JSX.Element {
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
    <button
      type="button"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      disabled={disabled}
      className={`
        group relative flex min-h-56 w-full flex-col items-center justify-center gap-4
        rounded-3xl border border-dashed p-6 text-center transition-all sm:p-10
        ${dragging
          ? "border-sky-400 bg-sky-500/10 shadow-2xl shadow-sky-950/30"
          : "border-zinc-700 bg-zinc-900/70 hover:border-sky-500/70 hover:bg-zinc-900"}
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
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

      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-3xl">
        📋
      </span>

      <span className="space-y-1">
        <span className="block text-lg font-semibold text-white">Importa lista PDF</span>
        <span className="block text-sm leading-6 text-zinc-400">
          Trascina qui la lista giornaliera o tocca per scegliere un file.
        </span>
      </span>

      <span className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1">PDF</span>
        <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1">XLSX</span>
        <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1">L1/L2/L3</span>
      </span>
    </button>
  );
}
