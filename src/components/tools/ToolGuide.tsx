"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ToolNeeds } from "@/lib/obligations/engine";
import type { ToolGuideEntry } from "@/lib/tools/tool-guide";
import { useT } from "@/i18n/LocaleProvider";

const COLLAPSED_KEY = "aicomply_tool_guide_collapsed";

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
}

/** Riquadro fisso in testa a ogni tool: cosa si fa, chi deve farlo, articolo, quando si ha finito. */
export default function ToolGuide({ guide, needs }: { guide: ToolGuideEntry; needs: ToolNeeds | null }) {
  const t = useT("toolGuide");
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch { /* storage non disponibile */ }
  }

  const need = needs?.tools[guide.href];
  let fit: ReactNode;
  if (guide.optional) {
    fit = t("optional");
  } else if (!needs || needs.assessed === 0) {
    fit = (
      <>
        {t("notAssessed")}{" "}
        <Link href="/dashboard/tools/inventory" className="font-medium underline" style={{ color: "#0D1016" }}>{t("classify")}</Link>
      </>
    );
  } else if (need) {
    fit = (
      <>
        <strong style={{ color: "#0D1016" }}>{t("forYou")}:</strong> {t("neededFor")} {need.systems.join(", ")}
        {need.articles.length > 0 && <span style={{ color: "rgba(0,0,0,0.4)" }}> · {need.articles.join("; ")}</span>}
      </>
    );
  } else {
    fit = t("notNeeded");
  }

  const rows: [string, string][] = [
    [t("what"), t(`${guide.id}_what`)],
    [t("who"), t(`${guide.id}_who`)],
    [t("art"), t(`${guide.id}_art`)],
    [t("done"), t(`${guide.id}_done`)],
  ];

  return (
    <section
      aria-label={t("title")}
      className="rounded-xl mb-6"
      style={{ background: "#FAFAF9", border: "1px solid rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.4)", letterSpacing: "1px" }}>{t("title")}</span>
        <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: need ? "#15803d" : "rgba(0,0,0,0.5)" }}>
          {collapsed ? fit : null}
        </span>
        <button
          onClick={toggle}
          className="flex items-center gap-1 text-[11px] flex-shrink-0"
          style={{ color: "rgba(0,0,0,0.45)", background: "none", border: "none", cursor: "pointer" }}
          aria-expanded={!collapsed}
        >
          {collapsed ? <>{t("show")} <ChevronDown size={12} /></> : <>{t("hide")} <ChevronUp size={12} /></>}
        </button>
      </div>
      {!collapsed && (
        <div className="px-4 pb-4">
          <dl className="grid gap-x-6 gap-y-2.5" style={{ gridTemplateColumns: "minmax(110px, max-content) 1fr" }}>
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-[11px] font-semibold" style={{ color: "rgba(0,0,0,0.45)" }}>{label}</dt>
                <dd className="text-[12px]" style={{ color: "#0D1016", lineHeight: 1.5, margin: 0 }}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] mt-3 pt-2.5" style={{ color: "rgba(0,0,0,0.55)", borderTop: "1px solid rgba(0,0,0,0.06)", lineHeight: 1.5 }}>
            {fit}
          </p>
        </div>
      )}
    </section>
  );
}
