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

// ─── Lingua nell'URL (sezione Risorse) ────────────────────────────────────────
// L'italiano resta sugli URL storici (/risorse/...), l'inglese ha il prefisso
// /en (/en/risorse/...). Sulle pagine localizzate la lingua dell'URL vince sul
// cookie: chi clicca un link da Google o da un articolo arriva nella lingua del
// link. Il proxy passa la lingua alle pagine con questo header di richiesta.
export const LOCALE_HEADER = "x-regulaeos-locale";
export const EN_PREFIX = "/en";

/** Sezioni che hanno URL distinti per lingua (vanno tenute allineate al proxy). */
const LOCALIZED_SECTIONS = ["/risorse"];

function isLocalizedPath(path: string): boolean {
  return LOCALIZED_SECTIONS.some((s) => path === s || path.startsWith(`${s}/`));
}

/**
 * Se `pathname` è un URL localizzato restituisce la lingua e il percorso
 * "base" (senza prefisso), altrimenti null.
 *   /risorse/x     → { locale: "it", basePath: "/risorse/x" }
 *   /en/risorse/x  → { locale: "en", basePath: "/risorse/x" }
 */
export function parseLocalizedPath(pathname: string): { locale: Locale; basePath: string } | null {
  if (pathname.startsWith(`${EN_PREFIX}/`)) {
    const basePath = pathname.slice(EN_PREFIX.length);
    return isLocalizedPath(basePath) ? { locale: "en", basePath } : null;
  }
  return isLocalizedPath(pathname) ? { locale: "it", basePath: pathname } : null;
}

/**
 * URL di un percorso nella lingua richiesta. Aggiunge /en solo ai percorsi
 * delle sezioni localizzate; gli altri restano invariati.
 *   localizedHref("/risorse/x", "en") → "/en/risorse/x"
 *   localizedHref("/scanner", "en")   → "/scanner"
 */
export function localizedHref(path: string, locale: Locale): string {
  const parsed = parseLocalizedPath(path);
  const base = parsed ? parsed.basePath : path;
  if (!isLocalizedPath(base)) return path;
  return locale === "en" ? `${EN_PREFIX}${base}` : base;
}
