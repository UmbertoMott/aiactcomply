"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Copy, Check, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useUserRole, type UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/hooks/useUserRole";

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemType = "chatbot" | "recommendation" | "content_generation" | "classification" | "other";

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  chatbot:            "Chatbot / Assistente conversazionale",
  recommendation:     "Sistema di raccomandazione",
  content_generation: "Generazione di contenuti",
  classification:     "Sistema di classificazione",
  other:              "Altro",
};

// ─── Snippet templates ────────────────────────────────────────────────────────

function buildHtmlSnippet(systemName: string, systemType: SystemType): string {
  return `<!-- Disclosure AI — Art. 50 EU AI Act -->
<div
  id="ai-disclosure"
  role="banner"
  aria-label="ai-disclosure"
  style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-family:sans-serif;"
>
  <p style="margin:0;font-size:13px;color:#475569;">
    <strong style="color:#0f172a;">Contenuto generato da intelligenza artificiale</strong>
    — Stai interagendo con <strong style="color:#0f172a;">${systemName}</strong>,
    un sistema AI di tipo <em>${SYSTEM_TYPE_LABELS[systemType]}</em>.
    Ai sensi dell'Art. 50 del Regolamento EU AI Act (UE 2024/1689), sei informato
    che questo sistema utilizza intelligenza artificiale.
  </p>
</div>
<!-- Fine disclosure AI -->`;
}

function buildReactSnippet(systemName: string, systemType: SystemType): string {
  return `// AIDisclosure.tsx — Art. 50 EU AI Act
export function AIDisclosure() {
  return (
    <div
      id="ai-disclosure"
      role="banner"
      aria-label="ai-disclosure"
      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-4"
    >
      <p className="text-[13px] text-slate-500 m-0">
        <strong className="text-slate-900">Contenuto generato da intelligenza artificiale</strong>
        {" — "}Stai interagendo con{" "}
        <strong className="text-slate-900">${systemName}</strong>,
        un sistema AI di tipo <em>${SYSTEM_TYPE_LABELS[systemType]}</em>.
        Ai sensi dell&apos;Art. 50 del Regolamento EU AI Act (UE 2024/1689),
        sei informato che questo sistema utilizza intelligenza artificiale.
      </p>
    </div>
  );
}`;
}

function buildWordpressSnippet(systemName: string, systemType: SystemType): string {
  return `<?php
// Aggiungere a functions.php del tema — Disclosure AI Art. 50 EU AI Act
function aicomply_art50_disclosure() {
  $system_name = '${systemName}';
  $system_type = '${SYSTEM_TYPE_LABELS[systemType]}';
  echo '<div id="ai-disclosure" role="banner" aria-label="ai-disclosure"
    style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
    padding:12px 16px;margin-bottom:16px;font-family:sans-serif;">';
  echo '<p style="margin:0;font-size:13px;color:#475569;">';
  echo '<strong style="color:#0f172a;">Contenuto generato da intelligenza artificiale</strong>';
  echo ' — Stai interagendo con <strong style="color:#0f172a;">';
  echo esc_html($system_name);
  echo '</strong>, un sistema AI di tipo <em>';
  echo esc_html($system_type);
  echo '</em>. Ai sensi dell\'Art. 50 del Regolamento EU AI Act (UE 2024/1689), ';
  echo 'sei informato che questo sistema utilizza intelligenza artificiale.';
  echo '</p></div>';
}
add_action('wp_body_open', 'aicomply_art50_disclosure');
?>`;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
      style={{
        background: copied ? "rgba(22,163,74,0.08)" : "#ffffff",
        border: `1px solid ${copied ? "rgba(22,163,74,0.3)" : "rgba(0,0,0,0.1)"}`,
        color: copied ? "#15803d" : "rgba(0,0,0,0.45)",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiato!" : "Copia"}
    </button>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const done   = i < current - 1;
        const active = i === current - 1;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-[11px] font-semibold transition-all"
              style={{
                width: 26,
                height: 26,
                background: done
                  ? "rgba(22,163,74,0.1)"
                  : active
                  ? "#0D1016"
                  : "rgba(0,0,0,0.05)",
                border: `1.5px solid ${
                  done ? "rgba(22,163,74,0.4)" : active ? "#0D1016" : "rgba(0,0,0,0.12)"
                }`,
                color: done ? "#15803d" : active ? "#ffffff" : "rgba(0,0,0,0.3)",
              }}
            >
              {done ? <Check size={11} /> : i + 1}
            </div>
            {i < total - 1 && (
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: done ? "rgba(22,163,74,0.3)" : "rgba(0,0,0,0.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 0: Role selection ───────────────────────────────────────────────────

type Step0Props = { onNext: (role: NonNullable<UserRole>) => void };

const ROLE_ICONS: Record<NonNullable<UserRole>, string> = {
  provider:    "🏗️",
  deployer:    "🚀",
  importer:    "📦",
  distributor: "🔄",
};

const ROLE_ARTICLES: Record<NonNullable<UserRole>, string> = {
  provider:    "Art. 9-15, 43, 49, 72-73",
  deployer:    "Art. 26, 27 (PA), 50",
  importer:    "Art. 23, 43, 49",
  distributor: "Art. 24, 50",
};

function Step0({ onNext }: Step0Props) {
  const [selected, setSelected] = useState<NonNullable<UserRole> | null>(null);
  const roles: NonNullable<UserRole>[] = ["provider", "deployer", "importer", "distributor"];

  return (
    <div>
      <h2 className="text-[22px] font-medium mb-1" style={{ color: "#0D1016", letterSpacing: "-0.6px" }}>
        Qual è il tuo ruolo nel ciclo di vita AI?
      </h2>
      <p className="text-[13px] mb-6" style={{ color: "rgba(0,0,0,0.45)", lineHeight: 1.6 }}>
        Il Regolamento UE 2024/1689 assegna obblighi diversi in base al ruolo.
        Mostreremo solo i tool pertinenti al tuo caso.
      </p>

      <div className="grid grid-cols-1 gap-3 mb-6">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelected(r)}
            className="text-left w-full p-4 rounded-xl transition-all"
            style={{
              background: selected === r ? "rgba(13,16,22,0.04)" : "#ffffff",
              border: selected === r ? "1.5px solid #0D1016" : "1px solid rgba(0,0,0,0.1)",
              boxShadow: selected === r ? "0 0 0 3px rgba(13,16,22,0.06)" : "none",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{ROLE_ICONS[r]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-medium" style={{ color: "#0D1016" }}>
                    {ROLE_LABELS[r]}
                  </span>
                  <span
                    className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}
                  >
                    {ROLE_ARTICLES[r]}
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.5)" }}>
                  {ROLE_DESCRIPTIONS[r]}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-[11px] mb-4" style={{ color: "rgba(0,0,0,0.35)" }}>
        Hai più ruoli? Scegli quello primario. Potrai cambiarlo in seguito dalla dashboard.
      </p>

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onNext(selected)}
        className="w-full py-2.5 rounded-lg text-[13px] font-medium transition-all"
        style={{
          background: selected ? "#0D1016" : "rgba(0,0,0,0.08)",
          color: selected ? "#ffffff" : "rgba(0,0,0,0.3)",
          cursor: selected ? "pointer" : "not-allowed",
        }}
      >
        Continua →
      </button>
    </div>
  );
}

// ─── Step 1: Configure AI system ─────────────────────────────────────────────

type Step1Data = { systemName: string; systemType: SystemType; systemUrl: string };

function Step1({ initialUrl, onNext }: { initialUrl: string; onNext: (data: Step1Data) => void }) {
  const [systemName, setSystemName] = useState("");
  const [systemType, setSystemType] = useState<SystemType>("chatbot");
  const [systemUrl,  setSystemUrl]  = useState(initialUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext({ systemName: systemName.trim() || "Sistema AI", systemType, systemUrl });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          Nome del sistema AI
        </label>
        <input
          type="text"
          value={systemName}
          onChange={e => setSystemName(e.target.value)}
          placeholder="es. Assistente Clienti AI"
          className="w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition-all"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
            color: "#0D1016",
          }}
        />
        <p className="mt-1 text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>
          Questo nome apparirà nella disclosure mostrata agli utenti.
        </p>
      </div>

      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          Tipo di sistema AI
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(SYSTEM_TYPE_LABELS) as SystemType[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setSystemType(key)}
              className="text-left rounded-lg px-3.5 py-2.5 text-[12px] font-medium transition-all"
              style={{
                background: systemType === key ? "#0D1016" : "#ffffff",
                border: `1px solid ${systemType === key ? "#0D1016" : "rgba(0,0,0,0.1)"}`,
                color: systemType === key ? "#ffffff" : "rgba(0,0,0,0.55)",
              }}
            >
              {SYSTEM_TYPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          URL del sito / applicazione
        </label>
        <input
          type="url"
          value={systemUrl}
          onChange={e => setSystemUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-lg px-3.5 py-2.5 text-[13px] outline-none transition-all"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
            color: "#0D1016",
          }}
        />
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-medium transition-all hover:opacity-90"
        style={{ background: "#0D1016", color: "#ffffff" }}
      >
        Continua
        <ChevronRight size={14} />
      </button>
    </form>
  );
}

// ─── Step 2: Install disclosure snippet ──────────────────────────────────────

type SnippetTab = "html" | "react" | "wordpress";

function Step2({ step1: { systemName, systemType }, onNext }: { step1: Step1Data; onNext: () => void }) {
  const [activeTab, setActiveTab] = useState<SnippetTab>("html");

  const snippets: Record<SnippetTab, string> = {
    html:      buildHtmlSnippet(systemName, systemType),
    react:     buildReactSnippet(systemName, systemType),
    wordpress: buildWordpressSnippet(systemName, systemType),
  };

  const TAB_LABELS: Record<SnippetTab, string> = {
    html:      "HTML",
    react:     "React / Next.js",
    wordpress: "WordPress",
  };

  const instructions: Record<SnippetTab, string> = {
    html:      "Inserisci questo snippet all'inizio del <body>, prima del contenuto principale. La disclosure deve essere visibile prima che l'utente interagisca con il sistema AI.",
    react:     "Aggiungi il componente AIDisclosure all'inizio del layout principale o del componente che contiene il sistema AI.",
    wordpress: "Incolla questo codice nel file functions.php del tuo tema. La funzione si aggancia a wp_body_open.",
  };

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}
      >
        {(["html", "react", "wordpress"] as SnippetTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-md py-1.5 text-[12px] font-medium transition-all"
            style={{
              background: activeTab === tab ? "#ffffff" : "transparent",
              color: activeTab === tab ? "#0D1016" : "rgba(0,0,0,0.4)",
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <p className="text-[12px] leading-relaxed" style={{ color: "rgba(0,0,0,0.45)" }}>
        {instructions[activeTab]}
      </p>

      {/* Code block */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          <span className="text-[11px] font-mono" style={{ color: "rgba(0,0,0,0.35)" }}>
            {activeTab === "html" ? "disclosure.html" : activeTab === "react" ? "AIDisclosure.tsx" : "functions.php"}
          </span>
          <CopyButton text={snippets[activeTab]} />
        </div>
        <pre
          className="overflow-x-auto p-4 text-[11px] leading-relaxed font-mono"
          style={{ color: "rgba(0,0,0,0.65)", margin: 0, whiteSpace: "pre-wrap" }}
        >
          {snippets[activeTab]}
        </pre>
      </div>

      {/* Legal note */}
      <div
        className="rounded-lg px-3.5 py-3 text-[11px] leading-relaxed"
        style={{
          background: "rgba(234,179,8,0.06)",
          border: "1px solid rgba(234,179,8,0.25)",
          color: "rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ color: "#b45309", fontWeight: 600 }}>📋 Nota legale —</span>{" "}
        La disclosure deve essere mostrata <em>prima o al momento</em> dell&apos;interazione con il sistema AI,
        in posizione prominente e nella lingua dell&apos;utente (Art. 50(1) + Considerando 132 AI Act).
      </div>

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-medium transition-all hover:opacity-90"
        style={{ background: "#0D1016", color: "#ffffff" }}
      >
        Ho installato la disclosure — Continua
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Step 3: Verify + generate registro ──────────────────────────────────────

function Step3({
  step1,
  originalUrl,
  originalScore,
  originalCritical,
  onFinish,
}: {
  step1: Step1Data;
  originalUrl: string;
  originalScore: string;
  originalCritical: string;
  onFinish: () => void;
}) {
  const [scanning,    setScanning]    = useState(false);
  const [newScore,    setNewScore]    = useState<number | null>(null);
  const [scanError,   setScanError]   = useState("");
  const [downloaded,  setDownloaded]  = useState(false);

  const origScore = parseInt(originalScore) || 0;

  async function handleVerify() {
    if (!step1.systemUrl) return;
    setScanning(true);
    setScanError("");
    try {
      const res  = await fetch("/api/scanner/art50", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: step1.systemUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore scansione");
      setNewScore(data.score ?? 0);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Errore durante la scansione");
    } finally {
      setScanning(false);
    }
  }

  function buildRegistro(): string {
    const now      = new Date();
    const dateStr  = now.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr  = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const improvement = newScore !== null ? newScore - origScore : null;

    return `REGISTRO DI IMPLEMENTAZIONE ART. 50 — EU AI ACT (UE 2024/1689)
${"═".repeat(68)}

Questo documento attesta l'avvio del processo di conformità ai sensi
dell'Art. 50 del Regolamento (UE) 2024/1689 (EU AI Act).

ATTENZIONE: Questo registro non costituisce certificazione di conformità
né parere legale. La conformità completa richiede una valutazione da parte
di un esperto qualificato.

${"─".repeat(68)}
DATI DEL SISTEMA AI
${"─".repeat(68)}

Nome sistema:        ${step1.systemName}
Tipo sistema:        ${SYSTEM_TYPE_LABELS[step1.systemType]}
URL / Applicazione:  ${step1.systemUrl || "(non specificato)"}
Data registrazione:  ${dateStr} ore ${timeStr}

${"─".repeat(68)}
RISULTATI SCANSIONE ART. 50
${"─".repeat(68)}

Punteggio iniziale:  ${origScore}/100${improvement !== null ? `\nPunteggio post-setup: ${newScore}/100\nMiglioramento:       +${improvement} punti` : ""}

${"─".repeat(68)}
AZIONI IMPLEMENTATE
${"─".repeat(68)}

[✓] Disclosure AI configurata nel sistema
[✓] Snippet di disclosure generato e fornito all'operatore
[  ] Verifica in produzione: da completare dall'operatore

${"─".repeat(68)}
RIFERIMENTI NORMATIVI
${"─".repeat(68)}

• Art. 50(1): obbligo disclosure per sistemi a interazione diretta
• Art. 50(1)(a) + Considerando 132: posizione prominente e tempestiva
• Art. 99(3): sanzione fino all'1% del fatturato annuo globale

${"─".repeat(68)}
GENERATO DA: AIComply — https://aicomply.it
${"═".repeat(68)}
`;
  }

  function handleDownload() {
    const content = buildRegistro();
    const blob    = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    const slug    = step1.systemName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30);
    a.href        = url;
    a.download    = `registro-art50-${slug}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  return (
    <div className="space-y-4">
      {/* Score comparison */}
      <div
        className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.07)" }}
      >
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(0,0,0,0.35)" }}>
            Punteggio iniziale
          </p>
          <p
            className="text-2xl font-semibold tabular-nums"
            style={{
              color: origScore >= 70 ? "#16a34a" : origScore >= 50 ? "#ca8a04" : "#dc2626",
              letterSpacing: "-1px",
            }}
          >
            {origScore}
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(0,0,0,0.2)", flexShrink: 0 }} />
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(0,0,0,0.35)" }}>
            {newScore !== null ? "Nuovo punteggio" : "Post-installazione"}
          </p>
          {newScore !== null ? (
            <p
              className="text-2xl font-semibold tabular-nums"
              style={{
                color: newScore >= 70 ? "#16a34a" : newScore >= 50 ? "#ca8a04" : "#dc2626",
                letterSpacing: "-1px",
              }}
            >
              {newScore}
              {newScore > origScore && (
                <span className="text-[12px] ml-1" style={{ color: "#16a34a" }}>
                  +{newScore - origScore}
                </span>
              )}
            </p>
          ) : (
            <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.2)" }}>—</p>
          )}
        </div>
      </div>

      {/* Rescan */}
      {step1.systemUrl && newScore === null && (
        <button
          onClick={handleVerify}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-medium transition-all disabled:opacity-50"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
            color: "rgba(0,0,0,0.6)",
          }}
        >
          {scanning ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-black/10 border-t-black/40 animate-spin" />
              Scansione in corso...
            </>
          ) : (
            <>
              <ExternalLink size={13} />
              Verifica conformità aggiornata
            </>
          )}
        </button>
      )}

      {scanError && (
        <p className="text-[12px] text-center" style={{ color: "#dc2626" }}>{scanError}</p>
      )}

      {/* Registro download */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.18)" }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#15803d" }}>
              Registro di Implementazione Art. 50
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
              Documento .txt con sistema, azioni implementate e riferimenti normativi.
              Non è una certificazione legale.
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-all hover:opacity-80"
          style={{
            background: downloaded ? "rgba(22,163,74,0.12)" : "#ffffff",
            border: `1px solid ${downloaded ? "rgba(22,163,74,0.35)" : "rgba(22,163,74,0.25)"}`,
            color: downloaded ? "#15803d" : "#16a34a",
          }}
        >
          <Download size={13} />
          {downloaded ? "Scaricato — scarica di nuovo" : "Scarica Registro di Implementazione (.txt)"}
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
        Questo registro è indicativo e non sostituisce una valutazione legale professionale.
      </p>

      <button
        onClick={onFinish}
        className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-medium transition-all hover:opacity-90"
        style={{ background: "#0D1016", color: "#ffffff" }}
      >
        Vai alla dashboard
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

function OnboardingWizard() {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const { role: currentRole, setRole } = useUserRole();

  const scanUrl      = decodeURIComponent(searchParams.get("url")      || "");
  const scanScore    = searchParams.get("score")    || "";
  const scanCritical = searchParams.get("critical") || "";
  const changeRole   = searchParams.get("changeRole") === "1";

  const [step,  setStep]  = useState(0);
  const [step1, setStep1] = useState<Step1Data | null>(null);

  const STEP_LABELS = ["Scegli il tuo ruolo", "Configura il sistema", "Installa la disclosure", "Verifica e registro"];

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>
            Conformità Art. 50
            <span className="font-normal ml-1.5" style={{ color: "rgba(0,0,0,0.3)" }}>— setup guidato</span>
          </h1>
          <p className="mt-0.5 text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
            {STEP_LABELS[step]}
          </p>
        </div>
        <StepIndicator current={step + 1} total={4} />
      </div>

      {/* Scan context banner */}
      {scanScore && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3 mb-4"
          style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold"
            style={{
              background: parseInt(scanScore) >= 70 ? "rgba(22,163,74,0.1)" : parseInt(scanScore) >= 50 ? "rgba(234,179,8,0.1)" : "rgba(220,38,38,0.1)",
              color:      parseInt(scanScore) >= 70 ? "#15803d"              : parseInt(scanScore) >= 50 ? "#b45309"             : "#b91c1c",
            }}
          >
            {scanScore}
          </div>
          <div>
            <p className="text-[12px] font-medium" style={{ color: "#1e40af" }}>
              Scansione Art. 50 completata
              {scanCritical && parseInt(scanCritical) > 0
                ? ` — ${scanCritical} ${parseInt(scanCritical) === 1 ? "problema critico" : "problemi critici"} rilevati`
                : ""}
            </p>
            {scanUrl && (
              <p className="text-[11px] truncate" style={{ color: "rgba(30,64,175,0.55)", maxWidth: 340 }}>
                {scanUrl}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Change-role banner */}
      {changeRole && currentRole && step === 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-[12px]"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "rgba(0,0,0,0.5)" }}
        >
          Stai aggiornando il tuo ruolo. Il ruolo attuale è:{" "}
          <strong style={{ color: "#1e40af" }}>{ROLE_LABELS[currentRole]}</strong>.
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      >
        {step === 0 && (
          <Step0 onNext={(r) => { setRole(r); setStep(1); }} />
        )}
        {step === 1 && (
          <Step1 initialUrl={scanUrl} onNext={(data) => { setStep1(data); setStep(2); }} />
        )}
        {step === 2 && step1 && (
          <Step2 step1={step1} onNext={() => setStep(3)} />
        )}
        {step === 3 && step1 && (
          <Step3
            step1={step1}
            originalUrl={scanUrl}
            originalScore={scanScore}
            originalCritical={scanCritical}
            onFinish={() => router.push("/dashboard")}
          />
        )}
      </div>

      {/* Footer */}
      <p className="mt-4 text-[11px] text-center" style={{ color: "rgba(0,0,0,0.28)" }}>
        Puoi saltare questo wizard e tornare in qualsiasi momento da{" "}
        <button
          onClick={() => router.push("/dashboard/tools/art50-kit")}
          className="underline hover:opacity-70 transition-opacity"
          style={{ color: "rgba(0,0,0,0.4)" }}
        >
          Dashboard → Tool → Art. 50 Kit
        </button>
        .
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-black/10 border-t-black/30 animate-spin" />
      </div>
    }>
      <OnboardingWizard />
    </Suspense>
  );
}
