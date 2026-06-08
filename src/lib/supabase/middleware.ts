import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  let supabaseResponse = NextResponse.next({ request });

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
        supabaseResponse = NextResponse.next({ request });
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
  if (user && isAuthPage && !isVerifyMFA && !isVerifyOTP) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
