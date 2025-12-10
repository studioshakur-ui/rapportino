// src/components/drive/CoreDrivePage.jsx
import React, { useEffect, useState } from "react";
import { listCoreFiles } from "../../services/coreDriveApi";
import CoreDriveList from "./CoreDriveList";
import CoreDriveUpload from "./CoreDriveUpload";

export default function CoreDrivePage({ cantiere }) {
  const [files, setFiles] = useState([]);
  const [categoriaFilter, setCategoriaFilter] = useState(null);
  const [search, setSearch] = useState("");

  async function load() {
    const data = await listCoreFiles({
      cantiere,
      categoria: categoriaFilter,
      search,
    });
    setFiles(data);
  }

  useEffect(() => {
    load();
  }, [categoriaFilter, search, cantiere]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        CORE Drive – Documenti del cantiere {cantiere}
      </h1>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <input
          placeholder="Cerca filename..."
          className="px-3 py-2 rounded border bg-slate-900 text-slate-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded border bg-slate-900 text-slate-200"
          value={categoriaFilter || ""}
          onChange={(e) =>
            setCategoriaFilter(e.target.value || null)
          }
        >
          <option value="">Tutte le categorie</option>
          <option value="RAPPORTINO_PDF">Rapportini PDF</option>
          <option value="RAPPORTINO_ATTACHMENT">Allegati Capo</option>
          <option value="INCA_SRC">File INCA</option>
          <option value="INCA_ATTACHMENT">Docs Cavi</option>
          <option value="CONTRATTO">Contratti / Varianti</option>
          <option value="HR">HR</option>
          <option value="RECLAMO">Reclami</option>
          <option value="AUDIT">Audit</option>
          <option value="ALTRO">Altro</option>
        </select>
      </div>

      {/* Upload */}
      <CoreDriveUpload cantiere={cantiere} onUploaded={load} />

      {/* List */}
      <CoreDriveList files={files} refresh={load} />
    </div>
  );
}
