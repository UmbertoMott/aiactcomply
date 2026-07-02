"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { getPlan, setPlan, PLAN_META, type PlanId } from "@/lib/billing/plan";

const ORDER: PlanId[] = ["essenziale", "studio", "sumisura"];

export function PlanSelector() {
  const [current, setCurrent] = useState<PlanId>("studio");

  useEffect(() => { setCurrent(getPlan()); }, []);

  function choose(id: PlanId) {
    setPlan(id);
    setCurrent(id);
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.5)" }}>
        Seleziona il piano attivo. Determina quanti membri puoi invitare in ogni progetto.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ORDER.map((id) => {
          const p = PLAN_META[id];
          const active = current === id;
          const members = p.maxMembers === 0 ? "Solo tu" : p.openEnded ? "5+ membri" : `Fino a ${p.maxMembers} membri`;
          return (
            <button
              key={id}
              onClick={() => choose(id)}
              className="text-left rounded-xl p-4 transition-all"
              style={{
                border: active ? "2px solid #0D1016" : "1px solid rgba(0,0,0,0.1)",
                background: active ? "rgba(13,16,22,0.02)" : "#fff",
                cursor: "pointer",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>{p.label}</span>
                {active && <Check size={14} style={{ color: "#059669" }} />}
              </div>
              <div className="text-[12px] mb-2" style={{ color: "rgba(0,0,0,0.5)" }}>{p.price}</div>
              <div className="text-[11px]" style={{ color: "rgba(0,0,0,0.4)" }}>{members}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
