# Quadro — brief di creazione

Documento unico per rifare Quadro da zero: prodotto, testi, dati, interfaccia, movimento, persistenza. Lingua dell’app: italiano. Nessun account, nessun server dati. Tutto resta nel browser.

## 1. Prodotto

**Nome:** Quadro  
**Tagline:** Tutto, in un colpo.  
**Cos’è:** uno studio personale. Bacheche, pipeline vendite, note, calendario e home. Un posto solo, non tre app.

**Per chi:**

| Chi | Cosa ci trova |
|---|---|
| Persona | Casa, scadenze, liste |
| Venditore | Offerte, clienti, euro |
| Developer | Bug, review, ship |
| Azienda | Team, consegne, più spazi |

**Non è:** un tool di team online, un CRM, un account cloud. I dati non escono dal dispositivo se non li esporti tu.

**Voce:** corta, concreta, senza marketing. “Serve un titolo.” “Spazio aggiunto.” “I dati restano sul dispositivo.” Mai “potenzia la tua produttività”.

## 2. Stack

- React 19 + TanStack Start (file routes)
- Tailwind v4, token in CSS (`@theme`)
- Zustand + `persist` su `localStorage`
- dnd-kit per trascinare schede e offerte
- Motion (Framer) per morph, scramble, bloom, tooltip
- Lucide per le icone
- Sonner per i toast
- Font: Figtree (testo), Oswald (display, maiuscolo)

Auth e database spenti. Niente login.

## 3. Mappa

```
/                      Home
/spazio/$spaceId       Bacheca, Vendite o Note, in base al tipo
/calendario            Mese, settimana, agenda
/impostazioni          Studio, schede, date, vista, dati
```

Se lo spazio non esiste: titolo “Non c’è più”, riga “Questo spazio è stato rimosso.”, link Home.

**Shell (sempre):**

- Tela crema con alone blu in basso a destra.
- Menu laterale flottante, angoli grandi, ombra morbida. Su telefono è una card che entra da sinistra, non un foglio a tutta altezza.
- In alto nel menu: logo + **Quadro** + nome studio + chevron. Clic torna in home.
- Gruppo **Studio:** Home (badge = schede + offerte + note), Calendario (badge = schede con data).
- Gruppo **Spazi:** una riga per spazio, badge = conteggio, `+` per aggiungerne uno. Niente seconda riga “Nuovo spazio”.
- In basso: **Cerca**, **Impostazioni**. Sotto, una riga piccola: “N schede · N offerte · N note”.
- La voce attiva è una pillola piena blu, testo crema. Il fondo si sposta con un layout morph.
- Su desktop il menu si piega in una rail di sole icone. Tooltip a destra.
- Su mobile, in cima: menu, titolo pagina, cerca, impostazioni.
- Cambio pagina: blur + slide corta. Con movimento “Calmo”, solo fade.

## 4. Home

Kicker: logo piccolo + **Quadro**.  
Titolo: “Tutto,” / “in un colpo.”  
Sottotitolo: data di oggi lunga (“Lunedì 21 settembre.”) + “Lavoro, vendite, casa.”  
Hint desktop: “N nuova · ⌘K cerca · ⌘B menu”. Su telefono non mostrare i ⌘.

**Cattura:** campo “Aggiungi una scheda”. Invio crea una scheda sulla prima bacheca, con priorità e colonna di default dalle impostazioni. Toast “Aggiunta”.

**Numeri (4 tile):**

- Bacheche — schede, barra Da fare / In corso / Completato
- Vendite — offerte, valore pipeline
- Note — conteggio
- Valore — euro vinti o totali

**In arrivo:** stack di scadenze. Compatto; si apre in lista al passaggio o al tap. Chip data: rosso se scaduta, grigio chiaro se oggi, normale se in arrivo. Orizzonte da impostazioni (7, 14 o 30 giorni). Tap apre lo spazio.

## 5. Spazi

Tre tipi. Si creano, rinominano, eliminano. Titolo duplicato diventa “Bacheca 2”, “Note 3”, ecc.

| Tipo | Titolo default | Hint | Titolo pagina |
|---|---|---|---|
| board | Bacheca | Lavoro, casa, sprint | Le cose da fare, / in tre colonne. |
| sales | Vendite | Pipeline e euro | Le trattative, / in tre fasi. |
| notes | Note | Idee e liste | Appunti, / quando servono. |

Dialog nuovo spazio: scegli il tipo, poi — solo per le bacheche — il kit. Il kit scelto ha un morph (`layoutId`). Titolo editabile. Elimina con conferma.

Spazi di partenza, in quest’ordine: Bacheca, Vendite, Note.

## 6. Bacheca

Tre colonne fisse. Non se ne aggiungono.

| Id | Titolo | Hint |
|---|---|---|
| todo | Da fare | In attesa |
| doing | In corso | In lavorazione |
| done | Completato | Fatto |

**Scheda:** titolo (max 120), descrizione, priorità (Bassa / Media / Alta), data opzionale. Trascina tra colonne e dentro la colonna. Selezione multipla con checkbox (segno che si disegna, stato indeterminato sul “seleziona tutte”). Barra in basso: sposta, elimina.

**Filtri** (chip che morphano): Tutte, Alta, Oggi, Scadute. Più un campo “Cerca schede”.

**Bloom “Nuova”** (menu che si apre a iride dal centro):

| Voce | Effetto |
|---|---|
| Scheda | Dialog vuoto, priorità e colonna di default |
| Oggi | Scheda con data di oggi |
| Domani | Data +1 |
| Settimana | Data +7 |
| Alta | Priorità alta |
| In corso | Colonna In corso |

Se “Seleziona le scadenze” è acceso, le schede di oggi e quelle in ritardo partono già selezionate.

**Stack scadenze** in colonna, sopra o accanto: etichetta “In ritardo” se c’è almeno una scaduta, altrimenti “Oggi”.

**Chip data sulla scheda:** scaduto rosso, oggi tenue, futuro normale. Data relativa (“oggi”, “domani”, “tra 3 g”, “3 g fa”).

**Conferma elimina:** se l’impostazione è accesa, dialog. Se è spenta, cancella subito. Vale per la bacheca; note e vendite chiedono comunque conferma nel dialog dedicato.

### Contenuto iniziale — Bacheca

| Scheda | Colonna | Priorità | Data | Testo |
|---|---|---|---|---|
| Scrivere il brief per settembre | Da fare | Alta | 2026-09-17 | Obiettivi, tono di voce e tre riferimenti visivi da condividere con il team. |
| Richiedere preventivo fornitori | Da fare | Media | 2026-09-25 | Due opzioni per stampa e allestimento, con tempi di consegna. |
| Aggiornare le foto prodotto | In corso | Media | 2026-10-03 | Sostituire gli scatti vecchi in homepage e in catalogo. |
| Definire le tre colonne | Completato | Bassa | nessuna | Da fare, In corso e Completato — flusso semplice, niente di più. |

### Kit per una bacheca nuova

Le date sono relative a oggi (`dueIn` = giorni). Negativo = già passata.

**Vuota** — zero schede. Parti da zero.

**Personale** — Casa e scadenze.

| Titolo | Colonna | Priorità | Giorni | Testo |
|---|---|---|---|---|
| Pagare le utenze | Da fare | Alta | +3 | Luce, gas e connessione. Segna la data sul calendario. |
| Spesa della settimana | Da fare | Media | +1 | Lista corta: fresco, casa, qualcosa di buono. |
| Prenotare il controllo | Da fare | Bassa | +10 | Dentista o analisi, prima che scivoli di un mese. |
| Allenamento | In corso | Media | 0 | Tre sessioni, anche corte. Basta partire. |
| Rinnovare l'assicurazione | Completato | Bassa | −12 | Confrontare due preventivi e chiudere. |

**Lavoro** — Team e consegne. È il kit di default.

| Titolo | Colonna | Priorità | Giorni | Testo |
|---|---|---|---|---|
| Report della settimana | Da fare | Alta | +2 | Tre risultati, un blocco, la cosa da sbloccare lunedì. |
| Call col cliente | Da fare | Media | +1 | Ordine del giorno e next step scritti prima di chiudere. |
| Chiudere i feedback | Da fare | Media | +5 | Due giri, poi si pubblica. Niente terzo passaggio. |
| Onboarding nuovo ingresso | In corso | Alta | 0 | Accessi, brief, prima consegna entro dieci giorni. |
| Brief approvato | Completato | Bassa | −4 | Obiettivi e tono firmati. Si può lavorare. |

**Codice** — Bug, review, ship.

| Titolo | Colonna | Priorità | Giorni | Testo |
|---|---|---|---|---|
| Riprodurre il bug di login | Da fare | Alta | 0 | Passi, browser, cosa succede. Poi il fix. |
| Review della pull request | Da fare | Media | +1 | Diff, test, un commento utile. Poi approve. |
| Test sul checkout | Da fare | Media | +4 | Percorso felice e un errore di pagamento. |
| API pagamenti | In corso | Alta | +2 | Webhook, idempotenza, log puliti. |
| Pipeline di deploy | Completato | Bassa | −6 | Build, preview, promozione. Verde in main. |

## 7. Vendite

Tre fasi. Stesse regole di drag e selezione della bacheca.

| Id | Titolo | Hint |
|---|---|---|
| lead | Lead | Da chiamare |
| offer | Offerta | In trattativa |
| won | Vinto | Incassato |

**Offerta:** titolo, cliente, valore in euro (intero, mai negativo), note. Mostra il totale per colonna e il conteggio (“2 offerte”). CTA: “Nuova offerta” — deve stare su una riga, anche su telefono.

### Contenuto iniziale

| Offerta | Fase | Cliente | Euro | Note |
|---|---|---|---|---|
| Noleggio piattaforme | Lead | Cantiere Pomezia | 4200 | Due settimane, due macchine. Richiesta per ottobre. |
| Pulizia stagionale | Lead | Garden Village | 1800 | Macchine e detergenti per la stagione estiva. |
| Catalogo e stand | Offerta | Fiera Lazio | 3600 | Stampa catalogo + allestimento 12 mq. |
| Manutenzione flotta | Vinto | Logistica Roma Sud | 2500 | Contratto annuale chiuso a giugno. |

Le offerte non hanno data. Il calendario non le mostra.

## 8. Note

Lista, non colonne. Cerca. Nuova / modifica / elimina. Selezione multipla.

**Nota:** titolo (max 120), testo (max 4000), fino a 6 allegati. Gli allegati sono solo etichetta: nome, peso, tipo, stato. Il file vero non si salva. Copy onesta: “PDF, immagini o zip — resta il nome, non il file.” Stati: In coda, Caricamento, Pronto, Errore. La barra di progresso è finta, locale.

### Contenuto iniziale

**Idee per la settimana**  
Rivedere i testi della landing, preparare tre varianti per i Reels, e chiudere il preventivo stampa.

**Da non dimenticare**  
Chiedere i file originali delle foto prodotto. Tenere da parte i riferimenti visivi del catalogo 2025.  
Allegato finto: `catalogo-2025.pdf`, 2,4 MB, `application/pdf`, pronto.

## 9. Calendario

Solo schede con `dueDate` (ISO `YYYY-MM-DD`).

Viste: **Mese**, **Settimana**, **Agenda**. Pulsante **Oggi**. Frecce avanti/indietro. Primo giorno: lunedì (default) o domenica.

Titolo pagina: “Le date,” / “in vista.”

Tap su un giorno con schede: elenco, link allo spazio.

## 10. Cerca (⌘K)

Overlay. Campo in alto. Gruppi, in quest’ordine quando la query è vuota:

1. **Vai** — Home, Calendario, Impostazioni, ogni spazio
2. **Crea** — Nuova scheda, Nuova nota, Nuova offerta, Nuovo spazio
3. Poi, se c’è testo: schede, note, offerte (titolo, cliente, testo)

Frecce + Invio. Esc chiude. Creare non apre il dialog subito nel palette: mette in coda un `pendingCreate` (`card` | `note` | `deal` | `space`) con un contatore, chiude il palette, la pagina giusta consuma la richiesta e apre il dialog. Stesso valore due volte di fila deve funzionare grazie al contatore.

La cerca atterra sullo spazio. Non apre ancora la scheda singola: è un buco noto.

## 11. Impostazioni

Titolo: “Lo studio,” / “come lo vuoi.”  
Riga: “Default, date, movimento. I dati restano sul dispositivo.”

Pillole di sezione che scrollano alla card: Studio, Schede, Date, Vista, Dati.

| Sezione | Controllo | Default | Opzioni |
|---|---|---|---|
| Studio | Nome (max 24) | Studio | testo libero; vuoto torna a Studio |
| Schede | Priorità | Media | Bassa, Media, Alta |
| Schede | Colonna | Da fare | Da fare, In corso, Completato |
| Schede | Kit | Lavoro | Vuota, Personale, Lavoro, Codice |
| Date | Orizzonte | 14 g | 7 g, 14 g, 30 g |
| Date | Settimana | Lun | Lun, Dom |
| Date | Vista calendario | Mese | Mese, Sett., Agenda |
| Date | Seleziona le scadenze | sì | In bacheca, oggi e i ritardi partono già scelti |
| Vista | Densità | Aria | Aria, Fitta |
| Vista | Movimento | Pieno | Pieno, Calmo |
| Vista | Scrittura in scramble | sì | Le etichette del menu si scompongono all’apertura |
| Vista | Scorciatoie | sì | N nuova, / cerca, ⌘K tutto, ⌘B menu, ⌘, qui |
| Vista | Avvisi | sì | I toast in basso, dopo un’azione |
| Vista | Chiedi prima di eliminare | sì | Altrimenti la scheda sparisce subito |
| Dati | Esporta | — | Scarica `quadro-YYYY-MM-DD.json`. Toast “Copia scaricata”. Avviso: è tutto, in chiaro |
| Dati | Importa | — | Solo file `app: "quadro"`, `version: 1`. Poi reload |
| Dati | Azzera | — | Dialog, poi cancella le chiavi e reload |

I valori fuori lista, in ingresso, vengono riportati al default. Il nome si taglia a 24 caratteri.

Iniziali studio: prima lettera, o prime due parole. “Studio” → S. Servono nell’avatar delle impostazioni, non nel logo.

## 12. Scorciatoie

Ignorale se l’impostazione è spenta, se stai scrivendo in un campo, o se un dialog è aperto.

| Tasto | Azione |
|---|---|
| N | Nuova scheda / nota / offerta, in base alla pagina. In home, focus sulla cattura |
| / | Focus sulla cerca della pagina, altrimenti apre ⌘K |
| ⌘K o Ctrl+K | Palette |
| ⌘B o Ctrl+B | Apri o chiudi il menu |
| ⌘, o Ctrl+, | Impostazioni |

Su touch nascondi i suggerimenti con ⌘.

## 13. Logo

Segno, non una lettera. Quadrato blu con tre colonne crema di altezza diversa: una bacheca.

`viewBox="0 0 32 32"`

- Sfondo: rettangolo `rx="9"`, fill `#0000F2` (o `currentColor`)
- Colonne, fill `#F2EFE6` (o `fill-background`), larghezza 5, `rx="1.6"`, base a y=24:
  - x 6.5, altezza 15.5
  - x 13.5, altezza 10
  - x 20.5, altezza 13

In app le colonne salgono con una molla, in sequenza (0, 60ms, 120ms). Con “Calmo” o `prefers-reduced-motion`, sono già ferme.

Dove sta: favicon, header del menu (32px), kicker della home (20px). Il nome “QUADRO” accanto è Oswald, maiuscolo, tracking largo.

Favicon statica, stessi esagoni, niente animazione. Deve leggersi a 16px: tre barre, niente dettaglio.

## 14. Colori e type

Palette unica. È l’inversione di un sito nero/crema: carta chiara, inchiostro blu elettrico. Non introdurre un secondo accento.

| Token | Hex | Uso |
|---|---|---|
| background | `#F2EFE6` | Carta, barre del logo |
| surface | `#EBE6D8` | Tela dietro il menu |
| card | `#FFFCF4` | Pannelli, menu |
| foreground / primary | `#0000F2` | Testo, pillola attiva, logo |
| muted | `#E8E4D6` | Hover, segmented |
| muted-foreground | `#3C3CE0` | Testo secondario |
| accent | `#E4E0FF` | Hover tenue |
| destructive | `#C43C32` | Scaduto, elimina |
| border | `#C9C6E8` | Filetti |
| todo / doing / done | `#0000F2` / `#2A2AF0` / `#4D4DF5` | Barre statistiche |

Raggi: 6, 10, 16, 22, 24. Il menu flottante usa `rounded-3xl`. Pulsanti icona: `rounded-full` o `rounded-2xl`, minimo 40px, meglio 44 su touch.

Ombre: filetto blu al 7% + ombra corta. Hover: ombra più larga, stesso blu.

Tela (`.app-stage`): surface + due radiali, uno blu molto basso in basso a destra, uno crema in alto a sinistra. Niente blob decorativi.

## 15. Movimento

Fatto in casa, sullo stile di questi gesti (non copiare i componenti alla lettera):

- **Scramble:** le etichette del menu, all’apertura, passano da glifi casuali al testo. Durata ~480–720ms. Un `sr-only` con il testo vero, il glifo è `aria-hidden`.
- **Titoli:** due righe che salgono (`word-rise`). Hover: inversione crema/blu.
- **Pillola attiva:** `layoutId` condiviso, molla. Testo che passa a crema.
- **Bloom:** il bottone “Nuova” si apre a iride, le voci escono dal centro con ritardo radiale.
- **Action swap:** il CTA che conferma (“Aggiunta”, “Salvato”, “Copia scaricata”) cambia etichetta con blur o cascade, poi torna.
- **Checkbox:** il segno si disegna. Press a molla. Stato indeterminato.
- **Tooltip:** entra con blur e molla, delay ~80–120ms. Lato giusto (destra sulla rail, sotto in header mobile).
- **Stack scadenze:** da mucchio a lista.
- **Upload:** righe che entrano a scaglioni, barra, successo, retry, rimozione.
- **Pagina:** blur 8px + 12px di y, 320ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Ridotto:** `prefers-reduced-motion` oppure impostazione Calmo. Niente scramble, niente blur, transizioni a 0–120ms.

Molle usate:

- Press: stiffness 500, damping 30, mass 0.6
- Layout: stiffness 360, damping 32, mass 0.6

## 16. Dati

Tutto in `localStorage`, formato Zustand `{ state, version }`.

| Chiave | Versione | Cosa |
|---|---|---|
| `quadro-spaces-v1` | 1 | `{ spaces: Space[] }` |
| `bacheca-v1` | 4 | `{ boards: Record<spaceId, Board> }` |
| `bacheca-notes-v1` | 3 | `{ notebooks: Record<spaceId, Note[]> }` |
| `bacheca-sales-v1` | 2 | `{ pipelines: Record<spaceId, Pipeline> }` |
| `quadro-settings-v1` | 1 | impostazioni, senza funzioni |
| `quadro-cal-view` | — | ultima vista calendario, se salvata a parte |

Id: `crypto.randomUUID()`, fallback `card_<random>_<time>`.

**Space:** `{ id, type: "board"|"sales"|"notes", title, createdAt }`  
**Card:** `{ id, title, description, priority, dueDate|null, createdAt }`  
**Board:** `{ cards: Record<id,Card>, columns: { todo, doing, done: id[] } }`  
**Deal:** `{ id, title, client, value, notes, createdAt }`  
**Pipeline:** `{ deals, stages: { lead, offer, won } }`  
**Note:** `{ id, title, body, attachments[], createdAt, updatedAt }`  
**Attachment:** `{ id, name, size, type, progress, status }` — mai il blob.

Export JSON:

```json
{
  "version": 1,
  "app": "quadro",
  "exportedAt": "ISO",
  "spaces": [],
  "boards": {},
  "notebooks": {},
  "pipelines": {},
  "settings": {}
}
```

Import: rifiuta se `app` o `version` non tornano. Non eseguire HTML. Non c’è ancora uno schema stretto né un tetto di peso: un file enorme può bloccare la pagina. È il buco di sicurezza vero. Il resto (XSS) non c’è perché i testi passano da React, non da `innerHTML`.

## 17. Ordine per rifarlo

1. Shell e token. Menu flottante prima delle pagine.
2. Store spazi + tre store (board, sales, notes) con seed e `ensure*`.
3. Home con numeri e cattura.
4. Bacheca: colonne, drag, dialog, chip data.
5. Vendite, poi note.
6. Calendario sulle date delle schede.
7. Kit, filtri, bloom, selezione, stack scadenze.
8. Palette ⌘K con coda di creazione.
9. Impostazioni che cambiano il comportamento, non solo l’aspetto.
10. Logo e favicon.
11. Export / import / reset.
12. Passata mobile a 390px: niente scroll orizzontale, tap ≥ 44px dove si può, CTA su una riga.

## 18. Buchi da non rifare per sbaglio

- ⌘K apre lo spazio, non la scheda.
- “Chiedi prima di eliminare” è rispettato in bacheca; note e vendite hanno il loro dialog.
- Cattura in home: sempre la prima bacheca, senza scelta.
- Calendario cieco su offerte e note.
- Allegati: solo metadati.
- Niente undo.
- Spazi non si riordinano.
- Import senza schema né limite di dimensione.

## 19. Cosa non aggiungere

Account, sync, assegnazioni, commenti, colonne personalizzate, ricorrenti, notifiche push, AI dentro l’app, un secondo colore. Quadro sta in piedi perché è uno studio piccolo e chiaro.
