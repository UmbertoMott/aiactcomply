"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  UserCheck, AlertTriangle, Info, CheckCircle2, Copy, Save,
  Building2, Globe, FileText, ChevronDown, Sparkles, HelpCircle, ExternalLink,
  Shield, X,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { AuthRepResult, EUDBResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import {
  createEmptyDoc, prefillARFromModules,
  generateMandate, loadARRecord, makeChecklist,
  AR_RECORD_KEY,
} from "@/lib/authorized-rep/authorized-rep-types";
import type { AuthRepDoc, AuthorizedRepresentativeRecord, ARChecklistItem } from "@/lib/authorized-rep/authorized-rep-types";
import { useScopedStorage } from "@/lib/hooks/useScopedStorage";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { createDefaultArRecord } from "@/types/authorized-rep";
import type { AuthorizedRepRecord } from "@/types/authorized-rep";
import { DigitalSignaturePad, SignatureConfirmation } from "@/components/authorized-rep/DigitalSignaturePad";
import { validateMandateContent } from "./actions";

// ── Light-theme tokens ───────────────────────────────────────────────────────

const DK = {
  bg:        "#FAFAF9",
  card:      "#ffffff",
  card2:     "#f3f4f6",
  border:    "rgba(0,0,0,0.07)",
  text:      "#0D1016",
  muted:     "rgba(0,0,0,0.40)",
  faint:     "rgba(0,0,0,0.30)",
  indigo:    "#4f46e5",
  indigoBg:  "rgba(99,102,241,0.08)",
  indigoBdr: "rgba(99,102,241,0.15)",
  red:       "#991b1b",
  redBg:     "rgba(239,68,68,0.06)",
  redBdr:    "rgba(239,68,68,0.18)",
  amber:     "#92400e",
  amberBg:   "rgba(251,146,60,0.08)",
  amberBdr:  "rgba(251,146,60,0.25)",
  orange:    "#92400e",
  orangeBg:  "rgba(251,146,60,0.08)",
  orangeBdr: "rgba(251,146,60,0.25)",
  green:     "#15803d",
  greenBg:   "rgba(22,163,74,0.06)",
  greenBdr:  "rgba(22,163,74,0.15)",
  emerald:   "#15803d",
} as const;

const inputDk = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid rgba(0,0,0,0.10)`, fontSize: 12,
  color: DK.text, background: "#f3f4f6", outline: "none",
};

const taDk = { ...inputDk, resize: "vertical" as const };

const cardDk = {
  background: DK.card,
  border: `1px solid ${DK.border}`,
  borderRadius: 12,
};

const EU_MEMBER_STATES_LIST = [
  "Austria","Belgio","Bulgaria","Cipro","Croazia","Danimarca","Estonia","Finlandia",
  "Francia","Germania","Grecia","Irlanda","Italia","Lettonia","Lituania","Lussemburgo",
  "Malta","Paesi Bassi","Polonia","Portogallo","Repubblica Ceca","Romania","Slovacchia",
  "Slovenia","Spagna","Svezia","Ungheria",
];
const EU_SET = new Set(EU_MEMBER_STATES_LIST);

const ALL_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Arabia Saudita","Argentina","Australia","Brasile",
  "Canada","Cina","Corea del Sud","Emirati Arabi","Giappone","India","Indonesia","Israele",
  "Malaysia","Messico","Nigeria","Norvegia","Nuova Zelanda","Pakistan","Regno Unito",
  "Russia","Singapore","Stati Uniti","Sudafrica","Svizzera","Taiwan","Turchia","Ucraina",
  "Vietnam","Altro paese non-UE",
];

// ── Sub-components ───────────────────────────────────────────────────────────

function DkField({ label, article, aiBadge, children, span2 }: {
  label: string; article?: string; aiBadge?: boolean;
  children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <label style={{ fontSize: 11, color: DK.muted, fontWeight: 500 }}>{label}</label>
        {article && (
          <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint, borderRadius: 4,
            padding: "1px 5px", border: `1px solid ${DK.border}`, background: "rgba(0,0,0,0.05)" }}>
            {article}
          </span>
        )}
        {aiBadge && (
          <span style={{ fontSize: 9, fontWeight: 700, color: DK.muted, background: "rgba(0,0,0,0.04)",
            border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px" }}>
            ✦ AI
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function RadioGroupDk({ value, onChange, name }: {
  value: "yes"|"no"|"unsure"|""; onChange: (v: "yes"|"no"|"unsure") => void; name: string;
}) {
  const opts: { v: "yes"|"no"|"unsure"; label: string; color: string; bg: string; bdr: string }[] = [
    { v: "yes",    label: "Sì",         color: DK.green,  bg: DK.greenBg,  bdr: DK.greenBdr  },
    { v: "no",     label: "No",         color: DK.red,    bg: DK.redBg,    bdr: DK.redBdr    },
    { v: "unsure", label: "Non sicuro", color: DK.amber,  bg: DK.amberBg,  bdr: DK.amberBdr  },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map(o => (
        <label key={o.v} style={{
          display: "flex", alignItems: "center", cursor: "pointer", fontSize: 11,
          padding: "4px 10px", borderRadius: 6, fontWeight: 500,
          background: value === o.v ? o.bg : "transparent",
          color: value === o.v ? o.color : DK.faint,
          border: `1px solid ${value === o.v ? o.bdr : DK.border}`,
          transition: "all 0.12s",
        }}>
          <input type="radio" name={name} value={o.v} checked={value === o.v}
            onChange={() => onChange(o.v)} style={{ display: "none" }} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function ChecklistRowDk({ item, eudbResult, docuGenCompleted, onChange }: {
  item: ARChecklistItem;
  eudbResult: EUDBResult | null;
  docuGenCompleted: boolean;
  onChange: (u: ARChecklistItem) => void;
}) {
  const [open, setOpen] = useState(false);

  const statusColor = item.completed ? DK.green : item.notes ? DK.amber : DK.faint;
  const statusBg    = item.completed ? DK.greenBg : item.notes ? DK.amberBg : "transparent";
  const statusBdr   = item.completed ? DK.greenBdr : item.notes ? DK.amberBdr : DK.border;

  return (
    <div style={{ border: `1px solid ${statusBdr}`, borderRadius: 8,
      background: statusBg, overflow: "hidden", transition: "all 0.15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <input type="checkbox" checked={item.completed}
          onChange={e => { e.stopPropagation(); onChange({ ...item, completed: e.target.checked }); }}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: DK.green, flexShrink: 0, width: 14, height: 14 }} />
        <span style={{ flex: 1, fontSize: 12, color: item.completed ? DK.green : DK.text, fontWeight: 500 }}>
          {item.label}
        </span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint,
          border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px",
          background: "rgba(0,0,0,0.05)", flexShrink: 0, marginRight: 4 }}>
          {item.article}
        </span>
        <ChevronDown size={12} style={{ color: DK.muted, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </div>

      {open && (
        <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${DK.border}`,
          paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Special EUDB item */}
          {item.id === "eudb" && (
            <div>
              {eudbResult?.registration_number ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  borderRadius: 6, background: DK.greenBg, border: `1px solid ${DK.greenBdr}` }}>
                  <CheckCircle2 size={12} style={{ color: DK.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: DK.green }}>
                    Numero registrazione: {eudbResult.registration_number}
                  </span>
                  <Link href="/dashboard/compliance-ops/eudb"
                    style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
                      fontSize: 10, color: DK.muted, textDecoration: "none" }}>
                    Apri EUDB <ExternalLink size={9} />
                  </Link>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 11, color: DK.muted, display: "block", marginBottom: 4 }}>
                    Numero registrazione EUDB
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...inputDk, maxWidth: 300 }} value={item.evidenceValue}
                      onChange={e => onChange({ ...item, evidenceValue: e.target.value })}
                      placeholder="Es. EU-AIDB-2025-XXXXXX" />
                    <Link href="/dashboard/compliance-ops/eudb"
                      style={{ display: "flex", alignItems: "center", gap: 4,
                        fontSize: 10, color: DK.muted, textDecoration: "none",
                        padding: "4px 10px", borderRadius: 6,
                        border: `1px solid ${DK.border}`, background: "rgba(0,0,0,0.04)",
                        whiteSpace: "nowrap" }}>
                      Apri wizard EUDB <ExternalLink size={9} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Special doc_technical item */}
          {item.id === "doc_technical" && (
            <div style={{ padding: "6px 10px", borderRadius: 6,
              background: docuGenCompleted ? DK.greenBg : DK.amberBg,
              border: `1px solid ${docuGenCompleted ? DK.greenBdr : DK.amberBdr}` }}>
              {docuGenCompleted ? (
                <span style={{ fontSize: 11, color: DK.green }}>
                  ✓ Disponibile — Kit Art. 50 completato in DocuGen
                </span>
              ) : (
                <span style={{ fontSize: 11, color: DK.amber }}>
                  ⚠ Kit Art. 50 non ancora completato —{" "}
                  <Link href="/dashboard/tools/docugen" style={{ color: DK.amber }}>
                    Completa in DocuGen AI
                  </Link>
                </span>
              )}
            </div>
          )}

          {/* Evidence field (general) */}
          {item.evidenceLabel && item.id !== "eudb" && (
            <div>
              <label style={{ fontSize: 11, color: DK.muted, display: "block", marginBottom: 4 }}>
                Evidenza: {item.evidenceLabel}
              </label>
              <input style={{ ...inputDk, maxWidth: 340 }} value={item.evidenceValue}
                onChange={e => onChange({ ...item, evidenceValue: e.target.value })}
                placeholder="Inserisci evidenza..." />
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: DK.muted, display: "block", marginBottom: 4 }}>Note</label>
            <textarea style={{ ...taDk, minHeight: 52 }} value={item.notes}
              onChange={e => onChange({ ...item, notes: e.target.value })}
              placeholder="Note aggiuntive..." />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AuthorizedRepCompliancePage() {
  const [doc, setDoc] = useScopedStorage<AuthRepDoc>("auth_rep_draft", createEmptyDoc());
  const [arRecord, setArRecord] = useScopedStorage<AuthorizedRepRecord>(
    "authorized_rep_record",
    createDefaultArRecord()
  );
  const [copied, setCopied] = useState(false);
  const [mandateConfirmed, setMandateConfirmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [arRecordSource, setArRecordSource] = useState<AuthorizedRepresentativeRecord | null>(null);
  const [prefillCount, setPrefillCount] = useState(0);
  const [showPrefillDetail, setShowPrefillDetail] = useState(false);
  const [prefillSrc, setPrefillSrc] = useState<AuthRepDoc["prefillSources"] | null>(null);
  const [validatingMandate, setValidatingMandate] = useState(false);

  // Cross-module data
  const [eudbResult, setEudbResult] = useState<EUDBResult | null>(null);
  const [docuGenCompleted, setDocuGenCompleted] = useState(false);
  const [docGateBannerDismissed, setDocGateBannerDismissed] = useState(false);

  useEffect(() => {
    // Load EUDB result
    const eudb = readFromStorage<EUDBResult>("eudb");
    if (eudb) setEudbResult(eudb);

    // Check DocuGen completion
    try {
      const docu = localStorage.getItem("aicomply_docugen_record");
      if (docu) {
        const d = JSON.parse(docu) as Record<string, unknown>;
        setDocuGenCompleted(Boolean(d.art50_completed ?? d.completedAt));
      }
    } catch { /* silent */ }

    // Check shared AR record (set by EUDB)
    const arRec = loadARRecord();
    if (arRec?.updatedBy === "eudb-tool") setArRecordSource(arRec);

    // Auto-prefill
    const result = prefillARFromModules();
    setPrefillCount(result.prefillCount);
    setPrefillSrc(result.sources);

    if (result.prefillCount > 0) {
      setDoc(prev => {
        const next = { ...prev };
        // Eligibility
        if (result.eligibility.provider_non_eu !== null && !prev.eligibility.provider_non_eu) {
          next.eligibility = {
            ...prev.eligibility,
            provider_non_eu: result.eligibility.provider_non_eu ? "yes" : "no",
          };
        }
        if (result.eligibility.high_risk !== null && !prev.eligibility.high_risk) {
          next.eligibility = {
            ...next.eligibility,
            high_risk: result.eligibility.high_risk ? "yes" : "no",
          };
        }
        // Provider — non-destructive
        if (result.provider.provider_name    && !prev.provider_name)           next.provider_name           = result.provider.provider_name;
        if (result.provider.provider_country && !prev.provider_country)        next.provider_country        = result.provider.provider_country;
        if (result.provider.provider_address && !prev.provider_address)        next.provider_address        = result.provider.provider_address;
        if (result.provider.provider_contact_email && !prev.provider_contact_email) next.provider_contact_email = result.provider.provider_contact_email;
        // System — non-destructive
        if (result.system.system_name    && !prev.system_name)    next.system_name    = result.system.system_name;
        if (result.system.system_version && !prev.system_version) next.system_version = result.system.system_version;
        if (result.system.annex_reference && !prev.annex_reference) next.annex_reference = result.system.annex_reference;
        // Sources
        next.prefillSources = result.sources;
        next.aiConfirmed = false;
        return next;
      });
    }

    // Load AR from shared record if AR columns are empty
    if (arRec) {
      setDoc(prev => {
        if (prev.representative.ar_name) return prev; // don't overwrite existing
        return { ...prev, representative: arRec };
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(updater: (prev: AuthRepDoc) => AuthRepDoc) {
    setDoc(prev => updater(prev));
  }
  function patchP<K extends keyof AuthRepDoc>(field: K, val: AuthRepDoc[K]) {
    patch(d => ({ ...d, [field]: val, aiConfirmed: false }));
  }
  function patchRep(field: keyof AuthorizedRepresentativeRecord, val: string) {
    patch(d => ({
      ...d, aiConfirmed: false,
      representative: { ...d.representative, [field]: val,
        updatedAt: new Date().toISOString(), updatedBy: "authorized-rep-tool" as const },
    }));
    // Write to shared AR_RECORD_KEY
    try {
      const cur = loadARRecord() ?? {} as Partial<AuthorizedRepresentativeRecord>;
      localStorage.setItem(AR_RECORD_KEY, JSON.stringify({
        ...cur, [field]: val,
        updatedAt: new Date().toISOString(), updatedBy: "authorized-rep-tool",
      }));
    } catch { /* silent */ }
  }
  function patchChecklist(id: string, updated: ARChecklistItem) {
    patch(d => ({ ...d, checklist: d.checklist.map(i => i.id === id ? updated : i) }));
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function handleValidateMandate() {
    const text = generateMandate(doc);
    if (text.length < 50) { showToast("Genera prima il testo del mandato"); return; }
    setValidatingMandate(true);
    try {
      const result = await validateMandateContent(text);
      setArRecord(prev => ({
        ...prev,
        mandateValidationStatus: result.status,
        mandateValidationIssues: result.missingDuties,
        updatedAt: new Date().toISOString(),
      }));
      if (result.status === "valid") showToast("✓ Tutti i compiti obbligatori presenti");
    } catch {
      showToast("Errore durante la validazione", );
    } finally {
      setValidatingMandate(false);
    }
  }

  function handleSign(sig: import("@/types/authorized-rep").DigitalSignature) {
    setArRecord(prev => ({
      ...prev,
      signature: sig,
      signatureStatus: "signed",
      updatedAt: new Date().toISOString(),
    }));
    showToast("✓ Mandato firmato digitalmente");
  }

  function handleRevoke() {
    setArRecord(prev => ({
      ...prev,
      signature: undefined,
      signatureStatus: "revoked",
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleSave() {
    // If mandate signed, signal to AI Inventory
    if (doc.mandate_signed) {
      try {
        const inv = localStorage.getItem("aicomply_ai_inventory");
        if (inv) {
          const systems = JSON.parse(inv) as Record<string, unknown>[];
          const updated = systems.map((s: Record<string, unknown>) => ({ ...s, has_authorized_rep: true }));
          localStorage.setItem("aicomply_ai_inventory", JSON.stringify(updated));
        }
      } catch { /* silent */ }
    }
    writeToStorage<AuthRepResult>("authorizedRep", {
      provider_name: doc.provider_name,
      provider_country: doc.provider_country,
      ar_name: doc.representative.ar_name,
      ar_country: doc.representative.ar_country,
      system_name: doc.system_name,
      mandate_signed: doc.mandate_signed,
      eudb_registered_by_ar: doc.eudb_registered_by_ar,
      completedAt: new Date().toISOString(),
    });
    showToast("Salvato nel dossier ✓");
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateMandate(doc)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Eligibility logic ────────────────────────────────────────────────────

  const { provider_non_eu, high_risk } = doc.eligibility;
  const eligComplete = provider_non_eu !== "" && high_risk !== "";
  const showForms = eligComplete &&
    (provider_non_eu === "yes" || provider_non_eu === "unsure") &&
    (high_risk === "yes" || high_risk === "unsure");

  type BannerKind = "required" | "not_required" | "unsure" | null;
  let bannerKind: BannerKind = null;
  if (eligComplete) {
    if (provider_non_eu === "no") bannerKind = "not_required";
    else if (provider_non_eu === "yes" && high_risk === "yes") bannerKind = "required";
    else bannerKind = "unsure";
  }

  const arCountryInvalid = doc.representative.ar_country !== "" && !EU_SET.has(doc.representative.ar_country);
  const doneCount = doc.checklist.filter(i => i.completed).length;

  const syncBadge = arRecordSource
    ? `✦ Sincronizzato da EUDB il ${new Date(arRecordSource.updatedAt).toLocaleDateString("it-IT")}`
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: "100%" }}>
      <SystemSelector checkProhibited={false} />

      {/* DocuGen gate banner — PROMPT BG */}
      {!docuGenCompleted && !docGateBannerDismissed && (
        <div style={{ borderRadius: 10, border: `1px solid ${DK.amberBdr}`, background: DK.amberBg,
          padding: 16, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={14} style={{ color: DK.amber, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: DK.amber, margin: "0 0 4px" }}>
              Documentazione tecnica incompleta
            </p>
            <p style={{ fontSize: 11, color: DK.text, margin: "0 0 6px", lineHeight: 1.5 }}>
              Il mandato di Rappresentante Autorizzato richiede che la documentazione tecnica
              (Allegato IV) sia completata al 100% prima di procedere.
              Il mandatario deve poter ricevere e conservare tale documentazione.
            </p>
            <Link href="/dashboard/tools/docugen"
              style={{ fontSize: 11, color: DK.muted, display: "inline-flex", alignItems: "center", gap: 4 }}>
              → Vai a DocuGen AI per completare la documentazione
              <span style={{ fontFamily: "monospace", fontSize: 9, color: DK.faint }}>Art. 11</span>
            </Link>
          </div>
          <button
            onClick={() => setDocGateBannerDismissed(true)}
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 2, color: DK.amber, opacity: 0.6, lineHeight: 1, display: "flex", alignItems: "center" }}
            aria-label="Chiudi"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <UserCheck size={16} style={{ color: DK.muted }} />
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.5px", color: DK.text, margin: 0 }}>
            Authorized Representative
          </h1>
          <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 10,
            background: "rgba(0,0,0,0.04)", color: DK.muted, border: `1px solid ${DK.border}` }}>
            Art. 22
          </span>
        </div>
        <p style={{ fontSize: 12, color: DK.muted, margin: 0 }}>
          Nomina dell&apos;Authorized Representative per provider non-UE — Reg. (UE) 2024/1689
        </p>
      </div>

      {/* AI disclaimer */}
      <div style={{ ...cardDk, padding: "10px 14px", marginBottom: 16,
        background: "rgba(0,0,0,0.04)", border: `1px solid ${DK.border}` }}>
        <p style={{ fontSize: 11, color: DK.muted, margin: 0 }}>
          ✦ AI — verifica e conferma: condizioni di applicabilità Art. 22(1), elenco poteri conferiti Art. 22(2)(a)-(f) e testo del mandato generato sono ricostruiti dalla memoria del modello. Validare contro testo consolidato Art. 22 Reg. (UE) 2024/1689 prima della firma del mandato. Durata minima conservazione mandato dichiarata: 10 anni.
        </p>
      </div>

      {/* ── Sezione 1 — Verifica applicabilità ─────────────────────────────── */}

      <div style={{ ...cardDk, padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
          <Info size={13} style={{ color: DK.muted }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: DK.text, margin: 0 }}>Sezione 1 — Verifica applicabilità</p>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint, border: `1px solid ${DK.border}`,
            borderRadius: 4, padding: "1px 5px", background: "rgba(0,0,0,0.05)" }}>
            Art. 22(1)
          </span>
        </div>

        {prefillCount > 0 && (
          <div style={{ ...cardDk, padding: "10px 14px", marginBottom: 14,
            background: "rgba(0,0,0,0.04)", border: `1px solid ${DK.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={13} style={{ color: DK.muted, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: DK.muted, fontWeight: 600, margin: 0, flex: 1 }}>
                ✦ AI ha precompilato {prefillCount} campi da Triage e AI Inventory. Verifica e conferma.
              </p>
              <button onClick={() => setShowPrefillDetail(v => !v)}
                style={{ fontSize: 10, color: DK.muted, background: "none", border: "none",
                  cursor: "pointer", textDecoration: "underline" }}>
                {showPrefillDetail ? "Nascondi" : "Mostra fonti"}
              </button>
            </div>
            {showPrefillDetail && (
              <ul style={{ fontSize: 10, color: DK.muted, margin: "8px 0 0", padding: "0 0 0 20px" }}>
                {prefillSrc?.applicability === "triage" && <li>Applicabilità: da Triage (riskTier + paese)</li>}
                {prefillSrc?.provider === "ai_inventory" && <li>Dati provider: da AI Inventory / profilo azienda</li>}
                {prefillSrc?.system === "risk_manager_docugen" && <li>Dati sistema: da DocuGen e Risk Manager</li>}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Q1 */}
          <div style={{ ...cardDk, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: DK.faint, fontWeight: 600 }}>Q1</span>
                  {prefillSrc?.applicability === "triage" && doc.eligibility.provider_non_eu && (
                    <span style={{ fontSize: 9, color: DK.muted, background: "rgba(0,0,0,0.04)",
                      border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                      ✦ AI — Precompilato dal profilo azienda
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: DK.text, fontWeight: 500, margin: 0 }}>
                  Il provider del sistema è stabilito al di fuori dell&apos;Unione Europea?
                </p>
              </div>
              <RadioGroupDk value={doc.eligibility.provider_non_eu}
                onChange={v => patch(d => ({ ...d, eligibility: { ...d.eligibility, provider_non_eu: v } }))}
                name="provider_non_eu" />
            </div>
          </div>

          {/* Q2 */}
          <div style={{ ...cardDk, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: DK.faint, fontWeight: 600 }}>Q2</span>
                  {prefillSrc?.applicability === "triage" && doc.eligibility.high_risk && (
                    <span style={{ fontSize: 9, color: DK.muted, background: "rgba(0,0,0,0.04)",
                      border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                      ✦ AI — Precompilato da Triage: classificazione rilevata
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: DK.text, fontWeight: 500, margin: 0 }}>
                  Il sistema AI è classificato come alto rischio (Annex III) o GPAI con rischio sistemico?
                </p>
                <p style={{ fontSize: 11, color: DK.muted, margin: "4px 0 0" }}>
                  Art. 22(1) — si applica ai tier high_risk e gpai_systemic.
                </p>
              </div>
              <RadioGroupDk value={doc.eligibility.high_risk}
                onChange={v => patch(d => ({ ...d, eligibility: { ...d.eligibility, high_risk: v } }))}
                name="high_risk" />
            </div>
          </div>
        </div>

        {/* Banners */}
        {bannerKind === "required" && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8,
            background: DK.orangeBg, border: `1px solid ${DK.orangeBdr}`,
            borderLeft: `4px solid ${DK.orange}`,
            display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} style={{ color: DK.orange, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: DK.orange, fontWeight: 500, margin: 0 }}>
              Authorized Representative obbligatorio — compila il mandato nelle sezioni sottostanti (Art. 22(1))
            </p>
          </div>
        )}
        {bannerKind === "not_required" && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8,
            background: "rgba(0,0,0,0.03)", border: `1px solid rgba(0,0,0,0.08)`,
            borderLeft: `4px solid ${DK.faint}`,
            display: "flex", alignItems: "center", gap: 8 }}>
            <Info size={14} style={{ color: DK.muted, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: DK.muted, margin: 0 }}>
              Art. 22 non applicabile — il provider è stabilito nell&apos;UE.{" "}
              <Link href="/dashboard/compliance-ops/eudb" style={{ color: DK.muted }}>
                Vai alla Registrazione EUDB →
              </Link>
            </p>
          </div>
        )}
        {bannerKind === "unsure" && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8,
            background: DK.amberBg, border: `1px solid ${DK.amberBdr}`,
            borderLeft: `4px solid ${DK.amber}`,
            display: "flex", alignItems: "center", gap: 8 }}>
            <HelpCircle size={14} style={{ color: DK.amber, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: DK.amber, margin: 0 }}>
              Situazione incerta — consulta il{" "}
              <Link href="/dashboard/tools/legal-assistant" style={{ color: DK.amber }}>Legal Assistant</Link>
              {" "}con il contesto del sistema.
            </p>
          </div>
        )}
      </div>

      {/* ── Sezioni 2 & 3 ───────────────────────────────────────────────────── */}

      {showForms && (
        <fieldset disabled={!docuGenCompleted} style={{ border: "none", padding: 0, margin: 0 }}>
        <>
          {/* Sezione 2 */}
          <div style={{ ...cardDk, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
              <Building2 size={13} style={{ color: DK.muted }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: DK.text, margin: 0 }}>
                Sezione 2 — Dati provider estero + AR designato
              </p>
            </div>

            {/* Prefill banner for provider */}
            {prefillSrc?.provider === "ai_inventory" && (
              <div style={{ ...cardDk, padding: "8px 14px", marginBottom: 16,
                background: "rgba(0,0,0,0.04)", border: `1px solid ${DK.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={12} style={{ color: DK.muted, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: DK.muted, margin: 0 }}>
                    ✦ AI — Colonna Provider precompilata da AI Inventory / profilo azienda. Verifica e conferma.
                  </p>
                </div>
              </div>
            )}

            {/* AR country invalid — banner bloccante sopra Sezione 3 */}
            {arCountryInvalid && (
              <div style={{ ...cardDk, padding: "10px 14px", marginBottom: 16,
                background: DK.redBg, border: `1px solid ${DK.redBdr}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={13} style={{ color: DK.red, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: DK.red, margin: 0 }}>
                    L&apos;Authorized Representative deve essere stabilito in uno Stato Membro dell&apos;UE (Art. 22(1)). Il paese attualmente selezionato blocca la generazione del mandato.
                  </p>
                </div>
              </div>
            )}

            {/* Two-column grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, position: "relative" }}>
              {/* Left — Provider */}
              <div style={{ paddingRight: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <Building2 size={11} style={{ color: DK.muted }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: DK.muted,
                    textTransform: "uppercase", letterSpacing: "0.6px", margin: 0 }}>
                    Provider (mandante)
                  </p>
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint, border: `1px solid ${DK.border}`,
                    borderRadius: 4, padding: "1px 5px", background: "rgba(0,0,0,0.05)" }}>
                    Art. 22(1)
                  </span>
                  {prefillSrc?.provider === "ai_inventory" && (
                    <span style={{ fontSize: 9, color: DK.muted, background: "rgba(0,0,0,0.04)",
                      border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                      ✦ AI
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <DkField label="Ragione sociale *" aiBadge={prefillSrc?.provider === "ai_inventory" && !!doc.provider_name}>
                    <input style={inputDk} value={doc.provider_name}
                      onChange={e => patchP("provider_name", e.target.value)}
                      placeholder="Es. Acme AI Corp" />
                  </DkField>
                  <DkField label="Paese di stabilimento *" aiBadge={prefillSrc?.provider === "ai_inventory" && !!doc.provider_country}>
                    <select style={inputDk} value={doc.provider_country}
                      onChange={e => patchP("provider_country", e.target.value)}>
                      <option value="">Seleziona paese...</option>
                      {ALL_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </DkField>
                  <DkField label="Indirizzo *" aiBadge={prefillSrc?.provider === "ai_inventory" && !!doc.provider_address}>
                    <input style={inputDk} value={doc.provider_address}
                      onChange={e => patchP("provider_address", e.target.value)}
                      placeholder="123 Main St, New York, NY 10001" />
                  </DkField>
                  <DkField label="Email di contatto *" aiBadge={prefillSrc?.provider === "ai_inventory" && !!doc.provider_contact_email}>
                    <input style={inputDk} type="email" value={doc.provider_contact_email}
                      onChange={e => patchP("provider_contact_email", e.target.value)}
                      placeholder="legal@acme.com" />
                  </DkField>
                </div>
              </div>

              {/* Separator */}
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0,
                width: 1, background: DK.border }} />

              {/* Right — AR */}
              <div style={{ paddingLeft: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <UserCheck size={11} style={{ color: DK.muted }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: DK.muted,
                    textTransform: "uppercase", letterSpacing: "0.6px", margin: 0 }}>
                    Authorized Representative
                  </p>
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint, border: `1px solid ${DK.border}`,
                    borderRadius: 4, padding: "1px 5px", background: "rgba(0,0,0,0.05)" }}>
                    Art. 22(1)+(3)
                  </span>
                  {syncBadge && (
                    <span title={`Ultima modifica: ${arRecordSource?.updatedAt}`}
                      style={{ fontSize: 9, color: DK.muted, background: "rgba(0,0,0,0.04)",
                        border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 6px",
                        fontWeight: 600, cursor: "help" }}>
                      {syncBadge}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <DkField label="Ragione sociale AR *">
                    <input style={inputDk} value={doc.representative.ar_name}
                      onChange={e => patchRep("ar_name", e.target.value)}
                      placeholder="Es. EU Compliance Services S.r.l." />
                  </DkField>
                  <DkField label="Paese AR (deve essere SM UE) *" article="Art. 22(1)">
                    <select style={{ ...inputDk, borderColor: arCountryInvalid ? DK.red : DK.border,
                      background: arCountryInvalid ? "rgba(248,113,113,0.06)" : "#f3f4f6" }}
                      value={doc.representative.ar_country}
                      onChange={e => patchRep("ar_country", e.target.value)}>
                      <option value="">Seleziona paese UE...</option>
                      {EU_MEMBER_STATES_LIST.map(c => <option key={c}>{c}</option>)}
                      <optgroup label="Fuori UE (non valido)">
                        {ALL_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </optgroup>
                    </select>
                    {arCountryInvalid && (
                      <p style={{ fontSize: 11, color: DK.red, margin: "4px 0 0",
                        display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={11} />
                        L&apos;AR deve essere in uno SM UE (Art. 22(1))
                      </p>
                    )}
                  </DkField>
                  <DkField label="Indirizzo AR *">
                    <input style={inputDk} value={doc.representative.ar_address}
                      onChange={e => patchRep("ar_address", e.target.value)}
                      placeholder="Via Roma 1, 00100 Roma" />
                  </DkField>
                  <DkField label="Nome referente AR *">
                    <input style={inputDk} value={doc.representative.ar_contact_name}
                      onChange={e => patchRep("ar_contact_name", e.target.value)}
                      placeholder="Mario Rossi" />
                  </DkField>
                  <DkField label="Email AR *">
                    <input style={inputDk} type="email" value={doc.representative.ar_contact_email}
                      onChange={e => patchRep("ar_contact_email", e.target.value)}
                      placeholder="ar@eucomplianceservices.it" />
                  </DkField>
                  <DkField label="Telefono AR">
                    <input style={inputDk} value={doc.representative.ar_contact_phone}
                      onChange={e => patchRep("ar_contact_phone", e.target.value)}
                      placeholder="+39 06 xxxxxxxx" />
                  </DkField>
                  <DkField label="VAT / P.IVA AR *">
                    <input style={inputDk} value={doc.representative.ar_vat_number}
                      onChange={e => patchRep("ar_vat_number", e.target.value)}
                      placeholder="IT12345678901" />
                  </DkField>
                </div>
              </div>
            </div>

            {/* Sistema coperto */}
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${DK.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                <Globe size={13} style={{ color: DK.muted }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: DK.text, margin: 0 }}>Sistema coperto dal mandato</p>
                <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint, border: `1px solid ${DK.border}`,
                  borderRadius: 4, padding: "1px 5px", background: "rgba(0,0,0,0.05)" }}>
                  Annex VIII §4-5
                </span>
                {prefillSrc?.system === "risk_manager_docugen" && (
                  <span style={{ fontSize: 9, color: DK.muted, background: "rgba(0,0,0,0.04)",
                    border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                    ✦ AI — da DocuGen + Risk Manager
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <DkField label="Denominazione sistema *" aiBadge={prefillSrc?.system === "risk_manager_docugen" && !!doc.system_name}>
                  <input style={inputDk} value={doc.system_name}
                    onChange={e => patchP("system_name", e.target.value)}
                    placeholder="Es. HireBot Pro" />
                </DkField>
                <DkField label="Versione *" aiBadge={prefillSrc?.system === "risk_manager_docugen" && !!doc.system_version}>
                  <input style={inputDk} value={doc.system_version}
                    onChange={e => patchP("system_version", e.target.value)}
                    placeholder="Es. 2.1.0" />
                </DkField>
                <DkField label="Riferimento normativo *" aiBadge={prefillSrc?.system === "risk_manager_docugen" && !!doc.annex_reference}>
                  <input style={inputDk} value={doc.annex_reference}
                    onChange={e => patchP("annex_reference", e.target.value)}
                    placeholder="Es. Annex III, punto 4 — Occupazione" />
                </DkField>
                <DkField label="Data decorrenza mandato *">
                  <input style={inputDk} type="date" value={doc.mandate_start_date}
                    onChange={e => patchP("mandate_start_date", e.target.value)} />
                </DkField>
                <DkField label="Durata mandato">
                  <select style={inputDk} value={doc.mandate_duration}
                    onChange={e => patchP("mandate_duration", e.target.value as "indefinite"|"fixed")}>
                    <option value="indefinite">Tempo indeterminato</option>
                    <option value="fixed">Durata determinata</option>
                  </select>
                </DkField>
                {doc.mandate_duration === "fixed" && (
                  <DkField label="Data scadenza mandato *">
                    <input style={inputDk} type="date" value={doc.mandate_end_date ?? ""}
                      onChange={e => patchP("mandate_end_date", e.target.value)} />
                  </DkField>
                )}
              </div>
            </div>
          </div>

          {/* Sezione 3 — Mandato + checklist */}
          <div style={{ ...cardDk, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <FileText size={13} style={{ color: DK.muted }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: DK.text, margin: 0 }}>Sezione 3 — Mandato scritto + checklist obblighi AR</p>
            </div>

            {/* AR country blocking banner */}
            {arCountryInvalid && (
              <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                background: DK.redBg, border: `1px solid ${DK.redBdr}`,
                display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={13} style={{ color: DK.red, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: DK.red, margin: 0 }}>
                  Correggere il paese dell&apos;AR (Sezione 2) prima di procedere — l&apos;AR deve essere in uno SM UE (Art. 22(1)).
                </p>
              </div>
            )}

            {/* Mandate preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: 12, color: DK.muted, margin: 0 }}>
                    Testo generato automaticamente — revisiona prima della firma
                  </p>
                  <span style={{ fontSize: 9, fontWeight: 700, color: DK.muted, background: "rgba(0,0,0,0.04)",
                    border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 6px" }}>
                    ✦ AI — verifica e conferma
                  </span>
                </div>
                <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                  background: copied ? DK.greenBg : "rgba(0,0,0,0.05)",
                  color: copied ? DK.green : DK.muted,
                  border: `1px solid ${copied ? DK.greenBdr : DK.border}` }}>
                  <Copy size={11} /> {copied ? "Copiato!" : "Copia mandato"}
                </button>
              </div>
              <textarea readOnly value={generateMandate(doc)}
                style={{ ...taDk, height: 400, resize: "vertical",
                  fontFamily: "ui-monospace, 'Cascadia Code', monospace", fontSize: 11, lineHeight: 1.7,
                  background: "#f3f4f6",
                  border: `1px solid ${mandateConfirmed ? DK.greenBdr : DK.border}`,
                  color: DK.text }} />
              {!mandateConfirmed ? (
                <button onClick={() => { setMandateConfirmed(true); showToast("✓ Testo del mandato confermato"); }}
                  style={{ marginTop: 8, width: "100%", padding: "8px", borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: "#0D1016", color: "#fff", border: "1px solid #0D1016" }}>
                  ✦ Confermo il testo del mandato (aiConfirmed)
                </button>
              ) : (
                <div style={{ marginTop: 8, padding: "8px 14px", borderRadius: 8,
                  background: DK.greenBg, border: `1px solid ${DK.greenBdr}`,
                  display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={13} style={{ color: DK.green }} />
                  <span style={{ fontSize: 12, color: DK.green, fontWeight: 500 }}>
                    Testo mandato confermato ✓
                  </span>
                </div>
              )}
            </div>

            {/* Mandate duties (Art. 22) + AI validator — PROMPT BG */}
            <div style={{ ...cardDk, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Shield size={13} style={{ color: DK.muted }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: DK.text, margin: 0 }}>
                    Compiti obbligatori Art. 22(2-5)
                  </p>
                </div>
                <button
                  onClick={handleValidateMandate}
                  disabled={validatingMandate}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                    borderRadius: 7, fontSize: 11, cursor: "pointer",
                    background: "#0D1016", color: "#fff", border: "1px solid #0D1016" }}>
                  <Sparkles size={11} />
                  {validatingMandate ? "Analisi…" : "✦ Valida compiti obbligatori"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {arRecord.mandateDuties.map((d, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8,
                    fontSize: 11, color: DK.text, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={d.confirmed}
                      onChange={() => setArRecord(prev => ({
                        ...prev,
                        mandateDuties: prev.mandateDuties.map((duty, j) =>
                          j === i ? { ...duty, confirmed: !duty.confirmed, confirmedAt: new Date().toISOString() } : duty
                        ),
                        updatedAt: new Date().toISOString(),
                      }))}
                      style={{ accentColor: DK.green, marginTop: 1, flexShrink: 0 }}
                    />
                    <div>
                      <span style={{ color: DK.text }}>{d.duty}</span>
                      <span style={{ marginLeft: 6, fontFamily: "monospace", fontSize: 9, color: DK.faint }}>{d.artRef}</span>
                    </div>
                  </label>
                ))}
              </div>

              {arRecord.mandateValidationStatus === "valid" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: DK.green }}>
                  <CheckCircle2 size={12} /> Tutti i compiti obbligatori presenti nel mandato ✦ AI
                </div>
              )}
              {arRecord.mandateValidationStatus === "missing_duties" && arRecord.mandateValidationIssues.length > 0 && (
                <div style={{ borderRadius: 8, border: `1px solid ${DK.redBdr}`, background: DK.redBg, padding: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: DK.red, margin: "0 0 6px" }}>
                    {arRecord.mandateValidationIssues.length} compiti mancanti nel mandato ✦ AI
                  </p>
                  {arRecord.mandateValidationIssues.map((issue, i) => (
                    <p key={i} style={{ fontSize: 11, color: DK.muted, margin: "2px 0 0" }}>× {issue}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Digital signature — PROMPT BG */}
            <div style={{ ...cardDk, padding: 14, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: DK.text, margin: "0 0 14px" }}>
                Firma digitale mandato
              </p>
              {arRecord.signatureStatus === "signed" && arRecord.signature ? (
                <SignatureConfirmation signature={arRecord.signature} onRevoke={handleRevoke} />
              ) : (
                <DigitalSignaturePad
                  mandateId={arRecord.mandateId}
                  onSign={handleSign}
                  disabled={!docuGenCompleted || arRecord.mandateValidationStatus !== "valid"}
                />
              )}
              {arRecord.mandateValidationStatus !== "valid" && arRecord.signatureStatus !== "signed" && (
                <p style={{ fontSize: 10, color: DK.faint, marginTop: 8 }}>
                  Firma disponibile dopo validazione compiti obbligatori ✦ AI
                </p>
              )}
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <CheckCircle2 size={13} style={{ color: DK.green }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: DK.text, margin: 0 }}>
                    Checklist obblighi AR
                  </p>
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint,
                    border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 5px",
                    background: "rgba(0,0,0,0.05)" }}>
                    Art. 22(2)(a)-(f)
                  </span>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 500,
                  background: doneCount === doc.checklist.length ? DK.greenBg : "rgba(0,0,0,0.05)",
                  color: doneCount === doc.checklist.length ? DK.green : DK.muted,
                  border: `1px solid ${doneCount === doc.checklist.length ? DK.greenBdr : DK.border}` }}>
                  {doneCount}/{doc.checklist.length} completati
                </span>
              </div>

              {doc.checklist.length === 0 && (
                <button onClick={() => patch(d => ({ ...d, checklist: makeChecklist() }))}
                  style={{ fontSize: 11, color: DK.muted, background: "rgba(0,0,0,0.04)",
                    border: `1px solid ${DK.border}`, borderRadius: 6, padding: "4px 10px",
                    cursor: "pointer", marginBottom: 10 }}>
                  Inizializza checklist obblighi AR
                </button>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doc.checklist.map(item => (
                  <ChecklistRowDk key={item.id} item={item}
                    eudbResult={eudbResult} docuGenCompleted={docuGenCompleted}
                    onChange={updated => patchChecklist(item.id, updated)} />
                ))}
              </div>
            </div>

            {/* Save */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingTop: 16, borderTop: `1px solid ${DK.border}` }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: DK.text, margin: 0 }}>Salva nel dossier</p>
                <p style={{ fontSize: 11, color: DK.muted, margin: "2px 0 0" }}>
                  Registra l&apos;AR nel Dossier AI Act per la conformità Art. 22.
                </p>
              </div>
              <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                background: "#0D1016", color: "#fff",
                border: "1px solid #0D1016", cursor: "pointer" }}>
                <Save size={13} /> Salva nel dossier
              </button>
            </div>
          </div>

          <SignOffPanel toolKey="authorized-rep" toolLabel="Authorized Representative — Art. 22" />
        </>
        </fieldset>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "10px 18px", borderRadius: 10, background: "#ffffff",
          border: `1px solid ${DK.greenBdr}`, color: DK.green,
          fontSize: 12, fontWeight: 500, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
