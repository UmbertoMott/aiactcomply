"use client";

// Art. 26(1) — Uso conforme alle istruzioni — PROMPT BD

import React from "react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

export function Art26_5({ record, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-black/60">
        Il deployer adotta misure tecniche e organizzative per usare il sistema conformemente alle istruzioni per l&apos;uso
        del fornitore (Art. 26(1)). La dichiarazione interna documenta queste misure.
      </p>

      <div>
        <label className="text-[10px] text-black/50 uppercase tracking-wide block mb-1">Testo dichiarazione (opzionale)</label>
        <textarea
          rows={3}
          className="w-full text-xs px-2 py-1.5 rounded border border-black/10 bg-white text-[#0D1016] focus:outline-none focus:border-black/40 resize-none"
          placeholder="Dichiaro che il sistema di IA viene utilizzato esclusivamente secondo le istruzioni d'uso fornite dal provider..."
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
        <span className="text-sm text-[#0D1016]">Confermo uso non modificato e conforme alle istruzioni</span>
      </label>
    </div>
  );
}
