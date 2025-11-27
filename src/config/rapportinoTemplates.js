// src/config/rapportinoTemplates.js

// Modèles "papier" pour chaque tipo squadra.
// On ne met que CATEGORIA + DESCRIZIONE, le reste sera vide.

export const RAPPORTINO_TEMPLATES = {
  ELETTRICISTA: [
    { categoria: 'STESURA', descrizione: 'STESURA' },
    { categoria: 'STESURA', descrizione: 'FASCETTATURA CAVI' },
    { categoria: 'STESURA', descrizione: 'RIPRESA CAVI' },
    { categoria: 'STESURA', descrizione: 'VARI STESURA CAVI' },
  ],

  CARPENTERIA: [
    {
      categoria: 'CARPENTERIA',
      descrizione: 'PREPARAZIONE STAFFE SOLETTE/STRADE CAVI MAGAZZINO',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA STAFFE STRADE CAVI',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'MONTAGGIO STRADE CAVI',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA TONDINI',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA BASAMENTI (APPARECCHIATURE)',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'TRACCIATURA KIEPE/COLLARI',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA KIEPE/COLLARI',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'MOLATURA KIEPE',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'MOLATURA STAFFE, TONDINI, BASAMENTI',
    },
    {
      categoria: 'CARPENTERIA',
      descrizione: 'VARIE CARPENTERIE',
    },
  ],

  MONTAGGIO: [
    {
      categoria: 'IMBARCHI',
      descrizione: 'VARI IMBARCHI (LOGISTICA E TRASPORTO)',
    },
    {
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA MINORE DI 50 KG',
    },
    {
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG',
    },
    {
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG',
    },
    {
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG',
    },
  ],
};

// Construit les lignes complètes (avec operatori/tempo vides etc.)
export function getDefaultRowsForCrewRole(crewRole) {
  const key = (crewRole || '').toUpperCase();
  const base = RAPPORTINO_TEMPLATES[key];
  if (!base) return [];

  return base.map((row, index) => ({
    id: null,
    row_index: index,
    categoria: row.categoria,
    descrizione: row.descrizione,
    operatori: '',
    tempo: '',
    previsto: '',
    prodotto: '',
    note: '',
  }));
}
