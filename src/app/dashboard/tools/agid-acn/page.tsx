"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, AlertTriangle, ExternalLink, ChevronDown, ChevronUp,
  Building2, Lock, AlertOctagon, CheckCircle2, Clock, Phone,
} from "lucide-react";
import { enqueueActivities, getActiveScopeId } from "@/lib/queue/activity-queue";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.45)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.07)",
  card:     "#ffffff",
  red:      "#dc2626", redBg:   "rgba(220,38,38,0.06)",  redBdr:   "rgba(220,38,38,0.18)",
  amber:    "#d97706", amberBg: "rgba(245,158,11,0.06)", amberBdr: "rgba(245,158,11,0.2)",
  blue:     "#0D1016", blueBg:  "rgba(13,16,22,0.04)",   blueBdr:  "rgba(13,16,22,0.12)",
  green:    "#15803d", greenBg: "rgba(22,163,74,0.06)",  greenBdr: "rgba(22,163,74,0.2)",
};

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 };

// ─── Dati autorità ────────────────────────────────────────────────────────────

const AUTHORITIES = [
  {
    id: "agid",
    name: "AGID",
    fullName: "Agenzia per l'Italia Digitale",
    icon: Building2,
    color: T.blue,
    colorBg: T.blueBg,
    colorBdr: T.blueBdr,
    role: "Autorità nazionale competente per l'AI Act in Italia (settore pubblico) + gestione Regulatory Sandbox AI",
    website: "https://www.agid.gov.it",
    contact: "protocollo@pec.agid.gov.it",
    phone: "+39 06 85264.1",
    powers: [
      "Supervisione e vigilanza dei sistemi AI usati dalla PA",
      "Gestione della Regulatory Sandbox AI italiana (Art. 57 EU AI Act)",
      "Irrogazione sanzioni amministrative per PA e fornitori PA",
      "Emissione di linee guida nazionali sull'uso AI nel settore pubblico",
      "Cooperazione con la Commissione Europea e EAIA",
    ],
    when_to_notify: [
      { trigger: "Incidente grave con sistema AI alto rischio usato dalla PA",     deadline: "72 ore dall'incidente",  article: "Art. 73 EU AI Act" },
      { trigger: "Richiesta di accesso alla Regulatory Sandbox",                   deadline: "Procedura su domanda",   article: "Art. 57 EU AI Act" },
      { trigger: "Sistema AI ad alto rischio per infrastrutture critiche",          deadline: "Prima del deploy",       article: "Art. 49 EU AI Act" },
    ],
    sandbox: {
      description: "La Regulatory Sandbox AI italiana deve essere operativa entro il 2 agosto 2026 (scadenza EU AI Act Art. 57). AGID coordina la sua istituzione in collaborazione con ACN. Consente alle imprese di testare sistemi AI in un ambiente controllato con deroghe temporanee.",
      how_to_apply: "La procedura di candidatura sarà pubblicata da AGID sul portale ufficiale. Sarà necessario presentare: descrizione del sistema, piano di testing, identificazione rischi e misure di mitigazione proposte.",
      url: "https://www.agid.gov.it/it/aree-di-intervento/intelligenza-artificiale",
    },
  },
  {
    id: "acn",
    name: "ACN",
    fullName: "Agenzia per la Cybersicurezza Nazionale",
    icon: Shield,
    color: "#7c3aed",
    colorBg: "rgba(124,58,237,0.06)",
    colorBdr: "rgba(124,58,237,0.2)",
    role: "Autorità nazionale per la cybersicurezza — supervisione requisiti Art. 15 EU AI Act (robustezza e sicurezza informatica)",
    website: "https://www.acn.gov.it",
    contact: "info@acn.gov.it / acn@pec.acn.gov.it",
    phone: "",
    powers: [
      "Supervisione requisiti cybersecurity per AI ad alto rischio (Art. 15)",
      "Gestione incidenti di sicurezza su sistemi AI critici",
      "Emissione linee guida su adversarial attacks e model poisoning",
      "Cooperazione con ENISA su standard di sicurezza AI",
      "Vigilanza su NIS2 per operatori di servizi essenziali che usano AI",
    ],
    when_to_notify: [
      { trigger: "Incidente di sicurezza informatica su sistema AI (operatori NIS2)", deadline: "24h prelim., 72h report completo", article: "NIS2 Art. 23"          },
      { trigger: "Attacco adversariale documentato su sistema AI alto rischio",        deadline: "Prima possibile",                article: "Art. 15 EU AI Act"    },
      { trigger: "Vulnerabilità critica in sistema AI infrastrutture critiche",        deadline: "Immediato",                      article: "NIS2 + Art. 15 AI Act" },
    ],
    sandbox: null,
  },
  {
    id: "garante",
    name: "Garante Privacy",
    fullName: "Garante per la Protezione dei Dati Personali",
    icon: Lock,
    color: T.green,
    colorBg: T.greenBg,
    colorBdr: T.greenBdr,
    role: "Autorità di controllo GDPR — supervisione intersezione GDPR/AI Act, DPIA obbligatorie, trattamento dati biometrici",
    website: "https://www.garanteprivacy.it",
    contact: "protocollo@gpdp.it / protocollo@pec.gpdp.it",
    phone: "+39 06 696771",
    powers: [
      "Approvazione o blocco di trattamenti dati ad alto rischio (Art. 36 GDPR)",
      "Sanzioni GDPR fino a €20M o 4% fatturato globale",
      "Controllo sull'uso di dati biometrici per sistemi AI",
      "Verifica DPIA (Art. 35 GDPR) per sistemi AI che trattano dati sensibili",
      "Cooperazione con autorità AI nella supervisione di sistemi che trattano dati personali",
    ],
    when_to_notify: [
      { trigger: "Data breach che coinvolge output di sistema AI",                    deadline: "72 ore dalla scoperta",               article: "Art. 33 GDPR"    },
      { trigger: "Nuovo trattamento ad alto rischio senza DPIA approvata",            deadline: "Prima di iniziare il trattamento",    article: "Art. 36 GDPR"    },
      { trigger: "Sistema AI che profila o processa dati biometrici su larga scala",  deadline: "Consultazione preventiva obbligatoria", article: "Art. 35-36 GDPR" },
    ],
    sandbox: null,
  },
] as const;

// ─── Sanzioni penali L.132/2025 ───────────────────────────────────────────────

interface QueueItem { label: string; tool: string; href: string; source: string }
interface CriminalRisk {
  title: string;
  article: string;
  penalty: string;
  aggravated: string;
  description: string;
  who_is_at_risk: string;
  mitigation: string;
  primary: { label: string; tool: string; href: string };
  queued?: QueueItem[];
}

const CRIMINAL_RISKS: CriminalRisk[] = [
  {
    title: "Deepfake non consensuali",
    article: "Art. 5 L.132/2025",
    penalty: "Reclusione da 1 a 5 anni",
    aggravated: "Da 2 a 7 anni se vittima è minore o il materiale è distribuito",
    description: "Creazione o diffusione di immagini, video o audio sintetici che ritraggono una persona senza il suo consenso, in contesti sessuali o denigratori.",
    who_is_at_risk: "Provider di sistemi di generazione immagini/video, deployer che non implementano filtri adeguati",
    mitigation: "Implementare disclosure Art. 50, watermarking obbligatorio, controlli consenso utente",
    primary: { label: "Vai all'Art. 50 Kit", tool: "art50-kit", href: "/dashboard/tools/art50-kit" },
  },
  {
    title: "Manipolazione e frode tramite AI",
    article: "Art. 640-ter c.p. (aggravato) + L.132/2025",
    penalty: "Reclusione da 1 a 5 anni",
    aggravated: "Aggravante specifica se uso di AI per commettere il reato",
    description: "Uso di sistemi AI per ingannare persone fisiche a fini di frode, manipolazione psicologica, o ottenimento illecito di vantaggi patrimoniali.",
    who_is_at_risk: "Chiunque utilizzi chatbot o sistemi AI in modo ingannevole verso consumatori",
    mitigation: "Disclosure obbligatoria AI, policy di uso accettabile, monitoring output",
    primary: { label: "Vai alla Trasparenza", tool: "transparency", href: "/dashboard/tools/transparency" },
  },
  {
    title: "Violazione tutela minori (under 14)",
    article: "Art. 8 L.132/2025",
    penalty: "Reclusione fino a 3 anni",
    aggravated: "Sanzione accessoria: oscuramento del servizio",
    description: "Raccolta o trattamento dati personali di minori di 14 anni tramite sistemi AI senza consenso esplicito del genitore/tutore.",
    who_is_at_risk: "Deployer di sistemi AI consumer accessibili a minori, piattaforme educative",
    mitigation: "Verifica età, consenso genitoriale documentato, age-gating",
    primary: { label: "Valuta con DPIA", tool: "dpia", href: "/dashboard/tools/dpia" },
    queued: [
      { label: "Completa la FRIA (gruppi vulnerabili)", tool: "fria", href: "/dashboard/tools/fria", source: "Rischio penale — tutela minori (Art. 8 L.132/2025)" },
      { label: "Aggiorna il MOG 231 (sezione AI)", tool: "l132", href: "/dashboard/tools/l132", source: "Rischio penale — tutela minori (Art. 8 L.132/2025)" },
    ],
  },
  {
    title: "Reati D.Lgs. 231/2001 tramite AI",
    article: "D.Lgs. 231/2001 + L.132/2025",
    penalty: "Sanzione pecuniaria fino a €1.5M + interdizione attività",
    aggravated: "Responsabilità solidale dell'ente se non adottato MOG 231 aggiornato all'AI",
    description: "L'ente è responsabile per reati commessi tramite sistemi AI da suoi dipendenti/manager se non ha adottato un MOG 231 che includa protocolli di controllo AI.",
    who_is_at_risk: "Tutte le società che usano sistemi AI nei processi aziendali senza MOG 231 aggiornato",
    mitigation: "Adottare MOG 231 con sezione AI, ODV formato, protocolli di controllo documentati",
    primary: { label: "Aggiorna il MOG 231", tool: "l132", href: "/dashboard/tools/l132" },
  },
];

// ─── Sanzioni amministrative EU AI Act ───────────────────────────────────────

const ADMIN_SANCTIONS = [
  { violation: "Pratiche AI vietate (Art. 5)",            max_amount: "€35.000.000",          max_pct: "7% fatturato mondiale annuo",      severity: "critical" as const },
  { violation: "Obblighi sistemi alto rischio (Art. 6-49)",max_amount: "€15.000.000",          max_pct: "3% fatturato mondiale annuo",      severity: "high"     as const },
  { violation: "Informazioni false alle autorità (Art. 82)",max_amount: "€7.500.000",          max_pct: "1% fatturato mondiale annuo",      severity: "medium"   as const },
  { violation: "Riduzione per PMI e startup",              max_amount: "50% delle sanzioni sopra", max_pct: "Per aziende < 250 dipendenti", severity: "info"     as const },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AuthorityCard({ auth }: { auth: typeof AUTHORITIES[number] }) {
  const [open, setOpen] = useState(false);
  const Icon = auth.icon;

  return (
    <div style={card} className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-black/[0.01] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: auth.colorBg, border: `1px solid ${auth.colorBdr}` }}
        >
          <Icon className="w-5 h-5" style={{ color: auth.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: T.text }}>{auth.name}</span>
            <span className="text-xs" style={{ color: T.muted }}>{auth.fullName}</span>
          </div>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.muted }}>{auth.role}</p>
        </div>
        {open
          ? <ChevronUp  className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: T.faint }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: T.faint }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5" style={{ borderTop: `1px solid ${T.border}` }}>

              {/* Contatti */}
              <div className="pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>Contatti</p>
                <div className="space-y-1.5">
                  <a href={auth.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs hover:underline" style={{ color: auth.color }}>
                    <ExternalLink className="w-3 h-3" /> {auth.website}
                  </a>
                  {auth.phone && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: T.muted }}>
                      <Phone className="w-3 h-3" /> {auth.phone}
                    </div>
                  )}
                  <div className="text-xs font-mono" style={{ color: T.muted }}>{auth.contact}</div>
                </div>
              </div>

              {/* Poteri */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>Poteri e competenze</p>
                <ul className="space-y-1.5">
                  {auth.powers.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: T.muted }}>
                      <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: auth.color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quando notificare */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>Quando devi notificare</p>
                <div className="space-y-2">
                  {auth.when_to_notify.map((n, i) => (
                    <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                      <div className="text-xs font-medium mb-1" style={{ color: "#92400e" }}>{n.trigger}</div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {n.deadline}</span>
                        <span style={{ color: T.blue }}>{n.article}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sandbox — solo AGID */}
              {auth.sandbox && (
                <div className="rounded-lg px-4 py-3" style={{ background: T.blueBg, border: `1px solid ${T.blueBdr}` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: T.blue }}>
                    🧪 Regulatory Sandbox AI — operativa
                  </p>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: T.muted }}>{auth.sandbox.description}</p>
                  <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
                    <strong>Come fare domanda:</strong> {auth.sandbox.how_to_apply}
                  </p>
                  <a href={auth.sandbox.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: T.blue }}>
                    Portale AGID <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CriminalRiskCard({ risk }: { risk: CriminalRisk }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handlePrimaryClick() {
    const queued = risk.queued ?? [];
    if (queued.length > 0) {
      const scopeId = getActiveScopeId();
      const added = enqueueActivities(scopeId, queued);
      if (added > 0) {
        setToast(`${added} ${added === 1 ? "attività aggiunta" : "attività aggiunte"} in coda`);
        setTimeout(() => setToast(null), 3000);
      }
    }
    window.location.href = risk.primary.href;
  }

  return (
    <div style={card} className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-black/[0.01] transition-colors"
      >
        <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: T.text }}>{risk.title}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}` }}>
              {risk.penalty}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: T.muted }}>{risk.article}</p>
        </div>
        {open
          ? <ChevronUp  className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: T.faint }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: T.faint }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
              <p className="text-xs leading-relaxed pt-4" style={{ color: T.muted }}>{risk.description}</p>
              <div className="rounded-lg px-3 py-2.5" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.red }}>Aggravanti</p>
                <p className="text-xs" style={{ color: "rgba(0,0,0,0.55)" }}>{risk.aggravated}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.faint }}>Chi è a rischio</p>
                <p className="text-xs" style={{ color: T.muted }}>{risk.who_is_at_risk}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.faint }}>Come mitigare</p>
                <p className="text-xs" style={{ color: T.muted }}>{risk.mitigation}</p>
              </div>

              {/* Queued badge: shown when the risk has secondary actions */}
              {risk.queued && risk.queued.length > 0 && (
                <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(13,16,22,0.04)", border: "1px solid rgba(13,16,22,0.1)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(0,0,0,0.42)" }}>
                    Azioni aggiuntive (in coda al click)
                  </p>
                  <ul className="space-y-0.5">
                    {risk.queued.map((q, i) => (
                      <li key={i} className="text-xs" style={{ color: "rgba(0,0,0,0.55)" }}>
                        → {q.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handlePrimaryClick}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: T.text, color: "#fff", border: "none", cursor: "pointer" }}
                >
                  {risk.primary.label} <ExternalLink className="w-3 h-3" />
                </button>
                {toast && (
                  <span className="text-xs" style={{ color: "rgba(0,0,0,0.45)", animation: "fadeIn 0.2s ease" }}>
                    ✓ {toast}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabId = "authorities" | "criminal" | "sanctions";

export default function AgidAcnPage() {
  const [tab, setTab] = useState<TabId>("authorities");

  const TABS: { id: TabId; label: string }[] = [
    { id: "authorities", label: "Autorità di vigilanza" },
    { id: "criminal",    label: "Rischi penali L.132"  },
    { id: "sanctions",   label: "Sanzioni amministrative" },
  ];

  const SEVERITY_COLORS = {
    critical: { bg: T.redBg,   bdr: T.redBdr,   txt: T.red   },
    high:     { bg: T.amberBg, bdr: T.amberBdr, txt: T.amber },
    medium:   { bg: T.blueBg,  bdr: T.blueBdr,  txt: T.blue  },
    info:     { bg: T.greenBg, bdr: T.greenBdr, txt: T.green },
  };

  return (
    <div className="w-full space-y-6 pb-10" style={{ color: T.text }}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4" style={{ color: T.blue }} />
          <span className="text-xs font-medium" style={{ color: T.muted }}>Autorità di Vigilanza Italiane</span>
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: T.text }}>AGID / ACN / Garante Privacy</h1>
        <p className="text-sm" style={{ color: T.muted }}>
          Autorità competenti in Italia per EU AI Act, cybersicurezza e privacy.
          Poteri sanzionatori, obblighi di notifica e rischi penali L.132/2025.
        </p>
      </div>

      {/* Alert L.132 */}
      <div className="rounded-xl px-4 py-3.5" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: T.red }}>
              L.132/2025 — Rischi penali in vigore dal 10 ottobre 2025
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
              La Legge 132/2025 introduce reati specifici legati all&apos;uso dell&apos;AI in Italia, con pene fino a 7 anni di
              reclusione. Si applica a provider e deployer che operano sul territorio italiano.
            </p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === t.id ? T.card : "transparent",
              color: tab === t.id ? T.text : T.muted,
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Autorità */}
      {tab === "authorities" && (
        <div className="space-y-3">
          {AUTHORITIES.map(auth => (
            <AuthorityCard key={auth.id} auth={auth} />
          ))}
        </div>
      )}

      {/* Tab: Rischi penali */}
      {tab === "criminal" && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
            <p className="text-xs leading-relaxed" style={{ color: "#92400e" }}>
              <strong>Nota:</strong> Le sanzioni penali si applicano indipendentemente dall&apos;eventuale conformità
              all&apos;EU AI Act. Un sistema tecnicamente conforme può comunque esporre a responsabilità penale se usato
              in violazione della L.132/2025.
            </p>
          </div>
          {CRIMINAL_RISKS.map((risk, i) => (
            <CriminalRiskCard key={i} risk={risk} />
          ))}
        </div>
      )}

      {/* Tab: Sanzioni amministrative */}
      {tab === "sanctions" && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: T.muted }}>
            Sanzioni amministrative previste dall&apos;EU AI Act, applicate dalle autorità nazionali
            (in Italia: AGID per PA, Garante per privacy).
          </p>
          {ADMIN_SANCTIONS.map((s, i) => {
            const colors = SEVERITY_COLORS[s.severity];
            return (
              <div key={i} className="rounded-xl p-4" style={{ background: colors.bg, border: `1px solid ${colors.bdr}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: colors.txt }}>{s.max_amount}</p>
                    <p className="text-xs" style={{ color: "rgba(0,0,0,0.55)" }}>{s.violation}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium" style={{ color: colors.txt }}>oppure</p>
                    <p className="text-sm font-semibold" style={{ color: colors.txt }}>{s.max_pct}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}>
            <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
              <strong>Applica il massimo</strong> tra importo fisso e percentuale del fatturato.
              Le PMI beneficiano di riduzioni automatiche del 50%.
              La Commissione Europea può pubblicare orientamenti sull&apos;applicazione delle sanzioni.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
