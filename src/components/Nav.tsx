"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-12 py-[18px] transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.92)" : "#ffffff",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
        <Image src="/logo.svg" alt="RegulaeOS" width={140} height={36} priority />
      </Link>

      <div className="hidden md:flex items-center gap-8 text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
        <Link href="/products" className="hover:text-[#0D1016] transition-colors">Prodotto</Link>
        <Link href="/pricing" className="hover:text-[#0D1016] transition-colors">Prezzi</Link>
        <Link href="/scanner" className="hover:text-[#0D1016] transition-colors">Scanner Art. 50</Link>
        <Link href="/risorse" className="hover:text-[#0D1016] transition-colors">Risorse</Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden sm:inline text-[13px] transition-colors"
          style={{ color: "rgba(0,0,0,0.42)" }}
        >
          Accedi
        </Link>
        <Link
          href="/prenota-demo"
          className="hidden sm:inline-flex text-[13px] font-medium rounded-full px-5 py-2 transition-colors hover:bg-black/[0.04]"
          style={{ border: "1px solid rgba(0,0,0,0.15)", color: "#0D1016", letterSpacing: "-0.2px" }}
        >
          Prenota demo
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
