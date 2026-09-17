"use client";
import React, { useMemo } from "react";
import { CSSProperties } from "react";
import type { ImportedLogSet, LogVaultRecord, RetentionAssessment } from "@/lib/logvault/logvault-types";
import { computeRetention } from "@/lib/logvault/log-analyzer";
import { TRACEABILITY_PURPOSES } from "@/lib/logvault/traceability-purposes";
import { useT } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.22)", border: "rgba(0,0,0,0.08)",
  card: "#fff", bg: "#f9f9fb", red: "#dc2626", amber: "#d97706", green: "#15803d", dark: "#0D1016",
} as const;
const card: CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 };
const inp: CSSProperties = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.card, outline: "none" };
const label: CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.muted, marginBottom: 5, display: "block" };
const scoreColor = (v: number) => v >= 90 ? T.green : v >= 60 ? T.amber : T.red;

// ═══ §4 Qualità & continuità ════════════════════════════════════════════════
export function LogQualityCard({ logSets, t }: { logSets: ImportedLogSet[]; t: TFn }) {
  if (logSets.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>{t("q_title")}</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>ISO/IEC 42001 A.9 (event logs) · ISO/IEC 27001 A.8.15 (logging)</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {logSets.map(ls => {
          const q = ls.qualityFindings;
          if (!q) return null;
          return (
            <div key={ls.id} style={card}>
              <p className="text-[11px] font-semibold mb-2 truncate" style={{ color: T.text }}>{ls.fileName}</p>
              <div className="flex gap-4 mb-2">
                <Stat k={t("q_validTimestamps")} v={`${q.timestampValidPct}%`} c={scoreColor(q.timestampValidPct)} />
                <Stat k={t("q_avgFillRate")} v={`${Math.round(q.overallFieldFillRate * 100)}%`} c={scoreColor(q.overallFieldFillRate * 100)} />
                <Stat k={t("q_outOfOrder")} v={String(q.outOfOrderCount)} c={q.outOfOrderCount > 0 ? T.amber : T.green} />
                <Stat k={t("q_duplicates")} v={String(q.duplicateCount)} c={q.duplicateCount > 0 ? T.amber : T.green} />
              </div>
              {q.chronologicalGaps.length > 0 ? (
                <div className="text-[10px]" style={{ color: T.red }}>
                  <b>{q.chronologicalGaps.length} {t("q_chronoGaps")}</b> {t("q_possibleLoss")}
                  <ul className="mt-1" style={{ listStyle: "disc", paddingLeft: 16, color: T.muted }}>
                    {q.chronologicalGaps.slice(0, 3).map((g, i) => (
                      <li key={i}>{g.start.slice(0, 16)} → {g.end.slice(0, 16)} ({g.durationHours}h)</li>
                    ))}
                    {q.chronologicalGaps.length > 3 && <li>+{q.chronologicalGaps.length - 3} {t("q_others")}</li>}
                  </ul>
                </div>
              ) : <p className="text-[10px]" style={{ color: T.green }}>{t("q_noGaps")}</p>}
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
export function IntegrityCard({ logSets, t }: { logSets: ImportedLogSet[]; t: TFn }) {
  if (logSets.length === 0) return null;
  const statusLabel: Record<string, { label: string; c: string }> = {
    verified: { label: t("i_verified"), c: T.green },
    broken: { label: t("i_broken"), c: T.red },
    no_integrity_fields: { label: t("i_noFields"), c: T.muted },
  };
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>{t("i_title")}</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>{t("i_subtitle")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {logSets.map(ls => {
          const s = ls.integrity;
          const st = s ? statusLabel[s.status] : null;
          return (
            <div key={ls.id} style={card}>
              <p className="text-[11px] font-semibold mb-2 truncate" style={{ color: T.text }}>{ls.fileName}</p>
              {st && (
                <p className="text-[12px] font-semibold mb-1" style={{ color: st.c }}>
                  {st.label}{s?.status === "broken" && s.brokenAtEntry ? ` ${t("i_atEntry")} #${s.brokenAtEntry}` : ""}
                </p>
              )}
              {s?.status !== "no_integrity_fields" && s?.checkedCount ? (
                <p className="text-[10px]" style={{ color: T.muted }}>{s.checkedCount} {t("i_linksVerified")}</p>
              ) : s?.status === "no_integrity_fields" ? (
                <p className="text-[10px]" style={{ color: T.muted }}>{t("i_noHashFields")}</p>
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
export function CoverageFillRatePanel({ record, t }: { record: LogVaultRecord; t: TFn }) {
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
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>{t("cf_title")}</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>{t("cf_subtitle")}</p>
      <div style={card}>
        {TRACEABILITY_PURPOSES.map(p => {
          const cov = record.traceabilityCoverage.find(c => c.purposeId === p.id);
          const fields = cov?.evidenceFields ?? [];
          const best = fields.reduce((mx, f) => Math.max(mx, fillMap.get(f) ?? 0), 0);
          const status = fields.length === 0 ? "no" : best >= 0.95 ? "yes" : best > 0 ? "partial" : "no";
          const col = status === "yes" ? T.green : status === "partial" ? T.amber : T.red;
          const stLabel = status === "yes" ? t("cf_covered") : status === "partial" ? t("cf_partial") : t("cf_notCovered");
          return (
            <div key={p.id} className="flex items-start justify-between gap-3 py-2" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="flex-1">
                <p className="text-[12px] font-medium" style={{ color: T.text }}>{p.label}</p>
                <p className="text-[10px]" style={{ color: T.muted }}>{p.reference} · {t("cf_fields")} {fields.length ? fields.join(", ") : t("cf_noFieldMapped")}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px] font-bold" style={{ color: col }}>{stLabel}</div>
                {fields.length > 0 && <div className="text-[10px]" style={{ color: T.muted }}>{Math.round(best * 100)}% {t("cf_filled")}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══ §5 Ritenzione calcolata ════════════════════════════════════════════════
export function RetentionPanel({ record, onChange, t }: { record: LogVaultRecord; onChange: (r: RetentionAssessment) => void; t: TFn }) {
  const r = record.retention;
  const recompute = (role: RetentionAssessment["role"], months?: number) =>
    onChange(computeRetention(record.importedLogSets, role, months));

  const verdictInfo: Record<string, { label: string; c: string }> = {
    pass: { label: t("r_compliant"), c: T.green },
    below_minimum: { label: t("r_belowMin"), c: T.red },
    policy_below_span: { label: t("r_policyBelow"), c: T.amber },
    unknown: { label: t("r_toComplete"), c: T.muted },
  };
  const vi = verdictInfo[r.verdict];

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>{t("r_title")}</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>{t("r_subtitle")}</p>
      <div style={card}>
        <div className="flex flex-wrap gap-3 mb-3">
          <div><label style={label}>{t("r_role")}</label>
            <select style={inp} value={r.role} onChange={e => recompute(e.target.value as RetentionAssessment["role"], r.retentionPolicyMonths)}>
              <option value="unspecified">{t("r_select")}</option>
              <option value="provider">Provider</option>
              <option value="deployer">Deployer</option>
            </select></div>
          <div><label style={label}>{t("r_policyMonths")}</label>
            <input type="number" min={0} style={{ ...inp, width: 120 }} value={r.retentionPolicyMonths ?? ""}
              onChange={e => recompute(r.role, e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))} /></div>
        </div>
        <div className="flex flex-wrap gap-5 text-[12px]">
          <div><span style={{ color: T.muted, fontSize: 10 }}>{t("r_spanCovered")}</span><div style={{ fontWeight: 700 }}>{r.retentionSpanMonths !== undefined ? `${r.retentionSpanMonths} ${t("r_months")}` : "—"}</div></div>
          <div><span style={{ color: T.muted, fontSize: 10 }}>{t("r_policyDeclared")}</span><div style={{ fontWeight: 700 }}>{r.retentionPolicyMonths !== undefined ? `${r.retentionPolicyMonths} ${t("r_months")}` : "—"}</div></div>
          <div><span style={{ color: T.muted, fontSize: 10 }}>{t("r_verdict")}</span><div style={{ fontWeight: 700, color: vi.c }}>{vi.label}</div></div>
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
  const t = useT("toolLogvault");
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: T.text }}>{t("iso_title")}</h2>
      <p className="text-[11px] mb-3" style={{ color: T.muted }}>{t("iso_subtitle")}</p>
      <div style={card}>
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ color: T.muted, textAlign: "left" }}><th className="py-1">{t("iso_control")}</th><th>AI Act</th><th>ISO/IEC</th></tr></thead>
          <tbody>{ISO_ROWS.map(row => (
            <tr key={row[0]} style={{ borderTop: `1px solid ${T.border}` }}>
              <td className="py-1.5" style={{ color: T.text }}>{row[0]}</td>
              <td style={{ color: T.muted }}>{row[1]}</td>
              <td style={{ color: T.muted }}>{row[2]} <span style={{ color: T.faint }}></span></td>
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
