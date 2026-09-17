"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, CheckCircle2, RefreshCw,
  Clock, AlertOctagon, TrendingUp, Shield, Pause, Play,
} from "lucide-react";
import Link from "next/link";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.45)",
  faint:  "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card:   "#ffffff",
  red:    "#dc2626", redBg:   "rgba(220,38,38,0.06)",   redBdr:   "rgba(220,38,38,0.18)",
  amber:  "#d97706", amberBg: "rgba(245,158,11,0.06)",  amberBdr: "rgba(245,158,11,0.2)",
  green:  "#15803d", greenBg: "rgba(22,163,74,0.06)",   greenBdr: "rgba(22,163,74,0.2)",
  blue:   "#2563eb", blueBg:  "rgba(37,99,235,0.06)",   blueBdr:  "rgba(37,99,235,0.18)",
};

// ─── Tipi (specchio dell'API route) ──────────────────────────────────────────

interface DriftAlert {
  metric:        string;
  current:       number;
  baseline:      number;
  deviation_pct: number;
  severity:      "warning" | "critical";
  description:   string;
  art_reference: string;
}

interface DriftReport {
  ai_system_id:    string | null;
  window_hours:    number;
  events_analyzed: number;
  alerts:          DriftAlert[];
  is_drifting:     boolean;
  compliance_ok:   boolean;
  generated_at:    string;
  message?:        string;
}

interface HistoryEntry {
  report:    DriftReport;
  fetchedAt: string;
}

// ─── Etichette metriche human-readable ────────────────────────────────────────

const METRIC_LABELS: Record<string, { labelKey: string; unit: string; icon: React.ReactNode }> = {
  latency_p99_ms:       { labelKey: "m_latency",    unit: "ms", icon: <Clock       className="w-3.5 h-3.5" /> },
  error_rate_pct:       { labelKey: "m_errorRate",  unit: "%",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  flagged_rate_pct:     { labelKey: "m_flagged",    unit: "%",  icon: <AlertOctagon  className="w-3.5 h-3.5" /> },
  guardrail_breach_pct: { labelKey: "m_guardrail",  unit: "%",  icon: <Shield        className="w-3.5 h-3.5" /> },
  token_spike_pct:      { labelKey: "m_tokenSpike", unit: "%",  icon: <TrendingUp    className="w-3.5 h-3.5" /> },
};

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, t }: { alert: DriftAlert; t: TFn }) {
  const isCritical = alert.severity === "critical";
  const meta = METRIC_LABELS[alert.metric];
  const label = meta ? t(meta.labelKey) : alert.metric;
  const unit = meta?.unit ?? "";
  const icon = meta?.icon ?? <Activity className="w-3.5 h-3.5" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{
        background: isCritical ? T.redBg : T.amberBg,
        border: `1px solid ${isCritical ? T.redBdr : T.amberBdr}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span style={{ color: isCritical ? T.red : T.amber }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color: T.text }}>{label}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
            style={{
              background: isCritical ? T.redBg : T.amberBg,
              color: isCritical ? T.red : T.amber,
              border: `1px solid ${isCritical ? T.redBdr : T.amberBdr}`,
            }}
          >
            {alert.severity}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold" style={{ color: isCritical ? T.red : T.amber }}>
            {alert.current}{unit}
          </div>
          <div className="text-[10px]" style={{ color: T.muted }}>
            +{alert.deviation_pct}% {t("vsThreshold")} {alert.baseline}{unit}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(0,0,0,0.55)" }}>
        {alert.description}
      </p>

      {/* Barra deviazione */}
      <div className="h-1 rounded-full w-full mb-2" style={{ background: "rgba(0,0,0,0.08)" }}>
        <div
          className="h-1 rounded-full transition-all"
          style={{
            width: `${Math.min(alert.deviation_pct, 100)}%`,
            background: isCritical ? T.red : T.amber,
          }}
        />
      </div>

      <div className="text-[10px]" style={{ color: T.muted }}>
        📋 {alert.art_reference}
      </div>
    </motion.div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ report, t }: { report: DriftReport | null; t: TFn }) {
  if (!report) return null;

  if (!report.is_drifting) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: T.greenBg, border: `1px solid ${T.greenBdr}` }}
      >
        <CheckCircle2 className="w-4 h-4" style={{ color: T.green }} />
        <span className="text-xs font-medium" style={{ color: T.green }}>
          {t("noDrift")} — {report.events_analyzed} {t("eventsAnalyzed")}
        </span>
      </div>
    );
  }

  const criticalCount = report.alerts.filter(a => a.severity === "critical").length;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: criticalCount > 0 ? T.redBg : T.amberBg,
        border: `1px solid ${criticalCount > 0 ? T.redBdr : T.amberBdr}`,
      }}
    >
      <AlertTriangle className="w-4 h-4" style={{ color: criticalCount > 0 ? T.red : T.amber }} />
      <span className="text-xs font-medium" style={{ color: criticalCount > 0 ? T.red : T.amber }}>
        {report.alerts.length} {t("alerts_word")}
        {criticalCount > 0 ? ` (${criticalCount} ${t("critical_word")})` : ` — ${t("warning_word")}`}
        {" · "}{report.events_analyzed} {t("events_word")}
      </span>
    </div>
  );
}

// ─── History Timeline ─────────────────────────────────────────────────────────

function HistoryTimeline({ history, t, loc }: { history: HistoryEntry[]; t: TFn; loc: string }) {
  if (history.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
        {t("history_pre")} {history.length} {t("history_post")}
      </p>
      <div className="flex items-end gap-1 h-12">
        {history.map((h, i) => {
          const alertCount  = h.report.alerts.length;
          const hasCritical = h.report.alerts.some(a => a.severity === "critical");
          const heightPx    = alertCount === 0 ? 8 : Math.min(alertCount * 16 + 8, 48);
          return (
            <div
              key={i}
              title={`${new Date(h.fetchedAt).toLocaleTimeString(loc)} — ${alertCount} ${t("alerts_word")}`}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: `${heightPx}px`,
                background: alertCount === 0 ? T.greenBg : hasCritical ? T.redBg : T.amberBg,
                border: `1px solid ${alertCount === 0 ? T.greenBdr : hasCritical ? T.redBdr : T.amberBdr}`,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] mt-1" style={{ color: T.faint }}>
        <span>{new Date(history[history.length - 1]?.fetchedAt).toLocaleTimeString(loc)}</span>
        <span>{t("now_word")}</span>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WINDOW_OPTIONS = [
  { label: "1h",   value: 1  },
  { label: "6h",   value: 6  },
  { label: "24h",  value: 24 },
  { label: "72h",  value: 72 },
];

const REFRESH_INTERVALS = [
  { label: "30s",    value: 30  },
  { label: "1 min",  value: 60  },
  { label: "5 min",  value: 300 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriftMonitorPage() {
  const t = useT("toolDriftMonitor");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const [report, setReport]           = useState<DriftReport | null>(null);
  const [history, setHistory]         = useState<HistoryEntry[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastFetch, setLastFetch]     = useState<Date | null>(null);
  const [windowHours, setWindowHours] = useState(24);
  const [refreshSec, setRefreshSec]   = useState(60);
  const [paused, setPaused]           = useState(false);
  const [countdown, setCountdown]     = useState(0);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leggi ai_system_id dal localStorage (impostato dal Classifier)
  const aiSystemId = (() => {
    try {
      const raw = localStorage.getItem("aicomply_classifier_result");
      return raw ? (JSON.parse(raw) as { aiSystemId?: string })?.aiSystemId ?? null : null;
    } catch { return null; }
  })();

  const fetchDrift = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ window_hours: String(windowHours) });
      if (aiSystemId) params.set("ai_system_id", aiSystemId);
      const res = await fetch(`/api/logvault/drift?${params}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("SESSION_EXPIRED");
        throw new Error(`API_ERROR:${res.status}`);
      }
      const data = (await res.json()) as DriftReport;
      setReport(data);
      setLastFetch(new Date());
      setHistory(prev => [
        { report: data, fetchedAt: new Date().toISOString() },
        ...prev.slice(0, 19), // max 20 snapshot
      ]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [windowHours, aiSystemId]);

  // Polling automatico
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (paused) return;

    fetchDrift();
    setCountdown(refreshSec);

    timerRef.current = setInterval(() => {
      fetchDrift();
      setCountdown(refreshSec);
    }, refreshSec * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown(c => Math.max(c - 1, 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, refreshSec, fetchDrift]);

  // Ricarica quando cambia la finestra temporale
  useEffect(() => {
    if (!paused) fetchDrift();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowHours]);

  const criticalAlerts = report?.alerts.filter(a => a.severity === "critical") ?? [];
  const warningAlerts  = report?.alerts.filter(a => a.severity === "warning")  ?? [];

  return (
    <div className="w-full space-y-5 pb-10" style={{ color: T.text }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4" style={{ color: T.blue }} />
            <span className="text-xs font-medium" style={{ color: T.muted }}>
              {t("kicker")}
            </span>
          </div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="text-sm mt-0.5" style={{ color: T.muted }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Controlli */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Finestra temporale */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: T.border }}>
            {WINDOW_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setWindowHours(opt.value)}
                className="px-2.5 py-1.5 text-xs transition-colors"
                style={{
                  background: windowHours === opt.value ? T.text : T.card,
                  color: windowHours === opt.value ? "#fff" : T.muted,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Intervallo refresh */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: T.border }}>
            {REFRESH_INTERVALS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRefreshSec(opt.value)}
                className="px-2.5 py-1.5 text-xs transition-colors"
                style={{
                  background: refreshSec === opt.value ? T.text : T.card,
                  color: refreshSec === opt.value ? "#fff" : T.muted,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Pausa / Riprendi */}
          <button
            onClick={() => setPaused(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.muted }}
          >
            {paused
              ? <><Play  className="w-3 h-3" /> {t("resume")}</>
              : <><Pause className="w-3 h-3" /> {t("pause")}</>
            }
          </button>

          {/* Refresh manuale */}
          <button
            onClick={fetchDrift}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.muted }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "…" : t("now_btn")}
          </button>
        </div>
      </div>

      {/* Countdown + ultimo aggiornamento */}
      <div className="flex items-center gap-3 text-xs" style={{ color: T.faint }}>
        {lastFetch && (
          <span>{t("lastUpdate")} {lastFetch.toLocaleTimeString(loc)}</span>
        )}
        {!paused && !loading && (
          <span>{t("next_pre")} {countdown}s</span>
        )}
        {paused && <span style={{ color: T.amber }}>{t("pollPaused")}</span>}
      </div>

      {/* Errore */}
      {error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}
        >
          <p className="text-xs" style={{ color: T.red }}>
            {error.includes("SESSION_EXPIRED") || error.includes("401")
              ? <>{t("err_sessionExpired_pre")} <Link href="/login" className="underline">{t("err_loginAgain")}</Link></>
              : error.includes("tabella") || error.includes("relation")
              ? t("err_tables")
              : error.includes("API_ERROR")
              ? `${t("err_api")} ${error.split(":").pop()}`
              : error
            }
          </p>
        </div>
      )}

      {/* Status badge */}
      <StatusBadge report={report} t={t} />

      {/* Nessun log nella finestra */}
      {report?.message && !report.is_drifting && report.events_analyzed === 0 && (
        <div
          className="rounded-xl px-4 py-8 text-center"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <Activity className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(0,0,0,0.15)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: T.muted }}>
            {t("noLog_pre")} {windowHours}h {t("noLog_post")}
          </p>
          <p className="text-xs" style={{ color: T.faint }}>
            {t("noLog_hint")}{" "}
            <code
              className="text-xs px-1 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.04)" }}
            >
              /api/logvault/ingest
            </code>
          </p>
          <Link
            href="/dashboard/tools/logvault"
            className="inline-flex items-center gap-1 mt-3 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}` }}
          >
            {t("goLogVault")}
          </Link>
        </div>
      )}

      {/* Alert critici */}
      <AnimatePresence>
        {criticalAlerts.length > 0 && (
          <motion.div
            key="critical"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.red }}>
              {t("criticalAlerts_pre")} ({criticalAlerts.length})
            </p>
            {criticalAlerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} t={t} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert warning */}
      <AnimatePresence>
        {warningAlerts.length > 0 && (
          <motion.div
            key="warnings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.amber }}>
              {t("warnings_pre")} ({warningAlerts.length})
            </p>
            {warningAlerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} t={t} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storico visivo */}
      {history.length > 1 && (
        <div
          className="rounded-xl p-4"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <HistoryTimeline history={[...history].reverse()} t={t} loc={loc} />
        </div>
      )}

      {/* Footer legale */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}
      >
        <p className="text-xs leading-relaxed" style={{ color: T.muted }}
          dangerouslySetInnerHTML={{ __html: t("footer") }} />
      </div>

    </div>
  );
}
