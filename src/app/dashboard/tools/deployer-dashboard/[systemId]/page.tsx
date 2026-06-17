"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadInventory, type AISystem } from "@/lib/inventory/ai-system";
import {
  loadSystemRecord,
  saveSystemRecord,
  ensureSystemRecord,
  computeOverallStatus,
  type DeployerDashboardRecord,
  type DeployerApplicabilityFlags,
  type ObligationStatus,
  type ObligationRecord,
} from "@/lib/deployer/deployer-types";
import {
  getApplicableObligations,
  DEPLOYER_OBLIGATIONS,
  type DeployerObligationDefinition,
} from "@/lib/deployer/deployer-obligations";
import { assessDeployerApplicability, draftWorkerInformationNotice } from "@/app/actions/deployerActions";
import {
  ChevronLeft, Sparkles, CheckCircle2, Clock, AlertTriangle,
  Minus, Info, UserCheck, Users, Database, ExternalLink,
  Loader2, Copy, Check, ChevronDown, ChevronUp,
} from "lucide-react";
// ── Art. 26 Dettaglio Operativo — PROMPT BD ──────────────────────────────────
import { loadDeployerRecord, saveDeployerRecord, type DeployerRecord } from "@/types/deployer";
import { DeployerSection } from "@/components/deployer/DeployerSection";
import { Art26_1 } from "@/components/deployer/Art26_1";
import { Art26_2 } from "@/components/deployer/Art26_2";
import { Art26_3 } from "@/components/deployer/Art26_3";
import { Art26_4 } from "@/components/deployer/Art26_4";
import { Art26_5 } from "@/components/deployer/Art26_5";
import { Art26_6 } from "@/components/deployer/Art26_6";
import { Art26_7 } from "@/components/deployer/Art26_7";
import { Art26_8 } from "@/components/deployer/Art26_8";
import { Art26_9 } from "@/components/deployer/Art26_9";
import { Art26_10 } from "@/components/deployer/Art26_10";

const FONT = { fontFamily: "Inter, system-ui, sans-serif" };

const STATUS_OPTIONS: { value: ObligationStatus; label: string; color: string; bg: string }[] = [
  { value: "not_started", label: "Non avviato", color: "#6b7280", bg: "#f9fafb" },
  { value: "in_progress", label: "In corso", color: "#d97706", bg: "#fffbeb" },
  { value: "done", label: "Completato", color: "#16a34a", bg: "#f0fdf4" },
  { value: "na", label: "N/A", color: "#6b7280", bg: "#f3f4f6" },
];

const FLAG_LABELS: Record<keyof DeployerApplicabilityFlags, string> = {
  usesHighRiskSystem: "Sistema ad alto rischio (All. III)",
  usesInternalProcedures: "Procedure interne di controllo",
  employeeImpact: "Impatto sui lavoratori",
  biometricCategorization: "Categorizzazione biometrica / emozioni",
  eudbRequired: "Registrazione EUDB obbligatoria (PA)",
  rbiApplicable: "Registrazione RBI (Art. 26(10))",
};

function StatusPill({ status }: { status: ObligationStatus }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: opt.color, background: opt.bg, border: `1px solid ${opt.color}22` }}
    >
      {opt.label}
    </span>
  );
}

function ObligationCard({
  def,
  record,
  onUpdate,
}: {
  def: DeployerObligationDefinition;
  record: ObligationRecord | undefined;
  onUpdate: (id: string, patch: Partial<ObligationRecord>) => void;
}) {
  const [open, setOpen] = useState(false);
  const status = record?.status ?? "not_started";

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        background: "#fff",
        borderColor: status === "done" ? "#86efac" : status === "not_started" ? "#fca5a5" : "#e5e7eb",
      }}
    >
      {/* Card header */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="mt-0.5">
          {status === "done" ? (
            <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
          ) : status === "in_progress" ? (
            <Clock size={16} style={{ color: "#d97706" }} />
          ) : status === "na" ? (
            <Minus size={16} style={{ color: "#9ca3af" }} />
          ) : (
            <AlertTriangle size={16} style={{ color: "#dc2626" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold" style={{ color: "#2563eb" }}>
              {def.id}
            </span>
            <span className="text-sm font-semibold" style={{ color: "#0D1016" }}>
              {def.label}
            </span>
            {!def.alwaysApplicable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#f0f9ff", color: "#0369a1" }}>
                condizionale
              </span>
            )}
            <StatusPill status={status} />
          </div>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "#6b7280" }}>
            {def.description}
          </p>
        </div>
        <span className="text-xs ml-2 mt-1" style={{ color: "#9ca3af" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "#f3f4f6" }}>
          <div className="pt-3 space-y-3">
            {/* Reference */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>
                Riferimento normativo
              </p>
              <p className="text-xs" style={{ color: "#374151" }}>{def.primaryReference}</p>
              {def.supportReferences.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                  {def.supportReferences.join(" · ")}
                </p>
              )}
            </div>

            {/* Status selector */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>
                Stato
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate(def.id, { status: opt.value, lastUpdated: new Date().toISOString() })}
                    className="text-xs px-2.5 py-1 rounded-lg border transition-all"
                    style={{
                      borderColor: status === opt.value ? opt.color : "#e5e7eb",
                      background: status === opt.value ? opt.bg : "#fff",
                      color: status === opt.value ? opt.color : "#374151",
                      fontWeight: status === opt.value ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence / notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
                  Sommario evidenza
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border resize-none"
                  style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
                  placeholder="Documento, link, nota..."
                  value={record?.evidenceSummary ?? ""}
                  onChange={(e) => onUpdate(def.id, { evidenceSummary: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
                  Responsabile
                </label>
                <input
                  className="w-full text-xs px-2 py-1.5 rounded-lg border"
                  style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
                  placeholder="Nome / ruolo"
                  value={record?.assignee ?? ""}
                  onChange={(e) => onUpdate(def.id, { assignee: e.target.value })}
                />
                <label className="text-[11px] font-semibold uppercase tracking-wide block mt-2 mb-1" style={{ color: "#9ca3af" }}>
                  Scadenza
                </label>
                <input
                  type="date"
                  className="w-full text-xs px-2 py-1.5 rounded-lg border"
                  style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
                  value={record?.dueDate ?? ""}
                  onChange={(e) => onUpdate(def.id, { dueDate: e.target.value })}
                />
              </div>
            </div>

            {/* Linked tool */}
            {def.linkedTool && (
              <Link
                href={def.linkedTool}
                className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "#2563eb" }}
              >
                <ExternalLink size={12} />
                Apri tool collegato
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkerNoticeModule({
  record,
  system,
  onSave,
}: {
  record: DeployerDashboardRecord;
  system: AISystem;
  onSave: (patch: Partial<DeployerDashboardRecord>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const notice = record.workerNotice;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const result = await draftWorkerInformationNotice({
        systemName: system.name,
        systemDescription: system.description ?? "",
        organizationName: "Organizzazione",
        deploymentContext: system.obligationsNote ?? "deployment interno",
      });
      onSave({
        workerNotice: {
          generated: true,
          noticeText: result.noticeText,
          aiDraft: true,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore generazione");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!notice?.noticeText) return;
    navigator.clipboard.writeText(notice.noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "#e5e7eb" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: "#7c3aed" }} />
          <span className="font-semibold text-sm" style={{ color: "#0D1016" }}>
            Informativa ai lavoratori
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            Art. 26(7)
          </span>
        </div>
        <div className="flex gap-2">
          {notice?.noticeText && (
            <button
              onClick={copy}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copiato" : "Copia"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "#7c3aed", color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {notice?.generated ? "Rigenera" : "Genera bozza AI"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "#dc2626" }}>{error}</p>
      )}

      {notice?.generated && notice.noticeText ? (
        <>
          <div
            className="p-3 rounded-lg text-xs whitespace-pre-wrap mb-2"
            style={{ background: "#fafaf9", border: "1px solid #e5e7eb", color: "#374151", maxHeight: 280, overflowY: "auto" }}
          >
            {notice.noticeText}
          </div>
          {notice.aiDraft && (
            <p className="text-[11px] font-semibold" style={{ color: "#d97706" }}>
              ✦ AI — verifica e conferma prima della distribuzione
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
                Metodo di consegna
              </label>
              <input
                className="w-full text-xs px-2 py-1.5 rounded-lg border"
                style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
                placeholder="Email, affissione, sindacato..."
                value={notice.deliveryMethod ?? ""}
                onChange={(e) =>
                  onSave({ workerNotice: { ...notice, deliveryMethod: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
                Data consegna
              </label>
              <input
                type="date"
                className="w-full text-xs px-2 py-1.5 rounded-lg border"
                style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
                value={notice.deliveryDate ?? ""}
                onChange={(e) =>
                  onSave({ workerNotice: { ...notice, deliveryDate: e.target.value } })
                }
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs" style={{ color: "#6b7280" }}>
          Genera una bozza di informativa da inviare ai lavoratori e ai rappresentanti sindacali
          prima del deployment del sistema AI.
        </p>
      )}
    </div>
  );
}

function RbiModule({
  record,
  onSave,
}: {
  record: DeployerDashboardRecord;
  onSave: (patch: Partial<DeployerDashboardRecord>) => void;
}) {
  const rbi = record.rbiRegistration ?? { registered: false };
  const [deployStart, setDeployStart] = useState("");

  const deadline = deployStart
    ? new Date(new Date(deployStart).getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0]
    : rbi.deadline;

  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline) : null;
  const hoursLeft = deadlineDate
    ? Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <div className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "#e5e7eb" }}>
      <div className="flex items-center gap-2 mb-3">
        <Database size={16} style={{ color: "#0891b2" }} />
        <span className="font-semibold text-sm" style={{ color: "#0D1016" }}>
          Registrazione RBI
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#ecfeff", color: "#0891b2" }}>
          Art. 26(10)
        </span>
        {hoursLeft !== null && hoursLeft > 0 && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: hoursLeft < 12 ? "#fef2f2" : "#fffbeb",
              color: hoursLeft < 12 ? "#dc2626" : "#d97706",
              border: `1px solid ${hoursLeft < 12 ? "#fca5a5" : "#fde68a"}`,
            }}
          >
            ⏱ {hoursLeft}h rimaste
          </span>
        )}
        {hoursLeft !== null && hoursLeft <= 0 && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>
            SCADUTO
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
            Inizio deployment
          </label>
          <input
            type="date"
            className="w-full text-xs px-2 py-1.5 rounded-lg border"
            style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
            value={deployStart}
            onChange={(e) => {
              setDeployStart(e.target.value);
              const dl = new Date(new Date(e.target.value).getTime() + 48 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];
              onSave({ rbiRegistration: { ...rbi, deadline: dl } });
            }}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
            Scadenza (48h)
          </label>
          <input
            type="date"
            className="w-full text-xs px-2 py-1.5 rounded-lg border"
            style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
            value={deadline ?? ""}
            readOnly
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9ca3af" }}>
            ID registrazione
          </label>
          <input
            className="w-full text-xs px-2 py-1.5 rounded-lg border"
            style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
            placeholder="RBI-XXXX-YYYY"
            value={rbi.registrationId ?? ""}
            onChange={(e) =>
              onSave({ rbiRegistration: { ...rbi, registrationId: e.target.value } })
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          type="checkbox"
          id="rbi-done"
          checked={rbi.registered}
          onChange={(e) =>
            onSave({
              rbiRegistration: {
                ...rbi,
                registered: e.target.checked,
                registrationDate: e.target.checked ? new Date().toISOString().split("T")[0] : undefined,
              },
            })
          }
          className="rounded"
        />
        <label htmlFor="rbi-done" className="text-xs" style={{ color: "#374151" }}>
          Registrazione completata
        </label>
        {rbi.registrationDate && (
          <span className="text-xs" style={{ color: "#9ca3af" }}>
            — {rbi.registrationDate}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DeployerSystemDetailPage() {
  const params = useParams();
  const systemId = typeof params?.systemId === "string" ? params.systemId : "";

  const [system, setSystem] = useState<AISystem | null>(null);
  const [record, setRecord] = useState<DeployerDashboardRecord | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRationale, setAiRationale] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);
  // Art. 26 Dettaglio Operativo
  const [detailRec, setDetailRecState] = useState<DeployerRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function setDetailRec(updater: (prev: DeployerRecord) => DeployerRecord) {
    setDetailRecState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveDeployerRecord(next);
      return next;
    });
  }

  const load = useCallback(() => {
    const inv = loadInventory();
    const sys = inv.find((s) => s.id === systemId) ?? null;
    setSystem(sys);
    if (sys) {
      const r = loadSystemRecord(systemId) ?? ensureSystemRecord(systemId, sys.name, sys.tier);
      setRecord(r);
      setDetailRecState(loadDeployerRecord(systemId));
    }
  }, [systemId]);

  useEffect(() => { load(); }, [load]);

  function patchRecord(patch: Partial<DeployerDashboardRecord>) {
    if (!record) return;
    const updated: DeployerDashboardRecord = {
      ...record,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    updated.overallStatus = computeOverallStatus(updated);
    setRecord(updated);
    saveSystemRecord(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateFlag(key: keyof DeployerApplicabilityFlags, value: boolean) {
    if (!record) return;
    const newFlags = { ...record.flags, [key]: value };
    // Re-sync obligations list with new applicable set
    const applicable = getApplicableObligations(newFlags);
    const existingMap = new Map(record.obligations.map((o) => [o.obligationId, o]));
    const newObligations = applicable.map((def) =>
      existingMap.get(def.id) ?? { obligationId: def.id, status: "not_started" as ObligationStatus }
    );
    patchRecord({ flags: newFlags, obligations: newObligations });
  }

  function updateObligation(obligationId: string, patch: Partial<ObligationRecord>) {
    if (!record) return;
    const existing = record.obligations.find((o) => o.obligationId === obligationId);
    const updated: ObligationRecord = { obligationId, status: "not_started", ...existing, ...patch };
    const newObligations = record.obligations.some((o) => o.obligationId === obligationId)
      ? record.obligations.map((o) => (o.obligationId === obligationId ? updated : o))
      : [...record.obligations, updated];
    patchRecord({ obligations: newObligations });
  }

  async function runAiAssessment() {
    if (!system) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await assessDeployerApplicability({
        name: system.name,
        description: system.description,
        tier: system.tier,
        tierBasis: system.tierBasis,
        role: system.role,
        obligationsNote: system.obligationsNote,
      });
      setAiRationale(result.rationale);
      // Apply proposed flags (user can still override)
      const applicable = getApplicableObligations(result.flags);
      const existingMap = new Map((record?.obligations ?? []).map((o) => [o.obligationId, o]));
      const newObligations = applicable.map((def) =>
        existingMap.get(def.id) ?? { obligationId: def.id, status: "not_started" as ObligationStatus }
      );
      patchRecord({ flags: result.flags, flagsAiAssessed: true, obligations: newObligations });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Errore AI");
    } finally {
      setAiLoading(false);
    }
  }

  if (!system || !record) {
    return (
      <div className="p-8 text-center" style={FONT}>
        <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: "#9ca3af" }} />
        <p className="text-sm" style={{ color: "#6b7280" }}>Caricamento sistema...</p>
      </div>
    );
  }

  const applicable = getApplicableObligations(record.flags);
  const obligationMap = new Map(record.obligations.map((o) => [o.obligationId, o]));
  const doneCount = record.obligations.filter((o) => o.status === "done" || o.status === "na").length;
  const totalCount = applicable.length;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const alwaysAppl = DEPLOYER_OBLIGATIONS.filter((o) => o.alwaysApplicable);
  const conditionalAppl = applicable.filter((o) => !o.alwaysApplicable);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto" style={{ ...FONT, color: "#0D1016" }}>
      {/* Back + header */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/dashboard/tools/deployer-dashboard"
          className="flex items-center gap-1 text-sm mt-0.5"
          style={{ color: "#6b7280" }}
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <UserCheck size={18} style={{ color: "#2563eb" }} />
            <h1 className="text-lg font-bold">{system.name}</h1>
            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#6b7280" }}>
              {system.tier}
            </span>
            {saved && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: "#16a34a" }}>
                <Check size={12} /> Salvato
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            Art. 26 — Obblighi deployer
          </p>
        </div>
        {/* Progress */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold" style={{ color: pct === 100 ? "#16a34a" : "#0D1016" }}>
            {pct}%
          </div>
          <div className="text-[11px]" style={{ color: "#6b7280" }}>{doneCount}/{totalCount} obblighi</div>
        </div>
      </div>

      {/* Sanctions note */}
      <div
        className="flex items-start gap-2 p-3 rounded-lg mb-5 text-xs"
        style={{ background: "#fef9c3", border: "1px solid #fde047", color: "#713f12" }}
      >
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        Sanzioni Art. 99–101: fino a 15 milioni € o 3% fatturato mondiale per inadempienza deployer.{" "}
        <span style={{ opacity: 0.8 }}>[verificare sul testo AI Act vigente]</span>
      </div>

      {/* ── Art. 26 Dettaglio Operativo (PROMPT BD) ── */}
      {detailRec && (
        <section className="mb-6">
          <button
            onClick={() => setDetailOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-900/60 mb-1 hover:bg-slate-900/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">Art. 26</span>
              <span className="text-sm font-semibold text-slate-200">Checklist Operativa Deployer</span>
              <span className="text-[10px] text-slate-500">10 paragrafi</span>
            </div>
            {detailOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </button>

          {detailOpen && (
            <div className="space-y-2 mt-2">
              <DeployerSection artRef="Art. 26(1)" title="Istruzioni d&apos;uso" status={detailRec.instructionsRead ? "ok" : "pending"}>
                <Art26_1 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(2)" title="Supervisori assegnati" status={detailRec.overseers.length > 0 ? "ok" : "pending"}>
                <Art26_2 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(3)" title="Conservazione log ≥ 6 mesi" status={detailRec.logRetentionStatus === "ok" ? "ok" : detailRec.logRetentionStatus === "not_configured" ? "pending" : detailRec.logRetentionStatus === "expired" ? "suspended" : "pending"}>
                <Art26_3 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(4)" title="Notifiche al provider" status={detailRec.providerNotifications.length > 0 ? "ok" : "not_required"}>
                <Art26_4 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(5)" title="Dichiarazione uso conforme" status={detailRec.conformingUseDeclaration ? "ok" : "pending"}>
                <Art26_5 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(6)" title="Cooperazione autorità di vigilanza" status={detailRec.authorityContact.name && detailRec.authorityContact.email ? "ok" : "pending"}>
                <Art26_6 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(7)" title="Notifiche utenti finali" status={detailRec.endUserNotificationsStatus === "compliant" ? "ok" : detailRec.endUserNotificationsStatus === "not_required" ? "not_required" : "pending"}>
                <Art26_7 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(8)" title="FRIA — Valutazione diritti fondamentali" status={detailRec.friaStatus === "completed" ? "ok" : detailRec.friaStatus === "not_required" ? "not_required" : "pending"}>
                <Art26_8 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(9)" title="Sospensione sistema" status={detailRec.systemSuspended ? "suspended" : "ok"} variant={detailRec.systemSuspended ? "critical" : "default"}>
                <Art26_9 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
              <DeployerSection artRef="Art. 26(10)" title="Registrazione EUDB" status={detailRec.eudbRegistrationRequired ? (detailRec.eudbRegistrationStatus === "registered" ? "ok" : "pending") : "not_required"}>
                <Art26_10 record={detailRec} onChange={setDetailRec} />
              </DeployerSection>
            </div>
          )}
        </section>
      )}

      {/* ── AI Applicability Assessment ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm" style={{ color: "#0D1016" }}>
            Applicabilità obblighi
          </h2>
          <button
            onClick={runAiAssessment}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "#2563eb", color: "#fff", opacity: aiLoading ? 0.7 : 1 }}
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Valuta con AI
          </button>
        </div>

        {aiError && (
          <p className="text-xs mb-2" style={{ color: "#dc2626" }}>{aiError}</p>
        )}
        {record.flagsAiAssessed && (
          <p className="text-[11px] mb-2 font-semibold" style={{ color: "#d97706" }}>
            ✦ AI — verifica e conferma i flag proposti
          </p>
        )}

        <div className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "#e5e7eb" }}>
          <div className="space-y-2">
            {(Object.keys(FLAG_LABELS) as (keyof DeployerApplicabilityFlags)[]).map((key) => (
              <div key={key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`flag-${key}`}
                  checked={record.flags[key]}
                  onChange={(e) => updateFlag(key, e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={`flag-${key}`} className="text-sm cursor-pointer" style={{ color: "#0D1016" }}>
                    {FLAG_LABELS[key]}
                  </label>
                  {aiRationale?.[key] && (
                    <p className="text-[11px] mt-0.5" style={{ color: "#6b7280" }}>
                      {aiRationale[key]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Always-applicable obligations ── */}
      <section className="mb-6">
        <h2 className="font-semibold text-sm mb-3" style={{ color: "#0D1016" }}>
          Obblighi sempre applicabili ({alwaysAppl.length})
        </h2>
        <div className="space-y-2">
          {alwaysAppl.map((def) => (
            <ObligationCard
              key={def.id}
              def={def}
              record={obligationMap.get(def.id)}
              onUpdate={updateObligation}
            />
          ))}
        </div>
      </section>

      {/* ── Conditional obligations ── */}
      {conditionalAppl.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-sm mb-3" style={{ color: "#0D1016" }}>
            Obblighi condizionali attivi ({conditionalAppl.length})
          </h2>
          <div className="space-y-2">
            {conditionalAppl.map((def) => (
              <ObligationCard
                key={def.id}
                def={def}
                record={obligationMap.get(def.id)}
                onUpdate={updateObligation}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Worker notice module (D-08) ── */}
      {record.flags.employeeImpact && (
        <section className="mb-6">
          <WorkerNoticeModule record={record} system={system} onSave={patchRecord} />
        </section>
      )}

      {/* ── RBI checklist (D-11) ── */}
      {record.flags.rbiApplicable && (
        <section className="mb-6">
          <RbiModule record={record} onSave={patchRecord} />
        </section>
      )}

      {/* ── EUDB fallback (D-10) ── */}
      {record.flags.eudbRequired && (
        <section className="mb-6">
          <div className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "#e5e7eb" }}>
            <div className="flex items-center gap-2 mb-2">
              <Database size={16} style={{ color: "#2563eb" }} />
              <span className="font-semibold text-sm">Registrazione EUDB</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#eff6ff", color: "#2563eb" }}>
                Art. 49(2)
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: "#6b7280" }}>
              Come autorità pubblica che effettua il deployment di un sistema AI ad alto rischio,
              sei tenuto a registrare il sistema nel database EU AI Act prima dell&apos;uso.{" "}
              <span style={{ color: "#9ca3af" }}>[verificare sul testo AI Act vigente]</span>
            </p>
            <textarea
              rows={3}
              className="w-full text-xs px-2 py-1.5 rounded-lg border resize-none"
              style={{ borderColor: "#e5e7eb", color: "#0D1016" }}
              placeholder="Note registrazione EUDB: ID, data, link al record..."
              value={record.eudbNote ?? ""}
              onChange={(e) => patchRecord({ eudbNote: e.target.value })}
            />
            <Link
              href="/dashboard/tools/eudb"
              className="inline-flex items-center gap-1.5 text-xs font-medium mt-2"
              style={{ color: "#2563eb" }}
            >
              <ExternalLink size={12} />
              Vai al tool EUDB Registration
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
