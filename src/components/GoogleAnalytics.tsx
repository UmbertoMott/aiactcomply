"use client";

import { useEffect, useRef, useState, Suspense, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasConsent,
} from "@/components/CookieBanner";

// ─── Config ───────────────────────────────────────────────────────────────────
const GA_ID = "G-E6WTLVVMNQ";
const DISABLE_KEY = `ga-disable-${GA_ID}`;
const TRACKED_HOSTS = new Set(["regulaeos.com", "www.regulaeos.com"]);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTrackedHost() {
  if (typeof window === "undefined") return false;
  return TRACKED_HOSTS.has(window.location.hostname);
}

/** Imposta dataLayer + Consent Mode v2 con tutti i segnali NEGATI per default.
 *  Va eseguito prima del caricamento di gtag.js per essere conforme. */
function initConsentDefaults() {
  if (window.__gaDefaultsSet) return;
  window.__gaDefaultsSet = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function (...args: unknown[]) {
    (window.dataLayer as unknown[]).push(args);
  };
  // Consent Mode v2 — tutti negati di default
  window.gtag("consent", "default", {
    analytics_storage:    "denied",
    ad_storage:           "denied",
    ad_user_data:         "denied",
    ad_personalization:   "denied",
    wait_for_update:       500,
  });
}

function updateConsent(enabled: boolean) {
  window[DISABLE_KEY] = !enabled;
  window.gtag?.("consent", "update", {
    analytics_storage:  enabled ? "granted" : "denied",
    ad_storage:         "denied",
    ad_user_data:       "denied",
    ad_personalization: "denied",
  });
}

function sendPageView(path: string) {
  window.gtag?.("event", "page_view", {
    page_path:  path,
    page_title: typeof document !== "undefined" ? document.title : "",
  });
}

// ─── useSyncExternalStore wiring ──────────────────────────────────────────────

function subscribeToConsent(cb: () => void) {
  window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, cb);
  return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, cb);
}
const getConsentSnapshot       = () => hasConsent("analytics");
const getServerConsentSnapshot = () => false;  // nessun cookie GA lato server

// ─── Inner tracker (usa useSearchParams → deve stare in <Suspense>) ───────────

function GATracker() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const analyticsEnabled = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  // true solo se siamo in un browser sul dominio di produzione
  const [onTrackedHost, setOnTrackedHost] = useState(false);
  useEffect(() => { setOnTrackedHost(isTrackedHost()); }, []);

  const scriptLoadedRef  = useRef(false);
  const prevPathRef      = useRef<string | null>(null);

  // 1. Imposta defaults negati al mount (prima di qualsiasi hit)
  useEffect(() => {
    if (!onTrackedHost) return;
    initConsentDefaults();
  }, [onTrackedHost]);

  // 2. Sincronizza consent con GA ogni volta che cambia
  useEffect(() => {
    if (!onTrackedHost) return;
    updateConsent(analyticsEnabled);

    // Se il consenso viene concesso e lo script è già caricato → pageview immediata
    if (analyticsEnabled && scriptLoadedRef.current) {
      const path = window.location.pathname + window.location.search;
      if (path !== prevPathRef.current) {
        prevPathRef.current = path;
        sendPageView(path);
      }
    }
  }, [analyticsEnabled, onTrackedHost]);

  // 3. Pageview SPA ad ogni cambio rotta (solo se script caricato + consenso)
  useEffect(() => {
    if (!onTrackedHost || !analyticsEnabled || !scriptLoadedRef.current) return;
    const qs   = searchParams?.toString();
    const path = pathname + (qs ? `?${qs}` : "");
    if (path === prevPathRef.current) return;
    prevPathRef.current = path;
    sendPageView(path);
  }, [pathname, searchParams, analyticsEnabled, onTrackedHost]);

  // Non caricare lo script se: dominio non tracciato OPPURE consenso non dato
  if (!onTrackedHost || !analyticsEnabled) return null;

  return (
    <Script
      id="ga4-script"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
      onLoad={() => {
        scriptLoadedRef.current = true;
        // config con send_page_view:false — inviamo noi la prima pageview manualmente
        window.gtag?.("js", new Date());
        window.gtag?.("config", GA_ID, { send_page_view: false });
        const path = window.location.pathname + window.location.search;
        prevPathRef.current = path;
        sendPageView(path);
      }}
    />
  );
}

// ─── Export (con Suspense per useSearchParams in App Router) ─────────────────

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GATracker />
    </Suspense>
  );
}
