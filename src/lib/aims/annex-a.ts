// Controlli dell'Allegato A della ISO/IEC 42001:2023 per la Dichiarazione di
// Applicabilità (clausola 6.1.3). Solo numerazione e descrizioni parafrasate:
// il testo della norma non è riprodotto. Numerazione verificata sulla prima
// edizione (2023-12). L'abbinamento con gli articoli del Reg. (UE) 2024/1689
// (come modificato dal Reg. (UE) 2026/1744) e con i tool è interpretativo.

export interface AnnexAControl {
  id: string;
  /** Tema (A.2 … A.10) */
  group: string;
  it: string;
  en: string;
  /** Articoli dell'AI Act collegati (indicativo) */
  articles: string[];
  /** Dove si attua nella piattaforma: href dei tool o ancora di questa pagina */
  tools: string[];
}

export const ANNEX_A_GROUPS: Record<string, { it: string; en: string }> = {
  "A.2": { it: "Politiche sull'IA", en: "AI policies" },
  "A.3": { it: "Organizzazione interna", en: "Internal organisation" },
  "A.4": { it: "Risorse per i sistemi di IA", en: "Resources for AI systems" },
  "A.5": { it: "Valutazione degli impatti", en: "Impact assessment" },
  "A.6": { it: "Ciclo di vita del sistema", en: "System life cycle" },
  "A.7": { it: "Dati per i sistemi di IA", en: "Data for AI systems" },
  "A.8": { it: "Informazioni alle parti interessate", en: "Information for interested parties" },
  "A.9": { it: "Uso dei sistemi di IA", en: "Use of AI systems" },
  "A.10": { it: "Terze parti e clienti", en: "Third parties and customers" },
};

const P = "/dashboard/tools/aims";

export const ANNEX_A: AnnexAControl[] = [
  { id: "A.2.2", group: "A.2", it: "Avere una politica sull'IA documentata", en: "Have a documented AI policy", articles: ["Art. 17(1)"], tools: [`${P}#policy`] },
  { id: "A.2.3", group: "A.2", it: "Coerenza della politica IA con le altre politiche aziendali", en: "Consistency of the AI policy with other organisational policies", articles: [], tools: [`${P}#policy`] },
  { id: "A.2.4", group: "A.2", it: "Riesame periodico della politica IA", en: "Periodic review of the AI policy", articles: [], tools: [`${P}#policy`] },
  { id: "A.3.2", group: "A.3", it: "Ruoli e responsabilità per l'IA definiti e assegnati", en: "AI roles and responsibilities defined and assigned", articles: ["Art. 17(1)(m)", "Art. 26(2)"], tools: [`${P}#roles`, "/dashboard/tools/oversight"] },
  { id: "A.3.3", group: "A.3", it: "Processo per segnalare dubbi sui sistemi di IA", en: "Process for reporting concerns about AI systems", articles: ["Art. 87"], tools: [`${P}#reporting`] },
  { id: "A.4.2", group: "A.4", it: "Documentare le risorse usate dai sistemi di IA", en: "Document the resources used by AI systems", articles: ["Art. 11", "Allegato IV"], tools: ["/dashboard/tools/docugen"] },
  { id: "A.4.3", group: "A.4", it: "Documentare le risorse di dati", en: "Document data resources", articles: ["Art. 10"], tools: ["/dashboard/tools/data-audit"] },
  { id: "A.4.4", group: "A.4", it: "Documentare gli strumenti usati", en: "Document the tooling used", articles: ["Allegato IV"], tools: ["/dashboard/tools/docugen"] },
  { id: "A.4.5", group: "A.4", it: "Documentare le risorse di sistema e di calcolo", en: "Document system and computing resources", articles: ["Allegato IV"], tools: ["/dashboard/tools/docugen"] },
  { id: "A.4.6", group: "A.4", it: "Documentare le competenze delle persone coinvolte", en: "Document the competences of the people involved", articles: ["Art. 4", "Art. 26(2)"], tools: ["/dashboard/tools/literacy"] },
  { id: "A.5.2", group: "A.5", it: "Processo per valutare l'impatto dei sistemi di IA", en: "Process for assessing the impact of AI systems", articles: ["Art. 27", "Art. 26(9)"], tools: ["/dashboard/tools/fria"] },
  { id: "A.5.3", group: "A.5", it: "Documentare le valutazioni d'impatto", en: "Document impact assessments", articles: ["Art. 27"], tools: ["/dashboard/tools/fria"] },
  { id: "A.5.4", group: "A.5", it: "Valutare l'impatto su persone e gruppi", en: "Assess the impact on individuals and groups", articles: ["Art. 27(1)"], tools: ["/dashboard/tools/fria"] },
  { id: "A.5.5", group: "A.5", it: "Valutare l'impatto sulla società", en: "Assess the impact on society", articles: [], tools: [`${P}#societal`] },
  { id: "A.6.1.2", group: "A.6", it: "Obiettivi per lo sviluppo responsabile", en: "Objectives for responsible development", articles: ["Art. 9"], tools: [`${P}#objectives`, "/dashboard/tools/risk-manager"] },
  { id: "A.6.1.3", group: "A.6", it: "Processi per progettazione e sviluppo responsabili", en: "Processes for responsible design and development", articles: ["Art. 17(1)(b)-(c)"], tools: ["/dashboard/tools/qms"] },
  { id: "A.6.2.2", group: "A.6", it: "Requisiti e specifiche del sistema", en: "System requirements and specification", articles: ["Allegato IV"], tools: ["/dashboard/tools/docugen"] },
  { id: "A.6.2.3", group: "A.6", it: "Documentare progettazione e sviluppo", en: "Document design and development", articles: ["Art. 11"], tools: ["/dashboard/tools/docugen"] },
  { id: "A.6.2.4", group: "A.6", it: "Verifica e convalida del sistema", en: "System verification and validation", articles: ["Art. 9(6)-(8)", "Art. 15"], tools: ["/dashboard/tools/resilience"] },
  { id: "A.6.2.5", group: "A.6", it: "Piano di messa in uso del sistema", en: "System deployment plan", articles: ["Art. 26(1)"], tools: ["/dashboard/tools/deployer-dashboard"] },
  { id: "A.6.2.6", group: "A.6", it: "Funzionamento e monitoraggio del sistema", en: "System operation and monitoring", articles: ["Art. 26(5)", "Art. 72"], tools: ["/dashboard/post-market"] },
  { id: "A.6.2.7", group: "A.6", it: "Documentazione tecnica del sistema", en: "System technical documentation", articles: ["Art. 11", "Art. 53(1)(a)"], tools: ["/dashboard/tools/docugen"] },
  { id: "A.6.2.8", group: "A.6", it: "Registrazione degli eventi (log)", en: "Recording of event logs", articles: ["Art. 12", "Art. 19", "Art. 26(6)"], tools: ["/dashboard/tools/logvault"] },
  { id: "A.7.2", group: "A.7", it: "Dati per lo sviluppo e il miglioramento", en: "Data for development and enhancement", articles: ["Art. 10"], tools: ["/dashboard/tools/data-audit"] },
  { id: "A.7.3", group: "A.7", it: "Acquisizione dei dati", en: "Acquisition of data", articles: ["Art. 10(2)", "Art. 53(1)(c)"], tools: ["/dashboard/tools/data-audit"] },
  { id: "A.7.4", group: "A.7", it: "Qualità dei dati", en: "Quality of data", articles: ["Art. 10(3)", "Art. 26(4)"], tools: ["/dashboard/tools/data-audit"] },
  { id: "A.7.5", group: "A.7", it: "Provenienza dei dati", en: "Data provenance", articles: ["Art. 10(2)(b)"], tools: ["/dashboard/tools/data-audit"] },
  { id: "A.7.6", group: "A.7", it: "Preparazione dei dati", en: "Data preparation", articles: ["Art. 10(2)(c)"], tools: ["/dashboard/tools/data-audit"] },
  { id: "A.8.2", group: "A.8", it: "Documentazione e informazioni per gli utilizzatori", en: "Documentation and information for users", articles: ["Art. 13", "Art. 50"], tools: ["/dashboard/tools/transparency"] },
  { id: "A.8.3", group: "A.8", it: "Canali per le segnalazioni esterne", en: "Channels for external reporting", articles: ["Art. 87"], tools: [`${P}#reporting`] },
  { id: "A.8.4", group: "A.8", it: "Comunicazione degli incidenti", en: "Communication of incidents", articles: ["Art. 73", "Art. 26(5)"], tools: ["/dashboard/post-market"] },
  { id: "A.8.5", group: "A.8", it: "Informazioni dovute alle parti interessate", en: "Information owed to interested parties", articles: ["Art. 26(11)", "Art. 50", "Art. 86"], tools: ["/dashboard/tools/transparency", "/dashboard/tools/art50-kit"] },
  { id: "A.9.2", group: "A.9", it: "Processi per l'uso responsabile", en: "Processes for responsible use", articles: ["Art. 26(1)"], tools: ["/dashboard/tools/deployer-dashboard"] },
  { id: "A.9.3", group: "A.9", it: "Obiettivi per l'uso responsabile", en: "Objectives for responsible use", articles: [], tools: [`${P}#objectives`] },
  { id: "A.9.4", group: "A.9", it: "Uso conforme alla finalità prevista", en: "Use in line with the intended purpose", articles: ["Art. 26(1)", "Art. 25(1)(c)"], tools: ["/dashboard/tools/deployer-dashboard", "/dashboard/tools/oversight"] },
  { id: "A.10.2", group: "A.10", it: "Ripartizione delle responsabilità lungo la catena", en: "Allocation of responsibilities along the chain", articles: ["Art. 25"], tools: [`${P}#suppliers`, "/dashboard/compliance-ops/provider-transition"] },
  { id: "A.10.3", group: "A.10", it: "Gestione dei fornitori", en: "Supplier management", articles: ["Art. 25(4)", "Artt. 23-24"], tools: [`${P}#suppliers`, "/dashboard/tools/supply-chain"] },
  { id: "A.10.4", group: "A.10", it: "Attenzione alle esigenze dei clienti", en: "Attention to customer needs", articles: ["Art. 13"], tools: ["/dashboard/tools/transparency"] },
];

/** Nome breve dei tool collegati, per la tabella della Dichiarazione di Applicabilità */
export const TOOL_NAMES: Record<string, { it: string; en: string }> = {
  "/dashboard/tools/oversight": { it: "Sorveglianza umana", en: "Human oversight" },
  "/dashboard/tools/docugen": { it: "Documentazione tecnica", en: "Technical documentation" },
  "/dashboard/tools/data-audit": { it: "Qualità dati", en: "Data quality" },
  "/dashboard/tools/literacy": { it: "Alfabetizzazione", en: "AI literacy" },
  "/dashboard/tools/fria": { it: "FRIA", en: "FRIA" },
  "/dashboard/tools/risk-manager": { it: "Registro dei rischi", en: "Risk register" },
  "/dashboard/tools/qms": { it: "Sistema qualità", en: "Quality management" },
  "/dashboard/tools/resilience": { it: "Robustezza", en: "Robustness" },
  "/dashboard/tools/deployer-dashboard": { it: "Obblighi deployer", en: "Deployer obligations" },
  "/dashboard/post-market": { it: "Post-market", en: "Post-market" },
  "/dashboard/tools/logvault": { it: "Registro dei log", en: "Log register" },
  "/dashboard/tools/transparency": { it: "Trasparenza", en: "Transparency" },
  "/dashboard/tools/art50-kit": { it: "Avvisi e marcature IA", en: "AI notices and marking" },
  "/dashboard/compliance-ops/provider-transition": { it: "Cambio di ruolo", en: "Change of role" },
  "/dashboard/tools/supply-chain": { it: "Importatori e distributori", en: "Importers and distributors" },
};
