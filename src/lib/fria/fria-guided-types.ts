// Stato della FRIA guidata (modalità chat 3-colonne).
// FriaGuidedDoc è persistito sotto la chiave `friaGuided` di STORAGE_KEYS.

export type FriaAnswerSource = "manual" | "ai_suggested";
export type FriaAnswerStatus = "empty" | "draft" | "done";

export interface FriaAnswer {
  value: string;
  source: FriaAnswerSource;
  aiConfirmed: boolean;
  status: FriaAnswerStatus;
  updatedAt: string;
}

export interface FriaGuidedDoc {
  answers: Record<string, FriaAnswer>;
  currentSubPointId: string | null;
  inputHash: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function createEmptyFriaGuidedDoc(): FriaGuidedDoc {
  return {
    answers: {},
    currentSubPointId: "f1a_finalita",
    inputHash: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function emptyFriaAnswer(source: FriaAnswerSource = "manual"): FriaAnswer {
  return { value: "", source, aiConfirmed: false, status: "empty", updatedAt: new Date().toISOString() };
}
