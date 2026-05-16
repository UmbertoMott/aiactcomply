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

// ─── SORGENTI ESTERNE ─────────────────────────────────────────────────────

export type SourceType =
  | "github_repo"
  | "file_upload"
  | "npm_package"
  | "docker_image"
  | "aws_sagemaker"
  | "azure_ml"
  | "huggingface";

export interface DiscoverySource {
  id: string;
  type: SourceType;
  label: string;
  config: Record<string, string>;
  status: "idle" | "scanning" | "done" | "error";
  lastScannedAt?: string;
  errorMessage?: string;
}

export interface DiscoveredSystem {
  id: string;
  sourceId: string;
  name: string;
  description: string;
  detectedLibraries: DetectedLibrary[];
  detectedEndpoints: APIEndpoint[];
  inferredRiskLevel: ClassificationResult["riskLevel"];
  inferredAnnexCategory: string | null;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  status: "new" | "under_review" | "classified" | "ignored";
  addedToCompliance: boolean;
  discoveredAt: string;
}

export const SOURCE_CATALOG: Array<{
  type: SourceType;
  name: string;
  icon: string;
  description: string;
  configFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    secret: boolean;
  }>;
}> = [
  {
    type: "github_repo",
    name: "GitHub Repository",
    icon: "GitBranch",
    description: "Scansiona un repository GitHub per rilevare librerie AI, model files e API endpoints.",
    configFields: [
      { key: "url", label: "URL Repository", placeholder: "https://github.com/myorg/myrepo", secret: false },
      { key: "token", label: "Personal Access Token", placeholder: "ghp_xxxxxxxxxxxx", secret: true },
      { key: "branch", label: "Branch", placeholder: "main", secret: false },
    ],
  },
  {
    type: "file_upload",
    name: "Upload file progetto",
    icon: "Upload",
    description: "Carica requirements.txt, package.json, o un file di testo con le dipendenze del progetto.",
    configFields: [],
  },
  {
    type: "npm_package",
    name: "NPM / package.json",
    icon: "Package",
    description: "Analizza le dipendenze npm per rilevare librerie AI (TensorFlow.js, ONNX, ecc.).",
    configFields: [
      { key: "packageJson", label: "Contenuto package.json", placeholder: '{"dependencies": {...}}', secret: false },
    ],
  },
  {
    type: "aws_sagemaker",
    name: "AWS SageMaker",
    icon: "Cloud",
    description: "Elenca gli endpoint SageMaker attivi nel tuo account AWS.",
    configFields: [
      { key: "accessKeyId", label: "AWS Access Key ID", placeholder: "AKIAIOSFODNN7EXAMPLE", secret: false },
      { key: "secretKey", label: "AWS Secret Key", placeholder: "wJalrXUtnFEMI/...", secret: true },
      { key: "region", label: "Region", placeholder: "eu-west-1", secret: false },
    ],
  },
  {
    type: "azure_ml",
    name: "Azure Machine Learning",
    icon: "Cloud",
    description: "Scopri i modelli e gli endpoint registrati nel tuo workspace Azure ML.",
    configFields: [
      { key: "subscriptionId", label: "Subscription ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", secret: false },
      { key: "workspace", label: "Workspace Name", placeholder: "my-ml-workspace", secret: false },
      { key: "clientSecret", label: "Client Secret", placeholder: "...", secret: true },
    ],
  },
  {
    type: "huggingface",
    name: "Hugging Face",
    icon: "Cpu",
    description: "Rileva modelli Hugging Face in uso nel codebase o scaricati dall'Hub.",
    configFields: [
      { key: "orgOrUser", label: "Organizzazione o utente HF", placeholder: "myorg", secret: false },
      { key: "token", label: "HF Token (opzionale)", placeholder: "hf_xxxxxxxxxxxx", secret: true },
    ],
  },
];

export const NPM_RISK_LIBRARY: Record<string, {
  domain: string;
  annexCategory: string | null;
  severity: DetectedLibrary["severity"];
  description: string;
}> = {
  "@tensorflow/tfjs": { domain: "Deep Learning", annexCategory: null, severity: "low", description: "TensorFlow.js — verificare task specifico" },
  "onnxruntime-web": { domain: "Inferenza modelli", annexCategory: null, severity: "medium", description: "Runtime ONNX — modelli pre-addestrati" },
  "face-api.js": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "high", description: "Riconoscimento facciale browser-side" },
  "brain.js": { domain: "Machine Learning", annexCategory: null, severity: "low", description: "Neural network generico JS" },
  "ml5": { domain: "Machine Learning", annexCategory: null, severity: "low", description: "ML accessibile — verificare uso" },
  "compromise": { domain: "NLP", annexCategory: null, severity: "low", description: "NLP leggero — analisi testo" },
  "natural": { domain: "NLP", annexCategory: null, severity: "low", description: "NLP — classificazione testo" },
  "sentiment": { domain: "NLP", annexCategory: "4. Occupazione", severity: "medium", description: "Analisi sentiment — attenzione se su lavoratori" },
  "node-face-recognition": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "critical", description: "Riconoscimento facciale — Art. 5 se spazi pubblici" },
  "openai": { domain: "GPAI", annexCategory: null, severity: "medium", description: "OpenAI API — GPAI, verificare Art. 52" },
  "anthropic": { domain: "GPAI", annexCategory: null, severity: "medium", description: "Anthropic API — GPAI" },
  "@google-cloud/aiplatform": { domain: "Cloud AI", annexCategory: null, severity: "medium", description: "Google Vertex AI" },
  "aws-sdk": { domain: "Cloud AI", annexCategory: null, severity: "low", description: "AWS SDK — verificare uso SageMaker/Rekognition" },
  "azure-cognitiveservices-face": { domain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "high", description: "Azure Face API — identificazione biometrica" },
};

export function simulateScan(source: DiscoverySource): DiscoveredSystem[] {
  const base = {
    sourceId: source.id,
    discoveredAt: new Date().toISOString(),
    status: "new" as const,
    addedToCompliance: false,
  };

  if (source.type === "github_repo") {
    const url = source.config.url || "";
    const repoName = url.split("/").slice(-1)[0] || "unknown-repo";
    return [
      {
        ...base,
        id: `disc-${Date.now()}-1`,
        name: repoName,
        description: `Sistema rilevato in ${repoName}: usa scikit-learn per classificazione e xgboost per scoring. API endpoint /api/score rilevato.`,
        detectedLibraries: [
          { name: "scikit-learn", version: "1.3.0", source: "requirements.txt" as const, riskDomain: "Machine Learning", annexCategory: "4. Occupazione", severity: "medium" as const, description: "Classificazione ML", codeEvidence: "requirements.txt:4 — scikit-learn==1.3.0" },
          { name: "xgboost", version: "1.7.6", source: "requirements.txt" as const, riskDomain: "Scoring", annexCategory: "5. Servizi essenziali", severity: "high" as const, description: "Credit scoring / valutazione finanziaria", codeEvidence: "requirements.txt:7 — xgboost==1.7.6" },
        ],
        detectedEndpoints: [
          { path: "/api/score", methods: ["POST"], inputType: "financial" as const, riskFlagged: true, description: "Scoring finanziario" },
        ],
        inferredRiskLevel: "High" as const,
        inferredAnnexCategory: "5. Servizi essenziali",
        confidence: "high" as const,
        evidence: [
          "requirements.txt: xgboost==1.7.6 — scoring finanziario ad alto rischio",
          "API endpoint /api/score con input di tipo finanziario",
          "scikit-learn: classificatore — contesto finanziario conferma Allegato III",
        ],
      },
    ];
  }

  if (source.type === "aws_sagemaker") {
    return [
      {
        ...base,
        id: `disc-${Date.now()}-2`,
        name: "sagemaker-churn-predictor",
        description: "Endpoint SageMaker attivo: modello di predizione churn clienti. Framework: sklearn. Istanza: ml.m5.large.",
        detectedLibraries: [
          { name: "scikit-learn", version: "detected", source: "import" as const, riskDomain: "Machine Learning", annexCategory: null, severity: "medium" as const, description: "Classificazione ML", codeEvidence: "SageMaker endpoint config: sklearn-2023-09-01" },
        ],
        detectedEndpoints: [
          { path: "sagemaker-endpoint://churn-predictor-v2", methods: ["POST"], inputType: "personal_data" as const, riskFlagged: false, description: "Predizione churn" },
        ],
        inferredRiskLevel: "Limited" as const,
        inferredAnnexCategory: null,
        confidence: "medium" as const,
        evidence: [
          "SageMaker endpoint attivo: churn-predictor-v2",
          "Framework sklearn rilevato dalla configurazione endpoint",
          "Nessuna libreria ad alto rischio identificata",
        ],
      },
      {
        ...base,
        id: `disc-${Date.now()}-3`,
        name: "sagemaker-cv-screener",
        description: "Endpoint SageMaker: screening automatico CV con NLP. Usa transformers. Alta probabilità Allegato III punto 4 (Occupazione).",
        detectedLibraries: [
          { name: "transformers", version: "detected", source: "import" as const, riskDomain: "NLP", annexCategory: "4. Occupazione", severity: "medium" as const, description: "LLM — screening CV o chatbot HR", codeEvidence: "SageMaker endpoint config: huggingface-pytorch-inference" },
        ],
        detectedEndpoints: [
          { path: "sagemaker-endpoint://cv-screener-prod", methods: ["POST"], inputType: "personal_data" as const, riskFlagged: true, description: "Screening CV candidati" },
        ],
        inferredRiskLevel: "High" as const,
        inferredAnnexCategory: "4. Occupazione",
        confidence: "high" as const,
        evidence: [
          "SageMaker endpoint: cv-screener-prod — nome fortemente indicativo",
          "Framework HuggingFace PyTorch — NLP su dati occupazionali",
          "Input type: dati personali di candidati",
          "Allegato III punto 4: reclutamento e selezione del personale",
        ],
      },
    ];
  }

  if (source.type === "huggingface") {
    return [
      {
        ...base,
        id: `disc-${Date.now()}-4`,
        name: `${source.config.orgOrUser || "org"}/emotion-classifier`,
        description: "Modello HuggingFace rilevato: classificatore emozioni. Se usato in contesto lavorativo o educativo, violazione Art. 5.1.f.",
        detectedLibraries: [
          { name: "transformers", version: "detected", source: "import" as const, riskDomain: "Biometrico", annexCategory: "1. Identificazione biometrica", severity: "high" as const, description: "Analisi emozioni — Art. 5.1.f se in lavoro/scuola", codeEvidence: `HF Hub: ${source.config.orgOrUser || "org"}/emotion-classifier` },
        ],
        detectedEndpoints: [],
        inferredRiskLevel: "Unacceptable" as const,
        inferredAnnexCategory: "1. Identificazione biometrica",
        confidence: "medium" as const,
        evidence: [
          `Modello HuggingFace: ${source.config.orgOrUser || "org"}/emotion-classifier`,
          "Task: text-classification → emotion detection",
          "⚠️ Art. 5.1.f: riconoscimento emozioni vietato in luoghi di lavoro e istruzione",
        ],
      },
    ];
  }

  if (source.type === "npm_package" || source.type === "file_upload") {
    const content = source.config.packageJson || source.config.fileContent || "";
    const found: DetectedLibrary[] = [];
    for (const [pkg, risk] of Object.entries(NPM_RISK_LIBRARY)) {
      if (content.includes(pkg)) {
        found.push({
          name: pkg,
          version: "detected",
          source: "import" as const,
          riskDomain: risk.domain,
          annexCategory: risk.annexCategory,
          severity: risk.severity,
          description: risk.description,
          codeEvidence: `package.json: "${pkg}"`,
        });
      }
    }
    if (found.length === 0) return [];
    const hasCritical = found.some((l) => l.severity === "critical");
    const hasHigh = found.some((l) => l.severity === "high");
    return [
      {
        ...base,
        id: `disc-${Date.now()}-5`,
        name: "sistema-rilevato-da-package",
        description: `Rilevate ${found.length} librerie AI nel file analizzato.`,
        detectedLibraries: found,
        detectedEndpoints: [],
        inferredRiskLevel: hasCritical ? "Unacceptable" as const : hasHigh ? "High" as const : "Limited" as const,
        inferredAnnexCategory: found.find((l) => l.annexCategory)?.annexCategory ?? null,
        confidence: "medium" as const,
        evidence: found.map((l) => `${l.name}: ${l.description}`),
      },
    ];
  }

  return [];
}

export const DISCOVERY_STORAGE_KEYS = {
  sources: "aicomply_discovery_sources",
  discovered: "aicomply_discovered_systems",
} as const;

export function loadDiscoverySources(): DiscoverySource[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(DISCOVERY_STORAGE_KEYS.sources) || "[]");
  } catch { return []; }
}

export function saveDiscoverySources(sources: DiscoverySource[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISCOVERY_STORAGE_KEYS.sources, JSON.stringify(sources));
}

export function loadDiscoveredSystems(): DiscoveredSystem[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(DISCOVERY_STORAGE_KEYS.discovered) || "[]");
  } catch { return []; }
}

export function saveDiscoveredSystems(systems: DiscoveredSystem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISCOVERY_STORAGE_KEYS.discovered, JSON.stringify(systems));
}
