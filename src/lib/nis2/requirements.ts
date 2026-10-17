// Misure di sicurezza di base e incidenti significativi di base per i soggetti NIS
// essenziali e importanti. Fonte: file ACN "Modalità e specifiche di base" (D.Lgs. 138/2024),
// riportati senza modifiche: funzione, categoria, codice, descrizione della misura,
// punto e testo del requisito, ambito delle politiche. Generato dai file Excel forniti.

export type Nis2Function = "GV" | "ID" | "PR" | "DE" | "RS" | "RC";
export type Nis2Profile = "essenziale" | "importante";

export interface Nis2Requirement {
  /** Codice della misura + punto, es. "GV.OC-04_1" */
  id: string;
  fn: Nis2Function;
  cat: string;
  code: string;
  point: number;
  /** Descrizione della misura (sottocategoria del Framework nazionale) */
  measure: string;
  /** Testo del requisito */
  text: string;
  /** Ambito delle politiche di sicurezza (lettera), se indicato */
  policy: string | null;
}

export interface Nis2Incident { id: string; code: string; text: string }

export interface Nis2Set { requirements: Nis2Requirement[]; incidents: Nis2Incident[] }

export const NIS2_FUNCTIONS: Nis2Function[] = ["GV", "ID", "PR", "DE", "RS", "RC"];

const ESSENZIALI: Nis2Set = { requirements: [
 {
  "id": "GV.OC-04_1",
  "fn": "GV",
  "cat": "GV.OC",
  "code": "GV.OC-04",
  "point": 1,
  "measure": "Gli obiettivi, le capacità e i servizi critici dai quali gli stakeholder dipendono o che si aspettano dall'organizzazione sono compresi e comunicati.",
  "text": "È mantenuto un elenco aggiornato dei sistemi informativi e di rete rilevanti.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "GV.RM-03_1",
  "fn": "GV",
  "cat": "GV.RM",
  "code": "GV.RM-03",
  "point": 1,
  "measure": "Le attività e gli esiti della gestione del rischio di cybersecurity sono parte integrante dei processi di gestione del rischio dell'organizzazione.",
  "text": "Nell'ambito dei processi di gestione del rischio del soggetto NIS e nel rispetto delle politiche di cui alla misura GV.PO-01, è definito, attuato, aggiornato e documentato un piano di gestione dei rischi per la sicurezza informatica per identificare, analizzare, valutare, trattare e monitorare i rischi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "GV.RR-02_1",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 1,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "È definita, approvata dagli organi di amministrazione e direttivi, e resa nota alle articolazioni competenti del soggetto NIS, l'organizzazione per la sicurezza informatica e ne sono stabiliti ruoli e responsabilità.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-02_2",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 2,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "È mantenuto un elenco aggiornato del personale dell'organizzazione di cui al punto 1 avente specifici ruoli e responsabilità ed è reso noto alle articolazioni competenti del soggetto NIS.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-02_3",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 3,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "All’interno dell’organizzazione per la sicurezza informatica di cui al punto 1, sono inclusi il punto di contatto e il suo sostituto, il referente CSIRT e gli eventuali suoi sostituti, di cui alla determinazione adottata ai sensi dell’articolo 7, comma 6 del decreto NIS.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-02_4",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 4,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "I ruoli e le responsabilità di cui al punto 1 sono riesaminati e, se opportuno, aggiornati periodicamente e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi, variazioni organizzative o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-04_1",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 1,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, il personale autorizzato ad accedervi è individuato previa valutazione dell’esperienza, capacità e affidabilità e deve fornire idonea garanzia del pieno rispetto della normativa in materia di sicurezza informatica.",
  "policy": "c) Affidabilità delle risorse umane"
 },
 {
  "id": "GV.RR-04_2",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 2,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Gli amministratori di sistema dei sistemi informativi e di rete sono individuati previa valutazione dell’esperienza, capacità e affidabilità e devono fornire idonea garanzia del pieno rispetto della normativa in materia di sicurezza informatica.",
  "policy": "c) Affidabilità delle risorse umane"
 },
 {
  "id": "GV.RR-04_3",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 3,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "GV.RR-04_4",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 4,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "In accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, sono definiti a livello contrattuale gli eventuali obblighi, in materia di sicurezza informatica, che rimangono validi dopo la cessazione o la modifica del rapporto di lavoro dei dipendenti del soggetto NIS (ad esempio prevedendo clausole in materia di riservatezza).",
  "policy": "c) Affidabilità delle risorse umane"
 },
 {
  "id": "GV.RR-04_5",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 5,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 4.",
  "policy": null
 },
 {
  "id": "GV.PO-01_1",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-01",
  "point": 1,
  "measure": "La politica per la gestione del rischio di cybersecurity è stabilita in base al contesto organizzativo, alla strategia di cybersecurity e alle priorità, ed è comunicata e applicata.",
  "text": "Sono adottate e documentate politiche di sicurezza informatica per almeno i seguenti ambiti: a) gestione del rischio; b) ruoli e responsabilità; c) affidabilità delle risorse umane; d) conformità e audit di sicurezza; e) gestione dei rischi per la sicurezza informatica della catena di approvvigionamento; f) gestione degli asset; g) gestione delle vulnerabilità; h) continuità operativa, ripristino in caso di disastro e gestione delle crisi informatiche; i) gestione dell'autenticazione, delle identità digitali e del controllo accessi; j) sicurezza fisica; k) formazione del personale e consapevolezza; l) sicurezza dei dati; m) sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete; n) protezione delle reti e delle comunicazioni; o) monitoraggio degli eventi di sicurezza; p) risposta agli incidenti e ripristino.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-01_2",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-01",
  "point": 2,
  "measure": "La politica per la gestione del rischio di cybersecurity è stabilita in base al contesto organizzativo, alla strategia di cybersecurity e alle priorità, ed è comunicata e applicata.",
  "text": "Per gli ambiti di cui al punto 1 sono incluse almeno le politiche in relazione ai requisiti indicati nella tabella 1 in Appendice al presente allegato.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-01_3",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-01",
  "point": 3,
  "measure": "La politica per la gestione del rischio di cybersecurity è stabilita in base al contesto organizzativo, alla strategia di cybersecurity e alle priorità, ed è comunicata e applicata.",
  "text": "Le politiche di cui al punto 1 sono approvate dagli organi di amministrazione e direttivi e rese note alle articolazioni competenti del soggetto NIS tenuto anche conto della necessità di conoscere (need to know).",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-02_1",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-02",
  "point": 1,
  "measure": "La politica per la gestione del rischio di cybersecurity è revisionata, aggiornata, comunicata e applicata per riflettere i cambiamenti nei requisiti, nelle minacce, nella tecnologia e nella missione dell'organizzazione.",
  "text": "Le politiche di cui alla misura GV.PO-01 sono riesaminate e, se opportuno, aggiornate periodicamente e comunque almeno con cadenza annuale, nonché qualora si verifichino evoluzioni del contesto normativo in materia di sicurezza informatica, incidenti significativi, variazioni organizzative o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-02_2",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-02",
  "point": 2,
  "measure": "La politica per la gestione del rischio di cybersecurity è revisionata, aggiornata, comunicata e applicata per riflettere i cambiamenti nei requisiti, nelle minacce, nella tecnologia e nella missione dell'organizzazione.",
  "text": "Ai fini del riesame di cui al punto 1, è verificata almeno la conformità delle politiche di cui alla misura GV.PO-01 alla normativa in materia di sicurezza informatica.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-02_3",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-02",
  "point": 3,
  "measure": "La politica per la gestione del rischio di cybersecurity è revisionata, aggiornata, comunicata e applicata per riflettere i cambiamenti nei requisiti, nelle minacce, nella tecnologia e nella missione dell'organizzazione.",
  "text": "È mantenuto un registro aggiornato contenente gli esiti del riesame di cui al punto 1.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.SC-01_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-01",
  "point": 1,
  "measure": "Sono stabiliti e accettati dagli stakeholder dell'organizzazione un programma, una strategia, obiettivi, politiche e processi di gestione del rischio di cybersecurity della catena di approvvigionamento.",
  "text": "In merito all’affidamento di forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete, anche mediante ricorso agli strumenti delle centrali di committenza di cui all’allegato I.1, articolo 1, comma 1, lettera i), del decreto legislativo 31 marzo 2023, n. 36, sono previsti: a) il coinvolgimento dell’organizzazione per la sicurezza informatica di cui alla misura GV.RR-02 nella definizione ed esecuzione dei processi di approvvigionamento a partire dalla fase di identificazione e progettazione della fornitura; b) in accordo agli esiti della valutazione del rischio associato alla fornitura di cui alla misura GV.SC-07, la definizione di requisiti di sicurezza sulla fornitura coerenti con le misure di sicurezza applicate dal soggetto NIS ai sistemi informativi e di rete.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-01_2",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-01",
  "point": 2,
  "measure": "Sono stabiliti e accettati dagli stakeholder dell'organizzazione un programma, una strategia, obiettivi, politiche e processi di gestione del rischio di cybersecurity della catena di approvvigionamento.",
  "text": "Per i requisiti di sicurezza di cui al punto 1, lettera b), sono considerati, ove applicabile, almeno i seguenti ambiti: a) affidabilità dei fornitori, tenendo conto almeno delle loro eventuali vulnerabilità specifiche, della qualità complessiva dei loro prodotti e delle pratiche di sicurezza informatica, specie con riguardo all’oggetto della fornitura, della capacità di garantire l’approvvigionamento, l’assistenza e la manutenzione nel tempo, nonché, ove applicabile, dei risultati delle valutazioni coordinate dei rischi per la sicurezza delle catene di approvvigionamento critiche effettuate dal Gruppo di cooperazione NIS; b) ruoli e responsabilità nell'ambito della fornitura; c) affidabilità delle risorse umane; d) conformità e audit di sicurezza; e) gestione delle vulnerabilità; f) continuità operativa e ripristino in caso di disastro; g) gestione dell'autenticazione, delle identità digitali e del controllo accessi; h) sicurezza fisica; i) formazione del personale e consapevolezza; j) sicurezza dei dati; k) protezione delle reti e delle comunicazioni; l) monitoraggio degli eventi di sicurezza ivi inclusi gli accessi e le attività effettuate; m) gestione e segnalazione degli incidenti; n) sviluppo sicuro del codice e sicurezza fin dalla progettazione e per impostazione predefinita; o) manutenzione ordinaria ed evolutiva ivi inclusi gli aggiornamenti di sicurezza; p) dismissione della fornitura ivi compresa la restituzione e la cancellazione dei dati; q) subappalto, subfornitura o relativi potenziali requisiti di sicurezza lungo la catena di fornitura.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-02_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-02",
  "point": 1,
  "measure": "I ruoli e le responsabilità in materia di cybersecurity per fornitori, clienti e partner sono stabiliti, comunicati e coordinati internamente ed esternamente.",
  "text": "Nell'ambito dell'organizzazione per la sicurezza informatica di cui alla misura GV.RR-02, sono definiti e resi noti alle articolazioni competenti del soggetto NIS gli eventuali ruoli e responsabilità in materia di sicurezza informatica assegnati al personale delle terze parti.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-02_2",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-02",
  "point": 2,
  "measure": "I ruoli e le responsabilità in materia di cybersecurity per fornitori, clienti e partner sono stabiliti, comunicati e coordinati internamente ed esternamente.",
  "text": "Il personale di cui al punto 1 avente specifici ruoli e responsabilità è incluso nell’elenco di cui al punto 2 della misura GV.RR-02.",
  "policy": null
 },
 {
  "id": "GV.SC-04_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-04",
  "point": 1,
  "measure": "I fornitori sono noti e prioritizzati in base alla criticità.",
  "text": "È mantenuto un inventario aggiornato dei fornitori delle forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete, che comprende almeno: a) gli estremi di contatto del referente della fornitura; b) la tipologia di fornitura.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-05_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-05",
  "point": 1,
  "measure": "I requisiti per affrontare i rischi di cybersecurity nella catena di approvvigionamento sono stabiliti, prioritizzati e integrati nei contratti e in altri tipi di accordi con i fornitori e altre terze parti rilevanti.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, i requisiti di sicurezza di cui alla misura GV.SC-01, punto 1, lettera b) sono inseriti nelle richieste di offerta, bandi di gara, contratti, accordi e convenzioni relativi alle forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-07_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-07",
  "point": 1,
  "measure": "I rischi posti da un fornitore, dai suoi prodotti e servizi e da altre terze parti sono compresi, registrati, prioritizzati, valutati, trattati e monitorati nel corso della relazione.",
  "text": "Nell’ambito della valutazione del rischio di cui alla misura ID.RA-05, è valutato e documentato il rischio associato alle forniture. A tal fine, sono valutati almeno: a) il livello di accesso del fornitore ai sistemi informativi e di rete del soggetto NIS; b) l'accesso del fornitore alla proprietà intellettuale e ai dati anche sulla base della loro criticità; c) l'impatto di una grave interruzione della fornitura; d) i tempi e i costi di ripristino in caso di indisponibilità dei servizi; e) i ruoli e le responsabilità del fornitore nel governo dei sistemi informativi e di rete.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-07_2",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-07",
  "point": 2,
  "measure": "I rischi posti da un fornitore, dai suoi prodotti e servizi e da altre terze parti sono compresi, registrati, prioritizzati, valutati, trattati e monitorati nel corso della relazione.",
  "text": "È verificata periodicamente e documentata la conformità delle forniture ai requisiti di cui alla misura GV.SC-05.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "ID.AM-01_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-01",
  "point": 1,
  "measure": "Sono mantenuti gli inventari dell'hardware gestito dall'organizzazione.",
  "text": "È mantenuto un inventario aggiornato degli apparati fisici (hardware) che compongono i sistemi informativi e di rete, ivi inclusi i dispositivi IT, IoT, OT e mobili, approvati da attori interni al soggetto NIS.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.AM-02_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-02",
  "point": 1,
  "measure": "Sono mantenuti gli inventari del software, dei servizi e dei sistemi gestiti dall'organizzazione.",
  "text": "È mantenuto un inventario aggiornato dei servizi, dei sistemi e delle applicazioni software che compongono i sistemi informativi e di rete, ivi incluse le applicazioni commerciali, open-source e custom, anche accessibili tramite API, approvati da attori interni al soggetto NIS.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.AM-03_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-03",
  "point": 1,
  "measure": "Sono mantenute le rappresentazioni delle comunicazioni di rete, dei flussi di dati di rete interni ed esterni, autorizzati dall'organizzazione.",
  "text": "È mantenuto un inventario aggiornato dei flussi di rete tra i sistemi informativi e di rete del soggetto NIS e l’esterno, approvati da attori interni al soggetto NIS.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.AM-04_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-04",
  "point": 1,
  "measure": "Sono mantenuti gli inventari dei servizi erogati dai fornitori.",
  "text": "È mantenuto un inventario aggiornato dei servizi informatici erogati dai fornitori, ivi inclusi i servizi cloud.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.RA-01_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-01",
  "point": 1,
  "measure": "Le vulnerabilità negli asset sono identificate, confermate e registrate.",
  "text": "Le informazioni di cui al punto 1 della misura ID.RA-08 sono utilizzate per identificare eventuali vulnerabilità sui i sistemi informativi e di rete.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-01_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-01",
  "point": 2,
  "measure": "Le vulnerabilità negli asset sono identificate, confermate e registrate.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, in accordo al piano di gestione delle vulnerabilità di cui alla misura ID.RA-08, fatte salve motivate e documentate ragioni normative o tecniche, sono eseguite periodicamente e comunque prima della loro messa in esercizio, attività per l’identificazione delle vulnerabilità che comprendano almeno vulnerability assessment e/o penetration test.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-01_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-01",
  "point": 3,
  "measure": "Le vulnerabilità negli asset sono identificate, confermate e registrate.",
  "text": "Le attività di cui al punto 2 sono documentate tramite apposite relazioni che contengono almeno: a) la descrizione generale delle attività effettuate e gli esiti delle stesse; b) la descrizione delle vulnerabilità rilevate e il relativo livello di impatto sulla sicurezza.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-05_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 1,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "In accordo al piano di gestione dei rischi per la sicurezza informatica di cui alla misura GV.RM-03, è eseguita e documentata la valutazione del rischio posto alla sicurezza dei sistemi informativi e di rete, anche con riferimento alle eventuali dipendenze da fornitori e partner terzi, che comprende almeno: a) l’identificazione del rischio; b) l’analisi del rischio; c) la ponderazione del rischio.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-05_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 2,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "La valutazione del rischio di cui al punto 1 è eseguita a intervalli pianificati e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi, variazioni organizzative o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-05_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 3,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "La valutazione del rischio cui al punto 1 è approvata dagli organi di amministrazione e direttivi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-05_4",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 4,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "La valutazione del rischio di cui al punto 1 è effettuata considerando almeno le minacce interne ed esterne, le vulnerabilità non risolte e gli impatti conseguenti ad eventuali incidenti.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-06_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-06",
  "point": 1,
  "measure": "Le risposte al rischio sono scelte, prioritizzate, pianificate, monitorate e comunicate.",
  "text": "È definito, documentato, eseguito e monitorato un piano di trattamento dei rischi per la sicurezza informatica che comprende almeno: a) le opzioni di trattamento e le misure da attuare in merito al trattamento di ciascun rischio individuato e le relative priorità; b) le articolazioni competenti per l'attuazione delle misure di trattamento dei rischi e le tempistiche per tale attuazione; c) la descrizione e le ragioni che giustificano l'accettazione di eventuali rischi residui al trattamento.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-06_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-06",
  "point": 2,
  "measure": "Le risposte al rischio sono scelte, prioritizzate, pianificate, monitorate e comunicate.",
  "text": "Qualora per motivate e documentate ragioni normative o tecniche non siano attuati i requisiti di cui alla tabella 2 in appendice al presente allegato, sono adottate, ove applicabile, misure di mitigazione compensative e il piano di cui al punto 1 include la descrizione di tali misure e dell’eventuale rischio residuo.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-06_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-06",
  "point": 3,
  "measure": "Le risposte al rischio sono scelte, prioritizzate, pianificate, monitorate e comunicate.",
  "text": "Il piano di cui al punto 1, ivi compresa l’accettazione di eventuali rischi residui, è approvato dagli organi di amministrazione e direttivi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-08_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 1,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Sono monitorati almeno i canali di comunicazione del CSIRT Italia, nonché di eventuali CERT e Information Sharing & Analysis Centre (ISAC) settoriali, al fine di acquisire, analizzare e rispondere alle informazioni sulle vulnerabilità.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 2,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Le vulnerabilità, ivi comprese quelle identificate ai sensi della misura ID.RA-01 , sono prontamente risolte attraverso aggiornamenti di sicurezza o misure di mitigazione, ove disponibili, ovvero accettando e documentando il rischio in accordo al piano di trattamento dei rischi di cui alla misura ID.RA-06 .",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 3,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "È definito, attuato, aggiornato e documentato un piano di gestione delle vulnerabilità che comprende almeno: a) le modalità per l'identificazione delle vulnerabilità di cui alla misura ID.RA-01 e la relativa pianificazione delle attività; b) le modalità per monitorare, ricevere, analizzare e rispondere alle informazioni sulle vulnerabilità; c) le procedure, i ruoli, le responsabilità per lo svolgimento delle attività di cui alle lettere a) e b).",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_4",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 4,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Il piano di cui al punto 3 è approvato dagli organi di amministrazione e direttivi.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_5",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 5,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Ai fini di cui al punto 1, sono monitorati anche i canali dei fornitori del software ritenuto critico.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.IM-01_1",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-01",
  "point": 1,
  "measure": "Sono identificati miglioramenti in esito alle valutazioni.",
  "text": "In accordo agli esiti del riesame di cui al punto 1 della misura GV.PO-02, è definito, attuato, documentato e approvato dagli organi di amministrazioni e direttivi un piano di adeguamento che identifichi gli interventi necessari ad assicurare l’attuazione delle politiche di sicurezza.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "ID.IM-01_2",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-01",
  "point": 2,
  "measure": "Sono identificati miglioramenti in esito alle valutazioni.",
  "text": "Gli organi di amministrazione e direttivi sono informati mediante apposite relazioni periodiche sugli esiti dei piani di cui al punto 1.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "ID.IM-01_3",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-01",
  "point": 3,
  "measure": "Sono identificati miglioramenti in esito alle valutazioni.",
  "text": "È definito, attuato, aggiornato e documentato un piano per la valutazione dell'efficacia delle misure di gestione del rischio per la sicurezza informatica che comprenda l'indicazione delle misure da valutare e i relativi metodi di valutazione.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "ID.IM-01_4",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-01",
  "point": 4,
  "measure": "Sono identificati miglioramenti in esito alle valutazioni.",
  "text": "Gli organi di amministrazione e direttivi sono informati mediante apposite relazioni periodiche sul piano di valutazione dell’efficacia di cui al punto 3.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "ID.IM-04_1",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 1,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti è definito, attuato, aggiornato e documentato un piano di continuità operativa, che comprende almeno: a) le finalità, ivi incluse le esigenze di continuità operativa, e l'ambito di applicazione; b) i ruoli e le responsabilità; c) i contatti principali e i canali di comunicazione (interni ed esterni); d) le condizioni per l'attivazione e la disattivazione del piano; e) le risorse necessarie, ivi compresi i backup e le ridondanze.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_2",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 2,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti è definito, attuato, aggiornato e documentato un piano di ripristino in caso di disastro, che comprende almeno: a) le finalità, ivi incluse le esigenze di ripristino in caso di disastro, e l'ambito di applicazione; b) i ruoli e le responsabilità; c) i contatti principali e i canali di comunicazione (interni ed esterni); d) le condizioni per l'attivazione e la disattivazione del piano; e) le risorse necessarie, ivi compresi i backup e le ridondanze; f) l'ordine di ripristino delle operazioni; g) le procedure di ripristino per operazioni specifiche, compresi gli obiettivi di ripristino.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_3",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 3,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti è definito, attuato, aggiornato e documentato un piano per la gestione delle crisi informatiche che comprende almeno: a) i ruoli e le responsabilità del personale e, se opportuno, dei fornitori, specificando l'assegnazione dei ruoli in situazioni di crisi, comprese le procedure specifiche da seguire; b) le modalità di comunicazione tra i soggetti e le autorità competenti.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_4",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 4,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "I piani di cui ai punti 1, 2 e 3 sono approvati dagli organi di amministrazione e direttivi.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_5",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 5,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "I piani di cui ai punti 1, 2 e 3 sono riesaminati e, se opportuno, aggiornati periodicamente e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "PR.AA-01_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 1,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Tutte le utenze, ivi incluse quelle con privilegi amministrativi e quelle utilizzate per l’accesso remoto, sono censite, approvate da attori interni al soggetto NIS e, fatte salve motivate e documentate ragioni tecniche, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, sono individuali per gli utenti.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-01_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 2,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Le credenziali (ad esempio nome utente e password) relative alle utenze sono robuste e aggiornate in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-01_3",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 3,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono verificate periodicamente le utenze e le relative autorizzazioni, aggiornandole/revocandole in caso di variazioni (ad esempio trasferimento o cessazione di personale).",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-01_4",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 4,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1, 2 e 3.",
  "policy": null
 },
 {
  "id": "PR.AA-03_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-03",
  "point": 1,
  "measure": "Utenti, servizi e hardware sono autenticati",
  "text": "Le modalità di autenticazione delle utenze per accedere ai sistemi informativi e di rete sono commisurate al rischio. A tal fine sono valutati almeno i rischi connessi: a) ai privilegi delle utenze; b) alla criticità dei sistemi informativi e di rete; c) alla tipologia di operazioni che le utenze possono effettuare sui sistemi informativi e di rete.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-03_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-03",
  "point": 2,
  "measure": "Utenti, servizi e hardware sono autenticati",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, sono impiegate soluzioni di autenticazione multifattore.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-03_3",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-03",
  "point": 3,
  "measure": "Utenti, servizi e hardware sono autenticati",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.AA-05_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-05",
  "point": 1,
  "measure": "I permessi, i diritti e le autorizzazioni di accesso sono definiti in una politica, gestiti, applicati e rivisti e incorporano i principi del minimo privilegio e della separazione dei compiti.",
  "text": "I permessi sono assegnati alle utenze in accordo ai principi del minimo privilegio e della separazione delle funzioni, tenuto anche conto della necessità di conoscere (need to know).",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-05_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-05",
  "point": 2,
  "measure": "I permessi, i diritti e le autorizzazioni di accesso sono definiti in una politica, gestiti, applicati e rivisti e incorporano i principi del minimo privilegio e della separazione dei compiti.",
  "text": "È assicurata la completa distinzione tra utenze con e senza privilegi amministrativi degli amministratori di sistema alle quali debbono corrispondere credenziali diverse.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-05_3",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-05",
  "point": 3,
  "measure": "I permessi, i diritti e le autorizzazioni di accesso sono definiti in una politica, gestiti, applicati e rivisti e incorporano i principi del minimo privilegio e della separazione dei compiti.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.AA-06_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-06",
  "point": 1,
  "measure": "L'accesso fisico agli asset è gestito, monitorato e applicato in misura appropriata al rischio.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, l’accesso fisico è protetto.",
  "policy": "j) Sicurezza fisica"
 },
 {
  "id": "PR.AA-06_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-06",
  "point": 2,
  "measure": "L'accesso fisico agli asset è gestito, monitorato e applicato in misura appropriata al rischio.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.AT-01_1",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-01",
  "point": 1,
  "measure": "Il personale è sensibilizzato e formato in modo da possedere le conoscenze e le competenze per svolgere compiti di carattere generale tenendo conto dei rischi di cybersecurity.",
  "text": "È definito, attuato, aggiornato e documentato un piano di formazione in materia di sicurezza informatica del personale, ivi inclusi gli organi di amministrazione e direttivi, che comprende almeno: a) la pianificazione delle attività di formazione previste con l’indicazione dei contenuti della formazione fornita; b) le eventuali modalità di verifica dell'acquisizione dei contenuti.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.AT-01_2",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-01",
  "point": 2,
  "measure": "Il personale è sensibilizzato e formato in modo da possedere le conoscenze e le competenze per svolgere compiti di carattere generale tenendo conto dei rischi di cybersecurity.",
  "text": "Il piano di formazione di cui al punto 1 è approvato dagli organi di amministrazione e direttivi.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.AT-01_3",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-01",
  "point": 3,
  "measure": "Il personale è sensibilizzato e formato in modo da possedere le conoscenze e le competenze per svolgere compiti di carattere generale tenendo conto dei rischi di cybersecurity.",
  "text": "È mantenuto un registro aggiornato recante l'elenco dei dipendenti che hanno ricevuto la formazione di cui al punto 1, i relativi contenuti e l'elenco delle verifiche svolte laddove previste.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.AT-02_1",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-02",
  "point": 1,
  "measure": "Gli individui che ricoprono ruoli specializzati sono sensibilizzati e formati in modo da possedere le conoscenze e le competenze per svolgere i pertinenti compiti tenendo conto dei rischi di cybersecurity.",
  "text": "Il piano di cui alla misura PR.AT-01 prevede una formazione dedicata al personale con ruoli specializzati, ossia che richiedono una serie di capacità e competenze attinenti alla sicurezza, ivi compresi gli amministratori di sistema, che comprende almeno: a) le istruzioni relative alla configurazione e al funzionamento sicuri dei sistemi informativi e di rete; b) le informazioni sulle minacce informatiche note; c) le istruzioni sul comportamento da tenere in caso di eventi rilevanti per la sicurezza.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.AT-02_2",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-02",
  "point": 2,
  "measure": "Gli individui che ricoprono ruoli specializzati sono sensibilizzati e formati in modo da possedere le conoscenze e le competenze per svolgere i pertinenti compiti tenendo conto dei rischi di cybersecurity.",
  "text": "È mantenuto un registro aggiornato recante l'elenco dei dipendenti che hanno ricevuto la formazione di cui al punto 1, i relativi contenuti e l'elenco delle verifiche svolte laddove previste.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.DS-01_1",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-01",
  "point": 1,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati a riposo (data-at-rest) sono protette.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, fatte salve motivate e documentate ragioni normative o tecniche, i dati memorizzati sui dispositivi portatili, ivi inclusi laptop, smartphone e tablet, e sui supporti removibili, sono cifrati con protocolli e algoritmi allo stato dell’arte e considerati sicuri.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-01_2",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-01",
  "point": 2,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati a riposo (data-at-rest) sono protette.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, è disabilitata l'auto esecuzione dei supporti rimovibili ed è effettuata la loro scansione al fine di rilevare codici malevoli prima che siano utilizzati nei sistemi informativi e di rete.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-01_3",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-01",
  "point": 3,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati a riposo (data-at-rest) sono protette.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.DS-02_1",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-02",
  "point": 1,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati in transito (data-in-transit) sono protette.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, ivi inclusi quelli di comunicazione vocale, video e testuale, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, fatte salve motivate e documentate ragioni normative o tecniche, sono utilizzati, per la trasmissione dei dati da e verso l’esterno del soggetto NIS, protocolli e algoritmi di cifratura allo stato dell’arte e considerati sicuri.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-02_2",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-02",
  "point": 2,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati in transito (data-in-transit) sono protette.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.DS-11_1",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 1,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "In accordo alle esigenze di continuità operativa e di ripristino in caso di disastro individuate nei piani di cui alla misura ID.IM-04, sono effettuati periodicamente i backup dei dati e delle configurazioni e, per almeno i sistemi informativi e di rete rilevanti, sono anche conservate copie di backup offline.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-11_2",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 2,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.DS-11_3",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 3,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, è assicurata la riservatezza e l’integrità delle informazioni contenute nei backup mediante adeguata protezione fisica dei supporti ovvero mediante cifratura.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-11_4",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 4,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, è verificata periodicamente l'utilizzabilità dei backup effettuati mediante test di ripristino.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-11_5",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 5,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 3 e 4.",
  "policy": null
 },
 {
  "id": "PR.PS-01_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-01",
  "point": 1,
  "measure": "Sono stabilite e applicate pratiche di gestione della configurazione",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono definite, e documentate in un elenco aggiornato, le loro configurazioni di riferimento sicure (hardened).",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-01_2",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-01",
  "point": 2,
  "measure": "Sono stabilite e applicate pratiche di gestione della configurazione",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.PS-02_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 1,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, è installato esclusivamente software, ivi compresi i sistemi operativi, per il quale è garantita la disponibilità di aggiornamenti di sicurezza.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-02_2",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 2,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, sono installati, senza ingiustificato ritardo, gli ultimi aggiornamenti di sicurezza rilasciati dal produttore in coerenza con il piano di gestione delle vulnerabilità di cui alla misura ID.RA-08.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-02_3",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 3,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1e 2.",
  "policy": null
 },
 {
  "id": "PR.PS-02_4",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 4,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, l’aggiornamento del software ritenuto critico è verificato in ambiente di test prima dell’effettivo impiego in ambiente operativo.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-02_5",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 5,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 4.",
  "policy": null
 },
 {
  "id": "PR.PS-03_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-03",
  "point": 1,
  "measure": "L'hardware è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono adottate e documentate procedure per il trasferimento fisico e la dismissione di dispositivi atti alla memorizzazione di dati in modo sicuro.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-03_2",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-03",
  "point": 2,
  "measure": "L'hardware è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono mantenuti uno o più registri delle manutenzioni effettuate sull'hardware.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 1,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "Tutti gli accessi eseguiti da remoto e quelli effettuati con utenze con privilegi amministrativi sono registrati.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_2",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 2,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono acquisiti e, in modo sicuro e possibilmente centralizzato, conservati almeno i log necessari ai fini del monitoraggio degli eventi di sicurezza, ivi compresi quelli relativi agli accessi di cui al punto 1.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_3",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 3,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "In accordo agli esiti della valutazione rischio di cui alla misura ID.RA-05, sono definite e documentate le tempistiche di conservazione dei log di cui al punto 2.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_4",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 4,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.PS-06_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-06",
  "point": 1,
  "measure": "Le pratiche di sviluppo sicuro del software sono integrate e le loro prestazioni sono monitorate durante l'intero ciclo di vita del software.",
  "text": "Sono adottate e documentate pratiche di sviluppo sicuro del codice nello sviluppo del software.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.IR-01_1",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 1,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono definite e documentate le eventuali attività consentite da remoto e implementate adeguate misure di sicurezza per l’accesso.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.IR-01_2",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 2,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "È mantenuto un elenco aggiornato dei sistemi informativi e di rete ai quali è possibile accedere da remoto con la descrizione delle relative modalità di accesso.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.IR-01_3",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 3,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "Sono presenti, aggiornati, mantenuti e configurati in modo adeguato sistemi perimetrali, quali firewall.",
  "policy": "n) Protezione delle reti e delle comunicazioni."
 },
 {
  "id": "PR.IR-01_4",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 4,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 2 e 3.",
  "policy": null
 },
 {
  "id": "PR.IR-03_1",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-03",
  "point": 1,
  "measure": "Sono implementati meccanismi per soddisfare i requisiti di resilienza in situazioni normali e avverse.",
  "text": "In accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, sono utilizzati sistemi di comunicazione di emergenza protetti .",
  "policy": "n) Protezione delle reti e delle comunicazioni."
 },
 {
  "id": "PR.IR-03_2",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-03",
  "point": 2,
  "measure": "Sono implementati meccanismi per soddisfare i requisiti di resilienza in situazioni normali e avverse.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "DE.CM-01_1",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 1,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono presenti, aggiornati, mantenuti e configurati in modo adeguato strumenti tecnici per rilevare tempestivamente gli incidenti significativi.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_2",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 2,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Sono definiti e documentati i livelli di servizio attesi (SL) dei servizi e delle attività del soggetto NIS anche ai fini di rilevare tempestivamente gli incidenti significativi.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_3",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 3,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "DE.CM-01_4",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 4,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono utilizzati strumenti di analisi e filtraggio sul flusso di traffico in ingresso (ivi inclusa la posta elettronica).",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_5",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 5,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, ai fini di cui al punto 1, sono monitorati gli accessi da remoto, le attività dei sistemi perimetrali (ad esempio router e firewall), gli eventi amministrativi di rilievo, nonché gli accessi eseguiti o falliti alle risorse di rete, ai punti terminali (endpoint) e agli applicativi al fine di rilevare gli eventi di sicurezza informatica.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_6",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 6,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, ai fini di cui al punto 1, sono definiti, monitorati e documentati parametri quali-quantitativi per rilevare gli accessi non autorizzati o con abuso dei privilegi concessi.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_7",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 7,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 4 e 5.",
  "policy": null
 },
 {
  "id": "DE.CM-09_1",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-09",
  "point": 1,
  "measure": "L'hardware e il software di elaborazione, gli ambienti di runtime e i loro dati sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, sono presenti, aggiornati, mantenuti e configurati in modo adeguato, sistemi di protezione dei punti terminali (endpoint) per il rilevamento del codice malevolo.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-09_2",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-09",
  "point": 2,
  "measure": "L'hardware e il software di elaborazione, gli ambienti di runtime e i loro dati sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "RS.MA-01_1",
  "fn": "RS",
  "cat": "RS.MA",
  "code": "RS.MA-01",
  "point": 1,
  "measure": "Il piano di risposta agli incidenti è eseguito in coordinamento con le terze parti interessate una volta dichiarato un incidente.",
  "text": "È definito, attuato, aggiornato e documentato un piano per la gestione degli incidenti di sicurezza informatica e la notifica al CSIRT Italia, in accordo a quanto previsto dall’articolo 25 del decreto NIS, che comprende almeno: a) le fasi e le procedure di gestione e notifica degli incidenti con l’indicazione dei relativi ruoli e delle responsabilità; b) le procedure per la predisposizione e la trasmissione delle relazioni di cui all’articolo 25, comma 5, lettere c), d) ed e) del decreto NIS; c) le informazioni di contatto per la segnalazione degli incidenti; d) le modalità di comunicazione interna, anche con riguardo al coinvolgimento degli organi di amministrazione e direttivi, ed esterna; e) la reportistica da utilizzare per la documentazione dell’incidente.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.MA-01_2",
  "fn": "RS",
  "cat": "RS.MA",
  "code": "RS.MA-01",
  "point": 2,
  "measure": "Il piano di risposta agli incidenti è eseguito in coordinamento con le terze parti interessate una volta dichiarato un incidente.",
  "text": "Il piano di cui al punto 1 è approvato dagli organi di amministrazione e direttivi.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.MA-01_3",
  "fn": "RS",
  "cat": "RS.MA",
  "code": "RS.MA-01",
  "point": 3,
  "measure": "Il piano di risposta agli incidenti è eseguito in coordinamento con le terze parti interessate una volta dichiarato un incidente.",
  "text": "Il piano di cui al punto 1 è riesaminato e, se opportuno, aggiornato periodicamente e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi, integrando le relative lezioni apprese, o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.CO-02_1",
  "fn": "RS",
  "cat": "RS.CO",
  "code": "RS.CO-02",
  "point": 1,
  "measure": "Gli stakeholder interni ed esterni sono informati degli incidenti.",
  "text": "In accordo al piano per la gestione degli incidenti di cui alla misura RS.MA-01, sono documentate e adottate procedure per comunicare senza ingiustificato ritardo, se ritenuto opportuno e qualora possibile, sentito il CSIRT Italia, ovvero qualora intimato dall’Agenzia per la cybersicurezza nazionale ai sensi dell’articolo 37, comma 3, lettere g) e h), del decreto NIS: a) ai destinatari dei propri servizi, gli incidenti significativi che possono ripercuotersi negativamente sulla fornitura di tali servizi; b) ai destinatari dei propri servizi che sono potenzialmente interessati da una minaccia informatica significativa, le misure o azioni correttive o di mitigazione che tali destinatari possono adottare in risposta a tale minaccia e la natura di tale minaccia.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.CO-02_2",
  "fn": "RS",
  "cat": "RS.CO",
  "code": "RS.CO-02",
  "point": 2,
  "measure": "Gli stakeholder interni ed esterni sono informati degli incidenti.",
  "text": "Sono documentate e adottate procedure per informare il pubblico sugli incidenti occorsi, qualora intimato dall’Agenzia per la cybersicurezza nazionale ai sensi dell’art. 37, comma 3, lettera i) del decreto NIS.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RC.RP-01_1",
  "fn": "RC",
  "cat": "RC.RP",
  "code": "RC.RP-01",
  "point": 1,
  "measure": "La parte del piano di risposta agli incidenti relativa al rispristino viene eseguita una volta avviata dal processo di risposta agli incidenti.",
  "text": "Nell'ambito del piano per la gestione degli incidenti di cui alla misura RS.MA-01, sono adottate e documentate procedure per il ripristino con riguardo almeno al ripristino del normale funzionamento dei sistemi informativi e di rete coinvolti da incidenti di sicurezza informatica, ivi compresi quelli di cui all’articolo 25 del decreto NIS.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RC.CO-03_1",
  "fn": "RC",
  "cat": "RC.CO",
  "code": "RC.CO-03",
  "point": 1,
  "measure": "Le attività di ripristino e i progressi nel ripristino delle capacità operative sono comunicati agli stakeholder interni ed esterni designati.",
  "text": "Sono adottate e documentate procedure per comunicare alle parti interne interessate, ivi incluse le articolazioni competenti del soggetto NIS, le attività di ripristino a seguito di un incidente.",
  "policy": "p) Risposta agli incidenti e ripristino"
 }
], incidents: [
 {
  "id": "IS-1",
  "code": "IS-1",
  "text": "Il soggetto NIS ha evidenza della perdita di riservatezza, verso l’esterno, di dati digitali di sua proprietà o sui quali esercita il controllo, anche parziale."
 },
 {
  "id": "IS-2",
  "code": "IS-2",
  "text": "Il soggetto NIS ha evidenza della perdita di integrità, con impatto verso l’esterno, di dati di sua proprietà o sui quali esercita il controllo, anche parziale."
 },
 {
  "id": "IS-3",
  "code": "IS-3",
  "text": "Il soggetto NIS ha evidenza della violazione dei livelli di servizio attesi dei suoi servizi e/o delle sue attività, sulla base dei livelli di servizio atteso (SL) definiti ai sensi della misura DE.CM-01."
 },
 {
  "id": "IS-4",
  "code": "IS-4",
  "text": "Il soggetto NIS ha evidenza, anche sulla base dei parametri quali-quantitativi definiti ai sensi della misura DE.CM-01, dell’accesso, non autorizzato o con abuso dei privilegi concessi, a dati digitali di sua proprietà o sui quali esercita il controllo, anche parziale."
 }
] };

const IMPORTANTI: Nis2Set = { requirements: [
 {
  "id": "GV.OC-04_1",
  "fn": "GV",
  "cat": "GV.OC",
  "code": "GV.OC-04",
  "point": 1,
  "measure": "Gli obiettivi, le capacità e i servizi critici dai quali gli stakeholder dipendono o che si aspettano dall'organizzazione sono compresi e comunicati.",
  "text": "È mantenuto un elenco aggiornato dei sistemi informativi e di rete rilevanti.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "GV.RM-03_1",
  "fn": "GV",
  "cat": "GV.RM",
  "code": "GV.RM-03",
  "point": 1,
  "measure": "Le attività e gli esiti della gestione del rischio di cybersecurity sono parte integrante dei processi di gestione del rischio dell'organizzazione.",
  "text": "Nell'ambito dei processi di gestione del rischio del soggetto NIS e nel rispetto delle politiche di cui alla misura GV.PO-01, è definito, attuato, aggiornato e documentato un piano di gestione dei rischi per la sicurezza informatica per identificare, analizzare, valutare, trattare e monitorare i rischi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "GV.RR-02_1",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 1,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "È definita, approvata dagli organi di amministrazione e direttivi, e resa nota alle articolazioni competenti del soggetto NIS, l'organizzazione per la sicurezza informatica e ne sono stabiliti ruoli e responsabilità.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-02_2",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 2,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "È mantenuto un elenco aggiornato del personale dell'organizzazione di cui al punto 1 avente specifici ruoli e responsabilità ed è reso noto alle articolazioni competenti del soggetto NIS.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-02_3",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 3,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "All’interno dell’organizzazione per la sicurezza informatica di cui al punto 1, sono inclusi il punto di contatto e il suo sostituto, il referente CSIRT e gli eventuali suoi sostituti, di cui alla determinazione adottata ai sensi dell’articolo 7, comma 6 del decreto NIS.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-02_4",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-02",
  "point": 4,
  "measure": "I ruoli, le responsabilità e le autorità relative alla gestione del rischio di cybersecurity sono stabiliti, comunicati, compresi e applicati.",
  "text": "I ruoli e le responsabilità di cui al punto 1 sono riesaminati e, se opportuno, aggiornati periodicamente e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi, variazioni organizzative o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "b) Ruoli e responsabilità"
 },
 {
  "id": "GV.RR-04_1",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 1,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, il personale autorizzato ad accedervi è individuato previa valutazione dell’esperienza, capacità e affidabilità e deve fornire idonea garanzia del pieno rispetto della normativa in materia di sicurezza informatica.",
  "policy": "c) Affidabilità delle risorse umane"
 },
 {
  "id": "GV.RR-04_2",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 2,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Gli amministratori di sistema dei sistemi informativi e di rete sono individuati previa valutazione dell’esperienza, capacità e affidabilità e devono fornire idonea garanzia del pieno rispetto della normativa in materia di sicurezza informatica.",
  "policy": "c) Affidabilità delle risorse umane"
 },
 {
  "id": "GV.RR-04_3",
  "fn": "GV",
  "cat": "GV.RR",
  "code": "GV.RR-04",
  "point": 3,
  "measure": "La cybersecurity è inclusa nelle pratiche delle risorse umane.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "GV.PO-01_1",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-01",
  "point": 1,
  "measure": "La politica per la gestione del rischio di cybersecurity è stabilita in base al contesto organizzativo, alla strategia di cybersecurity e alle priorità, ed è comunicata e applicata.",
  "text": "Sono adottate e documentate politiche di sicurezza informatica per almeno i seguenti ambiti: a) gestione del rischio; b) ruoli e responsabilità; c) affidabilità delle risorse umane; d) conformità e audit di sicurezza; e) gestione dei rischi per la sicurezza informatica della catena di approvvigionamento; f) gestione degli asset; g) gestione delle vulnerabilità; h) continuità operativa, ripristino in caso di disastro e gestione delle crisi informatiche; i) gestione dell'autenticazione, delle identità digitali e del controllo accessi; j) sicurezza fisica; k) formazione del personale e consapevolezza; l) sicurezza dei dati; m) sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete; n) protezione delle reti e delle comunicazioni; o) monitoraggio degli eventi di sicurezza; p) risposta agli incidenti e ripristino.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-01_2",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-01",
  "point": 2,
  "measure": "La politica per la gestione del rischio di cybersecurity è stabilita in base al contesto organizzativo, alla strategia di cybersecurity e alle priorità, ed è comunicata e applicata.",
  "text": "Per gli ambiti di cui al punto 1 sono incluse almeno le politiche in relazione ai requisiti indicati nella tabella 1 in Appendice al presente allegato.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-01_3",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-01",
  "point": 3,
  "measure": "La politica per la gestione del rischio di cybersecurity è stabilita in base al contesto organizzativo, alla strategia di cybersecurity e alle priorità, ed è comunicata e applicata.",
  "text": "Le politiche di cui al punto 1 sono approvate dagli organi di amministrazione e direttivi e rese note alle articolazioni competenti del soggetto NIS tenuto anche conto della necessità di conoscere (need to know).",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-02_1",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-02",
  "point": 1,
  "measure": "La politica per la gestione del rischio di cybersecurity è revisionata, aggiornata, comunicata e applicata per riflettere i cambiamenti nei requisiti, nelle minacce, nella tecnologia e nella missione dell'organizzazione.",
  "text": "Le politiche di cui alla misura GV.PO-01 sono riesaminate e, se opportuno, aggiornate periodicamente e comunque almeno con cadenza annuale, nonché qualora si verifichino evoluzioni del contesto normativo in materia di sicurezza informatica, incidenti significativi, variazioni organizzative o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.PO-02_2",
  "fn": "GV",
  "cat": "GV.PO",
  "code": "GV.PO-02",
  "point": 2,
  "measure": "La politica per la gestione del rischio di cybersecurity è revisionata, aggiornata, comunicata e applicata per riflettere i cambiamenti nei requisiti, nelle minacce, nella tecnologia e nella missione dell'organizzazione.",
  "text": "Ai fini del riesame di cui al punto 1, è verificata almeno la conformità delle politiche di cui alla misura GV.PO-01 alla normativa in materia di sicurezza informatica.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "GV.SC-01_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-01",
  "point": 1,
  "measure": "Sono stabiliti e accettati dagli stakeholder dell'organizzazione un programma, una strategia, obiettivi, politiche e processi di gestione del rischio di cybersecurity della catena di approvvigionamento.",
  "text": "In merito all’affidamento di forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete, anche mediante ricorso agli strumenti delle centrali di committenza di cui all’allegato I.1, articolo 1, comma 1, lettera i), del decreto legislativo 31 marzo 2023, n. 36, sono previsti: a) il coinvolgimento dell’organizzazione per la sicurezza informatica di cui alla misura GV.RR-02 nella definizione ed esecuzione dei processi di approvvigionamento a partire dalla fase di identificazione e progettazione della fornitura; b) in accordo agli esiti della valutazione del rischio associato alla fornitura di cui alla misura GV.SC-07, la definizione di requisiti di sicurezza sulla fornitura coerenti con le misure di sicurezza applicate dal soggetto NIS ai sistemi informativi e di rete.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-02_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-02",
  "point": 1,
  "measure": "I ruoli e le responsabilità in materia di cybersecurity per fornitori, clienti e partner sono stabiliti, comunicati e coordinati internamente ed esternamente.",
  "text": "Nell'ambito dell'organizzazione per la sicurezza informatica di cui alla misura GV.RR-02, sono definiti e resi noti alle articolazioni competenti del soggetto NIS gli eventuali ruoli e responsabilità in materia di sicurezza informatica assegnati al personale delle terze parti.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-02_2",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-02",
  "point": 2,
  "measure": "I ruoli e le responsabilità in materia di cybersecurity per fornitori, clienti e partner sono stabiliti, comunicati e coordinati internamente ed esternamente.",
  "text": "Il personale di cui al punto 1 avente specifici ruoli e responsabilità è incluso nell’elenco di cui al punto 2 della misura GV.RR-02.",
  "policy": null
 },
 {
  "id": "GV.SC-04_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-04",
  "point": 1,
  "measure": "I fornitori sono noti e prioritizzati in base alla criticità.",
  "text": "È mantenuto un inventario aggiornato dei fornitori delle forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete, che comprende almeno: a) gli estremi di contatto del referente della fornitura; b) la tipologia di fornitura.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-05_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-05",
  "point": 1,
  "measure": "I requisiti per affrontare i rischi di cybersecurity nella catena di approvvigionamento sono stabiliti, prioritizzati e integrati nei contratti e in altri tipi di accordi con i fornitori e altre terze parti rilevanti.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, i requisiti di sicurezza di cui alla misura GV.SC-01, punto 1, lettera b) sono inseriti nelle richieste di offerta, bandi di gara, contratti, accordi e convenzioni relativi alle forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-07_1",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-07",
  "point": 1,
  "measure": "I rischi posti da un fornitore, dai suoi prodotti e servizi e da altre terze parti sono compresi, registrati, prioritizzati, valutati, trattati e monitorati nel corso della relazione.",
  "text": "Nell’ambito della valutazione del rischio di cui alla misura ID.RA-05, è valutato e documentato il rischio associato alle forniture. A tal fine, sono valutati almeno: a) il livello di accesso del fornitore ai sistemi informativi e di rete del soggetto NIS; b) l'accesso del fornitore alla proprietà intellettuale e ai dati anche sulla base della loro criticità; c) l'impatto di una grave interruzione della fornitura; d) i tempi e i costi di ripristino in caso di indisponibilità dei servizi; e) i ruoli e le responsabilità del fornitore nel governo dei sistemi informativi e di rete.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "GV.SC-07_2",
  "fn": "GV",
  "cat": "GV.SC",
  "code": "GV.SC-07",
  "point": 2,
  "measure": "I rischi posti da un fornitore, dai suoi prodotti e servizi e da altre terze parti sono compresi, registrati, prioritizzati, valutati, trattati e monitorati nel corso della relazione.",
  "text": "È verificata periodicamente e documentata la conformità delle forniture ai requisiti di cui alla misura GV.SC-05.",
  "policy": "e) Gestione dei rischi per la sicurezza informatica della catena di approvvigionamento"
 },
 {
  "id": "ID.AM-01_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-01",
  "point": 1,
  "measure": "Sono mantenuti gli inventari dell'hardware gestito dall'organizzazione.",
  "text": "È mantenuto un inventario aggiornato degli apparati fisici (hardware) che compongono i sistemi informativi e di rete, ivi inclusi i dispositivi IT, IoT, OT e mobili, approvati da attori interni al soggetto NIS.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.AM-02_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-02",
  "point": 1,
  "measure": "Sono mantenuti gli inventari del software, dei servizi e dei sistemi gestiti dall'organizzazione.",
  "text": "È mantenuto un inventario aggiornato dei servizi, dei sistemi e delle applicazioni software che compongono i sistemi informativi e di rete, ivi incluse le applicazioni commerciali, open-source e custom, anche accessibili tramite API, approvati da attori interni al soggetto NIS.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.AM-04_1",
  "fn": "ID",
  "cat": "ID.AM",
  "code": "ID.AM-04",
  "point": 1,
  "measure": "Sono mantenuti gli inventari dei servizi erogati dai fornitori.",
  "text": "È mantenuto un inventario aggiornato dei servizi informatici erogati dai fornitori, ivi inclusi i servizi cloud.",
  "policy": "f) Gestione degli asset"
 },
 {
  "id": "ID.RA-01_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-01",
  "point": 1,
  "measure": "Le vulnerabilità negli asset sono identificate, confermate e registrate.",
  "text": "Le informazioni di cui al punto 1 della misura ID.RA-08 sono utilizzate per identificare eventuali vulnerabilità sui i sistemi informativi e di rete.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-05_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 1,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "In accordo al piano di gestione dei rischi per la sicurezza informatica di cui alla misura GV.RM-03, è eseguita e documentata la valutazione del rischio posto alla sicurezza dei sistemi informativi e di rete, anche con riferimento alle eventuali dipendenze da fornitori e partner terzi, che comprende almeno: a) l’identificazione del rischio; b) l’analisi del rischio; c) la ponderazione del rischio.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-05_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 2,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "La valutazione del rischio di cui al punto 1 è eseguita a intervalli pianificati e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi, variazioni organizzative o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-05_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-05",
  "point": 3,
  "measure": "Minacce, vulnerabilità, probabilità e impatti sono utilizzati per comprendere il rischio inerente e per informare la prioritizzazione della risposta al rischio.",
  "text": "La valutazione del rischio cui al punto 1 è approvata dagli organi di amministrazione e direttivi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-06_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-06",
  "point": 1,
  "measure": "Le risposte al rischio sono scelte, prioritizzate, pianificate, monitorate e comunicate.",
  "text": "È definito, documentato, eseguito e monitorato un piano di trattamento dei rischi per la sicurezza informatica che comprende almeno: a) le opzioni di trattamento e le misure da attuare in merito al trattamento di ciascun rischio individuato e le relative priorità; b) le articolazioni competenti per l'attuazione delle misure di trattamento dei rischi e le tempistiche per tale attuazione; c) la descrizione e le ragioni che giustificano l'accettazione di eventuali rischi residui al trattamento.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-06_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-06",
  "point": 2,
  "measure": "Le risposte al rischio sono scelte, prioritizzate, pianificate, monitorate e comunicate.",
  "text": "Qualora per motivate e documentate ragioni normative o tecniche non siano attuati i requisiti di cui alla tabella 2 in appendice al presente allegato, sono adottate, ove applicabile, misure di mitigazione compensative e il piano di cui al punto 1 include la descrizione di tali misure e dell’eventuale rischio residuo.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-06_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-06",
  "point": 3,
  "measure": "Le risposte al rischio sono scelte, prioritizzate, pianificate, monitorate e comunicate.",
  "text": "Il piano di cui al punto 1, ivi compresa l’accettazione di eventuali rischi residui, è approvato dagli organi di amministrazione e direttivi.",
  "policy": "a) Gestione del rischio"
 },
 {
  "id": "ID.RA-08_1",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 1,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Sono monitorati almeno i canali di comunicazione del CSIRT Italia, nonché di eventuali CERT e Information Sharing & Analysis Centre (ISAC) settoriali, al fine di acquisire, analizzare e rispondere alle informazioni sulle vulnerabilità.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_2",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 2,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Le vulnerabilità, ivi comprese quelle identificate ai sensi della misura ID.RA-01 , sono prontamente risolte attraverso aggiornamenti di sicurezza o misure di mitigazione, ove disponibili, ovvero accettando e documentando il rischio in accordo al piano di trattamento dei rischi di cui alla misura ID.RA-06 .",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_3",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 3,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "È definito, attuato, aggiornato e documentato un piano di gestione delle vulnerabilità che comprende almeno: a) le modalità per l'identificazione delle vulnerabilità di cui alla misura ID.RA-01 e la relativa pianificazione delle attività; b) le modalità per monitorare, ricevere, analizzare e rispondere alle informazioni sulle vulnerabilità; c) le procedure, i ruoli, le responsabilità per lo svolgimento delle attività di cui alle lettere a) e b).",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.RA-08_4",
  "fn": "ID",
  "cat": "ID.RA",
  "code": "ID.RA-08",
  "point": 4,
  "measure": "Sono stabiliti processi per la ricezione, l'analisi e la risposta alle divulgazioni di vulnerabilità.",
  "text": "Il piano di cui al punto 3 è approvato dagli organi di amministrazione e direttivi.",
  "policy": "g) Gestione delle vulnerabilità"
 },
 {
  "id": "ID.IM-01_1",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-01",
  "point": 1,
  "measure": "Sono identificati miglioramenti in esito alle valutazioni.",
  "text": "In accordo agli esiti del riesame di cui al punto 1 della misura GV.PO-02, è definito, attuato, documentato e approvato dagli organi di amministrazioni e direttivi un piano di adeguamento che identifichi gli interventi necessari ad assicurare l’attuazione delle politiche di sicurezza.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "ID.IM-01_2",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-01",
  "point": 2,
  "measure": "Sono identificati miglioramenti in esito alle valutazioni.",
  "text": "Gli organi di amministrazione e direttivi sono informati mediante apposite relazioni periodiche sugli esiti dei piani di cui al punto 1.",
  "policy": "d) Conformità e audit di sicurezza"
 },
 {
  "id": "ID.IM-04_1",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 1,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti è definito, attuato, aggiornato e documentato un piano di continuità operativa, che comprende almeno: a) le finalità, ivi incluse le esigenze di continuità operativa, e l'ambito di applicazione; b) i ruoli e le responsabilità; c) i contatti principali e i canali di comunicazione (interni ed esterni); d) le condizioni per l'attivazione e la disattivazione del piano; e) le risorse necessarie, ivi compresi i backup e le ridondanze.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_2",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 2,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti è definito, attuato, aggiornato e documentato un piano di ripristino in caso di disastro, che comprende almeno: a) le finalità, ivi incluse le esigenze di ripristino in caso di disastro, e l'ambito di applicazione; b) i ruoli e le responsabilità; c) i contatti principali e i canali di comunicazione (interni ed esterni); d) le condizioni per l'attivazione e la disattivazione del piano; e) le risorse necessarie, ivi compresi i backup e le ridondanze; f) l'ordine di ripristino delle operazioni; g) le procedure di ripristino per operazioni specifiche, compresi gli obiettivi di ripristino.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_3",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 3,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti è definito, attuato, aggiornato e documentato un piano per la gestione delle crisi informatiche che comprende almeno: a) i ruoli e le responsabilità del personale e, se opportuno, dei fornitori, specificando l'assegnazione dei ruoli in situazioni di crisi, comprese le procedure specifiche da seguire; b) le modalità di comunicazione tra i soggetti e le autorità competenti.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_4",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 4,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "I piani di cui ai punti 1, 2 e 3 sono approvati dagli organi di amministrazione e direttivi.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "ID.IM-04_5",
  "fn": "ID",
  "cat": "ID.IM",
  "code": "ID.IM-04",
  "point": 5,
  "measure": "I piani di risposta agli incidenti e gli altri piani di cybersecurity che impattano le operazioni sono stabiliti, comunicati, mantenuti e migliorati.",
  "text": "I piani di cui ai punti 1, 2 e 3 sono riesaminati e, se opportuno, aggiornati periodicamente e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "h) Continuità operativa, ripristino in caso di disastro e gestione delle crisi"
 },
 {
  "id": "PR.AA-01_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 1,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Tutte le utenze, ivi incluse quelle con privilegi amministrativi e quelle utilizzate per l’accesso remoto, sono censite, approvate da attori interni al soggetto NIS e, fatte salve motivate e documentate ragioni tecniche, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, sono individuali per gli utenti.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-01_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 2,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Le credenziali (ad esempio nome utente e password) relative alle utenze sono robuste e aggiornate in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-01_3",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 3,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono verificate periodicamente le utenze e le relative autorizzazioni, aggiornandole/revocandole in caso di variazioni (ad esempio trasferimento o cessazione di personale).",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-01_4",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-01",
  "point": 4,
  "measure": "Le identità e le credenziali degli utenti, dei servizi e dell'hardware autorizzati sono gestite dall'organizzazione.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1, 2 e 3.",
  "policy": null
 },
 {
  "id": "PR.AA-03_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-03",
  "point": 1,
  "measure": "Utenti, servizi e hardware sono autenticati",
  "text": "Le modalità di autenticazione delle utenze per accedere ai sistemi informativi e di rete sono commisurate al rischio. A tal fine sono valutati almeno i rischi connessi: a) ai privilegi delle utenze; b) alla criticità dei sistemi informativi e di rete; c) alla tipologia di operazioni che le utenze possono effettuare sui sistemi informativi e di rete.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-03_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-03",
  "point": 2,
  "measure": "Utenti, servizi e hardware sono autenticati",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, sono impiegate soluzioni di autenticazione multifattore.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-03_3",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-03",
  "point": 3,
  "measure": "Utenti, servizi e hardware sono autenticati",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.AA-05_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-05",
  "point": 1,
  "measure": "I permessi, i diritti e le autorizzazioni di accesso sono definiti in una politica, gestiti, applicati e rivisti e incorporano i principi del minimo privilegio e della separazione dei compiti.",
  "text": "I permessi sono assegnati alle utenze in accordo ai principi del minimo privilegio e della separazione delle funzioni, tenuto anche conto della necessità di conoscere (need to know).",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-05_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-05",
  "point": 2,
  "measure": "I permessi, i diritti e le autorizzazioni di accesso sono definiti in una politica, gestiti, applicati e rivisti e incorporano i principi del minimo privilegio e della separazione dei compiti.",
  "text": "È assicurata la completa distinzione tra utenze con e senza privilegi amministrativi degli amministratori di sistema alle quali debbono corrispondere credenziali diverse.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.AA-05_3",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-05",
  "point": 3,
  "measure": "I permessi, i diritti e le autorizzazioni di accesso sono definiti in una politica, gestiti, applicati e rivisti e incorporano i principi del minimo privilegio e della separazione dei compiti.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.AA-06_1",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-06",
  "point": 1,
  "measure": "L'accesso fisico agli asset è gestito, monitorato e applicato in misura appropriata al rischio.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, l’accesso fisico è protetto.",
  "policy": "j) Sicurezza fisica"
 },
 {
  "id": "PR.AA-06_2",
  "fn": "PR",
  "cat": "PR.AA",
  "code": "PR.AA-06",
  "point": 2,
  "measure": "L'accesso fisico agli asset è gestito, monitorato e applicato in misura appropriata al rischio.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.AT-01_1",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-01",
  "point": 1,
  "measure": "Il personale è sensibilizzato e formato in modo da possedere le conoscenze e le competenze per svolgere compiti di carattere generale tenendo conto dei rischi di cybersecurity.",
  "text": "È definito, attuato, aggiornato e documentato un piano di formazione in materia di sicurezza informatica del personale, ivi inclusi gli organi di amministrazione e direttivi, che comprende almeno: a) la pianificazione delle attività di formazione previste con l’indicazione dei contenuti della formazione fornita; b) le eventuali modalità di verifica dell'acquisizione dei contenuti.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.AT-01_2",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-01",
  "point": 2,
  "measure": "Il personale è sensibilizzato e formato in modo da possedere le conoscenze e le competenze per svolgere compiti di carattere generale tenendo conto dei rischi di cybersecurity.",
  "text": "Il piano di formazione di cui al punto 1 è approvato dagli organi di amministrazione e direttivi.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.AT-01_3",
  "fn": "PR",
  "cat": "PR.AT",
  "code": "PR.AT-01",
  "point": 3,
  "measure": "Il personale è sensibilizzato e formato in modo da possedere le conoscenze e le competenze per svolgere compiti di carattere generale tenendo conto dei rischi di cybersecurity.",
  "text": "È mantenuto un registro aggiornato recante l'elenco dei dipendenti che hanno ricevuto la formazione di cui al punto 1, i relativi contenuti e l'elenco delle verifiche svolte laddove previste.",
  "policy": "k) Formazione del personale e consapevolezza"
 },
 {
  "id": "PR.DS-01_1",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-01",
  "point": 1,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati a riposo (data-at-rest) sono protette.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, fatte salve motivate e documentate ragioni normative o tecniche, i dati memorizzati sui dispositivi portatili, ivi inclusi laptop, smartphone e tablet, e sui supporti removibili, sono cifrati con protocolli e algoritmi allo stato dell’arte e considerati sicuri.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-01_2",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-01",
  "point": 2,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati a riposo (data-at-rest) sono protette.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, è disabilitata l'auto esecuzione dei supporti rimovibili ed è effettuata la loro scansione al fine di rilevare codici malevoli prima che siano utilizzati nei sistemi informativi e di rete.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-01_3",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-01",
  "point": 3,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati a riposo (data-at-rest) sono protette.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.DS-02_1",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-02",
  "point": 1,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati in transito (data-in-transit) sono protette.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, ivi inclusi quelli di comunicazione vocale, video e testuale, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, fatte salve motivate e documentate ragioni normative o tecniche, sono utilizzati, per la trasmissione dei dati da e verso l’esterno del soggetto NIS, protocolli e algoritmi di cifratura allo stato dell’arte e considerati sicuri.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-02_2",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-02",
  "point": 2,
  "measure": "La riservatezza, l'integrità e la disponibilità dei dati in transito (data-in-transit) sono protette.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.DS-11_1",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 1,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "In accordo alle esigenze di continuità operativa e di ripristino in caso di disastro individuate nei piani di cui alla misura ID.IM-04, sono effettuati periodicamente i backup dei dati e delle configurazioni e, per almeno i sistemi informativi e di rete rilevanti, sono anche conservate copie di backup offline.",
  "policy": "l) Sicurezza dei dati"
 },
 {
  "id": "PR.DS-11_2",
  "fn": "PR",
  "cat": "PR.DS",
  "code": "PR.DS-11",
  "point": 2,
  "measure": "I backup dei dati sono creati, protetti, mantenuti e verificati.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "PR.PS-02_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 1,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05, è installato esclusivamente software, ivi compresi i sistemi operativi, per il quale è garantita la disponibilità di aggiornamenti di sicurezza.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-02_2",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 2,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, sono installati, senza ingiustificato ritardo, gli ultimi aggiornamenti di sicurezza rilasciati dal produttore in coerenza con il piano di gestione delle vulnerabilità di cui alla misura ID.RA-08.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-02_3",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-02",
  "point": 3,
  "measure": "Il software è mantenuto, sostituito e rimosso in base al rischio.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1e 2.",
  "policy": null
 },
 {
  "id": "PR.PS-04_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 1,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "Tutti gli accessi eseguiti da remoto e quelli effettuati con utenze con privilegi amministrativi sono registrati.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_2",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 2,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono acquisiti e, in modo sicuro e possibilmente centralizzato, conservati almeno i log necessari ai fini del monitoraggio degli eventi di sicurezza, ivi compresi quelli relativi agli accessi di cui al punto 1.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_3",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 3,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "In accordo agli esiti della valutazione rischio di cui alla misura ID.RA-05, sono definite e documentate le tempistiche di conservazione dei log di cui al punto 2.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.PS-04_4",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-04",
  "point": 4,
  "measure": "I registri di log sono generati e resi disponibili per il monitoraggio continuo.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 1 e 2.",
  "policy": null
 },
 {
  "id": "PR.PS-06_1",
  "fn": "PR",
  "cat": "PR.PS",
  "code": "PR.PS-06",
  "point": 1,
  "measure": "Le pratiche di sviluppo sicuro del software sono integrate e le loro prestazioni sono monitorate durante l'intero ciclo di vita del software.",
  "text": "Sono adottate e documentate pratiche di sviluppo sicuro del codice nello sviluppo del software.",
  "policy": "m) Sviluppo, configurazione, manutenzione e dismissione dei sistemi informativi e di rete"
 },
 {
  "id": "PR.IR-01_1",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 1,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono definite e documentate le eventuali attività consentite da remoto e implementate adeguate misure di sicurezza per l’accesso.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.IR-01_2",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 2,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "È mantenuto un elenco aggiornato dei sistemi informativi e di rete ai quali è possibile accedere da remoto con la descrizione delle relative modalità di accesso.",
  "policy": "i) Gestione dell'autenticazione, delle identità digitali e del controllo accessi"
 },
 {
  "id": "PR.IR-01_3",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 3,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "Sono presenti, aggiornati, mantenuti e configurati in modo adeguato sistemi perimetrali, quali firewall.",
  "policy": "n) Protezione delle reti e delle comunicazioni."
 },
 {
  "id": "PR.IR-01_4",
  "fn": "PR",
  "cat": "PR.IR",
  "code": "PR.IR-01",
  "point": 4,
  "measure": "Le reti e gli ambienti sono protetti dall'accesso logico e dall'uso non autorizzati.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione ai punti 2 e 3.",
  "policy": null
 },
 {
  "id": "DE.CM-01_1",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 1,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Per almeno i sistemi informativi e di rete rilevanti, sono presenti, aggiornati, mantenuti e configurati in modo adeguato strumenti tecnici per rilevare tempestivamente gli incidenti significativi.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_2",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 2,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Sono definiti e documentati i livelli di servizio attesi (SL) dei servizi e delle attività del soggetto NIS anche ai fini di rilevare tempestivamente gli incidenti significativi.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-01_3",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-01",
  "point": 3,
  "measure": "Le reti e i servizi di rete sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "DE.CM-09_1",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-09",
  "point": 1,
  "measure": "L'hardware e il software di elaborazione, gli ambienti di runtime e i loro dati sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Fatte salve motivate e documentate ragioni normative o tecniche, sono presenti, aggiornati, mantenuti e configurati in modo adeguato, sistemi di protezione dei punti terminali (endpoint) per il rilevamento del codice malevolo.",
  "policy": "o) Monitoraggio degli eventi di sicurezza."
 },
 {
  "id": "DE.CM-09_2",
  "fn": "DE",
  "cat": "DE.CM",
  "code": "DE.CM-09",
  "point": 2,
  "measure": "L'hardware e il software di elaborazione, gli ambienti di runtime e i loro dati sono monitorati per individuare eventi potenzialmente avversi.",
  "text": "Nel rispetto delle politiche di cui alla misura GV.PO-01, sono adottate e documentate le procedure in relazione al punto 1.",
  "policy": null
 },
 {
  "id": "RS.MA-01_1",
  "fn": "RS",
  "cat": "RS.MA",
  "code": "RS.MA-01",
  "point": 1,
  "measure": "Il piano di risposta agli incidenti è eseguito in coordinamento con le terze parti interessate una volta dichiarato un incidente.",
  "text": "È definito, attuato, aggiornato e documentato un piano per la gestione degli incidenti di sicurezza informatica e la notifica al CSIRT Italia, in accordo a quanto previsto dall’articolo 25 del decreto NIS, che comprende almeno: a) le fasi e le procedure di gestione e notifica degli incidenti con l’indicazione dei relativi ruoli e delle responsabilità; b) le procedure per la predisposizione e la trasmissione delle relazioni di cui all’articolo 25, comma 5, lettere c), d) ed e) del decreto NIS; c) le informazioni di contatto per la segnalazione degli incidenti; d) le modalità di comunicazione interna, anche con riguardo al coinvolgimento degli organi di amministrazione e direttivi, ed esterna; e) la reportistica da utilizzare per la documentazione dell’incidente.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.MA-01_2",
  "fn": "RS",
  "cat": "RS.MA",
  "code": "RS.MA-01",
  "point": 2,
  "measure": "Il piano di risposta agli incidenti è eseguito in coordinamento con le terze parti interessate una volta dichiarato un incidente.",
  "text": "Il piano di cui al punto 1 è approvato dagli organi di amministrazione e direttivi.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.MA-01_3",
  "fn": "RS",
  "cat": "RS.MA",
  "code": "RS.MA-01",
  "point": 3,
  "measure": "Il piano di risposta agli incidenti è eseguito in coordinamento con le terze parti interessate una volta dichiarato un incidente.",
  "text": "Il piano di cui al punto 1 è riesaminato e, se opportuno, aggiornato periodicamente e comunque almeno ogni due anni, nonché qualora si verifichino incidenti significativi, integrando le relative lezioni apprese, o mutamenti dell’esposizione alle minacce e ai relativi rischi.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.CO-02_1",
  "fn": "RS",
  "cat": "RS.CO",
  "code": "RS.CO-02",
  "point": 1,
  "measure": "Gli stakeholder interni ed esterni sono informati degli incidenti.",
  "text": "In accordo al piano per la gestione degli incidenti di cui alla misura RS.MA-01, sono documentate e adottate procedure per comunicare senza ingiustificato ritardo, se ritenuto opportuno e qualora possibile, sentito il CSIRT Italia, ovvero qualora intimato dall’Agenzia per la cybersicurezza nazionale ai sensi dell’articolo 37, comma 3, lettere g) e h), del decreto NIS: a) ai destinatari dei propri servizi, gli incidenti significativi che possono ripercuotersi negativamente sulla fornitura di tali servizi; b) ai destinatari dei propri servizi che sono potenzialmente interessati da una minaccia informatica significativa, le misure o azioni correttive o di mitigazione che tali destinatari possono adottare in risposta a tale minaccia e la natura di tale minaccia.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RS.CO-02_2",
  "fn": "RS",
  "cat": "RS.CO",
  "code": "RS.CO-02",
  "point": 2,
  "measure": "Gli stakeholder interni ed esterni sono informati degli incidenti.",
  "text": "Sono documentate e adottate procedure per informare il pubblico sugli incidenti occorsi, qualora intimato dall’Agenzia per la cybersicurezza nazionale ai sensi dell’art. 37, comma 3, lettera i) del decreto NIS.",
  "policy": "p) Risposta agli incidenti e ripristino"
 },
 {
  "id": "RC.RP-01_1",
  "fn": "RC",
  "cat": "RC.RP",
  "code": "RC.RP-01",
  "point": 1,
  "measure": "La parte del piano di risposta agli incidenti relativa al rispristino viene eseguita una volta avviata dal processo di risposta agli incidenti.",
  "text": "Nell'ambito del piano per la gestione degli incidenti di cui alla misura RS.MA-01, sono adottate e documentate procedure per il ripristino con riguardo almeno al ripristino del normale funzionamento dei sistemi informativi e di rete coinvolti da incidenti di sicurezza informatica, ivi compresi quelli di cui all’articolo 25 del decreto NIS.",
  "policy": "p) Risposta agli incidenti e ripristino"
 }
], incidents: [
 {
  "id": "IS-1",
  "code": "IS-1",
  "text": "Il soggetto NIS ha evidenza della perdita di riservatezza, verso l’esterno, di dati digitali di sua proprietà o sui quali esercita il controllo, anche parziale."
 },
 {
  "id": "IS-2",
  "code": "IS-2",
  "text": "Il soggetto NIS ha evidenza della perdita di integrità, con impatto verso l’esterno, di dati digitali di sua proprietà o sui quali esercita il controllo, anche parziale."
 },
 {
  "id": "IS-3",
  "code": "IS-3",
  "text": "Il soggetto NIS ha evidenza della violazione dei livelli di servizio attesi dei suoi servizi e/o delle sue attività, sulla base dei livelli di servizio atteso (SL) definiti ai sensi della misura DE.CM-01."
 }
] };

export const NIS2_SETS: Record<Nis2Profile, Nis2Set> = { essenziale: ESSENZIALI, importante: IMPORTANTI };

export function findNis2Item(profile: Nis2Profile, id: string): { kind: "req"; item: Nis2Requirement } | { kind: "inc"; item: Nis2Incident } | null {
  const set = NIS2_SETS[profile];
  const r = set.requirements.find((x) => x.id === id);
  if (r) return { kind: "req", item: r };
  const i = set.incidents.find((x) => x.id === id);
  return i ? { kind: "inc", item: i } : null;
}
