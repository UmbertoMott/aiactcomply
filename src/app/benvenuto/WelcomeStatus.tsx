"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

type Status =
  | { state: "loading" | "pending" | "preparing" | "invalid" }
  | { state: "ready"; hasAccount: boolean; email: string };

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

export default function WelcomeStatus() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id") ?? "";
  const [status, setStatus] = useState<Status>({ state: sessionId ? "loading" : "invalid" });

  // Controlla lo stato ogni 5 secondi finché l'area non è pronta
  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const res = await fetch(`/api/stripe/checkout-status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const data = (await res.json()) as Status;
        if (stop) return;
        setStatus(data);
        if (data.state === "ready" || data.state === "invalid") return;
      } catch {
        if (stop) return;
        setStatus({ state: "preparing" });
      }
      timer = setTimeout(check, 5000);
    };
    check();
    return () => { stop = true; clearTimeout(timer); };
  }, [sessionId]);

  const next =
    status.state === "ready"
      ? `${status.hasAccount ? "/login" : "/register"}?from=checkout&email=${encodeURIComponent(status.email)}`
      : null;

  // Quando l'area è pronta, reindirizza da solo dopo qualche secondo
  useEffect(() => {
    if (!next) return;
    const t = setTimeout(() => router.push(next), 4000);
    return () => clearTimeout(t);
  }, [next, router]);

  return (
    <div style={{ width: "100%", maxWidth: 520, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: "40px clamp(20px, 5vw, 44px)", boxShadow: "0 8px 30px rgba(0,0,0,0.05)" }}>
      <Link href="/" style={{ display: "inline-flex", marginBottom: 32 }}>
        <Image src="/logo.svg" alt="RegulaeOS" width={120} height={31} priority />
      </Link>

      {status.state === "invalid" ? (
        <>
          <h1 style={h1}>Non troviamo il tuo pagamento.</h1>
          <p style={p}>
            Se hai appena pagato, controlla l&rsquo;email di conferma di Stripe oppure scrivici a{" "}
            <a href="mailto:connect@regulaeos.com" style={{ color: "#0D1016" }}>connect@regulaeos.com</a>:
            ti attiviamo l&rsquo;accesso noi.
          </p>
          <Link href="/login" style={btn}>Vai all&rsquo;accesso</Link>
        </>
      ) : status.state === "ready" ? (
        <>
          <Badge text="Area pronta" />
          <h1 style={h1}>La tua area è pronta.</h1>
          <p style={p}>
            {status.hasAccount
              ? "Accedi con la stessa email con cui hai pagato e trovi subito la tua area."
              : "Ultimo passaggio: crea il tuo account con la stessa email con cui hai pagato."}
          </p>
          <p style={{ ...p, fontFamily: MONO, fontSize: 13, color: "#0D1016" }}>{status.email}</p>
          <Link href={next!} style={btn}>{status.hasAccount ? "Accedi" : "Crea il tuo account"}</Link>
          <p style={small}>Ti reindirizziamo automaticamente tra pochi secondi.</p>
        </>
      ) : (
        <>
          <Badge text={status.state === "pending" ? "Pagamento in verifica" : "Pagamento ricevuto"} />
          <h1 style={h1}>Grazie! Stiamo preparando la tua area.</h1>
          <p style={p}>
            Tra pochi minuti la tua area riservata sarà accessibile. Puoi restare su questa
            pagina: appena è pronta ti portiamo noi all&rsquo;accesso o alla registrazione.
          </p>
          <div aria-hidden="true" style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden", margin: "8px 0 24px" }}>
            <div style={{ width: "40%", height: "100%", background: "#0D1016", borderRadius: 99, animation: "wsSlide 1.6s ease-in-out infinite" }} />
          </div>
          <style>{`@keyframes wsSlide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@media (prefers-reduced-motion: reduce){div[aria-hidden] > div{animation:none!important}}`}</style>
          <p style={small}>
            Riceverai anche la ricevuta di pagamento via email da Stripe. Hai 14 giorni per
            esercitare il diritto di recesso: lo trovi nella sezione Fatturazione della tua area.
          </p>
        </>
      )}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 999, padding: "4px 10px", marginBottom: 18 }}>
      {text}
    </span>
  );
}

const h1: React.CSSProperties = { fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 400, letterSpacing: "-1px", lineHeight: 1.1, color: "#0D1016", margin: "0 0 14px" };
const p: React.CSSProperties = { fontSize: 15, lineHeight: 1.65, color: "rgba(0,0,0,0.6)", margin: "0 0 18px" };
const small: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, color: "rgba(0,0,0,0.42)", margin: "16px 0 0" };
const btn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: 999, background: "#0D1016", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none" };
