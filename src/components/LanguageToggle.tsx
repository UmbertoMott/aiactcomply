"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { useLocale, setLocaleCookie } from "@/i18n/LocaleProvider";

// Levetta lingua IT / EN. Salva il cookie e fa refresh: il Server ri-renderizza
// nella lingua scelta (client e <html lang> si aggiornano) senza reload completo.

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (l: Locale) => {
    if (l === locale) return;
    setLocaleCookie(l);
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label="Lingua / Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 999,
        padding: 2,
        fontFamily: "'DM Mono', monospace",
        fontSize: compact ? 10 : 11,
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            aria-pressed={active}
            style={{
              padding: compact ? "2px 7px" : "3px 9px",
              borderRadius: 999,
              border: "none",
              cursor: active ? "default" : "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
              background: active ? "#0D1016" : "transparent",
              color: active ? "#ffffff" : "rgba(0,0,0,0.45)",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
