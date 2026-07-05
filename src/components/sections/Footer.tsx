"use client";

import Link from "next/link";
import Image from "next/image";
import { openCookieSettings } from "@/components/CookieBanner";

const MONO = "'DM Mono', monospace";
const DARK = "#0D1016";

const LEGAL_LINKS = [
  { label: "Privacy",         href: "/privacy" },
  { label: "Termini",         href: "/termini" },
  { label: "Informativa AI",  href: "/informativa-ai" },
  { label: "Cookie Policy",   href: "/cookie-policy" },
];

const PRODUCT_LINKS = [
  { label: "Il servizio",          href: "/products" },
  { label: "Piani di assistenza",  href: "/pricing" },
  { label: "Scanner AI",           href: "/scanner" },
  { label: "Risorse",              href: "/risorse" },
  { label: "Chi eroga il servizio", href: "/#chi-eroga" },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "#0D1016",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "56px 24px 32px",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* Top row: logo + nav cols */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "40px 64px",
          marginBottom: 48,
        }}>
          {/* Brand */}
          <div style={{ flex: "1 1 180px", minWidth: 160 }}>
            <Link href="/" style={{ display: "inline-block", marginBottom: 14 }}>
              <Image
                src="/logo.svg"
                alt="RegulaeOS"
                width={120}
                height={30}
                style={{ filter: "invert(1)", opacity: 0.85 }}
              />
            </Link>
            <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.65, maxWidth: 240 }}>
              Assistenza professionale alla conformità AI Act, erogata da un avvocato iscritto all&rsquo;albo.
              Il software è lo strumento con cui il servizio è reso.
            </p>
          </div>

          {/* Prodotto */}
          <nav aria-label="Prodotto" style={{ flex: "1 1 140px" }}>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
              Servizio
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {PRODUCT_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legale */}
          <nav aria-label="Legale" style={{ flex: "1 1 140px" }}>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
              Legale
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {LEGAL_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={openCookieSettings}
                  aria-label="Apri impostazioni cookie"
                  style={{
                    fontFamily: MONO, fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    background: "none", border: "none",
                    padding: 0, cursor: "pointer",
                    transition: "color 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  Impostazioni cookie
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 24,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            © {new Date().getFullYear()} RegulaeOS S.r.l. — P.IVA [•] — Tutti i diritti riservati
          </p>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Conforme a EU AI Act 2024/1689 · GDPR 2016/679
          </p>
        </div>

      </div>
    </footer>
  );
}
