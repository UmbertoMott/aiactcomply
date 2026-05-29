"use client";

import { useState, useRef, useEffect, useMemo, CSSProperties } from "react";
import {
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle,
  HelpCircle, Building2, ExternalLink, Save, Info,
} from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { DeployerCheckResult } from "@/lib/dossier/storage-schema";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { SystemContextBanner } from "@/components/compliance/SystemContextBanner";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.22)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bg:      "#f9f9fb",
  red:     "#dc2626",  redBg:   "rgba(220,38,38,0.06)",  redBdr:  "rgba(220,38,38,0.18)",
  amber:   "#92400e",  amberBg: "rgba(202,138,4,0.07)",  amberBdr:"rgba(202,138,4,0.22)",
  green:   "#15803d",  greenBg: "rgba(22,163,74,0.06)",  greenBdr:"rgba(22,163,74,0.18)",
  blue:    "#1d4ed8",  blueBg:  "rgba(29,78,216,0.05)",  blueBdr: "rgba(29,78,216,0.16)",
} as const;

const cardSt: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid ${T.border}`, fontSize: 12,
  color: T.text, background: T.card, outline: "none",
};

const taSt: CSSProperties = { ...inputSt, resize: "vertical" };

// ─── Types ────────────────────────────────────────────────────────────────────

type DeployerStatus = "compliant" | "partial" | "non_compliant" | "not_assessed" | "";

interface DeployerObligation {
  id: string;
  article: string;
  title: string;
  explanation: string;
  status: DeployerStatus;
  notes: string;
  evidence_type?: string;
}

interface DeployerDoc {
  system_name: string;
  provider_name: string;
  deployment_context: string;
  obligations: DeployerObligation[];
  updatedAt: string;
}

// ─── Default obligations ──────────────────────────────────────────────────────

const DEFAULT_OBLIGATIONS: DeployerObligation[] = [
  {
    id: "d1", article: "Art. 26(1)", status: "", notes: "",
    title: "Misure tecniche e organizzative secondo le istruzioni del provider",
    explanation:
      "Il deployer deve applicare le istruzioni d'uso fornite dal provider nella documentazione tecnica e nelle istruzioni operative. Deviare dalle istruzioni del provider può invalidare la conformità del sistema.",
    evidence_type: "Copia delle istruzioni operative del provider + procedura di deployment interna",
  },
  {
    id: "d2", article: "Art. 26(2)", status: "", notes: "",
    title: "Supervisione umana affidata a persone formate e competenti",
    explanation:
      "Le persone incaricate della supervisione umana devono avere le competenze, l'autorità e le risorse necessarie. Il deployer deve documentare chi è responsabile e che formazione ha ricevuto.",
    evidence_type: "Lista nominativa supervisori + attestati di formazione + job description",
  },
  {
    id: "d3", article: "Art. 26(3)", status: "", notes: "",
    title: "Monitoraggio operativo e segnalazione incidenti gravi",
    explanation:
      "Il deployer deve monitorare il sistema durante l'operatività e segnalare immediatamente al provider (e all'autorità di vigilanza per sistemi che causano danni a persone) qualsiasi incidente grave o malfunzionamento.",
    evidence_type: "Piano di monitoraggio operativo + procedura segnalazione incidenti",
  },
  {
    id: "d4", article: "Art. 26(7)", status: "", notes: "",
    title: "Informazione ai lavoratori prima del deployment",
    explanation:
      "Se il sistema AI ad alto rischio è utilizzato in un contesto lavorativo e riguarda i dipendenti (es. sistemi HR, monitoraggio, scheduling), i lavoratori e i loro rappresentanti devono essere informati prima dell'avvio.",
    evidence_type: "Comunicazione interna ai lavoratori + verbale informativa sindacale (ove richiesto)",
  },
  {
    id: "d5", article: "Art. 26(6)", status: "", notes: "",
    title: "Conservazione dei log per il periodo prescritto",
    explanation:
      "I log automaticamente generati dal sistema devono essere conservati per almeno 6 mesi (o il periodo maggiore indicato nelle istruzioni del provider o dalle normative di settore). I log sono essenziali in caso di indagine.",
    evidence_type: "Policy di retention dei log + prova del sistema di archiviazione",
  },
  {
    id: "d6", article: "Art. 26(4) / Art. 49", status: "", notes: "",
    title: "Registrazione nel database EU (EUDB) se richiesta",
    explanation:
      "I deployer di sistemi ad alto rischio ex Annex III in ambiti specifici (es. pubblica amministrazione) devono registrarsi nel EUDB prima del deployment. Verificare se l'obbligo si applica al proprio caso.",
    evidence_type: "Numero di registrazione EUDB o documento di esenzione motivata",
  },
  {
    id: "d7", article: "Art. 26(5) / Art. 28", status: "", notes: "",
    title: "Nessuna modifica sostanziale senza diventare provider",
    explanation:
      "Se il deployer modifica lo scopo o il comportamento del sistema AI in modo sostanziale, diventa automaticamente provider e deve rispettare tutti gli obblighi del provider (documentazione tecnica, test, conformity assessment). Monitorare eventuali personalizzazioni.",
    evidence_type: "Registro delle modifiche al sistema + valutazione 'modifica sostanziale' firmata",
  },
  {
    id: "d8", article: "Art. 26(10)", status: "", notes: "",
    title: "Cooperazione con le autorità di vigilanza del mercato",
    explanation:
      "Su richiesta delle autorità di vigilanza, il deployer deve fornire tutta la documentazione necessaria e cooperare pienamente a qualsiasi indagine. Identificare in anticipo il punto di contatto interno.",
    evidence_type: "Referente interno designato + procedura di risposta alle richieste regolamentari",
  },
  {
    id: "d9", article: "Art. 27(1)", status: "", notes: "",
    title: "FRIA obbligatoria per PA e istituti finanziari",
    explanation:
      "Se il deployer è un organismo pubblico, una banca o un'assicurazione che usa sistemi ad alto rischio ex Annex III, deve eseguire una Valutazione d'Impatto sui Diritti Fondamentali (FRIA) prima del deployment. Per altri deployer privati è fortemente raccomandata.",
    evidence_type: "Link al tool FRIA di AIComply — documento FRIA completato e firmato",
  },
];

function createEmptyDoc(): DeployerDoc {
  return {
    system_name: "",
    provider_name: "",
    deployment_context: "",
    obligations: DEFAULT_OBLIGATIONS.map(o => ({ ...o })),
    updatedAt: "",
  };
}

const STORAGE_KEY = "aicomply_deployer_result";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  Exclude<DeployerStatus, "">,
  { label: string; color: string; bg: string; border: string; Icon: React.FC<{ size?: number }> }
> = {
  not_assessed: {
    label: "Non valutato", color: T.muted, bg: "rgba(0,0,0,0.03)",
    border: T.border, Icon: ({ size }) => <HelpCircle size={size ?? 12} />,
  },
  compliant: {
    label: "Conforme", color: T.green, bg: T.greenBg,
    border: T.greenBdr, Icon: ({ size }) => <CheckCircle2 size={size ?? 12} />,
  },
  partial: {
    label: "Parziale", color: T.amber, bg: T.amberBg,
    border: T.amberBdr, Icon: ({ size }) => <AlertTriangle size={size ?? 12} />,
  },
  non_compliant: {
    label: "Non conforme", color: T.red, bg: T.redBg,
    border: T.redBdr, Icon: ({ size }) => <XCircle size={size ?? 12} />,
  },
};

const STATUS_ORDER: Exclude<DeployerStatus, "">[] = [
  "not_assessed", "compliant", "partial", "non_compliant",
];

// ─── Score helpers ────────────────────────────────────────────────────────────

function computeScore(obligations: DeployerObligation[]) {
  const total = obligations.length;
  const assessed = obligations.filter(o => o.status && o.status !== "not_assessed").length;
  const compliant = obligations.filter(o => o.status === "compliant").length;
  const partial = obligations.filter(o => o.status === "partial").length;
  const non_compliant = obligations.filter(o => o.status === "non_compliant").length;
  const not_assessed = obligations.filter(o => !o.status || o.status === "not_assessed").length;
  const pct = assessed === 0 ? 0 : Math.round((compliant / total) * 100);
  return { total, assessed, compliant, partial, non_compliant, not_assessed, pct };
}

// ─── Accordion item ───────────────────────────────────────────────────────────

interface ObligationRowProps {
  ob: DeployerObligation;
  index: number;
  open: boolean;
  onToggle: () => void;
  onChange: (updated: DeployerObligation) => void;
}

function ObligationRow({ ob, index, open, onToggle, onChange }: ObligationRowProps) {
  const statusVal = ob.status || "not_assessed";
  const cfg = STATUS_CFG[statusVal as Exclude<DeployerStatus, "">];

  return (
    <div
      style={{
        ...cardSt,
        marginBottom: 8,
        overflow: "hidden",
        border: `1px solid ${open ? T.border : T.border}`,
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", background: "transparent", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Index */}
        <span
          style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
            background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.muted,
          }}
        >
          {index + 1}
        </span>

        {/* Article badge */}
        <span
          style={{
            flexShrink: 0, fontSize: 9, fontWeight: 600, padding: "2px 6px",
            borderRadius: 5, background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}`,
            whiteSpace: "nowrap",
          }}
        >
          {ob.article}
        </span>

        {/* Title */}
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: T.text }}>
          {ob.title}
        </span>

        {/* Status badge */}
        {ob.status && (ob.status as string) !== "" && (
          <span
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              whiteSpace: "nowrap",
            }}
          >
            <cfg.Icon size={10} />
            {cfg.label}
          </span>
        )}

        {/* Chevron */}
        <span style={{ color: T.faint, flexShrink: 0 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Divider */}
          <div style={{ height: 1, background: T.border, marginBottom: 12 }} />

          {/* Explanation */}
          <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
            {ob.explanation}
          </p>

          {/* Status radio group */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              Stato di conformità
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUS_ORDER.map(s => {
                const c = STATUS_CFG[s];
                const selected = (ob.status || "not_assessed") === s;
                return (
                  <button
                    key={s}
                    onClick={() => onChange({ ...ob, status: s })}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.12s",
                      background: selected ? c.bg : "transparent",
                      color: selected ? c.color : T.muted,
                      border: `1px solid ${selected ? c.border : T.border}`,
                    }}
                  >
                    <c.Icon size={11} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes textarea */}
          <div style={{ marginBottom: ob.evidence_type ? 10 : 0 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.text, display: "block", marginBottom: 5 }}>
              Note / Evidenze
            </label>
            <textarea
              rows={3}
              style={taSt}
              placeholder="Descrivere le evidenze o le lacune..."
              value={ob.notes}
              onChange={e => onChange({ ...ob, notes: e.target.value })}
            />
          </div>

          {/* Evidence type suggestion */}
          {ob.evidence_type && (
            <div
              style={{
                display: "flex", alignItems: "flex-start", gap: 6,
                padding: "7px 10px", borderRadius: 7,
                background: "rgba(0,0,0,0.025)", border: `1px solid ${T.border}`,
                marginBottom: ob.status === "non_compliant" || ob.id === "d9" ? 10 : 0,
              }}
            >
              <Info size={12} style={{ color: T.faint, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                <span style={{ fontWeight: 600, color: T.text }}>Tipo di evidenza suggerita: </span>
                {ob.evidence_type}
              </p>
            </div>
          )}

          {/* Non-compliant alert */}
          {ob.status === "non_compliant" && (
            <div
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "9px 12px", borderRadius: 8,
                background: T.redBg, border: `1px solid ${T.redBdr}`,
                marginBottom: ob.id === "d9" ? 10 : 0,
              }}
            >
              <AlertTriangle size={13} style={{ color: T.red, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: T.red, margin: 0 }}>
                <strong>Questo obbligo richiede azione.</strong> Documentare il piano di rimedio nelle note.
              </p>
            </div>
          )}

          {/* FRIA link for d9 */}
          {ob.id === "d9" && (
            <Link
              href="/dashboard/tools/fria"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 500, color: T.blue,
                textDecoration: "none", padding: "5px 10px",
                borderRadius: 7, background: T.blueBg, border: `1px solid ${T.blueBdr}`,
              }}
            >
              <ExternalLink size={11} />
              Apri Tool FRIA
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeployerPage() {
  const [doc, setDoc] = useState<DeployerDoc>(createEmptyDoc);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DeployerDoc>;
        setDoc(prev => ({
          ...prev,
          ...parsed,
          // merge obligations: keep defaults for any missing ids
          obligations: DEFAULT_OBLIGATIONS.map(def => {
            const saved = parsed.obligations?.find(o => o.id === def.id);
            return saved ? { ...def, ...saved } : { ...def };
          }),
        }));
      }
    } catch { /* ignore */ }
  }, []);

  // Autosave debounced 800ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }));
      } catch { /* ignore */ }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [doc]);

  // Pre-populate system_name from Classifier
  const classifierData = useMemo(() => {
    try { const r = localStorage.getItem("aicomply_classifier_result"); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }, []);
  useEffect(() => {
    if (classifierData?.systemName && !doc.system_name) {
      setDoc(prev => ({ ...prev, system_name: classifierData.systemName }));
    }
  }, [classifierData]);

  function toggleOpen(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function updateObligation(updated: DeployerObligation) {
    setDoc(prev => ({
      ...prev,
      obligations: prev.obligations.map(o => o.id === updated.id ? updated : o),
    }));
  }

  function handleSave() {
    const score = computeScore(doc.obligations);
    const result: DeployerCheckResult = {
      system_name: doc.system_name,
      provider_name: doc.provider_name,
      compliant_count: score.compliant,
      partial_count: score.partial,
      non_compliant_count: score.non_compliant,
      completedAt: new Date().toISOString(),
    };
    writeToStorage<DeployerCheckResult>("deployer", result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const score = computeScore(doc.obligations);

  // Progress bar color
  const barColor = score.non_compliant > 0 ? T.red : score.pct >= 80 ? T.green : T.amber;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 60 }}>

      <SystemContextBanner checkProhibited={true} />

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: T.blueBg, border: `1px solid ${T.blueBdr}`,
            }}
          >
            <Building2 size={16} style={{ color: T.blue }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016", margin: 0 }}>
              Deployer Obligations
            </h1>
            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
              Art. 26 AI Act — 9 obblighi per i deployer di sistemi AI ad alto rischio
            </p>
          </div>
        </div>
      </div>

      {/* Context header card */}
      <div style={{ ...cardSt, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Contesto del deployment
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>
              Nome del sistema AI
            </label>
            <input
              style={inputSt}
              placeholder="es. Sistema di scoring credito"
              value={doc.system_name}
              onChange={e => setDoc(prev => ({ ...prev, system_name: e.target.value }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>
              Nome del provider
            </label>
            <input
              style={inputSt}
              placeholder="es. Acme AI S.r.l."
              value={doc.provider_name}
              onChange={e => setDoc(prev => ({ ...prev, provider_name: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>
            Contesto di deployment
          </label>
          <textarea
            rows={2}
            style={taSt}
            placeholder="Descrivere il contesto operativo: settore, finalità d'uso, categorie di utenti finali..."
            value={doc.deployment_context}
            onChange={e => setDoc(prev => ({ ...prev, deployment_context: e.target.value }))}
          />
        </div>
      </div>

      {/* Score banner */}
      <div
        style={{
          ...cardSt,
          padding: "14px 16px",
          marginBottom: 20,
          border: `1px solid ${score.non_compliant > 0 ? T.redBdr : T.border}`,
          background: score.non_compliant > 0 ? T.redBg : T.card,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: score.non_compliant > 0 ? T.red : T.text }}>
            {score.non_compliant > 0
              ? `${score.non_compliant} obbligo${score.non_compliant > 1 ? "hi" : ""} non conforme${score.non_compliant > 1 ? "i" : ""} — azione richiesta`
              : "Punteggio di conformità"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
            {score.compliant}/{score.total} conformi
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 10 }}>
          <div
            style={{
              height: "100%", borderRadius: 99,
              width: `${(score.compliant / score.total) * 100}%`,
              background: barColor, transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Conformi", count: score.compliant, color: T.green },
            { label: "Parziali", count: score.partial, color: T.amber },
            { label: "Non conformi", count: score.non_compliant, color: T.red },
            { label: "Non valutati", count: score.not_assessed, color: T.faint },
          ].map(({ label, count, color }) => (
            <span key={label} style={{ fontSize: 11, color, fontWeight: 500 }}>
              {count} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Accordion list */}
      <div style={{ marginBottom: 24 }}>
        {doc.obligations.map((ob, i) => (
          <ObligationRow
            key={ob.id}
            ob={ob}
            index={i}
            open={openIds.has(ob.id)}
            onToggle={() => toggleOpen(ob.id)}
            onChange={updateObligation}
          />
        ))}
      </div>

      {/* Save button */}
      <div style={{ ...cardSt, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0 }}>
            Salva nel dossier
          </p>
          <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
            Registra il riepilogo di conformità nel dossier AI Act
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
            background: saved ? T.greenBg : T.blue,
            color: saved ? T.green : "#ffffff",
            border: `1px solid ${saved ? T.greenBdr : T.blue}`,
          }}
        >
          {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? "Salvato!" : "Salva nel dossier"}
        </button>
      </div>

      {/* Sign-off */}
      <SignOffPanel toolKey="deployer" toolLabel="Art. 26 — Obblighi Deployer" />
    </div>
  );
}
