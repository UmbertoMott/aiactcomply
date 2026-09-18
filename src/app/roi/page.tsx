import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import RoiCalculator from "@/components/RoiCalculator";
import { getT } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Calcolatore ROI — Prevenzione sanzioni AI Act | RegulaeOS",
  description:
    "Stima la tua esposizione alle sanzioni dell'EU AI Act (Art. 99) e il ritorno sull'investimento della prevenzione. Fino a €35M o 7% del fatturato.",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export default async function RoiPage() {
  const t = await getT("roi");
  return (
    <>
      <Nav />
      <main style={{ background: "#fafaf9", minHeight: "100vh" }}>
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "88px 24px 40px" }}>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>
            {t("kicker")}
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
            {t("h1")}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(0,0,0,0.55)", maxWidth: 620 }}>
            {t("leadA")}<strong style={{ color: "#0D1016" }}>{t("leadStrong")}</strong>{t("leadB")}
          </p>

          {/* Urgenza — date reali di applicazione */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
            {[
              { d: t("chip1d"), t: t("chip1t") },
              { d: t("chip2d"), t: t("chip2t") },
              { d: t("chip3d"), t: t("chip3t") },
            ].map((x) => (
              <div key={x.d} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 999, padding: "8px 15px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0B3D2E" }} />
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "#0D1016" }}>{x.d}</span>
                <span style={{ fontSize: 12, color: "rgba(0,0,0,0.5)" }}>· {x.t}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 40px" }}>
          <RoiCalculator />
        </section>

        {/* Il costo dell'inazione — marketing */}
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { t: t("card1t"), d: t("card1d") },
              { t: t("card2t"), d: t("card2d") },
              { t: t("card3t"), d: t("card3d") },
            ].map((c) => (
              <div key={c.t} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "24px 24px", background: "#ffffff" }}>
                <p style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 400, letterSpacing: "-0.4px", color: "#0D1016", marginBottom: 8 }}>{c.t}</p>
                <p style={{ fontSize: 13.5, color: "rgba(0,0,0,0.5)", lineHeight: 1.6 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer + CTA */}
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 80px" }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.38)", lineHeight: 1.65, marginBottom: 32, maxWidth: 720 }}>
            {t("disclaimer")}
          </p>
          <div style={{
            background: "#0D1016",
            borderRadius: 16,
            padding: "clamp(28px, 4vw, 44px)",
            textAlign: "center",
          }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 400, letterSpacing: "-1px", color: "#ffffff", marginBottom: 12 }}>
              {t("ctaTitle")}
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 26, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              {t("ctaBody")}
            </p>
            <Link
              href="/prenota-demo"
              className="inline-flex text-[14px] font-medium rounded-full px-8 py-3.5 transition-opacity hover:opacity-85"
              style={{ background: "#ffffff", color: "#0D1016", letterSpacing: "-0.2px", textDecoration: "none" }}
            >
              {t("bookDemo")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
