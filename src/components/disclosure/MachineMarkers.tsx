"use client";

// Component 5 — Machine-Readable Disclosure Markers
// Injects: HTML meta tags (via next/head pattern) + JSON-LD script in body.
// Art. 50 EU AI Act compliance — machine-readable AI content markers.
// Note: HTTP response headers are handled separately in middleware.ts.

import { useEffect } from "react";
import { getAIModelName, getSystemVersion, getPlatformName } from "@/lib/disclosure/ai-config";

interface MachineMarkersProps {
  outputId?: string;
  generatedAt?: string; // ISO string
}

export default function MachineMarkers({ outputId = "", generatedAt }: MachineMarkersProps) {
  const model = getAIModelName();
  const version = getSystemVersion();
  const platform = getPlatformName();
  const ts = generatedAt ?? new Date().toISOString();

  useEffect(() => {
    if (typeof document === "undefined") return;

    // ── Inject / update meta tags ──────────────────────────────────────────
    const metaTags: Record<string, string> = {
      "ai-generated":          "true",
      "ai-model":              model,
      "ai-platform":           platform,
      "ai-platform-version":   version,
      "ai-regulation":         "EU-AI-Act-2024/1689-Art50",
      "ai-output-id":          outputId,
      "ai-generated-at":       ts,
      "ai-requires-human-review": "true",
    };

    Object.entries(metaTags).forEach(([name, content]) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    });

    // ── Inject / update JSON-LD ────────────────────────────────────────────
    const LD_ID = "aicomply-disclosure-jsonld";
    let script = document.getElementById(LD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = LD_ID;
      script.type = "application/ld+json";
      document.body.appendChild(script);
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": "AIComply Compliance Document",
      "description": "AI-assisted compliance documentation under EU AI Act",
      "identifier": outputId,
      "dateCreated": ts,
      "creator": {
        "@type": "SoftwareApplication",
        "name": platform,
        "version": version,
        "applicationCategory": "LegalTech / ComplianceTech",
      },
      "isPartOf": {
        "@type": "LegalDocument",
        "legislationIdentifier": "32024R1689",
        "legislationJurisdiction": "EU",
        "name": "Regulation (EU) 2024/1689 — AI Act",
      },
      "additionalProperty": [
        { "@type": "PropertyValue", "name": "ai-generated", "value": "true" },
        { "@type": "PropertyValue", "name": "ai-model", "value": model },
        { "@type": "PropertyValue", "name": "requires-human-review", "value": "true" },
        { "@type": "PropertyValue", "name": "eu-ai-act-article", "value": "50" },
      ],
    };

    script.textContent = JSON.stringify(jsonLd, null, 2);

    // Cleanup: remove injected script on unmount (page navigation)
    return () => {
      const s = document.getElementById(LD_ID);
      if (s) s.remove();
    };
  }, [model, version, platform, outputId, ts]);

  return null; // renders nothing — side effects only
}
