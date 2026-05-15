"use client";

import { signup } from "@/app/(auth)/actions/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const router = useRouter();

  function checkPassword(value: string) {
    setPassword(value);
    const errors: string[] = [];
    if (value.length < 8) errors.push("Minimo 8 caratteri");
    if (!/[A-Z]/.test(value)) errors.push("Almeno una maiuscola");
    if (!/[^A-Za-z0-9]/.test(value)) errors.push("Almeno un carattere speciale");
    setPasswordErrors(errors);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordErrors.length > 0) return;
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/verify?reason=signup&uid=${result?.userId}`);
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Crea un account</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Hai già un account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Accedi
          </a>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Min. 8 caratteri, 1 maiuscola, 1 speciale"
          />
          {passwordErrors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordErrors.map((err) => (
                <li
                  key={err}
                  className="text-xs text-danger flex items-center gap-1"
                >
                  <span>•</span>
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || passwordErrors.length > 0}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creazione account..." : "Crea account"}
        </button>
      </form>
    </div>
  );
}
