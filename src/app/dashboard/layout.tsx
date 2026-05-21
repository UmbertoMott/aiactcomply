"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, Box, GitBranch, Users, Eye, Activity,
  Menu, X, ChevronRight, ChevronLeft, LogOut, Database, Network, Ban,
  FileArchive, Scale, Search, Cpu, Bell, BadgeCheck, BarChart2,
} from "lucide-react";
import { getDossierSections, getCompletionPercentage, aggregateDossier } from "@/lib/dossier/dossier-engine";
import { logout } from "./actions";
import NotificationBell from "@/components/notifications/NotificationBell";
import DisclosureModal from "@/components/disclosure/DisclosureModal";
import DisclosureBanner from "@/components/disclosure/DisclosureBanner";
import MachineMarkers from "@/components/disclosure/MachineMarkers";

type NavItem = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  art: string;
  urgent?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { icon: Search, label: "Discovery", href: "/dashboard/discovery", art: "" },
      { icon: Database, label: "Evidence Layer", href: "/dashboard/evidence-layer", art: "Core" },
    ],
  },
  {
    label: "Moduli",
    items: [
      { icon: Box, label: "AIA-Architect", href: "/dashboard/modules/aia-architect", art: "Art. 11" },
      { icon: Activity, label: "Guardian-Agent", href: "/dashboard/modules/guardian-agent", art: "Art. 14" },
      { icon: Eye, label: "Trust-Labeler", href: "/dashboard/modules/trust-labeler", art: "Art. 50" },
      { icon: Activity, label: "Post-Market", href: "/dashboard/post-market", art: "Art. 72" },
      { icon: Shield, label: "Compliance-Nexus", href: "/dashboard/compliance-nexus", art: "Art. 71" },
      { icon: Cpu, label: "GPAI Module", href: "/dashboard/modules/gpai", art: "Art. 51-55" },
      { icon: BarChart2, label: "XAI Center", href: "/dashboard/modules/xai", art: "Art. 13" },
    ],
  },
  {
    label: "Integrazioni",
    items: [
      { icon: GitBranch, label: "Connectors", href: "/dashboard/connectors", art: "" },
      { icon: Network, label: "Trust Center", href: "/dashboard/trust-center", art: "" },
      { icon: Bell, label: "Notifiche", href: "/dashboard/notifications", art: "" },
    ],
  },
  {
    label: "Tool",
    items: [
      { icon: Ban,    label: "Art. 5 Checker", href: "/dashboard/tools/prohibited", art: "Art. 5", urgent: true },
      { icon: Shield, label: "AI Classifier",  href: "/dashboard/tools/classifier", art: "Art. 6" },
      { icon: Activity, label: "Drift Detection", href: "/dashboard/tools/risk-manager", art: "Art. 9" },
      { icon: Database, label: "Data Audit", href: "/dashboard/tools/data-audit", art: "Art. 10" },
      { icon: Box, label: "DocuGen AI", href: "/dashboard/tools/docugen", art: "Art. 11" },
      { icon: Eye, label: "LogVault", href: "/dashboard/tools/logvault", art: "Art. 12" },
      { icon: Eye, label: "Transparency", href: "/dashboard/tools/transparency", art: "Art. 13" },
      { icon: Users, label: "Oversight", href: "/dashboard/tools/oversight", art: "Art. 14" },
      { icon: Shield, label: "Resilience", href: "/dashboard/tools/resilience", art: "Art. 15" },
      { icon: Shield, label: "QMS Builder", href: "/dashboard/tools/qms", art: "Art. 17" },
      { icon: Scale,      label: "FRIA",       href: "/dashboard/tools/fria",       art: "Art. 27" },
      { icon: BadgeCheck, label: "Conformity", href: "/dashboard/tools/conformity", art: "Art. 43" },
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

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") localStorage.setItem("sidebar_collapsed", String(next));
  }

  useEffect(() => {
    const data = aggregateDossier();
    const sections = getDossierSections(data);
    setDossierPct(getCompletionPercentage(sections));
  }, [pathname]);

  const currentItem = navGroups
    .flatMap((g) => g.items)
    .find((i) => pathname.startsWith(i.href));

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
            <Link href="/dashboard" className="w-full flex items-center justify-center text-[13px] font-bold" style={{ color: "#ffffff" }}>
              AI
            </Link>
          ) : (
            <>
              <Link href="/dashboard" className="text-[15px] font-semibold" style={{ color: "#ffffff", letterSpacing: "-0.4px" }}>
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

            {/* Groups */}
            {navGroups.map((group) => (
              <div key={group.label} className="mb-5">
                {!collapsed && (
                  <p
                    className="text-[9px] font-semibold uppercase px-2 mb-1.5"
                    style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.8px" }}
                  >
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center ${collapsed ? "justify-center px-0 py-2" : "justify-between px-2 py-1.5"} rounded-md text-[11px] mb-0.5 transition-all`}
                      style={
                        isActive
                          ? { background: "rgba(255,255,255,0.12)", color: "#ffffff" }
                          : { color: "rgba(255,255,255,0.65)" }
                      }
                    >
                      <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
                        <item.icon
                          className="h-3.5 w-3.5 flex-shrink-0"
                          style={item.urgent && !isActive ? { color: "rgba(252,165,165,0.9)" } : undefined}
                        />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && item.urgent && (
                          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#f87171" }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#ef4444" }} />
                          </span>
                        )}
                      </div>
                      {!collapsed && item.art && !item.urgent && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
                        >
                          {item.art}
                        </span>
                      )}
                      {!collapsed && item.urgent && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "rgba(220,38,38,0.3)", color: "#fca5a5" }}
                        >
                          {item.art}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
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
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 w-full">{children}</main>
      </div>
      </div>
    </div>
  );
}
