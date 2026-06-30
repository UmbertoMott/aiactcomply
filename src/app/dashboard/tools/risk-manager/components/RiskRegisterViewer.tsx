"use client";

// Viewer del Registro dei Rischi — allineato 1:1 al Template Risk Register Guidato Art. 9
// Sezioni §0-§9 + Trasversale Comunicazione (ISO 23894 §6.2).
// Regola: sezioni senza dati mostrano placeholder "Da compilare" (struttura sempre visibile).

import React from "react";
import { Clock } from "lucide-react";
import {
  VERIFY_NOTE_IT,
  type RiskRegisterDocument,
} from "@/lib/risk/risk-register-types";
import {
  computeRiskScore, riskBand, BAND_COLORS,
  entryCompleteness, missingFields,
  computeReviewAlerts,
} from "@/lib/risk/risk-register-progress";
import type { AnnexSection } from "@/lib/risk/risk-register-mapper";

const SANS = "var(--font-inter, system-ui)";

// ─── Components ────────────────────────────────────────────────────────────────

function SectionTitle({ sectionId, num, title, article }: {
  sectionId?: string; num: string; title: string; article?: string;
}) {
  return (
    <div id={sectionId} data-noedit="true" style={{
      background: "#0D1016", color: "#ffffff",
      borderRadius: 6, padding: "11px 18px",
      margin: "20px 0 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: SANS }}>{num}. {title}</span>
      {article && (
        <span style={{ fontSize: 9.5, opacity: 0.5, letterSpacing: "0.05em", fontFamily: SANS, whiteSpace: "nowrap", marginLeft: 12 }}>
          {article}
        </span>
      )}
    </div>
  );
}

function Placeholder({ text = "Da compilare — rispondere in chat per popolare questa sezione." }: { text?: string }) {
  return (
    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.30)", fontStyle: "italic", padding: "8px 0", fontFamily: SANS, margin: 0 }}>
      {text}
    </p>
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

function KVTable({ rows }: { rows: Array<[string, string | undefined]> }) {
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0) return <Placeholder />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <tbody>
        {filled.map(([label, v]) => (
          <tr key={label} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <td data-noedit="true" style={{ padding: "5px 8px 5px 0", fontWeight: 700, color: "#0D1016", width: "42%", verticalAlign: "top" }}>{label}</td>
            <td style={{ padding: "5px 0", color: "#1a1a1a", lineHeight: 1.5 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BulletList({ items, emptyText }: { items: string[]; emptyText?: string }) {
  const filled = items.filter(Boolean);
  if (filled.length === 0) return <Placeholder text={emptyText} />;
  return (
    <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#1a1a1a", lineHeight: 1.6 }}>
      {filled.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

// ─── Labels & helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open: "Aperto", assessing: "In valutazione", mitigating: "Mitigazione in corso",
  mitigated: "Mitigato", accepted: "Accettato", transferred: "Trasferito",
};

const TIER_LABELS: Record<string, string> = {
  minimal: "Minimal", limited: "Limited", high_risk: "High-risk", gpai: "GPAI", unclassified: "Non classificato",
};

// ─── Main viewer ───────────────────────────────────────────────────────────────

export function RiskRegisterViewer({ doc, annexes }: { doc: RiskRegisterDocument; annexes: AnnexSection[] }) {
  const alerts = computeReviewAlerts(doc);

  const id = doc.identification;
  const hasAnyContent = !!(
    id.systemName || id.providerDeployerRole || id.riskAppetite || id.usageContext ||
    doc.risks.length > 0 || doc.estimation || doc.testValidation || doc.treatment ||
    doc.monitoringDetails || doc.gapCheck || doc.traceability || doc.dismissal ||
    doc.signOff || doc.communication || doc.reviewLog.length > 0 || annexes.length > 0
  );

  if (!hasAnyContent) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", fontFamily: SANS }}>
        <Clock size={24} style={{ color: "rgba(0,0,0,0.15)", margin: "0 auto 10px" }} />
        <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", margin: 0 }}>
          Il registro si compila progressivamente con le risposte in chat.
        </p>
      </div>
    );
  }

  const incomplete = doc.risks.filter(r => entryCompleteness(r) !== "complete");

  // ── §0 — Scoping e criteri di rischio ────────────────────────────────────────
  const scopingRows: Array<[string, string | undefined]> = [
    ["Nome del sistema AI", id.systemName],
    ["Provider / Deployer (ruolo)", id.providerDeployerRole],
    ["Descrizione e finalità prevista", id.descriptionAndPurpose],
    ["Tier di rischio", id.riskTier !== "unclassified" ? (TIER_LABELS[id.riskTier] ?? id.riskTier) : undefined],
    ["Area Allegato III applicabile", id.annexIIIArea],
    ["Articoli AI Act applicabili", id.applicableArticles?.length ? id.applicableArticles.join(", ") : undefined],
    ["Dati personali trattati", id.personalDataProcessed === "unspecified" ? undefined : id.personalDataProcessed === "yes" ? "Sì" : "No"],
    ["Base giuridica", id.legalBasis],
    ["Supervisione umana richiesta (Art. 14)", id.humanOversightRequired === undefined ? undefined : id.humanOversightRequired ? "Sì" : "No"],
    ["Responsabile del registro (risk owner)", id.registerOwner],
    ["Incorpora modello GPAI (Art. 51)", id.incorporatesGpaiModel === "unspecified" ? undefined : id.incorporatesGpaiModel === "yes" ? "Sì" : "No"],
    ["Fase del ciclo di vita coperta", id.lifeCyclePhase],
    ["Criteri di accettabilità del rischio (risk appetite)", id.riskAppetite],
    ["Ambito e contesto d'uso", id.usageContext],
    ["Impatto su minori e gruppi vulnerabili (Art. 9(9))", id.vulnerableGroupsImpactAssessment],
  ];

  // ── §3 — Test e validazione ───────────────────────────────────────────────────
  const tv = doc.testValidation;
  const testRows: Array<[string, string | undefined]> = [
    ["Metriche e soglie predefinite", tv?.testMetrics?.length ? tv.testMetrics.join(" · ") : undefined],
    ["Soglie di accettabilità", tv?.thresholds],
    ["Esito della validazione", tv?.validationOutcome],
    ["Scenario peggiore (worst case)", tv?.worstCase],
    ["Livello di confidenza", tv?.confidenceLevel],
  ];

  // ── §4 — Trattamento del rischio ─────────────────────────────────────────────
  const tr = doc.treatment;
  const treatRows: Array<[string, string | undefined]> = [
    ["Opzione di trattamento scelta", tr?.treatmentOption],
    ["Misure di controllo (gerarchia Art. 9(5))", tr?.measures?.length ? tr.measures.join("; ") : undefined],
    ["Rischio residuo accettabile", tr?.residualRisk],
    ["Responsabile attuazione", tr?.responsiblePerson],
    ["Ciclo di revisione", tr?.reviewCycle],
  ];

  // ── §5 — Monitoraggio ────────────────────────────────────────────────────────
  const md = doc.monitoringDetails;
  const monRows: Array<[string, string | undefined]> = [
    ["Piano di monitoraggio post-market", md?.postMarketPlan],
    ["Frequenza di monitoraggio", md?.monitoringFrequency],
    ["Soglia di alert (PSI)", md?.alertThreshold],
    ["PSI score corrente", md?.psiScore !== undefined ? String(md.psiScore) : undefined],
    ["Deriva (drift) rilevata", md?.driftDetected !== undefined ? (md.driftDetected ? "Sì — azione richiesta" : "No — sistema stabile") : undefined],
  ];

  // ── §7 — Tracciabilità ───────────────────────────────────────────────────────
  const trc = doc.traceability;
  const tracRows: Array<[string, string | undefined]> = [
    ["Versioni tracciate", trc?.versionsTracked !== undefined ? String(trc.versionsTracked) : undefined],
    ["Data ultimo audit", trc?.lastAuditDate],
    ["Modifiche registrate", trc?.changes?.length ? trc.changes.join("; ") : undefined],
    ["Policy di retention dei log", trc?.retentionPolicy],
    ["Integrazione nel QMS (Art. 17)", trc?.qmsIntegration],
  ];

  // ── §8 — Dismissione ─────────────────────────────────────────────────────────
  const dis = doc.dismissal;
  const disRows: Array<[string, string | undefined]> = [
    ["Rischi della fase di dismissione", dis?.dismissalRisks],
    ["Cancellazione / anonimizzazione dati residui", dis?.dataDeletion],
    ["Dipendenze a valle da gestire", dis?.downstreamDependencies],
    ["Comunicazione del ritiro ai deployer", dis?.communicationToDeployers],
  ];

  // ── Trasversale — Comunicazione ───────────────────────────────────────────────
  const comm = doc.communication;
  const commRows: Array<[string, string | undefined]> = [
    ["Stakeholder interni coinvolti", comm?.stakeholdersInvolved],
    ["Consultatati esterni", comm?.externalConsultees],
    ["Collegamento alla FRIA", comm?.friaLink],
    ["Consultazione documentata", comm?.consultationDocumented !== undefined ? (comm.consultationDocumented ? "Sì" : "No") : undefined],
  ];

  return (
    <div>

      {/* ── §0 — Scoping e criteri di rischio ──────────────────────────────── */}
      <SectionTitle sectionId="sec-scoping" num="§0" title="Scoping e criteri di rischio" article="Art. 9(1) · Art. 6/Annex III" />
      <KVTable rows={scopingRows} />

      {/* ── §1 — Identificazione e catalogo dei rischi ─────────────────────── */}
      <SectionTitle sectionId="sec-risks" num="§1" title="Identificazione e catalogo dei rischi" article="Art. 9(2)(a) + 9(9)" />
      {doc.risks.length > 0 ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: SANS }}>
              <thead data-noedit="true">
                <tr style={{ borderBottom: "2px solid #0D1016" }}>
                  {["ID", "Categoria · Rischio", "Rif. Art. 9", "P", "S", "R", "Fascia", "Mitigazioni", "Owner", "Stato", "Prox. rev."].map(h => (
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
            <div style={{ marginTop: 10 }}>
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
      ) : (
        <Placeholder text="Da compilare — avviare il passo 2 (Identificazione Rischi) in chat." />
      )}

      {/* ── §2 — Stima e valutazione ────────────────────────────────────────── */}
      <SectionTitle sectionId="sec-estimation" num="§2" title="Stima e valutazione" article="Art. 9(2)(b)" />
      {doc.estimation ? (
        <>
          {doc.estimation.intendedUseCases.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.5)", margin: "0 0 4px" }}>Usi previsti</p>
              <BulletList items={doc.estimation.intendedUseCases} />
            </div>
          )}
          {doc.estimation.foreseenMisuse.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.5)", margin: "0 0 4px" }}>Usi impropri ragionevolmente prevedibili</p>
              <BulletList items={doc.estimation.foreseenMisuse} />
            </div>
          )}
          <KVTable rows={[
            ["Stima del rischio e impatto sulle persone", doc.estimation.impactAssessment],
            ["Persone coinvolte (stima)", doc.estimation.affectedPersonsCount],
            ["Valutazione vs criteri di accettabilità (§0)", doc.estimation.evaluationAgainstCriteria],
          ]} />
        </>
      ) : (
        <Placeholder text="Da compilare — avviare il passo 3 (Stima e Valutazione) in chat." />
      )}

      {/* ── §3 — Test e validazione ─────────────────────────────────────────── */}
      <SectionTitle sectionId="sec-testing" num="§3" title="Test e validazione" article="Art. 9(6)-(8) · Art. 60" />
      {doc.testValidation ? (
        <KVTable rows={testRows} />
      ) : (
        <Placeholder text="Da compilare — avviare il passo 4 (Test e Validazione) in chat." />
      )}

      {/* ── §4 — Trattamento del rischio e rischio residuo ──────────────────── */}
      <SectionTitle sectionId="sec-treatment" num="§4" title="Trattamento del rischio e rischio residuo" article="Art. 9(2)(d) · 9(4)-(5) · Art. 13" />
      {doc.treatment ? (
        <KVTable rows={treatRows} />
      ) : (
        <Placeholder text="Da compilare — avviare il passo 5 (Trattamento Rischio) in chat." />
      )}

      {/* ── §5 — Monitoraggio post-market e drift ───────────────────────────── */}
      <SectionTitle sectionId="sec-monitoring" num="§5" title="Monitoraggio post-market e drift" article="Art. 9(2)(c) · Art. 72" />
      {(doc.monitoringDetails || doc.reviewLog.length > 0 || alerts.length > 0) ? (
        <>
          <KVTable rows={monRows} />
          {alerts.length > 0 && (
            <div style={{ marginTop: 10, fontFamily: SANS }}>
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
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
                Cadenza di riesame per rischio — log revisioni
              </p>
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
            </div>
          )}
        </>
      ) : (
        <Placeholder text="Da compilare — avviare il passo 6 (Monitoraggio Post-Market) in chat." />
      )}

      {/* ── §6 — Verifica di copertura Art. 9 (gap check) ──────────────────── */}
      <SectionTitle sectionId="sec-gap" num="§6" title="Verifica di copertura Art. 9 — gap check" article="Art. 9" />
      {doc.gapCheck ? (
        <>
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
                        background: a.priority === "obbligatorio" ? "#F3F3F3" : "#F8F8F8",
                        color: a.priority === "obbligatorio" ? "#0D1016" : "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(0,0,0,0.1)",
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
      ) : (
        <Placeholder text="Da compilare — avviare il passo 7 (Gap Check Art. 9) in chat." />
      )}

      {/* ── §7 — Tracciabilità e mantenimento continuo ──────────────────────── */}
      <SectionTitle sectionId="sec-traceability" num="§7" title="Tracciabilità e mantenimento continuo" article="Art. 9(1)-(2) · Art. 12, 17" />
      {doc.traceability ? (
        <KVTable rows={tracRows} />
      ) : (
        <Placeholder text="Da compilare — avviare il passo 8 (Tracciabilità) in chat." />
      )}

      {/* ── §8 — Dismissione / ritiro ───────────────────────────────────────── */}
      <SectionTitle sectionId="sec-dismissal" num="§8" title="Dismissione / ritiro" article="ISO 23894 Annex C · Art. 9" />
      {doc.dismissal ? (
        <KVTable rows={disRows} />
      ) : (
        <Placeholder text="Da compilare — avviare il passo 9 (Dismissione / Ritiro) in chat." />
      )}

      {/* ── §9 — Approvazione, firme e finalizzazione ───────────────────────── */}
      <SectionTitle sectionId="sec-signoff" num="§9" title="Approvazione, firme e finalizzazione" article="Art. 9(1) + 9(10)" />
      {doc.signOff ? (
        <>
          {doc.signOff.otherRegimesIntegration && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.5)", margin: "0 0 4px" }}>
                Integrazione con altri regimi — Art. 9(10)
              </p>
              <p style={{ fontSize: 12.5, color: "#1a1a1a", margin: 0 }}>{doc.signOff.otherRegimesIntegration}</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}>
            {([
              ["Risk owner", doc.signOff.riskOwner],
              ["Responsabile compliance/legale", doc.signOff.complianceLegal],
              ["Rappresentante legale", doc.signOff.legalRepresentative],
            ] as const).map(([role, s]) => (
              <div key={role}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.50)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px", fontFamily: SANS }}>
                  {role}
                </p>
                {s.name && <p style={{ fontSize: 11, color: "#1a1a1a", margin: "0 0 10px" }}>{s.name}</p>}
                {!s.name && <div style={{ height: 10 }} />}
                <div style={{ borderBottom: "1px solid rgba(0,0,0,0.10)", height: 24, marginBottom: 4 }} />
                {s.date && <p style={{ fontSize: 9, color: "rgba(0,0,0,0.40)", margin: "4px 0 0", fontFamily: SANS }}>{s.date}</p>}
              </div>
            ))}
          </div>
          {doc.signOff.documentHash && (
            <p style={{ fontSize: 9.5, color: "rgba(0,0,0,0.35)", fontFamily: "'DM Mono', monospace", margin: "8px 0 0" }}>
              Hash di versione: {doc.signOff.documentHash}
            </p>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}>
            {["Risk owner", "Responsabile compliance/legale", "Rappresentante legale"].map(label => (
              <div key={label}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.50)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px", fontFamily: SANS }}>
                  {label}
                </p>
                <div style={{ borderBottom: "1px solid rgba(0,0,0,0.10)", height: 24 }} />
              </div>
            ))}
          </div>
          <Placeholder text="Completare il passo 10 (Approvazione e Firme) in chat per aggiungere i nominativi." />
        </>
      )}

      {/* ── Trasversale — Comunicazione e consultazione ─────────────────────── */}
      <SectionTitle sectionId="sec-communication" num="⊕" title="Comunicazione e consultazione" article="ISO 23894 §6.2 — trasversale" />
      {doc.communication ? (
        <KVTable rows={commRows} />
      ) : (
        <Placeholder text="Da compilare — avviare il passo 11 (Comunicazione) in chat." />
      )}

      {/* ── Allegati tecnici (solo GPAI se presente) ────────────────────────── */}
      {annexes.map((annex, i) => (
        <div key={annex.title}>
          <SectionTitle sectionId={`sec-annex-${i}`} num={`A${i + 1}`} title={`Allegato — ${annex.title}`} article={annex.article} />
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

      {/* Nota di verifica — sempre in coda */}
      <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", fontStyle: "italic", marginTop: 22 }}>
        I riferimenti normativi contrassegnati con {VERIFY_NOTE_IT} richiedono conferma puntuale
        sul testo consolidato prima dell&apos;uso in un contesto di conformità formale.
        La compilazione del registro non sostituisce la valutazione legale qualificata.
      </p>
    </div>
  );
}
