import { hashObject } from "@/lib/crypto/hash";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// ─── TIPI ─────────────────────────────────────────────────────────────

export type Severity = "high" | "medium" | "low";
export type Probability = "high" | "medium" | "low";
export type ResidualRisk = "acceptable" | "monitor" | "high";
export type RiskCategory =
  | "health-safety"
  | "fundamental-rights"
  | "discrimination"
  | "privacy"
  | "autonomy"
  | "transparency"
  | "security"
  | "environmental"
  | "democracy"
  | "economic";

export interface RiskItem {
  id: string;
  description: string;
  category: RiskCategory;
  severity: Severity;
  probability: Probability;
  mitigation: string;
  residual: ResidualRisk;
  quantitativeScore?: number; // R = L × S
  createdAt: string;
  /** Traccia il modulo di origine quando il rischio è importato automaticamente (Art. 9(2)(b)) */
  sourceModule?: "fria" | "dpia" | "manual";
}

export interface MonteCarloInput {
  likelihoodMean: number;       // 0-1
  likelihoodStdDev: number;
  severityMean: number;         // 0-1
  severityStdDev: number;
  iterations: number;
}

export interface MonteCarloResult {
  riskScores: number[];
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  aboveThreshold: number;       // % above 0.7
  distribution: { bin: string; count: number }[];
}

export interface DriftWindow {
  from: string;
  to: string;
  baselinePSI: number;
  currentPSI: number;
  driftDetected: boolean;
  severity: "none" | "low" | "medium" | "high";
}

export interface TemporalRecord {
  id: string;
  validTime: string;            // when the fact was true
  transactionTime: string;      // when the fact was recorded
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  hash: string;
}

export interface GPAIRiskAssessment {
  modelName: string;
  providerName: string;
  computeFlops: number;
  trainingDataSize: number;     // in TB
  openSource: boolean;
  hasSystemicRisk: boolean;
  systemicRiskScore: number;    // 0-100
  energyConsumptionKwh: number;
  modelCardCompliance: boolean;
  requiredMeasures: string[];
}

export interface SanctionTracker {
  article: string;
  description: string;
  maxPenaltyEUR: number;
  maxPenaltyPercent: number;
  severity: "low" | "medium" | "high";
  mitigationDeadline: string;
  status: "pending" | "in-progress" | "resolved";
}

export interface RiskManagerReport {
  id: string;
  systemName: string;
  createdAt: string;
  risks: RiskItem[];
  monteCarloResults: MonteCarloResult | null;
  driftWindows: DriftWindow[];
  temporalLedger: TemporalRecord[];
  gpaiAssessment: GPAIRiskAssessment | null;
  sanctions: SanctionTracker[];
  overallScore: number;
  overallRating: "low" | "limited" | "high" | "unacceptable";
  evidenceHash: string;
}

// ─── COSTANTI ─────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 1.0, medium: 0.5, low: 0.1 };
const PROB_WEIGHT: Record<Probability, number> = { high: 0.9, medium: 0.4, low: 0.1 };
const RESIDUAL_LABEL: Record<ResidualRisk, string> = {
  acceptable: "Accettabile",
  monitor: "Da monitorare",
  high: "Elevato – azione immediata",
};

const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  "health-safety": "Salute e sicurezza",
  "fundamental-rights": "Diritti fondamentali",
  "discrimination": "Discriminazione",
  "privacy": "Privacy e dati personali",
  "autonomy": "Autonomia umana",
  "transparency": "Trasparenza e spiegabilità",
  "security": "Sicurezza informatica",
  "environmental": "Impatto ambientale",
  "democracy": "Processi democratici",
  "economic": "Impatto economico",
};

const ARTICLE_SANCTIONS: SanctionTracker[] = [
  {
    article: "Art. 99",
    description: "Violazione requisiti pratiche vietate (Art. 5)",
    maxPenaltyEUR: 35_000_000,
    maxPenaltyPercent: 7,
    severity: "high",
    mitigationDeadline: "",
    status: "pending",
  },
  {
    article: "Art. 99",
    description: "Violazione obblighi general-purpose AI (Art. 52-55)",
    maxPenaltyEUR: 15_000_000,
    maxPenaltyPercent: 3,
    severity: "medium",
    mitigationDeadline: "",
    status: "pending",
  },
  {
    article: "Art. 99",
    description: "Fornitura informazioni inesatte ad autorità notificata",
    maxPenaltyEUR: 7_500_000,
    maxPenaltyPercent: 1.5,
    severity: "low",
    mitigationDeadline: "",
    status: "pending",
  },
];

// ─── MONTE CARLO ──────────────────────────────────────────────────────

function gaussianRandom(mean = 0, stdev = 1): number {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const scores: number[] = [];
  const n = Math.min(input.iterations, 100_000);

  for (let i = 0; i < n; i++) {
    let l = gaussianRandom(input.likelihoodMean, input.likelihoodStdDev);
    let s = gaussianRandom(input.severityMean, input.severityStdDev);
    l = Math.max(0, Math.min(1, l));
    s = Math.max(0, Math.min(1, s));
    scores.push(l * s);
  }

  const sorted = [...scores].sort((a, b) => a - b);

  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const median = sorted[Math.floor(n / 2)];
  const p90 = sorted[Math.floor(n * 0.9)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];
  const aboveThreshold = scores.filter((s) => s > 0.7).length / n;

  // Binning
  const bins = 10;
  const distribution: { bin: string; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const low = i / bins;
    const high = (i + 1) / bins;
    distribution.push({
      bin: `${low.toFixed(1)}-${high.toFixed(1)}`,
      count: scores.filter((s) => s >= low && s < high).length,
    });
  }

  return { riskScores: scores.slice(0, 1000), mean, median, p90, p95, p99, aboveThreshold, distribution };
}

// ─── SCORING ──────────────────────────────────────────────────────────

export function computeRiskScore(severity: Severity, probability: Probability): number {
  return +(SEVERITY_WEIGHT[severity] * PROB_WEIGHT[probability]).toFixed(3);
}

export function computeOverallRating(score: number): RiskManagerReport["overallRating"] {
  if (score < 0.2) return "low";
  if (score < 0.5) return "limited";
  if (score < 0.75) return "high";
  return "unacceptable";
}

export function computeOverallScore(risks: RiskItem[]): number {
  if (risks.length === 0) return 0;
  const avg = risks.reduce((a, r) => a + (r.quantitativeScore || computeRiskScore(r.severity, r.probability)), 0) / risks.length;
  return +avg.toFixed(3);
}

// ─── DRIFT DETECTION (PSI) ────────────────────────────────────────────

export function computePSI(
  baselineDist: number[],
  currentDist: number[],
  bins = 10
): number {
  if (baselineDist.length === 0 || currentDist.length === 0) return 0;

  const min = Math.min(...baselineDist, ...currentDist);
  const max = Math.max(...baselineDist, ...currentDist);
  const binWidth = (max - min) / bins || 0.001;

  let psi = 0;

  for (let i = 0; i < bins; i++) {
    const low = min + i * binWidth;
    const high = min + (i + 1) * binWidth;

    const bCount = baselineDist.filter((x) => x >= low && x < high).length / baselineDist.length || 0.0001;
    const cCount = currentDist.filter((x) => x >= low && x < high).length / currentDist.length || 0.0001;

    psi += (bCount - cCount) * Math.log(bCount / cCount);
  }

  return +psi.toFixed(4);
}

export function detectDrift(baseline: number[], current: number[]): DriftWindow {
  const psi = computePSI(baseline, current);
  let severity: DriftWindow["severity"] = "none";
  let driftDetected = false;

  if (psi > 0.25) {
    severity = "high";
    driftDetected = true;
  } else if (psi > 0.1) {
    severity = "medium";
    driftDetected = true;
  } else if (psi > 0.05) {
    severity = "low";
    driftDetected = true;
  }

  return {
    from: new Date().toISOString(),
    to: new Date().toISOString(),
    baselinePSI: psi,
    currentPSI: psi,
    driftDetected,
    severity,
  };
}

// ─── BITEMPORAL AUDIT ─────────────────────────────────────────────────

export async function createTemporalRecord(
  entityType: string,
  entityId: string,
  data: Record<string, unknown>,
  validTime: string
): Promise<TemporalRecord> {
  const transactionTime = new Date().toISOString();
  const hash = await hashObject({ entityType, entityId, data, validTime, transactionTime });

  return {
    id: `temporal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    validTime,
    transactionTime,
    entityType,
    entityId,
    data,
    hash,
  };
}

// ─── GPAI ─────────────────────────────────────────────────────────────

export function assessGPAI(input: {
  modelName: string;
  providerName: string;
  computeFlops: number;       // FLOPS used in training
  trainingDataSize: number;   // TB
  openSource: boolean;
  energyConsumptionKwh: number;
  hasModelCard: boolean;
}): GPAIRiskAssessment {
  // Thresholds from AI Act: > 10^25 FLOPS triggers systemic risk
  const flopsThreshold = 1e25;
  const dataThreshold = 1; // TB

  let systemicRiskScore = 0;

  // Compute scale
  if (input.computeFlops > flopsThreshold) systemicRiskScore += 40;
  else if (input.computeFlops > flopsThreshold * 0.1) systemicRiskScore += 20;
  else systemicRiskScore += 5;

  // Data scale
  if (input.trainingDataSize > dataThreshold * 10) systemicRiskScore += 30;
  else if (input.trainingDataSize > dataThreshold) systemicRiskScore += 15;
  else systemicRiskScore += 3;

  // Energy
  if (input.energyConsumptionKwh > 1_000_000) systemicRiskScore += 15;
  else if (input.energyConsumptionKwh > 100_000) systemicRiskScore += 8;

  // Open source mitigates
  if (input.openSource && input.hasModelCard) systemicRiskScore -= 10;

  // Cap
  systemicRiskScore = Math.max(0, Math.min(100, systemicRiskScore));
  const hasSystemicRisk = systemicRiskScore >= 50;

  const requiredMeasures: string[] = [];
  if (hasSystemicRisk) {
    requiredMeasures.push("Notifica immediata alla Commissione UE (Art. 52)");
    requiredMeasures.push("Documentazione tecnica completa (Allegato XI)");
    requiredMeasures.push("Modello di gestione del rischio sistemico");
    requiredMeasures.push("Test avversariali (red-teaming) obbligatori");
    requiredMeasures.push("Monitoraggio continuo incidenti gravi");
  }
  if (!input.hasModelCard) {
    requiredMeasures.push("Pubblicazione model card obbligatoria");
  }
  if (input.energyConsumptionKwh > 100_000) {
    requiredMeasures.push("Report sostenibilità energetica");
  }

  return {
    modelName: input.modelName,
    providerName: input.providerName,
    computeFlops: input.computeFlops,
    trainingDataSize: input.trainingDataSize,
    openSource: input.openSource,
    hasSystemicRisk,
    systemicRiskScore,
    energyConsumptionKwh: input.energyConsumptionKwh,
    modelCardCompliance: input.hasModelCard,
    requiredMeasures,
  };
}

// ─── SANZIONI ─────────────────────────────────────────────────────────

export function getSanctionTracker(): SanctionTracker[] {
  return ARTICLE_SANCTIONS.map((s) => ({ ...s }));
}

export function getSanctionSeverityColor(severity: SanctionTracker["severity"]): string {
  switch (severity) {
    case "high": return "bg-danger/10 text-danger border-danger/30";
    case "medium": return "bg-warning/10 text-warning border-warning/30";
    default: return "bg-success/10 text-success border-success/30";
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────

export { SEVERITY_WEIGHT, PROB_WEIGHT, RESIDUAL_LABEL, RISK_CATEGORY_LABELS, ARTICLE_SANCTIONS };

export function createEmptyRiskReport(systemName: string): RiskManagerReport {
  return {
    id: `risk-${Date.now()}`,
    systemName,
    createdAt: new Date().toISOString(),
    risks: [],
    monteCarloResults: null,
    driftWindows: [],
    temporalLedger: [],
    gpaiAssessment: null,
    sanctions: ARTICLE_SANCTIONS.map((s) => ({ ...s })),
    overallScore: 0,
    overallRating: "low",
    evidenceHash: "",
  };
}

export async function finalizeRiskReport(report: RiskManagerReport): Promise<RiskManagerReport> {
  const score = computeOverallScore(report.risks);
  const evidenceHash = await hashObject({ ...report, overallScore: score });
  const finalReport: RiskManagerReport = {
    ...report,
    overallScore: score,
    overallRating: computeOverallRating(score),
    evidenceHash,
  };
  await appendEvidence("audit", finalReport as unknown as Record<string, unknown>, "risk-manager");
  return finalReport;
}

// ─── ANALIZZATORE TESTUALE DEL RISCHIO ───────────────────────────────

export interface RiskSuggestion {
  severity: Severity;
  probability: Probability;
  residual: ResidualRisk;
  rationale: string;
  confidence: number; // 0-1
  matchedKeywords: string[];
}

// Keywords ad alta severità: contesti sensibili
const HIGH_SEVERITY_KEYWORDS = [
  { kw: /discrimin[a-zàèéìòù]+|gender|genere|razza|etnia|religione|orientamento sessuale|disabilità|pregiudiz/i, ctx: "discriminazione o bias" },
  { kw: /riconoscimento facciale|biometr|face.?id|impront|retina|iride|dna|genetic/i, ctx: "dati biometrici o genetici" },
  { kw: /infrastruttur|critic|energ|acqua|gas|elettric|trasporto pubblico/i, ctx: "infrastruttura critica" },
  { kw: /salute|medic|diagnos|paziente|clinica|chirurg|farmac|ospedal/i, ctx: "ambito sanitario" },
  { kw: /lavoro|assumere|candidat|licenzia|valutazione dipend|hr|risorse umane|colloquio/i, ctx: "selezione lavorativa (HR)" },
  { kw: /credito|mutuo|prestito|banc|finanziaria|assicur|scoring finanziario/i, ctx: "accesso al credito o servizi finanziari" },
  { kw: /sorveglianza|polizia|giudiziaria|penale|giustizia|carcere|detenzion/i, ctx: "sorveglianza o giustizia penale" },
  { kw: /migra|asilo|frontiera|respingiment|rifugiat/i, ctx: "controllo migratorio" },
  { kw: /istruzione|scuola|universit|ammissione|voto|esame/i, ctx: "accesso all'istruzione" },
  { kw: /minore|bambin|adolescen|infanzia|protezione minor/i, ctx: "tutela minori" },
];

const MEDIUM_SEVERITY_KEYWORDS = [
  { kw: /raccomandaz|suggeriment|personalizz|profilazion|targeting|pubblicit/i, ctx: "raccomandazioni o profilazione" },
  { kw: /chatbot|assistent|conversazion|linguaggio naturale|nlp|sentiment/i, ctx: "interazione conversazionale" },
  { kw: /contratto|fornitor|appalto|gara|acquist/i, ctx: "processi di procurement" },
  { kw: /manutenzion|predittiv|industr|fabbric|produzion/i, ctx: "manutenzione predittiva o industria" },
  { kw: /assicurativo|polizza|premio|sinistr|risarciment/i, ctx: "ambito assicurativo" },
  { kw: /formazion|addestrament|cors|apprendiment/i, ctx: "formazione e apprendimento" },
];

const LOW_SEVERITY_KEYWORDS = [
  { kw: /intratteniment|gioco|musica|film|arte|creativ|divertiment/i, ctx: "intrattenimento" },
  { kw: /meteo|prevision|clima|tempo atmosferic/i, ctx: "previsioni meteorologiche" },
  { kw: /organizzazion|agenda|calendario|promemoria|appuntament/i, ctx: "organizzazione personale" },
  { kw: /traduzion|tradu[cr]|linguistic/i, ctx: "traduzione linguistica" },
  { kw: /ricerca|ricerca accademica|citazion|bibliograf/i, ctx: "ricerca accademica" },
];

const HIGH_PROB_KEYWORDS = [
  { kw: /in tempo reale|real.?time|continuo|ogni second|ogni minuto|streaming|flusso continuo/i, ctx: "elaborazione in tempo reale" },
  { kw: /pubblico|milion|grande scala|massa|popolazion|utenti|clienti/i, ctx: "uso su larga scala o pubblico" },
  { kw: /automatic|autonom|senza supervision|non supervisionat/i, ctx: "decisione automatica senza supervisione" },
  { kw: /aggiornament|apprendiment|riaddestrament|fine.?tun/i, ctx: "aggiornamento o riaddestramento frequente" },
  { kw: /online|internet|web|app|sito|piattaforma accessibile/i, ctx: "accesso online pubblico" },
];

const LOW_PROB_KEYWORDS = [
  { kw: /interno|dipartiment|solo personale|ristrett|limitato/i, ctx: "uso interno e ristretto" },
  { kw: /prototip|sperimental|test|pilota|poc|proof.of.concept/i, ctx: "fase prototipale o test" },
  { kw: /manuale|supervisione umana|human.in.the.loop|controllo umano/i, ctx: "supervisione umana presente" },
  { kw: /occasionale|raro|sporadico|una tantum|singol|una volta/i, ctx: "esposizione occasionale" },
];

export function analyzeRiskDescription(description: string): RiskSuggestion {
  const text = description.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  // Analisi severità
  let severity: Severity = "low";
  let sevRationale = "";

  const highSevMatch = HIGH_SEVERITY_KEYWORDS.find((k) => k.kw.test(text));
  if (highSevMatch) {
    severity = "high";
    sevRationale = `Alta – il testo menziona "${highSevMatch.ctx}" che l\u2019AI Act classifica come area ad alto rischio (Allegato III).`;
    matchedKeywords.push(highSevMatch.ctx);
  } else {
    const medSevMatch = MEDIUM_SEVERITY_KEYWORDS.find((k) => k.kw.test(text));
    if (medSevMatch) {
      severity = "medium";
      sevRationale = `Media – il rischio riguarda "${medSevMatch.ctx}" con impatto reversibile e limitato.`;
      matchedKeywords.push(medSevMatch.ctx);
    } else {
      const lowSevMatch = LOW_SEVERITY_KEYWORDS.find((k) => k.kw.test(text));
      if (lowSevMatch) {
        severity = "low";
        sevRationale = `Bassa – il contesto "${lowSevMatch.ctx}" ha impatto minimo su diritti fondamentali o sicurezza.`;
        matchedKeywords.push(lowSevMatch.ctx);
      } else {
        sevRationale = "Bassa – nessun indicatore di rischio elevato rilevato. Se il sistema impatta persone, valuta un livello superiore.";
      }
    }
  }

  // Analisi probabilità
  let probability: Probability = "medium";
  let probRationale = "";

  const highProbMatch = HIGH_PROB_KEYWORDS.find((k) => k.kw.test(text));
  if (highProbMatch) {
    probability = "high";
    probRationale = `Alta – il sistema opera "${highProbMatch.ctx}", esponendo molte persone al rischio frequentemente.`;
    matchedKeywords.push(highProbMatch.ctx);
  } else {
    const lowProbMatch = LOW_PROB_KEYWORDS.find((k) => k.kw.test(text));
    if (lowProbMatch) {
      probability = "low";
      probRationale = `Bassa – "${lowProbMatch.ctx}" riduce la frequenza di esposizione al rischio.`;
      matchedKeywords.push(lowProbMatch.ctx);
    } else {
      probRationale = "Media – probabilità moderata in assenza di indicatori chiari di alta o bassa frequenza.";
    }
  }

  // Calcolo confidenza
  let confidence = 0.3; // base
  if (matchedKeywords.length >= 2) confidence = 0.85;
  else if (matchedKeywords.length === 1) confidence = 0.65;
  else if (text.length > 50) confidence = 0.45;
  else if (text.length > 20) confidence = 0.35;

  // Residuo suggerito
  const rawScore = computeRiskScore(severity, probability);
  let residual: ResidualRisk = "monitor";
  if (rawScore >= 0.5) residual = "high";
  else if (rawScore <= 0.15) residual = "acceptable";

  return {
    severity,
    probability,
    residual,
    rationale: `Severità: ${sevRationale}\nProbabilità: ${probRationale}`,
    confidence,
    matchedKeywords,
  };
}

export interface ResidualWarning {
  show: boolean;
  message: string;
  severity: "info" | "warning" | "danger";
}

export function validateResidualRisk(
  severity: Severity,
  probability: Probability,
  residual: ResidualRisk,
  mitigation: string
): ResidualWarning {
  const rawScore = computeRiskScore(severity, probability);
  const mitLength = mitigation.trim().length;

  // Rischio alto con residuo basso senza mitigazione → warning
  if (rawScore >= 0.5 && residual === "acceptable" && mitLength < 30) {
    return {
      show: true,
      message: "Con un rischio iniziale alto (\u22650.5), un residuo \u00abAccettabile\u00bb richiede misure di mitigazione dettagliate e credibili. La mitigazione attuale \u00e8 troppo breve.",
      severity: "danger",
    };
  }

  // Rischio medio-alto con residuo basso e mitigazione debole
  if (rawScore >= 0.3 && residual === "acceptable" && mitLength < 20) {
    return {
      show: true,
      message: "Per giustificare un residuo \u00abAccettabile\u00bb con questo livello di rischio, descrivi misure di mitigazione pi\u00f9 specifiche.",
      severity: "warning",
    };
  }

  // Rischio alto con residuo "monitor" ma buona mitigazione → ok
  if (rawScore >= 0.5 && residual === "high" && mitLength > 50) {
    return {
      show: true,
      message: "Hai correttamente impostato il residuo su \u00abElevato\u00bb. La mitigazione sembra dettagliata: verifica che sia sufficiente a scalare il rischio.",
      severity: "info",
    };
  }

  return { show: false, message: "", severity: "info" };
}
