// LogVault operational event types — PROMPT BE

export type LogEventCategory =
  | "human_override"
  | "drift_alert"
  | "anomaly"
  | "system_restart"
  | "config_change"
  | "incident_link"
  | "maintenance"
  | "other";

export type LogEventSeverity = "info" | "warning" | "critical";

export interface LogEvent {
  id: string;
  timestamp: string;
  category: LogEventCategory;
  severity: LogEventSeverity;
  description: string;
  operator?: string;
  integrityHash: string;
  immutable: true;
  linkedIncidentId?: string;
  incidentResolved?: boolean;
}
