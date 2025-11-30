// src/inca/IncaUploadPanel.jsx
import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { parseIncaPdf } from './parseIncaPdf';

/**
 * Panneau d'import INCA
 * - PDF UNIQUEMENT
 * - Upload vers Supabase Storage (bucket: "inca-files")
 * - Création ligne dans inca_files
 * - Parsing réel du PDF via parseIncaPdf → insertion dans inca_cavi
 */
export default function IncaUploadPanel({ onImported }) {
  const { profile } = useAuth();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageKind, setMessageKind] = useState('info'); // 'info' | 'success' | 'error'

  const handleClickSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const inferCostrCommessa = (fileName) => {
    if (!fileName) return { costr: null, commessa: null };

    const base = fileName.replace(/\.[^.]+$/, '');
    const parts = base.split(/[\s_]+/).filter(Boolean);

    let costr = null;
    let commessa = null;

    // Heuristique simple : première partie numérique = costr (ex : 6368)
    const maybeCostr = parts.find((p) => /^\d+$/.test(p));
    if (maybeCostr) costr = maybeCostr;

    // Dernière partie de 2–4 lettres majuscules = commessa (ex: SDC)
    const maybeCommessa = [...parts]
      .reverse()
      .find((p) => /^[A-Z]{2,4}$/.test(p));
    if (maybeCommessa) commessa = maybeCommessa;

    return { costr, commessa };
  };

  const isPdfFile = (file) => {
    if (!file) return false;
    if (file.type === 'application/pdf') return true;
    return /\.pdf$/i.test(file.name || '');
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 🔒 PDF ONLY
    if (!isPdfFile(file)) {
      setMessage(
        'Il modulo INCA accetta solo file PDF. Seleziona il PDF esportato da INCA.'
      );
      setMessageKind('error');
      return;
    }

    setUploading(true);
    setMessage(null);
    setMessageKind('info');

    try {
      if (!profile?.id) {
        throw new Error(
          'Profilo non disponibile. Effettua il login e riprova.'
        );
      }

      // 1) Upload dans Supabase Storage (bucket "inca-files")
      const bucket = 'inca-files';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '');
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${profile.id}/${timestamp}_${safeName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.error('Errore upload INCA storage:', storageError);
        throw new Error('Errore durante il caricamento del PDF INCA.');
      }

      const { costr, commessa } = inferCostrCommessa(file.name);

      // 2) Création ligne dans inca_files
      const { data: inserted, error: insertError } = await supabase
        .from('inca_files')
        .insert({
          file_name: file.name,
          file_type: 'PDF',              // 🔴 ICI : valeur fixe compatible avec la CHECK CONSTRAINT
          file_path: storageData.path,
          costr,
          commessa,
          uploaded_by: profile.id,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Errore insert inca_files:', insertError);
        throw new Error('Errore durante la registrazione del file INCA.');
      }

      const fileId = inserted.id;

      // 3) Parsing réel du PDF
      let cables = [];
      try {
        cables = await parseIncaPdf(file);
      } catch (parseErr) {
        console.error('Errore parseIncaPdf:', parseErr);
        // On continue quand même : le fichier est archivé dans inca_files
      }

      if (Array.isArray(cables) && cables.length > 0) {
        const rowsToInsert = cables.map((c) => {
          const metriTot = Number(c.metri_totali) || 0;
          const situazione = c.situazione || null;

          return {
            from_file_id: fileId,
            codice: c.codice || '',
            descrizione: c.descrizione || null,
            metri_previsti: metriTot,
            metri_posati_teorici: situazione === 'P' ? metriTot : 0,
            situazione,
          };
        });

        const { error: caviError } = await supabase
          .from('inca_cavi')
          .insert(rowsToInsert);

        if (caviError) {
          console.error('Errore insert inca_cavi:', caviError);
          setMessage(
            'PDF INCA caricato e registrato. Errore durante il salvataggio dei cavi teorici.'
          );
          setMessageKind('error');
        } else {
          setMessage(
            `PDF INCA caricato correttamente. Cavi teorici registrati: ${rowsToInsert.length}.`
          );
          setMessageKind('success');
        }
      } else {
        setMessage(
          'PDF INCA caricato e archiviato. Nessun cavo riconosciuto automaticamente in questa fase.'
        );
        setMessageKind('info');
      }

      if (typeof onImported === 'function') {
        onImported();
      }
    } catch (err) {
      console.error('Errore Import INCA:', err);
      setMessage(
        err?.message || 'Errore imprevisto durante l’import del PDF INCA.'
      );
      setMessageKind('error');
    } finally {
      setUploading(false);
    }
  };

  const badgeClass =
    messageKind === 'success'
      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
      : messageKind === 'error'
      ? 'border-rose-500/60 bg-rose-500/10 text-rose-200'
      : 'border-slate-500/60 bg-slate-800/40 text-slate-200';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Importa file INCA (solo PDF)
          </div>
          <div className="text-xs text-slate-300 max-w-xl">
            Carica il PDF esportato da INCA. Il file viene salvato in archivio e
            collegato alle analisi Direzione. I cavi riconosciuti vengono
            trasformati in metri teorici (P/T).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClickSelect}
            disabled={uploading}
            className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium ${
              uploading
                ? 'border-slate-700 bg-slate-800 text-slate-400 cursor-wait'
                : 'border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
            }`}
          >
            {uploading ? 'Caricamento…' : '+ Importa file INCA (PDF)'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {message && (
        <div
          className={`text-[11px] px-3 py-2 rounded-lg border ${badgeClass}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
