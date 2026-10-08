import type { ToolDictionaries, ToolNamespace } from "./types";
import shell from "./shell";
import inventory from "./inventory";
import fria from "./fria";
import dpiaRisk from "./dpia_risk";
import deployerOps from "./deployer_ops";
import qualityDocs from "./quality_docs";
import marketOps from "./market_ops";
import support from "./support";

// Unisce i dizionari dei tool (un file per gruppo, così ogni gruppo si modifica senza conflitti).
const GROUPS: ToolDictionaries[] = [shell, inventory, fria, dpiaRisk, deployerOps, qualityDocs, marketOps, support];

function merge(locale: "it" | "en"): Record<string, ToolNamespace> {
  const out: Record<string, ToolNamespace> = {};
  for (const g of GROUPS) {
    for (const [ns, keys] of Object.entries(g[locale])) out[ns] = { ...(out[ns] ?? {}), ...keys };
  }
  return out;
}

export const TOOL_DICTIONARIES = { it: merge("it"), en: merge("en") };
