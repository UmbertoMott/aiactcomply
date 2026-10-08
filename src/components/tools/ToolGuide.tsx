"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ToolNeeds } from "@/lib/obligations/engine";
import type { ToolGuideEntry } from "@/lib/tools/tool-guide";
import { useT } from "@/i18n/LocaleProvider";
import ToolObligationCheck from "@/components/tools/ToolObligationCheck";

const COLLAPSED_KEY = "aicomply_tool_guide_collapsed";
// Pagine dove si classificano i sistemi: il rimando all'inventario porterebbe a sé stesse.
const SELF_CLASSIFYING = new Set(["/dashboard/tools/inventory", "/dashboard/triage"]);
// Obblighi che valgono a prescindere dalla classificazione (Art. 4).
const ALWAYS_APPLIES = new Set(["/dashboard/tools/literacy"]);

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
  } else if (ALWAYS_APPLIES.has(guide.href)) {
    fit = t("always");
  } else if (SELF_CLASSIFYING.has(guide.href)) {
    fit = null;
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
        {need.articles.length > 0 && <span style={{ color: "#0D1016" }}> · {need.articles.join("; ")}</span>}
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
      className="mb-6"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center gap-3 pb-2.5">
        <span className="text-[11px] font-semibold uppercase" style={{ color: "#0D1016", letterSpacing: "1px" }}>{t("title")}</span>
        <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: "#0D1016" }}>
          {collapsed ? (need ? fit : t(`${guide.id}_what`)) : null}
        </span>
        {collapsed && !guide.optional && <ToolObligationCheck href={guide.href} compact />}
        <button
          onClick={toggle}
          className="flex items-center gap-1 text-[11px] flex-shrink-0"
          style={{ color: "#0D1016", background: "none", border: "none", cursor: "pointer" }}
          aria-expanded={!collapsed}
        >
          {collapsed ? <>{t("show")} <ChevronDown size={12} /></> : <>{t("hide")} <ChevronUp size={12} /></>}
        </button>
      </div>
      {!collapsed && (
        <div className="pb-5">
          <dl className="grid gap-x-6 gap-y-2.5" style={{ gridTemplateColumns: "minmax(110px, max-content) 1fr" }}>
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-[11px] font-semibold" style={{ color: "#0D1016" }}>{label}</dt>
                <dd className="text-[13px]" style={{ color: "#0D1016", lineHeight: 1.5, margin: 0 }}>{value}</dd>
              </div>
            ))}
          </dl>
          {fit && (
            <p className="text-[11px] mt-3 pt-2.5" style={{ color: "#0D1016", borderTop: "1px solid rgba(0,0,0,0.08)", lineHeight: 1.5 }}>
              {fit}
            </p>
          )}
          {!guide.optional && <ToolObligationCheck href={guide.href} />}
        </div>
      )}
    </section>
  );
}
