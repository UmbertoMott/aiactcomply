// Trust Center Public Snapshot
// Reads all tool localStorage data and builds a shareable trust snapshot.

import { readFromStorage } from "@/lib/dossier/storage-schema";
import type {
  ClassifierResult,
  RiskManagerResult,
  ConformityResult,
  QMSResult,
  DPIAResult,
  L132Result,
} from "@/lib/dossier/storage-schema";

export const TRUST_SNAPSHOT_PREFIX = "trust_public_snapshot_";

export interface ComplianceSignal {
  tool: string;
  label: string;
  status: "ok" | "partial" | "missing";
  article: string;
}

export interface SignOffEntry {
  toolKey: string;
  toolLabel: string;
  reviewedBy: string;
  reviewerRole: string;
  reviewedAt: string;
}

export interface PublicCert {
  name: string;
  standard: string;
  status: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
}

export interface TrustSnapshot {
  slug: string;
  publishedAt: string;
  systemName: string;
  companyName: string;
  riskLevel: string;
  conformityScore: number;
  passportHash: string;
  complianceSignals: ComplianceSignal[];
  signOffs: SignOffEntry[];
  certifications: PublicCert[];
}

const SIGNOFF_TOOLS = [
  { key: "classifier", label: "Classificatore AI Act" },
  { key: "risk-manager", label: "Risk Manager" },
  { key: "data-audit", label: "Data & Training Audit" },
  { key: "dpia", label: "DPIA" },
  { key: "fria", label: "FRIA" },
  { key: "conformity", label: "Dichiarazione di Conformità" },
  { key: "qms", label: "Sistema di Gestione Qualità" },
];

export function buildSnapshot(slug: string): TrustSnapshot {
  const classifier = readFromStorage<ClassifierResult>("classifier");
  const riskManager = readFromStorage<RiskManagerResult>("riskManager");
  const conformity = readFromStorage<ConformityResult>("conformity");
  const qms = readFromStorage<QMSResult>("qms");
  const dpia = readFromStorage<DPIAResult>("dpia");
  const l132 = readFromStorage<L132Result>("l132");

  // FRIA: check both legacy key and new schema key
  let friaCompleted = false;
  try {
    friaCompleted =
      !!localStorage.getItem("fria_document") ||
      !!localStorage.getItem("aicomply_fria_result");
  } catch {
    // ignore
  }

  // Trust Center state (certifications, passports)
  let certifications: PublicCert[] = [];
  let passportHash = "";
  let systemNameFromTrust = "";

  try {
    const trustRaw =
      typeof window !== "undefined" ? localStorage.getItem("trust_center_state") : null;
    if (trustRaw) {
      const trustState = JSON.parse(trustRaw) as {
        certifications?: Array<{
          name: string;
          standard: string;
          status: string;
          issuedBy: string;
          issuedAt: string;
          expiresAt: string | null;
        }>;
        passports?: Array<{ passportHash?: string; systemName?: string }>;
      };
      certifications = (trustState.certifications ?? [])
        .filter((c) => c.status === "certified")
        .map((c) => ({
          name: c.name,
          standard: c.standard,
          status: c.status,
          issuedBy: c.issuedBy,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
        }));
      if (trustState.passports && trustState.passports.length > 0) {
        passportHash = trustState.passports[0].passportHash ?? "";
        systemNameFromTrust = trustState.passports[0].systemName ?? "";
      }
    }
  } catch {
    // ignore
  }

  // ── Compliance signals ───────────────────────────────────────────────
  const signals: ComplianceSignal[] = [
    {
      tool: "classifier",
      label: "Classificazione rischio",
      status: classifier ? "ok" : "missing",
      article: "Art. 6",
    },
    {
      tool: "risk_manager",
      label: "Risk Management",
      status: riskManager
        ? riskManager.overallRiskLevel !== "critical"
          ? "ok"
          : "partial"
        : "missing",
      article: "Art. 9",
    },
    {
      tool: "conformity",
      label: "Dichiarazione di conformità",
      status: conformity ? "ok" : "missing",
      article: "Art. 47",
    },
    {
      tool: "qms",
      label: "Quality Management System",
      status: qms ? (qms.qmsDocumentRef ? "ok" : "partial") : "missing",
      article: "Art. 17",
    },
    {
      tool: "dpia",
      label: "DPIA (GDPR Art. 35)",
      status: dpia ? "ok" : "missing",
      article: "Art. 35 GDPR",
    },
    {
      tool: "l132",
      label: "L.132/2025 (Legge italiana)",
      status: l132
        ? l132.overallStatus === "conforme"
          ? "ok"
          : "partial"
        : "missing",
      article: "L.132/25",
    },
    {
      tool: "fria",
      label: "Valutazione impatto FRIA",
      status: friaCompleted ? "ok" : "missing",
      article: "Art. 27",
    },
  ];

  // ── Sign-offs ────────────────────────────────────────────────────────
  const signOffs: SignOffEntry[] = [];
  if (typeof window !== "undefined") {
    for (const tool of SIGNOFF_TOOLS) {
      try {
        const raw = localStorage.getItem(`aicomply_signoff_${tool.key}`);
        if (raw) {
          const record = JSON.parse(raw) as {
            reviewedBy?: string;
            reviewerRole?: string;
            reviewedAt?: string;
          };
          if (record.reviewedBy) {
            signOffs.push({
              toolKey: tool.key,
              toolLabel: tool.label,
              reviewedBy: record.reviewedBy,
              reviewerRole: record.reviewerRole ?? "",
              reviewedAt: record.reviewedAt ?? "",
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // ── Conformity score ─────────────────────────────────────────────────
  const totalSignals = signals.length;
  const okSignals = signals.filter((s) => s.status === "ok").length;
  const partialSignals = signals.filter((s) => s.status === "partial").length;
  const conformityScore = Math.round(
    ((okSignals + partialSignals * 0.5) / totalSignals) * 100
  );

  const riskLevelMap: Record<string, string> = {
    unacceptable: "Inaccettabile",
    high: "Alto rischio",
    limited: "Rischio limitato",
    minimal: "Rischio minimo",
  };
  const riskLevel = classifier?.riskLevel
    ? (riskLevelMap[classifier.riskLevel] ?? classifier.riskLevel)
    : "Non classificato";

  return {
    slug,
    publishedAt: new Date().toISOString(),
    systemName: systemNameFromTrust || classifier?.systemName || "Sistema AI",
    companyName: slug,
    riskLevel,
    conformityScore,
    passportHash,
    complianceSignals: signals,
    signOffs,
    certifications,
  };
}

export function saveSnapshot(snapshot: TrustSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${TRUST_SNAPSHOT_PREFIX}${snapshot.slug}`,
    JSON.stringify(snapshot)
  );
}

export function loadSnapshot(slug: string): TrustSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${TRUST_SNAPSHOT_PREFIX}${slug}`);
    return raw ? (JSON.parse(raw) as TrustSnapshot) : null;
  } catch {
    return null;
  }
}
