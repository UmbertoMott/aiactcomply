"use client";
// Mostra i fatti estratti da un documento con workflow confirm/edit/reject.
// I fatti "suggested" appaiono in ambra — devono essere confermati dall'utente.
// VINCOLO: un fatto non entra mai nel record applicativo finché status != confirmed.

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Edit3, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { confirmFact, rejectFact, getExtractedFacts } from "@/app/actions/extractFacts";

type FactStatus = "suggested" | "confirmed" | "edited" | "rejected";

interface ExtractedFact {
  id: string;
  field_target: string;
  suggested_value: string;
  source_excerpt: string;
  source_location: string | null;
  confidence_score: number;
  status: FactStatus;
  edited_value: string | null;
  document_id: string;
  created_at: string;
}

interface ExtractedFactsPanelProps {
  documentId: string;
  /** Chiamato quando un fatto viene confermato */
  onFactConfirmed?: (fieldTarget: string, value: string) => void;
}

const T = {
  border: "rgba(0,0,0,0.08)",
  muted: "rgba(0,0,0,0.42)",
  amber: "#92400e",
  amberBg: "rgba(202,138,4,0.07)",
  amberBdr: "rgba(202,138,4,0.22)",
  green: "#15803d",
  greenBg: "rgba(22,163,74,0.06)",
  greenBdr: "rgba(22,163,74,0.18)",
  red: "#dc2626",
  redBg: "rgba(220,38,38,0.06)",
  blue: "#1d4ed8",
  blueBg: "rgba(29,78,216,0.05)",
} as const;

function fieldLabel(fieldTarget: string): string {
  const parts = fieldTarget.split(".");
  return parts[parts.length - 1]
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function FactRow({
  fact,
  onConfirm,
  onReject,
}: {
  fact: ExtractedFact;
  onConfirm: (id: string, edited?: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [showExcerpt, setShowExcerpt] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(fact.suggested_value);
  const [loading, setLoading] = useState(false);

  const isActioned = fact.status === "confirmed" || fact.status === "edited" || fact.status === "rejected";

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(fact.id, editing && editValue !== fact.suggested_value ? editValue : undefined);
    setLoading(false);
    setEditing(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(fact.id);
    setLoading(false);
  };

  const confidence = Math.round(fact.confidence_score * 100);

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${fact.status === "rejected" ? T.border : fact.status === "suggested" ? T.amberBdr : T.greenBdr}`,
        marginBottom: 8,
        overflow: "hidden",
        opacity: fact.status === "rejected" ? 0.45 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "10px 12px",
          background: fact.status === "suggested" ? T.amberBg : fact.status === "rejected" ? "transparent" : T.greenBg,
        }}
      >
        {/* Status icon */}
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          {fact.status === "suggested" && <AlertTriangle size={13} style={{ color: T.amber }} />}
          {(fact.status === "confirmed" || fact.status === "edited") && <CheckCircle2 size={13} style={{ color: T.green }} />}
          {fact.status === "rejected" && <XCircle size={13} style={{ color: T.muted }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Field name + confidence */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.55)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {fact.field_target}
            </span>
            <span
              style={{
                fontSize: 9, padding: "1px 5px", borderRadius: 4,
                background: confidence >= 80 ? T.greenBg : T.amberBg,
                color: confidence >= 80 ? T.green : T.amber,
                border: `1px solid ${confidence >= 80 ? T.greenBdr : T.amberBdr}`,
              }}
            >
              {confidence}%
            </span>
            {fact.status === "suggested" && (
              <span style={{ fontSize: 9, color: T.amber, fontWeight: 600 }}>✦ AI — verifica e conferma</span>
            )}
          </div>

          {/* Value (editable if editing) */}
          {editing ? (
            <textarea
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              rows={3}
              style={{
                width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 6,
                border: `1px solid ${T.border}`, resize: "vertical", outline: "none",
              }}
            />
          ) : (
            <p style={{ fontSize: 12, color: "#0D1016", margin: 0, wordBreak: "break-word" }}>
              {fact.status === "edited" ? fact.edited_value : fact.suggested_value}
            </p>
          )}

          {/* Source excerpt toggle */}
          <button
            onClick={() => setShowExcerpt(v => !v)}
            style={{ fontSize: 10, color: T.muted, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", display: "flex", alignItems: "center", gap: 3 }}
          >
            {showExcerpt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Estratto dal documento{fact.source_location ? ` — ${fact.source_location}` : ""}
          </button>

          {showExcerpt && (
            <blockquote
              style={{
                margin: "6px 0 0", padding: "5px 8px", borderLeft: `2px solid ${T.amberBdr}`,
                fontSize: 10, color: T.muted, fontStyle: "italic", wordBreak: "break-word",
              }}
            >
              {fact.source_excerpt}
            </blockquote>
          )}
        </div>

        {/* Actions */}
        {!isActioned && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                background: T.green, color: "#fff", border: "none", cursor: "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {editing ? "Conferma modifica" : "✓ Conferma"}
            </button>
            <button
              onClick={() => setEditing(v => !v)}
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 5,
                background: T.blueBg, color: T.blue, border: `1px solid rgba(29,78,216,0.16)`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
              }}
            >
              <Edit3 size={9} />
              {editing ? "Annulla" : "Modifica"}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 5,
                background: T.redBg, color: T.red, border: "1px solid rgba(220,38,38,0.18)",
                cursor: "pointer", opacity: loading ? 0.5 : 1,
              }}
            >
              ✕ Scarta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExtractedFactsPanel({ documentId, onFactConfirmed }: ExtractedFactsPanelProps) {
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFacts = useCallback(async () => {
    setLoading(true);
    const data = await getExtractedFacts(documentId);
    setFacts(data as ExtractedFact[]);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { loadFacts(); }, [loadFacts]);

  const handleConfirm = async (id: string, editedValue?: string) => {
    const result = await confirmFact(id, editedValue);
    if (result.ok) {
      setFacts(prev => prev.map(f =>
        f.id === id
          ? { ...f, status: editedValue ? "edited" : "confirmed", edited_value: editedValue ?? null }
          : f
      ));
      // Notifica il tool genitore del valore confermato
      const fact = facts.find(f => f.id === id);
      if (fact && onFactConfirmed) {
        onFactConfirmed(fact.field_target, editedValue ?? fact.suggested_value);
      }
    }
  };

  const handleReject = async (id: string) => {
    const result = await rejectFact(id);
    if (result.ok) {
      setFacts(prev => prev.map(f => f.id === id ? { ...f, status: "rejected" } : f));
    }
  };

  if (loading) {
    return (
      <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", padding: "8px 0" }}>
        Caricamento fatti estratti…
      </p>
    );
  }

  if (facts.length === 0) {
    return (
      <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", padding: "8px 0" }}>
        Nessun fatto estratto da questo documento.
      </p>
    );
  }

  const pending = facts.filter(f => f.status === "suggested").length;
  const confirmed = facts.filter(f => f.status === "confirmed" || f.status === "edited").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0 }}>
          Fatti estratti dal documento
        </p>
        {pending > 0 && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBdr}` }}>
            {pending} da verificare
          </span>
        )}
        {confirmed > 0 && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: T.greenBg, color: T.green, border: `1px solid ${T.greenBdr}` }}>
            {confirmed} confermati
          </span>
        )}
      </div>

      {pending > 0 && (
        <div
          style={{
            padding: "7px 10px", borderRadius: 7, marginBottom: 10,
            background: T.amberBg, border: `1px solid ${T.amberBdr}`,
          }}
        >
          <p style={{ fontSize: 10, color: T.amber, margin: 0 }}>
            <strong>✦ AI — verifica e conferma</strong> — I valori suggeriti non vengono applicati automaticamente. Conferma o modifica ogni fatto prima che venga usato.
          </p>
        </div>
      )}

      {facts.map(fact => (
        <FactRow
          key={fact.id}
          fact={fact}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      ))}
    </div>
  );
}
