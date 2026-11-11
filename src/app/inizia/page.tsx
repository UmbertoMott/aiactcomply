import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import OfferCta from "./OfferCta";
import { OFFER } from "@/lib/offer";

export const metadata: Metadata = {
  alternates: { canonical: "/inizia" },
  title: { absolute: `Inizia a ${OFFER.priceEur} €/mese — RegulaeOS` },
  description: `Offerta di lancio RegulaeOS: assistenza alla conformità EU AI Act a ${OFFER.priceEur} € al mese, tutto incluso. Valida fino a ${OFFER.deadlineLabel}.`,
};

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

const INCLUDED = [
  "Tutti i moduli: Triage, Scanner Art. 50, Risk Register, FRIA, DPIA",
  "Assessment validati dall'avvocato",
  "Parere su richiesta e revisione documentale",
  "Dossier di conformità firmato",
  "Aggiornamenti normativi",
  "Supporto prioritario",
];

const TERMS: { t: string; d: string }[] = [
  {
    t: "Prezzo",
    d: `${OFFER.priceEur} € al mese, IVA esclusa. Nessun costo di attivazione e nessun costo nascosto.`,
  },
  {
    t: "Fino a quando vale",
    d: `Puoi aderire fino a ${OFFER.deadlineLabel}. Il prezzo resta di ${OFFER.priceEur} €/mese finché l'abbonamento resta attivo.`,
  },
  {
    t: "Rinnovo",
    d: "L'abbonamento si rinnova automaticamente ogni mese. Prima di ogni addebito non devi fare nulla.",
  },
  {
    t: "Disdetta",
    d: "Puoi disdire in qualsiasi momento, senza penali. Il servizio resta attivo fino alla fine del mese già pagato; non ci sono rimborsi per frazioni di mese.",
  },
  {
    t: "Recesso (consumatori)",
    d: "Se acquisti come consumatore hai 14 giorni per recedere (artt. 52 ss. Codice del Consumo). Chiedendo di iniziare subito, per i servizi già resi nel frattempo è dovuto un importo proporzionale.",
  },
  {
    t: "Chi presta il servizio",
    d: "L'assistenza è resa da un avvocato iscritto all'Ordine di Napoli; il software è lo strumento con cui il servizio è erogato. Si applicano le Condizioni generali.",
  },
];

export default function IniziaPage() {
  return (
    <main style={{ display: "flex", minHeight: "100vh", flexWrap: "wrap" }}>
      {/* ── Pannello sinistro — cosa include + condizioni ── */}
      <section
        style={{
          flex: "1 1 440px",
          background: "#fafaf9",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          padding: "40px clamp(20px, 5vw, 72px)",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/logo.svg" alt="RegulaeOS" width={140} height={36} priority />
        </Link>

        <div style={{ maxWidth: 540 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 22 }}>
            Offerta di lancio · solo questa settimana
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(36px, 4.6vw, 60px)", fontWeight: 400, letterSpacing: "-2px", lineHeight: 1.05, color: "#0D1016", marginBottom: 20 }}>
            Tutto incluso a {OFFER.priceEur} € al mese.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.55)", maxWidth: 460 }}>
            Mettiti in regola con il Regolamento EU AI Act (2024/1689) con l&rsquo;assistenza
            di un avvocato. Aderisci entro {OFFER.deadlineLabel}.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "32px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {INCLUDED.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#0D1016", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span style={{ fontSize: 14, color: "rgba(0,0,0,0.65)", lineHeight: 1.45 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ maxWidth: 540 }}>
          <h2 style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Condizioni dell&rsquo;offerta, in parole semplici
          </h2>
          <dl style={{ margin: 0 }}>
            {TERMS.map((x) => (
              <div key={x.t} style={{ padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <dt style={{ fontSize: 14, fontWeight: 600, color: "#0D1016", marginBottom: 4 }}>{x.t}</dt>
                <dd style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "rgba(0,0,0,0.58)" }}>{x.d}</dd>
              </div>
            ))}
          </dl>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(0,0,0,0.4)", marginTop: 16 }}>
            Comunicazione informativa ai sensi dell&rsquo;art. 35 del Codice Deontologico Forense.
            Per tutto quanto non indicato valgono le <Link href="/termini" style={{ color: "inherit" }}>Condizioni generali</Link>.
          </p>
          <Link href="/" style={{ display: "inline-block", marginTop: 24, fontFamily: MONO, fontSize: 12, color: "rgba(0,0,0,0.42)", textDecoration: "none" }}>
            ← Torna al sito
          </Link>
        </div>
      </section>

      {/* ── Pannello destro — prezzo + pagamento ── */}
      <section
        style={{
          flex: "1 1 440px",
          background: "#0D1016",
          padding: "56px clamp(20px, 4vw, 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: SERIF, fontSize: 72, color: "#fff", letterSpacing: "-3px", lineHeight: 1 }}>{OFFER.priceEur} €</span>
            <span style={{ fontSize: 15, color: "rgba(255,255,255,0.55)" }}>/mese + IVA</span>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>
            Tutto incluso · disdici quando vuoi
          </p>
          <OfferCta />
        </div>
      </section>
    </main>
  );
}
