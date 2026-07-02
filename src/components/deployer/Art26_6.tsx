"use client";

// Art. 26(6) — Cooperazione con autorità di vigilanza — PROMPT BD

import React from "react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

export function Art26_6({ record, onChange }: Props) {
  const c = record.authorityContact;
  const patch = (p: Partial<typeof c>) =>
    onChange(prev => ({
      ...prev,
      authorityContact: { ...prev.authorityContact, ...p },
      updatedAt: new Date().toISOString(),
    }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Designa un referente interno disponibile a cooperare con le autorità di vigilanza
        e fornire accesso alla documentazione (Art. 26(6) [verify against current AI Act text]).
      </p>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Nome referente</label>
          <input
            className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
            placeholder="Nome Cognome"
            value={c.name}
            onChange={e => patch({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Email</label>
          <input
            type="email"
            className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
            placeholder="referente@organizzazione.it"
            value={c.email}
            onChange={e => patch({ email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Telefono (opzionale)</label>
          <input
            type="tel"
            className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
            placeholder="+39 02 ..."
            value={c.phone ?? ""}
            onChange={e => patch({ phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
