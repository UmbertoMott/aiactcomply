"use client";
// IntegrityRegisterView — Vista read-only dei sigilli di integrità (Bucket B).
// Art. 12/19/26(6): log automatici senza firmatario.

import React, { useEffect, useState, useTransition } from "react";
import {
  Lock, Hash, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Loader2, RefreshCw,
} from "lucide-react";
import type { IntegritySeal } from "@/lib/signoff/signoff-types";
import { getIntegritySealRegister, verifySealChain, type ChainVerifyResult } from "@/lib/signoff/register";

function shortHash(h: string) { return h.slice(0, 14) + "…"; }
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString("it-IT"); } catch { return iso; }
}

function SealRow({ seal }: { seal: IntegritySeal }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-black/[0.015] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#0D1016" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
              {seal.toolKey}
            </span>
            <span className="text-[11px]" style={{ color: "#0D1016" }}>
              Batch: {seal.logRef}
            </span>
            {seal.qualifiedTimestamp && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                background: "rgba(35,64,58,0.08)", color: "#0D1016",
              }}>TSQ</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Hash className="h-3 w-3" style={{ color: "#0D1016" }} />
            <span className="text-[11px] font-mono" style={{ color: "#0D1016" }}>
              {shortHash(seal.contentHash)}
            </span>
            <span className="text-[11px]" style={{ color: "#0D1016" }}>·</span>
            <span className="text-[11px]" style={{ color: "#0D1016" }}>
              {fmtDate(seal.sealedAt)}
            </span>
            <span className="text-[11px]" style={{ color: "#0D1016" }}>·</span>
            <span className="text-[11px]" style={{ color: "#b45309" }}>
              retention: {fmtDate(seal.retentionUntil)}
            </span>
          </div>
        </div>
        <div style={{ color: "#0D1016", flexShrink: 0, paddingTop: 2 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 40, paddingRight: 16, paddingBottom: 12, background: "rgba(0,0,0,0.012)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Scope" value={seal.scopeId} />
          <Field label="Sigillato il" value={fmtDate(seal.sealedAt)} />
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Content hash (SHA-256)" value={seal.contentHash} mono />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Seal hash (hash-chain)" value={seal.sealHash} mono />
          </div>
          {seal.prevSealHash && (
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="Hash precedente" value={seal.prevSealHash} mono />
            </div>
          )}
          {seal.qualifiedTimestamp && (
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="TSA" value={`${seal.qualifiedTimestamp.tsa} — ${fmtDate(seal.qualifiedTimestamp.at)}`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 11, color: "#0D1016", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}

interface IntegrityRegisterViewProps {
  scopeId?: string;
}

export function IntegrityRegisterView({ scopeId }: IntegrityRegisterViewProps) {
  const [seals, setSeals] = useState<IntegritySeal[]>([]);
  const [verifyResult, setVerifyResult] = useState<ChainVerifyResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const resolvedScope = scopeId
    ?? (typeof localStorage !== "undefined" ? localStorage.getItem("aicomply_active_project_id") ?? "default" : "default");

  const load = () => {
    startTransition(async () => {
      const data = await getIntegritySealRegister(resolvedScope);
      setSeals(data);
    });
  };

  useEffect(() => {
    if (expanded) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, resolvedScope]);

  const handleVerify = () => {
    startTransition(async () => {
      const result = await verifySealChain(resolvedScope);
      setVerifyResult(result);
    });
  };

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#fff" }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors"
        style={{ background: expanded ? "rgba(0,0,0,0.015)" : "#fff", borderBottom: expanded ? "1px solid rgba(0,0,0,0.08)" : "none" }}
      >
        <Lock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#0D1016" }} />
        <span className="text-[11px] font-medium" style={{ color: "#0D1016" }}>
          Registro Integrità Sigilli (Bucket B)
        </span>
        {seals.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,0.05)", color: "#0D1016" }}>
            {seals.length} sigilli
          </span>
        )}
        <span className="ml-auto" style={{ color: "#0D1016" }}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div>
          {/* Verifica integrità */}
          <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <button
              onClick={load}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#0D1016", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
            >
              <RefreshCw size={12} /> Aggiorna
            </button>
            <button
              onClick={handleVerify}
              disabled={isPending}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50 ml-auto"
              style={{ background: "#0D1016", color: "#fff" }}
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Hash size={11} />}
              Verifica integrità
            </button>
            {verifyResult && (
              <div className="flex items-center gap-1.5 text-[11px]"
                style={{ color: verifyResult.ok ? "#15803d" : "#dc2626" }}>
                {verifyResult.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {verifyResult.details}
              </div>
            )}
          </div>

          {isPending && seals.length === 0 ? (
            <div className="px-4 py-6 flex justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: "rgba(0,0,0,0.2)" }} />
            </div>
          ) : seals.length === 0 ? (
            <div className="px-4 py-6 text-center" style={{ color: "#0D1016" }}>
              <Lock size={20} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Nessun sigillo registrato</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>I sigilli vengono creati alla finalizzazione dei batch di log.</p>
            </div>
          ) : (
            seals.map(s => <SealRow key={s.id} seal={s} />)
          )}
        </div>
      )}
    </div>
  );
}
