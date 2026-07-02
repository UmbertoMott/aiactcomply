// AuthorizedRepRecord types — PROMPT BG
// [verify against current AI Act text]

export interface DigitalSignature {
  signedAt: string;
  signerEmail: string;
  signerName: string;
  canvasDataUrl?: string;
  integrityHash: string;
}

export interface MandateDuty {
  duty: string;
  artRef: string;
  confirmed: boolean;
  confirmedAt?: string;
}

export const MANDATORY_DUTIES: Omit<MandateDuty, "confirmed" | "confirmedAt">[] = [
  {
    duty: "Conservazione documentazione tecnica per 10 anni dalla immissione sul mercato",
    artRef: "Art. 22(3)(a)",
  },
  {
    duty: "Cooperazione con le autorità nazionali di vigilanza del mercato",
    artRef: "Art. 22(3)(b)",
  },
  {
    duty: "Messa a disposizione della documentazione tecnica su richiesta delle autorità",
    artRef: "Art. 22(3)(c)",
  },
  {
    duty: "Recesso immediato dal mandato in caso di violazione del regolamento da parte del provider",
    artRef: "Art. 22(5)",
  },
  {
    duty: "Informazione alle autorità di vigilanza in caso di decesso o rischio grave",
    artRef: "Art. 22(3)(d)",
  },
];

export interface AuthorizedRepRecord {
  mandateId: string;
  mandateDuties: MandateDuty[];
  mandateValidationStatus: "valid" | "missing_duties" | "not_validated";
  mandateValidationIssues: string[];
  signature?: DigitalSignature;
  signatureStatus: "unsigned" | "signed" | "revoked";
  updatedAt: string;
}

export function createDefaultArRecord(): AuthorizedRepRecord {
  return {
    mandateId: typeof crypto !== "undefined" ? crypto.randomUUID() : `mandate-${Date.now()}`,
    mandateDuties: MANDATORY_DUTIES.map(d => ({ ...d, confirmed: false })),
    mandateValidationStatus: "not_validated",
    mandateValidationIssues: [],
    signatureStatus: "unsigned",
    updatedAt: new Date().toISOString(),
  };
}
