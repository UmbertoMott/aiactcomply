"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, AlertTriangle, ExternalLink, ChevronDown, ChevronUp,
  Building2, Lock, AlertOctagon, CheckCircle2, Clock, Phone,
} from "lucide-react";
import { ProhibitedPracticesArt5 } from "@/components/agid-acn/ProhibitedPracticesArt5";
import { useT } from "@/i18n/LocaleProvider";

type TFn = (key: string) => string;

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:     "#0D1016",
  muted:    "rgba(0,0,0,0.45)",
  faint:    "rgba(0,0,0,0.28)",
  border:   "rgba(0,0,0,0.07)",
  card:     "#ffffff",
  red:      "#0D1016", redBg:   "rgba(13,16,22,0.04)",   redBdr:   "rgba(13,16,22,0.12)",
  amber:    "#0D1016", amberBg: "rgba(13,16,22,0.04)",   amberBdr: "rgba(13,16,22,0.12)",
  blue:     "#0D1016", blueBg:  "rgba(13,16,22,0.04)",   blueBdr:  "rgba(13,16,22,0.12)",
  green:    "#0D1016", greenBg: "rgba(13,16,22,0.04)",   greenBdr: "rgba(13,16,22,0.12)",
};

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 };

type IconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface NotifyRule { trigger: string; deadline: string; article: string }
interface Sandbox { description: string; how_to_apply: string; url: string }
interface Authority {
  id: string;
  name: string;
  fullName: string;
  icon: IconType;
  color: string;
  colorBg: string;
  colorBdr: string;
  role: string;
  website: string;
  contact: string;
  phone: string;
  powers: string[];
  when_to_notify: NotifyRule[];
  sandbox: Sandbox | null;
}

interface CriminalRisk {
  title: string;
  article: string;
  penalty: string;
  aggravated: string;
  description: string;
  who_is_at_risk: string;
  mitigation: string;
  href: string;
}

interface AdminSanction {
  violation: string;
  max_amount: string;
  max_pct: string;
  severity: "critical" | "high" | "medium" | "info";
}

// ─── Dati autorità ────────────────────────────────────────────────────────────

function buildAuthorities(t: TFn): Authority[] {
  return [
    {
      id: "agid",
      name: "AGID",
      fullName: "Agenzia per l'Italia Digitale",
      icon: Building2,
      color: T.blue,
      colorBg: T.blueBg,
      colorBdr: T.blueBdr,
      role: t("agid_role"),
      website: "https://www.agid.gov.it",
      contact: "protocollo@pec.agid.gov.it",
      phone: "+39 06 85264.1",
      powers: [t("agid_pow1"), t("agid_pow2"), t("agid_pow3"), t("agid_pow4"), t("agid_pow5")],
      when_to_notify: [
        { trigger: t("agid_n1_trigger"), deadline: t("agid_n1_deadline"), article: "Art. 73 EU AI Act" },
        { trigger: t("agid_n2_trigger"), deadline: t("agid_n2_deadline"), article: "Art. 57 EU AI Act" },
        { trigger: t("agid_n3_trigger"), deadline: t("agid_n3_deadline"), article: "Art. 49 EU AI Act" },
      ],
      sandbox: {
        description: t("agid_sandbox_desc"),
        how_to_apply: t("agid_sandbox_apply"),
        url: "https://www.agid.gov.it/it/aree-di-intervento/intelligenza-artificiale",
      },
    },
    {
      id: "acn",
      name: "ACN",
      fullName: "Agenzia per la Cybersicurezza Nazionale",
      icon: Shield,
      color: "#0D1016",
      colorBg: "rgba(13,16,22,0.04)",
      colorBdr: "rgba(13,16,22,0.12)",
      role: t("acn_role"),
      website: "https://www.acn.gov.it",
      contact: "info@acn.gov.it / acn@pec.acn.gov.it",
      phone: "",
      powers: [t("acn_pow1"), t("acn_pow2"), t("acn_pow3"), t("acn_pow4"), t("acn_pow5")],
      when_to_notify: [
        { trigger: t("acn_n1_trigger"), deadline: t("acn_n1_deadline"), article: "NIS2 Art. 23" },
        { trigger: t("acn_n2_trigger"), deadline: t("acn_n2_deadline"), article: "Art. 15 EU AI Act" },
        { trigger: t("acn_n3_trigger"), deadline: t("acn_n3_deadline"), article: "NIS2 + Art. 15 AI Act" },
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
      role: t("gar_role"),
      website: "https://www.garanteprivacy.it",
      contact: "protocollo@gpdp.it / protocollo@pec.gpdp.it",
      phone: "+39 06 696771",
      powers: [t("gar_pow1"), t("gar_pow2"), t("gar_pow3"), t("gar_pow4"), t("gar_pow5")],
      when_to_notify: [
        { trigger: t("gar_n1_trigger"), deadline: t("gar_n1_deadline"), article: "Art. 33 GDPR" },
        { trigger: t("gar_n2_trigger"), deadline: t("gar_n2_deadline"), article: "Art. 36 GDPR" },
        { trigger: t("gar_n3_trigger"), deadline: t("gar_n3_deadline"), article: "Art. 35-36 GDPR" },
      ],
      sandbox: null,
    },
  ];
}

// ─── Sanzioni penali L.132/2025 ───────────────────────────────────────────────

function buildCriminalRisks(t: TFn): CriminalRisk[] {
  return [
    {
      title: t("cr1_title"),
      article: "Art. 5 L.132/2025",
      penalty: t("cr1_penalty"),
      aggravated: t("cr1_aggravated"),
      description: t("cr1_desc"),
      who_is_at_risk: t("cr1_who"),
      mitigation: t("cr1_mit"),
      href: "/dashboard/tools/art50-kit",
    },
    {
      title: t("cr2_title"),
      article: "Art. 640-ter c.p. (aggravato) + L.132/2025",
      penalty: t("cr2_penalty"),
      aggravated: t("cr2_aggravated"),
      description: t("cr2_desc"),
      who_is_at_risk: t("cr2_who"),
      mitigation: t("cr2_mit"),
      href: "/dashboard/tools/transparency",
    },
    {
      title: t("cr3_title"),
      article: "Art. 8 L.132/2025",
      penalty: t("cr3_penalty"),
      aggravated: t("cr3_aggravated"),
      description: t("cr3_desc"),
      who_is_at_risk: t("cr3_who"),
      mitigation: t("cr3_mit"),
      href: "/dashboard/tools/fria",
    },
    {
      title: t("cr4_title"),
      article: "D.Lgs. 231/2001 + L.132/2025",
      penalty: t("cr4_penalty"),
      aggravated: t("cr4_aggravated"),
      description: t("cr4_desc"),
      who_is_at_risk: t("cr4_who"),
      mitigation: t("cr4_mit"),
      href: "/dashboard/tools/l132",
    },
  ];
}

// ─── Sanzioni amministrative EU AI Act ───────────────────────────────────────

function buildAdminSanctions(t: TFn): AdminSanction[] {
  return [
    { violation: t("as1_violation"), max_amount: "€35.000.000",           max_pct: t("as1_pct"), severity: "critical" },
    { violation: t("as2_violation"), max_amount: "€15.000.000",           max_pct: t("as2_pct"), severity: "high"     },
    { violation: t("as3_violation"), max_amount: "€7.500.000",            max_pct: t("as3_pct"), severity: "medium"   },
    { violation: t("as4_violation"), max_amount: t("as4_amount"),         max_pct: t("as4_pct"), severity: "info"     },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AuthorityCard({ auth, t }: { auth: Authority; t: TFn }) {
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
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>{t("lbl_contacts")}</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>{t("lbl_powers")}</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>{t("lbl_whenNotify")}</p>
                <div className="space-y-2">
                  {auth.when_to_notify.map((n, i) => (
                    <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
                      <div className="text-xs font-medium mb-1" style={{ color: "rgba(0,0,0,0.45)" }}>{n.trigger}</div>
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
                    {t("sandbox_title")}
                  </p>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: T.muted }}>{auth.sandbox.description}</p>
                  <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
                    <strong>{t("sandbox_howto")}</strong> {auth.sandbox.how_to_apply}
                  </p>
                  <a href={auth.sandbox.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: T.blue }}>
                    {t("sandbox_portal")} <ExternalLink className="w-3 h-3" />
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

function CriminalRiskCard({ risk, t }: { risk: CriminalRisk; t: TFn }) {
  const [open, setOpen] = useState(false);

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
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.red }}>{t("lbl_aggravating")}</p>
                <p className="text-xs" style={{ color: "rgba(0,0,0,0.55)" }}>{risk.aggravated}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.faint }}>{t("lbl_whoRisk")}</p>
                <p className="text-xs" style={{ color: T.muted }}>{risk.who_is_at_risk}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.faint }}>{t("lbl_howMitigate")}</p>
                <p className="text-xs" style={{ color: T.muted }}>{risk.mitigation}</p>
              </div>
              <a href={risk.href}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBdr}` }}>
                {t("goMitigation")} <ExternalLink className="w-3 h-3" />
              </a>
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
  const t = useT("toolAgidAcn");
  const [tab, setTab] = useState<TabId>("authorities");
  const [art5Open, setArt5Open] = useState(false);

  const AUTHORITIES = buildAuthorities(t);
  const CRIMINAL_RISKS = buildCriminalRisks(t);
  const ADMIN_SANCTIONS = buildAdminSanctions(t);

  const TABS: { id: TabId; label: string }[] = [
    { id: "authorities", label: t("tab_authorities") },
    { id: "criminal",    label: t("tab_criminal")  },
    { id: "sanctions",   label: t("tab_sanctions") },
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
          <span className="text-xs font-medium" style={{ color: T.muted }}>{t("headerKicker")}</span>
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: T.text }}>AGID / ACN / Garante Privacy</h1>
        <p className="text-sm" style={{ color: T.muted }}>
          {t("subtitle")}
        </p>
      </div>

      {/* Alert L.132 */}
      <div className="rounded-xl px-4 py-3.5" style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: T.red }}>
              {t("l132AlertTitle")}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
              {t("l132AlertBody")}
            </p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
        {TABS.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === tb.id ? T.card : "transparent",
              color: tab === tb.id ? T.text : T.muted,
              boxShadow: tab === tb.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab: Autorità */}
      {tab === "authorities" && (
        <div className="space-y-3">
          {AUTHORITIES.map(auth => (
            <AuthorityCard key={auth.id} auth={auth} t={t} />
          ))}
        </div>
      )}

      {/* Tab: Rischi penali */}
      {tab === "criminal" && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3" style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.45)" }}
              dangerouslySetInnerHTML={{ __html: t("criminal_note") }} />
          </div>
          {CRIMINAL_RISKS.map((risk, i) => (
            <CriminalRiskCard key={i} risk={risk} t={t} />
          ))}
        </div>
      )}

      {/* Tab: Sanzioni amministrative */}
      {tab === "sanctions" && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: T.muted }}>
            {t("sanctions_intro")}
          </p>
          {ADMIN_SANCTIONS.map((s, i) => {
            const colors = SEVERITY_COLORS[s.severity];
            const isCritical = s.severity === "critical";

            if (isCritical) {
              return (
                <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.bdr}` }}>
                  <button
                    onClick={() => setArt5Open((v) => !v)}
                    aria-expanded={art5Open}
                    className="w-full text-left p-4 transition-colors hover:bg-black/[0.01]"
                    style={{ background: colors.bg }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-1" style={{ color: colors.txt }}>{s.max_amount}</p>
                        <p className="text-xs" style={{ color: "rgba(0,0,0,0.55)" }}>{s.violation}</p>
                        <p className="text-[10px] mt-1.5 font-medium" style={{ color: "rgba(0,0,0,0.35)" }}>
                          {art5Open ? t("art5_hide") : t("art5_show")}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium" style={{ color: colors.txt }}>{t("or_word")}</p>
                        <p className="text-sm font-semibold" style={{ color: colors.txt }}>{s.max_pct}</p>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {art5Open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4" style={{ borderTop: `1px solid rgba(220,38,38,0.12)` }}>
                          <ProhibitedPracticesArt5 />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <div key={i} className="rounded-xl p-4" style={{ background: colors.bg, border: `1px solid ${colors.bdr}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: colors.txt }}>{s.max_amount}</p>
                    <p className="text-xs" style={{ color: "rgba(0,0,0,0.55)" }}>{s.violation}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium" style={{ color: colors.txt }}>{t("or_word")}</p>
                    <p className="text-sm font-semibold" style={{ color: colors.txt }}>{s.max_pct}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}>
            <p className="text-xs leading-relaxed" style={{ color: T.muted }}
              dangerouslySetInnerHTML={{ __html: t("sanctions_footer") }} />
          </div>
        </div>
      )}

    </div>
  );
}
