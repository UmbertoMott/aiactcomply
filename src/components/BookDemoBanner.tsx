"use client";

import Link from "next/link";
import { useT } from "@/i18n/LocaleProvider";

/**
 * CTA ricorrente "Prenota una demo" — solo il pulsante, centrato, sullo sfondo
 * della pagina (nessuna banda colorata, né chiara né scura). Inserito ogni ~3 sezioni.
 */
export default function BookDemoBanner() {
  const t = useT("banner");
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "clamp(36px, 5vw, 56px) 24px" }}>
      <Link
        href="/prenota-demo"
        className="inline-flex items-center justify-center text-[14px] font-medium rounded-full px-8 py-3.5 transition-opacity hover:opacity-85"
        style={{ background: "#0D1016", color: "#ffffff", letterSpacing: "-0.2px", textDecoration: "none" }}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
