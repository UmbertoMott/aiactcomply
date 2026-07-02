// src/lib/signoff/trust-service.ts
// Interfaccia provider-agnostica per servizi fiduciari (QTSP / TSA).
// Default: NoopTrustService → livello base SES.
// Innesto QTSP: impostare TRUST_SERVICE_PROVIDER env e fornire implementazione.

export interface QualifiedTimestampToken {
  token: string;   // RFC 3161 timestamp token (base64) o handle provider
  tsa: string;     // nome / URL del TSA
  at: string;      // ISO 8601 UTC del timestamp emesso dal TSA
}

export interface SignEnvelope {
  envelopeId: string;   // ID univoco del documento firmato
  provider: string;     // nome del provider di firma (es. "DocuSign", "Namirial")
}

/**
 * Interfaccia unica per tutti i servizi fiduciari.
 * I componenti non conoscono il provider concreto.
 */
export interface TrustService {
  /**
   * Richiede una marca temporale qualificata RFC 3161 su un hash.
   * Ritorna null se il provider non è configurato (livello base SES).
   */
  qualifiedTimestamp(hashHex: string): Promise<QualifiedTimestampToken | null>;

  /**
   * Richiede una firma AdES-QES su un payload.
   * Ritorna null se il provider non è configurato (livello base SES).
   */
  sign(
    payload: string,
    level: "ades" | "qes"
  ): Promise<SignEnvelope | null>;
}

/**
 * Implementazione vuota — livello base SES.
 * Non chiama nessun provider esterno; le funzioni ritornano null.
 * Il registro riporterà signatureLevel: "ses" e qualifiedTimestamp: null.
 */
export const NoopTrustService: TrustService = {
  async qualifiedTimestamp(): Promise<null> {
    return null;
  },
  async sign(): Promise<null> {
    return null;
  },
};

/**
 * Ritorna il TrustService configurato.
 * Estensione futura: leggere NEXT_PUBLIC_TRUST_SERVICE_PROVIDER e
 * importare dinamicamente il provider corrispondente.
 * Attualmente ritorna sempre NoopTrustService (livello base SES).
 */
export function getTrustService(): TrustService {
  // Punto di innesto QTSP: sostituire con import dinamico basato su env
  // const provider = process.env.NEXT_PUBLIC_TRUST_SERVICE_PROVIDER;
  // if (provider === "namirial") return NamirialTrustService;
  // if (provider === "docusign") return DocuSignTrustService;
  return NoopTrustService;
}
