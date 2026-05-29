# Fix Estetica + Norma + Sinergia (tutti i tool) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 19-part fix across all dashboard tools: critical storage key fix for classifier, art50 dossier integration, norma fixes for Transparency and Risk Manager, aesthetic uniformity across wizard pages, and localStorage synergy (pre-population) across 8 tools.

**Architecture:** All changes are confined to `src/app/dashboard/tools/*/page.tsx`, `src/lib/dossier/storage-schema.ts`, and `src/lib/dossier/dossier-engine.ts`. No new files needed. No API changes. `"use client"` throughout.

**Tech Stack:** Next.js 16, React 18, TypeScript, localStorage, lucide-react

---

## Task 1: Critical schema foundation (Parts 1 + 2B + 2C)

**Files:**
- Modify: `src/app/dashboard/tools/classifier/page.tsx`
- Modify: `src/lib/dossier/storage-schema.ts`
- Modify: `src/lib/dossier/dossier-engine.ts`

**Purpose:** Fix the critical storage key mismatch (classifier writes to `"classifier_result"` but dossier engine reads from `"aicomply_classifier_result"`). Also add `art50` to the schema so later tasks can use it.

### Part 1 — Classifier: write to dossier storage key

The `saveResult` function is at line ~43–57 in classifier/page.tsx. It writes to `localStorage.setItem("classifier_result", ...)`. After this line, add a `writeToStorage("classifier", ...)` call.

The `classifyRisk` return (`res`) has:
- `res.riskLevel`: `"Unacceptable" | "High" | "Limited" | "Minimal"` (capitalized)
- `res.annexCategory`: string | null
- `res.isExemptedArt6_3`: boolean

`ClassifierResult` in storage-schema.ts expects `riskLevel` lowercased: `"unacceptable" | "high" | "limited" | "minimal"`.

Add to imports at top of classifier/page.tsx:
```typescript
import { writeToStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult } from "@/lib/dossier/storage-schema";
```

Inside `saveResult(systemName, r, passportId, dossierId)`, immediately after `localStorage.setItem(STORAGE_KEY, JSON.stringify(record));` add:
```typescript
writeToStorage<ClassifierResult>("classifier", {
  systemName: systemName,
  systemDescription: "",
  riskLevel: (r.riskLevel?.toLowerCase() ?? "minimal") as ClassifierResult["riskLevel"],
  annexIII: !!(r.annexCategory),
  applicableArticles: [
    ...(r.annexCategory ? ["Annex III"] : []),
    ...(r.isExemptedArt6_3 ? ["Art. 6(3)"] : []),
  ],
  completedAt: new Date().toISOString(),
});
```

### Part 2B — storage-schema.ts: add Art50Result type and key

In `DossierData` interface, add after `providerTransition?`:
```typescript
art50?: { systemsCount: number; completedAt: string };
```

In `STORAGE_KEYS` object, add:
```typescript
art50: "aicomply_art50_result",
```

### Part 2C — dossier-engine.ts: add Art50 section

In `getDossierSections()`, at the end of the array (before the closing `]`), add:
```typescript
{
  id: "art50",
  article: "Art. 50",
  title: "Trasparenza Sistemi Limited/Minimal (Art. 50)",
  href: "/dashboard/tools/art50-kit",
  status: data.art50 ? "complete" : "missing",
  completedAt: data.art50?.completedAt,
},
```

Also in `aggregateDossier()`, add:
```typescript
art50: readFromStorage<{ systemsCount: number; completedAt: string }>("art50") ?? undefined,
```

- [ ] Add `writeToStorage`/`ClassifierResult` imports to classifier/page.tsx
- [ ] Add writeToStorage call inside saveResult() after localStorage.setItem
- [ ] Add `art50?` to DossierData in storage-schema.ts
- [ ] Add `art50: "aicomply_art50_result"` to STORAGE_KEYS
- [ ] Add art50 section to getDossierSections() in dossier-engine.ts
- [ ] Add art50 read to aggregateDossier() in dossier-engine.ts
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat: classifier dossier storage fix + art50 schema`

---

## Task 2: Art50-kit dossier write (Part 2A)

**Files:**
- Modify: `src/app/dashboard/tools/art50-kit/page.tsx`

**Purpose:** When Art50 systems are saved, also write to the dossier storage so the dossier can track completion.

Add import at top:
```typescript
import { writeToStorage } from "@/lib/dossier/storage-schema";
```

Find `saveSystems` function (~line 41):
```typescript
function saveSystems(systems: Art50System[]): void {
  localStorage.setItem("art50_systems", JSON.stringify(systems));
}
```

Add after the localStorage call:
```typescript
  writeToStorage("art50", {
    systemsCount: systems.length,
    completedAt: new Date().toISOString(),
  });
```

- [ ] Add writeToStorage import
- [ ] Add writeToStorage call in saveSystems()
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(art50-kit): write to dossier storage on save`

---

## Task 3: Transparency norma fix (Part 3)

**Files:**
- Modify: `src/app/dashboard/tools/transparency/page.tsx`

**Purpose:** Fix the title to reflect Art. 13 / Art. 50 scope, add Art. 13(3) fields for high-risk systems, and pre-populate from classifier/oversight/resilience.

The file already imports `readFromStorage` and `writeToStorage` from `@/lib/dossier/storage-schema`.

### 3A — Title fix
Find the string `"Art. 13 — Trasparenza"` or similar in the file. If it says just Art. 13, change to `"Art. 13 / Art. 50 — Trasparenza"`.

### 3B — Art. 13(3) fields for high-risk

Add a constant near the top (after imports):
```typescript
const ART13_FIELDS = [
  { id: "provider_identity",      label: "Identità e contatto del provider (Art. 13(3)(a))",           placeholder: "Ragione sociale, indirizzo, email/telefono contatto" },
  { id: "performance_specs",      label: "Caratteristiche, capacità e limitazioni di performance (Art. 13(3)(b))", placeholder: "Accuracy target, casi d'uso supportati, limitazioni note" },
  { id: "training_data_specs",    label: "Specifiche relative ai dati di addestramento (Art. 13(3)(c))", placeholder: "Tipologie dataset, periodo raccolta, filtri applicati" },
  { id: "accuracy_metrics",       label: "Livello di accuracy e metriche di robustezza (Art. 13(3)(d))", placeholder: "Accuracy su test set, F1-score, soglie accettabili" },
  { id: "human_oversight_required", label: "Sorveglianza umana richiesta (Art. 13(3)(e))",             placeholder: "Ruoli coinvolti, procedura di override, frequenza supervisione" },
  { id: "lifecycle_updates",      label: "Vita utile attesa e aggiornamenti (Art. 13(3)(f))",          placeholder: "Data ultimo aggiornamento, ciclo previsto, procedura notifica modifiche" },
] as const;
```

Add state variables:
```typescript
const [classifierData, setClassifierData] = useState<{ riskLevel?: string; systemName?: string } | null>(null);
const [art13Fields, setArt13Fields] = useState<Record<string, string>>({});
```

### 3C — Synergy: pre-population useEffect

Add a useEffect at the top of the component:
```typescript
import type { ClassifierResult, OversightResult, ResilienceResult } from "@/lib/dossier/storage-schema";

useEffect(() => {
  const cls = readFromStorage<ClassifierResult>("classifier");
  const ovs = readFromStorage<OversightResult>("oversight");
  const res = readFromStorage<ResilienceResult>("resilience");
  setClassifierData(cls);
  if (cls?.systemName) {
    // pre-populate system name if component has that field
  }
  const pre: Record<string, string> = {};
  if (ovs?.responsiblePersons?.length) {
    pre.human_oversight_required = ovs.responsiblePersons.join(", ");
  }
  if (res?.accuracyMetric) {
    pre.accuracy_metrics = `${res.accuracyMetric}%`;
  }
  setArt13Fields(pre);
}, []);
```

### 3D — Render Art. 13(3) section

In the JSX, after the main transparency form sections, add a conditional section:
```tsx
{classifierData?.riskLevel === "high" && (
  <div style={{ marginTop: 24 }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(0,0,0,0.4)", marginBottom: 12 }}>
      Informazioni obbligatorie per deployer — Art. 13(3) (sistema HIGH RISK)
    </div>
    {ART13_FIELDS.map((field) => (
      <div key={field.id} style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "#0D1016", display: "block", marginBottom: 4 }}>
          {field.label}
        </label>
        <textarea
          value={art13Fields[field.id] ?? ""}
          onChange={(e) => setArt13Fields(prev => ({ ...prev, [field.id]: e.target.value }))}
          placeholder={field.placeholder}
          rows={2}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.07)", fontSize: 12,
            resize: "vertical", fontFamily: "inherit",
          }}
        />
      </div>
    ))}
  </div>
)}
```

- [ ] Add ART13_FIELDS constant
- [ ] Add classifierData and art13Fields state
- [ ] Add useEffect for pre-population
- [ ] Add Art. 13(3) section render (conditional on high risk)
- [ ] Fix title from Art. 13 only to Art. 13 / Art. 50
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(transparency): Art.13/50 title + Art.13(3) fields + synergy pre-fill`

---

## Task 4: Risk Manager review cycle (Part 4)

**Files:**
- Modify: `src/app/dashboard/tools/risk-manager/page.tsx`
- Modify: `src/lib/dossier/storage-schema.ts`

**Purpose:** Add `nextReviewDate` and `reviewCycle` to RiskManagerResult and the risk manager UI.

### 4A — storage-schema.ts update

In `RiskManagerResult`, add two fields:
```typescript
nextReviewDate: string;       // ISO date string, e.g. "2026-08-01"
reviewCycle: "monthly" | "quarterly" | "biannual" | "annual";
```

Make them optional to avoid breaking existing saved data:
```typescript
nextReviewDate?: string;
reviewCycle?: "monthly" | "quarterly" | "biannual" | "annual";
```

### 4B — risk-manager/page.tsx: add state + UI

Add two state variables near the existing ones:
```typescript
const [nextReviewDate, setNextReviewDate] = useState<string>("");
const [reviewCycle, setReviewCycle] = useState<"monthly" | "quarterly" | "biannual" | "annual">("annual");
```

Find the phase/output area where the final report is shown (near `finalizeRiskReport` call). After the main result content, add the review date input and cycle selector. Look for the save/finalize button and add this UI before it:

```tsx
{/* Review date and cycle — Art. 9(1)(b) */}
<div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
  <div>
    <label style={{ fontSize: 13, fontWeight: 500, color: T.text, display: "block", marginBottom: 6 }}>
      Data prossima revisione
      <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 400, marginLeft: 8 }}>Art. 9(1)(b)</span>
    </label>
    <input
      type="date"
      value={nextReviewDate}
      onChange={(e) => setNextReviewDate(e.target.value)}
      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}
    />
  </div>
  <div>
    <label style={{ fontSize: 13, fontWeight: 500, color: T.text, display: "block", marginBottom: 6 }}>
      Ciclo di revisione
    </label>
    <select
      value={reviewCycle}
      onChange={(e) => setReviewCycle(e.target.value as typeof reviewCycle)}
      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}
    >
      <option value="monthly">Mensile</option>
      <option value="quarterly">Trimestrale</option>
      <option value="biannual">Semestrale</option>
      <option value="annual">Annuale</option>
    </select>
  </div>
</div>
```

Find where `saveReport(final)` is called after `finalizeRiskReport`. Update to include the new fields:
```typescript
saveReport({ ...final, nextReviewDate, reviewCycle });
```

Also update the plain `saveReport(report)` effect at line ~188 if it writes on systemName change — that one is fine as-is since nextReviewDate/reviewCycle default to "".

- [ ] Add optional `nextReviewDate?` and `reviewCycle?` to RiskManagerResult in storage-schema.ts
- [ ] Add nextReviewDate/reviewCycle state to risk-manager/page.tsx
- [ ] Add review date input + cycle selector UI
- [ ] Include nextReviewDate/reviewCycle in saveReport call after finalize
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(risk-manager): add review date + cycle fields (Art. 9(1)(b))`

---

## Task 5: Aesthetic H1 + primary button pills (Parts 5 + 6)

**Files:**
- Modify: `src/app/dashboard/tools/eudb/page.tsx`
- Modify: `src/app/dashboard/tools/authorized-rep/page.tsx`
- Modify: `src/app/dashboard/tools/provider-transition/page.tsx`
- Modify: `src/app/dashboard/tools/deployer/page.tsx`
- Modify: `src/app/dashboard/tools/gpai/page.tsx`
- Modify: `src/app/dashboard/tools/qms/page.tsx`

### Part 5 — H1 font size/weight unification

In each file, find the main page `<h1>` title:
- `authorized-rep/page.tsx` ~line 538: `<h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Authorized Representative Wizard</h1>`
- `provider-transition/page.tsx` ~line 496: `<h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Provider Transition Alert</h1>`
- `deployer/page.tsx` ~line 482: `<h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>...`
- `gpai/page.tsx` ~line 582: `<h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>GPAI Assessment</h1>`
- `eudb/page.tsx`: find the page h1 (may not be a literal `<h1>`, check for the page-level title element)
- `qms/page.tsx` line 182: `<h1 className="text-2xl font-bold" style={{ color: "#0D1016" }}>QMS Builder</h1>`

Change ALL occurrences of `fontSize: 18, fontWeight: 700` on page-level h1 elements to:
```
fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016"
```

For `qms/page.tsx`, change:
```tsx
<h1 className="text-2xl font-bold" style={{ color: "#0D1016" }}>QMS Builder</h1>
```
to:
```tsx
<h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.8px", color: "#0D1016" }}>QMS Builder</h1>
```

### Part 6 — Primary action buttons: borderRadius → 9999

In each of the 6 files (eudb, authorized-rep, provider-transition, deployer, gpai, qms), find primary action buttons (Avanti, Salva, Genera, Submit, etc.) that have `borderRadius: 8`. Change to `borderRadius: 9999`.

**EXCEPTION**: buttons that are answer options (Sì/No/Non so style, inside question cards) keep their existing `borderRadius: 12`. Only change action buttons (Avanti, Salva, Genera, etc.).

- [ ] Change H1 fontSize/fontWeight in all 5 wizard pages
- [ ] Change QMS h1 to inline style (Part 8 merged here)
- [ ] Change primary action button borderRadius from 8 to 9999 in all 6 files
- [ ] Keep answer option buttons at their existing radius
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `style: uniform H1 + pill action buttons across wizard tools`

---

## Task 6: Amber color token fix (Part 7)

**Files:**
- Modify: `src/app/dashboard/tools/oversight/page.tsx`
- Modify: `src/app/dashboard/tools/fria/page.tsx`
- Modify: `src/app/dashboard/tools/logvault/page.tsx`

### oversight + fria
Find `amber: "#92400e"` in both files. Change to `amber: "#d97706"`.

### logvault
Find `border: "1px solid rgba(234,179,8,0.25)"` and `background: "rgba(234,179,8,0.05)"`. Change to:
- `border: "1px solid rgba(202,138,4,0.25)"`
- `background: "rgba(202,138,4,0.05)"`

- [ ] Fix amber token in oversight/page.tsx
- [ ] Fix amber token in fria/page.tsx
- [ ] Fix rgba amber colors in logvault/page.tsx
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `style: fix amber color tokens to #d97706`

---

## Task 7: Art50-kit design tokens (Part 9)

**Files:**
- Modify: `src/app/dashboard/tools/art50-kit/page.tsx`

Add design token object after the imports:
```typescript
const T = {
  text: "#0D1016",
  muted: "rgba(0,0,0,0.42)",
  faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.07)",
  card: "#ffffff",
  bg: "#f8f9fa",
};
const cardSt: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: 12,
};
```

Replace Tailwind color classes with inline styles (the most visible ones):
- `text-gray-900` → `style={{ color: T.text }}`
- `text-gray-500` or `text-gray-600` → `style={{ color: T.muted }}`
- `border-gray-200` → `style={{ borderColor: T.border }}`
- `bg-white rounded-xl` (card containers) → `style={cardSt}`

Keep `bg-[#0D1016]` primary button color as-is.

- [ ] Add T and cardSt constants
- [ ] Replace most visible Tailwind color classes with inline styles
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `style(art50-kit): add design tokens, replace Tailwind color classes`

---

## Task 8: Synergy — Oversight + Resilience pre-population (Parts 10 + 11)

**Files:**
- Modify: `src/app/dashboard/tools/oversight/page.tsx`
- Modify: `src/app/dashboard/tools/resilience/page.tsx`

### Part 10 — Oversight

Add imports if not already present:
```typescript
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, RiskManagerResult, ResilienceResult } from "@/lib/dossier/storage-schema";
```

Find the component's useEffect section. Add a new useEffect (or extend the existing one) that runs once on mount:
```typescript
useEffect(() => {
  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const riskData = readFromStorage<RiskManagerResult>("riskManager");
  const resilienceData = readFromStorage<ResilienceResult>("resilience");

  // Adapt field names to whatever state setters exist in this component
  // Look for: systemName field, capabilities field, when_not_use field, performance_threshold field
  // Use the actual setter names found in the component
}, []);
```

**Important:** Read the actual state variable names and setter functions in oversight/page.tsx before implementing. Adapt the calls accordingly. If the component uses a config object with an `updateConfig` helper, use that. If it uses individual `setState` calls, use those.

### Part 11 — Resilience

Add useEffect to pre-populate from classifier + risk manager:
```typescript
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, RiskManagerResult } from "@/lib/dossier/storage-schema";

useEffect(() => {
  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const riskData = readFromStorage<RiskManagerResult>("riskManager");

  if (classifierData?.systemName) {
    // Set system name - find the actual setter
  }

  if (riskData?.risks) {
    const hasDataRisk = riskData.risks.some((r) =>
      r.title?.toLowerCase().includes("dato") || r.title?.toLowerCase().includes("data")
    );
    if (hasDataRisk) {
      // Pre-select "data_poisoning" attack vector - find the actual setter
    }
  }
}, []);
```

**Important:** Read the actual state shape of resilience/page.tsx and adapt the setter calls.

- [ ] Read actual state variable names in oversight/page.tsx
- [ ] Add synergy useEffect to oversight/page.tsx
- [ ] Read actual state variable names in resilience/page.tsx
- [ ] Add synergy useEffect to resilience/page.tsx
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(oversight,resilience): pre-populate from classifier/risk-manager storage`

---

## Task 9: Synergy — DPIA + QMS pre-population (Parts 12 + 13)

**Files:**
- Modify: `src/app/dashboard/tools/dpia/page.tsx`
- Modify: `src/app/dashboard/tools/qms/page.tsx`

### Part 12 — DPIA

Read dpia/page.tsx to find:
- State setter for `system_name` in the description section
- State setter for screening criteria (c2, c4, c6)

Add useEffect:
```typescript
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, DataAuditResult } from "@/lib/dossier/storage-schema";

useEffect(() => {
  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const dataAuditData = readFromStorage<DataAuditResult>("dataAudit");

  if (classifierData?.systemName) {
    // setField("system_name", classifierData.systemName) — adapt to actual setter
  }
  if (classifierData?.riskLevel === "high") {
    // activate c6 and c4 screening criteria — adapt to actual setter
  }
  if (dataAuditData?.datasets?.some((d) => d.personalData)) {
    // activate c2 — adapt to actual setter
  }
}, []);
```

### Part 13 — QMS

Read qms/page.tsx to find:
- State setter for systemName
- State setter for sections (risk, data_mgmt)

Add useEffect:
```typescript
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { ClassifierResult, RiskManagerResult, DataAuditResult } from "@/lib/dossier/storage-schema";

useEffect(() => {
  const classifierData = readFromStorage<ClassifierResult>("classifier");
  const riskData = readFromStorage<RiskManagerResult>("riskManager");
  const dataAuditData = readFromStorage<DataAuditResult>("dataAudit");

  if (classifierData?.systemName) {
    // set systemName - adapt to actual setter
  }
  if (riskData) {
    // update risk section text - adapt to actual setter
  }
  if (dataAuditData) {
    // update data_mgmt section text - adapt to actual setter
  }
}, []);
```

- [ ] Read actual state shapes in dpia/page.tsx and qms/page.tsx
- [ ] Add synergy useEffect to dpia/page.tsx
- [ ] Add synergy useEffect to qms/page.tsx
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(dpia,qms): pre-populate from classifier/data-audit/risk-manager storage`

---

## Task 10: Synergy — Provider-Transition + Deployer + EUDB (Parts 14 + 15 + 16)

**Files:**
- Modify: `src/app/dashboard/tools/provider-transition/page.tsx`
- Modify: `src/app/dashboard/tools/deployer/page.tsx`
- Modify: `src/app/dashboard/tools/eudb/page.tsx`

### Part 14 — Provider-Transition

Add useEffect that reads classifier and deployer data. Adapt setters to actual component state.

### Part 15 — Deployer D5 + D9

Find how the deployer component manages obligation statuses. Add useEffect that reads logvault and fria data and updates D5/D9 obligation states.

### Part 16 — EUDB

Find the existing useEffect (~line 399) that reads classifier. Extend it to also read conformity and authorizedRep data. Adapt `patchSystem`/`patchProvider` calls to actual function names.

- [ ] Add synergy useEffect to provider-transition/page.tsx
- [ ] Add synergy useEffect to deployer/page.tsx (D5 from logvault, D9 from fria)
- [ ] Extend existing useEffect in eudb/page.tsx with conformity + authorizedRep reads
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(provider-transition,deployer,eudb): synergy pre-population from storage`

---

## Task 11: Synergy — Docugen reads from DataAudit + RiskManager (Part 17)

**Files:**
- Modify: `src/app/dashboard/tools/docugen/page.tsx`

Read the file to find `AUTO_CONTENT["data-audit"]` and `AUTO_CONTENT["risk-manager"]`. Replace the static content generation logic so that when real data exists in localStorage, it uses that instead.

Add at the top of the component (or near where AUTO_CONTENT is consumed):
```typescript
import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { DataAuditResult, RiskManagerResult } from "@/lib/dossier/storage-schema";

// In the component or a useMemo:
const dataAudit = readFromStorage<DataAuditResult>("dataAudit");
const riskData = readFromStorage<RiskManagerResult>("riskManager");

const autoDataAuditContent = dataAudit
  ? [
      `Dataset analizzati: ${dataAudit.datasets?.map((d) => d.name).join(", ") || "N/D"}`,
      `Qualità complessiva: ${dataAudit.overallQuality || "N/D"}`,
      `Dati personali: ${dataAudit.datasets?.some((d) => d.personalData) ? "Sì — DPIA richiesta" : "No"}`,
    ].join("\n")
  : AUTO_CONTENT["data-audit"];

const autoRiskContent = riskData
  ? [
      `Rischi identificati: ${riskData.risks?.length || 0}`,
      `Livello rischio complessivo: ${riskData.overallRiskLevel || "N/D"}`,
      `Prossima revisione: ${riskData.nextReviewDate || "da pianificare"}`,
    ].join("\n")
  : AUTO_CONTENT["risk-manager"];
```

Then use `autoDataAuditContent` and `autoRiskContent` wherever `AUTO_CONTENT["data-audit"]` and `AUTO_CONTENT["risk-manager"]` were used.

- [ ] Read docugen/page.tsx to find AUTO_CONTENT usage
- [ ] Add real-data reads from storage
- [ ] Replace AUTO_CONTENT["data-audit"] and AUTO_CONTENT["risk-manager"] with dynamic versions
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `feat(docugen): use real DataAudit + RiskManager data from storage`

---

## Task 12: Aesthetic polish — border opacity + shadow (Parts 18 + 19)

**Files:**
- Modify: `src/app/dashboard/tools/data-audit/page.tsx`
- Modify: `src/app/dashboard/tools/l132/page.tsx`
- Modify: `src/app/dashboard/tools/qms/page.tsx`
- Modify: `src/app/dashboard/tools/eudb/page.tsx`
- Modify: `src/app/dashboard/tools/authorized-rep/page.tsx`

### Part 18 — Input border opacity
- `data-audit/page.tsx`: `"1px solid rgba(0,0,0,0.08)"` → `"1px solid rgba(0,0,0,0.07)"`
- `l132/page.tsx`: `"1px solid rgba(0,0,0,0.12)"` → `"1px solid rgba(0,0,0,0.07)"`
- `qms/page.tsx`: `"1px solid rgba(0,0,0,0.09)"` → `"1px solid rgba(0,0,0,0.07)"`

### Part 19 — Heavy shadows
- `eudb/page.tsx`: `"0 4px 16px rgba(0,0,0,0.10)"` or `"0 4px 16px rgba(0,0,0,0.15)"` → `"0 2px 8px rgba(0,0,0,0.08)"`
- `authorized-rep/page.tsx`: same shadow replacement

- [ ] Fix border opacity in data-audit, l132, qms
- [ ] Fix heavy shadows in eudb, authorized-rep
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Commit: `style: normalize border opacity + reduce shadow weight`
