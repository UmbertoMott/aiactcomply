"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

type T = (key: string) => string;

function buildSteps(t: T) {
  return [
    {
      num: "01",
      title: t("step1_title"),
      desc: t("step1_desc"),
      tags: t("step1_tags").split("|"),
    },
    {
      num: "02",
      title: t("step2_title"),
      desc: t("step2_desc"),
      tags: t("step2_tags").split("|"),
    },
    {
      num: "03",
      title: t("step3_title"),
      desc: t("step3_desc"),
      tags: t("step3_tags").split("|"),
    },
  ];
}

function buildRiskItems(t: T) {
  return [
    { name: t("riskName1"), level: t("levelHigh"), color: "#ef4444", dotColor: "#ef4444" },
    { name: t("riskName2"), level: t("levelHigh"), color: "#ef4444", dotColor: "#ef4444" },
    { name: t("riskName3"), level: t("levelLimited"), color: "#f59e0b", dotColor: "#f59e0b" },
    { name: t("riskName4"), level: t("levelMinimal"), color: "#22c55e", dotColor: "#22c55e" },
  ];
}

function buildVisualPanels(t: T, riskItems: ReturnType<typeof buildRiskItems>) {
  return [
  // Panel 0 — Risk Assessment
  <div key="risk" className="p-5">
    <div
      className="text-[11px] mb-3 uppercase"
      style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}
    >
      {t("panel0_head")}
    </div>
    <div className="flex flex-col gap-2">
      {riskItems.map(({ name, level, color, dotColor }) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }}
          />
          <span className="text-[11px] text-white/65 flex-1">{name}</span>
          <span
            className="text-[9px] font-medium rounded-full px-2 py-0.5"
            style={{
              background: `${color}1a`,
              color,
              border: `1px solid ${color}30`,
            }}
          >
            {level}
          </span>
        </div>
      ))}
    </div>
    <div
      className="mt-4 rounded-lg p-3"
      style={{
        background: "rgba(0,0,0,0.06)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div className="text-[11px] font-medium text-white/60 mb-1">
        {t("panel0_done")}
      </div>
      <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        {t("panel0_detail")}
      </div>
    </div>
  </div>,

  // Panel 1 — Documentation
  <div key="docs" className="p-5">
    <div
      className="text-[11px] mb-3 uppercase"
      style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}
    >
      {t("panel1_head")}
    </div>
    <div className="flex flex-col gap-2">
      {[
        { name: "Technical Documentation", art: "Art. 11", done: true },
        { name: "Conformity Declaration", art: t("panel1_annexIV"), done: true },
        { name: "Risk Register", art: "Art. 9", done: false },
      ].map(({ name, art, done }) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.09)" }}
          >
            <div
              className="w-2.5 h-3 rounded-sm"
              style={{ background: "rgba(255,255,255,0.55)" }}
            />
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-white/65">{name}</div>
            <div className="text-[9px] text-white/30">{art}</div>
          </div>
          <span
            className="text-[9px]"
            style={{ color: done ? "#4ade80" : "rgba(255,255,255,0.25)" }}
          >
            {done ? t("panel1_generated") : t("panel1_inProgress")}
          </span>
        </div>
      ))}
    </div>
    <div
      className="mt-4 rounded-lg p-3 text-center text-[11px]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.4)",
      }}
    >
      {t("panel1_export")}
    </div>
  </div>,

  // Panel 2 — Integrations
  <div key="int" className="p-5">
    <div
      className="text-[11px] mb-3 uppercase"
      style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}
    >
      {t("panel2_head")}
    </div>
    <div className="flex flex-col gap-2">
      {[
        { name: "Jira", status: t("panel2_connected"), on: true, bg: "rgba(255,255,255,0.12)" },
        { name: "Confluence", status: t("panel2_connected"), on: true, bg: "rgba(99,102,241,0.2)" },
        { name: "GitHub", status: t("panel2_configure"), on: false, bg: "rgba(255,255,255,0.08)" },
      ].map(({ name, status, on, bg }) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: bg }} />
          <span className="text-[11px] text-white/65 flex-1">{name}</span>
          <span
            className="text-[9px] rounded-full px-2 py-0.5"
            style={
              on
                ? {
                    background: "rgba(34,197,94,0.1)",
                    color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.15)",
                  }
                : {
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.3)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }
            }
          >
            {status}
          </span>
        </div>
      ))}
    </div>
    <div
      className="mt-4 rounded-lg p-3"
      style={{
        background: "rgba(0,0,0,0.06)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div className="text-[11px] font-medium text-white/60 mb-1">
        {t("panel2_tasks")}
      </div>
      <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        {t("panel2_detail")}
      </div>
    </div>
  </div>,
  ];
}

export default function Stepper() {
  const t = useT("stepper");
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const steps = buildSteps(t);
  const riskItems = buildRiskItems(t);
  const visualPanels = buildVisualPanels(t, riskItems);

  useEffect(() => {
    const observers = stepRefs.current.map((ref, i) => {
      if (!ref) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(i);
        },
        { threshold: 0.6 }
      );
      obs.observe(ref);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  return (
    <section className="px-12 py-24" style={{ background: "#0D1016" }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-[12px] font-medium uppercase mb-4"
          style={{ letterSpacing: "1.5px", color: "rgba(255,255,255,0.3)" }}
        >
          {t("kicker")}
        </p>
        <h2
          className="mb-14 text-white"
          style={{
            fontSize: "48px",
            fontWeight: 400,
            letterSpacing: "-2px",
            lineHeight: 1.05,
          }}
        >
          {t("titleLine1")}<br />{t("titleLine2")}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          {/* Steps */}
          <div>
            {steps.map((step, i) => (
              <div
                key={step.num}
                ref={(el) => { stepRefs.current[i] = el; }}
                className="flex gap-6 py-7 transition-all duration-300"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  opacity: activeStep === i ? 1 : 0.35,
                }}
              >
                <div
                  className="text-[11px] font-medium w-6 flex-shrink-0 pt-0.5"
                  style={{
                    color: activeStep === i ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
                  }}
                >
                  {step.num}
                </div>
                <div>
                  <div
                    className="text-[16px] font-medium mb-2"
                    style={{
                      letterSpacing: "-0.4px",
                      color: activeStep === i ? "#fff" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {step.title}
                  </div>
                  <p
                    className="text-[13px] leading-relaxed mb-3"
                    style={{
                      color:
                        activeStep === i
                          ? "rgba(255,255,255,0.55)"
                          : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {step.desc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] rounded-full px-2.5 py-1"
                        style={{
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.35)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky visual panel */}
          <div className="hidden lg:block" style={{ position: "sticky", top: "80px" }}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3.5 text-[11px]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                <span
                  className="block w-1.5 h-1.5 rounded-full bg-white"
                  style={{ boxShadow: "0 0 8px rgba(255,255,255,0.35)" }}
                />
                {activeStep === 0 && t("bar0")}
                {activeStep === 1 && t("bar1")}
                {activeStep === 2 && t("bar2")}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {visualPanels[activeStep]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
