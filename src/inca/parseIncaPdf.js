// src/inca/parseIncaPdf.js
// Parsing "light" du PDF INCA pour extraire des lignes câble
// On utilise pdfjs-dist avec le worker ESM local.

// 1) pdf.js + worker local
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Très important : on indique à pdf.js où trouver SON worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// --------- Regex pour reconnaître les lignes câble ----------------------
//
// On part sur une approche pragmatique : on cherche des lignes contenant
// des motifs "METRI" + nombres, puis on extrait :
// - un "codice" câble (ex. 42C, 21LN14K, etc.) si possible
// - une description brute
// - des "metri_totali" approximatifs
//
// On pourra raffiner ensuite une fois qu’on aura vu plusieurs INCA réels.
//

// Exemple : on isole des segments de texte qui ressemblent à des lignes
// avec des mètres + un code "CN/" à la fin.
const ROW_REGEX =
  /(?:\d{1,2}\/\d{1,2}\/\d{2,4}\s+)?M[\w\s]*?CN\//g;

// Code câble style "42C", "21LN14K" etc. (à affiner en fonction des vrais patterns)
const CODICE_REGEX = /\b[A-Z0-9]{2,8}\b/;

// Trois nombres qui se suivent avant un code type CN/
const METRI_REGEX = /(\d+)\s+(\d+)\s+(\d+)\s+[A-Z0-9]+\s+CN\//;

/**
 * parseIncaPdf(file: File) : Promise<IncaCable[]>
 *
 * Retourne un tableau d’objets :
 * {
 *   codice: string,
 *   descrizione: string,
 *   metri_totali: number,
 *   situazione: 'T' | 'P' | null
 * }
 */
export async function parseIncaPdf(file) {
  if (!file) return [];

  try {
    // On lit le PDF en ArrayBuffer
    const buffer = await file.arrayBuffer();

    // On charge le document PDF
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const results = [];

    // On parcourt toutes les pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      // On concatène tous les fragments de texte en une seule chaîne
      const text = content.items.map((i) => i.str).join(' ');

      // On cherche des segments qui ressemblent à des "lignes câble"
      const matches = text.matchAll(ROW_REGEX);

      for (const match of matches) {
        const row = match[0].replace(/\s+/g, ' ').trim();

        // Tentative d’extraction d’un "codice" câble
        let codice = null;
        const mCod = CODICE_REGEX.exec(row);
        if (mCod) {
          codice = mCod[0];
        }

        // Tentative d’extraction des mètres (on prend le premier nombre comme référence)
        let metri_totali = 0;
        const mMetri = METRI_REGEX.exec(row);
        if (mMetri) {
          // Pour l’instant on prend le premier nombre (METRI TEO) comme base
          metri_totali = parseInt(mMetri[1], 10) || 0;
        }

        // Situation : pour l’instant on ne sait pas encore lire P/T dans cette version → T
        const situazione = 'T';

        results.push({
          codice: codice || row.substring(0, 40),
          descrizione: row,
          metri_totali,
          situazione,
        });
      }
    }

    console.log('parseIncaPdf → cavi trovati:', results.length);
    return results;
  } catch (err) {
    console.error('parseIncaPdf → Errore durante il parsing del PDF INCA:', err);
    return [];
  }
}
