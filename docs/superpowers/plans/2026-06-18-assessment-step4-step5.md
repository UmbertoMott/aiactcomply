# Assessment Step 4–5: Shared Views + Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere `AssessmentSharedHeader` + `AssessmentStepper` a DPIA e FRIA (Step 4) e creare la pagina unificata di export Assessment (Step 5) — zero colori blue, palette B/W.

**Architecture:** Due nuovi componenti shared (`AssessmentSharedHeader`, `AssessmentStepper`) che leggono da `getAssessment()` vengono aggiunti in cima a DPIA e FRIA. Una nuova pagina `/dashboard/tools/assessment-export` legge l'intero `Assessment` e genera un'anteprima audit-ready con export PDF via API esistente.

**Tech Stack:** Next.js 16 App Router, `"use client"`, TypeScript strict, inline React styles, `getAssessment()` / `patchShared()` da `@/lib/assessment/assessment-helpers`, API `/api/compliance/export-pdf` esistente.

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `src/components/assessment/AssessmentSharedHeader.tsx` | **CREATE** | Banner read-only con `assessment.shared` |
| `src/components/assessment/AssessmentStepper.tsx` | **CREATE** | Progress bar 4-step cross-page |
| `src/app/dashboard/tools/dpia/page.tsx` | **MODIFY** | Aggiunge i 2 componenti in cima; rimuove `blueBg`/`blueBdr` da T |
| `src/app/dashboard/tools/fria/page.tsx` | **MODIFY** | Aggiunge i 2 componenti in cima |
| `src/app/dashboard/tools/assessment-export/page.tsx` | **CREATE** | Pagina unificata DPIA+FRIA+CorrelatedRisks + export |

---

## Context per tutti i task

### Design token B/W (RISPETTARE SEMPRE)
```typescript
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bgAlt:   "#FAFAF9",
  red:     "#dc2626",  redBg: "rgba(220,38,38,0.06)",  redBdr: "rgba(220,38,38,0.18)",
  amber:   "#d97706",  amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green:   "#15803d",  greenBg: "rgba(21,128,61,0.06)", greenBdr: "rgba(21,128,61,0.18)",
} as const;
```
**ZERO** `#2563eb`, `#3b82f6`, `rgba(37,99,235`, `rgba(59,130,246`, `#7c3aed`, ecc.

### Import chiave
```typescript
import { getAssessment } from "@/lib/assessment/assessment-helpers";
import type { Assessment, AssessmentShared } from "@/lib/assessment/assessment-schema";
```

### Tipi esistenti
- `AssessmentShared`: `systemName`, `organization`, `riskLevel`, `annexIII`, `role`, `isGPAI`, `purpose`, `legalBasis`, `processesPersonalData`, `personalDataCategories[]`, `specialCategories[]`, `dataSubjects[]`
- `Assessment`: `id`, `scopeId`, `shared`, `dpia` (DPIAResult), `fria` (FRIADocument), `correlatedRisks[]`, `meta`
- `CorrelatedRisk`: `id`, `description`, `severity`, `sourceView`, `refs[]`, `mitigation?`

---

## Task 0: AssessmentSharedHeader component

**Files:**
- Create: `src/components/assessment/AssessmentSharedHeader.tsx`

- [ ] **Step 1: Crea il file**

```typescript
"use client";
import { getAssessment } from "@/lib/assessment/assessment-helpers";
import type { AssessmentShared } from "@/lib/assessment/assessment-schema";

const RISK_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  unacceptable: { bg: "rgba(220,38,38,0.08)", color: "#dc2626", label: "Inaccettabile" },
  high:         { bg: "rgba(220,38,38,0.06)", color: "#dc2626", label: "Alto Rischio" },
  limited:      { bg: "rgba(202,138,4,0.06)", color: "#92400e", label: "Rischio Limitato" },
  minimal:      { bg: "rgba(21,128,61,0.06)", color: "#15803d", label: "Rischio Minimo"  },
};

export function AssessmentSharedHeader() {
  const shared: AssessmentShared = getAssessment().shared;
  const risk = RISK_BADGE[shared.riskLevel] ?? RISK_BADGE.minimal;

  if (!shared.systemName) return null; // nasconde se non ancora seeded

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 16,
      display: "flex",
      flexWrap: "wrap" as const,
      gap: 16,
      alignItems: "flex-start",
    }}>
      {/* Label */}
      <div style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px",
          color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const,
          display: "block", marginBottom: 4 }}>
          Assessment — Dati comuni
        </span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
          background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.4)",
          fontStyle: "italic" }}>
          Sola lettura · modificabile da Classifier
        </span>
      </div>

      {/* System name */}
      <Field label="Sistema" value={shared.systemName} />
      {shared.organization && <Field label="Organizzazione" value={shared.organization} />}

      {/* Risk badge */}
      <div>
        <Label>Livello rischio</Label>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
          background: risk.bg, color: risk.color, display: "inline-block" }}>
          {risk.label}
        </span>
      </div>

      {shared.annexIII && (
        <div>
          <Label>Allegato III</Label>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>✓ Applicabile</span>
        </div>
      )}

      {shared.purpose && <Field label="Finalità" value={shared.purpose} maxWidth={220} />}
      {shared.legalBasis && <Field label="Base giuridica" value={shared.legalBasis} maxWidth={180} />}

      {shared.processesPersonalData && (
        <div>
          <Label>Dati personali</Label>
          <span style={{ fontSize: 11, color: "#92400e" }}>
            ⚠ Sì
            {shared.personalDataCategories.length > 0 &&
              ` — ${shared.personalDataCategories.slice(0, 2).join(", ")}${shared.personalDataCategories.length > 2 ? "…" : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.8px",
      color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const,
      marginBottom: 3 }}>
      {children}
    </div>
  );
}

function Field({ label, value, maxWidth }: { label: string; value: string; maxWidth?: number }) {
  return (
    <div style={{ maxWidth }}>
      <Label>{label}</Label>
      <div style={{ fontSize: 12, color: "#0D1016", overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
        maxWidth: maxWidth ?? 160 }}>
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errori TS.

- [ ] **Step 3: Commit**

```bash
git add src/components/assessment/AssessmentSharedHeader.tsx
git commit -m "feat(assessment): AssessmentSharedHeader component — read-only shared data"
```

---

## Task 1: AssessmentStepper component

**Files:**
- Create: `src/components/assessment/AssessmentStepper.tsx`

Il componente mostra 4 fasi del processo Assessment, calcolando la fase corrente dai dati esistenti. Riceve `currentTool` ("dpia" | "fria" | "export") per evidenziare dove siamo.

- [ ] **Step 1: Crea il file**

```typescript
"use client";
import { getAssessment } from "@/lib/assessment/assessment-helpers";

type Tool = "dpia" | "fria" | "export";

const STEPS = [
  { id: "intake",      label: "Intake",      sublabel: "Dati sistema", href: "/dashboard/tools/classifier" },
  { id: "analysis",   label: "Analisi",     sublabel: "DPIA + FRIA",  href: null },
  { id: "mitigations",label: "Mitigazioni", sublabel: "Rischi correlati", href: null },
  { id: "export",     label: "Export",      sublabel: "PDF DPO",      href: "/dashboard/tools/assessment-export" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function computePhase(currentTool: Tool): StepId {
  const a = getAssessment();
  if (a.correlatedRisks.some(r => r.mitigation?.appliedToRegister)) return "export";
  if (a.correlatedRisks.length > 0) return "mitigations";
  if (a.dpia.conclusion.compliant !== "" || a.fria.scenarios.length > 0) return "analysis";
  if (a.shared.systemName) return "intake";
  return "intake";
}

export function AssessmentStepper({ currentTool }: { currentTool: Tool }) {
  const phase = computePhase(currentTool);
  const phaseIdx = STEPS.findIndex(s => s.id === phase);

  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 20,
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
      overflow: "hidden",
    }}>
      {STEPS.map((step, i) => {
        const isDone = i < phaseIdx;
        const isCurrent = step.id === phase ||
          (currentTool === "dpia" && step.id === "analysis") ||
          (currentTool === "fria" && step.id === "analysis") ||
          (currentTool === "export" && step.id === "export");

        const content = (
          <div style={{
            flex: 1,
            padding: "10px 14px",
            background: isCurrent ? "#0D1016" : isDone ? "rgba(0,0,0,0.03)" : "#ffffff",
            borderRight: i < 3 ? "1px solid rgba(0,0,0,0.08)" : "none",
            cursor: step.href ? "pointer" : "default",
            textAlign: "left" as const,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                background: isCurrent ? "#ffffff" : isDone ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)",
                color: isCurrent ? "#0D1016" : isDone ? "#0D1016" : "rgba(0,0,0,0.35)",
              }}>
                {isDone ? "✓" : i + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600,
                color: isCurrent ? "#ffffff" : isDone ? "#0D1016" : "rgba(0,0,0,0.4)" }}>
                {step.label}
              </span>
            </div>
            <div style={{ fontSize: 10, paddingLeft: 24,
              color: isCurrent ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.35)" }}>
              {step.sublabel}
            </div>
          </div>
        );

        if (step.href && !isCurrent) {
          return (
            <a key={step.id} href={step.href} style={{ flex: 1, textDecoration: "none" }}>
              {content}
            </a>
          );
        }
        return <div key={step.id} style={{ flex: 1 }}>{content}</div>;
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verifica TS**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/components/assessment/AssessmentStepper.tsx
git commit -m "feat(assessment): AssessmentStepper — 4-step cross-page progress"
```

---

## Task 2: Add components to DPIA page

**Files:**
- Modify: `src/app/dashboard/tools/dpia/page.tsx`

- [ ] **Step 1: Aggiungi import in cima** (dopo le righe di import esistenti, prima di `const T = {`)

Trovare la riga che contiene:
```typescript
import { migrateLegacyFRIA, patchShared, syncCorrelatedRisksFromDPIA } from "@/lib/assessment/assessment-helpers";
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";
```

Sostituire con:
```typescript
import { migrateLegacyFRIA, patchShared, syncCorrelatedRisksFromDPIA } from "@/lib/assessment/assessment-helpers";
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { AssessmentStepper } from "@/components/assessment/AssessmentStepper";
```

- [ ] **Step 2: Rimuovi blueBg/blueBdr dal token T** (righe 41-42)

Trovare nel file:
```typescript
  blueBg:   "rgba(29,78,216,0.06)",
  blueBdr:  "rgba(29,78,216,0.18)",
```

Eliminarle entrambe (non sono usate altrove nel file).

- [ ] **Step 3: Aggiungi i componenti nel JSX**

Nel file `dpia/page.tsx`, trovare il `return (` della funzione principale e localizzare la prima riga di JSX dopo `<SystemSelector checkProhibited={true} />`. Aggiungere i due componenti subito dopo `<SystemSelector ... />`:

```tsx
<SystemSelector checkProhibited={true} />
<AssessmentStepper currentTool="dpia" />
<AssessmentSharedHeader />
```

- [ ] **Step 4: Verifica TS**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/tools/dpia/page.tsx
git commit -m "feat(dpia): AssessmentStepper + AssessmentSharedHeader; rimuovi blueBg/blueBdr"
```

---

## Task 3: Add components to FRIA page

**Files:**
- Modify: `src/app/dashboard/tools/fria/page.tsx`

- [ ] **Step 1: Aggiungi import** dopo la riga esistente:
```typescript
import { getAssessment, patchFRIA, migrateLegacyFRIA, syncCorrelatedRisksFromFRIA } from "@/lib/assessment/assessment-helpers";
import { CorrelatedRisksPanel } from "@/components/assessment/CorrelatedRisksPanel";
```

Aggiungere sotto:
```typescript
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { AssessmentStepper } from "@/components/assessment/AssessmentStepper";
```

- [ ] **Step 2: Rimuovi `blue` da RiskColor e Badge**

In `fria/page.tsx`, trovare:
```typescript
type RiskColor = "red" | "amber" | "green" | "blue" | "gray";
```
Sostituire con:
```typescript
type RiskColor = "red" | "amber" | "green" | "gray";
```

Trovare nel `map` della funzione `Badge`:
```typescript
    blue:  { bg: "rgba(0,0,0,0.04)",  bdr: T.border,  text: T.text  },
```
Rimuovere quella riga.

Trovare la funzione `riskColorFor` che restituisce `"blue"` e verificare che non lo faccia — se c'è un `return "blue"`, sostituire con `return "gray"`.

- [ ] **Step 3: Aggiungi componenti nel JSX**

Nel return principale, dopo `<SystemSelector checkProhibited={true} />` aggiungere:
```tsx
<SystemSelector checkProhibited={true} />
<AssessmentStepper currentTool="fria" />
<AssessmentSharedHeader />
```

- [ ] **Step 4: Verifica TS**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/tools/fria/page.tsx
git commit -m "feat(fria): AssessmentStepper + AssessmentSharedHeader; rimuovi blue RiskColor"
```

---

## Task 4: Assessment Export Page

**Files:**
- Create: `src/app/dashboard/tools/assessment-export/page.tsx`

Questa pagina legge l'intero `Assessment` e presenta:
1. `AssessmentStepper` (currentTool="export")
2. Header con shared data
3. Sezione DPIA — riepilogo (screening, rischi, conclusione)
4. Sezione FRIA — riepilogo (scenari, diritti impattati)
5. Tabella `CorrelatedRisks` con refs normativi
6. Bottoni export (JSON + PDF)

- [ ] **Step 1: Crea directory e file**

```bash
mkdir -p "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply/src/app/dashboard/tools/assessment-export"
```

```typescript
"use client";

import { useState, useEffect } from "react";
import { getAssessment } from "@/lib/assessment/assessment-helpers";
import type { Assessment, CorrelatedRisk } from "@/lib/assessment/assessment-schema";
import { AssessmentStepper } from "@/components/assessment/AssessmentStepper";
import { AssessmentSharedHeader } from "@/components/assessment/AssessmentSharedHeader";
import { SystemSelector } from "@/components/compliance/SystemSelector";
import { Download } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.42)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.08)",
  card:    "#ffffff",
  bgAlt:   "#FAFAF9",
  red:     "#dc2626",  redBg:   "rgba(220,38,38,0.06)",
  amber:   "#d97706",  amberBg: "rgba(202,138,4,0.06)",
  green:   "#15803d",  greenBg: "rgba(21,128,61,0.06)",
} as const;

const cardSt = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 16,
} as const;

// ── Severity badge ─────────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; color: string }> = {
  low:      { bg: "rgba(0,0,0,0.04)", color: T.muted },
  medium:   { bg: T.amberBg,          color: T.amber },
  high:     { bg: T.redBg,            color: T.red   },
  critical: { bg: "#0D1016",          color: "#ffffff" },
};

function SevBadge({ s }: { s: string }) {
  const c = SEV[s] ?? SEV.low;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
      background: c.bg, color: c.color, textTransform: "uppercase" as const }}>
      {s}
    </span>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionTitle({ tag, title, count }: { tag: string; title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px",
        color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const,
        padding: "2px 7px", borderRadius: 4, background: "rgba(0,0,0,0.05)" }}>
        {tag}
      </span>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>
          {count} elementi
        </span>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AssessmentExportPage() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setAssessment(getAssessment());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function exportJSON() {
    if (!assessment) return;
    const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${assessment.shared.systemName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON esportato ✓");
  }

  async function exportPDF() {
    if (!assessment) return;
    setExporting(true);
    try {
      // Costruisce il payload nel formato atteso da /api/compliance/export-pdf
      const sections = [
        {
          title: "Dati condivisi",
          article: "Assessment §shared",
          content: [
            `Sistema: ${assessment.shared.systemName}`,
            `Organizzazione: ${assessment.shared.organization}`,
            `Livello rischio: ${assessment.shared.riskLevel}`,
            `Allegato III: ${assessment.shared.annexIII ? "Sì" : "No"}`,
            `Finalità: ${assessment.shared.purpose}`,
            `Base giuridica: ${assessment.shared.legalBasis}`,
            `Dati personali: ${assessment.shared.processesPersonalData ? "Sì" : "No"}`,
          ].join("\n"),
          status: assessment.shared.systemName ? "complete" : "empty" as "complete" | "empty",
        },
        {
          title: "DPIA — Conclusione",
          article: "GDPR Art. 35 / WP248",
          content: [
            `DPIA richiesta: ${assessment.dpia.screening.dpia_required}`,
            `Compliant: ${assessment.dpia.conclusion.compliant || "N/D"}`,
            `Rischio residuo: ${assessment.dpia.measures.overall_risk_after || "N/D"}`,
            `Minacce identificate: ${assessment.dpia.risks.threats.length}`,
          ].join("\n"),
          status: assessment.dpia.conclusion.compliant ? "complete" : "partial" as "complete" | "partial",
        },
        {
          title: "FRIA — Scenari",
          article: "AI Act Art. 27 / DIHR",
          content: assessment.fria.scenarios.length > 0
            ? assessment.fria.scenarios.map(s =>
                `• ${s.title}: ${s.right_impacts.length} diritti impattati`
              ).join("\n")
            : "Nessuno scenario definito",
          status: assessment.fria.scenarios.length > 0 ? "complete" : "empty" as "complete" | "empty",
        },
        {
          title: "Rischi correlati",
          article: "WP29 ⇄ DIHR / CFR",
          content: assessment.correlatedRisks.length > 0
            ? assessment.correlatedRisks.map(r =>
                `[${r.severity.toUpperCase()}] ${r.description} — ${r.refs.map(rf => rf.citation).join(", ")}`
              ).join("\n")
            : "Nessun rischio correlato",
          status: assessment.correlatedRisks.length > 0 ? "complete" : "empty" as "complete" | "empty",
        },
      ];

      const res = await fetch("/api/compliance/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemName: assessment.shared.systemName || "Sistema AI",
          systemId: assessment.id,
          tier: assessment.shared.riskLevel,
          sections,
        }),
      });
      if (!res.ok) { showToast("Errore export PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AIComply_Assessment_${(assessment.shared.systemName || "sistema").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF esportato ✓");
    } catch {
      showToast("Errore export PDF");
    } finally {
      setExporting(false);
    }
  }

  if (!assessment) {
    return (
      <div style={{ padding: 32, color: T.muted, fontSize: 13 }}>
        Caricamento assessment…
      </div>
    );
  }

  const { shared, dpia, fria, correlatedRisks, meta } = assessment;

  return (
    <div className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <SystemSelector checkProhibited={true} />
      <AssessmentStepper currentTool="export" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px",
            color: "rgba(0,0,0,0.3)", textTransform: "uppercase", marginBottom: 4 }}>
            Assessment Export · Art. 35 GDPR + Art. 27 AI Act
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, letterSpacing: "-0.5px", margin: 0 }}>
            {shared.systemName || "Sistema AI"} — Export DPO
          </h1>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            v{meta.version} · Aggiornato: {new Date(meta.updatedAt).toLocaleDateString("it-IT")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportJSON}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px",
              borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: T.card,
              color: T.muted, cursor: "pointer" }}>
            <Download size={13} /> JSON
          </button>
          <button onClick={exportPDF} disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px",
              borderRadius: 8, border: "none", background: "#0D1016",
              color: "#ffffff", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.7 : 1 }}>
            <Download size={13} /> {exporting ? "Generazione…" : "Esporta PDF"}
          </button>
        </div>
      </div>

      <AssessmentSharedHeader />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Scenari FRIA",      value: fria.scenarios.length,      ok: fria.scenarios.length > 0 },
          { label: "Minacce DPIA",      value: dpia.risks.threats.length,  ok: dpia.risks.threats.length > 0 },
          { label: "Rischi correlati",  value: correlatedRisks.length,     ok: correlatedRisks.length > 0 },
          { label: "Mitigazioni apply", value: correlatedRisks.filter(r => r.mitigation?.appliedToRegister).length, ok: true },
        ].map(c => (
          <div key={c.label} style={{ ...cardSt, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: c.ok && c.value > 0 ? T.text : T.muted,
              letterSpacing: "-0.5px" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* DPIA section */}
      <div style={cardSt}>
        <SectionTitle tag="DPIA · WP248" title="Protezione dati personali" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "DPIA richiesta",   value: dpia.screening.dpia_required },
            { label: "Compliant",        value: dpia.conclusion.compliant || "—" },
            { label: "Rischio ante",     value: dpia.risks.overall_risk_before || "—" },
            { label: "Rischio post",     value: dpia.measures.overall_risk_after || "—" },
            { label: "Trasferimenti int.", value: dpia.proportionality.international_transfers || "—" },
            { label: "Prossima revisione", value: dpia.conclusion.next_review_date || "—" },
          ].map(f => (
            <div key={f.label} style={{ padding: "8px 12px", background: T.bgAlt,
              borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 10, color: T.faint, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 12, color: T.text }}>{String(f.value)}</div>
            </div>
          ))}
        </div>
        {dpia.risks.threats.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8 }}>
              Minacce identificate
            </div>
            {dpia.risks.threats.slice(0, 5).map(t => (
              <div key={t.id} style={{ display: "flex", gap: 8, marginBottom: 6, padding: "6px 10px",
                background: T.bgAlt, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" }}>
                <SevBadge s={t.risk_level} />
                <span style={{ fontSize: 12, color: T.text }}>{t.description || t.source}</span>
              </div>
            ))}
            {dpia.risks.threats.length > 5 && (
              <p style={{ fontSize: 11, color: T.muted }}>… e altri {dpia.risks.threats.length - 5} rischi</p>
            )}
          </div>
        )}
      </div>

      {/* FRIA section */}
      <div style={cardSt}>
        <SectionTitle tag="FRIA · AI Act Art. 27" title="Impatti sui diritti fondamentali"
          count={fria.scenarios.length} />
        {fria.scenarios.length === 0 ? (
          <p style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            Nessuno scenario FRIA definito — vai alla pagina FRIA per compilare.
          </p>
        ) : (
          fria.scenarios.map(scenario => (
            <div key={scenario.id} style={{ marginBottom: 12, padding: "10px 14px",
              background: T.bgAlt, borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{scenario.title}</span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  {scenario.right_impacts.length} diritti impattati
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {scenario.right_impacts.slice(0, 6).map(ri => (
                  <span key={ri.right_id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99,
                    background: "rgba(0,0,0,0.05)", color: T.muted }}>
                    {ri.right_id} · {ri.likelihood.computed_priority}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Correlated Risks */}
      <div style={cardSt}>
        <SectionTitle tag="Correlazione WP29 ⇄ DIHR" title="Rischi correlati"
          count={correlatedRisks.length} />
        {correlatedRisks.length === 0 ? (
          <p style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            Nessun rischio correlato — completa DPIA o FRIA per generarli automaticamente.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {correlatedRisks.map((cr: CorrelatedRisk) => (
              <div key={cr.id} style={{ padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.07)", background: T.bgAlt }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <SevBadge s={cr.severity} />
                  <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{cr.description}</span>
                  <span style={{ fontSize: 10, color: T.faint, flexShrink: 0 }}>
                    {cr.sourceView === "both" ? "DPIA + FRIA" : cr.sourceView.toUpperCase()}
                  </span>
                </div>
                {cr.refs.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                    {cr.refs.map((ref, i) => (
                      <span key={i} style={{ fontSize: 9, fontWeight: 600, padding: "1px 7px", borderRadius: 99,
                        background: "rgba(0,0,0,0.06)", color: T.muted }}>
                        {ref.framework}: {ref.citation}
                      </span>
                    ))}
                  </div>
                )}
                {cr.mitigation?.appliedToRegister && (
                  <div style={{ fontSize: 10, color: T.green, marginTop: 4 }}>
                    ✓ Mitigazione applicata — Risk Register ID: {cr.mitigation.registerRiskId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document preview (print-friendly) */}
      <div style={{ ...cardSt, padding: "48px 64px", maxWidth: 700, margin: "0 auto 40px",
        fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 4,
          fontFamily: "system-ui, sans-serif" }}>
          {shared.systemName || "Sistema AI"}
        </h1>
        <p style={{ fontSize: 11, color: T.muted, marginBottom: 24,
          fontFamily: "system-ui, sans-serif", letterSpacing: "0.3px" }}>
          Assessment DPIA + FRIA · Art. 35 GDPR + Art. 27 AI Act ·{" "}
          {new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            Sintesi esecutiva
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(0,0,0,0.72)" }}>
            {shared.purpose || "Finalità non ancora dichiarata — completare il Classifier."}
          </p>
          {shared.legalBasis && (
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(0,0,0,0.72)", marginTop: 8 }}>
              Base giuridica: {shared.legalBasis}.
              Classificazione rischio AI Act: {shared.riskLevel}.
              Diritti fondamentali impattati: {fria.scenarios.reduce((n, s) => n + s.right_impacts.length, 0)}.
            </p>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50,
          background: "#0D1016", color: "#fff", borderRadius: 12, padding: "12px 16px",
          fontSize: 13, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verifica TS**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errori.

- [ ] **Step 3: Commit + Push**

```bash
git add src/app/dashboard/tools/assessment-export/
git commit -m "feat(assessment): pagina export unificata DPIA+FRIA+CorrelatedRisks (Step 5)"
git push
```

---

## Self-Review

**1. Spec coverage:**
- ✅ "DPIA e FRIA diventano route che leggono/scrivono lo stesso Assessment" — già implementato nei task precedenti; questo piano aggiunge la *presentazione* condivisa
- ✅ "Stepper condiviso Intake → Analysis → Mitigations → Export" — Task 1
- ✅ "shared mostrato in sola lettura in entrambe" — Task 0
- ✅ "Componente unico che genera il PDF leggendo Assessment per DPO" — Task 4
- ✅ "Riusa la spec PDF esistente" — usa `/api/compliance/export-pdf` esistente

**2. Placeholder scan:** Nessun "TBD" o "TODO" — tutto il codice è completo.

**3. Type consistency:**
- `AssessmentStepper` accetta `currentTool: "dpia" | "fria" | "export"` — usato identicamente in Task 2, 3, 4
- `getAssessment()` restituisce `Assessment` — usato uniformemente
- `CorrelatedRisk` importato da `assessment-schema.ts` — stesso tipo nei task 0 e 4
