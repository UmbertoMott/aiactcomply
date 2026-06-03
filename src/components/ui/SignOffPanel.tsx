"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface SignOffRecord {
  reviewedBy: string;
  reviewerRole: string;
  reviewedAt: string;
  reviewNotes: string;
}

interface SignOffPanelProps {
  toolKey: string;
  toolLabel: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: "12px",
  color: "#0D1016",
  background: "#fff",
  outline: "none",
};

export default function SignOffPanel({ toolKey, toolLabel }: SignOffPanelProps) {
  const storageKey = `aicomply_signoff_${toolKey}`;
  const [record, setRecord] = useState<SignOffRecord | null>(null);
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setRecord(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  function handleSignOff() {
    if (!reviewedBy.trim() || !reviewerRole.trim()) {
      setError("Nome e ruolo sono obbligatori.");
      return;
    }
    const r: SignOffRecord = {
      reviewedBy: reviewedBy.trim(),
      reviewerRole: reviewerRole.trim(),
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes.trim(),
    };
    localStorage.setItem(storageKey, JSON.stringify(r));
    setRecord(r);
    setError("");
  }

  function handleRevoke() {
    localStorage.removeItem(storageKey);
    setRecord(null);
    setReviewedBy("");
    setReviewerRole("");
    setReviewNotes("");
  }

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "10px",
        padding: "16px",
        marginTop: "24px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
          Firma del revisore
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(202,138,4,0.08)",
            color: "#92400e",
            border: "1px solid rgba(202,138,4,0.2)",
          }}
        >
          Richiesto per audit
        </span>
      </div>

      {record ? (
        /* ── Approved state ── */
        <div
          className="rounded-lg p-3"
          style={{
            border: "1px solid rgba(22,163,74,0.2)",
            background: "rgba(22,163,74,0.04)",
          }}
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#15803d" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium" style={{ color: "#15803d" }}>
                Approvato da {record.reviewedBy} · {record.reviewerRole}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                {new Date(record.reviewedAt).toLocaleString("it-IT")}
              </p>
              {record.reviewNotes && (
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {record.reviewNotes}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRevoke}
            className="mt-3 text-[11px] px-3 py-1 rounded-lg transition-all"
            style={{
              background: "rgba(0,0,0,0.05)",
              color: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            Revoca
          </button>
        </div>
      ) : (
        /* ── Form state ── */
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
              Nome e Cognome *
            </label>
            <input
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder="es. Mario Rossi"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
              Ruolo / Qualifica *
            </label>
            <input
              value={reviewerRole}
              onChange={(e) => setReviewerRole(e.target.value)}
              placeholder="es. DPO, CTO, Legal Counsel"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
              Note di revisione
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Osservazioni, condizioni, riferimenti..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          {error && (
            <p className="text-[11px]" style={{ color: "#dc2626" }}>{error}</p>
          )}
          <button
            onClick={handleSignOff}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: "#0D1016", color: "#ffffff" }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Firma e approva — {toolLabel}
          </button>
        </div>
      )}
    </div>
  );
}
