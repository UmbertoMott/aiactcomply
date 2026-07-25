"use client";
import React, { useState, useMemo } from "react";
import { CSSProperties } from "react";
import type { DataAuditRecord, DatasetProfile, FairnessReport, RepresentativenessCheck } from "@/lib/data-audit/data-audit-types";
import { qualityScorecard } from "@/lib/data-audit/csv-profiler";
import { computeFairness, computeRepresentativeness, type Row, MIN_CELL } from "@/lib/data-audit/fairness";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f9f9fb",
  red: "#dc2626", amber: "#d97706", green: "#15803d", dark: "#0D1016",
} as const;
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 };
const inp: CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const label: CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.muted, marginBottom: 5, display: "block" };

function scoreColor(v: number) { return v >= 90 ? T.green : v >= 70 ? T.amber : T.red; }

// ═══ §2 Data Quality Scorecard ══════════════════════════════════════════════
export function QualityScorecard({ datasets }: { datasets: DatasetProfile[] }) {
  if (datasets.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Data Quality Scorecard</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>Caratteristiche di qualità ISO/IEC 5259 [verify] — Art. 10(3)</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {datasets.map(ds => {
          const s = qualityScorecard(ds);
          const items = [
            { k: "Completezza", v: s.completeness }, { k: "Unicità", v: s.uniqueness }, { k: "Consistenza", v: s.consistency },
          ];
          return (
            <div key={ds.id} style={card}>
              <p className="text-[11px] font-semibold mb-2 truncate" style={{ color: T.text }}>{ds.fileName} <span style={{ color: T.muted }}>· {ds.role}</span></p>
              <div className="flex gap-3">
                {items.map(it => (
                  <div key={it.k} className="flex-1">
                    <div className="text-[18px] font-bold" style={{ color: scoreColor(it.v) }}>{it.v}</div>
                    <div className="text-[10px]" style={{ color: T.muted }}>{it.k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px]" style={{ color: T.muted }}>
                {ds.duplicateRowCount > 0 && <span>{ds.duplicateRowCount.toLocaleString()} righe duplicate · </span>}
                {ds.columns.reduce((a, c) => a + (c.numericStats?.outlierCount ?? 0), 0)} outlier
                {ds.fingerprint && <span> · fp {ds.fingerprint.slice(0, 10)}…</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══ §4 Fairness Panel ══════════════════════════════════════════════════════
export function FairnessPanel({ datasets, rowsById }: { datasets: DatasetProfile[]; rowsById: Record<string, Row[]> }) {
  const withRows = datasets.filter(d => rowsById[d.id]?.length);
  const [dsId, setDsId] = useState(withRows[0]?.id ?? "");
  const ds = datasets.find(d => d.id === dsId);
  const [protectedCol, setProtectedCol] = useState("");
  const [outcomeCol, setOutcomeCol] = useState("");
  const [positive, setPositive] = useState("");
  const [gtCol, setGtCol] = useState("");
  const [protectedCol2, setProtectedCol2] = useState("");
  const [report, setReport] = useState<FairnessReport | null>(null);

  const cols = ds?.columns ?? [];
  const sensitiveCols = cols.filter(c => c.sensitiveFlagConfirmed);
  const outcomeValues = cols.find(c => c.name === outcomeCol)?.categoricalDistribution?.map(v => v.value) ?? [];

  function run() {
    const rows = rowsById[dsId];
    if (!rows || !protectedCol || !outcomeCol || !positive) return;
    setReport(computeFairness(rows, {
      datasetId: dsId, protectedColumn: protectedCol, outcomeColumn: outcomeCol,
      positiveOutcomeValue: positive, groundTruthColumn: gtCol || undefined,
      protectedColumn2: protectedCol2 || undefined,
    }));
  }

  const riskColor: Record<string, string> = { low: T.green, medium: T.amber, high: T.red, critical: T.red };

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Analisi di fairness — Art. 10(2)(f)</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>ISO/IEC TR 24027 [verify]. Le metriche sono calcolate dai dati (deterministiche), non generate da AI.</p>

      {withRows.length === 0 ? (
        <div style={{ ...card, color: T.muted }} className="text-[12px]">
          Carica un dataset in questa sessione per calcolare la fairness. Le righe restano nel browser e non vengono salvate: dopo un ricaricamento pagina va ricaricato il file.
        </div>
      ) : (
        <div style={card}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div><label style={label}>Dataset</label>
              <select style={inp} value={dsId} onChange={e => { setDsId(e.target.value); setReport(null); }}>
                {withRows.map(d => <option key={d.id} value={d.id}>{d.fileName} ({d.role})</option>)}
              </select></div>
            <div><label style={label}>Colonna protetta *</label>
              <select style={inp} value={protectedCol} onChange={e => setProtectedCol(e.target.value)}>
                <option value="">Seleziona…</option>
                {(sensitiveCols.length ? sensitiveCols : cols).map(c => <option key={c.name} value={c.name}>{c.name}{c.sensitiveFlagConfirmed ? " ⚠" : ""}</option>)}
              </select></div>
            <div><label style={label}>Colonna esito *</label>
              <select style={inp} value={outcomeCol} onChange={e => { setOutcomeCol(e.target.value); setPositive(""); }}>
                <option value="">Seleziona…</option>
                {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select></div>
            <div><label style={label}>Valore &quot;esito positivo&quot; *</label>
              {outcomeValues.length ? (
                <select style={inp} value={positive} onChange={e => setPositive(e.target.value)}>
                  <option value="">Seleziona…</option>
                  {outcomeValues.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : <input style={inp} value={positive} onChange={e => setPositive(e.target.value)} placeholder="es. approvato" />}
            </div>
            <div><label style={label}>Ground truth (opzionale)</label>
              <select style={inp} value={gtCol} onChange={e => setGtCol(e.target.value)}>
                <option value="">— (EOD/equalized odds disabilitati)</option>
                {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select></div>
            <div><label style={label}>2ª protetta — intersezionale</label>
              <select style={inp} value={protectedCol2} onChange={e => setProtectedCol2(e.target.value)}>
                <option value="">— (opzionale)</option>
                {cols.filter(c => c.name !== protectedCol).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select></div>
          </div>
          <button onClick={run} disabled={!protectedCol || !outcomeCol || !positive}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: T.dark, color: "#fff", border: "none", cursor: "pointer", opacity: (!protectedCol || !outcomeCol || !positive) ? 0.5 : 1 }}>
            Calcola fairness
          </button>

          {report && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-4 mb-3 text-[12px]">
                <Metric k="Statistical Parity Diff" v={report.statisticalParityDiff.toFixed(3)} />
                <Metric k="Disparate Impact" v={report.disparateImpactRatio.toFixed(3)} />
                <div className="flex flex-col">
                  <span style={{ color: T.muted, fontSize: 10 }}>Regola dei 4/5 (DI≥0.8)</span>
                  <span style={{ color: report.fourFifthsPass ? T.green : T.red, fontWeight: 700 }}>{report.fourFifthsPass ? "PASS" : "FAIL"} <span style={{ color: T.faint, fontWeight: 400 }}>[verify]</span></span>
                </div>
                <div className="flex flex-col">
                  <span style={{ color: T.muted, fontSize: 10 }}>Rischio</span>
                  <span style={{ color: riskColor[report.riskLevel], fontWeight: 700, textTransform: "uppercase" }}>{report.riskLevel}</span>
                </div>
              </div>

              <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                <thead><tr style={{ color: T.muted, textAlign: "left" }}>
                  <th className="py-1">Gruppo</th><th>N</th><th>Selection rate</th>
                  {report.groundTruthAvailable && <><th>TPR</th><th>FPR</th></>}
                </tr></thead>
                <tbody>{report.groups.map(g => (
                  <tr key={g.group} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td className="py-1 font-medium">{g.group}{g.group === report.referenceGroup ? " ★" : ""}</td>
                    <td>{g.size.toLocaleString()}</td>
                    <td>{(g.selectionRate * 100).toFixed(1)}%</td>
                    {report.groundTruthAvailable && <><td>{g.tpr !== undefined ? (g.tpr * 100).toFixed(1) + "%" : "—"}</td><td>{g.fpr !== undefined ? (g.fpr * 100).toFixed(1) + "%" : "—"}</td></>}
                  </tr>
                ))}</tbody>
              </table>

              <div className="mt-2 text-[11px]" style={{ color: T.muted }}>
                {report.groundTruthAvailable
                  ? <>Equal Opportunity Diff: <b>{report.equalOpportunityDiff?.toFixed(3) ?? "—"}</b> · Equalized Odds Diff: <b>{report.equalizedOddsDiff?.toFixed(3) ?? "—"}</b></>
                  : <>Equal Opportunity / Equalized Odds: <b>non calcolabili senza colonna ground-truth</b>.</>}
              </div>

              {report.intersectional && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold" style={{ color: T.text }}>Intersezionale (min {MIN_CELL} per cella)</p>
                  {report.intersectionalDi !== undefined && (
                    <p className="text-[11px]" style={{ color: T.muted }}>SPD {report.intersectionalSpd?.toFixed(3)} · DI {report.intersectionalDi?.toFixed(3)}</p>
                  )}
                  <table className="w-full text-[11px] mt-1" style={{ borderCollapse: "collapse" }}>
                    <tbody>{report.intersectional.map(c => (
                      <tr key={c.cell} style={{ borderTop: `1px solid ${T.border}`, color: c.sufficient ? T.text : T.faint }}>
                        <td className="py-1">{c.cell}</td><td>{c.size}</td>
                        <td>{c.sufficient ? (c.selectionRate * 100).toFixed(1) + "%" : "campione insufficiente"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return <div className="flex flex-col"><span style={{ color: T.muted, fontSize: 10 }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>;
}

// ═══ §5 Representativeness Panel ════════════════════════════════════════════
export function RepresentativenessPanel({ datasets, rowsById }: { datasets: DatasetProfile[]; rowsById: Record<string, Row[]> }) {
  const withRows = datasets.filter(d => rowsById[d.id]?.length);
  const [dsId, setDsId] = useState(withRows[0]?.id ?? "");
  const ds = datasets.find(d => d.id === dsId);
  const [col, setCol] = useState("");
  const [refPct, setRefPct] = useState<Record<string, string>>({});
  const [source, setSource] = useState("");
  const [check, setCheck] = useState<RepresentativenessCheck | null>(null);

  const groups = useMemo(
    () => ds?.columns.find(c => c.name === col)?.categoricalDistribution?.map(v => v.value) ?? [],
    [ds, col]
  );

  function run() {
    const rows = rowsById[dsId];
    if (!rows || !col) return;
    const reference = groups.map(g => ({ group: g, expectedPct: parseFloat(refPct[g] ?? "") || 0 })).filter(r => r.expectedPct > 0);
    setCheck(computeRepresentativeness(rows, col, reference, source || undefined));
  }

  const verdictColor: Record<string, string> = { representative: T.green, review: T.amber, not_representative: T.red, no_reference: T.muted };

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Rappresentatività vs popolazione di riferimento — Art. 10(3)</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>Total Variation Distance vs proporzioni attese dichiarate. [verify]</p>
      {withRows.length === 0 ? (
        <div style={{ ...card, color: T.muted }} className="text-[12px]">Carica un dataset in questa sessione per valutare la rappresentatività.</div>
      ) : (
        <div style={card}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label style={label}>Dataset</label>
              <select style={inp} value={dsId} onChange={e => { setDsId(e.target.value); setCol(""); setCheck(null); }}>
                {withRows.map(d => <option key={d.id} value={d.id}>{d.fileName}</option>)}
              </select></div>
            <div><label style={label}>Colonna (carattere)</label>
              <select style={inp} value={col} onChange={e => { setCol(e.target.value); setRefPct({}); setCheck(null); }}>
                <option value="">Seleziona…</option>
                {(ds?.columns ?? []).filter(c => c.categoricalDistribution).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select></div>
          </div>
          {groups.length > 0 && (
            <div className="mb-3">
              <label style={label}>Proporzioni attese (%) — popolazione di riferimento</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groups.map(g => (
                  <div key={g} className="flex items-center gap-1">
                    <span className="text-[11px] truncate flex-1" style={{ color: T.text }}>{g}</span>
                    <input type="number" style={{ ...inp, width: 70 }} value={refPct[g] ?? ""} onChange={e => setRefPct(p => ({ ...p, [g]: e.target.value }))} placeholder="%" />
                  </div>
                ))}
              </div>
              <input style={{ ...inp, marginTop: 8 }} value={source} onChange={e => setSource(e.target.value)} placeholder="Fonte del riferimento (es. ISTAT 2024, bacino d'utenza…)" />
            </div>
          )}
          <button onClick={run} disabled={!col}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: T.dark, color: "#fff", border: "none", cursor: "pointer", opacity: !col ? 0.5 : 1 }}>
            Valuta rappresentatività
          </button>

          {check && (
            <div className="mt-4">
              {check.verdict === "no_reference" ? (
                <p className="text-[12px]" style={{ color: T.amber }}>Rappresentatività non valutabile senza una popolazione di riferimento dichiarata (Art. 10(3) [verify]). Mostrata solo la distribuzione osservata.</p>
              ) : (
                <div className="flex gap-4 mb-2 text-[12px]">
                  <Metric k="Total Variation Distance" v={check.totalVariationDistance.toFixed(3)} />
                  <div className="flex flex-col"><span style={{ color: T.muted, fontSize: 10 }}>Verdetto</span>
                    <span style={{ color: verdictColor[check.verdict], fontWeight: 700 }}>
                      {check.verdict === "representative" ? "Rappresentativo" : check.verdict === "review" ? "Da rivedere" : "Non rappresentativo"}
                    </span></div>
                </div>
              )}
              <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                <thead><tr style={{ color: T.muted, textAlign: "left" }}><th className="py-1">Gruppo</th><th>Osservato</th>{check.verdict !== "no_reference" && <><th>Atteso</th><th>Gap</th></>}</tr></thead>
                <tbody>{check.observed.map(o => {
                  const ref = check.reference.find(r => r.group.toLowerCase() === o.group.toLowerCase());
                  const gap = check.perGroupGap.find(g => g.group.toLowerCase() === o.group.toLowerCase());
                  return (
                    <tr key={o.group} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td className="py-1 font-medium">{o.group}</td><td>{o.observedPct}%</td>
                      {check.verdict !== "no_reference" && <><td>{ref ? ref.expectedPct + "%" : "—"}</td><td style={{ color: (gap?.gapPct ?? 0) > 10 ? T.red : T.text }}>{gap ? gap.gapPct + "%" : "—"}</td></>}
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ═══ §10 Tabella mappatura ISO ══════════════════════════════════════════════
const ISO_ROWS = [
  ["Completezza, unicità, consistenza, outlier", "Art. 10(3)", "ISO/IEC 5259 (data quality ML)"],
  ["Provenance, origine, finalità raccolta", "Art. 10(2)(b)", "ISO/IEC 42001 Annex A.4.3"],
  ["Preparazione (annotazione, pulizia…)", "Art. 10(2)(c)", "ISO/IEC 5259-3; ISO/IEC 8183"],
  ["Esame bias / fairness metrics", "Art. 10(2)(f)", "ISO/IEC TR 24027 (bias in AI)"],
  ["Rappresentatività vs riferimento", "Art. 10(3)", "ISO/IEC TR 24027; ISO/IEC 5259"],
  ["Categorie particolari", "Art. 10(5)", "ISO/IEC 42001 A.4.3 + Art. 9 GDPR"],
  ["Impact assessment collegato", "Art. 10(5)→27/35", "ISO/IEC 42001 §6.1.4 / §8.4"],
];
export function IsoMappingTable() {
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Standard applicati</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>Sigle ISO a memoria — il legale conferma prima del rilascio. Tutte [verify].</p>
      <div style={card}>
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ color: T.muted, textAlign: "left" }}><th className="py-1">Pratica / metrica</th><th>AI Act</th><th>ISO/IEC</th></tr></thead>
          <tbody>{ISO_ROWS.map(r => (
            <tr key={r[0]} style={{ borderTop: `1px solid ${T.border}` }}>
              <td className="py-1.5" style={{ color: T.text }}>{r[0]}</td>
              <td style={{ color: T.muted }}>{r[1]}</td>
              <td style={{ color: T.muted }}>{r[2]} <span style={{ color: T.faint }}>[verify]</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

// ═══ §9 Export JSON (Data Governance Statement) ═════════════════════════════
export function exportDataGovernanceJSON(record: DataAuditRecord) {
  const statement = {
    kind: "Data Governance Statement (Art. 10 / Allegato IV [verify])",
    generatedAt: new Date().toISOString(),
    record,
  };
  const blob = new Blob([JSON.stringify(statement, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `data-governance-statement-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
