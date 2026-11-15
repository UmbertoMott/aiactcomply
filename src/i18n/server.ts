import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, isLocale, type Locale } from "./config";
import { translate } from "./dictionaries";

// Utility i18n per i Server Component.
// Ordine: 1) lingua dell'URL (header impostato dal proxy sulle pagine
// localizzate, es. /risorse e /en/risorse), 2) cookie, 3) italiano.

export async function getLocale(): Promise<Locale> {
  const h = (await headers()).get(LOCALE_HEADER);
  if (isLocale(h)) return h;
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

// const t = await getT("nav"); t("login")
export async function getT(ns: string): Promise<(key: string) => string> {
  const locale = await getLocale();
  return (key: string) => translate(locale, ns, key);
}
