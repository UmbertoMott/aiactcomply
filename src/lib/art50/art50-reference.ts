// Art. 50 AI Act — obblighi di trasparenza
// ✦ AI — verifica e conferma: struttura paragrafi ricostruita dalla memoria del modello.
// Centralizziamo le citazioni qui per correzioni puntuali senza toccare la struttura.

export interface Art50ObligationDefinition {
  id: string;
  label: string;
  reference: string;
  appliesToSelf: boolean; // true = obbligo si applica anche ad AIComply stessa
}

export const ART50_OBLIGATIONS: readonly Art50ObligationDefinition[] = [
  {
    id: "direct_interaction_disclosure",
    label: "Disclosure di interazione con sistema IA",
    reference: "Art. 50(1) [verify against current AI Act text]",
    appliesToSelf: true,
  },
  {
    id: "synthetic_content_marking",
    label: "Marcatura leggibile da macchina dei contenuti sintetici",
    reference: "Art. 50(2) [verify against current AI Act text]",
    appliesToSelf: true,
  },
  {
    id: "emotion_biometric_disclosure",
    label: "Disclosure riconoscimento emozioni / categorizzazione biometrica",
    reference: "Art. 50(3) [verify against current AI Act text]",
    appliesToSelf: false,
  },
  {
    id: "deepfake_disclosure",
    label: "Disclosure contenuti deepfake",
    reference: "Art. 50(4) [verify against current AI Act text]",
    appliesToSelf: false,
  },
  {
    id: "timing_and_accessibility",
    label: "Tempistica e accessibilità della disclosure",
    reference: "Art. 50(5) [verify against current AI Act text]",
    appliesToSelf: true,
  },
] as const satisfies readonly Art50ObligationDefinition[];

// Eccezioni Art. 50(2) — ✦ AI — verifica e conferma sulla formulazione esatta.
export const SYNTHETIC_CONTENT_EXEMPTIONS = [
  {
    id: "assistive_editing",
    label: "Funzione di editing assistivo standard, senza alterazione sostanziale dei dati di input forniti dall'utente",
  },
  {
    id: "no_substantial_alteration",
    label: "Output non altera in modo sostanziale i dati/contenuti di input",
  },
  {
    id: "law_enforcement",
    label: "Autorizzato dalla legge per finalità di rilevamento, prevenzione, indagine o perseguimento di reati",
  },
] as const;

// Eccezioni Art. 50(4) — ✦ AI — verifica e conferma sulla formulazione esatta.
export const DEEPFAKE_EXEMPTIONS = [
  {
    id: "artistic_creative_satirical",
    label: "Contenuto parte di un'opera o programma evidentemente artistico, creativo, satirico, fittizio o analogo — obbligo limitato alla divulgazione dell'esistenza del contenuto generato/manipolato in modo che non comprometta la fruizione dell'opera",
  },
  {
    id: "editorial_text",
    label: "Testo pubblicato per informare il pubblico su questioni di interesse pubblico, soggetto a revisione umana o controllo editoriale, con responsabilità editoriale in capo a persona fisica/giuridica — l'obbligo di disclosure non si applica",
  },
] as const;

// Inventario interazioni AI Copilot di AIComply — per autoconformità Art. 50
// (aggiornare manualmente quando si aggiungono nuove Server Actions AI)
export const AICOMPLY_AI_INTERACTIONS = [
  { id: "legal_assistant", area: "Legal Assistant / Compliance Chat", obligationId: "direct_interaction_disclosure", description: "Interfaccia conversazionale — utente interagisce direttamente con AI" },
  { id: "suggest_oversight_measures", area: "Oversight — suggestOversightMeasures", obligationId: "synthetic_content_marking", description: "Bozze misure Art. 14 generate da AI Copilot" },
  { id: "draft_governance_doc", area: "Data Audit — draftGovernancePracticeDocumentation", obligationId: "synthetic_content_marking", description: "Documentazione pratica governance generata da AI" },
  { id: "analyze_log_coverage", area: "LogVault — analyzeLogCoverage", obligationId: "synthetic_content_marking", description: "Analisi copertura log generata da AI" },
  { id: "assess_four_eyes", area: "Oversight — assessFourEyesApplicability", obligationId: "synthetic_content_marking", description: "Valutazione applicabilità modulo four-eyes generata da AI" },
  { id: "draft_dpia", area: "DocuGen — draftDpiaSections", obligationId: "synthetic_content_marking", description: "Sezioni DPIA generate da AI Copilot" },
  { id: "draft_fria", area: "DocuGen — draftFria", obligationId: "synthetic_content_marking", description: "FRIA generata da AI Copilot" },
  { id: "suggest_risks", area: "Risk Manager — suggestRiskScenarios", obligationId: "synthetic_content_marking", description: "Scenari di rischio Art. 9 suggeriti da AI" },
  { id: "risk_manager_chat", area: "Risk Manager — riskManagerChat", obligationId: "direct_interaction_disclosure", description: "Chat guidata Risk Manager con AI" },
  { id: "deployer_applicability", area: "Deployer Dashboard — assessDeployerApplicability", obligationId: "synthetic_content_marking", description: "Valutazione applicabilità obblighi deployer" },
  { id: "draft_worker_notice", area: "Deployer Dashboard — draftWorkerInformationNotice", obligationId: "synthetic_content_marking", description: "Informativa lavoratori Art. 26(7) generata da AI" },
  { id: "suggest_event_severity", area: "LogVault — suggestEventSeverity", obligationId: "synthetic_content_marking", description: "Classificazione severity eventi generata da AI" },
  { id: "analyze_bias", area: "Data Audit — analyzeBiasIndicators", obligationId: "synthetic_content_marking", description: "Analisi bias Art. 10(2)(f) generata da AI" },
] as const;
