"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import {
  ArrowRight, X, ChevronRight,
  Clock, CheckCircle2, AlertCircle, Activity, Shield,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { isOnboardingDone } from "@/components/onboarding/OnboardingWizard";
import { aggregateDossier, getDossierSections, getCompletionPercentage, getCompletedCount } from "@/lib/dossier/dossier-engine";
import { REGULATORY_DEADLINES, daysUntil, type RegulatoryDeadline } from "@/lib/notifications/notifications-engine";
import { getAllEvidence, type EvidenceRecord } from "@/lib/evidence/evidence-layer";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { readFromStorage, type ClassifierResult } from "@/lib/dossier/storage-schema";

const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard"),
  { ssr: false }
);

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.40)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  red:     "#dc2626",   redBg:   "rgba(220,38,38,0.06)",   redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#b45309",   amberBg: "rgba(245,158,11,0.06)",  amberBdr:"rgba(245,158,11,0.2)",
  green:   "#059669",   greenBg: "rgba(5,150,105,0.06)",   greenBdr:"rgba(5,150,105,0.18)",
  gray:    "#6b7280",   grayBg:  "rgba(0,0,0,0.04)",       grayBdr: "rgba(0,0,0,0.10)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

// ── Risk config ───────────────────────────────────────────────────────────────

const RISK_CFG: Record<string, { label: string; color: string; bg: string; bdr: string }> = {
  unacceptable: { label: "Inaccettabile", color: T.red,   bg: T.redBg,   bdr: T.redBdr   },
  high:         { label: "Alto",          color: T.red,   bg: T.redBg,   bdr: T.redBdr   },
  limited:      { label: "Limitato",      color: T.amber, bg: T.amberBg, bdr: T.amberBdr },
  minimal:      { label: "Minimale",      color: T.green, bg: T.greenBg, bdr: T.greenBdr },
};

// ── Evidence type labels ──────────────────────────────────────────────────────

const EV_LABELS: Record<string, { label: string; color: string }> = {
  adr:        { label: "Decisione",    color: T.gray  },
  decision:   { label: "Decisione",    color: T.gray  },
  audit:      { label: "Audit",        color: T.amber },
  log:        { label: "Log",          color: T.gray  },
  test:       { label: "Test",         color: T.green },
  incident:   { label: "Incidente",    color: T.red   },
  monitoring: { label: "Monitoraggio", color: T.gray  },
};

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "poco fa";
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  if (diff < 172800) return "ieri";
  return `${Math.floor(diff / 86400)} gg fa`;
}

// ── Inline helpers ────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level?: string }) {
  const cfg = level ? RISK_CFG[level] : null;
  if (!cfg) return <span style={{ fontSize: 10, color: T.faint }}>—</span>;
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 600,
      padding: "2px 8px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}`,
    }}>{cfg.label}</span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const label = status === "active" ? "In corso"
    : status === "compliant" ? "Conforme"
    : status === "review" ? "Revisione"
    : status ?? "—";
  const color = status === "compliant" ? T.green : T.amber;
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 600,
      padding: "2px 8px", borderRadius: 4,
      background: status === "compliant" ? T.greenBg : T.amberBg,
      color, border: `1px solid ${status === "compliant" ? T.greenBdr : T.amberBdr}`,
    }}>{label}</span>
  );
}

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? T.green : pct >= 40 ? T.amber : T.text;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.07)" }}>
        <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: color, transition: "width 0.7s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 30 }}>{pct}%</span>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoveredSystem {
  id: string; name: string; status: string;
  addedToCompliance: boolean; riskLevel?: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role } = useUserRole();
  const [showWizard, setShowWizard]         = useState(false);
  const [dossierPct, setDossierPct]         = useState(0);
  const [dossierDone, setDossierDone]       = useState(0);
  const [totalSections, setTotalSections]   = useState(0);
  const [mounted, setMounted]               = useState(false);

  // Alert state
  const [newSystemCount, setNewSystemCount] = useState(0);
  const [hasSources, setHasSources]         = useState(true);
  const [discoveryDismissed, setDiscoveryDismissed] = useState(false);
  const [deadlineDismissed, setDeadlineDismissed]   = useState(true);
  const [alertDeadline, setAlertDeadline]   = useState<RegulatoryDeadline | null>(null);
  const [alertDeadlineDays, setAlertDeadlineDays] = useState<number | null>(null);
  const [art73MinDays, setArt73MinDays]     = useState<number | null>(null);
  const [art73Count, setArt73Count]         = useState(0);
  const [art73Dismissed, setArt73Dismissed] = useState(false);
  const [gpaiDismissed, setGpaiDismissed]   = useState(true);

  // Main data
  const [systems, setSystems]               = useState<DiscoveredSystem[]>([]);
  const [onboardingSystem, setOnboardingSystem] = useState<string>("");
  const [nextActions, setNextActions]       = useState<{ id: string; title: string; article: string; href: string }[]>([]);
  const [deadlines, setDeadlines]           = useState<{ deadline: RegulatoryDeadline; days: number }[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<EvidenceRecord[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!isOnboardingDone()) setShowWizard(true);

    const data     = aggregateDossier();
    const sections = getDossierSections(data);
    setDossierPct(getCompletionPercentage(sections));
    setDossierDone(getCompletedCount(sections));
    setTotalSections(sections.length);

    setNextActions(
      sections.filter(s => s.status !== "complete").slice(0, 5)
        .map(s => ({ id: s.id, title: s.title, article: s.article, href: s.href }))
    );

    try {
      const ob = localStorage.getItem("aicomply_onboarding_data");
      if (ob) { const p = JSON.parse(ob); setOnboardingSystem(p?.systemName || ""); }
    } catch { /* ignore */ }

    try {
      const classifier = readFromStorage<ClassifierResult>("classifier");
      const sysRaw = localStorage.getItem("aicomply_discovered_systems");
      const sys: DiscoveredSystem[] = sysRaw ? JSON.parse(sysRaw) : [];
      setSystems(sys.filter(s => s.status !== "ignored").map(s => ({
        ...s,
        riskLevel: classifier?.systemName && classifier.systemName.toLowerCase() === s.name.toLowerCase()
          ? classifier.riskLevel : s.riskLevel,
      })));
    } catch { /* ignore */ }

    const today = new Date();
    setDeadlines(
      REGULATORY_DEADLINES
        .filter(d => new Date(d.date) > today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
        .map(d => ({ deadline: d, days: daysUntil(d.date) }))
    );

    try {
      const ev = getAllEvidence();
      setRecentEvidence(
        [...ev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)
      );
    } catch { /* ignore */ }

    setGpaiDismissed(localStorage.getItem("aicomply_gpai_banner_dismissed") === "1");

    try {
      const srcRaw = localStorage.getItem("aicomply_discovery_sources");
      const sysRaw2 = localStorage.getItem("aicomply_discovered_systems");
      const srcs = srcRaw ? JSON.parse(srcRaw) : [];
      const sys2 = sysRaw2 ? JSON.parse(sysRaw2) : [];
      setHasSources(srcs.length > 0);
      const pending = sys2.filter((s: { status: string; addedToCompliance: boolean }) =>
        !s.addedToCompliance && s.status !== "ignored");
      setNewSystemCount(pending.length);
    } catch { /* ignore */ }

    const DISMISS_KEY = "aicomply_deadline_banner_dismissed_v2";
    if (localStorage.getItem(DISMISS_KEY) !== "1") {
      const next = REGULATORY_DEADLINES
        .filter(d => new Date(d.date) > new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
      if (next) { setAlertDeadline(next); setAlertDeadlineDays(daysUntil(next.date)); setDeadlineDismissed(false); }
    }

    try {
      const raw = localStorage.getItem("post_market_incidents");
      if (raw) {
        const incidents = JSON.parse(raw) as Array<{ date: string; notified: boolean }>;
        const urgent = incidents.filter(i => !i.notified).map(i => {
          const deadline = new Date(new Date(i.date).getTime() + 15 * 24 * 60 * 60 * 1000);
          return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }).filter(d => d <= 15 && d > 0);
        if (urgent.length > 0) { setArt73Count(urgent.length); setArt73MinDays(Math.min(...urgent)); }
      }
    } catch { /* ignore */ }
  }, []);

  const pctColor       = dossierPct >= 80 ? T.green : dossierPct >= 40 ? T.amber : T.text;
  const scoreLabel     = dossierPct >= 80 ? "LIVELLO ALTO · OTTIMO" : dossierPct >= 40 ? "LIVELLO MEDIO · IN MIGLIORAMENTO" : "LIVELLO BASSO · AZIONE RICHIESTA";
  const showDiscovery  = newSystemCount > 0 || (!hasSources && !discoveryDismissed);
  const showDeadline   = !deadlineDismissed && alertDeadline !== null;
  const showArt73      = art73Count > 0 && !art73Dismissed;
  const mainSystemName = onboardingSystem || "Sistema AI principale";
  const classifier     = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const showMainSystem = systems.length === 0 && isOnboardingDone();
  const totalSystems   = systems.length > 0 ? systems.length : showMainSystem ? 1 : 0;

  // Most urgent alert for banner
  const bannerAction = nextActions[0] ?? null;
  const showBanner   = bannerAction || showDeadline || showArt73 || showDiscovery;

  const nowStr = mounted ? new Date().toLocaleString("it-IT", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " UTC" : "";

  return (
    <>
      {showWizard && <OnboardingWizard onComplete={() => setShowWizard(false)} />}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.3s ease both; }
        @media (max-width: 900px) {
          .dash-main-grid  { grid-template-columns: 1fr !important; }
          .dash-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="w-full fade-up">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: T.faint, marginBottom: 6 }}>
              {nowStr}
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-1px", color: T.text, lineHeight: 1.1, marginBottom: 4 }}>
              Compliance Overview
            </h1>
            <p style={{ fontSize: 12, color: T.muted }}>
              {role === "deployer" ? "Obblighi Art. 26 — deployer"
                : role === "distributor" ? "Obblighi minimi Art. 24"
                : "EU AI Act 2024/1689"}
            </p>
          </div>

          {/* Score */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 56, fontWeight: 300, letterSpacing: "-3px", color: T.text, lineHeight: 1 }}>
                {dossierPct}
              </span>
              <span style={{ fontSize: 26, fontWeight: 300, color: T.faint, lineHeight: 1 }}>/100</span>
            </div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: T.muted, marginTop: 4 }}>
              {scoreLabel}
            </p>
            <div style={{ height: 2, width: 110, background: "rgba(0,0,0,0.07)", borderRadius: 1, marginTop: 6, marginLeft: "auto" }}>
              <div style={{ height: 2, width: `${dossierPct * 1.1}px`, maxWidth: 110, background: pctColor, borderRadius: 1, transition: "width 0.7s" }} />
            </div>
          </div>
        </div>

        {/* ── ALERT BANNER ────────────────────────────────────────── */}
        {showBanner && (
          <div className="fade-up" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: "14px 20px", borderRadius: 8, marginBottom: 18,
            background: "rgba(0,0,0,0.02)", border: `1px solid rgba(0,0,0,0.08)`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>
                {showArt73 ? `Art. 73 · Notifica entro ${art73MinDays} giorni`
                  : showDeadline ? `${alertDeadline!.article} — ${alertDeadline!.title}`
                  : showDiscovery ? "Sistemi AI rilevati — classificazione richiesta"
                  : bannerAction?.title}
              </p>
              <p style={{ fontSize: 11, color: T.muted }}>
                {showArt73 ? `${art73Count} incidente/i da segnalare all'autorità competente · Art. 73`
                  : showDeadline ? `Scadenza: ${new Date(alertDeadline!.date).toLocaleDateString("it-IT", { day:"2-digit", month:"short", year:"numeric" })} — ${alertDeadlineDays} giorni rimanenti`
                  : showDiscovery ? "Vai a Discovery per classificare i sistemi rilevati"
                  : bannerAction ? `Art. ${bannerAction.article} · Allegato III §4 · Valutazione impatto obbligatoria` : ""}
              </p>
            </div>
            <Link
              href={showArt73 ? "/dashboard/post-market"
                : showDeadline ? "/dashboard/notifications"
                : showDiscovery ? "/dashboard/discovery"
                : bannerAction?.href ?? "/dashboard/journey"}
              style={{
                padding: "9px 18px", background: T.text, color: "#fff", borderRadius: 6,
                fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}>
              {showArt73 ? "Notifica ora" : showDeadline ? "Vedi timeline" : showDiscovery ? "Avvia Discovery" : "Vai alla sezione"}
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* ── STATS ROW ───────────────────────────────────────────── */}
        <div className="dash-stats-grid fade-up" style={{ ...cardSt, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16, overflow: "hidden" }}>
          {[
            {
              label: "SISTEMI AI",
              value: String(totalSystems),
              sub: totalSystems > 0
                ? `${systems.filter(s => s.riskLevel === "high" || s.riskLevel === "unacceptable").length} alto rischio · All. III`
                : "Avvia Discovery",
            },
            {
              label: "OBBLIGHI APERTI",
              value: String(nextActions.length),
              sub: nextActions.length > 0 ? `${Math.min(nextActions.length, 2)} urgenti · entro 7 giorni` : "tutti risolti",
            },
            {
              label: "DOCUMENTI FIRMATI",
              value: String(dossierDone),
              sub: "eIDAS SES · hash-chain",
            },
            {
              label: "PROSSIMA SCADENZA",
              value: deadlines[0] ? String(deadlines[0].days) : "—",
              sub: deadlines[0] ? `${deadlines[0].deadline.article} · notifica incidente` : "nessuna scadenza",
              unit: deadlines[0] ? "giorni" : undefined,
            },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "18px 22px", borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: T.faint, marginBottom: 8 }}>
                {s.label}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-1.5px", color: T.text, lineHeight: 1 }}>
                  {s.value}
                </span>
                {"unit" in s && s.unit && (
                  <span style={{ fontSize: 14, fontWeight: 400, color: T.muted }}>{s.unit}</span>
                )}
              </div>
              <p style={{ fontSize: 10, color: T.faint }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID: Systems Table + Activity ─────────────────── */}
        <div className="dash-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, marginBottom: 14, alignItems: "start" }}>

          {/* ── AI Systems Table ── */}
          <div style={{ ...cardSt, overflow: "hidden" }} className="fade-up">
            {/* Table header */}
            <div style={{ padding: "13px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: T.faint }}>
                  INVENTARIO SISTEMI AI
                </p>
                {totalSystems > 0 && (
                  <p style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>
                    {Math.min(4, totalSystems)} DI {totalSystems} MOSTRATI
                  </p>
                )}
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 160px", padding: "9px 20px", borderBottom: `1px solid ${T.border}`, background: "rgba(0,0,0,0.015)" }}>
              {["SISTEMA", "RISCHIO", "STATO", "SCORE"].map(h => (
                <span key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: T.faint }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {totalSystems === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 10 }}>Nessun sistema AI registrato</p>
                <Link href="/dashboard/discovery"
                  style={{ fontSize: 12, fontWeight: 500, color: "#fff", background: T.text, padding: "8px 16px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Avvia Discovery <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <>
                {showMainSystem && systems.length === 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 160px", padding: "14px 20px", alignItems: "center", borderBottom: `1px solid ${T.border}` }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{mainSystemName}</p>
                      <p style={{ fontSize: 10, color: T.faint }}>
                        {classifier?.riskLevel === "high" ? "Alto rischio · All.III §4" : "Classificato"}
                      </p>
                    </div>
                    <RiskBadge level={classifier?.riskLevel} />
                    <StatusBadge status="active" />
                    <ScoreBar pct={dossierPct} />
                  </div>
                )}
                {systems.slice(0, 4).map((sys, i) => (
                  <div key={sys.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 100px 90px 160px",
                    padding: "14px 20px", alignItems: "center",
                    borderBottom: i < Math.min(3, systems.length - 1) ? `1px solid ${T.border}` : "none",
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{sys.name}</p>
                      <p style={{ fontSize: 10, color: T.faint }}>
                        {sys.riskLevel ? RISK_CFG[sys.riskLevel]?.label ?? "—" : "Da classificare"}
                        {(sys.riskLevel === "high" || sys.riskLevel === "unacceptable") ? " · All.III §4" : " · Art. 50"}
                      </p>
                    </div>
                    <RiskBadge level={sys.riskLevel} />
                    <StatusBadge status={sys.status} />
                    <ScoreBar pct={dossierPct} />
                  </div>
                ))}
              </>
            )}

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: totalSystems > 0 ? `1px solid ${T.border}` : "none" }}>
              <Link href="/dashboard/discovery"
                style={{
                  fontSize: 12, fontWeight: 500, color: T.text,
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 6,
                  border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.01)",
                }}>
                🤖 Tutti i sistemi →
              </Link>
            </div>
          </div>

          {/* ── Recent Activity ── */}
          <div style={{ ...cardSt, overflow: "hidden" }} className="fade-up">
            <div style={{ padding: "13px 20px", borderBottom: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: T.faint }}>
                ATTIVITÀ RECENTE
              </p>
            </div>

            {recentEvidence.length === 0 ? (
              <div style={{ padding: "24px 20px" }}>
                <p style={{ fontSize: 12, color: T.faint }}>Nessuna attività ancora.</p>
              </div>
            ) : (
              recentEvidence.map((ev, i) => {
                const cfg = EV_LABELS[ev.type] ?? { label: ev.type, color: T.gray };
                const toolName = (ev.content as Record<string, unknown>)?.tool as string
                  ?? (ev.content as Record<string, unknown>)?.title as string
                  ?? ev.type;
                const artLabel = (ev.content as Record<string, unknown>)?.article as string ?? "";
                return (
                  <div key={ev.id} style={{ padding: "11px 20px", borderBottom: i < recentEvidence.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0, marginTop: 3 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {toolName}
                        </p>
                        <p style={{ fontSize: 10, color: T.faint }}>
                          {artLabel ? `${artLabel} · ` : ""}{cfg.label} · {relTime(ev.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ padding: "12px 20px", borderTop: recentEvidence.length > 0 ? `1px solid ${T.border}` : "none" }}>
              <Link href="/dashboard/evidence-layer"
                style={{ fontSize: 12, fontWeight: 500, color: T.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
                🔁 Log completo →
              </Link>
            </div>
          </div>
        </div>

        {/* ── BOTTOM CARDS ─────────────────────────────────────────── */}
        <div className="dash-bottom-grid fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

          <Link href="/dashboard/dossier" style={{ ...cardSt, padding: "16px 20px", display: "block", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={16} style={{ color: T.text }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 300, letterSpacing: "-0.5px", color: T.text }}>
                {dossierDone} documenti firmati
              </p>
            </div>
            <p style={{ fontSize: 10, color: T.faint }}>hash-chain verificata · Art. 18</p>
          </Link>

          <Link href="/dashboard/notifications" style={{ ...cardSt, padding: "16px 20px", display: "block", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={16} style={{ color: T.text }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 300, letterSpacing: "-0.5px", color: T.text }}>
                {deadlines.filter(d => d.days <= 90).length} scadenze critiche
              </p>
            </div>
            <p style={{ fontSize: 10, color: T.faint }}>
              {deadlines[0]
                ? `${deadlines[0].deadline.article}${deadlines[1] ? " · " + deadlines[1].deadline.article : ""} · entro ${deadlines[0].days} giorni`
                : "Nessuna scadenza imminente"}
            </p>
          </Link>

          <Link href="/dashboard/tools/trust-center" style={{ ...cardSt, padding: "16px 20px", display: "block", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Shield size={16} style={{ color: T.text }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 300, letterSpacing: "-0.5px", color: T.text }}>Trust Center</p>
            </div>
            <p style={{ fontSize: 10, color: T.faint }}>bozza · non pubblicato · Art. 13</p>
          </Link>

        </div>

      </div>
    </>
  );
}
