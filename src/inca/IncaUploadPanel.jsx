// src/inca/IncaUploadPanel.jsx
import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { parseIncaPdf } from './parseIncaPdf';

/**
 * Panneau d'import INCA (PDF)
 *
 * Flux :
 *  1) Upload du PDF dans le bucket Supabase "inca-files"
 *  2) Création d'une ligne dans inca_files
 *  3) Parsing du PDF via parseIncaPdf (format A1)
 *  4) Nettoyage des tables INCA via RPC clear_inca_tables()
 *  5) Dédoublonnage des câbles (clé costr+commessa+codice+rev_inca)
 *  6) Insertion des nouveaux cavi dans inca_cavi
 *  7) Insertion des percorsi (supports) dans inca_percorsi
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
        throw new Error('Errore durante il caricamento del PDF INCA.');
      }

      const { costr, commessa } = inferCostrCommessa(file.name);

      // 2) inca_files
      const { data: fileRow, error: fileError } = await supabase
        .from('inca_files')
        .insert({
          file_name: file.name,
          file_type: 'PDF',
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

      // 3) Parsing PDF
      let cables = [];
      try {
        cables = await parseIncaPdf(file);
      } catch (parseErr) {
        console.error('[INCA] Errore parseIncaPdf:', parseErr);
      }

      if (!Array.isArray(cables) || cables.length === 0) {
        setMessage(
          'PDF INCA caricato e archiviato, ma nessun cavo è stato riconosciuto automaticamente.'
        );
        setMessageKind('info');
        if (typeof onImported === 'function') onImported();
        return;
      }

      // 4) Nettoyage complet des tables INCA via RPC
      try {
        const { error: rpcError } = await supabase.rpc('clear_inca_tables');
        if (rpcError) {
          console.warn('[INCA] Errore RPC clear_inca_tables:', rpcError);
        } else {
          console.log(
            '[INCA] Tabelle inca_cavi / inca_percorsi svuotate tramite RPC.'
          );
        }
      } catch (rpcErr) {
        console.error('[INCA] Errore generale RPC clear_inca_tables:', rpcErr);
      }

      // 5) Préparation des lignes pour inca_cavi
      const rowsToInsert = cables.map((c) => {
        const codiceInca =
          c.codice_inca || c.codice || c.codice_marca || 'UNKNOWN';

        const metriTeo =
          typeof c.metri_teo === 'number' ? c.metri_teo : c.metri_totali || 0;
        const metriTot =
          typeof c.metri_totali === 'number' ? c.metri_totali : metriTeo || 0;
        const metriPrev =
          typeof c.metri_previsti === 'number' ? c.metri_previsti : metriTot;
        const metriPosati =
          typeof c.metri_posati_teorici === 'number'
            ? c.metri_posati_teorici
            : c.situazione && c.situazione.toUpperCase() === 'P'
            ? metriTot
            : 0;

        return {
          // Fichier
          from_file_id: fileId,
          inca_file_id: fileId,

          // Contexte navire
          costr: fileRow.costr || costr || null,
          commessa: fileRow.commessa || commessa || null,

          // Codes
          codice: codiceInca,
          descrizione: c.descrizione || c.raw_line || null,

          // Structure (pour évolutions futures)
          impianto: null,
          tipo: c.tipo_cavo || null,
          sezione: c.sezione || null,
          zona_da: null,
          zona_a: null,
          apparato_da: null,
          apparato_a: null,
          descrizione_da: c.origine_line || null,
          descrizione_a: null,

          // Métriques
          metri_teo: metriTeo || null,
          metri_dis:
            typeof c.metri_dis === 'number' ? c.metri_dis : null,
          metri_sit_cavo: null,
          metri_sit_tec: null,
          pagina_pdf: c.pagina_pdf || null,
          rev_inca: c.rev_inca || null,

          // ⚠️ On ne renseigne PAS stato_inca / situazione
          // pour ne pas casser la contrainte "inca_cavi_situazione_check"
          // stato_inca: c.stato_inca || c.situazione || null,
          // situazione: c.situazione || null,

          metri_previsti: metriPrev || null,
          metri_posati_teorici: metriPosati || null,
          metri_totali: metriTot || null,
        };
      });

      // 5.bis) Dédoublonnage : une seule ligne par (costr, commessa, codice, rev_inca)
      const uniqueMap = new Map();
      for (const row of rowsToInsert) {
        const key = [
          row.costr || '',
          row.commessa || '',
          row.codice || '',
          row.rev_inca || '',
        ].join('||');

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, row);
        }
      }
      const uniqueRows = Array.from(uniqueMap.values());
      console.log(
        `[INCA] Dédoublonnage: ${rowsToInsert.length} righe → ${uniqueRows.length} righe uniche`
      );

      // 6) INSERT dans inca_cavi
      const { data: insertedCavi, error: caviError } = await supabase
        .from('inca_cavi')
        .insert(uniqueRows)
        .select();

      if (caviError) {
        console.error('[INCA] Errore insert inca_cavi:', caviError);
        throw new Error(
          'PDF INCA caricato, ma errore durante il salvataggio dei cavi teorici.'
        );
      }

      // 7) Insertion des percorsi dans inca_percorsi
      try {
        const percorsoRows = [];

        insertedCavi.forEach((row, idx) => {
          const cable = cables[idx];
          if (!cable || !Array.isArray(cable.percorso_nodes)) return;

          cable.percorso_nodes.forEach((supportCode, ordineIdx) => {
            percorsoRows.push({
              cavo_id: row.id,
              ordine: ordineIdx + 1,
              codice_supporto: supportCode,
            });
          });
        });

        if (percorsoRows.length > 0) {
          const { error: percorsiError } = await supabase
            .from('inca_percorsi')
            .insert(percorsoRows);

          if (percorsiError) {
            console.error(
              '[INCA] Errore insert inca_percorsi:',
              percorsiError
            );
          }
        }
      } catch (percorsoErr) {
        console.error('[INCA] Errore generale percorsi:', percorsoErr);
      }

      setMessage(
        `PDF INCA caricato correttamente. Cavi teorici registrati: ${insertedCavi.length}.`
      );
      setMessageKind('success');

      if (typeof onImported === 'function') {
        onImported();
      }
    } catch (err) {
      console.error('[INCA] Errore Import INCA:', err);
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
            Importa file INCA (PDF)
          </div>
          <div className="text-xs text-slate-300 max-w-xl">
            Carica il PDF esportato da INCA. Il file viene salvato in archivio e
            i cavi teorici vengono registrati nella base dati, insieme ai
            percorsi (supporti) quando disponibili.
          </div>
        </div>
        <button
          type="button"
          onClick={handleClickSelect}
          disabled={uploading}
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-emerald-500/70 bg-emerald-500/15 text-[12px] font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? 'Caricamento…' : '＋ Importa file INCA (PDF)'}
        </button>
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
