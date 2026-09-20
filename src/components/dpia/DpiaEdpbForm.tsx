"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, RotateCcw, Check } from "lucide-react";
import { useT } from "@/i18n/LocaleProvider";
import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import {
  createEmptyDpiaEdpb, emptyParty, emptyPurpose, emptyAsset, emptyTeamMember, emptyMeasure,
  EDPB_SECTIONS, type DpiaEdpbDoc, type EdpbParty, type EdpbPurpose, type EdpbAsset, type EdpbTeamMember,
  type EdpbMeasure, type MeasureStatus,
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
  const [doc, setDoc] = useState<DpiaEdpbDoc>(createEmptyDpiaEdpb);
  const [section, setSection] = useState(0);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          <button onClick={handleReset} title={t("resetBtn")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.redBdr}`, background: T.redBg, color: T.red, cursor: "pointer" }}>
            <RotateCcw className="h-3.5 w-3.5" /><span>{t("resetBtn")}</span>
          </button>
        </div>
      </div>

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
      {section >= 4 && (
        <SectionCard title={`${section}. ${t(`sec${section}Tab`)}`}>
          <div style={{ padding: "22px 0", textAlign: "center", color: T.muted }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t("comingTitle")}</p>
            <p style={{ fontSize: 12 }}>{t("comingBody")}</p>
          </div>
        </SectionCard>
      )}

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
