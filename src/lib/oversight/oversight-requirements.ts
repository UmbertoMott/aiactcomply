// Art. 14 AI Act — 5 requisiti operativi di supervisione umana + modulo condizionale
// La numerazione 14(4)(a)-(e) riflette la struttura del testo disponibile al team;
// verificare con il testo AI Act consolidato prima del rilascio.
// [verify against current AI Act text] è obbligatorio su ogni citazione normativa.

export interface OversightRequirementDefinition {
  id: string;
  label: string;
  primaryReference: string;
  description: string;
  linkedTool: string | null;
  linkedToolLabel: string | null;
  linkedToolPath: string | null;
  frictionGateRole: "primary" | "secondary" | "tertiary" | null;
}

export const OVERSIGHT_REQUIREMENTS = [
  {
    id: "understanding_capabilities",
    label: "Comprensione delle capacità e dei limiti del sistema",
    primaryReference: "Art. 14(4)(a) [verify against current AI Act text]",
    description:
      "Il supervisore deve comprendere le capacità e i limiti del sistema AI, inclusi i failure mode noti e gli indicatori di anomalia, così da riconoscere output inattesi o situazioni in cui il sistema non è affidabile.",
    linkedTool: "ai-literacy",
    linkedToolLabel: "AI Literacy (Art. 4)",
    linkedToolPath: "/dashboard/tools/literacy",
    frictionGateRole: null,
  },
  {
    id: "automation_bias_awareness",
    label: "Consapevolezza del rischio di affidamento automatico (automation bias)",
    primaryReference: "Art. 14(4)(b) [verify against current AI Act text]",
    description:
      "Il supervisore deve essere consapevole della tendenza a fare eccessivo affidamento sugli output del sistema AI (automation bias), specialmente quando gli output appaiono con alta confidenza.",
    linkedTool: null,
    linkedToolLabel: null,
    linkedToolPath: null,
    frictionGateRole: "primary" as const,
  },
  {
    id: "output_interpretation",
    label: "Corretta interpretazione dell'output del sistema",
    primaryReference: "Art. 14(4)(c) [verify against current AI Act text]",
    description:
      "Il supervisore deve saper interpretare correttamente l'output del sistema, compresi score di confidenza, feature importance e strumenti XAI disponibili.",
    linkedTool: "transparency",
    linkedToolLabel: "Transparency (Art. 13)",
    linkedToolPath: "/dashboard/tools/transparency",
    frictionGateRole: null,
  },
  {
    id: "override_non_use",
    label: "Decisione di non usare, ignorare, annullare o ribaltare l'output",
    primaryReference: "Art. 14(4)(d) [verify against current AI Act text]",
    description:
      "Il supervisore deve avere l'autorità e la procedura per decidere di non usare il sistema in situazioni specifiche, o di ignorare, annullare e ribaltare l'output prodotto.",
    linkedTool: null,
    linkedToolLabel: null,
    linkedToolPath: null,
    frictionGateRole: "secondary" as const,
  },
  {
    id: "intervention_stop",
    label: "Intervento e arresto in sicurezza (stato sicuro)",
    primaryReference: "Art. 14(4)(e) [verify against current AI Act text]",
    description:
      "Il supervisore deve poter intervenire sul sistema in qualsiasi momento e arrestarlo, portandolo in uno stato sicuro: le decisioni in sospeso vengono instradate a revisione manuale e il sistema non emette nuovi output fino alla riattivazione da parte di un supervisore autorizzato.",
    linkedTool: "risk-manager",
    linkedToolLabel: "Risk Manager — step traceability",
    linkedToolPath: "/dashboard/tools/risk-manager",
    frictionGateRole: "tertiary" as const,
  },
] as const satisfies readonly OversightRequirementDefinition[];

export type OversightRequirementId = (typeof OVERSIGHT_REQUIREMENTS)[number]["id"];

export const FOUR_EYES_MODULE = {
  id: "four_eyes_biometric",
  label: "Verifica a due persone per identificazione biometrica",
  primaryReference: "Art. 14(5) [verify against current AI Act text]",
  supportReference: "Annex III punto 1(a) [verify against current AI Act text]",
  description:
    "Per i sistemi di identificazione biometrica di cui all'Annex III punto 1(a) [verify against current AI Act text], nessuna azione o decisione può essere presa dal deployer sulla base dell'identificazione prodotta dal sistema, salvo verifica e conferma separata da parte di almeno due persone fisiche con competenza, formazione e autorità necessarie — Art. 14(5) [verify against current AI Act text].",
} as const;

export const MEASURE_IMPLEMENTATION_TYPE_LABELS: Record<string, string> = {
  provider_built_in:     "Integrata dal provider — Art. 14(3)(a) [verify against current AI Act text]",
  deployer_implemented:  "Da implementare dal deployer — Art. 14(3)(b) [verify against current AI Act text]",
  both:                  "Entrambe le componenti",
  not_specified:         "Non ancora determinato",
};
