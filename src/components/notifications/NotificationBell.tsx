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
import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.45)",
  faint:  "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card:   "#ffffff",
  bg:     "#fafaf9",
} as const;

const MONO: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.03em",
};

const SANS: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
};

// Colore accento per la striscia sinistra — niente blu, solo semantica neutra/rossa/ambra
const PRIORITY_ACCENT: Record<NotificationPriority, string> = {
  critical: "rgba(220,38,38,0.55)",
  high:     "rgba(180,83,9,0.45)",
  medium:   "rgba(0,0,0,0.18)",
  info:     "rgba(0,0,0,0.09)",
};

// Rimuove emoji e simboli speciali dal titolo (vengono dall'engine)
function stripLeadingEmoji(s: string): string {
  return s.replace(/^[\p{Emoji}\p{So}\s]+/u, "").trim();
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen]                       = useState(false);
  const [notifications, setNotifications]     = useState<AIComplyNotification[]>([]);
  const [dismissed, setDismissed]             = useState<string[]>([]);
  const containerRef                          = useRef<HTMLDivElement>(null);

  // Inizializza notifiche
  useEffect(() => {
    const existing     = loadNotifications();
    const dismissedIds = loadDismissed();
    const onboarding   = readFromStorage<{ riskLevel?: string }>("onboarding");

    const completedTools = (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>)
      .filter(
        (k) =>
          k !== "onboarding" &&
          typeof window !== "undefined" &&
          localStorage.getItem(STORAGE_KEYS[k]) !== null
      )
      .map((k) => STORAGE_KEYS[k]);

    const freshDeadlines = generateDeadlineNotifications(new Date());
    const freshProgress  = generateProgressNotifications(completedTools, onboarding?.riskLevel ?? null);
    const merged         = mergeNotifications(existing, [...freshDeadlines, ...freshProgress], dismissedIds);

    merged.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
    setNotifications(merged);
    setDismissed(dismissedIds);
    saveNotifications(merged);
  }, []);

  // Chiudi cliccando fuori
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const unreadCount = getUnreadCount(notifications);

  const markAllRead = useCallback(() => {
    const now     = new Date().toISOString();
    const updated = notifications.map((n) => (n.readAt ? n : { ...n, readAt: now }));
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
      const now     = new Date().toISOString();
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

      {/* ─── Bell trigger ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifiche"
        style={{
          position:        "relative",
          background:      "none",
          border:          "none",
          cursor:          "pointer",
          padding:         "6px",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          borderRadius:    "6px",
        }}
      >
        <Bell size={17} color={T.faint} strokeWidth={1.6} />
        {unreadCount > 0 && (
          <span
            style={{
              position:    "absolute",
              top:         "1px",
              right:       "1px",
              minWidth:    "15px",
              height:      "15px",
              borderRadius:"9999px",
              background:  T.text,
              color:       "#fff",
              fontSize:    "9px",
              fontWeight:  700,
              display:     "flex",
              alignItems:  "center",
              justifyContent: "center",
              padding:     "0 3px",
              lineHeight:  1,
              ...MONO,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Dropdown ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position:    "absolute",
            top:         "calc(100% + 8px)",
            right:       0,
            width:       "360px",
            background:  T.card,
            borderRadius:"14px",
            boxShadow:   "0 2px 4px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
            zIndex:      50,
            maxHeight:   "480px",
            overflowY:   "auto",
            display:     "flex",
            flexDirection:"column",
            ...SANS,
          }}
        >
          {/* Header */}
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "14px 16px 12px",
              borderBottom:   `1px solid ${T.border}`,
              position:       "sticky",
              top:            0,
              background:     T.card,
              zIndex:         1,
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: T.text, letterSpacing: "-0.2px" }}>
              Notifiche
              {unreadCount > 0 && (
                <span style={{ ...MONO, fontSize: 10, fontWeight: 500, color: T.faint, marginLeft: 6 }}>
                  {unreadCount} nuove
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  fontSize:   "11px",
                  color:      T.muted,
                  fontWeight: 500,
                  padding:    0,
                  ...MONO,
                }}
              >
                Segna lette
              </button>
            )}
          </div>

          {/* Lista notifiche */}
          {notifications.length === 0 ? (
            <div
              style={{
                display:       "flex",
                flexDirection: "column",
                alignItems:    "center",
                justifyContent:"center",
                padding:       "44px 24px",
                gap:           "6px",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 500, color: T.text }}>Nessuna notifica</span>
              <span style={{ fontSize: "11px", color: T.muted, textAlign: "center", lineHeight: 1.5 }}>
                Le scadenze e gli aggiornamenti di conformità appariranno qui
              </span>
            </div>
          ) : (
            <div style={{ padding: "8px" }}>
              {notifications.map((n) => {
                const isUnread = !n.readAt;
                const title    = stripLeadingEmoji(n.title);

                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      position:     "relative",
                      borderLeft:   `2px solid ${isUnread ? PRIORITY_ACCENT[n.priority] : "transparent"}`,
                      background:   isUnread ? T.bg : T.card,
                      borderRadius: "8px",
                      padding:      "10px 32px 10px 12px",
                      marginBottom: "4px",
                      cursor:       "default",
                      transition:   "background 0.15s",
                    }}
                  >
                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                      aria-label="Rimuovi notifica"
                      style={{
                        position:   "absolute",
                        top:        "9px",
                        right:      "8px",
                        background: "none",
                        border:     "none",
                        cursor:     "pointer",
                        padding:    "2px",
                        color:      T.faint,
                        display:    "flex",
                        alignItems: "center",
                        borderRadius:"3px",
                        opacity:    0.7,
                      }}
                    >
                      <X size={11} strokeWidth={2} />
                    </button>

                    {/* Titolo senza emoji */}
                    <div
                      style={{
                        fontSize:     "12px",
                        fontWeight:   isUnread ? 600 : 500,
                        color:        T.text,
                        lineHeight:   1.45,
                        marginBottom: "3px",
                        paddingRight: "4px",
                        letterSpacing:"-0.1px",
                      }}
                    >
                      {title}
                    </div>

                    {/* Body */}
                    <div
                      style={{
                        fontSize:     "11px",
                        color:        T.muted,
                        lineHeight:   1.55,
                        marginBottom: "8px",
                      }}
                    >
                      {n.body}
                    </div>

                    {/* Footer: tag articolo + timestamp + azione */}
                    <div
                      style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        "6px",
                        flexWrap:   "wrap",
                      }}
                    >
                      {n.relatedArticle && (
                        <span
                          style={{
                            ...MONO,
                            fontSize:     "9px",
                            fontWeight:   600,
                            color:        T.faint,
                            background:   "rgba(0,0,0,0.05)",
                            borderRadius: "4px",
                            padding:      "2px 6px",
                            textTransform:"uppercase",
                          }}
                        >
                          {n.relatedArticle}
                        </span>
                      )}
                      <span style={{ ...MONO, fontSize: "9px", color: T.faint }}>
                        {relativeTime(n.createdAt)}
                      </span>

                      {n.actionHref && n.actionLabel && (
                        <Link
                          href={n.actionHref}
                          onClick={() => setOpen(false)}
                          style={{
                            marginLeft:  "auto",
                            fontSize:    "10px",
                            fontWeight:  600,
                            color:       T.text,
                            textDecoration: "none",
                            whiteSpace:  "nowrap",
                            ...MONO,
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
              borderTop:  `1px solid ${T.border}`,
              padding:    "10px 16px",
              position:   "sticky",
              bottom:     0,
              background: T.card,
            }}
          >
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              style={{
                ...MONO,
                fontSize:    "10px",
                fontWeight:  500,
                color:       T.muted,
                textDecoration: "none",
                display:     "block",
                textAlign:   "center",
                letterSpacing:"0.04em",
                textTransform:"uppercase",
              }}
            >
              Tutte le notifiche →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
