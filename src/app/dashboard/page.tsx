"use client";

import React, { useState, useEffect } from "react";
import {
  Shield, BarChart3, FileText, Database, Eye, Users,
  CheckCircle, Cpu, ClipboardCheck, AlertTriangle, ArrowRight, Ban,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { isOnboardingDone } from "@/components/onboarding/OnboardingWizard";

// Lazy-load wizard (avoids SSR issues with localStorage)
const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard"),
  { ssr: false }
);

const quickTools: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
  href: string;
  art: string;
  urgent?: boolean;
}[] = [
  { icon: Ban,            title: "Art. 5 Checker", desc: "Pratiche vietate — già in vigore", href: "/dashboard/tools/prohibited",  art: "Art. 5", urgent: true },
  { icon: Shield,         title: "AI Classifier",  desc: "Classifica il tuo sistema AI",    href: "/dashboard/tools/classifier",  art: "Art. 6" },
  { icon: BarChart3,      title: "Risk Manager",   desc: "Gestione iterativa del rischio",   href: "/dashboard/tools/risk-manager", art: "Art. 9" },
  { icon: Database,       title: "Data Audit",     desc: "Qualità e provenienza dataset",    href: "/dashboard/tools/data-audit",   art: "Art. 10" },
  { icon: FileText,       title: "DocuGen AI",     desc: "Documentazione tecnica",           href: "/dashboard/tools/docugen",      art: "Art. 11" },
  { icon: Cpu,            title: "LogVault",       desc: "Registrazione automatica log",     href: "/dashboard/tools/logvault",     art: "Art. 12" },
  { icon: Eye,            title: "Transparency",   desc: "Istruzioni e informative",         href: "/dashboard/tools/transparency", art: "Art. 13" },
  { icon: Users,          title: "Oversight",      desc: "Sorveglianza umana",               href: "/dashboard/tools/oversight",    art: "Art. 14" },
  { icon: CheckCircle,    title: "Resilience",     desc: "Accuratezza e cybersecurity",      href: "/dashboard/tools/resilience",   art: "Art. 15" },
  { icon: ClipboardCheck, title: "QMS Builder",    desc: "Sistema gestione qualità",         href: "/dashboard/tools/qms",          art: "Art. 17" },
];

export default function DashboardPage() {
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Show wizard only for first-time visitors
    if (!isOnboardingDone()) {
      setShowWizard(true);
    }
  }, []);

  return (
    <>
      {showWizard && (
        <OnboardingWizard onComplete={() => setShowWizard(false)} />
      )}

      <div className="max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <h1
            className="mb-1"
            style={{ fontSize: "28px", fontWeight: 400, letterSpacing: "-1px", color: "#0D1016" }}
          >
            Dashboard
          </h1>
          <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
            Inizia completando i tool di compliance per i tuoi sistemi AI.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Tool completati", value: "0", sub: "/9" },
            { label: "Sistemi AI", value: "0", sub: "" },
            { label: "Rischi aperti", value: "—", sub: "" },
            { label: "Prossima scadenza", value: "2 Ago", sub: " 2026" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-4"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="text-[22px] font-semibold" style={{ letterSpacing: "-0.5px", color: "#0D1016" }}>
                {card.value}
                {card.sub && <span className="text-[13px] font-normal" style={{ color: "rgba(0,0,0,0.3)" }}>{card.sub}</span>}
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: "rgba(0,0,0,0.38)" }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Alert scadenze */}
        <div
          className="rounded-xl p-4 mb-8 flex items-start gap-3"
          style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.2)" }}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>Scadenze normative</p>
            <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
              Le pratiche vietate (Art. 5) sono in vigore dal 2 febbraio 2025. I sistemi ad alto rischio devono essere conformi entro il 2 agosto 2026.
            </p>
          </div>
        </div>

        {/* Tools grid */}
        <p
          className="text-[11px] font-semibold uppercase mb-4"
          style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}
        >
          Strumenti di compliance
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-xl p-5 transition-all duration-200 hover:shadow-md"
              style={{
                background: tool.urgent ? "rgba(220,38,38,0.02)" : "#ffffff",
                border: tool.urgent ? "1px solid rgba(220,38,38,0.2)" : "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="rounded-lg p-2"
                  style={{ background: tool.urgent ? "rgba(220,38,38,0.08)" : "rgba(59,130,246,0.08)" }}
                >
                  <tool.icon className="h-3.5 w-3.5" style={{ color: tool.urgent ? "#dc2626" : "#3b82f6" }} />
                </div>
                {tool.urgent ? (
                  <span
                    className="text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase"
                    style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c", letterSpacing: "0.3px" }}
                  >
                    IN VIGORE
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-medium rounded px-1.5 py-0.5"
                    style={{ background: "#f5f5f4", color: "rgba(0,0,0,0.35)" }}
                  >
                    {tool.art}
                  </span>
                )}
              </div>
              <h3 className="text-[13px] font-medium mb-1" style={{ color: "#0D1016" }}>{tool.title}</h3>
              <p className="text-[11px] mb-3" style={{ color: "rgba(0,0,0,0.42)" }}>{tool.desc}</p>
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] rounded-full px-2 py-0.5"
                  style={{
                    background: tool.urgent ? "rgba(220,38,38,0.07)" : "#f5f5f4",
                    color: tool.urgent ? "#b91c1c" : "rgba(0,0,0,0.3)",
                  }}
                >
                  {tool.urgent ? "Verifica ora" : "Da completare"}
                </span>
                <ArrowRight className="h-3 w-3 transition-colors" style={{ color: "rgba(0,0,0,0.2)" }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
