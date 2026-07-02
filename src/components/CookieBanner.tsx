"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type ConsentCategory = "necessary" | "analytics" | "marketing";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  _saved: boolean;
}

const STORAGE_KEY = "regulaeos_cookie_consent";
const EVENT_NAME  = "cookie-consent-changed";

const DEFAULT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  _saved:    false,
};

// ─── API pubblica ─────────────────────────────────────────────────────────────

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const c = getConsent();
  return c._saved && c[category] === true;
}

// Apre il pannello preferenze: usa un CustomEvent intercettato dal componente
export function openCookieSettings(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-cookie-settings"));
  }
}

function saveConsent(state: Omit<ConsentState, "_saved">) {
  const full: ConsentState = { ...state, _saved: true };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: full }));
}

// ─── Componente ───────────────────────────────────────────────────────────────

const DARK  = "#0D1016";
const GREEN = "#0B3D2E";
const MONO  = "'DM Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";

export default function CookieBanner() {
  const [visible,  setVisible]  = useState(false);
  const [panel,    setPanel]    = useState(false);    // pannello preferenze
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Mostra il banner solo se il consenso non è ancora stato dato
  useEffect(() => {
    const c = getConsent();
    if (!c._saved) setVisible(true);
  }, []);

  // Ascolta openCookieSettings() dall'esterno (Footer)
  useEffect(() => {
    const handler = () => {
      const c = getConsent();
      setAnalytics(c.analytics);
      setMarketing(c.marketing);
      setPanel(true);
      setVisible(true);
    };
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
    setVisible(false);
    setPanel(false);
  }, []);

  const rejectAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
    setVisible(false);
    setPanel(false);
  }, []);

  const saveCustom = useCallback(() => {
    saveConsent({ necessary: true, analytics, marketing });
    setVisible(false);
    setPanel(false);
  }, [analytics, marketing]);

  const openPrefs = useCallback(() => {
    const c = getConsent();
    setAnalytics(c.analytics);
    setMarketing(c.marketing);
    setPanel(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Impostazioni cookie"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 16px 24px",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.08)",
          maxWidth: 560,
          width: "100%",
          padding: "28px 28px 24px",
          outline: "none",
        }}
        tabIndex={-1}
      >
        {!panel ? (
          /* ─── Banner compatto ─────────────────────────────────────────── */
          <>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Cookie &amp; Privacy
            </p>
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.6)", lineHeight: 1.65, marginBottom: 20 }}>
              Usiamo cookie tecnici (necessari) e, con il tuo consenso, cookie analitici per migliorare il servizio.
              Nessun dato viene ceduto a terzi per marketing senza esplicita accettazione.{" "}
              <a href="/privacy" style={{ color: DARK, textDecoration: "underline" }}>Privacy</a> ·{" "}
              <a href="/cookie-policy" style={{ color: DARK, textDecoration: "underline" }}>Cookie Policy</a>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button onClick={acceptAll} style={btnStyle("filled")}>
                Accetta tutti
              </button>
              <button onClick={rejectAll} style={btnStyle("outline")}>
                Rifiuta
              </button>
              <button onClick={openPrefs} style={btnStyle("ghost")}>
                Personalizza
              </button>
            </div>
          </>
        ) : (
          /* ─── Pannello preferenze ─────────────────────────────────────── */
          <>
            <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 6 }}>
              Impostazioni cookie
            </p>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.6, marginBottom: 20 }}>
              Scegli quali categorie di cookie vuoi abilitare. I cookie necessari non possono essere disabilitati.
            </p>

            {/* Categoria: Necessari */}
            <CategoryRow
              label="Necessari"
              desc="Sessione, sicurezza, preferenze UI. Non richiedono consenso."
              checked={true}
              disabled={true}
              onChange={() => {}}
            />
            {/* Categoria: Analytics */}
            <CategoryRow
              label="Analitici"
              desc="Statistiche aggregate sull'utilizzo del sito (es. pagine visitate, sessioni)."
              checked={analytics}
              disabled={false}
              onChange={setAnalytics}
            />
            {/* Categoria: Marketing */}
            <CategoryRow
              label="Marketing"
              desc="Contenuti personalizzati e retargeting pubblicitario su piattaforme terze."
              checked={marketing}
              disabled={false}
              onChange={setMarketing}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              <button onClick={saveCustom} style={btnStyle("filled")}>
                Salva preferenze
              </button>
              <button onClick={acceptAll} style={btnStyle("outline")}>
                Accetta tutti
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

function CategoryRow({
  label, desc, checked, disabled, onChange,
}: {
  label: string; desc: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.06)",
    }}>
      <div style={{ flex: 1, marginRight: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1016", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        aria-label={`${label} cookie ${checked ? "attivi" : "disattivi"}`}
        style={{
          flexShrink: 0,
          width: 40, height: 22,
          borderRadius: 11,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background: checked ? GREEN : "rgba(0,0,0,0.15)",
          position: "relative",
          transition: "background 0.2s ease",
          opacity: disabled ? 0.5 : 1,
          outline: "none",
        }}
      >
        <span style={{
          position: "absolute",
          top: 3, left: checked ? 21 : 3,
          width: 16, height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

function btnStyle(variant: "filled" | "outline" | "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 500,
    padding: "9px 18px",
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "opacity 0.15s ease",
    letterSpacing: "0.02em",
  };
  if (variant === "filled")  return { ...base, background: "#0D1016", color: "#fff", border: "1px solid #0D1016" };
  if (variant === "outline") return { ...base, background: "transparent", color: "#0D1016", border: "1px solid rgba(0,0,0,0.2)" };
  return { ...base, background: "transparent", color: "rgba(0,0,0,0.45)", border: "1px solid transparent" };
}
