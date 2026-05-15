"use client";

// DossierPreview — renders as both screen preview and print document
// Uses only inline styles for print reliability (no Tailwind dependency in critical paths)

import type { DossierData } from "@/lib/dossier/storage-schema";
import { PROHIBITED_CHECKS } from "@/lib/simulation/prohibited-practices-engine";

// ─── Design tokens (inline, print-safe) ──────────────────────────────────────
const T = {
  ink:       "#0D1016",
  muted:     "#6b7280",
  light:     "#9ca3af",
  border:    "#e5e7eb",
  red:       "#b91c1c",
  redBg:     "#fef2f2",
  orange:    "#c2410c",
  orangeBg:  "#fff7ed",
  green:     "#15803d",
  greenBg:   "#f0fdf4",
  yellow:    "#a16207",
  yellowBg:  "#fefce8",
  blue:      "#1d4ed8",
  blueBg:    "#eff6ff",
  white:     "#ffffff",
  pageBg:    "#f8fafc",
};

function n(val: string | undefined | null, fallback = "[Da completare]"): string {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "[Data non disponibile]";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Shared section wrapper ───────────────────────────────────────────────────
function Section({
  id, article, title, subtitle, children, completedAt,
}: {
  id: string; article: string; title: string; subtitle?: string;
  children: React.ReactNode; completedAt?: string;
}) {
  return (
    <div
      id={id}
      className="dossier-section"
      style={{
        pageBreakBefore: "always",
        padding: "40px 48px",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: T.ink,
        minHeight: "100%",
      }}
    >
      {/* Section header */}
      <div style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.muted, fontFamily: "system-ui, sans-serif" }}>
              {article}
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 0, letterSpacing: "-0.3px" }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: 11, color: T.muted, marginTop: 6, fontStyle: "italic", fontFamily: "system-ui, sans-serif" }}>
                {subtitle}
              </p>
            )}
          </div>
          {completedAt && (
            <span style={{ fontSize: 10, color: T.light, fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap", marginTop: 4 }}>
              Completato: {fmtDate(completedAt)}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────
function Table({ heads, rows }: { heads: string[]; rows: React.ReactNode[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "system-ui, sans-serif" }}>
      <thead>
        <tr style={{ background: T.pageBg }}>
          {heads.map((h, i) => (
            <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase", fontSize: 10, color: T.muted, borderBottom: `1px solid ${T.border}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "8px 10px", verticalAlign: "top", color: T.ink }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: bg, color, fontSize: 10, fontWeight: 700, fontFamily: "system-ui, sans-serif", letterSpacing: "0.5px", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
      <span style={{ minWidth: 180, color: T.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ color: T.ink, flex: 1 }}>{value}</span>
    </div>
  );
}

function Missing() {
  return <span style={{ color: T.light, fontStyle: "italic", fontSize: 11 }}>[Da completare]</span>;
}

// ─── Verdict colors ───────────────────────────────────────────────────────────
function verdictStyle(v: string): { color: string; bg: string; label: string } {
  if (v === "violation")          return { color: T.red, bg: T.redBg, label: "VIOLAZIONE RILEVATA" };
  if (v === "potential_violation") return { color: T.orange, bg: T.orangeBg, label: "RISCHIO POTENZIALE" };
  if (v === "clear")              return { color: T.green, bg: T.greenBg, label: "NESSUNA VIOLAZIONE" };
  return { color: T.yellow, bg: T.yellowBg, label: "VALUTAZIONE INCOMPLETA" };
}

function riskColor(level: string): { color: string; bg: string } {
  if (level === "high" || level === "critical" || level === "unacceptable") return { color: T.red, bg: T.redBg };
  if (level === "medium" || level === "limited")  return { color: T.orange, bg: T.orangeBg };
  return { color: T.green, bg: T.greenBg };
}

// ─── Main component ───────────────────────────────────────────────────────────
interface DossierPreviewProps {
  data: DossierData;
}

export default function DossierPreview({ data }: DossierPreviewProps) {
  const { meta } = data;
  const riskLevel = data.classifier?.riskLevel ?? "—";
  const rc = riskColor(riskLevel);

  return (
    <div
      style={{
        background: T.white,
        color: T.ink,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {/* ── COVER ── */}
      <div
        className="dossier-cover"
        style={{
          pageBreakAfter: "always",
          minHeight: "100vh",
          padding: "48px 48px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: T.ink,
          color: T.white,
        }}
      >
        {/* Top: logo */}
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", fontFamily: "system-ui, sans-serif" }}>
          AI<span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 300 }}>Comply</span>
        </div>

        {/* Bottom: document info */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
            Dossier di Conformità
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
            Regolamento UE 2024/1689 — AI Act
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-1.5px", marginBottom: 8, color: T.white }}>
            {n(meta.systemName)}
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
            {n(meta.companyName)}
          </p>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 24, marginBottom: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
              {[
                { label: "Generato il", value: fmtDate(meta.generatedAt) },
                { label: "Versione",    value: meta.version },
                { label: "Livello di rischio", value: riskLevel !== "—" ? riskLevel.toUpperCase() : "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.white }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
            Generato da {meta.generatedBy} · aicomply.eu
          </p>
        </div>
      </div>

      {/* ── TABLE OF CONTENTS ── */}
      <div
        className="dossier-toc"
        style={{ pageBreakAfter: "always", padding: "40px 48px", fontFamily: "system-ui, sans-serif" }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: "-0.5px" }}>Indice</h2>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.pageBg }}>
              {["Articolo", "Sezione", "Stato"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 10, letterSpacing: "0.5px", textTransform: "uppercase", color: T.muted, borderBottom: `2px solid ${T.border}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { art: "Art. 5",  title: "Verifica Pratiche Vietate",               status: data.prohibited   ? "complete" : "missing" },
              { art: "Art. 6",  title: "Classificazione del Sistema AI",           status: data.classifier   ? "complete" : "missing" },
              { art: "Art. 9",  title: "Gestione del Rischio",                     status: data.riskManager  ? "complete" : "missing" },
              { art: "Art. 10", title: "Audit Dataset e Governance Dati",          status: data.dataAudit    ? "complete" : "missing" },
              { art: "Art. 11", title: "Documentazione Tecnica (Allegato IV)",     status: data.docugen      ? "complete" : "missing" },
              { art: "Art. 12", title: "Registrazione Automatica Log",             status: data.logvault     ? "complete" : "missing" },
              { art: "Art. 13", title: "Trasparenza e Informativa Utenti",         status: data.transparency ? "complete" : "missing" },
              { art: "Art. 14", title: "Sorveglianza Umana",                       status: data.oversight    ? "complete" : "missing" },
              { art: "Art. 15", title: "Accuratezza, Robustezza e Cybersecurity",  status: data.resilience   ? "complete" : "missing" },
              { art: "Art. 17", title: "Sistema di Gestione della Qualità",        status: data.qms          ? "complete" : "missing" },
            ].map((row, i) => {
              const sStyle =
                row.status === "complete" ? { color: T.green, bg: T.greenBg, label: "Completo" } :
                row.status === "partial"  ? { color: T.yellow, bg: T.yellowBg, label: "Parziale" } :
                                            { color: T.red, bg: T.redBg, label: "Mancante" };
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, color: T.muted }}>{row.art}</td>
                  <td style={{ padding: "9px 12px", color: T.ink }}>{row.title}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <Badge color={sStyle.color} bg={sStyle.bg}>{sStyle.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 24, padding: "12px 16px", background: T.pageBg, borderRadius: 6, fontSize: 12 }}>
          <span style={{ color: T.muted }}>Completamento dossier: </span>
          <strong style={{ color: T.ink }}>
            {Math.round(
              ([data.prohibited, data.classifier, data.riskManager, data.dataAudit,
                data.docugen, data.logvault, data.transparency, data.oversight,
                data.resilience, data.qms].filter(Boolean).length / 10) * 100
            )}%
          </strong>
        </div>
      </div>

      {/* ── ART. 5 — PRATICHE VIETATE ── */}
      <Section id="sec-prohibited" article="Art. 5" title="Verifica Pratiche Vietate"
        subtitle="Verifica condotta ai sensi dell'Art. 5 Reg. UE 2024/1689. In vigore dal 2 febbraio 2025."
        completedAt={data.prohibited?.completedAt}>
        {data.prohibited ? (() => {
          const vs = verdictStyle(data.prohibited.verdict);
          return (
            <>
              <div style={{ padding: "12px 16px", background: vs.bg, borderLeft: `4px solid ${vs.color}`, borderRadius: 4, marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: vs.color, marginBottom: 4 }}>{vs.label}</p>
                {data.prohibited.violatedChecks.length > 0 && (
                  <p style={{ fontSize: 11, color: T.ink }}>
                    Pratiche in violazione: {data.prohibited.violatedChecks.join(", ")}
                  </p>
                )}
              </div>
              <Table
                heads={["Pratica", "Articolo", "Risposta", "Esito"]}
                rows={PROHIBITED_CHECKS.map((c) => {
                  const ans = data.prohibited!.answers[c.id];
                  const esito =
                    ans === "no"     ? <Badge color={T.green} bg={T.greenBg}>Conforme</Badge> :
                    ans === "yes" && c.severity === "absolute" ? <Badge color={T.red} bg={T.redBg}>VIOLAZIONE</Badge> :
                    ans === "yes"    ? <Badge color={T.orange} bg={T.orangeBg}>Rischio</Badge> :
                    <Badge color={T.yellow} bg={T.yellowBg}>Non verificato</Badge>;
                  return [
                    c.title,
                    c.article,
                    ans === "yes" ? "Sì" : ans === "no" ? "No" : ans === "unsure" ? "Non sicuro" : "—",
                    esito,
                  ];
                })}
              />
            </>
          );
        })() : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare il tool Art. 5 Checker per completare la verifica.
          </div>
        )}
      </Section>

      {/* ── ART. 6 — CLASSIFICAZIONE ── */}
      <Section id="sec-classifier" article="Art. 6" title="Classificazione del Sistema AI"
        subtitle="Classificazione ai sensi dell'Art. 6 e dell'Allegato III del Reg. UE 2024/1689."
        completedAt={data.classifier?.completedAt}>
        {data.classifier ? (() => {
          const rc2 = riskColor(data.classifier.riskLevel);
          return (
            <>
              <InfoRow label="Nome sistema" value={n(data.classifier.systemName)} />
              <InfoRow label="Descrizione" value={n(data.classifier.systemDescription)} />
              <InfoRow label="Livello di rischio"
                value={<Badge color={rc2.color} bg={rc2.bg}>{data.classifier.riskLevel.toUpperCase()}</Badge>} />
              <InfoRow label="Allegato III" value={data.classifier.annexIII ? "⚠️ Sì — obblighi specifici applicabili" : "No"} />
              {data.classifier.annexIII && (
                <div style={{ padding: "10px 14px", background: T.orangeBg, borderRadius: 4, marginTop: 12, marginBottom: 12, fontSize: 11 }}>
                  ⚠️ Il sistema ricade nell&apos;Allegato III — sono obbligatorie la valutazione di conformità (Art. 43) e la registrazione nella banca dati EU (Art. 51).
                </div>
              )}
              {data.classifier.applicableArticles.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, marginTop: 16, marginBottom: 8, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Articoli applicabili
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {data.classifier.applicableArticles.map((a, i) => (
                      <Badge key={i} color={T.blue} bg={T.blueBg}>{a}</Badge>
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })() : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare AI Classifier per classificare il sistema.
          </div>
        )}
      </Section>

      {/* ── ART. 9 — RISK MANAGER ── */}
      <Section id="sec-risk" article="Art. 9" title="Gestione del Rischio"
        subtitle="Sistema di gestione del rischio ai sensi dell'Art. 9 Reg. UE 2024/1689."
        completedAt={data.riskManager?.completedAt}>
        {data.riskManager ? (() => {
          const orc = riskColor(data.riskManager.overallRiskLevel);
          return (
            <>
              <InfoRow label="Livello rischio complessivo"
                value={<Badge color={orc.color} bg={orc.bg}>{data.riskManager.overallRiskLevel.toUpperCase()}</Badge>} />
              <div style={{ marginTop: 16 }}>
                {data.riskManager.risks.length > 0 ? (
                  <Table
                    heads={["Rischio", "Probabilità", "Impatto", "Mitigazione", "Rischio Residuo"]}
                    rows={data.riskManager.risks.map((r) => {
                      const rrc = riskColor(r.residualRisk === "unacceptable" ? "high" : r.residualRisk === "review" ? "medium" : "minimal");
                      return [
                        r.title,
                        r.likelihood,
                        r.impact,
                        n(r.mitigation),
                        <Badge key={r.id} color={rrc.color} bg={rrc.bg}>{r.residualRisk}</Badge>,
                      ];
                    })}
                  />
                ) : (
                  <p style={{ color: T.light, fontStyle: "italic", fontSize: 11 }}>
                    [Nessun rischio identificato — completare Risk Manager]
                  </p>
                )}
              </div>
            </>
          );
        })() : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare Risk Manager per identificare e gestire i rischi.
          </div>
        )}
      </Section>

      {/* ── ART. 10 — DATA AUDIT ── */}
      <Section id="sec-data" article="Art. 10" title="Audit Dataset e Governance Dati"
        subtitle="Governance dei dati di addestramento ai sensi dell'Art. 10 Reg. UE 2024/1689."
        completedAt={data.dataAudit?.completedAt}>
        {data.dataAudit ? (() => {
          const qrc = data.dataAudit.overallQuality === "pass"
            ? { color: T.green, bg: T.greenBg }
            : data.dataAudit.overallQuality === "review"
            ? { color: T.yellow, bg: T.yellowBg }
            : { color: T.red, bg: T.redBg };
          return (
            <>
              <InfoRow label="Qualità complessiva"
                value={<Badge color={qrc.color} bg={qrc.bg}>{data.dataAudit.overallQuality.toUpperCase()}</Badge>} />
              <div style={{ marginTop: 16 }}>
                <Table
                  heads={["Dataset", "Fonte", "Dimensione", "Bias verificato", "Qualità", "Dati personali"]}
                  rows={data.dataAudit.datasets.map((d, i) => [
                    d.name,
                    n(d.source),
                    n(d.size),
                    d.biasChecked ? <Badge key={i} color={T.green} bg={T.greenBg}>Sì</Badge> : <Badge key={i} color={T.orange} bg={T.orangeBg}>No</Badge>,
                    `${d.qualityScore}%`,
                    d.personalData ? "Sì" : "No",
                  ])}
                />
              </div>
            </>
          );
        })() : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare Data Audit per analizzare i dataset.
          </div>
        )}
      </Section>

      {/* ── ART. 11 — DOCUGEN ── */}
      <Section id="sec-docugen" article="Art. 11" title="Documentazione Tecnica (Allegato IV)"
        subtitle="Documentazione conforme all'Allegato IV del Reg. UE 2024/1689."
        completedAt={data.docugen?.completedAt}>
        {data.docugen ? (
          <>
            <div style={{ padding: "10px 14px", background: T.blueBg, borderRadius: 4, marginBottom: 20, fontSize: 11, color: T.blue }}>
              Documento conforme all&apos;Allegato IV del Reg. UE 2024/1689
            </div>
            <InfoRow label="Nome sistema"         value={n(data.docugen.systemName)} />
            <InfoRow label="Provider / Fornitore" value={n(data.docugen.provider)} />
            <InfoRow label="Scopo e finalità"     value={n(data.docugen.purpose)} />
            <InfoRow label="Capacità"             value={n(data.docugen.capabilities)} />
            <InfoRow label="Limitazioni"          value={n(data.docugen.limitations)} />
            <InfoRow label="Supervisione umana"   value={n(data.docugen.humanOversight)} />
            <InfoRow label="Metriche di performance" value={n(data.docugen.performanceMetrics)} />
            <InfoRow label="Dati di addestramento"   value={n(data.docugen.trainingData)} />
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare DocuGen AI per generare la documentazione tecnica.
          </div>
        )}
      </Section>

      {/* ── ART. 12 — LOGVAULT ── */}
      <Section id="sec-logvault" article="Art. 12" title="Registrazione Automatica Log"
        subtitle="Sistemi di log ai sensi dell'Art. 12 Reg. UE 2024/1689."
        completedAt={data.logvault?.completedAt}>
        {data.logvault ? (
          <>
            <InfoRow label="Logging abilitato"  value={data.logvault.loggingEnabled ? "✓ Sì" : "✕ No"} />
            <InfoRow label="Retention"          value={`${data.logvault.retentionDays} giorni`} />
            <InfoRow label="Storage"            value={n(data.logvault.storageLocation)} />
            <InfoRow label="Controllo accessi"  value={n(data.logvault.accessControl)} />
            {data.logvault.loggedEvents.length > 0 && (
              <InfoRow label="Eventi registrati"
                value={
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {data.logvault.loggedEvents.map((ev, i) => (
                      <Badge key={i} color={T.muted} bg={T.pageBg}>{ev}</Badge>
                    ))}
                  </div>
                }
              />
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare LogVault per configurare la registrazione dei log.
          </div>
        )}
      </Section>

      {/* ── ART. 13 — TRANSPARENCY ── */}
      <Section id="sec-transparency" article="Art. 13" title="Trasparenza e Informativa Utenti"
        subtitle="Obblighi di trasparenza ai sensi dell'Art. 13 Reg. UE 2024/1689."
        completedAt={data.transparency?.completedAt}>
        {data.transparency ? (
          <>
            <InfoRow label="Utenti informati del sistema AI" value={data.transparency.userInformedOfAI ? "✓ Sì" : "✕ No"} />
            <InfoRow label="Punto di contatto"  value={n(data.transparency.contactPoint)} />
            <InfoRow label="Lingue disponibili"
              value={
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {data.transparency.languagesAvailable.map((l, i) => (
                    <Badge key={i} color={T.muted} bg={T.pageBg}>{l}</Badge>
                  ))}
                </div>
              }
            />
            {data.transparency.informationProvided.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 16, marginBottom: 8, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Informazioni fornite agli utenti
                </p>
                <ul style={{ paddingLeft: 16, fontSize: 11, color: T.ink }}>
                  {data.transparency.informationProvided.map((info, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{info}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare Transparency per configurare l&apos;informativa utenti.
          </div>
        )}
      </Section>

      {/* ── ART. 14 — OVERSIGHT ── */}
      <Section id="sec-oversight" article="Art. 14" title="Sorveglianza Umana"
        subtitle="Misure di sorveglianza umana ai sensi dell'Art. 14 Reg. UE 2024/1689."
        completedAt={data.oversight?.completedAt}>
        {data.oversight ? (
          <>
            <InfoRow label="Meccanismo di supervisione" value={n(data.oversight.oversightMechanism)} />
            <InfoRow label="Capacità di stop"           value={data.oversight.stopCapability ? "✓ Implementata" : "✕ Non implementata"} />
            {data.oversight.responsiblePersons.length > 0 && (
              <InfoRow label="Persone responsabili"
                value={data.oversight.responsiblePersons.join(", ")} />
            )}
            {data.oversight.humanInterventionPoints.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 16, marginBottom: 8, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Punti di intervento umano
                </p>
                <ul style={{ paddingLeft: 16, fontSize: 11, color: T.ink }}>
                  {data.oversight.humanInterventionPoints.map((pt, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{pt}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare Oversight per configurare la sorveglianza umana.
          </div>
        )}
      </Section>

      {/* ── ART. 15 — RESILIENCE ── */}
      <Section id="sec-resilience" article="Art. 15" title="Accuratezza, Robustezza e Cybersecurity"
        subtitle="Requisiti di accuratezza, robustezza e cybersecurity ai sensi dell'Art. 15 Reg. UE 2024/1689."
        completedAt={data.resilience?.completedAt}>
        {data.resilience ? (
          <>
            <InfoRow label="Accuratezza"           value={`${data.resilience.accuracyMetric}%`} />
            <InfoRow label="Robustezza testata"    value={data.resilience.robustnessTested ? "✓ Sì" : "✕ No"} />
            <InfoRow label="Procedura fallback"    value={n(data.resilience.fallbackProcedure)} />
            <InfoRow label="Ultimo test"           value={fmtDate(data.resilience.lastTestedAt)} />
            {data.resilience.cybersecurityMeasures.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 16, marginBottom: 8, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Misure di cybersecurity
                </p>
                <ul style={{ paddingLeft: 16, fontSize: 11, color: T.ink }}>
                  {data.resilience.cybersecurityMeasures.map((m, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{m}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare Resilience per testare robustezza e sicurezza.
          </div>
        )}
      </Section>

      {/* ── ART. 17 — QMS ── */}
      <Section id="sec-qms" article="Art. 17" title="Sistema di Gestione della Qualità"
        subtitle="Sistema QMS ai sensi dell'Art. 17 Reg. UE 2024/1689."
        completedAt={data.qms?.completedAt}>
        {data.qms ? (
          <>
            <InfoRow label="Riferimento documento QMS" value={n(data.qms.qmsDocumentRef)} />
            <InfoRow label="Piano post-market"         value={data.qms.postMarketPlanExists ? "✓ Presente" : "✕ Assente"} />
            <InfoRow label="Ciclo di revisione"        value={n(data.qms.internalReviewCycle)} />
            <InfoRow label="Responsabile"              value={n(data.qms.responsibleManager)} />
            {data.qms.certifications.length > 0 && (
              <InfoRow label="Certificazioni"
                value={
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {data.qms.certifications.map((c, i) => (
                      <Badge key={i} color={T.green} bg={T.greenBg}>{c}</Badge>
                    ))}
                  </div>
                }
              />
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: T.light, fontSize: 12, fontStyle: "italic" }}>
            Sezione non completata. Utilizzare QMS Builder per configurare il sistema qualità.
          </div>
        )}
      </Section>

      {/* ── APPENDICE — TIMELINE NORMATIVA ── */}
      <div
        className="dossier-section"
        style={{ pageBreakBefore: "always", padding: "40px 48px", fontFamily: "system-ui, sans-serif" }}
      >
        <div style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 16, marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.muted }}>
            Appendice
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Timeline Normativa — AI Act</h2>
        </div>
        <Table
          heads={["Data", "Obbligo", "Stato"]}
          rows={[
            ["2 Feb 2025", "Pratiche vietate Art. 5 — divieti assoluti in vigore", <Badge key="a" color={T.green} bg={T.greenBg}>✓ In vigore</Badge>],
            ["2 Ago 2025", "GPAI Art. 53–55 — modelli AI per uso generale", <Badge key="b" color={T.green} bg={T.greenBg}>✓ In vigore</Badge>],
            ["2 Ago 2026", "Alto rischio Allegato III — obblighi di conformità", <Badge key="c" color={T.orange} bg={T.orangeBg}>⏳ Prossima scadenza</Badge>],
            ["2 Ago 2027", "Alto rischio Allegato III punti 6–8 (prodotti esistenti)", <Badge key="d" color={T.yellow} bg={T.yellowBg}>⏳ Futura</Badge>],
          ]}
        />
      </div>

      {/* ── DICHIARAZIONE DI CONFORMITÀ ── */}
      <div
        className="dossier-section"
        style={{ pageBreakBefore: "always", padding: "40px 48px", fontFamily: "system-ui, sans-serif" }}
      >
        <div style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Dichiarazione di Conformità</h2>
        </div>

        <p style={{ fontSize: 12, lineHeight: 1.8, color: T.ink, marginBottom: 32 }}>
          Il presente dossier è stato generato dalla piattaforma AIComply in data{" "}
          <strong>{fmtDate(meta.generatedAt)}</strong>. I contenuti riflettono le informazioni
          inserite dall&apos;organizzazione <strong>{n(meta.companyName)}</strong> e costituiscono
          documentazione interna ai fini della conformità al Regolamento UE 2024/1689 (AI Act).
          Il presente documento non sostituisce la valutazione di un organismo notificato ove
          richiesta dall&apos;Art. 43.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 48 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 40 }}>
              Responsabile Conformità AI
            </p>
            <div style={{ borderBottom: `1px solid ${T.ink}`, marginBottom: 8 }} />
            <p style={{ fontSize: 10, color: T.muted }}>Firma e timbro</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 40 }}>
              Data
            </p>
            <div style={{ borderBottom: `1px solid ${T.ink}`, marginBottom: 8 }} />
            <p style={{ fontSize: 10, color: T.muted }}>gg / mm / aaaa</p>
          </div>
        </div>

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
          <p style={{ fontSize: 10, color: T.light }}>
            AIComply Platform v{meta.version} · Reg. UE 2024/1689 · {meta.generatedBy}
          </p>
        </div>
      </div>
    </div>
  );
}
