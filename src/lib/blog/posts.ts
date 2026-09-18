// ─── Blog post data ───────────────────────────────────────────────────────────
// Aggiungi nuovi post in cima all'array. Il primo elemento appare in evidenza.

import type { Locale } from "@/i18n/config";

// Campi traducibili di un post. La versione EN vive in `en`; se assente,
// si ricade sull'italiano.
export interface BlogPostL10n {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqSchema: { q: string; a: string }[];
  tags?: string[];
}

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
  en?: BlogPostL10n;      // traduzione inglese (fallback: italiano)
}

export const POSTS: BlogPost[] = [
  {
    slug: "ai-act-quick-scan-10-domande-gap-compliance",
    title: "AI Act Quick Scan: 10 domande per capire se hai gap di compliance",
    excerpt:
      "Un funnel breve funziona meglio di un assessment infinito: 10 domande mirate, teaser del risultato e report completo via email per trasformare l'interesse AI Act in lead qualificati.",
    date: "30 agosto 2026",
    dateISO: "2026-08-30",
    readTime: "6 min",
    category: "Guide",
    tags: ["AI Act", "quick scan", "lead generation", "Art. 50", "compliance", "assessment"],
    metaTitle: "AI Act Quick Scan: 10 domande per trovare gap compliance | AIComply",
    metaDescription:
      "Come strutturare un AI Act Quick Scan efficace: 10 domande, scoring, teaser dei gap, lead capture e report personalizzato per prepararsi agli obblighi AI Act.",
    faqSchema: [
      {
        q: "Un AI Act Quick Scan sostituisce un assessment legale completo?",
        a: "No. Un quick scan serve a fare triage iniziale e a individuare segnali di rischio. L'assessment completo richiede analisi del sistema, documentazione tecnica, responsabilità di provider o deployer e validazione professionale.",
      },
      {
        q: "Perché il quick scan dovrebbe essere breve?",
        a: "Perché il primo obiettivo è ridurre l'attrito. Otto o dieci domande permettono di qualificare il rischio senza chiedere all'utente di completare un questionario pesante prima di capire se il tema lo riguarda.",
      },
      {
        q: "Conviene mostrare subito il punteggio?",
        a: "Di solito no. È più efficace mostrare un teaser del risultato, per esempio il numero di potenziali gap individuati, e chiedere email e azienda per inviare il report completo.",
      },
      {
        q: "Quali sistemi dovrebbe intercettare un quick scan AI Act?",
        a: "Almeno chatbot e assistenti virtuali, sistemi che generano contenuti sintetici, soluzioni HR, scoring, sistemi decisionali automatizzati e strumenti che possono ricadere negli obblighi di trasparenza o documentazione.",
      },
    ],
    content: `
<p class="ac-tldr">
  <strong>TL;DR:</strong> Per partire con un funnel AI Act non serve un assessment da 60 domande. Serve un quick scan breve: 8-10 domande, logica condizionale, scoring interno e un teaser del risultato. Il report completo arriva via email. L'utente capisce subito se ha un problema, l'azienda raccoglie un lead qualificato, e il passaggio naturale diventa l'assessment completo.
</p>

<p>Il modo più semplice per trasformare l'interesse sull'AI Act in una conversazione commerciale non è pubblicare un altro PDF da scaricare.</p>
<p>È far rispondere l'utente a poche domande concrete sul suo sistema AI.</p>
<p>Se il flusso è breve, l'utente arriva alla fine. Se il risultato è abbastanza specifico, lascia i dati. Se il report gli mostra gap reali, la richiesta successiva non è più "spiegami cos'è l'AI Act", ma "cosa devo fare adesso?".</p>

<h2>Perché partire da un quick scan</h2>
<p>Un assessment completo è utile quando esiste già un progetto, un referente interno e una disponibilità a lavorare sulla compliance.</p>
<p>Ma molte aziende non sono ancora lì. Hanno un chatbot, un generatore di contenuti, un sistema HR, un modello integrato in un prodotto, oppure semplicemente usano AI in processi aziendali senza sapere se stanno entrando nel perimetro dell'AI Act.</p>
<p>Il quick scan serve esattamente a questo: non certifica, non chiude l'analisi, non sostituisce il parere professionale. Fa emergere il rischio iniziale e dà una prossima azione chiara.</p>

<h2>La struttura ideale del funnel</h2>
<p>Il flusso dovrebbe essere volutamente corto. La sequenza migliore è questa:</p>
<p><strong>1. Entrata da LinkedIn o da una pagina risorse.</strong> Il messaggio deve promettere un risultato pratico, non una spiegazione teorica.</p>
<p><strong>2. Quick scan da 10 domande.</strong> Le domande devono coprire tipo di sistema, ruolo dell'organizzazione, contenuti generati, impatto su persone fisiche, documentazione, logging, supervisione e owner interno.</p>
<p><strong>3. Teaser del risultato.</strong> Prima della lead capture non serve mostrare tutto. Meglio indicare che il risultato è pronto e che sono stati identificati alcuni gap potenziali.</p>
<p><strong>4. Email, azienda e ruolo.</strong> Solo i dati essenziali. Ogni campo in più riduce il completamento.</p>
<p><strong>5. Report personalizzato.</strong> Il report deve tradurre le risposte in gap, priorità e prossimi step.</p>
<p><strong>6. CTA finale.</strong> La call to action naturale è avviare l'assessment completo o prenotare una demo.</p>

<h2>Le 10 domande che contano</h2>
<p>Un buon quick scan non deve chiedere tutto. Deve intercettare i segnali che cambiano davvero la classificazione e gli obblighi.</p>
<p><strong>1.</strong> L'organizzazione fornisce o utilizza un sistema AI?</p>
<p><strong>2.</strong> Il sistema genera, modifica o sintetizza contenuti testuali, audio, video o immagini?</p>
<p><strong>3.</strong> Il sistema interagisce direttamente con utenti o clienti?</p>
<p><strong>4.</strong> L'utente viene informato quando sta interagendo con un sistema AI?</p>
<p><strong>5.</strong> I contenuti generati o modificati dall'AI sono marcati o riconoscibili?</p>
<p><strong>6.</strong> Esiste documentazione tecnica sul funzionamento del sistema?</p>
<p><strong>7.</strong> Il sistema produce output che influenzano decisioni su persone fisiche?</p>
<p><strong>8.</strong> Il sistema è usato in HR, credito, istruzione, servizi essenziali, biometria o ambiti regolati?</p>
<p><strong>9.</strong> Esistono log, evidenze e test che dimostrano come il sistema viene controllato?</p>
<p><strong>10.</strong> Esiste un owner interno per la remediation AI Act?</p>

<h2>Il punto chiave: non mostrare tutto subito</h2>
<p>L'errore più comune è calcolare un punteggio e mostrarlo immediatamente.</p>
<p>Funziona meglio un teaser più controllato:</p>
<p><strong>"Assessment pronto. Abbiamo identificato 3 potenziali gap di conformità. Inserisci la tua email aziendale per ricevere il report completo."</strong></p>
<p>Questo mantiene alto il valore percepito senza trasformare il risultato in un numero isolato. Un punteggio del 62% non dice molto. Tre gap concreti, invece, aprono una conversazione.</p>

<h2>Cosa dovrebbe contenere il report</h2>
<p>Il report non deve essere lungo. Deve essere utile.</p>
<p>La struttura migliore è: punteggio preliminare, gap principali, obblighi potenzialmente rilevanti, livello di priorità e prossimi step.</p>
<p>Per esempio, se l'utente dichiara di generare contenuti sintetici senza marcatura machine-readable, il report dovrebbe evidenziare un possibile gap legato alla trasparenza Art. 50 e suggerire una verifica tecnica. Se dichiara un sistema usato in HR, il report dovrebbe segnalare la necessità di classificazione del rischio e documentazione più ampia.</p>

<h2>Perché funziona per RegulaeOS</h2>
<p>RegulaeOS non vende solo software. Vende un percorso assistito verso la conformità: triage, assessment, documentazione tecnica, DPIA, FRIA, risk register e validazione professionale.</p>
<p>Il quick scan è il primo gradino giusto perché promette poco e consegna qualcosa di concreto. Non chiede all'utente di capire il regolamento prima di iniziare. Gli chiede di descrivere il suo sistema, poi traduce quelle risposte in un rischio leggibile.</p>
<p>Da lì, la CTA è naturale: <a href="/scanner">provare lo scanner Art. 50</a>, <a href="/pricing">vedere i piani</a> oppure <a href="/contatti">parlare con un professionista</a>.</p>

<h2>La versione MVP</h2>
<p>Per partire basta una pagina responsive con progress bar, 8-10 domande, scoring interno, schermata teaser, lead form e schermata finale.</p>
<p>Il backend può arrivare subito dopo: salvataggio lead, generazione del report, invio email e collegamento al CRM. Ma la prima validazione del funnel può già misurare tre cose: completamento del quiz, conversione del form e interesse verso l'assessment completo.</p>
<p>Puoi <a href="/quick-scan">provare il Quick Scan AI Act</a> e vedere il flusso corretto: nessuna email all'inizio, teaser dopo le risposte, report completo solo dopo il form.</p>
<p>Quando questi tre numeri sono buoni, il quick scan non è più una demo. È una porta d'ingresso commerciale.</p>
`,
    en: {
      title: "AI Act Quick Scan: 10 questions to find out if you have compliance gaps",
      excerpt:
        "A short funnel works better than an endless assessment: 10 targeted questions, a result teaser and a full report by email to turn AI Act interest into qualified leads.",
      date: "30 August 2026",
      readTime: "6 min",
      category: "Guide",
      metaTitle: "AI Act Quick Scan: 10 questions to find compliance gaps | AIComply",
      metaDescription:
        "How to structure an effective AI Act Quick Scan: 10 questions, scoring, gap teaser, lead capture and a personalised report to get ready for AI Act obligations.",
      faqSchema: [
        {
          q: "Does an AI Act Quick Scan replace a full legal assessment?",
          a: "No. A quick scan is meant for initial triage and to surface risk signals. A full assessment requires system analysis, technical documentation, provider or deployer responsibilities and professional validation.",
        },
        {
          q: "Why should the quick scan be short?",
          a: "Because the first goal is to reduce friction. Eight to ten questions let you qualify the risk without asking the user to complete a heavy questionnaire before they even understand whether the topic concerns them.",
        },
        {
          q: "Should you show the score right away?",
          a: "Usually not. It is more effective to show a teaser of the result — for example the number of potential gaps found — and to ask for email and company in order to send the full report.",
        },
        {
          q: "Which systems should an AI Act quick scan catch?",
          a: "At least chatbots and virtual assistants, systems that generate synthetic content, HR solutions, scoring, automated decision systems and tools that may fall under transparency or documentation obligations.",
        },
      ],
      content: `
<p class="ac-tldr">
  <strong>TL;DR:</strong> To launch an AI Act funnel you don't need a 60-question assessment. You need a short quick scan: 8-10 questions, conditional logic, internal scoring and a result teaser. The full report arrives by email. The user immediately understands whether they have a problem, the company collects a qualified lead, and the natural next step becomes the full assessment.
</p>

<p>The simplest way to turn AI Act interest into a commercial conversation is not to publish yet another PDF to download.</p>
<p>It is to have the user answer a few concrete questions about their AI system.</p>
<p>If the flow is short, the user reaches the end. If the result is specific enough, they leave their details. If the report shows them real gaps, the next request is no longer "explain what the AI Act is" but "what do I have to do now?".</p>

<h2>Why start with a quick scan</h2>
<p>A full assessment is useful when there is already a project, an internal owner and a willingness to work on compliance.</p>
<p>But many companies aren't there yet. They have a chatbot, a content generator, an HR system, a model embedded in a product, or they simply use AI in business processes without knowing whether they are entering the scope of the AI Act.</p>
<p>The quick scan is for exactly this: it does not certify, it does not close the analysis, it does not replace professional advice. It surfaces the initial risk and gives a clear next action.</p>

<h2>The ideal funnel structure</h2>
<p>The flow should be deliberately short. The best sequence is this:</p>
<p><strong>1. Entry from LinkedIn or a resources page.</strong> The message must promise a practical result, not a theoretical explanation.</p>
<p><strong>2. A 10-question quick scan.</strong> The questions must cover the type of system, the role of the organisation, generated content, impact on individuals, documentation, logging, oversight and internal owner.</p>
<p><strong>3. Result teaser.</strong> Before lead capture there is no need to show everything. Better to indicate that the result is ready and that some potential gaps have been identified.</p>
<p><strong>4. Email, company and role.</strong> Only the essential fields. Every extra field reduces completion.</p>
<p><strong>5. Personalised report.</strong> The report must translate the answers into gaps, priorities and next steps.</p>
<p><strong>6. Final CTA.</strong> The natural call to action is to start the full assessment or book a demo.</p>

<h2>The 10 questions that matter</h2>
<p>A good quick scan should not ask everything. It must catch the signals that truly change the classification and the obligations.</p>
<p><strong>1.</strong> Does the organisation provide or use an AI system?</p>
<p><strong>2.</strong> Does the system generate, modify or synthesise text, audio, video or image content?</p>
<p><strong>3.</strong> Does the system interact directly with users or customers?</p>
<p><strong>4.</strong> Is the user informed when they are interacting with an AI system?</p>
<p><strong>5.</strong> Is AI-generated or AI-modified content marked or recognisable?</p>
<p><strong>6.</strong> Is there technical documentation on how the system works?</p>
<p><strong>7.</strong> Does the system produce output that influences decisions about individuals?</p>
<p><strong>8.</strong> Is the system used in HR, credit, education, essential services, biometrics or regulated fields?</p>
<p><strong>9.</strong> Are there logs, evidence and tests that show how the system is controlled?</p>
<p><strong>10.</strong> Is there an internal owner for AI Act remediation?</p>

<h2>The key point: don't show everything at once</h2>
<p>The most common mistake is to compute a score and show it immediately.</p>
<p>A more controlled teaser works better:</p>
<p><strong>"Assessment ready. We identified 3 potential compliance gaps. Enter your work email to receive the full report."</strong></p>
<p>This keeps the perceived value high without turning the result into an isolated number. A score of 62% doesn't say much. Three concrete gaps, on the other hand, open a conversation.</p>

<h2>What the report should contain</h2>
<p>The report doesn't have to be long. It has to be useful.</p>
<p>The best structure is: preliminary score, main gaps, potentially relevant obligations, priority level and next steps.</p>
<p>For example, if the user declares they generate synthetic content without machine-readable marking, the report should flag a possible gap linked to Art. 50 transparency and suggest a technical check. If they declare a system used in HR, the report should flag the need for risk classification and broader documentation.</p>

<h2>Why it works for RegulaeOS</h2>
<p>RegulaeOS doesn't just sell software. It sells an assisted path towards compliance: triage, assessment, technical documentation, DPIA, FRIA, risk register and professional validation.</p>
<p>The quick scan is the right first step because it promises little and delivers something concrete. It doesn't ask the user to understand the regulation before starting. It asks them to describe their system, then translates those answers into readable risk.</p>
<p>From there, the CTA is natural: <a href="/scanner">try the Art. 50 scanner</a>, <a href="/pricing">see the plans</a> or <a href="/contatti">talk to a professional</a>.</p>

<h2>The MVP version</h2>
<p>To get started, all you need is a responsive page with a progress bar, 8-10 questions, internal scoring, a teaser screen, a lead form and a final screen.</p>
<p>The backend can come right after: lead storage, report generation, email sending and CRM connection. But the first validation of the funnel can already measure three things: quiz completion, form conversion and interest in the full assessment.</p>
<p>You can <a href="/quick-scan">try the AI Act Quick Scan</a> and see the right flow: no email at the start, a teaser after the answers, the full report only after the form.</p>
<p>When those three numbers are good, the quick scan is no longer a demo. It is a commercial entry point.</p>
`,
    },
  },
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
    en: {
      title: "What a high-risk AI system is: a practical guide to Annex III",
      excerpt:
        "Does your HR software filter CVs with an algorithm? Does your system assign credit scores? You probably have a high-risk system. Here are the 8 sectors, the Art. 6(3) exemptions and the 7 obligations you must meet by December 2027.",
      date: "3 June 2026",
      readTime: "9 min",
      category: "Guide",
      metaTitle: "High-risk AI system: what it is, who is in scope and what to do | AIComply",
      metaDescription:
        "Find out whether your AI system falls under Annex III of the EU AI Act: 8 sectors, Art. 6(3) exemptions, 7 obligations and the December 2027 deadline. Practical guide updated May 2026.",
      faqSchema: [
        {
          q: "Is a corporate chatbot a high-risk AI system?",
          a: "In general, no. A customer-support chatbot does not fall under Annex III. It becomes high-risk if it plays a decisive role in decisions on job applications or granting credit. What changes is the context of use, not the type of system.",
        },
        {
          q: "What happens if I classify my system incorrectly?",
          a: "Fines up to 15 million euros or 3% of annual global turnover. Misclassification is not a minor procedural omission: it is a substantive breach of the regulation.",
        },
        {
          q: "Do SMEs have reduced obligations compared to large companies?",
          a: "The obligations are the same. SMEs benefit from proportionate fines and access to regulatory sandboxes, but there are no exemptions based on size. If the system is high-risk, Articles 9-15 apply in full.",
        },
        {
          q: "Do I have to register in the EUDB database?",
          a: "Yes, if you are the provider of a high-risk Annex III system. Registration in the EUDB database is mandatory before the system is put into service.",
        },
        {
          q: "Do the Commission's May 2026 guidelines change anything?",
          a: "The draft guidelines of 19 May 2026 do not change the text of the regulation but clarify how to apply it, with concrete examples for the eight Annex III categories and criteria for the Art. 6(3) exemptions. They are open for consultation until 23 June 2026.",
        },
      ],
      content: `
<p class="ac-tldr">
  <strong>TL;DR:</strong> An AI system is high-risk if it operates in one of the 8 sectors of the EU AI Act's Annex III: recruitment, credit scoring, biometrics, critical infrastructure, law enforcement, justice, education, migration. If you're in scope, you have until 2 December 2027. There are seven obligations, they are heavy, and they take 6 to 18 months to meet. Ignoring them costs up to 15 million euros.
</p>

<p>Does your HR software use an algorithm to screen CVs? Does your banking system assign credit scores automatically? Does your software monitor employee performance with AI?</p>
<p>You probably have a high-risk system. And you probably don't know it yet.</p>
<p>The problem is not that the regulation is harsh. It's that the definition of "high-risk" in the EU AI Act doesn't work the way you'd expect. It doesn't depend on how powerful the model is. It doesn't depend on the budget you spent. It depends on where you use it and who it impacts.</p>
<p>This guide explains the mechanism, the sectors involved, the exceptions few people know about and what you have to do if your system is in scope.</p>

<h2>What is a high-risk AI system according to the EU AI Act?</h2>
<p>An AI system is classified as high-risk when it operates in one of the eight sectors listed in <a href="https://artificialintelligenceact.eu/article/6/" target="_blank" rel="noopener">Annex III of the regulation</a>, or when it is embedded in a product subject to harmonised European legislation (Annex I) that requires a third-party conformity assessment.</p>
<p>The second path covers industrial machinery, medical devices, lifts, radio equipment. If you make these things with embedded AI components, you are automatically in scope.</p>
<p>The first path, the one that concerns most Italian digital companies, works like this: the AI Act lists eight areas of use. If your AI system operates in one of these areas, it is presumed high-risk. Company size doesn't matter. Whether you are provider or deployer doesn't matter. Use is what matters.</p>

<h2>The 8 sectors of Annex III: are you in?</h2>
<p>This is the list you need to know. For each category, a concrete example you might come across in an Italian company.</p>
<p><strong>1. Biometrics.</strong> Remote biometric identification (facial recognition), biometric categorisation, emotion recognition. Example: a clock-in system with facial recognition.</p>
<p><strong>2. Critical infrastructure.</strong> AI used in managing energy grids, water, transport, gas. Example: a predictive maintenance system for an electricity grid.</p>
<p><strong>3. Education and vocational training.</strong> Systems that determine access to training paths, assess students, detect anomalous behaviour. Example: university software that assigns places on courses based on an automatic score.</p>
<p><strong>4. Employment and access to work.</strong> Automatic CV screening, candidate selection, performance evaluation, decisions on promotions and dismissals. Example: any ATS that uses AI to filter applications before a human sees them.</p>
<p><strong>5. Access to essential services.</strong> <a href="https://startbrain.ai/it/guides/ai-act/classification/" target="_blank" rel="noopener">Credit scoring</a>, insurance assessment, access to healthcare services, assessment of public benefit claims. Example: an AI model that decides whether to grant a mortgage.</p>
<p><strong>6. Law enforcement.</strong> AI used by police and authorities to assess individual risks, analyse evidence, predict crime. Mainly concerns the public sector, not private companies.</p>
<p><strong>7. Migration and border control.</strong> Risk assessment of people entering the EU, analysis of travel documents, asylum applications. Again, mainly the public sector.</p>
<p><strong>8. Administration of justice and democratic processes.</strong> AI used by courts to assist in decisions, automatic arbitration systems. Concerns institutional bodies.</p>
<p>For Italian companies, the sectors that really matter are 4 (HR) and 5 (credit and insurance). <a href="https://www.agendadigitale.eu/sicurezza/sistemi-ia-ad-alto-rischio-il-confine-incerto-che-imprese-e-pa-devono-governare/" target="_blank" rel="noopener">Most Italian SMEs</a> that use AI in these processes fall under Annex III without knowing it.</p>

<h2>Watch out for Art. 6(3): when an Annex III system is not high-risk</h2>
<p>Falling into an Annex III sector doesn't automatically mean being high-risk. There is a little-known exemption that can exclude you from the obligations.</p>
<p><a href="https://medium.com/@lorenzo.passaro92/ai-act-e-digital-omnibus-le-esenzioni-dellart-6-3-sono-uno-scudo-o-un-illusione-247ea6b073de" target="_blank" rel="noopener">Art. 6(3)</a> provides that an Annex III system is not considered high-risk if it meets one of these four criteria:</p>
<p><strong>1.</strong> It performs a narrow procedural task. It doesn't make decisions about people, it only processes structured data in a limited way.</p>
<p><strong>2.</strong> It improves the result of an activity already completed by a human. It helps review a decision already made, not make a new one.</p>
<p><strong>3.</strong> It detects patterns relative to previous decisions without influencing the final assessment. It highlights anomalies but does not replace human judgement.</p>
<p><strong>4.</strong> It carries out a preparatory task. It prepares materials or analyses that a human uses as a starting point, with no direct impact on the decision.</p>
<p>Careful: there's a trap. If your system performs <strong>profiling of individuals</strong>, the exemption never applies, regardless of everything else.</p>
<p>If you think you fall under one of the four exemptions, you must document it before placing the system on the market and register it in the EUDB database. It is not enough to decide internally that you are exempt.</p>

<h2>What you have to do if your system is high-risk</h2>
<p>Seven obligations, all binding, all documented. None is optional.</p>
<p><strong>Art. 9 — Risk management system.</strong> An iterative process that identifies, assesses and mitigates risks throughout the system's life cycle. An initial document is not enough. Risk management is continuous.</p>
<p><strong>Art. 10 — Data governance.</strong> The datasets used for training, validation and testing must be relevant, representative and, as far as possible, free of errors. You must document where the data comes from, how it was selected, which potential biases it contains.</p>
<p><strong>Art. 11 — Technical documentation.</strong> It must be drawn up before placing the system on the market. The format is that of Annex IV of the regulation: system architecture, data used, expected performance, tests carried out, risk mitigation measures.</p>
<p><strong>Art. 12 — Automatic logging.</strong> The system must automatically record relevant events. The <a href="https://www.mauriziofonte.it/blog/post/ai-act-scadenza-2-agosto-2026-checklist-pmi-italiane-compliance.html" target="_blank" rel="noopener">minimum retention is 6 months</a> for Annex III systems, 3 years for biometric systems.</p>
<p><strong>Art. 13 — Transparency towards the deployer.</strong> Whoever uses the system must receive clear instructions on capabilities, limits, expected performance, conditions of use and the human oversight measures foreseen.</p>
<p><strong>Art. 14 — Human oversight.</strong> The system must be designed to allow effective human oversight. It must be documented who supervises, how often and with what powers.</p>
<p><strong>Art. 15 — Accuracy, robustness and cybersecurity.</strong> The system must maintain its performance over time, be resilient to errors and attacks, and prevent automation bias.</p>

<h2>When do the obligations fall due?</h2>
<p>The deadline depends on the type of system.</p>
<p>For <strong>standalone Annex III systems</strong> the deadline is <strong>2 December 2027</strong>. It is the result of the Omnibus agreement of 7 May 2026, which pushed the original August 2026 deadline back by 16 months.</p>
<p>For <strong>AI systems embedded in physical products subject to harmonised legislation</strong> (Annex I) the deadline is <strong>2 August 2028</strong>.</p>
<p>On 19 May 2026 the European Commission published the <a href="https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems" target="_blank" rel="noopener">draft guidelines on the classification of high-risk systems</a>, 148 pages clarifying how to apply Art. 6. The public consultation is open until 23 June 2026.</p>
<p>For a full picture of all the deadlines, see the <a href="/risorse/scadenze-ai-act-aggiornate-calendario-2025-2028">updated AI Act calendar after the Omnibus</a>.</p>

<h2>How long does it take to become compliant?</h2>
<p>The honest answer is: between 6 and 18 months, depending on the complexity of the system and how organised you are.</p>
<p>The standard path requires: an initial gap analysis, drafting the technical documentation (Annex IV), building the risk management system, configuring logging, defining human oversight procedures, a DPIA if you process personal data, and registration in the EUDB database.</p>
<p>Each step requires input from different areas: legal, technical, privacy, operations. Coordinating them without a system takes time. A lot of time.</p>
<p>AIComply is built to compress that path. The <a href="/dashboard/tools/classifier">AI risk classifier</a> identifies in minutes whether your system falls under Annex III. If it does, the tools guide you article by article. The final dossier is exportable and ready for market surveillance authorities.</p>
<p>The first assessment is ready in less than 48 hours. You can <a href="/register">start now</a> without waiting for December 2027.</p>
`,
    },
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
    en: {
      title: "Updated AI Act deadlines: the 2025–2028 calendar after the Omnibus delay",
      excerpt:
        "Two deadlines have already passed. One is coming in a few months. The heaviest ones have been moved. Here is the full calendar after the Omnibus agreement of 7 May 2026.",
      date: "2 June 2026",
      readTime: "8 min",
      category: "Regulation",
      metaTitle: "AI Act deadlines 2025-2028: updated calendar after the Omnibus | AIComply",
      metaDescription:
        "The full EU AI Act calendar updated with the Omnibus agreement of 7 May 2026. Prohibited practices, GPAI, high-risk Annex III: what is already in force and what you can still plan for.",
      faqSchema: [
        {
          q: "Does the EU AI Act also apply to Italian SMEs?",
          a: "Yes. The regulation applies to any company that develops, distributes or uses AI systems in the European Union, regardless of size. SMEs benefit from proportionate fines and access to national regulatory sandboxes, but they are not exempt from the obligations.",
        },
        {
          q: "What happens if I miss the August 2026 deadline?",
          a: "The consequences depend on the obligation breached. For Art. 50 transparency (August 2026) the fines are up to 15 million euros or 3% of annual global turnover. The European Commission's enforcement powers over GPAI providers come into full application in August 2026.",
        },
        {
          q: "Is the Omnibus delay for high-risk systems final?",
          a: "The agreement of 7 May 2026 is still provisional. It requires formal ratification by Parliament and Council and publication in the Official Journal. The political direction, however, is settled: all the major international law firms consider the December 2027 delay for Annex III as practically certain.",
        },
        {
          q: "How do I know whether my AI system is high-risk (Annex III)?",
          a: "Annex III lists eight specific areas: biometrics, critical infrastructure, education, employment, access to essential services (credit, healthcare), law enforcement, migration, administration of justice. If your AI system operates in one of these areas, it very likely falls in scope.",
        },
        {
          q: "Does the August 2025 GPAI deadline apply even if I use ChatGPT in my company?",
          a: "No. The August 2025 GPAI obligations concern the model providers (OpenAI, Anthropic, Google). If you are a company using ChatGPT as an internal tool, you are a deployer. Your obligations depend on the type of system you build with that AI and the risk it entails.",
        },
      ],
      content: `
<p class="ac-tldr">
  <strong>TL;DR:</strong> The EU AI Act does not have a single deadline. It has seven, and the Omnibus agreement of 7 May 2026 moved the heaviest one: high-risk AI systems (Annex III) slip from August 2026 to December 2027, 16 months more. But two obligations have already been in force for months. Ignoring them means risking up to 35 million euros. Here is the full calendar and what to do now.
</p>

<p>If you are planning your AI Act compliance around the August 2026 deadline, you might have a problem.</p>
<p>Not because you're late. Because that date is no longer what you think it is.</p>
<p>On 7 May 2026, the European Parliament and the Council reached a provisional agreement, the so-called <a href="https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/" target="_blank" rel="noopener">Digital Omnibus on AI</a>, which pushed the heaviest deadlines forward. But not all of them. Some remained. Others had already expired.</p>
<p>This is the updated calendar. Take note of the dates that really matter for your company.</p>

<h2>Which AI Act deadlines have already passed?</h2>
<p>Two AI Act obligations are already in force. If you fall within their scope, you are already exposed to fines.</p>
<p><strong>On 2 February 2025</strong> the provisions on <a href="https://www.cybersecurity360.it/news/ai-act-scattano-i-primi-divieti-chi-rischia-le-sanzioni-e-le-prossime-tappe/" target="_blank" rel="noopener">prohibited AI practices (Art. 5)</a> came into force. Eight types of AI system are absolutely banned: subliminal manipulation, exploitation of vulnerabilities, social scoring by public bodies, real-time biometric identification in public spaces, biometric categorisation to infer ethnicity or religion, emotion recognition at work or school, individual crime-risk prediction, and mass scraping of facial images.</p>
<p>The fine for breaching Art. 5 is the highest in the entire regulation: <a href="https://www.avvocatitech.com/pratiche-di-intelligenza-artificiale-vietate-dallai-act-cosa-non-si-puo-fare/" target="_blank" rel="noopener">up to 35 million euros or 7% of annual global turnover</a>, whichever is higher. For SMEs the lower threshold applies.</p>
<p><strong>On 2 August 2025</strong> the obligations for providers of general-purpose AI models (GPAI) came into effect. Those who develop or distribute models such as GPT, Claude, Gemini or equivalents must comply with <a href="https://www.lw.com/en/insights/eu-ai-act-gpai-model-obligations-in-force-and-final-gpai-code-of-practice-in-place" target="_blank" rel="noopener">obligations on technical documentation, transparency about training data and copyright compliance</a>. The European Commission's enforcement powers over these providers come into application from 2 August 2026.</p>

<h2>What changed with the Digital Omnibus of May 2026?</h2>
<p>The Omnibus moved the most feared deadline in the regulation: high-risk Annex III AI systems do not have to be compliant in August 2026, but in December 2027.</p>
<p>The <a href="https://www.hoganlovells.com/en/publications/eu-legislators-agree-to-delay-for-highrisk-ai-rules" target="_blank" rel="noopener">measure approved on 7 May 2026</a> deferred by 16 months the compliance obligation for standalone systems classified under Annex III: recruitment, credit scoring, biometrics, critical infrastructure, law enforcement, justice, education, migration. For AI systems embedded in products subject to harmonised legislation (Annex I, such as machinery or medical devices), the deadline is instead August 2028.</p>
<p>The agreement is still provisional. It requires formal ratification by Parliament and Council, then publication in the Official Journal. But the political direction is settled.</p>
<p>Careful: the Omnibus is not a general extension. August 2026 remains a date loaded with obligations. Only those tied to high-risk Annex III systems change.</p>

<h2>The full AI Act calendar 2024–2028</h2>
<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Date</th><th>Obligation</th><th>Status</th><th>Article</th></tr>
    </thead>
    <tbody>
      <tr><td>1 Aug 2024</td><td>Entry into force of the Regulation</td><td class="ac-passed">✓ Passed</td><td>Art. 113</td></tr>
      <tr><td>2 Feb 2025</td><td>Prohibited practices (8 categories) + AI literacy</td><td class="ac-passed">✓ In force</td><td>Art. 5 + Art. 4</td></tr>
      <tr><td>10 Oct 2025</td><td>Italian law L. 132/2025</td><td class="ac-passed">✓ In force</td><td>—</td></tr>
      <tr><td>2 Aug 2025</td><td>GPAI obligations + national authorities</td><td class="ac-passed">✓ In force</td><td>Art. 53-55</td></tr>
      <tr><td>2 Aug 2026</td><td>Art. 50 transparency (chatbots, AI labeling) + GPAI enforcement</td><td class="ac-soon">⚑ 6 months</td><td>Art. 50</td></tr>
      <tr><td>2 Dec 2026</td><td>Mandatory watermarking of synthetic AI content</td><td class="ac-omnibus">↻ Omnibus</td><td>Art. 50(2)</td></tr>
      <tr><td>2 Dec 2027</td><td>Standalone high-risk Annex III systems</td><td class="ac-omnibus">↻ Omnibus</td><td>Art. 6(2)</td></tr>
      <tr><td>2 Aug 2028</td><td>High-risk Annex I systems (embedded in products)</td><td class="ac-omnibus">↻ Omnibus</td><td>Art. 6(1)</td></tr>
    </tbody>
  </table>
</div>

<h2>August 2026: what must you do by that date?</h2>
<p>August 2026 has not disappeared from the calendar. Three concrete obligations remain, and the time to prepare shrinks every week.</p>
<p><strong>First.</strong> Limited-risk AI systems that interact with individuals must comply with the Art. 50 transparency rules. If you have a chatbot on your site, a virtual assistant, a system that generates content automatically, you must inform users that they are interacting with an AI. It is not optional. It is not a best practice. It is an obligation.</p>
<p><strong>Second.</strong> The European Commission's enforcement powers over GPAI providers come into full application. Anyone who has not put in order the technical documentation of their model, the training-data policy and copyright compliance will be exposed to inspections with fines up to <a href="https://www.dlapiper.com/en-us/insights/publications/2025/08/latest-wave-of-obligations-under-the-eu-ai-act-take-effect" target="_blank" rel="noopener">15 million euros or 3% of turnover</a>.</p>
<p><strong>Third.</strong> The regulation becomes fully applicable. The entire sanctioning apparatus is operational. The fact that your company has until 2027 for Annex III systems does not mean it can ignore the general regulatory context.</p>
<p>If you use AI in your business processes, the fastest way to understand what concerns you is to start from the <a href="/dashboard/tools/classifier">AI risk classifier</a> built into AIComply. It identifies your system's tier in minutes.</p>

<h2>December 2026: mandatory watermarking</h2>
<p>From 2 December 2026, anyone who generates audio, video, image or text content with AI systems must apply a machine-readable marking that identifies the content as artificial.</p>
<p>The obligation comes from Art. 50(2) and concerns providers of systems that produce synthetic content. It does not apply only to big tech companies: if you have embedded an AI model in your platform to generate images, product copy or videos, watermarking is your obligation.</p>
<p>The <a href="https://www.mishcon.com/news/eu-ai-act-simplified-unpacking-the-ai-omnibus-agreement-of-may-2026" target="_blank" rel="noopener">Omnibus agreement</a> shortened the transition period from six to three months relative to the regulation's entry into force, bringing the deadline to 2 December 2026 instead of August.</p>
<p>AIComply includes a free <a href="/scanner">Art. 50 scanner</a> to check whether your systems fall under the disclosure and watermarking obligation.</p>

<h2>December 2027: the real deadline for high-risk systems</h2>
<p>If your AI system falls under Annex III, you have until 2 December 2027. But it is not an invitation to wait.</p>
<p>Annex III systems cover eight areas: recruitment and employment management, credit scoring, biometrics, critical infrastructure, law enforcement, justice and judicial processes, education and vocational training, public services and migration. <a href="https://www.ascensys.it/blog/ai-act-pmi-agosto-2026" target="_blank" rel="noopener">Most Italian businesses</a> that use AI in HR or customer scoring fall within this scope without knowing it.</p>
<p>Annex III compliance is not solved in a week. It requires technical documentation (Annex IV), a risk management system, data governance, logging with a minimum retention of 6 months, documented human oversight, a FRIA if you are a public authority or financial institution, a DPIA if you process personal data, and registration in the EUDB database. The whole process typically takes between 6 and 18 months.</p>
<p>December 2027 is far away. The path is not. You can start from the <a href="/register">initial assessment</a> in less than 48 hours.</p>

<h2>How long does it really take to become compliant?</h2>
<p>The answer depends on two variables: how complex your AI system is and how organised you are in collecting the documentation.</p>
<p>A full compliance path for an Annex III system done the traditional way requires legal advice, technical audits, drafting of documentation, gap analysis, DPIA and FRIA assessments. The market talks about 6-18 months, with costs ranging from 30,000 to 150,000 euros for a system of medium complexity.</p>
<p>AIComply is built to compress that path. The first assessment is ready in less than 48 hours. The tools guide every article of the regulation, from the Art. 5 checks to the declaration of conformity. The final dossier is exportable and ready for a notified body or for market surveillance authorities.</p>
<p>You can see the <a href="/pricing">available plans</a> or start now with the free scanner.</p>
`,
    },
  },
];

// Applica la traduzione richiesta sovrascrivendo i campi tradotti; slug,
// dateISO ed eventuali campi non tradotti restano invariati.
function localize(post: BlogPost, locale: Locale): BlogPost {
  if (locale === "en" && post.en) {
    const { en, ...base } = post;
    return { ...base, ...en, tags: en.tags ?? base.tags };
  }
  return post;
}

export function getPostBySlug(slug: string, locale: Locale = "it"): BlogPost | undefined {
  const post = POSTS.find((p) => p.slug === slug);
  return post ? localize(post, locale) : undefined;
}

export function getAllPosts(locale: Locale = "it"): BlogPost[] {
  return POSTS.map((p) => localize(p, locale));
}
