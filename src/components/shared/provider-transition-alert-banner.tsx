"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import {
  TRANSITION_CHECKS,
  computeTransitionVerdict,
  loadAnswers,
  loadMods,
  getEarliestSubstantialDate,
  type Verdict,
} from "@/lib/provider-transition/provider-transition-types";

const DISMISSED_KEY = "aicomply_provider_transition_banner_dismissed";

export default function ProviderTransitionAlertBanner() {
  const [verdict, setVerdict]     = useState<Verdict>("incomplete");
  const [earliest, setEarliest]   = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(true); // start hidden; load after mount

  useEffect(() => {
    if (typeof window === "undefined") return;
    const answers = loadAnswers();
    const mods    = loadMods();
    const v = computeTransitionVerdict(TRANSITION_CHECKS, answers);
    setVerdict(v);
    setEarliest(getEarliestSubstantialDate(mods));
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    setDismissed(wasDismissed);
  }, []);

  if (dismissed) return null;
  if (verdict !== "provider" && verdict !== "risk") return null;

  const isProvider = verdict === "provider";

  return (
    <div style={{
      background: isProvider ? "rgba(239,68,68,0.10)" : "rgba(251,146,60,0.10)",
      border: `1px solid ${isProvider ? "rgba(239,68,68,0.4)" : "rgba(251,146,60,0.4)"}`,
      borderRadius: 8,
      padding: "12px 16px",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 16,
    }}>
      <AlertTriangle size={16} style={{ color: isProvider ? "#f87171" : "#fb923c", marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          {isProvider
            ? "Provider Transition Alert — obblighi da provider rilevati (Art. 28)"
            : "Provider Transition — verifica necessaria (Art. 28)"}
        </p>
        <p style={{ color: "#94A3B8", fontSize: 12, lineHeight: 1.5 }}>
          {isProvider
            ? `Le modifiche apportate al sistema AI potrebbero configurare obblighi da provider ai sensi dell'Art. 28 Reg. (UE) 2024/1689.${earliest ? ` Prima modifica sostanziale: ${earliest}.` : ""} [verify against current AI Act text]`
            : "Una o più risposte 'Incerto' richiedono valutazione legale prima di escludere obblighi da provider (Art. 28). [verify against current AI Act text]"
          }
        </p>
      </div>
      <Link
        href="/dashboard/compliance-ops/provider-transition"
        style={{ color: "#818cf8", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginTop: 2 }}
      >
        Valuta →
      </Link>
      <button
        onClick={() => { sessionStorage.setItem(DISMISSED_KEY, "1"); setDismissed(true); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2, marginTop: 1 }}
        aria-label="Chiudi"
      >
        <X size={14} />
      </button>
    </div>
  );
}
