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
  // ── Always applicable (5) ──────────────────────────────────────────────────
  {
    id: "D-01",
    label: "Verifica conformità sistema AI",
    description:
      "Verificare che il fornitore abbia prodotto tutta la documentazione tecnica e la dichiarazione di conformità UE prima del deployment.",
    primaryReference: "Art. 26(1) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 13", "Art. 11", "All. IV"],
    alwaysApplicable: true,
    evidenceType: "document_upload",
    linkedTool: "/dashboard/tools/risk-manager",
  },
  {
    id: "D-02",
    label: "Uso conforme alle istruzioni",
    description:
      "Garantire che il sistema AI venga utilizzato esclusivamente secondo le istruzioni d'uso e il campo di applicazione previsto dal fornitore.",
    primaryReference: "Art. 26(2) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 13(3)", "Art. 26(6)"],
    alwaysApplicable: true,
    evidenceType: "internal_procedure",
    linkedTool: null,
  },
  {
    id: "D-03",
    label: "Supervisione umana",
    description:
      "Assegnare personale qualificato per la supervisione umana del sistema AI durante il funzionamento, con competenze tecniche adeguate.",
    primaryReference: "Art. 26(5) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 14"],
    alwaysApplicable: true,
    evidenceType: "person_assignment",
    linkedTool: null,
  },
  {
    id: "D-04",
    label: "Segnalazione gravi incidenti",
    description:
      "Notificare al fornitore e alle autorità competenti qualsiasi grave incidente o malfunzionamento individuato, entro i termini previsti.",
    primaryReference: "Art. 26(6) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 73", "Art. 74"],
    alwaysApplicable: true,
    evidenceType: "linked_log",
    linkedTool: "/dashboard/tools/incident",
  },
  {
    id: "D-05",
    label: "Log e conservazione dati",
    description:
      "Conservare i log generati dal sistema AI per il periodo minimo stabilito dalla normativa applicabile e garantirne l'integrità.",
    primaryReference: "Art. 26(6) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 12(1)", "Art. 19"],
    alwaysApplicable: true,
    evidenceType: "retention_policy",
    linkedTool: "/dashboard/tools/logvault",
  },

  // ── Conditional (6) ───────────────────────────────────────────────────────
  {
    id: "D-06",
    label: "Procedure interne di controllo",
    description:
      "Implementare e documentare procedure interne per garantire il rispetto continuativo del regolamento durante l'utilizzo del sistema.",
    primaryReference: "Art. 26(2) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 9"],
    alwaysApplicable: false,
    applicabilityField: "usesInternalProcedures",
    evidenceType: "internal_procedure",
    linkedTool: null,
  },
  {
    id: "D-07",
    label: "FRIA — Valutazione impatto diritti fondamentali",
    description:
      "Effettuare una valutazione d'impatto sui diritti fondamentali prima del deployment di sistemi AI ad alto rischio per uso pubblico.",
    primaryReference: "Art. 27 AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 26(1)", "All. III"],
    alwaysApplicable: false,
    applicabilityField: "usesHighRiskSystem",
    evidenceType: "linked_report",
    linkedTool: "/dashboard/tools/fria",
  },
  {
    id: "D-08",
    label: "Informativa ai lavoratori",
    description:
      "Informare in modo trasparente e con anticipo i lavoratori e i rappresentanti sindacali sull'uso di sistemi AI che li riguardano.",
    primaryReference: "Art. 26(7) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Considerando 89"],
    alwaysApplicable: false,
    applicabilityField: "employeeImpact",
    evidenceType: "notice_text",
    linkedTool: null,
  },
  {
    id: "D-09",
    label: "Divieto categorizzazione biometrica / emozioni",
    description:
      "Non utilizzare sistemi di categorizzazione biometrica o riconoscimento delle emozioni nei contesti vietati. Documentare l'eccezione se applicabile.",
    primaryReference: "Art. 26(8) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 5(1)(b)"],
    alwaysApplicable: false,
    applicabilityField: "biometricCategorization",
    evidenceType: "authorization_reference",
    linkedTool: null,
  },
  {
    id: "D-10",
    label: "Registrazione EUDB (autorità pubbliche)",
    description:
      "Registrare il sistema AI nel database EU AI Act (EUDB) prima del deployment, se si è un'autorità pubblica che utilizza sistemi ad alto rischio.",
    primaryReference: "Art. 49(2) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 26(1)", "Art. 71"],
    alwaysApplicable: false,
    applicabilityField: "eudbRequired",
    evidenceType: "registration_reference",
    linkedTool: "/dashboard/tools/eudb",
  },
  {
    id: "D-11",
    label: "Registrazione RBI",
    description:
      "Registrare il sistema AI nel database RBI (Regulatory Burden Inventory) entro 48 ore dall'inizio del deployment, se applicabile.",
    primaryReference: "Art. 26(10) AI Act [verificare sul testo AI Act vigente]",
    supportReferences: ["Art. 49"],
    alwaysApplicable: false,
    applicabilityField: "rbiApplicable",
    evidenceType: "registration_reference",
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
