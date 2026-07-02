"use client";
import type { GuidedFriaProgress } from "@/lib/fria/fria-guided-progress";

export interface FriaProgressRailProps {
  progress: GuidedFriaProgress;
  activeSection: string | null;
  onSectionClick: (sectionKey: string, anchor: string) => void;
  onSubPointClick: (subPointId: string) => void;
}

export function FriaProgressRail(_props: FriaProgressRailProps): null {
  return null;
}
