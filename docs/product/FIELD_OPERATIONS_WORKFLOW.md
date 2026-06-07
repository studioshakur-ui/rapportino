# FIELD OPERATIONS WORKFLOW

## 1. Missione prodotto

CORE COMMAND è il sistema di esecuzione del cantiere personale.
Non è una BI dashboard, non è un cockpit di analytics generiche e non è un assistente AI astratto.

Il suo scopo è aiutare il team operativo a:
- preparare il lavoro del giorno;
- verificare il lavoro sul campo;
- chiudere apparati e sistemi;
- produrre una situazione giornaliera chiara e azionabile;
- preparare le priorità del giorno successivo.

Il prodotto principale deve rispondere a una domanda semplice: cosa bisogna fare oggi per arrivare alla chiusura?

## 2. Utente principale

L’utente principale è il capo squadra o responsabile terreno.

Il suo contesto operativo è concreto:
- lavora con una lista stampata o comunque consultata come riferimento di giornata;
- verifica fisicamente i cavi e le apparecchiature;
- riceve e invia messaggi Telegram;
- aggiorna la situazione nel pomeriggio;
- deve comunicare chiaramente al capo cantiere e alla direzione cosa è chiuso, cosa è bloccato e cosa manca.

CORE COMMAND deve parlare la sua lingua operativa, non quella di una dashboard astratta.

## 3. Fonti di verità

### Lista lavoro
- **Cosa rappresenta:** il piano operativo del giorno.
- **Cosa non rappresenta:** non è il sistema amministrativo completo del progetto.
- **Come entra nel core-engine:** definisce ciò che va verificato, confermato o chiuso nella giornata.

### Lista Cavi / SDC
- **Cosa rappresenta:** il dettaglio dei cavi da seguire nel ciclo operativo.
- **Cosa non rappresenta:** non è la verità finale del cantiere da sola.
- **Come entra nel core-engine:** alimenta il dettaglio tecnico e la lettura campo, ma non sostituisce la chiusura apparati/sistemi.

### INCA
- **Cosa rappresenta:** il riferimento read-only di stato tecnico/impiantistico.
- **Cosa non rappresenta:** non è una sorgente modificabile dal client e non è il motore operativo del giorno.
- **Come entra nel core-engine:** viene letto e tradotto, mai scritto dal cockpit.

### Telegram / prove campo
- **Cosa rappresenta:** la prova operativa, il segnale sul terreno, il messaggio che conferma o sblocca.
- **Cosa non rappresenta:** non è una fonte amministrativa né un archivio neutro.
- **Come entra nel core-engine:** contribuisce alla prova campo, al blocco, alla conferma e alla situazione giornaliera.

## 4. Giornata operativa

### 07:00 — Preparazione
- selezione della lista di lavoro;
- stampa o preparazione del supporto operativo;
- brief squadra;
- assegnazione delle priorità del giorno.

### 08:00–16:00 — Campo
- verifica dei cavi e degli apparati;
- raccolta evidenze;
- scambio Telegram;
- confronto tra lista stampata e realtà di campo;
- annotazioni operative e prova campo.

### 16:30 — Situazione
- sintesi dello stato;
- dichiarazione dei bloccanti;
- elenco degli apparati non chiusi;
- elenco dei cavi verificati;
- elenco dei cavi restanti;
- messaggio da inviare a chi deve ricevere la situazione.

### Fine giornata
- preparazione delle priorità del giorno successivo;
- identificazione dei punti da verificare all’apertura del mattino.

## 5. Oggetti métier

### Lista
- **Definizione:** insieme operativo dei cavi e delle attività del giorno.
- **Fonte dati:** lista lavoro / import giornaliero.
- **Ruolo nel workflow:** guida la preparazione e la verifica di giornata.

### Cavo
- **Definizione:** unità operativa minima da verificare, confermare o sbloccare.
- **Fonte dati:** lista, INCA, Telegram, prova campo.
- **Ruolo nel workflow:** elemento da chiudere, non obiettivo finale.

### Apparato
- **Definizione:** entità ESWBS che si chiude solo quando i suoi cavi necessari sono confermati.
- **Fonte dati:** grafo apparati del core-engine.
- **Ruolo nel workflow:** è una delle vere unità di chiusura del cantiere.

### Sistema
- **Definizione:** aggregazione operativa di apparati e cavi che permette di leggere la chiusura a livello più alto.
- **Fonte dati:** core-engine.
- **Ruolo nel workflow:** aiuta a capire dove il cantiere è ancora aperto o bloccato.

### Evidenza
- **Definizione:** prova che un cavo o un’attività è stata realmente verificata sul campo.
- **Fonte dati:** Telegram, WhatsApp, tracce operative.
- **Ruolo nel workflow:** valida o rafforza la conferma.

### Stato INCA
- **Definizione:** stato tecnico tradotto da un codice bruto in una legenda canonica.
- **Fonte dati:** INCA read-only.
- **Ruolo nel workflow:** supporta il giudizio tecnico, senza diventare l’unica verità.

### Prova campo
- **Definizione:** evidenza operativa che conferma ciò che è avvenuto sul terreno.
- **Fonte dati:** messaggi, foto, riferimenti cavo, conferme di posa.
- **Ruolo nel workflow:** decide se un cavo è davvero confermato.

### Bloccante
- **Definizione:** elemento che impedisce la chiusura di un cavo, di un apparato o di un sistema.
- **Fonte dati:** finding critici, INCA bloccato, assenza di prova, segnali di anomalia.
- **Ruolo nel workflow:** determina cosa non può ancora essere chiuso.

### Chiusura
- **Definizione:** stato di completamento operativo di un apparato, di un sistema o di una zona.
- **Fonte dati:** core-engine.
- **Ruolo nel workflow:** è l’obiettivo principale del prodotto.

### Situazione giornaliera
- **Definizione:** fotografia operativa di ciò che è chiuso, aperto, bloccato e da fare.
- **Fonte dati:** core-engine + prove di campo.
- **Ruolo nel workflow:** è il messaggio di fine giornata e la base per il giorno dopo.

## 6. Domande prodotto

### Oggi
- Cosa devo verificare?
- Cosa devo chiudere?
- Cosa è bloccato?

### Apparati
- Quale apparato non chiude?
- Perché?
- Da quale cavo è bloccato?

### Campo
- Cosa è stato verificato?
- Quali prove sono arrivate?
- Cosa manca come evidenza?

### Grafici
- Dove siamo bloccati?
- Quale sistema è più critico?
- Le verifiche campo stanno avanzando?

### Situazione
- Cosa devo inviare alle 16:30?
- Quali bloccanti devo dichiarare?
- Quali azioni proporre per domani?

## 7. Regole prodotto

- Nessuna percentuale senza spiegare cosa blocca.
- INCA è read-only.
- Telegram è prova campo, non fonte amministrativa.
- La lista stampata è il contratto operativo della giornata.
- Il core-engine è la fonte unica per il prodotto principale.
- Le pagine `INTERNAL_DETAIL` possono leggere dettagli specifici, ma non diventano fonte di verità principale.
- ECharts è ammesso solo per grafici métier.

## 8. Cosa NON fa parte del prodotto principale

Non fanno parte del prodotto principale:
- dashboard legacy;
- story verbose;
- analytics generiche;
- cockpit IA astratto;
- widget decorativi;
- ranking risk senza azione;
- percentuali isolate.

## 9. Implicazioni per il codice

### Moduli principali
- `src/domain/core-engine/`
- `src/features/core-command/oggi/`
- `src/features/core-command/apparati/`
- `src/features/core-command/campo/`
- `src/features/core-command/grafici/`

### Moduli che restano `INTERNAL_DETAIL`
- `src/features/core-command/cable/CableDetailPage.tsx`
- `src/modules/daily-lists/DailyListDetailPage.tsx`

### Moduli `DELETE_LATER`
- `src/modules/cable-story/`
- `src/modules/equipment/EquipmentStoryPage.tsx` come surface legacy se non più necessaria al prodotto finale;
- `src/features/core-command/navemaster/NavemasterPage.tsx` se resta solo compatibilità legacy;
- `src/features/core-command/ai/AICockpitPage.tsx` se non rientra nel flusso operativo reale.

### Come il workflow guida P4
- P4 deve leggere il workflow di cantiere come struttura di prodotto.
- Il focus non è la lista dei cavi, ma la chiusura di apparati, sistemi e zone.
- Ogni nuova vista deve rispondere a una domanda operativa precisa.

## 10. Criteri di accettazione

Il documento è utile se permette di rispondere chiaramente a queste domande:
- CORE aiuta a preparare il lavoro?
- CORE aiuta a verificare sul campo?
- CORE aiuta a chiudere apparati e sistemi?
- CORE aiuta a produrre la situazione delle 16:30?

Se una sezione non aiuta una di queste risposte, non è parte del prodotto principale.
