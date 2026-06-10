"use client";

import React, { useState } from "react";
import { Siren, AlertTriangle, FileText, ClipboardCopy, CheckCircle } from "lucide-react";
import { classifyIncident, type IncidentClassification } from "@/app/actions/classifyIncident";
import { draftIncidentNotification, type IncidentNotificationDraft } from "@/app/actions/draftIncidentNotification";
import { buildComplianceContextFromStorage } from "@/hooks/useComplianceContext";

export default function IncidentPage() {
  const [incidentDesc, setIncidentDesc] = useState("");
  const [affectedPersons, setAffectedPersons] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [measuresAdopted, setMeasuresAdopted] = useState("");

  const [classifyLoading, setClassifyLoading] = useState(false);
  const [classification, setClassification] = useState<IncidentClassification | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  const [draftLoading, setDraftLoading] = useState(false);
  const [notificationDraft, setNotificationDraft] = useState<IncidentNotificationDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const handleClassify = async () => {
    if (!incidentDesc.trim()) return;
    setClassifyLoading(true);
    setClassification(null);
    setClassifyError(null);
    setNotificationDraft(null);
    const ctx = buildComplianceContextFromStorage();
    const res = await classifyIncident(incidentDesc, ctx.riskTier ?? null, affectedPersons, incidentDate);
    setClassifyLoading(false);
    if (res.classification) {
      setClassification(res.classification);
    } else {
      setClassifyError(res.error ?? "Errore sconosciuto");
    }
  };

  const handleDraftNotification = async () => {
    if (!classification) return;
    setDraftLoading(true);
    setNotificationDraft(null);
    setDraftError(null);
    const ctx = buildComplianceContextFromStorage();
    const res = await draftIncidentNotification(incidentDesc, classification, ctx, measuresAdopted);
    setDraftLoading(false);
    if (res.draft) {
      setNotificationDraft(res.draft);
    } else {
      setDraftError(res.error ?? "Errore sconosciuto");
    }
  };

  const handleCopy = () => {
    if (notificationDraft?.notificationText) {
      navigator.clipboard.writeText(notificationDraft.notificationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severityColor = (level: string) => {
    if (level === "grave_urgente") return { bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.3)", text: "#dc2626" };
    if (level === "grave") return { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.3)", text: "#d97706" };
    return { bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.3)", text: "#15803d" };
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(220,38,38,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Siren size={20} color="#dc2626" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0D1016", margin: 0 }}>Incident Notification</h1>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", margin: 0 }}>Art. 73 AI Act — Notifica incidenti gravi</p>
        </div>
      </div>

      {/* Step 1 — Describe incident */}
      <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#0D1016", marginBottom: 12 }}>1. Descrivi l'incidente</p>

        <label style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: 4 }}>Descrizione dettagliata *</label>
        <textarea
          rows={4}
          value={incidentDesc}
          onChange={e => setIncidentDesc(e.target.value)}
          placeholder="Descrivi cosa è successo, quando, quali sistemi AI erano coinvolti, quali danni o rischi si sono verificati…"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: 4 }}>Persone coinvolte</label>
            <input
              type="text"
              value={affectedPersons}
              onChange={e => setAffectedPersons(e.target.value)}
              placeholder="Es. 450, o 'non noto'"
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: 4 }}>Data/ora incidente</label>
            <input
              type="datetime-local"
              value={incidentDate}
              onChange={e => setIncidentDate(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, boxSizing: "border-box" }}
            />
          </div>
        </div>

        <button
          disabled={classifyLoading || !incidentDesc.trim()}
          onClick={handleClassify}
          style={{ marginTop: 14, padding: "8px 18px", background: classifyLoading || !incidentDesc.trim() ? "rgba(0,0,0,0.08)" : "#dc2626", color: classifyLoading || !incidentDesc.trim() ? "rgba(0,0,0,0.3)" : "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: classifyLoading || !incidentDesc.trim() ? "default" : "pointer" }}>
          {classifyLoading ? "✦ Classificazione in corso…" : "✦ Classifica incidente — Art. 73"}
        </button>
        {classifyError && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>Errore: {classifyError}</p>}
      </div>

      {/* Classification Result */}
      {classification && (() => {
        const colors = severityColor(classification.seriousnessLevel);
        return (
          <div className="rounded-xl p-5 mb-4" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb", background: "rgba(37,99,235,0.08)", borderRadius: 4, padding: "2px 6px" }}>✦ AI — verifica e conferma</span>
                <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: "6px 0 2px" }}>
                  {classification.seriousnessLevel === "grave_urgente" && "⚠ INCIDENTE GRAVE — URGENTE"}
                  {classification.seriousnessLevel === "grave" && "⚠ Incidente Grave"}
                  {classification.seriousnessLevel === "non_grave" && "✓ Non grave (Art. 73 probabilmente non applicabile)"}
                </p>
              </div>
              {classification.notificationDeadline.hours && (
                <div style={{ textAlign: "center", background: "#dc2626", color: "#fff", borderRadius: 8, padding: "6px 12px" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{classification.notificationDeadline.hours}h</p>
                  <p style={{ fontSize: 9, margin: 0 }}>DEADLINE</p>
                </div>
              )}
              {classification.notificationDeadline.days && !classification.notificationDeadline.hours && (
                <div style={{ textAlign: "center", background: "#d97706", color: "#fff", borderRadius: 8, padding: "6px 12px" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{classification.notificationDeadline.days}gg</p>
                  <p style={{ fontSize: 9, margin: 0 }}>DEADLINE</p>
                </div>
              )}
            </div>

            {classification.matchedCriteria.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 4 }}>Criteri Art. 3(49) corrispondenti:</p>
                {classification.matchedCriteria.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                    <AlertTriangle size={12} color={colors.text} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: "#0D1016" }}>{c}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", margin: "0 0 2px" }}>Autorità destinataria</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0 }}>{classification.competentAuthority}</p>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", margin: "0 0 2px" }}>Base normativa</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#0D1016", margin: 0 }}>{classification.art73Reference}</p>
              </div>
            </div>

            {classification.immediateActions.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 4 }}>Azioni immediate:</p>
                {classification.immediateActions.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: "#0D1016" }}>→ {a}</span>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 10, fontStyle: "italic", color: "rgba(0,0,0,0.4)", margin: 0 }}>{classification.recommendation}</p>
          </div>
        );
      })()}

      {/* Step 2 — Draft Notification */}
      {classification && classification.isSerious && (
        <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#0D1016", marginBottom: 12 }}>2. Misure adottate</p>
          <label style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: 4 }}>Misure immediate già intraprese</label>
          <textarea
            rows={3}
            value={measuresAdopted}
            onChange={e => setMeasuresAdopted(e.target.value)}
            placeholder="Es. Sistema sospeso alle 14:32. Notificato il DPO alle 15:00. Avviata analisi forense…"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <button
            disabled={draftLoading}
            onClick={handleDraftNotification}
            style={{ marginTop: 12, padding: "8px 18px", background: draftLoading ? "rgba(0,0,0,0.08)" : "#1d4ed8", color: draftLoading ? "rgba(0,0,0,0.3)" : "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: draftLoading ? "default" : "pointer" }}>
            {draftLoading ? "✦ Redazione in corso…" : "✦ Genera bozza notifica Art. 73"}
          </button>
          {draftError && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>Errore: {draftError}</p>}
        </div>
      )}

      {/* Notification Draft */}
      {notificationDraft && (
        <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} color="#1d4ed8" />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0D1016", margin: 0 }}>Bozza Notifica — {notificationDraft.art73Reference}</p>
            </div>
            <button
              onClick={handleCopy}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#0D1016" }}>
              {copied ? <CheckCircle size={13} color="#15803d" /> : <ClipboardCopy size={13} />}
              {copied ? "Copiato!" : "Copia testo"}
            </button>
          </div>

          <div style={{ padding: "3px 8px", borderRadius: 5, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: 12 }}>
            <p style={{ fontSize: 10, color: "#d97706", margin: "4px 0", fontWeight: 600 }}>⚠ {notificationDraft.draftNote}</p>
          </div>

          <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb", background: "rgba(37,99,235,0.08)", borderRadius: 4, padding: "2px 6px" }}>✦ AI — verifica e conferma</span>

          <pre style={{ fontSize: 11, lineHeight: 1.6, color: "#0D1016", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", background: "rgba(0,0,0,0.02)", borderRadius: 6, padding: "12px", marginTop: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
            {notificationDraft.notificationText}
          </pre>

          {notificationDraft.requiredAttachments.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.12)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", marginBottom: 6 }}>Allegati obbligatori:</p>
              {notificationDraft.requiredAttachments.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "#0D1016" }}>📎 {a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
