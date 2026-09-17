"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import {
  ArrowRight, X,
  FileCheck2, CalendarClock, BadgeCheck,
  AlertTriangle, Scale, ClipboardList, Activity, Zap, BarChart3,
  Cpu, History, ChevronRight, Server,
  AlertCircle, CheckCircle2, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { isOnboardingDone } from "@/components/onboarding/OnboardingWizard";
import { aggregateDossier, getDossierSections, getCompletionPercentage, getCompletedCount } from "@/lib/dossier/dossier-engine";
import { REGULATORY_DEADLINES, daysUntil, type RegulatoryDeadline } from "@/lib/notifications/notifications-engine";
import { getAllEvidence, type EvidenceRecord } from "@/lib/evidence/evidence-layer";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { readFromStorage, type ClassifierResult } from "@/lib/dossier/storage-schema";
import { loadInventory, computeObligationCount } from "@/lib/inventory/ai-system";
import type { AISystem } from "@/lib/inventory/ai-system";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard"),
  { ssr: false }
);

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.40)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  red:     "#dc2626",   redBg:   "rgba(220,38,38,0.06)",   redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#b45309",   amberBg: "rgba(245,158,11,0.06)",  amberBdr:"rgba(245,158,11,0.2)",
  green:   "#059669",   greenBg: "rgba(5,150,105,0.06)",   greenBdr:"rgba(5,150,105,0.18)",
  gray:    "#6b7280",   grayBg:  "rgba(0,0,0,0.04)",
} as const;

const card: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.015)",
};

// ── Risk config ───────────────────────────────────────────────────────────────

const RISK_CFG: Record<string, { labelKey: string; color: string; bg: string; bdr: string }> = {
  unacceptable: { labelKey: "risk_unacceptable", color: T.red,   bg: T.redBg,   bdr: T.redBdr   },
  high:         { labelKey: "risk_high",         color: T.red,   bg: T.redBg,   bdr: T.redBdr   },
  limited:      { labelKey: "risk_limited",      color: T.amber, bg: T.amberBg, bdr: T.amberBdr },
  minimal:      { labelKey: "risk_minimal",      color: T.green, bg: T.greenBg, bdr: T.greenBdr },
};

// ── Evidence config ───────────────────────────────────────────────────────────

type EvIcon = React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

const EV_CFG: Record<string, { labelKey: string; color: string; Icon: EvIcon }> = {
  adr:        { labelKey: "ev_decision",   color: T.text,  Icon: Scale         },
  decision:   { labelKey: "ev_decision",   color: T.text,  Icon: Scale         },
  audit:      { labelKey: "ev_audit",      color: T.amber, Icon: ClipboardList },
  log:        { labelKey: "ev_log",        color: T.gray,  Icon: Activity      },
  test:       { labelKey: "ev_test",       color: T.green, Icon: Zap           },
  incident:   { labelKey: "ev_incident",   color: T.red,   Icon: AlertTriangle },
  monitoring: { labelKey: "ev_monitoring", color: T.gray,  Icon: BarChart3     },
};

function relTime(iso: string, t: TFn): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return t("rel_now");
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t("rel_min")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t("rel_h")}`;
  if (diff < 172800) return t("rel_yesterday");
  return `${Math.floor(diff / 86400)} ${t("rel_days")}`;
}

// ── Badge components ──────────────────────────────────────────────────────────

function RiskBadge({ level }: { level?: string }) {
  const t = useT("dashHome");
  const cfg = level ? RISK_CFG[level] : null;
  if (!cfg) return <span style={{ fontSize: 10, color: T.faint }}>—</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}`,
      letterSpacing: "0.05px",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {t(cfg.labelKey)}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const t = useT("dashHome");
  const isGood   = status === "compliant";
  const isActive = status === "active";
  const isReview = status === "review";
  const label  = isActive ? t("st_active") : isGood ? t("st_compliant") : isReview ? t("st_review") : status ?? "—";
  const color  = isGood ? T.green : isActive ? T.amber : T.gray;
  const bg     = isGood ? T.greenBg : isActive ? T.amberBg : T.grayBg;
  const bdr    = isGood ? T.greenBdr : isActive ? T.amberBdr : "rgba(0,0,0,0.10)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 100,
      background: bg, color, border: `1px solid ${bdr}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? T.green : pct >= 40 ? T.amber : T.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3, background: color,
          width: `${pct > 0 ? Math.max(pct, 4) : 0}%`,
          transition: "width 0.8s ease",
        }} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, color: T.text,
        minWidth: 34, textAlign: "right",
        letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums",
      }}>{pct}%</span>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoveredSystem {
  id: string; name: string; status: string;
  addedToCompliance: boolean; riskLevel?: string;
}

interface InProgressActivity {
  id: string;
  titleKey: string;
  subKey: string;
  href: string;
  pct: number; // -1 = unknown
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role } = useUserRole();
  const t = useT("dashHome");
  const locale = useLocale();
  const [showWizard, setShowWizard]         = useState(false);
  const [dossierPct, setDossierPct]         = useState(0);
  const [dossierDone, setDossierDone]       = useState(0);
  const [mounted, setMounted]               = useState(false);

  const [hasSources, setHasSources]         = useState(true);
  const [discoveryDismissed, setDiscoveryDismissed] = useState(false);
  const [deadlineDismissed, setDeadlineDismissed]   = useState(true);
  const [alertDeadline, setAlertDeadline]   = useState<RegulatoryDeadline | null>(null);
  const [alertDeadlineDays, setAlertDeadlineDays] = useState<number | null>(null);
  const [art73MinDays, setArt73MinDays]     = useState<number | null>(null);
  const [art73Count, setArt73Count]         = useState(0);
  const [art73Dismissed, setArt73Dismissed] = useState(false);
  const [gpaiDismissed, setGpaiDismissed]   = useState(true);
  const [newSystemCount, setNewSystemCount] = useState(0);

  const [systems, setSystems]               = useState<DiscoveredSystem[]>([]);
  const [inventorySystems, setInventorySystems] = useState<AISystem[]>([]);
  const [onboardingSystem, setOnboardingSystem] = useState<string>("");
  const [nextActions, setNextActions]       = useState<{ id: string; title: string; article: string; href: string }[]>([]);
  const [deadlines, setDeadlines]           = useState<{ deadline: RegulatoryDeadline; days: number }[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<EvidenceRecord[]>([]);
  const [inProgress, setInProgress]         = useState<InProgressActivity[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!isOnboardingDone()) setShowWizard(true);

    const data     = aggregateDossier();
    const sections = getDossierSections(data);
    setDossierPct(getCompletionPercentage(sections));
    setDossierDone(getCompletedCount(sections));

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
    try { setInventorySystems(loadInventory()); } catch { /* ignore */ }

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
          const d = new Date(new Date(i.date).getTime() + 15 * 24 * 60 * 60 * 1000);
          return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }).filter(d => d <= 15 && d > 0);
        if (urgent.length > 0) { setArt73Count(urgent.length); setArt73MinDays(Math.min(...urgent)); }
      }
    } catch { /* ignore */ }

    // ── In-progress activity detection ──────────────────────────
    try {
      const acts: InProgressActivity[] = [];
      const friaG = readFromStorage<{ overallPercent: number }>("friaGuided");
      if (friaG && friaG.overallPercent > 0 && friaG.overallPercent < 100) {
        acts.push({ id: "fria", titleKey: "ip_fria_title", subKey: "ip_fria_sub", href: "/dashboard/tools/fria", pct: friaG.overallPercent });
      }
      const dpiaG = readFromStorage<{ overallPercent: number }>("dpiaGuided");
      if (dpiaG && dpiaG.overallPercent > 0 && dpiaG.overallPercent < 100) {
        acts.push({ id: "dpia", titleKey: "ip_dpia_title", subKey: "ip_dpia_sub", href: "/dashboard/tools/dpia", pct: dpiaG.overallPercent });
      }
      const assessment = readFromStorage<object>("assessment");
      if (assessment && Object.keys(assessment).length > 0) {
        acts.push({ id: "assessment", titleKey: "ip_assessment_title", subKey: "ip_assessment_sub", href: "/dashboard/tools/assessment", pct: -1 });
      }
      const rrKeys = Object.keys(localStorage).filter(k => k.includes("risk_register") && !k.includes("signoff"));
      if (rrKeys.length > 0) {
        acts.push({ id: "risk", titleKey: "ip_risk_title", subKey: "ip_risk_sub", href: "/dashboard/tools/risk-manager", pct: -1 });
      }
      setInProgress(acts);
    } catch { /* ignore */ }
  }, []);

  const pctColor      = dossierPct >= 80 ? T.green : dossierPct >= 40 ? T.amber : T.text;
  const scoreLabel    = dossierPct >= 80 ? t("score_good") : dossierPct >= 40 ? t("score_improving") : t("score_action");
  const levelLabel    = dossierPct >= 80 ? t("level_high") : dossierPct >= 40 ? t("level_med") : t("level_low");
  const showDiscovery = newSystemCount > 0 || (!hasSources && !discoveryDismissed);
  const showDeadline  = !deadlineDismissed && alertDeadline !== null;
  const showArt73     = art73Count > 0 && !art73Dismissed;
  const mainSysName   = onboardingSystem || t("mainSysName");
  const classifier    = typeof window !== "undefined" ? readFromStorage<ClassifierResult>("classifier") : null;
  const hasInventory  = inventorySystems.length > 0;
  const showMainSys   = !hasInventory && systems.length === 0 && isOnboardingDone();
  const totalSystems  = hasInventory ? inventorySystems.length
    : systems.length > 0 ? systems.length : showMainSys ? 1 : 0;
  // Tier → RISK_CFG key adapter
  const TIER_RISK: Record<string, string> = {
    prohibited: "unacceptable", high_risk: "high",
    limited: "limited", minimal: "minimal",
    gpai: "limited", gpai_systemic: "high", unclassified: "minimal",
  };
  const showBanner    = nextActions[0] || showDeadline || showArt73 || showDiscovery;
  const criticalDeadlines = deadlines.filter(d => d.days <= 90);

  const dateLocale = locale === "en" ? "en-GB" : "it-IT";
  const nowStr = mounted ? new Date().toLocaleString(dateLocale, {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " UTC" : "";

  return (
    <>
      {showWizard && <OnboardingWizard onComplete={() => setShowWizard(false)} />}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fu { animation: fadeUp 0.3s ease both; }
        .fu-1 { animation: fadeUp 0.3s 0.05s ease both; }
        .fu-2 { animation: fadeUp 0.3s 0.10s ease both; }
        .fu-3 { animation: fadeUp 0.3s 0.15s ease both; }
        .sys-row:hover { background: rgba(0,0,0,0.015) !important; }
        .bottom-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04) !important; }
        @media (max-width: 900px) {
          .main-grid  { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .bot-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="w-full">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="fu" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", color: T.faint, marginBottom: 7 }}>
              {nowStr}
            </p>
            <h1 style={{ fontSize: 27, fontWeight: 400, letterSpacing: "-0.9px", color: T.text, lineHeight: 1.1, marginBottom: 5 }}>
              {t("title")}
            </h1>
            <p style={{ fontSize: 12, color: T.muted }}>
              {role === "deployer" ? t("role_deployer")
                : role === "distributor" ? t("role_distributor")
                : t("role_default")}
            </p>
          </div>

          {/* Score */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 1, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 58, fontWeight: 200, letterSpacing: "-4px", color: T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {dossierPct}
              </span>
              <span style={{ fontSize: 24, fontWeight: 300, color: "rgba(0,0,0,0.18)", letterSpacing: "-1px" }}>/100</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: T.faint }}>{levelLabel}</span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.faint, display: "inline-block" }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: pctColor }}>{scoreLabel}</span>
            </div>
            <div style={{ height: 2, width: 100, background: "rgba(0,0,0,0.06)", borderRadius: 1, marginTop: 7, marginLeft: "auto" }}>
              <div style={{ height: 2, width: `${dossierPct}%`, maxWidth: 100, background: pctColor, borderRadius: 1, transition: "width 0.8s ease" }} />
            </div>
          </div>
        </div>

        {/* ── ALERT BANNER ────────────────────────────────────────── */}
        {showBanner && (
          <div className="fu-1" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: "13px 18px", borderRadius: 8, marginBottom: 16,
            background: "rgba(0,0,0,0.025)",
            border: `1px solid rgba(0,0,0,0.07)`,
            borderLeft: `3px solid ${T.text}`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 3 }}>
                {showArt73 ? `${t("b_art73_pre")} ${art73MinDays} ${t("b_days")}`
                  : showDeadline ? alertDeadline!.title
                  : showDiscovery ? t("b_discovery_title")
                  : nextActions[0]?.title}
              </p>
              <p style={{ fontSize: 11, color: T.muted }}>
                {showArt73 ? `${art73Count} ${t("b_art73_sub")}`
                  : showDeadline ? `${alertDeadline!.article} · ${t("b_deadline_due")} ${new Date(alertDeadline!.date).toLocaleDateString(dateLocale, { day:"2-digit", month:"short", year:"numeric" })} — ${alertDeadlineDays} ${t("b_days_remaining")}`
                  : showDiscovery ? t("b_discovery_sub")
                  : nextActions[0] ? `Art. ${nextActions[0].article} · ${t("annexIII")}` : ""}
              </p>
            </div>
            <Link
              href={showArt73 ? "/dashboard/post-market"
                : showDeadline ? "/dashboard/notifications"
                : showDiscovery ? "/dashboard/tools/inventory"
                : nextActions[0]?.href ?? "/dashboard/journey"}
              style={{
                padding: "8px 16px", background: T.text, color: "#fff", borderRadius: 6,
                fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                letterSpacing: "-0.1px",
              }}>
              {showArt73 ? t("btn_notify")
                : showDeadline ? t("btn_timeline")
                : showDiscovery ? t("btn_discovery")
                : t("btn_section")}
              <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* ── STATS ───────────────────────────────────────────────── */}
        <div className="stats-grid fu-1" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 14, overflow: "hidden" }}>
          {[
            {
              Icon: Server,
              label: t("stat_systems"),
              value: totalSystems,
              sub: totalSystems > 0
                ? `${systems.filter(s => s.riskLevel === "high" || s.riskLevel === "unacceptable").length} ${t("stat_systems_sub")}`
                : t("stat_startDiscovery"),
            },
            {
              Icon: AlertCircle,
              label: t("stat_openObl"),
              value: nextActions.length,
              sub: nextActions.length > 0 ? `${Math.min(nextActions.length, 2)} ${t("stat_obl_urgent")}` : t("stat_obl_none"),
            },
            {
              Icon: FileCheck2,
              label: t("stat_signedDocs"),
              value: dossierDone,
              sub: t("stat_docs_sub"),
            },
            {
              Icon: CalendarClock,
              label: t("stat_nextDeadline"),
              value: deadlines[0] ? `${deadlines[0].days}` : "—",
              unit: deadlines[0] ? t("unit_days") : undefined,
              sub: deadlines[0] ? `${deadlines[0].deadline.article} · ${t("stat_deadline_sub")}` : t("stat_noDeadline"),
            },
          ].map(({ Icon, label, value, unit, sub }, i) => (
            <div key={label} style={{
              padding: "16px 20px",
              borderRight: i < 3 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                <Icon size={11} style={{ color: T.faint }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: T.faint }}>
                  {label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 4 }}>
                <span style={{ fontSize: 34, fontWeight: 200, letterSpacing: "-1.5px", color: T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {value}
                </span>
                {unit && <span style={{ fontSize: 14, fontWeight: 400, color: T.muted }}>{unit}</span>}
              </div>
              <p style={{ fontSize: 10, color: T.faint, lineHeight: 1.4 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ───────────────────────────────────────────── */}
        <div className="main-grid fu-2" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 12, alignItems: "start" }}>

          {/* Systems Table */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Cpu size={13} style={{ color: T.faint }} />
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: T.faint }}>
                    {t("tbl_title")}
                  </span>
                  {totalSystems > 0 && (
                    <span style={{ fontSize: 9, color: T.faint, marginLeft: 8 }}>
                      {Math.min(4, totalSystems)} / {totalSystems}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Col headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 160px", columnGap: 24, padding: "8px 18px", background: "rgba(0,0,0,0.015)", borderBottom: `1px solid ${T.border}` }}>
              {[t("col_system"), t("col_risk"), t("col_status"), t("col_dossier")].map(h => (
                <span key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: T.faint }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {totalSystems === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center" }}>
                <Server size={28} style={{ color: "rgba(0,0,0,0.08)", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>{t("empty_systems")}</p>
                <Link href="/dashboard/tools/inventory"
                  style={{ fontSize: 12, fontWeight: 500, color: "#fff", background: T.text, padding: "8px 16px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t("go_inventory")} <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <>
                {/* Inventory systems (primary source) */}
                {hasInventory && inventorySystems.slice(0, 4).map((sys, i) => {
                  const { total: oblTotal, done: oblDone } = computeObligationCount(sys);
                  const invPct = oblTotal > 0 ? Math.round(oblDone / oblTotal * 100) : dossierPct;
                  const invStatus = sys.status === "in_production" && oblDone === oblTotal ? "compliant"
                    : sys.status === "deprecated" ? "review" : "active";
                  return (
                    <Link key={sys.id} href={`/dashboard/tools/inventory/${sys.id}`} style={{ textDecoration: "none" }}>
                      <div className="sys-row" style={{
                        display: "grid", gridTemplateColumns: "1fr 140px 120px 160px", columnGap: 24,
                        padding: "13px 18px", alignItems: "center",
                        borderBottom: i < Math.min(3, inventorySystems.length - 1) ? `1px solid ${T.border}` : "none",
                        transition: "background 0.15s", cursor: "pointer",
                      }}>
                        <div>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{sys.name}</p>
                          <p style={{ fontSize: 10, color: T.faint }}>
                            {sys.tier !== "unclassified" ? (TIER_RISK[sys.tier] === "unacceptable" ? t("risk_prohibited") : TIER_RISK[sys.tier] === "high" ? t("risk_highShort") : sys.tier === "gpai" ? "GPAI" : t("risk_limitedShort")) : t("toClassify")}
                            {(sys.tier === "high_risk" || sys.tier === "prohibited") ? ` ${t("suffix_annexIII4")}` : ` ${t("suffix_art50")}`}
                          </p>
                        </div>
                        <RiskBadge level={TIER_RISK[sys.tier]} />
                        <StatusBadge status={invStatus} />
                        <ScoreBar pct={invPct > 0 ? invPct : dossierPct} />
                      </div>
                    </Link>
                  );
                })}
                {/* Discovery fallback (when no inventory) */}
                {!hasInventory && showMainSys && systems.length === 0 && (
                  <div className="sys-row" style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 160px", columnGap: 24, padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${T.border}`, transition: "background 0.15s" }}>
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{mainSysName}</p>
                      <p style={{ fontSize: 10, color: T.faint }}>
                        {classifier?.riskLevel && RISK_CFG[classifier.riskLevel] ? t(RISK_CFG[classifier.riskLevel].labelKey) : t("classified")}
                        {(classifier?.riskLevel === "high" || classifier?.riskLevel === "unacceptable") ? ` ${t("suffix_annexIII4")}` : ` ${t("suffix_art50")}`}
                      </p>
                    </div>
                    <RiskBadge level={classifier?.riskLevel} />
                    <StatusBadge status="active" />
                    <ScoreBar pct={dossierPct} />
                  </div>
                )}
                {!hasInventory && systems.slice(0, 4).map((sys, i) => (
                  <div key={sys.id} className="sys-row" style={{
                    display: "grid", gridTemplateColumns: "1fr 140px 120px 160px", columnGap: 24,
                    padding: "13px 18px", alignItems: "center",
                    borderBottom: i < Math.min(3, systems.length - 1) ? `1px solid ${T.border}` : "none",
                    transition: "background 0.15s",
                  }}>
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{sys.name}</p>
                      <p style={{ fontSize: 10, color: T.faint }}>
                        {sys.riskLevel && RISK_CFG[sys.riskLevel] ? t(RISK_CFG[sys.riskLevel].labelKey) : sys.riskLevel ? "—" : t("toClassify")}
                        {(sys.riskLevel === "high" || sys.riskLevel === "unacceptable") ? ` ${t("suffix_annexIII4")}` : ` ${t("suffix_art50")}`}
                      </p>
                    </div>
                    <RiskBadge level={sys.riskLevel} />
                    <StatusBadge status={sys.status} />
                    <ScoreBar pct={dossierPct} />
                  </div>
                ))}
              </>
            )}

            <div style={{ padding: "11px 18px", borderTop: totalSystems > 0 ? `1px solid ${T.border}` : "none" }}>
              <Link href="/dashboard/tools/inventory"
                style={{
                  fontSize: 11.5, fontWeight: 500, color: T.text,
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 12px", borderRadius: 6,
                  border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.01)",
                  transition: "opacity 0.15s",
                }}>
                <Server size={12} style={{ color: T.faint }} />
                {t("all_systems")}
                <ArrowRight size={11} style={{ color: T.faint }} />
              </Link>
            </div>
          </div>

          {/* Activity */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 7 }}>
              <History size={12} style={{ color: T.faint }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: T.faint }}>
                {t("act_recent")}
              </span>
            </div>

            {recentEvidence.length === 0 ? (
              <div style={{ padding: "24px 18px" }}>
                <p style={{ fontSize: 12, color: T.faint }}>{t("act_none")}</p>
              </div>
            ) : (
              recentEvidence.map((ev, i) => {
                const cfg = EV_CFG[ev.type];
                const evLabel = cfg ? t(cfg.labelKey) : ev.type;
                const Icon = cfg?.Icon ?? Activity;
                const cfgColor = cfg?.color ?? T.gray;
                const toolName = (ev.content as Record<string, unknown>)?.tool as string
                  || (ev.content as Record<string, unknown>)?.title as string
                  || evLabel;
                const artLabel = (ev.content as Record<string, unknown>)?.article as string ?? "";
                return (
                  <div key={ev.id} style={{
                    padding: "11px 18px",
                    borderBottom: i < recentEvidence.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: T.grayBg, border: `1px solid ${T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={12} style={{ color: cfgColor }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11.5, fontWeight: 600, color: T.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {toolName}
                        </p>
                        <p style={{ fontSize: 10, color: T.faint }}>
                          {artLabel ? `${artLabel} · ` : ""}{evLabel} · {relTime(ev.timestamp, t)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ padding: "11px 18px", borderTop: recentEvidence.length > 0 ? `1px solid ${T.border}` : "none" }}>
              <Link href="/dashboard/evidence-layer"
                style={{ fontSize: 11.5, fontWeight: 500, color: T.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <History size={11} style={{ color: T.faint }} />
                {t("act_fullLog")}
                <ArrowRight size={11} style={{ color: T.faint }} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── BOTTOM CARDS ─────────────────────────────────────────── */}
        <div className="bot-grid fu-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

          {[
            {
              href:  "/dashboard/dossier",
              Icon:  FileCheck2,
              title: `${dossierDone} ${t("card_docs")}`,
              sub:   t("card_docs_sub"),
              accent: T.green,
            },
            {
              href:  "/dashboard/notifications",
              Icon:  CalendarClock,
              title: `${criticalDeadlines.length} ${t("card_deadlines")}`,
              sub:   deadlines[0]
                ? `${deadlines[0].deadline.article}${deadlines[1] ? " · " + deadlines[1].deadline.article : ""} · ${t("card_within")} ${deadlines[0].days} ${t("b_days")}`
                : t("card_deadlines_none"),
              accent: criticalDeadlines.length > 0 ? T.amber : T.text,
            },
            {
              href:  "/dashboard/tools/trust-center",
              Icon:  BadgeCheck,
              title: "Trust Center",
              sub:   t("card_trust_sub"),
              accent: T.text,
            },
          ].map(({ href, Icon, title, sub, accent }) => (
            <Link key={href} href={href} className="bottom-card" style={{
              ...card, padding: "15px 18px", display: "block", textDecoration: "none",
              transition: "box-shadow 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: T.grayBg, border: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} style={{ color: accent }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 400, letterSpacing: "-0.3px", color: T.text, lineHeight: 1.2 }}>
                  {title}
                </p>
              </div>
              <p style={{ fontSize: 10, color: T.faint, paddingLeft: 43 }}>{sub}</p>
            </Link>
          ))}

        </div>

        {/* ── ATTIVITÀ IN CORSO ─────────────────────────────────── */}
        {inProgress.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("ip_title")}</span>
              <span style={{ fontSize: 10, color: T.faint }}>{inProgress.length} {t("ip_count")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(inProgress.length, 4)}, 1fr)`, gap: 10 }}>
              {inProgress.map(act => (
                <Link key={act.id} href={act.href} style={{ ...card, padding: "14px 16px", display: "block", textDecoration: "none", transition: "box-shadow 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text, margin: 0 }}>{t(act.titleKey)}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "monospace" }}>
                      {act.pct >= 0 ? `${act.pct}%` : t("ip_inProgress")}
                    </span>
                  </div>
                  {act.pct >= 0 && (
                    <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", background: T.text, borderRadius: 2, width: `${act.pct}%`, transition: "width 0.5s" }} />
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: T.faint, margin: 0, marginBottom: 10 }}>{t(act.subKey)}</p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 500, color: T.text }}>
                    {t("ip_resume")} <ArrowRight size={10} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
