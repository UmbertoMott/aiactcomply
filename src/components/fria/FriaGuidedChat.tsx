"use client";
import type { FriaGuidedDoc } from "@/lib/fria/fria-guided-types";

export interface FriaGuidedChatProps {
  doc: FriaGuidedDoc;
  currentId: string | null;
  onAnswerUpdate: (id: string, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function FriaGuidedChat(_props: FriaGuidedChatProps): null {
  return null;
}
