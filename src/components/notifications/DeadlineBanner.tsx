"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import {
  getNextUpcomingDeadline,
  daysUntil,
  type RegulatoryDeadline,
} from "@/lib/notifications/notifications-engine";

const DISMISS_KEY = "aicomply_deadline_banner_dismissed_v2";

export default function DeadlineBanner() {
  const [days, setDays] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<RegulatoryDeadline | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (isDismissed) return;
    const next = getNextUpcomingDeadline();
    if (next) {
      setDeadline(next);
      setDays(daysUntil(next.date));
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (dismissed || days === null || deadline === null) return null;

  const isUrgent = days <= 90;
  const color = isUrgent ? "#dc2626" : "#d97706";

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-4"
      style={{
        background: isUrgent ? "rgba(220,38,38,0.04)" : "rgba(217,119,6,0.04)",
        border: `1px solid ${isUrgent ? "rgba(220,38,38,0.18)" : "rgba(217,119,6,0.18)"}`,
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
      <p className="text-[11px] font-medium flex-1 min-w-0 truncate" style={{ color }}>
        <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "10px", opacity: 0.8 }}>
          {deadline.article} ·{" "}
        </span>
        {days} giorni alla scadenza: {deadline.title}
      </p>
      <Link
        href="/dashboard/notifications"
        className="flex-shrink-0 text-[11px] font-medium whitespace-nowrap hover:opacity-70 transition-opacity"
        style={{ color }}
      >
        Vedi timeline →
      </Link>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-0.5 rounded hover:opacity-60 transition-opacity"
        style={{ color: "rgba(0,0,0,0.3)" }}
        aria-label="Chiudi"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
