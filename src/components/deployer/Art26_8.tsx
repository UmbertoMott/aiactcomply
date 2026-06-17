"use client";

// Art. 26(8) — FRIA (Fundamental Rights Impact Assessment) — PROMPT BD

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

const OPTIONS: { value: DeployerRecord["friaStatus"]; label: string; desc: string }[] = [
  { value: "completed",    label: "Completata",    desc: "FRIA eseguita e documentata" },
  { value: "in_progress",  label: "In corso",      desc: "FRIA avviata ma non ancora completata" },
  { value: "pending",      label: "Da avviare",    desc: "FRIA richiesta ma non ancora iniziata" },
  { value: "not_required", label: "Non richiesta", desc: "Tipo di sistema o contesto esclude l'obbligo" },
];

export function Art26_8({ record, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Il deployer di un sistema ad alto rischio che impatta persone fisiche deve condurre
        una FRIA prima del deployment (Art. 26(8) [verify against current AI Act text]).
      </p>

      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="fria-status"
              checked={record.friaStatus === opt.value}
              onChange={() =>
                onChange(prev => ({
                  ...prev,
                  friaStatus: opt.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              className="mt-0.5"
            />
            <div>
              <p className="text-sm text-slate-300 font-medium">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <Link href="/dashboard/tools/fria" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
        <ExternalLink size={12} />
        Apri FRIA
      </Link>
    </div>
  );
}
