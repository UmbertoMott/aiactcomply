// DeployerRecord — Art. 26 EU AI Act, 10 paragrafi — PROMPT BD

export interface HumanOverseer {
  id: string;
  name: string;
  role: string;
  qualification: string;
  appointedAt: string;
}

export interface ProviderNotification {
  id: string;
  date: string;
  description: string;
  incidentId?: string;
}

export interface DeployerRecord {
  systemId: string;
  // Art. 26(1) — istruzioni d'uso
  instructionsRead: boolean;
  instructionsReadAt?: string;
  instructionsReadBy?: string;
  // Art. 26(2) — supervisione umana
  overseers: HumanOverseer[];
  // Art. 26(3) — log retention
  logRetentionStatus: "ok" | "expiring_soon" | "expired" | "not_configured";
  logRetentionUntil?: string;
  // Art. 26(4) — notifiche al provider
  providerNotifications: ProviderNotification[];
  // Art. 26(5) — uso conforme
  conformingUseDeclaration: boolean;
  conformingUseText?: string;
  // Art. 26(6) — cooperazione autorità
  authorityContact: { name: string; email: string; phone?: string };
  // Art. 26(7) — notifiche utenti finali
  endUserNotificationsStatus: "compliant" | "pending" | "not_required";
  // Art. 26(8) — FRIA
  friaStatus: "completed" | "in_progress" | "not_required" | "pending";
  // Art. 26(9) — sospensione
  systemSuspended: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  // Art. 26(10) — EUDB
  eudbRegistrationRequired: boolean;
  eudbRegistrationStatus?: "registered" | "pending" | "not_required";
  updatedAt: string;
}

export const defaultDeployerRecord: DeployerRecord = {
  systemId: "",
  instructionsRead: false,
  overseers: [],
  logRetentionStatus: "not_configured",
  providerNotifications: [],
  conformingUseDeclaration: false,
  authorityContact: { name: "", email: "" },
  endUserNotificationsStatus: "pending",
  friaStatus: "pending",
  systemSuspended: false,
  eudbRegistrationRequired: false,
  updatedAt: new Date().toISOString(),
};

export function loadDeployerRecord(systemId: string): DeployerRecord {
  if (typeof window === "undefined") return { ...defaultDeployerRecord, systemId };
  try {
    const raw = localStorage.getItem(`aicomply_deployer_rec_v2_[${systemId}]`);
    if (raw) return { ...defaultDeployerRecord, ...JSON.parse(raw), systemId };
  } catch { /* silent */ }
  return { ...defaultDeployerRecord, systemId };
}

export function saveDeployerRecord(record: DeployerRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `aicomply_deployer_rec_v2_[${record.systemId}]`,
      JSON.stringify({ ...record, updatedAt: new Date().toISOString() })
    );
  } catch { /* silent */ }
}
