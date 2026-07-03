"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, AlertTriangle, Pencil } from "lucide-react";
import { useActiveSystem } from "@/lib/hooks/useActiveSystem";
import type { SystemTier } from "@/lib/inventory/ai-system";

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_LABEL: Record<SystemTier, string> = {
  prohibited:    "Vietato",
  high_risk:     "Alto rischio",
  limited:       "Limitato",
  minimal:       "Minimale",
  gpai:          "GPAI",
  gpai_systemic: "GPAI Sist.",
  unclassified:  "Non class.",
};

function TierBadge({ tier }: { tier: SystemTier }) {
  const isProhibited = tier === "prohibited";
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{
        background: isProhibited ? "rgba(220,38,38,0.06)" : "rgba(0,0,0,0.04)",
        color: isProhibited ? "#DC2626" : "rgba(0,0,0,0.45)",
        border: isProhibited ? "1px solid rgba(220,38,38,0.2)" : "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {TIER_LABEL[tier] ?? tier}
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
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          cursor: "pointer",
        }}
      >
        {/* Sistema attivo */}
        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <span className="text-[13px] font-medium truncate" style={{ color: "#0D1016" }}>
            {active?.name ?? "—"}
          </span>
          {active && <TierBadge tier={active.tier} />}
          {active?.status && (
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              {active.status === "in_production" ? "in prod."
                : active.status === "in_development" ? "in sviluppo"
                : active.status === "planned" ? "pianificato"
                : "deprecato"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {systems.length > 1 && (
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>
              {systems.length} sistemi
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              color: "rgba(0,0,0,0.35)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 150ms",
            }}
          />
        </div>
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
          {systems.length > 0 && (
            <div className="py-1">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  onClick={() => { setActiveSystem(sys.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
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
          )}

          <div
            className="px-4 py-2 flex items-center justify-between gap-2"
            style={{ borderTop: systems.length > 0 ? "1px solid rgba(0,0,0,0.06)" : "none" }}
          >
            {active && (
              <a
                href={`/dashboard/tools/inventory/${active.id}`}
                className="flex items-center gap-1.5 text-[11px] font-medium"
                style={{ color: "rgba(0,0,0,0.55)", textDecoration: "none" }}
                onClick={() => setOpen(false)}
              >
                <Pencil size={10} />
                Modifica sistema
              </a>
            )}
            <a
              href="/dashboard/tools/inventory"
              className="flex items-center gap-1.5 text-[11px] font-medium ml-auto"
              style={{ color: "rgba(0,0,0,0.45)", textDecoration: "none" }}
              onClick={() => setOpen(false)}
            >
              <Plus size={11} />
              {systems.length === 0 ? "Aggiungi sistema" : "Gestisci tutti"}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
