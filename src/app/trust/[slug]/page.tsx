// src/app/trust/[token]/page.tsx
// Pagina pubblica Trust Center — accessibile senza login
// Mostra il profilo di conformità di un'organizzazione tramite trust_token UUID
// Destinata a: regolatori, clienti, partner che verificano la compliance

import { getTrustSummaryByToken } from "@/lib/db/organizations";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: token } = await params;
  const summary = await getTrustSummaryByToken(token);
  if (!summary) return { title: "Profilo non trovato — AIComply" };
  return {
    title: `${summary.organizationName} — AI Compliance Trust Center`,
    description: `Profilo di conformità EU AI Act di ${summary.organizationName}. Verificato da AIComply.`,
  };
}

export default async function PublicTrustPage({ params }: Props) {
  const { slug: token } = await params;
  const summary = await getTrustSummaryByToken(token);

  if (!summary) notFound();

  const lastUpdated = new Date(summary.lastUpdated).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#FAFAF9" }}
    >
      {/* Card principale */}
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center gap-4"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: "#0D1016", color: "#ffffff" }}
          >
            AI
          </div>
          <div>
            <h1 className="text-[16px] font-semibold" style={{ color: "#0D1016" }}>
              {summary.organizationName}
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
              AI Compliance Trust Center · EU AI Act
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {/* Prove registrate */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: "rgba(21,128,61,0.05)",
              border: "1px solid rgba(21,128,61,0.14)",
            }}
          >
            <div>
              <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
                Prove di conformità registrate
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                Evidence Layer — catena hash verificata
              </p>
            </div>
            <span className="text-[24px] font-bold" style={{ color: "#15803d" }}>
              {summary.evidenceCount}
            </span>
          </div>

          {/* Token di verifica */}
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(0,0,0,0.02)",
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "rgba(0,0,0,0.35)" }}>
              Token di verifica
            </p>
            <p
              className="text-[11px] font-mono break-all"
              style={{ color: "#0D1016", letterSpacing: "0.02em" }}
            >
              {summary.trustToken}
            </p>
          </div>

          {/* Data ultimo aggiornamento */}
          <p className="text-[11px] text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
            Ultimo aggiornamento: {lastUpdated}
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4"
          style={{
            borderTop: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(0,0,0,0.015)",
          }}
        >
          <p className="text-[10px] text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
            Profilo generato automaticamente da{" "}
            <a
              href="https://aicomply.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              AIComply
            </a>{" "}
            — Reg. UE 2024/1689 (EU AI Act) Art. 50
          </p>
        </div>
      </div>

      {/* URL pubblico */}
      <p className="mt-4 text-[11px]" style={{ color: "rgba(0,0,0,0.3)" }}>
        URL pubblico:{" "}
        <span className="font-mono">{summary.publicUrl}</span>
      </p>
    </div>
  );
}
