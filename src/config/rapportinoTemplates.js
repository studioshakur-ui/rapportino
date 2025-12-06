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
 * @param {string|number} costr - ex: '6368', '6358'
 */
export function getBaseRows(crewRole, costr) {
  const role = crewRole || 'ELETTRICISTA';
  const costrNorm = String(costr || '').trim();

  //
  //  TEMPLATE 6358 – DE-IC/NG – ELETTRICISTA
  //
  if (role === 'ELETTRICISTA' && costrNorm === '6358') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'STESURA',
        descrizione: "STESURA CAVI (3X6)",
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

  //
  //  TEMPLATE STANDARD ELETTRICISTA (ex: 6368 – SDC)
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
