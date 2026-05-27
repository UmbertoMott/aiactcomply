# Dashboard Redesign — Implementation Spec

**Goal:** Replace the redundant tools list on the dashboard homepage with a 2-column layout that surfaces AI systems, upcoming deadlines, next actions, and recent activity.

**Problem solved:** The current tools list duplicates the left sidebar exactly. Modern compliance SaaS dashboards (Vanta, Drata, OneTrust) treat managed *objects* (AI systems) as the primary content, with tools as secondary actions within each object.

---

## Layout

The redesign affects only `src/app/dashboard/page.tsx`. The following sections remain unchanged:
- Alert grid (4 banners)
- Header + Dossier widget
- Stats strip (4 KPIs)

**Replaced:** The `quickTools` array and the tools list section below the stats strip are removed entirely and replaced with a 2-column grid.

```
┌─────────────────────────────┬──────────────────────┐
│  AI Systems (58%)           │  Right panel (42%)   │
│                             │  ┌──────────────────┐ │
│  [Card] [Card]              │  │ Scadenze urgenti │ │
│  [Card] [Card]              │  ├──────────────────┤ │
│  [Card] [Card]              │  │ Prossime azioni  │ │
│                             │  ├──────────────────┤ │
│  [Empty state]              │  │ Attività recente │ │
│                             │  └──────────────────┘ │
└─────────────────────────────┴──────────────────────┘
```

---

## Column A — AI Systems (left, 58%)

### Section header
- Label: "I tuoi sistemi AI"
- Right: count badge + link "Aggiungi sistema →" → `/dashboard/discovery`

### System card
Each card displays one AI system from `localStorage["aicomply_discovered_systems"]`.

**Card fields:**
- `name` (string) — system name
- `riskLevel` (string | undefined) — from `localStorage["aicomply_classifier_result"]` if `systemName` matches, else "—"
- `dossierPct` (number) — computed via `getCompletionPercentage(getDossierSections(aggregateDossier()))`; shown as progress bar
- `nextAction` (string) — first incomplete dossier section label, computed from `getDossierSections`
- `status` badge: "active" | "ignored" — from `system.status`

**Card layout:** 2-column grid of cards. Each card: white bg, 1px border, 10px radius, 14px padding. Click navigates to `/dashboard/journey`.

**Risk level badge colors:**
- `unacceptable` / `high` → red tint
- `limited` → amber tint
- `minimal` → green tint
- unknown → neutral gray

### Empty state
Shown when `aicomply_discovered_systems` is empty or all systems are ignored.

```
┌──────────────────────────────────────────┐
│  [icon: Layers]                          │
│  Nessun sistema AI registrato            │
│  Avvia Discovery per rilevare i sistemi  │
│  AI nella tua infrastruttura.            │
│  [Avvia Discovery →]                     │
└──────────────────────────────────────────┘
```

---

## Column B — Right Panel (right, 42%)

### Section 1: Scadenze urgenti

**Data source:** `getNextUpcomingDeadline()` from `@/lib/notifications/notifications-engine`. Show up to 3 upcoming deadlines.

**Display:**
- Each deadline: article label + title + days badge
- Days badge color: ≤30 days → red, ≤90 → amber, >90 → neutral
- If no deadlines: section is hidden entirely (no empty state)

**Card style:** compact rows, 10px gap, no individual borders — just subtle separator lines.

---

### Section 2: Prossime azioni

**Data source:** `getDossierSections(aggregateDossier())` from `@/lib/dossier/dossier-engine`. Filter sections where `completed === false`. Show up to 5.

**Each item:**
- Icon: small dot (red if section is required, gray otherwise)
- Label: section label (e.g., "Risk Manager", "DPIA")
- Link: navigates to the tool's href
- Article badge: section's article reference

**If all sections complete:** show green "Dossier completato ✓" state.

---

### Section 3: Attività recente

**Data source:** `localStorage["aicomply_evidence_layer"]` — parse as `EvidenceRecord[]`, sort by `timestamp` desc, take latest 5.

**Each item:**
- Type icon: small colored dot by evidence type
- Label: `record.summary` or fallback to `record.type`
- Relative timestamp: "oggi", "ieri", "N giorni fa"

**If no evidence records:** show "Nessuna attività ancora" in muted text.

---

## Data contracts

### AI System object (from localStorage)
```typescript
interface DiscoveredSystem {
  id: string;
  name: string;
  status: "active" | "pending" | "ignored";
  addedToCompliance: boolean;
  // optional, added by classifier:
  riskLevel?: "unacceptable" | "high" | "limited" | "minimal";
}
```

### Evidence record (from localStorage)
```typescript
interface EvidenceRecord {
  id: string;
  type: string;       // "adr" | "log" | "decision" | "audit" | "test" | "incident" | "monitoring"
  summary?: string;
  timestamp: number;
  toolKey?: string;
}
```

*If the actual shape differs from above, read `src/lib/evidence/evidence-layer.ts` at implementation time.*

---

## Removed

- `quickTools` array (lines 72–92 of current `page.tsx`) — deleted entirely
- The tools list JSX block ("TOOLS LIST" section comment) — deleted entirely

The `import` statements for icons used only by `quickTools` are also removed (`Shield`, `BarChart3`, `FileText`, `Database`, `Eye`, `Users`, `CheckCircle`, `Cpu`, `ClipboardCheck`, `Scale`, `BadgeCheck`, `BarChart2`).

---

## Design tokens (same as rest of codebase)

```
card: { background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }
text: "#0D1016"
muted: "rgba(0,0,0,0.4)"
faint: "rgba(0,0,0,0.22)"
border: "rgba(0,0,0,0.07)"
bg: "#FAFAF9"
```

---

## Constraints

- `"use client"` — no server components, no API calls
- All data from localStorage only
- Only `lucide-react` icons
- Italian UI throughout
- `npx tsc --noEmit` must pass after changes
- Do not touch `layout.tsx`, `gateway.ts`, or any file outside `src/app/dashboard/page.tsx`
