// ─── Art. 73 EU AI Act — 4 finestre di notifica per incidenti gravi ────────────

export type NotificationTier =
  | "life_threat_24h"        // Art. 73(3a) — minaccia alla vita o sicurezza pubblica immediata
  | "fundamental_rights_72h" // Art. 73(3b) — violazione diritti fondamentali o malfunzionamento critico
  | "death_followup_10d"     // Art. 73(3c) — decesso causato da malfunzionamento (report entro 10 gg)
  | "serious_standard_15d";  // Art. 73(3d) — incidente grave non acuto

export interface NotificationWindow {
  tier: NotificationTier;
  hoursFromDetection: number;
  label: string;
  artRef: string;
  description: string;
}

export const NOTIFICATION_WINDOWS: Record<NotificationTier, NotificationWindow> = {
  life_threat_24h: {
    tier: "life_threat_24h",
    hoursFromDetection: 24,
    label: "24 ore",
    artRef: "Art. 73(3)(a)",
    description: "Minaccia vita / sicurezza pubblica",
  },
  fundamental_rights_72h: {
    tier: "fundamental_rights_72h",
    hoursFromDetection: 72,
    label: "72 ore",
    artRef: "Art. 73(3)(b)",
    description: "Diritti fondamentali / malfunzionamento critico",
  },
  death_followup_10d: {
    tier: "death_followup_10d",
    hoursFromDetection: 240, // 10 giorni × 24h
    label: "10 giorni",
    artRef: "Art. 73(3)(c)",
    description: "Decesso da malfunzionamento",
  },
  serious_standard_15d: {
    tier: "serious_standard_15d",
    hoursFromDetection: 360, // 15 giorni × 24h
    label: "15 giorni",
    artRef: "Art. 73(3)(d)",
    description: "Incidente grave standard",
  },
};

/** Tipo legacy pre-PROMPT AZ, usato solo per la migrazione di record esistenti */
type LegacyNotificationTier = "standard_15d" | "immediate_2d";

/**
 * Converte un valore di tier eventualmente salvato con lo schema a 2 tier
 * (PROMPT_AR) nel nuovo schema a 4 tier. Pass-through se già valido o assente.
 */
export function migrateNotificationTier(
  raw: string | undefined | null
): NotificationTier {
  const legacyMap: Record<LegacyNotificationTier, NotificationTier> = {
    immediate_2d: "fundamental_rights_72h",
    standard_15d: "serious_standard_15d",
  };
  if (raw && raw in legacyMap) {
    return legacyMap[raw as LegacyNotificationTier];
  }
  if (raw && raw in NOTIFICATION_WINDOWS) {
    return raw as NotificationTier;
  }
  return "serious_standard_15d";
}

export interface DeadlineInput {
  detectionDate: string;
  notificationTier: NotificationTier;
  notified?: boolean;
}

/** Restituisce la data ISO di scadenza per la notifica all'autorità. */
export function computeNotificationDeadline(input: DeadlineInput): string {
  const window = NOTIFICATION_WINDOWS[input.notificationTier];
  const detectedAt = new Date(input.detectionDate);
  const deadlineMs = detectedAt.getTime() + window.hoursFromDetection * 60 * 60 * 1000;
  return new Date(deadlineMs).toISOString();
}

/** Ore residue prima della scadenza. Negativo = scadenza superata. */
export function hoursUntilDeadline(input: DeadlineInput): number {
  if (input.notified) return Infinity;
  const deadline = new Date(computeNotificationDeadline(input)).getTime();
  return (deadline - Date.now()) / (1000 * 60 * 60);
}

/** Giorni residui (arrotondati per eccesso, minimo 0) — usato nelle card riassuntive. */
export function daysUntilDeadline(input: DeadlineInput): number {
  if (input.notified) return 0;
  return Math.max(0, Math.ceil(hoursUntilDeadline(input) / 24));
}

export interface UrgencyBadge {
  label: string;
  bg: string;
  color: string;
  border: string;
}

/** Badge urgenza coerente con la palette minimal del Post-Market (rosso solo per critico). */
export function getUrgencyBadge(input: DeadlineInput): UrgencyBadge {
  if (input.notified) {
    return { label: "Notificato", bg: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.45)", border: "rgba(0,0,0,0.08)" };
  }
  const hours = hoursUntilDeadline(input);
  if (hours < 0) {
    return { label: "SCADUTO", bg: "rgba(220,38,38,0.1)", color: "#DC2626", border: "rgba(220,38,38,0.3)" };
  }
  const window = NOTIFICATION_WINDOWS[input.notificationTier];
  const alertThreshold = window.hoursFromDetection * 0.2; // ultimo 20% della finestra
  if (hours <= alertThreshold) {
    return {
      label: hours < 24 ? `${Math.ceil(hours)}h` : `${Math.ceil(hours / 24)}g`,
      bg: "rgba(220,38,38,0.06)",
      color: "#DC2626",
      border: "rgba(220,38,38,0.2)",
    };
  }
  return {
    label: window.label,
    bg: "rgba(0,0,0,0.03)",
    color: "rgba(0,0,0,0.5)",
    border: "rgba(0,0,0,0.08)",
  };
}
