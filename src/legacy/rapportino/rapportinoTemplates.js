// src/components/rapportino/rapportinoTemplates.js

// Modèle par défaut (générique)
const baseC001 = {
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

// Exemple spécifique (générique)
const baseTemplate = {
  ELETTRICISTA: [
    {
      id: null,
      row_index: 0,
      categoria: 'PROGETTO',
      descrizione: 'POSA CAVI PROGETTO',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
    {
      id: null,
      row_index: 1,
      categoria: 'PROGETTO',
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
      categoria: 'PROGETTO',
      descrizione: 'PROVE, MISURE, TEST',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ],
  CARPENTERIA: baseC001.CARPENTERIA,
  MONTAGGIO: baseC001.MONTAGGIO,
};

export const const RAPPORTINO_TEMPLATES = {
  DEFAULT: baseTemplate,
};

export function getBaseRowsFor(costr, crewRole) {
  const template = RAPPORTINO_TEMPLATES[costr] || baseC001;
  const rows = template[crewRole] || template.ELETTRICISTA || [];
  // deep clone pour ne pas modifier le template original
  return rows.map((r, idx) => ({
    ...r,
    id: null,
    row_index: idx,
  }));
}
