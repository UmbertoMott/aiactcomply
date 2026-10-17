"use client";

// Sistema di gestione dell'IA — ISO/IEC 42001:2023 (clausole 4-10 e Allegato A)
// collegato agli obblighi del Reg. (UE) 2024/1689 come modificato dal Reg. (UE) 2026/1744.
//
// La norma è volontaria: questo tool raccoglie gli elementi di sistema di gestione
// che gli altri tool non coprono (contesto, politica, ruoli, obiettivi, segnalazioni,
// impatti sulla società, fornitori, audit interno, riesame, non conformità) e genera
// la Dichiarazione di Applicabilità (6.1.3) collegando ogni controllo ai tool.
// Il testo della norma non è riprodotto: solo numeri di clausola e descrizioni parafrasate.

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Plus, X } from "lucide-react";
import { INK, LINE, fieldStyle as input, ToolHeader, Choice, CheckRow as Check, Note, Step, PrimaryButton, SecondaryButton } from "@/components/tools/ToolUi";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { loadInventory, type AISystem } from "@/lib/inventory/ai-system";
import { ANNEX_A, ANNEX_A_GROUPS, TOOL_NAMES } from "@/lib/aims/annex-a";
import { useLocale, useT } from "@/i18n/LocaleProvider";

// ─── Modello dati (a livello di organizzazione, non del singolo sistema) ──────

type Impl = "yes" | "partial" | "no" | "";
interface Row { id: string; a: string; b: string; c: string; d: string }
interface SoaEntry { applicable: boolean; implemented: Impl; note: string }
interface Supplier { id: string; name: string; supplies: string; agreement: "yes" | "no" | "na" | ""; evaluated: boolean }
interface NonConformity { id: string; date: string; what: string; cause: string; action: string; closed: boolean }

interface AimsRecord {
  context: { issues: string; parties: string; scope: string; systems: string[] };
  policy: { text: string; approvedBy: string; date: string; nextReview: string; commitments: string[] };
  roles: Row[];               // a = ruolo, b = persona
  reporting: { channel: string; checks: string[] };
  objectives: Row[];          // a = obiettivo, b = misura, c = responsabile, d = scadenza
  societal: { text: string; date: string };
  suppliers: Supplier[];
  noSuppliers: boolean;
  soa: Record<string, SoaEntry>;
  audit: { frequency: string; lastDate: string; auditor: string; findings: string };
  review: { date: string; participants: string; inputs: string[]; decisions: string };
  ncs: NonConformity[];
  savedAt?: string;
}

const EMPTY: AimsRecord = {
  context: { issues: "", parties: "", scope: "", systems: [] },
  policy: { text: "", approvedBy: "", date: "", nextReview: "", commitments: [] },
  roles: [],
  reporting: { channel: "", checks: [] },
  objectives: [],
  societal: { text: "", date: "" },
  suppliers: [],
  noSuppliers: false,
  soa: {},
  audit: { frequency: "", lastDate: "", auditor: "", findings: "" },
  review: { date: "", participants: "", inputs: [], decisions: "" },
  ncs: [],
};

const STORE_KEY = "aicomply_aims_v1";
const COMMITMENTS = ["pc_purpose", "pc_framework", "pc_requirements", "pc_improvement", "pc_communicated"] as const;
const REPORTING = ["rc_access", "rc_confidential", "rc_retaliation", "rc_aiact", "rc_external"] as const;
const REPORTING_REQUIRED = ["rc_access", "rc_confidential", "rc_retaliation", "rc_aiact"];
const REVIEW_INPUTS = ["ri_actions", "ri_changes", "ri_parties", "ri_performance", "ri_improvement"] as const;
const DEFAULT_ROLES = ["role_owner", "role_compliance", "role_oversight", "role_reporting"] as const;

const uid = () => crypto.randomUUID();
const soaOf = (r: AimsRecord, id: string): SoaEntry => r.soa[id] ?? { applicable: true, implemented: "", note: "" };

function readRecord(init: () => AimsRecord): AimsRecord {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<AimsRecord>) };
  } catch { /* dati non leggibili: si riparte dai valori iniziali */ }
  return init();
}

function useOrgRecord(init: () => AimsRecord): [AimsRecord, (fn: (r: AimsRecord) => AimsRecord) => void] {
  const [rec, setRec] = useState<AimsRecord>(() => readRecord(init));
  const update = (fn: (r: AimsRecord) => AimsRecord) => {
    setRec((prev) => {
      const next = fn(prev);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* storage non disponibile */ }
      return next;
    });
  };
  return [rec, update];
}

const ta: React.CSSProperties = { ...input, minHeight: 72, resize: "vertical", lineHeight: 1.5 };
const linkStyle: React.CSSProperties = { color: INK, textDecoration: "underline" };

function Anchor({ id, children }: { id: string; children: React.ReactNode }) {
  return <div id={id} style={{ scrollMarginTop: 80 }}>{children}</div>;
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      style={{ background: "none", border: "none", cursor: "pointer", color: INK, padding: 2, display: "inline-flex", flexShrink: 0 }}>
      <X size={14} />
    </button>
  );
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function AimsPage() {
  const locale = useLocale();
  const lang = locale === "en" ? "en" : "it";
  const t = useT("gov_aims");
  const [systems] = useState<AISystem[]>(() => (typeof window === "undefined" ? [] : loadInventory()));
  // Al primo uso: tutti i sistemi dell'inventario nell'ambito, ruoli tipici da assegnare
  const [rec, update] = useOrgRecord(() => ({
    ...EMPTY,
    context: { ...EMPTY.context, systems: systems.map((s) => s.id) },
    roles: DEFAULT_ROLES.map((k) => ({ id: uid(), a: t(k), b: "", c: "", d: "" })),
  }));
  const [justSaved, setJustSaved] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState({ a: "", b: "" });
  const [objDraft, setObjDraft] = useState({ a: "", b: "", c: "", d: "" });
  const [supDraft, setSupDraft] = useState({ name: "", supplies: "" });
  const [ncDraft, setNcDraft] = useState({ date: "", what: "", cause: "", action: "" });


  function patch(fn: (r: AimsRecord) => AimsRecord) {
    setJustSaved(false);
    update(fn);
  }
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const setSoa = (id: string, p: Partial<SoaEntry>) => patch((r) => ({ ...r, soa: { ...r.soa, [id]: { ...soaOf(r, id), ...p } } }));

  // ── Stato delle sezioni ──
  const soaMissingNote = ANNEX_A.filter((c) => !soaOf(rec, c.id).applicable && !soaOf(rec, c.id).note.trim());
  const soaUnset = ANNEX_A.filter((c) => soaOf(rec, c.id).applicable && !soaOf(rec, c.id).implemented);
  const done = {
    context: !!rec.context.issues.trim() && !!rec.context.parties.trim() && !!rec.context.scope.trim(),
    policy: !!rec.policy.text.trim() && !!rec.policy.approvedBy.trim() && !!rec.policy.date,
    roles: rec.roles.length > 0 && rec.roles.every((r) => r.a.trim() && r.b.trim()),
    reporting: !!rec.reporting.channel.trim() && REPORTING_REQUIRED.every((c) => rec.reporting.checks.includes(c)),
    objectives: rec.objectives.length > 0,
    societal: !!rec.societal.text.trim(),
    suppliers: rec.noSuppliers || (rec.suppliers.length > 0 && rec.suppliers.every((s) => !!s.agreement)),
    soa: soaMissingNote.length === 0 && soaUnset.length === 0,
    audit: !!rec.audit.frequency.trim() && !!rec.audit.auditor.trim(),
    review: !!rec.review.date && !!rec.review.decisions.trim(),
  };
  const sectionLabels: Record<keyof typeof done, string> = {
    context: t("s_context"), policy: t("s_policy"), roles: t("s_roles"), reporting: t("s_reporting"),
    objectives: t("s_objectives"), societal: t("s_societal"), suppliers: t("s_suppliers"), soa: t("s_soa"),
    audit: t("s_audit"), review: t("s_review"),
  };
  const missing = (Object.keys(done) as (keyof typeof done)[]).filter((k) => !done[k]);
  const doneCount = Object.keys(done).length - missing.length;

  const implCount = ANNEX_A.filter((c) => soaOf(rec, c.id).applicable && soaOf(rec, c.id).implemented === "yes").length;
  const applicableCount = ANNEX_A.filter((c) => soaOf(rec, c.id).applicable).length;

  function downloadSoa() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = [t("csv_control"), t("csv_desc"), t("csv_applicable"), t("csv_implemented"), t("csv_note"), t("csv_aiact"), t("csv_where")];
    const lines = ANNEX_A.map((c) => {
      const e = soaOf(rec, c.id);
      const where = c.tools.map((h) => (h.startsWith("/dashboard/tools/aims#") ? t(`s_${h.split("#")[1]}`) : TOOL_NAMES[h]?.[lang] ?? h)).join("; ");
      return [c.id, c[lang], e.applicable ? t("yes") : t("no"), e.applicable ? (e.implemented ? t(`impl_${e.implemented}`) : "") : "", e.note, c.articles.join("; "), where].map(esc).join(",");
    });
    const csv = "﻿" + [head.map(esc).join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t("csv_file")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function save() {
    const now = new Date().toISOString();
    await appendEvidence("audit", {
      type: "Sistema di gestione dell'IA — ISO/IEC 42001",
      scope: rec.context.scope.trim(),
      systemsInScope: systems.filter((s) => rec.context.systems.includes(s.id)).map((s) => s.name),
      policyApprovedBy: rec.policy.approvedBy.trim(),
      policyDate: rec.policy.date,
      roles: rec.roles.map((r) => ({ role: r.a, person: r.b })),
      reportingChannel: rec.reporting.channel.trim(),
      objectives: rec.objectives.map((o) => ({ objective: o.a, measure: o.b, owner: o.c, due: o.d })),
      suppliers: rec.noSuppliers ? [] : rec.suppliers.map((s) => ({ name: s.name, supplies: s.supplies, writtenAgreement: s.agreement, evaluated: s.evaluated })),
      statementOfApplicability: ANNEX_A.map((c) => ({ control: c.id, ...soaOf(rec, c.id) })),
      internalAudit: rec.audit,
      managementReview: rec.review,
      nonconformities: rec.ncs,
      sectionsComplete: `${doneCount}/${Object.keys(done).length}`,
      savedAt: now,
    }, "aims");
    patch((r) => ({ ...r, savedAt: now }));
    setJustSaved(true);
  }

  const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString(lang === "en" ? "en-GB" : "it-IT") : "");
  const toolLabel = (h: string) => (h.startsWith("/dashboard/tools/aims#") ? t(`s_${h.split("#")[1]}`) : TOOL_NAMES[h]?.[lang] ?? h);

  return (
    <div style={{ maxWidth: 820, color: INK }}>
      <ToolHeader title={t("title")} subtitle={t("sub")} note={t("note")} />

      {/* 1 · Contesto e ambito */}
      <Anchor id="context">
        <Step n={1} title={t("s_context")} refText="ISO/IEC 42001 4.1-4.4" done={done.context}>
          <label style={{ fontSize: 13 }}>{t("ctx_issues")}</label>
          <textarea style={ta} placeholder={t("ctx_issues_ph")} value={rec.context.issues} onChange={(e) => patch((r) => ({ ...r, context: { ...r.context, issues: e.target.value } }))} />
          <label style={{ fontSize: 13 }}>{t("ctx_parties")}</label>
          <textarea style={ta} placeholder={t("ctx_parties_ph")} value={rec.context.parties} onChange={(e) => patch((r) => ({ ...r, context: { ...r.context, parties: e.target.value } }))} />
          <label style={{ fontSize: 13 }}>{t("ctx_scope")}</label>
          <textarea style={ta} placeholder={t("ctx_scope_ph")} value={rec.context.scope} onChange={(e) => patch((r) => ({ ...r, context: { ...r.context, scope: e.target.value } }))} />
          {systems.length > 0 ? (
            <>
              <p style={{ fontSize: 13, margin: "4px 0 0" }}>{t("ctx_systems")}</p>
              {systems.map((s) => (
                <Check key={s.id} checked={rec.context.systems.includes(s.id)} onChange={() => patch((r) => ({ ...r, context: { ...r.context, systems: toggle(r.context.systems, s.id) } }))} label={s.name} />
              ))}
            </>
          ) : (
            <Note>{t("ctx_no_systems")} <Link href="/dashboard/tools/inventory" style={linkStyle}>{t("open_inventory")}</Link></Note>
          )}
        </Step>
      </Anchor>

      {/* 2 · Politica */}
      <Anchor id="policy">
        <Step n={2} title={t("s_policy")} refText="5.2 · A.2.2-A.2.4" done={done.policy}>
          <textarea style={{ ...ta, minHeight: 110 }} placeholder={t("pol_ph")} value={rec.policy.text} onChange={(e) => patch((r) => ({ ...r, policy: { ...r.policy, text: e.target.value } }))} />
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>{t("pol_check")}</p>
          {COMMITMENTS.map((k) => (
            <Check key={k} checked={rec.policy.commitments.includes(k)} onChange={() => patch((r) => ({ ...r, policy: { ...r.policy, commitments: toggle(r.policy.commitments, k) } }))} label={t(k)} />
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            <input style={input} placeholder={t("pol_approved")} aria-label={t("pol_approved")} value={rec.policy.approvedBy} onChange={(e) => patch((r) => ({ ...r, policy: { ...r.policy, approvedBy: e.target.value } }))} />
            <label style={{ fontSize: 12.5 }}>{t("pol_date")}<input type="date" style={input} value={rec.policy.date} onChange={(e) => patch((r) => ({ ...r, policy: { ...r.policy, date: e.target.value } }))} /></label>
            <label style={{ fontSize: 12.5 }}>{t("pol_next")}<input type="date" style={input} value={rec.policy.nextReview} onChange={(e) => patch((r) => ({ ...r, policy: { ...r.policy, nextReview: e.target.value } }))} /></label>
          </div>
        </Step>
      </Anchor>

      {/* 3 · Ruoli */}
      <Anchor id="roles">
        <Step n={3} title={t("s_roles")} refText="5.3 · A.3.2" done={done.roles}>
          <Note>{t("roles_note")}</Note>
          {rec.roles.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
              <input style={input} aria-label={t("roles_role")} value={r.a} onChange={(e) => patch((x) => ({ ...x, roles: x.roles.map((y) => (y.id === r.id ? { ...y, a: e.target.value } : y)) }))} />
              <input style={input} placeholder={t("roles_person")} aria-label={t("roles_person")} value={r.b} onChange={(e) => patch((x) => ({ ...x, roles: x.roles.map((y) => (y.id === r.id ? { ...y, b: e.target.value } : y)) }))} />
              <RemoveButton label={t("remove")} onClick={() => patch((x) => ({ ...x, roles: x.roles.filter((y) => y.id !== r.id) }))} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
            <input style={input} placeholder={t("roles_role")} aria-label={t("roles_role")} value={roleDraft.a} onChange={(e) => setRoleDraft({ ...roleDraft, a: e.target.value })} />
            <input style={input} placeholder={t("roles_person")} aria-label={t("roles_person")} value={roleDraft.b} onChange={(e) => setRoleDraft({ ...roleDraft, b: e.target.value })} />
            <SecondaryButton disabled={!roleDraft.a.trim()} onClick={() => { patch((x) => ({ ...x, roles: [...x.roles, { id: uid(), a: roleDraft.a.trim(), b: roleDraft.b.trim(), c: "", d: "" }] })); setRoleDraft({ a: "", b: "" }); }}><Plus size={14} /></SecondaryButton>
          </div>
        </Step>
      </Anchor>

      {/* 4 · Segnalazioni */}
      <Anchor id="reporting">
        <Step n={4} title={t("s_reporting")} refText="A.3.3 · A.8.3 · Art. 87" done={done.reporting}>
          <Note>{t("rep_note")}</Note>
          <textarea style={ta} placeholder={t("rep_ph")} value={rec.reporting.channel} onChange={(e) => patch((r) => ({ ...r, reporting: { ...r.reporting, channel: e.target.value } }))} />
          {REPORTING.map((k) => (
            <Check key={k} checked={rec.reporting.checks.includes(k)} onChange={() => patch((r) => ({ ...r, reporting: { ...r.reporting, checks: toggle(r.reporting.checks, k) } }))} label={t(k)} />
          ))}
        </Step>
      </Anchor>

      {/* 5 · Obiettivi */}
      <Anchor id="objectives">
        <Step n={5} title={t("s_objectives")} refText="6.2 · A.6.1.2 · A.9.3" done={done.objectives}>
          <Note>{t("obj_note")}</Note>
          {rec.objectives.map((o) => (
            <div key={o.id} style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.5, paddingBottom: 6, borderBottom: `1px solid ${LINE}` }}>
              <span style={{ flex: 1 }}>
                <strong style={{ fontWeight: 600 }}>{o.a}</strong>
                {o.b && <> · {t("obj_measure")}: {o.b}</>}
                {o.c && <> · {o.c}</>}
                {o.d && <> · {fmtDate(o.d)}</>}
              </span>
              <RemoveButton label={t("remove")} onClick={() => patch((x) => ({ ...x, objectives: x.objectives.filter((y) => y.id !== o.id) }))} />
            </div>
          ))}
          <input style={input} placeholder={t("obj_objective")} aria-label={t("obj_objective")} value={objDraft.a} onChange={(e) => setObjDraft({ ...objDraft, a: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <input style={input} placeholder={t("obj_measure")} aria-label={t("obj_measure")} value={objDraft.b} onChange={(e) => setObjDraft({ ...objDraft, b: e.target.value })} />
            <input style={input} placeholder={t("obj_owner")} aria-label={t("obj_owner")} value={objDraft.c} onChange={(e) => setObjDraft({ ...objDraft, c: e.target.value })} />
            <input type="date" style={input} aria-label={t("obj_due")} value={objDraft.d} onChange={(e) => setObjDraft({ ...objDraft, d: e.target.value })} />
          </div>
          <div><SecondaryButton disabled={!objDraft.a.trim()} onClick={() => { patch((x) => ({ ...x, objectives: [...x.objectives, { id: uid(), ...objDraft, a: objDraft.a.trim() }] })); setObjDraft({ a: "", b: "", c: "", d: "" }); }}><Plus size={14} /> {t("add")}</SecondaryButton></div>
        </Step>
      </Anchor>

      {/* 6 · Impatti sulla società */}
      <Anchor id="societal">
        <Step n={6} title={t("s_societal")} refText="6.1.4 · A.5.5" done={done.societal}>
          <Note>{t("soc_note")} <Link href="/dashboard/tools/fria" style={linkStyle}>FRIA</Link></Note>
          <textarea style={{ ...ta, minHeight: 100 }} placeholder={t("soc_ph")} value={rec.societal.text} onChange={(e) => patch((r) => ({ ...r, societal: { ...r.societal, text: e.target.value } }))} />
          <label style={{ fontSize: 12.5, maxWidth: 200 }}>{t("soc_date")}<input type="date" style={input} value={rec.societal.date} onChange={(e) => patch((r) => ({ ...r, societal: { ...r.societal, date: e.target.value } }))} /></label>
        </Step>
      </Anchor>

      {/* 7 · Fornitori */}
      <Anchor id="suppliers">
        <Step n={7} title={t("s_suppliers")} refText="A.10.2-A.10.3 · Art. 25(4)" done={done.suppliers}>
          <Note>{t("sup_note")}</Note>
          <Check checked={rec.noSuppliers} onChange={() => patch((r) => ({ ...r, noSuppliers: !r.noSuppliers }))} label={t("sup_none")} />
          {!rec.noSuppliers && (
            <>
              {rec.suppliers.map((s) => (
                <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: `1px solid ${LINE}` }}>
                  <div style={{ display: "flex", gap: 10, fontSize: 13 }}>
                    <span style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>{s.name}</strong>{s.supplies && ` · ${s.supplies}`}</span>
                    <RemoveButton label={t("remove")} onClick={() => patch((x) => ({ ...x, suppliers: x.suppliers.filter((y) => y.id !== s.id) }))} />
                  </div>
                  <span style={{ fontSize: 12.5 }}>{t("sup_agreement")}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(["yes", "no", "na"] as const).map((v) => (
                      <Choice key={v} active={s.agreement === v} onClick={() => patch((x) => ({ ...x, suppliers: x.suppliers.map((y) => (y.id === s.id ? { ...y, agreement: v } : y)) }))}>{t(`sup_ag_${v}`)}</Choice>
                    ))}
                  </div>
                  {s.agreement === "no" && <Note warn>{t("sup_ag_warn")}</Note>}
                  <Check checked={s.evaluated} onChange={() => patch((x) => ({ ...x, suppliers: x.suppliers.map((y) => (y.id === s.id ? { ...y, evaluated: !y.evaluated } : y)) }))} label={t("sup_evaluated")} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input style={input} placeholder={t("sup_name")} aria-label={t("sup_name")} value={supDraft.name} onChange={(e) => setSupDraft({ ...supDraft, name: e.target.value })} />
                <input style={input} placeholder={t("sup_supplies")} aria-label={t("sup_supplies")} value={supDraft.supplies} onChange={(e) => setSupDraft({ ...supDraft, supplies: e.target.value })} />
                <SecondaryButton disabled={!supDraft.name.trim()} onClick={() => { patch((x) => ({ ...x, suppliers: [...x.suppliers, { id: uid(), name: supDraft.name.trim(), supplies: supDraft.supplies.trim(), agreement: "", evaluated: false }] })); setSupDraft({ name: "", supplies: "" }); }}><Plus size={14} /></SecondaryButton>
              </div>
            </>
          )}
          <Note>{t("sup_chain")} <Link href="/dashboard/tools/supply-chain" style={linkStyle}>{t("sup_chain_link")}</Link></Note>
        </Step>
      </Anchor>

      {/* 8 · Dichiarazione di Applicabilità */}
      <Anchor id="soa">
        <Step n={8} title={t("s_soa")} refText="6.1.3 · Allegato A" done={done.soa}
          right={<SecondaryButton onClick={downloadSoa}><Download size={14} /> CSV</SecondaryButton>}>
          <Note>{t("soa_note")}</Note>
          <p style={{ fontSize: 13, margin: 0 }}>{t("soa_count").replace("{a}", String(applicableCount)).replace("{i}", String(implCount)).replace("{n}", String(ANNEX_A.length))}</p>
          {Object.entries(ANNEX_A_GROUPS).map(([g, label]) => {
            const controls = ANNEX_A.filter((c) => c.group === g);
            const open = openGroup === g;
            const groupDone = controls.every((c) => { const e = soaOf(rec, c.id); return e.applicable ? !!e.implemented : !!e.note.trim(); });
            return (
              <div key={g} style={{ borderTop: `1px solid ${LINE}` }}>
                <button type="button" onClick={() => setOpenGroup(open ? null : g)} aria-expanded={open}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: INK, fontSize: 13, fontFamily: "inherit", textAlign: "left" }}>
                  <span style={{ width: 40, fontWeight: 600 }}>{g}</span>
                  <span style={{ flex: 1 }}>{label[lang]}</span>
                  {groupDone && <CheckCircle2 size={14} color="#15803d" />}
                  <span style={{ fontSize: 12 }}>{open ? "−" : "+"}</span>
                </button>
                {open && controls.map((c) => {
                  const e = soaOf(rec, c.id);
                  return (
                    <div key={c.id} style={{ padding: "10px 0 12px 40px", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <div><strong style={{ fontWeight: 600 }}>{c.id}</strong> {c[lang]}</div>
                      <div style={{ fontSize: 12 }}>
                        {c.articles.length > 0 && <>{t("soa_aiact")}: {c.articles.join(", ")} · </>}
                        {t("soa_where")}: {c.tools.map((h, i) => (
                          <React.Fragment key={h}>{i > 0 && ", "}<Link href={h} style={linkStyle}>{toolLabel(h)}</Link></React.Fragment>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <Choice active={e.applicable} onClick={() => setSoa(c.id, { applicable: true })}>{t("soa_applicable")}</Choice>
                        <Choice active={!e.applicable} onClick={() => setSoa(c.id, { applicable: false, implemented: "" })}>{t("soa_excluded")}</Choice>
                        {e.applicable && <span style={{ width: 8 }} />}
                        {e.applicable && (["yes", "partial", "no"] as const).map((v) => (
                          <Choice key={v} active={e.implemented === v} onClick={() => setSoa(c.id, { implemented: v })}>{t(`impl_${v}`)}</Choice>
                        ))}
                      </div>
                      <input style={input} placeholder={t(e.applicable ? "soa_note_in" : "soa_note_out")} aria-label={t("csv_note")} value={e.note} onChange={(ev) => setSoa(c.id, { note: ev.target.value })} />
                      {!e.applicable && !e.note.trim() && <Note warn>{t("soa_need_reason")}</Note>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Step>
      </Anchor>

      {/* 9 · Audit interno */}
      <Anchor id="audit">
        <Step n={9} title={t("s_audit")} refText="9.2" done={done.audit}>
          <Note>{t("aud_note")}</Note>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            <input style={input} placeholder={t("aud_freq")} aria-label={t("aud_freq")} value={rec.audit.frequency} onChange={(e) => patch((r) => ({ ...r, audit: { ...r.audit, frequency: e.target.value } }))} />
            <input style={input} placeholder={t("aud_who")} aria-label={t("aud_who")} value={rec.audit.auditor} onChange={(e) => patch((r) => ({ ...r, audit: { ...r.audit, auditor: e.target.value } }))} />
            <label style={{ fontSize: 12.5 }}>{t("aud_last")}<input type="date" style={input} value={rec.audit.lastDate} onChange={(e) => patch((r) => ({ ...r, audit: { ...r.audit, lastDate: e.target.value } }))} /></label>
          </div>
          <textarea style={ta} placeholder={t("aud_findings")} value={rec.audit.findings} onChange={(e) => patch((r) => ({ ...r, audit: { ...r.audit, findings: e.target.value } }))} />
        </Step>
      </Anchor>

      {/* 10 · Riesame della direzione */}
      <Anchor id="review">
        <Step n={10} title={t("s_review")} refText="9.3" done={done.review}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,200px) 1fr", gap: 8 }}>
            <label style={{ fontSize: 12.5 }}>{t("rev_date")}<input type="date" style={input} value={rec.review.date} onChange={(e) => patch((r) => ({ ...r, review: { ...r.review, date: e.target.value } }))} /></label>
            <label style={{ fontSize: 12.5 }}>{t("rev_who")}<input style={input} value={rec.review.participants} onChange={(e) => patch((r) => ({ ...r, review: { ...r.review, participants: e.target.value } }))} /></label>
          </div>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>{t("rev_inputs")}</p>
          {REVIEW_INPUTS.map((k) => (
            <Check key={k} checked={rec.review.inputs.includes(k)} onChange={() => patch((r) => ({ ...r, review: { ...r.review, inputs: toggle(r.review.inputs, k) } }))} label={t(k)} />
          ))}
          <textarea style={ta} placeholder={t("rev_decisions")} value={rec.review.decisions} onChange={(e) => patch((r) => ({ ...r, review: { ...r.review, decisions: e.target.value } }))} />
        </Step>
      </Anchor>

      {/* 11 · Non conformità */}
      <Anchor id="nonconformity">
        <Step n={11} title={t("s_nc")} refText="10.1-10.2 · Art. 20" done={rec.ncs.length > 0 && rec.ncs.every((x) => x.closed)}>
          <Note>{t("nc_note")}</Note>
          {rec.ncs.length === 0 && <p style={{ fontSize: 12.5, margin: 0 }}>{t("nc_empty")}</p>}
          {rec.ncs.map((x) => (
            <div key={x.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, paddingBottom: 6, borderBottom: `1px solid ${LINE}` }}>
              <input type="checkbox" checked={x.closed} aria-label={t("nc_closed")} title={t("nc_closed")} style={{ marginTop: 4, accentColor: INK }}
                onChange={() => patch((r) => ({ ...r, ncs: r.ncs.map((y) => (y.id === x.id ? { ...y, closed: !y.closed } : y)) }))} />
              <span style={{ flex: 1, textDecoration: x.closed ? "line-through" : "none" }}>
                {x.date && <>{fmtDate(x.date)} · </>}{x.what}
                {x.cause && <> · {t("nc_cause")}: {x.cause}</>}
                {x.action && <> · {t("nc_action")}: {x.action}</>}
              </span>
              <RemoveButton label={t("remove")} onClick={() => patch((r) => ({ ...r, ncs: r.ncs.filter((y) => y.id !== x.id) }))} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,150px) 1fr", gap: 8 }}>
            <input type="date" style={input} aria-label={t("nc_date")} value={ncDraft.date} onChange={(e) => setNcDraft({ ...ncDraft, date: e.target.value })} />
            <input style={input} placeholder={t("nc_what")} aria-label={t("nc_what")} value={ncDraft.what} onChange={(e) => setNcDraft({ ...ncDraft, what: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={input} placeholder={t("nc_cause")} aria-label={t("nc_cause")} value={ncDraft.cause} onChange={(e) => setNcDraft({ ...ncDraft, cause: e.target.value })} />
            <input style={input} placeholder={t("nc_action")} aria-label={t("nc_action")} value={ncDraft.action} onChange={(e) => setNcDraft({ ...ncDraft, action: e.target.value })} />
          </div>
          <div><SecondaryButton disabled={!ncDraft.what.trim()} onClick={() => { patch((r) => ({ ...r, ncs: [...r.ncs, { id: uid(), ...ncDraft, what: ncDraft.what.trim(), closed: false }] })); setNcDraft({ date: "", what: "", cause: "", action: "" }); }}><Plus size={14} /> {t("add")}</SecondaryButton></div>
        </Step>
      </Anchor>

      {/* Stato */}
      <section style={{ padding: "20px 0", borderTop: `1px solid ${LINE}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{t("status")} · {doneCount}/{Object.keys(done).length}</h2>
        {missing.length === 0 ? (
          <Note>{t("complete")}</Note>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <span>{t("missing")}: </span>{missing.map((k) => sectionLabels[k]).join(" · ")}
          </div>
        )}
        <Note>{t("covered_elsewhere")}</Note>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => void save()}>{t("save")}</PrimaryButton>
          <SecondaryButton onClick={downloadSoa}><Download size={14} /> {t("soa_download")}</SecondaryButton>
          {(justSaved || rec.savedAt) && (
            <span style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} color="#15803d" /> {t("saved")}{rec.savedAt ? ` · ${fmtDate(rec.savedAt)}` : ""}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
