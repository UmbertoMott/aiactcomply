import {
  Shield,
  BarChart3,
  FileText,
  Database,
  Eye,
  Users,
  CheckCircle,
  Cpu,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const quickTools = [
  {
    icon: Shield,
    title: "AI Classifier",
    desc: "Classifica il tuo sistema AI",
    href: "/dashboard/tools/classifier",
    status: "Da completare",
    art: "Art. 6",
  },
  {
    icon: BarChart3,
    title: "Risk Manager",
    desc: "Gestione iterativa del rischio",
    href: "/dashboard/tools/risk-manager",
    status: "Da completare",
    art: "Art. 9",
  },
  {
    icon: Database,
    title: "Data Audit",
    desc: "Qualità e provenienza dataset",
    href: "/dashboard/tools/data-audit",
    status: "Da completare",
    art: "Art. 10",
  },
  {
    icon: FileText,
    title: "DocuGen AI",
    desc: "Documentazione tecnica",
    href: "/dashboard/tools/docugen",
    status: "Da completare",
    art: "Art. 11",
  },
  {
    icon: Cpu,
    title: "LogVault",
    desc: "Registrazione automatica log",
    href: "/dashboard/tools/logvault",
    status: "Da completare",
    art: "Art. 12",
  },
  {
    icon: Eye,
    title: "Transparency",
    desc: "Istruzioni e informative",
    href: "/dashboard/tools/transparency",
    status: "Da completare",
    art: "Art. 13",
  },
  {
    icon: Users,
    title: "Oversight",
    desc: "Sorveglianza umana",
    href: "/dashboard/tools/oversight",
    status: "Da completare",
    art: "Art. 14",
  },
  {
    icon: CheckCircle,
    title: "Resilience",
    desc: "Accuratezza e cybersecurity",
    href: "/dashboard/tools/resilience",
    status: "Da completare",
    art: "Art. 15",
  },
  {
    icon: ClipboardCheck,
    title: "QMS Builder",
    desc: "Sistema gestione qualità",
    href: "/dashboard/tools/qms",
    status: "Da completare",
    art: "Art. 17",
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Benvenuto in AIComply. Inizia completando i tool di compliance per i
          tuoi sistemi AI.
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tool completati", value: "0", total: "9", color: "text-primary" },
          { label: "Sistemi AI", value: "0", total: "", color: "text-foreground" },
          { label: "Rischi aperti", value: "–", total: "", color: "text-warning" },
          { label: "Prossima scadenza", value: "2 Ago 2026", total: "", color: "text-muted-foreground" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
              {card.total && (
                <span className="text-sm text-muted-foreground font-normal">
                  /{card.total}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Scadenze */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 mb-8 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Scadenze normative imminenti
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Le pratiche vietate (Art. 5) entrano in vigore il 2 febbraio 2025.
            I sistemi ad alto rischio devono essere conformi entro il 2 agosto
            2026.
          </p>
        </div>
      </div>

      {/* Quick access tools */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Strumenti di compliance
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <tool.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {tool.art}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {tool.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{tool.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {tool.status}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
