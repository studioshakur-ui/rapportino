// src/rapportino/rapportinoUtils.js

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
 * ⚠️ Phase 2 CAPO – Chantier A :
 * Pour ELETTRICISTA, on applique directement le template 6358 (DE-ICING)
 * que tu utilises à Riva :
 *   - 5 lignes
 *   - prévisti adaptés
 *   - dernière ligne = VARI STESURA (GESTIONE E VARIE)
 */
export function getBaseRows(crewRole) {
  if (crewRole === 'ELETTRICISTA') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'STESURA',
        descrizione: 'STESURA CAVI (3X6)',
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
        descrizione: 'SISTEMAZIONE CAVI (3X6)',
        operatori: '',
        tempo: '',
        previsto: '10,0',
        prodotto: '',
        note: '',
      },
      {
        id: null,
        row_index: 4,
        categoria: 'GESTIONE E VARIE',
        descrizione: 'VARI STESURA',
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
// src/rapportinoUtils.js

export function adjustOperatorTempoHeights(target) {
  if (!target || typeof window === 'undefined') return;

  // on remonte à la ligne du tableau
  const rowEl = target.closest('[data-rapportino-row]');
  if (!rowEl) return;

  // les 3 zones à synchroniser : OPERATORE, TEMPO, PRODOTTO
  const areas = [
    rowEl.querySelector('textarea[data-field="operatori"]'),
    rowEl.querySelector('textarea[data-field="tempo"]'),
    rowEl.querySelector('textarea[data-field="prodotto"]'),
  ].filter(Boolean);

  if (areas.length === 0) return;

  // reset pour recalculer proprement
  areas.forEach((el) => {
    el.style.height = 'auto';
  });

  // on cherche la hauteur max
  let max = 0;
  areas.forEach((el) => {
    const h = el.scrollHeight;
    if (h > max) max = h;
  });

  // hauteur minimale pour garder l’effet “feuille papier”
  const finalHeight = Math.max(max, 32); // 32px ≈ une ligne et demie

  areas.forEach((el) => {
    el.style.height = `${finalHeight}px`;
  });
}
