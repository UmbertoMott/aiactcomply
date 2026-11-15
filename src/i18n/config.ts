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

// ─── Lingua nell'URL (pagine pubbliche tradotte) ──────────────────────────────
// L'italiano resta sugli URL storici (/, /scanner, /risorse/...), l'inglese ha
// il prefisso /en (/en, /en/scanner, /en/risorse/...). Sulle pagine localizzate
// la lingua dell'URL vince sul cookie: chi clicca un link da Google o da un
// articolo arriva nella lingua del link. Il proxy passa la lingua alle pagine
// con questo header di richiesta. Le pagine non in elenco (offerta, contatti,
// pagine legali, area riservata) restano su un solo URL e usano il cookie.
export const LOCALE_HEADER = "x-regulaeos-locale";
export const EN_PREFIX = "/en";

/**
 * Pagine/sezioni con URL distinti per lingua. "/" vale solo per la home; le
 * altre includono le sottopagine (/risorse/<slug>, /risorse/pagina/N).
 * Aggiungere qui una pagina solo quando è interamente tradotta.
 */
export const LOCALIZED_SECTIONS = ["/", "/scanner", "/products", "/roi", "/risorse"] as const;

function isLocalizedPath(path: string): boolean {
  return LOCALIZED_SECTIONS.some((s) =>
    s === "/" ? path === "/" : path === s || path.startsWith(`${s}/`),
  );
}

/**
 * Se `pathname` è un URL localizzato restituisce la lingua e il percorso
 * "base" (senza prefisso), altrimenti null.
 *   /risorse/x     → { locale: "it", basePath: "/risorse/x" }
 *   /en/risorse/x  → { locale: "en", basePath: "/risorse/x" }
 *   /en            → { locale: "en", basePath: "/" }
 */
export function parseLocalizedPath(pathname: string): { locale: Locale; basePath: string } | null {
  if (pathname === EN_PREFIX || pathname === `${EN_PREFIX}/`) return { locale: "en", basePath: "/" };
  if (pathname.startsWith(`${EN_PREFIX}/`)) {
    const basePath = pathname.slice(EN_PREFIX.length);
    return isLocalizedPath(basePath) ? { locale: "en", basePath } : null;
  }
  return isLocalizedPath(pathname) ? { locale: "it", basePath: pathname } : null;
}

/**
 * URL di un percorso nella lingua richiesta. Aggiunge /en solo alle pagine
 * localizzate; le altre restano invariate. Query e anchor vengono conservati.
 *   localizedHref("/risorse/x", "en")  → "/en/risorse/x"
 *   localizedHref("/", "en")           → "/en"
 *   localizedHref("/#chi-eroga", "en") → "/en#chi-eroga"
 *   localizedHref("/inizia", "en")     → "/inizia"
 */
export function localizedHref(path: string, locale: Locale): string {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const suffix = cut === -1 ? "" : path.slice(cut);
  const parsed = parseLocalizedPath(pathname);
  if (!parsed) return path;
  if (locale === "it") return parsed.basePath + suffix;
  return (parsed.basePath === "/" ? EN_PREFIX : `${EN_PREFIX}${parsed.basePath}`) + suffix;
}
