"use client";

// Art. 26(5) — Dichiarazione di uso conforme — PROMPT BD

import React from "react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

export function Art26_5({ record, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Il deployer non deve modificare il sistema oltre l&apos;uso previsto dal provider
        e deve dichiararlo formalmente (Art. 26(5) [verify against current AI Act text]).
      </p>

      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Testo dichiarazione (opzionale)</label>
        <textarea
          rows={3}
          className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500 resize-none"
          placeholder="Dichiaro che il sistema AI viene utilizzato esclusivamente secondo le istruzioni d'uso fornite dal provider..."
          value={record.conformingUseText ?? ""}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              conformingUseText: e.target.value,
              updatedAt: new Date().toISOString(),
            }))
          }
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={record.conformingUseDeclaration}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              conformingUseDeclaration: e.target.checked,
              updatedAt: new Date().toISOString(),
            }))
          }
          className="rounded"
        />
        <span className="text-sm text-slate-300">Confermo uso non modificato e conforme alle istruzioni</span>
      </label>
    </div>
  );
}
