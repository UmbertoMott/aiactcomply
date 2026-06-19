"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  readFromStorage,
  writeToStorage,
} from "@/lib/dossier/storage-schema";
import type {
  ClassifierResult,
  DataAuditResult,
} from "@/lib/dossier/storage-schema";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";
import { T, inputSt } from "@/components/assessment/tokens";

// ── Types ────────────────────────────────────────────────────────────────────

interface AssessmentSignOffRecord {
  reviewedBy: string;
  reviewerRole: string;
  reviewedAt: string;
  reviewNotes: string;
  inputHash: string; // hash of shared + classifier + dataAudit at sign time
}

interface AssessmentSignOffProps {
  toolKey: "dpia" | "fria";
  toolLabel: string;
  shared: AssessmentShared;
}

// ── Hash utilities ────────────────────────────────────────────────────────────

function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // force unsigned 32-bit
  }
  return h.toString(16);
}

function computeInputHash(
  shared: AssessmentShared,
  classifier: ClassifierResult | null,
  dataAudit: DataAuditResult | null
): string {
  const snapshot = {
    systemName: shared.systemName,
    purpose: shared.purpose,
    legalBasis: shared.legalBasis,
    processesPersonalData: shared.processesPersonalData,
    personalDataCategories: [...shared.personalDataCategories].sort(),
    specialCategories: [...shared.specialCategories].sort(),
    riskLevel: classifier?.riskLevel ?? null,
    annexIII: classifier?.annexIII ?? null,
    role: classifier?.role ?? null,
    dataQuality: dataAudit?.overallQuality ?? null,
    datasetCount: dataAudit?.datasets?.length ?? 0,
  };
  return hashString(JSON.stringify(snapshot));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssessmentSignOff({
  toolKey,
  toolLabel,
  shared,
}: AssessmentSignOffProps) {
  const storageKey =
    toolKey === "dpia"
      ? ("dpiaSignoff" as const)
      : ("friaSignoff" as const);

  const [record, setRecord] = useState<AssessmentSignOffRecord | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState("");

  // Boot: load existing sign-off and check staleness
  useEffect(() => {
    const existing =
      readFromStorage<AssessmentSignOffRecord>(storageKey);
    if (existing) {
      setRecord(existing);
      const classifier = readFromStorage<ClassifierResult>("classifier");
      const dataAudit = readFromStorage<DataAuditResult>("dataAudit");
      const currentHash = computeInputHash(shared, classifier, dataAudit);
      setIsStale(existing.inputHash !== currentHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSignOff() {
    if (!reviewedBy.trim() || !reviewerRole.trim()) {
      setError("Nome e ruolo sono obbligatori.");
      return;
    }
    const classifier = readFromStorage<ClassifierResult>("classifier");
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");
    const inputHash = computeInputHash(shared, classifier, dataAudit);
    const r: AssessmentSignOffRecord = {
      reviewedBy: reviewedBy.trim(),
      reviewerRole: reviewerRole.trim(),
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes.trim(),
      inputHash,
    };
    writeToStorage(storageKey, r);
    setRecord(r);
    setIsStale(false);
    setError("");
  }

  function handleRevoke() {
    writeToStorage<AssessmentSignOffRecord | null>(storageKey, null);
    setRecord(null);
    setIsStale(false);
    setReviewedBy("");
    setReviewerRole("");
    setReviewNotes("");
  }

  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: 16,
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
          Firma del revisore
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 4,
            background: T.amberBg,
            color: "#92400e",
            border: `1px solid ${T.amberBdr}`,
          }}
        >
          Richiesto per audit
        </span>
      </div>

      {/* Staleness warning — shown above the existing record when stale */}
      {record && isStale && (
        <div
          style={{
            background: T.amberBg,
            border: `1px solid ${T.amberBdr}`,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: T.amber, margin: 0 }}>
            ⚠ Dati modificati dopo la firma
          </p>
          <p style={{ fontSize: 11, color: T.amber, margin: "4px 0 0 0", lineHeight: 1.5 }}>
            I dati condivisi o upstream (Classifier / Data Audit) sono stati modificati dopo
            l&apos;ultima firma. Verifica le modifiche e ri-firma per aggiornare.
          </p>
        </div>
      )}

      {record ? (
        /* ── Approved state ── */
        <div
          style={{
            border: `1px solid ${T.greenBdr}`,
            background: T.greenBg,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <CheckCircle2
              style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, color: T.green }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: T.green, margin: 0 }}>
                Approvato da {record.reviewedBy} · {record.reviewerRole}
              </p>
              <p style={{ fontSize: 11, marginTop: 2, color: T.muted, margin: "2px 0 0 0" }}>
                {new Date(record.reviewedAt).toLocaleString("it-IT")}
              </p>
              {record.reviewNotes && (
                <p
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    lineHeight: 1.5,
                    color: "rgba(0,0,0,0.55)",
                    margin: "4px 0 0 0",
                  }}
                >
                  {record.reviewNotes}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRevoke}
            style={{
              marginTop: 12,
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.05)",
              color: "rgba(0,0,0,0.45)",
              border: `1px solid ${T.border}`,
              cursor: "pointer",
            }}
          >
            Revoca
          </button>
        </div>
      ) : (
        /* ── Form state ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 4,
                color: T.muted,
              }}
            >
              Nome e Cognome *
            </label>
            <input
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder="es. Mario Rossi"
              style={inputSt}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 4,
                color: T.muted,
              }}
            >
              Ruolo / Qualifica *
            </label>
            <input
              value={reviewerRole}
              onChange={(e) => setReviewerRole(e.target.value)}
              placeholder="es. DPO, CTO, Legal Counsel"
              style={inputSt}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 4,
                color: T.muted,
              }}
            >
              Note di revisione
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Osservazioni, condizioni, riferimenti..."
              style={{ ...inputSt, resize: "vertical" }}
            />
          </div>
          {error && (
            <p style={{ fontSize: 11, color: T.red, margin: 0 }}>{error}</p>
          )}
          <button
            onClick={handleSignOff}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: T.text,
              color: "#ffffff",
              alignSelf: "flex-start",
            }}
          >
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Firma e approva — {toolLabel}
          </button>
        </div>
      )}
    </div>
  );
}
