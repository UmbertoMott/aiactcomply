"use client";

import React, { useState, useRef, CSSProperties } from "react";
import Link from "next/link";
import { Shield, Upload, Loader2, X, ExternalLink, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { ResilienceResult, ClassifierResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { ToolPhaseBar, PhaseHeading, type ToolPhase } from "@/components/compliance/ToolPhaseBar";
import { SectionEmptyState } from "@/components/logvault/SectionEmptyState";
import {
  RESILIENCE_PILLARS, PREN18282_THREATS, ROBUSTNESS_ITEMS,
} from "@/lib/resilience/resilience-requirements";
import {
  loadResilienceRecord, saveResilienceRecord, getDataAuditConfirmedGroups,
  type ResilienceRecord, type EvalKind, type ThreatCoverage, type SubPopulationMetric,
} from "@/lib/resilience/resilience-types";
import {
  parseEvalFile, guessFields, computeSubPopulation, computeASR, computeResilienceFingerprint,
  MAX_EVAL_BYTES, type EvalRow,
} from "@/lib/resilience/eval-analyzer";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f9f9fb", red: "#dc2626", amber: "#d97706", green: "#15803d", violet: "#7c3aed",
} as const;
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 };
const inp: CSSProperties = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const lbl: CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.muted, marginBottom: 5, display: "block" };

const KIND_LABEL: Record<EvalKind, string> = { accuracy: "Accuratezza / performance", robustness: "Robustezza (perturbazione/OOD)", redteam: "Red-team / adversarial / cyber" };

export default function ResiliencePage() {
  const [record, setRecord] = useState<ResilienceRecord>(() => loadResilienceRecord());
  const [rowsById, setRowsById] = useState<Record<string, EvalRow[]>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [systemName] = useState(() => {
    const cls = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
    return cls?.systemName ?? "Sistema AI";
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<EvalKind>("accuracy");
  const [uploading, setUploading] = useState(false);

  function persist(next: ResilienceRecord) { setRecord(next); saveResilienceRecord(next); }
  function patch(p: Partial<ResilienceRecord>) { persist({ ...record, ...p }); }
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  const evalsImported = record.evalSets.length > 0;
  const auditGroups = typeof window !== "undefined" ? getDataAuditConfirmedGroups() : [];
  const isGenerative = record.isGenerative === "yes";

  const phases: ToolPhase[] = [
    { id: "carica", label: "Carica", sublabel: "Risultati test esterni", anchor: "fase-carica" },
    { id: "accuratezza", label: "Accuratezza", sublabel: "Metriche & sotto-popolazioni", anchor: "fase-accuratezza" },
    { id: "minacce", label: "Minacce", sublabel: "prEN 18282 & robustezza", anchor: "fase-minacce" },
    { id: "evidenza", label: "Evidenza", sublabel: "Export", anchor: "fase-export" },
  ];
  const phaseIdx = !evalsImported ? 0
    : record.threats.some(t => t.status !== "not_assessed") ? 2
    : 1;

  // ── Import ──────────────────────────────────────────────────────────────
  async function handleImport(file: File) {
    if (file.size > MAX_EVAL_BYTES) { showToast(`File troppo grande (max ${MAX_EVAL_BYTES / 1024 / 1024} MB)`); return; }
    setUploading(true);
    try {
      const text = await file.text();
      const { rows, detectedFields } = parseEvalFile(text, file.name);
      if (rows.length === 0) { showToast("Nessuna riga valida nel file"); return; }
      const id = crypto.randomUUID();
      const evalSet = { id, fileName: file.name, kind: uploadKind, rowCount: rows.length, detectedFields, analyzedAt: new Date().toISOString() };
      setRowsById(m => ({ ...m, [id]: rows }));
      patch({ evalSets: [...record.evalSets, evalSet] });
      showToast(`${rows.length} righe importate — ${detectedFields.length} campi`);
    } catch (e) { showToast(e instanceof Error ? e.message : "Errore import"); }
    finally { setUploading(false); }
  }
  function removeEvalSet(id: string) {
    setRowsById(m => { const n = { ...m }; delete n[id]; return n; });
    patch({ evalSets: record.evalSets.filter(e => e.id !== id) });
  }

  // ── Sotto-popolazione ───────────────────────────────────────────────────
  const [spDsId, setSpDsId] = useState("");
  const [spMetric, setSpMetric] = useState("");
  const spSetsWithRows = record.evalSets.filter(e => rowsById[e.id]?.length);
  function computeSP() {
    const rows = rowsById[spDsId];
    const es = record.evalSets.find(e => e.id === spDsId);
    if (!rows || !es) return;
    const g = guessFields(es.detectedFields);
    if (!g.group || !g.value) { showToast("Servono una colonna gruppo e una valore nel file"); return; }
    const sp = computeSubPopulation(rows, {
      metric: spMetric || "metrica",
      groupCol: g.group, valueCol: g.value, sampleCol: g.sample, metricCol: g.metric, threshold: record.gapThreshold,
    });
    const others = record.subPopulation.filter(s => !(s.metric === sp.metric && s.dimension === sp.dimension));
    patch({ subPopulation: [...others, sp] });
    showToast(`Sotto-popolazioni calcolate — gap max ${(sp.maxGap * 100).toFixed(1)}%`);
  }

  // ── Minacce ─────────────────────────────────────────────────────────────
  function updateThreat(threatId: string, p: Partial<ThreatCoverage>) {
    const others = record.threats.filter(t => t.threatId !== threatId);
    const cur = record.threats.find(t => t.threatId === threatId) ?? { threatId, status: "not_assessed" as const, aiConfirmed: false };
    patch({ threats: [...others, { ...cur, ...p }] });
  }
  const redteamSets = record.evalSets.filter(e => e.kind === "redteam");

  // ── Robustezza ──────────────────────────────────────────────────────────
  function updateRobustness(itemId: string, p: { status?: "documented" | "gap" | "unspecified"; notes?: string }) {
    const others = record.robustness.filter(r => r.itemId !== itemId);
    const cur = record.robustness.find(r => r.itemId === itemId) ?? { itemId, status: "unspecified" as const };
    patch({ robustness: [...others, { ...cur, ...p }] });
  }

  // ── Export ──────────────────────────────────────────────────────────────
  async function exportJSON() {
    const fingerprint = await computeResilienceFingerprint(record);
    const withFp = { ...record, fingerprint };
    persist(withFp);
    const statement = { kind: "Resilience Statement (Art. 15 / Allegato IV [verify])", generatedAt: new Date().toISOString(), record: withFp };
    const blob = new Blob([JSON.stringify(statement, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `resilience-statement-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  async function saveToDossier() {
    const fingerprint = await computeResilienceFingerprint(record);
    persist({ ...record, fingerprint });
    const notAssessed = PREN18282_THREATS.filter(t => (record.threats.find(x => x.threatId === t.id)?.status ?? "not_assessed") === "not_assessed").length;
    writeToStorage("resilience", {
      systemName,
      accuracyDeclared: record.accuracy.length > 0,
      subPopulationGaps: record.subPopulation.filter(s => s.verdict !== "ok").length,
      threatsNotAssessed: notAssessed,
      completedAt: new Date().toISOString(),
    } as unknown as ResilienceResult);
    appendEvidence("decision", { type: "Resilience Art. 15 — record salvato", threatsNotAssessed: notAssessed }, "resilience");
    showToast("Salvato nel dossier");
  }

  const verdictColor: Record<string, string> = { ok: T.green, review: T.amber, critical: T.red };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Art. 15 AI Act — Accuratezza, robustezza, cybersicurezza</p>
          <h1 className="text-[22px] font-bold" style={{ color: T.text }}>Resilience</h1>
        </div>

        {/* Privacy */}
        <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
          <Shield size={14} className="mt-0.5 flex-shrink-0" style={{ color: T.text }} />
          <p className="text-[11px]" style={{ color: T.muted }}>
            Resilience <strong style={{ color: T.text }}>non esegue attacchi</strong>: importa e struttura i risultati dei test che esegui coi tuoi strumenti (red-team/eval)
            come evidenza Art. 15 mappata a prEN 18282. Tutto è elaborato nel browser: nessun artefatto grezzo (dataset, pesi, prompt) viene salvato — solo metriche aggregate.
          </p>
        </div>

        <ToolPhaseBar phases={phases} currentIdx={phaseIdx} />

        {/* ── FASE 1 — Import ── */}
        <section id="fase-carica" style={{ scrollMarginTop: 72 }} className="mb-6">
          <PhaseHeading n={1} title="Carica i risultati dei test" sub="Accuratezza · robustezza · red-team (JSON/CSV)" />
          <div className="flex gap-2 mb-2 flex-wrap">
            {(Object.keys(KIND_LABEL) as EvalKind[]).map(k => (
              <button key={k} onClick={() => setUploadKind(k)}
                className="text-[11px] px-3 py-1.5 rounded-lg border"
                style={{ borderColor: uploadKind === k ? T.text : T.border, background: uploadKind === k ? T.text : "transparent", color: uploadKind === k ? "#fff" : T.muted, cursor: "pointer" }}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImport(f); }}
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer" style={{ borderColor: T.border, background: T.bg }}>
            {uploading ? <Loader2 size={20} className="animate-spin mb-2" style={{ color: T.text }} /> : <Upload size={20} className="mb-2" style={{ color: T.muted }} />}
            <p className="text-[12px] font-medium" style={{ color: T.text }}>{uploading ? "Analisi…" : `Importa: ${KIND_LABEL[uploadKind]}`}</p>
            <p className="text-[11px]" style={{ color: T.muted }}>Trascina un .json/.csv o clicca — max 25 MB · nessun artefatto grezzo salvato</p>
            <input ref={fileRef} type="file" accept=".json,.csv,.tsv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.currentTarget.value = ""; }} />
          </div>
          {record.evalSets.length > 0 && (
            <div className="mt-3 space-y-1">
              {record.evalSets.map(es => (
                <div key={es.id} className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <span style={{ color: T.text }}><b>{es.fileName}</b> · {KIND_LABEL[es.kind]} · {es.rowCount} righe · {es.detectedFields.length} campi{!rowsById[es.id] ? " · (ricarica per ricalcolare)" : ""}</span>
                  <button onClick={() => removeEvalSet(es.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={13} style={{ color: T.muted }} /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── FASE 2 — Accuratezza & sotto-popolazioni ── */}
        <section id="fase-accuratezza" style={{ scrollMarginTop: 72 }} className="mb-6">
          <PhaseHeading n={2} title="Accuratezza dichiarata & sotto-popolazioni" sub="Art. 15(3) · disaggregazione per gruppo (Art. 15 ↔ 10)" />
          {!evalsImported ? (
            <SectionEmptyState message="Carica i risultati di accuratezza per calcolare metriche complessive e disaggregate per sotto-popolazione." />
          ) : (
            <>
              <div style={card} className="mb-3">
                <p className="text-[12px] font-semibold mb-1" style={{ color: T.text }}>Livello di accuratezza dichiarato nelle istruzioni per l&apos;uso?</p>
                <p className="text-[11px] mb-2" style={{ color: T.muted }}>Art. 13(3)(b) [Reg. (UE) 2024/1689]. Il livello e le metriche vanno indicati nelle istruzioni.</p>
                <div className="flex gap-2 items-center flex-wrap">
                  {(["yes", "no"] as const).map(v => {
                    const active = record.accuracy[0]?.declaredInInstructions === v;
                    return (
                      <button key={v} onClick={() => patch({ accuracy: record.accuracy.length ? record.accuracy.map((a, i) => i === 0 ? { ...a, declaredInInstructions: v } : a) : [{ metric: "accuracy", value: 0, declaredInInstructions: v, source: "manual" }] })}
                        className="text-[11px] px-3 py-1.5 rounded-lg border" style={{ borderColor: active ? T.text : T.border, background: active ? T.text : "transparent", color: active ? "#fff" : T.muted, cursor: "pointer" }}>
                        {v === "yes" ? "Sì — dichiarato" : "No — non dichiarato"}
                      </button>
                    );
                  })}
                  {record.accuracy[0]?.declaredInInstructions === "no" && <span className="text-[11px]" style={{ color: T.red }}>⚠ Gap Art. 15(3)</span>}
                  <Link href="/dashboard/tools/transparency" className="text-[11px] inline-flex items-center gap-1 ml-auto" style={{ color: T.text }}><ExternalLink size={11} /> Transparency Kit</Link>
                </div>
              </div>

              <div style={card}>
                <p className="text-[12px] font-semibold mb-2" style={{ color: T.text }}>Metriche per sotto-popolazione</p>
                {auditGroups.length > 0 && <p className="text-[10px] mb-2" style={{ color: T.muted }}>Gruppi protetti da Data Audit: {auditGroups.join(", ")}</p>}
                <div className="flex gap-2 flex-wrap items-end mb-3">
                  <div><label style={lbl}>Set importato</label>
                    <select style={inp} value={spDsId} onChange={e => setSpDsId(e.target.value)}>
                      <option value="">Seleziona…</option>
                      {spSetsWithRows.map(e => <option key={e.id} value={e.id}>{e.fileName}</option>)}
                    </select></div>
                  <div><label style={lbl}>Metrica (etichetta)</label>
                    <input style={inp} value={spMetric} onChange={e => setSpMetric(e.target.value)} placeholder="es. accuracy" /></div>
                  <button onClick={computeSP} disabled={!spDsId} className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer", opacity: spDsId ? 1 : 0.5 }}>Calcola disaggregato</button>
                </div>
                {spSetsWithRows.length === 0 && <p className="text-[11px]" style={{ color: T.amber }}>Ricarica un set in questa sessione (le righe non vengono salvate) per calcolare il disaggregato.</p>}
                {record.subPopulation.map((sp: SubPopulationMetric) => (
                  <div key={sp.metric + sp.dimension} className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold" style={{ color: T.text }}>{sp.metric} — overall {(sp.overall * 100).toFixed(1)}%</span>
                      <span className="text-[11px] font-bold" style={{ color: verdictColor[sp.verdict] }}>gap {(sp.maxGap * 100).toFixed(1)}% · {sp.verdict}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sp.byGroup.map(g => (
                        <span key={g.group} className="text-[10px] px-2 py-1 rounded" style={{ background: T.bg, color: (g.sampleSize ?? 0) < 30 ? T.faint : T.text }}>
                          {g.group}: {(g.value * 100).toFixed(1)}%{(g.sampleSize ?? 0) < 30 ? " (campione insuff.)" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── FASE 3 — Minacce prEN 18282 & robustezza ── */}
        <section id="fase-minacce" style={{ scrollMarginTop: 72 }} className="mb-6">
          <PhaseHeading n={3} title="Matrice minacce & robustezza" sub="prEN 18282 (Art. 15(5)) · robustezza operativa (Art. 15(4))" />
          {!evalsImported ? (
            <SectionEmptyState message="Carica i risultati red-team / robustezza per mappare le minacce prEN 18282 e valutare la robustezza." />
          ) : (
            <>
              <div style={card} className="mb-3">
                <p className="text-[12px] font-semibold mb-2" style={{ color: T.text }}>Matrice minacce — prEN 18282 [verify]</p>
                <div className="space-y-2">
                  {PREN18282_THREATS.map(threat => {
                    const rec = record.threats.find(t => t.threatId === threat.id);
                    const status = rec?.status ?? "not_assessed";
                    const statusColor = status === "tested_mitigated" ? T.green : status === "tested_gap" ? T.red : T.muted;
                    return (
                      <div key={threat.id} className="rounded-lg p-3" style={{ border: `1px solid ${T.border}` }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-[12px] font-medium" style={{ color: T.text }}>{threat.label}
                              {threat.generativeOnly && !isGenerative && <span className="text-[10px] ml-1" style={{ color: T.amber }}>· verifica applicabilità</span>}
                            </p>
                            <p className="text-[10px]" style={{ color: T.muted }}>{threat.reference}</p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: statusColor, background: T.bg }}>
                            {status === "tested_mitigated" ? "Testato & mitigato" : status === "tested_gap" ? "Testato — gap" : "Non valutato"}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                          <select style={{ ...inp, fontSize: 11 }} value={status} onChange={e => updateThreat(threat.id, { status: e.target.value as ThreatCoverage["status"] })}>
                            <option value="not_assessed">Non valutato</option>
                            <option value="tested_mitigated">Testato & mitigato</option>
                            <option value="tested_gap">Testato — gap</option>
                          </select>
                          {redteamSets.length > 0 && (
                            <select style={{ ...inp, fontSize: 11 }} value={rec?.evidenceEvalSetId ?? ""} onChange={e => {
                              const es = e.target.value; const rows = rowsById[es];
                              let asr: number | undefined;
                              if (rows) { const g = guessFields(record.evalSets.find(x => x.id === es)?.detectedFields ?? []); if (g.attempts && g.successes) { const a = computeASR(rows, g.attempts, g.successes); asr = a ?? undefined; } }
                              updateThreat(threat.id, { evidenceEvalSetId: es || undefined, attackSuccessRate: asr });
                            }}>
                              <option value="">Collega evidenza…</option>
                              {redteamSets.map(es => <option key={es.id} value={es.id}>{es.fileName}</option>)}
                            </select>
                          )}
                          {rec?.attackSuccessRate !== undefined && <span className="text-[11px] font-semibold" style={{ color: rec.attackSuccessRate > 0 ? T.red : T.green }}>ASR {(rec.attackSuccessRate * 100).toFixed(1)}%</span>}
                          <input style={{ ...inp, fontSize: 11, flex: 1, minWidth: 160 }} value={rec?.mitigation ?? ""} onChange={e => updateThreat(threat.id, { mitigation: e.target.value })} placeholder="Mitigazione adottata…" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-lg p-2 flex items-center gap-2 flex-wrap" style={{ background: "rgba(220,38,38,0.06)" }}>
                  <AlertTriangle size={13} style={{ color: T.red }} />
                  <span className="text-[11px]" style={{ color: T.red }}>Le minacce &quot;non valutate&quot; restano gap di cybersicurezza.</span>
                  <Link href="/dashboard/tools/risk-manager" className="text-[11px] inline-flex items-center gap-1 ml-auto" style={{ color: T.text }}><ExternalLink size={11} /> Risk Manager (Art. 9)</Link>
                </div>
              </div>

              <div style={card}>
                <p className="text-[12px] font-semibold mb-2" style={{ color: T.text }}>Robustezza operativa — Art. 15(4) [Reg. (UE) 2024/1689]</p>
                <div className="space-y-2">
                  {ROBUSTNESS_ITEMS.map(item => {
                    const rec = record.robustness.find(r => r.itemId === item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] flex-1" style={{ color: T.text, minWidth: 200 }}>{item.label}</span>
                        <select style={{ ...inp, fontSize: 11 }} value={rec?.status ?? "unspecified"} onChange={e => updateRobustness(item.id, { status: e.target.value as "documented" | "gap" | "unspecified" })}>
                          <option value="unspecified">Da valutare</option>
                          <option value="documented">Documentato</option>
                          <option value="gap">Gap</option>
                        </select>
                        <input style={{ ...inp, fontSize: 11, flex: 1, minWidth: 160 }} value={rec?.notes ?? ""} onChange={e => updateRobustness(item.id, { notes: e.target.value })} placeholder="Note…" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── FASE 4 — Evidenza ── */}
        <section id="fase-export" style={{ scrollMarginTop: 72 }} className="mb-6">
          <PhaseHeading n={4} title="Evidenza" sub="Resilience Statement (Art. 15 / Allegato IV)" />
          <div style={card}>
            <p className="text-[11px] mb-3" style={{ color: T.muted }}>
              Accuratezza dichiarata + disaggregato, robustezza, matrice prEN 18282 con stati e gap, fingerprint, timestamp.
              {record.fingerprint && <span style={{ fontFamily: "monospace" }}> · fp {record.fingerprint.slice(0, 10)}…</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportJSON} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}><FileText size={13} /> Esporta JSON</button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "#fff", color: T.text, border: `1px solid ${T.border}`, cursor: "pointer" }}><FileText size={13} /> Stampa / Salva PDF</button>
              <button onClick={saveToDossier} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg ml-auto" style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}><CheckCircle2 size={13} /> Salva nel dossier</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {RESILIENCE_PILLARS.map(p => (
              <Link key={p.id} href={p.linkedPath} className="rounded-lg p-3 block" style={{ background: T.card, border: `1px solid ${T.border}`, textDecoration: "none" }}>
                <p className="text-[11px] font-semibold" style={{ color: T.text }}>{p.label}</p>
                <p className="text-[10px]" style={{ color: T.muted }}>{p.reference}</p>
              </Link>
            ))}
          </div>
        </section>

        {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg" style={{ background: T.text, color: "#fff" }}>✓ {toast}</div>}
      </div>
    </div>
  );
}
