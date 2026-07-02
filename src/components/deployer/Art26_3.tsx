"use client";

// Art. 26(3) — Conservazione log ≥ 6 mesi — PROMPT BD

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

const STATUS_LABELS = {
  ok:             { label: "Configurato e conforme", color: "text-green-400" },
  expiring_soon:  { label: "In scadenza (< 30 gg)", color: "text-yellow-400" },
  expired:        { label: "Scaduto — intervento richiesto", color: "text-red-400" },
  not_configured: { label: "Non configurato", color: "text-slate-500" },
};

export function Art26_3({ record, onChange }: Props) {
  const s = STATUS_LABELS[record.logRetentionStatus];
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Il deployer è tenuto a conservare i log generati automaticamente dal sistema AI per almeno 6 mesi
        (Art. 26(3) [verify against current AI Act text]).
      </p>

      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Stato conservazione log</label>
        <select
          className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none"
          value={record.logRetentionStatus}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              logRetentionStatus: e.target.value as DeployerRecord["logRetentionStatus"],
              updatedAt: new Date().toISOString(),
            }))
          }
        >
          <option value="not_configured">Non configurato</option>
          <option value="ok">Configurato e conforme</option>
          <option value="expiring_soon">In scadenza</option>
          <option value="expired">Scaduto</option>
        </select>
        <p className={`text-xs mt-1 ${s.color}`}>{s.label}</p>
      </div>

      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Retention configurata fino al</label>
        <input
          type="date"
          className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none"
          value={record.logRetentionUntil?.split("T")[0] ?? ""}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              logRetentionUntil: e.target.value,
              updatedAt: new Date().toISOString(),
            }))
          }
        />
      </div>

      <Link href="/dashboard/tools/logvault" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
        <ExternalLink size={12} />
        Apri LogVault
      </Link>
    </div>
  );
}
