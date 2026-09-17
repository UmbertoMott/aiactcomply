"use client";

import { useState } from "react";
import { AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Design tokens (allineati alla pagina AGID/ACN) ──────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.45)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  // Rosso tenue per il divieto (unico colore semantico reale ammesso)
  red:     "#dc2626",
  redBg:   "rgba(220,38,38,0.05)",
  redBdr:  "rgba(220,38,38,0.18)",
  rowBg:   "rgba(0,0,0,0.02)",
};

const MONO: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.04em",
};

// ─── Le 8 fattispecie vietate — Art. 5(1)(a–h) EU AI Act 2024/1689 ───────────

interface Practice {
  letter: string;
  title: string;
  summary: string;
  description: string;
  example: string;
  who_is_at_risk: string;
  reference: string;
}

function buildPractices(t: TFn): Practice[] {
  return (["a", "b", "c", "d", "e", "f", "g", "h"] as const).map(l => ({
    letter: l,
    title: t(`p_${l}_title`),
    summary: t(`p_${l}_summary`),
    description: t(`p_${l}_desc`),
    example: t(`p_${l}_example`),
    who_is_at_risk: t(`p_${l}_who`),
    reference: `Art. 5(1)(${l}) EU AI Act`,
  }));
}

// ─── Singola fattispecie espandibile ──────────────────────────────────────────

function PracticeRow({ p, t }: { p: Practice; t: TFn }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        background: T.card,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.015]"
      >
        {/* Lettera */}
        <span
          style={{
            ...MONO,
            fontWeight: 700,
            color: T.red,
            background: T.redBg,
            border: `1px solid ${T.redBdr}`,
            borderRadius: 4,
            padding: "1px 6px",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {p.letter}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: T.text }}>
            {p.title}
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.muted }}>
            {p.summary}
          </p>
        </div>

        <span className="flex-shrink-0 mt-0.5" style={{ color: T.faint }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}
            >
              {/* Descrizione normativa */}
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                {p.description}
              </p>

              {/* Esempio */}
              <div
                className="rounded-lg px-3 py-2.5"
                style={{ background: T.rowBg, border: `1px solid ${T.border}` }}
              >
                <p
                  className="text-[10px] font-semibold uppercase mb-1"
                  style={{ ...MONO, color: T.faint }}
                >
                  {t("art5_example_lbl")}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                  {p.example}
                </p>
              </div>

              {/* Chi è a rischio */}
              <div>
                <p
                  className="text-[10px] font-semibold uppercase mb-1"
                  style={{ ...MONO, color: T.faint }}
                >
                  {t("lbl_whoRisk")}
                </p>
                <p className="text-[11px]" style={{ color: T.muted }}>
                  {p.who_is_at_risk}
                </p>
              </div>

              {/* Riferimento normativo */}
              <p style={{ ...MONO, color: T.faint }}>{p.reference}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pannello principale ──────────────────────────────────────────────────────

export function ProhibitedPracticesArt5() {
  const t = useT("toolAgidAcn");
  const PRACTICES = buildPractices(t);

  return (
    <div className="space-y-3 mt-3">
      {/* Banner rischio inaccettabile */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}
      >
        <AlertOctagon size={15} style={{ color: T.red, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[12px] font-semibold mb-0.5" style={{ color: T.red }}>
            {t("art5_banner_title")}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.50)" }}
            dangerouslySetInnerHTML={{ __html: t("art5_banner_body") }} />
        </div>
      </div>

      {/* Le 8 fattispecie */}
      <div className="space-y-2">
        {PRACTICES.map((p) => (
          <PracticeRow key={p.letter} p={p} t={t} />
        ))}
      </div>

      {/* Nota metodologica */}
      <p
        className="text-[10px] leading-relaxed"
        style={{ ...MONO, color: T.faint }}
      >
        {t("art5_source")}
      </p>
    </div>
  );
}
