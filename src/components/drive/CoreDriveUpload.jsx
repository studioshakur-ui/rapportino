// src/components/drive/CoreDriveUpload.jsx
import React, { useState } from "react";
import { uploadCoreFile } from "../../services/coreDriveApi";

export default function CoreDriveUpload({ cantiere, onUploaded }) {
  const [file, setFile] = useState(null);
  const [categoria, setCategoria] = useState("ALTRO");
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);

    await uploadCoreFile({
      file,
      meta: {
        cantiere,
        categoria,
        origine: "UFFICIO",
      },
    });

    setUploading(false);
    setFile(null);
    onUploaded();
  }

  return (
    <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
      <input type="file" onChange={(e) => setFile(e.target.files[0])}
             className="text-slate-200" />

      <select
        className="px-2 py-1 rounded bg-slate-900 text-slate-200 border"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
      >
        <option value="ALTRO">Altro</option>
        <option value="RAPPORTINO_PDF">Rapportino PDF</option>
        <option value="RAPPORTINO_ATTACHMENT">Allegato Rapportino</option>
        <option value="INCA_SRC">INCA Source</option>
        <option value="INCA_ATTACHMENT">Allegato Cavo</option>
      </select>

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="px-3 py-1 bg-sky-600 rounded hover:bg-sky-700 text-white"
      >
        {uploading ? "Caricamento…" : "Upload"}
      </button>
    </div>
  );
}
