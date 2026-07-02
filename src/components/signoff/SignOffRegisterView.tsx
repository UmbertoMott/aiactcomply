"use client";
// SignOffRegisterView — Vista read-only del registro sign-off (Bucket A).
// Mostra: firmatario, ruolo, data/ora, livello firma, hash, rif. normativo, retentionUntil.
// Pulsante "Verifica integrità" → verifySignOffChain() → esito.

import React, { useEffect, useState, useTransition } from "react";
import {
  Shield, Hash, Clock, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Loader2, RefreshCw, Filter,
} from "lucide-react";
import type { SignOffRecord } from "@/lib/signoff/signoff-types";
import { getSignOffRegister, verifySignOffChain, type ChainVerifyResult } from "@/lib/signoff/register";
import { TOOL_SIGNOFF_CONFIG } from "@/lib/signoff/signoff-types";

function shortHash(h: string) { return h.slice(0, 14) + "…"; }

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString("it-IT"); } catch { return iso; }
}

function LevelBadge({ level }: { level: string }) {
  const cfg = {
    ses:  { bg: "rgba(0,0,0,0.05)",          color: "rgba(0,0,0,0.5)",  label: "SES" },
    ades: { bg: "rgba(35,64,58,0.08)",        color: "#23403a",          label: "AdES" },
    qes:  { bg: "rgba(35,64,58,0.12)",        color: "#23403a",          label: "QES" },
  }[level] ?? { bg: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)", label: level.toUpperCase() };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, letterSpacing: "0.03em",
    }}>{cfg.label}</span>
  );
}

function RecordRow({ rec }: { rec: SignOffRecord }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-black/[0.015] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#15803d" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
              {rec.signer.name}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>
              {rec.signer.role}
            </span>
            {rec.signer.onBehalf && (
              <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                per conto di {rec.signer.onBehalf}
              </span>
            )}
            <LevelBadge level={rec.signatureLevel} />
            {rec.qualifiedTimestamp && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                background: "rgba(35,64,58,0.08)", color: "#23403a",
              }}>TSQ</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Clock className="h-3 w-3" style={{ color: "rgba(0,0,0,0.25)" }} />
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.45)" }}>{fmtDate(rec.signedAt)}</span>
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.25)" }}>·</span>
            <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.35)" }}>
              {shortHash(rec.contentHash)}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.25)" }}>·</span>
            <span className="text-[10px]" style={{ color: "#b45309" }}>{rec.legalRef}</span>
          </div>
        </div>
        <div style={{ color: "rgba(0,0,0,0.25)", flexShrink: 0, paddingTop: 2 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 40, paddingRight: 16, paddingBottom: 12, background: "rgba(0,0,0,0.012)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
            <Field label="Tool" value={rec.toolKey} />
            <Field label="Versione doc." value={rec.documentVersion} />
            <Field label="Retention fino a" value={fmtDate(rec.retentionUntil)} />
            <Field label="Scope" value={rec.scopeId} />
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="Content hash (SHA-256)" value={rec.contentHash} mono />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="Record hash (hash-chain)" value={rec.recordHash} mono />
            </div>
            {rec.prevRecordHash && (
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Hash precedente" value={rec.prevRecordHash} mono />
              </div>
            )}
            {rec.signer.email && <Field label="Email" value={rec.signer.email} />}
            {rec.qualifiedTimestamp && (
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="TSA" value={`${rec.qualifiedTimestamp.tsa} — ${fmtDate(rec.qualifiedTimestamp.at)}`} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.38)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.55)", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface SignOffRegisterViewProps {
  scopeId?: string;
}

export function SignOffRegisterView({ scopeId }: SignOffRegisterViewProps) {
  const [records, setRecords]   = useState<SignOffRecord[]>([]);
  const [filterKey, setFilterKey] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<ChainVerifyResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const resolvedScope = scopeId
    ?? (typeof localStorage !== "undefined" ? localStorage.getItem("aicomply_active_project_id") ?? "default" : "default");

  const load = () => {
    startTransition(async () => {
      const data = await getSignOffRegister(resolvedScope, filterKey || undefined);
      setRecords(data);
    });
  };

  useEffect(() => {
    if (expanded) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, filterKey, resolvedScope]);

  const handleVerify = () => {
    startTransition(async () => {
      const result = await verifySignOffChain(resolvedScope);
      setVerifyResult(result);
    });
  };

  const bucketATools = TOOL_SIGNOFF_CONFIG.filter(c => c.bucket === "A");

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#fff" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors"
        style={{ background: expanded ? "rgba(0,0,0,0.015)" : "#fff", borderBottom: expanded ? "1px solid rgba(0,0,0,0.06)" : "none" }}
      >
        <Shield className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.4)" }} />
        <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
          Registro Sign-off (Bucket A)
        </span>
        {records.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" }}>
            {records.length} record
          </span>
        )}
        <span className="ml-auto" style={{ color: "rgba(0,0,0,0.3)" }}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <Filter className="h-3 w-3" style={{ color: "rgba(0,0,0,0.3)" }} />
            <select
              value={filterKey}
              onChange={e => setFilterKey(e.target.value)}
              style={{ fontSize: 11, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, padding: "3px 6px", color: "#0D1016", background: "#fff" }}
            >
              <option value="">Tutti i tool</option>
              {bucketATools.map(c => (
                <option key={c.toolKey} value={c.toolKey}>{c.toolKey}</option>
              ))}
            </select>
            <button onClick={load} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <RefreshCw size={12} /> Aggiorna
            </button>
          </div>

          {/* Verifica integrità */}
          <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              onClick={handleVerify}
              disabled={isPending}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{ background: "#0D1016", color: "#fff" }}
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Hash size={11} />}
              Verifica integrità
            </button>
            {verifyResult && (
              <div className="flex items-center gap-1.5 text-[11px]"
                style={{ color: verifyResult.ok ? "#15803d" : "#dc2626" }}>
                {verifyResult.ok
                  ? <CheckCircle2 size={13} />
                  : <XCircle size={13} />
                }
                {verifyResult.details}
              </div>
            )}
          </div>

          {/* Lista record */}
          {isPending && records.length === 0 ? (
            <div className="px-4 py-6 flex justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: "rgba(0,0,0,0.2)" }} />
            </div>
          ) : records.length === 0 ? (
            <div className="px-4 py-6 text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
              <Shield size={20} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <p style={{ fontSize: 12 }}>Nessun sign-off registrato</p>
            </div>
          ) : (
            records.map(r => <RecordRow key={r.id} rec={r} />)
          )}
        </div>
      )}
    </div>
  );
}
