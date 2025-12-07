// src/inca/IncaUploadPanel.jsx
import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { parseIncaPdf } from './parseIncaPdf';
import { parseIncaXlsx } from './parseIncaXlsx';

/**
 * Panneau d'import INCA (PDF / XLSX)
 *
 * Flux :
 *  1) Upload du fichier dans le bucket Supabase "inca-files"
 *  2) Création d'une ligne dans inca_files
 *  3) Parsing du fichier :
 *     - PDF → parseIncaPdf
 *     - XLSX → parseIncaXlsx
 *  4) Dé-doublonnage local des cavi (codice + rev_inca)
 *  5) UPSERT dans inca_cavi (onConflict: "codice,rev_inca")
 *  6) (plus tard) insert percorsi dans inca_percorsi à partir du PDF
 */

// Normalisation "situazione" côté CORE pour respecter le CHECK Postgres
// P = Posato, T = Tagliato, R = Richiesto, B = Bloccato
// E = Eliminato → seulement dans stato_inca (audit), pas dans "situazione".
function mapSituazioneCore(raw) {
  if (!raw) return null;
  const v = String(raw).trim().toUpperCase();
  const allowed = ['P', 'T', 'R', 'B'];
  return allowed.includes(v) ? v : null;
}

export default function IncaUploadPanel({ onImported }) {
  const { profile } = useAuth();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('info'); // 'info' | 'success' | 'error'

  const handleClickSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Tentative simple pour extraire costr / commessa depuis le nom du fichier
  const inferCostrCommessa = (fileName) => {
    if (!fileName) return { costr: null, commessa: null };

    const base = fileName.replace(/\.[^.]+$/, '');
    const parts = base.split(/[\s_]+/g).filter(Boolean);

    let costr = null;
    let commessa = null;

    const numericParts = parts.filter((p) => /^\d+$/.test(p));
    if (numericParts.length > 0) {
      costr = numericParts[0];
    }

    const threeLetter = parts.filter((p) => /^[A-Z]{3}$/i.test(p));
    if (threeLetter.length > 0) {
      commessa = threeLetter[threeLetter.length - 1].toUpperCase();
    }

    return { costr, commessa };
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');
    setMessageKind('info');
    setUploading(true);

    try {
      if (!profile?.id) {
        throw new Error(
          'Profilo non disponibile. Effettua il login e riprova.'
        );
      }

      // Extension et type de fichier
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let fileType;
      if (ext === 'pdf') fileType = 'PDF';
      else if (ext === 'xlsx') fileType = 'XLSX';
      else {
        throw new Error(
          'Tipo di file non supportato. Usa un PDF INCA oppure il foglio dati XLSX.'
        );
      }

      // 1) Upload Storage
      const bucket = 'inca-files';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '');
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${profile.id}/${timestamp}_${safeName}`;

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.error('[INCA] Errore upload storage:', storageError);
        throw new Error('Errore durante il caricamento del file INCA.');
      }

      const { costr, commessa } = inferCostrCommessa(file.name);

      // 2) inca_files
      const { data: fileRow, error: fileError } = await supabase
        .from('inca_files')
        .insert({
          file_name: file.name,
          file_type: fileType, // 'PDF' | 'XLSX'
          file_path: path,
          uploaded_by: profile.id,
          uploaded_at: new Date().toISOString(),
          costr,
          commessa,
        })
        .select()
        .single();

      if (fileError) {
        console.error('[INCA] Errore insert inca_files:', fileError);
        throw new Error('Errore durante la registrazione del file INCA.');
      }

      const fileId = fileRow.id;

      // 3) Parsing fichier
      let cablesRaw = [];
      try {
        if (fileType === 'PDF') {
          cablesRaw = await parseIncaPdf(file);
        } else {
          // XLSX
          cablesRaw = await parseIncaXlsx(file);
        }
      } catch (parseErr) {
        console.error('[INCA] Errore parseInca*:', parseErr);
      }

      if (!Array.isArray(cablesRaw) || cablesRaw.length === 0) {
        setMessage(
          `File INCA caricato, ma nessun cavo è stato riconosciuto automaticamente.`
        );
        setMessageKind('info');
        if (typeof onImported === 'function') onImported();
        return;
      }

      // 4) Dédoublonnage local par (codice, rev_inca)
      const uniqueMap = new Map();
      for (const c of cablesRaw) {
        const codiceInca =
          c.codice_cavo ||
          c.codice_inca ||
          c.codice ||
          c.marca_cavo ||
          'UNKNOWN';

        const rev = c.rev_inca || '';
        const key = `${codiceInca}::${rev}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, c);
        }
      }
      const cables = Array.from(uniqueMap.values());
      console.log(
        `[INCA ${fileType}] Cavi letti (grezzi): ${cablesRaw.length} → righe uniche: ${cables.length}`
      );

      // 5) Préparation des lignes pour inca_cavi
      const rowsToUpsert = cables.map((c) => {
        const codiceInca =
          c.codice_cavo ||
          c.codice_inca ||
          c.codice ||
          c.marca_cavo ||
          'UNKNOWN';

        const metriTeo =
          typeof c.metri_teo === 'number'
            ? c.metri_teo
            : c.lunghezza_disegno ||
              c.lunghezza_di_disegno ||
              null;

        const metriTotali =
          typeof c.metri_totali === 'number'
            ? c.metri_totali
            : c.lunghezza_posa ||
              c.lunghezza_di_posa ||
              metriTeo ||
              null;

        const metriPrevisti =
          typeof c.metri_previsti === 'number'
            ? c.metri_previsti
            : c.lunghezza_calcolo ||
              c.lunghezza_di_calcolo ||
              metriTotali ||
              null;

        const metriPosati =
          typeof c.metri_posati_teorici === 'number'
            ? c.metri_posati_teorici
            : null;

        // Normalisation stato/situazione
        const rawSituazione =
          c.situazione ||
          c.situazione_cavo ||
          c.stato_inca ||
          c.stato_cantiere ||
          null;

        const situazioneCore = mapSituazioneCore(rawSituazione);

        return {
          // Fichier
          from_file_id: fileId,
          inca_file_id: fileId,

          // Contexte navire
          costr: fileRow.costr || costr || null,
          commessa: fileRow.commessa || commessa || null,

          // Identité câble
          marca_cavo: c.marca_cavo || null,
          codice: codiceInca,
          livello_disturbo: c.livello_disturbo || null,

          // Caractéristiques
          tipo: c.tipo_cavo || c.tipo || null,
          sezione: c.sezione || null,
          wbs: c.wbs || null,

          descrizione:
            c.descrizione ||
            c.app_descrizione ||
            c.app_arrivo_descrizione ||
            null,

          // Métriques principales
          metri_teo: metriTeo,
          metri_totali: metriTotali,
          metri_previsti: metriPrevisti,

          // Stato / situazione
          // stato_inca garde la valeur brute (P/T/R/B/E…),
          // situazione ne garde que P/T/R/B pour respecter le CHECK.
          stato_inca: rawSituazione,
          situazione: situazioneCore,

          // Structure & localisation (optionnel pour l’instant)
          impianto: c.impianto || null,
          zona_da: c.zona_da || c.app_partenza_zona || null,
          zona_a: c.zona_a || c.app_arrivo_zona || null,
          apparato_da: c.app_partenza || null,
          apparato_a: c.app_arrivo || null,
          descrizione_da:
            c.app_partenza_descrizione ||
            c.app_partenza_descr ||
            null,
          descrizione_a:
            c.app_arrivo_descrizione ||
            c.app_arrivo_descr ||
            null,

          metri_dis:
            typeof c.metri_dis === 'number'
              ? c.metri_dis
              : null,
          metri_sit_cavo: c.metri_sit_cavo ?? null,
          metri_sit_tec: c.metri_sit_tec ?? null,

          pagina_pdf: c.pagina_pdf || null,
          rev_inca: c.rev_inca || null,

          metri_posati_teorici: metriPosati,
        };
      });

      // 6) UPSERT dans inca_cavi → évite l’erreur de contrainte unique
      const { data: upsertedCavi, error: caviError } = await supabase
        .from('inca_cavi')
        .upsert(rowsToUpsert, {
          onConflict: 'codice,rev_inca',
          ignoreDuplicates: false,
        })
        .select();

      if (caviError) {
        console.error('[INCA] Errore insert/upsert inca_cavi:', caviError);
        throw new Error(
          'File INCA caricato, ma errore durante il salvataggio dei cavi teorici.'
        );
      }

      setMessage(
        `File INCA caricato correttamente. Cavi teorici registrati/aggiornati: ${upsertedCavi.length}.`
      );
      setMessageKind('success');

      if (typeof onImported === 'function') {
        onImported();
      }
    } catch (err) {
      console.error('[INCA] Errore Import INCA:', err);
      setMessage(
        err?.message || 'Errore imprevisto durante l’import del file INCA.'
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
            Importa file INCA (PDF / XLSX)
          </div>
          <div className="text-xs text-slate-300 max-w-xl">
            Carica il PDF esportato da INCA per l&apos;archivio e il foglio dati
            XLSX per importare i cavi teorici (MARCA CAVO, livello, metri,
            situazione…).
          </div>
        </div>
        <button
          type="button"
          onClick={handleClickSelect}
          disabled={uploading}
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-emerald-500/70 bg-emerald-500/15 text-[12px] font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? 'Caricamento…' : '＋ Importa file INCA (PDF / XLSX)'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
