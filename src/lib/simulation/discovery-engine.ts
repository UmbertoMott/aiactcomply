export interface DetectedLibrary {
  name: string;
  version: string;
  source: "package.json" | "requirements.txt" | "import";
  riskDomain: string;
  annexCategory: string | null;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  codeEvidence: string;
}

export interface APIEndpoint {
  path: string;
  methods: string[];
  inputType: "biometric" | "personal_data" | "sensitive_data" | "generic" | "financial";
  riskFlagged: boolean;
  description: string;
}

export interface ClassificationResult {
  systemName: string;
  versionHash: string;
  riskLevel: "Unacceptable" | "High" | "Limited" | "Minimal";
  annexCategory: string | null;
  isExemptedArt6_3: boolean;
  exemptionRationale: string;
  libraries: DetectedLibrary[];
  endpoints: APIEndpoint[];
  score: number;
  timestamp: string;
}

// Risk Library — mappa librerie → domini Allegato III
export const RISK_LIBRARY: Record<string, {
  domain: string;
  annexCategory: string | null;
  severity: DetectedLibrary["severity"];
  description: string;
}> = {
  "opencv-python": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "high", description: "Riconoscimento facciale — Allegato III punto 1" },
  "face_recognition": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "critical", description: "Identificazione biometrica remota — Art. 5 se in spazi pubblici" },
  "deepface": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "high", description: "Analisi emozioni e riconoscimento facciale" },
  "dlib": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "high", description: "Landmark detection e riconoscimento biometrico" },
  "mediapipe": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "medium", description: "Rilevamento pose e landmarks facciali" },
  "speech_recognition": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "medium", description: "Riconoscimento vocale — possibile categorizzazione biometrica" },
  "whisper": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "low", description: "Trascrizione audio — dipende dall'uso" },
  "pandas": { domain: "Dati tabellari", annexCategory: null, severity: "low", description: "Libreria generica per analisi dati" },
  "scikit-learn": { domain: "Machine Learning", annexCategory: "4. Occupazione", severity: "medium", description: "Classificazione ML — verificare contesto d'uso" },
  "xgboost": { domain: "Scoring", annexCategory: "5. Servizi essenziali", severity: "high", description: "Credit scoring / valutazione finanziaria" },
  "lightgbm": { domain: "Scoring", annexCategory: "5. Servizi essenziali", severity: "high", description: "Modelli di ranking e scoring" },
  "transformers": { domain: "NLP", annexCategory: "4. Occupazione", severity: "medium", description: "LLM — screening CV o chatbot HR" },
  "torch": { domain: "Deep Learning", annexCategory: null, severity: "low", description: "Framework generico — verificare task specifico" },
  "tensorflow": { domain: "Deep Learning", annexCategory: null, severity: "low", description: "Framework generico — verificare task specifico" },
  "numpy": { domain: "Calcolo", annexCategory: null, severity: "low", description: "Libreria generica" },
};

// API signal patterns
export const API_SIGNALS: Array<{ pattern: RegExp; inputType: APIEndpoint["inputType"]; desc: string }> = [
  { pattern: /face|facial|biometric|iris|fingerprint|palm/i, inputType: "biometric", desc: "Dati biometrici" },
  { pattern: /cv|candidate|resume|curriculum|screening|hr/i, inputType: "personal_data", desc: "Dati CV/candidati" },
  { pattern: /credit|score|rating|loan|mortgage|insurance|risk_profile/i, inputType: "financial", desc: "Scoring finanziario" },
  { pattern: /health|medical|diagnosis|patient|clinical/i, inputType: "sensitive_data", desc: "Dati sanitari (Art. 9 GDPR)" },
  { pattern: /student|exam|grade|admission|education/i, inputType: "personal_data", desc: "Valutazione educativa" },
  { pattern: /employee|worker|perform|productivity|monitor/i, inputType: "personal_data", desc: "Monitoraggio lavoratori" },
];

export function scanRepository(files: Record<string, string>): {
  libraries: DetectedLibrary[];
  endpoints: APIEndpoint[];
} {
  const libraries: DetectedLibrary[] = [];
  const endpoints: APIEndpoint[] = [];

  for (const [path, content] of Object.entries(files)) {
    // Scan requirements.txt
    if (path.endsWith("requirements.txt")) {
      for (const line of content.split("\n")) {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)/);
        if (match) {
          const libName = match[1];
          const risk = RISK_LIBRARY[libName];
          if (risk) {
            const lines = content.split("\n");
            const lineNum = lines.findIndex((l) => l.includes(libName)) + 1;
            libraries.push({
              name: libName,
              version: line.match(/==([\d.]+)/)?.[1] || "any",
              source: "requirements.txt",
              riskDomain: risk.domain,
              annexCategory: risk.annexCategory,
              severity: risk.severity,
              description: risk.description,
              codeEvidence: `requirements.txt:${lineNum} — ${line.trim()}`,
            });
          }
        }
      }
    }

    // Scan Python imports
    if (path.endsWith(".py")) {
      for (const [libName, risk] of Object.entries(RISK_LIBRARY)) {
        const regex = new RegExp(`(import\\s+${libName}|from\\s+${libName})`, "i");
        if (regex.test(content)) {
          const lines = content.split("\n");
          const lineNum = lines.findIndex((l) => regex.test(l)) + 1;
          const importLine = lines[lineNum - 1]?.trim() || "";
          if (!libraries.some((l) => l.name === libName)) {
            libraries.push({
              name: libName,
              version: "detected",
              source: "import",
              riskDomain: risk.domain,
              annexCategory: risk.annexCategory,
              severity: risk.severity,
              description: risk.description,
              codeEvidence: `${path}:${lineNum} — ${importLine}`,
            });
          }
        }
      }
    }

    // Scan API endpoints (FastAPI/Flask/Django)
    if (path.endsWith(".py") && /route|@app\.|@api\.|endpoint|url_pattern/i.test(content)) {
      for (const signal of API_SIGNALS) {
        if (signal.pattern.test(content)) {
          const lines = content.split("\n");
          const routeLine = lines.findIndex((l) => /@app\.(get|post|put|delete|route)|def\s+\w+/.test(l) && signal.pattern.test(l));
          if (routeLine >= 0) {
            endpoints.push({
              path: content.split("\n")[routeLine]?.trim() || path,
              methods: ["POST"],
              inputType: signal.inputType,
              riskFlagged: signal.inputType === "biometric" || signal.inputType === "sensitive_data" || signal.inputType === "financial",
              description: signal.desc,
            });
          }
        }
      }
    }
  }

  return { libraries, endpoints };
}

export function classifyRisk(
  libraries: DetectedLibrary[],
  endpoints: APIEndpoint[],
  hasProfiling: boolean,
  exemptionRequested: boolean
): ClassificationResult {
  const hasCritical = libraries.some((l) => l.severity === "critical");
  const hasHigh = libraries.some((l) => l.severity === "high");
  const hasBiometricEndpoint = endpoints.some((e) => e.inputType === "biometric");
  const hasSensitiveEndpoint = endpoints.some((e) => e.riskFlagged);

  let riskLevel: ClassificationResult["riskLevel"] = "Minimal";
  let annexCat: string | null = null;
  let exempted = false;
  let rationale = "";

  // Art. 5 — Pratiche vietate
  if (hasCritical || (hasBiometricEndpoint && libraries.some((l) => l.riskDomain === "Biometrico"))) {
    riskLevel = "Unacceptable";
    annexCat = libraries.find((l) => l.annexCategory)?.annexCategory || null;
  }
  // Allegato III — Alto rischio
  else if (hasHigh || hasSensitiveEndpoint) {
    riskLevel = "High";
    annexCat = libraries.find((l) => l.annexCategory)?.annexCategory || "4. Occupazione";

    // Art. 6(3) — Deroga "non ad alto rischio"
    if (exemptionRequested && !hasProfiling) {
      exempted = true;
      rationale = "Richiesta deroga Art. 6(3): il sistema non effettua profilazione di persone fisiche. " +
        "Verificata assenza di categorizzazione biometrica e scoring su persone.";
      riskLevel = "Limited";
    } else if (exemptionRequested && hasProfiling) {
      exempted = false;
      rationale = "Deroga Art. 6(3) NEGATA: il sistema effettua profilazione. " +
        "La profilazione di persone fisiche impedisce l'esenzione dall'alto rischio.";
    }
  }
  // Rischio limitato
  else if (libraries.some((l) => l.severity === "medium")) {
    riskLevel = "Limited";
    annexCat = libraries.find((l) => l.annexCategory)?.annexCategory || null;
  }

  return {
    systemName: "Scanned System",
    versionHash: `sha256:${Date.now().toString(36)}`,
    riskLevel,
    annexCategory: annexCat,
    isExemptedArt6_3: exempted,
    exemptionRationale: rationale,
    libraries,
    endpoints,
    score: hasCritical ? 95 : hasHigh ? 75 : libraries.some((l) => l.severity === "medium") ? 40 : 10,
    timestamp: new Date().toISOString(),
  };
}
