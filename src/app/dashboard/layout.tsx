"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, Box, GitBranch, Users, Eye, Activity,
  Menu, X, ChevronRight, LogOut, Database, Network, Ban, FileArchive,
} from "lucide-react";
import { getDossierSections, getCompletionPercentage, aggregateDossier } from "@/lib/dossier/dossier-engine";
import { logout } from "./actions";

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
      { icon: Database, label: "Evidence Layer", href: "/dashboard/evidence-layer", art: "Core" },
    ],
  },
  {
    label: "Moduli",
    items: [
      { icon: Box, label: "AIA-Architect", href: "/dashboard/modules/aia-architect", art: "Art. 11" },
      { icon: Users, label: "Rights-Simulator", href: "/dashboard/modules/rights-simulator", art: "Art. 27" },
      { icon: Activity, label: "Guardian-Agent", href: "/dashboard/modules/guardian-agent", art: "Art. 14" },
      { icon: Eye, label: "Trust-Labeler", href: "/dashboard/modules/trust-labeler", art: "Art. 50" },
      { icon: Activity, label: "Post-Market", href: "/dashboard/post-market", art: "Art. 72" },
      { icon: Shield, label: "Compliance-Nexus", href: "/dashboard/compliance-nexus", art: "Art. 71" },
    ],
  },
  {
    label: "Integrazioni",
    items: [
      { icon: GitBranch, label: "Connectors", href: "/dashboard/connectors", art: "" },
      { icon: Network, label: "Trust Center", href: "/dashboard/trust-center", art: "" },
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
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dossierPct, setDossierPct] = useState(0);

  useEffect(() => {
    // Read dossier completion from localStorage
    const data = aggregateDossier();
    const sections = getDossierSections(data);
    setDossierPct(getCompletionPercentage(sections));
  }, [pathname]); // Refresh on navigation

  const currentItem = navGroups
    .flatMap((g) => g.items)
    .find((i) => pathname.startsWith(i.href));

  return (
    <div className="flex h-screen" style={{ background: "#FAFAF9" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dark like homepage nav */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#0D1016" }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link
            href="/dashboard"
            className="text-[15px] font-semibold"
            style={{ color: "#ffffff", letterSpacing: "-0.4px" }}
          >
            AI<span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 300 }}>Comply</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Dossier — top-level entry */}
          <div className="mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Link
              href="/dashboard/dossier"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-between px-2 py-2 rounded-md text-[11px] transition-all"
              style={
                pathname.startsWith("/dashboard/dossier")
                  ? { background: "rgba(255,255,255,0.1)", color: "#ffffff" }
                  : { color: "rgba(255,255,255,0.55)" }
              }
            >
              <div className="flex items-center gap-2">
                <FileArchive className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">Dossier</span>
              </div>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: dossierPct >= 80 ? "rgba(22,163,74,0.3)" : dossierPct >= 40 ? "rgba(202,138,4,0.3)" : "rgba(220,38,38,0.3)",
                  color: dossierPct >= 80 ? "#86efac" : dossierPct >= 40 ? "#fde68a" : "#fca5a5",
                }}
              >
                {dossierPct}%
              </span>
            </Link>
          </div>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p
                className="text-[9px] font-semibold uppercase px-2 mb-1.5"
                style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.8px" }}
              >
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] mb-0.5 transition-all"
                    style={
                      isActive
                        ? { background: "rgba(255,255,255,0.1)", color: "#ffffff" }
                        : { color: "rgba(255,255,255,0.42)" }
                    }
                  >
                    <div className="flex items-center gap-2">
                      <item.icon
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={item.urgent && !isActive ? { color: "rgba(252,165,165,0.8)" } : undefined}
                      />
                      <span>{item.label}</span>
                      {item.urgent && (
                        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                          <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ background: "#f87171" }}
                          />
                          <span
                            className="relative inline-flex rounded-full h-1.5 w-1.5"
                            style={{ background: "#ef4444" }}
                          />
                        </span>
                      )}
                    </div>
                    {item.art && !item.urgent && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
                      >
                        {item.art}
                      </span>
                    )}
                    {item.urgent && (
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

        {/* Logout */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] transition-all"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Esci
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-14 flex items-center px-6"
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
            <Link href="/dashboard" className="hover:opacity-70 transition-opacity">
              Dashboard
            </Link>
            {currentItem && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span style={{ color: "#0D1016" }}>{currentItem.label}</span>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
