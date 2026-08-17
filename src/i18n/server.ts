import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { translate } from "./dictionaries";

// Utility i18n per i Server Component (leggono il cookie via next/headers).

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

// const t = await getT("nav"); t("login")
export async function getT(ns: string): Promise<(key: string) => string> {
  const locale = await getLocale();
  return (key: string) => translate(locale, ns, key);
}
