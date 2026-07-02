"use client";

import type { CSSProperties } from "react";
import { useScopedStorage } from "@/lib/hooks/useScopedStorage";
import { markDone, getActiveScopeId, type QueuedActivity } from "@/lib/queue/activity-queue";

// ─── Design tokens (no blue) ──────────────────────────────────────────────────

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.42)",
  faint:    "rgba(0,0,0,0.24)",
  border:   "rgba(0,0,0,0.07)",
  borderSt: "rgba(13,16,22,0.18)",
  card:     "#ffffff",
  bg:       "rgba(13,16,22,0.03)",
} as const;

// ─── Tool icon map ─────────────────────────────────────────────────────────────

const TOOL_ICON: Record<string, string> = {
  dpia:         "🔒",
  fria:         "⚖️",
  l132:         "📋",
  transparency: "👁",
  "art50-kit":  "🎨",
  risk:         "⚠️",
  assessment:   "📊",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityQueue() {
  const [queue, setQueue] = useScopedStorage<QueuedActivity[]>("activity_queue", []);

  const pending = [...queue]
    .filter(a => a.status === "queued")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const count = pending.length;
  if (count === 0) return null;

  const isHighlighted = count >= 2;

  function handleMarkDone(id: string) {
    const scopeId = getActiveScopeId();
    markDone(scopeId, id);
    // Optimistic update — the StorageEvent will also trigger useScopedStorage re-read
    setQueue(prev => prev.map(a => a.id === id ? { ...a, status: "done" } : a));
  }

  const containerSt: CSSProperties = {
    marginBottom: 24,
    borderRadius: 12,
    border: `1px solid ${isHighlighted ? T.borderSt : T.border}`,
    background: T.card,
    boxShadow: isHighlighted ? "0 0 0 3px rgba(13,16,22,0.04)" : "none",
    overflow: "hidden",
  };

  const headerSt: CSSProperties = {
    padding: "12px 20px",
    borderBottom: `1px solid ${T.border}`,
    background: isHighlighted ? T.bg : T.card,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div style={containerSt}>
      {/* Header */}
      <div style={headerSt}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
          {isHighlighted ? `Hai ${count} attività da completare` : "Attività in coda"}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
          background: isHighlighted ? "rgba(13,16,22,0.09)" : "rgba(0,0,0,0.05)",
          color: T.text,
        }}>
          {count}
        </span>
      </div>

      {/* Items */}
      <div>
        {pending.map((activity, i) => (
          <div
            key={activity.id}
            style={{
              padding: "10px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              borderBottom: i < pending.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            {/* Tool icon */}
            <span style={{ fontSize: 17, flexShrink: 0, marginTop: 2, lineHeight: 1 }}>
              {TOOL_ICON[activity.tool] ?? "📎"}
            </span>

            {/* Label + source */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: T.text, margin: 0, lineHeight: 1.4 }}>
                {activity.label}
              </p>
              <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0", lineHeight: 1.35 }}>
                {activity.source}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
              <a
                href={activity.href}
                style={{
                  padding: "4px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500,
                  background: T.text, color: "#fff", textDecoration: "none", cursor: "pointer",
                  display: "inline-block",
                }}
              >
                Apri
              </a>
              <button
                onClick={() => handleMarkDone(activity.id)}
                style={{
                  padding: "4px 10px", borderRadius: 7, fontSize: 12,
                  background: "none", color: T.muted,
                  border: `1px solid ${T.border}`, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Fatto
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
