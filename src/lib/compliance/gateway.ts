export interface AuthoritySubmission {
  authority: string;
  systemName: string;
  riskClass: string;
  submissionDate: string;
  status: "pending" | "submitted" | "accepted" | "rejected";
  referenceNumber: string;
  documents: string[];
}

export interface SandboxRegistration {
  id: string;
  companyName: string;
  vatNumber: string;
  systemName: string;
  description: string;
  riskClass: string;
  smeStatus: boolean;
  submittedAt: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  sandboxName: string;
}

const AUTHORITY_API = "https://ec.europa.eu/artificial-intelligence/api/v1";
const UE_REGISTRY = "https://artificialintelligence.ec.europa.eu/register";

export async function submitToAuthority(
  systemName: string,
  riskClass: string,
  documents: string[]
): Promise<AuthoritySubmission> {
  const submission: AuthoritySubmission = {
    authority: "Commissione Europea — Ufficio per l'IA",
    systemName,
    riskClass,
    submissionDate: new Date().toISOString(),
    status: "submitted",
    referenceNumber: `EU-AI-${Date.now().toString(36).toUpperCase()}`,
    documents,
  };

  // In produzione: POST a AUTHORITY_API/register
  console.log(`[COMPLIANCE-NEXUS] Submitted to ${AUTHORITY_API}/register:`, submission);

  return submission;
}

export function generateSMEFastTrack(
  companyName: string,
  systemName: string,
  description: string
): SandboxRegistration {
  return {
    id: `SANDBOX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    companyName,
    vatNumber: `IT${Math.floor(Math.random() * 10000000000)}`,
    systemName,
    description,
    riskClass: "High-risk (Allegato III)",
    smeStatus: true,
    submittedAt: new Date().toISOString(),
    status: "draft",
    sandboxName: "AI Regulatory Sandbox — Italia (Art. 57)",
  };
}

export function getRegistrationRequirements(riskClass: string): string[] {
  const requirements: Record<string, string[]> = {
    "high": [
      "Allegato IV — Documentazione tecnica completa",
      "Allegato VI — Dichiarazione di conformità UE",
      "Allegato VII — Certificato organismo notificato",
      "FRIA — Valutazione impatto diritti fondamentali (Art. 27)",
      "Sistema di gestione dei rischi (Art. 9)",
      "Registrazione nella banca dati UE (Art. 49)",
    ],
    "limited": [
      "Informativa di trasparenza (Art. 50)",
      "Marcatura contenuti sintetici",
    ],
    "minimal": [
      "Adesione volontaria a codici di condotta (Art. 95)",
    ],
    "unacceptable": [
      "VIETATO — Non commercializzabile nell'UE",
    ],
  };
  return requirements[riskClass] || requirements.minimal;
}

export function getDeadline(riskClass: string): string {
  const deadlines: Record<string, string> = {
    "high": "2 agosto 2026",
    "limited": "2 agosto 2026",
    "minimal": "Nessuna scadenza specifica",
    "unacceptable": "Già in vigore (2 febbraio 2025)",
  };
  return deadlines[riskClass] || "N/A";
}
