"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Download, ChevronRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";

// ─── Annex IV — 9 sections ────────────────────────────────────────────────────
const ANNEX_IV = [
  {
    id: "s1", ref: "IV §1", title: "Descrizione generale",
    required: true,
    hint: "Uso previsto, contesto di deploy, categorie di utenti e destinatari.",
    autoSource: null,
    placeholder: "Il sistema analizza curriculum vitae per supportare il processo di selezione del personale nell'ambito delle assunzioni aziendali. Gli utenti destinatari sono i responsabili HR. Il sistema non adotta decisioni autonome vincolanti...",
  },
  {
    id: "s2", ref: "IV §2a", title: "Logica e architettura",
    required: true,
    hint: "Logica generale, algoritmo, scelte progettuali chiave, architettura software.",
    autoSource: "code",
    placeholder: "Architettura: Transformer-based classifier (BERT-large). Pipeline: preprocessing → feature extraction → classificazione binaria. Soglia decisionale: 0.72. Framework: PyTorch 2.1, HuggingFace Transformers 4.35...",
  },
  {
    id: "s3", ref: "IV §2b", title: "Specifiche di progettazione",
    required: true,
    hint: "Requisiti tecnici, vincoli di sistema, specifiche di input/output.",
    autoSource: "code",
    placeholder: "Input: file PDF/DOCX max 5MB, testo estratto UTF-8. Output: score 0–100 + feature importance top-5. Latenza max: 800ms p99. Disponibilità: 99.9%. Lingua supportata: italiano, inglese...",
  },
  {
    id: "s4", ref: "IV §2c", title: "Dati di addestramento",
    required: true,
    hint: "Origine, governance, bias analysis — auto-importato da Data Audit.",
    autoSource: "data-audit",
    placeholder: "",
  },
  {
    id: "s5", ref: "IV §2d", title: "Metriche di performance",
    required: true,
    hint: "Accuracy, precision, recall, F1 su test set. Soglie di accettazione.",
    autoSource: "mlflow",
    placeholder: "Accuracy: 87.3% | Precision: 84.1% | Recall: 89.7% | F1: 86.8%. Test set: 12.400 record, hold-out 20%. Evaluation date: 2025-03-15...",
  },
  {
    id: "s6", ref: "IV §2e", title: "Gestione dei rischi",
    required: true,
    hint: "Auto-importato da Risk Manager (Art. 9).",
    autoSource: "risk-manager",
    placeholder: "",
  },
  {
    id: "s7", ref: "IV §2f", title: "Modifiche nel ciclo di vita",
    required: false,
    hint: "Elenco modifiche sostanziali ex Art. 3(23) con riferimento ai commit.",
    autoSource: "git",
    placeholder: "v2.1.0 (2025-04-10, commit a3f9c2d): aggiornamento soglia classificazione 0.68→0.72 dopo re-training su dataset bilanciato (CTGAN). Classificata come modifica sostanziale ex Art. 3(23)...",
  },
  {
    id: "s8", ref: "IV §2g", title: "Norme armonizzate",
    required: false,
    hint: "Standard CEN/CENELEC, ISO/IEC applicati.",
    autoSource: null,
    placeholder: "ISO/IEC 42001:2023 — AI Management Systems. ISO/IEC 27001:2022 — Information Security. CEN/TC 449 — AI Act harmonised standards (in corso). EN ISO 13485 (se contesto medico)...",
  },
  {
    id: "s9", ref: "IV §3", title: "Sorveglianza post-market",
    required: true,
    hint: "Piano di monitoraggio post-deploy, KPI, soglie di allerta.",
    autoSource: null,
    placeholder: "Monitoring continuo: drift detection settimanale su distribuzione input. Alert se accuracy scende sotto 82% su finestra mobile 30gg. Revisione umana obbligatoria se score < 40 o > 90 (casi limite)...",
  },
];

// ─── Simulated version history ────────────────────────────────────────────────
const VERSIONS = [
  { tag: "v2.1.0", commit: "a3f9c2d", date: "2025-04-10", status: "Finalized", changes: 3 },
  { tag: "v2.0.1", commit: "b7e1a4c", date: "2025-02-28", status: "Finalized", changes: 1 },
  { tag: "v2.0.0", commit: "c4d2f18", date: "2025-01-15", status: "Expired",   changes: 9 },
  { tag: "v1.3.2", commit: "d9a5e31", date: "2024-11-20", status: "Expired",   changes: 2 },
];

// ─── Auto-populated content (simulates cross-tool aggregation) ────────────────
const AUTO_CONTENT: Record<string, string> = {
  "data-audit": `**[Auto-importato da Data Audit — Art. 10]**\n\nDataset: HR Screening Dataset (84.320 righe)\nFonte: Snowflake.prod / HR_DATA · Valido dal: 15/01/2024\n\nMetriche bias (snapshot Mag 2025):\n• Disparate Impact (DI): 0.61 ⚠ — sotto soglia 0.8 (Regola 4/5)\n• Statistical Parity Diff. (SPD): 0.32\n• Equalized Odds Diff. (EOD): 0.19\n\nProxy detector: cap_residenza → proxy etnia (67%), cod_settore → proxy genere (52%)\n\nStato: CTGAN Debiasing richiesto prima del deployment.`,

  "risk-manager": `**[Auto-importato da Risk Manager — Art. 9]**\n\nClassificazione: Sistema ad Alto Rischio (Allegato III, punto 4 — Occupazione)\nRisk score: 7.4/10\n\nRischi identificati:\n1. Discriminazione algoritmica (CRITICO) — DI < 0.8 su genere/etnia\n2. Opacità decisionale (ALTO) — Explainability index: 0.42\n3. Data drift post-deploy (MEDIO) — Rilevato drift su distribuzione input Q1 2025\n\nMisure di mitigazione:\n• CTGAN debiasing attivo dalla v2.1.0\n• SHAP values esposti per ogni predizione\n• Sentinel agent attivo con alert settimanale`,

  "code": `**[Auto-estratto da Repository — GitHub]**\n\nUltimo commit analizzato: a3f9c2d (main, 2025-04-10)\nFile chiave: src/models/screener.py, src/api/main.py\n\nArchitettura rilevata: BERT-large classifier\nDipendenze critiche: torch==2.1.0, transformers==4.35.3, scikit-learn==1.3.2\n\nAST Analysis: 3 endpoint AI-critical identificati\nCompliance signals: 4 (2 critici, 2 warning)`,

  "git": `**[Auto-estratto da Git History]**\n\nv2.1.0 (a3f9c2d, 2025-04-10): Aggiornamento soglia 0.68→0.72, CTGAN integration — MODIFICA SOSTANZIALE ex Art. 3(23)\nv2.0.1 (b7e1a4c, 2025-02-28): Hotfix preprocessing multilingua — modifica non sostanziale\nv2.0.0 (c4d2f18, 2025-01-15): Major release, nuovo training set — MODIFICA SOSTANZIALE`,

  "mlflow": `**[Auto-estratto da MLflow]**\n\nRun ID: mlf-2025-04-10-001 · Experiment: hr-screener-v2\nAccuracy: 87.3% | Precision: 84.1% | Recall: 89.7% | F1: 86.8%\nTest set: 12.400 record, hold-out 20% · Date: 2025-04-10\n\nHyperparameters: lr=2e-5, batch=32, epochs=4, max_seq=512\nArtifact: s3://mlflow-artifacts/hr-screener/v2.1.0/model.pt`,
};

// ─── Status styling ───────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Finalized: { bg: "rgba(22,163,74,0.08)",  text: "#16a34a", border: "rgba(22,163,74,0.2)"  },
  Draft:     { bg: "rgba(59,130,246,0.08)", text: "#2563eb", border: "rgba(59,130,246,0.2)" },
  Expired:   { bg: "rgba(0,0,0,0.04)",      text: "rgba(0,0,0,0.35)", border: "rgba(0,0,0,0.1)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocuGenPage() {
  const [activeVersion, setActiveVersion] = useState(0);
  const [activeSection, setActiveSection] = useState("s1");
  const [content, setContent] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, "empty" | "draft" | "done">>({});
  const [compareMode, setCompareMode] = useState(false);
  const [compareIdx, setCompareIdx] = useState(1);

  const version = VERSIONS[activeVersion];

  function getContent(sectionId: string) {
    const sec = ANNEX_IV.find((s) => s.id === sectionId)!;
    if (content[sectionId] !== undefined) return content[sectionId];
    if (sec.autoSource) return AUTO_CONTENT[sec.autoSource] ?? "";
    return "";
  }

  function getSectionStatus(sectionId: string): "empty" | "draft" | "done" {
    if (status[sectionId]) return status[sectionId];
    const sec = ANNEX_IV.find((s) => s.id === sectionId)!;
    if (sec.autoSource) return "done";
    return "empty";
  }

  const doneCount  = ANNEX_IV.filter((s) => getSectionStatus(s.id) === "done").length;
  const draftCount = ANNEX_IV.filter((s) => getSectionStatus(s.id) === "draft").length;
  const emptyRequired = ANNEX_IV.filter((s) => s.required && getSectionStatus(s.id) === "empty");
  const canFinalize = emptyRequired.length === 0;

  const activeS = ANNEX_IV.find((s) => s.id === activeSection)!;

  return (
    <div className="max-w-6xl" style={{ fontFamily: "var(--font-inter, system-ui)" }}>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1"
            style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>
            Art. 11 · Allegato IV
          </p>
          <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>
            DocuGen AI — Fascicolo Tecnico
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Version selector */}
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]"
            style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)" }}>
            <GitBranch className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.35)" }} />
            <select
              value={activeVersion}
              onChange={(e) => setActiveVersion(Number(e.target.value))}
              className="bg-transparent outline-none text-[12px]"
              style={{ color: "#0D1016" }}
            >
              {VERSIONS.map((v, i) => (
                <option key={v.tag} value={i}>{v.tag} — {v.commit.slice(0, 7)}</option>
              ))}
            </select>
          </div>

          {/* Status badge */}
          <div className="text-[11px] font-medium px-3 py-2 rounded-lg"
            style={STATUS_STYLE[version.status]}>
            {version.status}
          </div>

          {/* Compare toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className="text-[11px] px-3 py-2 rounded-lg transition-all"
            style={compareMode
              ? { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#4338ca" }
              : { background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.45)" }}
          >
            Confronta versioni
          </button>

          {/* Export */}
          <button className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#fff" }}>
            <Download className="h-3.5 w-3.5" />
            Esporta
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Sezioni completate", value: `${doneCount}/9`,  color: "#16a34a" },
          { label: "In bozza",           value: draftCount,         color: "#2563eb" },
          { label: "Obbligatorie vuote", value: emptyRequired.length, color: emptyRequired.length > 0 ? "#dc2626" : "#16a34a" },
          { label: "Commit collegato",   value: version.commit,     color: "rgba(0,0,0,0.5)" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-4"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="text-[20px] font-semibold" style={{ color: c.color, letterSpacing: "-0.5px" }}>
              {c.value}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.38)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Compare mode banner ── */}
      {compareMode && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
          <span className="text-[12px]" style={{ color: "#4338ca" }}>
            Confronto: <strong>{VERSIONS[activeVersion].tag}</strong> vs
          </span>
          <select
            value={compareIdx}
            onChange={(e) => setCompareIdx(Number(e.target.value))}
            className="text-[12px] rounded px-2 py-1 outline-none"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#4338ca" }}
          >
            {VERSIONS.map((v, i) =>
              i !== activeVersion ? <option key={v.tag} value={i}>{v.tag}</option> : null
            )}
          </select>
          <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            Le variazioni sostanziali sono evidenziate in rosso
          </span>
        </div>
      )}

      {/* ── Main: sidebar + editor ── */}
      <div className="flex gap-4">

        {/* Left: Annex IV navigator + radar */}
        <div className="flex-shrink-0 w-56">

          {/* Compliance radar */}
          <div className="rounded-xl p-4 mb-3"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-semibold uppercase mb-3"
              style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
              Allegato IV — Completamento
            </p>
            <div className="space-y-1.5">
              {ANNEX_IV.map((s) => {
                const st = getSectionStatus(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: st === "done" ? "#16a34a" : st === "draft" ? "#3b82f6" : s.required ? "#dc2626" : "rgba(0,0,0,0.15)" }} />
                    <span className="text-[10px] truncate" style={{ color: "rgba(0,0,0,0.5)" }}>{s.title}</span>
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>Completamento</span>
                <span className="text-[10px] font-semibold" style={{ color: "#0D1016" }}>
                  {Math.round((doneCount / 9) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${(doneCount / 9) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ background: "linear-gradient(90deg,#3b82f6,#6366f1)" }}
                />
              </div>
            </div>
            {!canFinalize && (
              <p className="text-[10px] mt-2" style={{ color: "#dc2626" }}>
                ⚠ {emptyRequired.length} sezione{emptyRequired.length > 1 ? "i" : "e"} obbligatoria{emptyRequired.length > 1 ? "e" : ""} vuota{emptyRequired.length > 1 ? "e" : ""} — Finalizzazione bloccata
              </p>
            )}
          </div>

          {/* Section list */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {ANNEX_IV.map((s) => {
              const st = getSectionStatus(s.id);
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all"
                  style={{
                    background: active ? "rgba(59,130,246,0.07)" : "transparent",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  {st === "done"  && <CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: "#16a34a" }} />}
                  {st === "draft" && <Clock        className="h-3 w-3 flex-shrink-0" style={{ color: "#3b82f6" }} />}
                  {st === "empty" && <div className="w-3 h-3 rounded-full flex-shrink-0 border" style={{ borderColor: s.required ? "#dc2626" : "rgba(0,0,0,0.2)" }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate font-medium"
                      style={{ color: active ? "#2563eb" : "#0D1016" }}>{s.title}</p>
                    <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.28)" }}>{s.ref}</p>
                  </div>
                  {active && <ChevronRight className="h-3 w-3 flex-shrink-0" style={{ color: "#3b82f6" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="rounded-xl p-5"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

              {/* Section header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb" }}>
                      {activeS.ref}
                    </span>
                    {activeS.required && (
                      <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: "rgba(239,68,68,0.07)", color: "#dc2626" }}>
                        Obbligatoria
                      </span>
                    )}
                    {activeS.autoSource && (
                      <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a" }}>
                        Auto-popolata ✦
                      </span>
                    )}
                  </div>
                  <h2 className="text-[15px] font-medium" style={{ color: "#0D1016" }}>
                    {activeS.title}
                  </h2>
                  <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>{activeS.hint}</p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {["empty", "draft", "done"].map((st) => (
                    <button key={st} onClick={() => setStatus({ ...status, [activeSection]: st as "empty" | "draft" | "done" })}
                      className="text-[10px] px-2.5 py-1 rounded-full transition-all"
                      style={getSectionStatus(activeSection) === st
                        ? { background: st === "done" ? "rgba(22,163,74,0.12)" : st === "draft" ? "rgba(59,130,246,0.12)" : "rgba(0,0,0,0.07)", color: st === "done" ? "#16a34a" : st === "draft" ? "#2563eb" : "rgba(0,0,0,0.45)", fontWeight: 600 }
                        : { background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.3)" }}>
                      {st === "done" ? "Completata" : st === "draft" ? "In bozza" : "Vuota"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compare diff banner */}
              {compareMode && VERSIONS[compareIdx] && (
                <div className="rounded-lg px-3 py-2 mb-3 text-[11px]"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#dc2626" }}>
                  ∆ Variazioni rilevate rispetto a {VERSIONS[compareIdx].tag}: logica algoritmica modificata (commit {VERSIONS[compareIdx].commit})
                </div>
              )}

              {/* Auto-source notice */}
              {activeS.autoSource && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-[11px]"
                  style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                  <span style={{ color: "#16a34a" }}>
                    Contenuto auto-importato da{" "}
                    <strong>
                      {activeS.autoSource === "data-audit" ? "Data Audit (Art. 10)" :
                       activeS.autoSource === "risk-manager" ? "Risk Manager (Art. 9)" :
                       activeS.autoSource === "code" ? "Repository GitHub" :
                       activeS.autoSource === "git" ? "Git History" :
                       "MLflow"}
                    </strong>
                    {" "}— sincronizzato con commit {version.commit}
                  </span>
                </div>
              )}

              {/* Editor */}
              <textarea
                value={getContent(activeSection)}
                onChange={(e) => {
                  setContent({ ...content, [activeSection]: e.target.value });
                  if (!status[activeSection]) setStatus({ ...status, [activeSection]: "draft" });
                }}
                className="w-full rounded-lg px-4 py-3 text-[13px] outline-none resize-none transition-all"
                style={{
                  background: "#FAFAF9",
                  border: "1px solid rgba(0,0,0,0.09)",
                  color: "#0D1016",
                  minHeight: "220px",
                  lineHeight: 1.7,
                  fontFamily: "var(--font-inter, system-ui)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.09)")}
                placeholder={activeS.placeholder || "Inserisci il contenuto della sezione..."}
              />

              {/* Bottom actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  {["Markdown", "JSON", "PDF firmato"].map((fmt) => (
                    <button key={fmt}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded transition-opacity hover:opacity-70"
                      style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.45)" }}>
                      <Download className="h-3 w-3" /> {fmt}
                    </button>
                  ))}
                </div>
                {canFinalize && version.status !== "Finalized" && (
                  <button className="text-[12px] font-medium px-4 py-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: "#0D1016", color: "#fff" }}>
                    Finalizza fascicolo →
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Version timeline ── */}
          <div className="mt-4 rounded-xl p-4"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-semibold uppercase mb-3"
              style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
              Storico versioni — collegato a Git commit
            </p>
            <div className="flex items-center gap-0">
              {VERSIONS.map((v, i) => {
                const style = STATUS_STYLE[v.status];
                const active = i === activeVersion;
                return (
                  <button key={v.tag} onClick={() => setActiveVersion(i)}
                    className="flex-1 flex flex-col items-center gap-1 relative group">
                    {i < VERSIONS.length - 1 && (
                      <div className="absolute left-1/2 right-0 top-2 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
                    )}
                    <div className="w-4 h-4 rounded-full z-10 flex items-center justify-center"
                      style={{
                        background: active ? "#0D1016" : style.bg,
                        border: `2px solid ${active ? "#0D1016" : style.border}`,
                        boxShadow: active ? "0 0 0 3px rgba(13,16,22,0.1)" : "none",
                      }}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: active ? "#0D1016" : "rgba(0,0,0,0.45)" }}>
                      {v.tag}
                    </span>
                    <span className="text-[9px]" style={{ color: "rgba(0,0,0,0.28)" }}>{v.date}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                      {v.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Finalize blocker ── */}
          {!canFinalize && (
            <div className="mt-3 rounded-xl px-4 py-3 flex items-start gap-2"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
              <p className="text-[12px]" style={{ color: "#dc2626" }}>
                Finalizzazione bloccata: completa le sezioni obbligatorie{" "}
                <strong>{emptyRequired.map((s) => s.ref).join(", ")}</strong>{" "}
                prima di passare allo stato Finalized.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
