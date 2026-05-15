"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import Link from "next/link";
import ClassifierUI from "@/components/tools/ClassifierUI";
import AiaArchitectUI from "@/components/tools/AiaArchitectUI";
import DocugenUI from "@/components/tools/DocugenUI";

const tools = [
  {
    id: "classifier",
    name: "AI Classifier",
    tag: "Art. 6",
    desc: "Scansiona il codice reale e mappa ogni componente AI agli articoli dell'AI Act applicabili. AST Analysis automatica, zero configurazione manuale.",
    href: "/dashboard/tools/classifier",
    UI: ClassifierUI,
  },
  {
    id: "architect",
    name: "AIA-Architect",
    tag: "Art. 11",
    desc: "Analisi semantica del codice con mappatura automatica Art. 10. Data lineage column-level e rilevamento bias integrato.",
    href: "/dashboard/modules/aia-architect",
    UI: AiaArchitectUI,
  },
  {
    id: "docugen",
    name: "DocuGen AI",
    tag: "Allegato IV",
    desc: "Genera automaticamente la documentazione tecnica richiesta dall'AI Act, pronta per l'audit. Export PDF e DOCX con un click.",
    href: "/dashboard/tools/docugen",
    UI: DocugenUI,
  },
];

function TiltFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [4, -4]), springConfig);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-6, 6]), springConfig);
  const scale = useSpring(1, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(x);
    rawY.set(y);
    glareX.set(((e.clientX - rect.left) / rect.width) * 100);
    glareY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleMouseEnter = () => scale.set(1.015);
  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    scale.set(1);
  };

  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]: number[]) =>
      `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        scale,
        willChange: "transform",
        transformOrigin: "center center",
      }}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
    >
      {children}
      {/* Glare overlay */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none z-10"
        style={{ background: glareBackground }}
      />
    </motion.div>
  );
}

export default function ToolGallery() {
  const [active, setActive] = useState(0);
  const activeTool = tools[active];
  const ActiveUI = activeTool.UI;

  return (
    <section className="px-12 py-24" style={{ background: "#FAFAF9" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <p
            className="text-[12px] font-medium uppercase"
            style={{ letterSpacing: "1.5px", color: "rgba(0,0,0,0.3)" }}
          >
            Il prodotto
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={activeTool.href}
                className="text-[12px] transition-opacity hover:opacity-50 flex items-center gap-1"
                style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "-0.1px" }}
              >
                Apri {activeTool.name}
                <span style={{ fontSize: "14px" }}>→</span>
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        <h2
          className="mb-10"
          style={{
            fontSize: "48px",
            fontWeight: 400,
            letterSpacing: "-2px",
            lineHeight: 1.05,
            color: "#0D1016",
          }}
        >
          Tre strumenti.<br />Un&apos;unica piattaforma.
        </h2>

        {/* Tab pills */}
        <div className="flex gap-2 mb-5">
          {tools.map((tool, i) => (
            <button
              key={tool.id}
              onClick={() => setActive(i)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer"
              style={
                active === i
                  ? { background: "#0D1016", color: "#fff" }
                  : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.45)" }
              }
            >
              {tool.name}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={
                  active === i
                    ? { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }
                    : { background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.3)" }
                }
              >
                {tool.tag}
              </span>
            </button>
          ))}
        </div>

        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${active}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-[14px] mb-8 max-w-xl leading-relaxed"
            style={{ color: "rgba(0,0,0,0.42)" }}
          >
            {activeTool.desc}
          </motion.p>
        </AnimatePresence>

        {/* 3D Tilt Product Frame */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ perspective: "1200px" }}
        >
          <TiltFrame>
            {/* Drop shadow sits outside the transform */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 20px 60px rgba(0,0,0,0.10)",
              }}
            >
              {/* Browser chrome */}
              <div
                className="flex items-center gap-1.5 px-4 py-3"
                style={{ background: "#f5f5f4", borderBottom: "1px solid rgba(0,0,0,0.07)" }}
              >
                <span className="block w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                <span className="block w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                <span className="block w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={active}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mx-auto text-[11px] px-4 py-1 rounded"
                    style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.3)" }}
                  >
                    app.aicomply.eu / {activeTool.name.toLowerCase().replace(" ", "-")}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Tool UI */}
              <div style={{ height: "520px", background: "#ffffff", overflow: "hidden" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full"
                  >
                    <ActiveUI />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </TiltFrame>
        </motion.div>

      </div>
    </section>
  );
}
