"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import { translate } from "./dictionaries";

// Contesto lingua per i Client Component. Il valore arriva dal Server (root layout
// legge il cookie), così client e server sono coerenti senza flash.

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// Hook di traduzione per un namespace: const t = useT("nav"); t("login")
export function useT(ns: string): (key: string) => string {
  const locale = useContext(LocaleContext);
  return (key: string) => translate(locale, ns, key);
}

// Imposta il cookie di lingua (client). Chi chiama fa poi router.refresh().
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}
