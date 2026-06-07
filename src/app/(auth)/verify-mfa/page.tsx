"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function VerifyMFAPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(0, 1);
    setCode(newCode);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Inserisci il codice completo di 6 cifre");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Configurazione non disponibile.");
      setLoading(false);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];

    if (!totpFactor) {
      setError("Nessun fattore MFA trovato. Contatta il supporto.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpFactor.id,
      code: fullCode,
    });

    if (verifyError) {
      setError("Codice non valido o scaduto. Riprova.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div>
      <h1
        className="mb-1"
        style={{ fontSize: "28px", fontWeight: 400, letterSpacing: "-1px", color: "#0D1016" }}
      >
        Verifica a due fattori
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "rgba(0,0,0,0.42)" }}>
        Apri la tua app di autenticazione (Google Authenticator, Authy…) e inserisci il codice.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 rounded-lg text-center text-xl font-bold outline-none transition-all"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.12)",
                color: "#0D1016",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
            />
          ))}
        </div>

        {error && (
          <div
            className="rounded-lg px-4 py-2.5 text-[12px] text-center"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.some((d) => !d)}
          className="w-full rounded-full py-2.5 text-[13px] font-medium transition-all"
          style={{
            background: "#0D1016",
            color: "#ffffff",
            opacity: loading || code.some((d) => !d) ? 0.5 : 1,
          }}
        >
          {loading ? "Verifica in corso..." : "Verifica"}
        </button>

        <p className="text-center text-[12px]" style={{ color: "rgba(0,0,0,0.42)" }}>
          Problemi?{" "}
          <Link href="/login" className="underline underline-offset-2" style={{ color: "#0D1016" }}>
            Torna al login
          </Link>
        </p>
      </form>
    </div>
  );
}
