"use client";

// Importatori e distributori — Artt. 23, 24 Reg. (UE) 2024/1689
// (con Artt. 20(1), 25(1), 47, 48 e 79(1) per le parti collegate).
// Testi verificati sul testo ufficiale IT; gli Artt. 20, 23, 24 e 48 non sono
// modificati dal Reg. (UE) 2026/1744, che cambia invece l'Art. 2(2)
// (Allegato I, sezione B) e le date dell'Art. 113.

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Plus, X } from "lucide-react";
import { INK, LINE, fieldStyle as input, ToolHeader, Choice, CheckRow as Check, Note, Step, PrimaryButton, SecondaryButton } from "@/components/tools/ToolUi";
import { appendEvidence } from "@/lib/evidence/evidence-layer";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { useActiveSystem } from "@/lib/hooks/useActiveSystem";
import { useScopedStorage } from "@/lib/hooks/useScopedStorage";
import { assessRisk, isHighRisk } from "@/lib/obligations/engine";
import { useLocale, useT } from "@/i18n/LocaleProvider";

type Role = "importer" | "distributor" | "";
type YesNo = "yes" | "no" | "unknown" | "";

interface LogEntry { id: string; date: string; what: string; action: string }

interface SupplyRecord {
  role: Role;
  highRisk: YesNo;
  checks: string[];
  ownName: string;          // Art. 23(3)
  storage: "ok" | "na" | ""; // Artt. 23(4), 24(3)
  docsWhere: string;        // Art. 23(5)
  techDocAccess: boolean;   // Art. 23(6)
  providerContact: string;
  repContact: string;
  importerContact: string;
  authority: string;
  internalContact: string;
  log: LogEntry[];
  art25: "yes" | "no" | "";
  savedAt?: string;
}

const EMPTY: SupplyRecord = {
  role: "", highRisk: "", checks: [], ownName: "", storage: "", docsWhere: "", techDocAccess: false,
  providerContact: "", repContact: "", importerContact: "", authority: "", internalContact: "", log: [], art25: "",
};

const CHECKS: Record<"importer" | "distributor", string[]> = {
  importer: ["imp_a", "imp_b", "imp_ce", "imp_doc", "imp_ifu", "imp_rep", "imp_ok"],
  distributor: ["dis_ce", "dis_doc", "dis_ifu", "dis_prov", "dis_imp", "dis_ok"],
};

/** Chiave letta dalla scheda del sistema per lo stato degli obblighi Art. 23-24 */
const RESULT_KEY = "aicomply_supplychain_result";

export default function SupplyChainPage() {
  const locale = useLocale();
  const t = useT("gov_supply");
  const { active } = useActiveSystem();
  const [rec, setRec] = useScopedStorage<SupplyRecord>("supplychain", EMPTY);
  const [draft, setDraft] = useState({ date: "", what: "", action: "" });
  const [justSaved, setJustSaved] = useState(false);

  // Classificazione e ruolo dall'inventario: proposti finché l'utente non sceglie
  const risk = active?.riskAnswers ? assessRisk(active.riskAnswers) : null;
  const sectionB = !!risk && risk.category === "high_risk_annex_i" && risk.annexIAct?.section === "B";
  const invRoles = active?.roles ?? [];
  const inferredRole: Role = active?.role === "importer" || invRoles.includes("importer") ? "importer"
    : active?.role === "distributor" || invRoles.includes("distributor") ? "distributor" : "";
  const role: Role = rec.role || inferredRole;
  const highRisk: YesNo = rec.highRisk || (risk ? (isHighRisk(risk.category) ? "yes" : "no") : "");

  function patch(p: Partial<SupplyRecord>) {
    setJustSaved(false);
    setRec((r) => ({ ...r, ...p }));
  }
  function toggleCheck(id: string) {
    patch({ checks: rec.checks.includes(id) ? rec.checks.filter((c) => c !== id) : [...rec.checks, id] });
  }
  function addLog() {
    if (!draft.what.trim()) return;
    patch({ log: [...rec.log, { id: crypto.randomUUID(), date: draft.date, what: draft.what.trim(), action: draft.action.trim() }] });
    setDraft({ date: "", what: "", action: "" });
  }

  const isImporter = role === "importer";
  const roleKey = isImporter ? "importer" : "distributor";
  const applies = highRisk === "yes" && !sectionB;
  const checksDone = !!role && CHECKS[roleKey].every((c) => rec.checks.includes(c));

  const missing: string[] = [];
  if (!role) missing.push(t("m_role"));
  if (highRisk !== "yes" && highRisk !== "no") missing.push(t("m_hr"));
  if (applies) {
    if (!checksDone) missing.push(t("m_checks"));
    if (isImporter && !rec.ownName.trim()) missing.push(t("m_name"));
    if (!rec.storage) missing.push(t("m_storage"));
    if (isImporter && !rec.docsWhere.trim()) missing.push(t("m_docs"));
    if (!rec.providerContact.trim() || !rec.authority.trim()) missing.push(t("m_contacts"));
    if (!rec.art25) missing.push(t("m_art25"));
  }
  const complete = missing.length === 0;

  async function save() {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify({ systemId: active?.id ?? null, role: role, highRisk: highRisk, completedAt: now }));
    } catch { /* storage non disponibile */ }
    await appendEvidence("audit", {
      type: isImporter ? "Verifiche dell'importatore — Art. 23" : "Verifiche del distributore — Art. 24",
      system: active?.name ?? "",
      role: role,
      highRisk: highRisk,
      annexISectionB: sectionB,
      checks: rec.checks,
      importerName: isImporter ? rec.ownName.trim() : null,
      storage: rec.storage || null,
      documentsLocation: isImporter ? rec.docsWhere.trim() : null,
      technicalDocumentationAvailable: isImporter ? rec.techDocAccess : null,
      contacts: {
        provider: rec.providerContact.trim(), authorisedRepresentative: rec.repContact.trim(),
        importer: rec.importerContact.trim(), authority: rec.authority.trim(), internal: rec.internalContact.trim(),
      },
      communications: rec.log,
      art25Triggered: rec.art25 === "yes",
      savedAt: now,
    }, "supply-chain");
    setRec((r) => ({ ...r, role, highRisk, savedAt: now }));
    setJustSaved(true);
  }

  const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT") : "");
  let n = 0;

  return (
    <div style={{ maxWidth: 760, color: INK }}>
      <ToolHeader title={t("title")} subtitle={t("sub")} note={t("note")} />

      <SystemSelector checkProhibited={false} />

      {!active ? (
        <p style={{ fontSize: 13 }}>{t("noSystem")}</p>
      ) : (
        <>
          <Step n={++n} title={t("role_q")} refText={t("role_ref")} done={!!role}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Choice active={role === "importer"} onClick={() => patch({ role: "importer", checks: [] })}>{t("importer")}</Choice>
              <Choice active={role === "distributor"} onClick={() => patch({ role: "distributor", checks: [] })}>{t("distributor")}</Choice>
            </div>
            {role && <Note>{t(isImporter ? "importer_hint" : "distributor_hint")}</Note>}
          </Step>

          <Step n={++n} title={t("hr_q")} refText={t("hr_ref")} done={highRisk === "yes" || highRisk === "no"}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["yes", "no", "unknown"] as const).map((v) => (
                <Choice key={v} active={highRisk === v} onClick={() => patch({ highRisk: v })}>{t(v)}</Choice>
              ))}
            </div>
            {highRisk === "no" && <Note>{t("hr_no")}</Note>}
            {highRisk === "unknown" && (
              <Note>{t("hr_unknown")} <Link href="/dashboard/tools/inventory" style={{ color: INK, textDecoration: "underline" }}>→</Link></Note>
            )}
            {sectionB && <Note warn>{t("hr_sectionB")}</Note>}
          </Step>

          {applies && role && (
            <>
              <Step n={++n} title={t(isImporter ? "checks_q_importer" : "checks_q_distributor")} refText={t(isImporter ? "checks_ref_importer" : "checks_ref_distributor")} done={checksDone}>
                {CHECKS[roleKey].map((id) => (
                  <Check key={id} checked={rec.checks.includes(id)} onChange={() => toggleCheck(id)} label={t(id)} />
                ))}
                <Note>{t("ce_note")}</Note>
                {!checksDone && <Note warn>{t(isImporter ? "stop_importer" : "stop_distributor")}</Note>}
              </Step>

              {isImporter && (
                <Step n={++n} title={t("name_q")} refText={t("name_ref")} done={!!rec.ownName.trim()}>
                  <input style={input} placeholder={t("name_ph")} aria-label={t("name_q")} value={rec.ownName} onChange={(e) => patch({ ownName: e.target.value })} />
                  <Note>{t("name_where")}</Note>
                </Step>
              )}

              <Step n={++n} title={t("storage_q")} refText={t(isImporter ? "storage_ref_importer" : "storage_ref_distributor")} done={!!rec.storage}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Choice active={rec.storage === "ok"} onClick={() => patch({ storage: "ok" })}>{t("storage_ok")}</Choice>
                  <Choice active={rec.storage === "na"} onClick={() => patch({ storage: "na" })}>{t("storage_na")}</Choice>
                </div>
              </Step>

              {isImporter ? (
                <Step n={++n} title={t("docs_q")} refText={t("docs_ref")} done={!!rec.docsWhere.trim()}>
                  <input style={input} placeholder={t("docs_ph")} aria-label={t("docs_q")} value={rec.docsWhere} onChange={(e) => patch({ docsWhere: e.target.value })} />
                  <Check checked={rec.techDocAccess} onChange={() => patch({ techDocAccess: !rec.techDocAccess })} label={t("docs_tech")} />
                  <Note>{t("docs_note")}</Note>
                </Step>
              ) : (
                <Step n={++n} title={t("info_q")} refText={t("info_ref")} done={!!rec.savedAt}>
                  <Note>{t("info_note")}</Note>
                </Step>
              )}

              <Step n={++n} title={t("contacts_q")} refText={t(isImporter ? "contacts_ref_importer" : "contacts_ref_distributor")} done={!!rec.providerContact.trim() && !!rec.authority.trim()}>
                <Note>{t(isImporter ? "contacts_note_importer" : "contacts_note_distributor")}</Note>
                <input style={input} placeholder={t("c_provider")} aria-label={t("c_provider")} value={rec.providerContact} onChange={(e) => patch({ providerContact: e.target.value })} />
                {isImporter
                  ? <input style={input} placeholder={t("c_rep")} aria-label={t("c_rep")} value={rec.repContact} onChange={(e) => patch({ repContact: e.target.value })} />
                  : <input style={input} placeholder={t("c_importer")} aria-label={t("c_importer")} value={rec.importerContact} onChange={(e) => patch({ importerContact: e.target.value })} />}
                <input style={input} placeholder={t("c_authority")} aria-label={t("c_authority")} value={rec.authority} onChange={(e) => patch({ authority: e.target.value })} />
                <input style={input} placeholder={t("c_internal")} aria-label={t("c_internal")} value={rec.internalContact} onChange={(e) => patch({ internalContact: e.target.value })} />
              </Step>

              <Step n={++n} title={t("log_q")} refText={t("log_ref")} done={rec.log.length > 0}>
                <Note>{t("log_note")}</Note>
                {rec.log.length === 0 ? (
                  <p style={{ fontSize: 12.5, margin: 0 }}>{t("log_empty")}</p>
                ) : (
                  rec.log.map((l) => (
                    <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, paddingBottom: 6, borderBottom: `1px solid ${LINE}` }}>
                      <span style={{ minWidth: 80 }}>{l.date ? fmtDate(l.date) : "—"}</span>
                      <span style={{ flex: 1 }}>{l.what}{l.action ? ` → ${l.action}` : ""}</span>
                      <button type="button" onClick={() => patch({ log: rec.log.filter((x) => x.id !== l.id) })} aria-label={t("remove")} title={t("remove")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: INK, padding: 2, display: "inline-flex" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,140px) 1fr", gap: 8 }}>
                  <input type="date" style={input} aria-label={t("log_date")} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                  <input style={input} placeholder={t("log_what")} aria-label={t("log_what")} value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })} />
                </div>
                <input style={input} placeholder={t("log_action")} aria-label={t("log_action")} value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
                <div><SecondaryButton onClick={addLog} disabled={!draft.what.trim()}><Plus size={14} /> {t("log_add")}</SecondaryButton></div>
              </Step>

              <Step n={++n} title={t("art25_q")} refText={t("art25_ref")} done={!!rec.art25}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Choice active={rec.art25 === "no"} onClick={() => patch({ art25: "no" })}>{t("no")}</Choice>
                  <Choice active={rec.art25 === "yes"} onClick={() => patch({ art25: "yes" })}>{t("yes")}</Choice>
                </div>
                {rec.art25 === "yes" && (
                  <>
                    <Note warn>{t("art25_yes")}</Note>
                    <Link href="/dashboard/compliance-ops/provider-transition" style={{ fontSize: 13, color: INK, textDecoration: "underline" }}>{t("art25_link")}</Link>
                  </>
                )}
              </Step>
            </>
          )}

          <section style={{ padding: "20px 0", borderTop: `1px solid ${LINE}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{t("status")}</h2>
            {complete ? (
              <Note>{t(applies ? "complete" : "complete_no")}</Note>
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
