"use client";

import { useEffect } from "react";

// Error boundary del dashboard: mostra il messaggio d'errore reale (non il generico
// "This page couldn't load"), così è diagnosticabile con uno screenshot.
export default function DashboardError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log completo in console per il debug
    console.error("[DASHBOARD ERROR]", error);
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 640, width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 14, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0D1016", margin: 0 }}>Errore nella pagina</h2>
        </div>
        <p style={{ fontSize: 13, color: "rgba(0,0,0,0.55)", marginBottom: 14 }}>
          Si è verificato un errore durante il caricamento di questo strumento. Dettaglio tecnico:
        </p>
        <pre style={{
          background: "#0D1016", color: "#f87171", fontSize: 12, lineHeight: 1.5,
          padding: 14, borderRadius: 10, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
        }}>
          {error?.name}: {error?.message}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
          {error?.stack ? `\n\n${error.stack.split("\n").slice(0, 6).join("\n")}` : ""}
        </pre>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={() => reset()} style={{ fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 8, background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}>
            Riprova
          </button>
          <a href="/dashboard" style={{ fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 8, background: "#fff", color: "#0D1016", border: "1px solid rgba(0,0,0,0.15)", textDecoration: "none" }}>
            Torna alla dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
