"use client";

import { Bot } from "lucide-react";

interface AIOutputLabelProps {
  documentType: string;
  outputType?: string;   // kept for API compat — unused
  lang?: "it" | "en";
  existingId?: string;   // kept for API compat — unused
  generatedAt?: string;  // kept for API compat — unused
  separator?: boolean;
}

export default function AIOutputLabel({
  documentType,
  separator = true,
}: AIOutputLabelProps) {
  return (
    <div
      className="rounded-t-xl px-4 py-2.5"
      style={{
        background: "#F0F7FF",
        border: "1px solid #B8D4F0",
        borderBottom: separator ? "1px solid #B8D4F0" : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "#0C447C", color: "#ffffff" }}
        >
          <Bot size={9} strokeWidth={2} />
          Generato da AI
        </span>
        <span className="text-[11px] font-medium" style={{ color: "#0C447C" }}>
          {documentType}
        </span>
      </div>
    </div>
  );
}
