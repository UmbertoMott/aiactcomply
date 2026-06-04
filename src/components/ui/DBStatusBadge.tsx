"use client";

import { Database, HardDrive, WifiOff } from "lucide-react";

export type DBSource = "db" | "localStorage" | "empty" | "loading";

interface Props {
  source: DBSource;
  className?: string;
}

export function DBStatusBadge({ source, className = "" }: Props) {
  if (source === "loading") return null;

  const configs: Record<Exclude<DBSource, "loading">, {
    icon: React.ReactNode;
    label: string;
    style: string;
  }> = {
    db: {
      icon: <Database className="w-3 h-3" />,
      label: "Sincronizzato con DB",
      style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25",
    },
    localStorage: {
      icon: <HardDrive className="w-3 h-3" />,
      label: "Dati locali",
      style: "bg-yellow-500/10 text-yellow-700 border border-yellow-500/25",
    },
    empty: {
      icon: <WifiOff className="w-3 h-3" />,
      label: "Offline",
      style: "bg-slate-500/10 text-slate-500 border border-slate-500/20",
    },
  };

  const { icon, label, style } = configs[source];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${style} ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
