"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Scale, FileText, AlertTriangle, CheckCircle, XCircle, Info,
  Download, Users,
} from "lucide-react";
import {
  readFromStorage,
  writeToStorage,
  type L132Result,
  type L132CheckArea,
} from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_TYPE_OPTS = [
  "Sistema HR / selezione personale",
  "Chatbot / assistente virtuale",
  "Generatore contenuti (testo)",
  "Generatore media sintetici (immagini/video/audio)",
  "Sistema di scoring / raccomandazione",
  "Altro",
];

const HR_REQUIREMENTS = [
  "Gli interessati (candidati/dipendenti) sono informati dell'uso dell'AI prima che avvenga",
  "L'informativa specifica quali dati sono elaborati e con quale logica",
  "Esiste una procedura per richiedere revisione umana delle decisioni automatizzate",
  "Il sistema non viene usato come unico fattore decisionale vincolante senza supervisione umana",
  "La documentazione di questa informativa è conservata per almeno 5 anni",
];

const LABELING_REQUIREMENTS = [
  "Il sistema appone etichetta visibile 'Generato da AI' o equivalente su tutti i contenuti prodotti",
  "Per contenuti audio/video: è presente un watermark tecnico o metadato machine-readable",
  "L'etichettatura è presente anche nei contenuti distribuiti via API a terze parti",
  "Esiste un registro dei contenuti generati con data, tipo e destinatario (se pertinente)",
  "Gli utenti finali possono verificare l'origine AI del contenuto",
];

const DEEPFAKE_REQUIREMENTS = [
  "Il sistema richiede consenso esplicito e verificabile della persona ritratta prima di generare il contenuto",
  "Esiste un meccanismo tecnico (es. digital fingerprint, watermark) per tracciare l'origine del contenuto sintetico",
  "I termini di servizio vietano esplicitamente l'uso per deepfake non consensuali con sanzione contrattuale",
  "È implementato un sistema di segnalazione e rimozione rapida (take-down) per abusi",
  "Il processo di KYC/verifica identità dell'utente è documentato",
  "È stata effettuata una valutazione legale specifica del rischio penale italiano",
];

const ACCESSIBILITY_REQUIREMENTS = [
  "Le spiegazioni fornite dal sistema sono comprensibili per un utente non tecnico (readability score target: ≤ licenza media)",
  "L'interfaccia è accessibile (contrasto colori, screen reader, navigazione da tastiera)",
  "In caso di decisione automatizzata che impatta l'utente, è fornita una spiegazione in linguaggio non tecnico",
  "I messaggi di errore e le limitazioni del sistema sono comunicati chiaramente",
];

// ─── Style helpers ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "12px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.07)",
  fontSize: "12px",
  color: "#0D1016",
  background: "#fff",
  outline: "none",
};

const STATUS_META: Record<
  L132Result["overallStatus"],
  { label: string; bg: string; color: string; border: string }
> = {
  conforme: {
    label: "Conforme",
    bg: "rgba(22,163,74,0.08)",
    color: "#15803d",
    border: "rgba(22,163,74,0.2)",
  },
  parzialmente_conforme: {
    label: "Parzialmente conforme",
    bg: "rgba(202,138,4,0.08)",
    color: "#92400e",
    border: "rgba(202,138,4,0.2)",
  },
  non_conforme: {
    label: "Non conforme",
    bg: "rgba(220,38,38,0.08)",
    color: "#dc2626",
    border: "rgba(220,38,38,0.15)",
  },
  non_applicabile: {
    label: "Non applicabile",
    bg: "rgba(0,0,0,0.04)",
    color: "rgba(0,0,0,0.45)",
    border: "rgba(0,0,0,0.1)",
  },
};

// ─── State shape ──────────────────────────────────────────────────────────────

interface FormState {
  systemName: string;
  systemType: string;
  deployedInItaly: boolean;
  requiresHRNotice: boolean;
  hrChecks: (boolean | null)[];
  hrNotes: string;
  labelingChecks: (boolean | null)[];
  labelingNotes: string;
  isDeepfakeRisk: boolean;
  deepfakeChecks: (boolean | null)[];
  deepfakeNotes: string;
  accessibilityChecks: (boolean | null)[];
  accessibilityNotes: string;
  remediation: string;
}

function defaultForm(): FormState {
  return {
    systemName: "",
    systemType: SYSTEM_TYPE_OPTS[0],
    deployedInItaly: true,
    requiresHRNotice: false,
    hrChecks: HR_REQUIREMENTS.map(() => null),
    hrNotes: "",
    labelingChecks: LABELING_REQUIREMENTS.map(() => null),
    labelingNotes: "",
    isDeepfakeRisk: false,
    deepfakeChecks: DEEPFAKE_REQUIREMENTS.map(() => null),
    deepfakeNotes: "",
    accessibilityChecks: ACCESSIBILITY_REQUIREMENTS.map(() => null),
    accessibilityNotes: "",
    remediation: "",
  };
}

function formToResult(f: FormState): L132Result {
  const areas: L132CheckArea[] = [
    {
      areaId: "hr_transparency",
      label: "Trasparenza HR",
      compliant: f.requiresHRNotice
        ? f.hrChecks.every((c) => c === true)
          ? true
          : f.hrChecks.some((c) => c === true)
          ? null
          : false
        : null,
      notes: f.hrNotes,
      requirements: HR_REQUIREMENTS,
      checks: f.requiresHRNotice ? f.hrChecks : [],
    },
    {
      areaId: "content_labeling",
      label: "Etichettatura contenuti",
      compliant: f.labelingChecks.every((c) => c === true)
        ? true
        : f.labelingChecks.some((c) => c === true)
        ? null
        : false,
      notes: f.labelingNotes,
      requirements: LABELING_REQUIREMENTS,
      checks: f.labelingChecks,
    },
    {
      areaId: "deepfake_risk",
      label: "Deepfake / Art. 612-quater c.p.",
      compliant: f.isDeepfakeRisk
        ? f.deepfakeChecks.every((c) => c === true)
          ? true
          : f.deepfakeChecks.some((c) => c === true)
          ? null
          : false
        : null,
      notes: f.deepfakeNotes,
      requirements: DEEPFAKE_REQUIREMENTS,
      checks: f.isDeepfakeRisk ? f.deepfakeChecks : [],
    },
    {
      areaId: "accessibility",
      label: "Accessibilità",
      compliant: f.accessibilityChecks.every((c) => c === true)
        ? true
        : f.accessibilityChecks.some((c) => c === true)
        ? null
        : false,
      notes: f.accessibilityNotes,
      requirements: ACCESSIBILITY_REQUIREMENTS,
      checks: f.accessibilityChecks,
    },
  ];

  let overallStatus: L132Result["overallStatus"];
  if (!f.deployedInItaly) {
    overallStatus = "non_applicabile";
  } else {
    const applicableAreas = areas.filter((a) => a.checks.length > 0);
    if (applicableAreas.length === 0) {
      overallStatus = "non_applicabile";
    } else {
      // deepfake with < 4/6 = non_conforme
      if (
        f.isDeepfakeRisk &&
        f.deepfakeChecks.filter((c) => c === true).length < 4
      ) {
        overallStatus = "non_conforme";
      } else {
        const anyNonCompliant = applicableAreas.some((a) => {
          const total = a.checks.length;
          if (total === 0) return false;
          const falseCount = a.checks.filter((c) => c === false).length;
          return falseCount / total > 0.5;
        });
        const allCompliant = applicableAreas.every((a) =>
          a.checks.length === 0 ? true : a.checks.every((c) => c === true)
        );
        if (anyNonCompliant) overallStatus = "non_conforme";
        else if (allCompliant) overallStatus = "conforme";
        else overallStatus = "parzialmente_conforme";
      }
    }
  }

  return {
    completedAt: new Date().toISOString(),
    systemName: f.systemName,
    systemType: f.systemType,
    areas,
    overallStatus,
    remediation: f.remediation,
    isDeepfakeRisk: f.isDeepfakeRisk,
    requiresHRNotice: f.requiresHRNotice,
  };
}

function resultToForm(r: L132Result): FormState {
  const hr = r.areas.find((a) => a.areaId === "hr_transparency");
  const lab = r.areas.find((a) => a.areaId === "content_labeling");
  const df = r.areas.find((a) => a.areaId === "deepfake_risk");
  const acc = r.areas.find((a) => a.areaId === "accessibility");
  return {
    systemName: r.systemName,
    systemType: r.systemType,
    deployedInItaly: r.overallStatus !== "non_applicabile",
    requiresHRNotice: r.requiresHRNotice,
    hrChecks: hr?.checks.length
      ? (hr.checks as (boolean | null)[])
      : HR_REQUIREMENTS.map(() => null),
    hrNotes: hr?.notes ?? "",
    labelingChecks: lab?.checks.length
      ? (lab.checks as (boolean | null)[])
      : LABELING_REQUIREMENTS.map(() => null),
    labelingNotes: lab?.notes ?? "",
    isDeepfakeRisk: r.isDeepfakeRisk,
    deepfakeChecks: df?.checks.length
      ? (df.checks as (boolean | null)[])
      : DEEPFAKE_REQUIREMENTS.map(() => null),
    deepfakeNotes: df?.notes ?? "",
    accessibilityChecks: acc?.checks.length
      ? (acc.checks as (boolean | null)[])
      : ACCESSIBILITY_REQUIREMENTS.map(() => null),
    accessibilityNotes: acc?.notes ?? "",
    remediation: r.remediation,
  };
}

// ─── Download ─────────────────────────────────────────────────────────────────

function buildReportText(r: L132Result): string {
  const dateStr = new Date(r.completedAt).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const areaBlock = (
    area: L132CheckArea,
    header: string,
    applicable: boolean
  ) => {
    const lines = [header];
    if (!applicable) {
      lines.push("  Applicabile: No");
      lines.push(`  Note: ${area.notes || "—"}`);
      return lines;
    }
    lines.push("  Applicabile: Sì");
    area.requirements.forEach((req, i) => {
      const v = area.checks[i];
      const mark = v === true ? "✓" : v === false ? "✗" : "○";
      lines.push(`  [${mark}] ${req}`);
    });
    lines.push(`  Note: ${area.notes || "—"}`);
    return lines;
  };

  const hr = r.areas.find((a) => a.areaId === "hr_transparency")!;
  const lab = r.areas.find((a) => a.areaId === "content_labeling")!;
  const df = r.areas.find((a) => a.areaId === "deepfake_risk")!;
  const acc = r.areas.find((a) => a.areaId === "accessibility")!;

  const lines = [
    "═══════════════════════════════════════════════════════════",
    "  VALUTAZIONE CONFORMITÀ — LEGGE 132/2025 (AI ITALIA)",
    "═══════════════════════════════════════════════════════════",
    "",
    `  Sistema  : ${r.systemName || "N/D"}`,
    `  Tipo     : ${r.systemType}`,
    `  Data     : ${dateStr}`,
    `  Esito    : ${r.overallStatus.toUpperCase().replace(/_/g, " ")}`,
    "",
    ...areaBlock(
      hr,
      "── AREA 1 — TRASPARENZA HR ──────────────────────────────",
      r.requiresHRNotice
    ),
    "",
    ...areaBlock(
      lab,
      "── AREA 2 — ETICHETTATURA CONTENUTI ─────────────────────",
      true
    ),
    "",
    ...areaBlock(
      df,
      "── AREA 3 — DEEPFAKE / ART. 612-QUATER c.p. ────────────",
      r.isDeepfakeRisk
    ),
    ...(r.isDeepfakeRisk
      ? []
      : ["  Rischio deepfake: No — nessuna esposizione diretta art. 612-quater"]),
    "",
    ...areaBlock(
      acc,
      "── AREA 4 — ACCESSIBILITÀ ───────────────────────────────",
      true
    ),
    "",
    "── PIANO DI REMEDIATION ─────────────────────────────────",
    `  ${r.remediation || "Nessun piano di remediation specificato."}`,
    "",
    "── RIFERIMENTI NORMATIVI ────────────────────────────────",
    "  · Legge 23 settembre 2025, n.132 (G.U. n.223)",
    "  · Art. 612-quater Codice Penale (introdotto da L.132/2025)",
    "  · Reg. UE 2024/1689 — AI Act, Art. 50 (trasparenza)",
    "  · GDPR — Reg. UE 2016/679, Art. 22 (decisioni automatizzate)",
    "  · WCAG 2.1 — Web Content Accessibility Guidelines",
    "  · Garante Privacy — Linee Guida AI in contesti lavorativi (2024)",
    "═══════════════════════════════════════════════════════════",
    "  Generato da AIComply · aicomply.eu",
    "═══════════════════════════════════════════════════════════",
  ];
  return lines.join("\n");
}

function downloadReport(r: L132Result) {
  const text = buildReportText(r);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `l132-compliance-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
  article,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  article: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: "rgba(0,0,0,0.04)" }}
        >
          <Icon className="h-4 w-4" style={{ color: "#0D1016" }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-[14px] font-semibold"
              style={{ color: "#0D1016" }}
            >
              {title}
            </h2>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: "rgba(0,0,0,0.05)",
                color: "rgba(0,0,0,0.45)",
              }}
            >
              {article}
            </span>
          </div>
          <p
            className="text-[12px] mt-0.5 leading-relaxed"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckItem({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 py-2.5 px-3 rounded-lg transition-all"
      style={{
        background:
          value === true
            ? "rgba(22,163,74,0.04)"
            : value === false
            ? "rgba(220,38,38,0.04)"
            : "rgba(0,0,0,0.02)",
        border:
          value === true
            ? "1px solid rgba(22,163,74,0.15)"
            : value === false
            ? "1px solid rgba(220,38,38,0.12)"
            : "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
        <button
          onClick={() => onChange(true)}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
          style={{
            background:
              value === true ? "#15803d" : "rgba(0,0,0,0.06)",
            border: value === true ? "none" : "1.5px solid rgba(0,0,0,0.18)",
          }}
          title="Conforme"
        >
          {value === true && (
            <CheckCircle className="h-3 w-3" style={{ color: "#fff" }} />
          )}
        </button>
        <button
          onClick={() => onChange(false)}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
          style={{
            background:
              value === false ? "#dc2626" : "rgba(0,0,0,0.06)",
            border:
              value === false ? "none" : "1.5px solid rgba(0,0,0,0.18)",
          }}
          title="Non conforme"
        >
          {value === false && (
            <XCircle className="h-3 w-3" style={{ color: "#fff" }} />
          )}
        </button>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: "#0D1016" }}>
        {label}
      </p>
    </div>
  );
}

function NotesField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-3">
      <label
        className="block text-[11px] font-medium mb-1"
        style={{ color: "rgba(0,0,0,0.45)" }}
      >
        Note / documenti di supporto
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function L132Page() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load saved state
  useEffect(() => {
    const saved = readFromStorage<L132Result>("l132");
    if (saved) setForm(resultToForm(saved));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const update = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setSaved(false);
    },
    []
  );

  function setCheck(
    field: "hrChecks" | "labelingChecks" | "deepfakeChecks" | "accessibilityChecks",
    index: number,
    value: boolean
  ) {
    setForm((f) => {
      const arr = [...f[field]] as (boolean | null)[];
      arr[index] = value;
      return { ...f, [field]: arr };
    });
    setSaved(false);
  }

  const result = formToResult(form);
  const statusMeta = STATUS_META[result.overallStatus];

  function handleSave() {
    writeToStorage("l132", result);
    appendEvidence(
      "audit",
      {
        type: "l132_assessment",
        completedAt: result.completedAt,
        overallStatus: result.overallStatus,
        systemName: result.systemName,
      },
      "AIComply L.132/2025 Tool"
    );
    setSaved(true);
    showToast("✓ Valutazione salvata nel Dossier");
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(220,38,38,0.07)" }}
          >
            <Scale className="h-5 w-5" style={{ color: "#dc2626" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[18px] font-semibold"
                style={{ color: "#0D1016" }}
              >
                L.132/2025 — AI Italia
              </h1>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  color: "#dc2626",
                  border: "1px solid rgba(220,38,38,0.15)",
                }}
              >
                In vigore dal 23 set 2025
              </span>
            </div>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "rgba(0,0,0,0.45)" }}
            >
              Legge 23 settembre 2025 n.132 · Normativa AI nazionale italiana
            </p>
            <p
              className="text-[11px] mt-1 leading-relaxed"
              style={{ color: "rgba(0,0,0,0.35)" }}
            >
              Applica a qualsiasi sistema AI utilizzato in Italia. Copre
              trasparenza HR, etichettatura contenuti, media sintetici e
              accessibilità.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sezione 0 — Info sistema ────────────────────────────────────────── */}
      <div className="mb-4 p-5" style={card}>
        <SectionHeader
          icon={FileText}
          title="Informazioni sistema"
          description="Identifica il sistema AI oggetto della valutazione."
          article="Screening"
        />
        <div className="space-y-4">
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: "#0D1016" }}
            >
              Nome del sistema AI
            </label>
            <input
              value={form.systemName}
              onChange={(e) => update("systemName", e.target.value)}
              placeholder="es. Sistema di screening CV automatizzato"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: "#0D1016" }}
            >
              Tipo di sistema
            </label>
            <select
              value={form.systemType}
              onChange={(e) => update("systemType", e.target.value)}
              style={inputStyle}
            >
              {SYSTEM_TYPE_OPTS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-[12px] font-medium mb-2"
              style={{ color: "#0D1016" }}
            >
              Il sistema è utilizzato in Italia o da utenti italiani?
            </label>
            <div className="flex gap-3">
              {(
                [
                  { v: true, label: "Sì" },
                  { v: false, label: "No" },
                ] as { v: boolean; label: string }[]
              ).map(({ v, label }) => (
                <button
                  key={label}
                  onClick={() => update("deployedInItaly", v)}
                  className="px-5 py-2 rounded-lg text-[12px] font-medium transition-all"
                  style={
                    form.deployedInItaly === v
                      ? { background: "#0D1016", color: "#fff" }
                      : {
                          background: "rgba(0,0,0,0.05)",
                          color: "rgba(0,0,0,0.55)",
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {!form.deployedInItaly && (
          <div
            className="mt-4 rounded-lg p-3 flex items-start gap-2"
            style={{
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <Info
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              style={{ color: "#2563eb" }}
            />
            <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.6)" }}>
              La L.132/2025 si applica ai sistemi IA che operano o sono
              accessibili in Italia. Se il sistema non è deployato in Italia,
              questa valutazione non è obbligatoria.
            </p>
          </div>
        )}
      </div>

      {/* ── Sezione 1 — Trasparenza HR ──────────────────────────────────────── */}
      <div className="mb-4 p-5" style={card}>
        <SectionHeader
          icon={Users}
          title="Area 1 — Trasparenza in contesti di lavoro"
          description="Art. 1 L.132/2025 impone di informare candidati e lavoratori quando sistemi AI sono usati in selezione, valutazione delle performance, monitoraggio o decisioni che li riguardano."
          article="Art. 1-2"
        />
        <div
          className="flex items-center gap-2.5 p-3 rounded-lg mb-4 cursor-pointer select-none"
          style={{
            background: form.requiresHRNotice
              ? "rgba(0,0,0,0.03)"
              : "rgba(0,0,0,0.02)",
            border: "1px solid rgba(0,0,0,0.07)",
          }}
          onClick={() => update("requiresHRNotice", !form.requiresHRNotice)}
        >
          <input
            type="checkbox"
            checked={form.requiresHRNotice}
            onChange={() => update("requiresHRNotice", !form.requiresHRNotice)}
            className="rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
            Questo sistema è usato in contesti HR (selezione, valutazione,
            monitoraggio lavoratori)
          </p>
        </div>
        {form.requiresHRNotice && (
          <div className="space-y-2">
            {HR_REQUIREMENTS.map((req, i) => (
              <CheckItem
                key={i}
                label={req}
                value={form.hrChecks[i]}
                onChange={(v) => setCheck("hrChecks", i, v)}
              />
            ))}
            <NotesField
              value={form.hrNotes}
              onChange={(v) => update("hrNotes", v)}
              placeholder="es. Modello di informativa candidati, policy interna HR AI"
            />
          </div>
        )}
        {!form.requiresHRNotice && (
          <p
            className="text-[12px]"
            style={{ color: "rgba(0,0,0,0.35)" }}
          >
            Area non applicabile — il sistema non è usato in contesti HR.
          </p>
        )}
      </div>

      {/* ── Sezione 2 — Etichettatura contenuti ─────────────────────────────── */}
      <div className="mb-4 p-5" style={card}>
        <SectionHeader
          icon={FileText}
          title="Area 2 — Etichettatura contenuti generati da AI"
          description="L'art. 3 L.132/2025, in combinato con Art. 50 EU AI Act, richiede che i contenuti generati o significativamente modificati da AI siano chiaramente identificabili come tali."
          article="Art. 3 + Art. 50 AIA"
        />
        <div className="space-y-2">
          {LABELING_REQUIREMENTS.map((req, i) => (
            <CheckItem
              key={i}
              label={req}
              value={form.labelingChecks[i]}
              onChange={(v) => setCheck("labelingChecks", i, v)}
            />
          ))}
          <NotesField
            value={form.labelingNotes}
            onChange={(v) => update("labelingNotes", v)}
            placeholder="es. Riferimento al sistema di watermarking adottato"
          />
        </div>
      </div>

      {/* ── Sezione 3 — Deepfake ─────────────────────────────────────────────── */}
      <div className="mb-4 p-5" style={card}>
        <SectionHeader
          icon={AlertTriangle}
          title="Area 3 — Media sintetici e Art. 612-quater c.p."
          description="La L.132/2025 ha introdotto l'Art. 612-quater nel Codice Penale italiano: la creazione o diffusione non consensuale di immagini, video o audio deepfake costituisce reato penale (fino a 5 anni). Applicabile anche ai fornitori di strumenti usati per creare deepfake non consensuali."
          article="Art. 612-quater c.p."
        />
        <div
          className="flex items-center gap-2.5 p-3 rounded-lg mb-4 cursor-pointer select-none"
          style={{
            background: form.isDeepfakeRisk
              ? "rgba(220,38,38,0.04)"
              : "rgba(0,0,0,0.02)",
            border: form.isDeepfakeRisk
              ? "1px solid rgba(220,38,38,0.15)"
              : "1px solid rgba(0,0,0,0.07)",
          }}
          onClick={() => update("isDeepfakeRisk", !form.isDeepfakeRisk)}
        >
          <input
            type="checkbox"
            checked={form.isDeepfakeRisk}
            onChange={() => update("isDeepfakeRisk", !form.isDeepfakeRisk)}
            className="rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-[12px] font-medium" style={{ color: "#0D1016" }}>
            Il sistema può generare immagini, video o audio che ritraggono
            persone reali (deepfake, face-swap, voice cloning, ecc.)
          </p>
        </div>
        {form.isDeepfakeRisk ? (
          <>
            <div
              className="rounded-lg p-3 mb-4 flex items-start gap-2"
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              <AlertTriangle
                className="h-4 w-4 flex-shrink-0 mt-0.5"
                style={{ color: "#dc2626" }}
              />
              <p className="text-[11px]" style={{ color: "#7f1d1d" }}>
                <strong>ATTENZIONE — Esposizione penale diretta.</strong>{" "}
                L&apos;art. 612-quater c.p. prevede fino a 5 anni per
                creazione/diffusione non consensuale. Come fornitore dello
                strumento, potresti rispondere in concorso.
              </p>
            </div>
            <div className="space-y-2">
              {DEEPFAKE_REQUIREMENTS.map((req, i) => (
                <CheckItem
                  key={i}
                  label={req}
                  value={form.deepfakeChecks[i]}
                  onChange={(v) => setCheck("deepfakeChecks", i, v)}
                />
              ))}
              <NotesField
                value={form.deepfakeNotes}
                onChange={(v) => update("deepfakeNotes", v)}
                placeholder="es. Valutazione legale effettuata da Studio XYZ in data …"
              />
            </div>
          </>
        ) : (
          <div
            className="rounded-lg p-3 flex items-center gap-2"
            style={{
              background: "rgba(22,163,74,0.06)",
              border: "1px solid rgba(22,163,74,0.15)",
            }}
          >
            <CheckCircle
              className="h-4 w-4 flex-shrink-0"
              style={{ color: "#15803d" }}
            />
            <p className="text-[12px]" style={{ color: "#15803d" }}>
              Non applicabile — nessuna esposizione diretta all&apos;art.
              612-quater.
            </p>
          </div>
        )}
      </div>

      {/* ── Sezione 4 — Accessibilità ─────────────────────────────────────────── */}
      <div className="mb-4 p-5" style={card}>
        <SectionHeader
          icon={Info}
          title="Area 4 — Accessibilità e comunicazione comprensibile"
          description="Art. 4 L.132/2025 richiede che le comunicazioni AI dirette a consumatori e utenti non tecnici siano in linguaggio semplice, comprensibile e accessibile secondo le norme WCAG 2.1."
          article="Art. 4"
        />
        <div className="space-y-2">
          {ACCESSIBILITY_REQUIREMENTS.map((req, i) => (
            <CheckItem
              key={i}
              label={req}
              value={form.accessibilityChecks[i]}
              onChange={(v) => setCheck("accessibilityChecks", i, v)}
            />
          ))}
          <NotesField
            value={form.accessibilityNotes}
            onChange={(v) => update("accessibilityNotes", v)}
            placeholder="es. Audit WCAG 2.1 effettuato in data …, risultati disponibili in …"
          />
        </div>
      </div>

      {/* ── Sezione Esito ────────────────────────────────────────────────────── */}
      <div className="p-5" style={card}>
        <SectionHeader
          icon={CheckCircle}
          title="Esito valutazione"
          description="Riepilogo automatico basato sulle risposte fornite nelle sezioni precedenti."
          article="Riepilogo"
        />

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 text-[13px] font-semibold"
          style={{
            background: statusMeta.bg,
            color: statusMeta.color,
            border: `1px solid ${statusMeta.border}`,
          }}
        >
          {result.overallStatus === "conforme" ? (
            <CheckCircle className="h-4 w-4" />
          ) : result.overallStatus === "non_applicabile" ? (
            <Info className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {statusMeta.label}
        </div>

        {/* Area summary chips */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {result.areas.map((area) => {
            const applicable = area.checks.length > 0;
            const checkedCount = area.checks.filter((c) => c === true).length;
            const total = area.checks.length;
            const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
            return (
              <div
                key={area.areaId}
                className="rounded-lg p-3"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <p
                  className="text-[11px] font-medium mb-1"
                  style={{ color: "#0D1016" }}
                >
                  {area.label}
                </p>
                {applicable ? (
                  <>
                    <div
                      className="w-full h-1.5 rounded-full mb-1"
                      style={{ background: "rgba(0,0,0,0.07)" }}
                    >
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct === 100
                              ? "#15803d"
                              : pct >= 50
                              ? "#d97706"
                              : "#dc2626",
                        }}
                      />
                    </div>
                    <p
                      className="text-[10px]"
                      style={{ color: "rgba(0,0,0,0.4)" }}
                    >
                      {checkedCount}/{total} requisiti
                    </p>
                  </>
                ) : (
                  <p
                    className="text-[10px]"
                    style={{ color: "rgba(0,0,0,0.35)" }}
                  >
                    Non applicabile
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Remediation */}
        <div className="mb-5">
          <label
            className="block text-[12px] font-medium mb-1"
            style={{ color: "#0D1016" }}
          >
            Piano di remediation
          </label>
          <textarea
            value={form.remediation}
            onChange={(e) => update("remediation", e.target.value)}
            placeholder="Descrivi le azioni da intraprendere per raggiungere la piena conformità, con responsabili e scadenze…"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: "#0D1016", color: "#fff" }}
          >
            <CheckCircle className="h-4 w-4" />
            {saved ? "Salvato ✓" : "Salva valutazione"}
          </button>
          <button
            onClick={() => downloadReport(result)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all"
            style={{
              background: "rgba(0,0,0,0.05)",
              color: "#0D1016",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Download className="h-4 w-4" />
            Scarica report .txt
          </button>
        </div>

        {/* Legal note */}
        <div
          className="mt-6 rounded-lg p-4"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <p
            className="text-[12px] font-semibold mb-1"
            style={{ color: "#92400e" }}
          >
            ⚠️ Nota legale — L.132/2025
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "rgba(0,0,0,0.6)" }}
          >
            La Legge 23 settembre 2025 n.132 è in vigore dal giorno della sua
            pubblicazione in G.U. n.223. Le sanzioni per violazione degli
            obblighi di trasparenza HR e etichettatura contenuti possono
            arrivare fino al{" "}
            <strong>3% del fatturato annuo nazionale</strong>. L&apos;art.
            612-quater c.p. prevede{" "}
            <strong>reclusione fino a 5 anni</strong> per i deepfake non
            consensuali. Questa valutazione è generata da AIComply a scopo
            informativo e non sostituisce la consulenza legale specializzata.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-lg z-50"
          style={{ background: "#0D1016", color: "#fff", whiteSpace: "nowrap" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
