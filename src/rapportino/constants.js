// src/rapportino/constants.js

<<<<<<< HEAD
// Righe di base per ogni tipo di squadra (crew_role)
=======
// Modello di righe vuote per ogni tipo di squadra
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
export const EMPTY_ROWS_BY_CREW = {
  ELETTRICISTA: [
    {
      categoria: 'STESURA',
      descrizione: 'STESURA',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
<<<<<<< HEAD
      note: ''
=======
      note: '',
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    },
    {
      categoria: 'STESURA',
      descrizione: 'FASCETTATURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '600',
      prodotto: '',
<<<<<<< HEAD
      note: ''
=======
      note: '',
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    },
    {
      categoria: 'STESURA',
      descrizione: 'RIPRESA CAVI',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
<<<<<<< HEAD
      note: ''
=======
      note: '',
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    },
    {
      categoria: 'STESURA',
      descrizione: 'VARI STESURA CAVI',
      operatori: '',
      tempo: '',
<<<<<<< HEAD
      previsto: '0,2',
      prodotto: '',
      note: ''
    }
  ],

=======
      // Interfaccia mostra "0,2", ma in DB deve andare 0.2 (ci pensiamo nel hook)
      previsto: '0,2',
      prodotto: '',
      note: '',
    },
  ],
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
  CARPENTERIA: [
    {
      categoria: 'CARPENTERIA',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
<<<<<<< HEAD
      note: ''
    }
  ],

=======
      note: '',
    },
  ],
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
  MONTAGGIO: [
    {
      categoria: 'MONTAGGIO',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
<<<<<<< HEAD
      note: ''
    }
  ]
};

// Etichette degli stati del rapportino (per il badge in alto)
export const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validata dal Capo'
=======
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
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
};
