"use client";
// "Segna come fatto": gli obblighi del sistema attivo che si adempiono con questo tool.
// Lo stato è quello della scheda del sistema nell'inventario (completedObligations).

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { loadInventory, updateSystem } from "@/lib/inventory/ai-system";
import { referenceSystem } from "@/lib/inventory/classifier-bridge";
import { determineRoles, assessRisk, computeObligations, formatDate, type Obligation } from "@/lib/obligations/engine";
import { useT } from "@/i18n/LocaleProvider";

function obligationsFor(href: string): { systemId: string; systemName: string; items: Obligation[]; done: string[] } | null {
  const sys = referenceSystem(loadInventory());
  if (!sys?.roleAnswers || !sys.riskAnswers) return null;
  const items = computeObligations(sys.roleAnswers, determineRoles(sys.roleAnswers), assessRisk(sys.riskAnswers), sys.riskAnswers)
    .obligations.filter((o) => o.tool?.href === href);
  if (items.length === 0) return null;
  return { systemId: sys.id, systemName: sys.name, items, done: sys.completedObligations };
}

export default function ToolObligationCheck({ href, compact }: { href: string; compact?: boolean }) {
  const t = useT("toolGuide");
  // Il layout monta i figli solo nel browser: localStorage è disponibile
  const [data, setData] = useState(() => obligationsFor(href));
  if (!data) return null;

  const doneCount = data.items.filter((o) => data.done.includes(o.id)).length;

  if (compact) {
    return (
      <span className="text-[11px] flex-shrink-0" style={{ color: doneCount === data.items.length ? "#15803d" : "rgba(0,0,0,0.5)" }}>
        {t("doneOf").replace("{d}", String(doneCount)).replace("{t}", String(data.items.length))}
      </span>
    );
  }

  function toggle(id: string) {
    if (!data) return;
    const done = data.done.includes(id) ? data.done.filter((x) => x !== id) : [...data.done, id];
    updateSystem(data.systemId, { completedObligations: done });
    setData({ ...data, done });
  }

  return (
    <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#0D1016" }}>
        {t("markDoneTitle")}{" "}
        <Link href={`/dashboard/tools/inventory/${data.systemId}`} className="underline" style={{ color: "#0D1016" }}>{data.systemName}</Link>
      </p>
      <div className="space-y-1">
        {data.items.map((o) => {
          const done = data.done.includes(o.id);
          return (
            <button key={o.id} type="button" onClick={() => toggle(o.id)}
              className="w-full flex items-start gap-2 text-left rounded-md px-2 py-1.5"
              style={{ background: done ? "rgba(22,163,74,0.06)" : "#fff", border: `1px solid ${done ? "rgba(22,163,74,0.25)" : "rgba(0,0,0,0.08)"}`, cursor: "pointer" }}>
              <span className="flex-shrink-0 mt-0.5 flex items-center justify-center" style={{
                width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${done ? "#15803d" : "rgba(0,0,0,0.25)"}`,
                background: done ? "#15803d" : "#fff",
              }}>{done && <Check size={10} color="#fff" strokeWidth={3} />}</span>
              <span className="text-[13px]" style={{ color: "#0D1016", lineHeight: 1.45 }}>
                {o.title} <span style={{ color: "#0D1016" }}>· {o.article} · {t("from")} {formatDate(o.appliesFrom)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
