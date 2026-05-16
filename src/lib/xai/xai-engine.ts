// XAI Engine — Explainability & Bias Center
// Art. 13 AI Act (Transparency), Art. 10 (Data Governance), Art. 9 (Risk Management)
// GDPR Art. 86 (Automated decision-making explanations)

// ─── INTERFACES ──────────────────────────────────────────────────────────────

export interface GlobalFeatureImportance {
  feature: string;
  column: string;
  meanAbsShap: number;          // 0–1 normalized
  globalRank: number;
  isProxy: boolean;
  proxyFor?: string;
  artRelevant: "Art.10" | "Art.13" | "Art.9" | null;
}

export interface BiasAnalysisResult {
  group: string;
  totalTests: number;
  positiveRate: number;
  referenceRate: number;
  impactRatio: number;
  disparity: number;   // percent absolute difference from 1.0
  flagged: boolean;    // impactRatio < 0.8
  severity: "ok" | "warning" | "critical";
}

export interface CounterfactualScenario {
  id: string;
  originalOutcome: "APPROVED" | "REJECTED";
  counterfactualOutcome: "APPROVED" | "REJECTED";
  changedFeatures: {
    feature: string;
    from: string;
    to: string;
    feasibility: "easy" | "medium" | "hard";
  }[];
  minChanges: number;
  gdprArt86Compliant: boolean;
}

export interface XAIReport {
  generatedAt: string;
  modelVersion: string;
  featureImportance: GlobalFeatureImportance[];
  biasResults: BiasAnalysisResult[];
  counterfactuals: CounterfactualScenario[];
  overallXAIScore: number;    // 0–100
  complianceFlags: string[];
  recommendations: string[];
}

export interface XAISnapshot {
  savedAt: string;
  report: XAIReport;
}

// ─── FEATURE IMPORTANCE ──────────────────────────────────────────────────────

// Deterministic seeded variation using simple math based on sampleSize
function seedVal(seed: number, index: number): number {
  // Deterministic pseudo-variation: sine-based, bounded to ±0.03
  return Math.sin(seed * 0.01 + index * 1.7) * 0.03;
}

export function computeGlobalFeatureImportance(sampleSize: number = 200): GlobalFeatureImportance[] {
  const baseValues: { feature: string; column: string; base: number; isProxy: boolean; proxyFor?: string; artRelevant: "Art.10" | "Art.13" | "Art.9" | null }[] = [
    {
      feature: "Esperienza lavorativa",
      column: "work_experience_years",
      base: 0.82,
      isProxy: false,
      artRelevant: "Art.13",
    },
    {
      feature: "Titolo di studio",
      column: "education_level",
      base: 0.71,
      isProxy: false,
      artRelevant: "Art.10",
    },
    {
      feature: "Codice postale",
      column: "postal_code",
      base: 0.58,
      isProxy: true,
      proxyFor: "etnia",
      artRelevant: "Art.10",
    },
    {
      feature: "Settore precedente",
      column: "prev_industry_sector",
      base: 0.44,
      isProxy: true,
      proxyFor: "genere",
      artRelevant: "Art.9",
    },
    {
      feature: "Esito precedente",
      column: "prev_outcome",
      base: 0.31,
      isProxy: false,
      artRelevant: "Art.13",
    },
    {
      feature: "Fascia d'età",
      column: "age_group",
      base: 0.19,
      isProxy: false,
      artRelevant: "Art.9",
    },
  ];

  const rawValues = baseValues.map((f, i) => ({
    ...f,
    meanAbsShap: Math.max(0.01, Math.min(0.99, f.base + seedVal(sampleSize, i))),
  }));

  // Sort descending by meanAbsShap to assign ranks
  const sorted = [...rawValues].sort((a, b) => b.meanAbsShap - a.meanAbsShap);

  return sorted.map((f, idx): GlobalFeatureImportance => ({
    feature: f.feature,
    column: f.column,
    meanAbsShap: Math.round(f.meanAbsShap * 1000) / 1000,
    globalRank: idx + 1,
    isProxy: f.isProxy,
    proxyFor: f.proxyFor,
    artRelevant: f.artRelevant,
  }));
}

// ─── BIAS ANALYSIS ───────────────────────────────────────────────────────────

// Deterministic impact ratio formula based on group index
// Uses cosine to ensure stable, spread-out values across groups
function deterministicImpactRatio(groupIndex: number, sampleSize: number): number {
  // Base ratios hardcoded per group, with tiny deterministic variation from sampleSize
  const bases = [0.74, 0.69, 0.78, 0.83, 0.65, 0.76];
  const variation = Math.cos(sampleSize * 0.007 + groupIndex * 2.3) * 0.02;
  return Math.max(0.5, Math.min(1.15, bases[groupIndex] + variation));
}

function deterministicPositiveRate(groupIndex: number, referenceRate: number, impactRatio: number): number {
  return Math.round(referenceRate * impactRatio * 100) / 100;
}

export function runBiasAnalysis(sampleSize: number = 500): BiasAnalysisResult[] {
  const groups = [
    "Minoranza etnica",
    "Disabilità visiva",
    "Disabilità motoria",
    "Anziano",
    "Basso reddito",
    "Migranti",
  ];

  const referenceRate = 0.72; // majority group positive rate
  const baseTests = Math.floor(sampleSize / groups.length);

  return groups.map((group, i): BiasAnalysisResult => {
    const impactRatio = deterministicImpactRatio(i, sampleSize);
    const positiveRate = deterministicPositiveRate(i, referenceRate, impactRatio);
    const disparity = Math.round(Math.abs(1.0 - impactRatio) * 1000) / 10; // percent
    const flagged = impactRatio < 0.8;
    let severity: "ok" | "warning" | "critical";
    if (impactRatio < 0.7) {
      severity = "critical";
    } else if (impactRatio < 0.8) {
      severity = "warning";
    } else {
      severity = "ok";
    }

    // Slight variation in test counts per group (deterministic)
    const totalTests = baseTests + (i % 3) * 10 - (i % 2) * 5;

    return {
      group,
      totalTests,
      positiveRate,
      referenceRate,
      impactRatio: Math.round(impactRatio * 1000) / 1000,
      disparity,
      flagged,
      severity,
    };
  });
}

// ─── COUNTERFACTUALS ─────────────────────────────────────────────────────────

export function generateCounterfactuals(): CounterfactualScenario[] {
  return [
    {
      id: "cf-001",
      originalOutcome: "REJECTED",
      counterfactualOutcome: "APPROVED",
      changedFeatures: [
        {
          feature: "Esperienza lavorativa",
          from: "3 anni",
          to: "5 anni",
          feasibility: "medium",
        },
        {
          feature: "Titolo di studio",
          from: "Diploma superiore",
          to: "Laurea triennale",
          feasibility: "hard",
        },
      ],
      minChanges: 2,
      gdprArt86Compliant: true,
    },
    {
      id: "cf-002",
      originalOutcome: "REJECTED",
      counterfactualOutcome: "APPROVED",
      changedFeatures: [
        {
          feature: "Settore precedente",
          from: "Commercio al dettaglio",
          to: "Tecnologia / ICT",
          feasibility: "hard",
        },
      ],
      minChanges: 1,
      gdprArt86Compliant: true,
    },
    {
      id: "cf-003",
      originalOutcome: "APPROVED",
      counterfactualOutcome: "REJECTED",
      changedFeatures: [
        {
          feature: "Esito precedente",
          from: "Assunto",
          to: "Non assunto",
          feasibility: "easy",
        },
        {
          feature: "Codice postale",
          from: "20121 (Milano centro)",
          to: "20099 (periferia)",
          feasibility: "easy",
        },
      ],
      minChanges: 2,
      gdprArt86Compliant: false,
    },
  ];
}

// ─── XAI REPORT ──────────────────────────────────────────────────────────────

export function generateXAIReport(
  featureImportance: GlobalFeatureImportance[],
  biasResults: BiasAnalysisResult[],
  counterfactuals: CounterfactualScenario[]
): XAIReport {
  const totalGroups = biasResults.length;
  const flaggedGroups = biasResults.filter((r) => r.flagged).length;
  const proxyFeatures = featureImportance.filter((f) => f.isProxy).length;

  // Score calculation:
  // Base 100, penalize 8 points per flagged group, 5 points per proxy feature
  const score = Math.max(
    0,
    Math.min(
      100,
      100 - flaggedGroups * 8 - proxyFeatures * 5
    )
  );

  const complianceFlags: string[] = [];
  biasResults.forEach((r) => {
    if (r.severity === "critical") {
      complianceFlags.push(
        `[CRITICO] Disparate impact per "${r.group}": Impact Ratio ${r.impactRatio} < 0.7 — violazione regola 4/5 (Art. 9 AI Act)`
      );
    } else if (r.severity === "warning") {
      complianceFlags.push(
        `[ATTENZIONE] Disparate impact per "${r.group}": Impact Ratio ${r.impactRatio} < 0.8 — monitoraggio obbligatorio`
      );
    }
  });

  featureImportance.forEach((f) => {
    if (f.isProxy) {
      complianceFlags.push(
        `[PROXY] Feature "${f.feature}" è proxy per "${f.proxyFor}" — rischio discriminazione indiretta (${f.artRelevant})`
      );
    }
  });

  const recommendations: string[] = [
    "Rimuovere o neutralizzare la feature 'Codice postale' in quanto proxy dell'etnia (Art. 10 AI Act).",
    "Implementare tecniche di reweighting o resampling per i gruppi svantaggiati prima del riaddestramento.",
    "Eseguire audit di fairness trimestrale con almeno 500 profili per gruppo protetto.",
    "Documentare le decisioni automatizzate e garantire il diritto di spiegazione (GDPR Art. 22, AI Act Art. 13).",
    "Introdurre soglie decisionali differenziate per gruppo protetto (calibration-based fairness).",
    "Aggiornare la valutazione FRIA con i risultati SHAP e le metriche di bias rilevate.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    modelVersion: "v2.1.0",
    featureImportance,
    biasResults,
    counterfactuals,
    overallXAIScore: Math.round(score),
    complianceFlags,
    recommendations,
  };
}

// ─── SNAPSHOT PERSISTENCE ────────────────────────────────────────────────────

const STORAGE_KEY = "aicomply_xai_snapshot";

export function saveXAISnapshot(report: XAIReport): void {
  const snapshot: XAISnapshot = {
    savedAt: new Date().toISOString(),
    report,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage may be unavailable in SSR or private browsing
  }
}

export function loadXAISnapshot(): XAISnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as XAISnapshot;
  } catch {
    return null;
  }
}
