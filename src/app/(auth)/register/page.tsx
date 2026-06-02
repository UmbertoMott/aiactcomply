"use client";

import { signup } from "@/app/(auth)/actions/auth";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PASSWORD_RULES } from "@/lib/auth/password-validator";

function RegisterForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passedRules, setPassedRules] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromScanner = searchParams.get("from") === "scanner";
  const scanUrl     = searchParams.get("url")      || "";
  const scanScore   = searchParams.get("score")    || "";
  const scanCritical = searchParams.get("critical") || "";

  function checkPassword(value: string) {
    setPassword(value);
    setPasswordTouched(true);
    setPassedRules(PASSWORD_RULES.filter((r) => r.test(value)).map((r) => r.id));
  }

  const passwordValid = passedRules.length === PASSWORD_RULES.length;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordValid) return;
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const verifyParams = new URLSearchParams({ reason: "signup", uid: result?.userId ?? "", email: result?.email ?? "" });
    if (fromScanner) {
      verifyParams.set("from", "scanner");
      if (scanUrl)      verifyParams.set("url",      scanUrl);
      if (scanScore)    verifyParams.set("score",    scanScore);
      if (scanCritical) verifyParams.set("critical", scanCritical);
    }
    router.push(`/verify?${verifyParams.toString()}`);
  }

  return (
    <div>
      {fromScanner && (
        <div
          className="mb-6 rounded-xl px-4 py-3.5 flex items-start gap-3"
          style={{
            background: "rgba(99,102,241,0.07)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <span className="text-lg leading-none mt-0.5">🔍</span>
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#4338ca" }}>
              Scansione completata
              {scanScore ? ` — punteggio ${scanScore}/100` : ""}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#6366f1" }}>
              Crea il tuo account per accedere al piano di conformità Art. 50 personalizzato.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Crea un account</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Hai già un account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Accedi
          </a>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Nome azienda
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="La tua azienda S.r.l."
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="nome@azienda.it"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Telefono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="+39 3XX XXXXXXX"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Riceverai un codice di verifica via SMS
          </p>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => checkPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="Min. 8 caratteri, maiuscola, numero, simbolo"
          />
          {/* Password strength bar */}
          {passwordTouched && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {PASSWORD_RULES.map((r, i) => (
                  <div
                    key={r.id}
                    className="h-1 flex-1 rounded-full transition-colors duration-200"
                    style={{
                      background: passedRules.includes(r.id)
                        ? i < 2 ? "#f59e0b" : i < 4 ? "#6366f1" : "#10b981"
                        : "rgba(99,102,241,0.15)",
                    }}
                  />
                ))}
              </div>
              <ul className="space-y-0.5">
                {PASSWORD_RULES.map((r) => {
                  const ok = passedRules.includes(r.id);
                  return (
                    <li key={r.id} className="flex items-center gap-1.5 text-xs" style={{ color: ok ? "#10b981" : "#94a3b8" }}>
                      <span>{ok ? "✓" : "○"}</span>
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (passwordTouched && !passwordValid)}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creazione account..." : "Crea account"}
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Caricamento...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
