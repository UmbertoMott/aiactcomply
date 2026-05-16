"use client";

import {
  AIComplyNotification,
  NotificationPriority,
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
} from "@/lib/notifications/notifications-engine";
import { STORAGE_KEYS, readFromStorage } from "@/lib/dossier/storage-schema";
import {
  Bell,
  X,
  Circle,
  AlertTriangle,
  Clock,
  Calendar,
  Award,
  Play,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// Suppress unused import warnings — icons are kept for potential icon rendering
void AlertTriangle;
void Clock;
void Calendar;
void Award;
void Play;
void ClipboardList;

const PRIORITY_BORDER: Record<NotificationPriority, string> = {
  critical: "#dc2626",
  high: "#d97706",
  medium: "#3b82f6",
  info: "rgba(0,0,0,0.12)",
};

const PRIORITY_BG: Record<NotificationPriority, string> = {
  critical: "#fff5f5",
  high: "#fffbeb",
  medium: "#eff6ff",
  info: "#ffffff",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AIComplyNotification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize notifications
  useEffect(() => {
    const existing = loadNotifications();
    const dismissedIds = loadDismissed();

    const onboarding = readFromStorage<{ riskLevel?: string }>("onboarding");

    const completedTools = (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>)
      .filter(
        (k) =>
          k !== "onboarding" &&
          typeof window !== "undefined" &&
          localStorage.getItem(STORAGE_KEYS[k]) !== null
      )
      .map((k) => STORAGE_KEYS[k]);

    const freshDeadlines = generateDeadlineNotifications(new Date());
    const freshProgress = generateProgressNotifications(
      completedTools,
      onboarding?.riskLevel ?? null
    );
    const merged = mergeNotifications(existing, [...freshDeadlines, ...freshProgress], dismissedIds);

    merged.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));

    setNotifications(merged);
    setDismissed(dismissedIds);
    saveNotifications(merged);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const unreadCount = getUnreadCount(notifications);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    const updated = notifications.map((n) =>
      n.readAt ? n : { ...n, readAt: now }
    );
    setNotifications(updated);
    saveNotifications(updated);
  }, [notifications]);

  const dismissNotification = useCallback(
    (id: string) => {
      const newDismissed = [...dismissed, id];
      setDismissed(newDismissed);
      saveDismissed(newDismissed);
      const updated = notifications.filter((n) => n.id !== id);
      setNotifications(updated);
      saveNotifications(updated);
    },
    [notifications, dismissed]
  );

  const markRead = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const updated = notifications.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: now } : n
      );
      setNotifications(updated);
      saveNotifications(updated);
    },
    [notifications]
  );

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifiche"
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
        }}
      >
        <Bell size={18} color="rgba(0,0,0,0.5)" />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              minWidth: "16px",
              height: "16px",
              borderRadius: "9999px",
              background: "#dc2626",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "380px",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.1), 0 10px 25px -3px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
            zIndex: 50,
            maxHeight: "480px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 10px",
              borderBottom: "1px solid rgba(0,0,0,0.07)",
              position: "sticky",
              top: 0,
              background: "#ffffff",
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>
              Notifiche
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#3b82f6",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Segna tutte lette
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
                gap: "10px",
                color: "rgba(0,0,0,0.4)",
              }}
            >
              <Bell size={32} color="rgba(0,0,0,0.2)" />
              <span style={{ fontSize: "14px", fontWeight: 500 }}>Nessuna notifica</span>
              <span style={{ fontSize: "12px", textAlign: "center" }}>
                Le notifiche di compliance e scadenze appariranno qui
              </span>
            </div>
          ) : (
            <div style={{ padding: "8px" }}>
              {notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    style={{
                      position: "relative",
                      borderLeft: `4px solid ${PRIORITY_BORDER[n.priority]}`,
                      background: isUnread ? PRIORITY_BG[n.priority] : "#ffffff",
                      borderRadius: "6px",
                      padding: "10px 36px 10px 12px",
                      marginBottom: "6px",
                    }}
                  >
                    {/* Dismiss button */}
                    <button
                      onClick={() => dismissNotification(n.id)}
                      aria-label="Rimuovi notifica"
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        color: "rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                      }}
                    >
                      <X size={12} />
                    </button>

                    {/* Mark as read dot */}
                    {isUnread && (
                      <button
                        onClick={() => markRead(n.id)}
                        aria-label="Segna come letta"
                        title="Segna come letta"
                        style={{
                          position: "absolute",
                          top: "28px",
                          right: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px",
                          color: PRIORITY_BORDER[n.priority],
                          display: "flex",
                          alignItems: "center",
                          borderRadius: "4px",
                        }}
                      >
                        <Circle size={8} fill={PRIORITY_BORDER[n.priority]} />
                      </button>
                    )}

                    {/* Title */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#111",
                        lineHeight: 1.4,
                        marginBottom: "4px",
                        paddingRight: "4px",
                      }}
                    >
                      {n.title}
                    </div>

                    {/* Body */}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(0,0,0,0.55)",
                        lineHeight: 1.5,
                        marginBottom: "8px",
                      }}
                    >
                      {n.body}
                    </div>

                    {/* Footer row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {n.relatedArticle && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "rgba(0,0,0,0.4)",
                            background: "rgba(0,0,0,0.06)",
                            borderRadius: "4px",
                            padding: "1px 6px",
                          }}
                        >
                          {n.relatedArticle}
                        </span>
                      )}
                      <span style={{ fontSize: "10px", color: "rgba(0,0,0,0.35)" }}>
                        {relativeTime(n.createdAt)}
                      </span>

                      {n.actionHref && n.actionLabel && (
                        <Link
                          href={n.actionHref}
                          onClick={() => setOpen(false)}
                          style={{
                            marginLeft: "auto",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: PRIORITY_BORDER[n.priority] === "rgba(0,0,0,0.12)"
                              ? "#3b82f6"
                              : PRIORITY_BORDER[n.priority],
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.actionLabel} →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,0.07)",
              padding: "10px 16px",
              position: "sticky",
              bottom: 0,
              background: "#ffffff",
            }}
          >
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              style={{
                fontSize: "12px",
                color: "#3b82f6",
                fontWeight: 500,
                textDecoration: "none",
                display: "block",
                textAlign: "center",
              }}
            >
              Vedi tutte le notifiche →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
