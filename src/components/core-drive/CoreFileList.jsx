// src/components/core-drive/CoreFileList.jsx
import React from 'react';
import CoreFileRow from './CoreFileRow';

export default function CoreFileList({
  files,
  isLoading,
  error,
  selectedFile,
  onSelect,
}) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Caricamento documenti CORE Drive...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="text-sm font-medium text-red-600">
          Errore nel caricamento dei documenti.
        </div>
        <pre className="mt-2 max-h-40 w-full max-w-xl overflow-auto rounded-md bg-slate-900/90 p-2 text-left text-[10px] text-red-100">
          {error.message || JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
        Nessun documento trovato per i filtri selezionati.
        <br />
        Importa un INCA o esporta un rapportino per popolare il CORE Drive.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
        Documenti CORE Drive ({files.length})
      </div>
      <div className="flex-1 overflow-auto bg-slate-900/40">
        {files.map((file) => (
          <CoreFileRow
            key={file.id}
            file={file}
            selected={selectedFile?.id === file.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
