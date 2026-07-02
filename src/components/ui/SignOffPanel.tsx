"use client";
// SignOffPanel v2 — eIDAS SES + registro hash-chain + innesto QTSP
// Bucket A: documenti soggetti ad accountability/firma (Art. 11, 17, 18, 22, 47, All. V/VII)
// Backward compat: toolKey + toolLabel sono sufficienti (document opzionale).

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { CheckCircle2, Shield, Hash, Clock, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { hashObject } from "@/lib/signoff/hash";
import { retentionDate, getToolConfig } from "@/lib/signoff/signoff-types";
import type { SignOffRecord, Signer } from "@/lib/signoff/signoff-types";
import { appendSignOff } from "@/lib/signoff/register";
import { getTrustService } from "@/lib/signoff/trust-service";

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

function shortHash(h: string) { return h.slice(0, 12) + "…"; }

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString("it-IT"); } catch { return iso; }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SignOffPanelProps {
  toolKey: string;
  toolLabel: string;
  /** Documento corrente per calcolare contentHash. Se omesso: hash vuoto generico. */
  document?: unknown;
  /** Versione del documento (tag o hash breve). Default: "live". */
  documentVersion?: string;
  /** Scope ID (project ID o org ID) per il registro. Default: localStorage key. */
  scopeId?: string;
  /** Callback chiamato dopo firma riuscita. */
  onSignOff?: (record: SignOffRecord) => void;
}

// ─── Stato persistito (localStorage — cache working copy) ────────────────────

const CACHE_PREFIX = "aicomply_signoff_v2_";

function loadCached(toolKey: string): SignOffRecord | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + toolKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCache(toolKey: string, record: SignOffRecord) {
  try { localStorage.setItem(CACHE_PREFIX + toolKey, JSON.stringify(record)); } catch { /**/ }
}

function getScopeId(): string {
  try { return localStorage.getItem("aicomply_active_project_id") ?? "default"; } catch { return "default"; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignOffPanel({
  toolKey, toolLabel, document: doc, documentVersion = "live", scopeId, onSignOff,
}: SignOffPanelProps) {
  const config = getToolConfig(toolKey);

  const [record, setRecord] = useState<SignOffRecord | null>(null);
  const [contentHash, setContentHash] = useState<string>("");
  const [name, setName]     = useState("");
  const [role, setRole]     = useState("");
  const [email, setEmail]   = useState("");
  const [onBehalf, setOnBehalf] = useState("");
  const [notes, setNotes]   = useState("");
  const [error, setError]   = useState("");
  const [isPending, startTransition] = useTransition();

  // Carica record dal cache all'avvio
  useEffect(() => {
    const cached = loadCached(toolKey);
    if (cached) setRecord(cached);
  }, [toolKey]);

  // Calcola contentHash quando il documento cambia
  useEffect(() => {
    if (!doc) {
      setContentHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"); // SHA-256("")
      return;
    }
    hashObject(doc).then(setContentHash).catch(() => {});
  }, [doc]);

  const resolvedScopeId = scopeId ?? getScopeId();

  const handleSignOff = useCallback(() => {
    if (!name.trim() || !role.trim()) {
      setError("Nome e ruolo sono obbligatori.");
      return;
    }
    if (config?.requiresOnBehalf && !onBehalf.trim()) {
      setError("Il campo \"Per conto di\" è obbligatorio per questo documento (Allegato V §8).");
      return;
    }
    setError("");

    startTransition(async () => {
      const ts = getTrustService();
      const signedAt = new Date().toISOString();
      const signer: Signer = {
        name: name.trim(),
        role: role.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(onBehalf.trim() ? { onBehalf: onBehalf.trim() } : {}),
      };

      // Tenta marca temporale qualificata (noop al livello base)
      const qualifiedTimestamp = await ts.qualifiedTimestamp(contentHash).catch(() => null);

      const partial = {
        id:              crypto.randomUUID(),
        toolKey,
        scopeId:         resolvedScopeId,
        documentVersion,
        contentHash,
        signer,
        signedAt,
        signatureLevel:  "ses" as const,
        qualifiedTimestamp: qualifiedTimestamp ?? undefined,
        legalRef:        config?.legalRef ?? "AI Act",
        retentionUntil:  retentionDate(signedAt, 10),
      };

      const result = await appendSignOff(partial);
      if (!result.ok || !result.record) {
        setError(result.error ?? "Errore durante la firma. Riprova.");
        return;
      }

      saveCache(toolKey, result.record);
      setRecord(result.record);
      onSignOff?.(result.record);
    });
  }, [name, role, email, onBehalf, contentHash, toolKey, documentVersion, resolvedScopeId, config, onSignOff]);

  // ── Stato: già firmato ────────────────────────────────────────────────────
  if (record) {
    return (
      <div style={{
        border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px",
        padding: "16px", marginTop: "24px",
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-3.5 w-3.5" style={{ color: "#23403a" }} />
          <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
            Firma del revisore
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
            background: "rgba(35,64,58,0.08)", color: "#23403a",
            border: "1px solid rgba(35,64,58,0.18)",
          }}>
            {record.signatureLevel.toUpperCase()}
            {record.qualifiedTimestamp && " + TSQ"}
          </span>
        </div>

        <div className="rounded-lg p-3" style={{
          border: "1px solid rgba(22,163,74,0.2)",
          background: "rgba(22,163,74,0.04)",
        }}>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#15803d" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium" style={{ color: "#15803d" }}>
                Firmato da {record.signer.name} · {record.signer.role}
                {record.signer.onBehalf && ` · per conto di ${record.signer.onBehalf}`}
              </p>
              <div className="flex items-center gap-1.5 mt-1" style={{ color: "rgba(0,0,0,0.38)" }}>
                <Clock className="h-3 w-3" />
                <span className="text-[10px]">{formatDate(record.signedAt)}</span>
                <span className="text-[10px]">·</span>
                <span className="text-[10px]">conserva fino a {formatDate(record.retentionUntil)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Hash className="h-3 w-3" style={{ color: "rgba(0,0,0,0.25)" }} />
                <span className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.35)" }}>
                  {shortHash(record.contentHash)}
                </span>
                <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.25)" }}>·</span>
                <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                  {record.legalRef}
                </span>
              </div>
              {record.qualifiedTimestamp && (
                <p className="text-[10px] mt-1" style={{ color: "#23403a" }}>
                  ✦ Marca temporale qualificata · TSA: {record.qualifiedTimestamp.tsa}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Stato: form ───────────────────────────────────────────────────────────
  return (
    <div style={{
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px",
      padding: "16px", marginTop: "24px",
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.4)" }} />
        <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
          Firma del revisore
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
          background: "rgba(202,138,4,0.08)", color: "#92400e",
          border: "1px solid rgba(202,138,4,0.2)",
        }}>
          Richiesto per audit
        </span>
        {config?.qtspRecommended && (
          <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{
            background: "rgba(35,64,58,0.06)", color: "#23403a",
            border: "1px solid rgba(35,64,58,0.15)",
          }}>
            <Sparkles className="h-2.5 w-2.5" />
            QTSP raccomandato
          </span>
        )}
      </div>

      {/* Hash documento */}
      <div className="mb-3 p-2.5 rounded-lg flex items-start gap-2" style={{
        background: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.07)",
      }}>
        <Hash className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />
        <div>
          <p className="text-[10px] font-medium mb-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
            Hash documento · {documentVersion}
          </p>
          <p className="text-[11px] font-mono" style={{ color: "rgba(0,0,0,0.5)" }}>
            {contentHash ? shortHash(contentHash) : "…calcolo in corso"}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Sparkles className="h-2.5 w-2.5" style={{ color: "rgba(0,0,0,0.25)" }} />
            <span className="text-[9px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              ✦ AI — l'hash verifica che il documento non sia stato modificato dopo la firma
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Nome */}
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
            Nome e Cognome *
          </label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="es. Mario Rossi" style={inputStyle} />
        </div>

        {/* Ruolo */}
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
            Ruolo / Qualifica *
          </label>
          <input value={role} onChange={e => setRole(e.target.value)}
            placeholder="es. DPO, CTO, Legal Counsel, Quality Manager" style={inputStyle} />
        </div>

        {/* Email opzionale */}
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
            Email <span style={{ fontWeight: 400, opacity: 0.6 }}>(opzionale)</span>
          </label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            placeholder="es. mario.rossi@azienda.it" style={inputStyle} />
        </div>

        {/* Per conto di — All. V §8 (solo per declaration_art47 / authorized_rep) */}
        {(config?.requiresOnBehalf || toolKey === "declaration_art47" || toolKey === "authorized_rep_art22") && (
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
              Per conto di {config?.requiresOnBehalf && <span style={{ color: "#dc2626" }}>*</span>}
              <span style={{ fontWeight: 400, fontSize: 9, marginLeft: 4, opacity: 0.5 }}>
                (Allegato V §8 AI Act)
              </span>
            </label>
            <input value={onBehalf} onChange={e => setOnBehalf(e.target.value)}
              placeholder="es. Acme S.r.l., nome del produttore/provider" style={inputStyle} />
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.55)" }}>
            Note di revisione <span style={{ fontWeight: 400, opacity: 0.6 }}>(opzionale)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            maxLength={300} rows={2}
            placeholder="Osservazioni, condizioni, riferimenti normativi aggiuntivi…"
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {/* Riferimento normativo */}
        {config?.legalRef && (
          <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.38)" }}>
            Rif. normativo: <strong>{config.legalRef}</strong>
            {" · "}Livello firma: SES
            {" · "}Conservazione: 10 anni (Art. 18)
          </p>
        )}

        {error && (
          <div className="flex items-start gap-1.5" style={{ color: "#dc2626" }}>
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <p className="text-[11px]">{error}</p>
          </div>
        )}

        <button
          onClick={handleSignOff}
          disabled={isPending || !contentHash}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50"
          style={{ background: "#0D1016", color: "#ffffff" }}
        >
          {isPending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Firma in corso…</>
            : <><CheckCircle2 className="h-3.5 w-3.5" /> Firma e registra — {toolLabel}</>
          }
        </button>
      </div>
    </div>
  );
}
