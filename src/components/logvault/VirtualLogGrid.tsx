"use client";

// Virtualized log event grid — PROMPT BE
// Simple windowed rendering without external dependencies

import React, { useRef, useState, useCallback, useEffect, CSSProperties } from "react";
import type { LogEvent } from "@/types/logvault";

const ROW_H = 60;
const OVERSCAN = 3;

const SEV_COLOR: Record<LogEvent["severity"], string> = {
  info: "#2563eb",
  warning: "#d97706",
  critical: "#dc2626",
};

const SEV_BG: Record<LogEvent["severity"], string> = {
  info: "rgba(37,99,235,0.06)",
  warning: "rgba(217,119,6,0.07)",
  critical: "rgba(220,38,38,0.06)",
};

const CAT_LABEL: Record<LogEvent["category"], string> = {
  human_override: "Override umano",
  drift_alert: "Drift alert",
  anomaly: "Anomalia",
  system_restart: "Riavvio",
  config_change: "Config",
  incident_link: "Incidente",
  maintenance: "Manutenzione",
  other: "Altro",
};

function formatTs(ts: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "medium" }).format(new Date(ts));
  } catch {
    return ts;
  }
}

interface RowProps {
  event: LogEvent;
  style: CSSProperties;
}

function EventRow({ event, style }: RowProps) {
  const color = SEV_COLOR[event.severity];
  const bg = SEV_BG[event.severity];
  return (
    <div style={{ ...style, padding: "0 0 4px 0" }}>
      <div style={{
        height: ROW_H - 8,
        background: event.linkedIncidentId && !event.incidentResolved ? "rgba(217,119,6,0.05)" : bg,
        border: `1px solid ${event.linkedIncidentId && !event.incidentResolved ? "rgba(217,119,6,0.25)" : "rgba(0,0,0,0.07)"}`,
        borderRadius: 8,
        padding: "6px 10px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        boxSizing: "border-box",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {event.severity}
            </span>
            <span style={{ fontSize: 10, color: "rgba(0,0,0,0.42)", background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 4 }}>
              {CAT_LABEL[event.category]}
            </span>
            {event.linkedIncidentId && (
              <span style={{ fontSize: 9, color: event.incidentResolved ? "#15803d" : "#d97706", fontWeight: 600 }}>
                {event.incidentResolved ? "✓ Incidente risolto" : "⚠ Incidente aperto"}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "#0D1016", margin: "2px 0 0", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.description}
          </p>
          <p style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", margin: "2px 0 0", fontFamily: "monospace" }}>
            {formatTs(event.timestamp)}{event.operator ? ` · ${event.operator}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  events: LogEvent[];
  height?: number;
}

export function VirtualLogGrid({ events, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = events.length * ROW_H;
  const visibleCount = Math.ceil(height / ROW_H) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endIndex = Math.min(events.length, startIndex + visibleCount);
  const visible = events.slice(startIndex, endIndex);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.35)" }}>Nessun evento registrato</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height, overflowY: "auto", position: "relative" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visible.map((event, i) => (
          <EventRow
            key={event.id}
            event={event}
            style={{
              position: "absolute",
              top: (startIndex + i) * ROW_H,
              left: 0,
              right: 0,
              height: ROW_H,
            }}
          />
        ))}
      </div>
    </div>
  );
}
