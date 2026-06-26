"use client";

import React, { useState, useEffect, useCallback, CSSProperties } from "react";
import Link from "next/link";
import {
  CalendarClock, ChevronDown, Sparkles,
  Loader2, Check, ExternalLink, Info, AlertTriangle, Archive, RotateCcw,
} from "lucide-react";
import { AI_ACT_DEADLINES, DEADLINE_ACTIONS } from "@/lib/deadlines/deadline-constants";
import { buildDynamicDeadlines, filterDeadlinesByTier } from "@/lib/deadlines/deadline-aggregator";
import { getDeadlineStatus, daysUntil, STATUS_COLOR } from "@/lib/deadlines/deadline-status";
import { prioritizeDeadlines } from "@/lib/deadlines/deadline-actions";
import { partitionDeadlines } from "@/lib/deadlines/partition-deadlines";
import type { AIActDeadline, AIActTier, DeadlineStatus, UserRole } from "@/lib/deadlines/deadline-types";
import { ROLE_PRIORITY, ROLE_LABEL } from "@/lib/deadlines/deadline-types";
import type { PriorityGroup } from "@/lib/deadlines/deadline-actions";
import { loadInventory } from "@/lib/inventory/ai-system";
import type { AISystem } from "@/lib/inventory/ai-system";

// ─── Design tokens (light theme) ───────────────────────────────────────────────
const BG   = "#FAFAF9";
const BG2  = "#ffffff";
const BG3  = "#F3F4F6";
const TEXT = "#0D1016";
const MUTED= "rgba(0,0,0,0.45)";
const BORDER = "rgba(0,0,0,0.08)";
const FONT: CSSProperties = { fontFamily: "Inter, system-ui, sans-serif" };

const SEV: Record<string, { color: string; bg: string; border: string }> = {
  critical:      { color: "#DC2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)" },
  important:     { color: "rgba(0,0,0,0.65)", bg: "rgba(0,0,0,0.03)", border: "rgba(0,0,0,0.1)" },
  informational: { color: "rgba(0,0,0,0.40)", bg: "transparent",      border: "transparent" },
};

const TIMELINE_PREFS_KEY      = "aicomply_timeline_prefs";
const TIMELINE_COPILOT_KEY    = "aicomply_timeline_copilot_confirmed";
const TIMELINE_ROLE_KEY       = "aicomply_timeline_role";
const TIMELINE_SYSTEM_KEY     = "aicomply_timeline_system_filter";
const TIMELINE_RESTORED_KEY   = "aicomply_timeline_restored_deadlines";

function getPrefs(): { viewMode: "ai" | "chronological"; filterStatus?: DeadlineStatus } {
  if (typeof window === "undefined") return { viewMode: "chronological" };
  try { return JSON.parse(localStorage.getItem(TIMELINE_PREFS_KEY) ?? "{}") ?? { viewMode: "chronological" }; }
  catch { return { viewMode: "chronological" }; }
}
function savePrefs(p: { viewMode: "ai" | "chronological"; filterStatus?: DeadlineStatus }) {
  localStorage.setItem(TIMELINE_PREFS_KEY, JSON.stringify(p));
}

/**
 * Ruolo e filtro-sistema sono preferenze dell'utente che naviga la pagina,
 * non dati legati a un singolo sistema AI — restano globali (non scoped
 * per systemId) per evitare che l'utente debba ri-selezionarli ad ogni
 * cambio di sistema attivo.
 */
function getStoredRole(): UserRole {
  if (typeof window === "undefined") return "compliance_officer";
  const v = localStorage.getItem(TIMELINE_ROLE_KEY);
  return (v as UserRole) ?? "compliance_officer";
}
function saveStoredRole(role: UserRole) {
  localStorage.setItem(TIMELINE_ROLE_KEY, role);
}
function getStoredSystemFilter(): string {
  if (typeof window === "undefined") return "all";
  return localStorage.getItem(TIMELINE_SYSTEM_KEY) ?? "all";
}
function saveStoredSystemFilter(id: string) {
  localStorage.setItem(TIMELINE_SYSTEM_KEY, id);
}

// ─── Dot component ─────────────────────────────────────────────────────────────
function TimelineDot({ status }: { status: DeadlineStatus }) {
  const isImminent = status === "imminent";
  return (
    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
      style={{
        background: isImminent ? "#DC2626"
          : status === "upcoming" ? "#0D1016"
          : "rgba(0,0,0,0.18)",
      }} />
  );
}

// ─── Article badge ─────────────────────────────────────────────────────────────
function ArticleBadge({ article }: { article: string }) {
  const short = article.split(" ").slice(0, 2).join(" ");
  return (
    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "rgba(0,0,0,0.04)", color: MUTED, border: `1px solid ${BORDER}` }}>
      {short}
    </span>
  );
}

// ─── Single deadline card ──────────────────────────────────────────────────────
function DeadlineCard({ deadline, isLast, onRestore }: { deadline: AIActDeadline; isLast: boolean; onRestore?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = getDeadlineStatus(deadline.date);
  const days = daysUntil(deadline.date);
  const sc = STATUS_COLOR[status];
  const sev = SEV[deadline.severity] ?? SEV.informational;
  const actions = DEADLINE_ACTIONS[deadline.id] ?? [];

  return (
    <div className="flex gap-4">
      {/* Left: dot + line */}
      <div className="flex flex-col items-center" style={{ width: 8 }}>
        <TimelineDot status={status} />
        {!isLast && (
          <div className="flex-1 w-px mt-1" style={{ background: BORDER }} />
        )}
      </div>

      {/* Right: card */}
      <div className="flex-1 pb-5">
        <button
          className="w-full text-left rounded-xl px-4 py-3 transition-all duration-150"
          style={{ background: expanded ? BG3 : "transparent", border: `1px solid ${expanded ? BORDER : "transparent"}`, cursor: "pointer" }}
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ArticleBadge article={deadline.article} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: status === "passed" ? MUTED : TEXT }}>
                  {deadline.label}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px]" style={{ color: status === "passed" ? MUTED : status === "imminent" ? "#DC2626" : MUTED }}>
                    {status === "passed"
                      ? `Passata ${Math.abs(days)} giorni fa`
                      : `${days} giorni`}
                  </span>
                  {deadline.severity === "critical" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                      critica
                    </span>
                  )}
                  {deadline.isDynamic && (
                    <span className="text-[10px]" style={{ color: MUTED }}>dinamica</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRestore && (
                <button
                  onClick={e => { e.stopPropagation(); onRestore(); }}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: "rgba(79,70,229,0.10)", color: "#4f46e5", border: "1px solid rgba(79,70,229,0.22)", cursor: "pointer" }}>
                  <RotateCcw size={11} /> Ripristina
                </button>
              )}
              {deadline.tool_href && (
                <Link href={deadline.tool_href}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: "#0D1016", color: "#fff", textDecoration: "none" }}
                  onClick={e => e.stopPropagation()}>
                  Vai →
                </Link>
              )}
              <ChevronDown size={13} style={{ color: MUTED, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-1 px-4 pb-3 rounded-b-xl" style={{ background: BG3, border: `1px solid ${BORDER}`, borderTop: "none", marginTop: -4 }}>
            <p className="text-[12px] leading-relaxed pt-3 pb-2" style={{ color: MUTED }}>
              {deadline.description}
            </p>
            {deadline.sourceSystemName && (
              <p className="text-[11px] mb-2" style={{ color: "#a78bfa" }}>
                Sistema: {deadline.sourceSystemName}
              </p>
            )}
            {actions.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>
                  Azioni
                </p>
                <ul className="space-y-1.5">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(0,0,0,0.25)" }} />
                      {a.href
                        ? <Link href={a.href} className="text-[12px] hover:underline" style={{ color: TEXT }}>{a.label}</Link>
                        : <span className="text-[12px]" style={{ color: TEXT }}>{a.label}</span>
                      }
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary cards ─────────────────────────────────────────────────────────────
function SummaryCards({
  deadlines,
  activeFilter,
  onFilter,
}: {
  deadlines: AIActDeadline[];
  activeFilter: DeadlineStatus | null;
  onFilter: (s: DeadlineStatus | null) => void;
}) {
  const counts: Record<DeadlineStatus, number> = { passed: 0, imminent: 0, upcoming: 0, future: 0 };
  deadlines.forEach(d => { counts[getDeadlineStatus(d.date)]++; });

  const cards: { status: DeadlineStatus; label: string }[] = [
    { status: "imminent", label: "Urgenti" },
    { status: "upcoming", label: "In arrivo" },
    { status: "future",   label: "Future"   },
    { status: "passed",   label: "Passate"  },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(({ status, label }) => {
        const sc = STATUS_COLOR[status];
        const isActive = activeFilter === status;
        return (
          <button
            key={status}
            onClick={() => onFilter(isActive ? null : status)}
            className="rounded-xl px-4 py-3 text-left transition-all duration-150"
            style={{
              background: BG2,
              border: isActive ? `1px solid #0D1016` : `1px solid ${BORDER}`,
              opacity: activeFilter && !isActive ? 0.4 : 1,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
            <p className="text-2xl font-semibold" style={{ color: status === "imminent" && counts[status] > 0 ? "#DC2626" : TEXT }}>{counts[status]}</p>
            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{label}</p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Next deadline banner ──────────────────────────────────────────────────────
function NextDeadlineBanner({ deadline }: { deadline: AIActDeadline }) {
  const status = getDeadlineStatus(deadline.date);
  const days = daysUntil(deadline.date);
  const sev = SEV[deadline.severity] ?? SEV.informational;
  const isImminent = status === "imminent";

  return (
    <div className="rounded-xl px-5 py-4 mb-6 flex items-center gap-5"
      style={{
        background: BG2,
        border: isImminent ? `1px solid rgba(220,38,38,0.2)` : `1px solid ${BORDER}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MUTED }}>
          Prossima scadenza
        </p>
        <div className="flex items-baseline gap-2 mb-0.5">
          <p className="text-2xl font-semibold" style={{ color: isImminent ? "#DC2626" : TEXT }}>
            {days} giorni
          </p>
          <ArticleBadge article={deadline.article} />
        </div>
        <p className="text-[13px]" style={{ color: TEXT }}>{deadline.label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
          {new Date(deadline.date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      {deadline.tool_href && (
        <Link href={deadline.tool_href}
          className="flex-shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: "#0D1016", color: "#fff", textDecoration: "none" }}>
          Vai →
        </Link>
      )}
    </div>
  );
}

// ─── Copilot panel ─────────────────────────────────────────────────────────────
function CopilotPanel({
  deadlines,
  systemName,
  tier,
}: {
  deadlines: AIActDeadline[];
  systemName: string;
  tier: string;
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<PriorityGroup[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const result = await prioritizeDeadlines(deadlines, { systemName, tier });
      setGroups(result.priorityGroups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore AI");
    } finally { setLoading(false); }
  }

  function confirmPrioritization() {
    setConfirmed(true);
    const key = JSON.stringify(groups?.map(g => g.items.map(i => i.deadlineId)));
    const stored = JSON.parse(localStorage.getItem(TIMELINE_COPILOT_KEY) ?? "{}");
    localStorage.setItem(TIMELINE_COPILOT_KEY, JSON.stringify({ ...stored, [key]: true }));
  }

  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: BG2, border: `1px solid rgba(124,58,237,0.2)`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: "#a78bfa" }} />
          <p className="text-sm font-semibold" style={{ color: TEXT }}>✦ AI — Prioritizzazione scadenze</p>
        </div>
        {!groups && (
          <button onClick={run} disabled={loading}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "#0D1016", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Analisi in corso..." : "Genera prioritizzazione AI"}
          </button>
        )}
      </div>
      <p className="text-[11px] mb-3" style={{ color: MUTED }}>
        ✦ AI — verifica e conferma: il copilot ordina e raggruppa le scadenze in base a severita normativa e sanzioni. Non inventa scadenze — quelle sono sempre derivate dall&apos;AI Act o dagli altri tool.
      </p>
      {error && <p className="text-[12px]" style={{ color: "#ef4444" }}>{error}</p>}
      {groups && (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#a78bfa" }}>{group.label}</p>
              <ul className="space-y-1.5">
                {group.items.map(item => {
                  const d = deadlines.find(dl => dl.id === item.deadlineId);
                  return (
                    <li key={item.deadlineId} className="rounded-lg px-3 py-2"
                      style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
                      <p className="text-[12px] font-medium" style={{ color: TEXT }}>{d?.label ?? item.deadlineId}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{item.reasoning}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {!confirmed && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" onChange={e => { if (e.target.checked) confirmPrioritization(); }} />
              <span className="text-[12px]" style={{ color: MUTED }}>Confermo questa prioritizzazione (imposta aiConfirmed = true)</span>
            </label>
          )}
          {confirmed && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "#4ade80" }}>
              <Check size={13} /> Prioritizzazione confermata
            </div>
          )}
          <button onClick={() => { setGroups(null); setConfirmed(false); }}
            className="text-[11px] underline" style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}>
            Rigenera
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DeadlinesPage() {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<AIActDeadline[]>([]);
  const [filterStatus, setFilterStatus] = useState<DeadlineStatus | null>(null);
  const [viewMode, setViewMode] = useState<"ai" | "chronological">("chronological");
  const [showCopilot, setShowCopilot] = useState(false);
  const [aiGroups, setAiGroups] = useState<PriorityGroup[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("compliance_officer");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [restoredIds, setRestoredIds] = useState<string[]>([]);

  const buildDeadlines = useCallback((invSystems: AISystem[]) => {
    // Determina tier utente dall'inventory
    const userTiers = new Set<AIActTier>(["all"]);
    invSystems.forEach(s => {
      if (s.tier === "high_risk") { userTiers.add("high_risk_annex3"); }
      else if (s.tier === "gpai_systemic") { userTiers.add("gpai_systemic"); userTiers.add("gpai"); }
      else if (s.tier === "gpai") { userTiers.add("gpai"); }
      else if (s.tier === "limited") { userTiers.add("limited"); }
      else if (s.tier === "minimal") { userTiers.add("minimal"); }
      else if (s.tier === "prohibited") { userTiers.add("prohibited"); }
    });

    const staticFiltered = invSystems.length > 0
      ? filterDeadlinesByTier(AI_ACT_DEADLINES, Array.from(userTiers))
      : AI_ACT_DEADLINES.filter(d => d.applies_to.includes("all"));

    const dynamic = buildDynamicDeadlines(invSystems);
    const combined = [...staticFiltered, ...dynamic].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setAllDeadlines(combined);
  }, []);

  useEffect(() => {
    const inv = loadInventory();
    setSystems(inv);
    buildDeadlines(inv);
    const prefs = getPrefs();
    setViewMode(prefs.viewMode ?? "chronological");
    setUserRole(getStoredRole());
    setSystemFilter(getStoredSystemFilter());
    try {
      const raw = localStorage.getItem(TIMELINE_RESTORED_KEY);
      if (raw) setRestoredIds(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, [buildDeadlines]);

  // Isolamento per sistema — le scadenze statiche (senza sourceSystemId) restano sempre visibili,
  // quelle dinamiche per-sistema vengono filtrate quando l'utente seleziona un sistema specifico.
  const scopedDeadlines = systemFilter === "all"
    ? allDeadlines
    : allDeadlines.filter(d => !d.sourceSystemId || d.sourceSystemId === systemFilter);

  function handleRestore(id: string) {
    const next = restoredIds.includes(id) ? restoredIds : [...restoredIds, id];
    setRestoredIds(next);
    try { localStorage.setItem(TIMELINE_RESTORED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setShowArchived(true); // rimane aperta per feedback visivo
  }

  const { active: _activeRaw, archived: _archivedRaw } = React.useMemo(
    () => partitionDeadlines(scopedDeadlines),
    [scopedDeadlines]
  );

  // Scadenze ripristinate manualmente: spostate dall'archivio alla lista attiva
  const activeDeadlines  = React.useMemo(
    () => [..._activeRaw, ..._archivedRaw.filter(d => restoredIds.includes(d.id))],
    [_activeRaw, _archivedRaw, restoredIds]
  );
  const archivedDeadlines = React.useMemo(
    () => _archivedRaw.filter(d => !restoredIds.includes(d.id)),
    [_archivedRaw, restoredIds]
  );

  const statusFiltered = filterStatus
    ? activeDeadlines.filter(d => getDeadlineStatus(d.date) === filterStatus)
    : activeDeadlines;

  const displayed = React.useMemo(() => {
    const priorityOrder = ROLE_PRIORITY[userRole];
    return [...statusFiltered].sort((a, b) => {
      const ai = priorityOrder.indexOf(a.category ?? "general");
      const bi = priorityOrder.indexOf(b.category ?? "general");
      if (ai !== bi) return ai - bi;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [statusFiltered, userRole]);

  const nextDeadline = activeDeadlines.find(d => getDeadlineStatus(d.date) !== "passed");

  const primarySystem = systemFilter === "all" ? systems[0] : systems.find(s => s.id === systemFilter);

  // Alert Annex III — sistema high-risk + scadenza 2 agosto 2026 entro 60 giorni
  const aug2026 = new Date("2026-08-02");
  const daysToAnnexIII = Math.ceil((aug2026.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const hasHighRiskInScope = systemFilter === "all"
    ? systems.some(s => s.tier === "high_risk")
    : primarySystem?.tier === "high_risk";
  const showUrgentBanner = hasHighRiskInScope && daysToAnnexIII > 0 && daysToAnnexIII <= 60;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64" style={{ ...FONT, color: MUTED }}>
        <Loader2 size={20} className="animate-spin mr-2" /> Caricamento scadenze...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: BG, ...FONT }}>
      <div className="w-full">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <CalendarClock size={20} style={{ color: MUTED }} />
              <h1 className="text-2xl font-semibold" style={{ color: TEXT }}>Scadenze AI Act</h1>
            </div>
            <p className="text-sm" style={{ color: MUTED }}>
              {systems.length > 0
                ? `${activeDeadlines.length} scadenze attive${systemFilter === "all" ? ` per ${systems.length} sistema${systems.length !== 1 ? "i" : ""} nell'inventario` : ` — ${primarySystem?.name ?? ""}`}`
                : "Dati statici — completa il Triage per scadenze personalizzate"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: "#a78bfa" }}>
              ✦ AI — verifica e conferma: date e articoli richiedono validazione legale contro Reg. (UE) 2024/1689.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {systems.length > 0 && (
              <select
                value={systemFilter}
                onChange={(e) => {
                  setSystemFilter(e.target.value);
                  saveStoredSystemFilter(e.target.value);
                }}
                className="text-[12px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
                style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <option value="all">Tutti i sistemi</option>
                {systems.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            <select
              value={userRole}
              onChange={(e) => {
                const next = e.target.value as UserRole;
                setUserRole(next);
                saveStoredRole(next);
              }}
              className="text-[12px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
              style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
            >
              {(Object.keys(ROLE_LABEL) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const next = viewMode === "chronological" ? "ai" : "chronological";
                setViewMode(next);
                savePrefs({ viewMode: next });
                if (next === "ai") setShowCopilot(true);
              }}
              title={viewMode === "ai" ? "Disattiva vista AI" : "Attiva vista AI"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                opacity: viewMode === "ai" ? 1 : 0.35,
                transition: "opacity 0.15s",
              }}>
              <Sparkles size={16} style={{ color: "#0D1016" }} />
            </button>
          </div>
        </div>

        {/* Alert prioritario Annex III */}
        {showUrgentBanner && (
          <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-6 flex-wrap"
            style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.25)" }}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} style={{ color: "#D97706", flexShrink: 0 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#92400e" }}>
                  Scadenza Annex III — {daysToAnnexIII} giorni
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
                  I sistemi ad alto rischio devono essere conformi entro il 2 agosto 2026. Verifica dossier, EUDB e documentazione tecnica.
                </p>
              </div>
            </div>
            <span className="font-mono text-[11px] px-2 py-1 rounded flex-shrink-0"
              style={{ background: "rgba(217,119,6,0.1)", color: "#92400e", border: "1px solid rgba(217,119,6,0.25)" }}>
              Art. 6–51
            </span>
          </div>
        )}

        {/* Empty state — no inventory */}
        {systems.length === 0 && (
          <div className="rounded-xl p-5 mb-6 flex items-start gap-3"
            style={{ background: BG2, border: `1px solid rgba(59,130,246,0.2)` }}>
            <Info size={14} style={{ color: MUTED, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: TEXT }}>Scadenze personalizzate non disponibili</p>
              <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
                Stai visualizzando solo le scadenze che si applicano a tutti i sistemi AI.
                Completa il <Link href="/dashboard/triage" className="underline" style={{ color: "#0D1016" }}>Triage</Link> o
                aggiungi sistemi all&apos;<Link href="/dashboard/tools/inventory" className="underline" style={{ color: "#0D1016" }}>Inventario</Link> per scadenze filtrate per il tuo tier normativo.
              </p>
            </div>
          </div>
        )}

        {/* Next deadline banner */}
        {nextDeadline && <NextDeadlineBanner deadline={nextDeadline} />}

        {/* Summary cards */}
        <SummaryCards
          deadlines={activeDeadlines}
          activeFilter={filterStatus}
          onFilter={setFilterStatus}
        />


        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              {filterStatus ? `Filtro: ${filterStatus} (${displayed.length})` : `Tutte le scadenze (${displayed.length})`}
            </p>
            {filterStatus && (
              <button onClick={() => setFilterStatus(null)}
                className="text-[11px]" style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Rimuovi filtro
              </button>
            )}
          </div>

          {displayed.length === 0 ? (
            <div className="text-center py-16" style={{ color: MUTED }}>
              <CalendarClock size={40} className="mx-auto mb-4 opacity-30" />
              <p>Nessuna scadenza per il filtro selezionato</p>
            </div>
          ) : (
            <div>
              {displayed.map((deadline, i) => (
                <div key={deadline.id}>
                  {restoredIds.includes(deadline.id) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 20, fontSize: 10, color: "#4f46e5" }}>
                      <RotateCcw size={10} /> Ripristinata dall&apos;archivio
                    </div>
                  )}
                  <DeadlineCard deadline={deadline} isLast={i === displayed.length - 1} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archivio scadenze passate */}
        {archivedDeadlines.length > 0 && (
          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-2 text-[12px] transition-colors"
              style={{ color: MUTED, background: "none", border: "none", cursor: "pointer" }}
            >
              <Archive size={13} />
              {archivedDeadlines.length} scadenze archiviate
              <ChevronDown size={13} style={{ transform: showArchived ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            </button>
            {showArchived && (
              <div className="mt-4" style={{ opacity: 0.7 }}>
                {archivedDeadlines.map((deadline, i) => (
                  <DeadlineCard
                    key={deadline.id}
                    deadline={deadline}
                    isLast={i === archivedDeadlines.length - 1}
                    onRestore={() => handleRestore(deadline.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 pt-4 text-[11px] leading-relaxed" style={{ borderTop: `1px solid ${BORDER}`, color: MUTED }}>
          ✦ AI — verifica e conferma: questo tool e un aggregatore di navigazione, non un documento di compliance formale.
          Le scadenze dinamiche sono calcolate a runtime dai dati degli altri moduli. Verificare sempre le date contro il testo consolidato
          del Regolamento (UE) 2024/1689 [verify against current AI Act text] con il team legale prima di ogni decisione operativa.
        </div>
      </div>
    </div>
  );
}
