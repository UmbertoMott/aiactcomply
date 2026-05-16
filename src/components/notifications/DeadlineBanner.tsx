"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Calendar, ArrowRight, Info } from "lucide-react";
import {
  getNextUpcomingDeadline,
  daysUntil,
  type RegulatoryDeadline,
} from "@/lib/notifications/notifications-engine";

export default function DeadlineBanner() {
  const [days, setDays] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<RegulatoryDeadline | null>(null);

  useEffect(() => {
    const next = getNextUpcomingDeadline();
    if (next) {
      setDeadline(next);
      setDays(daysUntil(next.date));
    }
  }, []);

  if (days === null || deadline === null) {
    return null;
  }

  const isUrgent = days <= 90;
  const isSoon = days <= 180;

  const bannerStyle: React.CSSProperties = isUrgent
    ? {
        background: "rgba(220,38,38,0.04)",
        border: "1px solid rgba(220,38,38,0.2)",
      }
    : {
        background: "#fffbeb",
        border: "1px solid rgba(217,119,6,0.2)",
      };

  const iconColor = isUrgent ? "#dc2626" : "#d97706";
  const Icon = isSoon ? AlertTriangle : Info;

  return (
    <div
      style={bannerStyle}
      className="flex items-center gap-3 rounded-xl py-3 px-4"
    >
      {/* Left icon */}
      <div className="shrink-0">
        <Icon size={18} style={{ color: iconColor }} aria-hidden="true" />
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium tracking-widest"
          style={{ fontSize: 11, textTransform: "uppercase", color: iconColor }}
        >
          Scadenza normativa · {deadline.article}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">
          {isUrgent
            ? `🚨 ${days} giorni alla scadenza: ${deadline.title}`
            : `${deadline.title}`}
        </p>
        <p className="mt-0.5 text-xs text-gray-600 line-clamp-1">
          {deadline.description}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: iconColor }}>
          {days === 1 ? "1 giorno rimanente" : `${days} giorni rimanenti`}
        </p>
      </div>

      {/* Right CTA */}
      <div className="shrink-0">
        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-70"
          style={{ color: iconColor }}
        >
          Vedi timeline completa
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
