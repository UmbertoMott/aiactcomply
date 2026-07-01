"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, AlertCircle, Circle,
  ChevronRight, Shield, FileText, Database, Eye,
  Activity, BarChart2, Scale, Globe, Bell, Cpu,
  ClipboardCheck, Users, Zap, ScrollText, Building2,
} from "lucide-react";
import { loadInventory } from "@/lib/inventory/ai-system";
import type { AISystem, SystemTier } from "@/lib/inventory/ai-system";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.40)",
  faint:    "rgba(0,0,0,0.22)",
  border:   "rgba(0,0,0,0.08)",
  card:     "#ffffff",
  bg:       "#FAFAFA",
  green:    "#16a34a", greenBg: "rgba(22,163,74,0.08)",   greenBdr: "rgba(22,163,74,0.20)",
  amber:    "#d97706", amberBg: "rgba(217,119,6,0.08)",   amberBdr: "rgba(217,119,6,0.20)",
  red:      "#dc2626", redBg:   "rgba(220,38,38,0.07)",   redBdr:   "rgba(220,38,38,0.20)",
  gray:     "#6b7280", grayBg:  "rgba(0,0,0,0.04)",       grayBdr:  "rgba(0,0,0,0.10)",
};

const TIER_CFG: Record<string, { label: string; color: string; bg: string; bdr: string }> = {
  prohibited:    { label: "Vietato",          color: "#dc2626", bg: "rgba(220,38,38,0.08)",  bdr: "rgba(220,38,38,0.25)" },
  high_risk:     { label: "Alto rischio",     color: "#ea580c", bg: "rgba(234,88,12,0.08)",  bdr: "rgba(234,88,12,0.25)" },
  limited:       { label: "Rischio limitato", color: "#d97706", bg: "rgba(217,119,6,0.08)",  bdr: "rgba(217,119,6,0.25)" },
  minimal:       { label: "Rischio minimale", color: "#16a34a", bg: "rgba(22,163,74,0.08)",  bdr: "rgba(22,163,74,0.25)" },
  gpai:          { label: "GPAI",             color: "#7c3aed", bg: "rgba(124,58,237,0.07)", bdr: "rgba(124,58,237,0.22)" },
  gpai_systemic: { label: "GPAI Sistemico",   color: "#6d28d9", bg: "rgba(109,40,217,0.08)", bdr: "rgba(109,40,217,0.25)" },
  unclassified:  { label: "Non classificato", color: "#6b7280", bg: "rgba(0,0,0,0.05)",      bdr: "rgba(0,0,0,0.12)" },
};

const ROLE_LABELS: Record<string, string> = {
  provider: "Provider", deployer: "Deployer", importer: "Importatore",
  distributor: "Distributore", authorized_rep: "Rapp. autorizzato",
  product_manufacturer: "Prod. prodotto",
};

// ─── Obligation map ───────────────────────────────────────────────────────────
type ObStatus = "done" | "partial" | "missing";
type OblTier = SystemTier;

interface Obligation {
  id: string;
  article: string;
  label: string;
  what: string;
  icon: React.ElementType;
  storageKey: string | null;
  href: string;
  toolLabel: string;
  tiers: OblTier[];
  detect: (raw: string | null) => ObStatus;
}

function tryParse(raw: string | null): any {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function hasData(raw: string | null): boolean {
  const d = tryParse(raw);
  if (!d) return false;
  if (Array.isArray(d)) return d.length > 0;
  return Object.keys(d).length > 0;
}

const OBLIGATIONS: Obligation[] = [
  {
    id: "risk-mgmt",
    article: "Art. 9",
    label: "Gestione del rischio",
    what: "Identificare, analizzare e mitigare i rischi durante tutto il ciclo di vita del sistema AI",
    icon: Shield,
    storageKey: "aicomply_risk_manager_result",
    href: "/dashboard/modules/risk-manager",
    toolLabel: "Risk Manager",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      const risks = d.risks ?? d.riskItems ?? [];
      if (risks.length >= 3 && d.mitigations) return "done";
      return "partial";
    }
  },
  {
    id: "data-gov",
    article: "Art. 10",
    label: "Governance dei dati",
    what: "Garantire qualità, pertinenza e assenza di bias nei dataset di addestramento e validazione",
    icon: Database,
    storageKey: "aicomply_data_audit_result",
    href: "/dashboard/tools/data-audit",
    toolLabel: "Data Audit",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "tech-doc",
    article: "Art. 11",
    label: "Documentazione tecnica",
    what: "Produrre il fascicolo tecnico (Allegato IV AI Act) prima dell'immissione sul mercato",
    icon: FileText,
    storageKey: "aicomply_docugen_result",
    href: "/dashboard/tools/docugen",
    toolLabel: "DocuGen",
    tiers: ["high_risk", "gpai", "gpai_systemic"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.status === "signed" || d.exported) return "done";
      return "partial";
    }
  },
  {
    id: "logging",
    article: "Art. 12",
    label: "Registrazione automatica",
    what: "Garantire che il sistema generi log automatici delle operazioni per tutto il ciclo di vita",
    icon: ScrollText,
    storageKey: "aicomply_logvault_result",
    href: "/dashboard/tools/logvault",
    toolLabel: "LogVault",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.configured || d.status === "active") return "done";
      return "partial";
    }
  },
  {
    id: "transparency",
    article: "Art. 13",
    label: "Trasparenza verso gli utenti",
    what: "Fornire istruzioni d'uso chiare, capacità e limitazioni del sistema agli utenti finali",
    icon: Eye,
    storageKey: "aicomply_transparency_result",
    href: "/dashboard/tools/transparency",
    toolLabel: "Trasparenza",
    tiers: ["high_risk", "limited"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "oversight",
    article: "Art. 14",
    label: "Supervisione umana",
    what: "Progettare misure tecniche per una sorveglianza umana efficace sull'output del sistema",
    icon: Users,
    storageKey: "aicomply_oversight_result",
    href: "/dashboard/tools/oversight",
    toolLabel: "Supervisione",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "robustness",
    article: "Art. 15",
    label: "Accuratezza e robustezza",
    what: "Raggiungere e mantenere i livelli di accuratezza dichiarati, garantire resilienza a errori",
    icon: Zap,
    storageKey: "aicomply_resilience_result",
    href: "/dashboard/tools/resilience",
    toolLabel: "Resilienza",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "qms",
    article: "Art. 17",
    label: "Sistema gestione qualità",
    what: "Implementare un QMS per garantire la conformità continua ai requisiti dell'AI Act",
    icon: ClipboardCheck,
    storageKey: "aicomply_qms_result",
    href: "/dashboard/tools/qms",
    toolLabel: "QMS",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "dpia",
    article: "Art. 26 / GDPR",
    label: "Valutazione impatto privacy (DPIA)",
    what: "Condurre la DPIA se il sistema tratta dati personali su larga scala o in modo sistematico",
    icon: Scale,
    storageKey: "aicomply_dpia_result",
    href: "/dashboard/tools/dpia",
    toolLabel: "DPIA",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.status === "completed" || d.signedAt) return "done";
      return "partial";
    }
  },
  {
    id: "fria",
    article: "Art. 27",
    label: "Valutazione impatto diritti fondamentali",
    what: "Condurre la FRIA prima del deployment per enti pubblici o sistemi ad impatto critico",
    icon: Scale,
    storageKey: "aicomply_fria_result",
    href: "/dashboard/tools/fria",
    toolLabel: "FRIA",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.status === "completed" || d.signedAt) return "done";
      return "partial";
    }
  },
  {
    id: "conformity",
    article: "Art. 43",
    label: "Valutazione di conformità",
    what: "Completare la procedura di valutazione della conformità applicabile al sistema",
    icon: ClipboardCheck,
    storageKey: "aicomply_conformity_assessment",
    href: "/dashboard/tools/conformity",
    toolLabel: "Conformità",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "eu-decl",
    article: "Art. 47",
    label: "Dichiarazione di conformità UE",
    what: "Redigere e firmare la dichiarazione di conformità UE prima della commercializzazione",
    icon: ScrollText,
    storageKey: "aicomply_conformity_assessment",
    href: "/dashboard/tools/conformity",
    toolLabel: "Conformità",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.euDeclarationSigned) return "done";
      if (d.completed) return "partial";
      return "missing";
    }
  },
  {
    id: "eudb",
    article: "Art. 49",
    label: "Registrazione EUDB",
    what: "Registrare il sistema nell'EU AI database prima dell'immissione sul mercato UE",
    icon: Globe,
    storageKey: "aicomply_eudb_result",
    href: "/dashboard/tools/eudb",
    toolLabel: "EUDB",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.registered || d.status === "registered") return "done";
      if (hasData(raw)) return "partial";
      return "missing";
    }
  },
  {
    id: "transparency-limited",
    article: "Art. 50",
    label: "Obblighi di trasparenza AI",
    what: "Informare gli utenti quando interagiscono con un sistema AI (chatbot, sintesi, deepfake)",
    icon: Eye,
    storageKey: "aicomply_art50_result",
    href: "/dashboard/tools/art50-kit",
    toolLabel: "Art. 50 Kit",
    tiers: ["limited"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "gpai-transparency",
    article: "Art. 53",
    label: "Trasparenza GPAI",
    what: "Pubblicare sommario dati di addestramento, policy copyright, istruzioni per l'integrazione",
    icon: Cpu,
    storageKey: "aicomply_gpai_result",
    href: "/dashboard/tools/gpai",
    toolLabel: "GPAI",
    tiers: ["gpai", "gpai_systemic"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "gpai-safety",
    article: "Art. 55",
    label: "Sicurezza modelli sistemici",
    what: "Adversarial testing, red-teaming, piano di segnalazione incidenti e misure cybersecurity",
    icon: Shield,
    storageKey: "aicomply_resilience_result",
    href: "/dashboard/tools/resilience",
    toolLabel: "Resilienza",
    tiers: ["gpai_systemic"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.completed || d.status === "done") return "done";
      return "partial";
    }
  },
  {
    id: "post-market",
    article: "Art. 72",
    label: "Monitoraggio post-market",
    what: "Piano di sorveglianza continua delle performance e segnalazione incidenti gravi",
    icon: Activity,
    storageKey: "aicomply_incident_result",
    href: "/dashboard/post-market",
    toolLabel: "Post-Market",
    tiers: ["high_risk"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.monitoringPlan || d.status === "active") return "done";
      if (hasData(raw)) return "partial";
      return "missing";
    }
  },
  {
    id: "incident-report",
    article: "Art. 73",
    label: "Segnalazione incidenti gravi",
    what: "Segnalare incidenti gravi e malfunzionamenti alle autorità nazionali entro i termini previsti",
    icon: Bell,
    storageKey: "aicomply_incident_result",
    href: "/dashboard/post-market",
    toolLabel: "Post-Market",
    tiers: ["high_risk", "gpai_systemic"],
    detect: raw => {
      const d = tryParse(raw);
      if (!d) return "missing";
      if (d.reportingConfigured) return "done";
      if (hasData(raw)) return "partial";
      return "missing";
    }
  },
];

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: ObStatus }) {
  const cfg = {
    done:    { label: "Completato", color: T.green, bg: T.greenBg, bdr: T.greenBdr, Icon: CheckCircle2 },
    partial: { label: "In corso",   color: T.amber, bg: T.amberBg, bdr: T.amberBdr, Icon: AlertCircle },
    missing: { label: "Mancante",   color: T.gray,  bg: T.grayBg,  bdr: T.grayBdr,  Icon: Circle },
  }[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 100,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}`,
      whiteSpace: "nowrap",
    }}>
      <cfg.Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SystemDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [system, setSystem] = useState<AISystem | null>(null);
  const [obligations, setObligations] = useState<(Obligation & { status: ObStatus })[]>([]);
  const [filter, setFilter] = useState<"all" | ObStatus>("all");

  useEffect(() => {
    const sys = loadInventory().find(s => s.id === id);
    if (!sys) return;
    setSystem(sys);
    const relevant = OBLIGATIONS.filter(o =>
      o.tiers.includes(sys.tier as OblTier)
    );
    const withStatus = relevant.map(o => {
      const raw = o.storageKey ? localStorage.getItem(o.storageKey) : null;
      return { ...o, status: o.detect(raw) };
    });
    setObligations(withStatus);
  }, [id]);

  if (!system) return (
    <div style={{ padding: 48, fontFamily: "'DM Sans',sans-serif" }}>
      <p style={{ color: T.muted, fontSize: 14 }}>
        Sistema non trovato.{" "}
        <Link href="/dashboard/tools/inventory" style={{ color: T.text, fontWeight: 600, textDecoration: "underline" }}>
          Torna all&apos;inventario
        </Link>
      </p>
    </div>
  );

  const tier  = TIER_CFG[system.tier] ?? TIER_CFG.unclassified;
  const done    = obligations.filter(o => o.status === "done").length;
  const partial = obligations.filter(o => o.status === "partial").length;
  const missing = obligations.filter(o => o.status === "missing").length;
  const total   = obligations.length;
  const pct     = total > 0 ? Math.round((done + partial * 0.5) / total * 100) : 0;
  const scoreColor = pct >= 70 ? T.green : pct >= 40 ? T.amber : T.red;

  const filtered = filter === "all" ? obligations
    : obligations.filter(o => o.status === filter);

  const card: React.CSSProperties = {
    background: T.card, border: `1px solid ${T.border}`,
    borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  const FILTER_OPTS = [
    { key: "all",     label: `Tutti — ${total}` },
    { key: "missing", label: `Mancanti — ${missing}` },
    { key: "partial", label: `In corso — ${partial}` },
    { key: "done",    label: `Completati — ${done}` },
  ] as const;

  return (
    <div style={{
      background: T.bg, minHeight: "100vh",
      padding: "24px 28px", fontFamily: "'DM Sans',sans-serif",
    }}>

      {/* Breadcrumb */}
      <Link href="/dashboard/tools/inventory" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 500, color: T.muted,
        textDecoration: "none", marginBottom: 20,
      }}>
        <ArrowLeft size={13} />
        Inventario Sistemi AI
      </Link>

      {/* ── Header card ── */}
      <div style={{ ...card, padding: "24px 28px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
                background: tier.bg, color: tier.color, border: `1px solid ${tier.bdr}`,
              }}>{tier.label}</span>
              {system.role && (
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>
                  {ROLE_LABELS[system.role]}
                </span>
              )}
              {system.dualRoleFlag && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                  background: "rgba(234,88,12,0.08)", color: "#ea580c",
                  border: "1px solid rgba(234,88,12,0.20)",
                }}>Dual-role</span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
              {system.name}
            </h1>
            {system.description && (
              <p style={{ fontSize: 13, color: T.muted, margin: "0 0 0", maxWidth: 580, lineHeight: 1.5 }}>
                {system.description}
              </p>
            )}
          </div>
          {/* Score */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 40, fontWeight: 200, color: scoreColor, lineHeight: 1, letterSpacing: "-2px" }}>
              {pct}<span style={{ fontSize: 18, fontWeight: 300 }}>%</span>
            </div>
            <div style={{ fontSize: 9, color: T.faint, fontWeight: 700, letterSpacing: "0.1em", marginTop: 3 }}>
              CONFORMITÀ
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, background: scoreColor,
            width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
            transition: "width 0.9s ease",
          }} />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 32, marginTop: 14 }}>
          {[
            { label: "COMPLETATI", count: done,    color: T.green },
            { label: "IN CORSO",   count: partial,  color: T.amber },
            { label: "MANCANTI",   count: missing,  color: T.red   },
            { label: "TOTALE",     count: total,    color: T.text  },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", lineHeight: 1 }}>
                {s.count}
              </div>
              <div style={{ fontSize: 9, color: T.faint, fontWeight: 700, letterSpacing: "0.07em", marginTop: 3 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Classify CTA */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "flex-end" }}>
          <Link href={`/dashboard/tools/inventory/${system.id}/classify`} style={{
            fontSize: 12, fontWeight: 600, padding: "7px 18px", borderRadius: 8,
            background: system.tier === "unclassified" ? T.text : "rgba(0,0,0,0.06)",
            color: system.tier === "unclassified" ? "white" : "#374151",
            border: `1px solid ${system.tier === "unclassified" ? T.text : "rgba(0,0,0,0.1)"}`,
            textDecoration: "none", display: "inline-block",
          }}>
            {system.tier === "unclassified" ? "Classifica sistema →" : "Riclassifica →"}
          </Link>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {FILTER_OPTS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 13px", borderRadius: 100,
            border: `1px solid ${filter === f.key ? T.text : T.border}`,
            background: filter === f.key ? T.text : "white",
            color: filter === f.key ? "white" : T.muted,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Obligations table ── */}
      <div style={{ ...card, overflow: "hidden", marginBottom: 12 }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "90px 1fr 130px 130px",
          columnGap: 20, padding: "8px 22px",
          background: "rgba(0,0,0,0.015)",
          borderBottom: `1px solid ${T.border}`,
        }}>
          {["ARTICOLO", "OBBLIGO AI ACT", "STATO", "STRUMENTO"].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: T.faint, letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "40px 22px", textAlign: "center", color: T.faint, fontSize: 13 }}>
            Nessun obbligo in questa categoria.
          </div>
        )}

        {filtered.map((o, i) => {
          const Icon = o.icon;
          return (
            <div key={o.id} style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr 130px 130px",
              columnGap: 20, padding: "15px 22px",
              alignItems: "center",
              borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
              background: "white",
            }}>
              {/* Article pill */}
              <span style={{
                fontSize: 10, fontWeight: 700, color: T.muted,
                padding: "3px 8px", borderRadius: 6,
                background: "rgba(0,0,0,0.035)", border: `1px solid ${T.border}`,
                display: "inline-block", whiteSpace: "nowrap",
              }}>
                {o.article}
              </span>

              {/* Label + description */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 1,
                  background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={13} strokeWidth={1.8} color={T.muted} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                    {o.label}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45 }}>
                    {o.what}
                  </div>
                </div>
              </div>

              {/* Status */}
              <StatusChip status={o.status} />

              {/* Tool link */}
              <Link href={o.href} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600, color: T.text,
                textDecoration: "none", padding: "6px 12px",
                border: `1px solid ${T.border}`, borderRadius: 8,
                background: "white", transition: "border-color 0.15s",
                whiteSpace: "nowrap",
              }}>
                {o.toolLabel}
                <ChevronRight size={11} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* ── Normative basis ── */}
      {(system.tierBasis || system.obligationsNote) && (
        <div style={{
          padding: "13px 18px", borderRadius: 10,
          background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}`,
          fontSize: 12, color: T.muted, lineHeight: 1.6,
        }}>
          {system.tierBasis && (
            <p style={{ margin: "0 0 4px" }}>
              <span style={{ fontWeight: 600, color: T.text }}>Classificazione: </span>
              {system.tierBasis}
            </p>
          )}
          {system.obligationsNote && (
            <p style={{ margin: 0 }}>
              <span style={{ fontWeight: 600, color: T.text }}>Note obblighi: </span>
              {system.obligationsNote}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
