import {
  Shield,
  Box,
  GitBranch,
  Users,
  Eye,
  Activity,
  Database,
  Network,
  ArrowRight,
  ChevronRight,
  Zap,
  Globe,
  Lock,
  Bell,
  FileCode,
  Sliders,
  Award,
} from "lucide-react";
import HomeNav from "@/components/ui/HomeNav";
import Link from "next/link";

const modules = [
  {
    icon: Box,
    title: "AIA-Architect",
    desc: "Generazione automatica del Dossier Vivente (Allegato IV). Analisi semantica del codice, data lineage column-level e Prompt-to-Doc.",
    art: "Art. 11",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Rights-Simulator",
    desc: "FRIA automatizzato con Persona-Based Red Teaming. Profili sintetici di gruppi vulnerabili per testare bias e discriminazione.",
    art: "Art. 27",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Activity,
    title: "Guardian-Agent",
    desc: "Control Plane runtime: Sentinel Agents (monitoraggio) + Operative Agents (kill switch, HITL). Explainability Trace View.",
    art: "Art. 14",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Eye,
    title: "Trust-Labeler",
    desc: "Watermarking C2PA resistente a compressione. Generative UI per disclosure modals e Smart Compliance Badges.",
    art: "Art. 50",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Database,
    title: "Evidence Layer",
    desc: "Archivio bitemporale immutabile con hash crittografico SHA-256. Ogni ADR e log è concatenato al precedente.",
    art: "Core",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: GitBranch,
    title: "Connectors",
    desc: "Connettori nativi per GitHub, GitLab, Snowflake, Databricks, Jira e BigQuery per estrazione automatica.",
    art: "SDLC",
    gradient: "from-slate-500 to-zinc-500",
  },
];

const plans = [
  {
    name: "Starter",
    price: "99",
    desc: "Per startup e PMI che iniziano il percorso di compliance",
    features: [
      "Evidence Layer (fino a 500 record)",
      "AIA-Architect (1 sistema)",
      "Trust-Labeler base",
      "Dashboard personale",
      "Email support",
    ],
    cta: "Inizia gratis",
    popular: false,
  },
  {
    name: "Professional",
    price: "299",
    desc: "Per aziende con sistemi AI ad alto rischio",
    features: [
      "Tutti i 4 moduli + Evidence Layer illimitato",
      "Rights-Simulator (FRIA completo)",
      "Guardian-Agent (Sentinel + Operative)",
      "Connectors GitHub, Snowflake, Jira",
      "Export PDF audit-ready",
      "Supporto prioritario",
    ],
    cta: "Prova 14 giorni",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Per grandi organizzazioni e consulenti",
    features: [
      "Tutti i moduli + Trust Center pubblico",
      "Multi-team e RBAC avanzato",
      "API personalizzate e webhook",
      "SSO e audit trail completo",
      "Consulenza dedicata + SLA",
      "White label disponibile",
    ],
    cta: "Contattaci",
    popular: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HomeNav />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/10 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground mb-8">
              <Bell className="h-3 w-3 text-primary" />
              Regolamento UE 2024/1689 — Architettura Algorithmic Trust
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight">
              Algorithmic
              <br />
              <span className="gradient-text">Trust</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              La piattaforma RegTech che integra la conformità all&apos;AI Act
              direttamente nel ciclo di vita dello sviluppo software (SDLC).
              Evidence Layer immutabile, FRIA automatizzato, guardian agents
              runtime e watermarking C2PA.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="rounded-lg bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                Inizia la compliance <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#modules" className="rounded-lg border border-border px-8 py-3.5 text-sm font-medium text-foreground hover:bg-card transition-colors inline-flex items-center gap-2">
                Scopri i moduli <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "113", label: "Articoli analizzati" },
              { value: "4", label: "Moduli integrati" },
              { value: "6", label: "Connettori nativi" },
              { value: "24/7", label: "Guardian Agents" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Architettura della Fiducia Algoritmica
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Dalla scoperta automatica alla certificazione: un ecosistema
              modulare che copre l&apos;intero ciclo di compliance.
            </p>
          </div>

          <div className="relative mb-16">
            {/* Flow arrows */}
            <div className="hidden lg:flex items-center justify-center gap-2 text-xs text-muted-foreground mb-8">
              <span className="border border-border rounded-full px-3 py-1">Code · Data · Docs</span>
              <ChevronRight className="h-4 w-4" />
              <span className="border border-primary/30 rounded-full px-3 py-1 text-primary">Auto-Assessment</span>
              <ChevronRight className="h-4 w-4" />
              <span className="border border-border rounded-full px-3 py-1">Evidence Store</span>
              <ChevronRight className="h-4 w-4" />
              <span className="border border-border rounded-full px-3 py-1">Runtime Control</span>
              <ChevronRight className="h-4 w-4" />
              <span className="border border-border rounded-full px-3 py-1">Trust Center</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((m) => (
                <div key={m.title} className="group rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <div className={`inline-flex rounded-lg bg-gradient-to-br ${m.gradient} p-2.5 mb-4`}>
                    <m.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{m.title}</h3>
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">{m.art}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Zap, title: "Execution-First", desc: "La compliance è integrata nel SDLC, non un esercizio burocratico separato. Riduci il tempo di preparazione del Technical File da mesi a ore." },
              { icon: Globe, title: "Sempre aggiornato", desc: "Monitoriamo costantemente aggiornamenti normativi, nuove norme armonizzate e linee guida della Commissione UE." },
              { icon: Lock, title: "Prova crittografica", desc: "Ogni decisione architetturale e log di sistema è archiviato con hash SHA-256. Catena di evidenze immutabile per audit." },
            ].map((feat) => (
              <div key={feat.title} className="text-center">
                <div className="inline-flex rounded-xl bg-primary/10 p-3 mb-4"><feat.icon className="h-6 w-6 text-primary" /></div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Piani e prezzi</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Tutti i piani includono aggiornamenti normativi automatici e
              supporto email.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-8 flex flex-col ${plan.popular ? "border-primary glow bg-card" : "border-border bg-card"}`}>
                {plan.popular && <div className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground w-fit mb-4">Più scelto</div>}
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  {plan.price !== "Custom" && <span className="text-sm text-muted-foreground">€</span>}
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-sm text-muted-foreground">/mese</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground"><Shield className="h-4 w-4 text-success mt-0.5 shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-8 rounded-lg px-6 py-3 text-sm font-medium text-center transition-colors ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-foreground hover:bg-card"}`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-600/10 p-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Pronto a costruire la fiducia algoritmica?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Il Regolamento UE 2024/1689 è già in vigore. Le sanzioni arrivano
              fino al 7% del fatturato annuo globale.
            </p>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Inizia ora gratuitamente <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">AI<span className="text-primary">Comply</span></span>
            </div>
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} AIComply. Regolamento UE 2024/1689.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
