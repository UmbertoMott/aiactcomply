"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu, Plus, X, CheckCircle, AlertTriangle, FileText,
  Copy, Download, ChevronDown, ChevronUp,
  Activity, ExternalLink, Info,
} from "lucide-react";
import {
  GPAI_CATALOG, GPAIUsageEntry, GPAIRole, GPAIModel,
  USE_CASE_SUGGESTIONS, ROLE_DESCRIPTIONS,
  loadGPAIInventory, saveGPAIInventory,
  loadCompletedObligations, saveCompletedObligations,
  getApplicableObligations, getComplianceScore,
  generateTransparencyNotice, generateCopyrightPolicy, generateIncidentReport,
} from "@/lib/gpai/gpai-engine";
import {
  simulateRedTeamAttack, DRIFT_THRESHOLDS, checkDrift,
  RedTeamAttack, DriftReport,
} from "@/lib/simulation/red-team";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "12px",
};

const ATTACKS_KEY = "gpai_attacks";
const DRIFT_KEY = "gpai_drift_values";
const COMPANY_KEY = "gpai_company_name";

export default function GPAIPage() {
  const [inventory, setInventory] = useState<GPAIUsageEntry[]>([]);
  const [completedObligations, setCompletedObligations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"inventory" | "obligations" | "documents" | "systemic">("inventory");
  const [showAddModel, setShowAddModel] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    role: GPAIRole;
    useCases: string[];
    integratedInSystem: string;
    exposedToEndUsers: boolean;
    endUserCount: string;
    isFineTuned: boolean;
    fineTuningDataset: string;
  }>({
    role: "deployer",
    useCases: [],
    integratedInSystem: "",
    exposedToEndUsers: false,
    endUserCount: "",
    isFineTuned: false,
    fineTuningDataset: "",
  });
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<{ type: string; content: string } | null>(null);
  const [attacks, setAttacks] = useState<RedTeamAttack[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(ATTACKS_KEY) ?? "[]") as RedTeamAttack[]; }
    catch { return []; }
  });
  const [driftValues, setDriftValues] = useState<{ accuracy: number; precision: number; recall: number; f1: number }>(() => {
    if (typeof window === "undefined") return { accuracy: 94.2, precision: 86.1, recall: 91.3, f1: 88.7 };
    try {
      const stored = JSON.parse(localStorage.getItem(DRIFT_KEY) ?? "null");
      return stored ?? { accuracy: 94.2, precision: 86.1, recall: 91.3, f1: 88.7 };
    } catch { return { accuracy: 94.2, precision: 86.1, recall: 91.3, f1: 88.7 }; }
  });
  const [incidentForm, setIncidentForm] = useState({ description: "", severity: "alta" as "critica" | "alta" | "media", systemName: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gpai_saved_at") ?? null;
  });
  const [companyName, setCompanyNameState] = useState<string>(() => {
    if (typeof window === "undefined") return "La tua azienda";
    return localStorage.getItem(COMPANY_KEY) ?? "La tua azienda";
  });

  function setCompanyName(v: string) {
    setCompanyNameState(v);
    if (typeof window !== "undefined") localStorage.setItem(COMPANY_KEY, v);
  }

  useEffect(() => {
    setInventory(loadGPAIInventory());
    setCompletedObligations(loadCompletedObligations());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function resetAddForm() {
    setSelectedCatalogId(null);
    setAddStep(1);
    setForm({ role: "deployer", useCases: [], integratedInSystem: "", exposedToEndUsers: false, endUserCount: "", isFineTuned: false, fineTuningDataset: "" });
  }

  function handleAddEntry() {
    if (!selectedCatalogId) return;
    const catalogModel = GPAI_CATALOG.find((m) => m.id === selectedCatalogId)!;
    const entry: GPAIUsageEntry = {
      id: `gpai-${Date.now()}`,
      modelId: selectedCatalogId,
      customModelName: selectedCatalogId === "custom" ? form.integratedInSystem : undefined,
      role: form.role,
      useCases: form.useCases,
      integratedInSystem: form.integratedInSystem,
      exposedToEndUsers: form.exposedToEndUsers,
      endUserCount: form.endUserCount,
      isFineTuned: form.isFineTuned,
      fineTuningDataset: form.fineTuningDataset || undefined,
      addedAt: new Date().toISOString(),
    };
    const updated = [...inventory, entry];
    setInventory(updated);
    saveGPAIInventory(updated);
    setShowAddModel(false);
    resetAddForm();
    showToast(`${catalogModel.name} aggiunto all'inventario`);
  }

  function toggleObligation(id: string) {
    const updated = completedObligations.includes(id)
      ? completedObligations.filter((x) => x !== id)
      : [...completedObligations, id];
    setCompletedObligations(updated);
    saveCompletedObligations(updated);
  }

  function handleSimulateAttack() {
    const attack = simulateRedTeamAttack();
    const updated = [attack, ...attacks].slice(0, 20);
    setAttacks(updated);
    if (typeof window !== "undefined") localStorage.setItem(ATTACKS_KEY, JSON.stringify(updated));
    if (attack.result === "breach") {
      appendEvidence(
        "incident",
        {
          type: "Red-Teaming GPAI — Vulnerabilità rilevata",
          attackId: attack.id,
          attackType: attack.type,
          target: attack.target,
          details: attack.details,
          defenseScore: attack.defenseScore,
          detectedAt: attack.timestamp,
        },
        "gpai"
      );
      showToast(`⚠️ Vulnerabilità rilevata — breach registrato nell'evidence`);
    } else {
      showToast(`✅ ${attack.type.replace(/_/g, " ")} — ${attack.result}`);
    }
  }

  function handleSaveToDossier() {
    if (inventory.length === 0) {
      showToast("Aggiungi almeno un modello GPAI prima di salvare");
      return;
    }
    const obligations = getApplicableObligations(inventory);
    const completedAt = new Date().toISOString();
    const hasSystemicRisk = inventory.some((e) => {
      const m = GPAI_CATALOG.find((c) => c.id === e.modelId);
      return m?.systemicRisk === "systemic";
    });
    writeToStorage("gpai", {
      modelsCount: inventory.length,
      hasSystemicRisk,
      roles: [...new Set(inventory.map((e) => e.role))],
      obligationsCompleted: completedObligations.length,
      obligationsTotal: obligations.length,
      completedAt,
    });
    appendEvidence(
      "adr",
      {
        type: "GPAI Module — Inventario Modelli Art. 51-55",
        companyName,
        modelsCount: inventory.length,
        hasSystemicRisk,
        models: inventory.map((e) => ({
          model: GPAI_CATALOG.find((c) => c.id === e.modelId)?.name ?? e.modelId,
          role: e.role,
          useCases: e.useCases,
          isFineTuned: e.isFineTuned,
          exposedToEndUsers: e.exposedToEndUsers,
        })),
        obligationsCompleted: completedObligations.length,
        obligationsTotal: obligations.length,
        complianceScore: score,
        savedAt: completedAt,
      },
      "gpai"
    );
    setSavedAt(completedAt);
    if (typeof window !== "undefined") localStorage.setItem("gpai_saved_at", completedAt);
    showToast("GPAI Module salvato nel Dossier di compliance");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast("Copiato negli appunti"));
  }

  function downloadTxt(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const obligations = getApplicableObligations(inventory);
  const score = getComplianceScore(obligations, completedObligations);
  const hasSystemic = inventory.some((e) => {
    const m = GPAI_CATALOG.find((c) => c.id === e.modelId);
    return m?.systemicRisk === "systemic";
  });

  function renderSystemicBadge(risk: string) {
    if (risk === "systemic") return (
      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: "rgba(234,88,12,0.1)", color: "#c2410c" }}>⚠️ Rischio sistemico</span>
    );
    if (risk === "standard") return (
      <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: "#f5f5f4", color: "rgba(0,0,0,0.4)" }}>Standard</span>
    );
    return (
      <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: "#f5f5f4", color: "rgba(0,0,0,0.4)" }}>Sconosciuto</span>
    );
  }

  function renderInventoryTab() {
    return (
      <div>
        {/* Add model button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { setShowAddModel(true); setAddStep(1); }}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
            style={{ background: "#0D1016", color: "#ffffff" }}
          >
            <Plus size={14} /> Aggiungi modello GPAI
          </button>
        </div>

        {/* Empty state */}
        {inventory.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: "#fafaf9", border: "1px dashed rgba(0,0,0,0.12)" }}>
            <Cpu size={32} className="mx-auto mb-3" style={{ color: "rgba(0,0,0,0.2)" }} />
            <p className="text-[13px] font-medium mb-1" style={{ color: "#0D1016" }}>Nessun modello GPAI inventariato</p>
            <p className="text-[12px] mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>Qualsiasi uso di OpenAI, Anthropic, Google AI rientra in questa categoria.</p>
            <button
              onClick={() => { setShowAddModel(true); setAddStep(1); }}
              className="text-[12px] font-medium"
              style={{ color: "#3b82f6" }}
            >
              Aggiungi il tuo primo modello →
            </button>
          </div>
        )}

        {/* Inventory list */}
        <div className="space-y-3">
          {inventory.map((entry) => {
            const model = GPAI_CATALOG.find((m) => m.id === entry.modelId);
            const isExpanded = expandedEntry === entry.id;
            const entryObligations = getApplicableObligations([entry]);
            return (
              <div key={entry.id} className="rounded-xl overflow-hidden" style={card}>
                <button
                  className="w-full text-left px-5 py-4"
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>{model?.name ?? entry.modelId}</span>
                        <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.4)" }}>({model?.provider ?? "custom"})</span>
                        {model && renderSystemicBadge(model.systemicRisk)}
                        {model?.euBasedProvider && (
                          <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}>🇪🇺 Provider EU</span>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>
                        Ruolo: {entry.role.replace("_", " ")} · {entry.useCases.join(", ") || "nessun caso d'uso"}
                      </p>
                      {entry.integratedInSystem && (
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
                          Sistema: {entry.integratedInSystem} · {entry.exposedToEndUsers ? `${entry.endUserCount || "N/A"} utenti` : "non esposto a utenti"}{entry.isFineTuned ? " · Fine-tuned" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>{entryObligations.length} obblighi</span>
                      {isExpanded ? <ChevronUp size={14} style={{ color: "rgba(0,0,0,0.3)" }} /> : <ChevronDown size={14} style={{ color: "rgba(0,0,0,0.3)" }} />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    {model?.notes && (
                      <div className="rounded-lg p-3 mt-3 mb-3" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)" }}>
                        <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}><Info size={11} className="inline mr-1" />{model.notes}</p>
                      </div>
                    )}
                    <p className="text-[11px] font-semibold uppercase mb-2 mt-2" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "0.6px" }}>Obblighi applicabili</p>
                    <div className="space-y-1 mb-3">
                      {entryObligations.map((ob) => (
                        <div key={ob.id} className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>
                          <span className="text-[10px] font-medium" style={{ color: "#3b82f6" }}>{ob.article}</span>
                          {ob.title}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab("obligations")}
                        className="text-[11px]"
                        style={{ color: "#3b82f6" }}
                      >
                        Vedi tutti gli obblighi →
                      </button>
                      <span style={{ color: "rgba(0,0,0,0.2)" }}>·</span>
                      <button
                        onClick={() => {
                          const updated = inventory.filter((e) => e.id !== entry.id);
                          setInventory(updated);
                          saveGPAIInventory(updated);
                          setExpandedEntry(null);
                        }}
                        className="text-[11px]"
                        style={{ color: "#dc2626" }}
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add model panel — right drawer */}
        {showAddModel && (
          <>
            <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => { setShowAddModel(false); resetAddForm(); }} />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 overflow-y-auto" style={{ background: "#ffffff", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <h3 className="text-[15px] font-semibold" style={{ color: "#0D1016" }}>
                  {addStep === 1 ? "Seleziona modello GPAI" : "Dettagli utilizzo"}
                </h3>
                <button onClick={() => { setShowAddModel(false); resetAddForm(); }} style={{ color: "rgba(0,0,0,0.4)" }}><X size={18} /></button>
              </div>

              <div className="p-6">
                {addStep === 1 && (
                  <div>
                    <p className="text-[12px] mb-4" style={{ color: "rgba(0,0,0,0.5)" }}>Seleziona il modello GPAI che usi nei tuoi prodotti.</p>
                    <div className="grid grid-cols-1 gap-2">
                      {GPAI_CATALOG.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedCatalogId(m.id)}
                          className="text-left rounded-xl p-3 transition-all"
                          style={{
                            background: selectedCatalogId === m.id ? "rgba(59,130,246,0.06)" : "#fafaf9",
                            border: selectedCatalogId === m.id ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(0,0,0,0.07)",
                          }}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{m.name}</span>
                            <div className="flex items-center gap-1.5">
                              {m.euBasedProvider && <span className="text-[9px] rounded px-1.5 py-0.5" style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}>🇪🇺</span>}
                              {renderSystemicBadge(m.systemicRisk)}
                            </div>
                          </div>
                          <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                            {m.provider.toUpperCase()} · FLOPs: {m.estimatedFLOPs}
                            {m.knownCapabilities.length > 0 && ` · ${m.knownCapabilities.slice(0, 3).join(", ")}`}
                          </p>
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={!selectedCatalogId}
                      onClick={() => setAddStep(2)}
                      className="mt-4 w-full rounded-lg px-4 py-2.5 text-[13px] font-medium"
                      style={{ background: selectedCatalogId ? "#0D1016" : "#f5f5f4", color: selectedCatalogId ? "#ffffff" : "rgba(0,0,0,0.3)" }}
                    >
                      Continua →
                    </button>
                  </div>
                )}

                {addStep === 2 && selectedCatalogId && (() => {
                  const model = GPAI_CATALOG.find((m) => m.id === selectedCatalogId)!;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                        <span className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>{model.name}</span>
                        {renderSystemicBadge(model.systemicRisk)}
                      </div>

                      {/* Role selector */}
                      <div className="mb-4">
                        <label className="block text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>Qual è il tuo ruolo? *</label>
                        <select
                          value={form.role}
                          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as GPAIRole }))}
                          className="w-full rounded-lg px-3 py-2 text-[13px]"
                          style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                        >
                          <option value="deployer">Deployer — uso il modello via API in un mio prodotto</option>
                          <option value="downstream_provider">Downstream provider — integro il GPAI in un sistema AI</option>
                          <option value="fine_tuner">Fine-tuner — ho modificato / addestrato il modello</option>
                          <option value="provider">Provider — sviluppo e distribuisco il modello stesso</option>
                        </select>
                        <div className="rounded-lg p-3 mt-2" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)" }}>
                          <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>{ROLE_DESCRIPTIONS[form.role]}</p>
                        </div>
                      </div>

                      {/* Use cases */}
                      <div className="mb-4">
                        <label className="block text-[12px] font-medium mb-2" style={{ color: "#0D1016" }}>Casi d&apos;uso nel tuo prodotto</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {USE_CASE_SUGGESTIONS.map((uc) => {
                            const selected = form.useCases.includes(uc);
                            return (
                              <button
                                key={uc}
                                onClick={() => setForm((f) => ({
                                  ...f,
                                  useCases: selected ? f.useCases.filter((u) => u !== uc) : [...f.useCases, uc],
                                }))}
                                className="rounded-full px-2.5 py-1 text-[11px] transition-all"
                                style={{
                                  background: selected ? "rgba(59,130,246,0.1)" : "#f5f5f4",
                                  color: selected ? "#3b82f6" : "rgba(0,0,0,0.5)",
                                  border: selected ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent",
                                  fontWeight: selected ? 500 : 400,
                                }}
                              >
                                {uc}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Integrated system */}
                      <div className="mb-4">
                        <label className="block text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>In quale sistema AI è integrato?</label>
                        <input
                          value={form.integratedInSystem}
                          onChange={(e) => setForm((f) => ({ ...f, integratedInSystem: e.target.value }))}
                          placeholder="Es. Customer Support Bot, Document Analyzer..."
                          className="w-full rounded-lg px-3 py-2 text-[13px]"
                          style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                        />
                      </div>

                      {/* Exposed to users */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] font-medium" style={{ color: "#0D1016" }}>Esposto direttamente agli utenti finali?</label>
                          <button
                            onClick={() => setForm((f) => ({ ...f, exposedToEndUsers: !f.exposedToEndUsers }))}
                            className="w-10 h-5 rounded-full relative transition-colors"
                            style={{ background: form.exposedToEndUsers ? "#3b82f6" : "rgba(0,0,0,0.15)" }}
                          >
                            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.exposedToEndUsers ? "22px" : "2px" }} />
                          </button>
                        </div>
                        {form.exposedToEndUsers && (
                          <input
                            value={form.endUserCount}
                            onChange={(e) => setForm((f) => ({ ...f, endUserCount: e.target.value }))}
                            placeholder="Numero stimato utenti finali (es. 1000-5000)"
                            className="w-full rounded-lg px-3 py-2 text-[13px] mt-2"
                            style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                          />
                        )}
                      </div>

                      {/* Fine-tuned */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between">
                          <label className="text-[12px] font-medium" style={{ color: "#0D1016" }}>Hai eseguito fine-tuning sul modello?</label>
                          <button
                            onClick={() => setForm((f) => ({ ...f, isFineTuned: !f.isFineTuned }))}
                            className="w-10 h-5 rounded-full relative transition-colors"
                            style={{ background: form.isFineTuned ? "#3b82f6" : "rgba(0,0,0,0.15)" }}
                          >
                            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.isFineTuned ? "22px" : "2px" }} />
                          </button>
                        </div>
                        {form.isFineTuned && (
                          <input
                            value={form.fineTuningDataset}
                            onChange={(e) => setForm((f) => ({ ...f, fineTuningDataset: e.target.value }))}
                            placeholder="Dataset usato per il fine-tuning"
                            className="w-full rounded-lg px-3 py-2 text-[13px] mt-2"
                            style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setAddStep(1)} className="rounded-lg px-4 py-2 text-[12px]" style={{ background: "#f5f5f4", color: "#0D1016" }}>← Indietro</button>
                        <button onClick={handleAddEntry} className="flex-1 rounded-lg px-4 py-2 text-[12px] font-medium" style={{ background: "#0D1016", color: "#ffffff" }}>Aggiungi all&apos;inventario</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderObligationsTab() {
    if (inventory.length === 0) {
      return (
        <div className="rounded-xl p-8 text-center" style={{ background: "#fafaf9", border: "1px dashed rgba(0,0,0,0.12)" }}>
          <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.5)" }}>Aggiungi modelli GPAI nell&apos;Inventario per vedere i tuoi obblighi.</p>
        </div>
      );
    }

    return (
      <div>
        {/* Progress bar */}
        <div className="rounded-xl p-4 mb-5" style={card}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>Compliance GPAI</span>
            <span className="text-[16px] font-semibold" style={{ color: score >= 80 ? "#15803d" : score >= 40 ? "#d97706" : "#dc2626" }}>{score}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, background: score >= 80 ? "#15803d" : score >= 40 ? "#d97706" : "#dc2626" }} />
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: "rgba(0,0,0,0.4)" }}>
            {completedObligations.filter((id) => obligations.some((o) => o.id === id)).length} di {obligations.length} obblighi completati
          </p>
        </div>

        <div className="space-y-3">
          {obligations.map((ob) => {
            const done = completedObligations.includes(ob.id);
            return (
              <div
                key={ob.id}
                className="rounded-xl p-4"
                style={{
                  ...card,
                  background: done ? "rgba(22,163,74,0.03)" : "#ffffff",
                  borderColor: done ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)",
                }}
              >
                {ob.applicableToSystemicOnly && (
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] font-medium rounded-lg px-2 py-1 w-fit" style={{ background: "rgba(234,88,12,0.07)", color: "#c2410c" }}>
                    <AlertTriangle size={10} />
                    Applicabile perché usi modelli a rischio sistemico
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleObligation(ob.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors"
                    style={{ borderColor: done ? "#15803d" : "rgba(0,0,0,0.2)", background: done ? "#15803d" : "transparent" }}
                  >
                    {done && <CheckCircle size={12} style={{ color: "#ffffff" }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-[10px] font-semibold" style={{ color: "#3b82f6" }}>{ob.article}</span>
                        <span className="text-[13px] font-medium ml-2" style={{ color: done ? "rgba(0,0,0,0.4)" : "#0D1016", textDecoration: done ? "line-through" : "none" }}>{ob.title}</span>
                      </div>
                      <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(0,0,0,0.35)" }}>⏱ {ob.deadline}</span>
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: "rgba(0,0,0,0.55)", lineHeight: "1.5" }}>{ob.description}</p>
                    <div className="rounded-lg p-2.5" style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.06)" }}>
                      <p className="text-[11px] font-medium mb-0.5" style={{ color: "#0D1016" }}>Azione richiesta:</p>
                      <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>{ob.actionRequired}</p>
                      {ob.documentNeeded && (
                        <p className="text-[11px] mt-1" style={{ color: "rgba(0,0,0,0.4)" }}>📄 Documento: {ob.documentNeeded}</p>
                      )}
                    </div>
                    {!done && (
                      <button onClick={() => toggleObligation(ob.id)} className="mt-2 text-[11px] font-medium" style={{ color: "#15803d" }}>
                        Segna come completato ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDocumentsTab() {
    const transparencyEntries = inventory.filter((e) => e.exposedToEndUsers);
    const copyrightEntries = inventory.filter((e) => e.isFineTuned || e.role === "provider" || e.role === "fine_tuner");

    const genericTemplates = [
      { label: "Checklist obblighi Art. 52 per downstream provider", content: `CHECKLIST OBBLIGHI ART. 52 — DOWNSTREAM PROVIDER GPAI\n\n[ ] Verifica che il provider del modello abbia pubblicato la documentazione tecnica (Allegato XI)\n[ ] Verifica la disponibilità di un sommario pubblico dei dati di training\n[ ] Controlla la copyright policy del provider\n[ ] Configura informativa Art. 50 per gli utenti finali\n[ ] Implementa meccanismo di supervisione umana Art. 14\n[ ] Documenta l'uso del modello nel registro interno\n\nGenerato da AIComply` },
      { label: "Template registro utilizzo GPAI interno", content: `REGISTRO UTILIZZO MODELLI GPAI\nVersione 1.0 | Aggiornato: ${new Date().toLocaleDateString("it-IT")}\n\n| Modello | Provider | Versione | Sistema | Ruolo | Data integrazione | Responsabile |\n|---------|----------|----------|---------|-------|-------------------|-------------|\n| [GPT-4o] | [OpenAI] | [gpt-4o] | [Sistema X] | [Deployer] | [data] | [nome] |\n\nNote:\n- Aggiornare ad ogni modifica di modello o sistema\n- Conservare per almeno 10 anni ai sensi Art. 18 AI Act\n\nGenerato da AIComply` },
      { label: "Schema valutazione rischio sistemico GPAI", content: `SCHEMA VALUTAZIONE RISCHIO SISTEMICO GPAI\nArt. 51 Reg. UE 2024/1689\n\n1. IDENTIFICAZIONE\nNome modello: ________________\nProvider: ________________\nFLOPs stimati: ________________\n\n2. CRITERI RISCHIO SISTEMICO (Art. 51)\n[ ] FLOPs training > 10^25\n[ ] Designazione CE come modello a rischio sistemico\n[ ] Capacità sistemiche ad alto impatto identificate\n\n3. VALUTAZIONE CAPACITÀ\n[ ] Generazione contenuti manipolativi su larga scala\n[ ] Influenza su infrastrutture critiche\n[ ] Impatto su processi democratici\n[ ] Capacità cyberoffensive\n\n4. MISURE ART. 54 (se rischio sistemico)\n[ ] Red-teaming documentato\n[ ] Incident reporting procedure implementata\n[ ] Cybersecurity assessment completato\n[ ] Registrazione EU AI Database\n\nGenerato da AIComply` },
    ];

    return (
      <div>
        {transparencyEntries.length === 0 && copyrightEntries.length === 0 && inventory.length > 0 && (
          <div className="rounded-xl p-4 mb-4 flex gap-2" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)" }}>
            <Info size={14} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
            <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.6)" }}>Aggiungi modelli esposti a utenti finali o con fine-tuning nell&apos;inventario per generare documenti personalizzati.</p>
          </div>
        )}

        {inventory.length === 0 && (
          <div className="rounded-xl p-8 text-center mb-6" style={{ background: "#fafaf9", border: "1px dashed rgba(0,0,0,0.12)" }}>
            <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.5)" }}>Aggiungi modelli nell&apos;inventario per generare documenti personalizzati.</p>
          </div>
        )}

        {transparencyEntries.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "0.8px" }}>Informative trasparenza utenti</p>
            <div className="space-y-2">
              {transparencyEntries.map((entry) => {
                const model = GPAI_CATALOG.find((m) => m.id === entry.modelId)!;
                return (
                  <div key={entry.id} className="rounded-xl p-4 flex items-center gap-3" style={card}>
                    <div className="rounded-lg p-2 flex-shrink-0" style={{ background: "rgba(59,130,246,0.08)" }}>
                      <FileText size={16} style={{ color: "#3b82f6" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>Informativa Trasparenza AI</p>
                      <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>{model?.name ?? entry.modelId} · {entry.integratedInSystem || "sistema non specificato"}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.3)" }}>Art. 50.2 — obbligatoria per utenti finali</p>
                    </div>
                    <button
                      onClick={() => setGeneratedDoc({ type: "Informativa Trasparenza AI", content: generateTransparencyNotice(entry, model, companyName) })}
                      className="flex-shrink-0 text-[11px] font-medium rounded-lg px-3 py-1.5"
                      style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}
                    >
                      Genera →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {copyrightEntries.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "0.8px" }}>Policy copyright training</p>
            <div className="space-y-2">
              {copyrightEntries.map((entry) => {
                const model = GPAI_CATALOG.find((m) => m.id === entry.modelId)!;
                return (
                  <div key={entry.id} className="rounded-xl p-4 flex items-center gap-3" style={card}>
                    <div className="rounded-lg p-2 flex-shrink-0" style={{ background: "rgba(217,119,6,0.08)" }}>
                      <FileText size={16} style={{ color: "#d97706" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>Copyright Policy Training Data</p>
                      <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>{model?.name ?? entry.modelId}{entry.isFineTuned ? " · fine-tuned" : ""}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.3)" }}>Art. 52.1.c — obbligatoria per fine-tuner</p>
                    </div>
                    <button
                      onClick={() => setGeneratedDoc({ type: "Copyright Policy Training Data", content: generateCopyrightPolicy(entry, model, companyName) })}
                      className="flex-shrink-0 text-[11px] font-medium rounded-lg px-3 py-1.5"
                      style={{ background: "rgba(217,119,6,0.08)", color: "#d97706" }}
                    >
                      Genera →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Generic templates */}
        <div>
          <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "0.8px" }}>Template generici</p>
          <div className="space-y-2">
            {genericTemplates.map((t) => (
              <div key={t.label} className="rounded-xl p-4 flex items-center gap-3" style={card}>
                <div className="rounded-lg p-2 flex-shrink-0" style={{ background: "#f5f5f4" }}>
                  <FileText size={16} style={{ color: "rgba(0,0,0,0.4)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{t.label}</p>
                </div>
                <button
                  onClick={() => setGeneratedDoc({ type: t.label, content: t.content })}
                  className="flex-shrink-0 text-[11px] font-medium rounded-lg px-3 py-1.5"
                  style={{ background: "#f5f5f4", color: "rgba(0,0,0,0.6)" }}
                >
                  Genera →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSystemicTab() {
    if (!hasSystemic) {
      return (
        <div className="rounded-xl p-6" style={{ background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.12)" }}>
          <div className="flex items-start gap-3">
            <Info size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-[13px] font-medium mb-1" style={{ color: "#0D1016" }}>Nessun modello a rischio sistemico inventariato</p>
              <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                I modelli a rischio sistemico sono quelli con FLOPs &gt; 10^25 (es. GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro).
                Aggiungi uno di questi modelli nell&apos;inventario per sbloccare questa sezione.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const hasBreaches = attacks.some((a) => a.result === "breach");

    return (
      <div className="space-y-6">
        {/* Red-teaming section */}
        <div className="rounded-xl p-5" style={card}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: "#0D1016" }}>Adversarial Testing — Red-Teaming</h3>
              <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>Art. 54.1.a — I provider di modelli a rischio sistemico devono condurre valutazioni avversariali.</p>
            </div>
            <span className="text-[10px] font-medium rounded-full px-2 py-1" style={{ background: "rgba(234,88,12,0.1)", color: "#c2410c" }}>Obbligatorio</span>
          </div>

          {hasBreaches && (
            <div className="rounded-lg p-3 mb-3 flex items-start gap-2" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[12px]" style={{ color: "#b91c1c" }}>⚠️ Vulnerabilità rilevate — documentare e mitigare prima del deploy in produzione.</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px]" style={{ color: "rgba(0,0,0,0.5)" }}>{attacks.length} attacchi simulati</span>
            <button
              onClick={handleSimulateAttack}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium"
              style={{ background: "#0D1016", color: "#ffffff" }}
            >
              <Activity size={13} /> Simula attacco
            </button>
          </div>

          {attacks.length > 0 && (
            <>
              <div className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: "#fafaf9", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>Tipo</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>Target</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>Risultato</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "rgba(0,0,0,0.5)" }}>Score difesa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attacks.map((atk) => (
                      <tr key={atk.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td className="px-3 py-2" style={{ color: "#0D1016" }}>{atk.type.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 max-w-[180px] truncate" style={{ color: "rgba(0,0,0,0.6)" }}>{atk.target}</td>
                        <td className="px-3 py-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              background: atk.result === "blocked" ? "rgba(22,163,74,0.1)" : atk.result === "detected" ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)",
                              color: atk.result === "blocked" ? "#15803d" : atk.result === "detected" ? "#d97706" : "#dc2626",
                            }}
                          >
                            {atk.result}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${atk.defenseScore}%`, background: atk.defenseScore > 70 ? "#15803d" : atk.defenseScore > 40 ? "#d97706" : "#dc2626" }} />
                            </div>
                            <span style={{ color: "rgba(0,0,0,0.5)" }}>{atk.defenseScore}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => {
                  const report = `REPORT RED-TEAMING GPAI\nArt. 54.1.a Reg. UE 2024/1689\nGenerato: ${new Date().toLocaleDateString("it-IT")}\n\nAttacchi simulati: ${attacks.length}\nVulnerabilità: ${attacks.filter((a) => a.result === "breach").length}\nRilevati: ${attacks.filter((a) => a.result === "detected").length}\nBloccati: ${attacks.filter((a) => a.result === "blocked").length}\n\nDETTAGLIO ATTACCHI\n${attacks.map((a) => `[${a.id}] ${a.type} — ${a.result.toUpperCase()} (score: ${a.defenseScore})\nTarget: ${a.target}\nDettagli: ${a.details}`).join("\n\n")}\n\nRACCOMANDAZIONI\n${attacks.filter((a) => a.result === "breach").length > 0 ? "• Vulnerabilità critiche rilevate — remediation urgente richiesta\n• Non deploiare in produzione senza mitigazioni\n" : "• Nessuna vulnerabilità critica rilevata in questa sessione\n"}• Ripetere il test periodicamente e prima di ogni rilascio\n• Documentare le misure correttive adottate\n\nGenerato da AIComply`;
                  setGeneratedDoc({ type: "Report Red-Teaming GPAI", content: report });
                }}
                className="text-[11px] font-medium"
                style={{ color: "#3b82f6" }}
              >
                Genera Report Red-Teaming →
              </button>
            </>
          )}
        </div>

        {/* Drift monitoring */}
        <div className="rounded-xl p-5" style={card}>
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: "#0D1016" }}>Drift Monitoring</h3>
          <p className="text-[11px] mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>Monitora le metriche del modello per rilevare degrado delle prestazioni.</p>
          <div className="space-y-4">
            {(Object.entries(DRIFT_THRESHOLDS) as [keyof typeof DRIFT_THRESHOLDS, { threshold: number; label: string }][]).map(([key, config]) => {
              const current = driftValues[key];
              const report: DriftReport = checkDrift(config.label, current / 100, config.threshold);
              const statusColor = report.status === "ok" ? "#15803d" : report.status === "warning" ? "#d97706" : "#dc2626";
              return (
                <div key={key} className="rounded-lg p-3" style={{ border: `1px solid ${report.status === "ok" ? "rgba(0,0,0,0.07)" : report.status === "warning" ? "rgba(217,119,6,0.3)" : "rgba(220,38,38,0.3)"}`, background: report.status === "ok" ? "#ffffff" : report.status === "warning" ? "rgba(217,119,6,0.03)" : "rgba(220,38,38,0.03)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium" style={{ color: "#0D1016" }}>{config.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: statusColor }}>{current.toFixed(1)}%</span>
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: `${statusColor}15`, color: statusColor }}>
                        {report.status === "ok" ? "✓ OK" : report.status === "warning" ? "⚠️ WARN" : "✕ CRITICAL"}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range" min="70" max="100" step="0.1"
                    value={current}
                    onChange={(e) => {
                      const updated = { ...driftValues, [key]: parseFloat(e.target.value) };
                      setDriftValues(updated);
                      if (typeof window !== "undefined") localStorage.setItem(DRIFT_KEY, JSON.stringify(updated));
                    }}
                    className="w-full accent-blue-500 h-1.5"
                  />
                  <p className="text-[10px] mt-1" style={{ color: "rgba(0,0,0,0.35)" }}>soglia: {(config.threshold * 100).toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident reporting */}
        <div className="rounded-xl p-5" style={card}>
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: "#0D1016" }}>Incident Reporting — Art. 54.1.c</h3>
          <p className="text-[11px] mb-4" style={{ color: "rgba(0,0,0,0.45)" }}>Genera la notifica formale per l&apos;AI Office UE in caso di incidente grave.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>Descrizione dell&apos;incidente</label>
              <textarea
                value={incidentForm.description}
                onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Descrivi l'incidente grave rilevato..."
                className="w-full rounded-lg px-3 py-2 text-[12px] resize-none"
                style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>Gravità</label>
                <select
                  value={incidentForm.severity}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, severity: e.target.value as "critica" | "alta" | "media" }))}
                  className="w-full rounded-lg px-3 py-2 text-[12px]"
                  style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                >
                  <option value="critica">Critica</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: "#0D1016" }}>Sistema coinvolto</label>
                <input
                  value={incidentForm.systemName}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, systemName: e.target.value }))}
                  placeholder="Es. Customer Support Bot"
                  className="w-full rounded-lg px-3 py-2 text-[12px]"
                  style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!incidentForm.description.trim()) {
                  showToast("Inserisci la descrizione dell'incidente prima di generare");
                  return;
                }
                const content = generateIncidentReport(incidentForm.description, incidentForm.severity, incidentForm.systemName, companyName);
                setGeneratedDoc({ type: "Notifica Incidente AI Office UE", content });
                appendEvidence(
                  "incident",
                  {
                    type: "Incident Report GPAI — Art. 54.1.c — Notifica AI Office UE",
                    severity: incidentForm.severity,
                    systemName: incidentForm.systemName || "non specificato",
                    description: incidentForm.description,
                    generatedAt: new Date().toISOString(),
                  },
                  "gpai"
                );
              }}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
              style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c", border: "1px solid rgba(220,38,38,0.15)" }}
            >
              <ExternalLink size={13} /> Genera notifica per AI Office UE
            </button>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "inventory", label: "Inventario GPAI" },
    { id: "obligations", label: `Obblighi${obligations.length > 0 ? ` (${obligations.length})` : ""}` },
    { id: "documents", label: "Documenti" },
    { id: "systemic", label: "Systemic Risk" },
  ] as const;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl px-4 py-2.5 text-[12px] font-medium shadow-lg" style={{ background: "#0D1016", color: "#ffffff" }}>
          {toast}
        </div>
      )}

      {/* Document modal — rendered globally so it's visible from any tab */}
      {generatedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" style={{ background: "#ffffff" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <h3 className="text-[14px] font-semibold" style={{ color: "#0D1016" }}>{generatedDoc.type}</h3>
              <button onClick={() => setGeneratedDoc(null)} style={{ color: "rgba(0,0,0,0.4)" }}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={generatedDoc.content}
                onChange={(e) => setGeneratedDoc((d) => d ? { ...d, content: e.target.value } : null)}
                className="w-full h-96 rounded-lg p-3 text-[12px] resize-none"
                style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016", fontFamily: "monospace", lineHeight: "1.6" }}
              />
            </div>
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              <button onClick={() => copyToClipboard(generatedDoc.content)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]" style={{ background: "#f5f5f4", color: "#0D1016" }}>
                <Copy size={13} /> Copia testo
              </button>
              <button onClick={() => downloadTxt(generatedDoc.content, `${generatedDoc.type.replace(/\s+/g, "-")}.txt`)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]" style={{ background: "#f5f5f4", color: "#0D1016" }}>
                <Download size={13} /> Scarica .txt
              </button>
              <button onClick={() => { handleSaveToDossier(); setGeneratedDoc(null); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium ml-auto" style={{ background: "#0D1016", color: "#ffffff" }}>
                Salva nel Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={14} style={{ color: "#3b82f6" }} />
            <span className="text-[11px] font-medium rounded px-2 py-0.5" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>Art. 51-55</span>
            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}>In vigore: 2 ago 2025</span>
          </div>
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-[24px] font-semibold" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>GPAI — General Purpose AI</h1>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome azienda per i documenti…"
              className="rounded-lg px-3 py-1.5 text-[12px] focus:outline-none mt-1 flex-shrink-0"
              style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "#0D1016", width: "220px" }}
            />
          </div>
          <p className="text-[12px] mb-3" style={{ color: "rgba(0,0,0,0.45)" }}>
            Se usi OpenAI, Anthropic, Google o altri modelli fondazionali nei tuoi prodotti, hai obblighi specifici già operativi.
          </p>

          {/* Stats row */}
          {inventory.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.5)" }}>{inventory.length} modell{inventory.length === 1 ? "o" : "i"} inventariat{inventory.length === 1 ? "o" : "i"}</span>
              <span style={{ color: "rgba(0,0,0,0.2)" }}>·</span>
              <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.5)" }}>{obligations.length} obblighi applicabili</span>
              <span style={{ color: "rgba(0,0,0,0.2)" }}>·</span>
              <span className="text-[11px] font-medium" style={{ color: score >= 80 ? "#15803d" : score >= 40 ? "#d97706" : "#dc2626" }}>{score}% completato</span>
            </div>
          )}
        </div>

        {/* Dossier banner */}
        {savedAt ? (
          <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
            <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
            <span style={{ color: "#15803d" }}>✓ GPAI Module salvato nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
            <a href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</a>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", fontFamily: "var(--font-inter, system-ui)" }}>
            <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva l&apos;inventario GPAI e il compliance score nel dossier</span>
            <button onClick={handleSaveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
              style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
              Salva nel dossier
            </button>
          </div>
        )}

        {/* Warning banner */}
        {inventory.length === 0 && (
          <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.2)" }}>
            <AlertTriangle size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>Non hai ancora inventariato i modelli GPAI in uso</p>
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                Qualsiasi uso di OpenAI, Anthropic, Google AI o modelli Hugging Face nei tuoi prodotti rientra in questa categoria.
              </p>
            </div>
            <button
              onClick={() => { setActiveTab("inventory"); setShowAddModel(true); setAddStep(1); }}
              className="flex-shrink-0 text-[11px] font-medium rounded-full px-3 py-1.5"
              style={{ background: "#d97706", color: "#ffffff" }}
            >
              Aggiungi →
            </button>
          </div>
        )}

        {/* Tab bar — select on mobile, buttons on desktop */}
        <div className="mb-5">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
              className="w-full rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016" }}
            >
              {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex gap-1" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", paddingBottom: "0" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="px-4 py-2.5 text-[12px] font-medium transition-colors"
                style={{
                  color: activeTab === t.id ? "#0D1016" : "rgba(0,0,0,0.45)",
                  borderBottom: activeTab === t.id ? "2px solid #0D1016" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {t.label}
                {t.id === "systemic" && hasSystemic && (
                  <span className="ml-1.5 text-[9px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: "rgba(234,88,12,0.15)", color: "#c2410c" }}>!</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "inventory" && renderInventoryTab()}
        {activeTab === "obligations" && renderObligationsTab()}
        {activeTab === "documents" && renderDocumentsTab()}
        {activeTab === "systemic" && renderSystemicTab()}
      </div>
    </>
  );
}
