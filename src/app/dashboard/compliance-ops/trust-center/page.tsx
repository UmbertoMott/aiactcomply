"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck, Copy, Check, ExternalLink, Sparkles, Globe, GlobeLock,
  AlertTriangle, CheckCircle2, Info, Loader2, Share2, Mail, Lock, Download, X as XIcon,
} from "lucide-react";
import {
  ALL_SECTION_IDS,
  SECTION_META,
  createEmptyPage,
  loadTrustCenterPage,
  saveTrustCenterPage,
  readSourceData,
  latestPublicSectionDate,
  type TrustCenterPage,
  type TrustCenterSectionId,
  type TrustCenterSourceData,
  type TrustCenterVisibility,
} from "@/lib/trust-center/trust-center-types";
import { generateConformityPacket } from "@/lib/trust-center/generate-conformity-packet";
import { generateTrustCenterSummary } from "@/app/actions/generateTrustCenterSummary";

const BG     = "#FAFAF9";
const CARD   = "#ffffff";
const BORDER = "rgba(0,0,0,0.07)";
const TEXT   = "#0D1016";
const MUTED  = "rgba(0,0,0,0.40)";
const INDIGO = "#4f46e5";
const EMERAL = "#15803d";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useSystemId(): string {
  const [id, setId] = useState("default");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("aicomply_classifier_result");
      if (raw) {
        const c = JSON.parse(raw) as Record<string, unknown>;
        const sid = (c.systemId ?? c.id) as string | undefined;
        if (sid) setId(sid);
      }
    } catch { /* silent */ }
  }, []);
  return id;
}

function IosSwitch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      aria-checked={on}
      role="switch"
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 12, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: on ? "#0D1016" : "#d1d5db",
        position: "relative", transition: "background 0.2s",
        opacity: disabled ? 0.45 : 1,
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 21 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

// ─── EmailTagInput ────────────────────────────────────────────────────────────

function EmailTagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const val = raw.trim();
    if (val && !values.includes(val)) onChange([...values, val]);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px",
      background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8,
      minHeight: 40, alignItems: "center",
    }}>
      {values.map(v => (
        <span key={v} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(0,0,0,0.07)", borderRadius: 5, padding: "2px 8px",
          fontSize: 12, color: TEXT,
        }}>
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter(x => x !== v))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: MUTED }}
          >
            <XIcon size={11} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input) add(input); }}
        placeholder={values.length === 0 ? placeholder : ""}
        style={{
          border: "none", outline: "none", background: "transparent",
          fontSize: 12, color: TEXT, minWidth: 160, flex: 1,
        }}
      />
    </div>
  );
}

// ─── Public Preview ───────────────────────────────────────────────────────────

function PublicPreview({
  page, sourceData, systemName,
}: {
  page: TrustCenterPage;
  sourceData: TrustCenterSourceData;
  systemName: string;
}) {
  const publicSections = ALL_SECTION_IDS.filter(id => page.sections[id].is_public);

  return (
    <div style={{ background: "#f3f4f6", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Browser chrome */}
      <div style={{ background: "#e5e7eb", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#ef4444","#f59e0b","#22c55e"].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ color: MUTED, fontSize: 11, fontFamily: "monospace" }}>
          aicomply.io/trust/{page.publicSlug.slice(0, 12)}…
        </span>
      </div>

      {/* Page content */}
      <div style={{ padding: 24, minHeight: 200, background: "#ffffff" }}>
        {publicSections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Globe size={28} style={{ color: MUTED, margin: "0 auto 12px" }} />
            <p style={{ color: MUTED, fontSize: 13 }}>Nessuna sezione pubblica attivata</p>
            <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Attiva almeno una sezione nell&apos;editor</p>
          </div>
        ) : (
          <>
            {/* Public page header */}
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={18} style={{ color: EMERAL }} />
                <span style={{ color: EMERAL, fontWeight: 700, fontSize: 14 }}>AIComply Trust Center</span>
              </div>
              <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
                {systemName || "Sistema AI"}
              </h1>
              {page.noindex && (
                <p style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>Questa pagina non è indicizzata dai motori di ricerca.</p>
              )}
            </div>

            {/* Sections */}
            {publicSections.map(id => {
              const meta    = SECTION_META[id];
              const section = page.sections[id];
              return (
                <div key={id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h2 style={{ color: TEXT, fontSize: 15, fontWeight: 600, margin: 0 }}>{meta.label}</h2>
                    <span style={{ color: MUTED, fontSize: 10, fontFamily: "monospace", background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 6px", flexShrink: 0, marginLeft: 8 }}>
                      {meta.article}
                    </span>
                  </div>
                  {section.summary.text ? (
                    <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                      {section.summary.text}
                    </p>
                  ) : (
                    <p style={{ color: "rgba(0,0,0,0.40)", fontSize: 13, fontStyle: "italic" }}>Testo non ancora compilato.</p>
                  )}
                </div>
              );
            })}

            {/* Footer */}
            <div style={{ paddingTop: 8 }}>
              <p style={{ color: "rgba(0,0,0,0.40)", fontSize: 11 }}>
                Pagina generata da AIComply · Ultimo aggiornamento: {new Date(latestPublicSectionDate(page)).toLocaleDateString("it-IT")}
                {page.noindex && " · Questa pagina non è indicizzata dai motori di ricerca."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  id, page, sourceData,
  onTogglePublic, onTextChange, onConfirm, onGenerate,
  isGenerating,
}: {
  id: TrustCenterSectionId;
  page: TrustCenterPage;
  sourceData: TrustCenterSourceData;
  onTogglePublic: (id: TrustCenterSectionId, v: boolean) => void;
  onTextChange: (id: TrustCenterSectionId, text: string) => void;
  onConfirm: (id: TrustCenterSectionId) => void;
  onGenerate: (id: TrustCenterSectionId) => void;
  isGenerating: boolean;
}) {
  const meta       = SECTION_META[id];
  const section    = page.sections[id];
  const src        = sourceData[id] as { complete: boolean };
  const hasSource  = src.complete;
  const aiConfirmed = section.summary.aiConfirmed;
  const hasText     = Boolean(section.summary.text);

  return (
    <div style={{
      background: CARD,
      border: `1px ${hasSource ? "solid" : "dashed"} ${BORDER}`,
      borderRadius: 10, padding: 16,
      opacity: hasSource ? 1 : 0.65,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ color: TEXT, fontWeight: 600, fontSize: 14, margin: "0 0 2px" }}>{meta.label}</p>
          <span style={{ color: MUTED, fontSize: 10, fontFamily: "monospace", background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "1px 6px" }}>
            {meta.article}
          </span>
        </div>
        <IosSwitch
          on={section.is_public}
          onChange={v => onTogglePublic(id, v)}
          disabled={!hasSource}
        />
      </div>

      {/* Source preview */}
      <div style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", marginBottom: 10 }}>
        <p style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>
          Fonte: <em>{meta.sourceModule}</em>
        </p>
        {hasSource ? (
          <SourceSummary id={id} sourceData={sourceData} />
        ) : (
          <p style={{ color: "#92400e", fontSize: 12 }}>
            Nessun dato disponibile — completa{" "}
            <Link href={sourceModuleHref(id)} style={{ color: INDIGO, textDecoration: "underline" }}>
              {meta.sourceModule}
            </Link>{" "}
            per poter pubblicare questa sezione.
          </p>
        )}
      </div>

      {/* Text editor */}
      <div style={{ position: "relative" }}>
        {!aiConfirmed && hasText && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ background: "rgba(129,140,248,0.15)", color: INDIGO, fontSize: 11, borderRadius: 4, padding: "1px 7px", fontWeight: 600 }}>
              ✦ AI — verifica e conferma
            </span>
          </div>
        )}
        {aiConfirmed && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <CheckCircle2 size={13} style={{ color: EMERAL }} />
            <span style={{ color: EMERAL, fontSize: 11, fontWeight: 600 }}>Confermato</span>
          </div>
        )}
        <textarea
          value={section.summary.text}
          onChange={e => onTextChange(id, e.target.value)}
          placeholder="Testo della sezione pubblica… (clicca 'Genera con AI' per una proposta)"
          rows={3}
          style={{
            width: "100%", background: "#f3f4f6", border: `1px solid ${aiConfirmed ? "rgba(52,211,153,0.3)" : INDIGO + "40"}`,
            borderRadius: 6, padding: 8, color: TEXT, fontSize: 13, resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => onGenerate(id)}
            disabled={!hasSource || isGenerating}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(129,140,248,0.12)", color: INDIGO,
              border: `1px solid rgba(129,140,248,0.3)`, borderRadius: 6,
              padding: "5px 12px", fontSize: 12, cursor: hasSource && !isGenerating ? "pointer" : "not-allowed",
              opacity: hasSource && !isGenerating ? 1 : 0.5,
            }}
          >
            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {isGenerating ? "Generazione…" : "Genera con AI"}
          </button>
          {hasText && !aiConfirmed && (
            <button
              onClick={() => onConfirm(id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(52,211,153,0.12)", color: EMERAL,
                border: `1px solid rgba(52,211,153,0.3)`, borderRadius: 6,
                padding: "5px 12px", fontSize: 12, cursor: "pointer",
              }}
            >
              <CheckCircle2 size={12} /> Conferma
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceSummary({ id, sourceData }: { id: TrustCenterSectionId; sourceData: TrustCenterSourceData }) {
  switch (id) {
    case "risk_tier":
      return <span style={{ color: TEXT, fontSize: 12 }}>{sourceData.risk_tier.riskTier ?? "—"} · {sourceData.risk_tier.systemName ?? "—"}</span>;
    case "intended_use":
      return <span style={{ color: TEXT, fontSize: 12 }}>{(sourceData.intended_use.finalityDescription ?? "").slice(0, 100)}{sourceData.intended_use.finalityDescription && sourceData.intended_use.finalityDescription.length > 100 ? "…" : ""}</span>;
    case "oversight":
      return <span style={{ color: TEXT, fontSize: 12 }}>{sourceData.oversight.implementedMeasures.length} misura/e implementata/e</span>;
    case "transparency":
      return <span style={{ color: TEXT, fontSize: 12 }}>{sourceData.transparency.activeDisclosures.length} disclosure attiva/e</span>;
    case "conformity":
      return <span style={{ color: TEXT, fontSize: 12 }}>Dichiarazione: {sourceData.conformity.declarationDrafted ? "redatta" : "non redatta"} · CE: {sourceData.conformity.ceMark ? "sì" : "no"}</span>;
    case "eudb":
      return <span style={{ color: TEXT, fontSize: 12 }}>Numero EUDB: {sourceData.eudb.registrationNumber ?? "—"}</span>;
    case "post_market":
      return <span style={{ color: TEXT, fontSize: 12 }}>{sourceData.post_market.methodology?.slice(0, 80) ?? "—"}</span>;
    case "contact":
      return <span style={{ color: TEXT, fontSize: 12 }}>{sourceData.contact.arName ?? sourceData.contact.providerName ?? "—"}</span>;
    default:
      return null;
  }
}

function sourceModuleHref(id: TrustCenterSectionId): string {
  const map: Record<TrustCenterSectionId, string> = {
    risk_tier:    "/dashboard/triage",
    intended_use: "/dashboard/tools/docugen",
    oversight:    "/dashboard/tools/oversight",
    transparency: "/dashboard/tools/art50-kit",
    conformity:   "/dashboard/tools/docugen",
    eudb:         "/dashboard/compliance-ops/eudb",
    post_market:  "/dashboard/post-market",
    contact:      "/dashboard/compliance-ops/authorized-rep",
  };
  return map[id] ?? "/dashboard";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrustCenterEditorPage() {
  const systemId   = useSystemId();
  const [page, setPage]             = useState<TrustCenterPage>(() => createEmptyPage("default"));
  const [sourceData, setSourceData] = useState<TrustCenterSourceData>(() => ({
    risk_tier:    { riskTier: null, role: null, systemName: null, complete: false },
    intended_use: { finalityDescription: null, applicativeScope: null, complete: false },
    oversight:    { implementedMeasures: [], complete: false },
    transparency: { activeDisclosures: [], complete: false },
    conformity:   { declarationDrafted: false, declarationDate: null, ceMark: false, complete: false },
    eudb:         { registrationNumber: null, complete: false },
    post_market:  { methodology: null, frequency: null, complete: false },
    contact:      { arName: null, arCountry: null, arContact: null, providerName: null, providerEmail: null, complete: false },
  }));
  const [generatingSectionId, setGeneratingSectionId] = useState<TrustCenterSectionId | null>(null);
  const [saved, setSaved]                   = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [publishWarning, setPublishWarning] = useState(false);
  const [shareOpen, setShareOpen]           = useState(false);

  useEffect(() => {
    const loaded = loadTrustCenterPage(systemId);
    setPage(loaded);
    setSourceData(readSourceData());
  }, [systemId]);

  const systemName = sourceData.risk_tier.systemName ?? "Sistema AI";
  const publicUrl  = `https://aicomply.io/trust/${page.publicSlug}`;
  const localUrl   = `/trust/${page.publicSlug}`;

  const patchPage  = useCallback((patch: Partial<TrustCenterPage>) => {
    setPage(prev => ({ ...prev, ...patch }));
  }, []);

  const togglePublic = useCallback((id: TrustCenterSectionId, v: boolean) => {
    setPage(prev => {
      const section = { ...prev.sections[id], is_public: v };
      return { ...prev, sections: { ...prev.sections, [id]: section } };
    });
  }, []);

  const changeText = useCallback((id: TrustCenterSectionId, text: string) => {
    setPage(prev => {
      const section = {
        ...prev.sections[id],
        summary: { ...prev.sections[id].summary, text, aiConfirmed: false, updatedAt: new Date().toISOString() },
      };
      return { ...prev, sections: { ...prev.sections, [id]: section } };
    });
  }, []);

  const confirmSection = useCallback((id: TrustCenterSectionId) => {
    setPage(prev => {
      const section = {
        ...prev.sections[id],
        summary: { ...prev.sections[id].summary, aiConfirmed: true, updatedAt: new Date().toISOString() },
      };
      return { ...prev, sections: { ...prev.sections, [id]: section } };
    });
  }, []);

  const generateSection = useCallback(async (id: TrustCenterSectionId) => {
    setGeneratingSectionId(id);
    try {
      const result = await generateTrustCenterSummary(id, sourceData);
      setPage(prev => {
        const section = {
          ...prev.sections[id],
          is_public: result.sourceComplete ? prev.sections[id].is_public : false,
          summary: {
            text: result.text,
            aiConfirmed: false,
            updatedAt: new Date().toISOString(),
          },
        };
        return { ...prev, sections: { ...prev.sections, [id]: section } };
      });
    } catch (e) {
      console.error("generatePublicSummary error:", e);
    } finally {
      setGeneratingSectionId(null);
    }
  }, [sourceData]);

  const handlePublishToggle = useCallback(() => {
    if (!page.isPublished) {
      setPublishWarning(true);
    } else {
      patchPage({ isPublished: false });
    }
  }, [page.isPublished, patchPage]);

  const confirmPublish = useCallback(() => {
    patchPage({ isPublished: true });
    setPublishWarning(false);
  }, [patchPage]);

  const handleSave = useCallback(() => {
    saveTrustCenterPage({ ...page, systemId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [page, systemId]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicUrl]);

  const handleExportPacket = useCallback(() => {
    const riskTier = sourceData.risk_tier.riskTier;
    const packet = generateConformityPacket(systemId, page, systemName, riskTier);
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aicomply_conformity_packet_${systemId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [systemId, page, systemName, sourceData.risk_tier.riskTier]);

  const shareText = `Scopri la pagina di trasparenza AI di ${systemName} — conforme al Regolamento UE sull'IA (AI Act).`;

  const SHARE_CHANNELS = [
    {
      key: "linkedin",
      label: "LinkedIn",
      color: "#0A66C2",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      url: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
    },
    {
      key: "x",
      label: "X / Twitter",
      color: "#000000",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
        </svg>
      ),
      url: (u: string) => `https://x.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      color: "#25D366",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
      ),
      url: (u: string) => `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + u)}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      color: "#26A5E4",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      url: (u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      key: "email",
      label: "Email",
      color: "#374151",
      icon: <Mail size={16} />,
      url: (u: string) => `mailto:?subject=${encodeURIComponent("Pagina di trasparenza AI — " + systemName)}&body=${encodeURIComponent(shareText + "\n\n" + u)}`,
    },
  ];

  const publicSectionCount = ALL_SECTION_IDS.filter(id => page.sections[id].is_public).length;

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ width: "100%" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <ShieldCheck size={20} style={{ color: EMERAL }} />
            <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>Trust Center</h1>
            {page.isPublished && (
              <span style={{ background: "rgba(52,211,153,0.12)", color: EMERAL, border: "1px solid rgba(52,211,153,0.3)", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                Pubblicato
              </span>
            )}
          </div>
          <p style={{ color: MUTED, fontSize: 14 }}>
            Pagina pubblica di trasparenza per il sistema AI — {publicSectionCount}/8 sezioni attive
          </p>
        </div>

        {/* ── Published bar ──────────────────────────────────────────── */}
        {page.isPublished && (
          <div style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle2 size={15} style={{ color: EMERAL }} />
            <span style={{ color: EMERAL, fontSize: 13, fontWeight: 600 }}>Pagina pubblica attiva</span>
            <Link href={localUrl} target="_blank" style={{ color: INDIGO, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              {publicUrl} <ExternalLink size={11} />
            </Link>
            <button
              onClick={handleCopy}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid rgba(52,211,153,0.3)`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: EMERAL, fontSize: 12 }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copiato" : "Copia link"}
            </button>
          </div>
        )}

        {/* ── Publish Warning ────────────────────────────────────────── */}
        {publishWarning && (
          <div style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={16} style={{ color: "#92400e", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: "#92400e", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Conferma pubblicazione</p>
                <p style={{ color: "#92400e", fontSize: 13, lineHeight: 1.5 }}>
                  Pubblicando questa pagina, le {publicSectionCount} sezioni attive saranno visibili a chiunque abbia il link.
                  Verifica che tutti i testi siano confermati (✦ AI risolto) prima di procedere.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={confirmPublish}
                style={{ background: "#0D1016", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Pubblica
              </button>
              <button
                onClick={() => setPublishWarning(false)}
                style={{ background: "rgba(0,0,0,0.04)", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontSize: 13 }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* ── Master controls ────────────────────────────────────────── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IosSwitch on={page.isPublished} onChange={handlePublishToggle} />
            <div>
              <p style={{ color: TEXT, fontWeight: 600, fontSize: 13, margin: 0 }}>Pagina pubblica</p>
              <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>Master switch — abilita la pagina {`/trust/${page.publicSlug.slice(0, 8)}…`}</p>
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: BORDER }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IosSwitch on={page.noindex} onChange={v => patchPage({ noindex: v })} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GlobeLock size={13} style={{ color: MUTED }} />
                <p style={{ color: TEXT, fontWeight: 600, fontSize: 13, margin: 0 }}>Noindex</p>
                <span style={{ color: MUTED, fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "1px 6px" }}>consigliato</span>
              </div>
              <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>La pagina non viene indicizzata dai motori di ricerca (§4.3)</p>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {!page.isPublished && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: MUTED, fontSize: 12 }}>
                <Info size={12} />
                Funzione &quot;pagina riservata/invitati&quot; non disponibile — il link è l&apos;unico controllo di accesso
              </div>
            )}
            <button
              onClick={handleSave}
              style={{ background: saved ? "rgba(22,163,74,0.1)" : "#0D1016", color: saved ? EMERAL : "#fff", border: "none", borderRadius: 8, padding: "8px 22px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
            >
              {saved ? <Check size={13} /> : null}
              {saved ? "Salvato" : "Salva"}
            </button>
          </div>
        </div>

        {/* ── Share panel ────────────────────────────────────────────── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: shareOpen ? 14 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Share2 size={14} style={{ color: MUTED }} />
              <span style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>Condividi pagina pubblica</span>
              {!page.isPublished && (
                <span style={{ color: MUTED, fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "1px 6px" }}>
                  pubblica prima per condividere
                </span>
              )}
            </div>
            <button
              onClick={() => setShareOpen(v => !v)}
              style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: MUTED, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
            >
              {shareOpen ? "Chiudi" : "Mostra link e opzioni"}
            </button>
          </div>

          {shareOpen && (
            <div>
              {/* URL row */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                <div style={{ flex: 1, background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: page.isPublished ? TEXT : MUTED, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {publicUrl}
                </div>
                <button
                  onClick={handleCopy}
                  disabled={!page.isPublished}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: page.isPublished ? "#0D1016" : "rgba(0,0,0,0.06)", color: page.isPublished ? "#fff" : MUTED, border: "none", borderRadius: 8, padding: "8px 14px", cursor: page.isPublished ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copiato!" : "Copia link"}
                </button>
                {page.isPublished && (
                  <Link
                    href={localUrl}
                    target="_blank"
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: MUTED, fontSize: 12, textDecoration: "none", flexShrink: 0 }}
                  >
                    <ExternalLink size={12} /> Apri
                  </Link>
                )}
              </div>

              {/* Social buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SHARE_CHANNELS.map(ch => (
                  <a
                    key={ch.key}
                    href={page.isPublished ? ch.url(publicUrl) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={!page.isPublished ? (e) => e.preventDefault() : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: page.isPublished ? ch.color : "rgba(0,0,0,0.04)",
                      color: page.isPublished ? "#fff" : MUTED,
                      border: page.isPublished ? "none" : `1px solid ${BORDER}`,
                      borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 500,
                      textDecoration: "none", cursor: page.isPublished ? "pointer" : "not-allowed",
                      opacity: page.isPublished ? 1 : 0.6,
                      transition: "opacity 150ms",
                    }}
                  >
                    {ch.icon}
                    {ch.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Visibility / Access Control ────────────────────────────── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Lock size={14} style={{ color: MUTED }} />
            <span style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>Visibilità pubblica</span>
            <span style={{ color: MUTED, fontFamily: "monospace", fontSize: 10, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "1px 6px" }}>Art. 13</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: page.accessConfig.visibility !== "public" ? 14 : 0 }}>
            {(["public", "restricted", "invite_only"] as TrustCenterVisibility[]).map(v => (
              <button
                key={v}
                onClick={() => patchPage({ accessConfig: { ...page.accessConfig, visibility: v } })}
                style={{
                  borderRadius: 8, border: `1px solid ${page.accessConfig.visibility === v ? "#4f46e5" : BORDER}`,
                  padding: "10px 12px", textAlign: "left", cursor: "pointer", transition: "border-color 0.15s",
                  background: page.accessConfig.visibility === v ? "rgba(79,70,229,0.06)" : "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12, color: page.accessConfig.visibility === v ? INDIGO : TEXT, marginBottom: 2 }}>
                  {v === "public" && "Pubblico"}
                  {v === "restricted" && "Dominio aziendale"}
                  {v === "invite_only" && "Solo invitati"}
                </div>
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.3 }}>
                  {v === "public" && "Accessibile a tutti"}
                  {v === "restricted" && "Solo email/dominio autorizzati"}
                  {v === "invite_only" && "Lista email esplicita"}
                </div>
              </button>
            ))}
          </div>
          {page.accessConfig.visibility !== "public" && (
            <div>
              <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                {page.accessConfig.visibility === "restricted" ? "Domini autorizzati (es. @regulator.eu)" : "Email autorizzate"}
              </p>
              <EmailTagInput
                values={page.accessConfig.visibility === "restricted" ? page.accessConfig.allowedDomains : page.accessConfig.allowedEmails}
                onChange={vals =>
                  patchPage({
                    accessConfig: page.accessConfig.visibility === "restricted"
                      ? { ...page.accessConfig, allowedDomains: vals }
                      : { ...page.accessConfig, allowedEmails: vals },
                  })
                }
                placeholder={page.accessConfig.visibility === "restricted" ? "@regulator.eu" : "auditor@partner.com"}
              />
              <p style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                Premi Invio o virgola per aggiungere. Il controllo avviene lato client al momento dell&apos;accesso.
              </p>
            </div>
          )}
        </div>

        {/* ── Export pacchetto conformità ─────────────────────────────── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ color: TEXT, fontWeight: 600, fontSize: 13, margin: 0 }}>Pacchetto di conformità</p>
            <p style={{ color: MUTED, fontSize: 11, margin: "2px 0 0" }}>
              Esporta un JSON con Trust Center, documenti collegati e attestazioni — Art. 11, Annex IV
            </p>
          </div>
          <button
            onClick={handleExportPacket}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#0D1016", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Download size={14} />
            Esporta pacchetto conformità
          </button>
        </div>

        {/* ── Two-column layout ──────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

          {/* Left: editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: MUTED, fontSize: 12, marginBottom: 4 }}>
              Per ogni sezione: attiva il toggle per renderla pubblica, genera il testo con AI e confermalo prima di salvare.
            </p>
            {ALL_SECTION_IDS.map(id => (
              <SectionCard
                key={id}
                id={id}
                page={page}
                sourceData={sourceData}
                onTogglePublic={togglePublic}
                onTextChange={changeText}
                onConfirm={confirmSection}
                onGenerate={generateSection}
                isGenerating={generatingSectionId === id}
              />
            ))}
          </div>

          {/* Right: live preview */}
          <div style={{ position: "sticky", top: 24 }}>
            <p style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>Anteprima live — vista esterna</p>
            <PublicPreview
              page={page}
              sourceData={sourceData}
              systemName={systemName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
