"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, localizedHref, parseLocalizedPath, type Locale } from "@/i18n/config";
import { useLocale, setLocaleCookie } from "@/i18n/LocaleProvider";

// Levetta lingua IT / EN. Salva il cookie; sulle pagine con lingua nell'URL
// (Risorse: /risorse ↔ /en/risorse) porta alla URL dell'altra lingua, altrove
// fa refresh e il Server ri-renderizza nella lingua scelta.

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const switchTo = (l: Locale) => {
    if (l === locale) return;
    setLocaleCookie(l);
    const localized = parseLocalizedPath(pathname);
    if (localized) {
      // Navigazione completa: il root layout (<html lang>, contesto lingua) non
      // viene ri-renderizzato nelle navigazioni client, quindi serve un reload.
      window.location.assign(localizedHref(localized.basePath, l) + window.location.search);
    } else {
      startTransition(() => router.refresh());
    }
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
