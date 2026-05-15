export interface ProfilingSignal {
  type: "protected_attribute" | "clustering" | "individual_scoring" | "predictive_policing" | "credit_scoring" | "social_scoring";
  file: string;
  line: number;
  code: string;
  severity: "critical" | "high" | "medium";
  description: string;
  art6_3_block: boolean;
}

export interface ExemptionCriterion {
  id: "narrow_procedural" | "human_improvement" | "pattern_detection" | "preparatory_task";
  label: string;
  description: string;
  legalRef: string;
  condition: string;
}

export interface ExemptionDossier {
  id: string;
  systemName: string;
  versionHash: string;
  profilingSignals: ProfilingSignal[];
  profilingDetected: boolean;
  selectedCriteria: string[];
  rationale: string;
  status: "BLOCKED_PROFILING" | "EXEMPTION_GRANTED" | "EXEMPTION_DENIED" | "PENDING_REVIEW";
  generatedAt: string;
  evidenceHash: string;
}

export const EXEMPTION_CRITERIA: ExemptionCriterion[] = [
  {
    id: "narrow_procedural",
    label: "Compito procedurale ristretto",
    description: "Il sistema svolge un compito procedurale strettamente definito (es. conversione dati, formattazione, estrazione campi) senza margine decisionale.",
    legalRef: "Art. 6(3), primo comma, lettera (a)",
    condition: "Il sistema NON valuta, classifica o produce un giudizio autonomo su persone fisiche.",
  },
  {
    id: "human_improvement",
    label: "Miglioramento attività umana preesistente",
    description: "Il sistema migliora il risultato di un'attività umana già completata, senza influenzare la decisione finale.",
    legalRef: "Art. 6(3), primo comma, lettera (b)",
    condition: "Il sistema opera DOPO la decisione umana e non la sostituisce né la condiziona.",
  },
  {
    id: "pattern_detection",
    label: "Rilevamento pattern decisionali",
    description: "Il sistema rileva deviazioni dai pattern decisionali umani senza sostituire la valutazione umana.",
    legalRef: "Art. 6(3), primo comma, lettera (c)",
    condition: "Il sistema NON produce output che sostituiscono il giudizio umano.",
  },
  {
    id: "preparatory_task",
    label: "Compito preparatorio per valutazione successiva",
    description: "Il sistema esegue un compito puramente preparatorio per una successiva valutazione umana sostanziale.",
    legalRef: "Art. 6(3), primo comma, lettera (d)",
    condition: "La decisione sostanziale è presa ESCLUSIVAMENTE da un essere umano.",
  },
];

// Pattern di profilazione da ricercare nel codice
const PROFILING_PATTERNS: Array<{
  regex: RegExp;
  type: ProfilingSignal["type"];
  severity: ProfilingSignal["severity"];
  description: string;
  art6_3_block: boolean;
}> = [
  // Attributi protetti
  { regex: /gender|genere|sesso|maschio|femmina|non.?binario/i, type: "protected_attribute", severity: "high", description: "Analisi basata sul genere - attributo protetto ex Art. 9 GDPR", art6_3_block: true },
  { regex: /ethnic|race|etnia|razza|nazionalità|origine/i, type: "protected_attribute", severity: "critical", description: "Classificazione per etnia - possibile violazione Art. 5(1)(g)", art6_3_block: true },
  { regex: /age.?group|fascia.?età|age.?range|generazione|coorte/i, type: "protected_attribute", severity: "medium", description: "Segmentazione per età - possibile discriminazione indiretta", art6_3_block: true },
  { regex: /religion|religione|fede|credo/i, type: "protected_attribute", severity: "critical", description: "Attributo religioso - dato sensibile GDPR Art. 9", art6_3_block: true },
  { regex: /disabil|handicap|invalidità/i, type: "protected_attribute", severity: "critical", description: "Condizione di disabilità - dato sensibile", art6_3_block: true },
  { regex: /salary|stipendio|reddito|income|wage/i, type: "protected_attribute", severity: "medium", description: "Dato reddituale - possibile profilazione socioeconomica", art6_3_block: true },
  // Clustering e scoring individuale
  { regex: /k.?means|dbscan|hierarchical.?cluster|spectral.?cluster|gmm|birch/i, type: "clustering", severity: "high", description: "Algoritmo di clustering - raggruppamento di persone in categorie", art6_3_block: true },
  { regex: /predict_proba|decision_function|score_samples|anomaly.?score/i, type: "individual_scoring", severity: "high", description: "Punteggio individuale - attribuzione di un valore a una persona", art6_3_block: true },
  { regex: /cluster_label|assign.?cluster|segment|persona.?group/i, type: "clustering", severity: "high", description: "Assegnazione di un gruppo/cluster a una persona fisica", art6_3_block: true },
  // Scoring creditizio e predittivo
  { regex: /credit.?score|credit.?rating|loan.?predict|default.?risk|solvibilità/i, type: "credit_scoring", severity: "critical", description: "Credit scoring su persone fisiche - Allegato III Punto 5", art6_3_block: true },
  { regex: /crime.?predict|police.?patrol|suspect.?identify|violence.?detect/i, type: "predictive_policing", severity: "critical", description: "Predictive policing su persone - Allegato III Punto 6", art6_3_block: true },
  { regex: /social.?score|behavior.?rating|trust.?score|cittadino.?rank/i, type: "social_scoring", severity: "critical", description: "Social scoring - PRATICA VIETATA Art. 5(1)(c)", art6_3_block: true },
  { regex: /rank_candidates|score_applicant|rank_applicants|candidate.?score/i, type: "individual_scoring", severity: "high", description: "Scoring individuale di candidati - profilazione occupazionale", art6_3_block: true },
  // Profilazione trasversale
  { regex: /profile|profilaz|profilat|user.?segment|personali|targeting/i, type: "clustering", severity: "high", description: "Keyword profilazione rilevata - possibile trattamento vietato", art6_3_block: true },
  { regex: /predict|predici|prevedi|forecast|stima/i, type: "individual_scoring", severity: "medium", description: "Predizione su persone fisiche - verificare assenza profilazione", art6_3_block: false },
];

export function scanProfiling(files: Record<string, string>): ProfilingSignal[] {
  const signals: ProfilingSignal[] = [];
  const seen = new Set<string>();

  for (const [path, content] of Object.entries(files)) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of PROFILING_PATTERNS) {
        if (pattern.regex.test(line)) {
          const key = `${path}:${i}:${pattern.type}`;
          if (!seen.has(key)) {
            seen.add(key);
            signals.push({
              type: pattern.type,
              file: path,
              line: i + 1,
              code: line.trim().slice(0, 80),
              severity: pattern.severity,
              description: pattern.description,
              art6_3_block: pattern.art6_3_block,
            });
          }
        }
      }
    }
  }

  return signals;
}

export function hasHardBlock(signals: ProfilingSignal[]): boolean {
  return signals.some((s) => s.art6_3_block);
}

export function generateExemptionDossier(
  systemName: string,
  profilingSignals: ProfilingSignal[],
  selectedCriteria: string[],
  rationale: string
): ExemptionDossier {
  const profilingDetected = profilingSignals.length > 0;
  const hardBlock = hasHardBlock(profilingSignals);

  let status: ExemptionDossier["status"];
  if (hardBlock) {
    status = "BLOCKED_PROFILING";
  } else if (selectedCriteria.length > 0 && rationale.trim().length > 0) {
    status = "EXEMPTION_GRANTED";
  } else {
    status = "PENDING_REVIEW";
  }

  return {
    id: `EXEMPTION-${Date.now().toString(36).toUpperCase()}`,
    systemName,
    versionHash: `sha256:mock:${Date.now().toString(36)}`,
    profilingSignals,
    profilingDetected,
    selectedCriteria,
    rationale,
    status,
    generatedAt: new Date().toISOString(),
    evidenceHash: `sha256:${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
  };
}

export function getExemptionSummary(dossier: ExemptionDossier): string {
  switch (dossier.status) {
    case "BLOCKED_PROFILING":
      return `⚠️ Esenzione Art. 6(3) BLOCCATA: rilevata logica di profilazione (${dossier.profilingSignals.length} segnali). Il sistema rimane classificato come AD ALTO RISCHIO.`;
    case "EXEMPTION_GRANTED":
      return `✅ Esenzione Art. 6(3) CONCESSA: ${dossier.selectedCriteria.length} criterio/i soddisfatto/i. Motivazione registrata nell'Evidence Layer.`;
    case "EXEMPTION_DENIED":
      return `❌ Esenzione Art. 6(3) NEGATA: i criteri non sono sufficienti a giustificare il declassamento.`;
    default:
      return `⏳ Richiesta di esenzione in attesa di revisione.`;
  }
}
