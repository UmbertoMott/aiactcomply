// Art. 73 severity classification
// Termini Art. 73: (2) 15 giorni; (3) 2 giorni per infrazione diffusa o incidente grave
// che riguarda infrastrutture critiche (Art. 3(49)(b)); (4) 10 giorni in caso di decesso.

export type SeverityClassification = "serious_incident" | "malfunction" | "near_miss";
export type NotificationDeadlineType = "standard_15d" | "death_10d" | "immediate_2d" | "none";

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

// Mapping dead-lines per tipo
const DEADLINE_DAYS: Record<NotificationDeadlineType, number> = {
  immediate_2d: 2,    // Art. 73(3) — infrazione diffusa o infrastrutture critiche
  death_10d: 10,      // Art. 73(4) — decesso
  standard_15d: 15,   // Art. 73(2) — altri incidenti gravi
  none: 0,
};

export function classifyIncidentSeverity(input: ClassificationInput): ClassificationResult {
  function addDays(isoDate: string, days: number): string {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  if (input.involvesCriticalInfrastructureDamage) {
    return {
      severityClassification: "serious_incident",
      notificationDeadlineType: "immediate_2d",
      computeDeadlineDate: (eventDate) => addDays(eventDate, DEADLINE_DAYS.immediate_2d),
    };
  }

  if (input.involvesDeath) {
    return {
      severityClassification: "serious_incident",
      notificationDeadlineType: "death_10d",
      computeDeadlineDate: (eventDate) => addDays(eventDate, DEADLINE_DAYS.death_10d),
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
  immediate_2d: "Immediata (max 2 gg) — Art. 73(3)",
  death_10d: "Entro 10 gg (decesso) — Art. 73(4)",
  standard_15d: "Entro 15 gg — Art. 73(2)",
  none: "Nessuna notifica obbligatoria",
};

export const SEVERITY_CLASS_LABEL: Record<SeverityClassification, string> = {
  serious_incident: "Incidente grave — Art. 3(49)",
  malfunction: "Malfunzionamento",
  near_miss: "Quasi-incidente",
};

/** Giorni e articolo per un tipo di termine. */
export function deadlineInfo(t: NotificationDeadlineType | undefined): { days: number; ref: string } {
  if (t === "immediate_2d") return { days: 2, ref: "Art. 73(3)" };
  if (t === "death_10d") return { days: 10, ref: "Art. 73(4)" };
  return { days: 15, ref: "Art. 73(2)" };
}
