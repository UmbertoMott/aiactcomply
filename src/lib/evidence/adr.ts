export interface ADR {
  id: string;
  title: string;
  status: "proposed" | "accepted" | "superseded" | "deprecated";
  context: string;
  decision: string;
  consequences: string;
  module: string;
  author: string;
  date: string;
  hash: string;
  tags: string[];
}

const ADR_KEY = "aicomply_adrs";

export function getADRs(): ADR[] {
  const raw = localStorage.getItem(ADR_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveADR(adr: ADR) {
  const store = getADRs();
  store.push(adr);
  localStorage.setItem(ADR_KEY, JSON.stringify(store));
}

export const ADR_TEMPLATES: Record<string, { context: string; questions: string[] }> = {
  "data-source": {
    context: "Archiviazione e provenienza dei dati di addestramento",
    questions: [
      "Quale origine dei dati?",
      "Consenso per dati personali?",
      "Processo di pulizia applicato?",
    ],
  },
  "model-architecture": {
    context: "Scelta architetturale del modello e dei suoi componenti",
    questions: [
      "Architettura scelta e motivazione?",
      "Metriche di accuratezza target?",
      "Strategia di validazione?",
    ],
  },
  "human-oversight": {
    context: "Meccanismi di sorveglianza umana",
    questions: [
      "Punto di intervento umano?",
      "Tempo di risposta massimo?",
      "Procedura di override?",
    ],
  },
  "risk-mitigation": {
    context: "Misure di mitigazione dei rischi identificati",
    questions: [
      "Rischio identificato?",
      "Probabilità e severità?",
      "Contromisure implementate?",
    ],
  },
  "cybersecurity": {
    context: "Misure di cybersicurezza del sistema",
    questions: [
      "Minacce cibernetiche identificate?",
      "Meccanismi di difesa implementati?",
      "Piani di backup/fail-safe?",
    ],
  },
};
