"use client";

import { loginEmail } from "@/app/(auth)/actions/auth";
import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function OAuthButton({
  provider,
  label,
  icon,
}: {
  provider: "google" | "azure";
  label: string;
  icon: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, queryParams: provider === "azure" ? { prompt: "select_account" } : undefined },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-lg px-4 py-2.5 text-[13px] font-medium flex items-center justify-center gap-2.5 transition-all"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.12)",
        color: "#0D1016",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {icon}
      {loading ? "Reindirizzamento..." : label}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return await loginEmail(formData);
    },
    null
  );

  return (
    <div>
      <h1
        className="mb-1"
        style={{ fontSize: "28px", fontWeight: 400, letterSpacing: "-1px", color: "#0D1016" }}
      >
        Bentornato
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "rgba(0,0,0,0.42)" }}>
        Non hai un account?{" "}
        <Link href="/register" className="underline underline-offset-2" style={{ color: "#0D1016" }}>
          Registrati gratis
        </Link>
      </p>

      {sessionExpired && (
        <div
          className="mb-6 rounded-lg px-4 py-2.5 text-[12px]"
          style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}
        >
          La tua sessione è scaduta (24h). Accedi di nuovo per continuare.
        </div>
      )}

      {/* OAuth buttons */}
      <div className="space-y-2.5 mb-6">
        <OAuthButton
          provider="google"
          label="Accedi con Google"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          }
        />
        <OAuthButton
          provider="azure"
          label="Accedi con Microsoft"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
              <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
              <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
              <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
            </svg>
          }
        />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
        <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>oppure</span>
        <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-[12px] font-medium mb-1.5"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nome@azienda.it"
            className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none transition-all"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.12)",
              color: "#0D1016",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[12px] font-medium mb-1.5"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none transition-all"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.12)",
              color: "#0D1016",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
          />
        </div>

        {state?.error && (
          <div
            className="rounded-lg px-4 py-2.5 text-[12px]"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
          >
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full py-2.5 text-[13px] font-medium transition-all"
          style={{
            background: "#0D1016",
            color: "#ffffff",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
