// src/rapportino/constants.js

// Righe di base per ogni tipo di squadra (crew_role)
export const EMPTY_ROWS_BY_CREW = {
  ELETTRICISTA: [
    {
      categoria: 'STESURA',
      descrizione: 'STESURA',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
      note: ''
    },
    {
      categoria: 'STESURA',
      descrizione: 'FASCETTATURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '600',
      prodotto: '',
      note: ''
    },
    {
      categoria: 'STESURA',
      descrizione: 'RIPRESA CAVI',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
      note: ''
    },
    {
      categoria: 'STESURA',
      descrizione: 'VARI STESURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '0,2',
      prodotto: '',
      note: ''
    }
  ],

  CARPENTERIA: [
    {
      categoria: 'CARPENTERIA',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: ''
    }
  ],

  MONTAGGIO: [
    {
      categoria: 'MONTAGGIO',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: ''
    }
  ]
};

// Etichette degli stati del rapportino (per il badge in alto)
export const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validata dal Capo'
};
