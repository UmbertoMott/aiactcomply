# AIComply Homepage — Design Spec

**Data:** 2026-05-13  
**Stato:** Approvato

---

## Obiettivo

Costruire la homepage pubblica di AIComply: una landing page dinamica, moderna e professionale ispirata a legora.com e hybridity.ai, che convinca CTO, CCO/Legal e CEO a prenotare una demo.

---

## Stack e vincoli

- Next.js 16.2.6, App Router, TypeScript, Tailwind CSS v4
- Animazioni: Framer Motion (da installare)
- Font: Inter (già disponibile via next/font o CDN) — stile Aktiv Grotesk di legora
- Niente emoji, niente icone decorative — solo testo e dati
- UI dei tool ricreata in CSS/HTML (non screenshot reali)
- Bottoni pill-shape (border-radius: 9999px) come legora

---

## Design tokens

| Token | Valore |
|---|---|
| Hero background | `#0D1016` |
| Light section bg | `#FAFAF9` |
| White section bg | `#FFFFFF` |
| Primary text | `#0D1016` |
| White text | `#FFFFFF` |
| Muted text light | `rgba(0,0,0,0.45)` |
| Muted text dark | `rgba(255,255,255,0.45)` |
| Accent blue | `#3b82f6` |
| Accent indigo | `#6366f1` |
| Border dark | `rgba(255,255,255,0.08)` |
| Border light | `rgba(0,0,0,0.08)` |
| H1 font-size | `68px` |
| H1 font-weight | `400` |
| H1 letter-spacing | `-3px` |
| H2 font-size | `48px` |
| H2 letter-spacing | `-2px` |

---

## Struttura pagina (dall'alto)

### 1. Nav (sticky)
- Logo `AIComply` (font-weight 600, letter-spacing -0.5px)
- Link: Prodotto / Prezzi / Risorse / Azienda
- CTA: "Accedi" (ghost) + "Prenota demo" (pill bianco su dark, nero su light)
- `position: sticky`, backdrop-filter blur(16px), bordo inferiore sottile allo scroll

### 2. Hero
- Background: `#0D1016`
- Mesh gradient: due radial-gradient blu/indigo sovrapposti
- Griglia sottile: `background-image` con linee 1px rgba(255,255,255,0.025) a 64px
- Badge pill: "EU AI Act — In vigore agosto 2026" con dot blu glowing
- H1: `AI Act compliance, senza compromessi.` — "senza compromessi." in gradient text (blue→indigo)
- Subtitle: 18px weight 300
- CTA: "Prenota una demo gratuita" (bianco) + "Scopri come funziona" (ghost)
- **Product mockup**: browser frame dark con la dashboard AIComply (sidebar + 3 card stats + progress bar)
- Animazione: fade-in + translateY(-20px) all'entrata, stagger sui child elements

### 3. Pain Section (sfondo `#FAFAF9`)
- Eyebrow: "Il problema" uppercase
- H2: "La conformità normativa AI è un problema non risolto."
- 3 pain card con border-top blu, numero grande (font-weight 300), descrizione
  - `6–18` mesi per audit manuale
  - `100+` requisiti da mappare
  - `35M€` sanzione massima
- Animazione: card entrano da sotto con stagger (Intersection Observer + Framer Motion)

### 4. Stepper (sfondo `#0D1016`)
- Eyebrow: "Come funziona"
- H2: "Da zero a compliant in tre passaggi."
- Layout: grid 2 colonne — steps a sinistra, visual panel a destra (sticky)
- 3 step con numero 01/02/03, titolo, descrizione, tag pill
  - 01: Risk Assessment automatico
  - 02: Documentazione generata
  - 03: Integrazione nel workflow (Jira, Confluence, GitHub)
- Visual panel: mostra il risk assessment con lista sistemi classificati (Alto/Limitato/Minimo)
- Animazione: ogni step si illumina (opacity + colore) quando entra nel viewport mentre si scrolla. Il visual panel cambia contenuto in sync con lo step attivo.

### 5. Stats (sfondo `#FAFAF9`)
- Eyebrow: "Adottato in Europa"
- 3 stat con border-top, numero grande (font-weight 300)
  - `50+` aziende europee
  - `300+` sistemi AI classificati
  - `<48h` dal primo accesso al primo assessment
- Animazione: counter count-up quando entra nel viewport

### 6. Tool Gallery (sfondo `#FAFAF9`)
- Eyebrow: "Il prodotto"
- H2: "Tre strumenti. Un'unica piattaforma."
- Grid 2 colonne, 2 righe:
  - **AI Classifier** (card grande, occupa 2 righe): UI ricreata fedelmente — sidebar con nav, file browser con segnali, pannello Riepilogo Discovery, AI Risk Scorer
  - **AIA-Architect** (card piccola): tabella Data Lineage Column-Level con bias score
  - **DocuGen AI** (card piccola): stat cards, griglia Allegato IV, editor sezione
- Ogni card:
  - `overflow: hidden`, `border-radius: 14px`
  - Hover: `translateY(-6px) scale(1.01)`, box-shadow aumenta
  - Screenshot inner: `scale(1.03) translateY(-4px)` al hover
  - Footer info: nome tool, descrizione, freccia → che diventa nera al hover
  - Click: rimanda alla pagina del tool (`/dashboard/tools/classifier`, ecc.)
- Animazione: card entrano con fade-in + stagger allo scroll

### 7. CTA Finale (sfondo `#0D1016`)
- H2: "Pronti a essere compliant?" (52px weight 400)
- Subtitle: descrizione demo 30 minuti
- 2 CTA: "Prenota demo gratuita" (bianco) + "Parla con il team" (ghost)

---

## Componenti da creare

| File | Descrizione |
|---|---|
| `src/app/page.tsx` | Homepage, orchestra tutte le sezioni |
| `src/components/Nav.tsx` | Navbar sticky con scroll detection |
| `src/components/sections/Hero.tsx` | Hero con mesh gradient + product mockup |
| `src/components/sections/Pain.tsx` | 3 pain card animate |
| `src/components/sections/Stepper.tsx` | Stepper interattivo con visual panel |
| `src/components/sections/Stats.tsx` | Statistiche con count-up |
| `src/components/sections/ToolGallery.tsx` | Grid 3 tool card |
| `src/components/tools/ClassifierUI.tsx` | UI ricreata AI Classifier |
| `src/components/tools/AiaArchitectUI.tsx` | UI ricreata AIA-Architect |
| `src/components/tools/DocugenUI.tsx` | UI ricreata DocuGen AI |
| `src/components/sections/CtaFinal.tsx` | CTA finale |
| `src/components/ui/Button.tsx` | Bottone pill riutilizzabile |

---

## Dipendenze da installare

```
framer-motion
```

---

## Animazioni — Framer Motion

- **Fade-in-up**: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- **Stagger children**: `staggerChildren: 0.1` nel parent
- **Intersection Observer**: `whileInView` + `viewport={{ once: true, margin: "-100px" }}`
- **Stepper sync**: state `activeStep` (0/1/2) aggiornato con Intersection Observer su ogni step div
- **Count-up**: custom hook con `useMotionValue` + `useSpring` per le stat numeriche
- **Hero product mockup**: delay 0.4s, spring animation

---

## Routing tool gallery

Le card nella Tool Gallery linkano a pagine interne che esistono già nell'app:
- AI Classifier → `/dashboard/tools/classifier`
- AIA-Architect → `/dashboard/modules/aia-architect`
- DocuGen AI → `/dashboard/tools/docugen`

Usare `next/link` con `href` assoluto.

---

## Note implementative

- Usare `next/font/google` per Inter con subset `latin` e display `swap`
- Griglia CSS nativa per il layout (no librerie grid esterne)
- Il visual panel dello stepper è `position: sticky; top: 80px` lato destro
- Le UI dei tool ricreate in CSS devono avere `pointer-events: none` per non interferire col click della card
- Aggiungere `.superpowers/` a `.gitignore`
