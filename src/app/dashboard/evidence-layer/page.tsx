"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, CheckCircle, AlertTriangle, Plus,
  ChevronDown, ChevronUp, Download, X, Search,
} from "lucide-react";
import {
  appendEvidence, getAllEvidence, verifyChain,
  type EvidenceRecord, type EvidenceType,
} from "@/lib/evidence/evidence-layer";
import { EVIDENCE_TEMPLATES } from "@/lib/evidence/evidence-templates";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  );
}

function getRecordTitle(r: EvidenceRecord): string {
  const c = r.content as Record<string, string>;
  switch (r.type) {
    case "adr":        return c.titolo || "";
    case "log":        return c.evento || "";
    case "decision":   return c.titolo || "";
    case "audit":      return (c.ambito || "").slice(0, 60);
    case "test":       return c.nome_test || "";
    case "incident":   return (c.descrizione || "").slice(0, 60);
    case "monitoring": return `${c.metrica || ""}: ${c.valore_corrente || ""}`;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EvidenceLayerPage() {
  const [records, setRecords]             = useState<EvidenceRecord[]>([]);
  const [chainStatus, setChainStatus]     = useState<{ valid: boolean; brokenAt?: number }>({ valid: true });
  const [filterType, setFilterType]       = useState<EvidenceType | "all">("all");
  const [searchQuery, setSearchQuery]     = useState("");
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [step, setStep]                   = useState<1 | 2>(1);
  const [selectedType, setSelectedType]   = useState<EvidenceType | null>(null);
  const [formValues, setFormValues]       = useState<Record<string, string>>({});
  const [formErrors, setFormErrors]       = useState<Record<string, boolean>>({});
  const [author, setAuthor]               = useState("");
  const [authorError, setAuthorError]     = useState(false);
  const [toast, setToast]                 = useState<{ visible: boolean; hash: string }>({ visible: false, hash: "" });
  const [saving, setSaving]               = useState(false);

  const refresh = useCallback(() => {
    setRecords(getAllEvidence());
    setChainStatus(verifyChain());
  }, []);

  useEffect(() => {
    const existing = getAllEvidence();
    if (existing.length === 0) {
      Promise.all([
        appendEvidence("adr", {
          titolo: "Scelta modello: RandomForest vs Neural Network",
          decisione: "Adottato RandomForest per classificazione del rischio",
          alternative_valutate: "Neural Network scartato per scarsa interpretabilità (Art. 13)",
          motivazione: "RandomForest offre feature importance nativa, fondamentale per SHAP",
          conseguenze: "Accuratezza inferiore del 2% ma trasparenza molto superiore",
          responsabile: "Team AI Engineering",
        }, "admin@azienda.it"),
        appendEvidence("test", {
          nome_test: "Bias check — dataset demografici",
          versione_modello: "v1.0.0",
          metrica: "Disparate Impact Ratio",
          valore_ottenuto: "0.86",
          soglia_superamento: "≥ 0.80",
          esito: "PASS",
          note: "Testato su 3 gruppi protetti: genere, età, provenienza",
        }, "admin@azienda.it"),
        appendEvidence("monitoring", {
          metrica: "accuracy",
          valore_corrente: "0.94",
          soglia_allarme: "< 0.88",
          stato: "Nella norma",
          periodo_misurazione: "2025-Q1",
          azione_raccomandata: "",
        }, "admin@azienda.it"),
      ]).then(() => refresh());
    } else {
      refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ──────────────────────────────────────────────────────────

  const usedTypes = EVIDENCE_TEMPLATES.filter(t => records.some(r => r.type === t.key));

  const filtered = [...records]
    .reverse()
    .filter(r => filterType === "all" || r.type === filterType)
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.author.toLowerCase().includes(q) ||
        r.type.includes(q) ||
        JSON.stringify(r.content).toLowerCase().includes(q)
      );
    });

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openPanel(preselectedType?: EvidenceType) {
    setFormValues({});
    setFormErrors({});
    setAuthor("");
    setAuthorError(false);
    if (preselectedType) {
      setSelectedType(preselectedType);
      setStep(2);
    } else {
      setSelectedType(null);
      setStep(1);
    }
    setPanelOpen(true);
  }

  async function handleSave() {
    if (!selectedType) return;
    const tmpl = EVIDENCE_TEMPLATES.find(t => t.key === selectedType)!;
    const errors: Record<string, boolean> = {};
    for (const f of tmpl.fields) {
      if (f.required && !formValues[f.key]?.trim()) errors[f.key] = true;
    }
    if (!author.trim()) setAuthorError(true);
    if (Object.keys(errors).length > 0 || !author.trim()) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    const content: Record<string, unknown> = {};
    for (const f of tmpl.fields) content[f.key] = formValues[f.key] || "";
    const rec = await appendEvidence(selectedType, content, author);
    refresh();
    setPanelOpen(false);
    setStep(1);
    setSelectedType(null);
    setFormValues({});
    setFormErrors({});
    setAuthor("");
    setSaving(false);
    setToast({ visible: true, hash: rec.hash.slice(0, 8) });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  function exportChain() {
    const data = {
      exported_at: new Date().toISOString(),
      chain_valid: chainStatus.valid,
      total_records: records.length,
      records: getAllEvidence(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `evidence-chain-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full" style={{ minHeight: "100%" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.5px", color: "#0D1016" }}>
              Evidence Layer
            </h1>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(13,16,22,0.06)", color: "rgba(13,16,22,0.5)" }}
            >
              Art. 12 · Art. 9 · Art. 72
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.42)", maxWidth: "520px" }}>
            Archivio immutabile con hash crittografico a catena. Ogni record è legato al precedente — garantisce integrità delle prove per audit e autorità.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={exportChain}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)" }}
          >
            <Download className="h-3.5 w-3.5" /> Esporta Chain
          </button>
          <button
            onClick={() => openPanel()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: "#0D1016", color: "#ffffff" }}
          >
            <Plus className="h-3.5 w-3.5" /> Nuovo record
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Record totali",       value: String(records.length),        color: "#0D1016", small: false },
          { label: "Tipi usati",          value: `${usedTypes.length}/7`,       color: "#0D1016", small: false },
          {
            label: "Catena hash",
            value: chainStatus.valid ? "✓ Integra" : "✗ ROTTA",
            color: chainStatus.valid ? "#16a34a" : "#dc2626",
            small: false,
          },
          {
            label: "Ultimo aggiornamento",
            value: records.length > 0 ? formatDate(records[records.length - 1].timestamp) : "—",
            color: "#0D1016",
            small: true,
          },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div
              className="font-semibold mb-0.5"
              style={{ fontSize: card.small ? "13px" : "20px", letterSpacing: "-0.3px", color: card.color }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(0,0,0,0.38)" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Chain broken banner ── */}
      {!chainStatus.valid && (
        <div
          className="rounded-xl p-3 mb-5 flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.25)" }}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "#dc2626" }} />
          <p style={{ fontSize: "12px", color: "#dc2626" }}>
            <strong>Allarme integrità:</strong> la catena risulta manomessa a partire dal record #{chainStatus.brokenAt}.
            Esporta la chain e contatta il responsabile della conformità.
          </p>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
            style={
              filterType === "all"
                ? { background: "#0D1016", color: "#ffffff" }
                : { background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.5)" }
            }
          >
            Tutti <span style={{ opacity: 0.6 }}>{records.length}</span>
          </button>
          {usedTypes.map(tmpl => {
            const count = records.filter(r => r.type === tmpl.key).length;
            return (
              <button
                key={tmpl.key}
                onClick={() => setFilterType(tmpl.key)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={
                  filterType === tmpl.key
                    ? { background: tmpl.color, color: "#ffffff" }
                    : { background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.5)" }
                }
              >
                {tmpl.label.split(" — ")[0]}{" "}
                <span style={{ opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.3)" }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca autore, tipo, contenuto…"
            className="pl-8 pr-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", color: "#0D1016", width: "220px" }}
          />
        </div>
      </div>

      {/* ── Record list ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}
        >
          <Database className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(0,0,0,0.15)" }} />
          <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.4)" }}>
            Nessun record{filterType !== "all"
              ? ` di tipo "${EVIDENCE_TEMPLATES.find(t => t.key === filterType)?.label}"`
              : ""}.
          </p>
          <button
            onClick={() => openPanel(filterType !== "all" ? filterType : undefined)}
            className="mt-3 text-[12px] font-medium"
            style={{ color: "#0D1016", textDecoration: "underline" }}
          >
            Aggiungi il primo record
            {filterType !== "all"
              ? ` di tipo "${EVIDENCE_TEMPLATES.find(t => t.key === filterType)?.label}"`
              : ""}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(record => {
              const tmpl = EVIDENCE_TEMPLATES.find(t => t.key === record.type)!;
              const isExpanded = expandedId === record.id;
              const title = getRecordTitle(record);
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
                >
                  {/* Card header */}
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tmpl.color }} />
                    <span
                      className="text-[10px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
                      style={{ background: tmpl.color + "18", color: tmpl.color }}
                    >
                      {tmpl.label.split(" — ")[0]}
                    </span>
                    <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "#0D1016" }}>
                      {title || "—"}
                    </span>
                    <span className="text-[11px] flex-shrink-0 hidden sm:block" style={{ color: "rgba(0,0,0,0.35)" }}>
                      {record.author} · {formatDate(record.timestamp)}
                    </span>
                    <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "rgba(0,0,0,0.25)" }}>
                      {record.hash.slice(0, 8)}…
                    </span>
                    {isExpanded
                      ? <ChevronUp  className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />
                      : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />}
                  </button>

                  {/* Card expanded */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: "hidden", borderTop: "1px solid rgba(0,0,0,0.05)" }}
                      >
                        <div className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {tmpl.fields.map(f => {
                              const val = (record.content as Record<string, string>)[f.key];
                              if (!val) return null;
                              return (
                                <div key={f.key}>
                                  <div
                                    className="text-[10px] font-semibold uppercase mb-0.5"
                                    style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "0.5px" }}
                                  >
                                    {f.label}
                                  </div>
                                  <div className="text-[12px]" style={{ color: "#0D1016" }}>{val}</div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Chain metadata */}
                          <div
                            className="rounded-lg p-3 space-y-1"
                            style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: "#16a34a" }} />
                              <span className="text-[10px] font-semibold" style={{ color: "#16a34a" }}>Verificato ✓</span>
                              <span className="text-[10px] font-mono ml-auto" style={{ color: "rgba(0,0,0,0.3)" }}>
                                v{record.version}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono break-all" style={{ color: "rgba(0,0,0,0.4)" }}>
                              hash: {record.hash}
                            </div>
                            <div className="text-[10px] font-mono break-all" style={{ color: "rgba(0,0,0,0.3)" }}>
                              prev: {record.previousHash}
                            </div>
                            <div className="text-[10px] font-mono" style={{ color: "rgba(0,0,0,0.25)" }}>
                              sig: {record.signature}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Slide-in panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setPanelOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
              style={{ width: "480px", background: "#ffffff", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)" }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
              >
                {step === 2 && selectedType ? (
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: "rgba(0,0,0,0.5)" }}
                  >
                    ← {EVIDENCE_TEMPLATES.find(t => t.key === selectedType)?.label}
                  </button>
                ) : (
                  <span className="text-[14px] font-semibold" style={{ color: "#0D1016" }}>Nuovo record</span>
                )}
                <button onClick={() => setPanelOpen(false)}>
                  <X className="h-4 w-4" style={{ color: "rgba(0,0,0,0.4)" }} />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-5">

                {/* Step 1 — type picker */}
                {step === 1 && (
                  <div>
                    <p className="text-[12px] mb-4" style={{ color: "rgba(0,0,0,0.42)" }}>
                      Scegli il tipo di record da aggiungere:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {EVIDENCE_TEMPLATES.map(tmpl => (
                        <button
                          key={tmpl.key}
                          onClick={() => { setSelectedType(tmpl.key); setStep(2); setFormValues({}); setFormErrors({}); }}
                          className="text-left rounded-xl p-3 transition-all hover:shadow-sm"
                          style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.08)" }}
                        >
                          <div
                            className="w-6 h-6 rounded-md mb-2 flex items-center justify-center"
                            style={{ background: tmpl.color + "18" }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ background: tmpl.color }} />
                          </div>
                          <div className="text-[12px] font-semibold mb-0.5" style={{ color: "#0D1016" }}>
                            {tmpl.label.split(" — ")[0]}
                          </div>
                          <div className="text-[10px] mb-1.5" style={{ color: "rgba(0,0,0,0.45)" }}>
                            {tmpl.description}
                          </div>
                          <span
                            className="text-[9px] font-semibold rounded px-1.5 py-0.5"
                            style={{ background: tmpl.color + "15", color: tmpl.color }}
                          >
                            {tmpl.article}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2 — form fields */}
                {step === 2 && selectedType && (() => {
                  const tmpl = EVIDENCE_TEMPLATES.find(t => t.key === selectedType)!;
                  return (
                    <div className="space-y-4">
                      <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.4)" }}>{tmpl.description}</p>
                      {tmpl.fields.map(f => (
                        <div key={f.key}>
                          <label
                            className="block text-[11px] font-semibold mb-1"
                            style={{ color: formErrors[f.key] ? "#dc2626" : "rgba(0,0,0,0.55)" }}
                          >
                            {f.label}
                            {f.required && <span style={{ color: "#dc2626" }}> *</span>}
                          </label>
                          {f.type === "select" ? (
                            <select
                              value={formValues[f.key] || ""}
                              onChange={e => {
                                setFormValues(v => ({ ...v, [f.key]: e.target.value }));
                                setFormErrors(v => ({ ...v, [f.key]: false }));
                              }}
                              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                              style={{
                                background: "#fafaf9",
                                border: `1px solid ${formErrors[f.key] ? "#dc2626" : "rgba(0,0,0,0.1)"}`,
                                color: "#0D1016",
                              }}
                            >
                              <option value="">Seleziona…</option>
                              {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === "textarea" ? (
                            <textarea
                              value={formValues[f.key] || ""}
                              onChange={e => {
                                setFormValues(v => ({ ...v, [f.key]: e.target.value }));
                                setFormErrors(v => ({ ...v, [f.key]: false }));
                              }}
                              placeholder={f.placeholder}
                              rows={3}
                              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                              style={{
                                background: "#fafaf9",
                                border: `1px solid ${formErrors[f.key] ? "#dc2626" : "rgba(0,0,0,0.1)"}`,
                                color: "#0D1016",
                              }}
                            />
                          ) : (
                            <input
                              value={formValues[f.key] || ""}
                              onChange={e => {
                                setFormValues(v => ({ ...v, [f.key]: e.target.value }));
                                setFormErrors(v => ({ ...v, [f.key]: false }));
                              }}
                              placeholder={f.placeholder}
                              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                              style={{
                                background: "#fafaf9",
                                border: `1px solid ${formErrors[f.key] ? "#dc2626" : "rgba(0,0,0,0.1)"}`,
                                color: "#0D1016",
                              }}
                            />
                          )}
                          {formErrors[f.key] && (
                            <p className="text-[10px] mt-0.5" style={{ color: "#dc2626" }}>Campo obbligatorio</p>
                          )}
                        </div>
                      ))}

                      {/* Author */}
                      <div>
                        <label
                          className="block text-[11px] font-semibold mb-1"
                          style={{ color: authorError ? "#dc2626" : "rgba(0,0,0,0.55)" }}
                        >
                          Autore <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          value={author}
                          onChange={e => { setAuthor(e.target.value); setAuthorError(false); }}
                          placeholder="Il tuo nome o email aziendale"
                          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                          style={{
                            background: "#fafaf9",
                            border: `1px solid ${authorError ? "#dc2626" : "rgba(0,0,0,0.1)"}`,
                            color: "#0D1016",
                          }}
                        />
                        {authorError && (
                          <p className="text-[10px] mt-0.5" style={{ color: "#dc2626" }}>Campo obbligatorio</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Panel footer */}
              {step === 2 && (
                <div className="px-5 py-4 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                    style={{ background: saving ? "rgba(13,16,22,0.5)" : "#0D1016", color: "#ffffff" }}
                  >
                    {saving ? "Salvataggio…" : "Salva su Evidence Layer"}
                  </button>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="w-full py-2 text-[12px]"
                    style={{ color: "rgba(0,0,0,0.4)" }}
                  >
                    Annulla
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: "#0D1016", color: "#ffffff", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
          >
            <CheckCircle className="h-4 w-4" style={{ color: "#86efac" }} />
            <span className="text-[12px] font-medium">Record salvato ✓</span>
            <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
              Hash: {toast.hash}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
