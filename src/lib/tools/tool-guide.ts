// Guida fissa in testa a ogni tool: "Cosa fai qui / Chi deve farlo / Articolo / Quando hai finito".
// I testi sono nel namespace i18n "toolGuide" (chiavi <id>_what, <id>_who, <id>_art, <id>_done).

export interface ToolGuideEntry {
  id: string;
  href: string;
  /** Strumento facoltativo o di supporto: non deriva da un obbligo e resta sempre nel menu */
  optional: boolean;
}

export const TOOL_GUIDES: ToolGuideEntry[] = [
  { id: "inventory", href: "/dashboard/tools/inventory", optional: false },
  { id: "triage", href: "/dashboard/triage", optional: false },
  { id: "literacy", href: "/dashboard/tools/literacy", optional: false },
  { id: "risk", href: "/dashboard/tools/risk-manager", optional: false },
  { id: "fria", href: "/dashboard/tools/fria", optional: false },
  { id: "dpia", href: "/dashboard/tools/dpia", optional: false },
  { id: "docugen", href: "/dashboard/tools/docugen", optional: false },
  { id: "data", href: "/dashboard/tools/data-audit", optional: false },
  { id: "transparency", href: "/dashboard/tools/transparency", optional: false },
  { id: "oversight", href: "/dashboard/tools/oversight", optional: false },
  { id: "resilience", href: "/dashboard/tools/resilience", optional: false },
  { id: "qms", href: "/dashboard/tools/qms", optional: false },
  { id: "conformity", href: "/dashboard/tools/conformity", optional: false },
  { id: "deployer", href: "/dashboard/tools/deployer-dashboard", optional: false },
  { id: "gpai", href: "/dashboard/tools/gpai", optional: false },
  { id: "legal", href: "/dashboard/tools/legal-assistant", optional: true },
  { id: "deadlines", href: "/dashboard/compliance-ops/deadlines", optional: true },
  { id: "logvault", href: "/dashboard/tools/logvault", optional: false },
  { id: "postmarket", href: "/dashboard/post-market", optional: false },
  { id: "drift", href: "/dashboard/tools/drift-monitor", optional: false },
  { id: "eudb", href: "/dashboard/compliance-ops/eudb", optional: false },
  { id: "authrep", href: "/dashboard/compliance-ops/authorized-rep", optional: false },
  { id: "transition", href: "/dashboard/compliance-ops/provider-transition", optional: false },
  { id: "trustcenter", href: "/dashboard/compliance-ops/trust-center", optional: true },
  { id: "passport", href: "/dashboard/tools/trust-passport", optional: true },
  { id: "questionnaire", href: "/dashboard/tools/questionnaire", optional: true },
  { id: "l132", href: "/dashboard/tools/l132", optional: true },
  { id: "agid", href: "/dashboard/tools/agid-acn", optional: true },
  { id: "nist", href: "/dashboard/tools/nist-ai-rmf", optional: true },
  { id: "art50", href: "/dashboard/tools/art50-kit", optional: false },
  { id: "dossier", href: "/dashboard/dossier", optional: true },
];

/** Voce della guida per il percorso corrente (prefisso più lungo) */
export function guideForPath(pathname: string): ToolGuideEntry | null {
  let best: ToolGuideEntry | null = null;
  for (const g of TOOL_GUIDES) {
    if ((pathname === g.href || pathname.startsWith(g.href + "/")) && (!best || g.href.length > best.href.length)) best = g;
  }
  return best;
}
