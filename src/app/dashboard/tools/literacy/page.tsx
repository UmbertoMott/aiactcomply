"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Plus, Download, Trash2, Users, Calendar,
  CheckCircle, Clock, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Data model ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ai_literacy_store";

type TrainingCategory =
  | "fondamenti"
  | "rischi"
  | "normativa"
  | "strumenti"
  | "etica"
  | "altro";

const CATEGORY_LABELS: Record<TrainingCategory, string> = {
  fondamenti: "Fondamenti AI",
  rischi:     "Rischi e bias",
  normativa:  "Normativa (EU AI Act)",
  strumenti:  "Strumenti aziendali AI",
  etica:      "Etica e responsabilità",
  altro:      "Altro",
};

type TrainingSession = {
  id: string;
  date: string;              // YYYY-MM-DD
  title: string;
  category: TrainingCategory;
  trainer: string;
  attendees: string[];       // names / roles
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

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

type Toast = { msg: string; type: "success" | "error" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiteracyPage() {
  const [store, setStore]     = useState<LiteracyStore>({ sessions: [] });
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast]     = useState<Toast | null>(null);

  // Form state
  const [fDate,     setFDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [fTitle,    setFTitle]    = useState("");
  const [fCategory, setFCategory] = useState<TrainingCategory>("normativa");
  const [fTrainer,  setFTrainer]  = useState("");
  const [fAttendees, setFAttendees] = useState("");   // comma-separated
  const [fDuration, setFDuration] = useState("60");
  const [fNotes,    setFNotes]    = useState("");

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
      showToast("Inserisci il titolo della sessione", "error");
      return;
    }
    if (!fDate) {
      showToast("Inserisci la data", "error");
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
      durationMinutes: parseInt(fDuration) || 60,
      notes:           fNotes.trim(),
      createdAt:       new Date().toISOString(),
    };

    const next: LiteracyStore = { sessions: [session, ...store.sessions] };
    setStore(next);
    save(next);
    showToast("Sessione registrata");
    setShowForm(false);
    setFTitle(""); setFTrainer(""); setFAttendees(""); setFNotes(""); setFDuration("60");
  }

  // ── Delete session ───────────────────────────────────────────────────────────

  function deleteSession(id: string) {
    if (!confirm("Eliminare questa sessione di formazione?")) return;
    const next: LiteracyStore = { sessions: store.sessions.filter(s => s.id !== id) };
    setStore(next);
    save(next);
    if (expanded === id) setExpanded(null);
    showToast("Sessione eliminata");
  }

  // ── Export registro ──────────────────────────────────────────────────────────

  function exportRegistro() {
    if (!sessions.length) {
      showToast("Nessuna sessione da esportare", "error");
      return;
    }
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    const lines: string[] = [
      "REGISTRO DI ALFABETIZZAZIONE AI — ART. 4 EU AI ACT (UE) 2024/1689",
      "=".repeat(60),
      "",
      `Totale sessioni:       ${totalSessions}`,
      `Ore di formazione:     ${totalHours.toFixed(1)} h`,
      `Partecipanti unici:    ${uniqueAttendees}`,
      `Esportato il:          ${new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}`,
      "",
      "=".repeat(60),
      "SESSIONI DI FORMAZIONE",
      "=".repeat(60),
      "",
    ];

    sorted.forEach((s, i) => {
      lines.push(`[${i + 1}] ${formatDate(s.date)} — ${s.title}`);
      lines.push(`    Categoria:    ${CATEGORY_LABELS[s.category]}`);
      lines.push(`    Formatore:    ${s.trainer || "non specificato"}`);
      lines.push(`    Durata:       ${s.durationMinutes} minuti`);
      if (s.attendees.length) {
        lines.push(`    Partecipanti: ${s.attendees.join(", ")}`);
      }
      if (s.notes) {
        lines.push(`    Note:         ${s.notes}`);
      }
      lines.push("");
    });

    lines.push("=".repeat(60));
    lines.push("RIFERIMENTO NORMATIVO");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push("Art. 4 Regolamento (UE) 2024/1689 — AI Act");
    lines.push("Provider e deployer adottano misure per garantire, nella misura del");
    lines.push("possibile, un sufficiente livello di alfabetizzazione AI del proprio");
    lines.push("personale e di altre persone che gestiscono i sistemi AI per loro conto.");
    lines.push("");
    lines.push("NOTA LEGALE:");
    lines.push("  Il presente registro costituisce evidenza delle misure adottate ai");
    lines.push("  sensi dell'Art. 4. L'Art. 4 non prescrive un formato specifico per");
    lines.push("  la documentazione. AI Comply non rilascia attestazioni di conformità.");
    lines.push("");
    lines.push("=".repeat(60));
    lines.push(`Generato da AI Comply Platform — ${new Date().toISOString()}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `registro-ai-literacy-art4-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Registro esportato");
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
              In vigore dal 2 Feb 2025
            </span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "#0D1016" }}>
            AI Literacy — Art. 4
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
            Registro documentale delle sessioni di formazione sull&apos;intelligenza artificiale
          </p>
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
            Esporta registro
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#0D1016" }}
          >
            <Plus className="h-4 w-4" />
            Aggiungi sessione
          </button>
        </div>
      </div>

      {/* ── B. Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen,   label: "Sessioni",         value: String(totalSessions) },
          { icon: Clock,      label: "Ore totali",        value: totalHours.toFixed(1) + " h" },
          { icon: Users,      label: "Partecipanti",      value: String(uniqueAttendees) },
          { icon: Calendar,   label: "Ultima sessione",   value: lastSession ? formatDate(lastSession.date).split(" ").slice(0, 2).join(" ") : "—" },
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
              Nuova sessione di formazione
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  Titolo sessione *
                </label>
                <input
                  type="text"
                  placeholder="es. Introduzione all'EU AI Act per il team legale"
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  Data *
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
                  Durata (minuti)
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
                  Categoria
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
                  Formatore / Ente erogatore
                </label>
                <input
                  type="text"
                  placeholder="es. Studio Legale X / Internal"
                  value={fTrainer}
                  onChange={e => setFTrainer(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  Partecipanti (separati da virgola)
                </label>
                <input
                  type="text"
                  placeholder="es. Team sviluppo, Responsabile AI, HR"
                  value={fAttendees}
                  onChange={e => setFAttendees(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                  Note / Contenuto trattato
                </label>
                <textarea
                  rows={3}
                  placeholder="Argomenti trattati, materiali distribuiti, valutazione esito..."
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
                Annulla
              </button>
              <button
                type="button"
                onClick={addSession}
                disabled={!fTitle.trim() || !fDate}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "#0D1016" }}
              >
                Registra sessione →
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
            Nessuna sessione registrata
          </p>
          <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: "rgba(0,0,0,0.35)" }}>
            Registra la prima sessione di formazione per soddisfare l&apos;obbligo Art. 4.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: "#0D1016" }}
          >
            <Plus className="h-4 w-4" /> Registra prima sessione
          </button>
        </div>
      )}

      {/* ── E. Sessions list ── */}
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
                        <span>{formatDate(session.date)}</span>
                        <span>·</span>
                        <span>{session.durationMinutes} min</span>
                        {session.attendees.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{session.attendees.length} partecipant{session.attendees.length === 1 ? "e" : "i"}</span>
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
                              Dettagli sessione
                            </p>
                            {[
                              ["Data",       formatDate(session.date)],
                              ["Durata",     session.durationMinutes + " minuti"],
                              ["Categoria",  CATEGORY_LABELS[session.category]],
                              ["Formatore",  session.trainer || "—"],
                            ].map(([k, v]) => (
                              <div key={k} className="flex gap-3 mb-1.5">
                                <span className="w-24 flex-shrink-0 text-xs" style={{ color: "rgba(0,0,0,0.38)" }}>{k}</span>
                                <span className="text-xs font-medium" style={{ color: "#0D1016" }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            {session.attendees.length > 0 && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(0,0,0,0.35)" }}>
                                  Partecipanti ({session.attendees.length})
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
                                  Note
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
          📋 <strong>Obbligo documentale</strong> —
        </span>{" "}
        <span style={{ color: "rgba(0,0,0,0.6)" }}>
          L&apos;Art. 4 non prescrive un formato specifico per la documentazione.
          Il presente registro costituisce evidenza della misura adottata. In caso di
          ispezione da parte dell&apos;Autorità di vigilanza nazionale, è necessario essere
          in grado di dimostrare le azioni intraprese.
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
