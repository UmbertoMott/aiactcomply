"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hasConsent, COOKIE_CONSENT_CHANGED_EVENT } from "@/components/CookieBanner";

const GA_ID = "G-E6WTLVVMNQ";
const TRACKED_HOSTS = new Set(["regulaeos.com", "www.regulaeos.com"]);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isOnTrackedHost() {
  return typeof window !== "undefined" && TRACKED_HOSTS.has(window.location.hostname);
}

// IMPORTANTE: gtag.js processa la coda dataLayer solo se ogni voce è
// l'oggetto `arguments` (array-like), NON un vero Array. Pushando un Array
// il comando `config` viene ignorato → nessun page_view → 0 utenti.
// Questo replica esattamente lo snippet ufficiale: function gtag(){dataLayer.push(arguments)}
const gtag = function gtag() {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
} as (...args: unknown[]) => void;

function injectGA() {
  if (document.getElementById("ga4-script")) return; // già iniettato
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag("js", new Date());
  // send_page_view: false → il page_view iniziale NON viene affidato al config
  // (accodato prima che gtag.js sia pronto, l'auto-invio va perso). Lo inviamo
  // esplicitamente nell'onload dello script, quando la libreria è pronta.
  gtag("config", GA_ID, { send_page_view: false });
  const s = document.createElement("script");
  s.id = "ga4-script";
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.async = true;
  s.onload = () => {
    gtag("event", "page_view", {
      page_path:  window.location.pathname + window.location.search,
      page_title: document.title,
    });
  };
  document.head.appendChild(s);
}

export default function GoogleAnalytics() {
  const pathname  = usePathname();
  const prevPath  = useRef<string | null>(null);
  const gaReady   = useRef(false);

  useEffect(() => {
    function tryInit() {
      if (!isOnTrackedHost() || !hasConsent("analytics")) return;
      if (!gaReady.current) {
        gaReady.current = true;
        injectGA();
        prevPath.current = window.location.pathname + window.location.search;
      }
    }

    tryInit();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, tryInit);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, tryInit);
  }, []);

  // SPA navigation tracking
  useEffect(() => {
    if (!gaReady.current) return;
    const path = pathname;
    if (path === prevPath.current) return;
    prevPath.current = path;
    window.gtag?.("event", "page_view", {
      page_path:  path,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
