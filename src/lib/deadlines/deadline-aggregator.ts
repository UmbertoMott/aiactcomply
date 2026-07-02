// Aggregatore cross-modulo — genera scadenze dinamiche da altri tool
// Principio: zero inserimento manuale. Date derivate da campi gia presenti negli altri moduli.
import type { AIActDeadline, AIActTier } from "./deadline-types";
import type { AISystem } from "@/lib/inventory/ai-system";
import { getOpenSevereIncidentEntries, type IncidentEntry } from "@/lib/incidents/incident-actions";

function isEligibleForPostMarket(system: AISystem): boolean {
  return system.tier === "high_risk" || system.tier === "gpai_systemic";
}

// Exported — consumed by EUDB wizard (PROMPT AS) and deadline page badge
export function requiresEUDBRegistration(system: AISystem): boolean {
  // Rispecchia la logica di Step 1 (Q1/Q2) — validare contro Art. 49(1)/(3) [verify against current AI Act text]
  const isHighRiskProvider =
    (system.role === "provider" || system.role === "authorized_rep") &&
    (system.tier === "high_risk" || system.tier === "gpai_systemic");
  const isDeployerPublicAuthority =
    system.role === "deployer" && system.tier === "high_risk";
  // Check national security exemption from EUDB draft
  try {
    const draftRaw = typeof window !== "undefined" ? localStorage.getItem("aicomply_eudb_draft_v2") : null;
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      if (draft?.eligibility?.q3_public_deployer === "yes") return false; // esenzione sicurezza nazionale
    }
  } catch { /* silent */ }
  return isHighRiskProvider || isDeployerPublicAuthority;
}

// Exported — consumed by buildDynamicDeadlines + EUDB wizard
export function buildEUDBDeadline(system: AISystem): AIActDeadline | null {
  if (!requiresEUDBRegistration(system)) return null;
  // Already registered?
  try {
    const draftRaw = typeof window !== "undefined" ? localStorage.getItem("aicomply_eudb_draft_v2") : null;
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      if (draft?.eudb_registration_number) return null;
    }
  } catch { /* silent */ }
  const referenceDate = system.nextReview;
  if (!referenceDate) return null;
  const appliesTo = tierToAppliesTo(system.tier);
  return {
    id: `eudb_registration_${system.id}`,
    date: referenceDate,
    label: `Registrazione EUDB — ${system.name}`,
    description: `Registrazione del sistema "${system.name}" nella banca dati UE prima della messa sul mercato o in servizio — Art. 49(1) [verify against current AI Act text].`,
    article: "Art. 49(1) [verify against current AI Act text]",
    applies_to: appliesTo.length ? appliesTo : (["high_risk_annex3", "high_risk_annex1"] as AIActTier[]),
    tool_href: `/dashboard/compliance-ops/eudb`,
    severity: "important",
    isDynamic: true,
    category: "registration",
    sourceSystemId: system.id,
    sourceSystemName: system.name,
  };
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

// buildIncidentNotificationDeadline: exported for use in per-incident deadline cards
export function buildIncidentNotificationDeadline(system: AISystem, incident: IncidentEntry): AIActDeadline {
  const appliesTo = tierToAppliesTo(system.tier);
  const is2d = incident.notificationDeadlineType === "immediate_2d";
  return {
    id: `incident_notification_${incident.id}`,
    date: incident.notificationDeadlineDate ?? addDays(incident.date, is2d ? 2 : 15),
    label: `Notifica incidente grave — ${system.name}`,
    description: incident.description ?? `Scadenza notifica incidente ${incident.id} per il sistema "${system.name}". Verificare termine esatto.`,
    article: is2d
      ? "Art. 73(3) [verify against current AI Act text]"
      : "Art. 73(2) [verify against current AI Act text]",
    applies_to: appliesTo.length ? appliesTo : ["high_risk_annex3", "high_risk_annex1", "gpai_systemic"] as AIActTier[],
    tool_href: `/dashboard/post-market?tab=incidents&incident=${incident.id}`,
    severity: "critical",
    isDynamic: true,
    category: "incident",
    sourceSystemId: system.id,
    sourceSystemName: system.name,
  };
}

// buildProviderTransitionDeadline: exported — Art. 28 [verify against current AI Act text]
export function buildProviderTransitionDeadline(
  system: AISystem,
  appliesTo: AIActTier[],
): AIActDeadline | null {
  // Reads the real modification registry to find the earliest substantial modification date
  let earliestSubstDate: string | undefined;
  let verdict: string | undefined;
  try {
    if (typeof window !== "undefined") {
      const modsRaw = localStorage.getItem("provider_transition_modifications");
      if (modsRaw) {
        const mods = JSON.parse(modsRaw) as { date: string; is_substantial: boolean | null }[];
        const substDates = mods
          .filter(m => m.is_substantial === true)
          .map(m => m.date)
          .sort();
        earliestSubstDate = substDates[0];
      }
      const answersRaw = localStorage.getItem("provider_transition_answers");
      if (answersRaw) {
        const answers = JSON.parse(answersRaw) as Record<string, string | null>;
        const triggered = ["own_name","purpose_change","retraining","performance_impact","safety_degradation"]
          .some(k => answers[k] === "yes");
        const maintenance = answers["ordinary_maintenance"] === "yes";
        if (triggered && !maintenance) verdict = "provider";
        else if (triggered || Object.values(answers).some(v => v === "unsure")) verdict = "risk";
        else verdict = "deployer";
      }
    }
    // Also check legacy dualRoleFlag + deployer record
    if (!verdict || verdict === "deployer") {
      const deployerRaw = typeof window !== "undefined" ? localStorage.getItem("aicomply_deployer_record_v1") : null;
      const deployerRec = deployerRaw ? JSON.parse(deployerRaw) as Record<string, unknown> : null;
      const hasSubstantialMod = system.dualRoleFlag || Boolean(deployerRec?.substantialModificationFlag);
      if (hasSubstantialMod && !verdict) verdict = "risk";
    }
  } catch { /* silent */ }

  if (!verdict || verdict === "deployer") return null;

  // Use earliest substantial modification date + 30 days as deadline, else 30 days from today
  const baseDate = earliestSubstDate ?? new Date().toISOString().slice(0, 10);
  const deadline = addDays(baseDate, 30);

  return {
    id: `provider_transition_${system.id}`,
    date: deadline,
    label: `Provider Transition — ${system.name}`,
    description: verdict === "provider"
      ? `Modifica sostanziale confermata per "${system.name}": obblighi da provider in vigore (Art. 28). Prima modifica sostanziale: ${earliestSubstDate ?? "non registrata"}. Completare le obbligazioni nel tool. [verify against current AI Act text]`
      : `Modifica sostanziale potenziale per "${system.name}": richiesta valutazione legale per determinare obblighi da provider (Art. 28). [verify against current AI Act text]`,
    article: "Art. 28 [verify against current AI Act text]",
    applies_to: appliesTo.length ? appliesTo : (["high_risk_annex3"] as AIActTier[]),
    tool_href: "/dashboard/compliance-ops/provider-transition",
    severity: verdict === "provider" ? "critical" : "important",
    isDynamic: true,
    category: "modification",
    sourceSystemId: system.id,
    sourceSystemName: system.name,
  };
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
        category: "general",
        sourceSystemId: system.id,
        sourceSystemName: system.name,
      });
    }

    // 2. EUDB Registration: 30gg prima della data di immissione sul mercato pianificata
    const eudbRaw = typeof window !== "undefined" ? localStorage.getItem(`aicomply_eudb_${system.id}`) : null;
    const eudbRec = eudbRaw ? (() => { try { return JSON.parse(eudbRaw); } catch { return null; } })() : null;
    const plannedMarketDate: string | undefined = eudbRec?.plannedMarketDate ?? system.nextReview;

    // 2. EUDB Registration — usa buildEUDBDeadline per coerenza con PROMPT AS
    const eudbDeadline = buildEUDBDeadline(system);
    if (eudbDeadline) dynamic.push(eudbDeadline);
    // suppress unused variable warning
    void plannedMarketDate; void eudbRec;

    // 3. Incident Notification: scadenze calcolate dagli incidenti reali (Art. 73)
    const incidents = getOpenSevereIncidentEntries(system.id);
    for (const incident of incidents) {
      dynamic.push(buildIncidentNotificationDeadline(system, incident));
    }

    // 4. Provider Transition: valutazione obblighi da provider (Art. 28)
    const ptDeadline = buildProviderTransitionDeadline(system, appliesTo);
    if (ptDeadline) dynamic.push(ptDeadline);

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
        category: "general",
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
