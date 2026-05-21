"use client";

// VerifyPinpoint — inline badge for normative citations
// Usage: <VerifyPinpoint article="Art. 9" />
// Renders: [text] [▲ verifica] badge (amber)

import { useState, useRef, useEffect } from "react";
import { ExternalLink } from "lucide-react";

const EUR_LEX_IT = "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A32024R1689";
const EUR_LEX_EN = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689";

const copy = {
  it: { label: "verifica", tooltip: "Apri la fonte ufficiale EUR-Lex per questo articolo" },
  en: { label: "verify", tooltip: "Open the official EUR-Lex source for this article" },
};

interface VerifyPinpointProps {
  article: string;        // es. "Art. 9", "Art. 50(1)"
  lang?: "it" | "en";
  children?: React.ReactNode; // optional surrounding text
}

export default function VerifyPinpoint({ article, lang = "it", children }: VerifyPinpointProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const t = copy[lang];
  const eurLexUrl = lang === "en" ? EUR_LEX_EN : EUR_LEX_IT;

  // Close tooltip on outside click
  useEffect(() => {
    if (!tooltipOpen) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setTooltipOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [tooltipOpen]);

  return (
    <span className="inline-flex items-baseline gap-1 flex-wrap" ref={ref}>
      {children && <span>{children}</span>}
      <span className="inline-flex items-center gap-0.5 relative">
        {/* Badge button */}
        <button
          onClick={() => setTooltipOpen((o) => !o)}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all hover:opacity-80 active:scale-95"
          style={{
            background: "#FEF3C7",
            color: "#92400E",
            border: "1px solid #FDE68A",
            cursor: "pointer",
            lineHeight: 1,
            verticalAlign: "middle",
          }}
          title={t.tooltip}
          type="button"
        >
          ▲ {t.label}
        </button>

        {/* Tooltip */}
        {tooltipOpen && (
          <span
            className="absolute bottom-full left-0 mb-1 z-50 rounded-xl px-3 py-2.5 text-[11px] whitespace-nowrap shadow-lg"
            style={{
              background: "#0D1016",
              color: "#ffffff",
              minWidth: 240,
              lineHeight: 1.5,
            }}
          >
            <span className="block font-semibold mb-1" style={{ color: "#fde68a" }}>{article}</span>
            <span className="block" style={{ color: "rgba(255,255,255,0.7)" }}>
              Reg. UE 2024/1689 — fonte ufficiale EUR-Lex
            </span>
            <a
              href={eurLexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium transition-opacity hover:opacity-75"
              style={{ color: "#93c5fd" }}
              onClick={() => setTooltipOpen(false)}
            >
              <ExternalLink size={9} /> Apri EUR-Lex
            </a>
          </span>
        )}
      </span>
    </span>
  );
}
