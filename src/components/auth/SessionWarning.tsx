"use client";
// src/components/auth/SessionWarning.tsx
// Avvisa l'utente 5 minuti prima della scadenza della sessione Supabase
// e offre il rinnovo senza disconnessione — evita perdita di dati in compilazione

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { X, Clock } from "lucide-react";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000;  // avvisa 5 min prima
const CHECK_INTERVAL_MS = 30 * 1000;               // controlla ogni 30 secondi

export default function SessionWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [renewing, setRenewing] = useState(false);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const expiresAt = (session.expires_at ?? 0) * 1000;
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) {
      // Sessione già scaduta
      setShowWarning(false);
      router.push("/login?reason=session_expired");
    } else if (timeLeft <= WARNING_BEFORE_EXPIRY_MS) {
      setShowWarning(true);
      setSecondsLeft(Math.ceil(timeLeft / 1000));
    } else {
      setShowWarning(false);
    }
  }, [router]);

  async function renewSession() {
    setRenewing(true);
    const supabase = createClient();
    if (!supabase) { setRenewing(false); return; }

    const { error } = await supabase.auth.refreshSession();
    if (!error) {
      setShowWarning(false);
      setSecondsLeft(0);
    }
    setRenewing(false);
  }

  // Controlla ogni 30 secondi
  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkSession]);

  // Countdown tick quando il warning è visibile
  useEffect(() => {
    if (!showWarning) return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          router.push("/login?reason=session_expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [showWarning, router]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}m ${String(secs).padStart(2, "0")}s`
    : `${secondsLeft}s`;

  // Colore urgenza: rosso sotto 1 minuto, arancione sotto 2 minuti
  const urgentColor = secondsLeft < 60
    ? "#dc2626"
    : secondsLeft < 120
    ? "#b45309"
    : "#0D1016";
  const urgentBorder = secondsLeft < 60
    ? "rgba(220,38,38,0.35)"
    : "rgba(245,158,11,0.3)";

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] rounded-2xl p-4 w-80 select-none"
      style={{
        background: "#ffffff",
        border: `1px solid ${urgentBorder}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icona */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: secondsLeft < 60 ? "rgba(220,38,38,0.10)" : "rgba(245,158,11,0.10)",
          }}
        >
          <Clock
            className="h-4 w-4"
            style={{ color: secondsLeft < 60 ? "#dc2626" : "#b45309" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>
              Sessione in scadenza
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="flex-shrink-0 rounded hover:bg-gray-100 transition-colors p-0.5"
              style={{ color: "rgba(0,0,0,0.3)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[12px] mb-3" style={{ color: "rgba(0,0,0,0.5)" }}>
            Scadenza tra{" "}
            <strong style={{ color: urgentColor }}>{timeStr}</strong>.{" "}
            Rinnova per non perdere il lavoro in corso.
          </p>

          <div className="flex gap-2">
            <button
              onClick={renewSession}
              disabled={renewing}
              className="flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-opacity"
              style={{
                background: "#0D1016",
                color: "#ffffff",
                opacity: renewing ? 0.6 : 1,
              }}
            >
              {renewing ? "Rinnovo..." : "Rinnova sessione"}
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                color: "rgba(0,0,0,0.45)",
              }}
            >
              Ignora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
