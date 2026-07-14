import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import RoiCalculator from "@/components/RoiCalculator";

export const metadata: Metadata = {
  title: "Calcolatore ROI — Prevenzione sanzioni AI Act | RegulaeOS",
  description:
    "Stima la tua esposizione alle sanzioni dell'EU AI Act (Art. 99) e il ritorno sull'investimento della prevenzione. Fino a €35M o 7% del fatturato.",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export default function RoiPage() {
  return (
    <>
      <Nav />
      <main style={{ background: "#fafaf9", minHeight: "100vh" }}>
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "88px 24px 40px" }}>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>
            Calcolatore ROI — Prevenzione sanzioni
          </p>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(34px, 5vw, 60px)",
            fontWeight: 400,
            letterSpacing: "-2px",
            lineHeight: 1.04,
            color: "#0D1016",
            marginBottom: 20,
            maxWidth: 760,
          }}>
            Quanto rischi davvero con l&rsquo;AI Act?
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(0,0,0,0.55)", maxWidth: 620 }}>
            Le sanzioni dell&rsquo;EU AI Act arrivano fino a <strong style={{ color: "#0D1016" }}>€35 milioni
            o il 7% del fatturato</strong> mondiale. Calcola la tua esposizione e il ritorno
            della prevenzione: la conformità costa una frazione del rischio.
          </p>
        </section>

        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 40px" }}>
          <RoiCalculator />
        </section>

        {/* Disclaimer + CTA */}
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "8px 24px 80px" }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.38)", lineHeight: 1.65, marginBottom: 32, maxWidth: 720 }}>
            Stima indicativa basata sull&rsquo;Art. 99 del Regolamento (UE) 2024/1689. Gli importi
            rappresentano il massimale teorico; l&rsquo;entità effettiva dipende dalla natura della
            violazione e dalle circostanze. Per le PMI si applica il minore tra i due importi. Non
            costituisce consulenza legale personalizzata.
          </p>
          <div style={{
            background: "#0D1016",
            borderRadius: 16,
            padding: "clamp(28px, 4vw, 44px)",
            textAlign: "center",
          }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 400, letterSpacing: "-1px", color: "#ffffff", marginBottom: 12 }}>
              Trasforma il rischio in conformità.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 26, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              In 30 minuti l&rsquo;avvocato, assistito dallo strumento, imposta il tuo primo
              assessment e ti mostra come azzerare l&rsquo;esposizione.
            </p>
            <Link
              href="/prenota-demo"
              className="inline-flex text-[14px] font-medium rounded-full px-8 py-3.5 transition-opacity hover:opacity-85"
              style={{ background: "#ffffff", color: "#0D1016", letterSpacing: "-0.2px", textDecoration: "none" }}
            >
              Prenota una demo
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
