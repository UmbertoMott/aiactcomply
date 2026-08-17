import type { Locale } from "./config";

// Dizionari di traduzione, organizzati per namespace (sezione) → chiave → testo.
// Precisione legale: i riferimenti agli articoli (Art. 50, Art. 99…) restano
// invariati; la terminologia EN segue la versione ufficiale del Reg. (UE) 2024/1689.
//
// Man mano che rendiamo bilingue nuove pagine, si aggiungono namespace qui.

type Namespace = Record<string, string>;
export type Dictionary = Record<string, Namespace>;

export const DICTIONARIES: Record<Locale, Dictionary> = {
  it: {
    nav: {
      product: "Prodotto",
      pricing: "Prezzi",
      scanner: "Scanner Art. 50",
      resources: "Risorse",
      login: "Accedi",
      bookDemo: "Prenota demo",
      contents: "Contenuti",
      tools: "Strumenti",
      blogLabel: "Blog & Articoli",
      blogDesc: "Analisi e aggiornamenti sull'EU AI Act.",
      roiToolLabel: "Calcolatore ROI sanzioni",
      roiToolDesc: "Stima l'esposizione alle sanzioni AI Act e il ROI della prevenzione.",
      productToolLabel: "Il prodotto",
      productToolDesc: "I sei moduli per l'intero ciclo di conformità.",
      roiCardKicker: "Esposizione fino a",
      roiCardTurnover: "del fatturato · Art. 99 AI Act",
      roiCardTitle: "Calcolatore ROI — Evita le sanzioni",
      roiCardDesc: "Stima la tua esposizione e il ritorno della prevenzione in base al fatturato e al tipo di violazione.",
    },
    hero: {
      badge: "EU AI Act — In vigore agosto 2026",
      without: "senza",
      cyclingWords: "compromessi,burocrazia,ritardi,rischi,eccezioni",
      framing: "Assistenza professionale alla conformità AI Act, erogata da un avvocato iscritto all'albo. Il software è lo strumento con cui il servizio è reso.",
      subtitle: "Risk assessment, FRIA, DPIA e documentazione tecnica: ogni valutazione è assistita dallo strumento e validata dall'avvocato.",
      ctaPrimary: "Attiva l'assistenza",
      ctaSecondary: "Scopri i piani",
    },
    platform: {
      kicker: "La piattaforma",
      title1: "La piattaforma unificata",
      title2: "per la conformità AI.",
      subtitle: "Un unico sistema che connette classificazione, documentazione ed esecuzione degli obblighi normativi EU AI Act.",
      classifier_name: "AI Classifier",
      classifier_desc: "Classificazione rischio automatica secondo gli allegati EU AI Act. Mappa il sistema agli articoli applicabili e genera le prime azioni da intraprendere in pochi minuti.",
      risk_name: "Risk Manager",
      risk_desc: "Risk register, gap analysis e copertura Art. 9. Ogni rischio tracciato con misure di mitigazione, probabilità di impatto e responsabili assegnati.",
      docs_name: "Documentazione",
      docs_desc: "Fascicolo tecnico Annex IV generato automaticamente. FRIA e DPIA pre-compilate dai dati già inseriti — nessun copia-incolla tra moduli.",
      dataAudit_name: "Data Audit",
      dataAudit_desc: "Qualità dati, bias detection e data lineage traceability. Metriche di conformità in tempo reale su dataset di training e inferenza.",
      logvault_name: "LogVault",
      logvault_desc: "Logging hash-chained e audit trail immutabile. Ogni operazione firmata crittograficamente e verificabile dagli ispettori dell'autorità di vigilanza.",
      fria_name: "FRIA",
      fria_desc: "Fundamental Rights Impact Assessment guidato passo-passo. Sincronizzato in tempo reale con Risk Manager e DPIA — i dati comuni non si inseriscono due volte.",
      postmarket_name: "Post-Market",
      postmarket_desc: "Monitoraggio continuo con drift detection automatica. Soglie pre-configurate inviano alert all'autorità notificante secondo Art. 73 senza intervento manuale.",
      scanner_name: "Scanner",
      scanner_desc: "Verifica trasparenza AI gratuita e anonima. Report completo in 30 secondi con valutazione Art. 50: nessuna registrazione richiesta.",
    },
  },
  en: {
    nav: {
      product: "Product",
      pricing: "Pricing",
      scanner: "Art. 50 Scanner",
      resources: "Resources",
      login: "Log in",
      bookDemo: "Book a demo",
      contents: "Contents",
      tools: "Tools",
      blogLabel: "Blog & Articles",
      blogDesc: "Analysis and updates on the EU AI Act.",
      roiToolLabel: "Penalty ROI Calculator",
      roiToolDesc: "Estimate your AI Act penalty exposure and the ROI of prevention.",
      productToolLabel: "The product",
      productToolDesc: "The six modules covering the full compliance lifecycle.",
      roiCardKicker: "Exposure up to",
      roiCardTurnover: "of annual turnover · Art. 99 AI Act",
      roiCardTitle: "ROI Calculator — Avoid the penalties",
      roiCardDesc: "Estimate your exposure and the return on prevention based on turnover and type of infringement.",
    },
    hero: {
      badge: "EU AI Act — In force August 2026",
      without: "without",
      cyclingWords: "compromise,red tape,delays,risk,exceptions",
      framing: "Professional AI Act compliance assistance, delivered by a lawyer admitted to the Bar. The software is the tool through which the service is delivered.",
      subtitle: "Risk assessment, FRIA, DPIA and technical documentation: every assessment is supported by the tool and validated by the lawyer.",
      ctaPrimary: "Get assistance",
      ctaSecondary: "See the plans",
    },
    platform: {
      kicker: "The platform",
      title1: "The unified platform",
      title2: "for AI compliance.",
      subtitle: "A single system connecting the classification, documentation and execution of EU AI Act obligations.",
      classifier_name: "AI Classifier",
      classifier_desc: "Automatic risk classification based on the EU AI Act annexes. Maps the system to the applicable articles and generates the first actions to take within minutes.",
      risk_name: "Risk Manager",
      risk_desc: "Risk register, gap analysis and Art. 9 coverage. Every risk tracked with mitigation measures, impact likelihood and assigned owners.",
      docs_name: "Documentation",
      docs_desc: "Annex IV technical documentation generated automatically. FRIA and DPIA pre-filled from data already entered — no copy-pasting between modules.",
      dataAudit_name: "Data Audit",
      dataAudit_desc: "Data quality, bias detection and data lineage traceability. Real-time compliance metrics on training and inference datasets.",
      logvault_name: "LogVault",
      logvault_desc: "Hash-chained logging and immutable audit trail. Every operation cryptographically signed and verifiable by market-surveillance authority inspectors.",
      fria_name: "FRIA",
      fria_desc: "Step-by-step guided Fundamental Rights Impact Assessment. Synced in real time with Risk Manager and DPIA — shared data is never entered twice.",
      postmarket_name: "Post-Market",
      postmarket_desc: "Continuous monitoring with automatic drift detection. Pre-configured thresholds send alerts to the notifying authority under Art. 73 with no manual intervention.",
      scanner_name: "Scanner",
      scanner_desc: "Free, anonymous AI transparency check. Full report in 30 seconds with an Art. 50 assessment: no sign-up required.",
    },
  },
};

// Traduce con fallback: locale richiesto → italiano → la chiave stessa.
export function translate(locale: Locale, ns: string, key: string): string {
  return (
    DICTIONARIES[locale]?.[ns]?.[key] ??
    DICTIONARIES.it?.[ns]?.[key] ??
    key
  );
}
