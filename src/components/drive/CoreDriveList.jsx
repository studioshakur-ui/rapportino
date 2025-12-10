// src/components/drive/CoreDriveList.jsx
import React, { useState } from "react";
import CoreDrivePreview from "./CoreDrivePreview";
import { deleteCoreFile } from "../../services/coreDriveApi";

export default function CoreDriveList({ files, refresh }) {
  const [previewFile, setPreviewFile] = useState(null);

  async function handleDelete(f) {
    if (!window.confirm("Confermi cancellazione?")) return;
    await deleteCoreFile(f.id, f.storage_path);
    refresh();
  }

  return (
    <div className="mt-4 border rounded-xl overflow-hidden bg-slate-900/40 border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 text-slate-300">
          <tr>
            <th className="px-3 py-2 text-left">Filename</th>
            <th className="px-3 py-2 text-left">Categoria</th>
            <th className="px-3 py-2 text-left">Origine</th>
            <th className="px-3 py-2 text-left">Stato</th>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>

        <tbody>
          {files.map((f) => (
            <tr
              key={f.id}
              className="border-t border-slate-700 hover:bg-slate-800 cursor-pointer"
              onClick={() => setPreviewFile(f)}
            >
              <td className="px-3 py-2">{f.filename}</td>
              <td className="px-3 py-2">{f.categoria}</td>
              <td className="px-3 py-2">{f.origine}</td>
              <td className="px-3 py-2">{f.stato_doc}</td>
              <td className="px-3 py-2">
                {new Date(f.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(f);
                  }}
                  className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700"
                >
                  Cancella
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {previewFile && (
        <CoreDrivePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
