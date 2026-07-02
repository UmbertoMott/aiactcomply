"use client";

// Art. 26(2) — Supervisori umani qualificati — PROMPT BD

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DeployerRecord, HumanOverseer } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

const EMPTY: Omit<HumanOverseer, "id"> = {
  name: "", role: "", qualification: "", appointedAt: new Date().toISOString().split("T")[0],
};

export function Art26_2({ record, onChange }: Props) {
  const [form, setForm] = useState<Omit<HumanOverseer, "id">>(EMPTY);
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!form.name.trim()) return;
    const newOverseer: HumanOverseer = {
      id: `ov-${Date.now()}`, ...form,
    };
    onChange(prev => ({ ...prev, overseers: [...prev.overseers, newOverseer], updatedAt: new Date().toISOString() }));
    setForm(EMPTY);
    setAdding(false);
  };

  const remove = (id: string) =>
    onChange(prev => ({ ...prev, overseers: prev.overseers.filter(o => o.id !== id), updatedAt: new Date().toISOString() }));

  return (
    <div className="space-y-3">
      {record.overseers.length === 0 && (
        <p className="text-xs text-slate-500">Nessun supervisore assegnato. L&apos;Art. 26(2) richiede almeno un supervisore qualificato.</p>
      )}

      {record.overseers.map(o => (
        <div key={o.id} className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-200">{o.name}</p>
            <p className="text-xs text-slate-400">{o.role}</p>
            {o.qualification && <p className="text-xs text-slate-500 mt-0.5">{o.qualification}</p>}
            <p className="text-xs text-slate-600 mt-0.5 font-mono">Nominato: {o.appointedAt}</p>
          </div>
          <button onClick={() => remove(o.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Nome *</label>
              <input
                className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mario Rossi"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Ruolo</label>
              <input
                className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Responsabile AI"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Qualifica</label>
            <input
              className="w-full text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
              value={form.qualification}
              onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
              placeholder="es. Certificato ISO 42001 Practitioner"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="text-xs bg-black border border-slate-600 text-slate-300 hover:bg-slate-900 rounded px-3 py-1.5 transition-colors">
              Aggiungi
            </button>
            <button onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          <Plus size={12} /> Aggiungi supervisore
        </button>
      )}
    </div>
  );
}
