"use client";

import { useState, useRef, useCallback, useEffect, useMemo, CSSProperties } from "react";
import {
  UserCheck, AlertTriangle, Info, CheckCircle2, Copy, Save,
  Building2, Globe, FileText, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import type { AuthRepResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { SystemSelector } from "@/components/compliance/SystemSelector";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#f9f9fb",
  red:     "#dc2626",  redBg:   "rgba(220,38,38,0.06)",  redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#92400e",  amberBg: "rgba(202,138,4,0.07)",  amberBdr:"rgba(202,138,4,0.22)",
  orange:  "#c2410c",  orangeBg:"rgba(194,65,12,0.07)",  orangeBdr:"rgba(194,65,12,0.22)",
  green:   "#15803d",  greenBg: "rgba(22,163,74,0.06)",  greenBdr:"rgba(22,163,74,0.18)",
  blue:    "#1d4ed8",  blueBg:  "rgba(29,78,216,0.05)",  blueBdr: "rgba(29,78,216,0.16)",
  gray:    "#374151",  grayBg:  "rgba(55,65,81,0.06)",   grayBdr: "rgba(55,65,81,0.18)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid rgba(0,0,0,0.07)`, fontSize: 12,
  color: T.text, background: T.card, outline: "none",
};

const taSt: CSSProperties = { ...inputSt, resize: "vertical" };

const DRAFT_KEY = "aicomply_auth_rep_draft";

// ─── Constants ────────────────────────────────────────────────────────────────

const EU_MEMBER_STATES = new Set([
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca",
  "Estonia", "Finlandia", "Francia", "Germania", "Grecia", "Irlanda",
  "Italia", "Lettonia", "Lituania", "Lussemburgo", "Malta", "Paesi Bassi",
  "Polonia", "Portogallo", "Repubblica Ceca", "Romania", "Slovacchia",
  "Slovenia", "Spagna", "Svezia", "Ungheria",
]);

const EU_MEMBER_STATES_LIST = [
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca",
  "Estonia", "Finlandia", "Francia", "Germania", "Grecia", "Irlanda",
  "Italia", "Lettonia", "Lituania", "Lussemburgo", "Malta", "Paesi Bassi",
  "Polonia", "Portogallo", "Repubblica Ceca", "Romania", "Slovacchia",
  "Slovenia", "Spagna", "Svezia", "Ungheria",
];

const ALL_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Arabia Saudita", "Argentina",
  "Australia", "Brasile", "Canada", "Cina", "Corea del Sud",
  "Emirati Arabi", "Giappone", "India", "Indonesia", "Israele",
  "Malaysia", "Messico", "Nigeria", "Norvegia", "Nuova Zelanda",
  "Pakistan", "Regno Unito", "Russia", "Singapore", "Stati Uniti",
  "Sudafrica", "Svizzera", "Taiwan", "Turchia", "Ucraina", "Vietnam",
  "Altro paese non-UE",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type EligAnswer = "yes" | "no" | "unsure" | "";

interface ARChecklistItem {
  id: string;
  label: string;
  article: string;
  completed: boolean;
  notes: string;
  evidenceLabel?: string;
  evidenceValue: string;
}

interface AuthRepDoc {
  eligibility: {
    provider_non_eu: EligAnswer;
    high_risk: EligAnswer;
  };
  provider_name: string;
  provider_country: string;
  provider_address: string;
  provider_contact_email: string;
  ar_name: string;
  ar_country: string;
  ar_address: string;
  ar_contact_name: string;
  ar_contact_email: string;
  ar_contact_phone: string;
  ar_vat_number: string;
  system_name: string;
  system_version: string;
  annex_reference: string;
  mandate_start_date: string;
  mandate_duration: "indefinite" | "fixed";
  mandate_end_date: string;
  mandate_signed: boolean;
  mandate_signed_date: string;
  eudb_registered_by_ar: boolean;
  eudb_number: string;
  checklist: ARChecklistItem[];
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChecklist(): ARChecklistItem[] {
  return [
    {
      id: "eudb",
      label: "AR registrata nel EUDB per conto del provider (Art. 22(2)(a))",
      article: "Art. 22(2)(a)",
      completed: false,
      notes: "",
      evidenceLabel: "Numero registrazione EUDB",
      evidenceValue: "",
    },
    {
      id: "doc_conformity",
      label: "Dichiarazione di conformità UE verificata e in custodia dell'AR (Art. 22(2)(b))",
      article: "Art. 22(2)(b)",
      completed: false,
      notes: "",
      evidenceValue: "",
    },
    {
      id: "doc_technical",
      label: "Documentazione tecnica verificata e accessibile all'AR (Art. 22(2)(b))",
      article: "Art. 22(2)(b)",
      completed: false,
      notes: "",
      evidenceValue: "",
    },
    {
      id: "notifica",
      label: "Procedura notifica autorita' attivata — referente AR designato (Art. 22(2)(c))",
      article: "Art. 22(2)(c)",
      completed: false,
      notes: "",
      evidenceValue: "",
    },
    {
      id: "terminazione",
      label: "Procedura di terminazione mandato documentata (Art. 22(2)(d))",
      article: "Art. 22(2)(d)",
      completed: false,
      notes: "",
      evidenceValue: "",
    },
    {
      id: "firma",
      label: "Mandato firmato da entrambe le parti e archiviato",
      article: "Art. 22(1)",
      completed: false,
      notes: "",
      evidenceLabel: "Data firma",
      evidenceValue: "",
    },
  ];
}

function createEmptyDoc(): AuthRepDoc {
  return {
    eligibility: { provider_non_eu: "", high_risk: "" },
    provider_name: "", provider_country: "", provider_address: "", provider_contact_email: "",
    ar_name: "", ar_country: "Italia", ar_address: "",
    ar_contact_name: "", ar_contact_email: "", ar_contact_phone: "", ar_vat_number: "",
    system_name: "", system_version: "", annex_reference: "",
    mandate_start_date: "", mandate_duration: "indefinite", mandate_end_date: "",
    mandate_signed: false, mandate_signed_date: "",
    eudb_registered_by_ar: false, eudb_number: "",
    checklist: makeChecklist(),
    updatedAt: new Date().toISOString(),
  };
}

function loadDraft(): AuthRepDoc {
  try {
    if (typeof window === "undefined") return createEmptyDoc();
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return createEmptyDoc();
    const parsed = JSON.parse(raw) as Partial<AuthRepDoc>;
    const base = createEmptyDoc();
    return {
      ...base,
      ...parsed,
      eligibility: { ...base.eligibility, ...(parsed.eligibility ?? {}) },
      checklist: parsed.checklist?.length ? parsed.checklist : base.checklist,
    };
  } catch {
    return createEmptyDoc();
  }
}

function generateMandate(doc: AuthRepDoc): string {
  const durationLine = doc.mandate_duration === "indefinite"
    ? "Tempo indeterminato"
    : `Fino al ${doc.mandate_end_date || "[DA INSERIRE]"}`;

  return `MANDATO DI AUTHORIZED REPRESENTATIVE
ai sensi dell'Art. 22 del Regolamento (UE) 2024/1689 (AI Act)
Generato da AIComply il ${new Date().toLocaleDateString("it-IT")}

${SEP}
PARTI
${SEP}
PROVIDER (mandante):
${doc.provider_name || "[DA INSERIRE]"}
${doc.provider_address || "[DA INSERIRE]"} -- ${doc.provider_country || "[DA INSERIRE]"}
Email: ${doc.provider_contact_email || "[DA INSERIRE]"}

AUTHORIZED REPRESENTATIVE (mandatario):
${doc.ar_name || "[DA INSERIRE]"}
${doc.ar_address || "[DA INSERIRE]"} -- ${doc.ar_country || "[DA INSERIRE]"} (Unione Europea)
Referente: ${doc.ar_contact_name || "[DA INSERIRE]"} | ${doc.ar_contact_email || "[DA INSERIRE]"} | ${doc.ar_contact_phone || "[DA INSERIRE]"}
VAT/P.IVA: ${doc.ar_vat_number || "[DA INSERIRE]"}

${SEP}
OGGETTO DEL MANDATO
${SEP}
Sistema AI: ${doc.system_name || "[DA INSERIRE]"} -- Versione ${doc.system_version || "[DA INSERIRE]"}
Riferimento normativo: ${doc.annex_reference || "[DA INSERIRE]"}
Decorrenza: ${doc.mandate_start_date || "[DA INSERIRE]"}
Durata: ${durationLine}

${SEP}
POTERI CONFERITI
${SEP}
Il Provider conferisce all'AR i seguenti poteri, in conformita' all'Art. 22(2) del Regolamento (UE) 2024/1689:

1. Registrazione nel database UE (EUDB) ai sensi dell'Art. 49 per conto del Provider
2. Verifica e custodia della dichiarazione di conformita' UE e della documentazione tecnica
3. Trasmissione alle autorita' di vigilanza di tutte le informazioni e documentazione richiesta
4. Notifica immediata al Provider di qualsiasi richiesta, indagine o azione correttiva delle autorita'
5. Cooperazione piena con le autorita' di vigilanza del mercato per qualsiasi azione correttiva
6. Facolta' di terminare il presente mandato con notifica alle autorita' competenti qualora il Provider agisca in violazione degli obblighi del Regolamento (UE) 2024/1689

${SEP}
OBBLIGHI DEL PROVIDER
${SEP}
Il Provider si impegna a:
- Fornire all'AR tutta la documentazione tecnica necessaria
- Informare tempestivamente l'AR di qualsiasi modifica al sistema
- Non agire in modo incompatibile con il presente mandato

${SEP}
FIRME
${SEP}
Provider: _________________________ Data: _____________
Nome e qualifica: _________________________

Authorized Representative: _________________________ Data: _____________
Nome e qualifica: _________________________

[Il presente mandato deve essere firmato da entrambe le parti e conservato per tutta la durata
della commercializzazione del sistema AI nell'UE e per almeno 10 anni successivi]`.trim();
}

const SEP = "-------------------------------------------";

function isEUCountry(country: string): boolean {
  return EU_MEMBER_STATES.has(country);
}

// ─── RadioGroup ───────────────────────────────────────────────────────────────

function RadioGroup({
  value,
  onChange,
  name,
}: {
  value: EligAnswer;
  onChange: (v: EligAnswer) => void;
  name: string;
}) {
  const opts: { v: EligAnswer; label: string; activeBg: string; activeCol: string; activeBdr: string }[] = [
    { v: "yes",    label: "Si'",        activeBg: T.greenBg,  activeCol: T.green,  activeBdr: T.greenBdr  },
    { v: "no",     label: "No",         activeBg: T.redBg,    activeCol: T.red,    activeBdr: T.redBdr    },
    { v: "unsure", label: "Non sicuro", activeBg: T.amberBg,  activeCol: T.amber,  activeBdr: T.amberBdr  },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map(o => (
        <label
          key={o.v}
          style={{
            display: "flex", alignItems: "center", cursor: "pointer",
            fontSize: 11, padding: "4px 10px", borderRadius: 6,
            background: value === o.v ? o.activeBg : "transparent",
            color: value === o.v ? o.activeCol : T.muted,
            border: `1px solid ${value === o.v ? o.activeBdr : T.border}`,
            transition: "all 0.15s",
          }}
        >
          <input
            type="radio"
            name={name}
            value={o.v}
            checked={value === o.v}
            onChange={() => onChange(o.v)}
            style={{ display: "none" }}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// ─── ChecklistRow ─────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  onChange,
}: {
  item: ARChecklistItem;
  onChange: (updated: ARChecklistItem) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: `1px solid ${item.completed ? T.greenBdr : T.border}`,
        borderRadius: 8,
        background: item.completed ? T.greenBg : T.card,
        overflow: "hidden",
        transition: "all 0.15s",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", cursor: "pointer",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <input
          type="checkbox"
          checked={item.completed}
          onChange={e => {
            e.stopPropagation();
            onChange({ ...item, completed: e.target.checked });
          }}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: T.green, flexShrink: 0, width: 14, height: 14 }}
        />
        <span style={{ flex: 1, fontSize: 12, color: item.completed ? T.green : T.text, fontWeight: 500 }}>
          {item.label}
        </span>
        <span style={{ fontSize: 10, color: T.muted, marginRight: 6 }}>{item.article}</span>
        <ChevronDown
          size={12}
          style={{
            color: T.muted, flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        />
      </div>

      {/* Body */}
      {open && (
        <div
          style={{
            padding: "0 14px 12px",
            borderTop: `1px solid ${T.border}`,
            paddingTop: 10,
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          {item.evidenceLabel && (
            <div>
              <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>
                Evidenza: {item.evidenceLabel}
              </label>
              <input
                style={{ ...inputSt, maxWidth: 340 }}
                value={item.evidenceValue}
                onChange={e => onChange({ ...item, evidenceValue: e.target.value })}
                placeholder="Inserisci evidenza..."
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>
              Note
            </label>
            <textarea
              style={{ ...taSt, minHeight: 52 }}
              value={item.notes}
              onChange={e => onChange({ ...item, notes: e.target.value })}
              placeholder="Note aggiuntive..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuthorizedRepPage() {
  const [doc, setDoc] = useState<AuthRepDoc>(() => loadDraft());
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-populate system_name from Classifier
  const classifierData = useMemo(() => {
    try { const r = localStorage.getItem("aicomply_classifier_result"); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }, []);
  useEffect(() => {
    if (classifierData?.systemName && !doc.system_name) {
      patchField("system_name", classifierData.systemName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classifierData]);

  const scheduleSave = useCallback((d: AuthRepDoc) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, updatedAt: new Date().toISOString() }));
      } catch { /* ignore */ }
    }, 800);
  }, []);

  function patch(updater: (prev: AuthRepDoc) => AuthRepDoc) {
    setDoc(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }

  function patchField<K extends keyof AuthRepDoc>(field: K, val: AuthRepDoc[K]) {
    patch(d => ({ ...d, [field]: val }));
  }

  function patchChecklist(id: string, updated: ARChecklistItem) {
    patch(d => ({
      ...d,
      checklist: d.checklist.map(item => item.id === id ? updated : item),
    }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave() {
    writeToStorage<AuthRepResult>("authorizedRep", {
      provider_name: doc.provider_name,
      provider_country: doc.provider_country,
      ar_name: doc.ar_name,
      ar_country: doc.ar_country,
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

  // ── Eligibility banner ────────────────────────────────────────────────────

  const { provider_non_eu, high_risk } = doc.eligibility;
  const eligComplete = provider_non_eu !== "" && high_risk !== "";
  const showForms =
    eligComplete &&
    (provider_non_eu === "yes" || provider_non_eu === "unsure") &&
    (high_risk === "yes" || high_risk === "unsure");

  type BannerKind = "required" | "not_required" | "unsure" | null;
  let bannerKind: BannerKind = null;
  if (eligComplete) {
    if (provider_non_eu === "no") bannerKind = "not_required";
    else if (provider_non_eu === "yes" && high_risk === "yes") bannerKind = "required";
    else if (provider_non_eu === "unsure" || high_risk === "unsure") bannerKind = "unsure";
    else bannerKind = "not_required";
  }

  // ── AR country warning ────────────────────────────────────────────────────

  const arCountryInvalid = doc.ar_country !== "" && !isEUCountry(doc.ar_country);

  // ── Checklist progress ────────────────────────────────────────────────────

  const doneCount = doc.checklist.filter(i => i.completed).length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <SystemSelector checkProhibited={true} />
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <UserCheck size={16} style={{ color: T.blue }} />
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016", margin: 0 }}>Authorized Representative Wizard</h1>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600,
            background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}`,
          }}>Art. 22</span>
        </div>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          Nomina dell&apos;Authorized Representative per provider non-UE — Regolamento (UE) 2024/1689
        </p>
      </div>

      {/* ── Sezione 1 — Verifica applicabilita' ────────────────────────────── */}

      <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
          <Info size={13} style={{ color: T.blue }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Sezione 1 — Verifica applicabilita'</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Q1 */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: 14, borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`,
            gap: 16,
          }}>
            <p style={{ fontSize: 12, color: T.text, margin: 0, flex: 1 }}>
              Il provider del sistema e' stabilito al di fuori dell&apos;Unione Europea?
            </p>
            <RadioGroup
              value={doc.eligibility.provider_non_eu}
              onChange={v => patch(d => ({ ...d, eligibility: { ...d.eligibility, provider_non_eu: v } }))}
              name="provider_non_eu"
            />
          </div>

          {/* Q2 */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: 14, borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`,
            gap: 16,
          }}>
            <p style={{ fontSize: 12, color: T.text, margin: 0, flex: 1 }}>
              Il sistema AI e' classificato come alto rischio (Annex III) o e' un GPAI con rischio sistemico?
            </p>
            <RadioGroup
              value={doc.eligibility.high_risk}
              onChange={v => patch(d => ({ ...d, eligibility: { ...d.eligibility, high_risk: v } }))}
              name="high_risk"
            />
          </div>
        </div>

        {/* Banner */}
        {bannerKind === "required" && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 8,
            background: T.orangeBg, border: `1px solid ${T.orangeBdr}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertTriangle size={14} style={{ color: T.orange, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: T.orange, fontWeight: 500, margin: 0 }}>
              Authorized Representative obbligatorio — compilare il mandato nelle sezioni sottostanti
            </p>
          </div>
        )}
        {bannerKind === "not_required" && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 8,
            background: T.grayBg, border: `1px solid ${T.grayBdr}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Info size={14} style={{ color: T.gray, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: T.gray, margin: 0 }}>
              Art. 22 non applicabile — il provider e' stabilito nell&apos;UE.{" "}
              <Link href="/dashboard/tools/eudb" style={{ color: T.blue }}>Vai al wizard EUDB</Link>
            </p>
          </div>
        )}
        {bannerKind === "unsure" && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 8,
            background: T.amberBg, border: `1px solid ${T.amberBdr}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertTriangle size={14} style={{ color: T.amber, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: T.amber, margin: 0 }}>
              Situazione incerta — verifica con il{" "}
              <Link href="/dashboard/tools/legal-assistant" style={{ color: T.blue }}>Legal Assistant</Link>
            </p>
          </div>
        )}
      </div>

      {/* ── Sezioni 2 & 3 — visibili solo se rilevante ────────────────────── */}

      {showForms && (
        <>
          {/* Sezione 2 — Dati provider estero + AR */}
          <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
              <Building2 size={13} style={{ color: T.blue }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Sezione 2 — Dati provider estero + AR designato</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Left — Provider */}
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: T.muted,
                  textTransform: "uppercase", letterSpacing: "0.6px",
                  margin: "0 0 12px",
                }}>
                  Provider (mandante)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Field label="Ragione sociale *">
                    <input style={inputSt} value={doc.provider_name}
                      onChange={e => patchField("provider_name", e.target.value)}
                      placeholder="es. Acme AI Corp" />
                  </Field>
                  <Field label="Paese di stabilimento *">
                    <select style={inputSt} value={doc.provider_country}
                      onChange={e => patchField("provider_country", e.target.value)}>
                      <option value="">Seleziona paese...</option>
                      {ALL_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Indirizzo *">
                    <input style={inputSt} value={doc.provider_address}
                      onChange={e => patchField("provider_address", e.target.value)}
                      placeholder="123 Main St, New York, NY 10001" />
                  </Field>
                  <Field label="Email di contatto *">
                    <input style={inputSt} type="email" value={doc.provider_contact_email}
                      onChange={e => patchField("provider_contact_email", e.target.value)}
                      placeholder="legal@acme.com" />
                  </Field>
                </div>
              </div>

              {/* Separator */}
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: -12, top: 0, bottom: 0,
                  width: 1, background: T.border,
                }} />
                <p style={{
                  fontSize: 11, fontWeight: 600, color: T.muted,
                  textTransform: "uppercase", letterSpacing: "0.6px",
                  margin: "0 0 12px",
                }}>
                  Authorized Representative (mandatario)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Field label="Ragione sociale AR *">
                    <input style={inputSt} value={doc.ar_name}
                      onChange={e => patchField("ar_name", e.target.value)}
                      placeholder="es. EU Compliance Services S.r.l." />
                  </Field>
                  <Field label="Paese AR (deve essere SM UE) *">
                    <select
                      style={{
                        ...inputSt,
                        borderColor: arCountryInvalid ? T.red : T.border,
                        background: arCountryInvalid ? T.redBg : T.card,
                      }}
                      value={doc.ar_country}
                      onChange={e => patchField("ar_country", e.target.value)}
                    >
                      <option value="">Seleziona paese UE...</option>
                      {EU_MEMBER_STATES_LIST.map(c => <option key={c}>{c}</option>)}
                      <optgroup label="Fuori UE (non valido)">
                        {ALL_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </optgroup>
                    </select>
                    {arCountryInvalid && (
                      <p style={{ fontSize: 11, color: T.red, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={11} />
                        L&apos;AR deve essere stabilito in uno Stato Membro dell&apos;UE (Art. 22(1))
                      </p>
                    )}
                  </Field>
                  <Field label="Indirizzo AR *">
                    <input style={inputSt} value={doc.ar_address}
                      onChange={e => patchField("ar_address", e.target.value)}
                      placeholder="Via Roma 1, 00100 Roma" />
                  </Field>
                  <Field label="Nome referente AR *">
                    <input style={inputSt} value={doc.ar_contact_name}
                      onChange={e => patchField("ar_contact_name", e.target.value)}
                      placeholder="Mario Rossi" />
                  </Field>
                  <Field label="Email AR *">
                    <input style={inputSt} type="email" value={doc.ar_contact_email}
                      onChange={e => patchField("ar_contact_email", e.target.value)}
                      placeholder="ar@eucomplianceservices.it" />
                  </Field>
                  <Field label="Telefono AR">
                    <input style={inputSt} value={doc.ar_contact_phone}
                      onChange={e => patchField("ar_contact_phone", e.target.value)}
                      placeholder="+39 06 xxxxxxxx" />
                  </Field>
                  <Field label="VAT / P.IVA AR *">
                    <input style={inputSt} value={doc.ar_vat_number}
                      onChange={e => patchField("ar_vat_number", e.target.value)}
                      placeholder="IT12345678901" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Sistema coperto */}
            <div style={{
              marginTop: 20, paddingTop: 18,
              borderTop: `1px solid ${T.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                <Globe size={13} style={{ color: T.blue }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>Sistema coperto dal mandato</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Denominazione sistema *">
                  <input style={inputSt} value={doc.system_name}
                    onChange={e => patchField("system_name", e.target.value)}
                    placeholder="es. HireBot Pro" />
                </Field>
                <Field label="Versione *">
                  <input style={inputSt} value={doc.system_version}
                    onChange={e => patchField("system_version", e.target.value)}
                    placeholder="es. 2.1.0" />
                </Field>
                <Field label="Riferimento normativo *">
                  <input style={inputSt} value={doc.annex_reference}
                    onChange={e => patchField("annex_reference", e.target.value)}
                    placeholder="es. Annex III, punto 4 -- Occupazione" />
                </Field>
                <Field label="Data decorrenza mandato *">
                  <input style={inputSt} type="date" value={doc.mandate_start_date}
                    onChange={e => patchField("mandate_start_date", e.target.value)} />
                </Field>
                <Field label="Durata mandato">
                  <select style={inputSt} value={doc.mandate_duration}
                    onChange={e => patchField("mandate_duration", e.target.value as "indefinite" | "fixed")}>
                    <option value="indefinite">Tempo indeterminato</option>
                    <option value="fixed">Durata determinata</option>
                  </select>
                </Field>
                {doc.mandate_duration === "fixed" && (
                  <Field label="Data scadenza mandato *">
                    <input style={inputSt} type="date" value={doc.mandate_end_date}
                      onChange={e => patchField("mandate_end_date", e.target.value)} />
                  </Field>
                )}
              </div>
            </div>
          </div>

          {/* Sezione 3 — Mandato + checklist */}
          <div style={{ ...cardSt, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <FileText size={13} style={{ color: T.blue }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Sezione 3 — Mandato scritto generato</p>
            </div>

            {/* Mandate preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
                  Testo generato automaticamente — revisiona prima della firma
                </p>
                <button
                  onClick={handleCopy}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                    background: copied ? T.greenBg : T.bg,
                    color: copied ? T.green : T.muted,
                    border: `1px solid ${copied ? T.greenBdr : T.border}`,
                  }}
                >
                  <Copy size={11} />
                  {copied ? "Copiato!" : "Copia mandato"}
                </button>
              </div>
              <textarea
                readOnly
                value={generateMandate(doc)}
                style={{
                  ...taSt,
                  height: 400,
                  fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                  fontSize: 11,
                  lineHeight: 1.7,
                  background: T.bg,
                  color: T.text,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Mandate signed */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
              padding: 14, borderRadius: 8, background: T.bg,
              border: `1px solid ${T.border}`, marginBottom: 20,
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={doc.mandate_signed}
                  onChange={e => patchField("mandate_signed", e.target.checked)}
                  style={{ accentColor: T.green, width: 14, height: 14 }}
                />
                Mandato firmato da entrambe le parti
              </label>
              {doc.mandate_signed && (
                <Field label="Data firma">
                  <input style={inputSt} type="date" value={doc.mandate_signed_date}
                    onChange={e => patchField("mandate_signed_date", e.target.value)} />
                </Field>
              )}
            </div>

            {/* AR Checklist */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <CheckCircle2 size={13} style={{ color: T.green }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>
                    Checklist obblighi AR (Art. 22(2))
                  </p>
                </div>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 500,
                  background: doneCount === doc.checklist.length ? T.greenBg : T.bg,
                  color: doneCount === doc.checklist.length ? T.green : T.muted,
                  border: `1px solid ${doneCount === doc.checklist.length ? T.greenBdr : T.border}`,
                }}>
                  {doneCount}/{doc.checklist.length} completati
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doc.checklist.map(item => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    onChange={updated => patchChecklist(item.id, updated)}
                  />
                ))}
              </div>
            </div>

            {/* Save */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingTop: 16, borderTop: `1px solid ${T.border}`,
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>Salva nel dossier</p>
                <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0" }}>
                  Registra l&apos;AR nel tuo Dossier AI Act per la conformita' Art. 22.
                </p>
              </div>
              <button
                onClick={handleSave}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                  background: T.blue, color: "#ffffff",
                  border: "none", cursor: "pointer",
                }}
              >
                <Save size={13} />
                Salva nel dossier
              </button>
            </div>
          </div>

          <SignOffPanel toolKey="authorized-rep" toolLabel="Authorized Representative -- Art. 22" />
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "10px 18px", borderRadius: 10,
          background: T.green, color: "#fff",
          fontSize: 12, fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
