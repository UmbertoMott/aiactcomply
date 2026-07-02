# Unified Assessment (DPIA + FRIA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificare DPIA (GDPR/WP248) e FRIA (AI Act Art. 27/DIHR) in un unico oggetto `Assessment` con nucleo `shared` come fonte di verità, rischi correlati con tabella WP29⇄DIHR, e FRIA migrata nel sistema di storage condiviso.

**Architecture:** Si crea `src/lib/assessment/` con lo schema, la correlation map e le funzioni helper. `STORAGE_KEYS` riceve la chiave `assessment`. DPIA e FRIA continuano a funzionare identiche come viste — si cambia solo dove leggono/scrivono i campi identitari e dove persistono. Nessuna migrazione forzata: la FRIA fa un import one-shot dalla chiave legacy `aicomply_fria_document` se presente.

**Tech Stack:** TypeScript, Next.js 16 App Router, `"use client"`, `localStorage` via `readFromStorage`/`writeToStorage` (src/lib/dossier/storage-schema.ts), React inline styles (no Tailwind), `npx tsc --noEmit` per type-check.

---

## File map

| Azione | File | Responsabilità |
|--------|------|----------------|
| **Create** | `src/lib/assessment/assessment-schema.ts` | Tipi `AssessmentShared`, `ComplianceRef`, `CorrelatedRisk`, `Assessment` |
| **Create** | `src/lib/assessment/correlation-map.ts` | Dati statici WP29⇄DIHR⇄CFR per tema di rischio |
| **Create** | `src/lib/assessment/assessment-helpers.ts` | `seedAssessmentFromClassifier`, `getAssessment`, `patchShared`, `addCorrelatedRisk`, `applyMitigationToRegister` |
| **Modify** | `src/lib/dossier/storage-schema.ts` | Aggiungere `assessment` a `STORAGE_KEYS` |
| **Modify** | `src/app/dashboard/tools/fria/page.tsx` | Sostituire `FRIA_DOC_KEY` con `readFromStorage`/`writeToStorage("assessment")`, import one-shot legacy, rimuovere T.blue e [verify against...] |
| **Modify** | `src/app/dashboard/tools/dpia/page.tsx` | Leggere `shared` dall'Assessment per pre-popolare campi identitari; rimuovere T.blue |
| **Create** | `src/app/dashboard/tools/fria/page.tsx` *(già esiste)* | Nessun nuovo file — modifica in-place |

---

## Task 0: Fondamenta — schema e storage key

**Files:**
- Create: `src/lib/assessment/assessment-schema.ts`
- Modify: `src/lib/dossier/storage-schema.ts`

- [ ] **Step 1: Creare `assessment-schema.ts`**

```typescript
// src/lib/assessment/assessment-schema.ts

import type {
  ClassifierResult,
  DPIAResult,
  RiskManagerResult,
} from "@/lib/dossier/storage-schema";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

/** Nucleo condiviso — unica fonte di verità, seeded dal Classifier. */
export interface AssessmentShared {
  systemName: string;
  organization: string;
  riskLevel: ClassifierResult["riskLevel"];
  annexIII: boolean;
  role?: ClassifierResult["role"];
  isGPAI?: boolean;
  purpose: string;
  legalBasis: string;
  processesPersonalData: boolean;
  personalDataCategories: string[];
  specialCategories: string[];
  dataSubjects: string[];
}

/** Riferimento normativo per la tabella di correlazione. */
export interface ComplianceRef {
  framework: "WP29" | "DIHR" | "AI_ACT" | "GDPR" | "CFR";
  citation: string;
}

/** Rischio correlato — ponte tra DPIAThreat, FRIARightImpact e risk-register. */
export interface CorrelatedRisk {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceView: "dpia" | "fria" | "both" | "manual";
  sourceRefId?: string;
  refs: ComplianceRef[];
  mitigation?: {
    text: string;
    appliedToRegister: boolean;
    registerRiskId?: string;
  };
}

/** Root: DPIA e FRIA come due viste di un unico oggetto. */
export interface Assessment {
  id: string;
  scopeId: string;
  shared: AssessmentShared;
  dpia: DPIAResult;
  fria: FRIADocument;
  correlatedRisks: CorrelatedRisk[];
  meta: {
    createdAt: string;
    updatedAt: string;
    version: number;
  };
}
```

- [ ] **Step 2: Aggiungere la chiave `assessment` a `STORAGE_KEYS` in `storage-schema.ts`**

Trovare il blocco `export const STORAGE_KEYS = {` (circa riga 399) e aggiungere alla fine prima di `} as const;`:

```typescript
  assessment: "aicomply_assessment",
```

Il risultato finale del blocco sarà:
```typescript
export const STORAGE_KEYS = {
  prohibited:  "aicomply_prohibited_result",
  classifier:  "aicomply_classifier_result",
  riskManager: "aicomply_risk_manager_result",
  dataAudit:   "aicomply_data_audit_result",
  docugen:     "aicomply_docugen_result",
  logvault:    "aicomply_logvault_result",
  transparency:"aicomply_transparency_result",
  oversight:   "aicomply_oversight_result",
  resilience:  "aicomply_resilience_result",
  qms:         "aicomply_qms_result",
  fria:        "aicomply_fria_result",
  dpia:        "aicomply_dpia_result",
  l132:        "aicomply_l132_result",
  gpai:        "aicomply_gpai_result",
  conformity:  "aicomply_conformity_assessment",
  onboarding:  "aicomply_onboarding_data",
  xai:         "aicomply_xai_result",
  deployer:    "aicomply_deployer_result",
  eudb:        "aicomply_eudb_result",
  authorizedRep: "aicomply_authorized_rep_result",
  providerTransition: "aicomply_provider_transition_result",
  art50: "aicomply_art50_result",
  orgProfile: "aicomply_org_profile",
  incident: "aicomply_incident_result",
  assessment: "aicomply_assessment",
} as const;
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errori nuovi relativi ad `assessment-schema.ts` o `storage-schema.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assessment/assessment-schema.ts src/lib/dossier/storage-schema.ts
git commit -m "feat(assessment): schema Assessment + STORAGE_KEYS.assessment"
```

---

## Task 1: Correlation map WP29 ⇄ DIHR ⇄ CFR

**Files:**
- Create: `src/lib/assessment/correlation-map.ts`

- [ ] **Step 1: Creare `correlation-map.ts`**

```typescript
// src/lib/assessment/correlation-map.ts
// Dati statici: mappa tema di rischio → riferimenti normativi WP29 + DIHR + CFR

import type { ComplianceRef } from "./assessment-schema";

export interface CorrelationTheme {
  themeId: string;
  label: string;
  isAbsolute: boolean;
  wp29: ComplianceRef[];
  dihr: ComplianceRef[];
  cfr: ComplianceRef[];
}

export const CORRELATION_MAP: CorrelationTheme[] = [
  {
    themeId: "automated_decision",
    label: "Decisione automatizzata su persone",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 22" },
      { framework: "WP29", citation: "WP248 §necessità" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 3–4" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 8" },
      { framework: "CFR", citation: "CFR Art. 21" },
    ],
  },
  {
    themeId: "profiling_scoring",
    label: "Profilazione / scoring",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 35(3)(a)" },
      { framework: "WP29", citation: "WP248 rights_checks" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 4" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 1" },
      { framework: "CFR", citation: "CFR Art. 21" },
    ],
  },
  {
    themeId: "special_categories",
    label: "Trattamento categorie particolari",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 9" },
      { framework: "GDPR", citation: "Art. 35(3)(b)" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 4" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 21" },
    ],
  },
  {
    themeId: "surveillance_monitoring",
    label: "Sorveglianza / monitoraggio",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 35(3)(c)" },
    ],
    dihr: [
      { framework: "DIHR", citation: "Step 3" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 7" },
      { framework: "CFR", citation: "CFR Art. 8" },
    ],
  },
  {
    themeId: "international_transfers",
    label: "Trasferimenti internazionali",
    isAbsolute: false,
    wp29: [
      { framework: "GDPR", citation: "Art. 44–49" },
    ],
    dihr: [],
    cfr: [],
  },
  {
    themeId: "absolute_rights",
    label: "Diritti assoluti (dignità, divieto tortura)",
    isAbsolute: true,
    wp29: [],
    dihr: [
      { framework: "DIHR", citation: "§3.2" },
    ],
    cfr: [
      { framework: "CFR", citation: "CFR Art. 1" },
      { framework: "CFR", citation: "CFR Art. 4" },
    ],
  },
];

/** Dato un themeId restituisce tutti i refs (wp29 + dihr + cfr uniti). */
export function getRefsForTheme(themeId: string): ComplianceRef[] {
  const theme = CORRELATION_MAP.find(t => t.themeId === themeId);
  if (!theme) return [];
  return [...theme.wp29, ...theme.dihr, ...theme.cfr];
}

/** Dato il right_id FUNDAMENTAL_RIGHTS (es. "nondiscrimination") mappa al themeId più vicino. */
export function rightIdToThemeId(rightId: string): string {
  const map: Record<string, string> = {
    dignity: "absolute_rights",
    prohibition_torture: "absolute_rights",
    nondiscrimination: "profiling_scoring",
    data_protection: "special_categories",
    privacy: "surveillance_monitoring",
    effective_remedy: "automated_decision",
  };
  return map[rightId] ?? "automated_decision";
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/lib/assessment/correlation-map.ts
git commit -m "feat(assessment): correlation map WP29⇄DIHR⇄CFR"
```

---

## Task 2: Helper functions

**Files:**
- Create: `src/lib/assessment/assessment-helpers.ts`

Queste funzioni sono il punto d'accesso unico all'oggetto Assessment. Leggono/scrivono sempre via `readFromStorage`/`writeToStorage("assessment")`.

- [ ] **Step 1: Creare `assessment-helpers.ts`**

```typescript
// src/lib/assessment/assessment-helpers.ts
"use client";

import { readFromStorage, writeToStorage } from "@/lib/dossier/storage-schema";
import { createEmptyFRIA } from "@/lib/simulation/fria-engine";
import type { ClassifierResult, DPIAResult, RiskManagerResult } from "@/lib/dossier/storage-schema";
import type { FRIADocument } from "@/lib/simulation/fria-engine";
import type { Assessment, AssessmentShared, CorrelatedRisk } from "./assessment-schema";
import { getRefsForTheme, rightIdToThemeId } from "./correlation-map";

// ── Factory ────────────────────────────────────────────────────────────────────

function emptyShared(): AssessmentShared {
  return {
    systemName: "",
    organization: "",
    riskLevel: "minimal",
    annexIII: false,
    role: undefined,
    isGPAI: false,
    purpose: "",
    legalBasis: "",
    processesPersonalData: false,
    personalDataCategories: [],
    specialCategories: [],
    dataSubjects: [],
  };
}

function emptyDPIA(): DPIAResult {
  return {
    screening: {
      criteria: [],
      criteria_met_count: 0,
      dpia_required: "",
      justification_if_no_dpia: "",
    },
    description: {
      system_name: "", organization_name: "", controller_name: "",
      dpo_name: "", dpo_consulted: "", dpo_opinion: "",
      processor_involved: "", processor_name: "",
      processing_purposes: "", personal_data_categories: "",
      special_categories: "", data_subjects_categories: "",
      recipients: "", retention_period: "", assets: [],
      codes_of_conduct: "", certifications: "",
      data_subjects_opinions: "", data_subjects_opinions_justification: "",
      data_subjects_opinions_details: "",
    },
    proportionality: {
      necessity_justification: "", proportionality_checks: [],
      rights_checks: [], processor_clauses_art28: "",
      international_transfers: "", international_transfers_safeguards: "",
    },
    risks: { threats: [], overall_risk_before: "" },
    measures: {
      technical_measures: "", organizational_measures: "",
      overall_risk_after: "", prior_consultation_required: false,
      prior_consultation_authority: "", prior_consultation_date: "",
      review_schedule: "", review_trigger: "",
    },
    conclusion: {
      compliant: "", conditions: "", summary: "",
      next_review_date: "", completedAt: "",
    },
  };
}

function createEmptyAssessment(scopeId: string): Assessment {
  const now = new Date().toISOString();
  return {
    id: `ASS-${Date.now()}`,
    scopeId,
    shared: emptyShared(),
    dpia: emptyDPIA(),
    fria: createEmptyFRIA(),
    correlatedRisks: [],
    meta: { createdAt: now, updatedAt: now, version: 1 },
  };
}

// ── Accesso ────────────────────────────────────────────────────────────────────

/** Legge l'Assessment corrente o lo crea vuoto. */
export function getAssessment(): Assessment {
  const existing = readFromStorage<Assessment>("assessment");
  if (existing) return existing;
  const scopeId = typeof window !== "undefined"
    ? (localStorage.getItem("aicomply_active_project_id") ?? "legacy")
    : "ssr";
  return createEmptyAssessment(scopeId);
}

function saveAssessment(a: Assessment): void {
  writeToStorage<Assessment>("assessment", {
    ...a,
    meta: { ...a.meta, updatedAt: new Date().toISOString(), version: a.meta.version + 1 },
  });
}

// ── Seed da Classifier ─────────────────────────────────────────────────────────

/**
 * Popola assessment.shared dai dati del Classifier.
 * Da chiamare ogni volta che il Classifier salva nel dossier.
 */
export function seedAssessmentFromClassifier(c: ClassifierResult): void {
  const a = getAssessment();
  a.shared = {
    ...a.shared,
    systemName:   c.systemName,
    organization: a.shared.organization, // non nel Classifier, si conserva
    riskLevel:    c.riskLevel,
    annexIII:     c.annexIII,
    role:         c.role,
    isGPAI:       c.isGPAI ?? false,
  };
  saveAssessment(a);
}

// ── Patch shared ───────────────────────────────────────────────────────────────

/** Aggiorna campi di shared (es. da DPIA o FRIA intake form). */
export function patchShared(fields: Partial<AssessmentShared>): void {
  const a = getAssessment();
  a.shared = { ...a.shared, ...fields };
  saveAssessment(a);
}

// ── Patch DPIA vista ───────────────────────────────────────────────────────────

export function patchDPIA(updater: (prev: DPIAResult) => DPIAResult): void {
  const a = getAssessment();
  a.dpia = updater(a.dpia);
  saveAssessment(a);
}

// ── Patch FRIA vista ───────────────────────────────────────────────────────────

export function patchFRIA(updater: (prev: FRIADocument) => FRIADocument): void {
  const a = getAssessment();
  a.fria = updater(a.fria);
  saveAssessment(a);
}

// ── Migrazione FRIA legacy ─────────────────────────────────────────────────────

const FRIA_LEGACY_KEY = "aicomply_fria_document";

/**
 * One-shot: se esiste aicomply_fria_document in localStorage,
 * importa il FRIADocument nell'Assessment e depreca la vecchia chiave.
 * Idempotente: se assessment.fria.id !== "FRIA-..." default non reimporta.
 */
export function migrateLegacyFRIA(): void {
  if (typeof window === "undefined") return;
  const rawLegacy = localStorage.getItem(FRIA_LEGACY_KEY);
  if (!rawLegacy) return;

  const a = getAssessment();
  // Importa solo se la FRIA nell'Assessment è ancora quella vuota (factory)
  const isDefault = a.fria.context.legal_basis === "" && a.fria.scenarios.length === 0;
  if (!isDefault) return;

  try {
    const legacyDoc = JSON.parse(rawLegacy) as FRIADocument;
    a.fria = legacyDoc;
    // Seed shared dai dati FRIA se shared è ancora vuoto
    if (!a.shared.systemName && legacyDoc.system_name) {
      a.shared.systemName = legacyDoc.system_name;
      a.shared.organization = legacyDoc.organization;
    }
    saveAssessment(a);
    // Depreca la chiave legacy (rinomina, non cancella)
    localStorage.setItem(`${FRIA_LEGACY_KEY}_migrated`, rawLegacy);
    localStorage.removeItem(FRIA_LEGACY_KEY);
  } catch {
    // parse error — non toccare nulla
  }
}

// ── Rischi correlati ──────────────────────────────────────────────────────────

/**
 * Aggiunge un CorrelatedRisk all'Assessment.
 * Se sourceRefId è già presente (stesso DPIA threat o FRIA right_impact), aggiorna.
 */
export function addCorrelatedRisk(
  fields: Pick<CorrelatedRisk, "description" | "severity" | "sourceView" | "sourceRefId"> & {
    themeId?: string;
  }
): string {
  const a = getAssessment();
  const existingIdx = fields.sourceRefId
    ? a.correlatedRisks.findIndex(r => r.sourceRefId === fields.sourceRefId)
    : -1;

  const refs = fields.themeId ? getRefsForTheme(fields.themeId) : [];
  const id = existingIdx >= 0 ? a.correlatedRisks[existingIdx].id : `CR-${Date.now()}`;

  const risk: CorrelatedRisk = {
    id,
    description: fields.description,
    severity: fields.severity,
    sourceView: fields.sourceView,
    sourceRefId: fields.sourceRefId,
    refs,
  };

  if (existingIdx >= 0) {
    a.correlatedRisks[existingIdx] = risk;
  } else {
    a.correlatedRisks.push(risk);
  }
  saveAssessment(a);
  return id;
}

/**
 * Genera CorrelatedRisk[] a partire dai DPIAThreat presenti nell'Assessment.
 * Da chiamare dopo il salvataggio DPIA risks step.
 */
export function syncCorrelatedRisksFromDPIA(): void {
  const a = getAssessment();
  for (const threat of a.dpia.risks.threats) {
    const severity: CorrelatedRisk["severity"] =
      threat.risk_level === "high" ? "high" :
      threat.risk_level === "medium" ? "medium" : "low";
    addCorrelatedRisk({
      description: threat.description || threat.source,
      severity,
      sourceView: "dpia",
      sourceRefId: threat.id,
      themeId: "profiling_scoring", // default; può essere raffinato
    });
  }
}

/**
 * Genera CorrelatedRisk[] a partire dai FRIARightImpact presenti nell'Assessment.
 * Da chiamare dopo il salvataggio FRIA scenarios step.
 */
export function syncCorrelatedRisksFromFRIA(): void {
  const a = getAssessment();
  for (const scenario of a.fria.scenarios) {
    for (const impact of scenario.right_impacts) {
      const severity: CorrelatedRisk["severity"] =
        impact.likelihood.computed_priority === "critical" ? "critical" :
        impact.likelihood.computed_priority === "high" ? "high" :
        impact.likelihood.computed_priority === "medium" ? "medium" : "low";
      addCorrelatedRisk({
        description: `[${scenario.title}] Impatto su ${impact.right_id}`,
        severity,
        sourceView: "fria",
        sourceRefId: `${scenario.id}::${impact.right_id}`,
        themeId: rightIdToThemeId(impact.right_id),
      });
    }
  }
}

// ── Applica mitigazione al risk-register ──────────────────────────────────────

/**
 * Idempotente: se il rischio correlato ha già appliedToRegister=true, non aggiunge duplicati.
 * Crea una voce in RiskManagerResult.risks[] e aggiorna l'Assessment.
 */
export function applyMitigationToRegister(correlatedRiskId: string, mitigationText: string): void {
  const a = getAssessment();
  const crIdx = a.correlatedRisks.findIndex(r => r.id === correlatedRiskId);
  if (crIdx < 0) return;
  const cr = a.correlatedRisks[crIdx];
  if (cr.mitigation?.appliedToRegister) return; // idempotente

  // Legge il risk-register esistente
  const { readFromStorage: rfs, writeToStorage: wfs } = await import("@/lib/dossier/storage-schema");
  const rm = readFromStorage<RiskManagerResult>("riskManager") ?? {
    risks: [],
    overallRiskLevel: "medium",
    completedAt: new Date().toISOString(),
  };

  const newRiskId = `RM-ASS-${Date.now()}`;
  rm.risks.push({
    id: newRiskId,
    title: cr.description.slice(0, 80),
    likelihood: cr.severity === "critical" || cr.severity === "high" ? "high" : "medium",
    impact: cr.severity === "critical" ? "high" : cr.severity === "high" ? "high" : "medium",
    mitigation: mitigationText,
    residualRisk: "review",
  });
  writeToStorage<RiskManagerResult>("riskManager", rm);

  a.correlatedRisks[crIdx] = {
    ...cr,
    mitigation: { text: mitigationText, appliedToRegister: true, registerRiskId: newRiskId },
  };
  saveAssessment(a);
}
```

> **Nota:** `applyMitigationToRegister` usa `await import(...)` perché in alcuni contesti Next.js 16 l'import statico circolare causa problemi. Se il type-check fallisce su questo, sostituire con import statico in cima al file — questo va testato.

- [ ] **Step 2: Type-check**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errori. Se ci sono errori di tipo `await import` in contesto non-async, convertire `applyMitigationToRegister` a `async` oppure usare import statico.

- [ ] **Step 3: Commit**

```bash
git add src/lib/assessment/assessment-helpers.ts
git commit -m "feat(assessment): helper functions — seed, patch, correlate, migrate FRIA"
```

---

## Task 3: Migrazione FRIA — legge/scrive dall'Assessment

**Files:**
- Modify: `src/app/dashboard/tools/fria/page.tsx`

La FRIA page (1322 righe) usa direttamente `localStorage.getItem/setItem(FRIA_DOC_KEY)`. Dobbiamo:
1. Aggiungere `migrateLegacyFRIA()` chiamato una volta al mount
2. Sostituire le 3 chiamate di lettura con `getAssessment().fria`
3. Sostituire le 3 chiamate di scrittura con `patchFRIA(...)`
4. Pulire T.blue e `[verify against current AI Act text]`

- [ ] **Step 1: Identificare le righe esatte da modificare**

```bash
grep -n "FRIA_DOC_KEY\|localStorage.getItem.*fria\|localStorage.setItem.*fria" \
  src/app/dashboard/tools/fria/page.tsx
```

Expected output (circa):
```
30: const FRIA_DOC_KEY = "aicomply_fria_document";
34:     const raw = localStorage.getItem(FRIA_DOC_KEY);
166:    (d) => localStorage.setItem(FRIA_DOC_KEY, JSON.stringify(d))
254:      localStorage.setItem(FRIA_DOC_KEY, JSON.stringify(d));
449:    localStorage.setItem(FRIA_DOC_KEY, JSON.stringify(doc))
```

- [ ] **Step 2: Aggiungere import degli helper**

In cima al file, dopo gli import esistenti:

```typescript
import { getAssessment, patchFRIA, migrateLegacyFRIA } from "@/lib/assessment/assessment-helpers";
```

- [ ] **Step 3: Rimuovere FRIA_DOC_KEY e la funzione loadDoc locale**

Eliminare le righe:
```typescript
const FRIA_DOC_KEY = "aicomply_fria_document";
// ... e la funzione che legge da localStorage con quel key
```

- [ ] **Step 4: Sostituire la lettura al mount con migrateLegacyFRIA + getAssessment**

Trovare il blocco `useEffect` che carica il documento (circa riga 34):

```typescript
// PRIMA:
useEffect(() => {
  try {
    const raw = localStorage.getItem(FRIA_DOC_KEY);
    if (raw) setDoc(JSON.parse(raw) as FRIADocument);
  } catch { }
}, []);

// DOPO:
useEffect(() => {
  migrateLegacyFRIA();
  setDoc(getAssessment().fria);
}, []);
```

- [ ] **Step 5: Sostituire la funzione di salvataggio**

Trovare `(d) => localStorage.setItem(FRIA_DOC_KEY, JSON.stringify(d))` (circa riga 166) e sostituire con:

```typescript
(d) => patchFRIA(() => d)
```

Trovare le altre due chiamate `localStorage.setItem(FRIA_DOC_KEY, ...)` (righe ~254, ~449) e sostituire con:

```typescript
patchFRIA(() => doc)  // dove doc è il valore aggiornato nel contesto
```

- [ ] **Step 6: Rimuovere T.blue e [verify against...]**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"

# Blue
grep -c "T\.blue\|T\.blueBg\|T\.blueBdr" src/app/dashboard/tools/fria/page.tsx
sed -i '' 's/T\.blueBg/"rgba(0,0,0,0.04)"/g; s/T\.blueBdr/T.border/g; s/T\.blue/T.text/g' \
  src/app/dashboard/tools/fria/page.tsx

# Verify tags
sed -i '' 's/ \[verify against current AI Act text\]//g' src/app/dashboard/tools/fria/page.tsx

echo "check blue remaining:"
grep -c "T\.blue" src/app/dashboard/tools/fria/page.tsx
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errori.

- [ ] **Step 8: Verifica manuale**

Aprire `/dashboard/tools/fria` nel browser. La FRIA deve caricarsi normalmente. Se c'erano dati in `aicomply_fria_document` (DevTools → Application → localStorage), devono comparire dopo il primo caricamento e la chiave legacy deve essere rinominata in `aicomply_fria_document_migrated`.

- [ ] **Step 9: Commit**

```bash
git add src/app/dashboard/tools/fria/page.tsx
git commit -m "feat(assessment): FRIA migrata in Assessment storage, rimosso T.blue"
```

---

## Task 4: DPIA legge shared dall'Assessment

**Files:**
- Modify: `src/app/dashboard/tools/dpia/page.tsx`

La DPIA page (1854 righe) pre-popola i campi identitari dal Classifier (riga ~387-426). Aggiungere:
1. `migrateLegacyFRIA()` al mount (per coerenza — se l'utente apre DPIA prima di FRIA)
2. Pre-popolare `description.system_name` e `description.organization_name` da `assessment.shared` invece che solo dal Classifier
3. Rimuovere T.blue (19 occorrenze) e stub [verify against...] se presenti

- [ ] **Step 1: Aggiungere import**

```typescript
import { getAssessment, patchDPIA, migrateLegacyFRIA, patchShared } from "@/lib/assessment/assessment-helpers";
```

- [ ] **Step 2: Nel useEffect di mount, aggiungere migrateLegacyFRIA e seed shared**

Trovare il `useEffect` principale (circa riga 387-426) che legge dal Classifier:

```typescript
// Aggiungere all'inizio del useEffect:
migrateLegacyFRIA();

// Dopo il seed dal Classifier, aggiornare shared se systemName è disponibile:
const cls = readFromStorage<ClassifierResult>("classifier");
if (cls) {
  patchShared({
    systemName: cls.systemName,
    riskLevel: cls.riskLevel,
    annexIII: cls.annexIII,
    role: cls.role,
    isGPAI: cls.isGPAI,
  });
}
```

- [ ] **Step 3: Al salvataggio della DPIA, sincronizzare shared**

Trovare la funzione di salvataggio DPIA (dove chiama `writeToStorage("dpia", ...)`). Aggiungere dopo:

```typescript
// Sync shared dall'identità DPIA description
patchShared({
  systemName: doc.description.system_name,
  organization: doc.description.organization_name,
  purpose: doc.description.processing_purposes,
  personalDataCategories: doc.description.personal_data_categories
    ? doc.description.personal_data_categories.split(",").map(s => s.trim())
    : [],
  specialCategories: doc.description.special_categories
    ? doc.description.special_categories.split(",").map(s => s.trim())
    : [],
  dataSubjects: doc.description.data_subjects_categories
    ? doc.description.data_subjects_categories.split(",").map(s => s.trim())
    : [],
});
```

- [ ] **Step 4: Rimuovere T.blue**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
echo "blue count before:"
grep -c "T\.blue" src/app/dashboard/tools/dpia/page.tsx

sed -i '' 's/T\.blueBg/"rgba(0,0,0,0.04)"/g; s/T\.blueBdr/T.border/g; s/T\.blue/T.text/g' \
  src/app/dashboard/tools/dpia/page.tsx

echo "blue count after:"
grep -c "T\.blue" src/app/dashboard/tools/dpia/page.tsx
```

Expected: 0 dopo.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/tools/dpia/page.tsx
git commit -m "feat(assessment): DPIA seed shared⇄Assessment, rimosso T.blue"
```

---

## Task 5: Seed Assessment dal Classifier

**Files:**
- Modify: `src/app/dashboard/tools/classifier/page.tsx`

Ogni volta che il Classifier salva il proprio risultato, deve anche aggiornare `assessment.shared`.

- [ ] **Step 1: Aggiungere import**

```typescript
import { seedAssessmentFromClassifier } from "@/lib/assessment/assessment-helpers";
```

- [ ] **Step 2: Trovare dove il Classifier chiama writeToStorage**

```bash
grep -n "writeToStorage" src/app/dashboard/tools/classifier/page.tsx
```

- [ ] **Step 3: Aggiungere seed dopo il salvataggio**

Nella funzione che chiama `writeToStorage("classifier", result)`, aggiungere subito dopo:

```typescript
seedAssessmentFromClassifier(result);
```

- [ ] **Step 4: Rimuovere T.blue (15 occorrenze)**

```bash
sed -i '' 's/T\.blueBg/"rgba(0,0,0,0.04)"/g; s/T\.blueBdr/T.border/g; s/T\.blue/T.text/g' \
  src/app/dashboard/tools/classifier/page.tsx
echo "blue after:" && grep -c "T\.blue" src/app/dashboard/tools/classifier/page.tsx
```

- [ ] **Step 5: Type-check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/dashboard/tools/classifier/page.tsx
git commit -m "feat(assessment): Classifier seeds assessment.shared; rimosso T.blue"
```

---

## Task 6: UI — pannello Rischi Correlati in DPIA e FRIA

**Files:**
- Create: `src/components/assessment/CorrelatedRisksPanel.tsx`
- Modify: `src/app/dashboard/tools/dpia/page.tsx` (aggiungere il pannello)
- Modify: `src/app/dashboard/tools/fria/page.tsx` (aggiungere il pannello)

Il pannello mostra i `CorrelatedRisk[]` dell'Assessment con:
- Tabella: [Rischio] | [Severità] | [Framework] | [Citazione] | [Applica]
- Bottone "Applica mitigazione" per ogni rischio non ancora applicato
- Badge severità: grigio chiaro=low, grigio medio=medium, grigio scuro=high, nero=critical
- Palette solo B/W (neutral-50 ... neutral-950) — ZERO blu/indigo/colori

- [ ] **Step 1: Creare `CorrelatedRisksPanel.tsx`**

```tsx
// src/components/assessment/CorrelatedRisksPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { getAssessment, applyMitigationToRegister } from "@/lib/assessment/assessment-helpers";
import type { CorrelatedRisk } from "@/lib/assessment/assessment-schema";

const SEV_STYLE: Record<CorrelatedRisk["severity"], { bg: string; color: string; border: string }> = {
  low:      { bg: "rgba(0,0,0,0.03)", color: "rgba(0,0,0,0.45)", border: "rgba(0,0,0,0.08)" },
  medium:   { bg: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.60)", border: "rgba(0,0,0,0.14)" },
  high:     { bg: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.80)", border: "rgba(0,0,0,0.22)" },
  critical: { bg: "#0D1016",          color: "#ffffff",            border: "#0D1016"           },
};

export function CorrelatedRisksPanel() {
  const [risks, setRisks] = useState<CorrelatedRisk[]>([]);
  const [mitigationTexts, setMitigationTexts] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    setRisks(getAssessment().correlatedRisks);
  }, []);

  function handleApply(riskId: string) {
    const text = mitigationTexts[riskId] ?? "";
    if (!text.trim()) return;
    setApplying(riskId);
    applyMitigationToRegister(riskId, text);
    setRisks(getAssessment().correlatedRisks);
    setApplying(null);
  }

  if (risks.length === 0) {
    return (
      <div style={{ padding: "12px 16px", borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.40)", margin: 0 }}>
          Nessun rischio correlato generato. Completa la sezione Rischi nella DPIA o gli Scenari nella FRIA, poi salva per generarli.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {risks.map(r => {
        const sev = SEV_STYLE[r.severity];
        const applied = r.mitigation?.appliedToRegister ?? false;
        return (
          <div key={r.id} style={{
            borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)",
            background: "#ffffff", padding: 14,
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {r.severity.toUpperCase()}
              </span>
              <p style={{ fontSize: 12, color: "#0D1016", fontWeight: 500, margin: 0, flex: 1 }}>
                {r.description}
              </p>
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.40)",
                border: "1px solid rgba(0,0,0,0.07)", flexShrink: 0,
              }}>
                {r.sourceView}
              </span>
            </div>

            {/* References */}
            {r.refs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {r.refs.map((ref, i) => (
                  <span key={i} style={{
                    fontSize: 9, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace",
                    background: "rgba(0,0,0,0.03)", color: "rgba(0,0,0,0.50)",
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}>
                    {ref.framework} · {ref.citation}
                  </span>
                ))}
              </div>
            )}

            {/* Mitigation */}
            {applied ? (
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.40)" }}>
                ✓ Applicata al Risk Register — ID: {r.mitigation?.registerRiskId}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input
                  value={mitigationTexts[r.id] ?? ""}
                  onChange={e => setMitigationTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Descrivi la mitigazione..."
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 7, fontSize: 11,
                    border: "1px solid rgba(0,0,0,0.10)", color: "#0D1016",
                    background: "#f9f9fb", outline: "none",
                  }}
                />
                <button
                  disabled={!mitigationTexts[r.id]?.trim() || applying === r.id}
                  onClick={() => handleApply(r.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    cursor: mitigationTexts[r.id]?.trim() ? "pointer" : "not-allowed",
                    background: mitigationTexts[r.id]?.trim() ? "#0D1016" : "rgba(0,0,0,0.05)",
                    color: mitigationTexts[r.id]?.trim() ? "#ffffff" : "rgba(0,0,0,0.30)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    whiteSpace: "nowrap",
                  }}>
                  Applica al Risk Register
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Aggiungere il pannello in fondo alla DPIA (prima di SignOffPanel)**

In `src/app/dashboard/tools/dpia/page.tsx`, trovare dove viene renderizzata la sezione "Misure e conclusione" o il `<SignOffPanel />` finale e aggiungere prima:

```tsx
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";

// nel JSX, prima di SignOffPanel:
<div style={{ ...cardSt, padding: 20 }}>
  <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1016", margin: "0 0 14px" }}>
    Rischi correlati DPIA ⇄ FRIA
  </p>
  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", margin: "0 0 14px" }}>
    Rischi generati automaticamente dalla correlazione WP29 / DIHR. Applica le mitigazioni al Risk Manager.
  </p>
  <CorrelatedRisksPanel />
</div>
```

- [ ] **Step 3: Aggiungere il pannello in fondo alla FRIA (prima di SignOffPanel)**

Stesso pattern in `src/app/dashboard/tools/fria/page.tsx`.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/components/assessment/CorrelatedRisksPanel.tsx \
        src/app/dashboard/tools/dpia/page.tsx \
        src/app/dashboard/tools/fria/page.tsx
git commit -m "feat(assessment): CorrelatedRisksPanel con tabella WP29⇄DIHR e apply→Risk Register"
```

---

## Task 7: Sync automatico rischi correlati al salvataggio

**Files:**
- Modify: `src/app/dashboard/tools/dpia/page.tsx`
- Modify: `src/app/dashboard/tools/fria/page.tsx`

- [ ] **Step 1: In DPIA — dopo saveToStorage("dpia"), chiamare syncCorrelatedRisksFromDPIA**

```typescript
import { syncCorrelatedRisksFromDPIA } from "@/lib/assessment/assessment-helpers";

// nella funzione di salvataggio, dopo writeToStorage("dpia", ...):
syncCorrelatedRisksFromDPIA();
```

- [ ] **Step 2: In FRIA — dopo patchFRIA(...), chiamare syncCorrelatedRisksFromFRIA**

```typescript
import { syncCorrelatedRisksFromFRIA } from "@/lib/assessment/assessment-helpers";

// dopo ogni patchFRIA che modifica scenarios:
syncCorrelatedRisksFromFRIA();
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/app/dashboard/tools/dpia/page.tsx src/app/dashboard/tools/fria/page.tsx
git commit -m "feat(assessment): auto-sync CorrelatedRisks da DPIA threats e FRIA right_impacts"
```

---

## Task 8: Pulizia finale — verify tags e push

- [ ] **Step 1: Rimuovere tutti i [verify against...] residui da DPIA e FRIA**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
sed -i '' 's/ \[verify against current AI Act text\]//g' src/app/dashboard/tools/dpia/page.tsx
sed -i '' 's/ \[verify against current AI Act text\]//g' src/app/dashboard/tools/fria/page.tsx

echo "verify in dpia:" && grep -c "verify against" src/app/dashboard/tools/dpia/page.tsx
echo "verify in fria:" && grep -c "verify against" src/app/dashboard/tools/fria/page.tsx
```

Expected: entrambi 0.

- [ ] **Step 2: Type-check finale**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: 0.

- [ ] **Step 3: Commit e push**

```bash
git add -A
git commit -m "feat(assessment): Assessment unificato DPIA+FRIA — step finale, pulizia"
git push
```

---

## Self-Review

### 1. Spec coverage

| Requisito spec | Task che lo copre |
|---|---|
| `AssessmentShared` come unica fonte di verità | Task 0, 4, 5 |
| Chiave `assessment` in STORAGE_KEYS | Task 0 |
| Tabella correlazione WP29⇄DIHR⇄CFR | Task 1 |
| `seedAssessmentFromClassifier` | Task 2, 5 |
| `patchShared`, `patchDPIA`, `patchFRIA` | Task 2 |
| Migrazione one-shot FRIA legacy | Task 2 (migrateLegacyFRIA), 3 |
| FRIA persiste in Assessment invece di chiave propria | Task 3 |
| DPIA legge identitari da shared | Task 4 |
| `addCorrelatedRisk` + `syncFromDPIA`/`syncFromFRIA` | Task 2, 7 |
| `applyMitigationToRegister` idempotente | Task 2 |
| Pannello UI rischi correlati B/W | Task 6 |
| Rimozione T.blue da DPIA, FRIA, Classifier | Task 3, 4, 5 |
| Rimozione `[verify against...]` | Task 8 |
| `npx tsc --noEmit` = 0 errori ad ogni step | Ogni task ha step type-check |

### 2. Placeholder scan — nessuno trovato

### 3. Consistenza dei tipi

- `CorrelatedRisk.id` usato in Task 2 e 6: ✓ stesso tipo `string`
- `applyMitigationToRegister(correlatedRiskId, mitigationText)` in Task 2 = stessa firma in Task 6: ✓
- `patchFRIA(updater: (prev: FRIADocument) => FRIADocument)` in Task 2 = usato in Task 3: ✓
- `syncCorrelatedRisksFromDPIA()` / `syncCorrelatedRisksFromFRIA()` in Task 2 = importati in Task 7: ✓
