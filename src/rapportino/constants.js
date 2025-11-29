// src/rapportino/constants.js

// Modello di righe vuote per ogni tipo di squadra
export const EMPTY_ROWS_BY_CREW = {
  ELETTRICISTA: [
    {
      categoria: 'STESURA',
      descrizione: 'STESURA',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'FASCETTATURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '600',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'RIPRESA CAVI',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'VARI STESURA CAVI',
      operatori: '',
      tempo: '',
      // Interfaccia mostra "0,2", ma in DB deve andare 0.2 (ci pensiamo nel hook)
      previsto: '0,2',
      prodotto: '',
      note: '',
    },
  ],
  CARPENTERIA: [
    {
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

// Etichette di stato del rapportino
export const RAPPORTINO_STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validata dal Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
};
