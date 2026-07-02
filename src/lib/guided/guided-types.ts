/**
 * guided-types.ts
 * Tipo condiviso GuidedQ — usato da FRIA, DPIA e Risk Register per la
 * modalità "Guidata" (badge ref + ESEMPI box + bottoni risposta + testo libero).
 */

export type AnswerType = "yes_no_partial" | "yes_no" | "choices" | "free_text";

export interface GuidedExample {
  label: string;
  text: string;
}

export interface GuidedQ {
  id: string;
  ref: string;
  question: string;
  examples: GuidedExample[];
  answerType: AnswerType;
  choices?: string[];
  mapsTo: string;
  required?: boolean;
}

export type GuidedAnswers = Record<string, string>;
