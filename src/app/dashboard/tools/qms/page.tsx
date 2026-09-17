"use client";

import { Trash2, FileText, CheckCircle, Download, Plus, Sparkles } from "lucide-react";
import SignOffPanel from "@/components/ui/SignOffPanel";
import { useState, useEffect } from "react";
import { draftQmsSection, QMS_SECTIONS, type QmsSectionId } from "@/app/actions/draftQmsSection";
import { buildComplianceContextFromStorage } from "@/hooks/useComplianceContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { QMSResult, ClassifierResult, RiskManagerResult, DataAuditResult } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { useT } from "@/i18n/LocaleProvider";

const STORAGE_KEY = "qms_sections";
const SYSNAME_KEY = "qms_system_name";

type T = (key: string) => string;

function buildTemplateSections(t: T) {
  return [
    { id: "compliance", title: t("sec_compliance_title"), desc: t("sec_compliance_desc"), art: "Art. 17(1)(a)" },
    { id: "design", title: t("sec_design_title"), desc: t("sec_design_desc"), art: "Art. 17(1)(b)" },
    { id: "development", title: t("sec_development_title"), desc: t("sec_development_desc"), art: "Art. 17(1)(c)" },
    { id: "testing", title: t("sec_testing_title"), desc: t("sec_testing_desc"), art: "Art. 17(1)(d)" },
    { id: "specs", title: t("sec_specs_title"), desc: t("sec_specs_desc"), art: "Art. 17(1)(e)" },
    { id: "data_mgmt", title: t("sec_data_mgmt_title"), desc: t("sec_data_mgmt_desc"), art: "Art. 17(1)(f)" },
    { id: "risk", title: t("sec_risk_title"), desc: t("sec_risk_desc"), art: "Art. 17(1)(g)" },
    { id: "monitoring", title: t("sec_monitoring_title"), desc: t("sec_monitoring_desc"), art: "Art. 17(1)(h)" },
    { id: "incidents", title: t("sec_incidents_title"), desc: t("sec_incidents_desc"), art: "Art. 17(1)(i)" },
    { id: "communication", title: t("sec_communication_title"), desc: t("sec_communication_desc"), art: "Art. 17(1)(j)" },
    { id: "records", title: t("sec_records_title"), desc: t("sec_records_desc"), art: "Art. 17(1)(k)" },
    { id: "resources", title: t("sec_resources_title"), desc: t("sec_resources_desc"), art: "Art. 17(1)(l)" },
    { id: "accountability", title: t("sec_accountability_title"), desc: t("sec_accountability_desc"), art: "Art. 17(1)(m)" },
  ];
}

type QMSSection = {
  id: string;
  tplId?: string;
  title: string;
  desc: string;
  art: string;
  content: string;
  completed: boolean;
};

export default function QMSPage() {
  const t = useT("toolQms");
  const templateSections = buildTemplateSections(t);
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

  function addSection(s: ReturnType<typeof buildTemplateSections>[number]) {
    persist([
      ...sections,
      { id: crypto.randomUUID(), tplId: s.id, title: s.title, desc: s.desc, art: s.art, content: "", completed: false },
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

  // Part 4 — AI draft per section
  const [sectionDrafting, setSectionDrafting] = useState<Record<string, boolean>>({});

  // Map templateSection.art → QmsSectionId (e.g. "Art. 17(1)(a)" → "a")
  function artToQmsId(art: string): QmsSectionId | null {
    const match = art.match(/Art\. 17\(1\)\(([a-m])\)/);
    if (!match) return null;
    const letter = match[1] as QmsSectionId;
    return QMS_SECTIONS.find(s => s.id === letter) ? letter : null;
  }

  async function draftSection(sectionId: string, art: string) {
    const qmsId = artToQmsId(art);
    if (!qmsId) return;
    setSectionDrafting(prev => ({ ...prev, [sectionId]: true }));
    const ctx = buildComplianceContextFromStorage();
    const result = await draftQmsSection(qmsId, ctx);
    setSectionDrafting(prev => ({ ...prev, [sectionId]: false }));
    if (!("error" in result)) {
      updateContent(sectionId, result.content);
    }
  }
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<QMSResult>("qms")?.completedAt ?? null
  );

  // Pre-populate from Classifier, RiskManager, DataAudit on mount
  useEffect(() => {
    const classifier = readFromStorage<ClassifierResult>("classifier");
    const riskManager = readFromStorage<RiskManagerResult>("riskManager");
    const dataAudit = readFromStorage<DataAuditResult>("dataAudit");

    // Pre-populate systemName from classifier
    if (classifier?.systemName && !systemName) {
      setSystemName(classifier.systemName);
    }

    // Pre-populate risk section content from risk manager data
    if (riskManager?.risks?.length) {
      setSections(prev => {
        const riskSection = prev.find(s => s.tplId === "risk" || s.title === "Sistema gestione rischi");
        if (!riskSection || riskSection.content) return prev;
        const summary = `Livello di rischio complessivo: ${riskManager.overallRiskLevel}. ` +
          `${riskManager.risks.length} rischi identificati. ` +
          riskManager.risks
            .slice(0, 3)
            .map(r => `${r.title} (probabilità: ${r.likelihood}, impatto: ${r.impact}, mitigazione: ${r.mitigation})`)
            .join("; ") +
          (riskManager.risks.length > 3 ? "; ..." : ".");
        const next = prev.map(s =>
          (s.tplId === "risk" || s.title === "Sistema gestione rischi") ? { ...s, content: summary } : s
        );
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }

    // Pre-populate data_mgmt section content from data audit data
    if (dataAudit?.datasets?.length) {
      setSections(prev => {
        const dataSection = prev.find(s => s.tplId === "data_mgmt" || s.title === "Gestione dati");
        if (!dataSection || dataSection.content) return prev;
        const personalCount = dataAudit.datasets.filter(d => d.personalData).length;
        const summary = `Qualità complessiva: ${dataAudit.overallQuality}. ` +
          `${dataAudit.datasets.length} dataset analizzati, di cui ${personalCount} con dati personali. ` +
          `Dataset: ${dataAudit.datasets.map(d => d.name).join(", ")}.`;
        const next = prev.map(s =>
          (s.tplId === "data_mgmt" || s.title === "Gestione dati") ? { ...s, content: summary } : s
        );
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveToDossier() {
    if (sections.length === 0) {
      showToast(t("toast_needSave"), "error");
      return;
    }
    const completedAt = new Date().toISOString();
    const postMarketPlanExists = sections.some(
      (s) => (s.tplId === "monitoring" || s.title.toLowerCase().includes("monitoraggio")) && s.completed
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
    showToast(t("toast_saved"));
  }

  function exportQMS() {
    if (sections.length === 0) {
      showToast(t("toast_needExport"), "error");
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
    showToast(t("toast_exported") + " " + sections.length + " " + t("sections_word"));
  }

  return (
    <div className="w-full">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ {t("savedBanner")} {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>{t("seeDossier")}</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>{t("saveHint")}</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            {t("saveBtn")}
          </button>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016" }}>QMS Builder</h1>
        <input
          value={systemName}
          onChange={(e) => setSystemName(e.target.value)}
          placeholder={t("systemName_placeholder")}
          className="rounded-lg px-3 py-1.5 text-[12px] focus:outline-none"
          style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.07)", color: "#0D1016", width: "200px" }}
        />
      </div>
      <p className="text-sm mb-8" style={{ color: "rgba(0,0,0,0.45)" }}>
        {t("subtitle")}
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: t("stat_sections"), value: sections.length, textColor: "#0D1016" },
          { label: t("stat_completed"), value: completedCount, textColor: "#16a34a" },
          { label: t("stat_template"), value: templateSections.length, textColor: "#2563eb" },
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
            <Download className="h-3 w-3" /> {t("export_btn")}
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold mb-4" style={{ color: "#0D1016" }}>
        {t("add_heading")}
      </h2>
      <div className="grid md:grid-cols-2 gap-2 mb-8">
        {templateSections
          .filter((tpl) => !sections.find((s) => (s.tplId ?? s.title) === tpl.id || s.title === tpl.title))
          .map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => addSection(tpl)}
              className="rounded-lg px-4 py-2.5 text-xs text-left transition-all flex items-center gap-1.5"
              style={{ border: "1px solid rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.5)", background: "#ffffff" }}
            >
              <Plus className="h-3 w-3 shrink-0" style={{ color: "rgba(0,0,0,0.3)" }} />
              {tpl.title}{" "}
              <span style={{ color: "rgba(0,0,0,0.25)" }}>({tpl.art})</span>
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
                    <h3 className="text-sm font-semibold" style={{ color: "#0D1016" }}>{s.tplId ? t(`sec_${s.tplId}_title`) : s.title}</h3>
                    <p className="text-xs" style={{ color: "rgba(0,0,0,0.45)" }}>{s.tplId ? t(`sec_${s.tplId}_desc`) : s.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] rounded px-1.5 py-0.5"
                    style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)" }}>
                    {s.art}
                  </span>
                  {/* AI draft button */}
                  {artToQmsId(s.art) && (
                    <button
                      disabled={sectionDrafting[s.id]}
                      onClick={() => draftSection(s.id, s.art)}
                      className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 transition-colors"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#92400e", cursor: sectionDrafting[s.id] ? "wait" : "pointer" }}
                      title={t("ai_title")}
                    >
                      <Sparkles className="h-3 w-3" />
                      {sectionDrafting[s.id] ? "…" : "✦ AI"}
                    </button>
                  )}
                  <button
                    onClick={() => toggle(s.id)}
                    className="text-[10px] font-medium rounded-full px-2 py-0.5 transition-colors"
                    style={s.completed
                      ? { background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a" }
                      : { background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.45)" }}
                  >
                    {s.completed ? t("badge_ok") : t("badge_draft")}
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
                placeholder={t("content_placeholder")}
                rows={3}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <SignOffPanel toolKey="qms" toolLabel={t("signoff_label")} />

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
