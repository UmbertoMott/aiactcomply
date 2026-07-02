// AI_ACT_DEADLINES — array statico 11 voci (PROMPT AP / PARTE 0)
// Verifica e conferma: date, articoli e numerazione paragrafi Art. 113
// richiedono validazione legale contro il testo consolidato Reg. (UE) 2024/1689.
import type { AIActDeadline } from "./deadline-types";

export const AI_ACT_DEADLINES: AIActDeadline[] = [
  {
    id: "prohibited_practices",
    date: "2025-02-02",
    label: "Pratiche vietate e alfabetizzazione AI",
    description:
      "Entrata in vigore del divieto assoluto delle pratiche vietate Art. 5 (manipolazione subliminale, social scoring, identificazione biometrica real-time non autorizzata, ecc.) e degli obblighi di alfabetizzazione AI Art. 4. [verify against current AI Act text]",
    article: "Art. 5, Art. 4 [verify against current AI Act text]",
    applies_to: ["all"],
    tool_href: "/dashboard/tools/prohibited",
    severity: "critical",
  },
  {
    id: "gpai_obligations",
    date: "2025-08-02",
    label: "Obblighi GPAI e governance",
    description:
      "Applicazione degli obblighi per i modelli di uso generale (GPAI): documentazione tecnica, trasparenza verso i provider downstream, conformità copyright. Per i modelli a rischio sistemico: valutazione sicurezza, notifica incidenti, misure di cybersecurity. [verify against current AI Act text]",
    article: "Art. 53, Art. 55 [verify against current AI Act text]",
    applies_to: ["gpai", "gpai_systemic"],
    tool_href: "/dashboard/tools/gpai",
    severity: "critical",
  },
  {
    id: "governance_bodies",
    date: "2025-08-02",
    label: "Organi di governance nazionali",
    description:
      "Gli Stati Membri devono designare le autorità nazionali competenti. [verify against current AI Act text]",
    article: "Art. 70 [verify against current AI Act text]",
    applies_to: ["all"],
    severity: "informational",
  },
  {
    id: "l132_2025_obligations",
    date: "2025-10-10",
    label: "Obblighi L. 132/2025 (AI nazionale Italia)",
    description:
      "Entrata in vigore degli obblighi della legge italiana di delegazione AI. Applicabile alle organizzazioni che operano in Italia. [verify against current AI Act text]",
    article: "L. 132/2025 [verify against current AI Act text]",
    applies_to: ["all"],
    tool_href: "/dashboard/tools/l132",
    severity: "important",
  },
  {
    id: "codes_of_practice",
    date: "2025-05-02",
    label: "Codici di condotta GPAI",
    description:
      "Scadenza per la prima versione dei codici di condotta GPAI sviluppati dall'AI Office europeo con stakeholder. [verify against current AI Act text]",
    article: "Art. 56 [verify against current AI Act text]",
    applies_to: ["gpai", "gpai_systemic"],
    severity: "informational",
  },
  {
    id: "high_risk_annex3_full",
    date: "2026-08-02",
    label: "Sistemi ad alto rischio (Annex III) — piena applicazione",
    description:
      "Piena applicazione di tutti gli obblighi per i sistemi ad alto rischio elencati nell'Allegato III: gestione del rischio (Art. 9), qualità dei dati (Art. 10), documentazione tecnica (Art. 11), logging (Art. 12), trasparenza (Art. 13), supervisione umana (Art. 14), accuracy e robustezza (Art. 15), registrazione EUDB (Art. 49). [verify against current AI Act text]",
    article: "Art. 9-15, Art. 49, Annex III [verify against current AI Act text]",
    applies_to: ["high_risk_annex3"],
    tool_href: "/dashboard/triage",
    severity: "critical",
  },
  {
    id: "public_authority_deployer",
    date: "2026-08-02",
    label: "Deployer — enti pubblici: obblighi aggiuntivi",
    description:
      "Gli enti pubblici deployer di sistemi ad alto rischio Annex III devono completare la registrazione nel database UE (Art. 26(8)) e la notifica all'autorita di vigilanza del mercato. [verify against current AI Act text]",
    article: "Art. 26(8), Art. 49 [verify against current AI Act text]",
    applies_to: ["high_risk_annex3"],
    tool_href: "/dashboard/tools/deployer-dashboard",
    severity: "important",
  },
  {
    id: "high_risk_annex1",
    date: "2027-08-02",
    label: "Sistemi ad alto rischio (Annex I) — prodotti regolamentati",
    description:
      "Applicazione agli AI systems che sono componenti di sicurezza di prodotti soggetti alla normativa elencata nell'Allegato I (macchinari, dispositivi medici, ecc.) immessi sul mercato o messi in servizio dopo questa data. [verify against current AI Act text]",
    article: "Art. 6(1), Annex I [verify against current AI Act text]",
    applies_to: ["high_risk_annex1"],
    tool_href: "/dashboard/triage",
    severity: "important",
  },
  {
    id: "gpai_systemic_full",
    date: "2027-08-02",
    label: "GPAI con rischio sistemico — obblighi aggiuntivi",
    description:
      "Piena applicazione degli obblighi aggiuntivi per i modelli GPAI a rischio sistemico: valutazione dell'impatto, segnalazione incidenti gravi all'AI Office, misure di sicurezza informatica avanzate. [verify against current AI Act text]",
    article: "Art. 55 [verify against current AI Act text]",
    applies_to: ["gpai_systemic"],
    tool_href: "/dashboard/tools/gpai",
    severity: "critical",
  },
  {
    id: "full_regulation",
    date: "2026-08-02",
    label: "Regolamento — piena applicazione generale",
    description:
      "Data di applicazione generale del Regolamento (UE) 2024/1689, salvo le disposizioni con date diverse indicate negli altri articoli. [verify against current AI Act text]",
    article: "Art. 113 [verify against current AI Act text]",
    applies_to: ["all"],
    severity: "critical",
  },
  {
    id: "post_market_first_report",
    date: "2027-08-02",
    label: "Post-Market Monitoring — primo report (stima)",
    description:
      "Data stimata per il primo report di monitoraggio post-market per sistemi ad alto rischio Annex III immessi sul mercato nel 2026. La periodicita esatta e soggetta a verifica contro Art. 72 [verify against current AI Act text]. La scadenza effettiva dipende dalla data di messa in servizio del singolo sistema.",
    article: "Art. 72 [verify against current AI Act text]",
    applies_to: ["high_risk_annex3", "gpai_systemic"],
    tool_href: "/dashboard/post-market",
    severity: "important",
  },
];

export const DEADLINE_ACTIONS: Record<string, { label: string; href?: string }[]> = {
  prohibited_practices: [
    { label: "Verifica pratiche vietate (Art. 5 Checker)", href: "/dashboard/tools/prohibited" },
    { label: "Programma alfabetizzazione AI per il personale (Art. 4)", href: "/dashboard/tools/literacy" },
  ],
  gpai_obligations: [
    { label: "Configura modulo GPAI", href: "/dashboard/tools/gpai" },
    { label: "Genera documentazione tecnica GPAI", href: "/dashboard/tools/docugen" },
  ],
  governance_bodies: [
    { label: "Verifica autorita nazionale designata nel tuo Stato Membro" },
  ],
  l132_2025_obligations: [
    { label: "Verifica obblighi L. 132/2025", href: "/dashboard/tools/l132" },
    { label: "Configura AGID/ACN", href: "/dashboard/tools/agid-acn" },
  ],
  codes_of_practice: [
    { label: "Monitora aggiornamenti codici di condotta AI Office", href: "/dashboard/tools/gpai" },
  ],
  high_risk_annex3_full: [
    { label: "Completa il Risk Manager (Art. 9)", href: "/dashboard/tools/risk-manager" },
    { label: "Completa Data Audit con dati reali (Art. 10)", href: "/dashboard/tools/data-audit" },
    { label: "Genera documentazione tecnica (Art. 11 - DocuGen)", href: "/dashboard/tools/docugen" },
    { label: "Configura LogVault con import reale (Art. 12)", href: "/dashboard/tools/logvault" },
    { label: "Completa Human Oversight - DocuGen step 04 (Art. 14)", href: "/dashboard/tools/docugen" },
    { label: "Completa Art. 50 Kit - disclosure (Art. 50)", href: "/dashboard/tools/art50-kit" },
    { label: "Registrati in EUDB (Art. 49)", href: "/dashboard/tools/eudb" },
  ],
  public_authority_deployer: [
    { label: "Completa Deployer Dashboard - obblighi Art. 26", href: "/dashboard/tools/deployer-dashboard" },
    { label: "Registrati in EUDB (Art. 49)", href: "/dashboard/tools/eudb" },
  ],
  high_risk_annex1: [
    { label: "Verifica classificazione nel Triage", href: "/dashboard/triage" },
    { label: "Prepara documentazione Annex I", href: "/dashboard/tools/docugen" },
  ],
  gpai_systemic_full: [
    { label: "Configura modulo GPAI sistemi a rischio sistemico", href: "/dashboard/tools/gpai" },
    { label: "Prepara valutazione sicurezza avanzata", href: "/dashboard/tools/risk-manager" },
  ],
  full_regulation: [
    { label: "Verifica copertura completa di tutti i moduli AIComply", href: "/dashboard" },
  ],
  post_market_first_report: [
    { label: "Configura monitoraggio post-market (Art. 72)", href: "/dashboard/post-market" },
    { label: "Verifica data di messa in servizio in DocuGen", href: "/dashboard/tools/docugen" },
  ],
};
