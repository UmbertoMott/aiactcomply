"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, AlertTriangle } from "lucide-react";
import { useActiveSystem } from "@/lib/hooks/useActiveSystem";
import type { SystemTier } from "@/lib/inventory/ai-system";

// ─── Tier badges ──────────────────────────────────────────────────────────────

const TIER_META: Record<SystemTier, { label: string; color: string; bg: string }> = {
  prohibited:    { label: "Vietato",       color: "#7F1D1D", bg: "#FEF2F2" },
  high_risk:     { label: "Alto rischio",  color: "#9A3412", bg: "#FFF7ED" },
  limited:       { label: "Limitato",      color: "#92400E", bg: "#FFFBEB" },
  minimal:       { label: "Minimale",      color: "#14532D", bg: "#F0FDF4" },
  gpai:          { label: "GPAI",          color: "#1E3A5F", bg: "#EFF6FF" },
  gpai_systemic: { label: "GPAI Sist.",    color: "#312E81", bg: "#EEF2FF" },
  unclassified:  { label: "Non class.",    color: "#374151", bg: "#F3F4F6" },
};

function TierBadge({ tier }: { tier: SystemTier }) {
  const m = TIER_META[tier] ?? TIER_META.unclassified;
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}
    >
      {m.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SystemSelectorProps {
  /** Mostra banner rosso bloccante se il sistema attivo è prohibited. Default true. */
  checkProhibited?: boolean;
}

export function SystemSelector({ checkProhibited = true }: SystemSelectorProps) {
  const { active, systems, setActiveSystem } = useActiveSystem();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Nessun sistema nell'inventario ────────────────────────────────────────
  if (systems.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-[12px]"
        style={{ background: "#F8FAFC", border: "1px solid rgba(0,0,0,0.07)" }}
      >
        <span style={{ color: "rgba(0,0,0,0.42)" }}>
          Nessun sistema AI nell&apos;inventario.
        </span>
        <a
          href="/dashboard/tools/inventory"
          className="ml-auto text-[11px] font-medium px-3 py-1 rounded-full"
          style={{ background: "#0D1016", color: "#fff", textDecoration: "none" }}
        >
          + Aggiungi sistema
        </a>
      </div>
    );
  }

  // ── Banner bloccante se vietato ───────────────────────────────────────────
  if (checkProhibited && active?.tier === "prohibited") {
    return (
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
        style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
      >
        <AlertTriangle size={16} color="#DC2626" className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-[12px]" style={{ color: "#991B1B" }}>
          <strong>Sistema vietato (Art. 5)</strong> — Completa l&apos;analisi legale prima di procedere.{" "}
          <a href="/dashboard/tools/prohibited" style={{ color: "#DC2626", fontWeight: 600 }}>
            Vai al Prohibited Checker →
          </a>
        </div>
        {systems.length > 1 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid #FECACA" }}
          >
            Cambia sistema
          </button>
        )}
      </div>
    );
  }

  // ── Selector normale ──────────────────────────────────────────────────────
  return (
    <div ref={ref} className="relative mb-5">
      <button
        onClick={() => systems.length > 1 && setOpen((v) => !v)}
        className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          cursor: systems.length > 1 ? "pointer" : "default",
        }}
      >
        {/* Sistema attivo */}
        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background:
                active?.tier === "high_risk" ? "#EA580C"
                : active?.tier === "prohibited" ? "#DC2626"
                : active?.tier === "limited" ? "#D97706"
                : active?.tier?.startsWith("gpai") ? "#2563EB"
                : "#16A34A",
            }}
          />
          <span className="text-[13px] font-medium truncate" style={{ color: "#0D1016" }}>
            {active?.name ?? "—"}
          </span>
          {active && <TierBadge tier={active.tier} />}
          {active?.status && (
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              {active.status === "in_production" ? "in produzione"
                : active.status === "in_development" ? "in sviluppo"
                : active.status === "planned" ? "pianificato"
                : "deprecato"}
            </span>
          )}
        </div>

        {systems.length > 1 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>
              {systems.length} sistemi
            </span>
            <ChevronDown
              size={14}
              style={{
                color: "rgba(0,0,0,0.35)",
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            />
          </div>
        )}
      </button>

      {/* Dropdown ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-40"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.09)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          }}
        >
          <div className="py-1">
            {systems.map((sys) => (
              <button
                key={sys.id}
                onClick={() => { setActiveSystem(sys.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background:
                      sys.tier === "high_risk" ? "#EA580C"
                      : sys.tier === "prohibited" ? "#DC2626"
                      : sys.tier === "limited" ? "#D97706"
                      : sys.tier?.startsWith("gpai") ? "#2563EB"
                      : "#16A34A",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: "#0D1016" }}>
                    {sys.name}
                  </div>
                  <div className="text-[10px]" style={{ color: "rgba(0,0,0,0.38)" }}>
                    {sys.id}
                  </div>
                </div>
                <TierBadge tier={sys.tier} />
                {sys.id === active?.id && (
                  <Check size={12} style={{ color: "#0D1016", flexShrink: 0 }} />
                )}
              </button>
            ))}
          </div>

          <div
            className="px-4 py-2.5 flex items-center gap-2"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            <a
              href="/dashboard/tools/inventory"
              className="flex items-center gap-1.5 text-[11px] font-medium"
              style={{ color: "rgba(0,0,0,0.45)", textDecoration: "none" }}
              onClick={() => setOpen(false)}
            >
              <Plus size={11} />
              Gestisci sistemi
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
