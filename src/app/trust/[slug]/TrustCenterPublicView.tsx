"use client";

import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";
import {
  ALL_SECTION_IDS,
  SECTION_META,
  findPageBySlug,
  latestPublicSectionDate,
  type TrustCenterPage,
  type TrustCenterAccessConfig,
} from "@/lib/trust-center/trust-center-types";

const BG     = "#0D1016";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT   = "#F1F5F9";
const MUTED  = "#94A3B8";
const EMERAL = "#34d399";
const INDIGO = "#818cf8";

type State = "loading" | "not_found" | "restricted" | "found";

function checkClientAccess(
  config: TrustCenterAccessConfig,
  claimedEmail: string | null
): boolean {
  if (config.visibility === "public") return true;
  if (!claimedEmail) return false;
  const email = claimedEmail.toLowerCase().trim();
  if (config.visibility === "invite_only") {
    return config.allowedEmails.some(e => e.toLowerCase() === email);
  }
  // restricted — domain check
  return config.allowedDomains.some(d => email.endsWith(d.replace(/^@/, "@")));
}

interface Props {
  slug: string;
  /** Access config passed from server (null while datastore is placeholder) */
  serverAccessConfig: TrustCenterAccessConfig | null;
}

export default function TrustCenterPublicView({ slug, serverAccessConfig }: Props) {
  const [state, setState]         = useState<State>("loading");
  const [page, setPage]           = useState<TrustCenterPage | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    const found = findPageBySlug(slug);

    if (!found || !found.isPublished) {
      setState("not_found");
      return;
    }

    const publicSections = ALL_SECTION_IDS.filter(id => found.sections[id].is_public);
    if (publicSections.length === 0) {
      setState("not_found");
      return;
    }

    // Access check — use serverAccessConfig if available, else page's own config
    const config = serverAccessConfig ?? found.accessConfig;
    if (config && config.visibility !== "public") {
      // Check sessionStorage for a previously granted email
      const cached = sessionStorage.getItem(`tc_access_${slug}`);
      if (!checkClientAccess(config, cached)) {
        setPage(found);
        setState("restricted");
        return;
      }
    }

    setPage(found);
    setState("found");
  }, [slug, serverAccessConfig]);

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    const config = serverAccessConfig ?? page.accessConfig;
    if (checkClientAccess(config, emailInput)) {
      sessionStorage.setItem(`tc_access_${slug}`, emailInput);
      setState("found");
      setEmailError("");
    } else {
      setEmailError("Accesso non autorizzato per questo indirizzo email.");
    }
  };

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: MUTED, fontSize: 14 }}>Caricamento…</div>
      </div>
    );
  }

  if (state === "not_found" || !page) {
    notFound();
  }

  if (state === "restricted") {
    const config = serverAccessConfig ?? page!.accessConfig;
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <Lock size={32} style={{ color: MUTED, marginBottom: 16 }} />
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Accesso riservato</h1>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {config.visibility === "invite_only"
              ? "Questa pagina è riservata agli utenti invitati. Inserisci il tuo indirizzo email per accedere."
              : "Questa pagina è riservata agli utenti autorizzati. Inserisci il tuo indirizzo email aziendale."}
          </p>
          <form onSubmit={handleAccessSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="tua@email.com"
              required
              style={{
                background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: "10px 14px", color: TEXT, fontSize: 14,
                outline: "none", width: "100%", boxSizing: "border-box",
              }}
            />
            {emailError && (
              <p style={{ color: "#f87171", fontSize: 13 }}>{emailError}</p>
            )}
            <button
              type="submit"
              style={{ background: EMERAL, color: "#0D1016", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Accedi
            </button>
          </form>
        </div>
      </div>
    );
  }

  const publicSections = ALL_SECTION_IDS.filter(id => page!.sections[id].is_public);
  const lastUpdated    = new Date(latestPublicSectionDate(page!)).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "40px 20px" }}>
      {page!.noindex && (
        <meta name="robots" content="noindex, nofollow" />
      )}
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={20} style={{ color: EMERAL }} />
            <span style={{ color: EMERAL, fontWeight: 700, fontSize: 15 }}>AIComply Trust Center</span>
          </div>

          <h1 style={{ color: TEXT, fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            Pagina di trasparenza AI
          </h1>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>
            Questo documento fornisce informazioni pubbliche sul sistema AI di questa organizzazione
            ai sensi del Reg. (UE) 2024/1689 (AI Act) [verify against current AI Act text].
          </p>
          {page!.noindex && (
            <p style={{ color: "#4b5563", fontSize: 12, marginTop: 10 }}>
              Questa pagina non è indicizzata dai motori di ricerca.
            </p>
          )}
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {publicSections.map((id, idx) => {
            const meta    = SECTION_META[id];
            const section = page!.sections[id];
            return (
              <div
                key={id}
                style={{
                  padding: "28px 0",
                  borderBottom: idx < publicSections.length - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                  <h2 style={{ color: TEXT, fontSize: 17, fontWeight: 600, margin: 0 }}>
                    {meta.label}
                  </h2>
                  <span style={{
                    color: MUTED, fontSize: 10, fontFamily: "monospace",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                    borderRadius: 4, padding: "2px 7px", flexShrink: 0,
                  }}>
                    {meta.article}
                  </span>
                </div>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                  {section.summary.text || <em style={{ color: "#4b5563" }}>Informazioni non ancora disponibili.</em>}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ color: "#4b5563", fontSize: 12, lineHeight: 1.6 }}>
            Pagina generata da{" "}
            <span style={{ color: INDIGO }}>AIComply</span>
            {" "}· Ultimo aggiornamento: {lastUpdated}
            {page!.noindex && " · Questa pagina non è indicizzata dai motori di ricerca."}
          </p>
          <p style={{ color: "#374151", fontSize: 11, marginTop: 6 }}>
            Le informazioni presenti in questa pagina sono fornite dall&apos;organizzazione responsabile del sistema AI.
            I riferimenti normativi sono da verificare contro il testo consolidato del Reg. (UE) 2024/1689.
            [verify against current AI Act text]
          </p>
        </div>
      </div>
    </div>
  );
}
