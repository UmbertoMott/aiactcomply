"use client";

// Empty-state condiviso per le sezioni calcolate dei tool a fasi.
// Una sezione che dipende da un input (upload dataset/log) non deve mai
// apparire come intestazione nuda: mostra cosa serve per popolarla.

import { Upload } from "lucide-react";

export function SectionEmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div style={{
      borderRadius: 8, border: "1.5px dashed rgba(0,0,0,0.14)",
      background: "rgba(0,0,0,0.015)", padding: "28px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", margin: "0 auto 10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.05)",
      }}>
        <Upload size={15} style={{ color: "#0D1016" }} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#0D1016", margin: 0 }}>{message}</p>
      <p style={{ fontSize: 11, color: "#0D1016", margin: "4px 0 0" }}>
        {hint ?? "Le metriche vengono calcolate localmente nel browser — nessun dato grezzo viene salvato."}
      </p>
    </div>
  );
}
