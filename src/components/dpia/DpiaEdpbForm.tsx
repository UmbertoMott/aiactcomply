"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, RotateCcw, Check, Download, Sparkles, ClipboardCheck, AlertCircle } from "lucide-react";
import { useT, useLocale } from "@/i18n/LocaleProvider";
import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import { draftDpiaEdpb } from "@/app/actions/draftDpiaEdpb";
import { computeEdpbCompleteness } from "@/lib/dpia/edpb-completeness";
import {
  createEmptyDpiaEdpb, emptyParty, emptyPurpose, emptyAsset, emptyTeamMember, emptyMeasure,
  emptyRisk, emptyMitigation,
  EDPB_SECTIONS, type DpiaEdpbDoc, type EdpbParty, type EdpbPurpose, type EdpbAsset, type EdpbTeamMember,
  type EdpbMeasure, type MeasureStatus, type EdpbRisk, type EdpbMitigation, type RiskLevel, type DpiaDecision,
} from "@/lib/dpia/edpb-schema";

const T = {
  bg: "#fafafa", card: "#ffffff", border: "rgba(0,0,0,0.10)",
  text: "#0D1016", muted: "rgba(0,0,0,0.5)", accent: "#23403a",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
};

const inputSt: React.CSSProperties = {
  width: "100%", padding: "9px 11px", fontSize: 13, color: T.text,
  background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, outline: "none",
};
const labelSt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 5 };
const hintSt: React.CSSProperties = { fontSize: 11, color: T.muted, marginBottom: 7, lineHeight: 1.5 };

// ─── Campi riutilizzabili ─────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelSt}>{label}</label>
      {hint && <p style={hintSt}>{hint}</p>}
      {children}
    </div>
  );
}

function Txt({ label, hint, value, onChange, rows = 3 }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <Field label={label} hint={hint}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        style={{ ...inputSt, resize: "vertical", lineHeight: 1.5 }} />
    </Field>
  );
}

function Inp({ label, hint, value, onChange, type = "text" }: { label: string; hint?: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputSt} />
    </Field>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: subtitle ? 3 : 14 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

export default function DpiaEdpbForm() {
  const t = useT("dpiaEdpb");
  const locale = useLocale();
  const [doc, setDoc] = useState<DpiaEdpbDoc>(createEmptyDpiaEdpb);
  const [section, setSection] = useState(0);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiName, setAiName] = useState("");
  const [aiDesc, setAiDesc] = useState("");
  const [aiCats, setAiCats] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [gapOpen, setGapOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completeness = computeEdpbCompleteness(doc);

  useEffect(() => {
    const stored = readFromStorage<DpiaEdpbDoc>("dpiaEdpb");
    if (stored) { setDoc({ ...createEmptyDpiaEdpb(), ...stored }); setSaved(true); }
  }, []);

  const autosave = useCallback((next: DpiaEdpbDoc) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { writeToStorage("dpiaEdpb", next); setSaved(true); }, 500);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const up = (updater: (d: DpiaEdpbDoc) => DpiaEdpbDoc) => {
    setDoc((prev) => { const next = { ...updater(prev), updatedAt: new Date().toISOString() }; setSaved(false); autosave(next); return next; });
  };
  const set = <K extends keyof DpiaEdpbDoc>(key: K, value: DpiaEdpbDoc[K]) => up((d) => ({ ...d, [key]: value }));

  function handleReset() {
    if (typeof window !== "undefined" && !window.confirm(t("resetConfirm"))) return;
    const empty = createEmptyDpiaEdpb();
    setDoc(empty); setSection(0); setSaved(false); writeToStorage("dpiaEdpb", empty);
  }

  async function handleAiPrefill() {
    if (aiLoading || !aiName.trim() || !aiDesc.trim()) return;
    setAiLoading(true); setAiError(null);
    const res = await draftDpiaEdpb({ systemName: aiName, description: aiDesc, dataCategories: aiCats, locale });
    if ("error" in res) { setAiError(res.error); setAiLoading(false); return; }
    const d = res;
    const keep = (cur: string, next: string) => (cur && cur.trim() ? cur : (next || cur));
    up((doc) => {
      const nd: DpiaEdpbDoc = { ...doc };
      if (!nd.processingName.trim()) nd.processingName = aiName.trim();
      nd.personalData = keep(doc.personalData, d.personalData);
      nd.specialCategories = keep(doc.specialCategories, d.specialCategories);
      nd.secondaryUses = keep(doc.secondaryUses, d.secondaryUses);
      nd.nature = keep(doc.nature, d.nature);
      nd.scopeDesc = keep(doc.scopeDesc, d.scopeDesc);
      nd.context = keep(doc.context, d.context);
      nd.functionalDescription = keep(doc.functionalDescription, d.functionalDescription);
      nd.lifecycle = {
        collection: keep(doc.lifecycle.collection, d.lifecycle.collection),
        use: keep(doc.lifecycle.use, d.lifecycle.use),
        storage: keep(doc.lifecycle.storage, d.lifecycle.storage),
        sharing: keep(doc.lifecycle.sharing, d.lifecycle.sharing),
        deletion: keep(doc.lifecycle.deletion, d.lifecycle.deletion),
      };
      nd.legalBasisAnalysis = keep(doc.legalBasisAnalysis, d.legalBasisAnalysis);
      nd.minimisationRetention = keep(doc.minimisationRetention, d.minimisationRetention);
      nd.dataQuality = keep(doc.dataQuality, d.dataQuality);
      nd.impactsRightsFreedoms = keep(doc.impactsRightsFreedoms, d.impactsRightsFreedoms);
      nd.necessity = keep(doc.necessity, d.necessity);
      nd.proportionality = keep(doc.proportionality, d.proportionality);
      nd.eventImpacts = keep(doc.eventImpacts, d.eventImpacts);
      nd.riskMethod = keep(doc.riskMethod, d.riskMethod);
      // purposes: sostituisci solo se è presente il singolo placeholder vuoto
      const purposesEmpty = doc.purposes.length <= 1 && !doc.purposes[0]?.purpose?.trim();
      if (purposesEmpty && d.purposes.length) nd.purposes = d.purposes.map((p) => ({ ...emptyPurpose(), purpose: p.purpose, legalBasis: p.legalBasis }));
      // misure: popola solo se la lista è vuota
      const asMeasures = (arr: string[]) => arr.filter(Boolean).map((desc) => ({ ...emptyMeasure(), description: desc }));
      if (!doc.measuresArt5.length && d.measuresArt5.length) nd.measuresArt5 = asMeasures(d.measuresArt5);
      if (!doc.measuresRights.length && d.measuresRights.length) nd.measuresRights = asMeasures(d.measuresRights);
      if (!doc.measuresSecurity.length && d.measuresSecurity.length) nd.measuresSecurity = asMeasures(d.measuresSecurity);
      if (!doc.measuresDpbdd.length && d.measuresDpbdd.length) nd.measuresDpbdd = asMeasures(d.measuresDpbdd);
      // rischi: popola solo se vuoto
      if (!doc.risks.length && d.risks.length) nd.risks = d.risks.map((r) => ({ ...emptyRisk(), scenario: r.scenario, threat: r.threat, riskSource: r.riskSource, impact: r.impact, likelihood: r.likelihood, severity: r.severity }));
      return nd;
    });
    setAiLoading(false); setAiOpen(false);
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/dpia-edpb/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, locale }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DPIA_EDPB_${(doc.processingName || "dpia").replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* silenzioso: l'utente può riprovare */ }
    finally { setExporting(false); }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 3 }}>{t("title")}</h2>
          <p style={{ fontSize: 12, color: T.muted }}>{t("subtitle")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: saved ? "#16a34a" : T.muted, display: "flex", alignItems: "center", gap: 4 }}>
            {saved && <Check className="h-3 w-3" />}{saved ? t("saved") : t("saving")}
          </span>
          <button onClick={() => setGapOpen((v) => !v)} title={t("gapCheck")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: gapOpen ? "rgba(0,0,0,0.06)" : "#fff", color: T.text, cursor: "pointer" }}>
            <ClipboardCheck className="h-3.5 w-3.5" /><span>{t("gapCheck")}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: completeness.overallPercent >= 80 ? "#16a34a" : completeness.overallPercent >= 40 ? "#d97706" : T.muted, background: "rgba(0,0,0,0.04)", padding: "1px 6px", borderRadius: 9999 }}>
              {completeness.overallPercent}%
            </span>
          </button>
          <button onClick={() => setAiOpen((v) => !v)} title={t("aiPrefill")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(35,64,58,0.25)", background: aiOpen ? "rgba(35,64,58,0.12)" : "rgba(35,64,58,0.06)", color: "#23403a", cursor: "pointer" }}>
            <Sparkles className="h-3.5 w-3.5" /><span>{t("aiPrefill")}</span>
          </button>
          <button onClick={handleExport} disabled={exporting} title={t("exportPdf")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(35,64,58,0.25)", background: "rgba(35,64,58,0.06)", color: "#23403a", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.6 : 1 }}>
            <Download className="h-3.5 w-3.5" /><span>{exporting ? t("exporting") : t("exportPdf")}</span>
          </button>
          <button onClick={handleReset} title={t("resetBtn")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}>
            <RotateCcw className="h-3.5 w-3.5" /><span>{t("resetBtn")}</span>
          </button>
        </div>
      </div>

      {/* Gap check panel */}
      {gapOpen && (
        <div style={{ border: `1px solid rgba(0,0,0,0.12)`, background: "#fff", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
              <ClipboardCheck className="h-4 w-4" />{t("gapCheckTitle")}
            </p>
            <span style={{ fontSize: 13, fontWeight: 700, color: completeness.overallPercent >= 80 ? "#16a34a" : completeness.overallPercent >= 40 ? "#d97706" : T.red }}>
              {completeness.overallPercent}%
            </span>
          </div>
          {completeness.items.every((i) => i.filled) ? (
            <p style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
              <Check className="h-4 w-4" />{t("gapNone")}
            </p>
          ) : (
            <>
              <p style={{ fontSize: 11.5, color: T.muted, marginBottom: 10 }}>{t("gapIntro")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {completeness.items.filter((i) => !i.filled).map((i, idx) => (
                  <button key={idx} onClick={() => { setSection(i.section); setGapOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.015)", cursor: "pointer", fontSize: 12, color: T.text }}>
                    <AlertCircle className="h-3.5 w-3.5" style={{ color: "#d97706", flexShrink: 0 }} />
                    <span style={{ color: T.muted, fontSize: 10, fontWeight: 700 }}>{i.section} · {t(`${EDPB_SECTIONS[i.section].key}Tab`)}</span>
                    <span>{t(i.labelKey)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI pre-fill panel */}
      {aiOpen && (
        <div style={{ border: `1px solid rgba(35,64,58,0.25)`, background: "rgba(35,64,58,0.04)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#23403a", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles className="h-4 w-4" />{t("aiPanelTitle")}
          </p>
          <p style={{ fontSize: 11.5, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>{t("aiPanelHint")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label={t("aiSystemName")}><input value={aiName} onChange={(e) => setAiName(e.target.value)} style={inputSt} /></Field>
            <Field label={t("aiDataCategories")}><input value={aiCats} onChange={(e) => setAiCats(e.target.value)} style={inputSt} /></Field>
          </div>
          <Txt label={t("aiDescription")} value={aiDesc} onChange={setAiDesc} rows={3} />
          {aiError && <p style={{ fontSize: 12, color: T.red, marginBottom: 8 }}>{aiError}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={handleAiPrefill} disabled={aiLoading || !aiName.trim() || !aiDesc.trim()}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "none", background: "#23403a", color: "#fff", cursor: (aiLoading || !aiName.trim() || !aiDesc.trim()) ? "not-allowed" : "pointer", opacity: (aiLoading || !aiName.trim() || !aiDesc.trim()) ? 0.55 : 1 }}>
              <Sparkles className="h-4 w-4" />{aiLoading ? t("aiGenerating") : t("aiGenerate")}
            </button>
            <span style={{ fontSize: 11, color: T.muted }}>{t("aiFillsEmptyNote")}</span>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {EDPB_SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{
              fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              border: section === s.id ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
              background: section === s.id ? "rgba(35,64,58,0.06)" : "#fff",
              color: section === s.id ? T.accent : T.muted,
            }}>
            <span style={{ opacity: 0.5, marginRight: 5 }}>{s.id}</span>{t(`${s.key}Tab`)}
          </button>
        ))}
      </div>

      {/* Sections */}
      {section === 0 && <Section0 doc={doc} set={set} t={t} />}
      {section === 1 && <Section1 doc={doc} set={set} t={t} />}
      {section === 2 && <Section2 doc={doc} set={set} t={t} />}
      {section === 3 && <Section3 doc={doc} set={set} t={t} />}
      {section === 4 && <Section4 doc={doc} set={set} t={t} />}
      {section === 5 && <Section5 doc={doc} set={set} t={t} />}
      {section === 6 && <Section6 doc={doc} set={set} t={t} />}

      {/* Nav footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <button disabled={section === 0} onClick={() => setSection((s) => Math.max(0, s - 1))}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: section === 0 ? "rgba(0,0,0,0.25)" : T.text, cursor: section === 0 ? "default" : "pointer" }}>
          <ChevronLeft className="h-4 w-4" />{t("prev")}
        </button>
        <button disabled={section === 6} onClick={() => setSection((s) => Math.min(6, s + 1))}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "none", background: section === 6 ? "rgba(0,0,0,0.15)" : T.accent, color: "#fff", cursor: section === 6 ? "default" : "pointer" }}>
          {t("next")}<ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type TFn = (k: string) => string;
type UpFn = (updater: (d: DpiaEdpbDoc) => DpiaEdpbDoc) => void;
type SetFn = <K extends keyof DpiaEdpbDoc>(key: K, value: DpiaEdpbDoc[K]) => void;

// Lista ripetibile generica di party (titolari / responsabili)
function PartyList({ items, onChange, t, addLabel }: { items: EdpbParty[]; onChange: (items: EdpbParty[]) => void; t: TFn; addLabel: string }) {
  return (
    <div>
      {items.map((p, i) => (
        <div key={p.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>#{i + 1}</span>
            <button onClick={() => onChange(items.filter((x) => x.id !== p.id))}
              style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Inp label={t("partyName")} value={p.name} onChange={(v) => onChange(items.map((x) => x.id === p.id ? { ...x, name: v } : x))} />
            <Inp label={t("partyRole")} value={p.role} onChange={(v) => onChange(items.map((x) => x.id === p.id ? { ...x, role: v } : x))} />
          </div>
          <Inp label={t("partyContact")} value={p.contact} onChange={(v) => onChange(items.map((x) => x.id === p.id ? { ...x, contact: v } : x))} />
          <Txt label={t("partyObligations")} value={p.obligations} onChange={(v) => onChange(items.map((x) => x.id === p.id ? { ...x, obligations: v } : x))} rows={2} />
        </div>
      ))}
      <button onClick={() => onChange([...items, emptyParty()])}
        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}>
        <Plus className="h-4 w-4" />{addLabel}
      </button>
    </div>
  );
}

function Section0({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  return (
    <>
      <SectionCard title={`0.1 · ${t("controllersTitle")}`} subtitle={t("controllersHint")}>
        <PartyList items={doc.controllers} onChange={(v) => set("controllers", v)} t={t} addLabel={t("addController")} />
      </SectionCard>

      <SectionCard title={`0.2 · ${t("processorsTitle")}`} subtitle={t("processorsHint")}>
        <PartyList items={doc.processors} onChange={(v) => set("processors", v)} t={t} addLabel={t("addProcessor")} />
      </SectionCard>

      <SectionCard title={`0.3 · ${t("nameTitle")}`}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <Inp label={t("processingName")} hint={t("processingNameHint")} value={doc.processingName} onChange={(v) => set("processingName", v)} />
          <Inp label={t("processingVersion")} value={doc.processingVersion} onChange={(v) => set("processingVersion", v)} />
        </div>
      </SectionCard>

      <SectionCard title={`0.4 · ${t("planningTitle")}`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label={t("launchDate")} hint={t("launchDateHint")} value={doc.launchDate} onChange={(v) => set("launchDate", v)} type="date" />
          <Inp label={t("endDate")} hint={t("endDateHint")} value={doc.endDate} onChange={(v) => set("endDate", v)} />
        </div>
      </SectionCard>

      <SectionCard title={`0.5 · ${t("techSheetTitle")}`} subtitle={t("techSheetHint")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label={t("templateVersion")} value={doc.templateVersion} onChange={(v) => set("templateVersion", v)} />
          <Inp label={t("completionDate")} value={doc.completionDate} onChange={(v) => set("completionDate", v)} type="date" />
        </div>
        <Txt label={t("versionLog")} hint={t("versionLogHint")} value={doc.versionLog} onChange={(v) => set("versionLog", v)} rows={2} />

        <Field label={t("teamTitle")} hint={t("teamHint")}>
          {doc.team.map((m) => (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.8fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input placeholder={t("teamName")} value={m.name} onChange={(e) => set("team", doc.team.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))} style={inputSt} />
              <input placeholder={t("teamRole")} value={m.role} onChange={(e) => set("team", doc.team.map((x) => x.id === m.id ? { ...x, role: e.target.value } : x))} style={inputSt} />
              <input placeholder="R/A/C/I" value={m.raci} onChange={(e) => set("team", doc.team.map((x) => x.id === m.id ? { ...x, raci: e.target.value } : x))} style={inputSt} />
              <button onClick={() => set("team", doc.team.filter((x) => x.id !== m.id))} style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={() => set("team", [...doc.team, emptyTeamMember()])} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}><Plus className="h-4 w-4" />{t("addTeamMember")}</button>
        </Field>

        <Txt label={t("references")} hint={t("referencesHint")} value={doc.references} onChange={(v) => set("references", v)} rows={2} />

        <Field label={t("reasonsTitle")} hint={t("reasonsHint")}>
          {([
            ["mandatory", t("reasonMandatory")],
            ["art35_3a", t("reasonArt35a")],
            ["art35_3b", t("reasonArt35b")],
            ["art35_3c", t("reasonArt35c")],
            ["beneficial", t("reasonBeneficial")],
          ] as const).map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 12, color: T.text }}>
              <input type="checkbox" checked={doc.reasons[k]} onChange={(e) => set("reasons", { ...doc.reasons, [k]: e.target.checked })} style={{ marginTop: 2 }} />
              <span>{label}</span>
            </label>
          ))}
          <input placeholder={t("reasonOther")} value={doc.reasons.other} onChange={(e) => set("reasons", { ...doc.reasons, other: e.target.value })} style={{ ...inputSt, marginTop: 6 }} />
        </Field>

        <Txt label={t("scopeField")} hint={t("scopeFieldHint")} value={doc.scope} onChange={(v) => set("scope", v)} rows={2} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label={t("validationDate")} hint={t("validationDateHint")} value={doc.validationDate} onChange={(v) => set("validationDate", v)} type="date" />
          <Inp label={t("publication")} hint={t("publicationHint")} value={doc.publication} onChange={(v) => set("publication", v)} />
        </div>
      </SectionCard>
    </>
  );
}

function Section1({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  return (
    <>
      <SectionCard title={`1.1.1 · ${t("personalDataTitle")}`}>
        <Txt label={t("personalData")} hint={t("personalDataHint")} value={doc.personalData} onChange={(v) => set("personalData", v)} rows={3} />
        <Txt label={t("specialCategories")} hint={t("specialCategoriesHint")} value={doc.specialCategories} onChange={(v) => set("specialCategories", v)} rows={2} />
      </SectionCard>

      <SectionCard title={`1.1.2 · ${t("purposesTitle")}`} subtitle={t("purposesHint")}>
        {doc.purposes.map((p, i) => (
          <div key={p.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>#{i + 1}</span>
              <button onClick={() => set("purposes", doc.purposes.filter((x) => x.id !== p.id))} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <Txt label={t("purposeField")} value={p.purpose} onChange={(v) => set("purposes", doc.purposes.map((x) => x.id === p.id ? { ...x, purpose: v } : x))} rows={2} />
            <Inp label={t("purposeLegalBasis")} hint={t("purposeLegalBasisHint")} value={p.legalBasis} onChange={(v) => set("purposes", doc.purposes.map((x) => x.id === p.id ? { ...x, legalBasis: v } : x))} />
          </div>
        ))}
        <button onClick={() => set("purposes", [...doc.purposes, emptyPurpose()])} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}><Plus className="h-4 w-4" />{t("addPurpose")}</button>
      </SectionCard>

      <SectionCard title={`1.1.3 · ${t("secondaryUsesTitle")}`}>
        <Txt label={t("secondaryUses")} hint={t("secondaryUsesHint")} value={doc.secondaryUses} onChange={(v) => set("secondaryUses", v)} rows={2} />
      </SectionCard>

      <SectionCard title={`1.1.4 · ${t("natureTitle")}`} subtitle={t("natureHint")}>
        <Txt label={t("nature")} hint={t("natureFieldHint")} value={doc.nature} onChange={(v) => set("nature", v)} rows={2} />
        <Txt label={t("scopeDesc")} hint={t("scopeDescHint")} value={doc.scopeDesc} onChange={(v) => set("scopeDesc", v)} rows={2} />
        <Txt label={t("context")} hint={t("contextHint")} value={doc.context} onChange={(v) => set("context", v)} rows={3} />
      </SectionCard>

      <SectionCard title={`1.2 · ${t("functionalTitle")}`} subtitle={t("functionalHint")}>
        <Txt label={t("functionalDescription")} value={doc.functionalDescription} onChange={(v) => set("functionalDescription", v)} rows={3} />
        <p style={{ ...labelSt, marginTop: 6 }}>{t("lifecycleTitle")}</p>
        <p style={hintSt}>{t("lifecycleHint")}</p>
        <Txt label={t("lcCollection")} value={doc.lifecycle.collection} onChange={(v) => set("lifecycle", { ...doc.lifecycle, collection: v })} rows={2} />
        <Txt label={t("lcUse")} value={doc.lifecycle.use} onChange={(v) => set("lifecycle", { ...doc.lifecycle, use: v })} rows={2} />
        <Txt label={t("lcStorage")} value={doc.lifecycle.storage} onChange={(v) => set("lifecycle", { ...doc.lifecycle, storage: v })} rows={2} />
        <Txt label={t("lcSharing")} value={doc.lifecycle.sharing} onChange={(v) => set("lifecycle", { ...doc.lifecycle, sharing: v })} rows={2} />
        <Txt label={t("lcDeletion")} value={doc.lifecycle.deletion} onChange={(v) => set("lifecycle", { ...doc.lifecycle, deletion: v })} rows={2} />
      </SectionCard>

      <SectionCard title={`1.3 · ${t("assetsTitle")}`} subtitle={t("assetsHint")}>
        {doc.assets.map((a, i) => (
          <div key={a.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>#{i + 1}</span>
              <button onClick={() => set("assets", doc.assets.filter((x) => x.id !== a.id))} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <input placeholder={t("assetName")} value={a.name} onChange={(e) => set("assets", doc.assets.map((x) => x.id === a.id ? { ...x, name: e.target.value } : x))} style={inputSt} />
              <input placeholder={t("assetGroup")} value={a.group} onChange={(e) => set("assets", doc.assets.map((x) => x.id === a.id ? { ...x, group: e.target.value } : x))} style={inputSt} />
              <input placeholder={t("assetType")} value={a.type} onChange={(e) => set("assets", doc.assets.map((x) => x.id === a.id ? { ...x, type: e.target.value } : x))} style={inputSt} />
            </div>
            <textarea placeholder={t("assetDescription")} value={a.description} onChange={(e) => set("assets", doc.assets.map((x) => x.id === a.id ? { ...x, description: e.target.value } : x))} rows={2} style={{ ...inputSt, marginTop: 8, resize: "vertical" }} />
          </div>
        ))}
        <button onClick={() => set("assets", [...doc.assets, emptyAsset()])} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}><Plus className="h-4 w-4" />{t("addAsset")}</button>
        <div style={{ marginTop: 14 }}>
          <Txt label={t("architecture")} hint={t("architectureHint")} value={doc.architecture} onChange={(v) => set("architecture", v)} rows={2} />
        </div>
      </SectionCard>

      <SectionCard title={`1.4 · ${t("codesTitle")}`}>
        <Txt label={t("codesOfConduct")} hint={t("codesHint")} value={doc.codesOfConduct} onChange={(v) => set("codesOfConduct", v)} rows={2} />
      </SectionCard>
    </>
  );
}

// Lista ripetibile di misure con stato di implementazione (2.3)
function MeasureList({ items, onChange, t, addLabel }: { items: EdpbMeasure[]; onChange: (items: EdpbMeasure[]) => void; t: TFn; addLabel: string }) {
  const statuses: MeasureStatus[] = ["planned", "partial", "implemented"];
  return (
    <div>
      {items.map((m, i) => (
        <div key={m.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>#{i + 1}</span>
            <button onClick={() => onChange(items.filter((x) => x.id !== m.id))} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <textarea placeholder={t("measureDescription")} value={m.description} onChange={(e) => onChange(items.map((x) => x.id === m.id ? { ...x, description: e.target.value } : x))} rows={2} style={{ ...inputSt, resize: "vertical", marginBottom: 8 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.muted }}>{t("measureStatus")}</span>
            <select value={m.status} onChange={(e) => onChange(items.map((x) => x.id === m.id ? { ...x, status: e.target.value as MeasureStatus } : x))} style={{ ...inputSt, width: "auto", padding: "6px 10px" }}>
              {statuses.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...items, emptyMeasure()])} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}><Plus className="h-4 w-4" />{addLabel}</button>
    </div>
  );
}

function Section2({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  return (
    <>
      <SectionCard title={`2.1.1 · ${t("legalBasisTitle")}`} subtitle={t("legalBasisHint")}>
        <Txt label={t("legalBasisAnalysis")} value={doc.legalBasisAnalysis} onChange={(v) => set("legalBasisAnalysis", v)} rows={3} />
      </SectionCard>

      <SectionCard title={`2.1.2 · ${t("liftProhibitionTitle")}`}>
        <Txt label={t("liftProhibition")} hint={t("liftProhibitionHint")} value={doc.liftProhibition} onChange={(v) => set("liftProhibition", v)} rows={2} />
      </SectionCard>

      <SectionCard title={`2.2 · ${t("minimisationTitle")}`} subtitle={t("minimisationHint")}>
        <Txt label={t("minimisationRetention")} hint={t("minimisationRetentionHint")} value={doc.minimisationRetention} onChange={(v) => set("minimisationRetention", v)} rows={3} />
        <Txt label={t("dataQuality")} hint={t("dataQualityHint")} value={doc.dataQuality} onChange={(v) => set("dataQuality", v)} rows={2} />
      </SectionCard>

      <SectionCard title={`2.3.1 · ${t("mArt5Title")}`} subtitle={t("mArt5Hint")}>
        <MeasureList items={doc.measuresArt5} onChange={(v) => set("measuresArt5", v)} t={t} addLabel={t("addMeasure")} />
      </SectionCard>
      <SectionCard title={`2.3.2 · ${t("mRightsTitle")}`} subtitle={t("mRightsHint")}>
        <MeasureList items={doc.measuresRights} onChange={(v) => set("measuresRights", v)} t={t} addLabel={t("addMeasure")} />
      </SectionCard>
      <SectionCard title={`2.3.3 · ${t("mOtherTitle")}`} subtitle={t("mOtherHint")}>
        <MeasureList items={doc.measuresOther} onChange={(v) => set("measuresOther", v)} t={t} addLabel={t("addMeasure")} />
      </SectionCard>
      <SectionCard title={`2.3.4 · ${t("mDpbddTitle")}`} subtitle={t("mDpbddHint")}>
        <MeasureList items={doc.measuresDpbdd} onChange={(v) => set("measuresDpbdd", v)} t={t} addLabel={t("addMeasure")} />
      </SectionCard>
      <SectionCard title={`2.3.5 · ${t("mSecurityTitle")}`} subtitle={t("mSecurityHint")}>
        <MeasureList items={doc.measuresSecurity} onChange={(v) => set("measuresSecurity", v)} t={t} addLabel={t("addMeasure")} />
      </SectionCard>
    </>
  );
}

function Section3({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  return (
    <>
      <SectionCard title={`3.1 · ${t("impactsTitle")}`} subtitle={t("impactsHint")}>
        <Txt label={t("impactsRightsFreedoms")} value={doc.impactsRightsFreedoms} onChange={(v) => set("impactsRightsFreedoms", v)} rows={4} />
      </SectionCard>
      <SectionCard title={`3.2 · ${t("necessityTitle")}`}>
        <Txt label={t("necessity")} hint={t("necessityHint")} value={doc.necessity} onChange={(v) => set("necessity", v)} rows={3} />
      </SectionCard>
      <SectionCard title={`3.3 · ${t("proportionalityTitle")}`}>
        <Txt label={t("proportionality")} hint={t("proportionalityHint")} value={doc.proportionality} onChange={(v) => set("proportionality", v)} rows={3} />
      </SectionCard>
    </>
  );
}

function LevelSelect({ label, value, onChange, t }: { label: string; value: RiskLevel; onChange: (v: RiskLevel) => void; t: TFn }) {
  const levels: RiskLevel[] = ["low", "medium", "high"];
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as RiskLevel)} style={inputSt}>
        {levels.map((l) => <option key={l} value={l}>{t(`level_${l}`)}</option>)}
      </select>
    </Field>
  );
}

// 4.1.3 — Lista dei rischi inerenti
function RiskList({ items, onChange, t }: { items: EdpbRisk[]; onChange: (items: EdpbRisk[]) => void; t: TFn }) {
  const patch = (id: string, p: Partial<EdpbRisk>) => onChange(items.map((x) => x.id === id ? { ...x, ...p } : x));
  return (
    <div>
      {items.map((r, i) => (
        <div key={r.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{t("riskLabel")} #{i + 1}</span>
            <button onClick={() => onChange(items.filter((x) => x.id !== r.id))} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <Txt label={t("riskScenario")} hint={t("riskScenarioHint")} value={r.scenario} onChange={(v) => patch(r.id, { scenario: v })} rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Txt label={t("riskThreat")} value={r.threat} onChange={(v) => patch(r.id, { threat: v })} rows={2} />
            <Txt label={t("riskSource")} hint={t("riskSourceHint")} value={r.riskSource} onChange={(v) => patch(r.id, { riskSource: v })} rows={2} />
          </div>
          <Txt label={t("riskImpact")} hint={t("riskImpactHint")} value={r.impact} onChange={(v) => patch(r.id, { impact: v })} rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <LevelSelect label={t("riskLikelihood")} value={r.likelihood} onChange={(v) => patch(r.id, { likelihood: v })} t={t} />
            <LevelSelect label={t("riskSeverity")} value={r.severity} onChange={(v) => patch(r.id, { severity: v })} t={t} />
          </div>
          <Txt label={t("riskModulating")} hint={t("riskModulatingHint")} value={r.modulating} onChange={(v) => patch(r.id, { modulating: v })} rows={2} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text, cursor: "pointer" }}>
            <input type="checkbox" checked={r.acceptable} onChange={(e) => patch(r.id, { acceptable: e.target.checked })} />
            <span>{t("riskAcceptable")}</span>
          </label>
        </div>
      ))}
      <button onClick={() => onChange([...items, emptyRisk()])} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}><Plus className="h-4 w-4" />{t("addRisk")}</button>
    </div>
  );
}

// 4.2.1 — Misure di mitigazione aggiuntive
function MitigationList({ items, onChange, t }: { items: EdpbMitigation[]; onChange: (items: EdpbMitigation[]) => void; t: TFn }) {
  const statuses: MeasureStatus[] = ["planned", "partial", "implemented"];
  const patch = (id: string, p: Partial<EdpbMitigation>) => onChange(items.map((x) => x.id === id ? { ...x, ...p } : x));
  return (
    <div>
      {items.map((m, i) => (
        <div key={m.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>#{i + 1}</span>
            <button onClick={() => onChange(items.filter((x) => x.id !== m.id))} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <textarea placeholder={t("mitDescription")} value={m.description} onChange={(e) => patch(m.id, { description: e.target.value })} rows={2} style={{ ...inputSt, resize: "vertical", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
            <input placeholder={t("mitTargets")} value={m.targetsRisk} onChange={(e) => patch(m.id, { targetsRisk: e.target.value })} style={inputSt} />
            <select value={m.status} onChange={(e) => patch(m.id, { status: e.target.value as MeasureStatus })} style={{ ...inputSt, width: "auto", padding: "6px 10px" }}>
              {statuses.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...items, emptyMitigation()])} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.accent, cursor: "pointer" }}><Plus className="h-4 w-4" />{t("addMitigation")}</button>
    </div>
  );
}

function Section4({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  return (
    <>
      <SectionCard title={`4.1.1 · ${t("eventImpactsTitle")}`} subtitle={t("eventImpactsHint")}>
        <Txt label={t("eventImpacts")} value={doc.eventImpacts} onChange={(v) => set("eventImpacts", v)} rows={4} />
      </SectionCard>
      <SectionCard title={`4.1.2 · ${t("methodTitle")}`}>
        <Txt label={t("riskMethod")} hint={t("methodHint")} value={doc.riskMethod} onChange={(v) => set("riskMethod", v)} rows={3} />
      </SectionCard>
      <SectionCard title={`4.1.3 · ${t("inherentRiskTitle")}`} subtitle={t("inherentRiskHint")}>
        <RiskList items={doc.risks} onChange={(v) => set("risks", v)} t={t} />
      </SectionCard>
      <SectionCard title={`4.2.1 · ${t("mitigationsTitle")}`} subtitle={t("mitigationsHint")}>
        <MitigationList items={doc.mitigations} onChange={(v) => set("mitigations", v)} t={t} />
      </SectionCard>
      <SectionCard title={`4.2.2 · ${t("residualTitle")}`}>
        <Txt label={t("residualRisk")} hint={t("residualHint")} value={doc.residualRisk} onChange={(v) => set("residualRisk", v)} rows={3} />
      </SectionCard>
      <SectionCard title={`4.2.3 · ${t("planTitle")}`}>
        <Txt label={t("actionPlan")} hint={t("planHint")} value={doc.actionPlan} onChange={(v) => set("actionPlan", v)} rows={3} />
      </SectionCard>
    </>
  );
}

function Section5({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  return (
    <>
      <SectionCard title={`5.1 · ${t("dpoTitle")}`} subtitle={t("dpoHint")}>
        <Txt label={t("dpoAdvice")} value={doc.dpoAdvice} onChange={(v) => set("dpoAdvice", v)} rows={3} />
        <Txt label={t("dpoFollowUp")} hint={t("dpoFollowUpHint")} value={doc.dpoFollowUp} onChange={(v) => set("dpoFollowUp", v)} rows={2} />
      </SectionCard>
      <SectionCard title={`5.2 · ${t("subjectsTitle")}`} subtitle={t("subjectsHint")}>
        <Txt label={t("dataSubjectsViews")} value={doc.dataSubjectsViews} onChange={(v) => set("dataSubjectsViews", v)} rows={3} />
        <Txt label={t("dataSubjectsParticipation")} hint={t("subjectsParticipationHint")} value={doc.dataSubjectsParticipation} onChange={(v) => set("dataSubjectsParticipation", v)} rows={2} />
      </SectionCard>
    </>
  );
}

function Section6({ doc, set, t }: { doc: DpiaEdpbDoc; set: SetFn; t: TFn }) {
  const options: { value: DpiaDecision; label: string }[] = [
    { value: "abandon", label: t("decisionAbandon") },
    { value: "consult_sa", label: t("decisionConsult") },
    { value: "proceed", label: t("decisionProceed") },
    { value: "conditional", label: t("decisionConditional") },
  ];
  return (
    <SectionCard title={`6 · ${t("conclusionTitle")}`} subtitle={t("conclusionHint")}>
      <Field label={t("decisionLabel")}>
        {options.map((o) => (
          <label key={o.value} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13, color: T.text }}>
            <input type="radio" name="dpia-decision" checked={doc.decision === o.value} onChange={() => set("decision", o.value)} style={{ marginTop: 3 }} />
            <span>{o.label}</span>
          </label>
        ))}
      </Field>
      {doc.decision === "conditional" && (
        <Txt label={t("decisionConditions")} hint={t("decisionConditionsHint")} value={doc.decisionConditions} onChange={(v) => set("decisionConditions", v)} rows={3} />
      )}
      <Txt label={t("decisionJustification")} hint={t("decisionJustificationHint")} value={doc.decisionJustification} onChange={(v) => set("decisionJustification", v)} rows={2} />
    </SectionCard>
  );
}
