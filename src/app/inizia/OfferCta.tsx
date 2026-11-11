"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OFFER } from "@/lib/offer";

const MONO = "'DM Mono', monospace";

function remaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export default function OfferCta() {
  const deadline = new Date(OFFER.deadlineIso).getTime();
  const [now, setNow] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  const expired = now !== null && now >= deadline;
  const r = remaining(now === null ? 0 : deadline - now);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (expired) {
    return (
      <div>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 20 }}>
          L&rsquo;offerta si è conclusa il {OFFER.deadlineLabel}. Puoi comunque
          attivare uno dei piani di assistenza ordinari.
        </p>
        <Link href="/pricing" style={btn(true)}>Vedi i piani</Link>
      </div>
    );
  }

  const canPay = accepted && OFFER.paymentLink !== "";

  return (
    <div>
      {now !== null && (
        <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          L&rsquo;offerta scade tra
        </p>
      )}
      {now !== null && (
        <div aria-label="Tempo rimanente" style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {[
            [r.d, "giorni"],
            [r.h, "ore"],
            [r.m, "min"],
            [r.s, "sec"],
          ].map(([v, l]) => (
            <div key={l as string} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: "#fff" }}>{pad(v as number)}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.65)", marginBottom: 20, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
        />
        <span>
          Ho letto e accetto le <Link href="/termini" style={{ color: "#fff" }}>Condizioni generali</Link> e
          l&rsquo;<Link href="/privacy" style={{ color: "#fff" }}>Informativa privacy</Link>, e
          le condizioni dell&rsquo;offerta riportate in questa pagina.
        </span>
      </label>

      {canPay ? (
        <a href={OFFER.paymentLink} rel="noopener" style={btn(true)}>
          Inizia a {OFFER.priceEur} €/mese
        </a>
      ) : (
        <button type="button" disabled style={{ ...btn(false), border: "none", width: "100%" }}>
          {OFFER.paymentLink === "" ? "Pagamento in attivazione" : `Inizia a ${OFFER.priceEur} €/mese`}
        </button>
      )}

      <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
        Pagamento sicuro con Stripe · Disdici quando vuoi
      </p>
    </div>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 999,
    background: active ? "#ffffff" : "rgba(255,255,255,0.25)",
    color: "#0D1016",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    cursor: active ? "pointer" : "not-allowed",
  };
}
