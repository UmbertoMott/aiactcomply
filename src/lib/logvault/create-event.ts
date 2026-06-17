// Factory for immutable LogEvent with SHA-256 hash — PROMPT BE

import type { LogEvent, LogEventCategory, LogEventSeverity } from "@/types/logvault";
import { computeEventHash } from "./integrity";

export async function createLogEvent(params: {
  category: LogEventCategory;
  severity: LogEventSeverity;
  description: string;
  operator?: string;
  linkedIncidentId?: string;
}): Promise<LogEvent> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const integrityHash = await computeEventHash({
    id,
    timestamp,
    category: params.category,
    severity: params.severity,
    description: params.description,
    operator: params.operator,
  });
  return {
    id,
    timestamp,
    category: params.category,
    severity: params.severity,
    description: params.description,
    operator: params.operator,
    integrityHash,
    immutable: true,
    linkedIncidentId: params.linkedIncidentId,
  };
}
