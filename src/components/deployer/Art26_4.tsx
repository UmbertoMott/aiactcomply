"use client";

// Art. 26(4) — Notifiche al provider di incidenti rilevanti — PROMPT BD

import React, { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import type { DeployerRecord, ProviderNotification } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

export function Art26_4({ record, onChange }: Props) {
  const [desc, setDesc] = useState("");

  const add = () => {
    if (!desc.trim()) return;
    const notif: ProviderNotification = {
      id: `notif-${Date.now()}`,
      date: new Date().toISOString(),
      description: desc,
    };
    onChange(prev => ({
      ...prev,
      providerNotifications: [...prev.providerNotifications, notif],
      updatedAt: new Date().toISOString(),
    }));
    setDesc("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Notifica il provider di qualsiasi malfunzionamento serio o incidente che potrebbe violare diritti fondamentali
        o causare danni (Art. 26(4) [verify against current AI Act text]).
      </p>

      {record.providerNotifications.length > 0 && (
        <div className="space-y-2">
          {record.providerNotifications.map(n => (
            <div key={n.id} className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2">
              <p className="text-xs text-slate-300">{n.description}</p>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">{new Date(n.date).toLocaleDateString("it-IT")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500"
          placeholder="Descrizione incidente notificato al provider..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <button onClick={add} disabled={!desc.trim()} className="text-xs bg-black border border-slate-600 text-slate-300 hover:bg-slate-900 rounded px-3 py-1.5 transition-colors disabled:opacity-40">
          <Plus size={12} />
        </button>
      </div>

      <Link href="/dashboard/post-market?tab=incidents" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
        <ExternalLink size={12} />
        Vai a Post-Market (incidenti)
      </Link>
    </div>
  );
}
