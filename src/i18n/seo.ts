import type { Metadata } from "next";
import { localizedHref, type Locale } from "./config";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.regulaeos.com";

/** URL assoluta di un percorso nella lingua indicata (/en solo per le sezioni localizzate). */
export function absoluteLocalizedUrl(basePath: string, locale: Locale): string {
  const path = localizedHref(basePath, locale);
  // Home italiana senza slash finale (https://www.regulaeos.com), come il canonical storico.
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * Canonical + hreflang per una pagina localizzata.
 * - canonical: la URL della pagina nella lingua corrente (mai l'altra lingua);
 * - languages: it, en e x-default (= italiano), solo se esiste più di una lingua.
 */
export function localeAlternates(
  basePath: string,
  locale: Locale,
  available: readonly Locale[] = ["it", "en"],
): Metadata["alternates"] {
  const canonical = absoluteLocalizedUrl(basePath, locale);
  if (available.length < 2) return { canonical };
  const languages: Record<string, string> = {};
  for (const l of available) languages[l] = absoluteLocalizedUrl(basePath, l);
  languages["x-default"] = absoluteLocalizedUrl(basePath, "it");
  return { canonical, languages };
}

/** Valore og:locale per la lingua. */
export function ogLocale(locale: Locale): string {
  return locale === "en" ? "en_US" : "it_IT";
}
