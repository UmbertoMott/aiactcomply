"use client";

import { useState, useRef, useEffect, useCallback, useMemo, CSSProperties } from "react";
import {
  Database, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  Info, Copy, Save, Globe, Building2, FileText,
} from "lucide-react";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { EUDBResult, ConformityResult, AuthRepResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

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
  border: `1px solid ${T.border}`, fontSize: 12,
  color: T.text, background: T.card, outline: "none",
};

const taSt: CSSProperties = { ...inputSt, resize: "vertical" };

const DRAFT_KEY = "aicomply_eudb_draft";

// ─── Constants ────────────────────────────────────────────────────────────────

const EU_MEMBER_STATES = [
  "Tutti gli Stati Membri UE",
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca",
  "Estonia", "Finlandia", "Francia", "Germania", "Grecia", "Irlanda",
  "Italia", "Lettonia", "Lituania", "Lussemburgo", "Malta", "Paesi Bassi",
  "Polonia", "Portogallo", "Repubblica Ceca", "Romania", "Slovacchia",
  "Slovenia", "Spagna", "Svezia", "Ungheria",
];

const RISK_CLASSIFICATIONS = [
  "Sistema ad alto rischio — Annex III (Art. 6(2))",
  "Sistema ad alto rischio — Annex I (Art. 6(1))",
  "GPAI model — rischio sistemico (Art. 51)",
  "Sistema ad alto rischio — Annex I + Annex III",
];

const EU_COUNTRIES = [
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca",
  "Estonia", "Finlandia", "Francia", "Germania", "Grecia", "Irlanda",
  "Italia", "Lettonia", "Lituania", "Lussemburgo", "Malta", "Paesi Bassi",
  "Polonia", "Portogallo", "Repubblica Ceca", "Romania", "Slovacchia",
  "Slovenia", "Spagna", "Svezia", "Ungheria",
  "Norvegia (SEE)", "Islanda (SEE)", "Liechtenstein (SEE)",
  "Regno Unito", "Svizzera", "Altro",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type EligibilityAnswer = "yes" | "no" | "unsure" | "";

interface EUDBEligibility {
  q1_high_risk: EligibilityAnswer;
  q2_is_provider: EligibilityAnswer;
  q3_public_deployer: EligibilityAnswer;
  q4_gpai_systemic: EligibilityAnswer;
}

interface EUDBProviderData {
  provider_name: string;
  provider_address: string;
  provider_country: string;
  contact_email: string;
  contact_phone: string;
  contact_name: string;
  has_authorized_rep: boolean;
  ar_name: string;
  ar_address: string;
  ar_country: string;
  ar_email: string;
}

interface EUDBSystemData {
  system_name: string;
  system_version: string;
  intended_purpose: string;
  registration_status: "new" | "update" | "withdrawal";
  member_states: string[];
  risk_classification: string;
  annex_reference: string;
  conformity_declaration_number: string;
  instructions_url: string;
  technical_doc_url: string;
  notified_body_certificate: string;
}

interface EUDBDoc {
  eligibility: EUDBEligibility;
  provider: EUDBProviderData;
  system: EUDBSystemData;
  eudb_registration_number: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createEmptyDoc(): EUDBDoc {
  return {
    eligibility: {
      q1_high_risk: "",
      q2_is_provider: "",
      q3_public_deployer: "",
      q4_gpai_systemic: "",
    },
    provider: {
      provider_name: "", provider_address: "", provider_country: "Italia",
      contact_email: "", contact_phone: "", contact_name: "",
      has_authorized_rep: false,
      ar_name: "", ar_address: "", ar_country: "", ar_email: "",
    },
    system: {
      system_name: "", system_version: "", intended_purpose: "",
      registration_status: "new",
      member_states: [],
      risk_classification: "", annex_reference: "",
      conformity_declaration_number: "", instructions_url: "",
      technical_doc_url: "",
      notified_body_certificate: "",
    },
    eudb_registration_number: "",
    updatedAt: new Date().toISOString(),
  };
}

function loadDraft(): EUDBDoc {
  try {
    if (typeof window === "undefined") return createEmptyDoc();
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as EUDBDoc) : createEmptyDoc();
  } catch {
    return createEmptyDoc();
  }
}

function eligibilityStatus(e: EUDBEligibility): "required" | "not_required" | "unsure" | "incomplete" {
  const answers = [e.q1_high_risk, e.q2_is_provider, e.q3_public_deployer, e.q4_gpai_systemic];
  if (answers.some(a => a === "")) return "incomplete";
  if (answers.some(a => a === "unsure")) return "unsure";
  // Required if: (q1=yes AND q2=yes) OR q3=yes OR q4=yes
  if ((e.q1_high_risk === "yes" && e.q2_is_provider === "yes") ||
      e.q3_public_deployer === "yes" ||
      e.q4_gpai_systemic === "yes") return "required";
  return "not_required";
}

function isRegistrationRequired(e: EUDBEligibility): boolean {
  return eligibilityStatus(e) === "required";
}

function generateAnnexVIII(doc: EUDBDoc): string {
  const p = doc.provider;
  const s = doc.system;
  const regStatusLabel =
    s.registration_status === "new" ? "Prima registrazione" :
    s.registration_status === "update" ? "Aggiornamento" :
    "Ritiro dal mercato";
  return `ANNEX VIII — INFORMAZIONI PER LA REGISTRAZIONE NEL DATABASE UE (Art. 49)
Regolamento (UE) 2024/1689 — Generato da AIComply il ${new Date().toLocaleDateString("it-IT")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEZIONE A — DATI DEL PROVIDER / AUTHORIZED REPRESENTATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provider: ${p.provider_name || "[DA INSERIRE]"}
Indirizzo: ${p.provider_address || "[DA INSERIRE]"}, ${p.provider_country || "[DA INSERIRE]"}
Referente: ${p.contact_name || "[DA INSERIRE]"} | ${p.contact_email || "[DA INSERIRE]"} | ${p.contact_phone || "[DA INSERIRE]"}
${p.has_authorized_rep
  ? `\nAuthorized Representative: ${p.ar_name || "[DA INSERIRE]"}\nIndirizzo AR: ${p.ar_address || "[DA INSERIRE]"}, ${p.ar_country || "[DA INSERIRE]"}\nEmail AR: ${p.ar_email || "[DA INSERIRE]"}`
  : "Authorized Representative: Non applicabile (provider stabilito in UE)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEZIONE B — DATI DEL SISTEMA AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Denominazione: ${s.system_name || "[DA INSERIRE]"} — Versione ${s.system_version || "[DA INSERIRE]"}
Scopo previsto: ${s.intended_purpose || "[DA INSERIRE]"}
Stato registrazione: ${regStatusLabel}
Classificazione rischio: ${s.risk_classification || "[DA INSERIRE]"}
Riferimento normativo: ${s.annex_reference || "[DA INSERIRE]"}
Stati membri: ${s.member_states.length > 0 ? s.member_states.join(", ") : "[DA INSERIRE]"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEZIONE C — DOCUMENTAZIONE DI CONFORMITÀ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N. Dichiarazione di Conformità UE: ${s.conformity_declaration_number || "[DA INSERIRE]"}
URL Istruzioni per l'uso: ${s.instructions_url || "[DA INSERIRE]"}
URL Documentazione Tecnica (Annex VIII): ${s.technical_doc_url || "[DA INSERIRE]"}
Certificato Notified Body: ${s.notified_body_certificate || "Non applicabile"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUMERO REGISTRAZIONE EUDB (dopo upload)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${doc.eudb_registration_number || "[INSERIRE DOPO REGISTRAZIONE SUL PORTALE EC]"}`.trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RadioGroup({
  value,
  onChange,
  name,
}: {
  value: EligibilityAnswer;
  onChange: (v: EligibilityAnswer) => void;
  name: string;
}) {
  const opts: { v: EligibilityAnswer; label: string; color: string }[] = [
    { v: "yes",   label: "Sì",        color: T.green  },
    { v: "no",    label: "No",        color: T.red    },
    { v: "unsure",label: "Non sicuro", color: T.amber  },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {opts.map(o => (
        <label
          key={o.v}
          style={{
            display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
            fontSize: 12, color: value === o.v ? o.color : T.muted,
            padding: "5px 10px", borderRadius: 6,
            background: value === o.v ? (
              o.v === "yes" ? T.greenBg : o.v === "no" ? T.redBg : T.amberBg
            ) : "transparent",
            border: `1px solid ${value === o.v ? (
              o.v === "yes" ? T.greenBdr : o.v === "no" ? T.redBdr : T.amberBdr
            ) : T.border}`,
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

function MemberStatesSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggle(sm: string) {
    if (sm === "Tutti gli Stati Membri UE") {
      if (selected.includes("Tutti gli Stati Membri UE")) {
        onChange([]);
      } else {
        onChange(["Tutti gli Stati Membri UE"]);
      }
      return;
    }
    const without = selected.filter(s => s !== "Tutti gli Stati Membri UE");
    if (without.includes(sm)) {
      onChange(without.filter(s => s !== sm));
    } else {
      onChange([...without, sm]);
    }
  }

  const displayText = selected.length === 0
    ? "Seleziona stati membri..."
    : selected.length === 1
    ? selected[0]
    : `${selected.length} stati selezionati`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputSt,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", textAlign: "left",
          color: selected.length === 0 ? T.faint : T.text,
        }}
      >
        <span>{displayText}</span>
        <ChevronRight
          size={12}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            color: T.muted,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            maxHeight: 220, overflowY: "auto", marginTop: 4,
          }}
        >
          {EU_MEMBER_STATES.map(sm => {
            const checked = selected.includes(sm);
            const isAll = sm === "Tutti gli Stati Membri UE";
            return (
              <label
                key={sm}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px", cursor: "pointer", fontSize: 12,
                  color: T.text,
                  background: checked ? T.blueBg : "transparent",
                  borderBottom: isAll ? `1px solid ${T.border}` : undefined,
                  fontWeight: isAll ? 500 : 400,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(sm)}
                  style={{ accentColor: T.blue }}
                />
                {sm}
              </label>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {selected.length > 0 && !selected.includes("Tutti gli Stati Membri UE") && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {selected.map(sm => (
            <span
              key={sm}
              onClick={() => toggle(sm)}
              style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 10,
                background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}`,
                cursor: "pointer",
              }}
            >
              {sm} ×
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EUDBPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [doc, setDoc] = useState<EUDBDoc>(() => loadDraft());
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-populate system_name from Classifier
  const classifierData = useMemo(() => {
    try { const r = localStorage.getItem("aicomply_classifier_result"); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }, []);
  useEffect(() => {
    if (classifierData?.systemName && !doc.system.system_name) {
      patchSystem("system_name", classifierData.systemName);
    }

    // Synergy: pre-populate conformity declaration number from ConformityResult
    const conformity = readFromStorage<ConformityResult>("conformity");
    if (conformity?.registrationRef && !doc.system.conformity_declaration_number) {
      patchSystem("conformity_declaration_number", conformity.registrationRef);
    }

    // Synergy: pre-populate Authorized Representative from AuthRepResult
    const authRep = readFromStorage<AuthRepResult>("authorizedRep");
    if (authRep?.ar_name && !doc.provider.ar_name) {
      patchProvider("ar_name", authRep.ar_name);
      patchProvider("has_authorized_rep", true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classifierData]);

  // Autosave draft
  const scheduleSave = useCallback((d: EUDBDoc) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, updatedAt: new Date().toISOString() }));
      } catch { /* ignore */ }
    }, 800);
  }, []);

  function patch(updater: (prev: EUDBDoc) => EUDBDoc) {
    setDoc(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }

  function patchEligibility(field: keyof EUDBEligibility, val: EligibilityAnswer) {
    patch(d => ({ ...d, eligibility: { ...d.eligibility, [field]: val } }));
  }

  function patchProvider(field: keyof EUDBProviderData, val: string | boolean) {
    patch(d => ({ ...d, provider: { ...d.provider, [field]: val } }));
  }

  function patchSystem(field: keyof EUDBSystemData, val: string | string[]) {
    patch(d => ({ ...d, system: { ...d.system, [field]: val } }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSaveDossier() {
    writeToStorage<EUDBResult>("eudb", {
      system_name: doc.system.system_name,
      provider_name: doc.provider.provider_name,
      registration_number: doc.eudb_registration_number,
      member_states_count: doc.system.member_states.length,
      risk_classification: doc.system.risk_classification,
      registrationRequired: isRegistrationRequired(doc.eligibility),
      completedAt: new Date().toISOString(),
    });
    showToast("Salvato nel dossier ✓");
  }

  function handleCopyAnnex() {
    const text = generateAnnexVIII(doc);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const eStatus = eligibilityStatus(doc.eligibility);

  // ── Progress bar ──────────────────────────────────────────────────────────

  const stepLabels = ["Verifica eligibilità", "Dati provider", "Dati sistema", "Pacchetto finale"];

  // ── Step 1 ────────────────────────────────────────────────────────────────

  const questions: { key: keyof EUDBEligibility; text: string; note?: string }[] = [
    {
      key: "q1_high_risk",
      text: "Il tuo sistema AI è classificato come \"alto rischio\" ai sensi dell'Annex III del Regolamento UE 2024/1689?",
    },
    {
      key: "q2_is_provider",
      text: "Sei il provider (sviluppatore/produttore) del sistema, o il suo authorized representative nell'UE?",
    },
    {
      key: "q3_public_deployer",
      text: "(Solo se deployer) Sei un organismo pubblico che usa il sistema in ambiti Annex III pt.1-6?",
      note: "Es. enti pubblici che usano AI in selezione del personale, accesso a servizi sociali, istruzione, giustizia.",
    },
    {
      key: "q4_gpai_systemic",
      text: "Il sistema è un GPAI model con rischio sistemico (Art. 51)?",
      note: "Art. 51: modelli GPAI con capabilities valutate superiori a 10^25 FLOPs o con impatto sistemico accertato.",
    },
  ];

  function renderStep1() {
    const bannerConfig = {
      required:     { bg: T.greenBg,  bdr: T.greenBdr, col: T.green, icon: <CheckCircle2 size={15}/>, text: "Registrazione EUDB obbligatoria" },
      not_required: { bg: T.grayBg,   bdr: T.grayBdr,  col: T.gray,  icon: <Info size={15}/>,         text: "La registrazione EUDB non è obbligatoria per il tuo sistema" },
      unsure:       { bg: T.amberBg,  bdr: T.amberBdr, col: T.amber, icon: <AlertTriangle size={15}/>, text: "Verifica con il Legal Assistant" },
      incomplete:   null,
    };
    const banner = bannerConfig[eStatus];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Intro */}
        <div style={{ ...cardSt, padding: 16, background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Info size={14} style={{ color: T.blue, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, color: T.blue, fontWeight: 500, margin: 0 }}>Art. 49 AI Act — Chi deve registrarsi?</p>
              <p style={{ fontSize: 11, color: T.blue, opacity: 0.8, margin: "4px 0 0", lineHeight: 1.5 }}>
                Provider di sistemi Annex III, deployer pubblici (Annex III pt.1-6), provider di GPAI con rischio sistemico e authorized representative di provider non-UE devono registrarsi nel database UE prima del deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={q.key} style={{ ...cardSt, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: T.text, fontWeight: 500, margin: 0 }}>
                  <span style={{ color: T.muted, marginRight: 6 }}>Q{idx + 1}</span>
                  {q.text}
                </p>
                {q.note && (
                  <p style={{ fontSize: 11, color: T.muted, margin: "5px 0 0", lineHeight: 1.5 }}>
                    {q.note}
                  </p>
                )}
              </div>
              <RadioGroup
                value={doc.eligibility[q.key]}
                onChange={v => patchEligibility(q.key, v)}
                name={q.key}
              />
            </div>
          </div>
        ))}

        {/* Banner */}
        {banner && (
          <div
            style={{
              padding: 14, borderRadius: 10,
              background: banner.bg, border: `1px solid ${banner.bdr}`,
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ color: banner.col }}>{banner.icon}</span>
            <p style={{ fontSize: 12, color: banner.col, fontWeight: 500, margin: 0 }}>
              {banner.text}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  function renderStep2() {
    const p = doc.provider;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <Building2 size={14} style={{ color: T.blue }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Dati del Provider (Annex VIII §1-2)</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Ragione sociale *">
              <input style={inputSt} value={p.provider_name} onChange={e => patchProvider("provider_name", e.target.value)} placeholder="es. Acme AI S.r.l." />
            </Field>
            <Field label="Paese *">
              <select style={inputSt} value={p.provider_country} onChange={e => patchProvider("provider_country", e.target.value)}>
                {EU_COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Sede legale *" className="col-span-2">
              <input style={inputSt} value={p.provider_address} onChange={e => patchProvider("provider_address", e.target.value)} placeholder="Via Roma 1, 00100 Roma" />
            </Field>
          </div>
        </div>

        <div style={{ ...cardSt, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 14px" }}>Punto di contatto unico (Annex VIII §2)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Nome referente *">
              <input style={inputSt} value={p.contact_name} onChange={e => patchProvider("contact_name", e.target.value)} placeholder="Mario Rossi" />
            </Field>
            <Field label="Email *">
              <input style={inputSt} type="email" value={p.contact_email} onChange={e => patchProvider("contact_email", e.target.value)} placeholder="compliance@acme.it" />
            </Field>
            <Field label="Telefono">
              <input style={inputSt} value={p.contact_phone} onChange={e => patchProvider("contact_phone", e.target.value)} placeholder="+39 06 xxxxxxxx" />
            </Field>
          </div>
        </div>

        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Authorized Representative (Annex VIII §3)</p>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.muted, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={p.has_authorized_rep}
                onChange={e => patchProvider("has_authorized_rep", e.target.checked)}
                style={{ accentColor: T.blue }}
              />
              Il provider non è stabilito nell&apos;UE
            </label>
          </div>
          {p.has_authorized_rep ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nome AR *">
                <input style={inputSt} value={p.ar_name} onChange={e => patchProvider("ar_name", e.target.value)} placeholder="EU Representative GmbH" />
              </Field>
              <Field label="Paese AR *">
                <select style={inputSt} value={p.ar_country} onChange={e => patchProvider("ar_country", e.target.value)}>
                  <option value="">Seleziona...</option>
                  {EU_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Indirizzo AR *" className="col-span-2">
                <input style={inputSt} value={p.ar_address} onChange={e => patchProvider("ar_address", e.target.value)} placeholder="Unter den Linden 1, 10117 Berlin" />
              </Field>
              <Field label="Email AR *">
                <input style={inputSt} type="email" value={p.ar_email} onChange={e => patchProvider("ar_email", e.target.value)} placeholder="eurepresentative@acme.eu" />
              </Field>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
              Non applicabile — il provider è stabilito nell&apos;UE.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────

  function renderStep3() {
    const s = doc.system;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <Database size={14} style={{ color: T.blue }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Identificazione del Sistema (Annex VIII §4-6)</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Denominazione commerciale *">
              <input style={inputSt} value={s.system_name} onChange={e => patchSystem("system_name", e.target.value)} placeholder="es. HireBot Pro" />
            </Field>
            <Field label="Versione *">
              <input style={inputSt} value={s.system_version} onChange={e => patchSystem("system_version", e.target.value)} placeholder="es. 2.1.0" />
            </Field>
            <Field label="Scopo previsto (intended purpose) *" className="col-span-2">
              <textarea
                style={{ ...taSt, minHeight: 68 }}
                value={s.intended_purpose}
                onChange={e => patchSystem("intended_purpose", e.target.value)}
                placeholder="Descrivi lo scopo del sistema come indicato nella documentazione tecnica..."
              />
            </Field>
            <Field label="Stato registrazione *">
              <select style={inputSt} value={s.registration_status} onChange={e => patchSystem("registration_status", e.target.value as "new" | "update" | "withdrawal")}>
                <option value="new">Prima registrazione</option>
                <option value="update">Aggiornamento</option>
                <option value="withdrawal">Ritiro dal mercato</option>
              </select>
            </Field>
          </div>
        </div>

        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <Globe size={14} style={{ color: T.blue }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Classificazione e copertura (Annex VIII §7-8)</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Classificazione rischio *">
              <select style={inputSt} value={s.risk_classification} onChange={e => patchSystem("risk_classification", e.target.value)}>
                <option value="">Seleziona...</option>
                {RISK_CLASSIFICATIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Riferimento normativo *">
              <input style={inputSt} value={s.annex_reference} onChange={e => patchSystem("annex_reference", e.target.value)} placeholder="es. Annex III, punto 4 — Occupazione" />
            </Field>
            <Field label="Stati membri in cui è immesso *" className="col-span-2">
              <MemberStatesSelect selected={s.member_states} onChange={v => patchSystem("member_states", v)} />
            </Field>
          </div>
        </div>

        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <FileText size={14} style={{ color: T.blue }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Documentazione di conformità (Annex VIII §9-11)</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="N. Dichiarazione di Conformità UE *">
              <input style={inputSt} value={s.conformity_declaration_number} onChange={e => patchSystem("conformity_declaration_number", e.target.value)} placeholder="es. DOC-2025-001-IT" />
            </Field>
            <Field label="URL istruzioni per l'uso">
              <input style={inputSt} value={s.instructions_url} onChange={e => patchSystem("instructions_url", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="URL documentazione tecnica (Annex VIII)">
              <input style={inputSt} value={s.technical_doc_url} onChange={e => patchSystem("technical_doc_url", e.target.value)} placeholder="https://... (link alla documentazione tecnica Annex IV)" />
            </Field>
            <Field label="Certificato Notified Body (se Annex I pathway)">
              <input style={inputSt} value={s.notified_body_certificate} onChange={e => patchSystem("notified_body_certificate", e.target.value)} placeholder="es. NB-2025-IT-0042 (opzionale)" />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4 ────────────────────────────────────────────────────────────────

  const PORTAL_STEPS = [
    { n: 1, text: "Accedere al portale EUDB", link: "https://ec.europa.eu/transparency/ai-register/", linkLabel: "ec.europa.eu/transparency/ai-register" },
    { n: 2, text: "Login con EU Login (account Commissione Europea)", link: null, linkLabel: null },
    { n: 3, text: "Selezionare \"Register AI System\" → scegliere categoria appropriata", link: null, linkLabel: null },
    { n: 4, text: "Inserire i dati del pacchetto Annex VIII qui sotto nel form del portale", link: null, linkLabel: null },
    { n: 5, text: "Allegare: Dichiarazione di Conformità UE + Technical Documentation summary", link: null, linkLabel: null },
    { n: 6, text: "Confermare la registrazione → annotare il numero di registrazione assegnato", link: null, linkLabel: null },
    { n: 7, text: "Inserire il numero di registrazione nel campo sottostante per completare il dossier", link: null, linkLabel: null },
  ];

  function renderStep4() {
    const annexText = generateAnnexVIII(doc);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Annex VIII preview */}
        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
              Pacchetto Annex VIII — Art. 49 AI Act
            </p>
            <button
              onClick={handleCopyAnnex}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 7, fontSize: 11,
                background: copied ? T.greenBg : T.bg,
                color: copied ? T.green : T.muted,
                border: `1px solid ${copied ? T.greenBdr : T.border}`,
                cursor: "pointer",
              }}
            >
              <Copy size={11} />
              {copied ? "Copiato!" : "Copia Annex VIII"}
            </button>
          </div>
          <pre
            style={{
              margin: 0, padding: 14, borderRadius: 8,
              background: T.bg, border: `1px solid ${T.border}`,
              fontSize: 11, lineHeight: 1.7, color: T.text,
              overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontFamily: "ui-monospace, 'Cascadia Code', monospace",
            }}
          >
            {annexText}
          </pre>
        </div>

        {/* Portal steps */}
        <div style={{ ...cardSt, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 14px" }}>
            Istruzioni per il portale EC — passo per passo
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PORTAL_STEPS.map(ps => (
              <div key={ps.n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
                    background: T.blueBg, border: `1px solid ${T.blueBdr}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: T.blue,
                  }}
                >
                  {ps.n}
                </span>
                <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.5 }}>
                  {ps.text}
                  {ps.link && (
                    <>
                      {" — "}
                      <a
                        href={ps.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: T.blue, textDecoration: "none" }}
                      >
                        {ps.linkLabel}
                      </a>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* EUDB registration number */}
        <div style={{ ...cardSt, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>
            Numero registrazione EUDB
          </p>
          <p style={{ fontSize: 11, color: T.muted, margin: "0 0 12px" }}>
            Inserisci qui il numero ricevuto dopo la registrazione sul portale EC per completare il dossier.
          </p>
          <input
            value={doc.eudb_registration_number}
            onChange={e => patch(d => ({ ...d, eudb_registration_number: e.target.value }))}
            placeholder="es. EU-AIDB-2025-XXXXXX"
            style={{ ...inputSt, maxWidth: 360 }}
          />
        </div>

        {/* Save */}
        <div style={{ ...cardSt, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>Salva nel dossier</p>
              <p style={{ fontSize: 11, color: T.muted, margin: "3px 0 0" }}>
                I dati verranno salvati nel tuo Dossier AI Act per la conformità Art. 49.
              </p>
            </div>
            <button
              onClick={handleSaveDossier}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 9999, fontSize: 12,
                background: T.blue, color: "#ffffff",
                border: "none", cursor: "pointer", fontWeight: 500,
              }}
            >
              <Save size={13} />
              Salva nel dossier
            </button>
          </div>
        </div>

        <SignOffPanel toolKey="eudb" toolLabel="EUDB Registration — Art. 49" />
      </div>
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const canProceed1 = eStatus === "required" || eStatus === "not_required" || eStatus === "unsure";

  function renderCurrentStep() {
    if (step === 1) return renderStep1();
    if (step === 2) return renderStep2();
    if (step === 3) return renderStep3();
    return renderStep4();
  }

  return (
    <div style={{ width: "100%" }}>
      <SystemContextBanner checkProhibited={true} />
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Database size={16} style={{ color: T.blue }} />
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016", margin: 0 }}>EUDB Registration Wizard</h1>
          <span
            style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600,
              background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}`,
            }}
          >
            Art. 49
          </span>
        </div>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          Genera il pacchetto Annex VIII per la registrazione nel database UE (EUDB) — Regolamento (UE) 2024/1689
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ ...cardSt, padding: "14px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {stepLabels.map((label, idx) => {
            const sNum = (idx + 1) as 1 | 2 | 3 | 4;
            const isActive = step === sNum;
            const isDone = step > sNum;
            return (
              <div key={sNum} style={{ display: "flex", alignItems: "center", flex: idx < 3 ? 1 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      background: isDone ? T.green : isActive ? T.blue : T.bg,
                      color: isDone || isActive ? "#fff" : T.muted,
                      border: `1px solid ${isDone ? T.greenBdr : isActive ? T.blue : T.border}`,
                    }}
                  >
                    {isDone ? "✓" : sNum}
                  </div>
                  <span
                    style={{
                      fontSize: 11, fontWeight: isActive ? 600 : 400,
                      color: isActive ? T.text : isDone ? T.green : T.muted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    style={{
                      flex: 1, height: 1, margin: "0 10px",
                      background: isDone ? T.greenBdr : T.border,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step label */}
      <p style={{ fontSize: 11, color: T.muted, margin: "0 0 12px" }}>
        Step {step} di 4 — <span style={{ color: T.text, fontWeight: 500 }}>{stepLabels[step - 1]}</span>
      </p>

      {/* Step content */}
      {renderCurrentStep()}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button
          onClick={() => setStep(s => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
          disabled={step === 1}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9999, fontSize: 12,
            background: T.bg, color: step === 1 ? T.faint : T.text,
            border: `1px solid ${T.border}`, cursor: step === 1 ? "not-allowed" : "pointer",
          }}
        >
          <ChevronLeft size={13} />
          Indietro
        </button>

        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 1 && !canProceed1) return;
              setStep(s => Math.min(4, s + 1) as 1 | 2 | 3 | 4);
            }}
            disabled={step === 1 && !canProceed1}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9999, fontSize: 12,
              background: step === 1 && !canProceed1 ? T.bg : T.blue,
              color: step === 1 && !canProceed1 ? T.faint : "#ffffff",
              border: `1px solid ${step === 1 && !canProceed1 ? T.border : T.blue}`,
              cursor: step === 1 && !canProceed1 ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            Avanti
            <ChevronRight size={13} />
          </button>
        ) : null}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9999,
            padding: "10px 18px", borderRadius: 10,
            background: T.green, color: "#fff",
            fontSize: 12, fontWeight: 500,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Helper sub-component ─────────────────────────────────────────────────────

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const isSpan2 = className?.includes("col-span-2");
  return (
    <div style={{ gridColumn: isSpan2 ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
