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
  author?: { name: string; jobTitle?: string }; // autore persona (schema.org); default: RegulaeOS
  dateModifiedISO?: string; // ultima revisione (schema.org dateModified); default: dateISO
}

export const POSTS: BlogPost[] = [
  {
    slug: "misure-sicurezza-base-nis2-acn",
    title: "Misure di sicurezza di base NIS2, la determinazione ACN spiegata in modo semplice",
    excerpt:
      "Le misure di sicurezza di base fissate dall'ACN con la determinazione n. 379907/2025. Quante sono, come si leggono i codici, cosa cambia tra soggetti importanti ed essenziali, quali documenti servono, cosa approva il vertice e quali scadenze valgono.",
    date: "14 novembre 2026",
    dateISO: "2026-11-14",
    author: { name: "Umberto Mottola", jobTitle: "Avvocato, CIPP/E" },
    dateModifiedISO: "2026-11-14",
    readTime: "10 min",
    category: "Guide",
    tags: ["NIS2", "misure di sicurezza di base", "misure di sicurezza NIS2", "determinazione ACN 379907/2025", "specifiche di base", "ACN", "soggetti essenziali", "soggetti importanti", "D.Lgs. 138/2024"],
    metaTitle: "Misure di sicurezza di base NIS2, la guida semplice",
    metaDescription:
      "Le misure di sicurezza di base NIS2 della determinazione ACN 379907/2025. Quante sono, differenze tra importanti ed essenziali, documenti e scadenze.",
    faqSchema: [
      {
        q: "Quante sono le misure di sicurezza di base NIS2?",
        a: "Sono 37 misure con 87 requisiti per i soggetti importanti, contenute nell'allegato 1 della determinazione ACN n. 379907/2025, e 43 misure con 116 requisiti per i soggetti essenziali, contenute nell'allegato 2. Le misure sono organizzate nelle sei funzioni del Framework nazionale per la cybersecurity e la data protection.",
      },
      {
        q: "Entro quando vanno adottate le misure di sicurezza di base?",
        a: "Entro diciotto mesi dalla ricezione della comunicazione di inserimento nell'elenco dei soggetti NIS; per i soggetti inseriti nel 2025 l'ACN indica il mese di ottobre 2026. Per i soggetti inseriti per la prima volta nel 2026 il termine scade invece il 31 luglio 2027, in base alla determinazione ACN n. 127434/2026.",
      },
      {
        q: "Le misure vanno applicate a tutti i sistemi aziendali?",
        a: "In linea di principio sì. Tuttavia, quando un requisito contiene la formula «per almeno i sistemi informativi e di rete rilevanti», il soggetto può limitarlo ai sistemi la cui compromissione avrebbe un impatto significativo sulle attività e sui servizi per cui rientra nella NIS2, come chiarisce la FAQ MSB.7 dell'ACN.",
      },
      {
        q: "Quali documenti deve approvare il consiglio di amministrazione?",
        a: "Secondo l'appendice C della guida alla lettura dell'ACN, gli organi di amministrazione e direttivi approvano undici documenti, tra cui l'organizzazione per la sicurezza informatica, le politiche, la valutazione del rischio, il piano di trattamento del rischio, i piani di continuità, di ripristino e di gestione delle crisi, il piano di formazione e il piano di gestione degli incidenti.",
      },
      {
        q: "Bisogna modificare i contratti già in essere con i fornitori?",
        a: "No. Secondo la FAQ MSB.12 dell'ACN, i requisiti di sicurezza previsti dalla misura GV.SC-05 vanno inseriti nei contratti stipulati, rinnovati o prorogati a partire dal termine per l'adozione delle misure, e soltanto per le forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete.",
      },
    ],
    content: `
<p><em>Avv. Umberto Mottola, CIPP/E · aggiornato al 14 nov 2026</em></p>

<p class="ac-tldr">
  <strong>In sintesi.</strong> Le misure di sicurezza di base NIS2 sono i requisiti minimi fissati dall'ACN con la determinazione n. 379907 del 19 dicembre 2025, applicabile dal 15 gennaio 2026. I soggetti importanti adottano 37 misure con 87 requisiti (allegato 1); i soggetti essenziali 43 misure con 116 requisiti (allegato 2). Il termine è di diciotto mesi dalla comunicazione di inserimento nell'elenco NIS; per chi vi è entrato per la prima volta nel 2026 scade il 31 luglio 2027.
</p>

<p>Le misure di sicurezza di base NIS2 sono la parte più concreta della disciplina, perché dicono che cosa un'organizzazione deve fare, documento per documento e controllo per controllo. Il decreto NIS fissa gli obblighi in termini generali; la determinazione dell'Agenzia per la cybersicurezza nazionale (ACN) li traduce in requisiti verificabili.</p>
<p>Questo articolo spiega in modo semplice come sono costruite le misure, che cosa cambia tra soggetti importanti ed essenziali, quali documenti servono e quali scadenze valgono. Per il quadro generale degli obblighi si rinvia alla <a href="/risorse/nis2">guida alla NIS2</a>; per il calendario completo, alla pagina sullo <a href="/risorse/nis2-stato-attuazione-italia-europa">stato di attuazione della NIS2</a>.</p>

<h2>Che cosa sono le misure di sicurezza di base NIS2?</h2>
<p>Sono le specifiche minime con cui l'ACN, quale Autorità nazionale competente NIS, ha dato contenuto agli obblighi degli artt. 23 e 24 del decreto NIS, ossia agli obblighi degli organi di amministrazione e alle misure di gestione dei rischi informatici. Le stabiliscono gli allegati 1 e 2 della <a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_obblighi_2511-v3_signed" target="_blank" rel="noopener">determinazione ACN n. 379907/2025</a>.</p>
<p>La base normativa è duplice. L'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art24" target="_blank" rel="noopener">art. 24 del decreto NIS</a>, che disciplina le misure di gestione dei rischi, chiede misure tecniche, operative e organizzative adeguate e proporzionate e, al comma 2, elenca dieci elementi minimi, dalla gestione degli incidenti alla sicurezza della catena di approvvigionamento. L'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art31" target="_blank" rel="noopener">art. 31 del decreto</a>, intitolato alla proporzionalità e gradualità degli obblighi, affida poi all'ACN il compito di fissare obblighi proporzionati, nonché termini, modalità e specifiche di attuazione.</p>
<p>La determinazione si applica dal 15 gennaio 2026 e, come dispone il suo art. 9, sostituisce la precedente determinazione n. 164179 del 14 aprile 2025. Si compone di quattro allegati; gli allegati 1 e 2 contengono le misure di sicurezza, mentre gli allegati 3 e 4 descrivono gli incidenti significativi da notificare al CSIRT Italia.</p>
<p>Anche l'aggettivo «di base» ha un significato preciso. Secondo la <a href="https://www.acn.gov.it/portale/faq/nis/misure-di-sicurezza-e-notifica-di-incidenti" target="_blank" rel="noopener">FAQ MSB.4 dell'ACN</a>, indica le misure adottate in fase di prima applicazione del decreto, ai sensi dell'art. 42, che disciplina appunto la prima applicazione.</p>

<h2>Quante sono le misure e come sono organizzate?</h2>
<p>I soggetti importanti devono adottare 37 misure, articolate in 87 requisiti; i soggetti essenziali 43 misure, con 116 requisiti. Ogni misura ha un codice, una descrizione e uno o più requisiti, e segue la struttura del Framework nazionale per la cybersecurity e la data protection, edizione 2025.</p>
<p>I numeri sono riportati dalla <a href="https://www.acn.gov.it/portale/documents/d/guest/guida-alla-lettura-specifiche-di-base" target="_blank" rel="noopener">guida alla lettura delle specifiche di base</a> pubblicata dall'ACN, al paragrafo 2.1. Il codice ha la forma XX.YY-NN, dove la prima sigla indica la funzione, la seconda la categoria e il numero la sottocategoria del Framework. Ad esempio, PR.DS-11 appartiene alla funzione Protezione e alla categoria Sicurezza dei dati, e riguarda i backup.</p>
<p>I requisiti, invece, dicono che cosa occorre fare in concreto. L'ACN chiarisce, nella FAQ MSB.6, che adottare le misure significa attuare tutti i requisiti previsti; non basta, quindi, coprire la misura in termini generici.</p>
<p>Le funzioni sono sei. La tabella riporta il numero di misure per ciascuna, contato sugli <a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-1-v2" target="_blank" rel="noopener">allegato 1</a> e <a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-2-v2" target="_blank" rel="noopener">allegato 2</a>.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Funzione</th><th>Che cosa copre, in sintesi</th><th>Soggetti importanti</th><th>Soggetti essenziali</th></tr>
    </thead>
    <tbody>
      <tr><td>Governo (GV)</td><td>Sistemi rilevanti, gestione del rischio, ruoli, politiche, fornitori</td><td>11</td><td>11</td></tr>
      <tr><td>Identificazione (ID)</td><td>Inventari, valutazione e trattamento del rischio, vulnerabilità, piani di adeguamento e di continuità</td><td>9</td><td>10</td></tr>
      <tr><td>Protezione (PR)</td><td>Utenze e accessi, formazione, cifratura e backup, aggiornamenti, log, reti</td><td>12</td><td>16</td></tr>
      <tr><td>Rilevamento (DE)</td><td>Monitoraggio delle reti e protezione degli endpoint</td><td>2</td><td>2</td></tr>
      <tr><td>Risposta (RS)</td><td>Piano di gestione degli incidenti e comunicazioni</td><td>2</td><td>2</td></tr>
      <tr><td>Ripristino (RC)</td><td>Ripristino dopo un incidente</td><td>1</td><td>2</td></tr>
      <tr><td><strong>Totale</strong></td><td></td><td><strong>37</strong></td><td><strong>43</strong></td></tr>
    </tbody>
  </table>
</div>

<p>Il peso, come si vede, è sulla governance. La guida alla lettura osserva infatti, al paragrafo 2.4, che i requisiti sono per la maggior parte di tipo organizzativo, ossia riguardano politiche, ruoli, piani e procedure; gli strumenti tecnologici dovrebbero essere a supporto dei processi definiti dall'organizzazione.</p>

<h2>Le sei misure in più per i soggetti essenziali</h2>
<p>Le misure aggiuntive per i soggetti essenziali discendono dall'art. 31 del decreto, che chiede obblighi proporzionati all'esposizione al rischio, alle dimensioni del soggetto e all'impatto sociale ed economico degli incidenti. Secondo la guida alla lettura, 27 misure hanno requisiti identici per le due categorie, 10 hanno requisiti aggiuntivi per gli essenziali e 6 valgono soltanto per questi ultimi.</p>
<p>Le sei misure esclusive dell'allegato 2 sono le seguenti.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Misura</th><th>Che cosa chiede</th></tr>
    </thead>
    <tbody>
      <tr><td>ID.AM-03</td><td>Un inventario aggiornato dei flussi di rete tra i sistemi del soggetto e l'esterno</td></tr>
      <tr><td>PR.AT-02</td><td>Una formazione dedicata al personale con ruoli specializzati, compresi gli amministratori di sistema</td></tr>
      <tr><td>PR.PS-01</td><td>Configurazioni di riferimento sicure (hardened) dei sistemi rilevanti, documentate in un elenco aggiornato</td></tr>
      <tr><td>PR.PS-03</td><td>Procedure per il trasferimento fisico e la dismissione sicura dei dispositivi che memorizzano dati, e registri delle manutenzioni sull'hardware</td></tr>
      <tr><td>PR.IR-03</td><td>Sistemi di comunicazione di emergenza protetti, secondo gli esiti della valutazione del rischio</td></tr>
      <tr><td>RC.CO-03</td><td>Procedure per comunicare alle articolazioni interne le attività di ripristino dopo un incidente</td></tr>
    </tbody>
  </table>
</div>

<p>Tra i requisiti aggiuntivi delle misure comuni, alcuni hanno un peso pratico rilevante. Per i sistemi rilevanti l'allegato 2 richiede vulnerability assessment o penetration test periodici, e comunque prima della messa in esercizio (ID.RA-01); chiede inoltre la protezione fisica o la cifratura dei backup e test di ripristino periodici (PR.DS-11), nonché strumenti di analisi e filtraggio del traffico in ingresso, compresa la posta elettronica (DE.CM-01).</p>

<h2>Le clausole che rendono le misure proporzionate al rischio</h2>
<p>Non tutti i requisiti vanno applicati allo stesso modo a ogni sistema. La guida alla lettura, al paragrafo 2.3, individua quattro clausole che modulano gli obblighi in base al rischio.</p>
<ul>
  <li><strong>«Per almeno i sistemi informativi e di rete rilevanti»</strong>, che consente di limitare il requisito ai sistemi la cui compromissione avrebbe un impatto significativo sulle attività e sui servizi per cui il soggetto rientra nella NIS2;</li>
  <li><strong>«in accordo agli esiti della valutazione del rischio di cui alla misura ID.RA-05»</strong>, che rimette alla valutazione del rischio la scelta di come e dove applicare il requisito;</li>
  <li><strong>«fatte salve motivate e documentate ragioni normative o tecniche»</strong>, che ammette una deroga, purché motivata, documentata e accompagnata, ove applicabile, da misure compensative descritte nel piano di trattamento del rischio (ID.RA-06);</li>
  <li><strong>«forniture con potenziali impatti sulla sicurezza dei sistemi informativi e di rete»</strong>, che limita alcuni obblighi verso i fornitori alle sole forniture rilevanti.</li>
</ul>
<p>Ne consegue che il primo passo è redigere l'elenco aggiornato dei sistemi rilevanti, richiesto dalla misura GV.OC-04. La guida suggerisce un metodo in tre passaggi; si individuano le attività e i servizi per cui il soggetto rientra nella NIS2, si valuta l'impatto che una compromissione dei sistemi avrebbe su di essi e si qualificano come rilevanti i sistemi con impatto significativo. Non è richiesta una metodologia specifica.</p>
<p>Un esempio chiarisce il meccanismo. Il requisito sull'autenticazione multifattore (PR.AA-03, punto 2) si applica almeno ai sistemi rilevanti e secondo la valutazione del rischio; la guida ammette perciò che, per un sistema isolato e già protetto da controlli di accesso fisico, il rischio possa risultare accettabile anche senza autenticazione multifattore.</p>
<p>Lo stesso criterio vale per i fornitori. Secondo la FAQ MSB.12 dell'ACN, non occorre adeguare i contratti già in essere; i requisiti di sicurezza vanno inseriti nei contratti stipulati, rinnovati o prorogati a partire dal termine per l'adozione delle misure.</p>

<h2>Quali documenti servono e quali deve approvare il vertice?</h2>
<p>Servono elenchi, inventari, piani, politiche, procedure e registri, che l'organizzazione può raccogliere in uno o più documenti. Undici di questi documenti, dalle politiche di sicurezza al piano di gestione degli incidenti, devono essere approvati dagli organi di amministrazione e direttivi, in attuazione dell'art. 23 del decreto NIS.</p>
<p>La FAQ MSB.11 dell'ACN elenca le principali evidenze documentali.</p>
<ul>
  <li><strong>Elenchi</strong>, ossia il personale dell'organizzazione di sicurezza informatica, i sistemi accessibili da remoto e, per i soli essenziali, le configurazioni di riferimento;</li>
  <li><strong>inventari</strong> di apparati fisici, di servizi e software, dei servizi erogati dai fornitori e dei fornitori, oltre ai flussi di rete per i soli essenziali;</li>
  <li><strong>piani</strong>, tra cui gestione e trattamento del rischio, continuità operativa e ripristino in caso di disastro, gestione delle vulnerabilità, adeguamento, formazione e risposta agli incidenti;</li>
  <li><strong>politiche</strong> di sicurezza informatica, per i sedici ambiti elencati dalla misura GV.PO-01 e almeno per i requisiti indicati nella tabella 1 in appendice agli allegati;</li>
  <li><strong>procedure</strong>, per i requisiti che le richiedono espressamente;</li>
  <li><strong>registri</strong>, come quello della formazione dei dipendenti e, per i soli essenziali, quelli degli esiti del riesame delle politiche e delle manutenzioni sull'hardware.</li>
</ul>
<p>Le politiche vanno riesaminate almeno una volta l'anno, come prevede la misura GV.PO-02; la valutazione del rischio e i piani di continuità vanno rivisti almeno ogni due anni e, in ogni caso, dopo un incidente significativo o un mutamento dell'esposizione alle minacce. La FAQ MSB.11 precisa che i documenti devono riprodurre la situazione corrente e possono essere tenuti in formato cartaceo o digitale.</p>
<p>La guida alla lettura, in appendice C, elenca i documenti che gli organi di amministrazione e direttivi devono approvare.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Documento da approvare</th><th>Misura di riferimento</th></tr>
    </thead>
    <tbody>
      <tr><td>Organizzazione per la sicurezza informatica</td><td>GV.RR-02, punto 1</td></tr>
      <tr><td>Politiche di sicurezza informatica</td><td>GV.PO-01, punto 3</td></tr>
      <tr><td>Valutazione del rischio</td><td>ID.RA-05, punto 3</td></tr>
      <tr><td>Piano di trattamento del rischio, compresa l'accettazione dei rischi residui</td><td>ID.RA-06, punto 3</td></tr>
      <tr><td>Piano di gestione delle vulnerabilità</td><td>ID.RA-08, punto 4</td></tr>
      <tr><td>Piano di adeguamento</td><td>ID.IM-01, punto 1</td></tr>
      <tr><td>Piani di continuità operativa, di ripristino in caso di disastro e di gestione delle crisi</td><td>ID.IM-04, punto 4</td></tr>
      <tr><td>Piano di formazione</td><td>PR.AT-01, punto 2</td></tr>
      <tr><td>Piano per la gestione degli incidenti</td><td>RS.MA-01, punto 2</td></tr>
    </tbody>
  </table>
</div>

<p>Il coinvolgimento del vertice non si esaurisce nell'approvazione. Il piano di formazione deve comprendere anche gli organi di amministrazione e direttivi (PR.AT-01), e questi vanno informati con relazioni periodiche sugli esiti del piano di adeguamento (ID.IM-01).</p>

<h2>Entro quando vanno adottate le misure di sicurezza di base?</h2>
<p>Il termine è di diciotto mesi dalla ricezione della comunicazione di inserimento nell'elenco dei soggetti NIS, come stabilisce l'art. 3 della determinazione n. 379907/2025. Per chi è stato inserito per la prima volta nel 2026, invece, la determinazione ACN n. 127434/2026 fissa una data unica, il 31 luglio 2027.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Soggetti</th><th>Misure di sicurezza (allegati 1 e 2)</th><th>Notifica degli incidenti (allegati 3 e 4)</th></tr>
    </thead>
    <tbody>
      <tr><td>Inseriti nell'elenco nel 2025</td><td>Diciotto mesi dalla comunicazione; l'ACN indica ottobre 2026</td><td>Nove mesi dalla comunicazione; l'ACN indica gennaio 2026</td></tr>
      <tr><td>Inseriti per la prima volta nel 2026</td><td>Entro il 31 luglio 2027</td><td>Dal 1° gennaio 2027</td></tr>
    </tbody>
  </table>
</div>

<p>Le indicazioni di ottobre 2026 e gennaio 2026 sono tratte dalla <a href="https://www.acn.gov.it/portale/nis/modalita-specifiche-base" target="_blank" rel="noopener">pagina dell'ACN sulle specifiche di base</a>; le date per i soggetti del 2026 sono fissate dall'art. 1 della <a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_misuresicurezza-v4_post" target="_blank" rel="noopener">determinazione ACN n. 127434/2026</a>, applicabile dal 30 aprile 2026. La stessa determinazione, al comma 3 dell'art. 1, conferma che per i soggetti inseriti nel 2025 e rimasti nell'elenco del 2026 restano fermi i termini originari.</p>
<p>L'ACN ha comunicato i primi inserimenti a partire dal 12 aprile 2025, come riporta la guida alla lettura; per questi soggetti, dunque, il termine per le misure è già decorso. Chi non avesse completato l'adeguamento deve tenere presente l'art. 24, comma 4, del decreto NIS, secondo cui il soggetto che rileva di non essere conforme adotta senza indebito ritardo le misure correttive necessarie.</p>
<p>Due regimi particolari completano il quadro. Gli ex operatori di servizi essenziali e gli operatori di telecomunicazioni individuati dalla determinazione mantengono, sui sistemi interessati, le misure già adottate secondo la disciplina previgente, come prevedono gli artt. 5 e 6 della determinazione n. 379907/2025, fermi restando i nuovi obblighi e i relativi termini.</p>

<h2>Conclusioni</h2>
<p>Le misure di sicurezza di base trasformano gli obblighi generali della NIS2 in un elenco preciso di requisiti. Sono più numerose per i soggetti essenziali, ma in entrambi i casi poggiano soprattutto su governance, documentazione e approvazione del vertice; le clausole basate sul rischio, tuttavia, consentono di concentrare gli sforzi sui sistemi davvero rilevanti.</p>
<p>In pratica conviene procedere in quest'ordine:</p>
<ol>
  <li>redigere l'elenco dei sistemi informativi e di rete rilevanti (GV.OC-04);</li>
  <li>eseguire e documentare la valutazione del rischio, compreso il rischio legato ai fornitori (ID.RA-05 e GV.SC-07);</li>
  <li>definire il piano di trattamento del rischio, con le eventuali deroghe motivate e le misure compensative (ID.RA-06);</li>
  <li>adottare politiche e piani e sottoporli all'approvazione degli organi di amministrazione e direttivi;</li>
  <li>attuare e documentare i controlli tecnici, requisito per requisito.</li>
</ol>
<p>Per gli altri obblighi, dalla registrazione alla notifica degli incidenti, si rinvia alla <a href="/risorse/nis2">guida completa alla NIS2</a>.</p>

<p><strong>Per verificare a che punto è la tua organizzazione</strong>, <a href="/inizia">la gap analysis NIS2 di RegulaeOS</a> permette di confrontare le misure adottate con i requisiti dell'allegato applicabile della determinazione ACN e di raccogliere in un unico posto le prove documentali.</p>

<h2>Fonti</h2>
<ul>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_obblighi_2511-v3_signed" target="_blank" rel="noopener">ACN, determinazione n. 379907 del 19 dicembre 2025 (specifiche di base)</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-1-v2" target="_blank" rel="noopener">ACN, allegato 1, misure di sicurezza di base per i soggetti importanti</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-2-v2" target="_blank" rel="noopener">ACN, allegato 2, misure di sicurezza di base per i soggetti essenziali</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/guida-alla-lettura-specifiche-di-base" target="_blank" rel="noopener">ACN, Linee guida NIS, specifiche di base, guida alla lettura (versione 2.1, aprile 2026)</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_misuresicurezza-v4_post" target="_blank" rel="noopener">ACN, determinazione n. 127434/2026 (termini per i soggetti inseriti nel 2026)</a></li>
  <li><a href="https://www.acn.gov.it/portale/nis/modalita-specifiche-base" target="_blank" rel="noopener">ACN, pagina «Modalità e specifiche di base»</a></li>
  <li><a href="https://www.acn.gov.it/portale/faq/nis/misure-di-sicurezza-e-notifica-di-incidenti" target="_blank" rel="noopener">ACN, FAQ NIS, misure di sicurezza e notifica di incidenti</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art24" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 24 (misure di gestione dei rischi), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art31" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 31 (proporzionalità e gradualità degli obblighi), Normattiva</a></li>
</ul>
`,
    en: {
      title: "NIS2 baseline security measures: the ACN determination explained simply",
      excerpt:
        "The baseline security measures set by ACN in determination no. 379907/2025. How many there are, how to read the codes, what changes between important and essential entities, which documents are needed, what the board must approve and which deadlines apply.",
      date: "14 November 2026",
      readTime: "10 min",
      category: "Guide",
      tags: ["NIS2", "baseline security measures", "NIS2 security measures", "ACN determination 379907/2025", "baseline specifications", "ACN", "essential entities", "important entities", "Legislative Decree 138/2024"],
      metaTitle: "NIS2 baseline security measures, explained simply",
      metaDescription:
        "NIS2 baseline security measures under ACN determination 379907/2025. How many, important vs essential entities, required documents and deadlines.",
      faqSchema: [
        {
          q: "How many NIS2 baseline security measures are there?",
          a: "There are 37 measures with 87 requirements for important entities, set out in Annex 1 of ACN determination no. 379907/2025, and 43 measures with 116 requirements for essential entities, set out in Annex 2. The measures are organised into the six functions of the Italian National Framework for Cybersecurity and Data Protection.",
        },
        {
          q: "By when must the baseline security measures be adopted?",
          a: "Within eighteen months of receiving the notice of inclusion in the list of NIS entities; for entities included in 2025, ACN indicates October 2026. For entities included for the first time in 2026, the deadline is 31 July 2027, under ACN determination no. 127434/2026.",
        },
        {
          q: "Do the measures apply to all company systems?",
          a: "In principle, yes. However, where a requirement contains the wording 'for at least the relevant network and information systems', the entity may limit it to systems whose compromise would have a significant impact on the activities and services for which it falls within NIS2, as clarified by ACN FAQ MSB.7.",
        },
        {
          q: "Which documents must the board of directors approve?",
          a: "According to Appendix C of ACN's reading guide, the management bodies approve eleven documents, including the cybersecurity organisation, the policies, the risk assessment, the risk treatment plan, the business continuity, disaster recovery and crisis management plans, the training plan and the incident management plan.",
        },
        {
          q: "Do existing supplier contracts have to be amended?",
          a: "No. According to ACN FAQ MSB.12, the security requirements under measure GV.SC-05 must be included in contracts signed, renewed or extended from the deadline for adopting the measures, and only for supplies with potential impacts on the security of network and information systems.",
        },
      ],
      content: `
<p><em>Avv. Umberto Mottola, CIPP/E · updated 14 Nov 2026</em></p>

<p class="ac-tldr">
  <strong>In short.</strong> NIS2 baseline security measures are the minimum requirements set by the Italian National Cybersecurity Agency (ACN) in determination no. 379907 of 19 December 2025, applicable from 15 January 2026. Important entities adopt 37 measures with 87 requirements (Annex 1); essential entities adopt 43 measures with 116 requirements (Annex 2). The deadline is eighteen months from the notice of inclusion in the NIS list; for entities first included in 2026, it is 31 July 2027.
</p>

<p>NIS2 baseline security measures are the most concrete part of the framework, because they say what an organisation must do, document by document and control by control. The Italian NIS decree sets the obligations in general terms; the ACN determination turns them into verifiable requirements.</p>
<p>This article explains in plain terms how the measures are built, what changes between important and essential entities, which documents are needed and which deadlines apply. For a general overview of the obligations, see the <a href="/risorse/nis2">NIS2 guide</a>; for the full timeline, see the page on the <a href="/risorse/nis2-stato-attuazione-italia-europa">NIS2 implementation status</a>.</p>

<h2>What are the NIS2 baseline security measures?</h2>
<p>They are the minimum specifications through which ACN, as the national NIS competent authority, gave substance to the obligations in Articles 23 and 24 of the NIS decree, namely the obligations of management bodies and the cybersecurity risk-management measures. They are set out in Annexes 1 and 2 of <a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_obblighi_2511-v3_signed" target="_blank" rel="noopener">ACN determination no. 379907/2025</a>.</p>
<p>The legal basis is twofold. <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art24" target="_blank" rel="noopener">Article 24 of the NIS decree</a>, which governs risk-management measures, requires appropriate and proportionate technical, operational and organisational measures and, in paragraph 2, lists ten minimum elements, from incident handling to supply chain security. <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art31" target="_blank" rel="noopener">Article 31 of the decree</a>, on the proportionality and gradual implementation of obligations, then tasks ACN with setting proportionate obligations, together with deadlines, procedures and implementation specifications.</p>
<p>The determination applies from 15 January 2026 and, under its Article 9, replaces the previous determination no. 164179 of 14 April 2025. It has four annexes; Annexes 1 and 2 contain the security measures, while Annexes 3 and 4 describe the significant incidents to be notified to CSIRT Italia.</p>
<p>The word "baseline" also has a precise meaning. According to <a href="https://www.acn.gov.it/portale/faq/nis/misure-di-sicurezza-e-notifica-di-incidenti" target="_blank" rel="noopener">ACN FAQ MSB.4</a>, it refers to the measures adopted during the first application phase of the decree under Article 42, which governs that phase.</p>

<h2>How many measures are there and how are they organised?</h2>
<p>Important entities must adopt 37 measures, broken down into 87 requirements; essential entities must adopt 43 measures, with 116 requirements. Each measure has a code, a description and one or more requirements, and follows the structure of the Italian National Framework for Cybersecurity and Data Protection, 2025 edition.</p>
<p>The figures are given in section 2.1 of the <a href="https://www.acn.gov.it/portale/documents/d/guest/guida-alla-lettura-specifiche-di-base" target="_blank" rel="noopener">reading guide to the baseline specifications</a> published by ACN. The code takes the form XX.YY-NN, where the first pair of letters indicates the function, the second the category and the number the subcategory of the Framework. For example, PR.DS-11 belongs to the Protect function and the Data Security category, and concerns backups.</p>
<p>The requirements, in turn, say what must be done in practice. ACN clarifies in FAQ MSB.6 that adopting the measures means implementing all the requirements; covering a measure in general terms is therefore not enough.</p>
<p>There are six functions. The table shows the number of measures in each, counted on <a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-1-v2" target="_blank" rel="noopener">Annex 1</a> and <a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-2-v2" target="_blank" rel="noopener">Annex 2</a>.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Function</th><th>What it covers, in brief</th><th>Important entities</th><th>Essential entities</th></tr>
    </thead>
    <tbody>
      <tr><td>Govern (GV)</td><td>Relevant systems, risk management, roles, policies, suppliers</td><td>11</td><td>11</td></tr>
      <tr><td>Identify (ID)</td><td>Inventories, risk assessment and treatment, vulnerabilities, improvement and continuity plans</td><td>9</td><td>10</td></tr>
      <tr><td>Protect (PR)</td><td>Accounts and access, training, encryption and backups, updates, logs, networks</td><td>12</td><td>16</td></tr>
      <tr><td>Detect (DE)</td><td>Network monitoring and endpoint protection</td><td>2</td><td>2</td></tr>
      <tr><td>Respond (RS)</td><td>Incident management plan and communications</td><td>2</td><td>2</td></tr>
      <tr><td>Recover (RC)</td><td>Recovery after an incident</td><td>1</td><td>2</td></tr>
      <tr><td><strong>Total</strong></td><td></td><td><strong>37</strong></td><td><strong>43</strong></td></tr>
    </tbody>
  </table>
</div>

<p>As the table shows, the weight lies on governance. The reading guide notes in section 2.4 that most requirements are organisational, i.e. they concern policies, roles, plans and procedures; technology tools should support the processes defined by the organisation.</p>

<h2>The six additional measures for essential entities</h2>
<p>The additional measures for essential entities stem from Article 31 of the decree, which calls for obligations proportionate to risk exposure, the size of the entity and the social and economic impact of incidents. According to the reading guide, 27 measures have identical requirements for both categories, 10 have additional requirements for essential entities and 6 apply to essential entities only.</p>
<p>The six measures found only in Annex 2 are the following.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Measure</th><th>What it requires</th></tr>
    </thead>
    <tbody>
      <tr><td>ID.AM-03</td><td>An up-to-date inventory of network flows between the entity's systems and the outside</td></tr>
      <tr><td>PR.AT-02</td><td>Dedicated training for staff in specialised roles, including system administrators</td></tr>
      <tr><td>PR.PS-01</td><td>Secure (hardened) baseline configurations for relevant systems, documented in an up-to-date list</td></tr>
      <tr><td>PR.PS-03</td><td>Procedures for the physical transfer and secure disposal of devices that store data, and records of hardware maintenance</td></tr>
      <tr><td>PR.IR-03</td><td>Secured emergency communication systems, based on the outcome of the risk assessment</td></tr>
      <tr><td>RC.CO-03</td><td>Procedures for informing internal units about recovery activities after an incident</td></tr>
    </tbody>
  </table>
</div>

<p>Among the additional requirements attached to shared measures, some carry real practical weight. For relevant systems, Annex 2 requires periodic vulnerability assessments or penetration tests, and in any case before systems go live (ID.RA-01); it also requires physical protection or encryption of backups and periodic restore tests (PR.DS-11), as well as tools to analyse and filter inbound traffic, including email (DE.CM-01).</p>

<h2>The clauses that make the measures risk-proportionate</h2>
<p>Not every requirement applies in the same way to every system. Section 2.3 of the reading guide identifies four clauses that scale the obligations according to risk.</p>
<ul>
  <li><strong>"For at least the relevant network and information systems"</strong>, which allows the requirement to be limited to systems whose compromise would have a significant impact on the activities and services for which the entity falls within NIS2;</li>
  <li><strong>"in accordance with the outcome of the risk assessment under measure ID.RA-05"</strong>, which leaves it to the risk assessment to decide how and where the requirement applies;</li>
  <li><strong>"save for justified and documented regulatory or technical reasons"</strong>, which allows a derogation, provided it is justified, documented and, where applicable, accompanied by compensating measures described in the risk treatment plan (ID.RA-06);</li>
  <li><strong>"supplies with potential impacts on the security of network and information systems"</strong>, which limits certain supplier obligations to relevant supplies only.</li>
</ul>
<p>It follows that the first step is to draw up the up-to-date list of relevant systems required by measure GV.OC-04. The guide suggests a three-step method; identify the activities and services for which the entity falls within NIS2, assess the impact a compromise of the systems would have on them, and classify as relevant the systems with a significant impact. No specific methodology is required.</p>
<p>An example shows how this works. The multi-factor authentication requirement (PR.AA-03, point 2) applies at least to relevant systems and in line with the risk assessment; the guide therefore accepts that, for an isolated system already protected by physical access controls, the risk may be acceptable even without multi-factor authentication.</p>
<p>The same approach applies to suppliers. According to ACN FAQ MSB.12, existing contracts do not need to be amended; security requirements must be included in contracts signed, renewed or extended from the deadline for adopting the measures.</p>

<h2>Which documents are needed and which must the board approve?</h2>
<p>Lists, inventories, plans, policies, procedures and records are needed, which the organisation may gather in one or more documents. Eleven of these documents, from the security policies to the incident management plan, must be approved by the management bodies, in implementation of Article 23 of the NIS decree.</p>
<p>ACN FAQ MSB.11 lists the main documentary evidence.</p>
<ul>
  <li><strong>Lists</strong>, namely the staff of the cybersecurity organisation, the systems accessible remotely and, for essential entities only, the baseline configurations;</li>
  <li><strong>inventories</strong> of physical devices, of services and software, of services provided by suppliers and of suppliers, plus network flows for essential entities only;</li>
  <li><strong>plans</strong>, including risk management and treatment, business continuity and disaster recovery, vulnerability management, improvement, training and incident response;</li>
  <li><strong>cybersecurity policies</strong>, for the sixteen areas listed in measure GV.PO-01 and at least for the requirements shown in Table 1 in the appendix to the annexes;</li>
  <li><strong>procedures</strong>, for the requirements that expressly call for them;</li>
  <li><strong>records</strong>, such as the staff training record and, for essential entities only, records of policy review outcomes and hardware maintenance.</li>
</ul>
<p>Policies must be reviewed at least once a year, under measure GV.PO-02; the risk assessment and continuity plans must be reviewed at least every two years and, in any case, after a significant incident or a change in threat exposure. FAQ MSB.11 states that documents must reflect the current situation and may be kept on paper or in digital form.</p>
<p>Appendix C of the reading guide lists the documents that the management bodies must approve.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Document to be approved</th><th>Reference measure</th></tr>
    </thead>
    <tbody>
      <tr><td>Cybersecurity organisation</td><td>GV.RR-02, point 1</td></tr>
      <tr><td>Cybersecurity policies</td><td>GV.PO-01, point 3</td></tr>
      <tr><td>Risk assessment</td><td>ID.RA-05, point 3</td></tr>
      <tr><td>Risk treatment plan, including acceptance of residual risks</td><td>ID.RA-06, point 3</td></tr>
      <tr><td>Vulnerability management plan</td><td>ID.RA-08, point 4</td></tr>
      <tr><td>Improvement plan</td><td>ID.IM-01, point 1</td></tr>
      <tr><td>Business continuity, disaster recovery and crisis management plans</td><td>ID.IM-04, point 4</td></tr>
      <tr><td>Training plan</td><td>PR.AT-01, point 2</td></tr>
      <tr><td>Incident management plan</td><td>RS.MA-01, point 2</td></tr>
    </tbody>
  </table>
</div>

<p>The board's involvement does not end with approval. The training plan must also cover the management bodies (PR.AT-01), and they must be kept informed through periodic reports on the outcome of the improvement plan (ID.IM-01).</p>

<h2>By when must the baseline security measures be adopted?</h2>
<p>The deadline is eighteen months from receipt of the notice of inclusion in the list of NIS entities, as set by Article 3 of determination no. 379907/2025. For entities included for the first time in 2026, however, ACN determination no. 127434/2026 sets a single date, 31 July 2027.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Entities</th><th>Security measures (Annexes 1 and 2)</th><th>Incident notification (Annexes 3 and 4)</th></tr>
    </thead>
    <tbody>
      <tr><td>Included in the list in 2025</td><td>Eighteen months from the notice; ACN indicates October 2026</td><td>Nine months from the notice; ACN indicates January 2026</td></tr>
      <tr><td>Included for the first time in 2026</td><td>By 31 July 2027</td><td>From 1 January 2027</td></tr>
    </tbody>
  </table>
</div>

<p>The October 2026 and January 2026 indications come from the <a href="https://www.acn.gov.it/portale/nis/modalita-specifiche-base" target="_blank" rel="noopener">ACN page on the baseline specifications</a>; the dates for 2026 entities are set by Article 1 of <a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_misuresicurezza-v4_post" target="_blank" rel="noopener">ACN determination no. 127434/2026</a>, applicable from 30 April 2026. Article 1(3) of the same determination confirms that, for entities included in 2025 and still on the 2026 list, the original deadlines remain unchanged.</p>
<p>ACN sent the first inclusion notices from 12 April 2025, as stated in the reading guide; for those entities, therefore, the deadline for the measures has already passed. Anyone who has not completed the work should bear in mind Article 24(4) of the NIS decree, under which an entity that finds it is not compliant must take the necessary corrective measures without undue delay.</p>
<p>Two special regimes complete the picture. Former operators of essential services and the telecom operators identified in the determination maintain, on the systems concerned, the measures already adopted under the previous rules, as provided by Articles 5 and 6 of determination no. 379907/2025, without prejudice to the new obligations and their deadlines.</p>

<h2>Conclusions</h2>
<p>Baseline security measures turn the general NIS2 obligations into a precise list of requirements. They are more numerous for essential entities, but in both cases they rest mainly on governance, documentation and board approval; the risk-based clauses, however, make it possible to focus effort on the systems that really matter.</p>
<p>In practice, it makes sense to proceed in this order:</p>
<ol>
  <li>draw up the list of relevant network and information systems (GV.OC-04);</li>
  <li>carry out and document the risk assessment, including supplier risk (ID.RA-05 and GV.SC-07);</li>
  <li>define the risk treatment plan, with any justified derogations and compensating measures (ID.RA-06);</li>
  <li>adopt policies and plans and submit them to the management bodies for approval;</li>
  <li>implement and document the technical controls, requirement by requirement.</li>
</ol>
<p>For the other obligations, from registration to incident notification, see the <a href="/risorse/nis2">complete NIS2 guide</a>.</p>

<p><strong>To check where your organisation stands</strong>, <a href="/inizia">RegulaeOS's NIS2 gap analysis</a> lets you compare the measures in place with the requirements of the applicable annex of the ACN determination and gather the documentary evidence in one place.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_obblighi_2511-v3_signed" target="_blank" rel="noopener">ACN, determination no. 379907 of 19 December 2025 (baseline specifications)</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-1-v2" target="_blank" rel="noopener">ACN, Annex 1, baseline security measures for important entities</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/allegato-2-v2" target="_blank" rel="noopener">ACN, Annex 2, baseline security measures for essential entities</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/guida-alla-lettura-specifiche-di-base" target="_blank" rel="noopener">ACN, NIS guidelines, baseline specifications, reading guide (version 2.1, April 2026)</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_misuresicurezza-v4_post" target="_blank" rel="noopener">ACN, determination no. 127434/2026 (deadlines for entities included in 2026)</a></li>
  <li><a href="https://www.acn.gov.it/portale/nis/modalita-specifiche-base" target="_blank" rel="noopener">ACN, "Modalità e specifiche di base" page</a></li>
  <li><a href="https://www.acn.gov.it/portale/faq/nis/misure-di-sicurezza-e-notifica-di-incidenti" target="_blank" rel="noopener">ACN, NIS FAQ, security measures and incident notification</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art24" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 24 (risk-management measures), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art31" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 31 (proportionality and gradual implementation), Normattiva</a></li>
</ul>
`,
    },
  },
  {
    slug: "nis-nis2-differenze",
    title: "NIS e NIS2, differenze e cosa cambia per le aziende",
    excerpt:
      "La NIS2 ha sostituito la prima direttiva NIS e, in Italia, il D.Lgs. 138/2024 ha abrogato il D.Lgs. 65/2018. Settori, criteri di individuazione, obblighi, responsabilità degli amministratori e sanzioni a confronto, con il rinvio puntuale agli articoli.",
    date: "12 novembre 2026",
    dateISO: "2026-11-12",
    author: { name: "Umberto Mottola", jobTitle: "Avvocato, CIPP/E" },
    dateModifiedISO: "2026-11-12",
    readTime: "9 min",
    category: "Normativa",
    tags: ["NIS2", "NIS", "NIS e NIS2", "NIS II", "differenze NIS NIS2", "D.Lgs. 65/2018", "D.Lgs. 138/2024", "direttiva 2016/1148"],
    metaTitle: "NIS e NIS2, differenze e cosa cambia per le aziende",
    metaDescription:
      "NIS e NIS2 a confronto. Settori, soggetti, obblighi, notifica degli incidenti, responsabilità del vertice e sanzioni, con i rinvii a direttive e decreti.",
    faqSchema: [
      {
        q: "La direttiva NIS è ancora in vigore?",
        a: "No. L'art. 44 della direttiva (UE) 2022/2555 ha abrogato la direttiva (UE) 2016/1148 a decorrere dal 18 ottobre 2024. In Italia l'art. 41 del D.Lgs. 138/2024 ha abrogato dalla stessa data il D.Lgs. 65/2018, salvo due commi abrogati dal 1° gennaio 2025.",
      },
      {
        q: "Qual è la differenza principale tra NIS e NIS2?",
        a: "Con la NIS erano gli Stati membri a individuare gli operatori di servizi essenziali; con la NIS2 rientra nell'ambito, di regola, ogni media o grande impresa che opera in uno dei 18 settori elencati negli allegati I e II della direttiva. Ne conseguono un ambito molto più ampio, obblighi più dettagliati e sanzioni fissate dalla legge.",
      },
      {
        q: "Chi era operatore di servizi essenziali rientra automaticamente nella NIS2?",
        a: "L'art. 3, comma 9, lettera a), del D.Lgs. 138/2024 consente di includere gli ex operatori di servizi essenziali a prescindere dalle dimensioni, ma tramite individuazione da parte dell'ACN su proposta delle Autorità di settore (comma 13). Se l'impresa supera le soglie dimensionali e opera in un settore elencato, rientra comunque nell'ambito in base alla regola generale.",
      },
      {
        q: "NIS II, NIS 2 e NIS2 sono la stessa cosa?",
        a: "Sì. Sono tre modi di indicare la direttiva (UE) 2022/2555, che in Italia è stata recepita con il D.Lgs. 4 settembre 2024, n. 138, chiamato decreto NIS.",
      },
      {
        q: "Le sanzioni della NIS2 sono più alte di quelle della NIS?",
        a: "La prima direttiva NIS si limitava a chiedere sanzioni effettive, proporzionate e dissuasive, lasciando gli importi agli Stati. La NIS2 fissa invece i massimi; in Italia l'art. 38 del decreto NIS prevede fino a 10 milioni di euro o il 2% del fatturato mondiale per i soggetti essenziali e fino a 7 milioni o l'1,4% per i soggetti importanti.",
      },
    ],
    content: `
<p><em>Avv. Umberto Mottola, CIPP/E · aggiornato al 12 nov 2026</em></p>

<p class="ac-tldr">
  <strong>In sintesi.</strong> La NIS2, ossia la direttiva (UE) 2022/2555, ha sostituito dal 18 ottobre 2024 la prima direttiva NIS del 2016; in Italia il D.Lgs. 138/2024 ha abrogato il D.Lgs. 65/2018. Le differenze principali sono quattro; i settori passano da 7 a 18, i soggetti si individuano con una regola dimensionale, obblighi e responsabilità degli amministratori diventano espliciti e le sanzioni massime sono fissate dalla legge.
</p>

<p>Chi cerca le differenze tra NIS e NIS2 vuole di solito capire una cosa precisa, ossia se le regole che la propria azienda conosceva, o ignorava, sotto la vecchia disciplina valgono ancora. La risposta è negativa; la prima direttiva NIS è stata abrogata e la NIS2 non si limita ad aggiornarla, ma ne cambia l'impostazione.</p>
<p>Questo articolo mette a confronto i due regimi, punto per punto, con il rinvio agli articoli delle direttive e dei decreti di recepimento. Per una panoramica completa degli obblighi si rinvia alla <a href="/risorse/nis2">guida alla NIS2</a>; per le scadenze aggiornate, alla pagina sullo <a href="/risorse/nis2-stato-attuazione-italia-europa">stato di attuazione della NIS2</a>.</p>

<h2>Che cos'era la prima direttiva NIS?</h2>
<p>La prima direttiva NIS è la <a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32016L1148" target="_blank" rel="noopener">direttiva (UE) 2016/1148</a>, recepita in Italia con il D.Lgs. 18 maggio 2018, n. 65. Imponeva misure di sicurezza e la notifica degli incidenti a due sole categorie, gli operatori di servizi essenziali (OSE), individuati da ciascuno Stato membro, e i fornitori di servizi digitali (FSD).</p>
<p>Il meccanismo degli OSE era affidato agli Stati. L'art. 5 della direttiva, che disciplinava l'identificazione degli operatori, chiedeva a ogni Stato di individuarli entro il 9 novembre 2018 sulla base di tre criteri; il servizio doveva essere essenziale per attività sociali o economiche fondamentali, doveva dipendere dalla rete e dai sistemi informativi, e un incidente doveva poter avere effetti negativi rilevanti sulla sua fornitura.</p>
<p>I settori degli OSE, elencati nell'allegato II, erano sette.</p>
<ol>
  <li>Energia;</li>
  <li>trasporti;</li>
  <li>settore bancario;</li>
  <li>infrastrutture dei mercati finanziari;</li>
  <li>settore sanitario;</li>
  <li>fornitura e distribuzione di acqua potabile;</li>
  <li>infrastrutture digitali.</li>
</ol>
<p>I fornitori di servizi digitali, invece, erano individuati dall'allegato III in tre tipologie, ossia mercati online, motori di ricerca online e servizi cloud. Per entrambe le categorie gli artt. 14 e 16 della direttiva, che fissavano gli obblighi di sicurezza e di notifica, chiedevano di notificare gli incidenti con impatto rilevante senza indebito ritardo, ma senza termini orari precisi.</p>

<h2>Quali sono le differenze tra NIS e NIS2?</h2>
<p>Le differenze riguardano tutti gli elementi della disciplina; l'ambito, il modo in cui si individuano i soggetti, il contenuto delle misure, i tempi di notifica, il ruolo degli amministratori e le sanzioni. La NIS2 stessa spiega, al considerando 6, che la distinzione tra OSE e FSD si era rivelata obsoleta.</p>
<p>La tabella mette a confronto i due regimi.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Aspetto</th><th>NIS (direttiva 2016/1148)</th><th>NIS2 (direttiva 2022/2555)</th></tr>
    </thead>
    <tbody>
      <tr><td>Recepimento in Italia</td><td>D.Lgs. 65/2018</td><td>D.Lgs. 138/2024 (decreto NIS)</td></tr>
      <tr><td>Settori</td><td>7 settori per gli OSE (allegato II) e 3 tipi di servizi digitali (allegato III)</td><td>18 settori, di cui 11 ad alta criticità (allegato I) e 7 critici (allegato II)</td></tr>
      <tr><td>Individuazione dei soggetti</td><td>Designazione degli OSE da parte di ciascuno Stato (art. 5)</td><td>Regola dimensionale uniforme, con eccezioni a prescindere dalle dimensioni (art. 2)</td></tr>
      <tr><td>Categorie</td><td>Operatori di servizi essenziali e fornitori di servizi digitali</td><td>Soggetti essenziali e soggetti importanti (art. 3)</td></tr>
      <tr><td>Misure di sicurezza</td><td>Misure tecniche e organizzative adeguate e proporzionate</td><td>Approccio multirischio con almeno dieci elementi obbligatori (art. 21, par. 2)</td></tr>
      <tr><td>Notifica degli incidenti</td><td>Senza indebito ritardo, senza termini orari</td><td>Preallarme entro 24 ore, notifica entro 72 ore, relazione finale entro un mese (art. 23)</td></tr>
      <tr><td>Organi di amministrazione</td><td>Nessun articolo dedicato</td><td>Approvano le misure, ne sovrintendono l'attuazione, ne rispondono e seguono una formazione (art. 20)</td></tr>
      <tr><td>Sanzioni</td><td>Effettive, proporzionate e dissuasive, con importi lasciati agli Stati (art. 21)</td><td>Massimi di almeno 10 milioni di euro o 2% del fatturato, e 7 milioni o 1,4% (art. 34)</td></tr>
    </tbody>
  </table>
</div>

<p>I dati della colonna NIS2 sono tratti dal <a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32022L2555" target="_blank" rel="noopener">testo della direttiva (UE) 2022/2555 su EUR-Lex</a>; quelli della colonna NIS dal testo della direttiva 2016/1148. Le sezioni che seguono spiegano le differenze che pesano di più nella pratica.</p>

<h2>Chi rientra nella NIS2 rispetto alla vecchia NIS?</h2>
<p>Con la NIS2 rientra di regola ogni impresa, pubblica o privata, che opera in uno dei settori degli allegati I e II e che è almeno una media impresa, ossia supera i massimali della piccola impresa fissati dalla raccomandazione 2003/361/CE. Non serve più una designazione dello Stato, come accadeva per gli OSE.</p>
<p>Il cambio di criterio è spiegato dal considerando 7 della direttiva; poiché sotto la NIS gli Stati individuavano gli operatori in modo molto diverso tra loro, il legislatore europeo ha scelto una regola della soglia di dimensione, uguale per tutti. In Italia la regola è ripresa dall'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art3" target="_blank" rel="noopener">art. 3 del decreto NIS</a>, che ne definisce l'ambito di applicazione e, al comma 2, lo estende ai soggetti degli allegati I e II che superano i massimali per le piccole imprese.</p>
<p>Restano alcune eccezioni, nel senso che determinati soggetti rientrano a prescindere dalle dimensioni. L'art. 2 della direttiva cita, tra gli altri, i fornitori di reti e servizi di comunicazione elettronica accessibili al pubblico, i prestatori di servizi fiduciari e i registri dei nomi di dominio di primo livello; l'art. 3, comma 9, del decreto NIS aggiunge i soggetti che l'ACN individua, su proposta delle Autorità di settore, perché ad esempio unici fornitori nazionali di un servizio essenziale o elementi sistemici della catena di approvvigionamento.</p>
<p>Due ulteriori novità meritano attenzione. La prima riguarda gli ex fornitori di servizi digitali, poiché mercati online e motori di ricerca figurano ora nell'allegato II tra i fornitori di servizi digitali, insieme alle piattaforme di social network; la seconda riguarda i gruppi, poiché l'art. 3, comma 10, del decreto NIS applica la disciplina anche all'impresa collegata a un soggetto NIS, indipendentemente dalle dimensioni, se ad esempio ne gestisce i sistemi informativi o ne decide le misure di sicurezza.</p>

<h2>Obblighi più dettagliati e responsabilità del vertice</h2>
<p>Sotto la NIS gli obblighi di sicurezza erano formulati in termini generali. La NIS2, invece, indica un contenuto minimo; l'art. 21, par. 2, della direttiva, che disciplina le misure di gestione dei rischi, elenca dieci elementi che ogni soggetto deve coprire.</p>
<ol>
  <li>Politiche di analisi dei rischi e di sicurezza dei sistemi informatici;</li>
  <li>gestione degli incidenti;</li>
  <li>continuità operativa, compresi backup, ripristino in caso di disastro e gestione delle crisi;</li>
  <li>sicurezza della catena di approvvigionamento, compresi i rapporti con i diretti fornitori;</li>
  <li>sicurezza dell'acquisizione, dello sviluppo e della manutenzione dei sistemi, compresa la gestione delle vulnerabilità;</li>
  <li>procedure per valutare l'efficacia delle misure;</li>
  <li>igiene informatica di base e formazione;</li>
  <li>uso della crittografia e, se del caso, della cifratura;</li>
  <li>sicurezza delle risorse umane, controllo degli accessi e gestione degli attivi;</li>
  <li>autenticazione a più fattori e comunicazioni protette, se del caso.</li>
</ol>
<p>La novità più rilevante sul piano della governance, tuttavia, è un'altra. L'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art23" target="_blank" rel="noopener">art. 23 del decreto NIS</a>, che recepisce l'art. 20 della direttiva, stabilisce che gli organi di amministrazione e direttivi approvano le modalità di attuazione delle misure, sovrintendono agli obblighi, sono responsabili delle violazioni e devono seguire una formazione in materia di sicurezza informatica. La sicurezza, dunque, cessa di essere un tema solo tecnico e diventa una responsabilità del vertice.</p>
<p>Cambia infine la notifica degli incidenti. L'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art25" target="_blank" rel="noopener">art. 25 del decreto NIS</a>, che disciplina la notifica al CSIRT Italia, prevede una pre-notifica entro 24 ore da quando si viene a conoscenza dell'incidente significativo, una notifica entro 72 ore e una relazione finale entro un mese dalla notifica; se l'incidente è ancora in corso, si inviano relazioni mensili sui progressi e la relazione finale entro un mese dalla conclusione della gestione. Al posto del generico "senza indebito ritardo" della NIS, quindi, vi sono termini precisi e contenuti predefiniti.</p>

<h2>Cosa succede a chi era già operatore di servizi essenziali?</h2>
<p>Il vecchio regime non sopravvive. L'art. 41 del decreto NIS ha abrogato il D.Lgs. 65/2018 dal 18 ottobre 2024, salvo due commi abrogati dal 1° gennaio 2025; gli ex OSE, perciò, sono soggetti alle sole regole della NIS2, e possono esservi inclusi anche a prescindere dalle dimensioni.</p>
<p>L'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art41" target="_blank" rel="noopener">art. 41 del decreto</a>, intitolato al regime transitorio e alle abrogazioni, dispone inoltre che il nuovo decreto si applica dal 18 ottobre 2024; i due commi abrogati più tardi sono l'art. 7, comma 8, e l'art. 8, comma 10, del D.Lgs. 65/2018. Quanto all'inclusione, l'art. 3, comma 9, lettera a), del decreto NIS prevede che possano rientrare, indipendentemente dalle dimensioni, i soggetti identificati come OSE prima della sua entrata in vigore; l'individuazione spetta all'ACN, su proposta delle Autorità di settore, secondo il comma 13 dello stesso articolo.</p>
<p>Ne consegue che l'ex OSE non può limitarsi a mantenere le misure adottate in passato. Deve verificare la propria posizione nel nuovo elenco e adeguarsi ai nuovi requisiti nei termini previsti; per la fase di prima applicazione, l'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art42" target="_blank" rel="noopener">art. 42 del decreto</a> fissava, fino al 31 dicembre 2025, nove mesi per gli obblighi di notifica e diciotto mesi per gli obblighi degli artt. 23, 24 e 29, decorrenti dalla comunicazione di inserimento nell'elenco. Le scadenze successive sono riportate nella pagina sullo <a href="/risorse/nis2-stato-attuazione-italia-europa">stato di attuazione della NIS2</a>.</p>

<h2>Sanzioni, dalla clausola generale agli importi fissati dalla legge</h2>
<p>La direttiva del 2016 si limitava a chiedere, all'art. 21, sanzioni effettive, proporzionate e dissuasive, lasciando agli Stati la scelta degli importi. La NIS2, al contrario, fissa all'art. 34 i massimi che ogni Stato deve prevedere come minimo, e il decreto italiano li ha recepiti.</p>
<p>L'<a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art38" target="_blank" rel="noopener">art. 38 del decreto NIS</a>, che disciplina le sanzioni amministrative, distingue due fasce.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Violazione</th><th>Soggetti essenziali</th><th>Soggetti importanti</th></tr>
    </thead>
    <tbody>
      <tr><td>Obblighi degli organi di amministrazione, misure di sicurezza e notifica degli incidenti (artt. 23, 24 e 25)</td><td>Fino a 10 milioni di euro o al 2% del fatturato mondiale annuo, se superiore; minimo pari a un ventesimo del massimo</td><td>Fino a 7 milioni di euro o all'1,4% del fatturato mondiale annuo, se superiore; minimo pari a un trentesimo del massimo</td></tr>
      <tr><td>Registrazione, categorizzazione delle attività, collaborazione con ACN e CSIRT Italia</td><td>Fino allo 0,1% del fatturato mondiale annuo</td><td>Fino allo 0,07% del fatturato mondiale annuo</td></tr>
    </tbody>
  </table>
</div>

<p>Per le pubbliche amministrazioni essenziali la sanzione per le violazioni più gravi va da 25.000 a 125.000 euro, ridotta di un terzo per quelle importanti. Due previsioni, inoltre, non hanno equivalenti nella vecchia disciplina; in caso di mancata o tardiva registrazione si contestano tutte le violazioni e si applica la sanzione più grave aumentata fino al triplo (comma 13), e, se il soggetto non ottempera a una diffida, l'ACN può disporre nei confronti degli amministratori la sanzione accessoria dell'incapacità a svolgere funzioni dirigenziali nel medesimo soggetto (comma 6).</p>

<h2>Conclusioni</h2>
<p>La NIS2 non è una semplice revisione della NIS. Sostituisce la designazione caso per caso con una regola dimensionale, estende l'ambito da 7 a 18 settori, fissa un contenuto minimo delle misure, scandisce la notifica degli incidenti in termini orari e pone la responsabilità in capo agli amministratori, con sanzioni fissate dalla legge. Chi era già OSE deve quindi rileggere la propria posizione alla luce del D.Lgs. 138/2024, mentre molte imprese che la vecchia NIS non toccava si trovano oggi pienamente nell'ambito.</p>
<p>Per gli obblighi nel dettaglio si rinvia alla <a href="/risorse/nis2">guida completa alla NIS2</a>.</p>

<p><strong>Per verificare a che punto è la tua organizzazione</strong>, <a href="/inizia">la gap analysis NIS2 di RegulaeOS</a> permette di confrontare le misure adottate con i requisiti della determinazione ACN e di raccogliere in un unico posto le prove documentali.</p>

<h2>Fonti</h2>
<ul>
  <li><a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32016L1148" target="_blank" rel="noopener">Direttiva (UE) 2016/1148 (NIS), EUR-Lex</a></li>
  <li><a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32022L2555" target="_blank" rel="noopener">Direttiva (UE) 2022/2555 (NIS2), EUR-Lex</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art3" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 3 (ambito di applicazione), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art23" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 23 (organi di amministrazione e direttivi), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art25" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 25 (notifica degli incidenti), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art38" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 38 (sanzioni amministrative), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art41" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 41 (regime transitorio e abrogazioni), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art42" target="_blank" rel="noopener">D.Lgs. 138/2024, art. 42 (fase di prima applicazione), Normattiva</a></li>
</ul>
`,
    en: {
      title: "NIS and NIS2: differences and what changes for companies",
      excerpt:
        "NIS2 replaced the first NIS Directive and, in Italy, Legislative Decree 138/2024 repealed Legislative Decree 65/2018. Sectors, identification criteria, obligations, directors' liability and penalties compared, with precise references to the articles.",
      date: "12 November 2026",
      readTime: "9 min",
      category: "Regulation",
      tags: ["NIS2", "NIS", "NIS and NIS2", "NIS II", "NIS vs NIS2", "Legislative Decree 65/2018", "Legislative Decree 138/2024", "Directive 2016/1148"],
      metaTitle: "NIS vs NIS2: differences and what changes for companies",
      metaDescription:
        "NIS and NIS2 compared. Sectors, entities, obligations, incident notification, management liability and penalties, with references to directives and decrees.",
      faqSchema: [
        {
          q: "Is the NIS Directive still in force?",
          a: "No. Article 44 of Directive (EU) 2022/2555 repealed Directive (EU) 2016/1148 with effect from 18 October 2024. In Italy, Article 41 of Legislative Decree 138/2024 repealed Legislative Decree 65/2018 from the same date, except for two paragraphs repealed from 1 January 2025.",
        },
        {
          q: "What is the main difference between NIS and NIS2?",
          a: "Under NIS, Member States identified operators of essential services; under NIS2, as a rule, every medium-sized or large enterprise operating in one of the 18 sectors listed in Annexes I and II of the directive is in scope. The result is a much wider scope, more detailed obligations and penalties set by law.",
        },
        {
          q: "Are former operators of essential services automatically covered by NIS2?",
          a: "Article 3(9)(a) of Legislative Decree 138/2024 allows former operators of essential services to be included regardless of size, but through identification by ACN on a proposal from the sector authorities (paragraph 13). If the enterprise exceeds the size thresholds and operates in a listed sector, it is in scope anyway under the general rule.",
        },
        {
          q: "Are NIS II, NIS 2 and NIS2 the same thing?",
          a: "Yes. They are three ways of referring to Directive (EU) 2022/2555, which Italy transposed by Legislative Decree no. 138 of 4 September 2024, known as the NIS decree.",
        },
        {
          q: "Are NIS2 penalties higher than NIS penalties?",
          a: "The first NIS Directive merely required effective, proportionate and dissuasive penalties, leaving the amounts to Member States. NIS2 instead sets the maximums; in Italy, Article 38 of the NIS decree provides for up to EUR 10 million or 2% of worldwide turnover for essential entities and up to EUR 7 million or 1.4% for important entities.",
        },
      ],
      content: `
<p><em>Avv. Umberto Mottola, CIPP/E · updated 12 Nov 2026</em></p>

<p class="ac-tldr">
  <strong>In short.</strong> NIS2, i.e. Directive (EU) 2022/2555, replaced the first NIS Directive of 2016 from 18 October 2024; in Italy, Legislative Decree 138/2024 repealed Legislative Decree 65/2018. There are four main differences; sectors grow from 7 to 18, entities are identified through a size rule, obligations and directors' liability become explicit, and maximum penalties are set by law.
</p>

<p>Anyone looking for the differences between NIS and NIS2 usually wants to know one specific thing, namely whether the rules their company knew, or ignored, under the old framework still apply. The answer is no; the first NIS Directive has been repealed, and NIS2 does not merely update it but changes its whole approach.</p>
<p>This article compares the two regimes point by point, with references to the articles of the directives and of the transposing decrees. For a full overview of the obligations, see the <a href="/risorse/nis2">NIS2 guide</a>; for up-to-date deadlines, see the page on the <a href="/risorse/nis2-stato-attuazione-italia-europa">NIS2 implementation status</a>.</p>

<h2>What was the first NIS Directive?</h2>
<p>The first NIS Directive is <a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32016L1148" target="_blank" rel="noopener">Directive (EU) 2016/1148</a>, transposed in Italy by Legislative Decree no. 65 of 18 May 2018. It imposed security measures and incident notification on only two categories, operators of essential services (OES), identified by each Member State, and digital service providers (DSP).</p>
<p>The OES mechanism was left to the Member States. Article 5 of the directive, which governed the identification of operators, required each State to identify them by 9 November 2018 on the basis of three criteria; the service had to be essential for critical societal or economic activities, it had to depend on network and information systems, and an incident had to be capable of having significant disruptive effects on its provision.</p>
<p>The OES sectors, listed in Annex II, were seven.</p>
<ol>
  <li>Energy;</li>
  <li>transport;</li>
  <li>banking;</li>
  <li>financial market infrastructures;</li>
  <li>health sector;</li>
  <li>drinking water supply and distribution;</li>
  <li>digital infrastructure.</li>
</ol>
<p>Digital service providers, by contrast, were identified in Annex III in three types, namely online marketplaces, online search engines and cloud computing services. For both categories, Articles 14 and 16 of the directive, which set out the security and notification obligations, required incidents with a significant impact to be notified without undue delay, but without precise hourly deadlines.</p>

<h2>What are the differences between NIS and NIS2?</h2>
<p>The differences concern every element of the framework; the scope, the way entities are identified, the content of the measures, the notification deadlines, the role of directors and the penalties. NIS2 itself explains, in recital 6, that the distinction between OES and DSP had proved obsolete.</p>
<p>The table compares the two regimes.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Aspect</th><th>NIS (Directive 2016/1148)</th><th>NIS2 (Directive 2022/2555)</th></tr>
    </thead>
    <tbody>
      <tr><td>Transposition in Italy</td><td>Legislative Decree 65/2018</td><td>Legislative Decree 138/2024 (NIS decree)</td></tr>
      <tr><td>Sectors</td><td>7 sectors for OES (Annex II) and 3 types of digital services (Annex III)</td><td>18 sectors, 11 of high criticality (Annex I) and 7 critical (Annex II)</td></tr>
      <tr><td>Identification of entities</td><td>Designation of OES by each Member State (Art. 5)</td><td>Uniform size-cap rule, with exceptions regardless of size (Art. 2)</td></tr>
      <tr><td>Categories</td><td>Operators of essential services and digital service providers</td><td>Essential entities and important entities (Art. 3)</td></tr>
      <tr><td>Security measures</td><td>Appropriate and proportionate technical and organisational measures</td><td>All-hazards approach with at least ten mandatory elements (Art. 21(2))</td></tr>
      <tr><td>Incident notification</td><td>Without undue delay, no hourly deadlines</td><td>Early warning within 24 hours, notification within 72 hours, final report within one month (Art. 23)</td></tr>
      <tr><td>Management bodies</td><td>No dedicated article</td><td>Approve the measures, oversee implementation, are liable and must undergo training (Art. 20)</td></tr>
      <tr><td>Penalties</td><td>Effective, proportionate and dissuasive, amounts left to Member States (Art. 21)</td><td>Maximums of at least EUR 10 million or 2% of turnover, and EUR 7 million or 1.4% (Art. 34)</td></tr>
    </tbody>
  </table>
</div>

<p>The NIS2 column is based on the <a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32022L2555" target="_blank" rel="noopener">text of Directive (EU) 2022/2555 on EUR-Lex</a>; the NIS column on the text of Directive 2016/1148. The following sections explain the differences that matter most in practice.</p>

<h2>Who is covered by NIS2 compared with the old NIS?</h2>
<p>Under NIS2, as a rule, every public or private enterprise operating in one of the sectors of Annexes I and II that is at least a medium-sized enterprise, i.e. exceeds the small enterprise ceilings of Recommendation 2003/361/EC, is in scope. A State designation, as was required for OES, is no longer needed.</p>
<p>The change of criterion is explained in recital 7 of the directive; since under NIS Member States identified operators in very different ways, the EU legislator opted for a size-cap rule that is the same for everyone. In Italy the rule is set out in <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art3" target="_blank" rel="noopener">Article 3 of the NIS decree</a>, which defines its scope and, in paragraph 2, extends it to entities of the types in Annexes I and II that exceed the ceilings for small enterprises.</p>
<p>Some exceptions remain, in the sense that certain entities are in scope regardless of size. Article 2 of the directive mentions, among others, providers of public electronic communications networks and services, trust service providers and top-level domain name registries; Article 3(9) of the NIS decree adds entities that ACN identifies, on a proposal from the sector authorities, because they are, for example, the sole national provider of an essential service or systemic elements of the supply chain.</p>
<p>Two further novelties deserve attention. The first concerns former digital service providers, since online marketplaces and search engines now appear in Annex II among digital providers, together with social networking platforms; the second concerns groups, since Article 3(10) of the NIS decree also applies the rules to an enterprise linked to a NIS entity, regardless of size, if for example it manages its information systems or decides its security measures.</p>

<h2>More detailed obligations and management liability</h2>
<p>Under NIS, security obligations were framed in general terms. NIS2, by contrast, sets a minimum content; Article 21(2) of the directive, which governs cybersecurity risk-management measures, lists ten elements that every entity must cover.</p>
<ol>
  <li>Policies on risk analysis and information system security;</li>
  <li>incident handling;</li>
  <li>business continuity, including backup management, disaster recovery and crisis management;</li>
  <li>supply chain security, including relationships with direct suppliers;</li>
  <li>security in the acquisition, development and maintenance of systems, including vulnerability handling;</li>
  <li>procedures to assess the effectiveness of the measures;</li>
  <li>basic cyber hygiene and training;</li>
  <li>use of cryptography and, where appropriate, encryption;</li>
  <li>human resources security, access control and asset management;</li>
  <li>multi-factor authentication and secured communications, where appropriate.</li>
</ol>
<p>The most significant governance novelty, however, is another. <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art23" target="_blank" rel="noopener">Article 23 of the NIS decree</a>, which transposes Article 20 of the directive, provides that management and governing bodies approve the implementation arrangements for the measures, oversee the obligations, are liable for infringements and must undergo cybersecurity training. Security therefore ceases to be a purely technical matter and becomes a responsibility of top management.</p>
<p>Finally, incident notification changes. <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art25" target="_blank" rel="noopener">Article 25 of the NIS decree</a>, which governs notification to CSIRT Italia, provides for an early warning within 24 hours of becoming aware of the significant incident, a notification within 72 hours and a final report within one month of the notification; if the incident is still ongoing, monthly progress reports are sent and the final report is due within one month of the end of its handling. Instead of the generic "without undue delay" of NIS, there are precise deadlines and predefined content.</p>

<h2>What happens to former operators of essential services?</h2>
<p>The old regime does not survive. Article 41 of the NIS decree repealed Legislative Decree 65/2018 from 18 October 2024, except for two paragraphs repealed from 1 January 2025; former OES are therefore subject only to the NIS2 rules, and may be included even regardless of size.</p>
<p><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art41" target="_blank" rel="noopener">Article 41 of the decree</a>, headed transitional regime and repeals, also provides that the new decree applies from 18 October 2024; the two paragraphs repealed later are Article 7(8) and Article 8(10) of Legislative Decree 65/2018. As for inclusion, Article 3(9)(a) of the NIS decree provides that entities identified as OES before its entry into force may be covered regardless of size; identification is up to ACN, on a proposal from the sector authorities, under paragraph 13 of the same article.</p>
<p>It follows that a former OES cannot simply keep the measures it adopted in the past. It must check its position in the new list and comply with the new requirements within the set deadlines; for the initial implementation phase, <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art42" target="_blank" rel="noopener">Article 42 of the decree</a> set, until 31 December 2025, nine months for the notification obligations and eighteen months for the obligations under Articles 23, 24 and 29, running from the notice of inclusion in the list. Later deadlines are reported on the page on the <a href="/risorse/nis2-stato-attuazione-italia-europa">NIS2 implementation status</a>.</p>

<h2>Penalties, from a general clause to amounts set by law</h2>
<p>The 2016 directive merely required, in Article 21, effective, proportionate and dissuasive penalties, leaving the choice of amounts to Member States. NIS2, by contrast, sets in Article 34 the maximums that each State must provide for at least, and the Italian decree has transposed them.</p>
<p><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art38" target="_blank" rel="noopener">Article 38 of the NIS decree</a>, which governs administrative penalties, distinguishes two bands.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Infringement</th><th>Essential entities</th><th>Important entities</th></tr>
    </thead>
    <tbody>
      <tr><td>Obligations of management bodies, security measures and incident notification (Arts. 23, 24 and 25)</td><td>Up to EUR 10 million or 2% of worldwide annual turnover, whichever is higher; minimum of one twentieth of the maximum</td><td>Up to EUR 7 million or 1.4% of worldwide annual turnover, whichever is higher; minimum of one thirtieth of the maximum</td></tr>
      <tr><td>Registration, categorisation of activities, cooperation with ACN and CSIRT Italia</td><td>Up to 0.1% of worldwide annual turnover</td><td>Up to 0.07% of worldwide annual turnover</td></tr>
    </tbody>
  </table>
</div>

<p>For essential public administrations, the penalty for the most serious infringements ranges from EUR 25,000 to EUR 125,000, reduced by one third for important ones. Two provisions, moreover, have no equivalent in the old framework; in the event of failure to register or late registration, all infringements are charged and the most serious penalty applies, increased up to threefold (paragraph 13), and, if the entity fails to comply with a formal warning, ACN may impose on directors the ancillary penalty of incapacity to perform managerial functions within the same entity (paragraph 6).</p>

<h2>Conclusions</h2>
<p>NIS2 is not a mere revision of NIS. It replaces case-by-case designation with a size rule, extends the scope from 7 to 18 sectors, sets a minimum content for the measures, sets hourly deadlines for incident notification and places responsibility on directors, with penalties set by law. Former OES must therefore reassess their position in light of Legislative Decree 138/2024, while many enterprises that the old NIS did not touch are now fully in scope.</p>
<p>For the obligations in detail, see the <a href="/risorse/nis2">complete NIS2 guide</a>.</p>

<p><strong>Want to understand where your organisation stands?</strong> <a href="/inizia">The RegulaeOS NIS2 gap analysis</a> lets you compare the measures you have adopted with the requirements of the ACN determination and collect the documentary evidence in one place.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32016L1148" target="_blank" rel="noopener">Directive (EU) 2016/1148 (NIS), EUR-Lex</a></li>
  <li><a href="https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32022L2555" target="_blank" rel="noopener">Directive (EU) 2022/2555 (NIS2), EUR-Lex</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art3" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 3 (scope), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art23" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 23 (management bodies), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art25" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 25 (incident notification), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art38" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 38 (administrative penalties), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art41" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 41 (transitional regime and repeals), Normattiva</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138~art42" target="_blank" rel="noopener">Legislative Decree 138/2024, Art. 42 (initial implementation phase), Normattiva</a></li>
</ul>
`,
    },
  },
  {
    slug: "nis2",
    title: "NIS2, guida completa per le aziende italiane",
    excerpt:
      "Chi deve adeguarsi alla NIS2, che differenza c'è tra soggetti essenziali e importanti, quali obblighi scattano, come si notificano gli incidenti e quali sanzioni si rischiano: la guida passo per passo.",
    date: "12 novembre 2026",
    dateISO: "2026-11-12",
    author: { name: "Umberto Mottola", jobTitle: "Avvocato, CIPP/E" },
    dateModifiedISO: "2026-11-12",
    readTime: "12 min",
    category: "Guide",
    tags: ["NIS2", "NIS 2", "direttiva NIS2", "NIS2 obblighi", "NIS2 chi deve adeguarsi", "D.Lgs. 138/2024", "ACN"],
    metaTitle: "NIS2, guida completa per le aziende italiane (2026)",
    metaDescription:
      "Chi deve adeguarsi alla NIS2, differenze tra soggetti essenziali e importanti, obblighi, notifica incidenti e sanzioni. Guida aggiornata di un avvocato CIPP/E.",
    faqSchema: [
      {
        q: "La NIS2 si applica alle piccole imprese?",
        a: "Di regola no. Le micro e piccole imprese, ossia con meno di 50 dipendenti e fatturato o bilancio inferiore a 10 milioni di euro, restano fuori, salvo alcune categorie indicate dal decreto (come i fornitori di comunicazioni elettroniche e i prestatori di servizi fiduciari) e salvo individuazione da parte dell'ACN.",
      },
      {
        q: "Come faccio a sapere se la mia azienda è soggetta alla NIS2?",
        a: "Occorre verificare due elementi; se l'azienda svolge, anche in modo residuale, un'attività elencata negli allegati I, II, III o IV del D.Lgs. 138/2024, e se supera le soglie della piccola impresa. Il codice ATECO da solo non basta.",
      },
      {
        q: "Che differenza c'è tra soggetto essenziale e importante?",
        a: "I soggetti essenziali sono in genere le grandi imprese dei settori altamente critici e devono adottare più misure (allegato 2 della determinazione ACN n. 379907/2025); possono essere controllati anche in via preventiva e rischiano sanzioni più alte. I soggetti importanti adottano le misure dell'allegato 1 e sono controllati di regola dopo un evento o una segnalazione.",
      },
      {
        q: "Entro quanto tempo va notificato un incidente NIS2?",
        a: "La pre-notifica al CSIRT Italia va inviata entro 24 ore da quando si viene a conoscenza dell'incidente significativo, la notifica entro 72 ore e la relazione finale entro un mese dalla notifica.",
      },
      {
        q: "Un fornitore di un soggetto NIS deve adeguarsi alla NIS2?",
        a: "Non automaticamente. Secondo l'ACN il fornitore rientra nell'ambito solo se soddisfa a sua volta i criteri del decreto; in pratica, tuttavia, riceverà dal cliente requisiti di sicurezza contrattuali e potrà essere indicato come fornitore rilevante.",
      },
    ],
    content: `
<p><em>Avv. Umberto Mottola, CIPP/E · aggiornato al 12 nov 2026</em></p>

<p class="ac-tldr">
  <strong>In sintesi.</strong> La NIS2 è la direttiva europea che impone a medie e grandi organizzazioni di 18 settori di gestire il rischio informatico, adottare misure di sicurezza e notificare gli incidenti gravi; in Italia è stata recepita con il D.Lgs. 138/2024 e si applica dal 16 ottobre 2024. Chi rientra nell'ambito deve registrarsi sul portale dell'ACN, far approvare le misure dagli amministratori e rispettare i requisiti fissati dall'Agenzia, pena sanzioni fino a 10 milioni di euro o al 2% del fatturato.
</p>

<p>Molte aziende scoprono di essere soggette alla NIS2 per caso, magari dalla richiesta di un cliente che chiede garanzie sulla sicurezza della fornitura. Il motivo è semplice da spiegare; la direttiva non riguarda più soltanto i grandi operatori di energia, trasporti e sanità, ma si estende a interi comparti produttivi, come la gestione dei rifiuti, l'alimentare, la chimica e la manifattura.</p>
<p>Questa guida spiega, in termini semplici e con il rinvio puntuale agli atti ufficiali, chi deve adeguarsi, che differenza c'è tra soggetti essenziali e importanti, quali obblighi scattano e quali passaggi seguire. Per le scadenze aggiornate mese per mese si rinvia alla pagina dedicata allo <a href="/risorse/nis2-stato-attuazione-italia-europa">stato di attuazione della NIS2</a>.</p>

<h2>Cos'è la NIS2 e quale norma la recepisce in Italia?</h2>
<p>La NIS2 è la direttiva (UE) 2022/2555, che fissa un livello comune elevato di sicurezza informatica nell'Unione e sostituisce la prima direttiva NIS del 2016. In Italia è stata recepita con il D.Lgs. 4 settembre 2024, n. 138, chiamato decreto NIS, in vigore dal 16 ottobre 2024.</p>
<p>Rispetto alla vecchia NIS cambiano soprattutto due cose. La prima riguarda l'ampiezza dell'ambito, che secondo l'ACN passa a 18 settori, di cui 11 altamente critici e 7 critici, per oltre 80 tipologie di soggetti; la seconda riguarda il criterio di individuazione, poiché non è più lo Stato a scegliere caso per caso gli operatori, ma sono le stesse organizzazioni a doversi riconoscere nell'ambito in base a settore e dimensione.</p>
<p>L'autorità competente è l'Agenzia per la Cybersicurezza Nazionale (ACN), che riceve le registrazioni, redige l'elenco dei soggetti NIS, fissa i requisiti di dettaglio con proprie determinazioni e svolge i controlli. Il CSIRT Italia, ossia la struttura tecnica dell'ACN che gestisce gli incidenti, riceve le notifiche.</p>

<h2>Chi deve adeguarsi alla NIS2?</h2>
<p>Devono adeguarsi le organizzazioni pubbliche e private che svolgono attività elencate negli allegati del decreto NIS e che sono almeno medie imprese, ossia con almeno 50 dipendenti oppure con fatturato o bilancio annuo di almeno 10 milioni di euro. Alcune categorie vi rientrano a prescindere dalle dimensioni.</p>
<p>L'articolo 3 del decreto, che ne definisce l'ambito di applicazione, rinvia a quattro allegati; l'allegato I elenca i settori altamente critici, l'allegato II gli altri settori critici, l'allegato III le pubbliche amministrazioni e l'allegato IV ulteriori soggetti che rientrano solo se individuati dall'Autorità. Le soglie dimensionali sono quelle della raccomandazione europea 2003/361/CE sulle PMI, applicate tenendo conto, per i gruppi, dei dati delle imprese collegate.</p>
<p>La tabella riassume, per i principali settori, come l'ACN classifica le imprese in base alla dimensione.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Settore</th><th>Allegato</th><th>Grandi imprese</th><th>Medie imprese</th></tr>
    </thead>
    <tbody>
      <tr><td>Energia, trasporti, sanità, acqua potabile, acque reflue, spazio</td><td>I</td><td>Essenziali</td><td>Importanti</td></tr>
      <tr><td>Settore bancario e infrastrutture dei mercati finanziari</td><td>I</td><td>Essenziali (con prevalenza del regolamento DORA)</td><td>Importanti</td></tr>
      <tr><td>Gestione dei servizi ICT per le imprese</td><td>I</td><td>Essenziali</td><td>Importanti</td></tr>
      <tr><td>Infrastrutture digitali</td><td>I</td><td>Essenziali</td><td>Essenziali o importanti, a seconda della tipologia</td></tr>
      <tr><td>Rifiuti, alimentare, chimica, manifattura, servizi postali, ricerca</td><td>II</td><td>Importanti</td><td>Importanti</td></tr>
      <tr><td>Pubblica amministrazione centrale</td><td>III</td><td colspan="2">Essenziali, a prescindere dalla dimensione</td></tr>
      <tr><td>Pubblica amministrazione regionale e locale</td><td>III</td><td colspan="2">Importanti, a prescindere dalla dimensione</td></tr>
    </tbody>
  </table>
</div>

<p>Restano in linea di massima fuori dall'ambito le micro e piccole imprese, ossia con meno di 50 dipendenti e fatturato o bilancio inferiore a 10 milioni di euro. Vi sono, tuttavia, eccezioni rilevanti; secondo le FAQ dell'ACN, rientrano indipendentemente dalle dimensioni, tra gli altri, i fornitori di reti e servizi di comunicazione elettronica accessibili al pubblico, i prestatori di servizi fiduciari e i gestori di registri e servizi dei nomi di dominio, e l'ACN può comunque individuare come soggetti NIS anche micro e piccole imprese dei settori interessati.</p>
<p>Tre chiarimenti dell'ACN evitano gli errori più frequenti.</p>
<ol>
  <li>Non esiste un criterio di prevalenza; un'organizzazione rientra nell'ambito anche se svolge solo in forma residuale un'attività elencata negli allegati;</li>
  <li>i codici ATECO non bastano a stabilire se si è soggetti alla NIS2, salvo per alcune tipologie, sicché la verifica va fatta sulle attività concretamente svolte;</li>
  <li>essere fornitore di un soggetto NIS non fa rientrare automaticamente nell'ambito; il fornitore, tuttavia, riceverà dal cliente richieste contrattuali di sicurezza e potrà essere indicato come fornitore rilevante.</li>
</ol>
<p>In caso di dubbio conviene fare l'autovalutazione prevista dall'ACN prima della finestra annuale di registrazione, che si apre il 1 gennaio e si chiude il 28 febbraio.</p>

<h2>Che differenza c'è tra soggetti essenziali e importanti?</h2>
<p>Sono essenziali, in linea generale, le grandi imprese dei settori altamente critici dell'allegato I, oltre ad alcune categorie individuate dal decreto a prescindere dalla dimensione; sono importanti tutti gli altri soggetti NIS. La categoria decide quante misure adottare, come si viene controllati e quanto può essere alta la sanzione.</p>
<p>Le differenze pratiche sono tre e si possono confrontare nella tabella.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Aspetto</th><th>Soggetti essenziali</th><th>Soggetti importanti</th></tr>
    </thead>
    <tbody>
      <tr><td>Misure di sicurezza di base</td><td>Allegato 2 della determinazione ACN 379907/2025, con 43 misure e 116 requisiti</td><td>Allegato 1 della stessa determinazione, con 37 misure e 87 requisiti</td></tr>
      <tr><td>Controlli</td><td>Anche preventivi, senza che sia accaduto nulla</td><td>Solo in presenza di elementi che facciano presumere una violazione</td></tr>
      <tr><td>Sanzione massima</td><td>10 milioni di euro o 2% del fatturato mondiale annuo</td><td>7 milioni di euro o 1,4% del fatturato mondiale annuo</td></tr>
    </tbody>
  </table>
</div>

<p>Il numero di misure e requisiti è riportato da ICT Security Magazine sulla base degli allegati della determinazione ACN n. 379907/2025; la diversa intensità dei controlli è stata confermata dall'ACN in risposta ai quesiti degli operatori, come riporta Diritto Bancario.</p>
<p>Ne consegue che un soggetto essenziale deve poter dimostrare in ogni momento le misure adottate, poiché l'ispezione può arrivare anche in assenza di incidenti; un soggetto importante, invece, è controllato di regola dopo un evento o una segnalazione, ma resta comunque obbligato ad adottare tutte le misure del proprio allegato. La categoria assegnata compare nella comunicazione di inserimento nell'elenco inviata dall'ACN.</p>

<h2>Quali sono gli obblighi della NIS2?</h2>
<p>Gli obblighi principali sono cinque; registrarsi sul portale ACN, coinvolgere gli organi di amministrazione, adottare le misure di sicurezza, notificare gli incidenti significativi e gestire la sicurezza dei fornitori. I requisiti di dettaglio sono fissati dalla determinazione ACN n. 379907/2025.</p>

<h3>Registrazione e aggiornamento annuale</h3>
<p>Le organizzazioni che si riconoscono nell'ambito devono registrarsi sul portale dei servizi dell'ACN (art. 7 del decreto, che disciplina l'identificazione dei soggetti); come ogni anno, secondo il Vademecum NIS dell'ACN, la finestra per registrarsi o aggiornare la registrazione va dal 1 gennaio al 28 febbraio. Ricevuta la comunicazione di inserimento nell'elenco, il soggetto deve inoltre elencare e categorizzare le proprie attività e i propri servizi (art. 30 del decreto), svolgendo un'analisi d'impatto semplificata secondo il modello dell'ACN.</p>

<h3>Responsabilità degli organi di amministrazione</h3>
<p>L'art. 23 del decreto pone la sicurezza informatica in capo al vertice; gli organi di amministrazione e direttivi approvano le modalità di gestione dei rischi, ne sovrintendono l'attuazione, seguono una formazione specifica e rispondono delle violazioni. La sicurezza, dunque, non può essere delegata per intero alla funzione IT, e serve una traccia documentale delle decisioni assunte (delibere, verbali, report periodici).</p>

<h3>Misure di sicurezza</h3>
<p>L'art. 24 del decreto impone misure tecniche, operative e organizzative proporzionate al rischio; secondo la guida dell'ACN alle specifiche di base, le misure si applicano ai sistemi informativi e di rete usati nelle attività o nell'erogazione dei servizi, e coprono tutti gli elementi elencati dal secondo comma dell'articolo, tra cui la gestione degli incidenti, la continuità operativa, la sicurezza della catena di approvvigionamento e il controllo degli accessi. Il termine è di 18 mesi dalla comunicazione di inserimento nell'elenco; per chi è entrato nel 2026, invece, la determinazione ACN n. 127434/2026 lo fissa al 31 luglio 2027.</p>

<h3>Notifica degli incidenti significativi</h3>
<p>L'art. 25 del decreto scandisce la notifica al CSIRT Italia in più passaggi.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Fase</th><th>Termine</th><th>Contenuto</th></tr>
    </thead>
    <tbody>
      <tr><td>Pre-notifica</td><td>Entro 24 ore da quando si viene a conoscenza dell'incidente</td><td>Prima segnalazione, con l'indicazione dell'eventuale origine malevola e dell'impatto transfrontaliero</td></tr>
      <tr><td>Notifica</td><td>Entro 72 ore</td><td>Aggiornamento e prima valutazione di gravità e impatto, con gli indicatori di compromissione se disponibili</td></tr>
      <tr><td>Relazione intermedia</td><td>Su richiesta del CSIRT Italia</td><td>Aggiornamenti sulla situazione</td></tr>
      <tr><td>Relazione finale</td><td>Entro un mese dalla notifica</td><td>Descrizione dettagliata, causa probabile, misure adottate, impatto transfrontaliero</td></tr>
    </tbody>
  </table>
</div>

<p>Il calendario, riportato tra gli altri da Agenda Digitale, prevede inoltre che, se la gestione dell'incidente è ancora in corso allo scadere del mese, si inviino relazioni mensili sui progressi e la relazione finale entro un mese dalla chiusura. Quali incidenti siano significativi lo stabiliscono gli allegati 3 e 4 della determinazione ACN n. 379907/2025. Se l'incidente coinvolge dati personali, va valutata in parallelo la notifica al Garante privacy entro 72 ore ai sensi dell'art. 33 GDPR, che riguarda le violazioni di dati personali.</p>

<h3>Sicurezza della catena di fornitura</h3>
<p>Le misure dell'art. 24 includono la sicurezza dei fornitori; il soggetto NIS deve quindi valutare i rischi legati a chi gli fornisce prodotti e servizi, inserire clausole di sicurezza nei contratti e, secondo la determinazione ACN sul portale, indicare i fornitori rilevanti, ossia quelli che forniscono servizi ICT o la cui interruzione avrebbe un impatto significativo sulla sua attività.</p>

<h2>Quali sanzioni prevede la NIS2?</h2>
<p>Le sanzioni massime arrivano a 10 milioni di euro o al 2% del fatturato mondiale annuo per i soggetti essenziali, e a 7 milioni di euro o all'1,4% per i soggetti importanti, applicandosi l'importo più alto tra i due. Per le pubbliche amministrazioni sono previsti importi diversi e più contenuti.</p>
<p>Gli importi, riportati da ICT Security Magazine, sono massimi edittali, ossia il tetto oltre il quale la sanzione non può andare; l'importo concreto dipende dalla gravità della violazione e dalle circostanze del caso. Per le pubbliche amministrazioni, secondo LentePubblica, le sanzioni vanno da 25.000 a 125.000 euro.</p>
<p>Accanto alle sanzioni economiche pesa la responsabilità del vertice. Poiché l'art. 23 del decreto affida agli organi di amministrazione l'approvazione e la supervisione delle misure, una carenza nella sicurezza diventa anche una questione di governance; un consiglio di amministrazione che non ha mai deliberato sul tema, o che non ha ricevuto alcuna formazione, si trova esposto in caso di controllo o di incidente.</p>

<h2>Come adeguarsi alla NIS2, passo per passo</h2>
<p>L'adeguamento segue un ordine preciso, poiché ogni passaggio dipende dal precedente; non si possono scegliere le misure senza sapere quale allegato si applica, né dimostrarle senza averle prima documentate.</p>
<ol>
  <li><strong>Verificare se si rientra nell'ambito</strong>; si confrontano le attività effettivamente svolte con gli allegati del decreto e i dati dimensionali con le soglie europee sulle PMI, considerando anche le imprese collegate;</li>
  <li><strong>registrarsi sul portale ACN</strong> nella finestra dal 1 gennaio al 28 febbraio, oppure aggiornare la registrazione se già effettuata;</li>
  <li><strong>coinvolgere gli organi di amministrazione</strong>; servono una delibera che approvi l'impostazione della gestione del rischio, un piano di formazione e un flusso periodico di report al vertice;</li>
  <li><strong>fare una gap analysis</strong>, ossia confrontare le misure già in essere con i requisiti dell'allegato applicabile della determinazione ACN n. 379907/2025, requisito per requisito;</li>
  <li><strong>adottare le misure mancanti</strong> entro il termine di 18 mesi, o entro il 31 luglio 2027 per chi è entrato nell'elenco nel 2026, dando priorità a quelle con maggiore impatto sul rischio;</li>
  <li><strong>predisporre la procedura di notifica degli incidenti</strong>, con ruoli, contatti e moduli pronti per rispettare i termini di 24 ore, 72 ore e un mese, e designare il referente CSIRT;</li>
  <li><strong>mappare i fornitori</strong>, individuare quelli rilevanti e aggiornare i contratti con clausole di sicurezza;</li>
  <li><strong>raccogliere le prove documentali</strong> di ogni misura (policy approvate, registri, verbali, esiti dei test), perché in caso di controllo conta ciò che si può dimostrare.</li>
</ol>
<p>I primi due passaggi hanno natura giuridica, gli altri richiedono il lavoro congiunto di funzione legale, IT e vertice aziendale; per questa ragione conviene affidare il coordinamento a una figura che parli entrambi i linguaggi e tenere un unico registro delle misure e delle relative prove.</p>

<h2>Conclusioni</h2>
<p>La NIS2 non riguarda più soltanto le infrastrutture critiche in senso stretto, ma gran parte delle medie e grandi imprese di 18 settori; chi vi rientra deve registrarsi, coinvolgere il vertice, adottare le misure dell'allegato applicabile e saper notificare un incidente nei tempi previsti. Il punto decisivo, tuttavia, è la prova, poiché in sede di controllo l'ACN valuta ciò che l'organizzazione è in grado di documentare, requisito per requisito.</p>
<p>Per le scadenze aggiornate si rinvia alla pagina sullo <a href="/risorse/nis2-stato-attuazione-italia-europa">stato di attuazione della NIS2</a>, rivista ogni mese.</p>

<p><strong>Vuoi capire a che punto è la tua organizzazione?</strong> <a href="/inizia">La gap analysis NIS2 di RegulaeOS</a> permette di confrontare le misure adottate con i requisiti della determinazione ACN e di raccogliere in un unico posto le prove documentali.</p>

<h2>Fonti</h2>
<ul>
  <li><a href="https://eur-lex.europa.eu/eli/dir/2022/2555/oj" target="_blank" rel="noopener">Direttiva (UE) 2022/2555 (NIS2), EUR-Lex</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138" target="_blank" rel="noopener">D.Lgs. 4 settembre 2024, n. 138, Normattiva</a></li>
  <li><a href="https://www.acn.gov.it/portale/faq/nis/registrazione" target="_blank" rel="noopener">ACN, ambito e registrazione</a></li>
  <li><a href="https://www.acn.gov.it/portale/faq/nis/ambito" target="_blank" rel="noopener">ACN, FAQ sull'ambito di applicazione</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_obblighi_2511-v3_signed" target="_blank" rel="noopener">ACN, determinazione n. 379907/2025 sulle specifiche di base</a></li>
  <li>ACN, determinazione n. 127434/2026 sui termini per i nuovi soggetti</li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/guida-alla-lettura-specifiche-di-base" target="_blank" rel="noopener">ACN, guida alla lettura delle specifiche di base</a></li>
  <li>ACN, determinazione sul portale e sui fornitori rilevanti</li>
  <li><a href="https://www.acn.gov.it/portale/documents/20119/600993/VademecumNIS_2026_v1.pdf/9631c10d-9157-ae43-43b3-a353aa962d09?t=1789134752314" target="_blank" rel="noopener">ACN, Vademecum NIS</a></li>
</ul>
`,
    en: {
      title: "NIS2: the complete guide for Italian companies",
      excerpt:
        "Who must comply with NIS2, the difference between essential and important entities, the obligations, how incidents are notified and what penalties apply: a step-by-step guide.",
      date: "12 November 2026",
      readTime: "12 min",
      category: "Guide",
      tags: ["NIS2", "NIS 2", "NIS2 directive", "NIS2 obligations", "NIS2 scope", "Legislative Decree 138/2024", "ACN"],
      metaTitle: "NIS2: the complete guide for Italian companies (2026)",
      metaDescription:
        "Who must comply with NIS2, essential vs important entities, obligations, incident notification and penalties. Updated guide by a CIPP/E lawyer.",
      faqSchema: [
        {
          q: "Does NIS2 apply to small businesses?",
          a: "As a rule, no. Micro and small enterprises, i.e. with fewer than 50 employees and turnover or balance sheet below EUR 10 million, are out of scope, except for certain categories specified by the decree (such as electronic communications providers and trust service providers) and unless identified by ACN.",
        },
        {
          q: "How do I know whether my company is subject to NIS2?",
          a: "Two elements must be checked: whether the company carries out, even marginally, an activity listed in Annexes I, II, III or IV of Legislative Decree 138/2024, and whether it exceeds the small enterprise thresholds. The ATECO code alone is not enough.",
        },
        {
          q: "What is the difference between an essential and an important entity?",
          a: "Essential entities are generally large enterprises in highly critical sectors and must adopt more measures (Annex 2 of ACN determination no. 379907/2025); they can also be supervised proactively and face higher penalties. Important entities adopt the measures in Annex 1 and are normally inspected after an event or a report.",
        },
        {
          q: "How quickly must a NIS2 incident be notified?",
          a: "The early warning to CSIRT Italia must be sent within 24 hours of becoming aware of the significant incident, the notification within 72 hours and the final report within one month of the notification.",
        },
        {
          q: "Does a supplier to a NIS entity have to comply with NIS2?",
          a: "Not automatically. According to ACN, a supplier is in scope only if it meets the criteria of the decree itself; in practice, however, it will receive contractual security requirements from the customer and may be designated as a relevant supplier.",
        },
      ],
      content: `
<p><em>Avv. Umberto Mottola, CIPP/E · updated 12 Nov 2026</em></p>

<p class="ac-tldr">
  <strong>In short.</strong> NIS2 is the EU directive requiring medium-sized and large organisations in 18 sectors to manage cyber risk, adopt security measures and notify serious incidents; in Italy it was transposed by Legislative Decree 138/2024 and has applied since 16 October 2024. Organisations in scope must register on the ACN portal, have the measures approved by their directors and meet the requirements set by the Agency, or face penalties of up to EUR 10 million or 2% of turnover.
</p>

<p>Many companies find out by chance that NIS2 applies to them, often when a customer asks for assurances on supply security. The reason is easy to explain: the directive no longer concerns only large energy, transport and healthcare operators, but extends to entire industries such as waste management, food, chemicals and manufacturing.</p>
<p>This guide explains, in plain terms and with precise references to the official acts, who must comply, what the difference is between essential and important entities, which obligations apply and which steps to follow. For deadlines updated month by month, see the page on the <a href="/risorse/nis2-stato-attuazione-italia-europa">NIS2 implementation status</a>.</p>

<h2>What is NIS2 and which law transposes it in Italy?</h2>
<p>NIS2 is Directive (EU) 2022/2555, which sets a high common level of cybersecurity across the Union and replaces the first NIS Directive of 2016. In Italy it was transposed by Legislative Decree no. 138 of 4 September 2024, known as the NIS decree, in force since 16 October 2024.</p>
<p>Compared with the old NIS, two things change above all. The first is the breadth of the scope, which according to ACN grows to 18 sectors, 11 highly critical and 7 critical, covering more than 80 types of entity; the second is the identification criterion, since it is no longer the State that selects operators case by case: organisations themselves must recognise that they are in scope based on sector and size.</p>
<p>The competent authority is the National Cybersecurity Agency (ACN), which receives registrations, draws up the list of NIS entities, sets the detailed requirements through its determinations and carries out inspections. CSIRT Italia, the ACN technical unit that handles incidents, receives the notifications.</p>

<h2>Who must comply with NIS2?</h2>
<p>Public and private organisations that carry out activities listed in the annexes to the NIS decree and that are at least medium-sized enterprises, i.e. with at least 50 employees or annual turnover or balance sheet of at least EUR 10 million, must comply. Some categories are in scope regardless of size.</p>
<p>Article 3 of the decree, which defines its scope, refers to four annexes: Annex I lists the highly critical sectors, Annex II the other critical sectors, Annex III public administrations and Annex IV further entities that are in scope only if identified by the Authority. The size thresholds are those of European Recommendation 2003/361/EC on SMEs, applied taking into account, for groups, the data of linked enterprises.</p>
<p>The table summarises, for the main sectors, how ACN classifies enterprises by size.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Sector</th><th>Annex</th><th>Large enterprises</th><th>Medium enterprises</th></tr>
    </thead>
    <tbody>
      <tr><td>Energy, transport, health, drinking water, waste water, space</td><td>I</td><td>Essential</td><td>Important</td></tr>
      <tr><td>Banking and financial market infrastructures</td><td>I</td><td>Essential (DORA prevails)</td><td>Important</td></tr>
      <tr><td>ICT service management (B2B)</td><td>I</td><td>Essential</td><td>Important</td></tr>
      <tr><td>Digital infrastructure</td><td>I</td><td>Essential</td><td>Essential or important, depending on the type</td></tr>
      <tr><td>Waste, food, chemicals, manufacturing, postal services, research</td><td>II</td><td>Important</td><td>Important</td></tr>
      <tr><td>Central public administration</td><td>III</td><td colspan="2">Essential, regardless of size</td></tr>
      <tr><td>Regional and local public administration</td><td>III</td><td colspan="2">Important, regardless of size</td></tr>
    </tbody>
  </table>
</div>

<p>Micro and small enterprises, i.e. with fewer than 50 employees and turnover or balance sheet below EUR 10 million, generally remain out of scope. There are, however, significant exceptions: according to the ACN FAQs, providers of public electronic communications networks and services, trust service providers and top-level domain name registries and domain name service providers, among others, are in scope regardless of size, and ACN may in any case identify micro and small enterprises in the relevant sectors as NIS entities.</p>
<p>Three ACN clarifications help avoid the most common mistakes.</p>
<ol>
  <li>There is no prevalence criterion: an organisation is in scope even if it carries out an activity listed in the annexes only marginally;</li>
  <li>ATECO codes are not enough to establish whether NIS2 applies, except for certain types, so the assessment must be based on the activities actually carried out;</li>
  <li>being a supplier to a NIS entity does not automatically bring you into scope; the supplier will, however, receive contractual security requirements from the customer and may be designated as a relevant supplier.</li>
</ol>
<p>If in doubt, it is advisable to carry out the self-assessment provided for by ACN before the annual registration window, which opens on 1 January and closes on 28 February.</p>

<h2>What is the difference between essential and important entities?</h2>
<p>As a general rule, essential entities are large enterprises in the highly critical sectors of Annex I, plus certain categories identified by the decree regardless of size; all other NIS entities are important. The category determines how many measures must be adopted, how the entity is supervised and how high the penalty can be.</p>
<p>The practical differences are three and can be compared in the table.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Aspect</th><th>Essential entities</th><th>Important entities</th></tr>
    </thead>
    <tbody>
      <tr><td>Baseline security measures</td><td>Annex 2 of ACN determination 379907/2025, with 43 measures and 116 requirements</td><td>Annex 1 of the same determination, with 37 measures and 87 requirements</td></tr>
      <tr><td>Supervision</td><td>Also proactive, even when nothing has happened</td><td>Only where there is evidence suggesting an infringement</td></tr>
      <tr><td>Maximum penalty</td><td>EUR 10 million or 2% of total worldwide annual turnover</td><td>EUR 7 million or 1.4% of total worldwide annual turnover</td></tr>
    </tbody>
  </table>
</div>

<p>The number of measures and requirements is reported by ICT Security Magazine based on the annexes to ACN determination no. 379907/2025; the different intensity of supervision was confirmed by ACN in its answers to operators' questions, as reported by Diritto Bancario.</p>
<p>It follows that an essential entity must be able to demonstrate its measures at any time, since an inspection may come even without any incident; an important entity, by contrast, is normally inspected after an event or a report, but is still required to adopt all the measures in its annex. The assigned category appears in the notice of inclusion in the list sent by ACN.</p>

<h2>What are the NIS2 obligations?</h2>
<p>There are five main obligations: registering on the ACN portal, involving the management bodies, adopting security measures, notifying significant incidents and managing supplier security. The detailed requirements are set by ACN determination no. 379907/2025.</p>

<h3>Registration and annual update</h3>
<p>Organisations that recognise they are in scope must register on the ACN services portal (Art. 7 of the decree, which governs the identification of entities); as every year, according to the ACN NIS Vademecum, the window to register or update the registration runs from 1 January to 28 February. Once it has received the notice of inclusion in the list, the entity must also list and categorise its activities and services (Art. 30 of the decree), carrying out a simplified impact analysis according to the ACN template.</p>

<h3>Responsibility of the management bodies</h3>
<p>Art. 23 of the decree places cybersecurity with top management: the management and governing bodies approve the risk management arrangements, oversee their implementation, undergo specific training and are liable for infringements. Security therefore cannot be delegated entirely to the IT function, and a documentary record of the decisions taken is needed (resolutions, minutes, periodic reports).</p>

<h3>Security measures</h3>
<p>Art. 24 of the decree requires technical, operational and organisational measures proportionate to the risk; according to the ACN guide to the baseline specifications, the measures apply to the network and information systems used in the entity's activities or in the provision of its services, and cover all the elements listed in the second paragraph of the article, including incident handling, business continuity, supply chain security and access control. The deadline is 18 months from the notice of inclusion in the list; for entities added in 2026, ACN determination no. 127434/2026 sets it at 31 July 2027.</p>

<h3>Notification of significant incidents</h3>
<p>Art. 25 of the decree sets out notification to CSIRT Italia in several stages.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Stage</th><th>Deadline</th><th>Content</th></tr>
    </thead>
    <tbody>
      <tr><td>Early warning</td><td>Within 24 hours of becoming aware of the incident</td><td>First report, indicating any suspected malicious origin and cross-border impact</td></tr>
      <tr><td>Notification</td><td>Within 72 hours</td><td>Update and initial assessment of severity and impact, with indicators of compromise where available</td></tr>
      <tr><td>Intermediate report</td><td>At the request of CSIRT Italia</td><td>Status updates</td></tr>
      <tr><td>Final report</td><td>Within one month of the notification</td><td>Detailed description, likely cause, measures taken, cross-border impact</td></tr>
    </tbody>
  </table>
</div>

<p>The timeline, reported among others by Agenda Digitale, also provides that if the incident is still being handled when the month expires, monthly progress reports must be sent and the final report submitted within one month of closure. Which incidents are significant is established by Annexes 3 and 4 of ACN determination no. 379907/2025. If the incident involves personal data, notification to the Italian Data Protection Authority within 72 hours under Art. 33 GDPR, which concerns personal data breaches, must be assessed in parallel.</p>

<h3>Supply chain security</h3>
<p>The Art. 24 measures include supplier security; the NIS entity must therefore assess the risks linked to those who supply it with products and services, include security clauses in contracts and, according to the ACN determination on the portal, designate relevant suppliers, i.e. those that provide ICT services or whose disruption would have a significant impact on its activity.</p>

<h2>What penalties does NIS2 provide for?</h2>
<p>Maximum penalties reach EUR 10 million or 2% of total worldwide annual turnover for essential entities, and EUR 7 million or 1.4% for important entities, whichever is higher. Different and lower amounts apply to public administrations.</p>
<p>The amounts, reported by ICT Security Magazine, are statutory maximums, i.e. the ceiling the penalty cannot exceed; the actual amount depends on the seriousness of the infringement and the circumstances of the case. For public administrations, according to LentePubblica, penalties range from EUR 25,000 to EUR 125,000.</p>
<p>Alongside financial penalties, the liability of top management weighs heavily. Since Art. 23 of the decree entrusts the management bodies with approving and overseeing the measures, a security shortcoming also becomes a governance issue; a board of directors that has never resolved on the matter, or has received no training, is exposed in the event of an inspection or an incident.</p>

<h2>How to comply with NIS2, step by step</h2>
<p>Compliance follows a precise order, since each step depends on the previous one: you cannot choose the measures without knowing which annex applies, nor demonstrate them without first documenting them.</p>
<ol>
  <li><strong>Check whether you are in scope</strong>: compare the activities actually carried out with the annexes to the decree, and the size data with the European SME thresholds, also considering linked enterprises;</li>
  <li><strong>register on the ACN portal</strong> in the window from 1 January to 28 February, or update the registration if already made;</li>
  <li><strong>involve the management bodies</strong>: a resolution approving the risk management approach, a training plan and a periodic reporting flow to top management are needed;</li>
  <li><strong>carry out a gap analysis</strong>, i.e. compare the measures already in place with the requirements of the applicable annex of ACN determination no. 379907/2025, requirement by requirement;</li>
  <li><strong>adopt the missing measures</strong> within the 18-month deadline, or by 31 July 2027 for entities added to the list in 2026, prioritising those with the greatest impact on risk;</li>
  <li><strong>set up the incident notification procedure</strong>, with roles, contacts and forms ready to meet the 24-hour, 72-hour and one-month deadlines, and appoint the CSIRT contact person;</li>
  <li><strong>map your suppliers</strong>, identify the relevant ones and update contracts with security clauses;</li>
  <li><strong>collect documentary evidence</strong> for each measure (approved policies, registers, minutes, test results), because in an inspection what counts is what you can demonstrate.</li>
</ol>
<p>The first two steps are legal in nature, while the others require joint work by the legal function, IT and top management; for this reason it is advisable to entrust coordination to someone who speaks both languages and to keep a single register of the measures and the related evidence.</p>

<h2>Conclusions</h2>
<p>NIS2 no longer concerns only critical infrastructure in the strict sense, but most medium-sized and large enterprises in 18 sectors; those in scope must register, involve top management, adopt the measures of the applicable annex and be able to notify an incident within the required timeframes. The decisive point, however, is evidence, since in an inspection ACN assesses what the organisation is able to document, requirement by requirement.</p>
<p>For up-to-date deadlines, see the page on the <a href="/risorse/nis2-stato-attuazione-italia-europa">NIS2 implementation status</a>, reviewed every month.</p>

<p><strong>Want to understand where your organisation stands?</strong> <a href="/inizia">The RegulaeOS NIS2 gap analysis</a> lets you compare the measures you have adopted with the requirements of the ACN determination and collect the documentary evidence in one place.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://eur-lex.europa.eu/eli/dir/2022/2555/oj" target="_blank" rel="noopener">Directive (EU) 2022/2555 (NIS2), EUR-Lex</a></li>
  <li><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138" target="_blank" rel="noopener">Legislative Decree no. 138 of 4 September 2024, Normattiva</a></li>
  <li><a href="https://www.acn.gov.it/portale/faq/nis/registrazione" target="_blank" rel="noopener">ACN, scope and registration</a></li>
  <li><a href="https://www.acn.gov.it/portale/faq/nis/ambito" target="_blank" rel="noopener">ACN, FAQs on scope</a></li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/detacn_obblighi_2511-v3_signed" target="_blank" rel="noopener">ACN, determination no. 379907/2025 on the baseline specifications</a></li>
  <li>ACN, determination no. 127434/2026 on deadlines for new entities</li>
  <li><a href="https://www.acn.gov.it/portale/documents/d/guest/guida-alla-lettura-specifiche-di-base" target="_blank" rel="noopener">ACN, reading guide to the baseline specifications</a></li>
  <li>ACN, determination on the portal and relevant suppliers</li>
  <li><a href="https://www.acn.gov.it/portale/documents/20119/600993/VademecumNIS_2026_v1.pdf/9631c10d-9157-ae43-43b3-a353aa962d09?t=1789134752314" target="_blank" rel="noopener">ACN, NIS Vademecum</a></li>
</ul>
`,
    },
  },
  {
    slug: "nis2-stato-attuazione-italia-europa",
    title: "NIS2, stato di attuazione in Italia e in Europa (aggiornato a novembre 2026)",
    excerpt:
      "L'Italia ha recepito la NIS2 con il D.Lgs. 138/2024 ed è entrata nella fase dei controlli: scadenze passate e in arrivo, sanzioni e stato del recepimento negli altri Stati membri.",
    date: "12 novembre 2026",
    dateISO: "2026-11-12",
    author: { name: "Umberto Mottola", jobTitle: "Avvocato, CIPP/E" },
    dateModifiedISO: "2026-11-12",
    readTime: "9 min",
    category: "Normativa",
    tags: ["NIS2", "D.Lgs. 138/2024", "ACN", "cybersicurezza", "scadenze", "CSIRT Italia"],
    metaTitle: "NIS2: stato di attuazione in Italia e in Europa (novembre 2026) | RegulaeOS",
    metaDescription:
      "Stato di attuazione della NIS2 a novembre 2026: D.Lgs. 138/2024, determinazioni ACN, scadenze 2026-2027, sanzioni e Stati deferiti alla Corte di giustizia.",
    faqSchema: [
      {
        q: "La NIS2 è già in vigore in Italia?",
        a: "Sì. La NIS2 è stata recepita con il D.Lgs. 138/2024, in vigore dal 16 ottobre 2024; gli obblighi di dettaglio sono fissati dalle determinazioni dell'ACN, in particolare dalla n. 379907/2025, applicabile dal 15 gennaio 2026.",
      },
      {
        q: "Qual era la scadenza NIS2 di ottobre 2026?",
        a: "Era il termine, pari a 18 mesi dalla comunicazione di inserimento nell'elenco NIS, entro cui i soggetti inseriti nel 2025 dovevano adottare le misure di sicurezza di base previste dagli allegati 1 e 2 della determinazione ACN n. 379907/2025.",
      },
      {
        q: "Che scadenze hanno i soggetti NIS identificati nel 2026?",
        a: "Secondo la determinazione ACN n. 127434/2026, devono designare il referente CSIRT entro la fine del 2026, notificare gli incidenti significativi dal 1 gennaio 2027 e adottare le misure di sicurezza di base entro il 31 luglio 2027.",
      },
      {
        q: "Quando si fa la registrazione NIS per il 2027?",
        a: "Dal 1 gennaio al 28 febbraio 2027 tutti i soggetti NIS devono effettuare o aggiornare la registrazione sul portale dei servizi dell'ACN, come ogni anno.",
      },
      {
        q: "Quali Stati non hanno ancora recepito la NIS2?",
        a: "L'8 luglio 2026 la Commissione ha deferito alla Corte di giustizia Irlanda, Spagna, Francia e Paesi Bassi. I Paesi Bassi hanno poi adottato una legge in vigore dal 15 agosto 2026, mentre in Francia il disegno di legge è all'esame dell'Assemblea nazionale e in Spagna e Irlanda il recepimento non risulta ancora completato.",
      },
    ],
    content: `
<p><em>Avv. Umberto Mottola, CIPP/E · aggiornato al 12 nov 2026</em></p>

<p class="ac-tldr">
  <strong>In sintesi.</strong> L'Italia ha recepito la direttiva NIS2 con il D.Lgs. 138/2024, in vigore dal 16 ottobre 2024, ed è ormai entrata nella fase dei controlli; per i soggetti inseriti nell'elenco NIS nel 2025, infatti, il termine per adottare le misure di sicurezza di base è scaduto a ottobre 2026, mentre chi è entrato nell'elenco nel 2026 ha tempo fino al 31 luglio 2027. In Europa, invece, Irlanda, Spagna, Francia e Paesi Bassi sono stati deferiti alla Corte di giustizia per il ritardo nel recepimento.
</p>

<p>La <a href="/risorse/nis2">NIS2</a>, ossia la direttiva (UE) 2022/2555 sulla sicurezza delle reti e dei sistemi informativi, doveva essere recepita da tutti gli Stati membri entro il 17 ottobre 2024. A due anni da quella data il quadro è a due velocità; alcuni Paesi, tra cui l'Italia, sono già nella fase di attuazione concreta, altri non hanno ancora una legge nazionale.</p>
<p>Chi cerca lo stato di attuazione della NIS2 vuole sapere, in genere, tre cose; se la norma è già applicabile, quali scadenze sono passate e quali arrivano, e cosa rischia chi è in ritardo. Questa pagina risponde a ciascuna domanda sulla base dei soli atti ufficiali (decreto, determinazioni dell'Agenzia per la Cybersicurezza Nazionale, comunicati della Commissione europea) e viene aggiornata ogni mese.</p>

<h2>Qual è lo stato di attuazione della NIS2 in Italia?</h2>
<p>In Italia la NIS2 è pienamente in vigore dal 16 ottobre 2024, data di entrata in vigore del D.Lgs. 138/2024, che l'ha recepita nei termini. L'autorità competente è l'Agenzia per la Cybersicurezza Nazionale (ACN), che ha già identificato oltre 20.000 soggetti NIS e ne verifica ora gli adempimenti.</p>
<p>Il decreto rinvia a provvedimenti dell'ACN, chiamati determinazioni, il compito di tradurre gli obblighi generali in requisiti verificabili. Il riferimento oggi vigente è la determinazione ACN n. 379907 del 19 dicembre 2025, che fissa le cosiddette specifiche di base, ossia le misure minime di sicurezza e le regole per notificare gli incidenti; essa si applica dal 15 gennaio 2026 e sostituisce la precedente determinazione n. 164179 del 14 aprile 2025.</p>
<p>Le misure cambiano a seconda della categoria del soggetto. I soggetti importanti devono rispettare l'allegato 1 della determinazione, che secondo ICT Security Magazine conta 37 misure e 87 requisiti; i soggetti essenziali devono rispettare l'allegato 2, che ne conta 43 e 116. Gli allegati 3 e 4, del pari, stabiliscono quando un incidente diventa significativo e va quindi notificato al CSIRT Italia, la struttura dell'ACN che riceve le segnalazioni.</p>
<p>Secondo l'ACN, a dicembre 2025 l'elenco dei soggetti NIS superava i 20.000 nominativi, anche per effetto di centinaia di registrazioni tardive e di oltre duemila istruttorie di revisione.</p>

<h2>Quali scadenze NIS2 sono passate e quali arrivano?</h2>
<p>Le scadenze dipendono dall'anno in cui il soggetto ha ricevuto la comunicazione di inserimento nell'elenco NIS, poiché i termini decorrono da quella data. Per chi è in elenco dal 2025 il termine delle misure di base è scaduto a ottobre 2026; per chi vi è entrato nel 2026, invece, scade il 31 luglio 2027.</p>
<p>La tabella riassume il calendario ricavato dalla pagina ACN sulle specifiche di base, dalla determinazione ACN n. 127434/2026, che regola i termini per i nuovi soggetti, e dal Vademecum NIS dell'ACN.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Quando</th><th>Chi riguarda</th><th>Cosa va fatto</th><th>Stato</th></tr>
    </thead>
    <tbody>
      <tr><td>Gennaio 2026</td><td>Soggetti in elenco dal 2025</td><td>Notificare al CSIRT Italia gli incidenti significativi di base (9 mesi dalla comunicazione di inserimento)</td><td class="ac-passed">In corso</td></tr>
      <tr><td>Maggio e giugno 2026</td><td>Tutti i soggetti NIS</td><td>Elencare e categorizzare attività e servizi (art. 30 del decreto, che prevede un'analisi d'impatto semplificata)</td><td class="ac-passed">Concluso</td></tr>
      <tr><td>Ottobre 2026</td><td>Soggetti in elenco dal 2025</td><td>Adottare tutte le misure di sicurezza di base (18 mesi dalla comunicazione di inserimento)</td><td class="ac-passed">Scaduto</td></tr>
      <tr><td>Entro fine 2026</td><td>Soggetti entrati in elenco nel 2026</td><td>Designare il referente CSIRT, ossia la persona che terrà i contatti con il CSIRT Italia</td><td class="ac-soon">Imminente</td></tr>
      <tr><td>1 gennaio 2027</td><td>Soggetti entrati in elenco nel 2026</td><td>Inizia l'obbligo di notifica degli incidenti significativi</td><td class="ac-soon">Imminente</td></tr>
      <tr><td>1 gennaio - 28 febbraio 2027</td><td>Tutti i soggetti NIS</td><td>Registrazione o aggiornamento annuale sul portale dei servizi ACN</td><td class="ac-soon">Imminente</td></tr>
      <tr><td>31 luglio 2027</td><td>Soggetti entrati in elenco nel 2026</td><td>Adottare tutte le misure di sicurezza di base</td><td class="ac-omnibus">Da preparare</td></tr>
    </tbody>
  </table>
</div>

<p>Va precisato che il termine di ottobre 2026 si calcola sui 18 mesi dalla ricezione della comunicazione di inserimento; ne consegue che la data esatta va verificata, per ciascun soggetto, sulla comunicazione ricevuta dall'ACN.</p>

<h2>Cosa succede dopo la scadenza di ottobre 2026?</h2>
<p>Scaduto il termine per le misure di base, l'ACN può verificare se i soggetti del 2025 le abbiano effettivamente adottate. Sui soggetti essenziali la vigilanza può essere anche preventiva; sui soggetti importanti, invece, i controlli partono solo in presenza di elementi che facciano presumere una violazione.</p>
<p>La distinzione, che deriva dalla direttiva, è stata confermata dall'ACN in risposta ai quesiti degli operatori, come riporta Diritto Bancario. In pratica un soggetto essenziale può ricevere un'ispezione anche senza che sia accaduto alcun incidente, sicché deve essere in grado di dimostrare in ogni momento quali misure ha adottato e con quali prove documentali.</p>
<p>Le sanzioni massime previste dal decreto, secondo ICT Security Magazine, arrivano a 10 milioni di euro o al 2% del fatturato mondiale annuo per i soggetti essenziali, e a 7 milioni di euro o all'1,4% per i soggetti importanti, applicandosi l'importo più alto. Il decreto, inoltre, attribuisce agli organi di amministrazione e direttivi la responsabilità dell'approvazione e della supervisione delle misure; la sicurezza, dunque, non può essere delegata per intero alla funzione IT.</p>

<h2>A che punto è il recepimento della NIS2 negli altri Stati membri?</h2>
<p>La maggior parte degli Stati membri ha ormai recepito la NIS2, ma quattro Paesi sono stati deferiti alla Corte di giustizia dell'Unione europea l'8 luglio 2026 per non aver notificato il recepimento completo; si tratta di Irlanda, Spagna, Francia e Paesi Bassi.</p>
<p>La procedura d'infrazione si è svolta in tre fasi. La Commissione ha inviato le lettere di costituzione in mora a 23 Stati il 28 novembre 2024; ha poi inviato i pareri motivati a 19 Stati il 7 maggio 2025; ha infine deferito quattro Stati alla Corte, chiedendo, secondo il Corriere Comunicazioni, una somma forfettaria e penalità giornaliere fino al completo recepimento.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Stato</th><th>Situazione nota</th><th>Fonte</th></tr>
    </thead>
    <tbody>
      <tr><td>Paesi Bassi</td><td>Legge di recepimento (Cyberbeveiligingswet) in vigore dal 15 agosto 2026, approvata dopo il deferimento</td><td>Tracker NIS2</td></tr>
      <tr><td>Francia</td><td>Il disegno di legge, già approvato dal Senato, è all'esame dell'Assemblea nazionale dal 9 novembre 2026</td><td>LCP</td></tr>
      <tr><td>Spagna</td><td>L'iter del progetto di legge si è fermato con la convocazione delle elezioni; resta applicabile il recepimento della vecchia NIS (Real Decreto-ley 12/2018)</td><td>Cuatrecasas</td></tr>
      <tr><td>Irlanda</td><td>Il Governo prevede di notificare il recepimento entro la fine del 2026</td><td>The Record</td></tr>
    </tbody>
  </table>
</div>

<p>Per un'azienda italiana con sedi o fornitori in questi Paesi il ritardo ha un effetto pratico; le controllate estere, infatti, restano soggette alle regole nazionali previgenti, mentre i clienti italiani soggetti NIS chiederanno comunque garanzie sulla sicurezza della catena di fornitura.</p>

<h2>Le modifiche alla NIS2 proposte dalla Commissione nel 2026</h2>
<p>Il 20 gennaio 2026 la Commissione europea ha proposto, nell'ambito di un nuovo pacchetto sulla cibersicurezza, alcune modifiche mirate alla NIS2. Secondo il comunicato della Commissione, le modifiche semplificano le regole sulla giurisdizione, rendono più snella la raccolta di dati sugli attacchi ransomware, introducono la nuova categoria delle piccole imprese a media capitalizzazione e dovrebbero alleggerire gli adempimenti per circa 28.700 imprese, di cui 6.200 micro e piccole.</p>
<p>Si tratta, tuttavia, di una proposta. Essa dovrà essere approvata dal Parlamento europeo e dal Consiglio, e gli Stati membri avranno poi un anno per recepirla; fino ad allora restano applicabili il D.Lgs. 138/2024 e le determinazioni dell'ACN, sicché attendere le modifiche non è una ragione valida per rinviare l'adeguamento.</p>

<h2>Cosa fare adesso, in base alla propria posizione</h2>
<p>Gli adempimenti dei prossimi mesi variano a seconda della situazione dell'organizzazione.</p>
<ol>
  <li><strong>Soggetti in elenco dal 2025</strong>; il termine per le misure di base è scaduto, sicché occorre verificare che ogni requisito dell'allegato applicabile sia coperto e, soprattutto, che esista una prova documentale per ciascuno (policy approvate, registri, verbali dell'organo di amministrazione), in vista di eventuali controlli;</li>
  <li><strong>soggetti entrati in elenco nel 2026</strong>; vanno designati il referente CSIRT entro la fine del 2026 e predisposta la procedura di notifica degli incidenti prima del 1 gennaio 2027, pianificando le misure di base entro il 31 luglio 2027;</li>
  <li><strong>organizzazioni che non sanno se rientrano nella NIS2</strong>; conviene verificarlo prima della finestra di registrazione che si apre il 1 gennaio 2027 e si chiude il 28 febbraio 2027, considerando anche il ruolo di fornitore di un soggetto NIS;</li>
  <li><strong>tutti i soggetti NIS</strong>; va preparato l'aggiornamento annuale delle informazioni sul portale ACN, che si effettua nella stessa finestra.</li>
</ol>

<h2>Conclusioni</h2>
<p>In Italia la NIS2 non è più una norma da studiare ma un obbligo da dimostrare. Con la scadenza di ottobre 2026 si è chiusa la fase di prima applicazione per i soggetti del 2025, e la differenza la farà la capacità di provare, requisito per requisito, ciò che si è adottato; per i soggetti del 2026, invece, il calendario è ancora gestibile, a condizione di partire subito.</p>
<p>In Europa il quadro resta frammentato, ma il deferimento alla Corte di giustizia rende probabile che anche gli ultimi Stati recepiscano la direttiva a breve. Questa pagina sarà aggiornata a ogni nuova determinazione dell'ACN e a ogni sviluppo della procedura d'infrazione.</p>

<p><strong>Vuoi sapere a che punto è la tua organizzazione?</strong> <a href="/inizia">La gap analysis NIS2 di RegulaeOS</a> permette di confrontare le misure adottate con i requisiti degli allegati della determinazione ACN e di raccogliere le prove documentali per ciascuno.</p>
`,
    en: {
      title: "NIS2: implementation status in Italy and Europe (updated November 2026)",
      excerpt:
        "Italy transposed NIS2 through Legislative Decree 138/2024 and has entered the enforcement phase: past and upcoming deadlines, penalties and the transposition status in the other Member States.",
      date: "12 November 2026",
      readTime: "9 min",
      category: "Regulation",
      tags: ["NIS2", "Legislative Decree 138/2024", "ACN", "cybersecurity", "deadlines", "CSIRT Italia"],
      metaTitle: "NIS2: implementation status in Italy and Europe (November 2026) | RegulaeOS",
      metaDescription:
        "NIS2 implementation status as of November 2026: Legislative Decree 138/2024, ACN determinations, 2026-2027 deadlines, penalties and the Member States referred to the Court of Justice.",
      faqSchema: [
        {
          q: "Is NIS2 already in force in Italy?",
          a: "Yes. NIS2 was transposed by Legislative Decree 138/2024, in force since 16 October 2024; the detailed obligations are set by the ACN determinations, in particular no. 379907/2025, applicable from 15 January 2026.",
        },
        {
          q: "What was the October 2026 NIS2 deadline?",
          a: "It was the deadline, 18 months after the notice of inclusion in the NIS list, by which entities included in 2025 had to adopt the baseline security measures set out in Annexes 1 and 2 of ACN determination no. 379907/2025.",
        },
        {
          q: "What deadlines apply to NIS entities identified in 2026?",
          a: "Under ACN determination no. 127434/2026, they must appoint a CSIRT contact person by the end of 2026, notify significant incidents from 1 January 2027 and adopt the baseline security measures by 31 July 2027.",
        },
        {
          q: "When is the 2027 NIS registration?",
          a: "From 1 January to 28 February 2027 all NIS entities must register or update their registration on the ACN services portal, as every year.",
        },
        {
          q: "Which Member States have not yet transposed NIS2?",
          a: "On 8 July 2026 the Commission referred Ireland, Spain, France and the Netherlands to the Court of Justice. The Netherlands then adopted a law in force since 15 August 2026, while in France the bill is before the National Assembly and in Spain and Ireland transposition does not yet appear to be complete.",
        },
      ],
      content: `
<p><em>Avv. Umberto Mottola, CIPP/E · updated 12 Nov 2026</em></p>

<p class="ac-tldr">
  <strong>In short.</strong> Italy transposed the NIS2 Directive through Legislative Decree 138/2024, in force since 16 October 2024, and has now entered the enforcement phase: for entities added to the NIS list in 2025, the deadline to adopt the baseline security measures expired in October 2026, while those added in 2026 have until 31 July 2027. In Europe, Ireland, Spain, France and the Netherlands have been referred to the Court of Justice for late transposition.
</p>

<p><a href="/risorse/nis2">NIS2</a>, i.e. Directive (EU) 2022/2555 on the security of network and information systems, had to be transposed by all Member States by 17 October 2024. Two years on, the picture is two-speed: some countries, including Italy, are already in the practical implementation phase, while others still have no national law.</p>
<p>Anyone looking up the NIS2 implementation status usually wants to know three things: whether the rules already apply, which deadlines have passed and which are coming, and what those who are late are exposed to. This page answers each question based solely on official acts (the decree, the determinations of the National Cybersecurity Agency, European Commission press releases) and is updated every month.</p>

<h2>What is the NIS2 implementation status in Italy?</h2>
<p>In Italy NIS2 has been fully in force since 16 October 2024, when Legislative Decree 138/2024, which transposed it on time, entered into force. The competent authority is the National Cybersecurity Agency (ACN), which has already identified more than 20,000 NIS entities and is now checking their compliance.</p>
<p>The decree leaves it to ACN measures, called determinations, to turn the general obligations into verifiable requirements. The reference currently in force is ACN determination no. 379907 of 19 December 2025, which sets the so-called baseline specifications, i.e. the minimum security measures and the rules for notifying incidents; it applies from 15 January 2026 and replaces the previous determination no. 164179 of 14 April 2025.</p>
<p>The measures differ depending on the entity's category. Important entities must comply with Annex 1 of the determination, which according to ICT Security Magazine contains 37 measures and 87 requirements; essential entities must comply with Annex 2, which contains 43 and 116. Annexes 3 and 4, in turn, set out when an incident becomes significant and must therefore be notified to CSIRT Italia, the ACN unit that receives reports.</p>
<p>According to ACN, by December 2025 the NIS list exceeded 20,000 names, partly as a result of hundreds of late registrations and more than two thousand review procedures.</p>

<h2>Which NIS2 deadlines have passed and which are coming?</h2>
<p>The deadlines depend on the year in which the entity received the notice of inclusion in the NIS list, since the time limits run from that date. For entities listed since 2025 the deadline for the baseline measures expired in October 2026; for those added in 2026 it expires on 31 July 2027.</p>
<p>The table summarises the calendar drawn from the ACN page on the baseline specifications, from ACN determination no. 127434/2026, which governs the deadlines for new entities, and from the ACN NIS Vademecum.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>When</th><th>Who it concerns</th><th>What must be done</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>January 2026</td><td>Entities listed since 2025</td><td>Notify baseline significant incidents to CSIRT Italia (9 months after the notice of inclusion)</td><td class="ac-passed">Ongoing</td></tr>
      <tr><td>May and June 2026</td><td>All NIS entities</td><td>List and categorise activities and services (Art. 30 of the decree, which provides for a simplified impact analysis)</td><td class="ac-passed">Completed</td></tr>
      <tr><td>October 2026</td><td>Entities listed since 2025</td><td>Adopt all baseline security measures (18 months after the notice of inclusion)</td><td class="ac-passed">Expired</td></tr>
      <tr><td>By end of 2026</td><td>Entities added in 2026</td><td>Appoint the CSIRT contact person, i.e. the person who will liaise with CSIRT Italia</td><td class="ac-soon">Upcoming</td></tr>
      <tr><td>1 January 2027</td><td>Entities added in 2026</td><td>The obligation to notify significant incidents begins</td><td class="ac-soon">Upcoming</td></tr>
      <tr><td>1 January - 28 February 2027</td><td>All NIS entities</td><td>Annual registration or update on the ACN services portal</td><td class="ac-soon">Upcoming</td></tr>
      <tr><td>31 July 2027</td><td>Entities added in 2026</td><td>Adopt all baseline security measures</td><td class="ac-omnibus">To prepare</td></tr>
    </tbody>
  </table>
</div>

<p>It should be noted that the October 2026 deadline is calculated as 18 months from receipt of the notice of inclusion; the exact date must therefore be checked, for each entity, against the notice received from ACN.</p>

<h2>What happens after the October 2026 deadline?</h2>
<p>Now that the deadline for the baseline measures has passed, ACN can check whether the 2025 entities have actually adopted them. For essential entities supervision may also be proactive; for important entities, by contrast, checks start only where there is evidence suggesting an infringement.</p>
<p>The distinction, which derives from the directive, was confirmed by ACN in its answers to operators' questions, as reported by Diritto Bancario. In practice, an essential entity may be inspected even if no incident has occurred, so it must be able to demonstrate at any time which measures it has adopted and with what documentary evidence.</p>
<p>The maximum penalties under the decree, according to ICT Security Magazine, reach EUR 10 million or 2% of total worldwide annual turnover for essential entities, and EUR 7 million or 1.4% for important entities, whichever is higher. The decree also makes the management and governing bodies responsible for approving and overseeing the measures; security therefore cannot be delegated entirely to the IT function.</p>

<h2>Where does NIS2 transposition stand in the other Member States?</h2>
<p>Most Member States have now transposed NIS2, but four countries were referred to the Court of Justice of the European Union on 8 July 2026 for failing to notify full transposition: Ireland, Spain, France and the Netherlands.</p>
<p>The infringement procedure took place in three stages. The Commission sent letters of formal notice to 23 Member States on 28 November 2024; it then sent reasoned opinions to 19 Member States on 7 May 2025; finally it referred four Member States to the Court, seeking, according to Corriere Comunicazioni, a lump sum and daily penalty payments until full transposition.</p>

<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th>Country</th><th>Known situation</th><th>Source</th></tr>
    </thead>
    <tbody>
      <tr><td>Netherlands</td><td>Transposition law (Cyberbeveiligingswet) in force since 15 August 2026, adopted after the referral</td><td>NIS2 Tracker</td></tr>
      <tr><td>France</td><td>The bill, already passed by the Senate, has been before the National Assembly since 9 November 2026</td><td>LCP</td></tr>
      <tr><td>Spain</td><td>The bill stalled when elections were called; the transposition of the old NIS Directive (Royal Decree-law 12/2018) still applies</td><td>Cuatrecasas</td></tr>
      <tr><td>Ireland</td><td>The Government expects to notify transposition by the end of 2026</td><td>The Record</td></tr>
    </tbody>
  </table>
</div>

<p>For an Italian company with offices or suppliers in these countries, the delay has a practical effect: foreign subsidiaries remain subject to the previous national rules, while Italian customers that are NIS entities will still ask for assurances on supply chain security.</p>

<h2>The NIS2 amendments proposed by the Commission in 2026</h2>
<p>On 20 January 2026 the European Commission proposed, as part of a new cybersecurity package, targeted amendments to NIS2. According to the Commission's press release, the amendments simplify the rules on jurisdiction, streamline the collection of data on ransomware attacks, introduce the new category of small mid-cap enterprises and should ease the compliance burden for around 28,700 companies, 6,200 of them micro and small enterprises.</p>
<p>This is, however, only a proposal. It will have to be approved by the European Parliament and the Council, and Member States will then have one year to transpose it; until then Legislative Decree 138/2024 and the ACN determinations continue to apply, so waiting for the amendments is not a valid reason to postpone compliance.</p>

<h2>What to do now, depending on your position</h2>
<p>The obligations for the coming months vary depending on the organisation's situation.</p>
<ol>
  <li><strong>Entities listed since 2025</strong>: the deadline for the baseline measures has passed, so you need to check that every requirement of the applicable annex is covered and, above all, that there is documentary evidence for each one (approved policies, registers, minutes of the management body), in view of possible inspections;</li>
  <li><strong>entities added in 2026</strong>: appoint the CSIRT contact person by the end of 2026 and put the incident notification procedure in place before 1 January 2027, while planning the baseline measures for 31 July 2027;</li>
  <li><strong>organisations that do not know whether NIS2 applies to them</strong>: it is advisable to check before the registration window, which opens on 1 January 2027 and closes on 28 February 2027, also considering the role of supplier to a NIS entity;</li>
  <li><strong>all NIS entities</strong>: prepare the annual update of the information on the ACN portal, which takes place in the same window.</li>
</ol>

<h2>Conclusions</h2>
<p>In Italy NIS2 is no longer a rule to be studied but an obligation to be demonstrated. With the October 2026 deadline, the first application phase for the 2025 entities has closed, and what will make the difference is the ability to prove, requirement by requirement, what has been adopted; for the 2026 entities, by contrast, the calendar is still manageable, provided they start now.</p>
<p>In Europe the picture remains fragmented, but the referral to the Court of Justice makes it likely that the remaining Member States will transpose the directive shortly. This page will be updated with every new ACN determination and every development in the infringement procedure.</p>

<p><strong>Want to know where your organisation stands?</strong> <a href="/inizia">The RegulaeOS NIS2 gap analysis</a> lets you compare the measures you have adopted with the requirements of the annexes to the ACN determination and collect the documentary evidence for each one.</p>
`,
    },
  },
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
    metaTitle: "AI Act Quick Scan: 10 domande per trovare gap compliance | RegulaeOS",
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
<p>Da lì, la CTA è naturale: <a href="/scanner">provare lo scanner Art. 50</a>, <a href="/inizia">usare RegulaeOS</a> oppure <a href="/contatti">parlare con un professionista</a>.</p>

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
      metaTitle: "AI Act Quick Scan: 10 questions to find compliance gaps | RegulaeOS",
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
<p>From there, the CTA is natural: <a href="/scanner">try the Art. 50 scanner</a>, <a href="/inizia">use RegulaeOS</a> or <a href="/contatti">talk to a professional</a>.</p>

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
    metaTitle: "Sistema AI ad alto rischio: cos'è, chi rientra e cosa fare | RegulaeOS",
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
<p>RegulaeOS è costruito per comprimere quel percorso. Il <a href="/inizia">classificatore di rischio AI</a> identifica in pochi minuti se il tuo sistema rientra nell'Annex III. Se rientra, i tool guidano articolo per articolo. Il dossier finale è esportabile e pronto per le autorità di vigilanza.</p>
<p>Il primo assessment è pronto in meno di 48 ore. Puoi <a href="/inizia">iniziare adesso</a> senza aspettare dicembre 2027.</p>
`,
    en: {
      title: "What a high-risk AI system is: a practical guide to Annex III",
      excerpt:
        "Does your HR software filter CVs with an algorithm? Does your system assign credit scores? You probably have a high-risk system. Here are the 8 sectors, the Art. 6(3) exemptions and the 7 obligations you must meet by December 2027.",
      date: "3 June 2026",
      readTime: "9 min",
      category: "Guide",
      metaTitle: "High-risk AI system: what it is, who is in scope and what to do | RegulaeOS",
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
<p>RegulaeOS is built to compress that path. The <a href="/inizia">AI risk classifier</a> identifies in minutes whether your system falls under Annex III. If it does, the tools guide you article by article. The final dossier is exportable and ready for market surveillance authorities.</p>
<p>The first assessment is ready in less than 48 hours. You can <a href="/inizia">start now</a> without waiting for December 2027.</p>
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
      "Scadenze AI Act 2025-2028: calendario aggiornato dopo l'Omnibus | RegulaeOS",
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
<p>Se usi AI nei tuoi processi aziendali, il modo più rapido per capire cosa ti riguarda è partire dal <a href="/inizia">classificatore di rischio AI</a> integrato in RegulaeOS. Identifica il tier del tuo sistema in pochi minuti.</p>

<h2>Dicembre 2026: il watermarking obbligatorio</h2>
<p>Dal 2 dicembre 2026, chi genera contenuti audio, video, immagini o testo con sistemi AI deve applicare una marcatura machine-readable che identifichi il contenuto come artificiale.</p>
<p>L'obbligo viene dall'Art. 50(2) e riguarda i provider di sistemi che producono contenuti sintetici. Non si applica solo alle grandi tech company: se hai integrato un modello AI nella tua piattaforma per generare immagini, testi di prodotto o video, il watermarking è tuo obbligo.</p>
<p>L'<a href="https://www.mishcon.com/news/eu-ai-act-simplified-unpacking-the-ai-omnibus-agreement-of-may-2026" target="_blank" rel="noopener">accordo Omnibus</a> ha accorciato il periodo transitorio da sei a tre mesi rispetto alla data di entrata in vigore del regolamento, portando la scadenza al 2 dicembre 2026 invece di agosto.</p>
<p>RegulaeOS include uno <a href="/scanner">scanner Art. 50 gratuito</a> per verificare se i tuoi sistemi rientrano nell'obbligo di disclosure e watermarking.</p>

<h2>Dicembre 2027: la vera scadenza per i sistemi ad alto rischio</h2>
<p>Se il tuo sistema AI rientra nell'Annex III, hai tempo fino al 2 dicembre 2027. Ma non è un invito ad aspettare.</p>
<p>I sistemi Annex III coprono otto aree: selezione e gestione del personale, scoring creditizio, biometria, infrastrutture critiche, forze dell'ordine, giustizia e processi giudiziari, istruzione e formazione professionale, servizi pubblici e migrazione. <a href="https://www.ascensys.it/blog/ai-act-pmi-agosto-2026" target="_blank" rel="noopener">Gran parte delle imprese italiane</a> che usano AI in HR o customer scoring ricade in questo perimetro senza saperlo.</p>
<p>La conformità Annex III non si risolve in una settimana. Richiede documentazione tecnica (Annex IV), sistema di risk management, data governance, logging con retention minima di 6 mesi, supervisione umana documentata, FRIA se sei un'autorità pubblica o istituzione finanziaria, DPIA se tratti dati personali, registrazione nel database EUDB. L'intero iter richiede tipicamente tra 6 e 18 mesi.</p>
<p>Dicembre 2027 è lontano. Il percorso non lo è. Puoi partire dall'<a href="/inizia">assessment iniziale</a> in meno di 48 ore.</p>

<h2>Quanto tempo ci vuole davvero per essere conformi?</h2>
<p>La risposta dipende da due variabili: quanto è complesso il tuo sistema AI e quanto sei organizzato nella raccolta della documentazione.</p>
<p>Un percorso di conformità completo per un sistema Annex III fatto in modo tradizionale richiede consulenze legali, audit tecnici, redazione di documentazione, gap analysis, assessment DPIA e FRIA. Il mercato parla di 6-18 mesi, con costi che variano dai 30.000 ai 150.000 euro per un sistema di media complessità.</p>
<p>RegulaeOS è costruito per comprimere quel percorso. Il primo assessment è pronto in meno di 48 ore. I tool guidano ogni articolo del regolamento, dai check Art. 5 alla dichiarazione di conformità. Il dossier finale è esportabile e pronto per un notified body o per le autorità di vigilanza.</p>
<p>Puoi <a href="/inizia">usare RegulaeOS</a> o iniziare subito con lo scanner gratuito.</p>
`,
    en: {
      title: "Updated AI Act deadlines: the 2025–2028 calendar after the Omnibus delay",
      excerpt:
        "Two deadlines have already passed. One is coming in a few months. The heaviest ones have been moved. Here is the full calendar after the Omnibus agreement of 7 May 2026.",
      date: "2 June 2026",
      readTime: "8 min",
      category: "Regulation",
      metaTitle: "AI Act deadlines 2025-2028: updated calendar after the Omnibus | RegulaeOS",
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
<p>If you use AI in your business processes, the fastest way to understand what concerns you is to start from the <a href="/inizia">AI risk classifier</a> built into RegulaeOS. It identifies your system's tier in minutes.</p>

<h2>December 2026: mandatory watermarking</h2>
<p>From 2 December 2026, anyone who generates audio, video, image or text content with AI systems must apply a machine-readable marking that identifies the content as artificial.</p>
<p>The obligation comes from Art. 50(2) and concerns providers of systems that produce synthetic content. It does not apply only to big tech companies: if you have embedded an AI model in your platform to generate images, product copy or videos, watermarking is your obligation.</p>
<p>The <a href="https://www.mishcon.com/news/eu-ai-act-simplified-unpacking-the-ai-omnibus-agreement-of-may-2026" target="_blank" rel="noopener">Omnibus agreement</a> shortened the transition period from six to three months relative to the regulation's entry into force, bringing the deadline to 2 December 2026 instead of August.</p>
<p>RegulaeOS includes a free <a href="/scanner">Art. 50 scanner</a> to check whether your systems fall under the disclosure and watermarking obligation.</p>

<h2>December 2027: the real deadline for high-risk systems</h2>
<p>If your AI system falls under Annex III, you have until 2 December 2027. But it is not an invitation to wait.</p>
<p>Annex III systems cover eight areas: recruitment and employment management, credit scoring, biometrics, critical infrastructure, law enforcement, justice and judicial processes, education and vocational training, public services and migration. <a href="https://www.ascensys.it/blog/ai-act-pmi-agosto-2026" target="_blank" rel="noopener">Most Italian businesses</a> that use AI in HR or customer scoring fall within this scope without knowing it.</p>
<p>Annex III compliance is not solved in a week. It requires technical documentation (Annex IV), a risk management system, data governance, logging with a minimum retention of 6 months, documented human oversight, a FRIA if you are a public authority or financial institution, a DPIA if you process personal data, and registration in the EUDB database. The whole process typically takes between 6 and 18 months.</p>
<p>December 2027 is far away. The path is not. You can start from the <a href="/inizia">initial assessment</a> in less than 48 hours.</p>

<h2>How long does it really take to become compliant?</h2>
<p>The answer depends on two variables: how complex your AI system is and how organised you are in collecting the documentation.</p>
<p>A full compliance path for an Annex III system done the traditional way requires legal advice, technical audits, drafting of documentation, gap analysis, DPIA and FRIA assessments. The market talks about 6-18 months, with costs ranging from 30,000 to 150,000 euros for a system of medium complexity.</p>
<p>RegulaeOS is built to compress that path. The first assessment is ready in less than 48 hours. The tools guide every article of the regulation, from the Art. 5 checks to the declaration of conformity. The final dossier is exportable and ready for a notified body or for market surveillance authorities.</p>
<p>You can <a href="/inizia">use RegulaeOS</a> or start now with the free scanner.</p>
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
