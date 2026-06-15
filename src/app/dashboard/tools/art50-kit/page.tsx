"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import Link from "next/link";
import {
  Shield, Plus, RefreshCw, Download, AlertTriangle,
  CheckCircle, XCircle, Clock, ExternalLink, FileText,
  Trash2, Wand2, Sparkles, Loader2, Check, ChevronDown, X, Info,
} from "lucide-react";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult } from "@/lib/dossier/storage-schema";
import { ART50_OBLIGATIONS, SYNTHETIC_CONTENT_EXEMPTIONS, DEEPFAKE_EXEMPTIONS, AICOMPLY_AI_INTERACTIONS } from "@/lib/art50/art50-reference";
import {
  loadArt50Record, saveArt50Record, getSystemRecord, setSystemRecord,
  LABELLING_METHOD_CAPABILITIES, LabellingMethodLabels,
  type Art50Record, type Art50SystemRecord, type SyntheticContentLabel,
  type ContentType, type LabellingMethod, type SelfComplianceItem, type SelfComplianceStatus,
} from "@/lib/art50/art50-types";
import { proposeLabellingPlan } from "@/app/actions/art50Actions";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f8f9fa",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.18)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.07)", amberBdr: "rgba(202,138,4,0.22)",
  green: "#15803d", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.18)",
  blue: "#1d4ed8", blueBg: "rgba(29,78,216,0.05)", blueBdr: "rgba(29,78,216,0.16)",
  violet: "#7c3aed", violetBg: "rgba(124,58,237,0.05)", violetBdr: "rgba(124,58,237,0.16)",
} as const;
const FONT: CSSProperties = { fontFamily: "Inter, system-ui, sans-serif" };
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const inp: CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const ta: CSSProperties = { ...inp, resize: "vertical" as const };

// ─── Legacy types (scanner registry) ─────────────────────────────────────────
type Art50System = {
  id: string; name: string; type: "chatbot" | "content" | "recommendation" | "other";
  url: string; registroId: string; lastScore: number | null; lastScannedAt: string | null;
  createdAt: string; signals: Art50SignalSummary[];
};
type Art50SignalSummary = { criterion: string; detected: boolean; score: number; maxScore: number };

function loadSystems(): Art50System[] {
  try { return JSON.parse(localStorage.getItem("art50_systems") ?? "[]"); } catch { return []; }
}
function saveSystems(systems: Art50System[]): void {
  localStorage.setItem("art50_systems", JSON.stringify(systems));
  writeToStorage("art50", { systemsCount: systems.length, completedAt: new Date().toISOString() });
}
function makeRegistroId(): string {
  const year = new Date().getFullYear();
  return `IMP-ART50-${year}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`;
}
function gradeFromScore(score: number): string {
  if (score >= 90) return "A"; if (score >= 70) return "B"; if (score >= 50) return "C"; if (score >= 30) return "D"; return "F";
}
const GRADE_COLOR: Record<string, string> = { A: "#16a34a", B: "#2563eb", C: "#ca8a04", D: "#ea580c", F: "#dc2626" };
const TYPE_LABELS: Record<Art50System["type"], string> = { chatbot: "Chatbot / Assistente", content: "Generazione contenuti", recommendation: "Raccomandazioni", other: "Altro" };

const DEADLINE = new Date("2026-12-02");
const daysLeft = Math.ceil((DEADLINE.getTime() - Date.now()) / 86400000);

// ─── Content types list ────────────────────────────────────────────────────────
const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "text",  label: "Testo" },
  { value: "audio", label: "Audio" },
  { value: "image", label: "Immagine" },
  { value: "video", label: "Video" },
];

// ─── Self-compliance status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: SelfComplianceStatus }) {
  const map: Record<SelfComplianceStatus, { label: string; color: string; bg: string }> = {
    compliant: { label: "Conforme",  color: T.green, bg: T.greenBg },
    partial:   { label: "Parziale",  color: T.amber, bg: T.amberBg },
    gap:       { label: "Gap",       color: T.red,   bg: T.redBg   },
    "n/a":     { label: "N/A",       color: T.faint, bg: T.bg      },
  };
  const s = map[status];
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

// ─── Labelling method warning ─────────────────────────────────────────────────
function NonConformWarning({ method, exemptionClaimed }: { method: LabellingMethod; exemptionClaimed?: string }) {
  const { machineReadable } = LABELLING_METHOD_CAPABILITIES[method];
  if (machineReadable || exemptionClaimed) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-lg p-2.5 mt-1" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: T.red }} />
      <p className="text-[11px]" style={{ color: T.red }}>
        Questo metodo non soddisfa il requisito di marcatura leggibile da dispositivi dell&apos;Art. 50(2) [verify against current AI Act text], salvo applicazione di un&apos;eccezione documentata.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Art50KitPage() {
  // Legacy scanner state
  const [systems, setSystems] = useState<Art50System[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [scanning, setScanning] = useState<string | null>(null);
  const [activeSystem, setActiveSystem] = useState<Art50System | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Art50System["type"]>("chatbot");
  const [formUrl, setFormUrl] = useState("");

  // Art50 compliance record state
  const [art50Record, setArt50Record] = useState<Art50Record>(() => ({ systemRecords: {}, selfCompliance: [] }));

  // Self-compliance state
  const [selfItems, setSelfItems] = useState<SelfComplianceItem[]>([]);
  const [selfTab, setSelfTab] = useState<"client" | "self">("client");

  // AI copilot
  const [proposing, setProposing] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<Record<string, { contentType: ContentType; suggestedMethod: LabellingMethod; rationale: string; exemptionId?: string; exemptionJustification?: string }[]>>({});

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    setSystems(loadSystems());
    const rec = loadArt50Record();
    setArt50Record(rec);
    // Initialize self-compliance from AICOMPLY_AI_INTERACTIONS if empty
    if (rec.selfCompliance.length === 0) {
      const initial: SelfComplianceItem[] = AICOMPLY_AI_INTERACTIONS.map(i => ({
        id: i.id, obligationId: i.obligationId, area: i.area,
        status: "gap" as SelfComplianceStatus,
        evidence: undefined,
        remediationNotes: i.obligationId === "direct_interaction_disclosure"
          ? "Art. 50(1)/(5) [verify against current AI Act text]: aggiungere banner/header persistente nel componente chat che identifichi l'interlocutore come sistema IA. Il badge ✦ AI sui singoli campi è necessario ma non sufficiente per le interfacce conversazionali."
          : "Art. 50(2) [verify against current AI Act text]: i badge ✦ AI — verifica e conferma sui campi sono human-readable ma non machine-readable. Remediation minima: aggiungere footer standardizzato 'Documento generato con assistenza IA — AIComply' negli export, e valutare metadati XMP/IPTC per PDF.",
      }));
      setSelfItems(initial);
    } else {
      setSelfItems(rec.selfCompliance);
    }
  }, []);

  function persistRecord(rec: Art50Record, items?: SelfComplianceItem[]) {
    const toSave = { ...rec, selfCompliance: items ?? selfItems, updatedAt: new Date().toISOString() };
    saveArt50Record(toSave);
    setArt50Record(toSave);
  }

  function patchSystemRec(systemId: string, patch: Partial<Art50SystemRecord>) {
    const existing = getSystemRecord(art50Record, systemId);
    const updated = { ...existing, ...patch, systemId, updatedAt: new Date().toISOString() };
    const newRec = setSystemRecord(art50Record, systemId, updated);
    persistRecord(newRec);
  }

  // ── Scanner (legacy) ────────────────────────────────────────────────────────
  async function scanSystem(system: Art50System) {
    if (!system.url) return;
    setScanning(system.id);
    try {
      const res = await fetch("/api/scanner/art50", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: system.url }) });
      const data = await res.json();
      const updated = systems.map(s => s.id === system.id ? { ...s, lastScore: data.score ?? null, lastScannedAt: new Date().toISOString(), signals: (data.signals ?? []).map((sig: { criterion: string; detected: boolean; score: number; maxScore: number }) => ({ criterion: sig.criterion, detected: sig.detected, score: sig.score, maxScore: sig.maxScore })) } : s);
      setSystems(updated); saveSystems(updated);
      if (activeSystem?.id === system.id) setActiveSystem(updated.find(s => s.id === system.id) ?? null);
    } catch { } finally { setScanning(null); }
  }

  function addSystem() {
    if (!formName || !formType) return;
    const sys: Art50System = { id: crypto.randomUUID(), name: formName, type: formType, url: formUrl, registroId: makeRegistroId(), lastScore: null, lastScannedAt: null, createdAt: new Date().toISOString(), signals: [] };
    const updated = [...systems, sys]; setSystems(updated); saveSystems(updated);
    setShowForm(false); setFormName(""); setFormType("chatbot"); setFormUrl("");
    if (formUrl) setTimeout(() => scanSystem(sys), 100);
  }

  function deleteSystem(id: string) {
    if (!confirm("Eliminare questo sistema?")) return;
    const updated = systems.filter(s => s.id !== id); setSystems(updated); saveSystems(updated);
    if (activeSystem?.id === id) setActiveSystem(null);
  }

  function downloadRegistro(system: Art50System) {
    const lines = [
      "REGISTRO DI IMPLEMENTAZIONE ART. 50 — AI ACT (UE) 2024/1689", "=".repeat(60), "",
      `ID Registro:          ${system.registroId}`, `Sistema AI:           ${system.name}`,
      `Tipologia:            ${TYPE_LABELS[system.type]}`, `URL:                  ${system.url || "non specificato"}`,
      `Data registrazione:   ${new Date(system.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Ultimo scan:          ${system.lastScannedAt ? new Date(system.lastScannedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) : "non eseguito"}`,
      `Punteggio Art. 50:    ${system.lastScore !== null ? system.lastScore + "/100" : "n/d"}`, "",
      "COMPONENTI DICHIARATI INSTALLATI:",
      "  - Banner disclosure AI visibile agli utenti", "  - Meta tag machine-readable (ai-disclosure)", "  - Markup strutturato JSON-LD", "",
      "RIFERIMENTO NORMATIVO:", "  Art. 50(1)-(5) Regolamento (UE) 2024/1689 (AI Act) [verify against current AI Act text]", "  Deadline: 2 dicembre 2026", "",
      "NOTA LEGALE:", "  AI Comply non rilascia attestazioni di conformità legale.", "  Questo documento costituisce esclusivamente un registro interno.", "=".repeat(60),
      `Generato da AIComply — ${new Date().toISOString()}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${system.registroId}.txt`; a.click(); URL.revokeObjectURL(url);
  }

  // ── AI copilot — proposeLabellingPlan ───────────────────────────────────────
  async function runProposeLabellingPlan(system: Art50System) {
    const rec = getSystemRecord(art50Record, system.id);
    if (rec.selectedContentTypes.length === 0) { showToast("Seleziona almeno un tipo di contenuto prima di chiedere una proposta AI"); return; }
    setProposing(system.id);
    try {
      const result = await proposeLabellingPlan({ systemName: system.name, intendedPurpose: "", contentTypes: rec.selectedContentTypes, systemType: TYPE_LABELS[system.type] });
      setPendingProposals(prev => ({ ...prev, [system.id]: result.proposals.map(p => ({ contentType: p.contentType as ContentType, suggestedMethod: p.suggestedMethod as LabellingMethod, rationale: p.rationale, exemptionId: p.exemptionId, exemptionJustification: p.exemptionJustification })) }));
    } catch (e) { showToast(e instanceof Error ? e.message : "Errore AI"); }
    finally { setProposing(null); }
  }

  function acceptProposal(systemId: string, contentType: ContentType) {
    const proposals = pendingProposals[systemId] ?? [];
    const p = proposals.find(pr => pr.contentType === contentType);
    if (!p) return;
    const rec = getSystemRecord(art50Record, systemId);
    const { machineReadable, humanReadable } = LABELLING_METHOD_CAPABILITIES[p.suggestedMethod];
    const existing = rec.syntheticContentLabels.find(l => l.contentType === contentType);
    const updated: SyntheticContentLabel = {
      systemId, contentType, labellingMethod: p.suggestedMethod,
      machineReadable, humanReadable,
      exemptionClaimed: p.exemptionId,
      exemptionJustification: p.exemptionJustification,
      aiConfirmed: true,
      notes: existing?.notes,
    };
    const syntheticContentLabels = rec.syntheticContentLabels.some(l => l.contentType === contentType)
      ? rec.syntheticContentLabels.map(l => l.contentType === contentType ? updated : l)
      : [...rec.syntheticContentLabels, updated];
    patchSystemRec(systemId, { syntheticContentLabels });
    // Remove accepted proposal
    setPendingProposals(prev => ({ ...prev, [systemId]: (prev[systemId] ?? []).filter(pr => pr.contentType !== contentType) }));
  }

  // ── Self-compliance ─────────────────────────────────────────────────────────
  function updateSelfItem(id: string, patch: Partial<SelfComplianceItem>) {
    const updated = selfItems.map(i => i.id === id ? { ...i, ...patch } : i);
    setSelfItems(updated);
    const newRec = { ...art50Record, selfCompliance: updated };
    saveArt50Record(newRec);
    setArt50Record(newRec);
  }

  // Aggregate self-compliance status
  const selfGaps = selfItems.filter(i => i.status === "gap").length;
  const selfPartial = selfItems.filter(i => i.status === "partial").length;
  const selfCompliant = selfItems.filter(i => i.status === "compliant").length;

  return (
    <div className="max-w-4xl mx-auto space-y-5" style={FONT}>

      {/* Deadline banner */}
      <div className="flex items-center justify-between px-5 py-3 rounded-xl text-sm"
        style={daysLeft <= 90 ? { background: "#fef2f2", border: "1px solid #fecaca" } : { background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
        <div className="flex items-center gap-3">
          <Clock size={16} style={{ color: daysLeft <= 90 ? T.red : T.blue }} />
          <span style={{ color: daysLeft <= 90 ? "#7f1d1d" : "#1e3a5f" }}>
            <strong>{daysLeft} giorni</strong> alla deadline Art. 50 — 2 dicembre 2026
            {daysLeft <= 90 && " · Azione urgente richiesta"}
          </span>
        </div>
        <a href="https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium" style={{ color: daysLeft <= 90 ? T.red : T.blue }}>
          Art. 50 AI Act <ExternalLink size={12} />
        </a>
      </div>

      {/* ── Art. 50(1)-(5) reference table ─────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={card}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
          <p className="text-[12px] font-semibold" style={{ color: T.text }}>Obblighi Art. 50(1)-(5) [verify against current AI Act text]</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.faint }}>✦ AI — verifica e conferma: struttura paragrafi ricostruita dalla memoria del modello — verificare sul testo consolidato AI Act.</p>
        </div>
        <div className="divide-y" style={{ borderColor: "#f3f4f6" }}>
          {ART50_OBLIGATIONS.map(obl => (
            <div key={obl.id} className="flex items-start gap-3 px-4 py-3">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ background: T.blueBg, color: T.blue }}>
                {obl.reference.split(" ").slice(0, 2).join(" ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium" style={{ color: T.text }}>{obl.label}</p>
                <p className="text-[10px]" style={{ color: T.faint }}>{obl.reference}</p>
              </div>
              {obl.appliesToSelf && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: T.violetBg, color: T.violet }}>AIComply</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(0,0,0,0.04)" }}>
        {([
          { v: "client" as const, l: "Sistemi del cliente" },
          { v: "self" as const, l: `Autoconformità AIComply${selfGaps > 0 ? ` · ${selfGaps} gap` : ""}` },
        ]).map(t => (
          <button key={t.v} onClick={() => setSelfTab(t.v)}
            className="text-[12px] font-medium px-4 py-1.5 rounded-lg transition-all"
            style={{ background: selfTab === t.v ? T.card : "transparent", color: selfTab === t.v ? T.text : T.muted, boxShadow: selfTab === t.v ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CLIENT TAB — sistemi del cliente
      ══════════════════════════════════════════════════════════════════════ */}
      {selfTab === "client" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: T.text }}>Art. 50 Kit</h1>
              <p className="text-sm mt-0.5" style={{ color: T.muted }}>
                Gestisci la disclosure AI dei tuoi sistemi · {systems.length} sistema{systems.length !== 1 ? "i" : "o"} registrato{systems.length !== 1 ? "i" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/onboarding" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.card }}>
                <Wand2 size={14} /> Setup guidato
              </Link>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: T.text }}>
                <Plus size={16} /> Aggiungi sistema
              </button>
            </div>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="rounded-xl p-5" style={{ border: `1px solid ${T.blueBdr}`, background: T.blueBg }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: T.text }}>Nuovo sistema AI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Nome sistema *</label>
                  <input type="text" placeholder="es. Chatbot sito web" value={formName} onChange={e => setFormName(e.target.value)} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>URL sito</label>
                  <input type="url" placeholder="https://tuo-sito.it" value={formUrl} onChange={e => setFormUrl(e.target.value)} style={inp} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-2" style={{ color: T.muted }}>Tipo sistema *</label>
                  <div className="flex flex-wrap gap-2">
                    {([ { value: "chatbot" as const, label: "Chatbot / Assistente" }, { value: "content" as const, label: "Generazione contenuti" }, { value: "recommendation" as const, label: "Raccomandazioni" }, { value: "other" as const, label: "Altro" } ]).map(opt => (
                      <button key={opt.value} type="button" onClick={() => setFormType(opt.value)} className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                        style={formType === opt.value ? { border: `1px solid ${T.blue}`, background: T.card, color: T.blue } : { border: `1px solid ${T.border}`, background: T.card, color: T.muted }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => { setShowForm(false); setFormName(""); setFormUrl(""); setFormType("chatbot"); }} style={{ border: `1px solid ${T.border}`, background: T.card, color: T.muted, padding: "6px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>
                <button type="button" onClick={addSystem} disabled={!formName} style={{ background: T.blue, color: "#fff", padding: "6px 20px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "none", opacity: !formName ? 0.4 : 1 }}>
                  {formUrl ? "Aggiungi e avvia scan →" : "Aggiungi sistema →"}
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {systems.length === 0 && !showForm && (
            <div className="rounded-xl py-16 text-center" style={{ border: "2px dashed rgba(0,0,0,0.14)", background: T.card }}>
              <Shield size={40} className="mx-auto mb-4" style={{ color: T.faint }} />
              <p className="font-medium" style={{ color: T.muted }}>Nessun sistema registrato</p>
              <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: T.faint }}>Aggiungi il tuo primo sistema AI per avviare la compliance Art. 50.</p>
              <button onClick={() => setShowForm(true)} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: T.text }}>
                <Plus size={16} /> Aggiungi il primo sistema
              </button>
            </div>
          )}

          {/* Systems list */}
          {systems.length > 0 && (
            <div className="space-y-4">
              {systems.map(system => {
                const score = system.lastScore;
                const grade = score !== null ? gradeFromScore(score) : null;
                const gColor = grade ? (GRADE_COLOR[grade] ?? "#9ca3af") : "#9ca3af";
                const isExpanded = activeSystem?.id === system.id;
                const rec = getSystemRecord(art50Record, system.id);
                const proposals = pendingProposals[system.id] ?? [];

                return (
                  <div key={system.id} className="rounded-xl p-5 transition-all" style={{ background: T.card, border: isExpanded ? `1px solid ${T.blueBdr}` : `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {/* System header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2" style={{ borderColor: gColor, color: gColor }}>
                          {score !== null ? grade : "—"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm" style={{ color: T.text }}>{system.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.bg, color: T.muted }}>{TYPE_LABELS[system.type]}</span>
                            <span className="text-xs font-mono" style={{ color: T.faint }}>{system.registroId}</span>
                          </div>
                          {system.url && <a href={system.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-xs hover:underline" style={{ color: T.blue }}>{system.url.replace(/^https?:\/\//, "")} <ExternalLink size={11} /></a>}
                          {system.signals.length > 0 && <div className="flex gap-1 mt-2">{system.signals.map(sig => <div key={sig.criterion} title={sig.criterion} className="h-1.5 w-8 rounded-full" style={{ background: sig.detected ? "#4ade80" : "#f87171" }} />)}</div>}
                          {system.lastScannedAt ? <p className="text-xs mt-1.5" style={{ color: T.faint }}>Ultimo scan: {new Date(system.lastScannedAt).toLocaleDateString("it-IT")} · Punteggio: {system.lastScore}/100</p> : <p className="flex items-center gap-1 text-xs mt-1.5" style={{ color: T.amber }}><AlertTriangle size={11} /> Scansione non ancora eseguita</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => scanSystem(system)} disabled={scanning === system.id || !system.url} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40" style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.card, cursor: "pointer" }}>
                          <RefreshCw size={11} className={scanning === system.id ? "animate-spin" : ""} /> {scanning === system.id ? "Scansione..." : "Ri-scansiona"}
                        </button>
                        <button onClick={() => downloadRegistro(system)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.card, cursor: "pointer" }}><Download size={11} /> Registro</button>
                        <button onClick={() => setActiveSystem(isExpanded ? null : system)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs"
                          style={isExpanded ? { border: `1px solid ${T.blueBdr}`, background: T.blueBg, color: T.blue } : { border: `1px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer" }}>
                          <FileText size={11} /> Dettagli
                        </button>
                        <button onClick={() => deleteSystem(system.id)} className="p-1.5 rounded-lg border" style={{ border: `1px solid ${T.border}`, color: T.muted, background: "none", cursor: "pointer" }}><Trash2 size={13} /></button>
                      </div>
                    </div>

                    {/* ── EXPANDED DETAIL ── */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 space-y-5" style={{ borderTop: `1px solid ${T.border}` }}>

                        {/* Scan signals */}
                        {system.signals.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>Analisi scanner Art. 50</p>
                            <div className="space-y-1.5">
                              {system.signals.map(sig => (
                                <div key={sig.criterion} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {sig.detected ? <CheckCircle size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-400" />}
                                    <span className="font-mono" style={{ color: T.text }}>{sig.criterion}</span>
                                  </div>
                                  <span className="font-medium" style={{ color: sig.detected ? "#16a34a" : T.red }}>{sig.score}/{sig.maxScore}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── Art. 50(1) — direct interaction checklist ── */}
                        {(system.type === "chatbot" || system.type === "recommendation") && (
                          <div className="rounded-xl p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>Art. 50(1)</span>
                              <span className="text-[12px] font-semibold" style={{ color: T.text }}>Disclosure di interazione con sistema IA [verify against current AI Act text]</span>
                            </div>
                            <div className="space-y-3">
                              {[
                                { field: "presentsAsAi" as const, label: "Il sistema si presenta esplicitamente come IA al primo contatto?" },
                                { field: "clearAndDistinguishable" as const, label: "L'informazione è fornita in modo chiaro e distinguibile (Art. 50(5))?" },
                              ].map(q => (
                                <div key={q.field}>
                                  <p className="text-[11px] mb-1" style={{ color: T.text }}>{q.label}</p>
                                  <div className="flex gap-2">
                                    {(["yes", "no", "unspecified"] as const).map(v => {
                                      const labels = { yes: "Sì", no: "No", unspecified: "Da verificare" };
                                      const current = rec.directInteraction?.[q.field] ?? "unspecified";
                                      return (
                                        <button key={v} onClick={() => patchSystemRec(system.id, { directInteraction: { ...rec.directInteraction, systemId: system.id, [q.field]: v } as typeof rec.directInteraction })}
                                          className="text-[11px] px-2.5 py-1 rounded-lg border"
                                          style={{ borderColor: current === v ? T.blue : T.border, background: current === v ? T.blueBg : "transparent", color: current === v ? T.blue : T.muted, cursor: "pointer" }}>
                                          {labels[v]}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {/* Obvious exemption */}
                              <div>
                                <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: T.text }}>
                                  <input type="checkbox" checked={rec.directInteraction?.obviousExemptionClaimed ?? false}
                                    onChange={e => patchSystemRec(system.id, { directInteraction: { ...rec.directInteraction, systemId: system.id, obviousExemptionClaimed: e.target.checked } as typeof rec.directInteraction })} />
                                  Esiste un&apos;eccezione di "evidenza" (il contesto rende ovvio che si interagisce con un&apos;IA)?
                                </label>
                                {rec.directInteraction?.obviousExemptionClaimed && (
                                  <textarea rows={2} value={rec.directInteraction?.obviousExemptionJustification ?? ""}
                                    onChange={e => patchSystemRec(system.id, { directInteraction: { ...rec.directInteraction, systemId: system.id, obviousExemptionJustification: e.target.value } as typeof rec.directInteraction })}
                                    placeholder="Motiva brevemente perché il contesto rende ovvio il carattere artificiale del sistema..."
                                    className="mt-1" style={ta} />
                                )}
                              </div>
                              {/* Status */}
                              <div className="flex gap-2 flex-wrap">
                                {(["compliant", "partial", "gap", "n/a"] as SelfComplianceStatus[]).map(s => {
                                  const l = { compliant: "Conforme", partial: "Parziale", gap: "Gap", "n/a": "N/A" };
                                  const active = (rec.directInteraction?.status ?? "n/a") === s;
                                  return <button key={s} onClick={() => patchSystemRec(system.id, { directInteraction: { ...rec.directInteraction, systemId: system.id, status: s } as typeof rec.directInteraction })}
                                    className="text-[11px] px-2.5 py-1 rounded-lg border"
                                    style={{ borderColor: active ? T.blue : T.border, background: active ? T.blueBg : "transparent", color: active ? T.blue : T.muted, cursor: "pointer" }}>
                                    {l[s]}
                                  </button>;
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Art. 50(2) — synthetic content labelling ── */}
                        <div className="rounded-xl p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>Art. 50(2)</span>
                              <span className="text-[12px] font-semibold" style={{ color: T.text }}>Marcatura machine-readable contenuti sintetici [verify against current AI Act text]</span>
                            </div>
                            <button onClick={() => runProposeLabellingPlan(system)} disabled={proposing === system.id}
                              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                              style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer", opacity: proposing === system.id ? 0.7 : 1 }}>
                              {proposing === system.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Proposta AI
                            </button>
                          </div>

                          {/* Content type selector */}
                          <div className="mb-3">
                            <p className="text-[11px] font-medium mb-1.5" style={{ color: T.muted }}>Tipi di contenuto generati da questo sistema:</p>
                            <div className="flex gap-2 flex-wrap">
                              {CONTENT_TYPES.map(ct => {
                                const selected = rec.selectedContentTypes.includes(ct.value);
                                return (
                                  <button key={ct.value} onClick={() => {
                                    const types = selected ? rec.selectedContentTypes.filter(t => t !== ct.value) : [...rec.selectedContentTypes, ct.value];
                                    patchSystemRec(system.id, { selectedContentTypes: types });
                                  }}
                                    className="text-[11px] px-2.5 py-1 rounded-lg border"
                                    style={{ borderColor: selected ? T.blue : T.border, background: selected ? T.blueBg : "transparent", color: selected ? T.blue : T.muted, cursor: "pointer", fontWeight: selected ? 600 : 400 }}>
                                    {ct.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Per-content-type labelling rows */}
                          {rec.selectedContentTypes.length > 0 && (
                            <div className="space-y-3">
                              {rec.selectedContentTypes.map(ct => {
                                const label = rec.syntheticContentLabels.find(l => l.contentType === ct);
                                const proposal = proposals.find(p => p.contentType === ct);
                                const method = label?.labellingMethod ?? "none";
                                const { machineReadable, humanReadable } = LABELLING_METHOD_CAPABILITIES[method];

                                return (
                                  <div key={ct} className="rounded-lg p-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                                    <p className="text-[11px] font-semibold mb-2" style={{ color: T.text }}>{CONTENT_TYPES.find(c => c.value === ct)?.label}</p>

                                    {/* AI proposal */}
                                    {proposal && (
                                      <div className="rounded-lg p-2.5 mb-2" style={{ background: T.violetBg, border: `1px solid ${T.violetBdr}` }}>
                                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: T.violet }}>✦ AI — verifica e conferma</p>
                                        <p className="text-[11px] mb-1" style={{ color: T.text }}>{proposal.rationale}</p>
                                        <p className="text-[11px]" style={{ color: T.muted }}>Metodo proposto: <strong>{LabellingMethodLabels[proposal.suggestedMethod]}</strong></p>
                                        {proposal.exemptionId && <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>Eccezione: {SYNTHETIC_CONTENT_EXEMPTIONS.find(e => e.id === proposal.exemptionId)?.label}</p>}
                                        <button onClick={() => acceptProposal(system.id, ct)}
                                          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded"
                                          style={{ background: T.violet, color: "#fff", border: "none", cursor: "pointer" }}>
                                          <Check size={10} /> Accetta
                                        </button>
                                      </div>
                                    )}

                                    {/* Method selector */}
                                    <select value={method} onChange={e => {
                                      const m = e.target.value as LabellingMethod;
                                      const cap = LABELLING_METHOD_CAPABILITIES[m];
                                      const existing: SyntheticContentLabel = { systemId: system.id, contentType: ct, labellingMethod: m, machineReadable: cap.machineReadable, humanReadable: cap.humanReadable, aiConfirmed: false, exemptionClaimed: label?.exemptionClaimed, exemptionJustification: label?.exemptionJustification };
                                      const syntheticContentLabels = rec.syntheticContentLabels.some(l => l.contentType === ct)
                                        ? rec.syntheticContentLabels.map(l => l.contentType === ct ? existing : l)
                                        : [...rec.syntheticContentLabels, existing];
                                      patchSystemRec(system.id, { syntheticContentLabels });
                                    }} style={{ ...inp, width: "auto", marginBottom: 4 }}>
                                      {Object.entries(LabellingMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>

                                    <NonConformWarning method={method} exemptionClaimed={label?.exemptionClaimed} />

                                    {/* Capabilities display */}
                                    <div className="flex gap-3 mt-1.5 text-[10px]">
                                      <span style={{ color: machineReadable ? T.green : T.red }}>
                                        {machineReadable ? "✓" : "✗"} Machine-readable
                                      </span>
                                      <span style={{ color: humanReadable ? T.green : T.muted }}>
                                        {humanReadable ? "✓" : "✗"} Human-readable
                                      </span>
                                    </div>

                                    {/* Exemption */}
                                    {!machineReadable && (
                                      <div className="mt-2">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Eccezione Art. 50(2) [verify against current AI Act text]</label>
                                        <select value={label?.exemptionClaimed ?? ""} onChange={e => {
                                          const syntheticContentLabels = rec.syntheticContentLabels.map(l => l.contentType === ct ? { ...l, exemptionClaimed: e.target.value || undefined } : l);
                                          patchSystemRec(system.id, { syntheticContentLabels });
                                        }} style={{ ...inp, width: "auto" }}>
                                          <option value="">Nessuna eccezione</option>
                                          {SYNTHETIC_CONTENT_EXEMPTIONS.map(e => <option key={e.id} value={e.id}>{e.label.slice(0, 60)}...</option>)}
                                        </select>
                                        {label?.exemptionClaimed && (
                                          <textarea rows={2} value={label.exemptionJustification ?? ""}
                                            onChange={e => { const syntheticContentLabels = rec.syntheticContentLabels.map(l => l.contentType === ct ? { ...l, exemptionJustification: e.target.value } : l); patchSystemRec(system.id, { syntheticContentLabels }); }}
                                            placeholder="Giustificazione obbligatoria per l'eccezione..."
                                            className="mt-1" style={ta} />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* ── Art. 50(4) — deepfake disclosure ── */}
                        {rec.selectedContentTypes.some(t => ["image", "audio", "video"].includes(t)) && (
                          <div className="rounded-xl p-4" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: T.amberBg, color: T.amber }}>Art. 50(4)</span>
                              <span className="text-[12px] font-semibold" style={{ color: T.text }}>Disclosure contenuti deepfake [verify against current AI Act text]</span>
                            </div>
                            <p className="text-[11px] mb-3 leading-relaxed" style={{ color: T.muted }}>
                              I deployer di sistemi che generano o manipolano immagine/audio/video che costituiscono un &quot;deepfake&quot; devono divulgare che il contenuto è stato generato o manipolato artificialmente.
                              Eccezioni: (a) opere evidentemente artistiche/creative/satiriche/fittizie — obbligo limitato alla divulgazione dell&apos;esistenza; (b) testo pubblicato con responsabilità editoriale e revisione umana — non si applica.
                              [verify against current AI Act text]
                            </p>

                            {/* Applicability */}
                            <p className="text-[11px] font-medium mb-1.5" style={{ color: T.text }}>Il sistema genera o manipola contenuti che potrebbero costituire un deepfake?</p>
                            <div className="flex gap-2 mb-3">
                              {(["yes", "no", "unspecified"] as const).map(v => {
                                const labels = { yes: "Sì", no: "No", unspecified: "Da valutare" };
                                const current = rec.deepfakeDisclosure?.applicable ?? "unspecified";
                                return (
                                  <button key={v} onClick={() => patchSystemRec(system.id, { deepfakeDisclosure: { aiConfirmed: false, ...rec.deepfakeDisclosure, systemId: system.id, applicable: v, contentTypes: rec.selectedContentTypes.filter(t => ["image", "audio", "video"].includes(t)) as ContentType[] } })}
                                    className="text-[11px] px-2.5 py-1 rounded-lg border"
                                    style={{ borderColor: current === v ? T.amber : T.border, background: current === v ? T.amberBg : "transparent", color: current === v ? T.amber : T.muted, cursor: "pointer", fontWeight: current === v ? 600 : 400 }}>
                                    {labels[v]}
                                  </button>
                                );
                              })}
                            </div>

                            {rec.deepfakeDisclosure?.applicable === "yes" && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Meccanismo di disclosure all&apos;utente finale</label>
                                  <textarea rows={2} value={rec.deepfakeDisclosure?.disclosureMechanism ?? ""}
                                    onChange={e => patchSystemRec(system.id, { deepfakeDisclosure: { ...rec.deepfakeDisclosure, systemId: system.id, disclosureMechanism: e.target.value } as typeof rec.deepfakeDisclosure })}
                                    placeholder="es. 'Etichetta visibile in sovraimpressione: Immagine generata artificialmente — AIComply'" style={ta} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: T.muted }}>Eccezione Art. 50(4) [verify against current AI Act text]</label>
                                  <select value={rec.deepfakeDisclosure?.exemptionClaimed ?? ""}
                                    onChange={e => patchSystemRec(system.id, { deepfakeDisclosure: { ...rec.deepfakeDisclosure, systemId: system.id, exemptionClaimed: e.target.value || undefined } as typeof rec.deepfakeDisclosure })}
                                    style={{ ...inp, width: "auto" }}>
                                    <option value="">Nessuna eccezione</option>
                                    {DEEPFAKE_EXEMPTIONS.map(e => <option key={e.id} value={e.id}>{e.label.slice(0, 65)}...</option>)}
                                  </select>
                                  {rec.deepfakeDisclosure?.exemptionClaimed && (
                                    <textarea rows={2} value={rec.deepfakeDisclosure?.exemptionJustification ?? ""}
                                      onChange={e => patchSystemRec(system.id, { deepfakeDisclosure: { ...rec.deepfakeDisclosure, systemId: system.id, exemptionJustification: e.target.value } as typeof rec.deepfakeDisclosure })}
                                      placeholder="Giustificazione obbligatoria per l'eccezione..."
                                      className="mt-1" style={ta} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Art. 50(3) — emotion/biometric cross-link ── */}
                        <div className="rounded-xl p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: T.blueBg, color: T.blue }}>Art. 50(3)</span>
                            <span className="text-[12px] font-semibold" style={{ color: T.text }}>Disclosure riconoscimento emozioni / categorizzazione biometrica [verify against current AI Act text]</span>
                          </div>
                          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: T.muted }}>
                            I deployer di sistemi di riconoscimento delle emozioni o di categorizzazione biometrica devono informare le persone fisiche esposte al sistema.
                            Questo obbligo è gestito in Art. 5 Checker (Art. 5(1)(f)/(g)) e Deployer Dashboard (obblighi di informazione). [verify against current AI Act text]
                          </p>
                          <div className="flex gap-3 flex-wrap">
                            <Link href="/dashboard/tools/prohibited" className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: T.blue }}>
                              <ExternalLink size={11} /> Art. 5 Checker — pratiche vietate / biometrica
                            </Link>
                            <Link href="/dashboard/tools/deployer-dashboard" className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: T.blue }}>
                              <ExternalLink size={11} /> Deployer Dashboard — informazione persone (Art. 26)
                            </Link>
                          </div>
                          <label className="flex items-center gap-2 mt-3 text-[11px] cursor-pointer" style={{ color: T.muted }}>
                            <input type="checkbox" checked={rec.emotionBiometricLinkAcknowledged}
                              onChange={e => patchSystemRec(system.id, { emotionBiometricLinkAcknowledged: e.target.checked })} />
                            Ho verificato il collegamento con Art. 5 Checker e Deployer Dashboard per gli obblighi Art. 50(3)
                          </label>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Info footer */}
          <div className="rounded-xl px-5 py-4 text-xs leading-relaxed" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.muted }}>
            <strong style={{ color: T.text }}>Art. 50 AI Act — cosa richiede.</strong>{" "}
            I sistemi AI che interagiscono direttamente con persone fisiche devono informare gli utenti della natura artificiale del sistema in modo chiaro, tempestivo e comprensibile (Art. 50(1)).
            I contenuti sintetici (testo/audio/immagine/video) devono essere marcati in formato leggibile da dispositivi (Art. 50(2)).
            Obbligatorio dal 2 dicembre 2026. Multa massima: 1% del fatturato annuo globale (Art. 99(3)). [verify against current AI Act text]
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SELF-COMPLIANCE TAB — autoconformità AIComply
      ══════════════════════════════════════════════════════════════════════ */}
      {selfTab === "self" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: T.text }}>Autoconformità AIComply — Art. 50</h2>
            <p className="text-sm mt-1" style={{ color: T.muted }}>
              AIComply è essa stessa provider di funzionalità IA (i suggerimenti ✦ AI) soggette ad Art. 50.
              Questa sezione documenta lo stato di conformità delle proprie interazioni AI. [verify against current AI Act text]
            </p>
          </div>

          {/* Status summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Conformi", value: selfCompliant, color: T.green, bg: T.greenBg },
              { label: "Parziali", value: selfPartial,  color: T.amber, bg: T.amberBg },
              { label: "Gap",      value: selfGaps,      color: T.red,   bg: T.redBg   },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px]" style={{ color: s.color }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Art. 50(1)/(5) — direct interaction disclosure (Legal Assistant, chat) */}
          <div>
            <h3 className="text-[12px] font-semibold mb-3" style={{ color: T.text }}>
              Art. 50(1)/(5) — Disclosure interazione con IA [verify against current AI Act text]
            </h3>
            <div className="rounded-xl p-4 mb-4" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
              <div className="flex items-start gap-2">
                <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: T.amber }} />
                <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>
                  Art. 50(1) richiede che le interfacce conversazionali identifichino il sistema AI al primo contatto, in modo chiaro e distinguibile (Art. 50(5)).
                  Il badge ✦ AI sui singoli campi è necessario ma non sufficiente per le interfacce chat — serve un banner/header persistente.
                  [verify against current AI Act text]
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {selfItems.filter(i => i.obligationId === "direct_interaction_disclosure").map(item => (
                <SelfComplianceCard key={item.id} item={item} onUpdate={updateSelfItem} />
              ))}
            </div>
          </div>

          {/* Art. 50(2) — machine-readable on exports */}
          <div>
            <h3 className="text-[12px] font-semibold mb-3" style={{ color: T.text }}>
              Art. 50(2) — Marcatura machine-readable sui documenti esportati [verify against current AI Act text]
            </h3>
            <div className="rounded-xl p-4 mb-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
              <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                I documenti generati con assistenza AI (DPIA, FRIA, Risk Manager, DocuGen, ecc.) devono includere marcatura leggibile da macchina.
                Stato attuale: export PDF/JSON via Blob senza metadati strutturati — metodo attuale è <strong>disclosure_statement_only</strong> (badge ✦ AI visibile nel testo, non machine-readable).
                Remediation minima: footer standardizzato &quot;Documento generato con assistenza di intelligenza artificiale — AIComply&quot; su ogni export, e valutazione metadati XMP/IPTC per PDF.
                [verify against current AI Act text]
              </p>
            </div>
            <div className="space-y-2">
              {selfItems.filter(i => i.obligationId === "synthetic_content_marking").map(item => (
                <SelfComplianceCard key={item.id} item={item} onUpdate={updateSelfItem} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg" style={{ background: T.text, color: "#fff" }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

// ─── Self compliance card ─────────────────────────────────────────────────────
function SelfComplianceCard({ item, onUpdate }: { item: SelfComplianceItem; onUpdate: (id: string, patch: Partial<SelfComplianceItem>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border" style={{ background: "#fff", borderColor: item.status === "compliant" ? "#86efac" : item.status === "gap" ? "#fca5a5" : "#e5e7eb" }}>
      <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex-shrink-0">
          {item.status === "compliant" ? <CheckCircle size={14} style={{ color: "#15803d" }} /> :
           item.status === "gap" ? <XCircle size={14} style={{ color: "#dc2626" }} /> :
           item.status === "partial" ? <AlertTriangle size={14} style={{ color: "#d97706" }} /> :
           <X size={14} style={{ color: "rgba(0,0,0,0.22)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>{item.area}</span>
            <StatusBadge status={item.status} />
          </div>
        </div>
        <ChevronDown size={12} style={{ color: "rgba(0,0,0,0.22)", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: "#f3f4f6" }}>
          {item.remediationNotes && !item.evidence && (
            <div className="mt-2 rounded-lg p-2.5 mb-2" style={{ background: "#fef9c3", border: "1px solid #fde047" }}>
              <p className="text-[11px] leading-relaxed" style={{ color: "#713f12" }}>{item.remediationNotes}</p>
            </div>
          )}
          <div className="mt-2 mb-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "rgba(0,0,0,0.42)" }}>Evidenza di conformità</label>
            <textarea rows={2} value={item.evidence ?? ""} onChange={e => onUpdate(item.id, { evidence: e.target.value })} placeholder="Descrivi la misura adottata..." style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, color: "#0D1016", background: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["compliant", "partial", "gap", "n/a"] as SelfComplianceStatus[]).map(s => {
              const l = { compliant: "Conforme", partial: "Parziale", gap: "Gap", "n/a": "N/A" };
              const active = item.status === s;
              return <button key={s} onClick={() => onUpdate(item.id, { status: s })} className="text-[11px] px-2.5 py-1 rounded-lg border"
                style={{ borderColor: active ? "#1d4ed8" : "rgba(0,0,0,0.08)", background: active ? "rgba(29,78,216,0.05)" : "transparent", color: active ? "#1d4ed8" : "rgba(0,0,0,0.42)", cursor: "pointer", fontWeight: active ? 600 : 400 }}>
                {l[s]}
              </button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
