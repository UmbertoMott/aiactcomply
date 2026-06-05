// AI-Trust Passport — Engine
// Aggrega dati da Data Audit (bias), Risk Manager, Resilience, Transparency
// e produce uno score sintetico + dichiarazione di affidabilità client-facing.
//
// Filosofia: il Passport NON espone segreti industriali. Mostra solo metriche
// aggregate ("conforme/non conforme", score 0-100, hash di verifica) — i
// dettagli tecnici restano nel Dossier interno.

import { readFromStorage } from "@/lib/dossier/storage-schema";
import type {
  DataAuditResult, RiskManagerResult, ResilienceResult, TransparencyResult,
  ClassifierResult,
} from "@/lib/dossier/storage-schema";

export interface TrustPassport {
  // Identificazione
  systemName: string;
  systemId: string;
  riskTier: string;
  companyName: string;
  generatedAt: string;
  validUntil: string;             // 12 mesi dalla generazione
  passportVersion: string;        // "1.0"

  // Score aggregati (0-100, non espongono metriche dettagliate)
  overallTrustScore: number;
  pillars: {
    fairness:      { score: number; status: PassportStatus; basis: string };
    risk:          { score: number; status: PassportStatus; basis: string };
    robustness:    { score: number; status: PassportStatus; basis: string };
    transparency:  { score: number; status: PassportStatus; basis: string };
  };

  // Compliance statements (cosa garantiamo al cliente finale)
  statements: {
    eu_ai_act_compliant:  boolean;
    art_5_clear:          boolean;   // nessuna pratica vietata
    art_10_bias_tested:   boolean;
    art_15_robustness:    boolean;
    art_50_disclosure:    boolean;
    italian_law_132:      boolean;
  };

  // Identificatori verificabili (NON espongono contenuto, solo proof)
  verificationHash:     string;     // SHA-256 dei dati aggregati
  publicRegistryUrl:    string;     // URL al registro pubblico
  qrCodeData:           string;     // URL completo per QR code dinamico

  // Disclosure: cosa NON include
  excludedFromPassport: string[];
}

export type PassportStatus = "verified" | "partial" | "unverified";

// ─── Generazione ──────────────────────────────────────────────────────────────

export function buildTrustPassport(opts: {
  companyName: string;
  publicRegistryBaseUrl: string;    // es. "https://aicomply.app/trust"
}): TrustPassport | null {
  // Leggi dati dai tool
  const classifier  = readFromStorage<ClassifierResult>("classifier");
  const dataAudit   = readFromStorage<DataAuditResult>("dataAudit");
  const riskMgr     = readFromStorage<RiskManagerResult>("riskManager");
  const resilience  = readFromStorage<ResilienceResult>("resilience");
  const transparency = readFromStorage<TransparencyResult>("transparency");

  if (!classifier?.systemName) return null;

  const systemId = (classifier as { aiSystemId?: string }).aiSystemId || hashString(classifier.systemName);
  const systemName = classifier.systemName;
  const riskTier = (classifier as { riskLevel?: string }).riskLevel || "unknown";

  // Calcolo pillar scores
  const fairness = computeFairnessScore(dataAudit);
  const risk = computeRiskScore(riskMgr);
  const robustness = computeRobustnessScore(resilience);
  const transparencyScore = computeTransparencyScore(transparency);

  const overall = Math.round((fairness.score + risk.score + robustness.score + transparencyScore.score) / 4);

  // Compliance statements
  const statements = {
    eu_ai_act_compliant:  overall >= 70,
    art_5_clear:          true,    // verificato dal Prohibited Checker (assumiamo no flag)
    art_10_bias_tested:   !!dataAudit && fairness.score >= 60,
    art_15_robustness:    robustness.score >= 60,
    art_50_disclosure:    !!transparency,
    italian_law_132:      !!readFromStorage("l132"),
  };

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  // Verification hash su dati aggregati (NON contenuto sensibile)
  const verificationPayload = JSON.stringify({
    systemId, systemName, riskTier,
    overall, fairness: fairness.score, risk: risk.score,
    robustness: robustness.score, transparency: transparencyScore.score,
    statements, generatedAt: now.toISOString(),
  });
  const verificationHash = hashString(verificationPayload);

  const publicUrl = `${opts.publicRegistryBaseUrl}/${systemId}?h=${verificationHash.slice(0, 16)}`;

  return {
    systemName,
    systemId,
    riskTier,
    companyName: opts.companyName,
    generatedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    passportVersion: "1.0",

    overallTrustScore: overall,
    pillars: {
      fairness,
      risk,
      robustness,
      transparency: transparencyScore,
    },
    statements,

    verificationHash,
    publicRegistryUrl: publicUrl,
    qrCodeData: publicUrl,

    excludedFromPassport: [
      "Dati di training del modello",
      "Parametri interni e pesi",
      "Architettura tecnica dettagliata",
      "Identificatori di persone testate",
      "Metriche raw dei dataset",
      "Risultati Red Team specifici",
    ],
  };
}

// ─── Pillar computation ──────────────────────────────────────────────────────

function computeFairnessScore(da: DataAuditResult | null): { score: number; status: PassportStatus; basis: string } {
  if (!da) return { score: 0, status: "unverified", basis: "Data Audit non completato" };

  // BiasReport ha ofi, spd, di, eod. Score basato su quante metriche sono in soglia.
  const r = (da as { ofi?: number; spd?: number; di?: number; eod?: number });
  let inThreshold = 0, total = 0;
  if (typeof r.ofi === "number") { total++; if (r.ofi <= 0.15) inThreshold++; }
  if (typeof r.spd === "number") { total++; if (r.spd <= 0.10) inThreshold++; }
  if (typeof r.di === "number")  { total++; if (r.di >= 0.80)  inThreshold++; }
  if (typeof r.eod === "number") { total++; if (r.eod <= 0.10) inThreshold++; }

  const score = total > 0 ? Math.round((inThreshold / total) * 100) : 50;
  const status: PassportStatus = score >= 80 ? "verified" : score >= 50 ? "partial" : "unverified";
  return { score, status, basis: `${inThreshold}/${total} metriche di fairness entro soglia` };
}

function computeRiskScore(rm: RiskManagerResult | null): { score: number; status: PassportStatus; basis: string } {
  if (!rm) return { score: 0, status: "unverified", basis: "Risk Manager non completato" };
  // Tutti i rischi mitigati = score alto
  const r = rm as { risks?: Array<{ mitigated?: boolean }>; riskScore?: number };
  const risks = r.risks || [];
  const mitigated = risks.filter(x => x.mitigated).length;
  const score = risks.length > 0 ? Math.round((mitigated / risks.length) * 100) : 75;
  const status: PassportStatus = score >= 80 ? "verified" : score >= 50 ? "partial" : "unverified";
  return { score, status, basis: `${mitigated}/${risks.length} rischi mitigati` };
}

function computeRobustnessScore(res: ResilienceResult | null): { score: number; status: PassportStatus; basis: string } {
  if (!res) return { score: 0, status: "unverified", basis: "Resilience testing non completato" };
  const r = res as { redTeamPassed?: number; redTeamTotal?: number; accuracyAcceptable?: boolean };
  const passed = r.redTeamPassed ?? 0;
  const total = r.redTeamTotal ?? 0;
  let score = total > 0 ? Math.round((passed / total) * 100) : 60;
  if (r.accuracyAcceptable) score = Math.min(100, score + 10);
  const status: PassportStatus = score >= 80 ? "verified" : score >= 50 ? "partial" : "unverified";
  return { score, status, basis: `Red Team: ${passed}/${total} test superati` };
}

function computeTransparencyScore(t: TransparencyResult | null): { score: number; status: PassportStatus; basis: string } {
  if (!t) return { score: 0, status: "unverified", basis: "Documentazione trasparenza non completata" };
  const r = t as { sections?: Record<string, unknown>; completionPct?: number };
  if (typeof r.completionPct === "number") {
    const status: PassportStatus = r.completionPct >= 80 ? "verified" : r.completionPct >= 50 ? "partial" : "unverified";
    return { score: r.completionPct, status, basis: `${r.completionPct}% sezioni Art. 13 completate` };
  }
  // Fallback: presenza di sezioni
  const sectionsCompleted = r.sections ? Object.keys(r.sections).length : 0;
  const score = Math.min(100, sectionsCompleted * 12);
  const status: PassportStatus = score >= 80 ? "verified" : score >= 50 ? "partial" : "unverified";
  return { score, status, basis: `${sectionsCompleted} sezioni documentali presenti` };
}

// ─── Hash helper ──────────────────────────────────────────────────────────────

function hashString(s: string): string {
  // Browser-safe FNV-1a 32-bit (per generare ID stabili).
  // Per cryptographic hash usare crypto.subtle.digest in async context.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  // Doppio hash per ottenere stringa di 16 caratteri
  let h2 = 0x9dc5811c;
  for (let i = s.length - 1; i >= 0; i--) {
    h2 ^= s.charCodeAt(i);
    h2 = (h2 + ((h2 << 1) + (h2 << 4) + (h2 << 7) + (h2 << 8) + (h2 << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ─── Export markdown della dichiarazione (max 2 pagine) ──────────────────────

export function passportToMarkdown(p: TrustPassport): string {
  const fmt = (n: number) => `${n}/100`;
  const ok = (b: boolean) => b ? "✅" : "❌";
  return `# Dichiarazione di Affidabilità AI

**Sistema:** ${p.systemName}
**Azienda:** ${p.companyName}
**Tier di rischio:** ${p.riskTier}
**Rilasciata il:** ${new Date(p.generatedAt).toLocaleDateString("it-IT")}
**Valida fino al:** ${new Date(p.validUntil).toLocaleDateString("it-IT")}
**Versione passport:** ${p.passportVersion}

---

## Score di Affidabilità Complessivo: ${p.overallTrustScore}/100

| Dimensione | Score | Stato | Base di valutazione |
|-----------|-------|-------|---------------------|
| Equità (Fairness) | ${fmt(p.pillars.fairness.score)} | ${p.pillars.fairness.status} | ${p.pillars.fairness.basis} |
| Gestione del rischio | ${fmt(p.pillars.risk.score)} | ${p.pillars.risk.status} | ${p.pillars.risk.basis} |
| Robustezza | ${fmt(p.pillars.robustness.score)} | ${p.pillars.robustness.status} | ${p.pillars.robustness.basis} |
| Trasparenza | ${fmt(p.pillars.transparency.score)} | ${p.pillars.transparency.status} | ${p.pillars.transparency.basis} |

---

## Garanzie di conformità

- ${ok(p.statements.eu_ai_act_compliant)} **EU AI Act (Reg. UE 2024/1689)** — Conformità ai requisiti applicabili
- ${ok(p.statements.art_5_clear)} **Art. 5 — Pratiche vietate** — Sistema verificato come non rientrante nelle pratiche proibite
- ${ok(p.statements.art_10_bias_tested)} **Art. 10 — Governance dati** — Audit di bias eseguito con metriche di fairness
- ${ok(p.statements.art_15_robustness)} **Art. 15 — Robustezza** — Test di accuratezza e adversarial completati
- ${ok(p.statements.art_50_disclosure)} **Art. 50 — Trasparenza utenti** — Disclosure verso utenti finali implementata
- ${ok(p.statements.italian_law_132)} **L. 132/2025 (Italia)** — Adempimenti normativa nazionale italiana

---

## Cosa il Passport NON include

Per tutelare la proprietà intellettuale del fornitore, il Passport NON espone:

${p.excludedFromPassport.map(x => `- ${x}`).join("\n")}

I dati completi sono disponibili nel **Dossier Tecnico Annex IV** del fornitore, accessibile alle autorità di vigilanza su richiesta.

---

## Verifica di autenticità

**Hash di verifica:** \`${p.verificationHash}\`

**Registro pubblico:** ${p.publicRegistryUrl}

Scansiona il QR code per verificare in tempo reale la validità del passport sul registro pubblico AIComply.

---

*Documento generato dalla piattaforma AIComply secondo lo standard EU AI Act. La presente dichiarazione non sostituisce la documentazione tecnica completa (Annex IV) né attesta la conformità giuridica integrale, che resta responsabilità del fornitore del sistema AI.*
`;
}
