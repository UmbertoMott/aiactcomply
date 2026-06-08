"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch, Users, Eye, Menu, X, ChevronRight, ChevronLeft, LogOut, Ban,
  FileArchive, FileText, Scale, Search, Cpu, Bell, BadgeCheck, BarChart2, BookOpen, GraduationCap, ShieldAlert,
  Layers, Bot, Tag, TrendingUp, Globe, Building2, Sliders, Zap,
  ClipboardList, FileCode, Archive, Gauge, Settings, BookMarked, Award, Map, Database, UserCheck, ArrowRightLeft,
  Crosshair, Landmark, GitMerge, Waves, ShieldCheck,
} from "lucide-react";
import { getDossierSections, getCompletionPercentage, aggregateDossier } from "@/lib/dossier/dossier-engine";
import { useUserRole, ROLE_LABELS } from "@/lib/hooks/useUserRole";
import { logout } from "./actions";
import NotificationBell from "@/components/notifications/NotificationBell";
import DisclosureModal from "@/components/disclosure/DisclosureModal";
import DisclosureBanner from "@/components/disclosure/DisclosureBanner";
import MachineMarkers from "@/components/disclosure/MachineMarkers";
import ChatAssistant from "@/components/ui/ChatAssistant";
import UserMenu from "@/components/dashboard/UserMenu";
import SessionWarning from "@/components/auth/SessionWarning";

type NavItem = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  art: string;
  urgent?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

const ROLE_HIDDEN_HREFS: Record<string, string[]> = {
  deployer: [
    "/dashboard/modules/aia-architect",
    "/dashboard/tools/docugen",
    "/dashboard/tools/resilience",
    "/dashboard/tools/qms",
    "/dashboard/tools/conformity",
    "/dashboard/modules/xai",
    "/dashboard/modules/gpai",
  ],
  importer: [
    "/dashboard/modules/aia-architect",
    "/dashboard/modules/guardian-agent",
    "/dashboard/tools/oversight",
    "/dashboard/tools/resilience",
    "/dashboard/tools/qms",
    "/dashboard/modules/gpai",
  ],
  distributor: [
    "/dashboard/modules/aia-architect",
    "/dashboard/modules/guardian-agent",
    "/dashboard/tools/docugen",
    "/dashboard/tools/oversight",
    "/dashboard/tools/data-audit",
    "/dashboard/tools/resilience",
    "/dashboard/tools/qms",
    "/dashboard/tools/conformity",
    "/dashboard/modules/xai",
    "/dashboard/modules/gpai",
    "/dashboard/tools/fria",
    "/dashboard/tools/risk-manager",
    "/dashboard/tools/logvault",
    "/dashboard/post-market",
  ],
  provider: [],
};

// ── Sidebar consolidata (post-refactoring Gemini) ─────────────────────────────
// Tool ridondanti rimossi:
//   - Transparency, Oversight, Resilience, Art. 50 Kit → sotto-sezioni di DocuGen AI
//   - L.132/2025, AGID/ACN → sezioni condizionali nel Compliance Hub (Italia/PA)
//   - GPAI Assessment → fuso in GPAI Hub (unico punto per modelli generativi)
//   - Sicurezza 2FA → spostato nel UserMenu dropdown (non è un tool operativo)
const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { icon: Zap,       label: "Copilot",        href: "/dashboard/copilot",         art: "New"   },
      { icon: Crosshair, label: "Triage AI",      href: "/dashboard/triage",          art: "Nuovo", urgent: true },
      { icon: Map,       label: "Roadmap",        href: "/dashboard/journey",         art: ""      },
      { icon: Search,    label: "Discovery",      href: "/dashboard/discovery",       art: ""      },
      { icon: Archive,   label: "Evidence Layer", href: "/dashboard/evidence-layer",  art: "Core"  },
    ],
  },
  {
    label: "Monitoraggio",
    items: [
      { icon: Layers,    label: "Scanner Tecnico (All. IV)", href: "/dashboard/modules/aia-architect",  art: "Art. 11"    },
      { icon: Bot,       label: "Oversight Monitor",         href: "/dashboard/modules/guardian-agent", art: "Art. 14"    },
      { icon: Tag,       label: "AI Disclosure",             href: "/dashboard/modules/trust-labeler",  art: "Art. 50"    },
      { icon: TrendingUp,label: "Post-Market",               href: "/dashboard/post-market",            art: "Art. 72"    },
      { icon: Globe,     label: "Compliance Hub",            href: "/dashboard/compliance-nexus",       art: "Art. 71 + IT" },
      { icon: GitMerge,  label: "NIST AI RMF",               href: "/dashboard/tools/nist-rmf",         art: "Multi-FW"   },
      { icon: Cpu,       label: "GPAI Hub",                  href: "/dashboard/modules/gpai",           art: "Art. 51-55" },
      { icon: BarChart2, label: "XAI Lab",                   href: "/dashboard/modules/xai",            art: "Art. 13"    },
    ],
  },
  {
    label: "Integrazioni",
    items: [
      { icon: GitBranch,  label: "Connectors",        href: "/dashboard/connectors",         art: ""           },
      { icon: Building2,  label: "Trust Center",      href: "/dashboard/trust-center",       art: ""           },
      { icon: ShieldCheck,label: "AI-Trust Passport", href: "/dashboard/tools/trust-passport",art: "Selling Kit"},
      { icon: Bell,       label: "Notifiche",          href: "/dashboard/notifications",       art: ""           },
      { icon: FileText,   label: "Q-AutoFill",         href: "/dashboard/tools/questionnaire", art: "Buyer Q"    },
    ],
  },
  {
    label: "Valutazioni",
    items: [
      { icon: GraduationCap, label: "AI Literacy",         href: "/dashboard/tools/literacy",            art: "Art. 4",    urgent: true },
      { icon: ShieldAlert,   label: "DPIA",                href: "/dashboard/tools/dpia",                art: "Art. 35"                },
      { icon: Ban,           label: "Art. 5 Checker",      href: "/dashboard/tools/prohibited",          art: "Art. 5",    urgent: true },
      { icon: Sliders,       label: "AI Classifier",       href: "/dashboard/tools/classifier",          art: "Art. 6"                 },
      { icon: Zap,           label: "Risk Manager",        href: "/dashboard/tools/risk-manager",        art: "Art. 9"                 },
      { icon: ClipboardList, label: "Data Audit",          href: "/dashboard/tools/data-audit",          art: "Art. 10"                },
      { icon: FileCode,      label: "DocuGen AI",          href: "/dashboard/tools/docugen",             art: "Art. 11"                },
      { icon: FileArchive,   label: "LogVault",            href: "/dashboard/tools/logvault",            art: "Art. 12"                },
      { icon: Waves,         label: "Drift Monitor",       href: "/dashboard/tools/drift-monitor",       art: "Art. 15"                },
      { icon: Building2,     label: "Deployer",            href: "/dashboard/tools/deployer",            art: "Art. 26"                },
      { icon: Database,      label: "EUDB Registration",   href: "/dashboard/tools/eudb",                art: "Art. 49"                },
      { icon: UserCheck,     label: "Authorized Rep.",     href: "/dashboard/tools/authorized-rep",      art: "Art. 22"                },
      { icon: ArrowRightLeft,label: "Provider Transition", href: "/dashboard/tools/provider-transition", art: "Art. 28"                },
      { icon: Settings,      label: "QMS Builder",         href: "/dashboard/tools/qms",                 art: "Art. 17"                },
      { icon: BookMarked,    label: "FRIA",                href: "/dashboard/tools/fria",                art: "Art. 27"                },
      { icon: Award,         label: "Conformity",          href: "/dashboard/tools/conformity",          art: "Art. 43"                },
      { icon: BookOpen,      label: "Legal Assistant",     href: "/dashboard/tools/legal-assistant",     art: "Art. 9"                 },
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
  const { role } = useUserRole();

  const hiddenHrefs = role ? (ROLE_HIDDEN_HREFS[role] ?? []) : [];
  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !hiddenHrefs.includes(item.href)),
    }))
    .filter((group) => group.items.length > 0);

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

  const currentItem = filteredNavGroups
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

            {/* Groups */}
            {filteredNavGroups.map((group) => (
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
                        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                      {!collapsed && item.art && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
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
