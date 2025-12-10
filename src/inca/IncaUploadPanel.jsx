// src/inca/IncaUploadPanel.jsx
import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { parseIncaPdf } from './parseIncaPdf';
import { parseIncaXlsx } from './parseIncaXlsx';

/**
 * Normalise la "situazione" provenant d'INCA
 * vers les codes CORE : B / R / T / P / E / null.
 *
 * On regarde :
 *  - c.situazione_cavo
 *  - c.situazione
 *  - c.stato_cantiere
 *  - c.stato_inca
 */
function normalizeIncaSituazione(c) {
  if (!c) return null;

  const raw =
    (typeof c === 'string'
      ? c
      : c.situazione_cavo ||
        c.situazione ||
        c.stato_cantiere ||
        c.stato_inca ||
        ''
    ) || '';

  const val = raw.toUpperCase().trim();
  if (!val) return null;

  // Déjà au bon format
  if (['B', 'R', 'T', 'P', 'E'].includes(val)) return val;

  // Éliminé
  if (val.includes('ELIMIN')) return 'E';

  // Demande / Richiesta
  if (val.includes('RICH')) return 'R';

  // Taglio
  if (val.includes('TAGLIO') || val.includes('TAGLIATO')) return 'T';

  // Posé / Posato / Collegato
  if (
    val.includes('POSA') ||
    val.includes('POSATO') ||
    val.includes('COLLEGATO') ||
    val.includes('COLLEGAMENTO')
  ) {
    return 'P';
  }

  // Bloqué / Non pronto, etc.
  if (val.includes('BLOCC') || val.includes('NON PRONTO')) return 'B';

  // Sinon, on reste neutre (EMPTY côté UI)
  return null;
}

/**
 * Panneau d'import INCA (PDF / XLSX)
 *
 * Flux :
 *  1) Upload du fichier dans le bucket Supabase "inca-files"
 *  2) Création d'une ligne dans inca_files
 *  3) Parsing du fichier :
 *     - PDF → parseIncaPdf
 *     - XLSX → parseIncaXlsx
 *  4) Dé-doublonnage local des cavi (codice + rev_inca ou marca_cavo)
 *  5) UPSERT dans inca_cavi (onConflict: "codice,rev_inca")
 */

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

  // Détection simple costr / commessa depuis le nom du fichier
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

      // Type fichier
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
          file_type: fileType,
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

      // 4) Dédoublonnage local (codice + rev_inca)
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

      // 5) Mapping vers inca_cavi
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

        return {
          from_file_id: fileId,
          inca_file_id: fileId,

          costr: fileRow.costr || costr || null,
          commessa: fileRow.commessa || commessa || null,

          marca_cavo: c.marca_cavo || null,
          codice: codiceInca,
          livello_disturbo: c.livello_disturbo || null,

          tipo: c.tipo_cavo || c.tipo || null,
          sezione: c.sezione || null,
          wbs: c.wbs || null,

          descrizione:
            c.descrizione ||
            c.app_descrizione ||
            c.app_arrivo_descrizione ||
            null,

          metri_teo: metriTeo,
          metri_totali: metriTotali,
          metri_previsti: metriPrevisti,

          // États normalisés
          stato_inca: c.stato_inca || c.stato_tec || null,
          situazione: c.situazione ?? c.situazione_cavo ?? null,

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

      // 6) UPSERT inca_cavi
      const { data: upsertedCavi, error: caviError } = await supabase
        .from('inca_cavi')
        .upsert(rowsToUpsert, {
          onConflict: 'codice,rev_inca',
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error(
          '[INCA] Errore insert inca_cavi:',
          insertError.message,
          insertError.details,
          insertError.hint
        );
        throw new Error(
          caviError.message ||
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
