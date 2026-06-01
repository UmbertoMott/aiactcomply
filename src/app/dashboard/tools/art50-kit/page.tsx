"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Plus, RefreshCw, Download, AlertTriangle,
  CheckCircle, XCircle, Clock, ExternalLink, FileText, Trash2, Wand2,
} from "lucide-react";
import { writeToStorage } from "@/lib/dossier/storage-schema";

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.42)",
  faint:  "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card:   "#ffffff",
  bg:     "#f8f9fa",
};
const cardSt: React.CSSProperties = {
  background: T.card,
  border:     `1px solid ${T.border}`,
  boxShadow:  "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: 12,
};

// ─── Data model ────────────────────────────────────────────────────────────────

type Art50System = {
  id: string;
  name: string;
  type: "chatbot" | "content" | "recommendation" | "other";
  url: string;
  registroId: string;
  lastScore: number | null;
  lastScannedAt: string | null;
  createdAt: string;
  signals: Art50SignalSummary[];
};

type Art50SignalSummary = {
  criterion: string;
  detected: boolean;
  score: number;
  maxScore: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function loadSystems(): Art50System[] {
  try {
    return JSON.parse(localStorage.getItem("art50_systems") ?? "[]");
  } catch {
    return [];
  }
}

function saveSystems(systems: Art50System[]): void {
  localStorage.setItem("art50_systems", JSON.stringify(systems));
  writeToStorage("art50", {
    systemsCount: systems.length,
    completedAt: new Date().toISOString(),
  });
}

function makeRegistroId(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return `IMP-ART50-${year}-${seq}`;
}

// ─── Deadline ─────────────────────────────────────────────────────────────────

const DEADLINE = new Date("2026-12-02");
const daysLeft = Math.ceil((DEADLINE.getTime() - Date.now()) / 86400000);

// ─── Grade helpers ─────────────────────────────────────────────────────────────

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

const GRADE_COLOR: Record<string, string> = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#ca8a04",
  D: "#ea580c",
  F: "#dc2626",
};

// ─── Type labels ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<Art50System["type"], string> = {
  chatbot:        "Chatbot / Assistente",
  content:        "Generazione contenuti",
  recommendation: "Raccomandazioni",
  other:          "Altro",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Art50KitPage() {
  const [systems, setSystems]           = useState<Art50System[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [scanning, setScanning]         = useState<string | null>(null);
  const [activeSystem, setActiveSystem] = useState<Art50System | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Art50System["type"]>("chatbot");
  const [formUrl,  setFormUrl]  = useState("");

  useEffect(() => {
    setSystems(loadSystems());
  }, []);

  // ── Scan ────────────────────────────────────────────────────────────────────

  async function scanSystem(system: Art50System) {
    if (!system.url) return;
    setScanning(system.id);
    try {
      const res = await fetch("/api/scanner/art50", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: system.url }),
      });
      const data = await res.json();
      const updated = systems.map(s =>
        s.id === system.id
          ? {
              ...s,
              lastScore: data.score ?? null,
              lastScannedAt: new Date().toISOString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              signals: (data.signals ?? []).map((sig: any) => ({
                criterion: sig.criterion,
                detected:  sig.detected,
                score:     sig.score,
                maxScore:  sig.maxScore,
              })),
            }
          : s
      );
      setSystems(updated);
      saveSystems(updated);
      // Keep detail panel in sync
      if (activeSystem?.id === system.id) {
        setActiveSystem(updated.find(s => s.id === system.id) ?? null);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setScanning(null);
    }
  }

  // ── Add system ──────────────────────────────────────────────────────────────

  function addSystem() {
    if (!formName || !formType) return;
    const sys: Art50System = {
      id:            crypto.randomUUID(),
      name:          formName,
      type:          formType,
      url:           formUrl,
      registroId:    makeRegistroId(),
      lastScore:     null,
      lastScannedAt: null,
      createdAt:     new Date().toISOString(),
      signals:       [],
    };
    const updated = [...systems, sys];
    setSystems(updated);
    saveSystems(updated);
    setShowForm(false);
    setFormName(""); setFormType("chatbot"); setFormUrl("");
    if (formUrl) setTimeout(() => scanSystem(sys), 100);
  }

  // ── Delete system ───────────────────────────────────────────────────────────

  function deleteSystem(id: string) {
    if (!confirm("Eliminare questo sistema? Il registro verrà rimosso.")) return;
    const updated = systems.filter(s => s.id !== id);
    setSystems(updated);
    saveSystems(updated);
    if (activeSystem?.id === id) setActiveSystem(null);
  }

  // ── Download registro ───────────────────────────────────────────────────────

  function downloadRegistro(system: Art50System) {
    const lines = [
      "REGISTRO DI IMPLEMENTAZIONE ART. 50 — AI ACT (UE) 2024/1689",
      "=".repeat(60),
      "",
      `ID Registro:          ${system.registroId}`,
      `Sistema AI:           ${system.name}`,
      `Tipologia:            ${TYPE_LABELS[system.type]}`,
      `URL:                  ${system.url || "non specificato"}`,
      `Data registrazione:   ${new Date(system.createdAt).toLocaleDateString("it-IT", {
        day: "2-digit", month: "long", year: "numeric",
      })}`,
      `Ultimo scan:          ${
        system.lastScannedAt
          ? new Date(system.lastScannedAt).toLocaleDateString("it-IT", {
              day: "2-digit", month: "long", year: "numeric",
            })
          : "non eseguito"
      }`,
      `Punteggio Art. 50:    ${system.lastScore !== null ? system.lastScore + "/100" : "n/d"}`,
      "",
      "COMPONENTI DICHIARATI INSTALLATI:",
      "  - Banner disclosure AI visibile agli utenti",
      "  - Meta tag machine-readable (ai-disclosure)",
      "  - Markup strutturato JSON-LD",
      "",
      "RIFERIMENTO NORMATIVO:",
      "  Art. 50(1) Regolamento (UE) 2024/1689 (AI Act)",
      "  Deadline: 2 dicembre 2026",
      "",
      "DICHIARAZIONE:",
      "  Il titolare del sistema dichiara di aver installato i componenti",
      "  di disclosure elencati. La conformità all'Art. 50 rimane",
      "  responsabilità esclusiva del titolare del sistema AI.",
      "",
      "NOTA LEGALE:",
      "  AI Comply S.r.l. non rilascia attestazioni di conformità legale.",
      "  Questo documento costituisce esclusivamente un registro interno",
      "  di implementazione a supporto della due diligence del titolare.",
      "=".repeat(60),
      `Generato da AI Comply Platform — ${new Date().toISOString()}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${system.registroId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── DEADLINE BANNER ── */}
      <div
        className="flex items-center justify-between px-5 py-3 rounded-xl text-sm"
        style={
          daysLeft <= 90
            ? { background: "#fef2f2", border: "1px solid #fecaca" }
            : { background: "#eff6ff", border: "1px solid #bfdbfe" }
        }
      >
        <div className="flex items-center gap-3">
          <Clock
            className="h-4 w-4 flex-shrink-0"
            style={{ color: daysLeft <= 90 ? "#ef4444" : "#3b82f6" }}
          />
          <span style={{ color: daysLeft <= 90 ? "#7f1d1d" : "#1e3a5f" }}>
            <strong>{daysLeft} giorni</strong> alla deadline Art. 50 — 2 dicembre 2026
            {daysLeft <= 90 && " · Azione urgente richiesta"}
          </span>
        </div>
        <a
          href="https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32024R1689"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: daysLeft <= 90 ? "#dc2626" : "#2563eb" }}
        >
          Art. 50 AI Act <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: T.text }}>Art. 50 Kit</h1>
          <p className="text-sm mt-0.5" style={{ color: T.muted }}>
            Gestisci la disclosure AI dei tuoi sistemi · {systems.length}{" "}
            sistema{systems.length !== 1 ? "i" : "o"} registrato{systems.length !== 1 ? "i" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/onboarding"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{ border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.55)", background: "#ffffff" }}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Setup guidato
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "#0D1016" }}
          >
            <Plus className="h-4 w-4" />
            Aggiungi sistema
          </button>
        </div>
      </div>

      {/* ── ADD SYSTEM FORM ── */}
      {showForm && (
        <div
          className="rounded-xl p-5"
          style={{ border: "1px solid #bfdbfe", background: "#eff6ff" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#1e3a5f" }}>
            Nuovo sistema AI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>
                Nome sistema *
              </label>
              <input
                type="text"
                placeholder="es. Chatbot sito web"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ border: `1px solid ${T.border}` }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>
                URL sito
              </label>
              <input
                type="url"
                placeholder="https://tuo-sito.it"
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ border: `1px solid ${T.border}` }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-2" style={{ color: T.muted }}>
                Tipo sistema *
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "chatbot",        label: "Chatbot / Assistente"   },
                    { value: "content",        label: "Generazione contenuti"  },
                    { value: "recommendation", label: "Raccomandazioni"        },
                    { value: "other",          label: "Altro"                  },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormType(opt.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                    style={
                      formType === opt.value
                        ? { border: "1px solid #3b82f6", background: "#ffffff", color: "#1d4ed8" }
                        : { border: "1px solid #e5e7eb", background: "#ffffff", color: "#6b7280" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormName("");
                setFormUrl("");
                setFormType("chatbot");
              }}
              className="px-4 py-2 rounded-lg text-sm hover:opacity-80 transition-colors"
              style={{ border: `1px solid ${T.border}`, background: T.card, color: T.muted }}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={addSystem}
              disabled={!formName || !formType}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-all"
              style={{ background: "#1d4ed8" }}
            >
              {formUrl ? "Aggiungi e avvia scan →" : "Aggiungi sistema →"}
            </button>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {systems.length === 0 && !showForm && (
        <div
          className="rounded-xl py-16 text-center"
          style={{ border: "2px dashed rgba(0,0,0,0.14)", background: T.card, borderRadius: 12 }}
        >
          <Shield className="h-10 w-10 mx-auto mb-4" style={{ color: T.faint }} />
          <p className="font-medium" style={{ color: T.muted }}>Nessun sistema registrato</p>
          <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: T.faint }}>
            Aggiungi il tuo primo sistema AI per avviare la compliance Art. 50.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: "#0D1016" }}
          >
            <Plus className="h-4 w-4" /> Aggiungi il primo sistema
          </button>
        </div>
      )}

      {/* ── SYSTEMS LIST ── */}
      {systems.length > 0 && (
        <div className="space-y-3">
          {systems.map(system => {
            const score  = system.lastScore;
            const grade  = score !== null ? gradeFromScore(score) : null;
            const gColor = grade ? (GRADE_COLOR[grade] ?? "#9ca3af") : "#9ca3af";
            const isExpanded = activeSystem?.id === system.id;

            return (
              <div
                key={system.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  background: T.card,
                  border: isExpanded ? "1px solid #bfdbfe" : `1px solid ${T.border}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  borderRadius: 12,
                }}
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Left: system info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">

                    {/* Score / grade circle */}
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2"
                      style={{ borderColor: gColor, color: gColor }}
                    >
                      {score !== null ? grade : "—"}
                    </div>

                    {/* Info block */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: T.text }}>{system.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.bg, color: T.muted }}>
                          {TYPE_LABELS[system.type]}
                        </span>
                        <span className="text-xs font-mono" style={{ color: T.faint }}>{system.registroId}</span>
                      </div>

                      {system.url && (
                        <a
                          href={system.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-1 text-xs text-blue-500 hover:underline"
                        >
                          {system.url.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {/* 5-bar signal mini-chart */}
                      {system.signals.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {system.signals.map(sig => (
                            <div
                              key={sig.criterion}
                              title={sig.criterion}
                              className="h-1.5 w-8 rounded-full"
                              style={{ background: sig.detected ? "#4ade80" : "#f87171" }}
                            />
                          ))}
                        </div>
                      )}

                      {system.lastScannedAt ? (
                        <p className="text-xs mt-1.5" style={{ color: T.faint }}>
                          Ultimo scan:{" "}
                          {new Date(system.lastScannedAt).toLocaleDateString("it-IT", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}{" "}
                          · Punteggio: {system.lastScore}/100
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-xs mt-1.5" style={{ color: "#d97706" }}>
                          <AlertTriangle className="h-3 w-3" /> Scansione non ancora eseguita
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => scanSystem(system)}
                      disabled={scanning === system.id || !system.url}
                      title={!system.url ? "Aggiungi un URL per avviare la scansione" : "Ri-scansiona"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 transition-all hover:opacity-80"
                      style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.card }}
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${scanning === system.id ? "animate-spin" : ""}`}
                      />
                      {scanning === system.id ? "Scansione..." : "Ri-scansiona"}
                    </button>

                    <button
                      onClick={() => downloadRegistro(system)}
                      title="Scarica Registro di Implementazione"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.card }}
                    >
                      <Download className="h-3 w-3" />
                      Registro
                    </button>

                    <button
                      onClick={() =>
                        setActiveSystem(isExpanded ? null : system)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all"
                      style={
                        isExpanded
                          ? { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8" }
                          : { border: "1px solid #e5e7eb", background: "transparent", color: "#6b7280" }
                      }
                    >
                      <FileText className="h-3 w-3" />
                      Dettagli
                    </button>

                    <button
                      onClick={() => deleteSystem(system.id)}
                      className="p-1.5 rounded-lg border transition-all hover:text-red-500 hover:border-red-200"
                      style={{ border: `1px solid ${T.border}`, color: T.muted }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── EXPANDED DETAIL PANEL ── */}
                {isExpanded && (
                  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Signals */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
                          Analisi Art. 50
                        </p>
                        {system.signals.length === 0 ? (
                          <p className="text-xs" style={{ color: T.faint }}>
                            Nessuna scansione disponibile. Avvia la scansione per vedere i dettagli.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {system.signals.map(sig => (
                              <div
                                key={sig.criterion}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  {sig.detected ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                                  )}
                                  <span className="font-mono" style={{ color: T.text }}>{sig.criterion}</span>
                                </div>
                                <span
                                  className="font-medium tabular-nums"
                                  style={{ color: sig.detected ? "#16a34a" : "#ef4444" }}
                                >
                                  {sig.score}/{sig.maxScore}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Registro summary */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
                          Registro di implementazione
                        </p>
                        <div className="space-y-1.5 text-xs">
                          {(
                            [
                              ["ID", system.registroId],
                              [
                                "Registrato il",
                                new Date(system.createdAt).toLocaleDateString("it-IT"),
                              ],
                              [
                                "Stato",
                                system.lastScore !== null
                                  ? system.lastScore >= 60
                                    ? "Disclosure rilevata"
                                    : "Gap presenti"
                                  : "In attesa di verifica",
                              ],
                            ] as [string, string][]
                          ).map(([label, value]) => (
                            <div key={label} className="flex gap-3">
                              <span className="w-28 flex-shrink-0" style={{ color: T.faint }}>{label}</span>
                              <span className="font-medium" style={{ color: T.text }}>{value}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => downloadRegistro(system)}
                          className="mt-4 flex items-center gap-2 text-xs hover:underline"
                          style={{ color: "#2563eb" }}
                        >
                          <Download className="h-3 w-3" /> Scarica registro .txt
                        </button>

                        <p className="mt-2 text-xs leading-relaxed" style={{ color: T.faint }}>
                          AI Comply non rilascia attestazioni di conformità legale.
                          La conformità all&apos;Art. 50 rimane responsabilità del titolare.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── INFO FOOTER ── */}
      <div
        className="rounded-xl px-5 py-4 text-xs leading-relaxed"
        style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.muted }}
      >
        <strong style={{ color: T.text }}>Art. 50 AI Act — cosa richiede.</strong>{" "}
        I sistemi AI che interagiscono direttamente con persone fisiche devono informare
        gli utenti della natura artificiale del sistema in modo chiaro, tempestivo e
        comprensibile (Art. 50(1)). Obbligatorio dal 2 dicembre 2026 per tutti i sistemi
        in scope, inclusi chatbot, assistenti virtuali e sistemi di raccomandazione con
        interfaccia utente. Multa massima: 1% del fatturato annuo globale (Art. 99(3)).
      </div>

    </div>
  );
}
