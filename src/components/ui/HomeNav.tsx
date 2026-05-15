"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

export default function HomeNav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">
            AI<span className="text-primary">Comply</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Moduli
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Accedi
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Inizia ora
          </Link>
        </div>
      </div>
    </nav>
  );
}
