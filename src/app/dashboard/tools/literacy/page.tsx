"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DBStatusBadge, type DBSource } from "@/components/ui/DBStatusBadge";
import {
  GraduationCap, Plus, Download, Trash2, Users, Calendar,
  CheckCircle, Clock, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { useT, useLocale } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Data model ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ai_literacy_store";

type TrainingCategory =
  | "fondamenti"
  | "rischi"
  | "normativa"
  | "strumenti"
  | "etica"
  | "altro";

function buildCategoryLabels(t: TFn): Record<TrainingCategory, string> {
  return {
    fondamenti: t("cat_fondamenti"),
    rischi:     t("cat_rischi"),
    normativa:  t("cat_normativa"),
    strumenti:  t("cat_strumenti"),
    etica:      t("cat_etica"),
    altro:      t("cat_altro"),
  };
}

// ─── Ruoli aziendali Art. 4 L.132/2025 + MOG 231 ──────────────────────────────

type StaffRole =
  | "dirigenti"
  | "manager_ai"
  | "developer"
  | "hr"
  | "legal_compliance"
  | "tutti_dipendenti";

function buildStaffRoleLabels(t: TFn): Record<StaffRole, string> {
  return {
    dirigenti:        t("role_dirigenti"),
    manager_ai:       t("role_manager_ai"),
    developer:        t("role_developer"),
    hr:               t("role_hr"),
    legal_compliance: t("role_legal_compliance"),
    tutti_dipendenti: t("role_tutti_dipendenti"),
  };
}

// Ore minime raccomandate per ruolo (MOG 231 best practice)
const ROLE_MIN_HOURS: Record<StaffRole, number> = {
  dirigenti:        4,
  manager_ai:       8,
  developer:        6,
  hr:               4,
  legal_compliance: 6,
  tutti_dipendenti: 2,
};

type TrainingSession = {
  id: string;
  date: string;              // YYYY-MM-DD
  title: string;
  category: TrainingCategory;
  trainer: string;
  attendees: string[];       // names / roles
  roles: StaffRole[];        // ruoli aziendali coinvolti
  durationMinutes: number;
  notes: string;
  createdAt: string;
};

type LiteracyStore = {
  sessions: TrainingSession[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function load(): LiteracyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [] };
    return JSON.parse(raw) as LiteracyStore;
  } catch {
    return { sessions: [] };
  }
}

function save(store: LiteracyStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatDate(iso: string, loc: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(loc, {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Calcolo compliance per ruolo ─────────────────────────────────────────────

function computeHoursByRole(sessions: TrainingSession[]): Record<StaffRole, number> {
  const hours: Record<StaffRole, number> = {
    dirigenti: 0, manager_ai: 0, developer: 0,
    hr: 0, legal_compliance: 0, tutti_dipendenti: 0,
  };
  for (const s of sessions) {
    const h = s.durationMinutes / 60;
    for (const role of (s.roles || [])) {
      hours[role] = (hours[role] || 0) + h;
    }
    if ((s.roles || []).length > 0) {
      hours.tutti_dipendenti += h;
    }
  }
  return hours;
}

function computeLiteracyScore(sessions: TrainingSession[]): number {
  const hours = computeHoursByRole(sessions);
  const roles = Object.keys(ROLE_MIN_HOURS) as StaffRole[];
  let met = 0;
  for (const role of roles) {
    if ((hours[role] || 0) >= ROLE_MIN_HOURS[role]) met++;
  }
  return Math.round((met / roles.length) * 100);
}

async function syncToMog231(sessions: TrainingSession[]): Promise<void> {
  try {
    const classifierRaw = localStorage.getItem("aicomply_classifier_result");
    let aiSystemId: string | null = null;
    if (classifierRaw) {
      const parsed = JSON.parse(classifierRaw);
      aiSystemId = parsed?.aiSystemId || null;
    }
    if (!aiSystemId) return;

    const hoursByRole = computeHoursByRole(sessions);
    const literacyScore = computeLiteracyScore(sessions);

    const partDTraining = {
      training_plan: "Formazione AI conforme Art. 4 EU AI Act + L.132/2025",
      completed_courses: sessions.map(s => ({
        title: s.title,
        date: s.date,
        hours: s.durationMinutes / 60,
        roles: s.roles || [],
        category: s.category,
      })),
      hours_per_role: hoursByRole,
      next_training_date: null,
      literacy_score: literacyScore,
    };

    await fetch("/api/mog231", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ai_system_id: aiSystemId,
        updates: {
          part_d_training: partDTraining,
          ...(literacyScore >= 80 ? { l132_hr_transparency: true } : {}),
        },
      }),
    });
  } catch {
    // Sync silenzioso — non interrompere l'UX
  }
}

// ─── RoleCompliancePanel ──────────────────────────────────────────────────────

function RoleCompliancePanel({ sessions, t }: { sessions: TrainingSession[]; t: TFn }) {
  const hours = computeHoursByRole(sessions);
  const roles = Object.keys(ROLE_MIN_HOURS) as StaffRole[];
  const score = computeLiteracyScore(sessions);
  const STAFF_ROLE_LABELS = buildStaffRoleLabels(t);

  return (
    <div
      className="rounded-xl p-4 mb-6"
      style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}
    >
      {/* Header con score globale */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.35)" }}>
            {t("complianceTitle")}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
            {t("complianceSubtitle")}
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold"
            style={{ color: score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626" }}
          >
            {score}%
          </div>
          <div className="text-[10px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            {score >= 80 ? t("statusConforme") : score >= 50 ? t("statusParziale") : t("statusInsufficiente")}
          </div>
        </div>
      </div>

      {/* Barre per ruolo */}
      <div className="space-y-2.5">
        {roles.map(role => {
          const done = hours[role] || 0;
          const min = ROLE_MIN_HOURS[role];
          const pct = Math.min((done / min) * 100, 100);
          const ok = done >= min;
          return (
            <div key={role}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs" style={{ color: "rgba(0,0,0,0.6)" }}>
                  {STAFF_ROLE_LABELS[role]}
                </span>
                <span className="text-[11px] font-medium" style={{ color: ok ? "#16a34a" : "rgba(0,0,0,0.4)" }}>
                  {done.toFixed(1)}h / {min}h {t("minSuffix")}
                </span>
              </div>
              <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(0,0,0,0.07)" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: ok ? "#16a34a" : pct > 0 ? "#d97706" : "rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {score < 100 && (
        <p className="text-[11px] mt-3" style={{ color: "rgba(0,0,0,0.4)" }}>
          {t("mog231Note")}
        </p>
      )}
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

type Toast = { msg: string; type: "success" | "error" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiteracyPage() {
  const t = useT("toolLiteracy");
  const locale = useLocale();
  const loc = locale === "it" ? "it-IT" : "en-GB";
  const CATEGORY_LABELS = buildCategoryLabels(t);
  const STAFF_ROLE_LABELS = buildStaffRoleLabels(t);
  const [store, setStore]     = useState<LiteracyStore>({ sessions: [] });
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast]     = useState<Toast | null>(null);
  const [dbSource, setDbSource] = useState<DBSource>("loading");

  useEffect(() => {
    fetch("/api/ai-systems")
      .then(r => setDbSource(r.ok ? "db" : "localStorage"))
      .catch(() => setDbSource("localStorage"));
  }, []);

  // Form state
  const [fDate,     setFDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [fTitle,    setFTitle]    = useState("");
  const [fCategory, setFCategory] = useState<TrainingCategory>("normativa");
  const [fTrainer,  setFTrainer]  = useState("");
  const [fAttendees, setFAttendees] = useState("");   // comma-separated
  const [fDuration, setFDuration] = useState("60");
  const [fNotes,    setFNotes]    = useState("");
  const [formRoles, setFormRoles] = useState<StaffRole[]>([]);

  useEffect(() => {
    setStore(load());
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  const { sessions } = store;
  const totalSessions   = sessions.length;
  const totalHours      = sessions.reduce((a, s) => a + s.durationMinutes, 0) / 60;
  const uniqueAttendees = new Set(sessions.flatMap(s => s.attendees)).size;
  const lastSession     = sessions.length
    ? sessions.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  // ── Add session ──────────────────────────────────────────────────────────────

  function addSession() {
    if (!fTitle.trim()) {
      showToast(t("toast_needTitle"), "error");
      return;
    }
    if (!fDate) {
      showToast(t("toast_needDate"), "error");
      return;
    }
    const attendeeList = fAttendees
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const session: TrainingSession = {
      id:              crypto.randomUUID(),
      date:            fDate,
      title:           fTitle.trim(),
      category:        fCategory,
      trainer:         fTrainer.trim(),
      attendees:       attendeeList,
      roles:           formRoles,
      durationMinutes: parseInt(fDuration) || 60,
      notes:           fNotes.trim(),
      createdAt:       new Date().toISOString(),
    };

    const next: LiteracyStore = { sessions: [session, ...store.sessions] };
    setStore(next);
    save(next);
    syncToMog231(next.sessions);
    showToast(t("toast_registered"));
    setShowForm(false);
    setFTitle(""); setFTrainer(""); setFAttendees(""); setFNotes(""); setFDuration("60"); setFormRoles([]);
  }

  // ── Delete session ───────────────────────────────────────────────────────────

  function deleteSession(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const next: LiteracyStore = { sessions: store.sessions.filter(s => s.id !== id) };
    setStore(next);
    save(next);
    syncToMog231(next.sessions);
    if (expanded === id) setExpanded(null);
    showToast(t("toast_deleted"));
  }

  // ── Export registro ──────────────────────────────────────────────────────────

  function exportRegistro() {
    if (!sessions.length) {
      showToast(t("toast_nothingToExport"), "error");
      return;
    }
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    const lines: string[] = [
      t("reg_title"),
      "=".repeat(60),
      "",
      `${t("reg_totalSessions")} ${totalSessions}`,
      `${t("reg_trainingHours")} ${totalHours.toFixed(1)} h`,
      `${t("reg_uniqueAttendees")} ${uniqueAttendees}`,
      `${t("reg_exportedOn")} ${new Date().toLocaleDateString(loc, { day: "2-digit", month: "long", year: "numeric" })}`,
      "",
      "=".repeat(60),
      t("reg_sessionsHeader"),
      "=".repeat(60),
      "",
    ];

    sorted.forEach((s, i) => {
      lines.push(`[${i + 1}] ${formatDate(s.date, loc)} — ${s.title}`);
      lines.push(`    ${t("reg_category")}    ${CATEGORY_LABELS[s.category]}`);
      lines.push(`    ${t("reg_trainer")}    ${s.trainer || t("reg_notSpecified")}`);
      lines.push(`    ${t("reg_duration")}       ${s.durationMinutes} ${t("minutesWord")}`);
      if ((s.roles || []).length > 0) {
        lines.push(`    ${t("reg_roles")}        ${s.roles.map(r => STAFF_ROLE_LABELS[r]).join(", ")}`);
      }
      if (s.attendees.length) {
        lines.push(`    ${t("reg_attendees")} ${s.attendees.join(", ")}`);
      }
      if (s.notes) {
        lines.push(`    ${t("reg_notes")}         ${s.notes}`);
      }
      lines.push("");
    });

    lines.push("=".repeat(60));
    lines.push(t("reg_legalRef"));
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(t("reg_art4Line1"));
    lines.push(t("reg_art4Line2"));
    lines.push("");
    lines.push(t("reg_legalNote"));
    lines.push("");
    lines.push("=".repeat(60));
    lines.push(`${t("reg_generatedBy")} ${new Date().toISOString()}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `registro-ai-literacy-art4-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toast_exported"));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#ffffff",
    fontSize: 13,
    color: "#0D1016",
    outline: "none",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── A. Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c" }}
            >
              {t("inForceSince")}
            </span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "#0D1016" }}>
            AI Literacy — Art. 4
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: "rgba(0,0,0,0.45)" }}>
              {t("subtitle")}
            </p>
            <DBStatusBadge source={dbSource} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportRegistro}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.12)",
              color: "rgba(0,0,0,0.65)",
            }}
          >
            <Download className="h-4 w-4" />
            {t("exportRegister")}
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#0D1016" }}
          >
            <Plus className="h-4 w-4" />
            {t("addSession")}
          </button>
        </div>
      </div>

      {/* ── B. Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen,   label: t("stat_sessions"),   value: String(totalSessions) },
          { icon: Clock,      label: t("stat_totalHours"), value: totalHours.toFixed(1) + " h" },
          { icon: Users,      label: t("stat_attendees"),  value: String(uniqueAttendees) },
          { icon: Calendar,   label: t("stat_lastSession"), value: lastSession ? formatDate(lastSession.date, loc).split(" ").slice(0, 2).join(" ") : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.35)" }} />
              <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.45)" }}>
                {label}
              </span>
            </div>
            <p className="text-xl font-semibold" style={{ color: "#0D1016", letterSpacing: "-0.5px" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── C. Add session form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl p-5"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#0D1016" }}>
              {t("newSession")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("titleLabel")} *
                </label>
                <input
                  type="text"
                  placeholder={t("titlePh")}
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("dateLabel")} *
                </label>
                <input
                  type="date"
                  value={fDate}
                  onChange={e => setFDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("durationLabel")}
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={fDuration}
                  onChange={e => setFDuration(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Category */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("categoryLabel")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_LABELS) as TrainingCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFCategory(cat)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={
                        fCategory === cat
                          ? { background: "#0D1016", color: "#ffffff", border: "1px solid #0D1016" }
                          : { background: "#ffffff", color: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,0,0,0.12)" }
                      }
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trainer */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("trainerLabel")}
                </label>
                <input
                  type="text"
                  placeholder={t("trainerPh")}
                  value={fTrainer}
                  onChange={e => setFTrainer(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Ruoli coinvolti */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("rolesLabel")}{" "}
                  <span style={{ color: "rgba(0,0,0,0.35)" }}>{t("selectAll")}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STAFF_ROLE_LABELS) as StaffRole[]).map(role => {
                    const selected = formRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() =>
                          setFormRoles(prev =>
                            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role],
                          )
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                        style={{
                          background: selected ? "rgba(13,16,22,0.08)" : "transparent",
                          border: selected ? "1px solid rgba(13,16,22,0.25)" : "1px solid rgba(0,0,0,0.1)",
                          color: selected ? "#0D1016" : "rgba(0,0,0,0.45)",
                        }}
                      >
                        {STAFF_ROLE_LABELS[role]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("attendeesLabel")}
                </label>
                <input
                  type="text"
                  placeholder={t("attendeesPh")}
                  value={fAttendees}
                  onChange={e => setFAttendees(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {t("notesLabel")}
                </label>
                <textarea
                  rows={3}
                  placeholder={t("notesPh")}
                  value={fNotes}
                  onChange={e => setFNotes(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFTitle(""); setFNotes(""); }}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.12)",
                  color: "rgba(0,0,0,0.55)",
                }}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={addSession}
                disabled={!fTitle.trim() || !fDate}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "#0D1016" }}
              >
                {t("registerSession")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── D. Empty state ── */}
      {sessions.length === 0 && !showForm && (
        <div
          className="rounded-xl py-16 text-center"
          style={{ border: "2px dashed rgba(0,0,0,0.1)", background: "#ffffff" }}
        >
          <GraduationCap className="h-10 w-10 mx-auto mb-4" style={{ color: "rgba(0,0,0,0.18)" }} />
          <p className="font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
            {t("noSessions")}
          </p>
          <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: "rgba(0,0,0,0.35)" }}>
            {t("noSessionsDesc")}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: "#0D1016" }}
          >
            <Plus className="h-4 w-4" /> {t("registerFirstSession")}
          </button>
        </div>
      )}

      {/* ── E. Compliance per ruolo ── */}
      {sessions.length > 0 && (
        <RoleCompliancePanel sessions={sessions} t={t} />
      )}

      {/* ── F. Sessions list ── */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          {[...sessions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((session, i) => {
              const isOpen = expanded === session.id;
              return (
                <div
                  key={session.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)" }}
                >
                  {/* Row header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
                  >
                    {/* Index circle */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{
                        background: "rgba(0,0,0,0.05)",
                        color: "rgba(0,0,0,0.45)",
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "#0D1016" }}>
                          {session.title}
                        </span>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}
                        >
                          {CATEGORY_LABELS[session.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "rgba(0,0,0,0.4)" }}>
                        <span>{formatDate(session.date, loc)}</span>
                        <span>·</span>
                        <span>{session.durationMinutes} min</span>
                        {session.attendees.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{session.attendees.length} {session.attendees.length === 1 ? t("attendeeSingular") : t("attendeePlural")}</span>
                          </>
                        )}
                        {session.trainer && (
                          <>
                            <span>·</span>
                            <span>{session.trainer}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <CheckCircle className="h-4 w-4" style={{ color: "#16a34a" }} />
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: "rgba(0,0,0,0.25)" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isOpen
                        ? <ChevronUp  className="h-4 w-4" style={{ color: "rgba(0,0,0,0.3)" }} />
                        : <ChevronDown className="h-4 w-4" style={{ color: "rgba(0,0,0,0.3)" }} />
                      }
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-5 pb-5 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                        >
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(0,0,0,0.35)" }}>
                              {t("sessionDetails")}
                            </p>
                            {[
                              [t("dateLabel"),       formatDate(session.date, loc)],
                              [t("durationWord"),     session.durationMinutes + " " + t("minutesWord")],
                              [t("categoryLabel"),  CATEGORY_LABELS[session.category]],
                              [t("trainerWord"),  session.trainer || "—"],
                            ].map(([k, v]) => (
                              <div key={k} className="flex gap-3 mb-1.5">
                                <span className="w-24 flex-shrink-0 text-xs" style={{ color: "rgba(0,0,0,0.38)" }}>{k}</span>
                                <span className="text-xs font-medium" style={{ color: "#0D1016" }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            {(session.roles || []).length > 0 && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(0,0,0,0.35)" }}>
                                  {t("rolesInvolved")}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {(session.roles || []).map(r => (
                                    <span
                                      key={r}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                      style={{ background: "rgba(13,16,22,0.07)", color: "#0D1016" }}
                                    >
                                      {STAFF_ROLE_LABELS[r]}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          {session.attendees.length > 0 && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(0,0,0,0.35)" }}>
                                  {t("attendeesWord")} ({session.attendees.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {session.attendees.map(a => (
                                    <span
                                      key={a}
                                      className="text-xs px-2 py-0.5 rounded-full"
                                      style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.6)" }}
                                    >
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                            {session.notes && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-3" style={{ color: "rgba(0,0,0,0.35)" }}>
                                  {t("notesWord")}
                                </p>
                                <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                                  {session.notes}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>
      )}

      {/* ── F. Legal callout box ── */}
      <div
        className="rounded-xl px-4 py-3.5 text-sm leading-relaxed"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        <span style={{ color: "#92400e" }}>
          📋 <strong>{t("calloutTitle")}</strong> —
        </span>{" "}
        <span style={{ color: "rgba(0,0,0,0.6)" }}>
          {t("calloutBody")}
        </span>
      </div>

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
