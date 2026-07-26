"use client";
import React, { useMemo } from "react";
import { CSSProperties } from "react";
import type { ImportedLogSet, LogVaultRecord, RetentionAssessment } from "@/lib/logvault/logvault-types";
import { computeRetention } from "@/lib/logvault/log-analyzer";
import { TRACEABILITY_PURPOSES } from "@/lib/logvault/traceability-purposes";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f9f9fb", red: "#dc2626", amber: "#d97706", green: "#15803d", dark: "#0D1016",
} as const;
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 };
const inp: CSSProperties = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const label: CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.muted, marginBottom: 5, display: "block" };
const scoreColor = (v: number) => v >= 90 ? T.green : v >= 60 ? T.amber : T.red;

// ═══ §4 Qualità & continuità ════════════════════════════════════════════════
export function LogQualityCard({ logSets }: { logSets: ImportedLogSet[] }) {
  if (logSets.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Qualità del registro</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>ISO/IEC 42001 A.9 (event logs) · ISO/IEC 27001 A.8.15 (logging) [verify]</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {logSets.map(ls => {
          const q = ls.qualityFindings;
          if (!q) return null;
          return (
            <div key={ls.id} style={card}>
              <p className="text-[11px] font-semibold mb-2 truncate" style={{ color: T.text }}>{ls.fileName}</p>
              <div className="flex gap-4 mb-2">
                <Stat k="Timestamp validi" v={`${q.timestampValidPct}%`} c={scoreColor(q.timestampValidPct)} />
                <Stat k="Fill-rate medio" v={`${Math.round(q.overallFieldFillRate * 100)}%`} c={scoreColor(q.overallFieldFillRate * 100)} />
                <Stat k="Fuori ordine" v={String(q.outOfOrderCount)} c={q.outOfOrderCount > 0 ? T.amber : T.green} />
                <Stat k="Duplicati" v={String(q.duplicateCount)} c={q.duplicateCount > 0 ? T.amber : T.green} />
              </div>
              {q.chronologicalGaps.length > 0 ? (
                <div className="text-[10px]" style={{ color: T.red }}>
                  <b>{q.chronologicalGaps.length} buchi cronologici</b> (possibile perdita log · Art. 12):
                  <ul className="mt-1" style={{ listStyle: "disc", paddingLeft: 16, color: T.muted }}>
                    {q.chronologicalGaps.slice(0, 3).map((g, i) => (
                      <li key={i}>{g.start.slice(0, 16)} → {g.end.slice(0, 16)} ({g.durationHours}h)</li>
                    ))}
                    {q.chronologicalGaps.length > 3 && <li>+{q.chronologicalGaps.length - 3} altri</li>}
                  </ul>
                </div>
              ) : <p className="text-[10px]" style={{ color: T.green }}>Nessun buco cronologico oltre soglia.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
function Stat({ k, v, c }: { k: string; v: string; c: string }) {
  return <div><div className="text-[16px] font-bold" style={{ color: c }}>{v}</div><div className="text-[9px]" style={{ color: T.muted }}>{k}</div></div>;
}

// ═══ §6 Integrità & tamper-evidence ═════════════════════════════════════════
export function IntegrityCard({ logSets }: { logSets: ImportedLogSet[] }) {
  if (logSets.length === 0) return null;
  const statusLabel: Record<string, { t: string; c: string }> = {
    verified: { t: "Catena verificata", c: T.green },
    broken: { t: "Catena interrotta", c: T.red },
    no_integrity_fields: { t: "Nessun campo di integrità", c: T.muted },
  };
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Integrità</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>ISO/IEC 27037 (integrità dell&apos;evidenza digitale) [verify]</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {logSets.map(ls => {
          const s = ls.integrity;
          const st = s ? statusLabel[s.status] : null;
          return (
            <div key={ls.id} style={card}>
              <p className="text-[11px] font-semibold mb-2 truncate" style={{ color: T.text }}>{ls.fileName}</p>
              {st && (
                <p className="text-[12px] font-semibold mb-1" style={{ color: st.c }}>
                  {st.t}{s?.status === "broken" && s.brokenAtEntry ? ` alla voce #${s.brokenAtEntry}` : ""}
                </p>
              )}
              {s?.status !== "no_integrity_fields" && s?.checkedCount ? (
                <p className="text-[10px]" style={{ color: T.muted }}>{s.checkedCount} collegamenti verificati (prev_hash → hash)</p>
              ) : s?.status === "no_integrity_fields" ? (
                <p className="text-[10px]" style={{ color: T.muted }}>I log non contengono campi hash/prev_hash: verifica catena non applicabile.</p>
              ) : null}
              {ls.fingerprint && (
                <p className="text-[10px] mt-2" style={{ color: T.faint, fontFamily: "monospace" }}>
                  fingerprint {ls.fingerprint.slice(0, 8)}… · {ls.analyzedAt?.slice(0, 10)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══ §3 Copertura per finalità (fill-rate reale) ════════════════════════════
export function CoverageFillRatePanel({ record }: { record: LogVaultRecord }) {
  const fillMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const ls of record.importedLogSets) for (const fr of ls.fieldFillRates) {
      m.set(fr.field, Math.max(m.get(fr.field) ?? 0, fr.fillRate));
    }
    return m;
  }, [record.importedLogSets]);

  if (record.importedLogSets.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Copertura per finalità — riempimento reale</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>Art. 12(2)(a-c). &quot;Coperto&quot; richiede un campo mappato valorizzato ≥ 95% delle voci — non la sola presenza.</p>
      <div style={card}>
        {TRACEABILITY_PURPOSES.map(p => {
          const cov = record.traceabilityCoverage.find(c => c.purposeId === p.id);
          const fields = cov?.evidenceFields ?? [];
          const best = fields.reduce((mx, f) => Math.max(mx, fillMap.get(f) ?? 0), 0);
          const status = fields.length === 0 ? "no" : best >= 0.95 ? "yes" : best > 0 ? "partial" : "no";
          const col = status === "yes" ? T.green : status === "partial" ? T.amber : T.red;
          const stLabel = status === "yes" ? "Coperto" : status === "partial" ? "Parziale" : "Non coperto";
          return (
            <div key={p.id} className="flex items-start justify-between gap-3 py-2" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="flex-1">
                <p className="text-[12px] font-medium" style={{ color: T.text }}>{p.label}</p>
                <p className="text-[10px]" style={{ color: T.muted }}>{p.reference} · campi: {fields.length ? fields.join(", ") : "— nessun campo mappato"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px] font-bold" style={{ color: col }}>{stLabel}</div>
                {fields.length > 0 && <div className="text-[10px]" style={{ color: T.muted }}>{Math.round(best * 100)}% valorizzato</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══ §5 Ritenzione calcolata ════════════════════════════════════════════════
export function RetentionPanel({ record, onChange }: { record: LogVaultRecord; onChange: (r: RetentionAssessment) => void }) {
  const r = record.retention;
  const recompute = (role: RetentionAssessment["role"], months?: number) =>
    onChange(computeRetention(record.importedLogSets, role, months));

  const verdictInfo: Record<string, { t: string; c: string }> = {
    pass: { t: "Conforme", c: T.green },
    below_minimum: { t: "Sotto il minimo di legge", c: T.red },
    policy_below_span: { t: "Politica inferiore al periodo coperto", c: T.amber },
    unknown: { t: "Da completare", c: T.muted },
  };
  const vi = verdictInfo[r.verdict];

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Ritenzione dei log</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>Art. 26(6) / Art. 12. Minimo 6 mesi per il deployer salvo diverso obbligo di legge.</p>
      <div style={card}>
        <div className="flex flex-wrap gap-3 mb-3">
          <div><label style={label}>Ruolo</label>
            <select style={inp} value={r.role} onChange={e => recompute(e.target.value as RetentionAssessment["role"], r.retentionPolicyMonths)}>
              <option value="unspecified">Seleziona…</option>
              <option value="provider">Provider</option>
              <option value="deployer">Deployer</option>
            </select></div>
          <div><label style={label}>Politica di conservazione (mesi)</label>
            <input type="number" min={0} style={{ ...inp, width: 120 }} value={r.retentionPolicyMonths ?? ""}
              onChange={e => recompute(r.role, e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))} /></div>
        </div>
        <div className="flex flex-wrap gap-5 text-[12px]">
          <div><span style={{ color: T.muted, fontSize: 10 }}>Periodo coperto dai log</span><div style={{ fontWeight: 700 }}>{r.retentionSpanMonths !== undefined ? `${r.retentionSpanMonths} mesi` : "—"}</div></div>
          <div><span style={{ color: T.muted, fontSize: 10 }}>Politica dichiarata</span><div style={{ fontWeight: 700 }}>{r.retentionPolicyMonths !== undefined ? `${r.retentionPolicyMonths} mesi` : "—"}</div></div>
          <div><span style={{ color: T.muted, fontSize: 10 }}>Esito</span><div style={{ fontWeight: 700, color: vi.c }}>{vi.t}</div></div>
        </div>
      </div>
    </section>
  );
}

// ═══ §10 Tabella mappatura ISO ══════════════════════════════════════════════
const ISO_ROWS = [
  ["Registrazione eventi / event logs", "Art. 12(1), Art. 19", "ISO/IEC 42001 A.9; 27001 A.8.15"],
  ["Copertura finalità di tracciabilità", "Art. 12(2)(a-c)", "ISO/IEC 42001 §8.4; A.9"],
  ["Qualità/continuità (gap, duplicati)", "Art. 12", "ISO/IEC 27001 A.8.15; 5259"],
  ["Verifica integrità / hash-chain", "Art. 12(1)", "ISO/IEC 27037"],
  ["Ritenzione log", "Art. 26(6)", "ISO/IEC 42001 A.9; policy interna"],
  ["Log biometrici", "Art. 12(3)(a-d)", "ISO/IEC 42001 A.9 + Art. 14(5)"],
];
export function LogIsoTable() {
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>Standard applicati</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>Sigle a memoria — conferma del legale prima del rilascio. Tutte [verify].</p>
      <div style={card}>
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ color: T.muted, textAlign: "left" }}><th className="py-1">Controllo</th><th>AI Act</th><th>ISO/IEC</th></tr></thead>
          <tbody>{ISO_ROWS.map(row => (
            <tr key={row[0]} style={{ borderTop: `1px solid ${T.border}` }}>
              <td className="py-1.5" style={{ color: T.text }}>{row[0]}</td>
              <td style={{ color: T.muted }}>{row[1]}</td>
              <td style={{ color: T.muted }}>{row[2]} <span style={{ color: T.faint }}>[verify]</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

// ═══ §9 Export Log Conformity Statement ═════════════════════════════════════
export function exportLogConformityJSON(record: LogVaultRecord) {
  const statement = {
    kind: "Log Conformity Statement (Art. 12 / Allegato IV)",
    generatedAt: new Date().toISOString(),
    record,
  };
  const blob = new Blob([JSON.stringify(statement, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `log-conformity-statement-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
