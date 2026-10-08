"use client";

// DeployerSection — wrapper per ogni paragrafo Art. 26 — PROMPT BD

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type SectionStatus = "ok" | "pending" | "suspended" | "not_required";

interface Props {
  artRef: string;
  title: string;
  status: SectionStatus;
  variant?: "default" | "critical";
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SECTION_STYLE: Record<SectionStatus, string> = {
  ok:           "border-black/10 bg-white",
  pending:      "border-amber-200 bg-amber-50/50",
  suspended:    "border-red-200 bg-red-50",
  not_required: "border-black/[0.06] bg-white opacity-60",
};

const BADGE: Record<SectionStatus, { label: string; cls: string }> = {
  ok:           { label: "✓ Completo",   cls: "text-green-700 bg-green-50 border-green-200" },
  pending:      { label: "In attesa",    cls: "text-amber-700 bg-amber-50 border-amber-200" },
  suspended:    { label: "SOSPESO",      cls: "text-red-700 bg-red-50 border-red-200" },
  not_required: { label: "Non richiesto", cls: "text-[#0D1016] bg-black/[0.04] border-black/10" },
};

export function DeployerSection({ artRef, title, status, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const badge = BADGE[status];

  return (
    <div className={cn("rounded-lg border transition-colors", SECTION_STYLE[status])}>
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-[#0D1016] bg-black/[0.05] px-1.5 py-0.5 rounded">
            {artRef}
          </span>
          <h3 className="text-[13px] font-medium text-[#0D1016]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-[11px] px-2 py-0.5 rounded border", badge.cls)}>
            {badge.label}
          </span>
          <span className="text-[#0D1016] text-[11px]">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-black/[0.06]">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
