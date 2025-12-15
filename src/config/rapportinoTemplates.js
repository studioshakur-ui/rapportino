// src/config/rapportinoTemplates.js

// Convertit "0,2" -> 0.2, "" -> null, "110 mt" -> 110
export function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;

  const normalized = s.replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Retourne les lignes de base du rapportino
 * en fonction du rôle de la squadra ET du COSTR.
 *
 * @param {string} crewRole  - 'ELETTRICISTA' | 'CARPENTERIA' | 'MONTAGGIO'
 * @param {string|number} costr - ex: 'C001'
 */
export function getBaseRows(crewRole, costr) {
  const role = crewRole || 'ELETTRICISTA';
  const costrNorm = String(costr || '').trim();

  //
  //  TEMPLATE STANDARD ELETTRICISTA
  //
  if (role === 'ELETTRICISTA') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'STESURA',
        descrizione: 'STESURA',
        operatori: '',
        tempo: '',
        previsto: '150',
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
        previsto: '600',
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
        previsto: '150',
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

  //
  //  AUTRES RÔLES
  //
  if (role === 'CARPENTERIA') {
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

  if (role === 'MONTAGGIO') {
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
