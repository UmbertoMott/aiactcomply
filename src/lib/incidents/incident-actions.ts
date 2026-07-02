// Incident cross-module bridge — Art. 73 AI Act
// Reads from INCIDENTS_KEY (post_market_incidents) set by post-market/page.tsx

export const INCIDENTS_STORAGE_KEY = "post_market_incidents";

// Minimal typed structure — must stay in sync with Incident in post-market/page.tsx
export interface IncidentEntry {
  id: string;
  systemId?: string;
  system?: string;
  date: string;
  severity: string;
  severityClassification?: "serious_incident" | "malfunction" | "near_miss";
  notificationDeadlineType?: "standard_15d" | "immediate_2d" | "none";
  notificationDeadlineDate?: string;
  notifiedAt?: string;
  status: string;
  source?: "manual" | "logvault_auto";
  aiConfirmed?: boolean;
  description?: string;
}

function loadIncidentEntries(): IncidentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as IncidentEntry[]) : [];
  } catch { return []; }
}

// Returns open serious incidents with a future notification deadline — consumed by deadline-aggregator
export function getOpenSevereIncidentEntries(systemId?: string): IncidentEntry[] {
  const all = loadIncidentEntries();
  const now = new Date();
  return all.filter((inc) => {
    if (systemId && inc.systemId && inc.systemId !== systemId && inc.system !== systemId) return false;
    if (inc.severityClassification !== "serious_incident") return false;
    if (inc.status === "closed" || inc.status === "resolved") return false;
    if (!inc.notificationDeadlineDate) return false;
    return new Date(inc.notificationDeadlineDate) > now;
  });
}

// Used by LogVault auto-detection to generate draft incidents
export interface LogVaultEntry {
  id?: string;
  systemId?: string;
  metric?: string;
  value?: number | string;
  threshold?: number | string;
  severity?: string;
  importedAt?: string;
  timestamp?: string;
}

export function detectDraftIncidentsFromLogVault(systemId?: string): IncidentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("aicomply_logvault_record_v1");
    if (!raw) return [];
    const rec = JSON.parse(raw) as { importedLogs?: LogVaultEntry[] };
    const logs = rec.importedLogs ?? [];

    return logs
      .filter((l) => {
        if (systemId && l.systemId && l.systemId !== systemId) return false;
        return l.severity === "high" || l.severity === "critical";
      })
      .slice(0, 5)
      .map((l) => ({
        id: `LV-${l.id ?? Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        systemId: l.systemId ?? systemId,
        system: l.systemId ?? systemId ?? "Sistema AI (da LogVault)",
        date: (l.timestamp ?? l.importedAt ?? new Date().toISOString()).slice(0, 10),
        severity: l.severity ?? "high",
        severityClassification: "malfunction" as const,
        notificationDeadlineType: "none" as const,
        status: "draft",
        source: "logvault_auto" as const,
        aiConfirmed: false,
        description: `✦ AI — Bozza generata da LogVault: metrica "${l.metric ?? "anomalia"}" ha superato la soglia configurata (valore: ${l.value ?? "n/a"}).`,
      }));
  } catch { return []; }
}

// Exposed to Deployer Dashboard (PROMPT_AJ) — monitoring_risk_reporting obligation
export function getLinkedIncidentsForDeployerObligation(systemId: string): {
  incidentId: string;
  status: string;
  notifiedAt?: string;
}[] {
  const all = loadIncidentEntries();
  return all
    .filter((inc) => inc.systemId === systemId || inc.system === systemId)
    .map((inc) => ({
      incidentId: inc.id,
      status: inc.status,
      notifiedAt: inc.notifiedAt,
    }));
}
