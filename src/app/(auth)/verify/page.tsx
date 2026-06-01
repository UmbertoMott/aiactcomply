"use client";

import { verifyOTP, resendOTP } from "@/app/(auth)/actions/auth";
import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VerifyForm() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "signup";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const uid = searchParams.get("uid") || "";
  const fromScanner  = searchParams.get("from")     === "scanner";
  const scanUrl      = searchParams.get("url")      || "";
  const scanScore    = searchParams.get("score")    || "";
  const scanCritical = searchParams.get("critical") || "";
  const title =
    reason === "inactive"
      ? "Verifica di sicurezza richiesta"
      : "Verifica la tua identità";
  const subtitle =
    reason === "inactive"
      ? "Non accedi da più di 7 giorni. Inserisci il codice ricevuto via email."
      : "Inserisci il codice a 6 cifre che ti abbiamo inviato via email.";

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(0, 1);
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      newCode.forEach((_, i) => {
        if (inputsRef.current[i]) {
          inputsRef.current[i]!.value = newCode[i];
        }
      });
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

    const formData = new FormData();
    formData.set("code", fullCode);
    formData.set("userId", searchParams.get("uid") || "");
    if (fromScanner) {
      const onboardParams = new URLSearchParams();
      if (scanUrl)      onboardParams.set("url",      scanUrl);
      if (scanScore)    onboardParams.set("score",    scanScore);
      if (scanCritical) onboardParams.set("critical", scanCritical);
      formData.set("redirectTo", `/dashboard/onboarding?${onboardParams.toString()}`);
    }

    const result = await verifyOTP(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    const result = await resendOTP(uid);
    if (result?.success) {
      setError("");
    }
    setResending(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-muted-foreground text-sm">{subtitle}</p>

      </div>

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
              className="w-12 h-14 rounded-lg border border-border bg-muted text-center text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.some((d) => !d)}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Verifica in corso..." : "Verifica codice"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {resending ? "Invio in corso..." : "Invia un nuovo codice"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Caricamento...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
