"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { verifyLoginOTPAction, resendLoginOTPAction, ensureOTPSent } from "./actions";

export default function VerifyLoginOTPPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();

    // Auto-genera OTP se l'utente arriva con sessione persistente
    ensureOTPSent().catch(() => {});

    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
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
      inputsRef.current[5]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Inserisci il codice completo di 6 cifre.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.append("code", fullCode);
    startTransition(async () => {
      const result = await verifyLoginOTPAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendMsg("");
    setError("");
    startTransition(async () => {
      const result = await resendLoginOTPAction();
      if (result?.error) {
        setError(result.error);
      } else {
        setResendMsg("Nuovo codice inviato! Controlla la tua email.");
        setResendCooldown(60);
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => inputsRef.current[0]?.focus(), 50);
      }
    });
  }

  const allFilled = code.join("").length === 6;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0D1016] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0D1016]">Verifica email</h1>
          <p className="text-sm text-[#64748B] mt-2">
            Abbiamo inviato un codice a 6 cifre alla tua email.<br />
            Inseriscilo qui sotto per accedere.
          </p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl
                           border-[#E2E8F0] focus:border-[#0D1016] focus:outline-none
                           transition-colors bg-[#F8FAFC]"
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          {resendMsg && (
            <p className="text-sm text-green-600 text-center bg-green-50 rounded-lg py-2 px-3">
              {resendMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !allFilled}
            className="w-full bg-[#0D1016] text-white rounded-xl py-3 font-semibold
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity
                       hover:opacity-90"
          >
            {isPending ? "Verifica in corso…" : "Verifica codice"}
          </button>
        </form>

        {/* Rinvia */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#64748B]">Non hai ricevuto il codice?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isPending}
            className="mt-1 text-sm font-medium text-[#0D1016] disabled:text-[#94A3B8]
                       disabled:cursor-not-allowed hover:underline"
          >
            {resendCooldown > 0 ? `Rinvia tra ${resendCooldown}s` : "Rinvia codice"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-[#64748B] hover:text-[#0D1016] transition-colors">
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
