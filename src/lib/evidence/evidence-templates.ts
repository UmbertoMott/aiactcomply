import type { EvidenceType } from "@/lib/evidence/evidence-layer";

export type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
};

export type EvidenceTemplate = {
  key: EvidenceType;
  label: string;
  description: string;
  article: string;
  color: string;
  fields: FieldDef[];
};

export const EVIDENCE_TEMPLATES: EvidenceTemplate[] = [
  {
    key: "adr",
    label: "ADR — Architectural Decision",
    description: "Documenta le decisioni architetturali del sistema AI e le alternative valutate.",
    article: "Art. 9 / Art. 17",
    color: "#6366f1",
    fields: [
      { key: "titolo", label: "Titolo", placeholder: "Es. Scelta del modello di classificazione", type: "text", required: true },
      { key: "decisione", label: "Decisione", placeholder: "Descrivi la decisione presa", type: "textarea", required: true },
      { key: "alternative_valutate", label: "Alternative valutate", placeholder: "Elenco delle opzioni considerate e scartate", type: "textarea", required: false },
      { key: "motivazione", label: "Motivazione", placeholder: "Perché questa è la scelta migliore", type: "textarea", required: true },
      { key: "conseguenze", label: "Conseguenze", placeholder: "Impatti e rischi della decisione", type: "textarea", required: false },
      { key: "responsabile", label: "Responsabile", placeholder: "Nome e ruolo del decisore", type: "text", required: true },
    ],
  },
  {
    key: "log",
    label: "Log di Sistema",
    description: "Registro automatico o manuale degli eventi rilevanti del sistema AI.",
    article: "Art. 12",
    color: "#0ea5e9",
    fields: [
      { key: "evento", label: "Evento", placeholder: "Es. Inferenza completata, errore modello", type: "text", required: true },
      { key: "componente", label: "Componente", placeholder: "Es. classificatore, preprocessing", type: "text", required: true },
      { key: "severità", label: "Severità", placeholder: "", type: "select", options: ["INFO", "WARNING", "ERROR", "CRITICAL"], required: true },
      { key: "messaggio", label: "Messaggio", placeholder: "Descrizione dettagliata dell'evento", type: "textarea", required: true },
      { key: "session_id", label: "Session ID", placeholder: "ID sessione o run (opzionale)", type: "text", required: false },
    ],
  },
  {
    key: "decision",
    label: "Decisione ad Alto Impatto",
    description: "Traccia le decisioni prese dal sistema AI che impattano persone fisiche.",
    article: "Art. 13 / Art. 14",
    color: "#f59e0b",
    fields: [
      { key: "titolo", label: "Titolo", placeholder: "Es. Rigetto domanda di credito ID-4421", type: "text", required: true },
      { key: "decisione_presa", label: "Decisione presa", placeholder: "Esito della decisione", type: "textarea", required: true },
      { key: "motivazione_algoritmica", label: "Motivazione algoritmica", placeholder: "Quali fattori hanno influenzato l'output", type: "textarea", required: true },
      { key: "soggetto_impattato", label: "Soggetto impattato", placeholder: "ID anonimizzato del soggetto (GDPR-safe)", type: "text", required: false },
      { key: "revisione_umana", label: "Revisione umana", placeholder: "", type: "select", options: ["Sì, approvata", "Sì, rigettata", "No — decisione automatica", "In attesa"], required: true },
      { key: "stakeholder", label: "Stakeholder", placeholder: "Team o funzione aziendale coinvolta", type: "text", required: false },
    ],
  },
  {
    key: "audit",
    label: "Audit di Conformità",
    description: "Verbale di audit interno o esterno sulla conformità del sistema AI.",
    article: "Art. 9 / Art. 43",
    color: "#10b981",
    fields: [
      { key: "ambito", label: "Ambito", placeholder: "Cosa è stato verificato (perimetro dell'audit)", type: "textarea", required: true },
      { key: "auditor", label: "Auditor", placeholder: "Nome auditor o organismo notificato", type: "text", required: true },
      { key: "metodologia", label: "Metodologia", placeholder: "Es. ISO/IEC 42001, NIST AI RMF", type: "text", required: false },
      { key: "risultato", label: "Risultato", placeholder: "", type: "select", options: ["Conforme", "Non conforme", "Conforme con osservazioni", "In corso"], required: true },
      { key: "osservazioni", label: "Osservazioni", placeholder: "Finding e raccomandazioni emerse", type: "textarea", required: false },
      { key: "data_prossimo_audit", label: "Data prossimo audit", placeholder: "GG/MM/AAAA", type: "text", required: false },
    ],
  },
  {
    key: "test",
    label: "Test del Modello",
    description: "Risultati di test di performance, bias, robustezza o sicurezza del modello.",
    article: "Art. 9 / Art. 15",
    color: "#8b5cf6",
    fields: [
      { key: "nome_test", label: "Nome test", placeholder: "Es. Bias check su dataset demografici", type: "text", required: true },
      { key: "versione_modello", label: "Versione modello", placeholder: "Es. v2.3.1", type: "text", required: true },
      { key: "metrica", label: "Metrica", placeholder: "Es. F1-score, DI ratio, accuracy", type: "text", required: true },
      { key: "valore_ottenuto", label: "Valore ottenuto", placeholder: "Es. 0.94", type: "text", required: true },
      { key: "soglia_superamento", label: "Soglia superamento", placeholder: "Es. ≥ 0.90", type: "text", required: true },
      { key: "esito", label: "Esito", placeholder: "", type: "select", options: ["PASS", "FAIL", "PASS con riserva"], required: true },
      { key: "note", label: "Note", placeholder: "Osservazioni aggiuntive", type: "textarea", required: false },
    ],
  },
  {
    key: "incident",
    label: "Incidente / Malfunzionamento",
    description: "Registrazione di incidenti gravi o malfunzionamenti da notificare all'autorità.",
    article: "Art. 72 / Art. 73",
    color: "#ef4444",
    fields: [
      { key: "descrizione", label: "Descrizione", placeholder: "Descrivi cosa è accaduto", type: "textarea", required: true },
      { key: "data_incidente", label: "Data incidente", placeholder: "GG/MM/AAAA HH:MM", type: "text", required: true },
      { key: "gravità", label: "Gravità", placeholder: "", type: "select", options: ["Lieve", "Moderato", "Grave", "Critico — notifica obbligatoria"], required: true },
      { key: "componenti_coinvolti", label: "Componenti coinvolti", placeholder: "Moduli o sottosistemi interessati", type: "text", required: false },
      { key: "azioni_intraprese", label: "Azioni intraprese", placeholder: "Come è stato gestito e contenuto", type: "textarea", required: true },
      { key: "notificato_autorità", label: "Notificato autorità", placeholder: "", type: "select", options: ["No", "Sì — AGID", "Sì — Garante Privacy", "In valutazione"], required: true },
      { key: "stato", label: "Stato", placeholder: "", type: "select", options: ["Aperto", "In gestione", "Chiuso", "Escalato"], required: true },
    ],
  },
  {
    key: "monitoring",
    label: "Report di Monitoraggio",
    description: "Snapshot periodico delle metriche di performance e drift del sistema in produzione.",
    article: "Art. 72",
    color: "#0d9488",
    fields: [
      { key: "metrica", label: "Metrica", placeholder: "Es. accuracy, drift_score, latenza_p95", type: "text", required: true },
      { key: "valore_corrente", label: "Valore corrente", placeholder: "Es. 0.91", type: "text", required: true },
      { key: "soglia_allarme", label: "Soglia allarme", placeholder: "Es. < 0.88", type: "text", required: true },
      { key: "stato", label: "Stato", placeholder: "", type: "select", options: ["Nella norma", "Attenzione", "Allarme — intervento richiesto"], required: true },
      { key: "periodo_misurazione", label: "Periodo misurazione", placeholder: "Es. 2024-Q4, Settimana 22", type: "text", required: true },
      { key: "azione_raccomandata", label: "Azione raccomandata", placeholder: "Se allarme: cosa fare", type: "textarea", required: false },
    ],
  },
];
