// Art. 73 severity classification
// ✦ AI — verifica e conferma: termini e definizioni ricostruiti dalla memoria del modello.
// Validare contro Art. 3(49) + Art. 73(1)-(5) testo consolidato Reg. (UE) 2024/1689.

export type SeverityClassification = "serious_incident" | "malfunction" | "near_miss";
export type NotificationDeadlineType = "standard_15d" | "immediate_2d" | "none";

export interface ClassificationInput {
  involvesDeath: boolean;
  involvesSeriousHealthDamage: boolean;
  involvesCriticalInfrastructureDamage: boolean;
  involvesFundamentalRightsViolation: boolean;
  involvesPropertyOrEnvironmentDamage: boolean;
}

export interface ClassificationResult {
  severityClassification: SeverityClassification;
  notificationDeadlineType: NotificationDeadlineType;
  // Calcola la data limite di notifica a partire dalla data evento
  computeDeadlineDate: (eventDate: string) => string;
}

// Mapping dead-lines per tipo [verify against current AI Act text]
const DEADLINE_DAYS: Record<NotificationDeadlineType, number> = {
  immediate_2d: 2,    // Art. 73(3) — morte / danno grave irreversibile infrastrutture critiche
  standard_15d: 15,   // Art. 73(2) — altri incidenti gravi
  none: 0,
};

export function classifyIncidentSeverity(input: ClassificationInput): ClassificationResult {
  function addDays(isoDate: string, days: number): string {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  if (input.involvesDeath || input.involvesCriticalInfrastructureDamage) {
    return {
      severityClassification: "serious_incident",
      notificationDeadlineType: "immediate_2d",
      computeDeadlineDate: (eventDate) => addDays(eventDate, DEADLINE_DAYS.immediate_2d),
    };
  }

  if (
    input.involvesSeriousHealthDamage ||
    input.involvesFundamentalRightsViolation ||
    input.involvesPropertyOrEnvironmentDamage
  ) {
    return {
      severityClassification: "serious_incident",
      notificationDeadlineType: "standard_15d",
      computeDeadlineDate: (eventDate) => addDays(eventDate, DEADLINE_DAYS.standard_15d),
    };
  }

  return {
    severityClassification: "malfunction",
    notificationDeadlineType: "none",
    computeDeadlineDate: () => "",
  };
}

// Display helpers
export const DEADLINE_TYPE_LABEL: Record<NotificationDeadlineType, string> = {
  immediate_2d: "Immediata (max 2 gg) — Art. 73(3) [verify against current AI Act text]",
  standard_15d: "Entro 15 gg — Art. 73(2) [verify against current AI Act text]",
  none: "Nessuna notifica obbligatoria",
};

export const SEVERITY_CLASS_LABEL: Record<SeverityClassification, string> = {
  serious_incident: "Incidente grave — Art. 3(49) [verify against current AI Act text]",
  malfunction: "Malfunzionamento",
  near_miss: "Quasi-incidente",
};
