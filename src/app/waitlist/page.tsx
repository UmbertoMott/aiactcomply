"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

// ─── Inner form — uses useSearchParams, must be inside Suspense ───────────────

function WaitlistForm() {
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const plan: "starter" | "professional" =
    rawPlan === "professional" ? "professional" : "starter";
  const planLabel = plan === "professional" ? "Professional" : "Starter";

  const [count, setCount] = useState<number | null>(null);
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [company, setCompany] = useState("");
  const [aiSystems, setAiSystems] = useState("");
  const [role, setRole]     = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/waitlist/count")
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, ai_systems: aiSystems, role: role || undefined, plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Errore durante l'iscrizione. Riprova.");
        return;
      }

      setStatus(data.already ? "already" : "success");
    } catch {
      setStatus("error");
      setErrorMsg("Errore di rete. Controlla la connessione e riprova.");
    }
  }

  const isSuccess = status === "success" || status === "already";

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel (dark) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "#0D1016" }}
      >
        <a
          href="/"
          className="text-white font-semibold text-[18px] hover:opacity-80 transition-opacity"
          style={{ letterSpacing: "-0.5px", textDecoration: "none" }}
        >
          AI<span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 300 }}>Comply</span>
        </a>

        <div>
          <span
            className="inline-block text-[10px] font-bold rounded-full px-3 py-1 mb-6"
            style={{
              background: "rgba(99,102,241,0.2)",
              color: "#a5b4fc",
              letterSpacing: "1.5px",
            }}
          >
            EARLY ACCESS
          </span>

          <h2
            className="text-white mb-4"
            style={{ fontSize: "32px", fontWeight: 400, letterSpacing: "-1.2px", lineHeight: 1.15 }}
          >
            Sii tra i primi<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>a usare RegulaeOS.</span>
          </h2>

          <p
            className="mb-8 text-[13px]"
            style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 340 }}
          >
            L&apos;AI Act scade ad agosto 2025. Le aziende che iniziano oggi
            arrivano conformi in tempo.
          </p>

          <div className="space-y-3 mb-10">
            {[
              "Accesso anticipato alla piattaforma completa",
              "Onboarding 1:1 gratuito con il team",
              "Prezzo bloccato a vita per i fondatori",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#4ade80" }} />
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {count !== null && count > 0 && (
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {count} aziend{count === 1 ? "a" : "e"} già in lista
            </p>
          )}
        </div>

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2025 RegulaeOS. Tutti i diritti riservati.
        </p>
      </div>

      {/* ── Right panel (white) ── */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "#FAFAF9" }}
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <a
            href="/"
            className="lg:hidden text-[18px] font-semibold mb-10 block hover:opacity-70 transition-opacity"
            style={{ color: "#0D1016", letterSpacing: "-0.5px", textDecoration: "none" }}
          >
            AI<span style={{ color: "rgba(0,0,0,0.25)", fontWeight: 300 }}>Comply</span>
          </a>

          {isSuccess ? (
            /* ── Success state ── */
            <div className="text-center py-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(22,163,74,0.1)" }}
              >
                <CheckCircle className="h-7 w-7" style={{ color: "#16a34a" }} />
              </div>
              <h2
                className="mb-2"
                style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.6px", color: "#0D1016" }}
              >
                {status === "already" ? "Sei già in lista!" : "Sei in lista!"}
              </h2>
              <p className="text-[13px] mb-6" style={{ color: "rgba(0,0,0,0.45)", lineHeight: 1.6 }}>
                {status === "already"
                  ? "Questa email è già registrata — ti contatteremo presto."
                  : `Ti contatteremo a ${email} entro 24 ore.`}
              </p>
              <a
                href="/"
                className="text-[13px] font-medium"
                style={{ color: "#6366f1", textDecoration: "none" }}
              >
                ← Torna alla home
              </a>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Plan pill */}
              <div className="mb-2">
                <span
                  className="inline-block text-[10px] font-semibold rounded-full px-2.5 py-1"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                >
                  Piano {planLabel}
                </span>
              </div>

              <h1
                className="mb-1"
                style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "-0.8px", color: "#0D1016" }}
              >
                Entra in lista
              </h1>
              <p className="text-[13px] mb-7" style={{ color: "rgba(0,0,0,0.42)" }}>
                Nessuna carta richiesta. Ti contatteremo entro 24 ore.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Nome e cognome *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0D1016",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  />
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email aziendale *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0D1016",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Azienda *"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "#0D1016",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  />
                </div>

                <div>
                  <select
                    value={aiSystems}
                    onChange={(e) => setAiSystems(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: aiSystems ? "#0D1016" : "rgba(0,0,0,0.4)",
                      appearance: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  >
                    <option value="" disabled>Sistemi AI usati *</option>
                    <option value="1">1</option>
                    <option value="2-5">2–5</option>
                    <option value="6-20">6–20</option>
                    <option value="20+">20+</option>
                  </select>
                </div>

                <div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: role ? "#0D1016" : "rgba(0,0,0,0.4)",
                      appearance: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)")}
                  >
                    <option value="">Ruolo (opzionale)</option>
                    <option value="CTO/CIO">CTO / CIO</option>
                    <option value="Legal/Compliance">Legal / Compliance</option>
                    <option value="DPO">DPO</option>
                    <option value="Founder">Founder</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>

                {errorMsg && (
                  <p className="text-[12px] px-1" style={{ color: "#dc2626" }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-3.5 rounded-xl text-[13px] font-semibold transition-opacity flex items-center justify-center gap-2"
                  style={{
                    background: "#0D1016",
                    color: "#ffffff",
                    opacity: status === "loading" ? 0.7 : 1,
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                  }}
                >
                  {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === "loading" ? "Invio..." : "Richiedi accesso anticipato →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page — wraps inner in Suspense (required for useSearchParams in Next.js 16) ─

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAFAF9" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(0,0,0,0.2)" }} />
        </div>
      }
    >
      <WaitlistForm />
    </Suspense>
  );
}
