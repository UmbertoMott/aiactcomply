// AuthorizedRepRecord types — PROMPT BG
//

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

// Compiti del mandato: Art. 22(3), lettere a)-e), e cessazione del mandato (Art. 22(4)).
export const MANDATORY_DUTIES: Omit<MandateDuty, "confirmed" | "confirmedAt">[] = [
  {
    duty: "Verificare che la dichiarazione di conformità UE e la documentazione tecnica siano redatte e che sia stata eseguita la valutazione della conformità",
    artRef: "Art. 22(3)(a)",
  },
  {
    duty: "Tenere a disposizione delle autorità per 10 anni i dati di contatto del fornitore, la dichiarazione di conformità UE, la documentazione tecnica e l'eventuale certificato",
    artRef: "Art. 22(3)(b)",
  },
  {
    duty: "Fornire alle autorità, su richiesta motivata, le informazioni e la documentazione necessarie, compreso l'accesso ai log",
    artRef: "Art. 22(3)(c)",
  },
  {
    duty: "Cooperare con le autorità competenti in qualsiasi azione relativa al sistema",
    artRef: "Art. 22(3)(d)",
  },
  {
    duty: "Ove applicabile, adempiere agli obblighi di registrazione (Art. 49(1)) o verificarne la correttezza",
    artRef: "Art. 22(3)(e)",
  },
  {
    duty: "Porre fine al mandato se il fornitore agisce in modo contrario ai propri obblighi e informarne l'autorità",
    artRef: "Art. 22(4)",
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
