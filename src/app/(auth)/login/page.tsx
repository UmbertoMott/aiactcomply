"use client";

import { loginEmail } from "@/app/(auth)/actions/auth";
import { useActionState } from "react";
import Link from "next/link";

export default function LoginPage() {
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

        <label className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(0,0,0,0.42)" }}>
          <input type="checkbox" name="remember" defaultChecked className="rounded" />
          Ricordami per 365 giorni
        </label>

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
