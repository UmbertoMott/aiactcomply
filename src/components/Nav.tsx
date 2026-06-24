"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-12 py-[18px] transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.92)" : "#ffffff",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <Link
        href="/"
        className="font-semibold text-[17px]"
        style={{ letterSpacing: "-0.5px", color: "#0D1016", textDecoration: "none" }}
      >
        AI<span style={{ opacity: 0.32, fontWeight: 400 }}>Comply</span>
      </Link>

      <div className="hidden md:flex items-center gap-8 text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
        <Link href="#" className="hover:text-[#0D1016] transition-colors">Prodotto</Link>
        <Link href="/pricing" className="hover:text-[#0D1016] transition-colors">Prezzi</Link>
        <Link href="/scanner" className="hover:text-[#0D1016] transition-colors">Scanner Art. 50</Link>
        <Link href="/risorse" className="hover:text-[#0D1016] transition-colors">Risorse</Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[13px] transition-colors"
          style={{ color: "rgba(0,0,0,0.42)" }}
        >
          Accedi
        </Link>
        <Link
          href="/register"
          className="text-[13px] font-medium rounded-full px-5 py-2 transition-opacity hover:opacity-80"
          style={{ background: "#0D1016", color: "#ffffff", letterSpacing: "-0.2px" }}
        >
          Inizia gratis
        </Link>
      </div>
    </nav>
  );
}
