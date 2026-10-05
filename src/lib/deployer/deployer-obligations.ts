// Deployer obligations per Art. 26 EU AI Act — PARTE 0 table
// 5 always-applicable + 6 conditional on DeployerApplicabilityFlags

export type EvidenceType =
  | "document_upload"
  | "person_assignment"
  | "linked_report"
  | "linked_log"
  | "retention_policy"
  | "notice_text"
  | "registration_reference"
  | "linked_record"
  | "authorization_reference"
  | "internal_procedure";

export interface DeployerApplicabilityFlags {
  usesHighRiskSystem: boolean;         // Art. 26(1) — sistema ad alto rischio (Allegato III)
  usesInternalProcedures: boolean;     // Art. 26(2) — procedure interne di controllo
  employeeImpact: boolean;             // Art. 26(7) — impatto sui lavoratori
  biometricCategorization: boolean;    // Art. 26(8) — categorizzazione biometrica o riconoscimento emozioni
  eudbRequired: boolean;               // Art. 49 — registrazione EUDB obbligatoria (autorità pubbliche)
  rbiApplicable: boolean;              // Art. 26(10) — registrazione nel database RBI
}

export interface DeployerObligationDefinition {
  id: string;
  label: string;
  description: string;
  primaryReference: string;
  supportReferences: string[];
  alwaysApplicable: boolean;
  applicabilityField?: keyof DeployerApplicabilityFlags;
  evidenceType: EvidenceType;
  linkedTool: string | null;
}

export const DEPLOYER_OBLIGATIONS: readonly DeployerObligationDefinition[] = [
  // Paragrafi dell'Art. 26 Reg. (UE) 2024/1689 e obblighi collegati del deployer.
  // ── Sempre applicabili a un deployer di sistema ad alto rischio ──────────────
  {
    id: "D-01",
    label: "Uso conforme alle istruzioni per l'uso",
    description:
      "Adottare misure tecniche e organizzative idonee a garantire che il sistema sia usato conformemente alle istruzioni per l'uso del fornitore.",
    primaryReference: "Art. 26(1) AI Act",
    supportReferences: ["Art. 13"],
    alwaysApplicable: true,
    evidenceType: "internal_procedure",
    linkedTool: "/dashboard/tools/transparency",
  },
  {
    id: "D-02",
    label: "Affidare la sorveglianza umana",
    description:
      "Affidare la sorveglianza umana a persone fisiche con la competenza, la formazione e l'autorità necessarie, e con il sostegno necessario.",
    primaryReference: "Art. 26(2) AI Act",
    supportReferences: ["Art. 14", "Art. 4"],
    alwaysApplicable: true,
    evidenceType: "person_assignment",
    linkedTool: "/dashboard/tools/oversight",
  },
  {
    id: "D-03",
    label: "Monitorare il funzionamento e segnalare",
    description:
      "Monitorare il sistema secondo le istruzioni; se presenta un rischio, informare fornitore o distributore e autorità di vigilanza e sospenderne l'uso; in caso di incidente grave informare immediatamente prima il fornitore, poi importatore o distributore e autorità.",
    primaryReference: "Art. 26(5) AI Act",
    supportReferences: ["Art. 72", "Art. 73", "Art. 79(1)"],
    alwaysApplicable: true,
    evidenceType: "linked_log",
    linkedTool: "/dashboard/post-market?tab=incidents",
  },
  {
    id: "D-04",
    label: "Conservare i log per almeno 6 mesi",
    description:
      "Conservare i log generati automaticamente dal sistema, nella misura in cui sono sotto il proprio controllo, per un periodo adeguato e comunque di almeno sei mesi, salvo diversa disposizione.",
    primaryReference: "Art. 26(6) AI Act",
    supportReferences: ["Art. 12", "Art. 19"],
    alwaysApplicable: true,
    evidenceType: "retention_policy",
    linkedTool: "/dashboard/tools/logvault",
  },
  {
    id: "D-05",
    label: "Dati di input pertinenti",
    description:
      "Nella misura in cui esercita il controllo sui dati di input, garantire che siano pertinenti e sufficientemente rappresentativi rispetto alla finalità prevista.",
    primaryReference: "Art. 26(4) AI Act",
    supportReferences: ["Art. 10"],
    alwaysApplicable: true,
    evidenceType: "internal_procedure",
    linkedTool: "/dashboard/tools/data-audit",
  },

  // ── Applicabili in base al caso ───────────────────────────────────────────
  {
    id: "D-06",
    label: "Cooperare con le autorità",
    description:
      "Cooperare con le autorità competenti in qualsiasi azione intrapresa in relazione al sistema.",
    primaryReference: "Art. 26(12) AI Act",
    supportReferences: [],
    alwaysApplicable: false,
    applicabilityField: "usesInternalProcedures",
    evidenceType: "internal_procedure",
    linkedTool: null,
  },
  {
    id: "D-07",
    label: "FRIA — Valutazione d'impatto sui diritti fondamentali",
    description:
      "Prima dell'uso, se il deployer è un organismo di diritto pubblico o un ente privato che fornisce servizi pubblici, o usa sistemi dell'Allegato III, punto 5(b) e (c) (non per i sistemi del punto 2).",
    primaryReference: "Art. 27 AI Act",
    supportReferences: ["All. III"],
    alwaysApplicable: false,
    applicabilityField: "usesHighRiskSystem",
    evidenceType: "linked_report",
    linkedTool: "/dashboard/tools/fria",
  },
  {
    id: "D-08",
    label: "Informare i lavoratori",
    description:
      "Prima di mettere in servizio o usare il sistema sul luogo di lavoro, il deployer datore di lavoro informa i rappresentanti dei lavoratori e i lavoratori interessati.",
    primaryReference: "Art. 26(7) AI Act",
    supportReferences: [],
    alwaysApplicable: false,
    applicabilityField: "employeeImpact",
    evidenceType: "notice_text",
    linkedTool: null,
  },
  {
    id: "D-09",
    label: "Informare le persone soggette alle decisioni",
    description:
      "Il deployer di un sistema dell'Allegato III che adotta o aiuta ad adottare decisioni su persone fisiche le informa che sono soggette all'uso del sistema.",
    primaryReference: "Art. 26(11) AI Act",
    supportReferences: ["Art. 86"],
    alwaysApplicable: false,
    applicabilityField: "biometricCategorization",
    evidenceType: "notice_text",
    linkedTool: null,
  },
  {
    id: "D-10",
    label: "Registrazione nella banca dati UE (autorità pubbliche)",
    description:
      "Il deployer che è autorità pubblica o istituzione dell'Unione si registra e registra l'uso del sistema nella banca dati UE; se il sistema non vi è registrato, non lo usa e informa fornitore o distributore.",
    primaryReference: "Art. 26(8) AI Act",
    supportReferences: ["Art. 49(3)", "Art. 71"],
    alwaysApplicable: false,
    applicabilityField: "eudbRequired",
    evidenceType: "registration_reference",
    linkedTool: "/dashboard/compliance-ops/eudb",
  },
  {
    id: "D-11",
    label: "Identificazione biometrica remota a posteriori: autorizzazione",
    description:
      "Per l'uso di un sistema di identificazione biometrica remota a posteriori nella ricerca mirata di persone in un'indagine penale, chiedere l'autorizzazione all'autorità giudiziaria o amministrativa prima dell'uso o senza ritardo e comunque entro 48 ore.",
    primaryReference: "Art. 26(10) AI Act",
    supportReferences: [],
    alwaysApplicable: false,
    applicabilityField: "rbiApplicable",
    evidenceType: "authorization_reference",
    linkedTool: null,
  },
] as const;

export const ALWAYS_OBLIGATIONS = DEPLOYER_OBLIGATIONS.filter((o) => o.alwaysApplicable);
export const CONDITIONAL_OBLIGATIONS = DEPLOYER_OBLIGATIONS.filter((o) => !o.alwaysApplicable);

export function getApplicableObligations(
  flags: DeployerApplicabilityFlags
): DeployerObligationDefinition[] {
  return DEPLOYER_OBLIGATIONS.filter(
    (o) => o.alwaysApplicable || (o.applicabilityField && flags[o.applicabilityField])
  );
}
