// src/components/drive/CoreDrivePreview.jsx
import React, { useEffect, useState } from "react";
import { getSignedUrl } from "../../services/coreDriveApi";

export default function CoreDrivePreview({ file, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    async function load() {
      const signed = await getSignedUrl(file);
      setUrl(signed);
    }
    load();
  }, [file]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-[90vw] h-[85vh] flex flex-col">
        <div className="flex justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-200">
            {file.filename}
          </h2>
          <button
            className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>

        {!url && <div className="text-slate-400">Caricamento…</div>}

        {url && (
          <iframe
            src={url}
            className="flex-1 w-full border rounded bg-white"
            title="preview"
          />
        )}
      </div>
    </div>
  );
}
