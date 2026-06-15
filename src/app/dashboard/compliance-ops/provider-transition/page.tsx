"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, HelpCircle, Clock, Plus, Trash2,
  ChevronDown, ChevronRight, ExternalLink, RefreshCw, Save,
} from "lucide-react";
import {
  TRANSITION_CHECKS,
  PROVIDER_OBLIGATIONS,
  MOD_TYPE_LABELS,
  computeTransitionVerdict,
  initAnswers,
  loadAnswers,
  loadMods,
  loadObligDone,
  getEarliestSubstantialDate,
  getDerivedObligationsDone,
  emptyNewMod,
  ANSWERS_KEY,
  MODS_KEY,
  OBL_KEY,
  type TransitionAnswer,
  type Verdict,
  type ModificationRecord,
} from "@/lib/provider-transition/provider-transition-types";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BG = "#0D1016";
const CARD = "rgba(17,24,39,0.8)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F5F9";
const MUTED = "#94A3B8";
const INDIGO = "#818cf8";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RadioGroupDk({
  name, value, onChange,
}: {
  name: string;
  value: TransitionAnswer;
  onChange: (v: TransitionAnswer) => void;
}) {
  const opts: { v: TransitionAnswer; label: string; color: string }[] = [
    { v: "yes",   label: "Sì",      color: "#f87171" },
    { v: "no",    label: "No",      color: "#4ade80" },
    { v: "unsure",label: "Incerto", color: "#fb923c" },
  ];
  return (
    <div className="flex gap-3 mt-2">
      {opts.map(o => (
        <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={value === o.v}
            onChange={() => onChange(o.v)}
            className="accent-indigo-400"
          />
          <span style={{ color: value === o.v ? o.color : MUTED, fontWeight: value === o.v ? 600 : 400 }}>
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function VerdictBanner({ verdict }: { verdict: Verdict }) {
  if (verdict === "incomplete") return null;
  const cfg = {
    provider: {
      bg: "rgba(239,68,68,0.12)",
      border: "#ef4444",
      icon: <AlertTriangle size={18} className="text-red-400" />,
      title: "Obblighi da Provider rilevati (Art. 28)",
      text: "Le risposte indicate suggeriscono che la tua organizzazione potrebbe aver assunto il ruolo di provider. Completa le obbligazioni nella sezione 3 e verifica con il team legale. [verify against current AI Act text]",
    },
    risk: {
      bg: "rgba(251,146,60,0.12)",
      border: "#fb923c",
      icon: <HelpCircle size={18} className="text-orange-400" />,
      title: "Rischio potenziale — verifica necessaria",
      text: "Una o più risposte 'Incerto' richiedono una valutazione legale prima di determinare se scattano obblighi da provider (Art. 28). [verify against current AI Act text]",
    },
    deployer: {
      bg: "rgba(74,222,128,0.08)",
      border: "#4ade80",
      icon: <CheckCircle2 size={18} className="text-green-400" />,
      title: "Nessun obbligo da provider rilevato",
      text: "Le risposte indicano che rimani nel ruolo di deployer senza obblighi aggiuntivi da provider. Documenta comunque le modifiche apportate. [verify against current AI Act text]",
    },
  } as const;
  const c = cfg[verdict];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "14px 16px", display: "flex", gap: 12 }}>
      <div className="mt-0.5 shrink-0">{c.icon}</div>
      <div>
        <p style={{ color: TEXT, fontWeight: 600, marginBottom: 4 }}>{c.title}</p>
        <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5 }}>{c.text}</p>
      </div>
    </div>
  );
}

function SubstantialBadge({ v }: { v: boolean | null }) {
  if (v === null) return <span style={{ color: MUTED, fontSize: 12 }}>Non valutata</span>;
  if (v) return <span style={{ color: "#f87171", fontWeight: 600, fontSize: 12 }}>● Sostanziale</span>;
  return <span style={{ color: "#4ade80", fontSize: 12 }}>○ Ordinaria</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProviderTransitionPage() {
  const [answers, setAnswers] = useState<Record<string, TransitionAnswer>>(initAnswers);
  const [mods, setMods]       = useState<ModificationRecord[]>([]);
  const [obligDone, setObligDone] = useState<Record<string, boolean>>({});
  const [derivedDone, setDerivedDone] = useState<Record<string, boolean>>({});
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [newMod, setNewMod]   = useState<Omit<ModificationRecord, "id"> | null>(null);
  const [saved, setSaved]     = useState(false);
  const [modSection, setModSection] = useState(true);

  useEffect(() => {
    setAnswers(loadAnswers());
    setMods(loadMods());
    setObligDone(loadObligDone());
    setDerivedDone(getDerivedObligationsDone());
  }, []);

  const verdict = computeTransitionVerdict(TRANSITION_CHECKS, answers);
  const earliestSubst = getEarliestSubstantialDate(mods);
  const substantialCount = mods.filter(m => m.is_substantial === true).length;

  const saveAll = useCallback(() => {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    localStorage.setItem(MODS_KEY, JSON.stringify(mods));
    localStorage.setItem(OBL_KEY, JSON.stringify(obligDone));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [answers, mods, obligDone]);

  function updateAnswer(id: string, v: TransitionAnswer) {
    setAnswers(prev => ({ ...prev, [id]: v }));
  }

  function addMod() {
    if (!newMod) { setNewMod(emptyNewMod()); return; }
    const mod: ModificationRecord = { ...newMod, id: crypto.randomUUID() };
    setMods(prev => [mod, ...prev]);
    setNewMod(null);
  }

  function deleteMod(id: string) {
    setMods(prev => prev.filter(m => m.id !== id));
  }

  function patchMod(id: string, patch: Partial<ModificationRecord>) {
    setMods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }

  function toggleOblig(id: string) {
    setObligDone(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const isObligDone = (id: string) => derivedDone[id] || obligDone[id];

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ background: "rgba(129,140,248,0.15)", color: INDIGO, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
            Art. 28 [verify against current AI Act text]
          </span>
          {verdict !== "incomplete" && (
            <span style={{
              background: verdict === "provider" ? "rgba(239,68,68,0.15)" : verdict === "risk" ? "rgba(251,146,60,0.15)" : "rgba(74,222,128,0.12)",
              color: verdict === "provider" ? "#f87171" : verdict === "risk" ? "#fb923c" : "#4ade80",
              borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600,
            }}>
              {verdict === "provider" ? "PROVIDER" : verdict === "risk" ? "VERIFICA" : "DEPLOYER"}
            </span>
          )}
        </div>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Provider Transition Alert
        </h1>
        <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
          Verifica se le modifiche apportate al sistema AI configurano un trasferimento del ruolo da deployer a provider ai sensi dell&apos;Art. 28 del Reg. (UE) 2024/1689.
        </p>
      </div>

      {/* ─── SEZIONE 1: Checklist Art. 28 ─────────────────────────────────── */}
      <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ color: TEXT, fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
          1. Checklist valutazione Art. 28
        </h2>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
          Rispondi a tutte le domande per determinare il tuo ruolo. Le risposte &quot;Sì&quot; ai trigger configurano potenziali obblighi da provider.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {TRANSITION_CHECKS.map(check => (
            <div key={check.id} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${answers[check.id] === "yes" && check.is_trigger ? "rgba(239,68,68,0.4)" : BORDER}`,
              borderRadius: 8, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {check.is_trigger
                      ? <AlertTriangle size={14} style={{ color: "#fb923c", flexShrink: 0 }} />
                      : <CheckCircle2 size={14} style={{ color: "#4ade80", flexShrink: 0 }} />
                    }
                    <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>{check.question}</span>
                  </div>
                  <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.5, marginLeft: 22 }}>{check.explanation}</p>
                  <p style={{ color: INDIGO, fontSize: 11, marginLeft: 22, marginTop: 4 }}>{check.trigger_article}</p>
                </div>
              </div>
              <div style={{ marginLeft: 22 }}>
                <RadioGroupDk
                  name={`check_${check.id}`}
                  value={answers[check.id]}
                  onChange={v => updateAnswer(check.id, v)}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <VerdictBanner verdict={verdict} />
        </div>
      </section>

      {/* ─── SEZIONE 2: Registro Modifiche ─────────────────────────────────── */}
      <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: modSection ? 16 : 0 }}
          onClick={() => setModSection(v => !v)}
        >
          <div>
            <h2 style={{ color: TEXT, fontWeight: 600, fontSize: 16 }}>2. Registro Modifiche</h2>
            <p style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>
              {mods.length} modifica/e registrata/e
              {substantialCount > 0 && <span style={{ color: "#f87171", marginLeft: 8 }}>● {substantialCount} sostanziale/i</span>}
              {earliestSubst && <span style={{ color: MUTED, marginLeft: 8 }}>· prima: {earliestSubst}</span>}
            </p>
          </div>
          {modSection ? <ChevronDown size={18} style={{ color: MUTED }} /> : <ChevronRight size={18} style={{ color: MUTED }} />}
        </div>

        {modSection && (
          <>
            <div style={{
              background: "rgba(129,140,248,0.08)", border: `1px solid rgba(129,140,248,0.2)`,
              borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: MUTED,
            }}>
              <strong style={{ color: INDIGO }}>✦ AI — verifica e conferma</strong> Le voci con sorgente &quot;LogVault Auto&quot; sono rilevate automaticamente dai log ma <strong>non</strong> impostano mai &quot;Sostanziale&quot; automaticamente — richiedono sempre valutazione manuale.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {mods.length === 0 && (
                <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                  Nessuna modifica registrata. Aggiungi la prima modifica.
                </p>
              )}
              {mods.map(mod => (
                <div key={mod.id} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${mod.is_substantial === true ? "rgba(239,68,68,0.3)" : BORDER}`,
                  borderRadius: 8,
                }}>
                  <div
                    style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ color: MUTED, fontSize: 12 }}>{mod.date}</span>
                      <span style={{ color: TEXT, fontSize: 13 }}>{mod.description || "(senza descrizione)"}</span>
                      {mod.source === "logvault_auto" && (
                        <span style={{ background: "rgba(129,140,248,0.15)", color: INDIGO, fontSize: 11, borderRadius: 4, padding: "1px 7px" }}>
                          LogVault Auto
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <SubstantialBadge v={mod.is_substantial} />
                      <button onClick={e => { e.stopPropagation(); deleteMod(mod.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {expandedMod === mod.id && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Tipo</label>
                        <select
                          value={mod.type}
                          onChange={e => patchMod(mod.id, { type: e.target.value as ModificationRecord["type"] })}
                          style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                        >
                          {(Object.entries(MOD_TYPE_LABELS) as [ModificationRecord["type"], string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Modifica sostanziale?</label>
                        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                          {([true, false, null] as (boolean | null)[]).map(val => (
                            <label key={String(val)} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                checked={mod.is_substantial === val}
                                onChange={() => patchMod(mod.id, { is_substantial: val })}
                                className="accent-indigo-400"
                              />
                              <span style={{ color: MUTED, fontSize: 12 }}>
                                {val === true ? "Sì" : val === false ? "No" : "Da valutare"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Descrizione</label>
                        <textarea
                          value={mod.description}
                          onChange={e => patchMod(mod.id, { description: e.target.value })}
                          rows={2}
                          style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px", color: TEXT, fontSize: 13, resize: "vertical" }}
                        />
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Valutato da</label>
                        <input
                          value={mod.assessed_by}
                          onChange={e => patchMod(mod.id, { assessed_by: e.target.value })}
                          style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Data valutazione</label>
                        <input
                          type="date"
                          value={mod.assessed_date}
                          onChange={e => patchMod(mod.id, { assessed_date: e.target.value })}
                          style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                        />
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Note</label>
                        <textarea
                          value={mod.notes}
                          onChange={e => patchMod(mod.id, { notes: e.target.value })}
                          rows={2}
                          style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px", color: TEXT, fontSize: 13, resize: "vertical" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {newMod ? (
              <div style={{ background: "rgba(129,140,248,0.06)", border: `1px solid rgba(129,140,248,0.25)`, borderRadius: 8, padding: 16, marginBottom: 10 }}>
                <p style={{ color: INDIGO, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Nuova modifica</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Data *</label>
                    <input
                      type="date"
                      value={newMod.date}
                      onChange={e => setNewMod(prev => prev ? { ...prev, date: e.target.value } : prev)}
                      style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Tipo *</label>
                    <select
                      value={newMod.type}
                      onChange={e => setNewMod(prev => prev ? { ...prev, type: e.target.value as ModificationRecord["type"] } : prev)}
                      style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                    >
                      {(Object.entries(MOD_TYPE_LABELS) as [ModificationRecord["type"], string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Descrizione *</label>
                    <input
                      value={newMod.description}
                      onChange={e => setNewMod(prev => prev ? { ...prev, description: e.target.value } : prev)}
                      placeholder="es. Fine-tuning con dati interni Q1 2026"
                      style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Sorgente</label>
                    <select
                      value={newMod.source}
                      onChange={e => setNewMod(prev => prev ? { ...prev, source: e.target.value as "manual" | "logvault_auto" } : prev)}
                      style={{ width: "100%", background: "#1e2535", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, fontSize: 13 }}
                    >
                      <option value="manual">Manuale</option>
                      <option value="logvault_auto">LogVault Auto</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>Sostanziale? (da valutare)</label>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      {([true, false, null] as (boolean | null)[]).map(val => (
                        <label key={String(val)} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            checked={newMod.is_substantial === val}
                            onChange={() => setNewMod(prev => prev ? { ...prev, is_substantial: val } : prev)}
                            className="accent-indigo-400"
                          />
                          <span style={{ color: MUTED, fontSize: 12 }}>
                            {val === true ? "Sì" : val === false ? "No" : "Da valutare"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    onClick={addMod}
                    style={{ background: INDIGO, color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    Aggiungi
                  </button>
                  <button
                    onClick={() => setNewMod(null)}
                    style={{ background: "rgba(255,255,255,0.06)", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNewMod(emptyNewMod())}
                style={{ display: "flex", alignItems: "center", gap: 6, color: INDIGO, background: "rgba(129,140,248,0.08)", border: `1px dashed rgba(129,140,248,0.3)`, borderRadius: 7, padding: "8px 16px", cursor: "pointer", fontSize: 13, width: "100%" }}
              >
                <Plus size={14} /> Aggiungi modifica
              </button>
            )}
          </>
        )}
      </section>

      {/* ─── SEZIONE 3: Obbligazioni Provider ─────────────────────────────── */}
      {verdict === "provider" && (
        <section style={{ background: CARD, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h2 style={{ color: TEXT, fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
            3. Obbligazioni da Provider (Art. 28)
          </h2>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>
            Completa le seguenti obbligazioni. Le voci con sorgente &quot;derivata&quot; si aggiornano automaticamente dagli altri moduli AIComply.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PROVIDER_OBLIGATIONS.map(obl => {
              const done = isObligDone(obl.id);
              const isDerived = derivedDone[obl.id] !== undefined;
              return (
                <div key={obl.id} style={{
                  background: done ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${done ? "rgba(74,222,128,0.25)" : BORDER}`,
                  borderRadius: 8, padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: obl.unavailable ? 0.6 : 1,
                }}>
                  {!isDerived ? (
                    <input
                      type="checkbox"
                      checked={!!obligDone[obl.id]}
                      onChange={() => !obl.unavailable && toggleOblig(obl.id)}
                      className="accent-indigo-400"
                      disabled={!!obl.unavailable}
                      style={{ flexShrink: 0 }}
                    />
                  ) : (
                    done
                      ? <CheckCircle2 size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
                      : <Clock size={16} style={{ color: MUTED, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: done ? "#4ade80" : TEXT, fontSize: 14, textDecoration: done ? "line-through" : "none" }}>
                        {obl.label}
                      </span>
                      {obl.unavailable && <span style={{ color: MUTED, fontSize: 11 }}>(non ancora disponibile)</span>}
                      {isDerived && <span style={{ color: INDIGO, fontSize: 11, background: "rgba(129,140,248,0.12)", borderRadius: 4, padding: "1px 7px" }}>derivata</span>}
                    </div>
                    <span style={{ color: MUTED, fontSize: 11 }}>{obl.art}</span>
                  </div>
                  {!obl.unavailable && (
                    <Link href={obl.href} style={{ color: INDIGO, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      Apri <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Save Button ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        <button
          onClick={() => { setAnswers(loadAnswers()); setMods(loadMods()); setObligDone(loadObligDone()); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13 }}
        >
          <RefreshCw size={14} /> Ricarica
        </button>
        <button
          onClick={saveAll}
          style={{ display: "flex", alignItems: "center", gap: 6, background: saved ? "rgba(74,222,128,0.2)" : INDIGO, color: saved ? "#4ade80" : "#fff", border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "background 0.3s" }}
        >
          {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? "Salvato" : "Salva"}
        </button>
      </div>
    </div>
  );
}
