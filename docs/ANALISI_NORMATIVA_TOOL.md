# Analisi normativa dei tool — AI Act e ISO/IEC 42001

Per ogni tool: cosa chiede la norma, cosa faceva il tool, cosa è stato corretto o semplificato e cosa resta da fare.

Fonti:
- **AI Act**: Regolamento (UE) 2024/1689, come modificato dal Regolamento (UE) 2026/1744 ("Omnibus digitale sull'IA"). Le date sono quelle usate dal motore degli obblighi (`src/lib/obligations/engine.ts`).
- **ISO/IEC 42001:2023**: sono indicati solo i numeri e i titoli brevi delle clausole e dei controlli dell'Allegato A. Il testo della norma non è riprodotto. L'abbinamento tra articolo e clausola è interpretativo: la norma non attua il regolamento.

Criterio di semplificazione: ogni tool fa una sola cosa, quella che chiede un articolo preciso. Non chiede dati già presenti nell'inventario o nel profilo azienda. Non mostra dati o dichiarazioni che l'utente non ha fornito.

---

## Passi 1-4 — Inventario, Ruolo, Rischio, Obblighi

| | |
|---|---|
| **Norma** | Art. 3 (definizioni di ruolo), Art. 25 (quando un deployer diventa fornitore), Art. 5, 6, 50, 51, Art. 113 (date). ISO 42001: 4.3 campo di applicazione, 6.1.2 valutazione del rischio, A.6.2.2 requisiti. |
| **Stato** | Già allineato nei PR precedenti. Il motore è l'unica fonte per ruolo, rischio e obblighi, e gli altri tool ora lo leggono. |
| **Corretto ora** | L'onboarding separato chiedeva un ruolo "globale" e non salvava nulla. È stato ritirato e reindirizza all'inventario: il ruolo vale per singolo sistema (Art. 3). Il link "cambia ruolo" nella barra in alto ora porta all'inventario. |

## Documentazione tecnica (DocuGen)

| | |
|---|---|
| **Norma** | Art. 11 e Allegato IV, punti 1-9. Art. 18 (conservazione per 10 anni). ISO 42001: 7.5 informazioni documentate, A.6.2.3 documentazione di progettazione e sviluppo, A.6.2.7 documentazione tecnica. |
| **Prima** | Le 9 sezioni non seguivano l'Allegato IV: ad esempio la logica e le specifiche erano separate, e il punto 8 non era la dichiarazione UE. I testi d'esempio sembravano contenuti veri. Una sezione con dati di un altro tool risultava "completata". |
| **Corretto** | Le sezioni s1-s9 ora corrispondono ai punti 1-9 dell'Allegato IV. I testi già scritti vengono spostati automaticamente nel punto giusto, senza perdere nulla. I dati presi dagli altri tool diventano solo "bozza". Il fornitore non viene più inventato. Esportazione: "Esporta PDF" (non "firmato"). |

## Obblighi del deployer (Art. 26)

| | |
|---|---|
| **Norma** | Art. 26: (1) uso conforme alle istruzioni; (2) sorveglianza umana; (4) dati di input; (5) monitoraggio, sospensione e incidenti; (6) log per almeno 6 mesi; (7) lavoratori; (8) autorità pubbliche e registrazione (Art. 49(3)); (10) identificazione biometrica remota a posteriori, con autorizzazione entro 48 ore; (11) informare le persone soggette alle decisioni; (12) cooperazione. FRIA: Art. 27. ISO 42001: A.9.2-A.9.4 uso responsabile, A.10.2 ripartizione delle responsabilità. |
| **Prima** | Gli 11 obblighi e i 10 riquadri di dettaglio citavano paragrafi sbagliati. Ad esempio i log erano indicati come 26(3), la FRIA come 26(8) e la registrazione come 26(10). Il nome dell'organizzazione era fisso ("Organizzazione"). |
| **Corretto** | L'elenco degli obblighi, i riquadri `Art26_*.tsx`, le etichette e il prompt AI ora seguono i paragrafi effettivi. Il nome dell'organizzazione viene dal profilo azienda. |
| **Da fare** | Supervisori, stato FRIA e periodo di conservazione dei log vengono ancora chiesti qui: andrebbero letti dai tool Sorveglianza, FRIA e Registro dei log. |

## Registro dei log (LogVault)

| | |
|---|---|
| **Norma** | Art. 12 (registrazione automatica degli eventi), Art. 19 e 26(6) (conservazione per almeno 6 mesi). ISO 42001: A.6.2.8 registrazione degli eventi. |
| **Prima** | Un pulsante "Kill Switch — Art. 14" fermava solo un'animazione: non fermava nessun sistema. Nel dossier la conservazione risultava sempre di 180 giorni. |
| **Corretto** | Il pulsante finto è stato rimosso: l'arresto è un requisito dell'Art. 14(4)(e) e si documenta nel tool Sorveglianza. Il dossier riporta il periodo indicato dall'utente (0 se non indicato). La descrizione del tool non parla più di "firma crittografica". |

## Registro delle evidenze

| | |
|---|---|
| **Norma** | Strumento di supporto, senza un articolo proprio. Serve come prova per gli Art. 9, 12, 17 e 72. ISO 42001: 7.5.3 controllo delle informazioni documentate. |
| **Prima** | Con il registro vuoto, la pagina inseriva da sola 3 record finti (admin@azienda.it, RandomForest, accuratezza 0.94). Si presentava come "archivio immutabile crittografico", ma la verifica controllava solo il collegamento tra un record e l'altro e la "firma" era una semplice stringa. |
| **Corretto** | Niente più record finti. Quelli già presenti vengono eliminati e la catena viene ricollegata. La descrizione ora è onesta: impronta a catena, conservazione nel browser, esportare per l'audit. |

## Trust Passport e Trust Center

| | |
|---|---|
| **Norma** | Strumento volontario, senza obbligo AI Act. Riguarda Art. 13 e 50 per le informazioni al pubblico. ISO 42001: A.8.2 e A.8.5 informazioni alle parti interessate. |
| **Prima** | La voce "Art. 5 — nessuna pratica vietata" era sempre vera. La voce "Art. 50" leggeva il tool dell'Art. 13. Senza dati il passaporto mostrava punteggi di 50, 75 e 60. Il PDF era descritto come "PDF/A-3 firmabile". Il nome predefinito dell'azienda era "La mia azienda". Il Trust Center prendeva le informative Art. 50 dall'autoconformità della piattaforma. |
| **Corretto** | La voce Art. 5 è vera solo se il sistema è stato valutato e non risultano pratiche vietate. La voce Art. 50 legge il kit Art. 50. Senza dati compare "non valutato" con punteggio 0. Il pulsante dice "Scarica PDF". Il nome viene dal profilo azienda. Il Trust Center legge le misure Art. 50 del cliente. Il punteggio dei rischi si basa sul rischio residuo accettabile. |

## Valutazione della conformità e dichiarazione UE

| | |
|---|---|
| **Norma** | Art. 43: (1) biometria dell'Allegato III, punto 1: Allegato VI solo con norme armonizzate applicate integralmente, altrimenti Allegato VII con organismo notificato; (2) punti 2-8: controllo interno (Allegato VI); (3) Allegato I: procedura di settore. Art. 47 e Allegato V (contenuto della dichiarazione, punti 1-8). Art. 48 (marcatura CE). ISO 42001: 9.2 audit interno, A.6.2.4 verifica e convalida. |
| **Prima** | I punti 6 e 7 (attività di contrasto, migrazione) venivano mandati all'organismo notificato, che invece non è richiesto. La dichiarazione diceva sempre "Art. 43.2 / Allegato VI" e non seguiva l'Allegato V. Ad esempio mancava la frase sul GDPR. |
| **Corretto** | Il percorso viene calcolato dal sistema valutato nell'inventario, secondo l'Art. 43(1), (2) e (3). Una pratica vietata non ha percorso. La dichiarazione segue i punti 1-8 dell'Allegato V e indica la procedura effettiva. La ragione sociale viene dal profilo azienda. |
| **Da fare** | La verifica controlla ancora solo che gli altri tool abbiano salvato qualcosa, non il contenuto. |

## Monitoraggio post-commercializzazione e incidenti gravi

| | |
|---|---|
| **Norma** | Art. 72 (sistema e piano di monitoraggio; il piano fa parte dell'Allegato IV). Art. 73: (2) 15 giorni; (3) 2 giorni per infrazione diffusa o infrastrutture critiche; (4) 10 giorni in caso di decesso; (5) segnalazione iniziale incompleta ammessa. ISO 42001: 9.1 monitoraggio, 10.2 non conformità, A.8.4 comunicazione degli incidenti. |
| **Prima** | Il decesso dava 2 giorni nel classificatore e 15 nella procedura guidata. L'autorità predefinita era AgID. Il testo "Art. 72(4) il fornitore riferisce all'autorità" era sbagliato. Il report AI riceveva "nessun dato" ma doveva comunque trovare anomalie. |
| **Corretto** | È stato aggiunto il termine di 10 giorni per il decesso (Art. 73(4)), usato in tutte le viste. L'autorità parte da "Da determinare", con ACN (vigilanza del mercato) e AgID (autorità di notifica) come opzioni (L. 132/2025). I testi sono corretti sull'Art. 72(2)-(3). Senza dati l'AI non inventa anomalie. Il modulo segnala anche la possibilità della segnalazione iniziale incompleta (Art. 73(5)). |

## Banca dati UE (EUDB)

| | |
|---|---|
| **Norma** | Art. 49: (1) fornitore di sistema ad alto rischio dell'Allegato III, escluso il punto 2; (2) fornitore che invoca la deroga dell'Art. 6(3); (3) deployer che è autorità pubblica; (4) sezione non pubblica per i punti 1, 6 e 7; (5) il punto 2 si registra a livello nazionale. Allegato VIII. I modelli GPAI non si registrano nella banca dati UE. |
| **Prima** | La domanda 4 ("GPAI sistemico") rendeva obbligatoria la registrazione, che invece non esiste per i GPAI. La precompilazione leggeva chiavi inesistenti (rappresentante, conformità, DocuGen). Le semplici copie di dati erano etichettate "✦ AI". |
| **Corretto** | La domanda 4 è diventata "deroga dell'Art. 6(3)" (Art. 49(2)). Le domande 1-4 sono precompilate dal sistema valutato e i testi spiegano i casi dei punti 1, 6, 7 e 2. Le chiavi sono corrette. Le copie sono etichettate "precompilato". |

## Rappresentante autorizzato

| | |
|---|---|
| **Norma** | Art. 22: (1) mandato scritto; (3)(a)-(e) compiti; (4) cessazione del mandato con informazione all'autorità. ISO 42001: A.10.2 ripartizione delle responsabilità. |
| **Prima** | Il mandato numerava i compiti (a)-(f) in modo diverso dall'Art. 22(3) e includeva compiti che la norma non prevede. La firma del mandato non si poteva indicare. Niente veniva scritto nel registro delle evidenze. |
| **Corretto** | Il testo del mandato riprende le lettere (a)-(e) dell'Art. 22(3) e l'Art. 22(4). La clausola extra è indicata come contrattuale. La firma risulta dalla voce "firma" della checklist. Il salvataggio scrive nel registro delle evidenze. |

## Sistema di gestione della qualità (QMS)

| | |
|---|---|
| **Norma** | Art. 17(1)(a)-(m). ISO 42001: è il sistema di gestione nel suo insieme, clausole 4-10, in particolare 5.3 ruoli, 9.3 riesame della direzione e 7.5. |
| **Prima** | Nel dossier finivano "Trimestrale" e "AI Compliance Officer" anche se l'utente non li aveva scritti. La bozza AI sovrascriveva il testo senza chiedere. |
| **Corretto** | Il dossier contiene solo dati dell'utente: il responsabile viene dalla sezione Art. 17(1)(m). Prima di sovrascrivere una sezione con la bozza AI viene chiesta conferma. |

## Registro dei rischi

| | |
|---|---|
| **Norma** | Art. 9(1)-(10). ISO 42001: 6.1.2 valutazione del rischio, 6.1.3 trattamento del rischio, 8.2-8.3. Guida di riferimento: ISO/IEC 23894. |
| **Prima** | Al termine della modalità guidata il dossier riceveva `risks: []`. Il messaggio iniziale parlava di 8 fasi, ma sono 11. |
| **Corretto** | I rischi raccolti nella fase 2 arrivano al dossier, con probabilità, impatto, mitigazione e rischio residuo. Il numero di fasi è calcolato. |
| **Da fare** | Nome, ruolo e categoria di rischio vengono ancora chiesti nella chat: andrebbero precompilati dall'inventario. |

## Qualità dei dati (Data Audit)

| | |
|---|---|
| **Norma** | Art. 10(2)-(5). ISO 42001: A.7.2-A.7.6 (dati per lo sviluppo, acquisizione, qualità, provenienza, preparazione). |
| **Corretto** | Il dossier e la documentazione tecnica usavano due formule diverse per la qualità dei dati. Ora c'è un solo calcolo. |

## Sorveglianza umana

| | |
|---|---|
| **Norma** | Art. 14(3)-(5): l'Art. 14(5) richiede la verifica di due persone solo per l'identificazione biometrica remota. ISO 42001: A.9.2, A.6.2.6. |
| **Corretto** | Il prompt AI aveva testo troncato ed è stato ripulito. La verifica a due persone ora riguarda solo l'identificazione biometrica remota, non la categorizzazione. Il dossier riporta i ruoli indicati dall'utente invece di un elenco vuoto. |

## Avvisi e marcature IA (Art. 50)

| | |
|---|---|
| **Norma** | Art. 50(1)-(4). Si applica dal 2 agosto 2026; la marcatura dell'Art. 50(2) per i sistemi già sul mercato si applica dal 2 dicembre 2026. Sanzione: Art. 99(4), fino a 15 milioni di euro o al 3%. ISO 42001: A.8.2, A.8.5. |
| **Prima** | Il registro esportato dichiarava sempre installati banner, meta tag e JSON-LD. Una scheda "Autoconformità RegulaeOS" (13 voci sulla piattaforma stessa) confondeva i clienti. Il piè di pagina indicava "1% (Art. 99(3))". |
| **Corretto** | Il registro elenca solo le misure registrate per il sistema. La scheda di autoconformità è stata rimossa. La finalità prevista viene passata all'AI. Il piè di pagina riporta le date e la sanzione corrette. |

## Sanzioni, legge italiana e quadro AgID/ACN

| | |
|---|---|
| **Norma** | Art. 99(3)-(7): per le PMI e le start-up si applica l'importo più basso (Art. 99(6)). L. 23 settembre 2025, n. 132 (G.U. n. 223 del 25/9/2025), in vigore dal 10 ottobre 2025. |
| **Corretto** | "PMI: riduzione automatica del 50%" è diventato Art. 99(6). La data di entrata in vigore della L. 132 è corretta, e così "L. 132/2024" → 2025. È stata tolta la frase "sanzioni fino al 3% del fatturato nazionale". La tutela dei minori non viene più dichiarata conforme senza essere stata valutata. Il gap sul deepfake cita l'art. 612-quater c.p. |
| **Da verificare (avvocato)** | Le affermazioni penali nella pagina AgID/ACN e nel tool L. 132, per esempio sui minori e "fino a 7 anni", non sono state modificate. Vanno confrontate con il testo della legge. |

## Altri tool

| | |
|---|---|
| **NIST AI RMF** | I riferimenti erano "Art. 62" e "Art. 61"; ora sono Art. 73 (incidenti) e Art. 72 (monitoraggio). |
| **Questionario clienti** | Le domande 3 e 4 citavano come fonte "Drift Detection", ma leggevano il registro dei rischi: la fonte è corretta. La risposta PA 17 non afferma più la spiegabilità: ora è una bozza da verificare. |
| **Scadenze** | Il pulsante AI non mostrava nulla; ora apre il pannello di priorità. |
| **Assistente legale** | Al posto di "789 chunk" (dato statico) ora c'è l'avviso che si parla con un sistema di IA (Art. 50(1)). |
| **Monitoraggio drift** | Ogni interrogazione registrava un nuovo log. Ora la stessa deriva viene registrata una sola volta all'ora. |
| **Alfabetizzazione (Art. 4)** | Corretto. ISO 42001: 7.2 competenza, 7.3 consapevolezza. |
| **DPIA / FRIA** | Struttura in tre parti (guida, chat, documento) già fatta nel PR #38. FRIA: Art. 27, ISO 42001 A.5.2-A.5.5. |

---

## Semplificazioni proposte (passi successivi)

1. **Il deployer legge, non chiede.** Supervisori (dalla Sorveglianza), FRIA, conservazione dei log ed EUDB andrebbero letti dai rispettivi tool. Ogni riquadro Art. 26 diventerebbe un semplice stato con un link.
2. **La conformità controlla il contenuto.** Per ogni requisito, un controllo minimo sul contenuto. Esempio: Allegato IV punto 2 compilato e registro dei rischi con almeno un rischio trattato.
3. **Un solo registro di prove.** Registro delle evidenze, firma e dossier vanno unificati, con l'esportazione come unica "prova" per l'audit.
4. **Tre tool clienti in uno.** Trust Passport, Trust Center e Questionario leggono gli stessi dati: possono diventare un'unica pagina con tre schede.
5. **Registro dei rischi precompilato.** Nome, ruolo e categoria vengono dall'inventario; la chat parte direttamente dall'identificazione dei rischi.
