"use client";

// Art. 26(5) — Sospensione dell'uso in caso di rischio — PROMPT BD

import React, { useState } from "react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

export function Art26_9({ record, onChange }: Props) {
  const [reason, setReason] = useState("");

  if (record.systemSuspended) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-[13px] text-red-700 font-semibold">⊘ Sistema sospeso</p>
          {record.suspensionReason && (
            <p className="text-[11px] text-[#0D1016] mt-1">{record.suspensionReason}</p>
          )}
          {record.suspendedAt && (
            <p className="text-[11px] text-[#0D1016] mt-1 font-mono">
              {new Date(record.suspendedAt).toLocaleString("it-IT")}
            </p>
          )}
        </div>
        <button
          onClick={() =>
            onChange(prev => ({
              ...prev,
              systemSuspended: false,
              suspendedAt: undefined,
              suspensionReason: undefined,
              updatedAt: new Date().toISOString(),
            }))
          }
          className="text-[11px] text-[#0D1016] hover:text-[#0D1016] underline transition-colors"
        >
          Riattiva sistema (documenta la risoluzione)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[#0D1016]">
        Se il sistema presenta rischi gravi o inattesi per la sicurezza o i diritti fondamentali,
        sospendine l&apos;uso e informa il fornitore e l&apos;autorità di vigilanza (Art. 26(5)).
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Descrivi il motivo della sospensione..."
        rows={3}
        className="w-full rounded-lg bg-black/[0.05] border border-black/10 text-[#0D1016]
                   text-[11px] px-3 py-2.5 resize-none placeholder:text-[#0D1016]
                   focus:outline-none focus:border-red-400 transition-colors"
      />
      <button
        disabled={!reason.trim()}
        onClick={() =>
          onChange(prev => ({
            ...prev,
            systemSuspended: true,
            suspendedAt: new Date().toISOString(),
            suspensionReason: reason,
            updatedAt: new Date().toISOString(),
          }))
        }
        className="rounded-lg bg-red-50 border border-red-200 text-red-700
                   hover:bg-red-100 transition-colors px-4 py-2 text-[13px]
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ⊘ Sospendi sistema
      </button>
    </div>
  );
}
