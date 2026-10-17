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
import { useLocale } from "@/i18n/LocaleProvider";

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

// ─── Testi ────────────────────────────────────────────────────────────────────

const TXT = {
  it: {
    title: "Registro dei log",
    sub: "Dimostra che il sistema registra gli eventi in automatico e che i log sono conservati.",
    privacy: "RegulaeOS non riceve né conserva i log del sistema: la conservazione resta a carico del fornitore o del deployer (Artt. 19 e 26(6)).",
    role_q: "Per questo sistema sei",
    provider: "Fornitore", deployer: "Deployer",
    provider_hint: "Hai sviluppato il sistema o lo metti sul mercato con il tuo nome.",
    deployer_hint: "Usi il sistema sotto la tua autorità.",
    q1: "Il sistema registra gli eventi in automatico mentre funziona?",
    q1_ref: "Art. 12(1)",
    yes: "Sì", no: "No", unknown: "Non so",
    q1_no_provider: "È un requisito dei sistemi ad alto rischio: il sistema deve consentire la registrazione automatica degli eventi per tutta la sua durata.",
    q1_no_deployer: "Chiedilo al fornitore: le istruzioni per l'uso devono spiegare come raccogliere, conservare e interpretare i log (Art. 13(3)(f)).",
    q2: "Quali eventi registra?",
    q2_ref: "Art. 12(2)",
    q2_hint_deployer: "Rispondi in base alle istruzioni per l'uso del fornitore.",
    ev_risk_identification: "Errori, anomalie e situazioni che possono creare un rischio o una modifica sostanziale",
    ev_post_market_monitoring: "Dati utili a controllare il funzionamento nel tempo (monitoraggio dopo l'immissione sul mercato)",
    ev_deployer_monitoring: "Dati utili a chi usa il sistema per sorvegliarne il funzionamento",
    q_bio: "È un sistema di identificazione biometrica a distanza?",
    q_bio_ref: "Allegato III, punto 1(a)",
    q_bio_list: "In questo caso i log devono contenere almeno:",
    ev_usage_period: "Data e ora di inizio e fine di ogni utilizzo",
    ev_reference_database: "La banca dati usata per il confronto",
    ev_matched_input_data: "I dati di input che hanno dato una corrispondenza",
    ev_verifier_identity: "Chi ha verificato i risultati (Art. 14(5))",
    q3: "Dove sono conservati i log e chi li custodisce?",
    keeper_q: "Chi conserva i log",
    keeper_us: "Noi", keeper_provider: "Il fornitore", keeper_other: "Un altro soggetto per nostro conto",
    location: "Dove (es. server aziendale, servizio cloud, gestionale del fornitore)",
    responsible: "Persona o funzione responsabile",
    q4: "Per quanto tempo li conservi?",
    q4_ref_provider: "Art. 19(1)", q4_ref_deployer: "Art. 26(6)",
    months: "mesi",
    q4_short: "Il minimo è 6 mesi, salvo norme diverse, in particolare sulla protezione dei dati personali.",
    q4_keeper_provider: "Se i log non sono sotto il tuo controllo l'obbligo di conservazione è del fornitore. Indica comunque per quanto li conserva, se lo sai.",
    q5: "Prova",
    q5_opt: "facoltativa",
    q5_doc: "Documento di riferimento (es. istruzioni per l'uso, cap. 5; procedura interna di conservazione)",
    q5_file: "Carica un estratto di log",
    q5_file_hint: "Il file viene letto solo sul tuo computer e non è inviato a RegulaeOS. Usa un estratto senza dati personali. Formati: .json, .ndjson, .csv, .tsv.",
    sample_entries: "voci", sample_period: "periodo", sample_fields: "campi",
    sample_match: "Campi trovati per gli eventi indicati",
    sample_nomatch: "nessun campo riconosciuto: controlla a mano",
    remove: "Rimuovi",
    err_size: "File troppo grande", err_type: "Formato non supportato", err_empty: "Nessuna voce leggibile nel file", err_read: "Impossibile leggere il file",
    status: "Esito",
    complete: "Completo: puoi salvare nel dossier.",
    missing: "Da completare",
    m_role: "indica il tuo ruolo", m_auto: "conferma che il sistema registra gli eventi", m_events: "indica quali eventi registra",
    m_bio: "rispondi sulla biometria", m_bio_ev: "conferma i dati biometrici richiesti", m_keeper: "indica chi conserva i log",
    m_loc: "indica dove sono conservati", m_months: "indica per quanto tempo", m_min: "porta la conservazione ad almeno 6 mesi",
    save: "Salva nel dossier", saved: "Salvato nel dossier",
    noSystem: "Scegli o aggiungi un sistema per iniziare.",
  },
  en: {
    title: "Log register",
    sub: "Show that the system records events automatically and that logs are kept.",
    privacy: "RegulaeOS does not receive or store the system's logs: keeping them remains the provider's or deployer's duty (Arts. 19 and 26(6)).",
    role_q: "For this system you are the",
    provider: "Provider", deployer: "Deployer",
    provider_hint: "You developed the system or place it on the market under your name.",
    deployer_hint: "You use the system under your authority.",
    q1: "Does the system record events automatically while it runs?",
    q1_ref: "Art. 12(1)",
    yes: "Yes", no: "No", unknown: "Don't know",
    q1_no_provider: "This is a requirement for high-risk systems: the system must allow automatic recording of events over its lifetime.",
    q1_no_deployer: "Ask the provider: the instructions for use must explain how to collect, store and interpret logs (Art. 13(3)(f)).",
    q2: "Which events does it record?",
    q2_ref: "Art. 12(2)",
    q2_hint_deployer: "Answer based on the provider's instructions for use.",
    ev_risk_identification: "Errors, anomalies and situations that may create a risk or a substantial modification",
    ev_post_market_monitoring: "Data to check operation over time (post-market monitoring)",
    ev_deployer_monitoring: "Data that lets the user monitor the system's operation",
    q_bio: "Is it a remote biometric identification system?",
    q_bio_ref: "Annex III, point 1(a)",
    q_bio_list: "In that case logs must contain at least:",
    ev_usage_period: "Start and end date and time of each use",
    ev_reference_database: "The reference database used for matching",
    ev_matched_input_data: "The input data that led to a match",
    ev_verifier_identity: "Who verified the results (Art. 14(5))",
    q3: "Where are logs kept and who keeps them?",
    keeper_q: "Who keeps the logs",
    keeper_us: "Us", keeper_provider: "The provider", keeper_other: "Another party on our behalf",
    location: "Where (e.g. company server, cloud service, provider's platform)",
    responsible: "Responsible person or function",
    q4: "How long do you keep them?",
    q4_ref_provider: "Art. 19(1)", q4_ref_deployer: "Art. 26(6)",
    months: "months",
    q4_short: "The minimum is 6 months, unless other law provides otherwise, in particular data protection law.",
    q4_keeper_provider: "If logs are not under your control the retention duty lies with the provider. Still state how long they keep them, if you know.",
    q5: "Evidence",
    q5_opt: "optional",
    q5_doc: "Reference document (e.g. instructions for use, ch. 5; internal retention procedure)",
    q5_file: "Upload a log excerpt",
    q5_file_hint: "The file is read only on your computer and is not sent to RegulaeOS. Use an excerpt without personal data. Formats: .json, .ndjson, .csv, .tsv.",
    sample_entries: "entries", sample_period: "period", sample_fields: "fields",
    sample_match: "Fields found for the selected events",
    sample_nomatch: "no recognised field: check manually",
    remove: "Remove",
    err_size: "File too large", err_type: "Unsupported format", err_empty: "No readable entries in the file", err_read: "Could not read the file",
    status: "Result",
    complete: "Complete: you can save it to the dossier.",
    missing: "Still to do",
    m_role: "state your role", m_auto: "confirm the system records events", m_events: "state which events it records",
    m_bio: "answer the biometric question", m_bio_ev: "confirm the required biometric data", m_keeper: "state who keeps the logs",
    m_loc: "state where they are kept", m_months: "state how long", m_min: "raise retention to at least 6 months",
    save: "Save to dossier", saved: "Saved to dossier",
    noSystem: "Choose or add a system to start.",
  },
} as const;

type Key = keyof typeof TXT.it;

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function LogRegisterPage() {
  const locale = useLocale();
  const tx = TXT[locale === "en" ? "en" : "it"];
  const t = (k: Key) => tx[k];

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
    const events = rec.events.map((id) => tx[`ev_${id}` as Key] ?? id);
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
              <Check key={id} checked={rec.events.includes(id)} onChange={() => toggleEvent(id)} label={t(`ev_${id}` as Key)} />
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
                  <Check key={id} checked={rec.events.includes(id)} onChange={() => toggleEvent(id)} label={t(`ev_${id}` as Key)} />
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
                  {rec.sample.entryCount.toLocaleString()} {t("sample_entries")} · {t("sample_period")} {fmtDate(rec.sample.from)} – {fmtDate(rec.sample.to)} · {rec.sample.fields.length} {t("sample_fields")}
                </div>
                {matches.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t("sample_match")}</div>
                    {matches.map((m) => (
                      <div key={m.id} style={{ fontSize: 12.5 }}>
                        {t(`ev_${m.id}` as Key)}: {m.found.length ? m.found.join(", ") : t("sample_nomatch")}
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
