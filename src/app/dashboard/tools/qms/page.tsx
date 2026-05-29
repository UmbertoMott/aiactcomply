"use client";

import { Trash2, FileText, CheckCircle, Download, Plus } from "lucide-react";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { QMSResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

const STORAGE_KEY = "qms_sections";
const SYSNAME_KEY = "qms_system_name";

const templateSections = [
  { id: "compliance", title: "Strategia conformità normativa", desc: "Comprese procedure di valutazione e gestione modifiche", art: "Art. 17(1)(a)" },
  { id: "design", title: "Progettazione e controllo", desc: "Tecniche, procedure e interventi per la progettazione del sistema", art: "Art. 17(1)(b)" },
  { id: "development", title: "Sviluppo e garanzia qualità", desc: "Tecniche e procedure per lo sviluppo del sistema", art: "Art. 17(1)(c)" },
  { id: "testing", title: "Procedure di esame, prova e convalida", desc: "Da effettuare prima, durante e dopo lo sviluppo", art: "Art. 17(1)(d)" },
  { id: "specs", title: "Specifiche tecniche e norme", desc: "Norme armonizzate applicate e mezzi per garantire conformità", art: "Art. 17(1)(e)" },
  { id: "data_mgmt", title: "Gestione dati", desc: "Acquisizione, raccolta, analisi, etichettatura, conservazione", art: "Art. 17(1)(f)" },
  { id: "risk", title: "Sistema gestione rischi", desc: "Integrazione del risk management system (Art. 9)", art: "Art. 17(1)(g)" },
  { id: "monitoring", title: "Monitoraggio post-market", desc: "Predisposizione e manutenzione sistema di monitoraggio", art: "Art. 17(1)(h)" },
  { id: "incidents", title: "Segnalazione incidenti", desc: "Procedure relative alla segnalazione di incidenti gravi", art: "Art. 17(1)(i)" },
  { id: "communication", title: "Comunicazione con autorità", desc: "Gestione rapporti con autorità, organismi notificati e stakeholder", art: "Art. 17(1)(j)" },
  { id: "records", title: "Conservazione registrazioni", desc: "Sistemi e procedure per la conservazione della documentazione", art: "Art. 17(1)(k)" },
  { id: "resources", title: "Gestione risorse", desc: "Misure relative alla sicurezza dell'approvvigionamento", art: "Art. 17(1)(l)" },
  { id: "accountability", title: "Quadro di responsabilità", desc: "Responsabilità dirigenza e personale per tutti gli aspetti", art: "Art. 17(1)(m)" },
];

type QMSSection = {
  id: string;
  title: string;
  desc: string;
  art: string;
  content: string;
  completed: boolean;
};

export default function QMSPage() {
  const [sections, setSections] = useState<QMSSection[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as QMSSection[]; }
    catch { return []; }
  });

  const [systemName, setSystemNameState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SYSNAME_KEY) ?? "";
  });

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function setSystemName(v: string) {
    setSystemNameState(v);
    if (typeof window !== "undefined") localStorage.setItem(SYSNAME_KEY, v);
  }

  function persist(next: QMSSection[]) {
    setSections(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addSection(s: typeof templateSections[number]) {
    persist([
      ...sections,
      { id: crypto.randomUUID(), title: s.title, desc: s.desc, art: s.art, content: "", completed: false },
    ]);
  }

  function toggle(id: string) {
    persist(sections.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  }

  function updateContent(id: string, content: string) {
    persist(sections.map((s) => (s.id === id ? { ...s, content } : s)));
  }

  function removeSection(id: string) {
    persist(sections.filter((s) => s.id !== id));
  }

  const completedCount = sections.filter((s) => s.completed).length;
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<QMSResult>("qms")?.completedAt ?? null
  );

  function saveToDossier() {
    if (sections.length === 0) {
      showToast("Aggiungi almeno una sezione prima di salvare nel dossier", "error");
      return;
    }
    const completedAt = new Date().toISOString();
    const postMarketPlanExists = sections.some(
      (s) => s.title.toLowerCase().includes("monitoraggio") && s.completed
    );
    writeToStorage<QMSResult>("qms", {
      qmsDocumentRef: `QMS-${systemName || "AIComply"}-v1.0-${new Date().toISOString().split("T")[0]}`,
      postMarketPlanExists,
      internalReviewCycle: "Trimestrale",
      responsibleManager: "AI Compliance Officer",
      certifications: [],
      completedAt,
    });
    appendEvidence(
      "adr",
      {
        type: "QMS Builder — Sistema Gestione Qualità Art. 17",
        systemName: systemName || "N/D",
        totalSections: sections.length,
        completedSections: completedCount,
        postMarketPlanExists,
        sectionTitles: sections.map((s) => s.title),
        savedAt: completedAt,
      },
      "qms"
    );
    setSavedAt(completedAt);
    showToast("QMS salvato nel dossier");
  }

  function exportQMS() {
    if (sections.length === 0) {
      showToast("Aggiungi almeno una sezione prima di esportare", "error");
      return;
    }
    const report = {
      export_type: "QMS Export — Art. 17 EU AI Act",
      exported_at: new Date().toISOString(),
      regulation: "EU 2024/1689 — Art. 17 (Quality Management System)",
      system_name: systemName || "N/D",
      summary: {
        total_sections: sections.length,
        completed: completedCount,
        completion_rate: sections.length > 0 ? `${Math.round((completedCount / sections.length) * 100)}%` : "0%",
      },
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        article: s.art,
        description: s.desc,
        completed: s.completed,
        content: s.content,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qms-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("SGQ esportato — " + sections.length + " sezioni");
  }

  return (
    <div className="w-full">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva la configurazione QMS nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016" }}>QMS Builder</h1>
        <input
          value={systemName}
          onChange={(e) => setSystemName(e.target.value)}
          placeholder="Nome sistema AI…"
          className="rounded-lg px-3 py-1.5 text-[12px] focus:outline-none"
          style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.09)", color: "#0D1016", width: "200px" }}
        />
      </div>
      <p className="text-sm mb-8" style={{ color: "rgba(0,0,0,0.45)" }}>
        Sistema di Gestione della Qualità — Art. 17 Regolamento UE 2024/1689.
        Documenta politiche, procedure e istruzioni scritte per garantire la
        conformità.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Sezioni", value: sections.length, textColor: "#0D1016" },
          { label: "Completate", value: completedCount, textColor: "#16a34a" },
          { label: "Template", value: templateSections.length, textColor: "#2563eb" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl p-4"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="text-[20px] font-semibold" style={{ color: card.textColor, letterSpacing: "-0.5px" }}>{card.value}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(0,0,0,0.38)" }}>{card.label}</div>
          </div>
        ))}
        <div className="rounded-xl p-4"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <button
            onClick={exportQMS}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            <Download className="h-3 w-3" /> Esporta SGQ
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold mb-4" style={{ color: "#0D1016" }}>
        Aggiungi sezioni QMS
      </h2>
      <div className="grid md:grid-cols-2 gap-2 mb-8">
        {templateSections
          .filter((t) => !sections.find((s) => s.title === t.title))
          .map((t) => (
            <button
              key={t.id}
              onClick={() => addSection(t)}
              className="rounded-lg px-4 py-2.5 text-xs text-left transition-all flex items-center gap-1.5"
              style={{ border: "1px solid rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.5)", background: "#ffffff" }}
            >
              <Plus className="h-3 w-3 shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />
              {t.title}{" "}
              <span style={{ color: "rgba(0,0,0,0.25)" }}>({t.art})</span>
            </button>
          ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {sections.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl p-5"
              style={{
                background: "#ffffff",
                border: s.completed ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: "#2563eb" }} />
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "#0D1016" }}>{s.title}</h3>
                    <p className="text-xs" style={{ color: "rgba(0,0,0,0.45)" }}>{s.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] rounded px-1.5 py-0.5"
                    style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)" }}>
                    {s.art}
                  </span>
                  <button
                    onClick={() => toggle(s.id)}
                    className="text-[10px] font-medium rounded-full px-2 py-0.5 transition-colors"
                    style={s.completed
                      ? { background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a" }
                      : { background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.09)", color: "rgba(0,0,0,0.45)" }}
                  >
                    {s.completed ? "OK" : "Bozza"}
                  </button>
                  <button
                    onClick={() => removeSection(s.id)}
                    className="transition-colors"
                    style={{ color: "rgba(0,0,0,0.3)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={s.content}
                onChange={(e) => updateContent(s.id, e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  border: "1px solid rgba(0,0,0,0.07)",
                  background: "rgba(0,0,0,0.02)",
                  color: "#0D1016",
                }}
                placeholder="Descrivi policy, procedure e istruzioni per questa sezione..."
                rows={3}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <SignOffPanel toolKey="qms" toolLabel="Sistema di Gestione Qualità" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg"
            style={{
              background: toast.type === "error" ? "rgba(220,38,38,0.95)" : "#0D1016",
              color: "#ffffff",
            }}
          >
            {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
