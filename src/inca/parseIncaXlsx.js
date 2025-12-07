// src/inca/parseIncaXlsx.js
import * as XLSX from 'xlsx';

/**
 * Parser XLSX INCA (foglio DATI)
 *
 * Il retourne un tableau d'objets déjà au format proche de la table inca_cavi :
 * {
 *   marca_cavo,          // MARCA CAVO  → ex: "1-1 N AH163"
 *   codice,              // = MARCA CAVO (ID univoco del cavo in CORE)
 *   codice_materiale,    // CODICE CAVO (2816...) se serve
 *   livello_disturbo,
 *   tipo,
 *   sezione,
 *   wbs,
 *   descrizione,
 *   metri_teo,           // LUNGHEZZA DI DISEGNO
 *   metri_totali,        // LUNGHEZZA DI POSA
 *   metri_previsti,      // LUNGHEZZA DI CALCOLO
 *   stato_inca,          // SITUAZIONE CAVO brut (M, P, E, V, …)
 *   situazione,          // T / P / R / B (se compatibile con il check), altrimenti null
 *   rev_inca             // REVISIONE (string)
 * }
 */

function normalizeHeader(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export async function parseIncaXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Lecture brute en matrice
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: null,
        });

        if (!rows || rows.length === 0) {
          console.warn('[INCA XLSX] Nessuna riga trovata nel foglio.');
          return resolve([]);
        }

        // 1) Trouver la ligne d'entête (celle qui contient "MARCA CAVO")
        let headerRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (
            r.some(
              (cell) =>
                typeof cell === 'string' &&
                normalizeHeader(cell) === 'MARCA CAVO'
            )
          ) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.warn(
            '[INCA XLSX] Impossibile trovare intestazione "MARCA CAVO" nel file.'
          );
          return resolve([]);
        }

        const headerRow = rows[headerRowIndex];
        console.log(
          '[INCA XLSX] Header row index:',
          headerRowIndex,
          '→',
          headerRow
        );

        // 2) Mapping colonnes → champs
        const colIndex = {
          marca: null,
          codiceArt: null,
          livello: null,
          tipo: null,
          sezione: null,
          wbs: null,
          situazioneCavo: null,
          lungDisegno: null,
          lungPosa: null,
          lungCalc: null,
          descrizioneArrivo: null,
          revInca: null,
        };

        headerRow.forEach((cell, idx) => {
          const norm = normalizeHeader(cell);

          if (norm === 'MARCA CAVO') colIndex.marca = idx;
          else if (norm === 'CODICE CAVO') colIndex.codiceArt = idx;
          else if (norm === 'LIVELLO DISTURBO') colIndex.livello = idx;
          else if (norm === 'TIPO CAVO') colIndex.tipo = idx;
          else if (norm === 'SEZIONE') colIndex.sezione = idx;
          else if (norm === 'WBS') colIndex.wbs = idx;
          else if (norm === 'SITUAZIONE CAVO') colIndex.situazioneCavo = idx;
          else if (norm === 'LUNGHEZZA DI DISEGNO')
            colIndex.lungDisegno = idx;
          else if (norm === 'LUNGHEZZA DI POSA') colIndex.lungPosa = idx;
          else if (norm === 'LUNGHEZZA DI CALCOLO') colIndex.lungCalc = idx;
          else if (
            norm.includes('APP ARRIVO') &&
            norm.includes('DESCRIZIONE')
          ) {
            colIndex.descrizioneArrivo = idx;
          } else if (norm === 'REVISIONE') {
            // colonne "REVISIONE" (rev INCA principale)
            colIndex.revInca = idx;
          }
        });

        console.log('[INCA XLSX] Column mapping:', colIndex);

        if (colIndex.marca == null) {
          console.warn(
            '[INCA XLSX] La colonna "MARCA CAVO" non è stata mappata correttamente.'
          );
          return resolve([]);
        }

        const cables = [];

        // 3) Lignes de données
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;

          const marcaCell =
            colIndex.marca != null ? row[colIndex.marca] : null;
          const marca = marcaCell != null ? String(marcaCell).trim() : '';

          if (!marca) {
            // ligne vide ou sans cable → skip
            continue;
          }

          const codiceArtCell =
            colIndex.codiceArt != null ? row[colIndex.codiceArt] : null;
          const livelloCell =
            colIndex.livello != null ? row[colIndex.livello] : null;
          const tipoCell =
            colIndex.tipo != null ? row[colIndex.tipo] : null;
          const sezioneCell =
            colIndex.sezione != null ? row[colIndex.sezione] : null;
          const wbsCell =
            colIndex.wbs != null ? row[colIndex.wbs] : null;
          const situazioneCell =
            colIndex.situazioneCavo != null
              ? row[colIndex.situazioneCavo]
              : null;

          const lungDisegnoCell =
            colIndex.lungDisegno != null
              ? row[colIndex.lungDisegno]
              : null;
          const lungPosaCell =
            colIndex.lungPosa != null ? row[colIndex.lungPosa] : null;
          const lungCalcCell =
            colIndex.lungCalc != null ? row[colIndex.lungCalc] : null;

          const descrArrivoCell =
            colIndex.descrizioneArrivo != null
              ? row[colIndex.descrizioneArrivo]
              : null;

          const revIncaCell =
            colIndex.revInca != null ? row[colIndex.revInca] : null;

          const situazioneRaw =
            situazioneCell != null
              ? String(situazioneCell).trim()
              : null;

          const lungDisegno = Number(lungDisegnoCell || 0) || 0;
          const lungPosa = Number(lungPosaCell || 0) || 0;
          const lungCalc = Number(lungCalcCell || 0) || 0;

          // SITUAZIONE filtrée pour respecter le CHECK (T/P/R/B)
          const allowedSitu = ['T', 'P', 'R', 'B'];
          const situazione =
            situazioneRaw && allowedSitu.includes(situazioneRaw)
              ? situazioneRaw
              : null;

          cables.push({
            // clé métier du cavo = MARCA CAVO
            marca_cavo: marca,
            codice: marca, // utilisé pour la PK/logique CORE + index (codice, rev_inca)
            codice_materiale:
              codiceArtCell != null
                ? String(codiceArtCell).trim()
                : null,

            livello_disturbo:
              livelloCell != null ? String(livelloCell).trim() : null,
            tipo: tipoCell != null ? String(tipoCell).trim() : null,
            sezione:
              sezioneCell != null ? String(sezioneCell).trim() : null,
            wbs: wbsCell != null ? String(wbsCell).trim() : null,

            descrizione:
              descrArrivoCell != null
                ? String(descrArrivoCell).trim()
                : null,

            metri_teo: lungDisegno || null,
            metri_totali: lungPosa || null,
            metri_previsti: lungCalc || null,

            stato_inca: situazioneRaw, // valeur brute Excel
            situazione,                // valeur filtrée compatible CHECK

            rev_inca:
              revIncaCell != null ? String(revIncaCell).trim() : null,
          });
        }

        // 4) Dédoublonnage sur MARCA CAVO (un cavo physique)
        const seen = new Set();
        const unique = [];

        for (const c of cables) {
          if (!c.marca_cavo) continue;
          const key = c.marca_cavo;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(c);
        }

        console.log(
          `[INCA XLSX] Cavi letti (grezzi): ${cables.length} → righe uniche: ${unique.length}`
        );
        resolve(unique);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (e) => {
      reject(e);
    };

    reader.readAsArrayBuffer(file);
  });
}
