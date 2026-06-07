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
  const isAuthPage   = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/verify");
  const isVerifyMFA  = pathname.startsWith("/verify-mfa");
  const isDashboard  = pathname.startsWith("/dashboard");

  if (!user && isDashboard) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // ── Daily session enforcement (free-plan alternative to Supabase Pro time-box) ──
  // Force re-login if last_sign_in_at is older than 24 hours.
  const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
  if (user && isDashboard) {
    const lastSignIn = new Date(user.last_sign_in_at ?? 0).getTime();
    if (Date.now() - lastSignIn > SESSION_MAX_AGE_MS) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("reason", "session_expired");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // MFA enforcement: if user has TOTP enrolled but current session is aal1, require upgrade
  if (user && isDashboard) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/verify-mfa";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Prevent authenticated users from accessing auth pages (but allow /verify-mfa)
  if (user && isAuthPage && !isVerifyMFA) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
