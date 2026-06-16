"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Download,
  ExternalLink,
  Award,
  Plus,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  generatePassport,
  getPassportSummary,
  exportForRegulator,
} from "@/lib/crypto/passport";

// ─── TYPES ────────────────────────────────────────────────────────────

type CertStandard =
  | "ISO_42001"
  | "AI_ACT"
  | "SOC2"
  | "GDPR"
  | "ISO_27001"
  | "FRIA"
  | "CUSTOM";

type CertStatus = "certified" | "in_progress" | "expired" | "revoked";

interface Certification {
  id: string;
  name: string;
  standard: CertStandard;
  status: CertStatus;
  description: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
  documentUrl: string;
  article: string;
}

interface PassportRecord {
  id: string;
  systemName: string;
  riskLevel: string;
  generatedAt: string;
  passportHash: string;
  signature: string;
  signed: boolean;
}

interface TrustState {
  certifications: Certification[];
  passports: PassportRecord[];
  publicPageSlug: string;
  publicPageEnabled: boolean;
  checklistOverrides: Record<string, boolean>;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────

const STORAGE_KEY = "trust_center_state";

const SEED_CERTS: Certification[] = [
  {
    id: "cert-1",
    name: "ISO 42001",
    standard: "ISO_42001",
    status: "certified",
    description: "Sistema di gestione IA",
    issuedBy: "Bureau Veritas",
    issuedAt: "2024-01-15",
    expiresAt: "2026-12-31",
    documentUrl: "",
    article: "",
  },
  {
    id: "cert-2",
    name: "AI Act Compliance",
    standard: "AI_ACT",
    status: "in_progress",
    description: "Regolamento UE 2024/1689",
    issuedBy: "Ufficio UE per l'IA",
    issuedAt: "",
    expiresAt: null,
    documentUrl: "",
    article: "Art. 49",
  },
  {
    id: "cert-3",
    name: "SOC 2 Type II",
    standard: "SOC2",
    status: "certified",
    description: "Sicurezza e riservatezza",
    issuedBy: "KPMG",
    issuedAt: "2024-03-01",
    expiresAt: "2027-03-01",
    documentUrl: "",
    article: "",
  },
  {
    id: "cert-4",
    name: "GDPR",
    standard: "GDPR",
    status: "certified",
    description: "Protezione dati personali",
    issuedBy: "DPO interno",
    issuedAt: "2023-06-01",
    expiresAt: "2027-06-01",
    documentUrl: "",
    article: "",
  },
];

const DEFAULT_STATE: TrustState = {
  certifications: SEED_CERTS,
  passports: [],
  publicPageSlug: "my-company-aicomply",
  publicPageEnabled: false,
  checklistOverrides: {},
};

// ─── PERSISTENCE ──────────────────────────────────────────────────────

function loadState(): TrustState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrustState) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: TrustState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── CROSS-TOOL STATUS ────────────────────────────────────────────────

interface CrossToolStatus {
  friaCompleted: boolean;
  annexIVCompleted: boolean;
  conformityDone: boolean;
  nexusChecked: boolean;
  evidenceEntries: number;
}

function readCrossToolStatus(): CrossToolStatus {
  if (typeof window === "undefined")
    return { friaCompleted: false, annexIVCompleted: false, conformityDone: false, nexusChecked: false, evidenceEntries: 0 };
  const friaCompleted = !!localStorage.getItem("fria_document");
  const annexIVCompleted = !!localStorage.getItem("aia_architect_annex");
  const conformityDone = !!localStorage.getItem("conformity_assessment");
  const nexusChecked = !!localStorage.getItem("nexus_state");
  let evidenceEntries = 0;
  try {
    const raw = localStorage.getItem("evidence_chain");
    if (raw) evidenceEntries = (JSON.parse(raw) as unknown[]).length;
  } catch {
    evidenceEntries = 0;
  }
  return { friaCompleted, annexIVCompleted, conformityDone, nexusChecked, evidenceEntries };
}

// ─── HELPERS ─────────────────────────────────────────────────────────

function getDaysToExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function generateBadgeHTML(cert: Certification, slug: string): string {
  const colors: Record<CertStandard, string> = {
    ISO_42001: "#22c55e",
    AI_ACT: "#3b82f6",
    SOC2: "#8b5cf6",
    GDPR: "#f59e0b",
    ISO_27001: "#06b6d4",
    FRIA: "#10b981",
    CUSTOM: "#6b7280",
  };
  const color = colors[cert.standard] ?? "#6b7280";
  return `<!-- AIComply Trust Badge: ${cert.name} -->
<a href="https://aicomply.app/trust/${slug}" target="_blank" rel="noopener noreferrer"
   style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;
          background:#0D1016;border:1px solid ${color}33;text-decoration:none;font-family:sans-serif;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
  <span style="color:${color};font-size:12px;font-weight:600;">${cert.name}</span>
  <span style="color:#6b7280;font-size:11px;">Verificato · AIComply</span>
</a>`;
}

function generateJSONLD(certs: Certification[], slug: string): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: slug,
      hasCredential: certs
        .filter((c) => c.status === "certified")
        .map((c) => ({
          "@type": "EducationalOccupationalCredential",
          name: c.name,
          description: c.description,
          credentialCategory: c.standard,
          validFrom: c.issuedAt,
          validUntil: c.expiresAt ?? undefined,
          recognizedBy: { "@type": "Organization", name: c.issuedBy },
        })),
    },
    null,
    2
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────

export default function TrustCenterPage() {
  const [state, setState] = useState<TrustState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<"certifications" | "badges" | "passports">("certifications");
  const [crossStatus, setCrossStatus] = useState<CrossToolStatus>({
    friaCompleted: false,
    annexIVCompleted: false,
    conformityDone: false,
    nexusChecked: false,
    evidenceEntries: 0,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newPassportForm, setNewPassportForm] = useState<{
    systemName: string;
    riskLevel: "Unacceptable" | "High" | "Limited" | "Minimal";
  }>({
    systemName: "",
    riskLevel: "High",
  });

  const [form, setForm] = useState<Omit<Certification, "id">>({
    name: "",
    standard: "CUSTOM",
    status: "in_progress",
    description: "",
    issuedBy: "",
    issuedAt: "",
    expiresAt: null,
    documentUrl: "",
    article: "",
  });

  useEffect(() => {
    const s = loadState();
    setState(s);
    setCrossStatus(readCrossToolStatus());
  }, []);

  // Auto-update cert statuses based on cross-tool data
  useEffect(() => {
    if (!crossStatus.friaCompleted && !crossStatus.annexIVCompleted) return;
    setState((prev) => {
      const updated = prev.certifications.map((c) => {
        if (c.standard === "FRIA" && crossStatus.friaCompleted && c.status === "in_progress")
          return { ...c, status: "certified" as CertStatus };
        if (
          c.standard === "AI_ACT" &&
          crossStatus.annexIVCompleted &&
          crossStatus.conformityDone &&
          c.status === "in_progress"
        )
          return { ...c, status: "certified" as CertStatus };
        return c;
      });
      const newState = { ...prev, certifications: updated };
      saveState(newState);
      return newState;
    });
  }, [crossStatus]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({
      name: "",
      standard: "CUSTOM",
      status: "in_progress",
      description: "",
      issuedBy: "",
      issuedAt: "",
      expiresAt: null,
      documentUrl: "",
      article: "",
    });
    setShowAddForm(true);
  }

  function openEditForm(cert: Certification) {
    setEditingId(cert.id);
    setForm({ ...cert });
    setShowAddForm(true);
  }

  function saveCert() {
    if (!form.name.trim()) {
      showToast("Il nome della certificazione è obbligatorio");
      return;
    }
    setState((prev) => {
      let certs: Certification[];
      if (editingId) {
        certs = prev.certifications.map((c) =>
          c.id === editingId ? { ...form, id: editingId } : c
        );
      } else {
        certs = [
          ...prev.certifications,
          { ...form, id: `cert-${crypto.randomUUID().slice(0, 8)}` },
        ];
      }
      const newState = { ...prev, certifications: certs };
      saveState(newState);
      return newState;
    });
    setShowAddForm(false);
    showToast(editingId ? "Certificazione aggiornata" : "Certificazione aggiunta");
  }

  function deleteCert(id: string) {
    setState((prev) => {
      const newState = {
        ...prev,
        certifications: prev.certifications.filter((c) => c.id !== id),
      };
      saveState(newState);
      return newState;
    });
    showToast("Certificazione rimossa");
  }

  function handleGeneratePassport() {
    if (!newPassportForm.systemName.trim()) {
      showToast("Inserisci il nome del sistema AI");
      return;
    }
    const passport = generatePassport(
      newPassportForm.riskLevel,
      87,
      "Nessuna esenzione applicabile",
      "CLEAN",
      newPassportForm.systemName
    );
    const summary = getPassportSummary(passport);
    const record: PassportRecord = {
      id: summary.id,
      systemName: passport.system_name,
      riskLevel: passport.ai_act_risk_level,
      generatedAt: summary.generatedAt,
      passportHash: summary.hash,
      signature: passport.signature,
      signed: summary.signed,
    };

    const { filename, jsonContent } = exportForRegulator(passport);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setState((prev) => {
      const newState = { ...prev, passports: [record, ...prev.passports] };
      saveState(newState);
      return newState;
    });
    showToast(`Passaporto generato: ${filename}`);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ─── COMPUTED ───────────────────────────────────────────────────────

  const certifiedCount = state.certifications.filter((c) => c.status === "certified").length;
  const inProgressCount = state.certifications.filter((c) => c.status === "in_progress").length;
  const expiringSoonCount = state.certifications.filter((c) => {
    const d = getDaysToExpiry(c.expiresAt);
    return d !== null && d > 0 && d < 90;
  }).length;

  const expiredCerts = state.certifications.filter((c) => {
    const d = getDaysToExpiry(c.expiresAt);
    return d !== null && d <= 0;
  });

  const activeBadgeCerts = state.certifications.filter((c) => c.status === "certified");

  // ─── RENDER ─────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trust Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci certificazioni, genera badge verificabili e passaporti AI per clienti e auditor.
        </p>
      </div>

      {/* Expired warning banner */}
      {expiredCerts.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          ⚠️ {expiredCerts.length} certificazione{expiredCerts.length > 1 ? "i" : ""} scaduta
          {expiredCerts.length > 1 ? "e" : ""}:{" "}
          {expiredCerts.map((c) => c.name).join(", ")} — aggiorna lo stato.
        </div>
      )}

      {expiredCerts.length === 0 && expiringSoonCount > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          ⏰ {expiringSoonCount} certificazione{expiringSoonCount > 1 ? "i" : ""} in scadenza entro 90 giorni.
        </div>
      )}

      {/* Cross-tool auto-detection notice */}
      {(crossStatus.friaCompleted || crossStatus.annexIVCompleted) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary">
          ✓ Rilevato da altri tool:{" "}
          {crossStatus.friaCompleted ? "FRIA completato" : ""}
          {crossStatus.friaCompleted && crossStatus.annexIVCompleted ? " · " : ""}
          {crossStatus.annexIVCompleted ? "Annex IV compilato" : ""} — badge aggiornati automaticamente.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-success">{certifiedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Certificazioni attive</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-warning">{inProgressCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">In progress</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-primary">{activeBadgeCerts.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Badge disponibili</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["certifications", "badges", "passports"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "certifications"
              ? "Certificazioni"
              : tab === "badges"
              ? "Badge & Embed"
              : "Passaporti AI"}
          </button>
        ))}
      </div>

      {/* ── TAB: CERTIFICAZIONI ───────────────────────────────────── */}
      {activeTab === "certifications" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openAddForm}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground flex items-center gap-1 hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Aggiungi certificazione
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Certificazioni &amp; Audit</h2>
            </div>
            <div className="divide-y divide-border/50">
              {state.certifications.map((cert) => {
                const daysLeft = getDaysToExpiry(cert.expiresAt);
                return (
                  <div
                    key={cert.id}
                    className="px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`rounded-lg p-2 flex-shrink-0 ${
                          cert.status === "certified"
                            ? "bg-success/10"
                            : cert.status === "in_progress"
                            ? "bg-warning/10"
                            : "bg-destructive/10"
                        }`}
                      >
                        <Award
                          className={`h-4 w-4 ${
                            cert.status === "certified"
                              ? "text-success"
                              : cert.status === "in_progress"
                              ? "text-warning"
                              : "text-destructive"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{cert.name}</p>
                          {cert.article && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {cert.article}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{cert.description}</p>
                        {cert.issuedBy && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Emesso da: {cert.issuedBy}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-medium ${
                            cert.status === "certified"
                              ? "text-success"
                              : cert.status === "in_progress"
                              ? "text-warning"
                              : "text-destructive"
                          }`}
                        >
                          {cert.status === "certified"
                            ? "Certificato"
                            : cert.status === "in_progress"
                            ? "In corso"
                            : cert.status === "expired"
                            ? "Scaduto"
                            : "Revocato"}
                        </span>
                        {daysLeft !== null && daysLeft > 0 && (
                          <p
                            className={`text-[10px] mt-0.5 ${
                              daysLeft < 90 ? "text-warning" : "text-muted-foreground"
                            }`}
                          >
                            Scade tra {daysLeft}g
                          </p>
                        )}
                        {daysLeft !== null && daysLeft <= 0 && (
                          <p className="text-[10px] mt-0.5 text-destructive">Scaduto</p>
                        )}
                        {daysLeft === null && cert.expiresAt === null && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Nessuna scadenza
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditForm(cert)}
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCert(cert.id)}
                          className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {state.certifications.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Nessuna certificazione. Aggiungi la prima.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: BADGE & EMBED ───────────────────────────────────── */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Copia gli snippet HTML nei tuoi documenti, sito web o proposte commerciali. I badge sono
            verificabili tramite la pagina pubblica AIComply.
          </p>

          {activeBadgeCerts.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
              Nessun badge disponibile. Aggiungi certificazioni attive nella tab
              &ldquo;Certificazioni&rdquo;.
            </div>
          )}

          {activeBadgeCerts.map((cert) => {
            const html = generateBadgeHTML(cert, state.publicPageSlug);
            const key = `html-${cert.id}`;
            return (
              <div
                key={cert.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold text-foreground">{cert.name}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(html, key)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {copied === key ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Copiato
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copia HTML
                      </>
                    )}
                  </button>
                </div>
                {/* Preview */}
                <div className="px-5 py-4 border-b border-border/50 bg-black/20">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0D1016] border border-success/30 w-fit">
                    <Shield className="h-3.5 w-3.5 text-success" />
                    <span className="text-success text-xs font-semibold">{cert.name}</span>
                    <span className="text-muted-foreground text-[11px]">
                      Verificato · AIComply
                    </span>
                  </div>
                </div>
                {/* Code */}
                <pre className="px-5 py-4 text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {html}
                </pre>
              </div>
            );
          })}

          {/* JSON-LD snippet */}
          {activeBadgeCerts.length > 0 &&
            (() => {
              const ld = generateJSONLD(activeBadgeCerts, state.publicPageSlug);
              const ldKey = "jsonld";
              const ldSnippet = `<script type="application/ld+json">\n${ld}\n</script>`;
              return (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Schema.org JSON-LD (SEO)
                    </span>
                    <button
                      onClick={() => copyToClipboard(ldSnippet, ldKey)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      {copied === ldKey ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Copiato
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copia JSON-LD
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="px-5 py-4 text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-48">
                    {ldSnippet}
                  </pre>
                </div>
              );
            })()}

          {/* Public page link */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Link pagina pubblica</h3>
            <div className="flex gap-2">
              <input
                value={state.publicPageSlug}
                onChange={(e) =>
                  setState((prev) => {
                    const s = { ...prev, publicPageSlug: e.target.value };
                    saveState(s);
                    return s;
                  })
                }
                className="flex-1 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                placeholder="tua-azienda-aicomply"
              />
              <button
                onClick={() =>
                  copyToClipboard(
                    `https://aicomply.app/trust/${state.publicPageSlug}`,
                    "publink"
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copied === "publink" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copia link
              </button>
              <a
                href={`https://aicomply.app/trust/${state.publicPageSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Apri
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PASSAPORTI AI ───────────────────────────────────── */}
      {activeTab === "passports" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Genera Passaporto di Conformità
            </h3>
            <p className="text-xs text-muted-foreground">
              Il passaporto AI certifica crittograficamente il livello di rischio e la conformità
              del sistema AI — Art. 6, Allegato III, EU 2024/1689.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Nome sistema AI *
                </label>
                <input
                  value={newPassportForm.systemName}
                  onChange={(e) =>
                    setNewPassportForm((f) => ({ ...f, systemName: e.target.value }))
                  }
                  placeholder="es. HR Screening System v2.1"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Livello di rischio
                </label>
                <select
                  value={newPassportForm.riskLevel}
                  onChange={(e) =>
                    setNewPassportForm((f) => ({
                      ...f,
                      riskLevel: e.target.value as typeof f.riskLevel,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                >
                  <option value="High">High (Allegato III)</option>
                  <option value="Limited">Limited (Art. 50)</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Unacceptable">Unacceptable (Art. 5)</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleGeneratePassport}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground flex items-center gap-1 hover:bg-primary/90 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" /> Genera e scarica passaporto
            </button>
          </div>

          {state.passports.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Passaporti generati</h3>
              </div>
              <div className="divide-y divide-border/50">
                {state.passports.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.systemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.riskLevel} · {p.generatedAt} · Hash: {p.passportHash}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.signed && (
                        <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded">
                          ✓ Firmato
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SLIDE-IN FORM PANEL ──────────────────────────────────── */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowAddForm(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[440px] bg-card border-l border-border z-50 overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
                <h3 className="text-sm font-semibold text-foreground">
                  {editingId ? "Modifica certificazione" : "Nuova certificazione"}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {/* Name */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="es. ISO 42001"
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Standard */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Standard</label>
                  <select
                    value={form.standard}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, standard: e.target.value as CertStandard }))
                    }
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  >
                    <option value="ISO_42001">ISO 42001</option>
                    <option value="AI_ACT">AI Act Compliance</option>
                    <option value="SOC2">SOC 2</option>
                    <option value="GDPR">GDPR</option>
                    <option value="ISO_27001">ISO 27001</option>
                    <option value="FRIA">FRIA Approved</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                {/* Status pills */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Stato</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["certified", "in_progress", "expired", "revoked"] as CertStatus[]).map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => setForm((f) => ({ ...f, status: s }))}
                          className={`rounded-full px-3 py-1 text-[11px] font-medium border transition-colors ${
                            form.status === s
                              ? s === "certified"
                                ? "bg-success/20 border-success/40 text-success"
                                : s === "in_progress"
                                ? "bg-warning/20 border-warning/40 text-warning"
                                : "bg-destructive/20 border-destructive/40 text-destructive"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {s === "certified"
                            ? "Certificato"
                            : s === "in_progress"
                            ? "In corso"
                            : s === "expired"
                            ? "Scaduto"
                            : "Revocato"}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Descrizione</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="es. Sistema di gestione IA certificato"
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Issued By */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Emesso da</label>
                  <input
                    value={form.issuedBy}
                    onChange={(e) => setForm((f) => ({ ...f, issuedBy: e.target.value }))}
                    placeholder="es. Bureau Veritas"
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Data emissione
                    </label>
                    <input
                      type="date"
                      value={form.issuedAt}
                      onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Data scadenza
                    </label>
                    <input
                      type="date"
                      value={form.expiresAt ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiresAt: e.target.value || null }))
                      }
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                </div>

                {/* Article */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Articolo EU AI Act (opzionale)
                  </label>
                  <input
                    value={form.article}
                    onChange={(e) => setForm((f) => ({ ...f, article: e.target.value }))}
                    placeholder="es. Art. 49"
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Document URL */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    URL documento (opzionale)
                  </label>
                  <input
                    value={form.documentUrl}
                    onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border flex gap-2 sticky bottom-0 bg-card">
                <button
                  onClick={saveCert}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {editingId ? "Salva modifiche" : "Aggiungi certificazione"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/20 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-card border border-border px-4 py-3 text-sm text-foreground shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
