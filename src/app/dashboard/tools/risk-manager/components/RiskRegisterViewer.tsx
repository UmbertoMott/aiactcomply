"use client";

// Viewer centrale del Registro dei Rischi (Art. 9 EU AI Act).
// Sola lettura: traduce lo stato del Risk Manager in un documento strutturato
// secondo il template Registro_Rischi_Template_AI_Act_Art9.docx.
// Regola n. 1: le sezioni senza dati NON vengono mostrate.

import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import {
  VERIFY_NOTE_IT,
  type RiskRegisterDocument,
} from "@/lib/risk/risk-register-types";
import {
  computeRiskScore, riskBand, BAND_COLORS,
  entryCompleteness, missingFields,
  computeRegisterProgress, computeReviewAlerts,
} from "@/lib/risk/risk-register-progress";
import type { AnnexSection } from "@/lib/risk/risk-register-mapper";

const SANS = "var(--font-inter, system-ui)";

const ID_LABELS: Array<[keyof RiskRegisterDocument["identification"], string]> = [
  ["systemName", "Nome del sistema AI"],
  ["providerDeployerRole", "Provider / Deployer (ruolo)"],
  ["descriptionAndPurpose", "Descrizione e finalità prevista"],
  ["riskTier", "Tier di rischio"],
  ["annexIIIArea", "Area Allegato III applicabile"],
  ["applicableArticles", "Articoli AI Act applicabili"],
  ["personalDataProcessed", "Dati personali trattati"],
  ["legalBasis", "Base giuridica"],
  ["humanOversightRequired", "Supervisione umana richiesta (Art. 14)"],
  ["registerOwner", "Responsabile del registro (risk owner)"],
];

const STATUS_LABELS: Record<string, string> = {
  open: "Aperto", assessing: "In valutazione", mitigating: "Mitigazione in corso",
  mitigated: "Mitigato", accepted: "Accettato", transferred: "Trasferito",
};

const TIER_LABELS: Record<string, string> = {
  minimal: "Minimal", limited: "Limited", high_risk: "High-risk", gpai: "GPAI", unclassified: "Non classificato",
};

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0D1016", margin: "22px 0 10px", borderBottom: "1px solid rgba(0,0,0,0.15)", paddingBottom: 5 }}>
      {num}. {title}
    </h4>
  );
}

function AiBadge() {
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
      background: "rgba(217,119,6,0.08)", color: "#b45309",
      border: "1px solid rgba(217,119,6,0.25)", whiteSpace: "nowrap",
      fontFamily: SANS, verticalAlign: "middle", marginLeft: 4,
    }}>
      ✦ AI — verifica e conferma
    </span>
  );
}

export function RiskRegisterViewer({ doc, annexes }: { doc: RiskRegisterDocument; annexes: AnnexSection[] }) {
  const progress = computeRegisterProgress(doc);
  const alerts = computeReviewAlerts(doc);

  const id = doc.identification;
  const idRows = ID_LABELS.map(([key, label]) => {
    let v: unknown = id[key];
    if (key === "riskTier") v = v === "unclassified" ? undefined : TIER_LABELS[v as string] ?? v;
    if (key === "personalDataProcessed") v = v === "unspecified" ? undefined : v === "yes" ? "Sì" : "No";
    if (key === "humanOversightRequired") v = v === undefined ? undefined : v ? "Sì" : "No";
    if (Array.isArray(v)) v = v.length > 0 ? v.join(", ") : undefined;
    return [label, v] as const;
  }).filter(([, v]) => v !== undefined && v !== "");

  const hasIdentification = idRows.length > 0;
  const hasRisks = doc.risks.length > 0;
  const hasGap = !!doc.gapCheck?.coverageScore || (doc.gapCheck?.missingAreas.length ?? 0) > 0 || !!doc.gapCheck?.assessment;
  const hasReview = doc.reviewLog.length > 0 || alerts.length > 0;
  const hasSignOff = !!doc.signOff;
  const isEmpty = !hasIdentification && !hasRisks && !hasGap && !hasReview && !hasSignOff && annexes.length === 0;

  const incomplete = doc.risks.filter(r => entryCompleteness(r) !== "complete");

  return (
    <div>
      {/* ── Avanzamento compilazione (sans-serif, header del documento) ── */}
      <div style={{ fontFamily: SANS, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Avanzamento compilazione
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0D1016" }}>{progress.overallPercent}%</span>
        </div>
        <div style={{ width: "100%", height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: `${progress.overallPercent}%`, background: "#0D1016", borderRadius: 3, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {progress.sections.map(s => (
            <div key={s.key} style={{ flex: "1 1 90px", minWidth: 90 }}>
              <div style={{ fontSize: 8.5, color: "rgba(0,0,0,0.4)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.label} · {s.detail}
              </div>
              <div style={{ width: "100%", height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${s.percent}%`, background: s.percent === 100 ? "#16a34a" : "rgba(0,0,0,0.4)", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        {progress.blockingGaps.length > 0 && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: "#FEF3C7", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 6, display: "flex", gap: 6 }}>
            <AlertTriangle size={12} style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 10.5, color: "#92400e" }}>
              Gap obbligatori non risolti: {progress.blockingGaps.join("; ")}
            </span>
          </div>
        )}
      </div>

      {isEmpty && (
        <div style={{ textAlign: "center", padding: "40px 0", fontFamily: SANS }}>
          <Clock size={24} style={{ color: "rgba(0,0,0,0.15)", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", margin: 0 }}>
            Il registro si compila progressivamente con le risposte in chat.
          </p>
        </div>
      )}

      {/* ── Sezione 3 — Identificazione ── */}
      {hasIdentification && (
        <>
          <SectionTitle num="3" title="Identificazione del sistema AI e del contesto di conformità" />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <tbody>
              {idRows.map(([label, v]) => (
                <tr key={label} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "5px 8px 5px 0", fontWeight: 700, color: "#0D1016", width: "42%", verticalAlign: "top" }}>{label}</td>
                  <td style={{ padding: "5px 0", color: "#1a1a1a", lineHeight: 1.5 }}>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Sezione 5 — Registro dei rischi ── */}
      {hasRisks && (
        <>
          <SectionTitle num="5" title="Registro dei rischi" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: SANS }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0D1016" }}>
                  {["ID", "Rischio", "Rif. Art. 9", "P", "S", "R", "Fascia", "Mitigazioni", "Owner", "Stato", "Prox. rev."].map(h => (
                    <th key={h} style={{ padding: "4px 6px", textAlign: "left", fontWeight: 700, color: "#0D1016", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.risks.map(r => {
                  const score = computeRiskScore(r);
                  const band = riskBand(score);
                  const colors = BAND_COLORS[band];
                  const scale = { low: 1, medium: 2, high: 3 } as const;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", verticalAlign: "top" }}>
                      <td style={{ padding: "5px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {r.id}
                        {!r.aiConfirmed && r.source !== "manual" && <AiBadge />}
                      </td>
                      <td style={{ padding: "5px 6px", minWidth: 140 }}>
                        {r.category && <strong>{r.category}</strong>}{r.category && r.description ? " — " : ""}{r.description}
                      </td>
                      <td style={{ padding: "5px 6px", fontSize: 9.5, color: "rgba(0,0,0,0.55)", minWidth: 110 }}>{r.art9Reference}</td>
                      <td style={{ padding: "5px 6px" }}>{r.likelihood ? scale[r.likelihood] : "—"}</td>
                      <td style={{ padding: "5px 6px" }}>{r.impact ? scale[r.impact] : "—"}</td>
                      <td style={{ padding: "5px 6px", fontWeight: 700 }}>{score ?? "—"}</td>
                      <td style={{ padding: "5px 6px" }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 4, background: colors.bg, color: colors.fg, textTransform: "capitalize" }}>
                          {band}
                        </span>
                      </td>
                      <td style={{ padding: "5px 6px", minWidth: 120 }}>{r.mitigations ?? "—"}</td>
                      <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>{r.owner ?? "—"}</td>
                      <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>{STATUS_LABELS[r.status]}</td>
                      <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>{r.nextReviewDate ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {incomplete.length > 0 && (
            <div style={{ marginTop: 10, fontFamily: SANS }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
                Voci incomplete
              </p>
              {incomplete.map(r => (
                <p key={r.id} style={{ fontSize: 10.5, color: "#92400e", margin: "2px 0" }}>
                  {r.id} — manca: {missingFields(r).join(", ")}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Sezione 6 — Gap check ── */}
      {hasGap && doc.gapCheck && (
        <>
          <SectionTitle num="6" title="Verifica di copertura Art. 9 (gap check)" />
          {doc.gapCheck.coverageScore !== undefined && (
            <p style={{ fontSize: 13, margin: "0 0 6px" }}>
              <strong>Punteggio di copertura:</strong>{" "}
              <span style={{ fontSize: 19, fontWeight: 700 }}>{doc.gapCheck.coverageScore}</span>
              <span style={{ color: "rgba(0,0,0,0.4)" }}>/100</span>
            </p>
          )}
          {doc.gapCheck.assessment && (
            <p style={{ fontSize: 12.5, lineHeight: 1.65, margin: "0 0 10px", textAlign: "justify" }}>{doc.gapCheck.assessment}</p>
          )}
          {doc.gapCheck.missingAreas.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: SANS }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0D1016" }}>
                  {["Area non coperta", "Riferimento", "Priorità", "Rischio suggerito"].map(h => (
                    <th key={h} style={{ padding: "4px 6px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.gapCheck.missingAreas.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", verticalAlign: "top" }}>
                    <td style={{ padding: "5px 6px" }}>{a.area}</td>
                    <td style={{ padding: "5px 6px", fontSize: 9.5, color: "rgba(0,0,0,0.55)" }}>{a.art9Requirement}</td>
                    <td style={{ padding: "5px 6px" }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 4,
                        background: a.priority === "obbligatorio" ? "#FEE2E2" : "#FEF3C7",
                        color: a.priority === "obbligatorio" ? "#991b1b" : "#92400e",
                        textTransform: "capitalize",
                      }}>
                        {a.priority}
                      </span>
                    </td>
                    <td style={{ padding: "5px 6px" }}>{a.suggestedRiskTitle ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── Sezione 7 — Monitoraggio ── */}
      {hasReview && (
        <>
          <SectionTitle num="7" title="Monitoraggio continuo e ciclo di revisione" />
          {alerts.length > 0 && (
            <div style={{ marginBottom: 10, fontFamily: SANS }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 11 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 4, flexShrink: 0,
                    background: a.status === "overdue" ? "#FEE2E2" : a.status === "due_soon" ? "#FEF3C7" : "#f3f4f6",
                    color: a.status === "overdue" ? "#991b1b" : a.status === "due_soon" ? "#92400e" : "#6b7280",
                  }}>
                    {a.status === "overdue" ? "SCADUTA" : a.status === "due_soon" ? "ENTRO 30GG" : "PIANIFICATA"}
                  </span>
                  <span style={{ color: "#1a1a1a" }}>{a.label}</span>
                  <span style={{ color: "rgba(0,0,0,0.4)", marginLeft: "auto", whiteSpace: "nowrap" }}>{a.dueDate}</span>
                </div>
              ))}
            </div>
          )}
          {doc.reviewLog.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: SANS }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0D1016" }}>
                  {["Data", "Trigger", "Esito", "Revisore", "Prossima revisione"].map(h => (
                    <th key={h} style={{ padding: "4px 6px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.reviewLog.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>{e.date}</td>
                    <td style={{ padding: "5px 6px" }}>{e.trigger}</td>
                    <td style={{ padding: "5px 6px" }}>{e.outcome ?? "—"}</td>
                    <td style={{ padding: "5px 6px" }}>{e.reviewer ?? "—"}</td>
                    <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>{e.nextReviewDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── Sezione 8 — Sign-off ── */}
      {hasSignOff && doc.signOff && (
        <>
          <SectionTitle num="8" title="Approvazione e firme" />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {([
                ["Risk owner", doc.signOff.riskOwner],
                ["Responsabile compliance/legale", doc.signOff.complianceLegal],
                ["Rappresentante legale", doc.signOff.legalRepresentative],
              ] as const).map(([role, s]) => (
                <tr key={role} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "6px 8px 6px 0", fontWeight: 700, width: "40%" }}>{role}</td>
                  <td style={{ padding: "6px 0" }}>{s.name ?? "—"}</td>
                  <td style={{ padding: "6px 0", whiteSpace: "nowrap" }}>{s.date ?? ""}</td>
                  <td style={{ padding: "6px 0", textAlign: "right", fontFamily: SANS }}>
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, padding: "1px 8px", borderRadius: 4,
                      background: s.signed ? "#D1FAE5" : "#f3f4f6",
                      color: s.signed ? "#065f46" : "#6b7280",
                    }}>
                      {s.signed ? "FIRMATO" : "NON FIRMATO"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Allegati tecnici (fasi extra-template, solo se compilate) ── */}
      {annexes.map((annex, i) => (
        <div key={annex.title}>
          <SectionTitle num={`A${i + 1}`} title={`Allegato — ${annex.title} (${annex.article})`} />
          {Object.entries(annex.fields).map(([k, v]) => {
            const displayVal = Array.isArray(v) ? (v as string[]).join(", ") : typeof v === "boolean" ? (v ? "Sì" : "No") : String(v);
            const label = k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "#0D1016", margin: "0 0 2px" }}>{label}</p>
                <p style={{ fontSize: 12.5, color: "#1a1a1a", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{displayVal}</p>
              </div>
            );
          })}
        </div>
      ))}

      {/* Nota di verifica — sempre visibile in coda, mai troncata */}
      {!isEmpty && (
        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", fontStyle: "italic", marginTop: 22 }}>
          I riferimenti normativi contrassegnati con {VERIFY_NOTE_IT} richiedono conferma puntuale
          sul testo consolidato prima dell&apos;uso in un contesto di conformità formale.
          La compilazione del registro non sostituisce la valutazione legale qualificata.
        </p>
      )}
    </div>
  );
}
