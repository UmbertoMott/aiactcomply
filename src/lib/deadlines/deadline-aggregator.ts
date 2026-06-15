// Aggregatore cross-modulo — genera scadenze dinamiche da altri tool
// Principio: zero inserimento manuale. Date derivate da campi gia presenti negli altri moduli.
import type { AIActDeadline, AIActTier } from "./deadline-types";
import type { AISystem } from "@/lib/inventory/ai-system";

function isEligibleForPostMarket(system: AISystem): boolean {
  return system.tier === "high_risk" || system.tier === "gpai_systemic";
}

function requiresEUDBRegistration(system: AISystem): boolean {
  return system.tier === "high_risk" || system.tier === "gpai_systemic";
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function tierToAppliesTo(tier: AISystem["tier"]): AIActTier[] {
  const map: Record<AISystem["tier"], AIActTier[]> = {
    prohibited:      ["prohibited"],
    high_risk:       ["high_risk_annex3"],
    limited:         ["limited"],
    minimal:         ["minimal"],
    gpai:            ["gpai"],
    gpai_systemic:   ["gpai_systemic"],
    unclassified:    ["all"],
  };
  return map[tier] ?? ["all"];
}

export interface IncidentEntry {
  id: string;
  date: string;       // ISO date — data evento
  severity: string;
}

// Legge incidenti aperti da LogVault / Risk Register (localStorage)
function getOpenSevereIncidents(systemId: string): IncidentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("aicomply_logvault_record_v1");
    if (!raw) return [];
    const rec = JSON.parse(raw);
    const events: IncidentEntry[] = (rec.importedLogs ?? [])
      .filter((l: { systemId?: string; severity?: string; importedAt?: string }) =>
        (!systemId || l.systemId === systemId) &&
        (l.severity === "high" || l.severity === "critical")
      )
      .map((l: { id?: string; importedAt?: string; severity?: string }) => ({
        id: l.id ?? crypto.randomUUID(),
        date: l.importedAt ?? new Date().toISOString().slice(0, 10),
        severity: l.severity ?? "high",
      }));
    return events.slice(0, 3); // max 3 per non sovraccaricare la timeline
  } catch { return []; }
}

export function buildDynamicDeadlines(systems: AISystem[]): AIActDeadline[] {
  const dynamic: AIActDeadline[] = [];

  for (const system of systems) {
    const appliesTo = tierToAppliesTo(system.tier);

    // 1. Post-Market: primo report 12 mesi dopo la messa in servizio (Art. 72)
    const riskRaw = typeof window !== "undefined" ? localStorage.getItem("aicomply_risk_register_v1") : null;
    const riskRec = riskRaw ? (() => { try { return JSON.parse(riskRaw); } catch { return null; } })() : null;
    const inServiceDate: string | undefined = riskRec?.signoff?.nextReviewDate;

    if (inServiceDate && isEligibleForPostMarket(system)) {
      dynamic.push({
        id: `post_market_${system.id}`,
        date: addMonths(inServiceDate, 12),
        label: `Post-Market: primo report — ${system.name}`,
        description: `Primo report di monitoraggio post-market per il sistema "${system.name}". Data calcolata come in_service_date + 12 mesi. Verificare periodicita esatta contro Art. 72 [verify against current AI Act text].`,
        article: "Art. 72 [verify against current AI Act text]",
        applies_to: appliesTo,
        tool_href: "/dashboard/post-market",
        severity: "important",
        isDynamic: true,
        sourceSystemId: system.id,
        sourceSystemName: system.name,
      });
    }

    // 2. EUDB Registration: 30gg prima della data di immissione sul mercato pianificata
    const eudbRaw = typeof window !== "undefined" ? localStorage.getItem(`aicomply_eudb_${system.id}`) : null;
    const eudbRec = eudbRaw ? (() => { try { return JSON.parse(eudbRaw); } catch { return null; } })() : null;
    const plannedMarketDate: string | undefined = eudbRec?.plannedMarketDate ?? system.nextReview;

    if (plannedMarketDate && requiresEUDBRegistration(system) && !(eudbRec?.registered)) {
      dynamic.push({
        id: `eudb_${system.id}`,
        date: addDays(plannedMarketDate, -30),
        label: `EUDB: registrazione — ${system.name}`,
        description: `Scadenza preparazione registrazione EUDB per il sistema "${system.name}" (30gg prima della data di immissione pianificata). Verificare obbligo e termine esatto contro Art. 49 [verify against current AI Act text].`,
        article: "Art. 49 [verify against current AI Act text]",
        applies_to: appliesTo,
        tool_href: "/dashboard/tools/eudb",
        severity: "important",
        isDynamic: true,
        sourceSystemId: system.id,
        sourceSystemName: system.name,
      });
    }

    // 3. Incident Notification: countdown 15gg da eventi gravi (Art. 73)
    const incidents = getOpenSevereIncidents(system.id);
    for (const incident of incidents) {
      dynamic.push({
        id: `incident_${system.id}_${incident.id}`,
        date: addDays(incident.date, 15),
        label: `Notifica incidente grave — ${system.name}`,
        description: `Scadenza stimata notifica incidente grave per il sistema "${system.name}" (15gg dalla data evento — verificare termine esatto contro Art. 73 [verify against current AI Act text]).`,
        article: "Art. 73 [verify against current AI Act text]",
        applies_to: appliesTo,
        tool_href: "/dashboard/tools/incident",
        severity: "critical",
        isDynamic: true,
        sourceSystemId: system.id,
        sourceSystemName: system.name,
      });
    }

    // 4. Provider Transition: valutazione obblighi da provider (Art. 28)
    const deployerRaw = typeof window !== "undefined" ? localStorage.getItem(`aicomply_deployer_record_v1`) : null;
    const deployerRec = deployerRaw ? (() => { try { return JSON.parse(deployerRaw); } catch { return null; } })() : null;
    const hasSubstantialMod = system.dualRoleFlag || deployerRec?.substantialModificationFlag;

    if (hasSubstantialMod) {
      dynamic.push({
        id: `provider_transition_${system.id}`,
        date: addDays(new Date().toISOString().slice(0, 10), 30),
        label: `Provider Transition — ${system.name}`,
        description: `Modifica sostanziale rilevata per il sistema "${system.name}": valutare se scattano obblighi da provider (Art. 28). Termine operativo stimato 30gg — verificare con team legale [verify against current AI Act text].`,
        article: "Art. 28 [verify against current AI Act text]",
        applies_to: appliesTo,
        tool_href: "/dashboard/tools/provider-transition",
        severity: "important",
        isDynamic: true,
        sourceSystemId: system.id,
        sourceSystemName: system.name,
      });
    }

    // 5. FRIA/DPIA review cycle da Risk Manager
    if (system.nextReview) {
      dynamic.push({
        id: `fria_review_${system.id}`,
        date: system.nextReview,
        label: `Revisione FRIA/DPIA — ${system.name}`,
        description: `Scadenza revisione periodica della valutazione d'impatto per il sistema "${system.name}" (da Risk Manager nextReview).`,
        article: "Art. 9, Art. 27 [verify against current AI Act text]",
        applies_to: appliesTo,
        tool_href: "/dashboard/tools/fria",
        severity: "informational",
        isDynamic: true,
        sourceSystemId: system.id,
        sourceSystemName: system.name,
      });
    }
  }

  return dynamic;
}

// Filtra scadenze per tier del sistema corrente
export function filterDeadlinesByTier(
  deadlines: AIActDeadline[],
  userTiers: AIActTier[]
): AIActDeadline[] {
  return deadlines.filter((d) =>
    d.applies_to.includes("all") || d.applies_to.some((t) => userTiers.includes(t))
  );
}
