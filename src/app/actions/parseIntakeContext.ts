"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { z } from "zod";

const SYSTEM_SCOPES = [
  "hr_recruitment", "hr_performance", "credit_scoring", "fraud_detection",
  "health_diagnosis", "health_monitoring", "education_assessment",
  "public_services", "biometric_identification", "marketing_profiling",
  "safety_critical", "other",
] as const;

const DATA_CATEGORIES = [
  "comuni", "art9_salute", "art9_origine_etnica", "art9_biometrici",
  "art9_genetici", "art9_orientamento_sessuale", "art9_religione",
  "giudiziari", "localizzazione", "comportamentali",
] as const;

const IntakeContextSchema = z.object({
  systemName: z.string(),
  systemScope: z.enum(SYSTEM_SCOPES),
  processingPurpose: z.string(),
  dataCategories: z.array(z.enum(DATA_CATEGORIES)),
  subjectScale: z.enum(["under_100", "100_to_10k", "10k_to_1m", "over_1m", "large_scale_unknown"]),
  automatedDecisions: z.enum(["yes", "no", "partial"]),
  highRiskAIAct: z.enum(["yes", "no", "unknown"]),
  crossBorderTransfer: z.boolean(),
  vulnerableSubjects: z.boolean(),
  dpiaJustification: z.string(),
});

export type IntakeContext = z.infer<typeof IntakeContextSchema>;

export async function parseIntakeContext(
  freeText: string
): Promise<{ intake: IntakeContext | null; error?: string }> {
  if (!freeText.trim()) return { intake: null, error: "MISSING_INPUT" };

  const prompt = `Sei un esperto GDPR e AI Act. Analizza la descrizione di un sistema AI e compila il seguente JSON strutturato.

Valori possibili:
- systemScope: hr_recruitment | hr_performance | credit_scoring | fraud_detection | health_diagnosis | health_monitoring | education_assessment | public_services | biometric_identification | marketing_profiling | safety_critical | other
- dataCategories (array, scegli tutti applicabili): comuni | art9_salute | art9_origine_etnica | art9_biometrici | art9_genetici | art9_orientamento_sessuale | art9_religione | giudiziari | localizzazione | comportamentali
- subjectScale: under_100 | 100_to_10k | 10k_to_1m | over_1m | large_scale_unknown
- automatedDecisions: yes | no | partial
- highRiskAIAct: yes | no | unknown
- crossBorderTransfer: true | false
- vulnerableSubjects: true | false (minori, disabili, pazienti, lavoratori vulnerabili)

REGOLE:
- systemName: estrai il nome del sistema dalla descrizione, o usa "Sistema AI" se non specificato
- processingPurpose: descrizione sintetica (max 2 frasi) della finalità del trattamento
- dpiaJustification: 1 frase che spiega perché la DPIA è necessaria o raccomandabile per questo sistema
- Se non puoi determinare un valore, usa "unknown" o false
- Rispondi SOLO con JSON valido

Descrizione sistema: "${freeText}"

JSON:
{
  "systemName": "...",
  "systemScope": "...",
  "processingPurpose": "...",
  "dataCategories": ["..."],
  "subjectScale": "...",
  "automatedDecisions": "...",
  "highRiskAIAct": "...",
  "crossBorderTransfer": false,
  "vulnerableSubjects": false,
  "dpiaJustification": "..."
}`;

  try {
    const text = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 600 });
    const cleaned = text.trim().replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const raw = JSON.parse(match[0]);

    // Coerce and sanitize
    if (!SYSTEM_SCOPES.includes(raw.systemScope)) raw.systemScope = "other";
    if (!Array.isArray(raw.dataCategories)) raw.dataCategories = ["comuni"];
    raw.dataCategories = raw.dataCategories.filter((d: string) => DATA_CATEGORIES.includes(d as typeof DATA_CATEGORIES[number]));
    if (!raw.dataCategories.length) raw.dataCategories = ["comuni"];
    const scaleVals = ["under_100","100_to_10k","10k_to_1m","over_1m","large_scale_unknown"];
    if (!scaleVals.includes(raw.subjectScale)) raw.subjectScale = "large_scale_unknown";
    if (!["yes","no","partial"].includes(raw.automatedDecisions)) raw.automatedDecisions = "no";
    if (!["yes","no","unknown"].includes(raw.highRiskAIAct)) raw.highRiskAIAct = "unknown";
    raw.crossBorderTransfer = Boolean(raw.crossBorderTransfer);
    raw.vulnerableSubjects = Boolean(raw.vulnerableSubjects);

    return { intake: IntakeContextSchema.parse(raw) };
  } catch (err) {
    console.error("[parseIntakeContext] error:", err);
    return { intake: null, error: "PARSE_FAILED" };
  }
}
