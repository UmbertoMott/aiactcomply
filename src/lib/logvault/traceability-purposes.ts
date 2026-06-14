// Art. 12 AI Act — finalità di tracciabilità dei log
// [verify against current AI Act text] su ogni citazione — numerazione paragrafi
// ricostruita dalla memoria del modello, non verificata sul testo consolidato.

export interface TraceabilityPurposeDefinition {
  id: string;
  label: string;
  reference: string;
  crossReference: string;
  linkedToolPath: string;
  linkedToolLabel: string;
}

export interface BiometricLogRequirementDefinition {
  id: string;
  label: string;
  reference: string;
}

export const TRACEABILITY_PURPOSES: readonly TraceabilityPurposeDefinition[] = [
  {
    id: "risk_identification",
    label: "Identificare situazioni di rischio o modifiche sostanziali",
    reference: "Art. 12(2)(a) [verify against current AI Act text]",
    crossReference: "Art. 79(1) [verify against current AI Act text]",
    linkedToolPath: "/dashboard/tools/risk-manager",
    linkedToolLabel: "Risk Manager — step traceability",
  },
  {
    id: "post_market_monitoring",
    label: "Facilitare il monitoraggio post-commercializzazione",
    reference: "Art. 12(2)(b) [verify against current AI Act text]",
    crossReference: "Art. 72 [verify against current AI Act text]",
    linkedToolPath: "/dashboard/tools/post-market",
    linkedToolLabel: "Post-Market (Art. 72-73)",
  },
  {
    id: "deployer_monitoring",
    label: "Monitoraggio del funzionamento da parte del deployer",
    reference: "Art. 12(2)(c) [verify against current AI Act text]",
    crossReference: "Art. 26(5) [verify against current AI Act text]",
    linkedToolPath: "/dashboard/tools/deployer-dashboard",
    linkedToolLabel: "Deployer Dashboard — monitoring_risk_reporting",
  },
] as const satisfies readonly TraceabilityPurposeDefinition[];

export const BIOMETRIC_LOG_REQUIREMENTS: readonly BiometricLogRequirementDefinition[] = [
  {
    id: "usage_period",
    label: "Periodo di ciascun utilizzo (data/ora di inizio e fine)",
    reference: "Art. 12(3)(a) [verify against current AI Act text]",
  },
  {
    id: "reference_database",
    label: "Banca dati di riferimento utilizzata dal sistema",
    reference: "Art. 12(3)(b) [verify against current AI Act text]",
  },
  {
    id: "matched_input_data",
    label: "Dati di input per i quali la ricerca ha portato a una corrispondenza",
    reference: "Art. 12(3)(c) [verify against current AI Act text]",
  },
  {
    id: "verifier_identity",
    label: "Identità dei verificatori (Art. 14(5) [verify against current AI Act text])",
    reference: "Art. 12(3)(d) [verify against current AI Act text]",
  },
] as const satisfies readonly BiometricLogRequirementDefinition[];

// Euristica per nomi campo — solo per proposta iniziale, mai per decisioni definitive.
export const FIELD_NAME_HINTS: Record<string, readonly string[]> = {
  risk_identification: ["error", "errore", "anomaly", "anomalia", "exception", "fault", "alert", "alerta", "warning", "critical"],
  post_market_monitoring: ["performance", "accuracy", "latency", "outcome", "result", "esito", "metric", "metrica"],
  deployer_monitoring: ["operator", "operatore", "user_id", "deployer", "session", "sessione", "tenant"],
  usage_period: ["start_time", "end_time", "session_start", "session_end", "timestamp_start", "timestamp_end", "inizio", "fine", "start", "end"],
  reference_database: ["database", "db_reference", "source_db", "watchlist", "reference_db", "db_id"],
  matched_input_data: ["match", "matched_input", "match_score", "candidate", "hit", "corrispondenza"],
  verifier_identity: ["verifier", "operator_id", "reviewer", "approved_by", "verificatore", "revisor"],
};

export const MAX_LOG_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
