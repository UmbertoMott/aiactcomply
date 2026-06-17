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
  ok:           "border-slate-700/50 bg-slate-900/60",
  pending:      "border-yellow-800/40 bg-yellow-950/10",
  suspended:    "border-red-800/50 bg-red-950/20",
  not_required: "border-slate-800/30 bg-slate-900/30 opacity-60",
};

const BADGE: Record<SectionStatus, { label: string; cls: string }> = {
  ok:           { label: "✓ Completo",   cls: "text-green-400 bg-green-900/30 border-green-800/50" },
  pending:      { label: "In attesa",    cls: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50" },
  suspended:    { label: "SOSPESO",      cls: "text-red-300 bg-red-900/50 border-red-800/60" },
  not_required: { label: "N/A",          cls: "text-slate-500 bg-slate-800/40 border-slate-700/50" },
};

export function DeployerSection({ artRef, title, status, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const badge = BADGE[status];

  return (
    <div className={cn("rounded-xl border transition-colors", SECTION_STYLE[status])}>
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
            {artRef}
          </span>
          <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-[10px] px-2 py-0.5 rounded border", badge.cls)}>
            {badge.label}
          </span>
          <span className="text-slate-600 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/30">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
