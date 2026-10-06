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
      "Entrata in vigore del divieto assoluto delle pratiche vietate Art. 5 (manipolazione subliminale, social scoring, identificazione biometrica real-time non autorizzata, ecc.) e degli obblighi di alfabetizzazione AI Art. 4.",
    article: "Art. 5, Art. 4",
    applies_to: ["all"],
    tool_href: "/dashboard/triage",
    severity: "critical",
  },
  {
    id: "gpai_obligations",
    date: "2025-08-02",
    label: "Obblighi GPAI e governance",
    description:
      "Applicazione degli obblighi per i modelli di uso generale (GPAI): documentazione tecnica, trasparenza verso i provider downstream, conformità copyright. Per i modelli a rischio sistemico: valutazione sicurezza, notifica incidenti, misure di cybersecurity.",
    article: "Art. 53, Art. 55",
    applies_to: ["gpai", "gpai_systemic"],
    tool_href: "/dashboard/tools/gpai",
    severity: "critical",
  },
  {
    id: "governance_bodies",
    date: "2025-08-02",
    label: "Organi di governance nazionali",
    description:
      "Gli Stati Membri devono designare le autorità nazionali competenti.",
    article: "Art. 70",
    applies_to: ["all"],
    severity: "informational",
  },
  {
    id: "l132_2025_obligations",
    date: "2025-10-10",
    label: "Obblighi L. 132/2025 (AI nazionale Italia)",
    description:
      "Entrata in vigore degli obblighi della legge italiana di delegazione AI. Applicabile alle organizzazioni che operano in Italia.",
    article: "L. 132/2025",
    applies_to: ["all"],
    tool_href: "/dashboard/tools/l132",
    severity: "important",
  },
  {
    id: "codes_of_practice",
    date: "2025-05-02",
    label: "Codici di buone pratiche GPAI",
    description:
      "I codici di buone pratiche per i modelli di IA per finalità generali devono essere pronti al più tardi entro il 2 maggio 2025 (Art. 56(9)). Non vanno confusi con i codici di condotta dell'Art. 95.",
    article: "Art. 56(9)",
    applies_to: ["gpai", "gpai_systemic"],
    severity: "informational",
  },
  {
    id: "high_risk_annex3_full",
    date: "2027-12-02",
    label: "Sistemi ad alto rischio (Annex III) — piena applicazione",
    description:
      "Piena applicazione di tutti gli obblighi per i sistemi ad alto rischio elencati nell'Allegato III: gestione del rischio (Art. 9), qualità dei dati (Art. 10), documentazione tecnica (Art. 11), logging (Art. 12), trasparenza (Art. 13), sorveglianza umana (Art. 14), accuracy e robustezza (Art. 15), registrazione EUDB (Art. 49).",
    article: "Art. 9-15, Art. 49, Annex III — Art. 113 come modificato dal Reg. (UE) 2026/1744",
    applies_to: ["high_risk_annex3"],
    tool_href: "/dashboard/triage",
    severity: "critical",
  },
  {
    id: "public_authority_deployer",
    date: "2027-12-02",
    label: "Deployer — enti pubblici: obblighi aggiuntivi",
    description:
      "Gli enti pubblici deployer di sistemi ad alto rischio Annex III devono completare la registrazione nel database UE (Art. 26(8)) e la notifica all'autorita di vigilanza del mercato.",
    article: "Art. 26(8), Art. 49",
    applies_to: ["high_risk_annex3"],
    tool_href: "/dashboard/tools/deployer-dashboard",
    severity: "important",
  },
  {
    id: "high_risk_annex1",
    date: "2028-08-02",
    label: "Sistemi ad alto rischio (Annex I) — prodotti regolamentati",
    description:
      "Applicazione degli obblighi per l'alto rischio ai sistemi di IA che sono componenti di sicurezza di prodotti (o prodotti) disciplinati dall'Allegato I e soggetti a valutazione di terzi. I sistemi già immessi sul mercato prima di questa data sono soggetti solo se subiscono modifiche significative (Art. 111(2)).",
    article: "Art. 6(1), Annex I — Art. 113 come modificato dal Reg. (UE) 2026/1744",
    applies_to: ["high_risk_annex1"],
    tool_href: "/dashboard/triage",
    severity: "important",
  },
  {
    id: "gpai_systemic_full",
    date: "2027-08-02",
    label: "Modelli GPAI già sul mercato prima del 2 agosto 2025",
    description:
      "Termine entro cui i fornitori di modelli GPAI immessi sul mercato prima del 2 agosto 2025 si conformano agli obblighi degli Artt. 53-55 (per i modelli nuovi gli obblighi si applicano dal 2 agosto 2025).",
    article: "Art. 111(3)",
    applies_to: ["gpai", "gpai_systemic"],
    tool_href: "/dashboard/tools/gpai",
    severity: "critical",
  },
  {
    id: "full_regulation",
    date: "2026-08-02",
    label: "Regolamento — piena applicazione generale",
    description:
      "Data di applicazione generale del Regolamento (UE) 2024/1689, salvo le disposizioni con date diverse indicate negli altri articoli.",
    article: "Art. 113",
    applies_to: ["all"],
    severity: "critical",
  },
  {
    id: "art50_2_legacy",
    date: "2026-12-02",
    label: "Marcatura dei contenuti sintetici — sistemi già sul mercato",
    description:
      "I fornitori di sistemi che generano audio, immagini, video o testi sintetici immessi sul mercato prima del 2 agosto 2026 si conformano all'Art. 50(2) entro questa data. Per i sistemi nuovi l'Art. 50 si applica dal 2 agosto 2026.",
    article: "Art. 50(2), Art. 111(4) (Reg. (UE) 2026/1744)",
    applies_to: ["limited"],
    tool_href: "/dashboard/tools/art50-kit",
    severity: "important",
  },
  {
    id: "art5_new_prohibitions",
    date: "2026-12-02",
    label: "Nuove pratiche vietate: contenuti intimi non consensuali e CSAM",
    description:
      "Si applicano i divieti dell'Art. 5(1)(ba) e (bb) introdotti dal Reg. (UE) 2026/1744: sistemi che generano o manipolano immagini intime realistiche di persone identificabili senza consenso, o materiale pedopornografico.",
    article: "Art. 5(1)(ba)-(bb)",
    applies_to: ["all"],
    tool_href: "/dashboard/triage",
    severity: "critical",
  },
  {
    id: "public_authority_legacy",
    date: "2030-08-02",
    label: "Sistemi ad alto rischio usati da autorità pubbliche — termine finale",
    description:
      "Fornitori e deployer di sistemi ad alto rischio destinati alle autorità pubbliche si conformano entro questa data anche se il sistema era già in uso prima dell'applicazione del Capo III.",
    article: "Art. 111(2)",
    applies_to: ["high_risk_annex3", "high_risk_annex1"],
    severity: "important",
  },
];

export const DEADLINE_ACTIONS: Record<string, { label: string; href?: string }[]> = {
  prohibited_practices: [
    { label: "Verifica pratiche vietate nel Triage (Art. 5)", href: "/dashboard/triage" },
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
    { label: "Registrati in EUDB (Art. 49)", href: "/dashboard/compliance-ops/eudb" },
  ],
  public_authority_deployer: [
    { label: "Completa Deployer Dashboard - obblighi Art. 26", href: "/dashboard/tools/deployer-dashboard" },
    { label: "Registrati in EUDB (Art. 49)", href: "/dashboard/compliance-ops/eudb" },
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
    { label: "Verifica copertura completa di tutti i moduli RegulaeOS", href: "/dashboard" },
  ],
};
