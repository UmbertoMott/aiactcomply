import { z } from "zod";

export const PracticeOutcomeEnum = z.enum([
  "not_applicable",           // il sistema non rientra nella pratica descritta
  "prohibited",               // rientra e nessuna eccezione si applica
  "permitted_with_exception", // rientra ma un'eccezione documentata si applica
  "requires_legal_review",    // ambiguo, serve valutazione legale puntuale
]);
export type PracticeOutcome = z.infer<typeof PracticeOutcomeEnum>;

export const EmotionRecognitionAssessmentSchema = z.object({
  systemId: z.string().optional(),
  inferEmotions: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  appliesToWorkplaceOrEducation: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  exemptionClaimed: z.enum(["medical_safety", "none"]).default("none"),
  exemptionJustification: z.string().optional(),
  outcome: PracticeOutcomeEnum.default("not_applicable"),
  aiConfirmed: z.boolean().default(false),
});
export type EmotionRecognitionAssessment = z.infer<typeof EmotionRecognitionAssessmentSchema>;

export const BiometricCategorizationAssessmentSchema = z.object({
  systemId: z.string().optional(),
  performsBiometricCategorization: z.enum(["yes", "no", "unspecified"]).default("unspecified"),
  inferredCategories: z.array(z.string()).default([]),
  exemptionClaimed: z.enum(["lawful_dataset_labelling", "law_enforcement", "none"]).default("none"),
  exemptionJustification: z.string().optional(),
  outcome: PracticeOutcomeEnum.default("not_applicable"),
  aiConfirmed: z.boolean().default(false),
});
export type BiometricCategorizationAssessment = z.infer<typeof BiometricCategorizationAssessmentSchema>;

export const Art5EmotionBiometricRecordSchema = z.object({
  emotionRecognition: EmotionRecognitionAssessmentSchema,
  biometricCategorization: BiometricCategorizationAssessmentSchema,
  art50LinkAcknowledged: z.boolean().default(false),
  updatedAt: z.string().optional(),
});
export type Art5EmotionBiometricRecord = z.infer<typeof Art5EmotionBiometricRecordSchema>;

const STORAGE_KEY = "aicomply_art5_emotion_biometric_v1";

export function loadArt5EmotionBiometricRecord(): Art5EmotionBiometricRecord {
  if (typeof window === "undefined") return {
    emotionRecognition: { inferEmotions: "unspecified", appliesToWorkplaceOrEducation: "unspecified", exemptionClaimed: "none", outcome: "not_applicable", aiConfirmed: false },
    biometricCategorization: { performsBiometricCategorization: "unspecified", inferredCategories: [], exemptionClaimed: "none", outcome: "not_applicable", aiConfirmed: false },
    art50LinkAcknowledged: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {
      emotionRecognition: { inferEmotions: "unspecified", appliesToWorkplaceOrEducation: "unspecified", exemptionClaimed: "none", outcome: "not_applicable", aiConfirmed: false },
      biometricCategorization: { performsBiometricCategorization: "unspecified", inferredCategories: [], exemptionClaimed: "none", outcome: "not_applicable", aiConfirmed: false },
      art50LinkAcknowledged: false,
    };
  } catch {
    return {
      emotionRecognition: { inferEmotions: "unspecified", appliesToWorkplaceOrEducation: "unspecified", exemptionClaimed: "none", outcome: "not_applicable", aiConfirmed: false },
      biometricCategorization: { performsBiometricCategorization: "unspecified", inferredCategories: [], exemptionClaimed: "none", outcome: "not_applicable", aiConfirmed: false },
      art50LinkAcknowledged: false,
    };
  }
}

export function saveArt5EmotionBiometricRecord(r: Art5EmotionBiometricRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...r, updatedAt: new Date().toISOString() }));
}

// Map detailed outcome → CheckAnswer for the main verdict engine
export function outcomeToCheckAnswer(outcome: PracticeOutcome): "yes" | "no" | "unsure" {
  if (outcome === "prohibited") return "yes";
  if (outcome === "permitted_with_exception") return "yes"; // conditional → potential_violation
  if (outcome === "not_applicable") return "no";
  return "unsure"; // requires_legal_review
}
