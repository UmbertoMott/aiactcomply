"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { loadInventory, type AISystem } from "@/lib/inventory/ai-system";
import { determineRoles, assessRisk, computeObligations } from "@/lib/obligations/engine";
import { useT } from "@/i18n/LocaleProvider";

type Progress = {
  total: number;
  assessed: number;
  obligations: number;
  done: number;
  nextToClassify: AISystem | null;
  nextWithGaps: AISystem | null;
};

function computeProgress(systems: AISystem[]): Progress {
  let obligations = 0, done = 0, maxGaps = 0;
  let nextWithGaps: AISystem | null = null;
  for (const s of systems) {
    if (!s.roleAnswers || !s.riskAnswers) continue;
    const ids = computeObligations(s.roleAnswers, determineRoles(s.roleAnswers), assessRisk(s.riskAnswers), s.riskAnswers)
      .obligations.map((o) => o.id);
    const completed = ids.filter((id) => s.completedObligations.includes(id)).length;
    obligations += ids.length;
    done += completed;
    if (ids.length - completed > maxGaps) { maxGaps = ids.length - completed; nextWithGaps = s; }
  }
  return {
    total: systems.length,
    assessed: systems.filter((s) => s.roleAnswers && s.riskAnswers).length,
    obligations, done,
    nextToClassify: systems.find((s) => !s.roleAnswers || !s.riskAnswers) ?? null,
    nextWithGaps,
  };
}

/** I 4 passi del percorso (ex Journey): inventario → ruolo → rischio → obblighi. */
export default function JourneySteps() {
  const t = useT("dash");
  // Il layout della dashboard monta i figli solo nel browser: localStorage è disponibile
  const [p] = useState<Progress>(() => computeProgress(loadInventory()));

  const classifyHref = p.nextToClassify ? `/dashboard/tools/inventory/${p.nextToClassify.id}/classify` : "/dashboard/tools/inventory";
  const steps = [
    { label: t("js_inventory"), status: p.total > 0 ? t("js_systems").replace("{n}", String(p.total)) : t("js_empty"),
      done: p.total > 0, href: "/dashboard/tools/inventory" },
    { label: t("js_role"), status: t("js_assessed").replace("{k}", String(p.assessed)).replace("{n}", String(p.total)),
      done: p.total > 0 && p.assessed === p.total, href: classifyHref },
    { label: t("js_risk"), status: t("js_assessed").replace("{k}", String(p.assessed)).replace("{n}", String(p.total)),
      done: p.total > 0 && p.assessed === p.total, href: classifyHref },
    { label: t("js_obligations"), status: p.assessed > 0 ? t("js_done").replace("{d}", String(p.done)).replace("{t}", String(p.obligations)) : "—",
      done: p.obligations > 0 && p.done === p.obligations,
      href: p.nextWithGaps ? `/dashboard/tools/inventory/${p.nextWithGaps.id}` : "/dashboard/tools/inventory" },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <section className="fu-1" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#0D1016", marginBottom: 10 }}>
        {t("js_title")}
      </p>
      <ol style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
        {steps.map((s, i) => {
          const active = i === current;
          return (
            <li key={s.label}>
              <Link href={s.href} style={{
                display: "block", height: "100%", padding: "10px 12px", borderRadius: 8,
                border: active ? "1.5px solid #0D1016" : "1px solid rgba(0,0,0,0.08)",
                background: s.done ? "rgba(22,163,74,0.04)" : "#FAFAF9",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#0D1016" }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, flexShrink: 0,
                    background: s.done ? "#15803d" : active ? "#0D1016" : "rgba(0,0,0,0.08)",
                    color: s.done || active ? "#fff" : "rgba(0,0,0,0.5)",
                  }}>
                    {s.done ? <Check size={11} /> : i + 1}
                  </span>
                  {s.label}
                </span>
                <span style={{ display: "block", fontSize: 11, color: "#0D1016", marginTop: 4 }}>{s.status}</span>
                {active && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: "#0D1016", marginTop: 6 }}>
                    {t("js_continue")} <ArrowRight size={11} />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
