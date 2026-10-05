"use client";

import { useState, useEffect } from "react";
import { Download, FileSearch } from "lucide-react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { TransparencyResult, OversightResult, ResilienceResult } from "@/lib/dossier/storage-schema";
import { processTransparencyNotice, type TransparencyNoticeResult } from "@/app/actions/processTransparencyNotice";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { useActiveSystem } from "@/lib/hooks/useActiveSystem";
import { useT, useLocale } from "@/i18n/LocaleProvider";

const card = { background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

// Contenuto minimo delle istruzioni per l'uso — Art. 13(3) Reg. (UE) 2024/1689.
// "optional" = la norma dice "se del caso": va compilato solo se pertinente.
const FIELDS = [
  { id: "a",      ref: "Art. 13(3)(a)",       optional: false },
  { id: "b_i",    ref: "Art. 13(3)(b)(i)",    optional: false },
  { id: "b_ii",   ref: "Art. 13(3)(b)(ii)",   optional: false },
  { id: "b_iii",  ref: "Art. 13(3)(b)(iii)",  optional: false },
  { id: "b_iv",   ref: "Art. 13(3)(b)(iv)",   optional: true },
  { id: "b_v",    ref: "Art. 13(3)(b)(v)",    optional: true },
  { id: "b_vi",   ref: "Art. 13(3)(b)(vi)",   optional: true },
  { id: "b_vii",  ref: "Art. 13(3)(b)(vii)",  optional: true },
  { id: "c",      ref: "Art. 13(3)(c)",       optional: false },
  { id: "d",      ref: "Art. 13(3)(d)",       optional: false },
  { id: "e",      ref: "Art. 13(3)(e)",       optional: false },
  { id: "f",      ref: "Art. 13(3)(f)",       optional: true },
] as const;

type FieldId = typeof FIELDS[number]["id"];
type Fields = Partial<Record<FieldId, string>>;

const filled = (v?: string) => (v ?? "").trim().length > 0;

export default function TransparencyPage() {
  const t = useT("toolTransparency");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const { active } = useActiveSystem();

  const [fields, setFields] = useState<Fields>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeResult, setNoticeResult] = useState<TransparencyNoticeResult | null>(null);
  const [noticeError, setNoticeError] = useState(false);

  // Carica la bozza salvata; altrimenti precompila con quanto già inserito negli altri tool.
  useEffect(() => {
    const saved = readFromStorage<TransparencyResult>("transparency");
    if (saved?.instructions) {
      setFields(saved.instructions as Fields);
      setSavedAt(saved.completedAt);
      return;
    }
    const pre: Fields = {};
    const ovs = readFromStorage<OversightResult>("oversight");
    const res = readFromStorage<ResilienceResult>("resilience");
    if (ovs?.oversightMechanism) pre.d = ovs.oversightMechanism;
    if (res?.accuracyMetric) pre.b_ii = `${res.accuracyMetric}%`;
    setFields(pre);
  }, []);

  // Finalità prevista: se vuota, parte dalla descrizione del sistema nell'inventario.
  useEffect(() => {
    if (active?.description) setFields(f => (filled(f.b_i) ? f : { ...f, b_i: active.description }));
  }, [active?.description]);

  const required = FIELDS.filter(f => !f.optional);
  const requiredDone = required.filter(f => filled(fields[f.id])).length;
  const complete = requiredDone === required.length;
  const isHighRisk = active?.tier === "high_risk";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function save() {
    const completedAt = new Date().toISOString();
    const done = FIELDS.filter(f => filled(fields[f.id])).map(f => f.ref);
    writeToStorage<TransparencyResult>("transparency", {
      userInformedOfAI: complete,
      informationProvided: done,
      contactPoint: fields.a ?? "",
      languagesAvailable: [],
      completedAt,
      instructions: fields,
      systemName: active?.name,
    });
    appendEvidence("decision", {
      type: "Istruzioni per l'uso — Art. 13(3)",
      systemName: active?.name ?? null,
      sectionsCompleted: done,
      complete,
      savedAt: completedAt,
    }, "transparency");
    setSavedAt(completedAt);
    showToast(t("toastSaved"));
  }

  function exportDoc() {
    const lines = [
      `# ${t("docTitle")}${active?.name ? ` — ${active.name}` : ""}`,
      `${t("docBasis")}`,
      "",
      ...FIELDS.flatMap(f => [
        `## ${f.ref} — ${t(`f_${f.id}_label`)}`,
        filled(fields[f.id]) ? fields[f.id]!.trim() : (f.optional ? t("notApplicable") : t("toBeCompleted")),
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `istruzioni-uso-art13-${(active?.name ?? "sistema").replace(/\s+/g, "_").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toastExported"));
  }

  async function analyze() {
    setNoticeLoading(true);
    setNoticeError(false);
    setNoticeResult(null);
    const payload = Object.fromEntries(FIELDS.map(f => [f.ref, fields[f.id] ?? ""]));
    const res = await processTransparencyNotice(payload, active?.name ?? "Sistema di IA");
    setNoticeLoading(false);
    if (res.error || !res.result) setNoticeError(true);
    else setNoticeResult(res.result);
  }

  return (
    <div className="w-full" style={{ fontFamily: "var(--font-inter, system-ui)" }}>
      <SystemSelector checkProhibited={true} />

      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px" }}>
          {t("headerKicker")}
        </p>
        <h1 className="text-[24px] font-medium" style={{ color: "#0D1016", letterSpacing: "-0.8px" }}>{t("h1")}</h1>
        <p className="text-[13px] mt-2 max-w-3xl" style={{ color: "rgba(0,0,0,0.55)", lineHeight: 1.55 }}>{t("intro")}</p>
      </div>

      {/* Chi lo deve fare */}
      <div className="rounded-xl p-4 mb-5 text-[12px] space-y-1.5" style={{ ...card, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>
        <p><strong style={{ color: "#0D1016" }}>{t("whoProviderLabel")}</strong> {t("whoProvider")}</p>
        <p><strong style={{ color: "#0D1016" }}>{t("whoDeployerLabel")}</strong> {t("whoDeployer")}</p>
        <p>
          {t("art50Hint")}{" "}
          <Link href="/dashboard/tools/art50-kit" className="font-medium underline" style={{ color: "#0D1016" }}>{t("art50Link")}</Link>
        </p>
      </div>

      {active && !isHighRisk && (
        <div className="rounded-lg px-4 py-2.5 mb-5 text-[12px]" style={{ background: "rgba(202,138,4,0.06)", border: "1px solid rgba(202,138,4,0.2)", color: "#92400e" }}>
          {t("notHighRiskNote")}
        </div>
      )}

      {/* Stato + azioni */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-2.5 mb-5 text-[12px]" style={card}>
        <span style={{ color: complete ? "#15803d" : "rgba(0,0,0,0.55)" }}>
          {complete ? "✓ " : ""}{t("progress").replace("{done}", String(requiredDone)).replace("{total}", String(required.length))}
        </span>
        {savedAt && (
          <span style={{ color: "rgba(0,0,0,0.4)" }}>· {t("savedOn")} {new Date(savedAt).toLocaleDateString(loc)}</span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={exportDoc} className="flex items-center gap-1 text-[11px] font-medium rounded-full px-3 py-1"
            style={{ background: "#f5f5f4", border: "1px solid rgba(0,0,0,0.08)", color: "#0D1016", cursor: "pointer" }}>
            <Download className="h-3 w-3" /> {t("export")}
          </button>
          <button onClick={save} className="text-[11px] font-medium rounded-full px-3 py-1"
            style={{ background: "#0D1016", color: "#ffffff", border: "none", cursor: "pointer" }}>
            {t("save")}
          </button>
        </div>
      </div>

      {/* Modulo Art. 13(3) */}
      <div className="space-y-3">
        {FIELDS.map(f => (
          <div key={f.id} className="rounded-xl p-4" style={card}>
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.55)" }}>{f.ref}</span>
              <label htmlFor={`f-${f.id}`} className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{t(`f_${f.id}_label`)}</label>
              {f.optional && <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>{t("ifApplicable")}</span>}
              {filled(fields[f.id]) && <span className="text-[11px] ml-auto" style={{ color: "#15803d" }}>✓</span>}
            </div>
            <p className="text-[11px] mb-2" style={{ color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>{t(`f_${f.id}_help`)}</p>
            <textarea
              id={`f-${f.id}`}
              value={fields[f.id] ?? ""}
              onChange={e => setFields(prev => ({ ...prev, [f.id]: e.target.value }))}
              rows={3}
              className="w-full text-[12px] rounded-lg px-3 py-2"
              style={{ border: "1px solid rgba(0,0,0,0.1)", resize: "vertical", fontFamily: "inherit", background: "#fff" }}
            />
          </div>
        ))}
      </div>

      {/* Revisione AI opzionale */}
      <div className="mt-6 rounded-xl p-4" style={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSearch size={15} style={{ color: "rgba(0,0,0,0.4)" }} />
            <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{t("noticeAnalyzerTitle")}</span>
          </div>
          <button disabled={noticeLoading || requiredDone < 2} onClick={analyze}
            className="text-[11px] font-medium rounded-full px-3 py-1.5"
            style={{
              background: noticeLoading || requiredDone < 2 ? "rgba(0,0,0,0.07)" : "#0D1016",
              color: noticeLoading || requiredDone < 2 ? "rgba(0,0,0,0.4)" : "#fff",
              border: "none", cursor: noticeLoading || requiredDone < 2 ? "not-allowed" : "pointer",
            }}>
            {noticeLoading ? t("analyzing") : t("analyzeNotice")}
          </button>
        </div>
        <p className="text-[11px] mt-1" style={{ color: "rgba(0,0,0,0.45)" }}>{t("noticeAnalyzerDesc")}</p>
        {noticeError && <p className="text-[11px] mt-2" style={{ color: "#dc2626" }}>{t("analysisError")}</p>}
        {noticeResult && (
          <div className="mt-3 space-y-2">
            <p className="text-[12px]" style={{ color: "#0D1016" }}>{noticeResult.overallAssessment}</p>
            {noticeResult.missingFields.map((m, i) => (
              <div key={i} className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "rgba(202,138,4,0.05)", border: "1px solid rgba(202,138,4,0.18)" }}>
                <strong style={{ color: "#0D1016" }}>{m.article} — {m.field}</strong>
                <span style={{ color: "rgba(0,0,0,0.5)" }}> · {m.reason}</span>
              </div>
            ))}
            {noticeResult.suggestedImprovements.map((s, i) => (
              <p key={i} className="text-[11px]" style={{ color: "rgba(0,0,0,0.55)" }}>• {s}</p>
            ))}
            <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>{t("aiVerify")}</p>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[12px] font-medium shadow-lg" style={{ background: "#0D1016", color: "#fff" }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
