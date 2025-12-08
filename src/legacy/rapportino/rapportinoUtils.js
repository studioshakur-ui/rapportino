// src/rapportinoUtils.js

// Date du jour au format YYYY-MM-DD
export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Parsing numérique tolérant ("," ou "."), null si vide / invalide
export function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;

  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

/**
 * Lignes de base selon le rôle de l'équipe.
 *
 * ⚠️ Version 6368 · SDC (ELETTRICISTA)
 *
 * Pour ELETTRICISTA, on applique le template chantier 6368 :
 *   - 4 lignes
 *   - STESURA / FASCETTATURA / RIPRESA / VARI STESURA CAVI
 *   - PREVISTI : 150 / 600 / 150 / 0,2
 */
export function getBaseRows(crewRole) {
  if (crewRole === 'ELETTRICISTA') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'STESURA',
        descrizione: 'STESURA',
        operatori: '',
        tempo: '',
        previsto: '150,0',
        prodotto: '',
        note: '',
      },
      {
        id: null,
        row_index: 1,
        categoria: 'STESURA',
        descrizione: 'FASCETTATURA CAVI',
        operatori: '',
        tempo: '',
        previsto: '600,0',
        prodotto: '',
        note: '',
      },
      {
        id: null,
        row_index: 2,
        categoria: 'STESURA',
        descrizione: 'RIPRESA CAVI',
        operatori: '',
        tempo: '',
        previsto: '150,0',
        prodotto: '',
        note: '',
      },
      {
        id: null,
        row_index: 3,
        categoria: 'STESURA',
        descrizione: 'VARI STESURA CAVI',
        operatori: '',
        tempo: '',
        previsto: '0,2',
        prodotto: '',
        note: '',
      },
    ];
  }

  if (crewRole === 'CARPENTERIA') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'CARPENTERIA',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ];
  }

  if (crewRole === 'MONTAGGIO') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'MONTAGGIO',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ];
  }

  // Fallback très générique
  return [
    {
      id: null,
      row_index: 0,
      categoria: '',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ];
}

/**
 * Ajuste automatiquement la hauteur des zones OPERATORE / TEMPO
 * pour qu’elles restent parfaitement alignées sur la même ligne.
 */
export function adjustOperatorTempoHeights(textareaEl) {
  if (!textareaEl) return;

  const tr = textareaEl.closest('tr');
  if (!tr) return;

  const tAreas = tr.querySelectorAll('textarea[data-optempo="1"]');
  if (!tAreas.length) return;

  let max = 0;

  // On calcule la hauteur max
  tAreas.forEach((ta) => {
    ta.style.height = 'auto';
    const h = ta.scrollHeight;
    if (h > max) max = h;
  });

  // On applique la même hauteur à toutes les textarea de la ligne
  tAreas.forEach((ta) => {
    ta.style.height = max + 'px';
  });
}
