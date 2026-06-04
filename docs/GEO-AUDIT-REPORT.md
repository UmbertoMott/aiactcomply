# GEO Audit Report — AIComply
**Data:** 4 giugno 2026 | **URL:** aicomply-omega.vercel.app | **GEO Score: 31/100**

---

## Executive Summary

| Categoria | Score | Peso | Contributo |
|-----------|-------|------|------------|
| AI Citability & Visibility | 18/100 | 25% | 4.5 |
| Brand Authority Signals | 5/100 | 20% | 1.0 |
| Content Quality & E-E-A-T | 40/100 | 20% | 8.0 |
| Technical Foundations | 62/100 | 15% | 9.3 |
| Structured Data | 0/100 | 10% | 0.0 |
| Platform Optimization | 42/100 | 10% | 4.2 |
| **TOTALE GEO SCORE** | **31/100** | | |

**Tipo sito rilevato:** SaaS — AI Compliance Platform (italiano)
**Business type:** B2B SaaS, targeting PMI italiane, prodotto in early access

---

## 1. AI Crawlers — Accesso ✅ PASSATO

```
GPTBot:        200 OK — ACCESSO CONSENTITO
ClaudeBot:     200 OK — ACCESSO CONSENTITO
PerplexityBot: 200 OK — ACCESSO CONSENTITO
GoogleBot:     200 OK — ACCESSO CONSENTITO
BingBot:       200 OK — ACCESSO CONSENTITO
```

**robots.txt trovato e valido:**
```
User-Agent: *
Allow: /
Allow: /pricing
Allow: /risorse
Allow: /scanner
Disallow: /dashboard/
Disallow: /api/
Disallow: /login
Disallow: /register
Sitemap: https://aicomply-omega.vercel.app/sitemap.xml
```
✅ Nessun AI crawler bloccato
✅ Sitemap dichiarata
⚠️ Disallow su `/api/` blocca anche endpoint pubblici come `/api/waitlist/count`

---

## 2. Sitemap XML ✅ TROVATA (con problemi)

6 URL indicizzati:
```
/ (homepage)          — priority 1.0   lastmod: 2026-06-03 ✅
/pricing              — priority 0.8   lastmod: 2026-06-03 ✅
/risorse              — priority 0.9   lastmod: 2026-06-03 ✅
/risorse/scadenze-ai-act-aggiornate-calendario-2025-2028  — priority 0.7  lastmod: 2025-01-15 ❌ SBAGLIATO
/risorse/sistema-ai-alto-rischio-annex-iii-obblighi       — priority 0.7  lastmod: 2025-02-01 ❌ SBAGLIATO
/scanner              — priority 0.8   lastmod: 2026-06-03 ✅
```

**Problemi:**
- ❌ lastmod degli articoli in passato (2025) — gli articoli sono stati pubblicati a giugno 2026
- ❌ `/waitlist` non in sitemap
- ❌ Schema org mancante su tutte le pagine

---

## 3. Citability Score — Articolo principale

**URL:** `/risorse/scadenze-ai-act-aggiornate-calendario-2025-2028`
**Score medio: 45.6/100** — Grado C (Moderate Citability)

| Blocco | Score | Grado | Problema principale |
|--------|-------|-------|---------------------|
| "Agosto 2026: cosa devi fare" | 58/100 | C | Word count OK (194), zero statistical density |
| "Quali scadenze AI Act sono già passate?" | 55/100 | C | Self-containment bassa, zero uniqueness |
| "Digital Omnibus di maggio 2026" | 52/100 | C | Troppo breve (132 parole) |
| "Quanto tempo ci vuole davvero" | ~48/100 | C | Dati mancanti, no statistiche |
| Blocchi rimanenti | 30-40/100 | D/F | Non auto-contenuti, senza risposta diretta |

**Grade distribution:**
- ❌ Grade A (80-100): **0 blocchi**
- ❌ Grade B (65-79): **0 blocchi**
- ⚠️ Grade C (50-64): **4 blocchi**
- 🔴 Grade D (35-49): **3 blocchi**
- 🔴 Grade F (<35): **1 blocco**

**Score breakdown problema principale:**
- `uniqueness_signals: 0` su OGNI blocco → nessuna statistica proprietaria, nessun dato originale
- `statistical_density: 2-5` → pochissimi numeri concreti per paragrafo

---

## 4. Homepage — Problemi critici

| Metrica | Valore | Target | Status |
|---------|--------|--------|--------|
| Title tag | "AIComply — Software Conformità EU AI Act..." | ≤60 char con keyword | ⚠️ |
| Meta description | **VUOTA** | 150-160 char | ❌ |
| H1 | **0 trovati** | 1 H1 chiaro | ❌ |
| Schema.org | **0** | SoftwareApplication + Organization | ❌ |
| Word count | 438 | 600-800 min | ⚠️ |
| Internal links | 3 | 8-15 | ❌ |
| og:image | Non rilevata | 1200×630 px | ❌ |
| noindex | FALSE | FALSE | ✅ |
| Canonical | Presente | Presente | ✅ |

---

## 5. llms.txt — MANCANTE ❌

```
/llms.txt     → 404 Not Found
/llms-full.txt → 404 Not Found
```

**Impatto:** ChatGPT, Perplexity, Claude non hanno un documento strutturato
che descriva il sito. Quando qualcuno chiede "cos'è AIComply?" agli AI,
questi non trovano contesto strutturato → risposte vaghe o silenzio.

---

## 6. Structured Data — ASSENTE ❌

| Schema type | Status | Impatto |
|-------------|--------|---------|
| `SoftwareApplication` | ❌ Mancante | No rich result su Google |
| `Organization` | ❌ Mancante | No knowledge panel |
| `WebSite` (SearchAction) | ❌ Mancante | No sitelinks search box |
| `Article` sugli articoli blog | ✅ Presente | Rich result articoli OK |
| `FAQPage` sugli articoli blog | ✅ Presente | FAQ snippet OK |
| `BreadcrumbList` | ❌ Mancante | No breadcrumb snippet |

---

## 7. Brand Authority — BASELINE ZERO ❌

| Piattaforma | Correlazione AI | Stato attuale |
|-------------|----------------|---------------|
| YouTube | 0.737 (alta) | ❌ Nessun canale, nessun video |
| Reddit | Alta | ❌ Nessuna menzione rilevata |
| Wikipedia | 0.655 | ❌ Nessuna voce (prevedibile per brand nuovo) |
| LinkedIn | Media | ❌ Non verificato |
| Podcast | Media | ❌ Nessuna apparizione |
| Guest post | Alta | ❌ Nessun backlink da media IT |

---

## 8. Platform Optimization

| Piattaforma | Status | Problema principale |
|-------------|--------|---------------------|
| Google AI Overviews | ⚠️ Basso | Schema mancante, citability 45/100 |
| ChatGPT Browse | ⚠️ Parziale | llms.txt mancante, no brand mentions |
| Perplexity | ⚠️ Parziale | Crawler OK, contenuto non abbastanza citabile |
| Claude.ai | ⚠️ Parziale | ClaudeBot ammesso, ma llms.txt assente |
| Bing Copilot | ⚠️ Parziale | BingBot OK, struttura debole |

---

## PIANO D'AZIONE PRIORITIZZATO

### 🚨 CRITICO — Fix immediati (impatto su tutte le AI)

| # | Fix | Effort | File |
|---|-----|--------|------|
| C1 | Crea `llms.txt` | 30 min | `src/app/llms.txt/route.ts` |
| C2 | Aggiungi `SoftwareApplication` schema homepage | 20 min | `src/app/page.tsx` |
| C3 | Aggiungi `Organization` schema homepage | 15 min | `src/app/layout.tsx` |
| C4 | Scrivi meta description homepage | 5 min | `src/app/page.tsx` |
| C5 | Aggiungi H1 visibile homepage | 10 min | `src/app/page.tsx` |

### ⚡ ALTO — Entro 1 settimana

| # | Fix | Effort | File |
|---|-----|--------|------|
| H1 | Fix lastmod articoli in sitemap (2025→2026) | 10 min | `src/app/sitemap.ts` |
| H2 | Aggiungi `/waitlist` a sitemap | 5 min | `src/app/sitemap.ts` |
| H3 | Aumenta citability: aggiungi dati statistici agli articoli | 2h | `src/lib/blog/posts.ts` |
| H4 | Aggiungi `BreadcrumbList` alle pagine articolo | 20 min | `src/app/risorse/[slug]/page.tsx` |
| H5 | Crea og:image per homepage e pricing | 1h | Genera 1200×630 |

### 📅 MEDIO — Entro 1 mese

| # | Fix | Effort |
|---|-----|--------|
| M1 | Guest post su agendadigitale.eu o cybersecurity360.it | 3h |
| M2 | LinkedIn company page + 2 post/settimana | Ongoing |
| M3 | Aggiungi sezione "uniceness signals" agli articoli (dati originali, ricerca propria) | 2h/articolo |
| M4 | Riscrivere blocchi D/F degli articoli per auto-contenuto | 1h/articolo |

---

## Score proiettato post-fix critici

| Categoria | Ora | Post-fix critici | Post-fix completi (3 mesi) |
|-----------|-----|-----------------|---------------------------|
| AI Citability | 18 | 42 | 68 |
| Brand Authority | 5 | 8 | 35 |
| Content Quality | 40 | 50 | 72 |
| Technical | 62 | 75 | 82 |
| Structured Data | 0 | 65 | 85 |
| Platform Opt. | 42 | 58 | 74 |
| **GEO SCORE** | **31** | **52** | **70** |

*Report generato: 4 giugno 2026*
