"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck, Copy, Check, ExternalLink, Sparkles, Globe, GlobeLock,
  AlertTriangle, CheckCircle2, Info, Loader2,
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
} from "@/lib/trust-center/trust-center-types";
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

  const publicSectionCount = ALL_SECTION_IDS.filter(id => page.sections[id].is_public).length;

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

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
