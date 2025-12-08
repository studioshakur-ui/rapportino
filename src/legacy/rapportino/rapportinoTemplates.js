// src/components/rapportino/rapportinoTemplates.js

// Modèle par défaut 6368 (ce que tu utilises déjà)
const base6368 = {
  ELETTRICISTA: [
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
  ],
  CARPENTERIA: [
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
  ],
  MONTAGGIO: [
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
  ],
};

// Exemple spécifique 6358 (DE-ICING ELETTRICISTA) – à affiner selon tes papiers
const base6358 = {
  ELETTRICISTA: [
    {
      id: null,
      row_index: 0,
      categoria: 'DE-ICING',
      descrizione: 'POSA CAVI DE-ICING',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
    {
      id: null,
      row_index: 1,
      categoria: 'DE-ICING',
      descrizione: 'COLLEGAMENTI QUADRI / JUNCTION BOX',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
    {
      id: null,
      row_index: 2,
      categoria: 'DE-ICING',
      descrizione: 'PROVE, MISURE, TEST',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ],
  CARPENTERIA: base6368.CARPENTERIA,
  MONTAGGIO: base6368.MONTAGGIO,
};

export const RAPPORTINO_TEMPLATES = {
  '6368': base6368,
  '6358': base6358,
};

export function getBaseRowsFor(costr, crewRole) {
  const template = RAPPORTINO_TEMPLATES[costr] || base6368;
  const rows = template[crewRole] || template.ELETTRICISTA || [];
  // deep clone pour ne pas modifier le template original
  return rows.map((r, idx) => ({
    ...r,
    id: null,
    row_index: idx,
  }));
}
