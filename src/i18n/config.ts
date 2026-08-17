// Configurazione i18n — bilingue IT/EN (approccio cookie + contesto, no URL routing).
// La lingua è persistita in un cookie leggibile lato server (niente flash all'avvio).

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "it";
export const LOCALE_COOKIE = "regulaeos_locale";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "it" || v === "en";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
};
