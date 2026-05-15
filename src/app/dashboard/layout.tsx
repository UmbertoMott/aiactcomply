"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Box,
  GitBranch,
  Users,
  Eye,
  Activity,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Database,
  Network,
} from "lucide-react";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { logout } from "./actions";

const navGroups = [
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
    label: "Tool Legacy",
    items: [
      { icon: Shield, label: "AI Classifier", href: "/dashboard/tools/classifier", art: "Art. 6" },
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentItem = navGroups
    .flatMap((g) => g.items)
    .find((i) => pathname.startsWith(i.href));

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-foreground">
                AI<span className="text-primary">Comply</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.art && (
                        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          {item.art}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-border p-4">
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center px-6 bg-card/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground mr-4"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            {currentItem && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{currentItem.label}</span>
              </>
            )}
          </div>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
