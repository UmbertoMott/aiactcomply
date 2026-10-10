"use client";
import React, { useState, useEffect, CSSProperties } from "react";
import Link from "next/link";
import {
  CheckCircle2, Plus, X, Sparkles, Loader2, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { INK, LINE, OK, ToolHeader, Choice, Note, StepIcon, PrimaryButton, SecondaryButton } from "@/components/tools/ToolUi";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import {
  OVERSIGHT_REQUIREMENTS,
  FOUR_EYES_MODULE,
  MEASURE_IMPLEMENTATION_TYPE_LABELS,
} from "@/lib/oversight/oversight-requirements";
import {
  loadOversightRecord,
  saveOversightRecord,
  countImplemented,
  type OversightRecord,
  type OversightRequirementRecord,
  type OversightRequirementStatus,
} from "@/lib/oversight/oversight-types";
import {
  suggestOversightMeasures,
  assessFourEyesApplicability,
} from "@/app/actions/oversightActions";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "#0D1016",
  faint:   "#0D1016",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#f9f9fb",
  red:     "#dc2626",  redBg:    "rgba(220,38,38,0.06)",  redBdr:   "rgba(220,38,38,0.18)",
  amber:   "#d97706",  amberBg:  "rgba(202,138,4,0.07)",  amberBdr: "rgba(202,138,4,0.22)",
  green:   "#15803d",  greenBg:  "rgba(22,163,74,0.06)",  greenBdr: "rgba(22,163,74,0.18)",
  blue:    INK,        blueBg:   "transparent",           blueBdr:  LINE,
  violet:  INK,        violetBg: "transparent",           violetBdr: LINE,
} as const;

const FONT: CSSProperties = { fontFamily: "inherit" };
const inp: CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, color: T.text, background: T.card, outline: "none" };
const ta: CSSProperties = { ...inp, resize: "vertical" as const };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusPill({ status, t }: { status: OversightRequirementStatus; t: TFn }) {
  const map = {
    not_started: { label: t("status_not_started"), color: T.red,   bg: T.redBg   },
    in_progress:  { label: t("status_in_progress"),  color: T.amber, bg: T.amberBg },
    implemented:  { label: t("status_implemented"), color: T.green, bg: T.greenBg },
  };
  const s = map[status];
  return (
    <span className="text-[11px]" style={{ color: status === "implemented" ? s.color : INK }}>
      {s.label}
    </span>
  );
}

function TagInput({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} style={{ ...inp, flex: 1 }} />
        <button onClick={add} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer" }}>
          <Plus className="h-3.5 w-3.5" style={{ color: T.muted }} />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: T.bg, border: `1px solid ${T.border}`, color: T.text }}>
              {item}
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X className="h-2.5 w-2.5" style={{ color: T.faint }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Requirement card ─────────────────────────────────────────────────────────

interface ReqCardProps {
  req: typeof OVERSIGHT_REQUIREMENTS[number];
  record: OversightRequirementRecord | undefined;
  pending: { measureDescription?: string; implementationType?: string } | null;
  onUpdate: (id: string, patch: Partial<OversightRequirementRecord>) => void;
  onAcceptAi: (id: string) => void;
  index: number;
  t: TFn;
}

function RequirementCard({ req, record, pending, onUpdate, onAcceptAi, index, t }: ReqCardProps) {
  const to = useT("deployer_ops_oversight");
  const [open, setOpen] = useState(false);
  const status = record?.status ?? "not_started";
  const badgeRef = `Art. 14(4)(${String.fromCharCode(96 + index)})`;

  return (
    <div style={{ borderTop: `1px solid ${LINE}` }}>
      {/* Header */}
      <button className="w-full flex items-start gap-3.5 text-left" style={{ padding: "18px 0", background: "none", border: "none", cursor: "pointer", color: INK }} onClick={() => setOpen(v => !v)}>
        <div className="flex-shrink-0" style={{ paddingTop: 1 }}>
          <StepIcon done={status === "implemented"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span style={{ fontSize: 15, fontWeight: 600 }}>{index}. {to(`req_${req.id}_label`)}</span>
            <span className="text-[11px]">{badgeRef}</span>
            <StatusPill status={status} t={t} />
            {pending && <span className="text-[11px]">✦ AI</span>}
          </div>
          {req.primaryReference !== badgeRef && (
            <p className="text-[11px] mt-1" style={{ color: T.muted }}>{req.primaryReference}</p>
          )}
        </div>
        <span className="ml-2 flex-shrink-0" style={{ paddingTop: 2 }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div style={{ padding: "0 0 20px 32px" }}>
          <p className="text-[13px] mb-4 leading-relaxed" style={{ color: T.muted }}>{to(`req_${req.id}_desc`)}</p>

          {/* AI pending suggestion */}
          {pending && (
            <div className="mb-4" style={{ borderLeft: `2px solid ${INK}`, paddingLeft: 12 }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: T.violet }}>✦ {t("aiVerify")}</p>
              {pending.implementationType && (
                <p className="text-[11px] mb-1" style={{ color: T.text }}>
                  <strong>{t("proposedType")}</strong> {pending.implementationType in MEASURE_IMPLEMENTATION_TYPE_LABELS ? to(`impl_${pending.implementationType}`) : pending.implementationType}
                </p>
              )}
              {pending.measureDescription && (
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: T.text }}>{pending.measureDescription}</p>
              )}
              <button onClick={() => onAcceptAi(req.id)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded"
                style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}>
                <Check size={12} /> {t("acceptApply")}
              </button>
            </div>
          )}

          {/* Implementation type */}
          <div className="mb-3">
            <label className="text-[13px] font-medium block mb-1.5" style={{ color: INK }}>
              {t("measureType")}
            </label>
            <select
              value={record?.implementationType ?? "not_specified"}
              onChange={e => onUpdate(req.id, { implementationType: e.target.value as OversightRequirementRecord["implementationType"], lastUpdated: new Date().toISOString() })}
              style={inp}>
              {Object.keys(MEASURE_IMPLEMENTATION_TYPE_LABELS).map((v) => (
                <option key={v} value={v}>{to(`impl_${v}`)}</option>
              ))}
            </select>
          </div>

          {/* Measure description */}
          <div className="mb-3">
            <label className="text-[13px] font-medium block mb-1.5" style={{ color: INK }}>
              {t("measureDesc")}
            </label>
            <textarea
              rows={3}
              value={record?.measureDescription ?? ""}
              onChange={e => onUpdate(req.id, { measureDescription: e.target.value })}
              placeholder={t("measureDescPh")}
              style={ta} />
          </div>

          {/* Status */}
          <div className="mb-3">
            <label className="text-[13px] font-medium block mb-1.5" style={{ color: INK }}>{t("statusLabel")}</label>
            <div className="flex gap-2 flex-wrap">
              {(["not_started", "in_progress", "implemented"] as OversightRequirementStatus[]).map(s => {
                const labels = { not_started: t("status_not_started"), in_progress: t("status_in_progress"), implemented: t("status_implemented") };
                return (
                  <Choice key={s} active={(record?.status ?? "not_started") === s}
                    onClick={() => onUpdate(req.id, { status: s, lastUpdated: new Date().toISOString() })}>
                    {labels[s]}
                  </Choice>
                );
              })}
            </div>
          </div>

          {/* Linked tool */}
          {req.linkedToolPath && (
            <Link href={req.linkedToolPath} className="text-[13px] underline" style={{ color: INK }}>
              {to(`req_${req.id}_linked`)} →
            </Link>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Four-eyes module ─────────────────────────────────────────────────────────

function FourEyesModule({
  record,
  onUpdate,
  systemName,
  systemDescription,
  onAiAssess,
  aiAssessing,
  t,
}: {
  record: OversightRecord["fourEyes"];
  onUpdate: (patch: Partial<OversightRecord["fourEyes"]>) => void;
  systemName: string;
  systemDescription: string;
  onAiAssess: () => void;
  aiAssessing: boolean;
  t: TFn;
}) {
  const to = useT("deployer_ops_oversight");
  const [rolesInput, setRolesInput] = useState(record.verifierRoles ?? []);

  return (
    <div style={{ borderTop: `1px solid ${LINE}`, padding: "18px 0 18px 32px", color: INK }}>
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span style={{ fontSize: 15, fontWeight: 600 }}>{to("fe_label")}</span>
        <span className="text-[11px]">{FOUR_EYES_MODULE.primaryReference}</span>
      </div>
      <p className="text-[13px] mb-4 leading-relaxed" style={{ color: T.muted }}>{to("fe_desc")}</p>

      {record.applicable === "unspecified" && (
        <div className="mb-4">
          <p className="text-[13px] font-semibold mb-2" style={{ color: INK }}>
            {t("fe_applicabilityToVerify")} — {to("fe_support")}
          </p>
          <p className="text-[13px] mb-3" style={{ color: INK }}>
            {t("fe_triageDesc")}
          </p>
          <div className="flex gap-2 flex-wrap mb-2">
            <Choice active={false} onClick={() => onUpdate({ applicable: "yes" })}>{t("fe_yesBiometric")}</Choice>
            <Choice active={false} onClick={() => onUpdate({ applicable: "no" })}>{t("fe_noBiometric")}</Choice>
          </div>
          <button onClick={onAiAssess} disabled={aiAssessing}
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: T.violet, background: "none", border: "none", cursor: "pointer" }}>
            {aiAssessing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {t("fe_assessAi")}
          </button>
          {record.aiConfirmed && (
            <p className="text-[11px] mt-1 font-semibold" style={{ color: INK }}>✦ {t("aiVerify")}</p>
          )}
        </div>
      )}

      {record.applicable === "yes" && (
        <div className="space-y-3">
          <div>
            <label className="text-[13px] font-medium block mb-1.5" style={{ color: INK }}>
              {t("fe_procedure")}
            </label>
            <textarea rows={3} value={record.procedureDescription ?? ""}
              onChange={e => onUpdate({ procedureDescription: e.target.value })}
              placeholder={t("fe_procedurePh")}
              style={ta} />
          </div>
          <div>
            <label className="text-[13px] font-medium block mb-1.5" style={{ color: INK }}>
              {t("fe_roles")}
            </label>
            <TagInput items={rolesInput}
              onChange={(v) => { setRolesInput(v); onUpdate({ verifierRoles: v }); }}
              placeholder={t("fe_rolesPh")} />
          </div>
          <div>
            <label className="text-[13px] font-medium block mb-1.5" style={{ color: INK }}>{t("statusLabel")}</label>
            <div className="flex gap-2">
              {(["not_started", "in_progress", "implemented"] as OversightRequirementStatus[]).map(s => {
                const labels = { not_started: t("status_not_started"), in_progress: t("status_in_progress"), implemented: t("status_implemented") };
                return (
                  <Choice key={s} active={record.status === s} onClick={() => onUpdate({ status: s })}>{labels[s]}</Choice>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {record.applicable === "no" && (
        <div>
          <p className="text-[13px]" style={{ color: INK }}>
            {t("fe_notApplicable")}
            <button onClick={() => onUpdate({ applicable: "unspecified" })} className="ml-2 underline" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11 }}>
              {t("fe_edit")}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OversightPage() {
  const t = useT("toolOversight");
  const to = useT("deployer_ops_oversight");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const [record, setRecord] = useState<OversightRecord>(() => loadOversightRecord());
  const [savedAt, setSavedAt] = useState<string | null>(() => readFromStorage<{ completedAt?: string }>("oversight")?.completedAt ?? null);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fourEyesAiLoading, setFourEyesAiLoading] = useState(false);

  // Pending AI suggestions per requirement id
  const [pendingSuggestions, setPendingSuggestions] = useState<Record<string, { measureDescription?: string; implementationType?: string }>>({});

  // Determine biometric / four-eyes applicability from AI Inventory / Classifier
  const [showFourEyes, setShowFourEyes] = useState<boolean | null>(null);

  useEffect(() => {
    // Try to determine if system is biometric from stored classifier / risk manager data
    const cls = readFromStorage<ClassifierResult>("classifier");
    if (!cls) { setShowFourEyes(null); return; }
    if (!cls.annexIII) { setShowFourEyes(false); return; }
    // Annex III is true — check description for biometric keywords
    const desc = (cls.systemDescription ?? "").toLowerCase() + " " + (cls.systemName ?? "").toLowerCase();
    const biometricKeywords = ["biometric", "biometri", "faccial", "viso", "volto", "impronta", "riconoscimento", "identificazione persone", "annex iii 1(a)", "allegato iii 1(a)", "punto 1(a)"];
    const isBiometric = biometricKeywords.some(k => desc.includes(k));
    // Also check risk manager scoping annexIIIArea
    const rmRaw = localStorage.getItem("aicomply_risk_manager_chat_v3");
    if (rmRaw) {
      try {
        const rm = JSON.parse(rmRaw);
        const area = (rm?.scoping?.identification?.annexIIIArea ?? "").toLowerCase();
        if (biometricKeywords.some(k => area.includes(k))) { setShowFourEyes(true); return; }
      } catch { /* ignore */ }
    }
    // If annexIII=true but can't confirm biometric → show triage (unspecified)
    setShowFourEyes(isBiometric || record.fourEyes.applicable === "yes" || record.fourEyes.applicable === "unspecified");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, kind: "ok" | "err" = "ok") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }

  function getReqRecord(id: string): OversightRequirementRecord | undefined {
    return record.requirements.find(r => r.requirementId === id);
  }

  function updateRequirement(id: string, patch: Partial<OversightRequirementRecord>) {
    setRecord(prev => {
      const existing = prev.requirements.find(r => r.requirementId === id);
      const updated: OversightRequirementRecord = { requirementId: id, status: "not_started", implementationType: "not_specified", aiConfirmed: false, ...existing, ...patch };
      const newReqs = prev.requirements.some(r => r.requirementId === id)
        ? prev.requirements.map(r => r.requirementId === id ? updated : r)
        : [...prev.requirements, updated];
      const next = { ...prev, requirements: newReqs, updatedAt: new Date().toISOString() };
      saveOversightRecord(next);
      return next;
    });
  }

  function updateFourEyes(patch: Partial<OversightRecord["fourEyes"]>) {
    setRecord(prev => {
      const next = { ...prev, fourEyes: { ...prev.fourEyes, ...patch }, updatedAt: new Date().toISOString() };
      saveOversightRecord(next);
      return next;
    });
    if (patch.applicable === "yes") setShowFourEyes(true);
    if (patch.applicable === "no") setShowFourEyes(false);
  }

  function acceptAiSuggestion(reqId: string) {
    const s = pendingSuggestions[reqId];
    if (!s) return;
    updateRequirement(reqId, {
      measureDescription: s.measureDescription,
      implementationType: (s.implementationType as OversightRequirementRecord["implementationType"]) ?? "not_specified",
      aiConfirmed: true,
    });
    setPendingSuggestions(prev => { const n = { ...prev }; delete n[reqId]; return n; });
  }

  async function runAiSuggest() {
    setAiLoading(true);
    setAiError(null);
    try {
      const cls = readFromStorage<ClassifierResult>("classifier");
      const result = await suggestOversightMeasures({
        systemName: cls?.systemName ?? to("defaultSystemName"),
        systemDescription: cls?.systemDescription ?? "",
        riskTier: cls?.riskLevel ?? "high",
      });
      const map: Record<string, { measureDescription?: string; implementationType?: string }> = {};
      for (const m of result.measures) {
        map[m.requirementId] = { measureDescription: m.measureDescription, implementationType: m.implementationType };
      }
      setPendingSuggestions(map);
      showToast(t("toast_aiDrafts"));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setAiLoading(false);
    }
  }

  async function runFourEyesAi() {
    setFourEyesAiLoading(true);
    try {
      const cls = readFromStorage<ClassifierResult>("classifier");
      const result = await assessFourEyesApplicability({
        systemName: cls?.systemName ?? to("defaultSystemName"),
        systemDescription: cls?.systemDescription ?? "",
        riskTier: cls?.riskLevel,
      });
      updateFourEyes({ applicable: result.applicable, aiConfirmed: true });
      if (result.applicable === "yes") setShowFourEyes(true);
      if (result.applicable === "no") setShowFourEyes(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("aiError"), "err");
    } finally {
      setFourEyesAiLoading(false);
    }
  }

  function saveToDossier() {
    const now = new Date().toISOString();
    const implemented = countImplemented(record);
    writeToStorage("oversight", {
      oversightMechanism: `Art. 14(4)(a)-(e) — ${implemented}/5 requisiti implementati`,
      humanInterventionPoints: record.requirements
        .filter(r => r.status === "implemented")
        .map(r => OVERSIGHT_REQUIREMENTS.find(d => d.id === r.requirementId)?.label ?? r.requirementId),
      stopCapability: record.requirements.find(r => r.requirementId === "intervention_stop")?.status === "implemented",
      responsiblePersons: record.fourEyes.verifierRoles,
      completedAt: now,
    });
    appendEvidence("decision", { type: "Oversight Art. 14 — framework configurato", implemented, savedAt: now }, "oversight");
    setSavedAt(now);
    showToast(t("toast_saved"));
  }

  const implementedCount = countImplemented(record);
  const fourEyesDone = record.fourEyes.applicable === "yes" && record.fourEyes.status === "implemented";
  const cls = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const systemName = cls?.systemName ?? to("defaultSystemName");
  const systemDescription = cls?.systemDescription ?? "";

  return (
    <div className="w-full" style={FONT}>
      <ToolHeader title={t("title")} subtitle={t("subtitle")} />
      <p className="text-[13px] leading-relaxed" style={{ margin: "-8px 0 20px", color: INK }}>
        <strong style={{ fontWeight: 600 }}>{t("ctx_title")}.</strong> {t("ctx_body")}
      </p>
      <SystemSelector checkProhibited={true} />

      {/* Avanzamento + bozze AI */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ margin: "4px 0 8px", color: INK }}>
        <div className="text-[13px]">
          <strong style={{ fontWeight: 600, color: implementedCount === 5 ? OK : INK }}>{implementedCount}/5</strong> {t("progress_req")}
          {showFourEyes && <span> · {fourEyesDone ? t("fe_done") : t("fe_inProgress")}</span>}
        </div>
        <div className="flex items-center gap-2">
          {aiError && <span className="text-[11px]" style={{ color: T.red }}>{aiError}</span>}
          <SecondaryButton onClick={runAiSuggest} disabled={aiLoading}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {Object.keys(pendingSuggestions).length > 0 ? t("aiRegen") : t("aiDraftAll")}
          </SecondaryButton>
        </div>
      </div>

      {/* 5 Requirement cards */}
      <div>
        {OVERSIGHT_REQUIREMENTS.map((req, i) => (
          <RequirementCard
            key={req.id}
            req={req}
            index={i + 1}
            record={getReqRecord(req.id)}
            pending={pendingSuggestions[req.id] ?? null}
            onUpdate={updateRequirement}
            onAcceptAi={acceptAiSuggestion}
            t={t}
          />
        ))}
      </div>

      {/* Four-eyes conditional module */}
      {showFourEyes && (
        <>
          <FourEyesModule
            record={record.fourEyes}
            onUpdate={updateFourEyes}
            systemName={systemName}
            systemDescription={systemDescription}
            onAiAssess={runFourEyesAi}
            aiAssessing={fourEyesAiLoading}
            t={t}
          />
        </>
      )}

      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 20 }}>
        <Note><span dangerouslySetInnerHTML={{ __html: t("sanctions") }} /></Note>
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 16 }}>
          <PrimaryButton onClick={saveToDossier}>{t("saveToDossier")}</PrimaryButton>
          {savedAt && (
            <span className="text-[13px] inline-flex items-center gap-1.5" style={{ color: INK }}>
              <CheckCircle2 size={14} color={OK} /> {t("dossierSaved")} · {new Date(savedAt).toLocaleDateString(loc)}
              <Link href="/dashboard/dossier" className="underline ml-1" style={{ color: INK }}>{t("seeDossier")}</Link>
            </span>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-medium shadow-lg"
          style={{ background: toast.kind === "err" ? "rgba(220,38,38,0.95)" : T.text, color: "#fff" }}>
          {toast.kind === "err" ? "⛔" : "✓"} {toast.msg}
        </div>
      )}
    </div>
  );
}
