"use client";

// Registro dei log — Artt. 12, 19 e 26(6) Reg. (UE) 2024/1689
// Testi verificati sul testo ufficiale IT; non modificati dal Reg. (UE) 2026/1744.
//
// Il tool raccoglie la PROVA che il sistema registra gli eventi e che i log
// sono conservati. RegulaeOS non riceve e non conserva i log: l'eventuale
// estratto caricato come prova è letto solo nel browser e non viene inviato
// ai server (se ne salvano solo nome file, numero di voci, periodo e nomi dei campi).

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Upload, X } from "lucide-react";
import { INK, LINE, fieldStyle as input, ToolHeader, Choice, CheckRow as Check, Note, Step, PrimaryButton, SecondaryButton } from "@/components/tools/ToolUi";
import { writeToStorage } from "@/lib/dossier/storage-schema";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { analyzeLogSet, MAX_LOG_FILE_BYTES } from "@/lib/logvault/log-analyzer";
import { FIELD_NAME_HINTS } from "@/lib/logvault/traceability-purposes";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { useActiveSystem } from "@/lib/hooks/useActiveSystem";
import { useScopedStorage } from "@/lib/hooks/useScopedStorage";
import { useLocale, useT } from "@/i18n/LocaleProvider";

// ─── Modello dati (solo risposte e riepilogo della prova, mai log grezzi) ─────

type YesNo = "yes" | "no" | "unknown" | "";
type Role = "provider" | "deployer" | "";
type Keeper = "us" | "provider" | "other" | "";

interface SampleSummary {
  fileName: string;
  entryCount: number;
  fields: string[];
  from?: string;
  to?: string;
}

interface LogRecord {
  role: Role;
  automatic: YesNo;
  events: string[];          // id finalità Art. 12(2) e, se biometrico, Art. 12(3)
  biometric: YesNo;
  keeper: Keeper;
  location: string;
  responsible: string;
  months: string;            // testo per non perdere l'input parziale
  proofDoc: string;          // documento di riferimento (es. istruzioni per l'uso)
  sample: SampleSummary | null;
  savedAt?: string;
}

const EMPTY: LogRecord = {
  role: "", automatic: "", events: [], biometric: "", keeper: "",
  location: "", responsible: "", months: "", proofDoc: "", sample: null,
};

const PURPOSES = ["risk_identification", "post_market_monitoring", "deployer_monitoring"] as const;
const BIOMETRIC = ["usage_period", "reference_database", "matched_input_data", "verifier_identity"] as const;

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function LogRegisterPage() {
  const locale = useLocale();
  // Testi in src/i18n/tools/deployer_ops.ts (namespace "deployer_ops_logvault")
  const t = useT("deployer_ops_logvault");

  const { active } = useActiveSystem();
  const [rec, setRec] = useScopedStorage<LogRecord>("logregister", EMPTY);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ruolo proposto dall'inventario, modificabile
  useEffect(() => {
    if (!rec.role && (active?.role === "provider" || active?.role === "deployer")) {
      setRec((r) => ({ ...r, role: active.role as Role }));
    }
  }, [active?.role, rec.role, setRec]);

  function patch(p: Partial<LogRecord>) {
    setJustSaved(false);
    setRec((r) => ({ ...r, ...p }));
  }
  function toggleEvent(id: string) {
    patch({ events: rec.events.includes(id) ? rec.events.filter((e) => e !== id) : [...rec.events, id] });
  }

  async function onFile(file: File) {
    setFileError(null);
    if (file.size > MAX_LOG_FILE_BYTES) { setFileError(`${t("err_size")} (max ${Math.round(MAX_LOG_FILE_BYTES / 1024 / 1024)} MB)`); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["json", "ndjson", "jsonl", "csv", "tsv"].includes(ext)) { setFileError(t("err_type")); return; }
    setReading(true);
    try {
      // Lettura e analisi solo nel browser: le voci non lasciano il dispositivo e non vengono salvate.
      const { logSet } = await analyzeLogSet(crypto.randomUUID(), file.name, await file.text());
      if (logSet.entryCount === 0) { setFileError(t("err_empty")); return; }
      patch({ sample: { fileName: file.name, entryCount: logSet.entryCount, fields: logSet.detectedFields, from: logSet.dateRangeStart, to: logSet.dateRangeEnd } });
    } catch {
      setFileError(t("err_read"));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Stato ──
  const isProvider = rec.role === "provider";
  const monthsNum = Number(rec.months.replace(",", "."));
  const monthsSet = rec.months.trim() !== "" && Number.isFinite(monthsNum) && monthsNum > 0;
  const retentionDutyIsOurs = isProvider || rec.keeper !== "provider";
  const tooShort = monthsSet && monthsNum < 6 && retentionDutyIsOurs;
  const bioEventsOk = rec.biometric !== "yes" || BIOMETRIC.every((b) => rec.events.includes(b));

  const missing: string[] = [];
  if (!rec.role) missing.push(t("m_role"));
  if (rec.automatic !== "yes") missing.push(t("m_auto"));
  if (!PURPOSES.some((p) => rec.events.includes(p))) missing.push(t("m_events"));
  if (!rec.biometric || rec.biometric === "unknown") missing.push(t("m_bio"));
  if (!bioEventsOk) missing.push(t("m_bio_ev"));
  if (!rec.keeper) missing.push(t("m_keeper"));
  if (!rec.location.trim()) missing.push(t("m_loc"));
  if (!monthsSet && retentionDutyIsOurs) missing.push(t("m_months"));
  if (tooShort) missing.push(t("m_min"));
  const complete = missing.length === 0;

  const stepDone = {
    role: !!rec.role,
    auto: rec.automatic === "yes",
    events: PURPOSES.some((p) => rec.events.includes(p)) && !!rec.biometric && rec.biometric !== "unknown" && bioEventsOk,
    where: !!rec.keeper && !!rec.location.trim(),
    months: (monthsSet || !retentionDutyIsOurs) && !tooShort,
    proof: !!rec.sample || !!rec.proofDoc.trim(),
  };

  // Campi dell'estratto che sembrano coprire gli eventi indicati (solo suggerimento)
  const matches = rec.sample
    ? rec.events.map((id) => {
        const hints = FIELD_NAME_HINTS[id] ?? [];
        const found = rec.sample!.fields.filter((f) => hints.some((h) => f.toLowerCase().includes(h)));
        return { id, found };
      })
    : [];

  async function save() {
    const now = new Date().toISOString();
    const events = rec.events.map((id) => { const k = `ev_${id}`; const v = t(k); return v === k ? id : v; });
    writeToStorage("logvault", {
      loggingEnabled: rec.automatic === "yes",
      retentionDays: monthsSet ? Math.round(monthsNum * 30) : 0,
      loggedEvents: events,
      storageLocation: rec.location.trim(),
      accessControl: rec.responsible.trim(),
      completedAt: now,
    });
    await appendEvidence("log", {
      type: "Registro dei log — Artt. 12, 19, 26(6)",
      system: active?.name ?? "",
      role: rec.role,
      automaticLogging: rec.automatic,
      events,
      biometric: rec.biometric,
      keeper: rec.keeper,
      storageLocation: rec.location.trim(),
      responsible: rec.responsible.trim(),
      retentionMonths: monthsSet ? monthsNum : null,
      referenceDocument: rec.proofDoc.trim() || null,
      sample: rec.sample ? { file: rec.sample.fileName, entries: rec.sample.entryCount, fields: rec.sample.fields.length, from: rec.sample.from ?? null, to: rec.sample.to ?? null } : null,
      savedAt: now,
    }, "logvault");
    setRec((r) => ({ ...r, savedAt: now }));
    setJustSaved(true);
  }

  const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT") : "?");

  return (
    <div style={{ maxWidth: 760, color: INK }}>
      <ToolHeader title={t("title")} subtitle={t("sub")} note={t("privacy")} />

      <SystemSelector checkProhibited={false} />

      {!active ? (
        <p style={{ fontSize: 13 }}>{t("noSystem")}</p>
      ) : (
        <>
          <Step n={1} title={t("role_q")} done={stepDone.role}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Choice active={rec.role === "provider"} onClick={() => patch({ role: "provider" })}>{t("provider")}</Choice>
              <Choice active={rec.role === "deployer"} onClick={() => patch({ role: "deployer" })}>{t("deployer")}</Choice>
            </div>
            {rec.role && <Note>{t(isProvider ? "provider_hint" : "deployer_hint")}</Note>}
          </Step>

          <Step n={2} title={t("q1")} refText={t("q1_ref")} done={stepDone.auto}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["yes", "no", "unknown"] as const).map((v) => (
                <Choice key={v} active={rec.automatic === v} onClick={() => patch({ automatic: v })}>{t(v)}</Choice>
              ))}
            </div>
            {(rec.automatic === "no" || rec.automatic === "unknown") && (
              <Note warn>{t(isProvider ? "q1_no_provider" : "q1_no_deployer")}</Note>
            )}
          </Step>

          <Step n={3} title={t("q2")} refText={t("q2_ref")} done={stepDone.events}>
            {!isProvider && rec.role && <Note>{t("q2_hint_deployer")}</Note>}
            {PURPOSES.map((id) => (
              <Check key={id} checked={rec.events.includes(id)} onChange={() => toggleEvent(id)} label={t(`ev_${id}`)} />
            ))}
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: 13, margin: "0 0 8px" }}>
                {t("q_bio")} <span style={{ fontSize: 11, marginLeft: 6 }}>{t("q_bio_ref")}</span>
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["no", "yes", "unknown"] as const).map((v) => (
                  <Choice key={v} active={rec.biometric === v} onClick={() => patch({ biometric: v })}>{t(v)}</Choice>
                ))}
              </div>
            </div>
            {rec.biometric === "yes" && (
              <>
                <Note>{t("q_bio_list")} <span style={{ fontSize: 11 }}>Art. 12(3)</span></Note>
                {BIOMETRIC.map((id) => (
                  <Check key={id} checked={rec.events.includes(id)} onChange={() => toggleEvent(id)} label={t(`ev_${id}`)} />
                ))}
              </>
            )}
          </Step>

          <Step n={4} title={t("q3")} done={stepDone.where}>
            <p style={{ fontSize: 13, margin: 0 }}>{t("keeper_q")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Choice active={rec.keeper === "us"} onClick={() => patch({ keeper: "us" })}>{t("keeper_us")}</Choice>
              {!isProvider && <Choice active={rec.keeper === "provider"} onClick={() => patch({ keeper: "provider" })}>{t("keeper_provider")}</Choice>}
              <Choice active={rec.keeper === "other"} onClick={() => patch({ keeper: "other" })}>{t("keeper_other")}</Choice>
            </div>
            <input style={input} placeholder={t("location")} aria-label={t("location")} value={rec.location} onChange={(e) => patch({ location: e.target.value })} />
            <input style={input} placeholder={t("responsible")} aria-label={t("responsible")} value={rec.responsible} onChange={(e) => patch({ responsible: e.target.value })} />
          </Step>

          <Step n={5} title={t("q4")} refText={t(isProvider ? "q4_ref_provider" : "q4_ref_deployer")} done={stepDone.months}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                style={{ ...input, width: 90 }} inputMode="decimal" aria-label={t("months")}
                value={rec.months} onChange={(e) => patch({ months: e.target.value.replace(/[^\d.,]/g, "") })}
              />
              <span style={{ fontSize: 13 }}>{t("months")}</span>
            </div>
            {!retentionDutyIsOurs ? <Note>{t("q4_keeper_provider")}</Note> : <Note warn={tooShort}>{t("q4_short")}</Note>}
          </Step>

          <Step n={6} title={`${t("q5")} (${t("q5_opt")})`} done={stepDone.proof}>
            <input style={input} placeholder={t("q5_doc")} aria-label={t("q5_doc")} value={rec.proofDoc} onChange={(e) => patch({ proofDoc: e.target.value })} />
            {!rec.sample ? (
              <div>
                <SecondaryButton onClick={() => fileRef.current?.click()} disabled={reading}>
                  <Upload size={14} /> {t("q5_file")}
                </SecondaryButton>
                <input
                  ref={fileRef} type="file" accept=".json,.ndjson,.jsonl,.csv,.tsv" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
                />
                <Note>{t("q5_file_hint")}</Note>
                {fileError && <Note warn>{fileError}</Note>}
              </div>
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontWeight: 600 }}>{rec.sample.fileName}</strong>
                  <button type="button" onClick={() => patch({ sample: null })} aria-label={t("remove")} title={t("remove")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: INK, padding: 2, display: "inline-flex" }}>
                    <X size={14} />
                  </button>
                </div>
                <div>
                  {rec.sample.entryCount.toLocaleString(locale === "en" ? "en-GB" : "it-IT")} {t("sample_entries")} · {t("sample_period")} {fmtDate(rec.sample.from)} – {fmtDate(rec.sample.to)} · {rec.sample.fields.length} {t("sample_fields")}
                </div>
                {matches.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t("sample_match")}</div>
                    {matches.map((m) => (
                      <div key={m.id} style={{ fontSize: 12.5 }}>
                        {t(`ev_${m.id}`)}: {m.found.length ? m.found.join(", ") : t("sample_nomatch")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Step>

          <section style={{ padding: "20px 0", borderTop: `1px solid ${LINE}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{t("status")}</h2>
            {complete ? (
              <Note>{t("complete")}</Note>
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <span>{t("missing")}: </span>{missing.join(" · ")}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <PrimaryButton onClick={() => void save()} disabled={!complete}>{t("save")}</PrimaryButton>
              {(justSaved || rec.savedAt) && (
                <span style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} color="#15803d" /> {t("saved")}{rec.savedAt ? ` · ${fmtDate(rec.savedAt)}` : ""}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
