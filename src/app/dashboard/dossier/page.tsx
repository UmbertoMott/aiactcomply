"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileArchive, CheckCircle, AlertTriangle, XCircle,
  ChevronRight, X, Printer, Eye, RefreshCw, Download, Edit2,
} from "lucide-react";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { aggregateDossier, getDossierSections, getCompletionPercentage, getCompletedCount } from "@/lib/dossier/dossier-engine";
import type { DossierData } from "@/lib/dossier/storage-schema";
import type { DossierSection } from "@/lib/dossier/dossier-engine";
import dynamic from "next/dynamic";

const DossierPreview = dynamic(
  () => import("@/components/dossier/DossierPreview"),
  { ssr: false }
);

// ─── Design tokens ────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const font = { fontFamily: "var(--font-inter, system-ui)" };

// ─── Status icon ──────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: DossierSection["status"] }) {
  if (status === "complete")
    return <CheckCircle size={14} strokeWidth={1.5} style={{ color: "#15803d", flexShrink: 0 }} />;
  if (status === "partial")
    return <AlertTriangle size={14} strokeWidth={1.5} style={{ color: "#d97706", flexShrink: 0 }} />;
  return <XCircle size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.2)", flexShrink: 0 }} />;
}

// ─── Progress ring (SVG) ─────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "#15803d" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
      <circle cx={44} cy={44} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={6} />
      <circle
        cx={44} cy={44} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={44} y={44} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 18, fontWeight: 700, fill: "#0D1016", fontFamily: "system-ui" }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── Print trigger ────────────────────────────────────────────────────────────
function triggerPrint(data: DossierData) {
  // Inject preview into dossier-print-root then print
  const root = document.getElementById("dossier-print-root");
  if (!root) return;
  // DossierPreview is already rendered there (hidden via CSS)
  // We just call print — the CSS shows it
  window.print();
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DossierPage() {
  const [data, setData]           = useState<DossierData | null>(null);
  const [sections, setSections]   = useState<DossierSection[]>([]);
  const [pct, setPct]             = useState(0);
  const [done, setDone]           = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaCompany, setMetaCompany] = useState("");
  const [metaSystem, setMetaSystem]   = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function loadDossier() {
    const d = aggregateDossier();
    const s = getDossierSections(d);
    setData(d);
    setSections(s);
    setPct(getCompletionPercentage(s));
    setDone(getCompletedCount(s));
    setMetaCompany(d.meta.companyName);
    setMetaSystem(d.meta.systemName);
  }

  useEffect(() => {
    loadDossier();
  }, []);

  const handlePrint = useCallback(() => {
    if (!data) return;
    appendEvidence(
      "adr",
      {
        type: "Dossier di Compliance — Stampa/Export PDF",
        systemName: data.meta.systemName,
        companyName: data.meta.companyName,
        completionPct: pct,
        sectionsComplete: done,
        sectionsTotal: sections.length,
        printedAt: new Date().toISOString(),
      },
      "dossier"
    );
    triggerPrint(data);
  }, [data, pct, done, sections.length]);

  function handleExportJSON() {
    if (!data) return;
    const exportPayload = {
      export_type: "AIComply Dossier Export — Reg. UE 2024/1689",
      exported_at: new Date().toISOString(),
      meta: data.meta,
      completion: { pct, done, total: sections.length },
      sections: sections.map((s) => ({
        id: s.id,
        article: s.article,
        title: s.title,
        status: s.status,
        completedAt: s.completedAt ?? null,
      })),
      data,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier-${data.meta.systemName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    appendEvidence(
      "adr",
      {
        type: "Dossier di Compliance — Export JSON",
        systemName: data.meta.systemName,
        completionPct: pct,
        exportedAt: new Date().toISOString(),
      },
      "dossier"
    );
    showToast("Dossier esportato come JSON");
  }

  function handleSaveMeta() {
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem("aicomply_onboarding_data") ?? "{}");
      localStorage.setItem("aicomply_onboarding_data", JSON.stringify({
        ...existing,
        companyName: metaCompany,
        systemName: metaSystem,
      }));
    }
    setEditingMeta(false);
    loadDossier();
    showToast("Dati aggiornati");
  }

  if (!data) {
    return (
      <div className="w-full" style={font}>
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />
      </div>
    );
  }

  return (
    <>
      {/* ── Hidden print root — populated with DossierPreview ── */}
      <div id="dossier-print-root" aria-hidden="true">
        <DossierPreview data={data} />
      </div>

      {/* ── Fullscreen modal preview ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div className="min-h-full flex flex-col items-center py-8 px-4">
            {/* Modal header */}
            <div
              className="w-full max-w-3xl flex items-center justify-between mb-4 rounded-xl px-4 py-2.5 flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                Anteprima Dossier — {data.meta.systemName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-85"
                  style={{ background: "#3b82f6", color: "#ffffff", border: "none", cursor: "pointer" }}
                >
                  <Printer size={12} /> Stampa
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
                  style={{ width: 28, height: 28, background: "rgba(255,255,255,0.1)", color: "#ffffff", border: "none", cursor: "pointer" }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* Document */}
            <div
              className="w-full max-w-3xl rounded-xl overflow-hidden"
              style={{ background: "#ffffff", boxShadow: "0 32px 64px rgba(0,0,0,0.5)" }}
            >
              <DossierPreview data={data} />
            </div>
          </div>
        </div>
      )}

      {/* ── Page ── */}
      <div className="w-full" style={font}>
        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
            style={{ background: "#0D1016", color: "#ffffff" }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <FileArchive size={20} strokeWidth={1.5} style={{ color: "#0D1016" }} />
              <h1 style={{ fontSize: "28px", fontWeight: 400, letterSpacing: "-1px", color: "#0D1016" }}>
                Dossier di Compliance
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { loadDossier(); showToast("Dossier aggiornato"); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-75 transition-opacity"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.55)", cursor: "pointer" }}
              >
                <RefreshCw size={11} /> Aggiorna
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-75 transition-opacity"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.55)", cursor: "pointer" }}
              >
                <Download size={11} /> Esporta JSON
              </button>
            </div>
          </div>

          {/* Meta: company + system name con edit inline */}
          {editingMeta ? (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <input
                value={metaCompany}
                onChange={(e) => setMetaCompany(e.target.value)}
                placeholder="Nome azienda"
                className="rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none"
                style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016", width: "180px" }}
              />
              <input
                value={metaSystem}
                onChange={(e) => setMetaSystem(e.target.value)}
                placeholder="Nome sistema AI"
                className="rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none"
                style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.1)", color: "#0D1016", width: "200px" }}
              />
              <button onClick={handleSaveMeta} className="text-[11px] font-medium rounded-full px-3 py-1"
                style={{ background: "#0D1016", color: "#ffffff", cursor: "pointer" }}>Salva</button>
              <button onClick={() => setEditingMeta(false)} className="text-[11px]"
                style={{ color: "rgba(0,0,0,0.4)", cursor: "pointer", background: "none", border: "none" }}>Annulla</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.42)" }}>
                {data?.meta.companyName ?? "—"} · {data?.meta.systemName ?? "—"} · Regolamento UE 2024/1689
              </p>
              <button onClick={() => setEditingMeta(true)} title="Modifica"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <Edit2 size={11} style={{ color: "rgba(0,0,0,0.3)" }} />
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── Left column: status ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {/* Progress ring card */}
            <div className="rounded-xl p-5" style={card}>
              <div className="flex items-center gap-4 mb-3">
                <ProgressRing pct={pct} />
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>Completamento</p>
                  <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                    {done} di {sections.length} sezioni complete
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct >= 80 ? "#15803d" : pct >= 40 ? "#d97706" : "#dc2626" }}
                />
              </div>
            </div>

            {/* Section list */}
            <div className="rounded-xl overflow-hidden" style={card}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
                  Sezioni
                </p>
              </div>
              <div className="py-1">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-start gap-2.5 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <StatusIcon status={s.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: "rgba(0,0,0,0.3)" }}>{s.article}</span>
                        <span className="text-[11px] font-medium truncate" style={{ color: "#0D1016" }}>{s.title}</span>
                      </div>
                      {s.status === "complete" && s.completedAt ? (
                        <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.3)" }}>
                          {new Date(s.completedAt).toLocaleDateString("it-IT")}
                        </p>
                      ) : s.status !== "complete" ? (
                        <Link
                          href={s.href}
                          className="text-[10px] font-medium transition-opacity hover:opacity-70"
                          style={{ color: "#3b82f6" }}
                        >
                          Completa ora →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div
              className="rounded-xl p-4 text-[11px] leading-relaxed"
              style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}
            >
              <p className="font-semibold mb-1" style={{ color: "rgba(0,0,0,0.6)" }}>Sezioni obbligatorie per sistemi ad alto rischio:</p>
              <p className="mb-2">Art. 9, 10, 11, 12, 13, 14, 15, 17</p>
              <p className="font-semibold mb-1" style={{ color: "rgba(0,0,0,0.6)" }}>Consigliate per tutti i sistemi:</p>
              <p>Art. 5, 6</p>
            </div>

            {/* CTA buttons */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-[13px] font-medium transition-all hover:opacity-90"
              style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}
            >
              <Printer size={14} />
              Genera e Stampa Dossier PDF
            </button>
            <p className="text-[10px] text-center" style={{ color: "rgba(0,0,0,0.3)", marginTop: -8 }}>
              Il browser aprirà la finestra di stampa. Seleziona &quot;Salva come PDF&quot; per salvare.
            </p>

            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[12px] font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
            >
              <Eye size={13} />
              Anteprima dossier
            </button>
          </div>

          {/* ── Right column: scaled preview ── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1px" }}>
                Anteprima — A4
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
                style={{ color: "rgba(0,0,0,0.35)", background: "none", border: "none", cursor: "pointer" }}
              >
                Espandi <ChevronRight size={10} />
              </button>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#e5e7eb", padding: 16, minHeight: 640 }}
            >
              {/* Scaled document */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 4,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  transformOrigin: "top left",
                  transform: "scale(0.58)",
                  width: "172%",   // 100/0.58 ≈ 172 — compensate for scale
                  pointerEvents: "none",
                  userSelect: "none",
                  overflow: "hidden",
                }}
              >
                <DossierPreview data={data} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
