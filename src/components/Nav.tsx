"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

// ─── Contenuti del mega-menu Risorse (risorse reali) ─────────────────────────
const RES_CONTENUTI = [
  { label: "Blog & Articoli", href: "/risorse", desc: "Analisi e aggiornamenti sull'EU AI Act." },
];

const RES_STRUMENTI = [
  { label: "Calcolatore ROI sanzioni", href: "/roi", desc: "Stima l'esposizione alle sanzioni AI Act e il ROI della prevenzione." },
  { label: "Il prodotto", href: "/products", desc: "I sei moduli per l'intero ciclo di conformità." },
];

function MenuItem({ label, href, desc, onNav }: { label: string; href: string; desc: string; onNav: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNav}
      className="block group"
      style={{ textDecoration: "none", padding: "10px 12px", borderRadius: 10, transition: "background 0.15s ease" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.035)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1016", marginBottom: 3, letterSpacing: "-0.2px" }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>
        {desc}
      </div>
    </Link>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setResOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setResOpen(false), 140);
  };
  const closeNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setResOpen(false);
  };

  return (
    <nav
      className="sticky top-0 z-50 px-4 md:px-12 py-[18px] transition-all duration-300"
      style={{
        background: scrolled || resOpen ? "rgba(255,255,255,0.96)" : "#ffffff",
        backdropFilter: scrolled || resOpen ? "blur(16px)" : "none",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div className="flex items-center justify-between">
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <Image src="/logo.svg" alt="RegulaeOS" width={140} height={36} priority />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
          <Link href="/products" className="hover:text-[#0D1016] transition-colors">Prodotto</Link>
          <Link href="/pricing" className="hover:text-[#0D1016] transition-colors">Prezzi</Link>
          <Link href="/scanner" className="hover:text-[#0D1016] transition-colors">Scanner Art. 50</Link>

          {/* Risorse — trigger mega-menu */}
          <div onMouseEnter={openMenu} onMouseLeave={scheduleClose} style={{ position: "relative" }}>
            <Link
              href="/risorse"
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{ color: resOpen ? "#0D1016" : "rgba(0,0,0,0.42)" }}
            >
              Risorse
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: resOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] transition-colors hover:text-[#0D1016]"
            style={{ color: "rgba(0,0,0,0.42)" }}
          >
            Accedi
          </Link>
          <Link
            href="/prenota-demo"
            className="inline-flex text-[13px] font-medium rounded-full px-5 py-2 transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", letterSpacing: "-0.2px" }}
          >
            Prenota demo
          </Link>
        </div>
      </div>

      {/* ── Mega-menu panel ── */}
      {resOpen && (
        <div
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#ffffff",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.10)",
          }}
        >
          <div style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "36px 24px 40px",
            display: "grid",
            gridTemplateColumns: "1.1fr 1.1fr 1.3fr",
            gap: 40,
          }} className="res-mega-grid">

            {/* Colonna 1 — Contenuti */}
            <div>
              <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 12 }}>
                Contenuti
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {RES_CONTENUTI.map((r) => <MenuItem key={r.href} {...r} onNav={closeNow} />)}
              </div>
            </div>

            {/* Colonna 2 — Strumenti */}
            <div>
              <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 12 }}>
                Strumenti
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {RES_STRUMENTI.map((r) => <MenuItem key={r.href} {...r} onNav={closeNow} />)}
              </div>
            </div>

            {/* Colonna 3 — Card in evidenza: Calcolatore ROI */}
            <div>
              <Link href="/roi" onClick={closeNow} style={{ textDecoration: "none", display: "block" }}>
                <div style={{
                  background: "#0D1016",
                  borderRadius: 14,
                  height: 150,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  marginBottom: 16,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Esposizione fino a
                  </span>
                  <span style={{ fontFamily: SERIF, fontSize: 40, color: "#ffffff", letterSpacing: "-1.5px", lineHeight: 1 }}>
                    €35M <span style={{ fontSize: 22, color: "rgba(255,255,255,0.55)" }}>/ 7%</span>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>
                    del fatturato · Art. 99 AI Act
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0D1016", marginBottom: 5 }}>
                  Calcolatore ROI — Evita le sanzioni
                </p>
                <p style={{ fontSize: 12.5, color: "rgba(0,0,0,0.45)", lineHeight: 1.55 }}>
                  Stima la tua esposizione e il ritorno della prevenzione in
                  base al fatturato e al tipo di violazione.
                </p>
              </Link>
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .res-mega-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
            }
          `}</style>
        </div>
      )}
    </nav>
  );
}
