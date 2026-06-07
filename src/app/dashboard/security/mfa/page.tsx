"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Step = "loading" | "enrolled" | "setup-start" | "setup-verify" | "unenroll-confirm";

interface TOTPFactor {
  id: string;
  friendly_name?: string;
}

export default function MFAPage() {
  const [step, setStep] = useState<Step>("loading");
  const [enrolledFactor, setEnrolledFactor] = useState<TOTPFactor | null>(null);
  const [qrCode, setQrCode]   = useState("");
  const [secret, setSecret]   = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkEnrollment() {
      const supabase = createClient();
      if (!supabase) { setStep("setup-start"); return; }
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setEnrolledFactor(verified);
        setStep("enrolled");
      } else {
        setStep("setup-start");
      }
    }
    checkEnrollment();
  }, []);

  async function startEnrollment() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) { setError("Configurazione non disponibile."); setLoading(false); return; }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "AIComply" });
    if (enrollError || !data) {
      setError(enrollError?.message ?? "Errore durante l'attivazione.");
      setLoading(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("setup-verify");
    setLoading(false);
  }

  async function verifyEnrollment() {
    if (code.length !== 6) { setError("Inserisci il codice a 6 cifre."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) { setError("Configurazione non disponibile."); setLoading(false); return; }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError(challengeError.message); setLoading(false); return; }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      setError("Codice non valido. Riprova.");
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.id === factorId);
    setEnrolledFactor(verified ?? { id: factorId });
    setSuccess("Autenticazione a due fattori attivata con successo.");
    setStep("enrolled");
    setLoading(false);
  }

  async function unenroll() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase || !enrolledFactor) { setLoading(false); return; }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactor.id });
    if (unenrollError) { setError(unenrollError.message); setLoading(false); return; }

    setEnrolledFactor(null);
    setSuccess("Autenticazione a due fattori disattivata.");
    setStep("setup-start");
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "#0D1016" }}>
        Autenticazione a due fattori (TOTP)
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "rgba(0,0,0,0.5)" }}>
        Proteggi il tuo account richiedendo un codice dall&apos;app authenticator ad ogni accesso.
      </p>

      {success && (
        <div className="mb-6 rounded-lg px-4 py-2.5 text-[13px]" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}>
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg px-4 py-2.5 text-[13px]" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {step === "loading" && (
        <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.4)" }}>Caricamento...</p>
      )}

      {step === "enrolled" && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "#dcfce7", color: "#16a34a" }}>✓</div>
            <div>
              <p className="text-[14px] font-medium" style={{ color: "#0D1016" }}>2FA attivo</p>
              <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)" }}>App authenticator configurata</p>
            </div>
          </div>
          <button
            onClick={() => setStep("unenroll-confirm")}
            className="text-[13px] underline underline-offset-2"
            style={{ color: "#dc2626" }}
          >
            Disattiva autenticazione a due fattori
          </button>
        </div>
      )}

      {step === "unenroll-confirm" && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid #fecaca", background: "#fef2f2" }}>
          <p className="text-[14px] font-medium" style={{ color: "#0D1016" }}>Sei sicuro?</p>
          <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.55)" }}>
            Disattivare il 2FA rende il tuo account meno sicuro. Potrai riattivarlo in qualsiasi momento.
          </p>
          <div className="flex gap-3">
            <button
              onClick={unenroll}
              disabled={loading}
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ background: "#dc2626", color: "#fff", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Disattivazione..." : "Sì, disattiva"}
            </button>
            <button
              onClick={() => setStep("enrolled")}
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ border: "1px solid rgba(0,0,0,0.15)", color: "#0D1016" }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {step === "setup-start" && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
          <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.55)" }}>
            Installa <strong>Google Authenticator</strong>, <strong>Authy</strong> o <strong>Microsoft Authenticator</strong> sul tuo smartphone, poi clicca su Attiva.
          </p>
          <button
            onClick={startEnrollment}
            disabled={loading}
            className="rounded-full px-5 py-2.5 text-[13px] font-medium"
            style={{ background: "#0D1016", color: "#fff", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Preparazione..." : "Attiva 2FA"}
          </button>
        </div>
      )}

      {step === "setup-verify" && (
        <div className="space-y-6">
          <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
            <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>1. Scansiona il codice QR</p>
            <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.5)" }}>
              Apri la tua app authenticator e inquadra il QR code qui sotto.
            </p>
            {qrCode && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code TOTP" width={180} height={180} className="rounded-lg" />
              </div>
            )}
            <p className="text-[11px] text-center" style={{ color: "rgba(0,0,0,0.4)" }}>
              Chiave manuale: <span className="font-mono">{secret}</span>
            </p>
          </div>

          <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
            <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>2. Inserisci il codice a 6 cifre</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-lg px-4 py-2.5 text-center text-xl font-bold tracking-widest outline-none"
              style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#0D1016" }}
            />
            <button
              onClick={verifyEnrollment}
              disabled={loading || code.length !== 6}
              className="w-full rounded-full py-2.5 text-[13px] font-medium"
              style={{ background: "#0D1016", color: "#fff", opacity: loading || code.length !== 6 ? 0.5 : 1 }}
            >
              {loading ? "Verifica in corso..." : "Attiva e verifica"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
