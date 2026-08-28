"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ShieldCheck, Download, RefreshCw, Award, AlertCircle,
  CheckCircle2, Circle, ExternalLink, FileText, Copy, FileDown,
} from "lucide-react";
import { buildTrustPassport, passportToMarkdown, type TrustPassport } from "@/lib/trust/passport-engine";
import { useT } from "@/i18n/LocaleProvider";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.45)",
  faint:  "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card:   "#ffffff",
  green:  "#15803d", greenBg: "rgba(22,163,74,0.06)",  greenBdr: "rgba(22,163,74,0.2)",
  amber:  "#d97706", amberBg: "rgba(245,158,11,0.06)", amberBdr: "rgba(245,158,11,0.2)",
  red:    "#dc2626", redBg:   "rgba(220,38,38,0.06)",  redBdr:   "rgba(220,38,38,0.18)",
  blue:   "#2563eb", blueBg:  "rgba(37,99,235,0.06)",  blueBdr:  "rgba(37,99,235,0.18)",
  purple: "#7c3aed", purpleBg: "rgba(124,58,237,0.06)", purpleBdr: "rgba(124,58,237,0.2)",
};

// QR code generato lato client come Data URL — nessuna dipendenza esterna
async function generateQrDataUrl(data: string, size = 200): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: { dark: "#0D1016", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}

// ─── Pillar Card ──────────────────────────────────────────────────────────────

function PillarCard({
  label, score, status, basis, color,
}: {
  label: string;
  score: number;
  status: string;
  basis: string;
  color: { txt: string; bg: string; bdr: string };
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.faint }}>{label}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: color.bg, color: color.txt, border: `1px solid ${color.bdr}` }}
        >
          {status}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: color.txt }}>
        {score}<span className="text-sm" style={{ color: T.faint }}>/100</span>
      </div>
      <div className="h-1.5 rounded-full w-full mb-2" style={{ background: "rgba(0,0,0,0.07)" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, background: color.txt }}
        />
      </div>
      <p className="text-[11px]" style={{ color: T.muted }}>{basis}</p>
    </div>
  );
}

// ─── Statement Row ────────────────────────────────────────────────────────────

function StatementRow({ ok, title, subtitle }: { ok: boolean; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
      style={{ background: ok ? T.greenBg : "rgba(0,0,0,0.02)", border: `1px solid ${ok ? T.greenBdr : T.border}` }}>
      {ok
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.green }} />
        : <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.faint }} />
      }
      <div>
        <p className="text-xs font-medium" style={{ color: ok ? T.text : T.muted }}>{title}</p>
        <p className="text-[11px]" style={{ color: T.muted }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrustPassportPage() {
  const t = useT("toolTrustPassport");
  const [passport, setPassport] = useState<TrustPassport | null>(null);
  const [companyName, setCompanyName] = useState(() => t("companyName_default"));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);

  function generate() {
    setError(null);
    const baseUrl = typeof window !== "undefined"
      ? `${window.location.origin}/trust/passport`
      : "https://aicomply.app/trust/passport";

    const p = buildTrustPassport({
      companyName,
      publicRegistryBaseUrl: baseUrl,
    });

    if (!p) {
      setError(t("error_noSystem"));
      setPassport(null);
      return;
    }
    setPassport(p);
  }

  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);

  // Genera QR code quando il passport cambia
  useEffect(() => {
    if (passport?.qrCodeData) {
      generateQrDataUrl(passport.qrCodeData, 200).then(setQrDataUrl);
    }
  }, [passport?.qrCodeData]);

  async function downloadPdfA3() {
    if (!passport) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/trust-passport/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passport),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-trust-passport-${passport.systemId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`${t("pdf_error")} ${e}`);
    } finally {
      setPdfLoading(false);
    }
  }

  function downloadMarkdown() {
    if (!passport) return;
    const md = passportToMarkdown(passport);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-trust-passport-${passport.systemId}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyVerificationUrl() {
    if (!passport) return;
    navigator.clipboard.writeText(passport.publicRegistryUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Color helpers per score
  const colorForScore = (s: number) => {
    if (s >= 80) return { txt: T.green, bg: T.greenBg, bdr: T.greenBdr };
    if (s >= 50) return { txt: T.amber, bg: T.amberBg, bdr: T.amberBdr };
    return { txt: T.red, bg: T.redBg, bdr: T.redBdr };
  };

  return (
    <div className="w-full space-y-6 pb-10" style={{ color: T.text }}>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4" style={{ color: T.purple }} />
            <span className="text-xs font-medium" style={{ color: T.muted }}>Selling Kit</span>
          </div>
          <h1 className="text-xl font-bold">AI-Trust Passport</h1>
          <p className="text-sm mt-0.5" style={{ color: T.muted }}>
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.muted }}
        >
          <RefreshCw className="w-3 h-3" /> {t("regen")}
        </button>
      </div>

      {/* Error / empty */}
      {error && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2"
          style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}` }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.amber }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: T.amber }}>{error}</p>
            <Link href="/dashboard/tools/classifier" className="text-xs underline mt-1 inline-block" style={{ color: T.amber }}>
              {t("goClassifier")}
            </Link>
          </div>
        </div>
      )}

      {passport && (
        <>
          {/* Azienda input */}
          <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>
              {t("company_label")}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={generate}
              className="w-full px-3 py-1.5 rounded-lg text-sm"
              style={{ border: `1px solid ${T.border}`, color: T.text }}
            />
          </div>

          {/* Hero — score globale */}
          <div className="rounded-2xl p-6 flex items-center gap-6"
            style={{ background: T.purpleBg, border: `1px solid ${T.purpleBdr}` }}>
            <div className="flex-shrink-0">
              <Award className="w-12 h-12" style={{ color: T.purple }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.purple }}>
                {t("score_label")}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold" style={{ color: T.text }}>{passport.overallTrustScore}</span>
                <span className="text-sm" style={{ color: T.muted }}>/ 100</span>
              </div>
              <p className="text-xs mt-1" style={{ color: T.muted }}>
                {t("system_word")} <strong>{passport.systemName}</strong> · {t("tier_word")} {passport.riskTier}
                {" · "}{t("validUntil")} {new Date(passport.validUntil).toLocaleDateString("it-IT")}
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              {qrDataUrl
                ? <img src={qrDataUrl} alt={t("qr_alt")} className="w-24 h-24 rounded-lg bg-white p-1" />
                : <div className="w-24 h-24 rounded-lg bg-white/10 flex items-center justify-center text-[10px]" style={{ color: T.faint }}>{t("qr_generating")}</div>
              }
              <p className="text-[9px] mt-1" style={{ color: T.faint }}>{t("qr_scan")}</p>
            </div>
          </div>

          {/* 4 pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <PillarCard label={t("pillar_fairness")} {...passport.pillars.fairness} color={colorForScore(passport.pillars.fairness.score)} />
            <PillarCard label={t("pillar_risk")} {...passport.pillars.risk} color={colorForScore(passport.pillars.risk.score)} />
            <PillarCard label={t("pillar_robustness")} {...passport.pillars.robustness} color={colorForScore(passport.pillars.robustness.score)} />
            <PillarCard label={t("pillar_transparency")} {...passport.pillars.transparency} color={colorForScore(passport.pillars.transparency.score)} />
          </div>

          {/* Statements */}
          <div className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
              {t("statements_heading")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <StatementRow ok={passport.statements.eu_ai_act_compliant} title={t("st_euaiact")} subtitle={t("st_euaiact_sub")} />
              <StatementRow ok={passport.statements.art_5_clear} title={t("st_art5")} subtitle={t("st_art5_sub")} />
              <StatementRow ok={passport.statements.art_10_bias_tested} title={t("st_art10")} subtitle={t("st_art10_sub")} />
              <StatementRow ok={passport.statements.art_15_robustness} title={t("st_art15")} subtitle={t("st_art15_sub")} />
              <StatementRow ok={passport.statements.art_50_disclosure} title={t("st_art50")} subtitle={t("st_art50_sub")} />
              <StatementRow ok={passport.statements.italian_law_132} title={t("st_l132")} subtitle={t("st_l132_sub")} />
            </div>
          </div>

          {/* Cosa NON include */}
          <div className="rounded-xl p-5" style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.faint }}>
              {t("notExpose_heading")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {passport.excludedFromPassport.map((item, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded"
                  style={{ background: T.card, color: T.muted, border: `1px solid ${T.border}` }}>
                  {item}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-3" style={{ color: T.muted }}>
              {t("notExpose_note")}
            </p>
          </div>

          {/* Verifica */}
          <div className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
              {t("verif_heading")}
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px]" style={{ color: T.faint }}>{t("verif_hash")}</p>
                <code className="text-xs" style={{ color: T.text }}>{passport.verificationHash}</code>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: T.faint }}>{t("verif_url")}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 truncate" style={{ color: T.blue }}>{passport.publicRegistryUrl}</code>
                  <button onClick={copyVerificationUrl}
                    className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
                    style={{ background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBdr}` }}>
                    <Copy className="w-3 h-3" /> {copied ? t("copied") : t("copy")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={downloadPdfA3} disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: T.purple }}>
              <FileDown className="w-4 h-4" />
              {pdfLoading ? t("pdf_loading") : t("pdf_btn")}
            </button>
            <button onClick={downloadMarkdown}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
              <Download className="w-4 h-4" />
              {t("md_btn")}
            </button>
            <Link href="/dashboard/dossier"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
              <FileText className="w-4 h-4" />
              {t("dossier_btn")}
            </Link>
            <a href={passport.publicRegistryUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{ background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
              <ExternalLink className="w-4 h-4" />
              {t("openRegistry")}
            </a>
          </div>

          {/* Disclaimer legale */}
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.02)", border: `1px solid ${T.border}` }}>
            <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}
              dangerouslySetInnerHTML={{ __html: t("disclaimer") }}
            />
          </div>
        </>
      )}
    </div>
  );
}
