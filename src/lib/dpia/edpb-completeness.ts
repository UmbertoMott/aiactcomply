// Motore di completezza del Template EDPB 2026 (rule-based, senza AI).
// Determina quali campi richiesti sono ancora vuoti, per sezione, e la
// percentuale complessiva. Usato dal gap check e dalla modalità guidata.

import type { DpiaEdpbDoc } from "@/lib/dpia/edpb-schema";

export interface EdpbGapItem {
  section: number;   // 0..6
  labelKey: string;  // chiave i18n in namespace dpiaEdpb
  filled: boolean;
}
export interface EdpbSectionStat {
  section: number;
  total: number;
  done: number;
}
export interface EdpbCompleteness {
  items: EdpbGapItem[];
  sections: EdpbSectionStat[];
  overallPercent: number;
  firstIncompleteSection: number | null;
}

export function computeEdpbCompleteness(d: DpiaEdpbDoc): EdpbCompleteness {
  const has = (v?: string) => !!(v && v.trim());
  const items: EdpbGapItem[] = [];
  const add = (section: number, labelKey: string, filled: boolean) => items.push({ section, labelKey, filled });

  // ── 0. Overview ──
  add(0, "controllersTitle", d.controllers.some((c) => has(c.name)));
  add(0, "processingName", has(d.processingName));
  add(0, "launchDate", has(d.launchDate));
  add(0, "reasonsTitle", d.reasons.mandatory || d.reasons.art35_3a || d.reasons.art35_3b || d.reasons.art35_3c || d.reasons.beneficial || has(d.reasons.other));
  add(0, "scopeField", has(d.scope));

  // ── 1. Descrizione ──
  add(1, "personalData", has(d.personalData));
  add(1, "purposesTitle", d.purposes.some((p) => has(p.purpose)));
  add(1, "nature", has(d.nature));
  add(1, "scopeDesc", has(d.scopeDesc));
  add(1, "context", has(d.context));
  add(1, "functionalDescription", has(d.functionalDescription));
  add(1, "lifecycleTitle", has(d.lifecycle.collection) && has(d.lifecycle.use) && has(d.lifecycle.storage) && has(d.lifecycle.deletion));
  add(1, "assetsTitle", d.assets.some((a) => has(a.name)));

  // ── 2. Analisi ──
  add(2, "legalBasisAnalysis", has(d.legalBasisAnalysis));
  if (has(d.specialCategories)) add(2, "liftProhibition", has(d.liftProhibition));
  add(2, "minimisationRetention", has(d.minimisationRetention));
  add(2, "dataQuality", has(d.dataQuality));
  add(2, "mArt5Title", d.measuresArt5.some((m) => has(m.description)));
  add(2, "mSecurityTitle", d.measuresSecurity.some((m) => has(m.description)));

  // ── 3. Necessità e proporzionalità ──
  add(3, "impactsRightsFreedoms", has(d.impactsRightsFreedoms));
  add(3, "necessity", has(d.necessity));
  add(3, "proportionality", has(d.proportionality));

  // ── 4. Rischio ──
  add(4, "eventImpacts", has(d.eventImpacts));
  add(4, "riskMethod", has(d.riskMethod));
  add(4, "inherentRiskTitle", d.risks.some((r) => has(r.scenario)));
  add(4, "residualRisk", has(d.residualRisk));
  add(4, "actionPlan", has(d.actionPlan));

  // ── 5. Coinvolgimento parti ──
  add(5, "dpoAdvice", has(d.dpoAdvice));
  add(5, "dataSubjectsViews", has(d.dataSubjectsViews));

  // ── 6. Conclusione ──
  add(6, "decisionLabel", d.decision !== "");
  if (d.decision === "conditional") add(6, "decisionConditions", has(d.decisionConditions));

  const sections: EdpbSectionStat[] = [];
  for (let s = 0; s <= 6; s++) {
    const inSec = items.filter((i) => i.section === s);
    sections.push({ section: s, total: inSec.length, done: inSec.filter((i) => i.filled).length });
  }
  const total = items.length;
  const done = items.filter((i) => i.filled).length;
  const overallPercent = total === 0 ? 0 : Math.round((done / total) * 100);
  const firstIncomplete = sections.find((s) => s.done < s.total);

  return { items, sections, overallPercent, firstIncompleteSection: firstIncomplete ? firstIncomplete.section : null };
}
