// ─── Blog post data ───────────────────────────────────────────────────────────
// Aggiungi nuovi post in cima all'array. Il primo elemento appare in evidenza.

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;           // formato: "2 giugno 2026"
  dateISO: string;        // formato ISO per schema.org
  readTime: string;       // es. "8 min"
  category: string;       // es. "Compliance", "Normativa", "Guide"
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  content: string;        // HTML puro — usato in dangerouslySetInnerHTML
  faqSchema: { q: string; a: string }[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "sistema-ai-alto-rischio-annex-iii-obblighi",
    title: "Cos'è un sistema AI ad alto rischio: la guida pratica all'Annex III",
    excerpt:
      "Il tuo gestionale HR filtra i CV con un algoritmo? Il tuo sistema assegna score di credito? Probabilmente hai un sistema ad alto rischio. Ecco gli 8 settori, le esenzioni Art. 6(3) e i 7 obblighi che devi soddisfare entro dicembre 2027.",
    date: "3 giugno 2026",
    dateISO: "2026-06-03",
    readTime: "9 min",
    category: "Guide",
    tags: ["AI Act", "alto rischio", "Annex III", "Art. 6", "compliance", "obblighi"],
    metaTitle: "Sistema AI ad alto rischio: cos'è, chi rientra e cosa fare | AIComply",
    metaDescription:
      "Scopri se il tuo sistema AI rientra nell'Annex III dell'EU AI Act: 8 settori, esenzioni Art. 6(3), 7 obblighi e scadenza dicembre 2027. Guida pratica aggiornata maggio 2026.",
    faqSchema: [
      {
        q: "Un chatbot aziendale è un sistema AI ad alto rischio?",
        a: "In generale, no. Un chatbot per il customer support non rientra nell'Annex III. Diventa ad alto rischio se interagisce in modo determinante con decisioni su candidature di lavoro o concessione del credito. Cambia il contesto d'uso, non il tipo di sistema.",
      },
      {
        q: "Cosa succede se classifico sbagliato il mio sistema?",
        a: "Sanzioni fino a 15 milioni di euro o il 3% del fatturato globale annuo. La classificazione errata non è un'omissione procedurale minore: è una violazione sostanziale del regolamento.",
      },
      {
        q: "Le PMI hanno obblighi ridotti rispetto alle grandi aziende?",
        a: "Gli obblighi sono gli stessi. Le PMI beneficiano di sanzioni proporzionate e accesso a regulatory sandbox, ma non esistono esenzioni per dimensione. Se il sistema è ad alto rischio, gli articoli 9-15 si applicano integralmente.",
      },
      {
        q: "Devo registrarmi nel database EUDB?",
        a: "Sì, se sei provider di un sistema ad alto rischio Annex III. La registrazione nel database EUDB è obbligatoria prima della messa in servizio del sistema.",
      },
      {
        q: "Le linee guida della Commissione di maggio 2026 cambiano qualcosa?",
        a: "Le linee guida in bozza del 19 maggio 2026 non cambiano il testo del regolamento ma chiariscono come applicarlo, con esempi concreti per le otto categorie Annex III e criteri per le esenzioni Art. 6(3). Sono in consultazione fino al 23 giugno 2026.",
      },
    ],
    content: `
<p class="ac-tldr">
  <strong>TL;DR:</strong> Un sistema AI è ad alto rischio se opera in uno degli 8 settori dell'Annex III dell'EU AI Act: selezione del personale, scoring creditizio, biometria, infrastrutture critiche, forze dell'ordine, giustizia, istruzione, migrazione. Se rientri, hai tempo fino al 2 dicembre 2027. Gli obblighi sono sette, pesanti, e richiedono da 6 a 18 mesi per essere soddisfatti. Ignorarli costa fino a 15 milioni di euro.
</p>

<p>Il tuo gestionale HR usa un algoritmo per scremare i CV? Il tuo sistema bancario assegna score di credito automaticamente? Il tuo software monitora le performance dei dipendenti con l'AI?</p>
<p>Probabilmente hai un sistema ad alto rischio. E probabilmente non lo sai ancora.</p>
<p>Il problema non è la cattiveria del regolamento. È che la definizione di "alto rischio" nell'EU AI Act non funziona come ci si aspetta. Non dipende da quanto è potente il modello. Non dipende dal budget che hai speso. Dipende da dove lo usi e su chi impatta.</p>
<p>Questa guida spiega il meccanismo, i settori coinvolti, le eccezioni che pochi conoscono e cosa devi fare se il tuo sistema rientra.</p>

<h2>Cos'è un sistema AI ad alto rischio secondo l'EU AI Act?</h2>
<p>Un sistema AI è classificato ad alto rischio quando opera in uno degli otto settori elencati nell'<a href="https://artificialintelligenceact.eu/article/6/" target="_blank" rel="noopener">Annex III del regolamento</a>, oppure quando è integrato in un prodotto soggetto a normativa armonizzata europea (Annex I) che richiede una valutazione di conformità di terza parte.</p>
<p>Il secondo percorso riguarda macchinari industriali, dispositivi medici, ascensori, apparecchiature radio. Se produci queste cose con componenti AI integrate, rientri automaticamente.</p>
<p>Il primo percorso, quello che interessa la maggior parte delle aziende digitali italiane, funziona così: l'AI Act elenca otto aree di utilizzo. Se il tuo sistema AI opera in una di queste aree, è presunto ad alto rischio. Non conta la dimensione dell'azienda. Non conta se sei provider o deployer. Conta l'uso.</p>

<h2>I 8 settori dell'Annex III: sei dentro?</h2>
<p>Questa è la lista che devi conoscere. Per ciascuna categoria, un esempio concreto che puoi incontrare in un'azienda italiana.</p>
<p><strong>1. Biometria.</strong> Identificazione biometrica a distanza (riconoscimento facciale), categorizzazione biometrica, riconoscimento delle emozioni. Esempio: sistema di timbratura con riconoscimento facciale.</p>
<p><strong>2. Infrastrutture critiche.</strong> AI usata nella gestione di reti energetiche, acqua, trasporti, gas. Esempio: sistema di manutenzione predittiva per una rete elettrica.</p>
<p><strong>3. Istruzione e formazione professionale.</strong> Sistemi che determinano l'accesso a percorsi formativi, valutano studenti, rilevano comportamenti anomali. Esempio: software universitario che assegna i posti nei corsi in base a un punteggio automatico.</p>
<p><strong>4. Gestione del personale e accesso al lavoro.</strong> CV screening automatico, selezione dei candidati, valutazione delle performance, decisioni su promozioni e licenziamenti. Esempio: qualsiasi ATS che usa AI per filtrare le candidature prima che un umano le veda.</p>
<p><strong>5. Accesso a servizi essenziali.</strong> <a href="https://startbrain.ai/it/guides/ai-act/classification/" target="_blank" rel="noopener">Scoring creditizio</a>, valutazione assicurativa, accesso a servizi sanitari, valutazione delle richieste di sussidio pubblico. Esempio: modello AI che decide se concedere un mutuo.</p>
<p><strong>6. Forze dell'ordine.</strong> AI usata da polizia e autorità per valutare rischi individuali, analisi di prove, predizione di crimini. Riguarda principalmente la PA, non le aziende private.</p>
<p><strong>7. Migrazione e controllo delle frontiere.</strong> Valutazione del rischio di persone che entrano nell'UE, analisi di documenti di viaggio, richieste di asilo. Anche qui, principalmente PA.</p>
<p><strong>8. Amministrazione della giustizia e processi democratici.</strong> AI usata da tribunali per assistere nelle decisioni, sistemi di arbitrato automatico. Riguarda soggetti istituzionali.</p>
<p>Per le aziende italiane, i settori che contano davvero sono il 4 (HR) e il 5 (credito e assicurazioni). <a href="https://www.agendadigitale.eu/sicurezza/sistemi-ia-ad-alto-rischio-il-confine-incerto-che-imprese-e-pa-devono-governare/" target="_blank" rel="noopener">Gran parte delle PMI italiane</a> che usano AI in questi processi ricade nell'Annex III senza saperlo.</p>

<h2>Attenzione all'Art. 6(3): quando un sistema Annex III non è ad alto rischio</h2>
<p>Rientrare in un settore dell'Annex III non significa automaticamente essere ad alto rischio. Esiste un'esenzione, poco conosciuta, che può escluderti dagli obblighi.</p>
<p>L'<a href="https://medium.com/@lorenzo.passaro92/ai-act-e-digital-omnibus-le-esenzioni-dellart-6-3-sono-uno-scudo-o-un-illusione-247ea6b073de" target="_blank" rel="noopener">Art. 6(3)</a> prevede che un sistema Annex III non sia considerato ad alto rischio se risponde a uno di questi quattro criteri:</p>
<p><strong>1.</strong> Esegue un task procedurale ristretto. Non prende decisioni su persone, elabora solo dati strutturati in modo circoscritto.</p>
<p><strong>2.</strong> Migliora il risultato di un'attività già completata da un umano. Aiuta a rivedere una decisione già presa, non a prenderne una nuova.</p>
<p><strong>3.</strong> Rileva pattern rispetto a decisioni precedenti senza influenzare la valutazione finale. Evidenzia anomalie, ma non sostituisce il giudizio umano.</p>
<p><strong>4.</strong> Svolge un task preparatorio. Prepara materiali o analisi che un umano usa come punto di partenza, senza impatto diretto sulla decisione.</p>
<p>Attenzione: c'è una trappola. Se il tuo sistema esegue <strong>profilazione di persone fisiche</strong>, l'esenzione non si applica mai, indipendentemente da tutto il resto.</p>
<p>Se pensi di rientrare in una delle quattro esenzioni, devi documentarlo prima di mettere il sistema sul mercato e registrarlo nel database EUDB. Non basta decidere internamente che sei esente.</p>

<h2>Cosa devi fare se il tuo sistema è ad alto rischio</h2>
<p>Sette obblighi, tutti vincolanti, tutti documentati. Nessuno è facoltativo.</p>
<p><strong>Art. 9 — Sistema di gestione dei rischi.</strong> Un processo iterativo che identifica, valuta e mitiga i rischi per tutta la durata del ciclo di vita del sistema. Non basta un documento iniziale. Il risk management è continuo.</p>
<p><strong>Art. 10 — Governance dei dati.</strong> I dataset usati per addestramento, validazione e test devono essere pertinenti, rappresentativi ed esenti da errori nella misura del possibile. Devi documentare da dove vengono i dati, come sono stati selezionati, quali bias potenziali contengono.</p>
<p><strong>Art. 11 — Documentazione tecnica.</strong> Va redatta prima di mettere il sistema sul mercato. Il formato è quello dell'Annex IV del regolamento: architettura del sistema, dati usati, performance attesa, test effettuati, misure di mitigazione dei rischi.</p>
<p><strong>Art. 12 — Logging automatico.</strong> Il sistema deve registrare automaticamente gli eventi rilevanti. Il <a href="https://www.mauriziofonte.it/blog/post/ai-act-scadenza-2-agosto-2026-checklist-pmi-italiane-compliance.html" target="_blank" rel="noopener">retention minimo è 6 mesi</a> per i sistemi Annex III, 3 anni per i sistemi biometrici.</p>
<p><strong>Art. 13 — Trasparenza verso il deployer.</strong> Chi usa il sistema deve ricevere istruzioni chiare su capacità, limiti, performance attesa, condizioni d'uso, misure di supervisione umana previste.</p>
<p><strong>Art. 14 — Supervisione umana.</strong> Il sistema deve essere progettato per permettere supervisione umana effettiva. Va documentato chi supervisiona, con quale frequenza e con quali poteri.</p>
<p><strong>Art. 15 — Accuratezza, robustezza e cybersicurezza.</strong> Il sistema deve mantenere le sue performance nel tempo, essere resiliente rispetto a errori e attacchi, prevenire l'automation bias.</p>

<h2>Quando scadono gli obblighi?</h2>
<p>La scadenza dipende dal tipo di sistema.</p>
<p>Per i <strong>sistemi standalone Annex III</strong> la scadenza è il <strong>2 dicembre 2027</strong>. È il risultato del rinvio dell'accordo Omnibus del 7 maggio 2026, che ha spostato di 16 mesi la scadenza originale di agosto 2026.</p>
<p>Per i <strong>sistemi AI integrati in prodotti fisici soggetti a normativa armonizzata</strong> (Annex I) la scadenza è il <strong>2 agosto 2028</strong>.</p>
<p>Il 19 maggio 2026 la Commissione Europea ha pubblicato le <a href="https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems" target="_blank" rel="noopener">linee guida in bozza sulla classificazione dei sistemi ad alto rischio</a>, 148 pagine che chiariscono come applicare l'Art. 6. La consultazione pubblica è aperta fino al 23 giugno 2026.</p>
<p>Per un quadro completo di tutte le scadenze, consulta il <a href="/risorse/scadenze-ai-act-aggiornate-calendario-2025-2028">calendario aggiornato dell'AI Act dopo l'Omnibus</a>.</p>

<h2>Quanto tempo ci vuole per essere conformi?</h2>
<p>La risposta onesta è: tra 6 e 18 mesi, a seconda della complessità del sistema e di quanto sei organizzato.</p>
<p>Il percorso standard richiede: una gap analysis iniziale, la redazione della documentazione tecnica (Annex IV), la costruzione del risk management system, la configurazione del logging, la definizione delle procedure di supervisione umana, una DPIA se tratti dati personali, la registrazione nel database EUDB.</p>
<p>Ogni passaggio richiede contributi da aree diverse: legale, tecnica, privacy, operations. Coordinarli senza un sistema richiede tempo. Molto tempo.</p>
<p>AIComply è costruito per comprimere quel percorso. Il <a href="/dashboard/tools/classifier">classificatore di rischio AI</a> identifica in pochi minuti se il tuo sistema rientra nell'Annex III. Se rientra, i tool guidano articolo per articolo. Il dossier finale è esportabile e pronto per le autorità di vigilanza.</p>
<p>Il primo assessment è pronto in meno di 48 ore. Puoi <a href="/register">iniziare adesso</a> senza aspettare dicembre 2027.</p>
`,
  },
  {
    slug: "scadenze-ai-act-aggiornate-calendario-2025-2028",
    title: "Scadenze AI Act aggiornate: il calendario 2025–2028 dopo il rinvio dell'Omnibus",
    excerpt:
      "Due scadenze sono già passate. Una arriva tra pochi mesi. Le più pesanti sono state spostate. Ecco il calendario completo dopo l'accordo Omnibus del 7 maggio 2026.",
    date: "2 giugno 2026",
    dateISO: "2026-06-02",
    readTime: "8 min",
    category: "Normativa",
    tags: ["AI Act", "scadenze", "compliance", "Omnibus", "alto rischio"],
    metaTitle:
      "Scadenze AI Act 2025-2028: calendario aggiornato dopo l'Omnibus | AIComply",
    metaDescription:
      "Il calendario completo dell'EU AI Act aggiornato con l'accordo Omnibus del 7 maggio 2026. Pratiche vietate, GPAI, alto rischio Annex III: cosa è già in vigore e cosa puoi ancora pianificare.",
    faqSchema: [
      {
        q: "L'EU AI Act si applica anche alle PMI italiane?",
        a: "Sì. Il regolamento si applica a qualsiasi azienda che sviluppa, distribuisce o utilizza sistemi AI nell'Unione Europea, indipendentemente dalle dimensioni. Le PMI beneficiano di sanzioni proporzionate e di accesso a regulatory sandbox nazionali, ma non sono esentate dagli obblighi.",
      },
      {
        q: "Cosa succede se non rispetto la scadenza di agosto 2026?",
        a: "Le conseguenze dipendono dall'obbligo violato. Per la trasparenza Art. 50 (agosto 2026) si parla di sanzioni fino a 15 milioni di euro o il 3% del fatturato globale annuo. I poteri sanzionatori della Commissione Europea sui provider GPAI entrano in piena applicazione proprio ad agosto 2026.",
      },
      {
        q: "Il rinvio Omnibus per i sistemi high-risk è definitivo?",
        a: "L'accordo del 7 maggio 2026 è ancora provvisorio. Richiede ratifica formale di Parlamento e Consiglio e pubblicazione in Gazzetta Ufficiale. L'orientamento politico è però consolidato: tutti i principali studi legali internazionali considerano il rinvio a dicembre 2027 per Annex III come praticamente certo.",
      },
      {
        q: "Come faccio a sapere se il mio sistema AI è ad alto rischio (Annex III)?",
        a: "L'Annex III elenca otto aree specifiche: biometria, infrastrutture critiche, istruzione, gestione del personale, accesso a servizi essenziali (credito, sanità), forze dell'ordine, migrazione, amministrazione della giustizia. Se il tuo sistema AI opera in uno di questi ambiti, molto probabilmente rientra.",
      },
      {
        q: "La scadenza GPAI di agosto 2025 vale anche se uso ChatGPT in azienda?",
        a: "No. Gli obblighi GPAI di agosto 2025 riguardano i provider dei modelli (OpenAI, Anthropic, Google). Se sei un'azienda che usa ChatGPT come strumento interno, sei un deployer. I tuoi obblighi dipendono dal tipo di sistema che costruisci con quell'AI e dal rischio che comporta.",
      },
    ],
    content: `
<p class="ac-tldr">
  <strong>TL;DR:</strong> L'EU AI Act non ha una sola scadenza. Ne ha sette, e l'accordo Omnibus del 7 maggio 2026 ha spostato la più pesante: i sistemi AI ad alto rischio (Annex III) slittano da agosto 2026 a dicembre 2027, 16 mesi in più. Ma due obblighi sono già in vigore da mesi. Ignorarli significa rischiare fino a 35 milioni di euro. Ecco il calendario completo e cosa fare adesso.
</p>

<p>Se stai pianificando la compliance AI Act basandoti sulla scadenza di agosto 2026, potresti avere un problema.</p>
<p>Non perché sei in ritardo. Perché quella data non è più quella che credi.</p>
<p>Il 7 maggio 2026, il Parlamento Europeo e il Consiglio hanno raggiunto un accordo provvisorio, il cosiddetto <a href="https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/" target="_blank" rel="noopener">Digital Omnibus on AI</a>, che ha spostato in avanti le scadenze più pesanti. Ma non tutte. Alcune sono rimaste. Altre erano già scadute.</p>
<p>Questo è il calendario aggiornato. Prendi nota delle date che contano davvero per la tua azienda.</p>

<h2>Quali scadenze AI Act sono già passate?</h2>
<p>Due obblighi dell'AI Act sono già in vigore. Se rientri nel loro perimetro, sei già esposto a sanzioni.</p>
<p><strong>Il 2 febbraio 2025</strong> sono entrate in vigore le disposizioni sulle <a href="https://www.cybersecurity360.it/news/ai-act-scattano-i-primi-divieti-chi-rischia-le-sanzioni-e-le-prossime-tappe/" target="_blank" rel="noopener">pratiche di AI vietate (Art. 5)</a>. Otto tipologie di sistemi AI sono proibite in modo assoluto: manipolazione subliminale, sfruttamento di vulnerabilità, social scoring da parte di enti pubblici, identificazione biometrica in tempo reale in spazi pubblici, categorizzazione biometrica per inferire etnia o religione, riconoscimento delle emozioni sul lavoro o a scuola, predizione di rischio criminale individuale, scraping massivo di immagini facciali.</p>
<p>La sanzione per chi viola Art. 5 è la più alta dell'intero regolamento: <a href="https://www.avvocatitech.com/pratiche-di-intelligenza-artificiale-vietate-dallai-act-cosa-non-si-puo-fare/" target="_blank" rel="noopener">fino a 35 milioni di euro o il 7% del fatturato globale annuo</a>, a seconda di quale dei due è più alto. Per le PMI si applica la soglia inferiore.</p>
<p><strong>Il 2 agosto 2025</strong> sono scattati gli obblighi per i provider di modelli AI di uso generale (GPAI). Chi sviluppa o distribuisce modelli come GPT, Claude, Gemini o equivalenti deve rispettare <a href="https://www.lw.com/en/insights/eu-ai-act-gpai-model-obligations-in-force-and-final-gpai-code-of-practice-in-place" target="_blank" rel="noopener">obblighi di documentazione tecnica, trasparenza sui dati di addestramento e conformità copyright</a>. I poteri di enforcement della Commissione Europea su questi provider entrano in applicazione dal 2 agosto 2026.</p>

<h2>Cos'è cambiato con il Digital Omnibus di maggio 2026?</h2>
<p>L'Omnibus ha spostato la scadenza più temuta del regolamento: i sistemi AI ad alto rischio Annex III non devono essere conformi ad agosto 2026, ma a dicembre 2027.</p>
<p>Il <a href="https://www.hoganlovells.com/en/publications/eu-legislators-agree-to-delay-for-highrisk-ai-rules" target="_blank" rel="noopener">provvedimento approvato il 7 maggio 2026</a> ha differito di 16 mesi l'obbligo di conformità per i sistemi standalone classificati nell'Annex III: selezione del personale, scoring creditizio, biometria, infrastrutture critiche, forze dell'ordine, giustizia, istruzione, migrazione. Per i sistemi AI incorporati in prodotti soggetti a normativa armonizzata (Annex I, come macchinari o dispositivi medici), la scadenza è invece agosto 2028.</p>
<p>L'accordo è ancora provvisorio. Richiede la ratifica formale di Parlamento e Consiglio, poi la pubblicazione in Gazzetta Ufficiale. Ma l'orientamento politico è consolidato.</p>
<p>Attenzione: l'Omnibus non è una proroga generale. Agosto 2026 rimane una data carica di obblighi. Cambiano solo quelli legati ai sistemi high-risk Annex III.</p>

<h2>Il calendario completo AI Act 2024–2028</h2>
<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Data</th><th>Obbligo</th><th>Stato</th><th>Articolo</th></tr>
    </thead>
    <tbody>
      <tr><td>1 ago 2024</td><td>Entrata in vigore del Regolamento</td><td class="ac-passed">✓ Passata</td><td>Art. 113</td></tr>
      <tr><td>2 feb 2025</td><td>Pratiche vietate (8 categorie) + Alfabetizzazione AI</td><td class="ac-passed">✓ In vigore</td><td>Art. 5 + Art. 4</td></tr>
      <tr><td>10 ott 2025</td><td>Legge italiana L. 132/2025</td><td class="ac-passed">✓ In vigore</td><td>—</td></tr>
      <tr><td>2 ago 2025</td><td>Obblighi GPAI + autorità nazionali</td><td class="ac-passed">✓ In vigore</td><td>Art. 53-55</td></tr>
      <tr><td>2 ago 2026</td><td>Trasparenza Art. 50 (chatbot, labeling AI) + enforcement GPAI</td><td class="ac-soon">⚑ 6 mesi</td><td>Art. 50</td></tr>
      <tr><td>2 dic 2026</td><td>Watermarking obbligatorio contenuti AI sintetici</td><td class="ac-omnibus">↻ Omnibus</td><td>Art. 50(2)</td></tr>
      <tr><td>2 dic 2027</td><td>Sistemi high-risk Annex III standalone</td><td class="ac-omnibus">↻ Omnibus</td><td>Art. 6(2)</td></tr>
      <tr><td>2 ago 2028</td><td>Sistemi high-risk Annex I (embedded in prodotti)</td><td class="ac-omnibus">↻ Omnibus</td><td>Art. 6(1)</td></tr>
    </tbody>
  </table>
</div>

<h2>Agosto 2026: cosa devi fare entro quella data?</h2>
<p>Agosto 2026 non è scomparso dal calendario. Restano tre obblighi concreti, e il tempo per prepararsi si accorcia ogni settimana.</p>
<p><strong>Primo.</strong> I sistemi AI a rischio limitato che interagiscono con persone fisiche devono rispettare le regole di trasparenza Art. 50. Se hai un chatbot sul sito, un assistente virtuale, un sistema che genera contenuti automaticamente, devi informare gli utenti che stanno interagendo con un'AI. Non è facoltativo. Non è una buona pratica. È un obbligo.</p>
<p><strong>Secondo.</strong> I poteri sanzionatori della Commissione Europea sui provider GPAI entrano in piena applicazione. Chi non ha messo in ordine la documentazione tecnica del proprio modello, la policy sui dati di addestramento e la conformità copyright si troverà esposto a ispezioni con sanzioni fino a <a href="https://www.dlapiper.com/en-us/insights/publications/2025/08/latest-wave-of-obligations-under-the-eu-ai-act-take-effect" target="_blank" rel="noopener">15 milioni di euro o il 3% del fatturato</a>.</p>
<p><strong>Terzo.</strong> Il regolamento diventa pienamente applicabile. L'intero apparato sanzionatorio è operativo. Il fatto che la tua azienda abbia tempo fino al 2027 per i sistemi Annex III non significa che possa ignorare il contesto normativo generale.</p>
<p>Se usi AI nei tuoi processi aziendali, il modo più rapido per capire cosa ti riguarda è partire dal <a href="/dashboard/tools/classifier">classificatore di rischio AI</a> integrato in AIComply. Identifica il tier del tuo sistema in pochi minuti.</p>

<h2>Dicembre 2026: il watermarking obbligatorio</h2>
<p>Dal 2 dicembre 2026, chi genera contenuti audio, video, immagini o testo con sistemi AI deve applicare una marcatura machine-readable che identifichi il contenuto come artificiale.</p>
<p>L'obbligo viene dall'Art. 50(2) e riguarda i provider di sistemi che producono contenuti sintetici. Non si applica solo alle grandi tech company: se hai integrato un modello AI nella tua piattaforma per generare immagini, testi di prodotto o video, il watermarking è tuo obbligo.</p>
<p>L'<a href="https://www.mishcon.com/news/eu-ai-act-simplified-unpacking-the-ai-omnibus-agreement-of-may-2026" target="_blank" rel="noopener">accordo Omnibus</a> ha accorciato il periodo transitorio da sei a tre mesi rispetto alla data di entrata in vigore del regolamento, portando la scadenza al 2 dicembre 2026 invece di agosto.</p>
<p>AIComply include uno <a href="/scanner">scanner Art. 50 gratuito</a> per verificare se i tuoi sistemi rientrano nell'obbligo di disclosure e watermarking.</p>

<h2>Dicembre 2027: la vera scadenza per i sistemi ad alto rischio</h2>
<p>Se il tuo sistema AI rientra nell'Annex III, hai tempo fino al 2 dicembre 2027. Ma non è un invito ad aspettare.</p>
<p>I sistemi Annex III coprono otto aree: selezione e gestione del personale, scoring creditizio, biometria, infrastrutture critiche, forze dell'ordine, giustizia e processi giudiziari, istruzione e formazione professionale, servizi pubblici e migrazione. <a href="https://www.ascensys.it/blog/ai-act-pmi-agosto-2026" target="_blank" rel="noopener">Gran parte delle imprese italiane</a> che usano AI in HR o customer scoring ricade in questo perimetro senza saperlo.</p>
<p>La conformità Annex III non si risolve in una settimana. Richiede documentazione tecnica (Annex IV), sistema di risk management, data governance, logging con retention minima di 6 mesi, supervisione umana documentata, FRIA se sei un'autorità pubblica o istituzione finanziaria, DPIA se tratti dati personali, registrazione nel database EUDB. L'intero iter richiede tipicamente tra 6 e 18 mesi.</p>
<p>Dicembre 2027 è lontano. Il percorso non lo è. Puoi partire dall'<a href="/register">assessment iniziale</a> in meno di 48 ore.</p>

<h2>Quanto tempo ci vuole davvero per essere conformi?</h2>
<p>La risposta dipende da due variabili: quanto è complesso il tuo sistema AI e quanto sei organizzato nella raccolta della documentazione.</p>
<p>Un percorso di conformità completo per un sistema Annex III fatto in modo tradizionale richiede consulenze legali, audit tecnici, redazione di documentazione, gap analysis, assessment DPIA e FRIA. Il mercato parla di 6-18 mesi, con costi che variano dai 30.000 ai 150.000 euro per un sistema di media complessità.</p>
<p>AIComply è costruito per comprimere quel percorso. Il primo assessment è pronto in meno di 48 ore. I tool guidano ogni articolo del regolamento, dai check Art. 5 alla dichiarazione di conformità. Il dossier finale è esportabile e pronto per un notified body o per le autorità di vigilanza.</p>
<p>Puoi vedere i <a href="/pricing">piani disponibili</a> o iniziare subito con lo scanner gratuito.</p>
`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return POSTS;
}
