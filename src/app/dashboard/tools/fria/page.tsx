"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, CheckCircle, AlertTriangle,
  XCircle, Shield, Printer, FileText, Users, Scale,
  Plus, Trash2, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  FUNDAMENTAL_RIGHTS,
  FRIADocument,
  RightAssessment,
  AffectedCategory,
  createEmptyFRIA,
  calculateFRIACompleteness,
  getOverallFRIARisk,
} from "@/lib/simulation/fria-engine";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Identificazione", icon: FileText },
  { label: "Contesto deploy", icon: Shield },
  { label: "Soggetti coinvolti", icon: Users },
  { label: "Diritti fondamentali", icon: Scale },
  { label: "Dati personali", icon: Shield },
  { label: "Supervisione e rimedi", icon: CheckCircle },
  { label: "Risultato", icon: CheckCircle },
] as const;

const RISK_META = {
  low:      { label: "Rischio basso",     bg: "#dcfce7", color: "#15803d", border: "rgba(22,163,74,0.2)" },
  medium:   { label: "Rischio medio",     bg: "#fef9c3", color: "#a16207", border: "rgba(202,138,4,0.2)" },
  high:     { label: "Rischio alto",      bg: "#fff7ed", color: "#c2410c", border: "rgba(234,88,12,0.2)" },
  critical: { label: "Rischio critico",   bg: "#fef2f2", color: "#b91c1c", border: "rgba(185,28,28,0.2)" },
} as const;

const RELEVANCE_OPTS = [
  { value: "not_relevant", label: "Non rilevante" },
  { value: "low",          label: "Bassa" },
  { value: "medium",       label: "Media" },
  { value: "high",         label: "Alta" },
  { value: "critical",     label: "Critica" },
] as const;

const RESIDUAL_OPTS = [
  { value: "acceptable",   label: "Accettabile",    color: "#15803d" },
  { value: "review",       label: "Da rivedere",    color: "#d97706" },
  { value: "unacceptable", label: "Non accettabile", color: "#dc2626" },
] as const;

const DATA_TYPES_LIST = [
  "Dati anagrafici", "Dati comportamentali", "Dati biometrici",
  "Dati di salute", "Dati finanziari", "Dati di localizzazione",
  "Dati di navigazione", "Dati di prestazione lavorativa",
  "Dati educativi", "Dati giudiziari",
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const card = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "12px",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>{label}</label>
      {hint && <p className="text-[11px] mb-1.5" style={{ color: "rgba(0,0,0,0.4)" }}>{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
      style={{
        background: "#fafaf9",
        border: "1px solid rgba(0,0,0,0.1)",
        color: "#0D1016",
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
      style={{
        background: "#fafaf9",
        border: "1px solid rgba(0,0,0,0.1)",
        color: "#0D1016",
        lineHeight: "1.5",
      }}
    />
  );
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
      style={{
        background: "#fafaf9",
        border: "1px solid rgba(0,0,0,0.1)",
        color: "#0D1016",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FRIAPage() {
  const [doc, setDoc] = useState<FRIADocument>(() => {
    if (typeof window === "undefined") return createEmptyFRIA();
    const saved = readFromStorage<FRIADocument>("fria");
    return saved ?? createEmptyFRIA();
  });
  const [step, setStep] = useState<Step>(0);
  const [activeRightIdx, setActiveRightIdx] = useState(0);
  const [approvalModal, setApprovalModal] = useState(false);
  const [approverName, setApproverName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [expandedRight, setExpandedRight] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      writeToStorage("fria", { ...doc, updatedAt: new Date().toISOString() });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function updateSection<K extends keyof FRIADocument>(
    section: K,
    patch: Partial<FRIADocument[K]>
  ) {
    setDoc((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as object), ...(patch as object) },
      updatedAt: new Date().toISOString(),
    }));
  }

  const updateAssessment = useCallback((rightId: string, patch: Partial<RightAssessment>) => {
    setDoc((prev) => {
      const assessments = (prev.section4.assessments ?? []).map((a) =>
        a.rightId === rightId ? { ...a, ...patch } : a
      );
      return { ...prev, section4: { assessments }, updatedAt: new Date().toISOString() };
    });
  }, []);

  function addAffectedCategory() {
    const cats = doc.section3.affectedCategories ?? [];
    updateSection("section3", {
      affectedCategories: [
        ...cats,
        { category: "", estimatedNumber: "", vulnerability: "standard", consentMechanism: "" } as AffectedCategory,
      ],
    });
  }

  function updateCategory(idx: number, patch: Partial<AffectedCategory>) {
    const cats = [...(doc.section3.affectedCategories ?? [])];
    cats[idx] = { ...cats[idx], ...patch };
    updateSection("section3", { affectedCategories: cats });
  }

  function removeCategory(idx: number) {
    const cats = (doc.section3.affectedCategories ?? []).filter((_, i) => i !== idx);
    updateSection("section3", { affectedCategories: cats });
  }

  function toggleMitigation(rightId: string, example: string) {
    const assessment = (doc.section4.assessments ?? []).find((a) => a.rightId === rightId);
    if (!assessment) return;
    const current = assessment.mitigationMeasures ?? [];
    const next = current.includes(example)
      ? current.filter((m) => m !== example)
      : [...current, example];
    updateAssessment(rightId, { mitigationMeasures: next });
  }

  function toggleDataType(type: string) {
    const current = doc.section5.dataTypes ?? [];
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    updateSection("section5", { dataTypes: next });
  }

  function handleApprove() {
    if (!approverName.trim()) return;
    setDoc((prev) => ({
      ...prev,
      status: "approved",
      approvedBy: approverName.trim(),
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setApprovalModal(false);
    showToast("FRIA approvato e firmato");
  }

  function handleSaveToDossier() {
    const overallRisk = getOverallFRIARisk(doc);
    const completeness = calculateFRIACompleteness(doc);
    writeToStorage("fria", { ...doc, updatedAt: new Date().toISOString() });
    showToast("Salvato nel dossier di compliance");
    // Also save a FRIAResult-compatible summary for the dossier engine
    const friaSummary = {
      systemName: doc.section1.systemName ?? "",
      organizationName: doc.section1.organizationName ?? "",
      overallRisk,
      completeness,
      status: doc.status,
      approvedBy: doc.approvedBy,
      completedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("aicomply_fria_result", JSON.stringify(friaSummary));
    }
  }

  function handlePrint() {
    window.print();
  }

  const completeness = calculateFRIACompleteness(doc);
  const overallRisk = step === 6 ? getOverallFRIARisk(doc) : null;

  // ─── Step renders ──────────────────────────────────────────────────────────

  function renderStep1() {
    const s = doc.section1;
    return (
      <div>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#0D1016" }}>Identificazione dell&apos;organizzazione e del sistema</h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.45)" }}>Art. 27 AI Act — informazioni di base sul deployer e sul sistema AI valutato.</p>
        <div className="grid md:grid-cols-2 gap-x-6">
          <Field label="Nome organizzazione *">
            <Input value={s.organizationName ?? ""} onChange={(v) => updateSection("section1", { organizationName: v })} placeholder="Es. Comune di Milano" />
          </Field>
          <Field label="Ruolo organizzazione *">
            <Select
              value={(s.organizationRole ?? "deployer") as "deployer" | "provider" | "both"}
              onChange={(v) => updateSection("section1", { organizationRole: v })}
              options={[
                { value: "deployer", label: "Deployer (utilizza il sistema)" },
                { value: "provider", label: "Provider (sviluppa il sistema)" },
                { value: "both",     label: "Entrambi" },
              ]}
            />
          </Field>
          <Field label="Nome sistema AI *">
            <Input value={s.systemName ?? ""} onChange={(v) => updateSection("section1", { systemName: v })} placeholder="Es. Sistema di scoring creditizio" />
          </Field>
          <Field label="Versione sistema">
            <Input value={s.systemVersion ?? ""} onChange={(v) => updateSection("section1", { systemVersion: v })} placeholder="Es. 2.3.1" />
          </Field>
          <Field label="Provider del sistema AI">
            <Input value={s.systemProvider ?? ""} onChange={(v) => updateSection("section1", { systemProvider: v })} placeholder="Es. OpenAI / sviluppato internamente" />
          </Field>
        </div>
        <Field label="Finalità del deployment *" hint="Descrivere lo scopo concreto per cui il sistema viene utilizzato">
          <Textarea value={s.deploymentPurpose ?? ""} onChange={(v) => updateSection("section1", { deploymentPurpose: v })} placeholder="Es. Automatizzare la pre-selezione dei candidati per assunzioni nel settore pubblico..." rows={3} />
        </Field>
        <Field label="Contesto operativo *" hint="Dove e come il sistema opera concretamente">
          <Textarea value={s.deploymentContext ?? ""} onChange={(v) => updateSection("section1", { deploymentContext: v })} placeholder="Es. Integrato nel sistema HR, elabora circa 500 candidature/mese, output è una raccomandazione per i selezionatori..." rows={3} />
        </Field>
      </div>
    );
  }

  function renderStep2() {
    const s = doc.section2;
    return (
      <div>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#0D1016" }}>Contesto di deployment</h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.45)" }}>Dettagli operativi e livello di autonomia del sistema.</p>
        <div className="grid md:grid-cols-2 gap-x-6">
          <Field label="Data inizio deployment">
            <Input value={s.deploymentStartDate ?? ""} onChange={(v) => updateSection("section2", { deploymentStartDate: v })} placeholder="AAAA-MM-GG" />
          </Field>
          <Field label="Frequenza di revisione FRIA">
            <Select
              value={(s.reviewFrequency ?? "annual") as "monthly" | "quarterly" | "biannual" | "annual"}
              onChange={(v) => updateSection("section2", { reviewFrequency: v })}
              options={[
                { value: "monthly",   label: "Mensile" },
                { value: "quarterly", label: "Trimestrale" },
                { value: "biannual",  label: "Semestrale" },
                { value: "annual",    label: "Annuale" },
              ]}
            />
          </Field>
          <Field label="Ambito geografico">
            <Input value={s.geographicScope ?? ""} onChange={(v) => updateSection("section2", { geographicScope: v })} placeholder="Es. Italia, Lombardia, solo sede di Milano..." />
          </Field>
          <Field label="Livello di autonomia *">
            <Select
              value={(s.autonomyLevel ?? "human_in_loop") as "full_auto" | "human_in_loop" | "human_on_loop" | "advisory"}
              onChange={(v) => updateSection("section2", { autonomyLevel: v })}
              options={[
                { value: "full_auto",      label: "Completamente automatizzato" },
                { value: "human_in_loop",  label: "Human-in-the-loop (umano approva ogni decisione)" },
                { value: "human_on_loop",  label: "Human-on-the-loop (umano può intervenire)" },
                { value: "advisory",       label: "Consultivo (raccomandazione non vincolante)" },
              ]}
            />
          </Field>
        </div>
        <Field label="Integrazione con processi umani *" hint="Come il sistema si inserisce nei processi decisionali esistenti">
          <Textarea value={s.integrationWithHumanProcess ?? ""} onChange={(v) => updateSection("section2", { integrationWithHumanProcess: v })} placeholder="Es. Il sistema fornisce un punteggio che un selezionatore umano può accettare o rifiutare. La decisione finale è sempre umana..." rows={4} />
        </Field>
      </div>
    );
  }

  function renderStep3() {
    const cats = doc.section3.affectedCategories ?? [];
    return (
      <div>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#0D1016" }}>Soggetti e categorie coinvolti</h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.45)" }}>Identificare chi è direttamente o indirettamente impattato dalle decisioni del sistema.</p>

        {cats.length === 0 && (
          <div className="rounded-xl p-6 text-center mb-4" style={{ background: "#fafaf9", border: "1px dashed rgba(0,0,0,0.12)" }}>
            <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>Nessuna categoria aggiunta. Aggiungi almeno una categoria di soggetti coinvolti.</p>
          </div>
        )}

        {cats.map((cat, idx) => (
          <div key={idx} className="rounded-xl p-4 mb-3" style={card}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>Categoria {idx + 1}</span>
              <button onClick={() => removeCategory(idx)} style={{ color: "rgba(0,0,0,0.3)" }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Categoria di soggetti">
                <Input value={cat.category} onChange={(v) => updateCategory(idx, { category: v })} placeholder="Es. Lavoratori, candidati, clienti..." />
              </Field>
              <Field label="Numero stimato">
                <Input value={cat.estimatedNumber} onChange={(v) => updateCategory(idx, { estimatedNumber: v })} placeholder="Es. ~500/mese, 2.000/anno..." />
              </Field>
              <Field label="Vulnerabilità">
                <Select
                  value={cat.vulnerability}
                  onChange={(v) => updateCategory(idx, { vulnerability: v })}
                  options={[
                    { value: "standard", label: "Standard" },
                    { value: "elevated", label: "Elevata (minori, disabili, soggetti vulnerabili...)" },
                  ]}
                />
              </Field>
              <Field label="Meccanismo di consenso">
                <Input value={cat.consentMechanism} onChange={(v) => updateCategory(idx, { consentMechanism: v })} placeholder="Es. Informativa GDPR, consenso esplicito..." />
              </Field>
            </div>
          </div>
        ))}

        <button
          onClick={addAffectedCategory}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium w-full justify-center"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.3)", color: "#3b82f6" }}
        >
          <Plus size={14} /> Aggiungi categoria
        </button>

        <div className="mt-5">
          <Field label="Totale soggetti stimati coinvolti">
            <Input value={doc.section3.totalEstimatedAffected ?? ""} onChange={(v) => updateSection("section3", { totalEstimatedAffected: v })} placeholder="Es. 6.000 persone/anno" />
          </Field>
        </div>
      </div>
    );
  }

  function renderStep4() {
    const assessments = doc.section4.assessments ?? [];
    const currentRight = FUNDAMENTAL_RIGHTS[activeRightIdx];
    const assessment = assessments.find((a) => a.rightId === currentRight.id) ?? {
      rightId: currentRight.id,
      relevance: "not_relevant" as const,
      relevanceJustification: "",
      identifiedRisks: "",
      mitigationMeasures: [],
      residualRisk: "acceptable" as const,
      customMitigations: "",
    };

    const relevanceColors: Record<string, string> = {
      not_relevant: "rgba(0,0,0,0.2)",
      low: "#3b82f6",
      medium: "#d97706",
      high: "#ea580c",
      critical: "#dc2626",
    };

    return (
      <div className="flex gap-4 min-h-[500px]">
        {/* Right selector sidebar */}
        <div className="flex-shrink-0 w-44">
          <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "0.6px" }}>Diritti (8)</p>
          <div className="space-y-1">
            {FUNDAMENTAL_RIGHTS.map((r, idx) => {
              const a = assessments.find((x) => x.rightId === r.id);
              const rel = a?.relevance ?? "not_relevant";
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRightIdx(idx)}
                  className="w-full text-left rounded-lg px-2.5 py-2 text-[11px] transition-all"
                  style={{
                    background: activeRightIdx === idx ? "rgba(59,130,246,0.08)" : "transparent",
                    border: activeRightIdx === idx ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
                    color: activeRightIdx === idx ? "#0D1016" : "rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: relevanceColors[rel] }} />
                    <span className="leading-tight">{r.title}</span>
                  </div>
                  <div className="text-[9px] mt-0.5 ml-3" style={{ color: "rgba(0,0,0,0.3)" }}>{r.code}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right assessment panel */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.1)" }}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="text-[10px] font-medium" style={{ color: "rgba(0,0,0,0.35)" }}>{currentRight.code} · {currentRight.charter}</span>
                <h3 className="text-[14px] font-semibold mt-0.5" style={{ color: "#0D1016" }}>{currentRight.title}</h3>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.5)" }}>{currentRight.description}</p>
          </div>

          {/* Trigger questions */}
          <button
            onClick={() => setExpandedRight(expandedRight === currentRight.id ? null : currentRight.id)}
            className="flex items-center gap-1.5 text-[11px] mb-3"
            style={{ color: "#3b82f6" }}
          >
            <Info size={12} />
            Domande guida
            {expandedRight === currentRight.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expandedRight === currentRight.id && (
            <div className="rounded-lg p-3 mb-3" style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.07)" }}>
              <ul className="space-y-1.5">
                {currentRight.triggerQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>
                    <span className="flex-shrink-0 mt-0.5 text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>→</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Rilevanza per questo sistema">
              <Select
                value={assessment.relevance}
                onChange={(v) => updateAssessment(currentRight.id, { relevance: v as RightAssessment["relevance"] })}
                options={RELEVANCE_OPTS as unknown as { value: RightAssessment["relevance"]; label: string }[]}
              />
            </Field>
            <Field label="Rischio residuo">
              <Select
                value={assessment.residualRisk}
                onChange={(v) => updateAssessment(currentRight.id, { residualRisk: v as RightAssessment["residualRisk"] })}
                options={RESIDUAL_OPTS as unknown as { value: RightAssessment["residualRisk"]; label: string }[]}
              />
            </Field>
          </div>

          <Field label="Giustificazione della rilevanza" hint="Spiegare perché questo diritto è o non è rilevante">
            <Textarea value={assessment.relevanceJustification} onChange={(v) => updateAssessment(currentRight.id, { relevanceJustification: v })} placeholder="Es. Il sistema classifica i candidati — il rischio di trattamento degradante è reale..." rows={2} />
          </Field>

          {assessment.relevance !== "not_relevant" && (
            <>
              <Field label="Rischi identificati">
                <Textarea value={assessment.identifiedRisks} onChange={(v) => updateAssessment(currentRight.id, { identifiedRisks: v })} placeholder="Descrivere i rischi concreti per questo diritto..." rows={2} />
              </Field>

              <Field label="Misure di mitigazione" hint="Seleziona o aggiungi misure">
                <div className="space-y-1.5 mb-2">
                  {currentRight.mitigationExamples.map((m, i) => {
                    const selected = (assessment.mitigationMeasures ?? []).includes(m);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleMitigation(currentRight.id, m)}
                        className="flex items-start gap-2 w-full text-left rounded-lg px-3 py-2 text-[11px] transition-all"
                        style={{
                          background: selected ? "rgba(22,163,74,0.06)" : "#fafaf9",
                          border: selected ? "1px solid rgba(22,163,74,0.2)" : "1px solid rgba(0,0,0,0.07)",
                          color: selected ? "#15803d" : "rgba(0,0,0,0.55)",
                        }}
                      >
                        <span className="flex-shrink-0 mt-0.5">{selected ? "✓" : "○"}</span>
                        {m}
                      </button>
                    );
                  })}
                </div>
                <Textarea value={assessment.customMitigations} onChange={(v) => updateAssessment(currentRight.id, { customMitigations: v })} placeholder="Misure aggiuntive personalizzate..." rows={2} />
              </Field>
            </>
          )}

          <div className="flex justify-between mt-2">
            <button
              onClick={() => setActiveRightIdx(Math.max(0, activeRightIdx - 1))}
              disabled={activeRightIdx === 0}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px]"
              style={{ background: "#f5f5f4", color: activeRightIdx === 0 ? "rgba(0,0,0,0.2)" : "#0D1016" }}
            >
              <ChevronLeft size={14} /> Precedente
            </button>
            <button
              onClick={() => setActiveRightIdx(Math.min(FUNDAMENTAL_RIGHTS.length - 1, activeRightIdx + 1))}
              disabled={activeRightIdx === FUNDAMENTAL_RIGHTS.length - 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px]"
              style={{ background: "#f5f5f4", color: activeRightIdx === FUNDAMENTAL_RIGHTS.length - 1 ? "rgba(0,0,0,0.2)" : "#0D1016" }}
            >
              Successivo <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderStep5() {
    const s = doc.section5;
    const selectedTypes = s.dataTypes ?? [];
    return (
      <div>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#0D1016" }}>Governance dei dati personali</h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.45)" }}>Art. 8 Carta UE / GDPR — valutazione del trattamento dei dati personali nel sistema.</p>

        <Field label="Tipologie di dati trattati" hint="Seleziona tutte le tipologie pertinenti">
          <div className="flex flex-wrap gap-2 mb-2">
            {DATA_TYPES_LIST.map((t) => {
              const sel = selectedTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleDataType(t)}
                  className="rounded-full px-3 py-1 text-[11px] transition-all"
                  style={{
                    background: sel ? "rgba(59,130,246,0.1)" : "#f5f5f4",
                    border: sel ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                    color: sel ? "#3b82f6" : "rgba(0,0,0,0.5)",
                    fontWeight: sel ? 500 : 400,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid md:grid-cols-2 gap-x-6">
          <Field label="Il sistema tratta dati personali?">
            <Select
              value={s.personalDataProcessed === undefined ? "" : s.personalDataProcessed ? "yes" : "no"}
              onChange={(v) => updateSection("section5", { personalDataProcessed: v === "yes" })}
              options={[
                { value: "", label: "Seleziona..." },
                { value: "yes", label: "Sì" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
          <Field label="Il sistema tratta dati sensibili (art. 9 GDPR)?">
            <Select
              value={s.sensitiveDataProcessed === undefined ? "" : s.sensitiveDataProcessed ? "yes" : "no"}
              onChange={(v) => updateSection("section5", { sensitiveDataProcessed: v === "yes" })}
              options={[
                { value: "", label: "Seleziona..." },
                { value: "yes", label: "Sì (salute, biometria, religione, orientamento sessuale...)" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
          <Field label="DPO consultato?">
            <Select
              value={s.dpoConsulted === undefined ? "" : s.dpoConsulted ? "yes" : "no"}
              onChange={(v) => updateSection("section5", { dpoConsulted: v === "yes" })}
              options={[
                { value: "", label: "Seleziona..." },
                { value: "yes", label: "Sì, il DPO è stato consultato" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
          <Field label="Riferimento DPIA (se presente)">
            <Input value={s.dpiaLink ?? ""} onChange={(v) => updateSection("section5", { dpiaLink: v })} placeholder="Es. DPIA-2025-HR-001 o URL documento" />
          </Field>
        </div>

        <Field label="Policy di conservazione dati *">
          <Textarea value={s.dataRetentionPolicy ?? ""} onChange={(v) => updateSection("section5", { dataRetentionPolicy: v })} placeholder="Es. I dati vengono conservati per 12 mesi dalla raccolta, poi anonimizzati. I log del sistema vengono conservati 6 mesi..." rows={3} />
        </Field>
      </div>
    );
  }

  function renderStep6() {
    const s = doc.section6;
    return (
      <div>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#0D1016" }}>Supervisione umana e meccanismi di rimedio</h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.45)" }}>Art. 14 e Art. 47 Carta UE — garantire che le persone impattate possano contestare le decisioni.</p>

        <Field label="Meccanismo di supervisione umana *">
          <Textarea value={s.oversightMechanism ?? ""} onChange={(v) => updateSection("section6", { oversightMechanism: v })} placeholder="Es. Ogni decisione negativa è revisionata da un HR manager prima dell'invio. Il sistema non produce output definitivi..." rows={3} />
        </Field>

        <div className="grid md:grid-cols-2 gap-x-6">
          <Field label="Revisione umana su richiesta?">
            <Select
              value={s.humanReviewOnRequest === undefined ? "" : s.humanReviewOnRequest ? "yes" : "no"}
              onChange={(v) => updateSection("section6", { humanReviewOnRequest: v === "yes" })}
              options={[
                { value: "", label: "Seleziona..." },
                { value: "yes", label: "Sì, garantita su richiesta" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
          <Field label="Notifica agli interessati?">
            <Select
              value={s.notificationToAffected === undefined ? "" : s.notificationToAffected ? "yes" : "no"}
              onChange={(v) => updateSection("section6", { notificationToAffected: v === "yes" })}
              options={[
                { value: "", label: "Seleziona..." },
                { value: "yes", label: "Sì" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
          <Field label="Scadenza per ricorsi (giorni)">
            <Input
              value={String(s.appealDeadlineDays ?? 30)}
              onChange={(v) => updateSection("section6", { appealDeadlineDays: parseInt(v) || 30 })}
              placeholder="30"
            />
          </Field>
          <Field label="Metodo di notifica">
            <Input value={s.notificationMethod ?? ""} onChange={(v) => updateSection("section6", { notificationMethod: v })} placeholder="Es. Email automatica, lettera raccomandata..." />
          </Field>
          <Field label="Responsabile FRIA *">
            <Input value={s.responsiblePerson ?? ""} onChange={(v) => updateSection("section6", { responsiblePerson: v })} placeholder="Es. Mario Rossi, DPO" />
          </Field>
          <Field label="Contatto responsabile">
            <Input value={s.responsibleContact ?? ""} onChange={(v) => updateSection("section6", { responsibleContact: v })} placeholder="Es. m.rossi@example.com" />
          </Field>
        </div>

        <Field label="Processo di ricorso *" hint="Descrivere i passi concreti che una persona può seguire per contestare una decisione">
          <Textarea value={s.appealProcess ?? ""} onChange={(v) => updateSection("section6", { appealProcess: v })} placeholder="1. L'interessato invia email a dpo@azienda.it con oggetto 'Ricorso decisione AI'&#10;2. Il DPO apre un ticket entro 5gg&#10;3. Un HR manager rivede la decisione entro 15gg lavorativi&#10;4. L'esito viene comunicato per iscritto..." rows={5} />
        </Field>
      </div>
    );
  }

  function renderResult() {
    const risk = getOverallFRIARisk(doc);
    const meta = RISK_META[risk];
    const assessments = doc.section4.assessments ?? [];
    const relevant = assessments.filter((a) => a.relevance !== "not_relevant");
    const critical = assessments.filter((a) => a.residualRisk === "unacceptable");
    const toReview = assessments.filter((a) => a.residualRisk === "review");

    const recommendedActions: string[] = [];
    if (critical.length > 0) recommendedActions.push(`Risolvere urgentemente ${critical.length} diritto/i con rischio residuo inaccettabile`);
    if (toReview.length > 0) recommendedActions.push(`Revisionare le misure di mitigazione per ${toReview.length} diritto/i`);
    if (!doc.section5.dpoConsulted) recommendedActions.push("Consultare il DPO prima del deployment");
    if (!doc.section6.humanReviewOnRequest) recommendedActions.push("Implementare meccanismo di revisione umana su richiesta");
    if (!doc.section6.notificationToAffected) recommendedActions.push("Definire processo di notifica agli interessati");
    if (completeness < 70) recommendedActions.push(`Completare le sezioni mancanti (completezza attuale: ${completeness}%)`);

    return (
      <div>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#0D1016" }}>Risultato della valutazione FRIA</h2>
        <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.45)" }}>
          Sintesi della Fundamental Rights Impact Assessment — Art. 27 AI Act
        </p>

        {/* Overall risk banner */}
        <div className="rounded-xl p-5 mb-5 flex items-center gap-4" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
          <div className="rounded-full p-2" style={{ background: `${meta.color}20` }}>
            {risk === "low" ? <CheckCircle size={20} style={{ color: meta.color }} /> :
             risk === "medium" ? <AlertTriangle size={20} style={{ color: meta.color }} /> :
             <XCircle size={20} style={{ color: meta.color }} />}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: meta.color }}>{meta.label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.5)" }}>
              {relevant.length} diritti rilevanti su 8 · {critical.length} rischi critici · {toReview.length} da rivedere
            </p>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-semibold" style={{ color: meta.color }}>{completeness}%</p>
            <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>completezza</p>
          </div>
        </div>

        {/* Rights summary table */}
        <div className="rounded-xl overflow-hidden mb-5" style={card}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-[12px] font-semibold" style={{ color: "#0D1016" }}>Diritti fondamentali valutati</p>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
            {FUNDAMENTAL_RIGHTS.map((r) => {
              const a = assessments.find((x) => x.rightId === r.id);
              const rel = a?.relevance ?? "not_relevant";
              const res = a?.residualRisk ?? "acceptable";
              const relColor: Record<string, string> = { not_relevant: "rgba(0,0,0,0.2)", low: "#3b82f6", medium: "#d97706", high: "#ea580c", critical: "#dc2626" };
              const resColor: Record<string, string> = { acceptable: "#15803d", review: "#d97706", unacceptable: "#dc2626" };
              return (
                <div key={r.id} className="flex items-center px-4 py-2.5 gap-3">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: relColor[rel] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: "#0D1016" }}>{r.title}</p>
                    <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>{r.code}</p>
                  </div>
                  {rel !== "not_relevant" && (
                    <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: `${resColor[res]}15`, color: resColor[res] }}>
                      {res === "acceptable" ? "Accettabile" : res === "review" ? "Da rivedere" : "Inaccettabile"}
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>
                    {rel === "not_relevant" ? "Non rilevante" : rel === "low" ? "Bassa" : rel === "medium" ? "Media" : rel === "high" ? "Alta" : "Critica"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended actions */}
        {recommendedActions.length > 0 && (
          <div className="rounded-xl p-4 mb-5" style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.2)" }}>
            <p className="text-[12px] font-semibold mb-2" style={{ color: "#0D1016" }}>Azioni raccomandate</p>
            <ul className="space-y-1.5">
              {recommendedActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status & info */}
        <div className="rounded-xl p-4 mb-5" style={card}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Stato</p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: "#0D1016" }}>
                {doc.status === "approved" ? "✅ Approvato" : doc.status === "review" ? "⏳ In revisione" : "📝 Bozza"}
              </p>
            </div>
            {doc.approvedBy && (
              <div>
                <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Approvato da</p>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: "#0D1016" }}>{doc.approvedBy}</p>
              </div>
            )}
            <div>
              <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>ID documento</p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: "#0D1016" }}>{doc.id}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Versione</p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: "#0D1016" }}>{doc.version}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSaveToDossier}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
            style={{ background: "#0D1016", color: "#ffffff" }}
          >
            <FileText size={14} /> Salva nel Dossier
          </button>
          <button
            onClick={() => setApprovalModal(true)}
            disabled={doc.status === "approved"}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
            style={{
              background: doc.status === "approved" ? "#f5f5f4" : "rgba(22,163,74,0.1)",
              color: doc.status === "approved" ? "rgba(0,0,0,0.3)" : "#15803d",
              border: "1px solid",
              borderColor: doc.status === "approved" ? "transparent" : "rgba(22,163,74,0.2)",
            }}
          >
            <CheckCircle size={14} />
            {doc.status === "approved" ? "Già approvato" : "Approva e firma"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
            style={{ background: "#f5f5f4", color: "#0D1016" }}
          >
            <Printer size={14} /> Stampa / PDF
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 rounded-xl px-4 py-2.5 text-[12px] font-medium shadow-lg"
          style={{ background: "#0D1016", color: "#ffffff" }}
        >
          {toast}
        </div>
      )}

      {/* Approval modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ background: "#ffffff" }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#0D1016" }}>Approva FRIA</h3>
            <p className="text-[12px] mb-4" style={{ color: "rgba(0,0,0,0.5)" }}>Inserisci il nome del responsabile che approva questa valutazione.</p>
            <Input value={approverName} onChange={setApproverName} placeholder="Es. Mario Rossi, DPO" />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setApprovalModal(false)}
                className="flex-1 rounded-lg px-4 py-2 text-[12px]"
                style={{ background: "#f5f5f4", color: "#0D1016" }}
              >
                Annulla
              </button>
              <button
                onClick={handleApprove}
                disabled={!approverName.trim()}
                className="flex-1 rounded-lg px-4 py-2 text-[12px] font-medium"
                style={{ background: approverName.trim() ? "#15803d" : "#f5f5f4", color: approverName.trim() ? "#ffffff" : "rgba(0,0,0,0.3)" }}
              >
                Approva
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium rounded px-2 py-0.5" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>Art. 27</span>
            <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.3)" }}>Fundamental Rights Impact Assessment</span>
          </div>
          <h1 className="text-[24px] font-semibold" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>FRIA — Valutazione d&apos;impatto sui diritti fondamentali</h1>
          <p className="text-[12px] mt-1" style={{ color: "rgba(0,0,0,0.45)" }}>
            Obbligatoria per deployer di sistemi AI ad alto rischio che interagiscono con persone fisiche.
          </p>
        </div>

        {/* Progress stepper */}
        {step < 6 && (
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STEPS.slice(0, 6).map((s, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => setStep(i as Step)}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
                  style={{
                    background: step === i ? "#0D1016" : step > i ? "rgba(22,163,74,0.08)" : "#f5f5f4",
                    color: step === i ? "#ffffff" : step > i ? "#15803d" : "rgba(0,0,0,0.4)",
                    fontWeight: step === i ? 500 : 400,
                  }}
                >
                  {step > i ? <CheckCircle size={11} /> : <span className="text-[10px]">{i + 1}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < 5 && <ChevronRight size={10} className="flex-shrink-0" style={{ color: "rgba(0,0,0,0.2)" }} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Main card */}
        <div className="rounded-2xl p-6" style={card}>
          {step === 0 && renderStep1()}
          {step === 1 && renderStep2()}
          {step === 2 && renderStep3()}
          {step === 3 && renderStep4()}
          {step === 4 && renderStep5()}
          {step === 5 && renderStep6()}
          {step === 6 && renderResult()}
        </div>

        {/* Navigation */}
        {step < 6 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
              disabled={step === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
              style={{ background: "#f5f5f4", color: step === 0 ? "rgba(0,0,0,0.2)" : "#0D1016" }}
            >
              <ChevronLeft size={14} /> Indietro
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                Completezza: {completeness}%
              </span>
              <button
                onClick={() => setStep((s) => Math.min(6, s + 1) as Step)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
                style={{ background: "#0D1016", color: "#ffffff" }}
              >
                {step === 5 ? "Vedi risultato" : "Avanti"} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="mt-4">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px]"
              style={{ background: "#f5f5f4", color: "#0D1016" }}
            >
              <ChevronLeft size={14} /> Torna alla valutazione
            </button>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#fria-print-root) { display: none !important; }
          #fria-print-root { display: block !important; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>
    </>
  );
}
