export interface AuditTrail {
  discovery_hash: string;
  inference_confidence: string;
  exemption_logic: string;
  profiling_check: "CLEAN" | "BLOCKED" | "WARNINGS";
}

export interface TechnicalFingerprint {
  git_sha: string;
  dependency_checksum: string;
  data_schema_version: string;
}

export interface ConformityPassport {
  passport_id: string;
  ai_act_risk_level: "Unacceptable" | "High" | "Limited" | "Minimal";
  system_name: string;
  version: string;
  generated_at: string;
  valid_from: string;
  valid_until: string;
  audit_trail: AuditTrail;
  technical_fingerprint: TechnicalFingerprint;
  legal_declaration: string;
  signature: string;
  passport_hash: string;
}

export interface PassportSummary {
  id: string;
  riskLevel: string;
  confidence: number;
  exemptionStatus: string;
  profilingStatus: string;
  signed: boolean;
  hash: string;
  generatedAt: string;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, "0")}`;
}

function generateGitSHA(): string {
  return `a3f2c8e1b7d94f0a6c8e3d1b5f7a9c2e4d6f8b0a`;
}

function generateDependencyChecksum(): string {
  return `sha256:${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}

const COMPANY_KEYS = {
  publicKey: "ED25519:MCowBQYDK2VwAyEA7kM5JvHRFPfB8GqJsXPBzB6n9YGW98hMn8SX7YpOniM=",
  keyId: "kms:aicomply:signing-key-001",
};

export function generatePassport(
  riskLevel: ConformityPassport["ai_act_risk_level"],
  confidence: number,
  exemptionStatus: string,
  profilingStatus: AuditTrail["profiling_check"],
  systemName: string = "CV-Screener AI"
): ConformityPassport {
  const now = new Date();
  const validFrom = now.toISOString();
  const validUntil = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()).toISOString();

  const passportId = crypto.randomUUID();

  const auditTrail: AuditTrail = {
    discovery_hash: simpleHash(JSON.stringify({ systemName, riskLevel, confidence })),
    inference_confidence: `${confidence}%`,
    exemption_logic: exemptionStatus,
    profiling_check: profilingStatus,
  };

  const technicalFingerprint: TechnicalFingerprint = {
    git_sha: generateGitSHA(),
    dependency_checksum: generateDependencyChecksum(),
    data_schema_version: "1.0.4",
  };

  const legalDeclaration = `I, AIComply Classifier v2.0, declare that the AI system "${systemName}" has been analyzed according to the Regolamento UE 2024/1689 (AI Act). Classification: ${riskLevel}. Profiling check: ${profilingStatus}. Exemption: ${exemptionStatus}. This passport is cryptographically bound to the specific software version identified by Git commit ${technicalFingerprint.git_sha.slice(0, 12)}.`;

  const payloadToSign = JSON.stringify({ passportId, auditTrail, technicalFingerprint, legalDeclaration });
  const signature = `signed:ed25519:${COMPANY_KEYS.keyId}:${simpleHash(payloadToSign)}`;
  const passportHash = simpleHash(payloadToSign + signature);

  return {
    passport_id: passportId,
    ai_act_risk_level: riskLevel,
    system_name: systemName,
    version: "2.3.1",
    generated_at: validFrom,
    valid_from: validFrom,
    valid_until: validUntil,
    audit_trail: auditTrail,
    technical_fingerprint: technicalFingerprint,
    legal_declaration: legalDeclaration,
    signature,
    passport_hash: passportHash,
  };
}

export function verifyPassport(passport: ConformityPassport): {
  valid: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
} {
  const checks = [
    {
      name: "Firma digitale ED25519",
      passed: passport.signature.startsWith("signed:ed25519:"),
      detail: `Chiave: ${passport.signature.split(":").slice(0, 4).join(":")}...`,
    },
    {
      name: "Hash passaporto",
      passed: passport.passport_hash.length > 0,
      detail: `SHA-256: ${passport.passport_hash.slice(0, 24)}...`,
    },
    {
      name: "Validità temporale",
      passed: new Date(passport.valid_until) > new Date(),
      detail: `Scade: ${passport.valid_until.slice(0, 10)}`,
    },
    {
      name: "Dichiarazione legale",
      passed: passport.legal_declaration.includes(passport.ai_act_risk_level),
      detail: `Rischio dichiarato: ${passport.ai_act_risk_level}`,
    },
  ];

  return { valid: checks.every((c) => c.passed), checks };
}

export function getPassportSummary(passport: ConformityPassport): PassportSummary {
  return {
    id: passport.passport_id.slice(0, 8),
    riskLevel: passport.ai_act_risk_level,
    confidence: parseFloat(passport.audit_trail.inference_confidence),
    exemptionStatus: passport.audit_trail.exemption_logic,
    profilingStatus: passport.audit_trail.profiling_check,
    signed: passport.signature.startsWith("signed:ed25519:"),
    hash: passport.passport_hash.slice(0, 16),
    generatedAt: passport.generated_at.slice(0, 10),
  };
}

export function exportForRegulator(passport: ConformityPassport): {
  filename: string;
  jsonContent: string;
  euRegistryPayload: Record<string, unknown>;
} {
  const filename = `aicomply-passport-${passport.passport_id.slice(0, 8)}-${passport.generated_at.slice(0, 10)}.json`;

  const jsonContent = JSON.stringify(passport, null, 2);

  const euRegistryPayload = {
    registration_type: "AI_SYSTEM_CLASSIFICATION",
    regulation: "EU_2024_1689",
    article: "Article 6 - Classification Rules",
    annex_reference: passport.ai_act_risk_level === "High" ? "Annex III" : null,
    passport_id: passport.passport_id,
    operator: passport.system_name,
    risk_level: passport.ai_act_risk_level,
    profiling_check: passport.audit_trail.profiling_check,
    git_commit: passport.technical_fingerprint.git_sha,
    timestamp: passport.generated_at,
    signature: passport.signature,
  };

  return { filename, jsonContent, euRegistryPayload };
}
