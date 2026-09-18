"use client";

import { AlertTriangle, Shield, Zap, Lock, CheckCircle, ArrowRight } from "lucide-react";
import { useT } from "@/i18n/LocaleProvider";

const AMBER = "#b45309";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

interface ScannerTrustSectionProps {
  onScanRequest: () => void;
}

export default function ScannerTrustSection({ onScanRequest }: ScannerTrustSectionProps) {
  const t = useT("scanner");
  return (
    <section
      aria-label={t("trustAria")}
      className="relative z-10 max-w-3xl mx-auto px-4 pb-24 pt-16"
      style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
    >

      {/* ── 1. Posta in gioco ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-8 relative overflow-hidden"
        style={{
          background: "rgba(180,83,9,0.05)",
          border: "1.5px solid rgba(180,83,9,0.22)",
          paddingLeft: 28,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
            background: AMBER, borderRadius: "16px 0 0 16px",
          }}
        />
        <div className="flex items-start gap-4">
          <AlertTriangle aria-hidden="true" size={22} style={{ color: AMBER, flexShrink: 0, marginTop: 3 }} />
          <div>
            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 400, color: "#0D1016", letterSpacing: "-1px", lineHeight: 1.05, fontFamily: SERIF }}>
                {t("stakeAmount")}
              </span>
              <span
                className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: "rgba(180,83,9,0.10)", color: AMBER, letterSpacing: "0.03em", fontFamily: MONO }}
              >
                {t("stakePct")}
              </span>
            </div>
            <div className="flex gap-4 flex-wrap mb-3 text-[11px]" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
              <span>{t("stakeRef")}</span>
              <span style={{ color: AMBER, fontWeight: 700 }}>{t("stakeDeadline")}</span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-lg" style={{ color: "rgba(0,0,0,0.52)" }}>
              {t("stakeBody")}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Trust (3 card) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          {
            icon: <CheckCircle aria-hidden="true" size={18} />,
            title: t("card1Title"),
            body: t("card1Body"),
          },
          {
            icon: <Lock aria-hidden="true" size={18} />,
            title: t("card2Title"),
            body: t("card2Body"),
          },
          {
            icon: <Zap aria-hidden="true" size={18} />,
            title: t("card3Title"),
            body: t("card3Body"),
          },
        ].map(({ icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl p-5"
            style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <div className="mb-2.5" style={{ color: "#0D1016" }}>{icon}</div>
            <p className="text-[12px] font-semibold mb-1.5" style={{ color: "#0D1016" }}>{title}</p>
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(0,0,0,0.48)" }}>{body}</p>
          </div>
        ))}
      </div>

      {/* ── 3. Come funziona (3 step) ─────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
          {t("howItWorks")}
        </p>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.08)" }}
        >
          {[
            { n: "01", label: t("step1Label"), sub: t("step1Sub") },
            { n: "02", label: t("step2Label"), sub: t("step2Sub") },
            { n: "03", label: t("step3Label"), sub: t("step3Sub") },
          ].map(({ n, label, sub }, i) => (
            <div
              key={n}
              className="p-5"
              style={{
                background: "rgba(0,0,0,0.02)",
                borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.07)" : undefined,
              }}
            >
              <span className="block text-[11px] font-bold mb-2.5" style={{ color: "rgba(0,0,0,0.18)", letterSpacing: "0.06em", fontFamily: MONO }}>
                {n}
              </span>
              <p className="text-[13px] font-medium mb-1" style={{ color: "#0D1016" }}>{label}</p>
              <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.40)", fontFamily: MONO }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Le sanzioni (3 fasce) ──────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(0,0,0,0.38)", fontFamily: MONO }}>
          {t("penaltiesTitle")}
        </p>
        <div className="flex flex-col gap-2">
          {([
            {
              amount: t("p1Amount"),
              pct: t("p1Pct"),
              desc: t("p1Desc"),
              ref: "Art. 99(5)",
              highlight: false,
              badge: null,
            },
            {
              amount: t("p2Amount"),
              pct: t("p2Pct"),
              desc: t("p2Desc"),
              ref: "Art. 99(4)(g) — Art. 50",
              highlight: true,
              badge: t("p2Badge"),
            },
            {
              amount: t("p3Amount"),
              pct: t("p3Pct"),
              desc: t("p3Desc"),
              ref: "Art. 99(3) — Art. 5",
              highlight: false,
              badge: null,
            },
          ] as const).map(({ amount, pct, desc, ref, highlight, badge }) => (
            <div
              key={amount}
              className="rounded-xl p-4 flex items-center gap-5 flex-wrap"
              style={{
                background: highlight ? "rgba(180,83,9,0.05)" : "rgba(0,0,0,0.02)",
                border: highlight
                  ? "1.5px solid rgba(180,83,9,0.22)"
                  : "1px solid rgba(0,0,0,0.07)",
              }}
            >
              <div className="flex-shrink-0" style={{ minWidth: 145 }}>
                <span style={{
                  fontSize: highlight ? 20 : 17,
                  fontWeight: 400,
                  color: highlight ? AMBER : "rgba(0,0,0,0.72)",
                  letterSpacing: "-0.5px",
                  display: "block",
                  lineHeight: 1.1,
                  fontFamily: SERIF,
                }}>
                  {amount}
                </span>
                <span className="text-[10px]" style={{ color: highlight ? AMBER : "rgba(0,0,0,0.38)", fontFamily: MONO }}>
                  {pct}
                </span>
              </div>
              <div className="flex-1" style={{ minWidth: 160 }}>
                <p
                  className="text-[13px] mb-1"
                  style={{ color: highlight ? "#0D1016" : "rgba(0,0,0,0.55)", fontWeight: highlight ? 500 : 400 }}
                >
                  {desc}
                </p>
                <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.30)", fontFamily: MONO }}>{ref}</span>
              </div>
              {badge && (
                <span
                  className="text-[10px] font-bold px-3 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
                  style={{ background: AMBER, color: "#ffffff", letterSpacing: "0.04em", fontFamily: MONO }}
                >
                  {badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. CTA finale ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] mb-5"
          style={{ border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.40)" }}
        >
          <Shield aria-hidden="true" size={11} />
          {t("trustCtaBadge")}
        </div>

        <p style={{ fontSize: "clamp(20px, 2.8vw, 28px)", fontWeight: 400, color: "#0D1016", letterSpacing: "-0.9px", marginBottom: 10, fontFamily: SERIF }}>
          {t("trustCtaTitle")}
        </p>
        <p className="text-[13px] mb-7" style={{ color: "rgba(0,0,0,0.48)" }}>
          {t("trustCtaSubtitle")}
        </p>

        <button
          type="button"
          onClick={onScanRequest}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-[13px] font-medium transition-all duration-200"
          style={{ background: "#0D1016", color: "#ffffff" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          {t("trustCtaBtn")}
          <ArrowRight aria-hidden="true" size={14} />
        </button>

        <p className="mt-4 text-[11px]" style={{ color: "rgba(0,0,0,0.30)", fontFamily: MONO }}>
          {t("trustCtaFootnote")}
        </p>
      </div>

    </section>
  );
}
