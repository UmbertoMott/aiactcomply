"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Database, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle,
  Info, Copy, Save, Globe, Building2, FileText, Sparkles,
  ExternalLink, CheckCircle2, Download, X,
} from "lucide-react";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import type { EUDBResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import {
  createEmptyDoc, prefillEUDBFromModules,
  mergePrefillIntoDoc, eligibilityStatus, generateAnnexVIII,
  markEUDBRegistrationComplete,
  EU_MEMBER_STATES, EU_COUNTRIES, RISK_CLASSIFICATIONS,
} from "@/lib/eudb/eudb-prefill";
import type {
  EUDBDoc, EUDBEligibility, EUDBProviderData, EUDBSystemData,
  EligibilityAnswer, PrefillResult,
} from "@/lib/eudb/eudb-prefill";
import { useScopedStorage } from "@/lib/hooks/useScopedStorage";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { toEudbDraft } from "@/types/eudb";
import { validateEudbDraft, countErrorsBySection } from "@/lib/eudb/annex-viii-validator";
import { downloadEudbXml, downloadEudbJson } from "@/lib/eudb/export-xml";

// ── Light-theme tokens ───────────────────────────────────────────────────────

const DK = {
  bg:       "#FAFAF9",
  card:     "#ffffff",
  card2:    "#f3f4f6",
  border:   "rgba(0,0,0,0.07)",
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.40)",
  faint:    "rgba(0,0,0,0.30)",
  indigo:   "#4f46e5",
  indigoBg: "rgba(99,102,241,0.08)",
  indigoBdr:"rgba(99,102,241,0.15)",
  red:      "#991b1b",
  redBg:    "rgba(239,68,68,0.06)",
  redBdr:   "rgba(239,68,68,0.18)",
  amber:    "#92400e",
  amberBg:  "rgba(251,146,60,0.08)",
  amberBdr: "rgba(251,146,60,0.25)",
  green:    "#15803d",
  greenBg:  "rgba(22,163,74,0.06)",
  greenBdr: "rgba(22,163,74,0.15)",
  emerald:  "#15803d",
} as const;

const inputDk = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid rgba(0,0,0,0.10)`, fontSize: 12,
  color: DK.text, background: "#f3f4f6", outline: "none",
};

const taDk = { ...inputDk, resize: "vertical" as const };

const cardDk = {
  background: DK.card, border: `1px solid ${DK.border}`,
  borderRadius: 12,
};

// ── Sub-components ───────────────────────────────────────────────────────────

function RadioGroupDark({ value, onChange, name }: {
  value: EligibilityAnswer; onChange: (v: EligibilityAnswer) => void; name: string;
}) {
  const opts: { v: EligibilityAnswer; label: string; color: string; bg: string; bdr: string }[] = [
    { v: "yes",    label: "Sì",         color: DK.green,  bg: DK.greenBg,  bdr: DK.greenBdr  },
    { v: "no",     label: "No",         color: DK.red,    bg: DK.redBg,    bdr: DK.redBdr    },
    { v: "unsure", label: "Non sicuro", color: DK.amber,  bg: DK.amberBg,  bdr: DK.amberBdr  },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map(o => (
        <label key={o.v} style={{
          display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
          fontSize: 11, fontWeight: 500,
          color: value === o.v ? o.color : DK.faint,
          padding: "4px 10px", borderRadius: 6,
          background: value === o.v ? o.bg : "transparent",
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

function MemberStatesSelectDark({ selected, onChange }: {
  selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  function toggle(sm: string) {
    if (sm === "Tutti gli Stati Membri UE") {
      onChange(selected.includes("Tutti gli Stati Membri UE") ? [] : ["Tutti gli Stati Membri UE"]);
      return;
    }
    const without = selected.filter(s => s !== "Tutti gli Stati Membri UE");
    onChange(without.includes(sm) ? without.filter(s => s !== sm) : [...without, sm]);
  }
  const displayText = selected.length === 0 ? "Seleziona stati membri..." :
    selected.length === 1 ? selected[0] : `${selected.length} stati selezionati`;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...inputDk, display: "flex", alignItems: "center",
        justifyContent: "space-between", cursor: "pointer", textAlign: "left",
        color: selected.length === 0 ? DK.faint : DK.text,
      }}>
        <span>{displayText}</span>
        <ChevronRight size={12} style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: DK.muted }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#ffffff", border: `1px solid ${DK.border}`,
          borderRadius: 8, maxHeight: 220, overflowY: "auto", marginTop: 4,
        }}>
          {EU_MEMBER_STATES.map(sm => {
            const checked = selected.includes(sm);
            return (
              <label key={sm} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
                cursor: "pointer", fontSize: 12, color: DK.text,
                background: checked ? DK.indigoBg : "transparent",
                borderBottom: sm === "Tutti gli Stati Membri UE" ? `1px solid ${DK.border}` : undefined,
                fontWeight: sm === "Tutti gli Stati Membri UE" ? 500 : 400,
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(sm)}
                  style={{ accentColor: DK.indigo }} />
                {sm}
              </label>
            );
          })}
        </div>
      )}
      {selected.length > 0 && !selected.includes("Tutti gli Stati Membri UE") && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {selected.map(sm => (
            <span key={sm} onClick={() => toggle(sm)} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 10,
              background: DK.indigoBg, color: DK.indigo, border: `1px solid ${DK.indigoBdr}`,
              cursor: "pointer",
            }}>
              {sm} ×
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DkField({ label, article, children, span2, aiBadge }: {
  label: string; article?: string; children: React.ReactNode;
  span2?: boolean; aiBadge?: boolean;
}) {
  return (
    <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <label style={{ fontSize: 11, color: DK.muted, fontWeight: 500 }}>{label}</label>
        {article && (
          <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint, borderRadius: 4,
            padding: "1px 5px", border: `1px solid ${DK.border}`, background: "rgba(0,0,0,0.04)" }}>
            {article}
          </span>
        )}
        {aiBadge && (
          <span style={{ fontSize: 9, fontWeight: 700, color: DK.indigo,
            background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}`,
            borderRadius: 4, padding: "1px 5px" }}>
            ✦ AI
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, article, aiBadge, children }: {
  title: string; article?: string; aiBadge?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ ...cardDk, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: DK.text, margin: 0 }}>{title}</p>
          {article && (
            <span style={{ fontSize: 9, fontFamily: "monospace", color: DK.faint,
              border: `1px solid ${DK.border}`, borderRadius: 4, padding: "1px 6px",
              background: "rgba(0,0,0,0.04)" }}>
              {article}
            </span>
          )}
        </div>
        {aiBadge && (
          <span style={{ fontSize: 9, fontWeight: 700, color: DK.indigo,
            background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}`,
            borderRadius: 5, padding: "2px 7px" }}>
            ✦ AI — verifica e conferma
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EUDBCompliancePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [doc, setDoc] = useScopedStorage<EUDBDoc>("eudb_draft", createEmptyDoc());
  const [prefill, setPrefill] = useState<PrefillResult | null>(null);
  const [showPrefillDetail, setShowPrefillDetail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<"all" | "a" | "b" | "c" | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState(doc.eudb_registration_number ?? "");

  // Auto-prefill on mount
  useEffect(() => {
    const result = prefillEUDBFromModules();
    setPrefill(result);
    if (result.prefillCount > 0) {
      setDoc(prev => mergePrefillIntoDoc(prev, result));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Annex VIII validation (PROMPT BF)
  const eudbDraft = useMemo(() => toEudbDraft(doc), [doc]);
  const validation = useMemo(() => validateEudbDraft(eudbDraft), [eudbDraft]);
  const sectionErrors = useMemo(() => countErrorsBySection(validation), [validation]);

  function patch(updater: (prev: EUDBDoc) => EUDBDoc) {
    setDoc(prev => updater(prev));
  }
  function patchE(field: keyof EUDBEligibility, val: EligibilityAnswer) {
    patch(d => ({ ...d, eligibility: { ...d.eligibility, [field]: val }, aiConfirmed: false }));
  }
  function patchP(field: keyof EUDBProviderData, val: string | boolean) {
    patch(d => ({ ...d, provider: { ...d.provider, [field]: val }, aiConfirmed: false }));
  }
  function patchS(field: keyof EUDBSystemData, val: string | string[]) {
    patch(d => ({ ...d, system: { ...d.system, [field]: val }, aiConfirmed: false }));
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  function handleSaveDossier() {
    writeToStorage<EUDBResult>("eudb", {
      system_name: doc.system.system_name,
      provider_name: doc.provider.provider_name,
      registration_number: doc.eudb_registration_number ?? "",
      member_states_count: doc.system.member_states.length,
      risk_classification: doc.system.risk_classification,
      registrationRequired: eligibilityStatus(doc.eligibility) === "required",
      completedAt: new Date().toISOString(),
    });
    showToast("Salvato nel dossier ✓");
  }

  function handleSaveRegistrationNumber() {
    markEUDBRegistrationComplete(registrationNumber);
    patch(d => ({ ...d, eudb_registration_number: registrationNumber }));
    handleSaveDossier();
    showToast("✓ Registrazione completata — Deadline Timeline aggiornata");
  }

  function copySection(section: "all" | "a" | "b" | "c") {
    const full = generateAnnexVIII(doc);
    let text = full;
    if (section === "a") text = full.split("SEZIONE B")[0].trim();
    else if (section === "b") {
      const parts = full.split("SEZIONE B");
      text = "SEZIONE B" + (parts[1]?.split("SEZIONE C")[0] ?? "");
    } else if (section === "c") {
      const parts = full.split("SEZIONE C");
      text = "SEZIONE C" + (parts[1] ?? "");
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  }

  const eStatus = eligibilityStatus(doc.eligibility);
  const stepLabels = [
    "Eleggibilità",
    sectionErrors.sectionA > 0 ? `Provider (${sectionErrors.sectionA})` : "Provider",
    sectionErrors.sectionB > 0 ? `Sistema (${sectionErrors.sectionB})` : "Sistema",
    sectionErrors.allegati > 0 ? `Pacchetto (${sectionErrors.allegati})` : "Pacchetto",
  ];
  const canProceed1 = eStatus !== "incomplete";

  // ── Step 1 ────────────────────────────────────────────────────────────────

  const questions: { key: keyof EUDBEligibility; text: string; note?: string; prefillSource?: string }[] = [
    {
      key: "q1_high_risk",
      text: "Il sistema è classificato come ad alto rischio (Annex I o Annex III)?",
      prefillSource: prefill?.sources.eligibility === "triage" ? "Precompilato da Triage" : undefined,
    },
    {
      key: "q2_is_provider",
      text: "Sei il provider (sviluppatore/produttore) o l'authorized representative nell'UE?",
      prefillSource: prefill?.sources.eligibility === "triage" ? "Precompilato da Triage" : undefined,
    },
    {
      key: "q3_public_deployer",
      text: "(Solo deployer) Sei un organismo pubblico che usa il sistema in ambiti Annex III pt.1-6?",
      note: "Es. enti pubblici in selezione personale, servizi sociali, istruzione, giustizia. Esenzione Art. 49(2) per sicurezza nazionale.",
    },
    {
      key: "q4_gpai_systemic",
      text: "Il sistema è un GPAI model con rischio sistemico (Art. 51)?",
      note: "Art. 51: modelli GPAI con capabilities > 10^25 FLOPs o con impatto sistemico accertato.",
    },
  ];

  function renderStep1() {
    const bannerConfig = {
      required:     { bg: DK.greenBg,  bdr: DK.greenBdr, col: DK.green, Icon: CheckCircle2,   text: "Registrazione EUDB obbligatoria — Art. 49(1)" },
      not_required: { bg: "rgba(0,0,0,0.03)", bdr: DK.border, col: DK.muted, Icon: Info,  text: "La registrazione EUDB non è obbligatoria per questo sistema" },
      unsure:       { bg: DK.amberBg,  bdr: DK.amberBdr, col: DK.amber, Icon: AlertTriangle,  text: "Incertezza — consulta il Legal Assistant" },
      incomplete:   null,
    };
    const banner = bannerConfig[eStatus];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...cardDk, padding: 14, background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Info size={13} style={{ color: DK.indigo, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, color: DK.indigo, fontWeight: 500, margin: 0 }}>
                Art. 49 AI Act — Chi deve registrarsi nel database UE?
              </p>
              <p style={{ fontSize: 11, color: DK.indigo, opacity: 0.8, margin: "4px 0 0", lineHeight: 1.5 }}>
                Provider di sistemi Annex III, deployer pubblici (Annex III pt.1-6), provider di GPAI con rischio sistemico e authorized representative di provider non-UE devono registrarsi prima del deployment.
              </p>
            </div>
          </div>
        </div>

        {questions.map((q, idx) => (
          <div key={q.key} style={{ ...cardDk, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: DK.faint, fontWeight: 600 }}>Q{idx + 1}</span>
                  {q.prefillSource && (
                    <span style={{ fontSize: 9, color: DK.indigo, background: DK.indigoBg,
                      border: `1px solid ${DK.indigoBdr}`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                      ✦ AI — {q.prefillSource}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: DK.text, fontWeight: 500, margin: 0 }}>{q.text}</p>
                {q.note && <p style={{ fontSize: 11, color: DK.muted, margin: "5px 0 0", lineHeight: 1.5 }}>{q.note}</p>}
              </div>
              <RadioGroupDark value={doc.eligibility[q.key]} onChange={v => patchE(q.key, v)} name={q.key} />
            </div>
          </div>
        ))}

        {banner && (
          <div style={{ padding: 14, borderRadius: 10, background: banner.bg,
            border: `1px solid ${banner.bdr}`, borderLeft: `4px solid ${banner.col}`,
            display: "flex", alignItems: "center", gap: 10 }}>
            <banner.Icon size={14} style={{ color: banner.col, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: banner.col, fontWeight: 500, margin: 0 }}>{banner.text}</p>
          </div>
        )}
        {eStatus === "not_required" && (
          <p style={{ fontSize: 11, color: DK.muted, margin: 0 }}>
            Consulta il{" "}
            <a href="/dashboard/tools/deployer-dashboard" style={{ color: DK.indigo, textDecoration: "none" }}>
              Deployer Dashboard
            </a>{" "}
            per gli obblighi pertinenti.
          </p>
        )}
      </div>
    );
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  function renderStep2() {
    const p = doc.provider;
    const isPrefilled = prefill?.sources.provider === "ai_inventory";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {isPrefilled && prefill && (
          <div style={{ ...cardDk, padding: 12, background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Sparkles size={13} style={{ color: DK.indigo, flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: DK.indigo, fontWeight: 600, margin: 0 }}>
                  ✦ AI ha precompilato {prefill.prefillCount} campi da AI Inventory / profilo azienda. Verifica e conferma prima di proseguire.
                </p>
                <button onClick={() => setShowPrefillDetail(v => !v)}
                  style={{ fontSize: 10, color: DK.indigo, background: "none", border: "none",
                    cursor: "pointer", padding: 0, marginTop: 4, textDecoration: "underline" }}>
                  {showPrefillDetail ? "Nascondi dettagli" : "Mostra fonti"}
                </button>
                {showPrefillDetail && (
                  <ul style={{ fontSize: 10, color: DK.muted, margin: "6px 0 0", padding: "0 0 0 14px" }}>
                    <li>Provider: da AI Inventory</li>
                    {p.has_authorized_rep && <li>Authorized Representative: da Authorized Rep (PROMPT AT)</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <SectionCard title="Dati del Provider" article="Annex VIII §1" aiBadge={isPrefilled}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DkField label="Ragione sociale *" aiBadge={isPrefilled && !!p.provider_name}>
              <input style={inputDk} value={p.provider_name} placeholder="Es. Acme AI S.r.l."
                onChange={e => patchP("provider_name", e.target.value)} />
            </DkField>
            <DkField label="Paese *" aiBadge={isPrefilled && !!p.provider_country}>
              <select style={inputDk} value={p.provider_country}
                onChange={e => patchP("provider_country", e.target.value)}>
                {EU_COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </DkField>
            <DkField label="Sede legale *" span2 aiBadge={isPrefilled && !!p.provider_address}>
              <input style={inputDk} value={p.provider_address} placeholder="Via Roma 1, 00100 Roma"
                onChange={e => patchP("provider_address", e.target.value)} />
            </DkField>
          </div>
        </SectionCard>

        <SectionCard title="Punto di contatto unico" article="Annex VIII §2" aiBadge={isPrefilled && !!(p.contact_name || p.contact_email)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DkField label="Nome referente *" aiBadge={isPrefilled && !!p.contact_name}>
              <input style={inputDk} value={p.contact_name} placeholder="Mario Rossi"
                onChange={e => patchP("contact_name", e.target.value)} />
            </DkField>
            <DkField label="Email *" aiBadge={isPrefilled && !!p.contact_email}>
              <input style={inputDk} type="email" value={p.contact_email} placeholder="compliance@acme.it"
                onChange={e => patchP("contact_email", e.target.value)} />
            </DkField>
            <DkField label="Telefono">
              <input style={inputDk} value={p.contact_phone} placeholder="+39 06 xxxxxxxx"
                onChange={e => patchP("contact_phone", e.target.value)} />
            </DkField>
          </div>
        </SectionCard>

        <SectionCard title="Authorized Representative (AR)" article="Annex VIII §3" aiBadge={p.has_authorized_rep && !!p.ar_name}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: DK.muted, cursor: "pointer" }}>
              <input type="checkbox" checked={p.has_authorized_rep}
                onChange={e => patchP("has_authorized_rep", e.target.checked)}
                style={{ accentColor: DK.indigo }} />
              Il provider non è stabilito nell&apos;UE — è necessario un AR
            </label>
          </div>
          {p.has_authorized_rep ? (
            <>
              <div style={{ fontSize: 10, color: DK.amber, marginBottom: 10 }}>
                I dati AR sono sincronizzati con il modulo Authorized Representative (Art. 22) — le modifiche si propagano a entrambi.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <DkField label="Nome AR *" aiBadge={!!p.ar_name}><input style={inputDk} value={p.ar_name} placeholder="EU Representative GmbH" onChange={e => patchP("ar_name", e.target.value)} /></DkField>
                <DkField label="Paese AR *"><select style={inputDk} value={p.ar_country} onChange={e => patchP("ar_country", e.target.value)}><option value="">Seleziona...</option>{EU_COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></DkField>
                <DkField label="Indirizzo AR *" span2><input style={inputDk} value={p.ar_address} placeholder="Unter den Linden 1, 10117 Berlin" onChange={e => patchP("ar_address", e.target.value)} /></DkField>
                <DkField label="Email AR *"><input style={inputDk} type="email" value={p.ar_email} placeholder="eurepresentative@acme.eu" onChange={e => patchP("ar_email", e.target.value)} /></DkField>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: DK.faint, fontStyle: "italic" }}>Non applicabile — il provider è stabilito nell&apos;UE.</p>
          )}
        </SectionCard>

        {!doc.aiConfirmed && prefill && prefill.prefillCount > 0 && (
          <button onClick={() => { patch(d => ({ ...d, aiConfirmed: true })); showToast("✓ Dati provider confermati"); }}
            style={{ width: "100%", padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: DK.indigoBg, color: DK.indigo, border: `1px solid ${DK.indigoBdr}`, cursor: "pointer" }}>
            ✦ Conferma dati precompilati da AI
          </button>
        )}
      </div>
    );
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────

  function renderStep3() {
    const s = doc.system;
    const isPrefilled = prefill?.sources.system === "risk_manager_docugen";
    const isLawEnforcement =
      s.annex_reference.toLowerCase().includes("law enforce") ||
      s.annex_reference.includes("6") || s.annex_reference.includes("7");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {isPrefilled && prefill && (
          <div style={{ ...cardDk, padding: 12, background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={13} style={{ color: DK.indigo, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: DK.indigo, fontWeight: 600, margin: 0 }}>
                ✦ AI ha precompilato i campi sistema da Risk Manager e DocuGen Annex IV. Verifica e conferma.
              </p>
            </div>
            {prefill.missingFields.length > 0 && (
              <div style={{ marginTop: 8, paddingLeft: 21 }}>
                <p style={{ fontSize: 10, color: DK.amber, fontWeight: 500, margin: "0 0 4px" }}>
                  Campi da completare manualmente:
                </p>
                <ul style={{ fontSize: 10, color: DK.amber, margin: 0, padding: "0 0 0 14px" }}>
                  {prefill.missingFields.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <SectionCard title="Identificazione del sistema" article="Annex VIII §4-5" aiBadge={isPrefilled}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DkField label="Denominazione commerciale *" aiBadge={isPrefilled && !!s.system_name}>
              <input style={inputDk} value={s.system_name} placeholder="Es. HireBot Pro" onChange={e => patchS("system_name", e.target.value)} />
            </DkField>
            <DkField label="Versione *" aiBadge={isPrefilled && !!s.system_version}>
              <input style={inputDk} value={s.system_version} placeholder="Es. 2.1.0" onChange={e => patchS("system_version", e.target.value)} />
            </DkField>
            <DkField label="Scopo previsto (intended purpose) *" span2 aiBadge={isPrefilled && !!s.intended_purpose}>
              <textarea style={{ ...taDk, minHeight: 60 }} value={s.intended_purpose}
                placeholder="Descrivi lo scopo del sistema come indicato nella documentazione tecnica..."
                onChange={e => patchS("intended_purpose", e.target.value)} />
            </DkField>
          </div>
        </SectionCard>

        <SectionCard title="Stato registrazione e Stati Membri" article="Annex VIII §6-7">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DkField label="Stato registrazione *">
              <select style={inputDk} value={s.registration_status} onChange={e => patchS("registration_status", e.target.value as "new"|"update"|"withdrawal")}>
                <option value="new">Prima registrazione</option>
                <option value="update">Aggiornamento</option>
                <option value="withdrawal">Ritiro dal mercato</option>
              </select>
            </DkField>
            <DkField label="Stati membri in cui è immesso *" span2>
              <MemberStatesSelectDark selected={s.member_states} onChange={v => patchS("member_states", v)} />
            </DkField>
          </div>
        </SectionCard>

        <SectionCard title="Classificazione del rischio" article="Annex VIII §8" aiBadge={isPrefilled && !!s.risk_classification}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DkField label="Classificazione rischio *" aiBadge={isPrefilled && !!s.risk_classification}>
              <select style={inputDk} value={s.risk_classification} onChange={e => patchS("risk_classification", e.target.value)}>
                <option value="">Seleziona...</option>
                {RISK_CLASSIFICATIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </DkField>
            <DkField label="Riferimento normativo *" aiBadge={isPrefilled && !!s.annex_reference}>
              <input style={inputDk} value={s.annex_reference} placeholder="Es. Annex III, punto 4 — Occupazione"
                onChange={e => patchS("annex_reference", e.target.value)} />
            </DkField>
          </div>
          {isLawEnforcement && (
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: DK.amberBg, border: `1px solid ${DK.amberBdr}` }}>
              <p style={{ fontSize: 11, color: DK.amber, margin: 0 }}>
                ⚠ Sistema law enforcement / migrazione rilevato — potrebbero applicarsi requisiti aggiuntivi di registrazione (Art. 49(4)). Verificare con il team legale.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Documentazione di conformità" article="Annex VIII §9-11" aiBadge={isPrefilled && !!s.conformity_declaration_number}>
          {!s.conformity_declaration_number && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: DK.amberBg,
              border: `1px solid ${DK.amberBdr}`, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: DK.amber, margin: 0 }}>
                Documentazione di conformità non disponibile — completa lo step &quot;Kit Art. 50&quot; in{" "}
                <a href="/dashboard/tools/docugen" style={{ color: DK.amber }}>DocuGen AI</a>{" "}
                per il prefill automatico.
              </p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DkField label="N. Dichiarazione di Conformità UE" aiBadge={isPrefilled && !!s.conformity_declaration_number}>
              <input style={inputDk} value={s.conformity_declaration_number} placeholder="Es. DOC-2025-001-IT"
                onChange={e => patchS("conformity_declaration_number", e.target.value)} />
            </DkField>
            <DkField label="URL istruzioni per l'uso" aiBadge={isPrefilled && !!s.instructions_url}>
              <input style={inputDk} value={s.instructions_url} placeholder="https://..."
                onChange={e => patchS("instructions_url", e.target.value)} />
            </DkField>
            <DkField label="URL documentazione tecnica">
              <input style={inputDk} value={s.technical_doc_url} placeholder="https://..."
                onChange={e => patchS("technical_doc_url", e.target.value)} />
            </DkField>
            <DkField label="Certificato Notified Body (opzionale)">
              <input style={inputDk} value={s.notified_body_certificate} placeholder="Es. NB-2025-IT-0042"
                onChange={e => patchS("notified_body_certificate", e.target.value)} />
            </DkField>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── Step 4 ────────────────────────────────────────────────────────────────

  const PORTAL_STEPS = [
    { n: 1, text: "Accedere al portale EUDB", href: "https://ec.europa.eu/transparency/ai-register/" },
    { n: 2, text: "Login con EU Login (account Commissione Europea)", href: null },
    { n: 3, text: "Selezionare \"Register AI System\" → scegliere categoria appropriata", href: null },
    { n: 4, text: "Inserire i dati del pacchetto Annex VIII nel form del portale — sezione per sezione", href: null },
    { n: 5, text: "Allegare: Dichiarazione di Conformità UE + Technical Documentation summary", href: null },
    { n: 6, text: "Confermare la registrazione → annotare il numero di registrazione assegnato", href: null },
    { n: 7, text: "Inserire il numero di registrazione nel campo sottostante per completare il dossier", href: null },
  ];

  function renderStep4() {
    const fullText = generateAnnexVIII(doc);
    const sectionA = fullText.split("SEZIONE B")[0].trim();
    const sectionB = "SEZIONE B" + (fullText.split("SEZIONE B")[1]?.split("SEZIONE C")[0] ?? "");
    const sectionC = "SEZIONE C" + (fullText.split("SEZIONE C")[1] ?? "");
    const isRegistered = !!doc.eudb_registration_number;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Registered banner */}
        {isRegistered && (
          <div style={{ padding: 14, borderRadius: 10, background: DK.greenBg,
            border: `1px solid ${DK.greenBdr}`, display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle size={15} style={{ color: DK.emerald, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, color: DK.emerald, fontWeight: 600, margin: 0 }}>
                Registrato — Art. 49 completato ✓
              </p>
              <p style={{ fontSize: 11, color: DK.emerald, opacity: 0.8, margin: "2px 0 0" }}>
                N. registrazione: {doc.eudb_registration_number} — Deadline Timeline aggiornata automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* Annex VIII preview — 3 cards */}
        <SectionCard title="Annex VIII — Sezione A: Provider / AR" article="Annex VIII §1-3">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: DK.muted }}>Dati identificativi del provider</span>
            <button onClick={() => copySection("a")} style={{ display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              background: copiedSection === "a" ? DK.greenBg : "rgba(0,0,0,0.05)",
              color: copiedSection === "a" ? DK.green : DK.muted,
              border: `1px solid ${copiedSection === "a" ? DK.greenBdr : DK.border}` }}>
              <Copy size={10} /> {copiedSection === "a" ? "Copiato!" : "Copia Sez. A"}
            </button>
          </div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: DK.card2,
            border: `1px solid ${DK.border}`, fontSize: 10, lineHeight: 1.7, color: DK.text,
            overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: "ui-monospace, monospace" }}>
            {sectionA}
          </pre>
        </SectionCard>

        <SectionCard title="Annex VIII — Sezione B: Sistema AI" article="Annex VIII §4-8">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: DK.muted }}>Dati del sistema AI</span>
            <button onClick={() => copySection("b")} style={{ display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              background: copiedSection === "b" ? DK.greenBg : "rgba(0,0,0,0.05)",
              color: copiedSection === "b" ? DK.green : DK.muted,
              border: `1px solid ${copiedSection === "b" ? DK.greenBdr : DK.border}` }}>
              <Copy size={10} /> {copiedSection === "b" ? "Copiato!" : "Copia Sez. B"}
            </button>
          </div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: DK.card2,
            border: `1px solid ${DK.border}`, fontSize: 10, lineHeight: 1.7, color: DK.text,
            overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: "ui-monospace, monospace" }}>
            {sectionB}
          </pre>
        </SectionCard>

        <SectionCard title="Annex VIII — Sezione C: Conformità" article="Annex VIII §9-11">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: DK.muted }}>Documentazione di conformità</span>
            <button onClick={() => copySection("c")} style={{ display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
              background: copiedSection === "c" ? DK.greenBg : "rgba(0,0,0,0.05)",
              color: copiedSection === "c" ? DK.green : DK.muted,
              border: `1px solid ${copiedSection === "c" ? DK.greenBdr : DK.border}` }}>
              <Copy size={10} /> {copiedSection === "c" ? "Copiato!" : "Copia Sez. C"}
            </button>
          </div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: DK.card2,
            border: `1px solid ${DK.border}`, fontSize: 10, lineHeight: 1.7, color: DK.text,
            overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: "ui-monospace, monospace" }}>
            {sectionC}
          </pre>
        </SectionCard>

        {/* Annex VIII Validation Banner (PROMPT BF) */}
        {!validation.valid && (
          <div style={{ borderRadius: 10, border: "1px solid rgba(220,38,38,0.30)",
            background: "rgba(220,38,38,0.05)", padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: DK.red, margin: "0 0 10px" }}>
              {validation.errors.length} campo{validation.errors.length > 1 ? "i" : ""} obbligatori mancanti — Allegato VIII
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {validation.errors.map((err, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <span style={{ color: DK.red, fontWeight: 700 }}>×</span>
                  <span style={{ color: DK.muted, flex: 1 }}>{err.message}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: DK.faint }}>{err.artRef}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {validation.valid && validation.warnings.length > 0 && (
          <div style={{ borderRadius: 10, border: `1px solid ${DK.amberBdr}`, background: DK.amberBg, padding: 12 }}>
            {validation.warnings.map((w, i) => (
              <p key={i} style={{ fontSize: 11, color: DK.amber, margin: 0 }}>⚠ {w.message}</p>
            ))}
          </div>
        )}

        {validation.valid && (
          <div style={{ borderRadius: 10, border: `1px solid ${DK.greenBdr}`, background: DK.greenBg, padding: 12 }}>
            <p style={{ fontSize: 11, color: DK.green, margin: 0 }}>
              ✓ Tutti i campi Allegato VIII compilati — pronto per l&apos;esportazione e upload al portale EC
            </p>
          </div>
        )}

        {/* Export XML / JSON (PROMPT BF) */}
        <div style={{ ...cardDk, padding: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: DK.text, margin: 0 }}>Esporta per upload EUDB</p>
            <p style={{ fontSize: 11, color: DK.muted, margin: "2px 0 0" }}>
              XML / JSON machine-readable — struttura Allegato VIII · Art. 49
            </p>
          </div>
          <button
            disabled={!validation.valid}
            onClick={() => downloadEudbXml(eudbDraft)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: validation.valid ? "pointer" : "not-allowed",
              background: validation.valid ? "#0D1016" : "rgba(0,0,0,0.05)",
              color: validation.valid ? "#fff" : DK.faint,
              border: `1px solid ${validation.valid ? "#0D1016" : DK.border}` }}>
            <Download size={12} /> {validation.valid ? "Esporta XML" : `Completa ${validation.errors.length} campi`}
          </button>
          <button
            disabled={!validation.valid}
            onClick={() => downloadEudbJson(eudbDraft)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: validation.valid ? "pointer" : "not-allowed",
              background: "rgba(0,0,0,0.05)", color: validation.valid ? DK.text : DK.faint,
              border: `1px solid ${DK.border}` }}>
            <Download size={12} /> Esporta JSON
          </button>
          {!validation.valid && (
            <p style={{ fontSize: 10, color: DK.faint, width: "100%", margin: 0 }}>
              Sez. A: {sectionErrors.sectionA} · Sez. B: {sectionErrors.sectionB} · Allegati: {sectionErrors.allegati}
            </p>
          )}
        </div>

        {/* Copy all */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => copySection("all")} style={{ display: "flex", alignItems: "center", gap: 6,
            padding: "7px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            background: copiedSection === "all" ? DK.greenBg : "rgba(0,0,0,0.05)",
            color: copiedSection === "all" ? DK.green : DK.muted,
            border: `1px solid ${copiedSection === "all" ? DK.greenBdr : DK.border}` }}>
            <Copy size={12} /> {copiedSection === "all" ? "Copiato!" : "Copia Annex VIII completo"}
          </button>
        </div>

        {/* Portal steps */}
        <SectionCard title="Istruzioni — Portale EC" article="Art. 49">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PORTAL_STEPS.map(ps => (
              <div key={ps.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: DK.indigo,
                  background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}` }}>
                  {ps.n}
                </div>
                <p style={{ fontSize: 12, color: DK.text, margin: 0, lineHeight: 1.5, paddingTop: 3 }}>
                  {ps.text}
                  {ps.href && (
                    <> —{" "}
                      <a href={ps.href} target="_blank" rel="noopener noreferrer"
                        style={{ color: DK.indigo, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        ec.europa.eu/transparency/ai-register <ExternalLink size={10} />
                      </a>
                      <span style={{ fontSize: 9, color: DK.faint }}></span>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Registration number input */}
        <SectionCard title="Numero registrazione EUDB">
          <p style={{ fontSize: 11, color: DK.muted, margin: "0 0 12px" }}>
            Inserisci il numero ricevuto dopo la registrazione sul portale EC. Il salvataggio aggiorna automaticamente la Deadline Timeline e il Deployer Dashboard.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)}
                placeholder="Es. EU-AIDB-2025-XXXXXX" style={{ ...inputDk, maxWidth: 360 }} />
            </div>
            <button disabled={!registrationNumber.trim()}
              onClick={handleSaveRegistrationNumber}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
                borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: registrationNumber.trim() ? DK.greenBg : "rgba(0,0,0,0.05)",
                color: registrationNumber.trim() ? DK.green : DK.faint,
                border: `1px solid ${registrationNumber.trim() ? DK.greenBdr : DK.border}`,
                cursor: registrationNumber.trim() ? "pointer" : "not-allowed" }}>
              <Save size={13} /> Salva e completa
            </button>
          </div>
        </SectionCard>

        <div style={{ ...cardDk, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: DK.text, margin: 0 }}>Salva nel dossier</p>
            <p style={{ fontSize: 11, color: DK.muted, margin: "3px 0 0" }}>Aggiorna il Dossier AI Act per la conformità Art. 49.</p>
          </div>
          <button onClick={handleSaveDossier} style={{ display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
            background: "#0D1016", color: "#fff",
            border: "1px solid #0D1016", cursor: "pointer" }}>
            <Save size={13} /> Salva nel dossier
          </button>
        </div>

        <SignOffPanel toolKey="eudb" toolLabel="EUDB Registration — Art. 49" />
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: "100%" }}>
      <SystemSelector checkProhibited={false} />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Database size={16} style={{ color: DK.indigo }} />
          <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.5px", color: DK.text, margin: 0 }}>
            Registrazione EUDB
          </h1>
          <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 10,
            background: DK.indigoBg, color: DK.indigo, border: `1px solid ${DK.indigoBdr}` }}>
            Art. 49
          </span>
        </div>
        <p style={{ fontSize: 12, color: DK.muted, margin: 0 }}>
          Wizard prefillato automaticamente dai dati degli altri moduli — verifica e conferma i campi proposti dall&apos;AI.
        </p>
      </div>

      {/* AI disclaimer */}
      <div style={{ ...cardDk, padding: "10px 14px", marginBottom: 16,
        background: DK.indigoBg, border: `1px solid ${DK.indigoBdr}` }}>
        <p style={{ fontSize: 11, color: DK.indigo, margin: 0 }}>
          ✦ AI — verifica e conferma: mappatura campi Annex VIII, criteri Q1-Q4 e scadenza EUDB ricostruiti dalla memoria del modello. Validare contro testo consolidato Art. 49 e Annex VIII Reg. (UE) 2024/1689 prima della registrazione effettiva sul portale EC.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ ...cardDk, padding: "14px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {stepLabels.map((label, idx) => {
            const sNum = (idx + 1) as 1 | 2 | 3 | 4;
            const isActive = step === sNum;
            const isDone = step > sNum;
            return (
              <div key={sNum} style={{ display: "flex", alignItems: "center", flex: idx < 3 ? 1 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: isDone ? DK.greenBg : isActive ? DK.indigoBg : "rgba(0,0,0,0.05)",
                    color: isDone ? DK.green : isActive ? DK.indigo : DK.faint,
                    border: `1px solid ${isDone ? DK.greenBdr : isActive ? DK.indigoBdr : DK.border}` }}>
                    {isDone ? "✓" : sNum}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400,
                    color: isActive ? DK.text : isDone ? DK.green : DK.faint, whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {idx < 3 && (
                  <div style={{ flex: 1, height: 1, margin: "0 10px",
                    background: isDone ? DK.greenBdr : DK.border }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 11, color: DK.muted, margin: "0 0 12px" }}>
        Step {step} di 4 — <span style={{ color: DK.text, fontWeight: 500 }}>{stepLabels[step - 1]}</span>
      </p>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button onClick={() => setStep(s => Math.max(1, s - 1) as 1 | 2 | 3 | 4)} disabled={step === 1}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
            borderRadius: 9999, fontSize: 12, cursor: step === 1 ? "not-allowed" : "pointer",
            background: "rgba(0,0,0,0.05)", color: step === 1 ? DK.faint : DK.text,
            border: `1px solid ${DK.border}` }}>
          <ChevronLeft size={13} /> Indietro
        </button>
        {step < 4 && (
          <button onClick={() => { if (step === 1 && !canProceed1) return; setStep(s => Math.min(4, s + 1) as 1 | 2 | 3 | 4); }}
            disabled={step === 1 && !canProceed1}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: 9999, fontSize: 12, fontWeight: 500,
              background: step === 1 && !canProceed1 ? "rgba(0,0,0,0.04)" : "#0D1016",
              color: step === 1 && !canProceed1 ? DK.faint : "#fff",
              border: `1px solid ${step === 1 && !canProceed1 ? DK.border : "#0D1016"}`,
              cursor: step === 1 && !canProceed1 ? "not-allowed" : "pointer" }}>
            Avanti <ChevronRight size={13} />
          </button>
        )}
      </div>

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
