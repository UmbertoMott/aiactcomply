# Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply two cosmetic corrections to bring `page.tsx` into exact spec compliance after the 2-column redesign (already implemented in `fd8ecdc`).

**Architecture:** Both changes are confined to `src/app/dashboard/page.tsx`. No new files, no new dependencies. The bulk of the redesign (2-column grid, SystemCard, AI systems list, right panel) is already implemented and TypeScript-clean.

**Tech Stack:** Next.js 16 (App Router), React 18, TypeScript, lucide-react, localStorage

---

## Remaining gaps vs spec

| Spec requirement | Current state |
|---|---|
| Section label "Scadenze urgenti" | Currently "Scadenze normative" |
| `SystemCard` shows `status` badge ("active") | Badge omitted |

---

### Task 1: Fix section label — "Scadenze urgenti"

**Files:**
- Modify: `src/app/dashboard/page.tsx` (one line change)

- [ ] **Step 1: Locate and update the label**

Find line containing:
```tsx
<SectionHeader label="Scadenze normative" href="/dashboard/notifications" linkLabel="Tutte" />
```

Change to:
```tsx
<SectionHeader label="Scadenze urgenti" href="/dashboard/notifications" linkLabel="Tutte" />
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npx tsc --noEmit
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix(dashboard): rename deadline section label to match spec"
```

---

### Task 2: Add status badge to SystemCard

**Files:**
- Modify: `src/app/dashboard/page.tsx` — `SystemCard` component (lines ~602–689)

- [ ] **Step 1: Add status prop and badge to SystemCard**

Update the `SystemCard` function signature and render. Find:

```tsx
function SystemCard({ name, riskLevel, dossierPct, nextAction, nextActionHref, index }: {
  name: string;
  riskLevel?: string;
  dossierPct: number;
  nextAction?: string;
  nextActionHref?: string;
  index: number;
}) {
```

Replace with:

```tsx
function SystemCard({ name, riskLevel, dossierPct, nextAction, nextActionHref, index, status }: {
  name: string;
  riskLevel?: string;
  dossierPct: number;
  nextAction?: string;
  nextActionHref?: string;
  index: number;
  status?: string;
}) {
```

- [ ] **Step 2: Render status badge inside SystemCard**

After the risk badge block (after the `{cfg ? (...) : (...)}` block and before the progress block), insert:

```tsx
{/* Status badge */}
{status && status !== "ignored" && (
  <span style={{
    display: "inline-block", fontSize: 9, fontWeight: 600,
    padding: "1px 6px", borderRadius: 3, marginBottom: 8, marginLeft: 4,
    background: "rgba(21,128,61,0.06)", color: "#15803d",
    border: "1px solid rgba(21,128,61,0.18)",
  }}>
    {status === "active" ? "Attivo" : status}
  </span>
)}
```

- [ ] **Step 3: Pass `status` prop at all call sites**

There are 3 `<SystemCard` usages in the file. Update each:

**Usage 1** — onboarding fallback (around line 416):
```tsx
<SystemCard
  name={mainSystemName}
  riskLevel={classifier?.riskLevel}
  dossierPct={dossierPct}
  nextAction={nextActions[0]?.title}
  nextActionHref={nextActions[0]?.href}
  index={0}
  status="active"
/>
```

**Usage 2** — discovered systems grid (around line 429):
```tsx
<SystemCard
  key={sys.id}
  name={sys.name}
  riskLevel={sys.riskLevel}
  dossierPct={dossierPct}
  nextAction={nextActions[0]?.title}
  nextActionHref={nextActions[0]?.href}
  index={i}
  status={sys.status}
/>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "/Users/umbertomottola/Desktop/open code - ai act saas/aicomply"
npx tsc --noEmit
```

Expected: no output (no errors)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add status badge to SystemCard per spec"
```

---

## Done

After both tasks, the implementation is fully spec-compliant. Run `npx tsc --noEmit` one final time and confirm zero errors before finishing the branch.
