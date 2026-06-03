"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";

function getDaysRemaining(incidentDate: string): number {
  const created = new Date(incidentDate);
  const deadline = new Date(created.getTime() + 15 * 24 * 60 * 60 * 1000);
  return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function Art73Alert() {
  const [urgentIncidents, setUrgentIncidents] = useState<{ id: string; daysRemaining: number }[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("post_market_incidents");
      if (!raw) return;
      const incidents = JSON.parse(raw) as Array<{
        id: string; date: string; notified: boolean; severity: string;
      }>;
      const urgent = incidents
        .filter((inc) => !inc.notified)
        .map((inc) => ({ id: inc.id, daysRemaining: getDaysRemaining(inc.date) }))
        .filter((inc) => inc.daysRemaining <= 15 && inc.daysRemaining > 0);
      setUrgentIncidents(urgent);
    } catch { /* ignore */ }
  }, []);

  if (urgentIncidents.length === 0 || dismissed) return null;

  const minDays = Math.min(...urgentIncidents.map((i) => i.daysRemaining));
  const count = urgentIncidents.length;
  const color = minDays <= 3 ? "#dc2626" : "#d97706";
  const bg = minDays <= 3 ? "rgba(220,38,38,0.04)" : "rgba(217,119,6,0.04)";
  const border = minDays <= 3 ? "rgba(220,38,38,0.14)" : "rgba(217,119,6,0.14)";

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <p className="text-[11px] flex-1 min-w-0 truncate" style={{ color: "rgba(0,0,0,0.55)" }}>
        <span style={{ fontWeight: 600, color }}>Art. 73 — {minDays} giorni alla notifica.</span>
        {" "}{count} incidente/i non segnalato/i all&apos;autorità.
      </p>
      <Link
        href="/dashboard/post-market"
        className="flex-shrink-0 text-[11px] font-semibold whitespace-nowrap flex items-center gap-0.5"
        style={{ color }}
      >
        Notifica ora <ChevronRight className="h-3 w-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-0.5 rounded hover:opacity-50 transition-opacity"
        style={{ color: "rgba(0,0,0,0.25)" }}
        aria-label="Chiudi"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
