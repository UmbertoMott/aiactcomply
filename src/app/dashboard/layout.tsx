"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCode, Scale, ShieldAlert, BookMarked, ClipboardList, Crosshair,
  FileArchive, TrendingUp, Database, UserCheck, ArrowRightLeft, Map, Building2,
  Landmark, Zap, Menu, X, ChevronRight, ChevronLeft, ChevronDown,
  LogOut, Settings, LayoutGrid, Siren, Home, CalendarClock, ShieldCheck,
} from "lucide-react";
import { getDossierSections, getCompletionPercentage, aggregateDossier } from "@/lib/dossier/dossier-engine";
import { useUserRole, ROLE_LABELS } from "@/lib/hooks/useUserRole";
import { useOrgProfile } from "@/lib/hooks/useOrgProfile";
import { logout } from "./actions";
import NotificationBell from "@/components/notifications/NotificationBell";
import DisclosureModal from "@/components/disclosure/DisclosureModal";
import DisclosureBanner from "@/components/disclosure/DisclosureBanner";
import MachineMarkers from "@/components/disclosure/MachineMarkers";
import UserMenu from "@/components/dashboard/UserMenu";
import ChatAssistant from "@/components/ui/ChatAssistant";
import SessionWarning from "@/components/auth/SessionWarning";
import { ProjectSwitcher } from "@/components/layout/ProjectSwitcher";
import { sanitizeSidebarLabel } from "@/lib/sidebar/sidebar-utils";


type NavChild = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  art?: string;
  badge?: "urgent" | "new";
  flag?: "paItaly" | "gpaiDetected" | "nistEnabled";
  tooltip?: string;
};

type NavPillar = {
  id: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  art?: string;
  badge?: "urgent" | "new";
  href?: string;
  children?: NavChild[];
  tooltip?: string;
};

function SidebarTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <div className="relative w-full"
      onMouseEnter={() => { timer.current = setTimeout(() => setShow(true), 600); }}
      onMouseLeave={() => { if (timer.current) clearTimeout(timer.current); setShow(false); }}
    >
      {children}
      {show && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2.5 py-1.5 rounded-lg text-[11px] pointer-events-none whitespace-nowrap"
          style={{ background: "#1e2535", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", maxWidth: 200 }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

const PILLARS: NavPillar[] = [
  {
    id: "dashboard",
    icon: Home,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    id: "inventory",
    icon: LayoutGrid,
    label: "Inventario Sistemi AI",
    href: "/dashboard/tools/inventory",
    art: "Art. 6",
  },
  {
    id: "triage",
    icon: Crosshair,
    label: "Triage",
    href: "/dashboard/triage",
    art: "Art. 5/6/51",
  },
  {
    id: "risk",
    icon: ShieldAlert,
    label: "Risk Manager",
    art: "Art. 9/27/35",
    children: [
      { icon: Zap,           label: "Risk Register",  href: "/dashboard/tools/risk-manager", art: "Art. 9"  },
      { icon: BookMarked,    label: "FRIA",           href: "/dashboard/tools/fria",         art: "Art. 27" },
      { icon: ShieldAlert,   label: "DPIA",           href: "/dashboard/tools/dpia",         art: "Art. 35" },
    ],
  },
  {
    id: "docugen",
    icon: FileCode,
    label: "DocuGen AI",
    href: "/dashboard/tools/docugen",
    art: "All. IV",
    badge: "new",
  },
  {
    id: "data-audit",
    icon: ClipboardList,
    label: "Qualità Dati",
    href: "/dashboard/tools/data-audit",
    art: "Art. 10",
    tooltip: "Qualità e governance dei dati di training (Art. 10)",
  },
  {
    id: "deployer",
    icon: UserCheck,
    label: "Deployer Dashboard",
    href: "/dashboard/tools/deployer-dashboard",
    art: "Art. 26",
    badge: "new" as const,
  },
  {
    id: "compliance",
    icon: Scale,
    label: "Compliance Ops",
    art: "Art. 12–72",
    children: [
      { icon: CalendarClock,  label: "Scadenze",            href: "/dashboard/compliance-ops/deadlines",  art: "Timeline" },
      { icon: FileArchive,    label: "LogVault",            href: "/dashboard/tools/logvault",            art: "Art. 12", tooltip: "Registro log operativi e attività in deployment (Art. 12)" },
      { icon: TrendingUp,     label: "Post-Market",         href: "/dashboard/post-market",               art: "Art. 72-73" },
      { icon: Database,       label: "EUDB",                href: "/dashboard/compliance-ops/eudb",       art: "Art. 49" },
      { icon: UserCheck,      label: "Repr. Autorizzato",         href: "/dashboard/compliance-ops/authorized-rep", art: "Art. 22" },
      { icon: ArrowRightLeft, label: "Provider Transition", href: "/dashboard/compliance-ops/provider-transition", art: "Art. 28" },
      { icon: ShieldCheck,    label: "Trust Center",        href: "/dashboard/compliance-ops/trust-center", art: "Art. 13/50" },
      { icon: Scale,          label: "L.132/2025",          href: "/dashboard/tools/l132",                art: "PA Italy", flag: "paItaly" },
      { icon: Landmark,       label: "AGID/ACN",            href: "/dashboard/tools/agid-acn",            art: "PA Italy", flag: "paItaly" },
      { icon: Map,            label: "NIST AI RMF",         href: "/dashboard/tools/nist-ai-rmf",         art: "NIST", flag: "nistEnabled" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [dossierPct, setDossierPct] = useState(0);
  const [trustCenterPublished, setTrustCenterPublished] = useState(false);
  const { role } = useUserRole();
  const { profile: orgProfile } = useOrgProfile();

  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const pillar of PILLARS) {
      if (pillar.children?.some((c) => pathname.startsWith(c.href))) {
        set.add(pillar.id);
      }
    }
    return set;
  });

  function togglePillar(id: string) {
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isChildVisible(child: NavChild): boolean {
    if (!child.flag) return true;
    return !!orgProfile[child.flag];
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") localStorage.setItem("sidebar_collapsed", String(next));
  }

  useEffect(() => {
    const data = aggregateDossier();
    const sections = getDossierSections(data);
    setDossierPct(getCompletionPercentage(sections));
    // Trust Center published state
    try {
      const raw = localStorage.getItem("aicomply_trust_center_v1");
      if (raw) {
        const pages = JSON.parse(raw) as Record<string, { isPublished?: boolean }>;
        setTrustCenterPublished(Object.values(pages).some(p => p.isPublished));
      }
    } catch { /* silent */ }
  }, [pathname]);

  const currentItem = PILLARS.flatMap((p) =>
    p.href ? [{ label: p.label, href: p.href }] : (p.children ?? [])
  ).find((i) => pathname.startsWith(i.href));

  const sidebarW = collapsed ? "w-[52px]" : "w-56";

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: "#FAFAF9" }}>
      {/* Art. 50 — machine-readable markers (meta tags + JSON-LD) */}
      <MachineMarkers />
      {/* Art. 50 — first-session blocking modal */}
      <DisclosureModal lang="it" />
      {/* Art. 50 — persistent non-dismissible banner */}
      <DisclosureBanner lang="it" />
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`relative fixed inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-200 lg:translate-x-0 lg:static lg:z-auto select-none ${sidebarW} ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#0D1016", cursor: "default" }}
      >
        {/* Logo */}
        <div
          className="h-14 flex items-center justify-between px-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          {collapsed ? (
            <Link href="/" className="w-full flex items-center justify-center text-[13px] font-bold" style={{ color: "#ffffff" }}>
              AI
            </Link>
          ) : (
            <>
              <Link href="/" className="text-[15px] font-semibold" style={{ color: "#ffffff", letterSpacing: "-0.4px" }}>
                AI<span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 300 }}>Comply</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: "rgba(255,255,255,0.5)" }}>
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4" style={{ scrollbarWidth: "none" }}>
          <nav className={collapsed ? "px-1.5" : "px-3"}>

            {/* Dossier */}
            <div className="mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <Link
                href="/dashboard/dossier"
                onClick={() => setSidebarOpen(false)}
                title="Dossier"
                className={`flex items-center ${collapsed ? "justify-center px-0 py-2" : "justify-between px-2 py-2"} rounded-md text-[11px] transition-all`}
                style={
                  pathname.startsWith("/dashboard/dossier")
                    ? { background: "rgba(255,255,255,0.12)", color: "#ffffff" }
                    : { color: "rgba(255,255,255,0.7)" }
                }
              >
                <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
                  <FileArchive className="h-3.5 w-3.5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">Dossier</span>}
                </div>
                {!collapsed && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: dossierPct >= 80 ? "rgba(22,163,74,0.3)" : dossierPct >= 40 ? "rgba(202,138,4,0.3)" : "rgba(220,38,38,0.3)",
                      color: dossierPct >= 80 ? "#86efac" : dossierPct >= 40 ? "#fde68a" : "#fca5a5",
                    }}
                  >
                    {dossierPct}%
                  </span>
                )}
              </Link>
            </div>

            {/* 5 Pilastri */}
            {PILLARS.map((pillar) => {
              const isExpanded = expandedPillars.has(pillar.id);
              const isPillarActive = pillar.href
                ? pathname.startsWith(pillar.href)
                : pillar.children?.some((c) => pathname.startsWith(c.href)) ?? false;

              if (!pillar.children) {
                const leafLink = (
                  <Link
                    key={pillar.id}
                    href={pillar.href!}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? pillar.label : undefined}
                    className={`flex items-center ${collapsed ? "justify-center px-0 py-2" : "justify-between px-2 py-1.5"} rounded-md text-[11px] mb-0.5 transition-all`}
                    style={isPillarActive
                      ? { background: "rgba(255,255,255,0.12)", color: "#ffffff" }
                      : { color: "rgba(255,255,255,0.65)" }}
                  >
                    <div className={`flex items-center min-w-0 ${collapsed ? "" : "gap-2"}`}>
                      <pillar.icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{sanitizeSidebarLabel(pillar.label)}</span>}
                    </div>
                    {!collapsed && pillar.art && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                        {pillar.badge === "urgent" ? "⚡" : sanitizeSidebarLabel(pillar.art)}
                      </span>
                    )}
                  </Link>
                );
                return !collapsed && pillar.tooltip
                  ? <SidebarTooltip key={pillar.id} text={pillar.tooltip}>{leafLink}</SidebarTooltip>
                  : leafLink;
              }

              const visibleChildren = pillar.children.filter(isChildVisible);
              if (visibleChildren.length === 0) return null;

              return (
                <div key={pillar.id} className="mb-0.5">
                  <button
                    onClick={() => collapsed ? undefined : togglePillar(pillar.id)}
                    title={collapsed ? pillar.label : undefined}
                    className={`w-full flex items-center ${collapsed ? "justify-center px-0 py-2" : "justify-between px-2 py-1.5"} rounded-md text-[11px] transition-all`}
                    style={isPillarActive
                      ? { background: "rgba(255,255,255,0.08)", color: "#ffffff" }
                      : { color: "rgba(255,255,255,0.65)" }}
                  >
                    <div className={`flex items-center min-w-0 ${collapsed ? "" : "gap-2"}`}>
                      <pillar.icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium truncate">{sanitizeSidebarLabel(pillar.label)}</span>}
                    </div>
                    {!collapsed && (
                      <div className="flex items-center gap-1">
                        {pillar.art && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                            {sanitizeSidebarLabel(pillar.art)}
                          </span>
                        )}
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        />
                      </div>
                    )}
                  </button>

                  {(isExpanded || collapsed) && (
                    <div className={collapsed ? "" : "ml-3 mt-0.5 space-y-0.5"}>
                      {visibleChildren.map((child) => {
                        const isActive = pathname.startsWith(child.href);
                        const childLink = (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            title={collapsed ? child.label : undefined}
                            className={`flex items-center ${collapsed ? "justify-center px-0 py-1.5" : "justify-between px-2 py-1"} rounded-md text-[11px] transition-all`}
                            style={isActive
                              ? { background: "rgba(255,255,255,0.12)", color: "#ffffff" }
                              : { color: "rgba(255,255,255,0.5)" }}
                          >
                            <div className={`flex items-center min-w-0 ${collapsed ? "" : "gap-2"}`}>
                              {!collapsed && <div className="w-px h-3 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />}
                              <child.icon className="h-3 w-3 flex-shrink-0" />
                              {!collapsed && <span className="truncate">{sanitizeSidebarLabel(child.label)}</span>}
                            </div>
                            {!collapsed && (
                              child.href === "/dashboard/compliance-ops/trust-center" && trustCenterPublished
                                ? <span className="text-[9px] px-1 py-0.5 rounded border" style={{ background: "rgba(6,78,59,0.4)", color: "#6ee7b7", borderColor: "rgba(52,211,153,0.3)" }}>Pubblicato</span>
                                : child.art
                                  ? <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>{sanitizeSidebarLabel(child.art)}</span>
                                  : null
                            )}
                          </Link>
                        );
                        return !collapsed && child.tooltip
                          ? <SidebarTooltip key={child.href} text={child.tooltip}>{childLink}</SidebarTooltip>
                          : childLink;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Settings */}
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <Link
                href="/dashboard/account"
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? "Settings" : undefined}
                className={`flex items-center ${collapsed ? "justify-center px-0 py-2" : "gap-2 px-2 py-1.5"} rounded-md text-[11px] transition-all`}
                style={pathname.startsWith("/dashboard/account")
                  ? { background: "rgba(255,255,255,0.12)", color: "#ffffff" }
                  : { color: "rgba(255,255,255,0.5)" }}
              >
                <Settings className="h-3.5 w-3.5" />
                {!collapsed && <span>Settings</span>}
              </Link>
            </div>
          </nav>
        </div>

        {/* Logout */}
        <div
          className={`flex-shrink-0 ${collapsed ? "px-1.5" : "px-3"} py-4`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <form action={logout}>
            <button
              type="submit"
              title="Esci"
              className={`flex items-center ${collapsed ? "justify-center w-full py-1.5" : "gap-2 w-full px-2 py-1.5"} rounded-md text-[11px] transition-all`}
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && "Esci"}
            </button>
          </form>
        </div>

        {/* Collapse toggle — straddling the right edge */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110"
          style={{
            background: "#1e2330",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-14 flex items-center px-6 flex-shrink-0"
          style={{ background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-4"
            style={{ color: "rgba(0,0,0,0.4)" }}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            <Link href="/dashboard" className="hover:opacity-70 transition-opacity">Dashboard</Link>
            {currentItem && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span style={{ color: "#0D1016" }}>{currentItem.label}</span>
              </>
            )}
          </div>
          {role && (
            <div className="ml-4 hidden lg:flex items-center gap-1.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(0,0,0,0.05)",
                  color: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {ROLE_LABELS[role]}
              </span>
              <Link
                href="/dashboard/onboarding?changeRole=1"
                className="text-[10px] transition-opacity hover:opacity-70"
                style={{ color: "rgba(0,0,0,0.3)" }}
              >
                cambia
              </Link>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ProjectSwitcher />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 w-full">{children}</main>
      </div>
      </div>

      {/* AI Chat Assistant — globale, flottante bottom-right */}
      <ChatAssistant />
      {/* Session Warning — popup avviso scadenza sessione 5 min prima */}
      <SessionWarning />
    </div>
  );
}
