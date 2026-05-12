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
        background: "rgba(13, 16, 22, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid transparent",
      }}
    >
      <div
        className="text-white font-semibold text-[17px]"
        style={{ letterSpacing: "-0.5px" }}
      >
        AI<span className="text-white/35 font-light">Comply</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-[13px] text-white/45">
        <Link href="#" className="hover:text-white/80 transition-colors">
          Prodotto
        </Link>
        <Link href="#" className="hover:text-white/80 transition-colors">
          Prezzi
        </Link>
        <Link href="#" className="hover:text-white/80 transition-colors">
          Risorse
        </Link>
        <Link href="#" className="hover:text-white/80 transition-colors">
          Azienda
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-[13px] text-white/45 hover:text-white/70 transition-colors"
        >
          Accedi
        </Link>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-[#0D1016] bg-white rounded-full px-5 py-2 hover:bg-gray-100 transition-colors"
          style={{ letterSpacing: "-0.2px" }}
        >
          Prenota demo
        </Link>
      </div>
    </nav>
  );
}
