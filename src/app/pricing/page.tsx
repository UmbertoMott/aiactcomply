"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { PricingRegulaeOS } from "@/components/pricing/PricingRegulaeOS";

// ─── FAQ data (aggiornato per l'offerta di assistenza) ────────────────────────

const FAQS = [
  {
    q: "Cosa significa 'assessment validato dall'avvocato'?",
    a: "Ogni valutazione di conformità prodotta dalla piattaforma è revisionata da un avvocato specializzato in AI Act prima di essere finalizzata. Non ricevi solo output software, ma un parere professionale supervisionato.",
  },
  {
    q: "Qual è la differenza tra Essenziale e Studio?",
    a: "Essenziale copre 1 sistema AI con tutti gli strumenti di triage e assessment, più validazione legale degli output. Studio aggiunge pareri su richiesta, revisione documentale dell'avvocato e il dossier di conformità firmato — ideale se hai necessità di produrre documentazione formale.",
  },
  {
    q: "Posso cancellare in qualsiasi momento?",
    a: "Sì. Nessun vincolo, nessuna penale. Il piano si interrompe alla fine del periodo fatturato.",
  },
  {
    q: "Come funziona il piano Su misura?",
    a: "Adatto a studi legali, grandi aziende e PA con più sistemi AI da seguire. Contattaci per ricevere un'offerta personalizzata con workspace dedicati, SLA e, se necessario, il servizio di Rappresentante Autorizzato (Art. 22 AI Act).",
  },
];

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FaqList() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      {FAQS.map((faq, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between text-left gap-4"
            aria-expanded={open === i}
          >
            <span className="text-[15px] font-medium" style={{ color: "#0b0b0c" }}>{faq.q}</span>
            <svg
              className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
              style={{
                color: "rgba(0,0,0,0.35)",
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
              }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main style={{ background: "#ffffff", minHeight: "100vh" }}>

        {/* ── Pricing plans ── */}
        <div className="pt-16">
          <PricingRegulaeOS />
        </div>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto px-4 pb-24 pt-4">
          <h3
            className="text-xl font-semibold mb-8 text-center"
            style={{ letterSpacing: "-0.4px", color: "#0b0b0c" }}
          >
            Domande frequenti
          </h3>
          <FaqList />
        </section>

      </main>
    </>
  );
}
