# Legal Assistant — Design Spec

## Goal

Add a Legal Assistant page to the AIComply dashboard that lets users ask natural-language questions about EU AI Act, ISO 22989, and the 3 Draft Guidelines PDFs. Each answer is cited by article, with the source chunk visible and highlighted in a side panel.

## Architecture

Single page at `/dashboard/tools/legal-assistant`. Client component — chat state lives in React, no persistence needed for v1. Calls the existing `/api/rag/answer` endpoint (already working). No new API routes required.

**Tech stack:** Next.js 16 App Router, React, Tailwind, Lucide icons. Existing RAG API (`/api/rag/answer`, `/api/rag/query`) already deployed.

---

## Layout

### Split panel with 3-mode toggle

Three icons in the top-right of the page header switch between:

1. **Chat only** — full-width chat, source panel hidden
2. **Split** (default) — chat left (~58%), source panel right (~42%)
3. **Source only** — source panel full-width, chat hidden

The toggle is a grouped button row (`background: #FAFAF9`, `border: 1px solid rgba(0,0,0,0.08)`, `border-radius: 7px`, 3px internal padding). Each button 30×26px, `border-radius: 5px`. Active state: `background: #0D1016; color: #fff`. Icons are custom SVGs:
- Chat-only: single bordered rectangle with two text lines
- Split: two side-by-side bordered rectangles
- Source-only: document rectangle with a highlighted bar

Layout state stored in `useState<'chat'|'split'|'source'>`, defaulting to `'split'`.

---

## Left panel — Chat

### Header
- 26×26px black rounded icon (⚖ or `Scale` from lucide)
- Title: `"AI Act Assistant"` — `text-sm font-semibold text-foreground`
- Subtitle: `"789 chunk · EU AI Act, ISO 22989, 3 Guidelines"` — `text-[9px] text-muted-foreground`

### Message list
Scrollable flex column, `gap-3`, `p-4`. Two message types:

**User bubble** — right-aligned, `bg-foreground text-primary-foreground`, `rounded-[12px_12px_2px_12px]`, `text-xs`.

**Assistant bubble** — left-aligned with small avatar. `bg-surface border border-border`, `rounded-[2px_10px_10px_10px]`, `text-xs`.

Inside the assistant bubble:
- Intro line (`text-muted-foreground`)
- Citation items: `• text [Art. XX ↗ badge]`
  - Each item: `flex items-start gap-1.5 px-1.5 py-1 rounded-md cursor-pointer border border-transparent`
  - Hover: `bg-accent/5 border-accent/15`
  - Active (currently showing in source panel): `bg-accent/7 border-accent/20`
  - Badge: `bg-accent/10 text-accent text-[9px] font-semibold rounded px-1.5 py-0.5`
- Footer: source chips + latency/confidence meta

**Loading state** — three animated dots while waiting for `/api/rag/answer`.

### Answer rendering

Gemini returns free text with `*` bullets and inline `[Fonte: Doc — Art. X, y), p. ?]` citations. The frontend parses this into structured bullet items:

1. Split answer on `\n` — lines starting with `*` or `•` are bullet items.
2. For each bullet, extract the last `[Fonte: ...]` match with the existing `CITATION_RE` regex.
3. Render as a `citation-item` row: left = text without the `[Fonte:...]` suffix, right = clickable badge showing the article ref (e.g. `Art. 16(a)`).
4. Lines that are not bullets render as plain paragraph text above the list.

### Citation-to-chunk matching

When user clicks badge `Art. 16(a)`:
1. Strip the paragraph indicator — extract base ref `"Art. 16"`.
2. Find the first index `i` in `sources[]` where `sources[i].sectionRef` starts with `"Art. 16"`.
3. Set `activeChunkIndex = i`. The source panel shows `chunkTexts[i]` highlighted.

If no match is found (citation refers to an article not in the top-K results), the source panel shows a "Fonte non disponibile nei chunk recuperati" message.

### Interaction
Clicking a citation badge or a source-list row sets `activeChunkIndex` state. The source panel updates immediately — no additional API call.

The API response includes `sources[]` with `{ documentTitle, sectionRef, similarity }`. To show chunk text in the source panel, **the `/api/rag/answer` route needs a small update**: add `chunkTexts: chunks.map(c => c.chunkText)` to the response body.

### Input bar
`bg-surface border border-border rounded-lg px-3 py-2` row with:
- Text input: `flex-1 bg-transparent text-xs placeholder:text-muted-foreground`
- Send button: `bg-foreground text-primary-foreground rounded text-[10px] px-2.5 py-1`

Below the input: 3–4 suggestion chips (`bg-surface border border-border text-muted-foreground text-[9px] rounded px-2 py-0.5 cursor-pointer`). Clicking a chip fills the input.

Default suggestions: `"Sistemi ad alto rischio"`, `"Obblighi GPAI"`, `"Sanzioni Art. 99"`, `"Valutazione conformità"`.

Submit on Enter or button click. Disabled while a request is in flight.

---

## Right panel — Source

### Header
- Document title: `text-[11px] font-semibold text-foreground`
- Document meta: `text-[9px] text-muted-foreground` (e.g. "Regolamento (UE) 2024/1689 · EU AI Act")
- Active citation badge: `bg-accent/10 text-accent text-[9px] font-semibold rounded px-1.5`

When no answer has been generated yet: placeholder state — centered icon + "Fai una domanda per vedere le fonti" in muted text.

### Source text body
Shows the full `chunk_text` of the active chunk. Text above and below the chunk are from adjacent context — in v1, show only the chunk text itself, no surrounding context needed.

The highlighted chunk block:
- `bg-accent/6 border border-accent/18 rounded-md p-3 my-2`
- Label row: `"CHUNK SELEZIONATO"` micro-label (uppercase, `text-[9px] font-semibold text-accent letter-spacing-0.06em`) + relevance pill on the right (`bg-accent/10 text-accent text-[8px] font-semibold rounded px-1`)
- Body: `text-[11px] text-foreground leading-[1.7]`

### Sources list (bottom of right panel)
Shows all returned sources as clickable rows. Clicking a source row updates `activeChunk`.

Each row: `flex items-center gap-2 px-2 py-1 rounded cursor-pointer border border-transparent transition-colors`
- Hover: `bg-accent/5 border-accent/10`
- Active: `bg-accent/7 border-accent/20`
- Art badge: `bg-accent/10 text-accent text-[9px] font-semibold rounded px-1.5`
- Description: `text-[10px] text-muted-foreground flex-1`
- Similarity score: `text-[9px] text-muted-foreground/60`

---

## API — small change needed

Current `/api/rag/answer` response:
```json
{ "answer", "sources", "citations", "confidence", "model", "latencyMs", "chunksFound" }
```

Add `chunkTexts` array:
```json
{ ..., "chunkTexts": ["full text of chunk 0", "full text of chunk 1", ...] }
```

This avoids a second API call when the user clicks a citation. The `sources[i]` and `chunkTexts[i]` are aligned by index.

---

## Navigation

Add to `dashboard/layout.tsx` nav under the "Tool" group:
```ts
{ icon: Scale, label: "Legal Assistant", href: "/dashboard/tools/legal-assistant", art: "Art. 9" }
```

---

## Files to create / modify

| Action | File |
|--------|------|
| Create | `src/app/dashboard/tools/legal-assistant/page.tsx` |
| Modify | `src/app/api/rag/answer/route.ts` — add `chunkTexts` to response |
| Modify | `src/app/dashboard/layout.tsx` — add nav item |

---

## Out of scope (v1)

- Conversation history persistence (localStorage) — add later
- Multilingual toggle (IT/EN) — the API supports it via `lang` param, expose later
- Export chat as PDF
- Filtering by document (the API supports `documentFilter`, expose later)
