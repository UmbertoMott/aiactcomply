"use client";

// Component 2 — Art. 50 Persistent Banner
// Dismissible. Shown on all authenticated screens.
// Spec: background #E6F1FB, color #0C447C, height 32px.

import { useState } from "react";
import { X } from "lucide-react";

const copy = {
  it: "I contenuti di AIComply sono generati con il supporto dell'intelligenza artificiale — Art. 50 Reg. UE 2024/1689. Richiedono sempre revisione legale prima dell'uso ufficiale.",
  en: "AIComply content is AI-assisted — Art. 50 Reg. (EU) 2024/1689. Always requires legal review before official use.",
};

interface DisclosureBannerProps {
  lang?: "it" | "en";
}

export default function DisclosureBanner({ lang = "it" }: DisclosureBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-2 px-4 flex-shrink-0 select-none"
      style={{
        background: "#E6F1FB",
        borderBottom: "1px solid #B8D4F0",
        height: 32,
        minHeight: 32,
      }}
    >
      <div className="flex-1" />
      <p
        className="text-center truncate"
        style={{ fontSize: "11px", fontWeight: 500, color: "#0C447C", lineHeight: 1 }}
      >
        {copy[lang]}
      </p>
      <div className="flex-1 flex justify-end">
        <button
          onClick={() => setDismissed(true)}
          aria-label="Chiudi avviso"
          className="flex items-center justify-center rounded hover:bg-blue-100 transition-colors"
          style={{ width: 20, height: 20, color: "#0C447C" }}
        >
          <X size={12} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
