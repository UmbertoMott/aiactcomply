"use client";

// Art. 26(5) — Segnalazioni al fornitore (rischi e incidenti gravi) — PROMPT BD

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
      <p className="text-[11px] text-[#0D1016]">
        Se il sistema presenta un rischio, informa il fornitore (o il distributore) e l&apos;autorità di vigilanza; in caso di incidente grave
        informa immediatamente prima il fornitore, poi l&apos;importatore o il distributore e le autorità (Art. 26(5)).
      </p>

      {record.providerNotifications.length > 0 && (
        <div className="space-y-2">
          {record.providerNotifications.map(n => (
            <div key={n.id} className="rounded-lg border border-black/10 bg-black/[0.04] p-2">
              <p className="text-[11px] text-[#0D1016]">{n.description}</p>
              <p className="text-[11px] text-[#0D1016] font-mono mt-0.5">{new Date(n.date).toLocaleDateString("it-IT")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 text-[11px] px-2 py-1.5 rounded border border-black/10 bg-white text-[#0D1016] focus:outline-none focus:border-black/40"
          placeholder="Descrizione incidente notificato al provider..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <button onClick={add} disabled={!desc.trim()} className="text-[11px] bg-black border border-black/15 text-[#0D1016] hover:bg-black/[0.03] rounded px-3 py-1.5 transition-colors disabled:opacity-40">
          <Plus size={12} />
        </button>
      </div>

      <Link href="/dashboard/post-market?tab=incidents" className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 hover:text-blue-800 transition-colors">
        <ExternalLink size={12} />
        Vai a Post-Market (incidenti)
      </Link>
    </div>
  );
}
