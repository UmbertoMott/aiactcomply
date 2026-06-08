"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, CreditCard, ShieldCheck, BookOpen, LogOut, ChevronDown } from "lucide-react";

interface MenuItem {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  href?: string;
  action?: () => void;
  danger?: boolean;
  separator?: boolean;
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        setCompany(data.user.user_metadata?.company ?? null);
      }
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  // Initials from company or email
  const displayName = company || email || "";
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const menuItems: MenuItem[] = [
    { icon: User,       label: "Account",        href: "/dashboard/account"      },
    { icon: CreditCard, label: "Fatturazione",    href: "/dashboard/billing"      },
    { icon: ShieldCheck,label: "Sicurezza 2FA",   href: "/dashboard/security/mfa" },
    { icon: BookOpen,   label: "Documentazione",  href: "https://docs.aicomply.it", separator: true },
  ];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all"
        style={{
          background: open ? "rgba(0,0,0,0.05)" : "transparent",
          border: "1px solid " + (open ? "rgba(0,0,0,0.1)" : "transparent"),
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.05)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          }
        }}
      >
        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: "#0D1016", color: "#ffffff" }}
        >
          {initials || "?"}
        </div>
        {/* Name (hidden on mobile) */}
        <span
          className="hidden sm:block text-[12px] font-medium max-w-[120px] truncate"
          style={{ color: "#0D1016" }}
        >
          {company || email?.split("@")[0] || "Account"}
        </span>
        <ChevronDown
          className="h-3 w-3 transition-transform"
          style={{
            color: "rgba(0,0,0,0.4)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 min-w-[200px] rounded-xl overflow-hidden z-50 select-none"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          {/* User info header */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
          >
            <p className="text-[12px] font-semibold truncate" style={{ color: "#0D1016" }}>
              {company || "Account"}
            </p>
            {email && (
              <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(0,0,0,0.4)" }}>
                {email}
              </p>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            {menuItems.map((item, i) => {
              const isExternal = item.href?.startsWith("http");
              const content = (
                <div
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                  style={{ color: "#0D1016" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.04)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-[14px] w-[14px] flex-shrink-0" style={{ color: "rgba(0,0,0,0.45)" }} />
                  <span className="text-[13px]">{item.label}</span>
                </div>
              );

              return (
                <div key={i}>
                  {item.separator && (
                    <div className="my-1" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }} />
                  )}
                  {item.href ? (
                    isExternal ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        {content}
                      </a>
                    ) : (
                      <Link href={item.href}>{content}</Link>
                    )
                  ) : (
                    <div onClick={item.action}>{content}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Separator + Esci */}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }} className="py-1">
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
              style={{ color: "#dc2626" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(220,38,38,0.05)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
              onClick={handleLogout}
            >
              <LogOut className="h-[14px] w-[14px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Esci</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
