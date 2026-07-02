"use client";

// Art. 26(9) — Sospensione sistema per rischio grave — PROMPT BD

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
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-4">
          <p className="text-sm text-red-300 font-semibold">⊘ Sistema sospeso</p>
          {record.suspensionReason && (
            <p className="text-xs text-slate-400 mt-1">{record.suspensionReason}</p>
          )}
          {record.suspendedAt && (
            <p className="text-xs text-slate-500 mt-1 font-mono">
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
          className="text-xs text-slate-400 hover:text-slate-300 underline transition-colors"
        >
          Riattiva sistema (documenta la risoluzione)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Se il sistema presenta rischi gravi o inattesi per la sicurezza o i diritti fondamentali,
        sospendilo immediatamente e notifica il fornitore (Art. 26(9) [verify against current AI Act text]).
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Descrivi il motivo della sospensione..."
        rows={3}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-300
                   text-xs px-3 py-2.5 resize-none placeholder:text-slate-600
                   focus:outline-none focus:border-red-700 transition-colors"
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
        className="rounded-lg bg-red-900/40 border border-red-800/50 text-red-300
                   hover:bg-red-900/60 transition-colors px-4 py-2 text-sm
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ⊘ Sospendi sistema
      </button>
    </div>
  );
}
