"use client";

// Art. 26(10) — Registrazione EUDB — PROMPT BD

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

export function Art26_10({ record, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Alcune categorie di deployer (es. autorità pubbliche) devono registrare l&apos;uso del sistema
        nel database UE prima del deployment (Art. 26(10) / Art. 49 [verify against current AI Act text]).
      </p>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={record.eudbRegistrationRequired}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              eudbRegistrationRequired: e.target.checked,
              eudbRegistrationStatus: e.target.checked ? (prev.eudbRegistrationStatus ?? "pending") : undefined,
              updatedAt: new Date().toISOString(),
            }))
          }
          className="rounded"
        />
        <span className="text-sm text-slate-300">Registrazione EUDB obbligatoria per questo sistema</span>
      </label>

      {record.eudbRegistrationRequired && (
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Stato registrazione</label>
          <select
            className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none"
            value={record.eudbRegistrationStatus ?? "pending"}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                eudbRegistrationStatus: e.target.value as DeployerRecord["eudbRegistrationStatus"],
                updatedAt: new Date().toISOString(),
              }))
            }
          >
            <option value="pending">In attesa</option>
            <option value="registered">Registrato</option>
            <option value="not_required">Non richiesto</option>
          </select>
        </div>
      )}

      <Link href="/dashboard/compliance-ops/eudb" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
        <ExternalLink size={12} />
        Vai a EUDB Registration
      </Link>
    </div>
  );
}
