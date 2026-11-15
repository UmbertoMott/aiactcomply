import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_HEADER, type Locale } from "@/i18n/config";

export interface UpdateSessionOptions {
  /** Lingua dell'URL da passare alle pagine (header LOCALE_HEADER). */
  locale?: Locale;
  /** Se presente, la richiesta viene riscritta internamente su questo URL. */
  rewriteTo?: URL;
}

export async function updateSession(request: NextRequest, opts: UpdateSessionOptions = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Risposta "prosegui": inoltra gli header della richiesta (inclusi i cookie
  // eventualmente aggiornati da Supabase) e imposta la lingua dell'URL. L'header
  // di lingua arrivato dal client viene sempre scartato: lo decide solo il proxy.
  const passThrough = () => {
    const headers = new Headers(request.headers);
    headers.delete(LOCALE_HEADER);
    if (opts.locale) headers.set(LOCALE_HEADER, opts.locale);
    return opts.rewriteTo
      ? NextResponse.rewrite(opts.rewriteTo, { request: { headers } })
      : NextResponse.next({ request: { headers } });
  };

  let supabaseResponse = passThrough();

  if (!url.startsWith("http")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = passThrough();
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage    = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/verify");
  const isVerifyMFA   = pathname.startsWith("/verify-mfa");
  const isVerifyOTP   = pathname.startsWith("/verify-login-otp");
  const isDashboard   = pathname.startsWith("/dashboard");

  // ── Protezione route dashboard ─────────────────────────────────────────────
  if (!user && isDashboard) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // ── Gestione scadenza sessione ─────────────────────────────────────────────
  // La scadenza è gestita nativamente da Supabase tramite Refresh Token.
  // Il componente SessionWarning nel frontend avvisa l'utente 5 minuti prima
  // della scadenza consentendo il rinnovo senza perdita di dati in compilazione.

  // ── Email OTP enforcement — obbligatorio ad ogni login (cookie dura 24h) ───
  if (user && isDashboard) {
    const otpVerified = request.cookies.get("login_otp_verified")?.value;
    if (!otpVerified) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/verify-login-otp";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ── MFA enforcement ────────────────────────────────────────────────────────
  // Se l'utente ha TOTP attivo ma la sessione è ancora AAL1, richiede verifica
  if (user && isDashboard) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/verify-mfa";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ── Redirect utente autenticato fuori dalle pagine auth ────────────────────
  // Solo se ha ANCHE il cookie OTP → è pienamente autenticato → dashboard
  // Se ha sessione ma non il cookie OTP → lascia vedere il login per riautenticarsi
  if (user && isAuthPage && !isVerifyMFA && !isVerifyOTP) {
    const otpVerified = request.cookies.get("login_otp_verified")?.value;
    if (otpVerified) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard/start";
      return NextResponse.redirect(redirectUrl);
    }
    // Sessione attiva ma OTP non verificato → mostra login normalmente
  }

  return supabaseResponse;
}
