"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import {
  ArrowRight, X, ChevronRight, Layers, Plus,
  Clock, CheckCircle2, AlertCircle, Activity,
  Zap, TrendingUp, Ban,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { isOnboardingDone } from "@/components/onboarding/OnboardingWizard";
import { aggregateDossier, getDossierSections, getCompletionPercentage, getCompletedCount } from "@/lib/dossier/dossier-engine";
import { REGULATORY_DEADLINES, daysUntil, type RegulatoryDeadline } from "@/lib/notifications/notifications-engine";
import { getAllEvidence, type EvidenceRecord } from "@/lib/evidence/evidence-layer";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { readFromStorage, type ClassifierResult } from "@/lib/dossier/storage-schema";
import { ComplianceRadarChart } from "@/components/compliance/ComplianceRadarChart";

const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard"),
  { ssr: false }
);

const ComplianceJourneyDashboard = dynamic(
  () => import("@/components/compliance/ComplianceJourneyDashboard"),
  { ssr: false }
);

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.40)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.07)",
  bg:      "#FAFAF9",
  card:    "#ffffff",
  // Indigo come accento primario (non più rosso per stati incompleti)
  indigo:  "#0D1016",   indigoBg: "rgba(13,16,22,0.06)",   indigoBdr:"rgba(13,16,22,0.12)",
  red:     "#dc2626",   redBg:   "rgba(220,38,38,0.06)",   redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#b45309",   amberBg: "rgba(245,158,11,0.06)",  amberBdr:"rgba(245,158,11,0.2)",
  blue:    "#475569",   blueBg:  "rgba(71,85,105,0.06)",   blueBdr: "rgba(71,85,105,0.15)",
  green:   "#059669",   greenBg: "rgba(5,150,105,0.06)",   greenBdr:"rgba(5,150,105,0.18)",
  gray:    "#6b7280",   grayBg:  "rgba(0,0,0,0.04)",       grayBdr: "rgba(0,0,0,0.10)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

// ── Risk config ───────────────────────────────────────────────────────────────

const RISK_CFG: Record<string, { label: string; color: string; bg: string; bdr: string; bar: string }> = {
  unacceptable: { label: "Inaccettabile", color: T.red,   bg: T.redBg,   bdr: T.redBdr,   bar: T.red   },
  high:         { label: "Alto rischio",  color: T.red,   bg: T.redBg,   bdr: T.redBdr,   bar: T.red   },
  limited:      { label: "Limitato",      color: T.amber, bg: T.amberBg, bdr: T.amberBdr, bar: T.amber },
  minimal:      { label: "Minimale",      color: T.green, bg: T.greenBg, bdr: T.greenBdr, bar: T.green },
};

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({ label, desc, ctaLabel, ctaHref, onDismiss }: {
  label: string; desc: string; ctaLabel: string; ctaHref: string; onDismiss?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl"
      style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold leading-snug" style={{ color: "#92400e", letterSpacing: "-0.01em" }}>
          {label}
        </p>
        {onDismiss && (
          <button onClick={onDismiss} className="flex-shrink-0 mt-0.5 rounded hover:opacity-50 transition-opacity"
            style={{ color: "rgba(0,0,0,0.22)" }} aria-label="Chiudi">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <p className="text-[11px] leading-snug" style={{ color: T.muted }}>{desc}</p>
      <Link href={ctaHref} className="flex items-center gap-0.5 w-fit text-[11px] font-semibold mt-0.5 hover:opacity-70 transition-opacity"
        style={{ color: "#b45309" }}>
        {ctaLabel} <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Evidence type label ───────────────────────────────────────────────────────

const EV_LABELS: Record<string, { label: string; color: string }> = {
  adr:        { label: "Decisione",   color: T.blue  },
  decision:   { label: "Decisione",   color: T.blue  },
  audit:      { label: "Audit",       color: T.amber },
  log:        { label: "Log",         color: T.gray  },
  test:       { label: "Test",        color: T.green },
  incident:   { label: "Incidente",   color: T.red   },
  monitoring: { label: "Monitoraggio",color: T.gray  },
};

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "poco fa";
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  if (diff < 172800) return "ieri";
  return `${Math.floor(diff / 86400)} giorni fa`;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, href, linkLabel }: {
  label: string; count?: number; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div style={{ width: 2, height: 12, borderRadius: 1, background: T.text }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted }}>
          {label}
        </span>
        {count !== undefined && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
            background: T.grayBg, color: T.faint, border: `1px solid ${T.border}`,
          }}>{count}</span>
        )}
      </div>
      {href && linkLabel && (
        <Link href={href} className="flex items-center gap-0.5 hover:opacity-60 transition-opacity"
          style={{ fontSize: 11, color: T.muted }}>
          {linkLabel} <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoveredSystem {
  id: string;
  name: string;
  status: string;
  addedToCompliance: boolean;
  riskLevel?: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role } = useUserRole();
  const [showWizard, setShowWizard]   = useState(false);
  const [dossierPct, setDossierPct]   = useState(0);
  const [dossierDone, setDossierDone] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [mounted, setMounted]         = useState(false);

  // Alert state
  const [newSystemCount, setNewSystemCount]   = useState(0);
  const [newSystemNames, setNewSystemNames]   = useState<string[]>([]);
  const [hasSources, setHasSources]           = useState(true);
  const [discoveryDismissed, setDiscoveryDismissed] = useState(false);
  const [deadlineDismissed, setDeadlineDismissed]   = useState(true);
  const [alertDeadline, setAlertDeadline]           = useState<RegulatoryDeadline | null>(null);
  const [alertDeadlineDays, setAlertDeadlineDays]   = useState<number | null>(null);
  const [art73MinDays, setArt73MinDays] = useState<number | null>(null);
  const [art73Count, setArt73Count]     = useState(0);
  const [art73Dismissed, setArt73Dismissed]   = useState(false);
  const [gpaiDismissed, setGpaiDismissed]     = useState(true);

  // Main data
  const [systems, setSystems]             = useState<DiscoveredSystem[]>([]);
  const [onboardingSystem, setOnboardingSystem] = useState<string>("");
  const [nextActions, setNextActions]     = useState<{ id: string; title: string; article: string; href: string }[]>([]);
  const [deadlines, setDeadlines]         = useState<{ deadline: RegulatoryDeadline; days: number }[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<EvidenceRecord[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!isOnboardingDone()) setShowWizard(true);

    // Dossier
    const data = aggregateDossier();
    const sections = getDossierSections(data);
    setDossierPct(getCompletionPercentage(sections));
    setDossierDone(getCompletedCount(sections));
    setTotalSections(sections.length);

    // Next actions
    setNextActions(
      sections
        .filter(s => s.status !== "complete")
        .slice(0, 5)
        .map(s => ({ id: s.id, title: s.title, article: s.article, href: s.href }))
    );

    // Onboarding system name
    try {
      const ob = localStorage.getItem("aicomply_onboarding_data");
      if (ob) { const parsed = JSON.parse(ob); setOnboardingSystem(parsed?.systemName || ""); }
    } catch { /* ignore */ }

    // AI Systems from Discovery
    try {
      const classifier = readFromStorage<ClassifierResult>("classifier");
      const sysRaw = localStorage.getItem("aicomply_discovered_systems");
      const sys: DiscoveredSystem[] = sysRaw ? JSON.parse(sysRaw) : [];
      const active = sys.filter(s => s.status !== "ignored").map(s => ({
        ...s,
        riskLevel: classifier?.systemName && classifier.systemName.toLowerCase() === s.name.toLowerCase()
          ? classifier.riskLevel
          : s.riskLevel,
      }));
      setSystems(active);
    } catch { /* ignore */ }

    // Upcoming deadlines (next 3)
    const today = new Date();
    const upcoming = REGULATORY_DEADLINES
      .filter(d => new Date(d.date) > today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3)
      .map(d => ({ deadline: d, days: daysUntil(d.date) }));
    setDeadlines(upcoming);

    // Evidence
    try {
      const ev = getAllEvidence();
      setRecentEvidence(
        [...ev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
      );
    } catch { /* ignore */ }

    // Alerts
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
      setNewSystemNames(pending.slice(0, 2).map((s: { name: string }) => s.name));
    } catch { /* ignore */ }

    const DEADLINE_DISMISS_KEY = "aicomply_deadline_banner_dismissed_v2";
    if (localStorage.getItem(DEADLINE_DISMISS_KEY) !== "1") {
      const todayN = new Date();
      const next = REGULATORY_DEADLINES
        .filter(d => new Date(d.date) > todayN)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
      if (next) { setAlertDeadline(next); setAlertDeadlineDays(daysUntil(next.date)); setDeadlineDismissed(false); }
    }

    try {
      const raw = localStorage.getItem("post_market_incidents");
      if (raw) {
        const incidents = JSON.parse(raw) as Array<{ date: string; notified: boolean }>;
        const urgent = incidents.filter(i => !i.notified).map(i => {
          const created = new Date(i.date);
          const deadline = new Date(created.getTime() + 15 * 24 * 60 * 60 * 1000);
          return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }).filter(d => d <= 15 && d > 0);
        if (urgent.length > 0) { setArt73Count(urgent.length); setArt73MinDays(Math.min(...urgent)); }
      }
    } catch { /* ignore */ }
  }, []);

  const pctColor = dossierPct >= 80 ? T.green : dossierPct >= 40 ? T.amber : T.indigo;

  const showDiscovery = newSystemCount > 0 || (!hasSources && !discoveryDismissed);
  const showDeadline  = !deadlineDismissed && alertDeadline !== null && alertDeadlineDays !== null;
  const showArt73     = art73Count > 0 && !art73Dismissed;
  const showGpai      = !gpaiDismissed;
  const alertCount    = [showDiscovery, showDeadline, showArt73, showGpai].filter(Boolean).length;

  // Main system fallback
  const mainSystemName = onboardingSystem || "Sistema AI principale";
  const classifier     = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const showMainSystem = systems.length === 0 && isOnboardingDone();

  return (
    <>
      {showWizard && <OnboardingWizard onComplete={() => setShowWizard(false)} />}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s ease both; }
        @media (max-width: 768px) {
          .dash-main-grid  { grid-template-columns: 1fr !important; }
          .dash-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
          .dash-quick-grid  { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div className="w-full">

        {/* ── ALERTS ──────────────────────────────────────────────────── */}
        {alertCount > 0 && (
          <div className="mb-6" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {showDiscovery && (
              <AlertCard
                label={newSystemCount > 0 ? `${newSystemCount} sistema/i AI — classificazione richiesta` : "Scopri i sistemi AI nella tua infrastruttura"}
                desc={newSystemCount > 0 ? (newSystemNames.length > 0 ? newSystemNames.join(", ") : "Sistemi rilevati non ancora classificati.") : "Connetti GitHub, AWS o Azure per un inventario automatico."}
                ctaLabel="Avvia Discovery" ctaHref="/dashboard/discovery"
                onDismiss={newSystemCount === 0 ? () => setDiscoveryDismissed(true) : undefined}
              />
            )}
            {showDeadline && (
              <AlertCard
                label={`${alertDeadline!.article} · ${alertDeadlineDays} giorni alla scadenza`}
                desc={alertDeadline!.title} ctaLabel="Vedi timeline" ctaHref="/dashboard/notifications"
                onDismiss={() => { setDeadlineDismissed(true); localStorage.setItem("aicomply_deadline_banner_dismissed_v2", "1"); }}
              />
            )}
            {showArt73 && (
              <AlertCard
                label={`Art. 73 · Notifica entro ${art73MinDays} giorni`}
                desc={`${art73Count} incidente/i non ancora segnalato/i all'autorità competente.`}
                ctaLabel="Notifica ora" ctaHref="/dashboard/post-market"
                onDismiss={() => setArt73Dismissed(true)}
              />
            )}
            {showGpai && (
              <AlertCard
                label="GPAI Art. 51-55 · Obblighi in vigore"
                desc="Usi OpenAI, Anthropic o Google AI? Hai obblighi già operativi da configurare."
                ctaLabel="Configura" ctaHref="/dashboard/modules/gpai"
                onDismiss={() => { setGpaiDismissed(true); localStorage.setItem("aicomply_gpai_banner_dismissed", "1"); }}
              />
            )}
          </div>
        )}

        {/* ── COMPLIANCE JOURNEY ──────────────────────────────────────── */}
        <ComplianceJourneyDashboard />

        {/* ── HEADER + DOSSIER ────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.8px", color: T.text, lineHeight: 1.15, marginBottom: 4 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 13, color: T.muted }}>
              {role === "deployer" ? "Obblighi Art. 26 — tool obbligatori per deployer."
                : role === "distributor" ? "Obblighi minimi Art. 24 per distributori."
                : "Compliance EU AI Act 2024/1689 — completa i tool per ogni sistema AI."}
            </p>
          </div>
          <Link href="/dashboard/dossier"
            className="flex items-center gap-3 rounded-xl px-4 py-3 hover:opacity-80 transition-opacity flex-shrink-0 ml-8"
            style={{ ...cardSt, minWidth: 200 }}>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>Dossier</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: pctColor }}>{dossierPct}%</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
                <div className="h-1 rounded-full transition-all duration-700"
                  style={{ width: `${dossierPct}%`, background: pctColor }} />
              </div>
              <p style={{ fontSize: 10, color: "rgba(0,0,0,0.3)", marginTop: 4 }}>
                {dossierDone}/{totalSections} sezioni · Genera PDF →
              </p>
            </div>
          </Link>
        </div>

        {/* ── STATS ───────────────────────────────────────────────────── */}
        <div className="rounded-xl mb-6" style={{ ...cardSt }}>
          <div className="dash-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { label: "Tool completati", value: String(dossierDone), sub: `/${totalSections}` },
              { label: "Sistemi AI",       value: systems.length > 0 ? String(systems.length) : showMainSystem ? "1" : "0", sub: "" },
              { label: "Azioni in sospeso",value: String(nextActions.length), sub: "" },
              { label: "Prossima scadenza",value: deadlines[0] ? `${deadlines[0].days}g` : "—", sub: "" },
            ].map((s, i) => (
              <div key={s.label} className="px-6 py-4"
                style={{ borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px", color: T.text, lineHeight: 1.1 }}>
                  {s.value}
                  {s.sub && <span style={{ fontSize: 13, fontWeight: 400, color: T.faint }}>{s.sub}</span>}
                </div>
                <div style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN GRID: AI Systems + Radar ───────────────────────── */}
        <div className="dash-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start", marginBottom: 20 }}>

          {/* LEFT: AI Systems */}
          <div>
            <SectionHeader
              label="I tuoi sistemi AI"
              count={systems.length > 0 ? systems.length : showMainSystem ? 1 : 0}
              href="/dashboard/discovery"
              linkLabel="Aggiungi sistema"
            />

            {systems.length === 0 && !showMainSystem && (
              <div style={{ ...cardSt, padding: 40, textAlign: "center" }} className="fade-up">
                <Layers className="h-8 w-8 mx-auto mb-3" style={{ color: T.faint }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6 }}>
                  Nessun sistema AI registrato
                </p>
                <p style={{ fontSize: 12, color: T.muted, marginBottom: 16, maxWidth: 280, margin: "0 auto 16px" }}>
                  Avvia Discovery per rilevare automaticamente i sistemi AI nella tua infrastruttura.
                </p>
                <Link href="/dashboard/discovery"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium hover:opacity-80 transition-opacity"
                  style={{ background: T.text, color: "#fff" }}>
                  <Plus className="h-3.5 w-3.5" /> Avvia Discovery
                </Link>
              </div>
            )}

            {systems.length === 0 && showMainSystem && (
              <SystemCard
                name={mainSystemName}
                riskLevel={classifier?.riskLevel}
                dossierPct={dossierPct}
                nextAction={nextActions[0]?.title}
                nextActionHref={nextActions[0]?.href}
                index={0}
                status="active"
              />
            )}

            {systems.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {systems.map((sys, i) => (
                  <SystemCard
                    key={sys.id}
                    name={sys.name}
                    riskLevel={sys.riskLevel}
                    dossierPct={dossierPct}
                    nextAction={nextActions[0]?.title}
                    nextActionHref={nextActions[0]?.href}
                    index={i}
                    status={sys.status}
                  />
                ))}
                <Link href="/dashboard/discovery"
                  className="fade-up flex flex-col items-center justify-center gap-2 rounded-xl hover:opacity-70 transition-opacity"
                  style={{ border: `1.5px dashed ${T.border}`, background: "transparent", minHeight: 120, animationDelay: `${systems.length * 60}ms` }}>
                  <Plus className="h-5 w-5" style={{ color: T.faint }} />
                  <span style={{ fontSize: 11, color: T.faint }}>Aggiungi sistema</span>
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT: Radar */}
          <ComplianceRadarChart />
        </div>

        {/* ── BOTTOM ROW: 3 sezioni a piena larghezza ─────────────── */}
        <div className="dash-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Scadenze urgenti */}
          <div style={{ ...cardSt, padding: 16 }}>
            <SectionHeader label="Scadenze urgenti" href="/dashboard/notifications" linkLabel="Tutte" />
            {deadlines.length === 0 ? (
              <p style={{ fontSize: 12, color: T.faint, padding: "6px 0" }}>Nessuna scadenza imminente.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deadlines.map(({ deadline, days }, i) => {
                  const color = days <= 30 ? T.red : days <= 90 ? T.amber : T.muted;
                  const bg    = days <= 30 ? T.redBg : days <= 90 ? T.amberBg : T.grayBg;
                  const bdr   = days <= 30 ? T.redBdr : days <= 90 ? T.amberBdr : T.grayBdr;
                  return (
                    <Link key={deadline.id} href="/dashboard/notifications"
                      className="flex items-start justify-between gap-2 group hover:opacity-80 transition-opacity"
                      style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${i === 0 ? bdr : T.border}`, background: i === 0 ? bg : "transparent" }}>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 1 }}>{deadline.article}</p>
                        <p style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deadline.title}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, padding: "2px 7px", borderRadius: 4, background: bg, color, border: `1px solid ${bdr}` }}>
                        {days}g
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prossime azioni */}
          <div style={{ ...cardSt, padding: 16 }}>
            <SectionHeader label="Prossime azioni" count={nextActions.length} />
            {nextActions.length === 0 ? (
              <div className="flex items-center gap-2" style={{ padding: "8px 0" }}>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: T.green }} />
                <span style={{ fontSize: 12, color: T.green, fontWeight: 500 }}>Dossier completato</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {nextActions.map((action, i) => (
                  <Link key={action.id} href={action.href}
                    className="flex items-center gap-2.5 group hover:opacity-70 transition-opacity"
                    style={{ padding: "7px 0", borderBottom: i < nextActions.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: i === 0 ? T.indigo : T.faint }} />
                    <span style={{ flex: 1, fontSize: 12, color: T.text, fontWeight: i === 0 ? 500 : 400 }}>{action.title}</span>
                    <span style={{ fontSize: 9, color: T.faint, background: T.grayBg, padding: "1px 5px", borderRadius: 3, border: `1px solid ${T.border}`, flexShrink: 0 }}>
                      {action.article}
                    </span>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.faint }} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Attività recente */}
          <div style={{ ...cardSt, padding: 16 }}>
            <SectionHeader label="Attività recente" href="/dashboard/evidence-layer" linkLabel="Vedi tutto" />
            {recentEvidence.length === 0 ? (
              <p style={{ fontSize: 12, color: T.faint, padding: "6px 0" }}>Nessuna attività ancora.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentEvidence.map((ev, i) => {
                  const cfg = EV_LABELS[ev.type] ?? { label: ev.type, color: T.gray };
                  return (
                    <div key={ev.id} className="flex items-center gap-2.5"
                      style={{ padding: "7px 0", borderBottom: i < recentEvidence.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <span style={{ fontSize: 11, fontWeight: 500, padding: "1px 5px", borderRadius: 3, background: T.grayBg, color: T.muted, marginRight: 4, border: `1px solid ${T.border}` }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 11, color: T.text }}>
                          {(ev.content as Record<string, unknown>)?.tool as string ?? ev.type}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: T.faint, flexShrink: 0 }}>{relTime(ev.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── QUICK LINKS ─────────────────────────────────────────── */}
        <div className="dash-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { label: "Roadmap",     href: "/dashboard/journey",          Icon: TrendingUp },
            { label: "Post-Market", href: "/dashboard/post-market",      Icon: Activity   },
            { label: "Art. 5",      href: "/dashboard/tools/prohibited", Icon: Ban        },
            { label: "Conformity",  href: "/dashboard/tools/conformity", Icon: Zap        },
          ].map(({ label, href, Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:opacity-75 transition-opacity"
              style={{ ...cardSt, fontSize: 11, fontWeight: 500, color: T.muted }}>
              <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: T.faint }} />
              {label}
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}

// ── System Card ───────────────────────────────────────────────────────────────

function SystemCard({ name, riskLevel, dossierPct, nextAction, nextActionHref, index, status }: {
  name: string;
  riskLevel?: string;
  dossierPct: number;
  nextAction?: string;
  nextActionHref?: string;
  index: number;
  status?: string;
}) {
  const cfg = riskLevel ? RISK_CFG[riskLevel] : null;
  const barColor = cfg?.bar ?? "rgba(0,0,0,0.15)";

  return (
    <Link href={nextActionHref ?? "/dashboard/journey"}
      className="fade-up group block relative overflow-hidden rounded-xl hover:shadow-md transition-shadow"
      style={{
        ...cardSt,
        borderLeft: `3px solid ${cfg?.color ?? "rgba(0,0,0,0.12)"}`,
        animationDelay: `${index * 60}ms`,
        padding: 14,
      }}>

      {/* Name */}
      <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1016", marginBottom: 3, lineHeight: 1.3 }}>
        {name}
      </p>

      {/* Risk badge */}
      {cfg ? (
        <span style={{
          display: "inline-block", fontSize: 10, fontWeight: 600,
          padding: "2px 7px", borderRadius: 4, marginBottom: 12,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}`,
        }}>
          {cfg.label}
        </span>
      ) : (
        <span style={{
          display: "inline-block", fontSize: 10, fontWeight: 500,
          padding: "2px 7px", borderRadius: 4, marginBottom: 12,
          background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.32)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}>
          Da classificare
        </span>
      )}

      {/* Status badge */}
      {status && status !== "ignored" && (
        <span style={{
          display: "inline-block", fontSize: 9, fontWeight: 600,
          padding: "1px 6px", borderRadius: 3, marginBottom: 8, marginLeft: 4,
          background: "rgba(21,128,61,0.06)", color: "#15803d",
          border: "1px solid rgba(21,128,61,0.18)",
        }}>
          {status === "active" ? "Attivo" : status}
        </span>
      )}

      {/* Progress */}
      <div style={{ marginBottom: 8 }}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 10, color: "rgba(0,0,0,0.35)" }}>Dossier</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: dossierPct >= 80 ? "#059669" : dossierPct >= 40 ? "#b45309" : "#0D1016" }}>
            {dossierPct}%
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,0.07)" }}>
          <div style={{
            height: 3, borderRadius: 2,
            width: `${dossierPct}%`,
            background: barColor,
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* Next action */}
      {nextAction && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 flex-shrink-0" style={{ color: "rgba(0,0,0,0.25)" }} />
          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nextAction}
          </span>
        </div>
      )}
      {!nextAction && (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 flex-shrink-0" style={{ color: "#15803d" }} />
          <span style={{ fontSize: 11, color: "#15803d" }}>Dossier completato</span>
        </div>
      )}

      {/* Hover arrow */}
      <ArrowRight
        className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
        style={{ color: "rgba(0,0,0,0.2)" }}
      />
    </Link>
  );
}
