// src/inca/IncaUploadPanel.jsx
import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import IncaImportModal from "./IncaImportModal";

export default function IncaUploadPanel({ onImported }: { onImported?: (data: unknown) => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState<boolean>(false);

  const profileDefaults = profile as { default_costr?: string | null; default_commessa?: string | null } | null;
  const defaultCostr = profileDefaults?.default_costr || "";
  const defaultCommessa = profileDefaults?.default_commessa || "";

  return (
    <div className="theme-panel rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Import INCA</div>
          <div className="text-xs theme-text-muted max-w-xl">
            Importazione intelligente INCA.
            <br />
            Formati supportati: <b>XLSX</b> e <b>PDF</b>. Analisi tecnica obbligatoria prima del commit.
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="btn-primary px-4 py-2 rounded-full text-sm"
        >
          ＋ Importa file INCA
        </button>
      </div>

      <IncaImportModal
        open={open}
        onClose={() => setOpen(false)}
        defaultCostr={defaultCostr}
        defaultCommessa={defaultCommessa}
        onImported={(data) => {
          setOpen(false);
          onImported?.(data);
        }}
      />
    </div>
  );
}
