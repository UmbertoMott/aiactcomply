export interface ParsedFunction {
  name: string;
  type: "preprocessing" | "training" | "inference" | "validation" | "postprocessing";
  file: string;
  line: number;
  art10Relevant: boolean;
  description: string;
}

export interface AnnexIVSection {
  id: string;
  title: string;
  content: string;
  hash: string;
}

export interface AnnexIVDocument {
  systemName: string;
  version: string;
  generatedAt: string;
  sections: AnnexIVSection[];
  rootHash: string;
  signature: string;
}

// Simula analisi AST su codice sorgente
export function analyzeCodeAST(code: string): ParsedFunction[] {
  const results: ParsedFunction[] = [];
  const lines = code.split("\n");

  const patterns: Array<{ regex: RegExp; type: ParsedFunction["type"]; desc: string }> = [
    { regex: /function\s+(clean|normalize|preprocess|scale|encode|transform|impute|remove_outliers|drop_duplicates)/i, type: "preprocessing", desc: "Pulizia e preparazione dati (Art. 10)" },
    { regex: /function\s+(train|fit|learn|train_model|train_test_split|cross_val)/i, type: "training", desc: "Addestramento del modello" },
    { regex: /function\s+(predict|infer|classify|score|detect|generate|output)/i, type: "inference", desc: "Inferenza o predizione" },
    { regex: /function\s+(validate|test|evaluate|accuracy|precision|recall|f1|confusion)/i, type: "validation", desc: "Validazione e testing" },
    { regex: /function\s+(postprocess|format|explain|report|visualize|export)/i, type: "postprocessing", desc: "Post-processing output" },
  ];

  lines.forEach((line, i) => {
    for (const p of patterns) {
      const match = line.match(p.regex);
      if (match) {
        const funcName = match[1];
        const art10Relevant = p.type === "preprocessing" || p.type === "training";
        results.push({
          name: funcName,
          type: p.type,
          file: "src/model/pipeline.py",
          line: i + 1,
          art10Relevant,
          description: p.desc,
        });
      }
    }
  });

  return results;
}

export function generateAnnexIVJSON(systemName: string, functions: ParsedFunction[]): AnnexIVDocument {
  const sections: AnnexIVSection[] = [
    {
      id: "4.1(a)",
      title: "Descrizione generale del sistema",
      content: JSON.stringify({
        name: systemName,
        version: "2.3.1",
        type: "High-risk AI system",
        classification: "Allegato III, punto 1(a)",
        description: "Sistema di classificazione automatica per screening CV",
        deployment: "UE - Italia",
      }, null, 2),
      hash: "",
    },
    {
      id: "4.1(b)",
      title: "Specifiche di progettazione",
      content: JSON.stringify({
        architecture: "Transformer encoder + MLP classifier",
        framework: "PyTorch 2.1",
        inputDim: 768,
        outputDim: 5,
        layers: 12,
        parameters: "85M",
      }, null, 2),
      hash: "",
    },
    {
      id: "4.1(c)",
      title: "Architettura e logica algoritmica",
      content: JSON.stringify({
        components: functions.map(f => ({
          function: f.name,
          type: f.type,
          file: f.file,
          line: f.line,
          description: f.description,
        })),
        training_method: "Supervised learning with cross-validation",
        loss_function: "Cross-entropy",
        optimizer: "AdamW (lr=2e-5)",
      }, null, 2),
      hash: "",
    },
    {
      id: "4.1(d)",
      title: "Dati di addestramento e governance",
      content: JSON.stringify({
        training_dataset: "CV_2024_v3 (850k records)",
        validation_split: "80/20",
        data_sources: ["LinkedIn API", "Indeed crawler", "Internal HR DB"],
        preprocessing: functions.filter(f => f.type === "preprocessing").map(f => f.name),
        bias_mitigation: "Reweighing technique applied",
      }, null, 2),
      hash: "",
    },
    {
      id: "4.1(e)",
      title: "Misure di sorveglianza umana",
      content: JSON.stringify({
        oversight: "Human-in-the-loop per decisioni con confidence < 0.85",
        kill_switch: "Disponibile via Guardian-Agent Control Plane",
        escalation: "3 livelli: Watch → Assist → Autonomous",
        override_procedure: "Override consentito solo con motivazione testuale",
      }, null, 2),
      hash: "",
    },
    {
      id: "4.1(f)",
      title: "Metriche di accuratezza e robustezza",
      content: JSON.stringify({
        accuracy: 0.942,
        precision: 0.91,
        recall: 0.88,
        f1_score: 0.89,
        auc_roc: 0.96,
        bias_audit: "Disparate impact ratio: 0.78 (soglia 0.80)",
        cybersecurity: "Encrypted at rest (AES-256) and in transit (TLS 1.3)",
      }, null, 2),
      hash: "",
    },
  ];

  return {
    systemName,
    version: "2.3.1",
    generatedAt: new Date().toISOString(),
    sections,
    rootHash: "sha256:generated-at-build-time",
    signature: "signed:aicomply:annex-iv:v2.3.1",
  };
}

export async function signDocument(doc: AnnexIVDocument): Promise<AnnexIVDocument> {
  const encoder = new TextEncoder();
  const payload = JSON.stringify(doc.sections);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    ...doc,
    rootHash: `sha256:${hash}`,
    signature: `signed:aicomply:annex-iv:${hash.slice(0, 16)}`,
  };
}
