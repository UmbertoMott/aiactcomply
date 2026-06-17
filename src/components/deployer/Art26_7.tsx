"use client";

// Art. 26(7) — Informazioni alle persone fisiche interessate — PROMPT BD

import React from "react";
import type { DeployerRecord } from "@/types/deployer";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

const OPTIONS: { value: DeployerRecord["endUserNotificationsStatus"]; label: string; desc: string }[] = [
  { value: "compliant",    label: "Conforme",      desc: "Le persone fisiche sono informate dell'uso del sistema AI" },
  { value: "pending",      label: "In corso",      desc: "Processo di notifica in fase di implementazione" },
  { value: "not_required", label: "Non richiesto", desc: "Tipo di sistema escluso dall'obbligo di notifica" },
];

export function Art26_7({ record, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Le persone fisiche soggette alle decisioni del sistema AI devono essere informate
        del suo utilizzo (Art. 26(7) [verify against current AI Act text]).
      </p>

      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="end-user-notif"
              checked={record.endUserNotificationsStatus === opt.value}
              onChange={() =>
                onChange(prev => ({
                  ...prev,
                  endUserNotificationsStatus: opt.value,
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
    </div>
  );
}
