"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell, AlertTriangle, Clock, Calendar, CheckCircle,
  X, Filter, ToggleLeft, ToggleRight, Info, ArrowRight,
  Award, Play, ClipboardList,
} from "lucide-react";
import {
  AIComplyNotification,
  NotificationCategory,
  REGULATORY_DEADLINES,
  RegulatoryDeadline,
  loadNotifications,
  saveNotifications,
  loadDismissed,
  saveDismissed,
  mergeNotifications,
  generateDeadlineNotifications,
  generateProgressNotifications,
  getUnreadCount,
  relativeTime,
  priorityOrder,
  daysUntil,
} from "@/lib/notifications/notifications-engine";
import { STORAGE_KEYS, readFromStorage } from "@/lib/dossier/storage-schema";

// ─── NOTIF SETTINGS ──────────────────────────────────────────────────────────

const SETTINGS_KEY = "aicomply_notif_settings";

interface NotifSettings {
  deadlines: boolean;
  toolIncomplete: boolean;
  redTeam: boolean;
  criticalAlert: boolean; // always true, not editable
}

function loadSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { criticalAlert: true, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { deadlines: true, toolIncomplete: true, redTeam: false, criticalAlert: true };
}

function saveSettings(s: NotifSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

type FilterType = "all" | "unread" | "critical" | "deadline" | "tool";

const categoryLabel: Record<NotificationCategory, string> = {
  deadline: "Scadenza",
  tool_incomplete: "Tool",
  risk_alert: "Rischio",
  gpai: "GPAI",
  system: "Sistema",
  achievement: "Obiettivo",
};

function priorityBorderColor(p: AIComplyNotification["priority"]): string {
  return { critical: "#dc2626", high: "#d97706", medium: "#3b82f6", info: "rgba(0,0,0,0.12)" }[p];
}

function priorityBg(p: AIComplyNotification["priority"], read: boolean): string {
  if (read) return "#ffffff";
  return {
    critical: "rgba(220,38,38,0.03)",
    high: "rgba(217,119,6,0.03)",
    medium: "rgba(59,130,246,0.03)",
    info: "#ffffff",
  }[p];
}

function NotifIcon({ icon }: { icon?: string }) {
  const cls = "h-4 w-4 flex-shrink-0";
  const map: Record<string, React.ReactNode> = {
    AlertTriangle: <AlertTriangle className={cls} />,
    Clock: <Clock className={cls} />,
    Calendar: <Calendar className={cls} />,
    Award: <Award className={cls} />,
    Play: <Play className={cls} />,
    ClipboardList: <ClipboardList className={cls} />,
    Info: <Info className={cls} />,
  };
  return <>{map[icon ?? "Info"] ?? <Info className={cls} />}</>;
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────

function TimelineItem({
  deadline,
  completedTools,
}: {
  deadline: RegulatoryDeadline;
  completedTools: string[];
}) {
  const today = new Date();
  const deadlineDate = new Date(deadline.date);
  const days = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = days < 0;
  const isUrgent = !isPast && days <= 90;
  const isFuture = days > 90;

  const completedCount = deadline.mandatoryTools.filter((tool) =>
    completedTools.some((ct) => ct.includes(tool.split("/").pop()!))
  ).length;
  const totalTools = deadline.mandatoryTools.length;
  const pct = totalTools > 0 ? Math.round((completedCount / totalTools) * 100) : 0;

  // Node color
  const nodeColor = isPast ? "#16a34a" : isUrgent ? "#dc2626" : "rgba(0,0,0,0.2)";
  const nodeStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: isPast ? "#16a34a" : isUrgent ? "#dc2626" : "transparent",
    border: `2px solid ${nodeColor}`,
    flexShrink: 0,
    marginTop: 4,
    position: "relative",
    zIndex: 1,
  };

  return (
    <div className="flex gap-4">
      {/* Line + node */}
      <div className="flex flex-col items-center" style={{ width: 16 }}>
        <div style={nodeStyle}>
          {isPast && (
            <CheckCircle
              className="h-2.5 w-2.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ color: "#fff" }}
            />
          )}
          {isUrgent && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(220,38,38,0.4)" }}
            />
          )}
        </div>
        <div
          className="flex-1 w-px mt-1"
          style={{
            background: isFuture ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.2)",
            minHeight: 40,
            borderStyle: isFuture ? "dashed" : "solid",
            borderLeft: isFuture ? "1px dashed rgba(0,0,0,0.15)" : undefined,
            borderRight: "none",
            borderTop: "none",
            borderBottom: "none",
            width: isFuture ? 0 : undefined,
          }}
        />
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-xl p-4 mb-4"
        style={{
          background: isUrgent ? "rgba(220,38,38,0.02)" : "#ffffff",
          border: isUrgent
            ? "1px solid rgba(220,38,38,0.15)"
            : "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          opacity: isFuture ? 0.75 : 1,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                style={{
                  background: isPast
                    ? "rgba(22,163,74,0.1)"
                    : isUrgent
                    ? "rgba(220,38,38,0.1)"
                    : "rgba(0,0,0,0.06)",
                  color: isPast ? "#15803d" : isUrgent ? "#b91c1c" : "rgba(0,0,0,0.45)",
                }}
              >
                {isPast ? "✓ PASSATA" : isUrgent ? "URGENTE" : "IN ARRIVO"}
              </span>
              <span
                className="text-[10px] rounded px-1.5 py-0.5"
                style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.4)" }}
              >
                {deadline.article}
              </span>
            </div>
            <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
              {deadline.title}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
              {deadlineDate.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Countdown / days */}
          {!isPast && (
            <div className="text-right flex-shrink-0 ml-4">
              <div
                className="text-[22px] font-semibold"
                style={{ color: isUrgent ? "#dc2626" : "#0D1016", letterSpacing: "-0.5px" }}
              >
                {days}
              </div>
              <div className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
                giorni
              </div>
            </div>
          )}
        </div>

        <p className="text-[12px] mb-3" style={{ color: "rgba(0,0,0,0.5)" }}>
          {deadline.description}
        </p>

        {/* Progress bar (only if tools exist) */}
        {totalTools > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                Tool completati: {completedCount}/{totalTools}
              </span>
              <span className="text-[10px] font-medium" style={{ color: pct === 100 ? "#15803d" : "rgba(0,0,0,0.4)" }}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? "#15803d" : isUrgent ? "#dc2626" : "#3b82f6",
                }}
              />
            </div>
          </div>
        )}

        {/* Tool checklist (future deadlines) */}
        {isFuture && deadline.mandatoryTools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {deadline.mandatoryTools.map((tool) => {
              const done = completedTools.some((ct) => ct.includes(tool.split("/").pop()!));
              return (
                <Link
                  key={tool}
                  href={tool}
                  className="flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                  style={{
                    background: done ? "rgba(22,163,74,0.1)" : "rgba(0,0,0,0.06)",
                    color: done ? "#15803d" : "rgba(0,0,0,0.45)",
                    textDecoration: "none",
                  }}
                >
                  {done ? "✓" : "○"} {tool.split("/").pop()}
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {deadline.mandatoryTools.length > 0 && (
          <Link
            href={deadline.mandatoryTools[0]}
            className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-3 py-1.5"
            style={{
              background: isUrgent ? "#dc2626" : "#0D1016",
              color: "#ffffff",
            }}
          >
            {isPast ? "Verifica retroattiva" : "Vai al tool"} <ArrowRight size={11} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── NOTIF CARD ───────────────────────────────────────────────────────────────

function NotifCard({
  n,
  onDismiss,
  onRead,
}: {
  n: AIComplyNotification;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const isRead = !!n.readAt;
  return (
    <div
      className="rounded-xl p-4 mb-3 flex gap-3"
      style={{
        background: priorityBg(n.priority, isRead),
        border: "1px solid rgba(0,0,0,0.07)",
        borderLeft: `4px solid ${priorityBorderColor(n.priority)}`,
        opacity: isRead ? 0.7 : 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5" style={{ color: priorityBorderColor(n.priority) }}>
        <NotifIcon icon={n.icon} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium mb-0.5" style={{ color: isRead ? "rgba(0,0,0,0.45)" : "#0D1016" }}>
          {n.title}
        </p>
        <p className="text-[12px] mb-2" style={{ color: "rgba(0,0,0,0.45)" }}>
          {n.body}
        </p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {n.relatedArticle && (
              <span
                className="text-[9px] rounded px-1.5 py-0.5"
                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.4)" }}
              >
                {n.relatedArticle}
              </span>
            )}
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>
              {categoryLabel[n.category]} · {relativeTime(n.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isRead && (
              <button
                onClick={() => onRead(n.id)}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ color: "rgba(0,0,0,0.4)", background: "rgba(0,0,0,0.05)" }}
              >
                Segna letta
              </button>
            )}
            {n.actionHref && n.actionLabel && (
              <Link
                href={n.actionHref}
                className="flex items-center gap-1 text-[11px] font-medium rounded-full px-3 py-1"
                style={{ background: "#0D1016", color: "#ffffff" }}
              >
                {n.actionLabel} <ArrowRight size={10} />
              </Link>
            )}
            <button
              onClick={() => onDismiss(n.id)}
              className="p-1 rounded"
              style={{ color: "rgba(0,0,0,0.3)" }}
              title="Rimuovi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange && onChange(!on)}
      disabled={disabled}
      className="flex-shrink-0"
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {on ? (
        <ToggleRight className="h-5 w-5" style={{ color: "#15803d" }} />
      ) : (
        <ToggleLeft className="h-5 w-5" style={{ color: "rgba(0,0,0,0.3)" }} />
      )}
    </button>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [tab, setTab] = useState<"notifications" | "timeline">("notifications");
  const [notifications, setNotifications] = useState<AIComplyNotification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [settings, setSettings] = useState<NotifSettings | null>(null);
  const [completedTools, setCompletedTools] = useState<string[]>([]);

  useEffect(() => {
    const existing = loadNotifications();
    const dismissedIds = loadDismissed();
    const onboarding = readFromStorage<{ riskLevel?: string }>("onboarding");
    const done = (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>)
      .filter((k) => k !== "onboarding" && localStorage.getItem(STORAGE_KEYS[k]) !== null)
      .map((k) => STORAGE_KEYS[k]);

    setCompletedTools(done);

    const freshDeadlines = generateDeadlineNotifications(new Date());
    const freshProgress = generateProgressNotifications(done, onboarding?.riskLevel ?? null);
    const merged = mergeNotifications(existing, [...freshDeadlines, ...freshProgress], dismissedIds);
    merged.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));

    setNotifications(merged);
    setDismissed(dismissedIds);
    saveNotifications(merged);
    setSettings(loadSettings());
  }, []);

  // ── actions ──

  function handleDismiss(id: string) {
    const newDismissed = [...dismissed, id];
    const newNotifs = notifications.filter((n) => n.id !== id);
    setDismissed(newDismissed);
    setNotifications(newNotifs);
    saveDismissed(newDismissed);
    saveNotifications(newNotifs);
  }

  function handleRead(id: string) {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, readAt: new Date().toISOString() } : n
    );
    setNotifications(updated);
    saveNotifications(updated);
  }

  function handleMarkAllRead() {
    const now = new Date().toISOString();
    const updated = notifications.map((n) => ({ ...n, readAt: n.readAt ?? now }));
    setNotifications(updated);
    saveNotifications(updated);
  }

  function handleDismissRead() {
    const newDismissed = [...dismissed, ...notifications.filter((n) => !!n.readAt).map((n) => n.id)];
    const newNotifs = notifications.filter((n) => !n.readAt);
    setDismissed(newDismissed);
    setNotifications(newNotifs);
    saveDismissed(newDismissed);
    saveNotifications(newNotifs);
  }

  function updateSettings(patch: Partial<NotifSettings>) {
    if (!settings) return;
    const updated = { ...settings, ...patch, criticalAlert: true };
    setSettings(updated);
    saveSettings(updated);
  }

  // ── filtered list ──

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.readAt;
    if (filter === "critical") return n.priority === "critical";
    if (filter === "deadline") return n.category === "deadline";
    if (filter === "tool") return n.category === "tool_incomplete";
    return true;
  });

  const criticalCount = notifications.filter((n) => n.priority === "critical").length;
  const unreadCount = getUnreadCount(notifications);

  return (
    <div className="max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="mb-1"
          style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "-0.8px", color: "#0D1016" }}
        >
          Notifiche e Scadenze
        </h1>
        <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
          Rimani aggiornato sulle scadenze AI Act e completa i tool in tempo.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-lg"
        style={{ background: "rgba(0,0,0,0.05)", width: "fit-content" }}
      >
        {(["notifications", "timeline"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-[12px] font-medium transition-all"
            style={
              tab === t
                ? { background: "#ffffff", color: "#0D1016", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: "rgba(0,0,0,0.45)" }
            }
          >
            {t === "notifications" ? (
              <span className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                Notifiche
                {unreadCount > 0 && (
                  <span
                    className="text-[9px] rounded-full px-1.5 py-0.5 font-semibold"
                    style={{ background: "#dc2626", color: "#fff" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Timeline AI Act
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: NOTIFICATIONS ── */}
      {tab === "notifications" && (
        <>
          {/* Critical banner */}
          {filter === "critical" && criticalCount > 0 && (
            <div
              className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
              style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "#dc2626" }} />
              <p className="text-[12px]" style={{ color: "#dc2626" }}>
                ⚠️ Hai {criticalCount} notifich{criticalCount === 1 ? "a critica che richiede" : "e critiche che richiedono"} attenzione immediata.
              </p>
            </div>
          )}

          {/* Filters + actions row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 mr-1" style={{ color: "rgba(0,0,0,0.3)" }} />
              {(["all", "unread", "critical", "deadline", "tool"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                  style={
                    filter === f
                      ? { background: "#0D1016", color: "#ffffff" }
                      : { background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }
                  }
                >
                  {{ all: "Tutte", unread: "Non lette", critical: "Critiche", deadline: "Scadenze", tool: "Tool" }[f]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] px-3 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}
              >
                Segna tutte lette
              </button>
              <button
                onClick={handleDismissRead}
                className="text-[11px] px-3 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}
              >
                Rimuovi lette
              </button>
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(0,0,0,0.15)" }} />
              <p className="text-[13px] font-medium" style={{ color: "rgba(0,0,0,0.35)" }}>
                Nessuna notifica
              </p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(0,0,0,0.25)" }}>
                {filter !== "all" ? "Prova a cambiare il filtro." : "Tutte le scadenze appariranno qui."}
              </p>
            </div>
          ) : (
            filtered.map((n) => (
              <NotifCard key={n.id} n={n} onDismiss={handleDismiss} onRead={handleRead} />
            ))
          )}
        </>
      )}

      {/* ── TAB 2: TIMELINE ── */}
      {tab === "timeline" && (
        <div>
          <p className="text-[12px] mb-6" style={{ color: "rgba(0,0,0,0.4)" }}>
            Tutte le scadenze normative dell'AI Act in ordine cronologico.
          </p>
          {/* Mobile: standard left-line timeline. Desktop: same */}
          <div className="relative pl-2 md:pl-0">
            {REGULATORY_DEADLINES.map((d) => (
              <TimelineItem key={d.id} deadline={d} completedTools={completedTools} />
            ))}
          </div>
        </div>
      )}

      {/* ── SETTINGS (always visible at bottom) ── */}
      <div id="settings" className="mt-10 pt-8" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <h2 className="text-[14px] font-medium mb-4" style={{ color: "#0D1016" }}>
          Impostazioni notifiche
        </h2>
        {settings ? (
          <div
            className="rounded-xl p-5"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {[
              {
                key: "deadlines" as const,
                label: "Notifiche scadenze normative",
                desc: "Alert automatici per le scadenze AI Act",
                disabled: false,
              },
              {
                key: "toolIncomplete" as const,
                label: "Notifiche tool incompleti",
                desc: "Promemoria per i tool non ancora completati",
                disabled: false,
              },
              {
                key: "redTeam" as const,
                label: "Notifiche risultati red-team",
                desc: "Alert quando i test di red-team rilevano problemi",
                disabled: false,
              },
              {
                key: "criticalAlert" as const,
                label: "Alert rischio critico",
                desc: "Obbligatorio per compliance — non disabilitabile",
                disabled: true,
              },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                    {row.label}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                    {row.desc}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.disabled && (
                    <span
                      className="text-[9px] rounded-full px-2 py-0.5"
                      style={{ background: "rgba(22,163,74,0.1)", color: "#15803d" }}
                    >
                      Sempre attivo
                    </span>
                  )}
                  <Toggle
                    on={settings[row.key]}
                    onChange={(v) => updateSettings({ [row.key]: v })}
                    disabled={row.disabled}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
