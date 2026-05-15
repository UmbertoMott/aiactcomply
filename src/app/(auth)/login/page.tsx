"use client";

import { loginEmail } from "@/app/(auth)/actions/auth";
import { useActionState } from "react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return await loginEmail(formData);
    },
    null
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Accedi</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Non hai un account?{" "}
          <a href="/register" className="text-primary hover:underline">
            Registrati
          </a>
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="nome@azienda.it" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            Password
          </label>
          <input id="password" name="password" type="password" required autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="••••••••" />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" name="remember" defaultChecked className="rounded border-border bg-muted" />
          Ricordami (365 giorni)
        </label>

        {state?.error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">{state.error}</div>
        )}

        <button type="submit" disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {pending ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
}
