"use client";

// src/app/dashboard/settings/org-profile/page.tsx
// Dedicated Org Profile settings page — richer version of the quick toggles in account/page.tsx

import { useState, useEffect, CSSProperties } from "react";
import { Building2, Globe, Zap, Save, CheckCircle2 } from "lucide-react";
import { loadOrgProfile, saveOrgProfile, EU_COUNTRIES } from "@/lib/dossier/org-profile";
import type { OrgProfile } from "@/lib/dossier/storage-schema";

// ── Design tokens ──────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#FAFAF9",
  green:   "#15803d",   greenBg: "rgba(21,128,61,0.06)",   greenBdr:"rgba(21,128,61,0.18)",
  amber:   "#b45309",   amberBg: "rgba(245,158,11,0.06)",  amberBdr:"rgba(245,158,11,0.2)",
  blue:    "#1d4ed8",   blueBg:  "rgba(29,78,216,0.05)",   blueBdr: "rgba(29,78,216,0.16)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: 20,
};

// ── ToggleRow ──────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  sublabel,
  checked,
  onChange,
  badge,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ flex: 1 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
              color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBdr}`,
            }}>{badge}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{sublabel}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: checked ? T.text : "rgba(0,0,0,0.12)",
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

// ── Country selector ──────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  IT: "Italia", DE: "Germania", FR: "Francia", ES: "Spagna", NL: "Paesi Bassi",
  BE: "Belgio", AT: "Austria", PL: "Polonia", SE: "Svezia", PT: "Portogallo",
  DK: "Danimarca", FI: "Finlandia", IE: "Irlanda", CZ: "Repubblica Ceca",
  RO: "Romania", HU: "Ungheria", GR: "Grecia", SK: "Slovacchia", HR: "Croazia",
  BG: "Bulgaria", LT: "Lituania", LV: "Lettonia", SI: "Slovenia", EE: "Estonia",
  CY: "Cipro", LU: "Lussemburgo", MT: "Malta",
  // Non-EU
  US: "Stati Uniti", GB: "Regno Unito", CH: "Svizzera", CA: "Canada",
  JP: "Giappone", AU: "Australia", SG: "Singapore", IN: "India",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function OrgProfilePage() {
  const [profile, setProfile] = useState<OrgProfile>({
    paItaly: false,
    gpaiDetected: false,
    nistEnabled: false,
    orgName: "",
  });
  const [countryCode, setCountryCode] = useState("IT");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadOrgProfile();
    setProfile(p);
    // Try to load country from separate key
    const stored = typeof window !== "undefined" ? localStorage.getItem("aicomply_org_country") : null;
    if (stored) setCountryCode(stored);
  }, []);

  function updateField<K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveOrgProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("aicomply_org_country", countryCode);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const isNonEU = !EU_COUNTRIES.includes(countryCode);

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-7">
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.4px", color: T.text, margin: 0 }}>
          Profilo Organizzazione
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          Configura le caratteristiche della tua organizzazione per personalizzare il percorso di conformità.
        </p>
      </div>

      {/* Section: Anagrafica */}
      <div style={{ ...cardSt, marginBottom: 16 }}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 style={{ width: 15, height: 15, color: T.muted }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Anagrafica</span>
        </div>

        {/* Org name */}
        <div className="mb-4">
          <label style={{ fontSize: 12, fontWeight: 500, color: T.muted, display: "block", marginBottom: 6 }}>
            Nome organizzazione
          </label>
          <input
            type="text"
            value={profile.orgName ?? ""}
            onChange={(e) => updateField("orgName", e.target.value)}
            placeholder="es. ACME SpA"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
              border: `1px solid ${T.border}`, color: T.text, background: T.bg,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Country */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: T.muted, display: "block", marginBottom: 6 }}>
            Paese sede legale
          </label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
              border: `1px solid ${T.border}`, color: T.text, background: T.bg,
              outline: "none",
            }}
          >
            {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name} ({code})</option>
            ))}
          </select>
          {isNonEU && (
            <p style={{ marginTop: 6, fontSize: 12, color: T.amber }}>
              ⚠️ Paese non UE — potresti avere l&apos;obbligo di designare un Rappresentante Autorizzato (Art. 22).
            </p>
          )}
        </div>
      </div>

      {/* Section: Flag normativi */}
      <div style={{ ...cardSt, marginBottom: 16 }}>
        <div className="flex items-center gap-2 mb-2">
          <Globe style={{ width: 15, height: 15, color: T.muted }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Flag normativi</span>
        </div>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Attiva le opzioni rilevanti per la tua organizzazione. Influenzano il piano di conformità.
        </p>

        <ToggleRow
          label="Pubblica Amministrazione italiana"
          sublabel="Attiva controlli L.132/2024, requisiti AGID/ACN e FRIA obbligatoria per deployer PA."
          checked={profile.paItaly}
          onChange={(v) => updateField("paItaly", v)}
        />
        <ToggleRow
          label="NIST AI RMF Mapping"
          sublabel="Abilita il mapping dei controlli EU AI Act al NIST AI Risk Management Framework."
          checked={profile.nistEnabled}
          onChange={(v) => updateField("nistEnabled", v)}
          badge="Enterprise"
        />
        {profile.gpaiDetected && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 8,
            background: T.blueBg, border: `1px solid ${T.blueBdr}`,
          }}>
            <div className="flex items-center gap-2">
              <Zap style={{ width: 13, height: 13, color: T.blue }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: T.blue }}>
                GPAI rilevato — obblighi Art. 53–55 attivi
              </span>
            </div>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              Il flag GPAI è stato impostato automaticamente dal Triage. Va al GPAI Assessment per completare la valutazione.
            </p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: T.text, color: "#fff", border: "none", cursor: "pointer",
          }}
        >
          {saved ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
          {saved ? "Salvato!" : "Salva impostazioni"}
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: T.green }}>
            ✓ Le impostazioni sono state salvate
          </span>
        )}
      </div>
    </div>
  );
}
