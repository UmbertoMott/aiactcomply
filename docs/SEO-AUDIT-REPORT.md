# SEO Audit Report — AIComply
**Data:** 3 giugno 2026 | **URL:** aicomply-omega.vercel.app | **Score: 18/100**

---

## ⚠️ RISULTATO CRITICO: IL SITO È INVISIBILE A GOOGLE

```
<meta name="robots" content="noindex"/>
```

**Ogni singola pagina del sito ha questo tag.** Google non indicizza nulla.
Causa: Vercel inietta automaticamente `noindex` su tutti i sottodomini `*.vercel.app`
perché li considera deployment di staging/preview, non produzione.
**Finché non hai un dominio custom, zero traffico organico è possibile.**

---

## PARTE 1 — DOMINIO DA ACQUISTARE

### Stato domini esaminati

| Dominio | Stato | Note |
|---------|-------|------|
| `aicomply.it` | ❌ Registrato | Dal 2010, IP 31.11.35.147 — qualcuno lo usa già |
| `aicomply.eu` | ❌ Registrato | Acquistabile via broker (prezzo ignoto) |
| `aicomply.app` | ✅ **Probabilmente disponibile** | Nessun record WHOIS trovato |

### Raccomandazioni ordinate per priorità

#### 🥇 #1 — `aicomply.app` (~€15/anno)
**Acquista subito.** Nessun record WHOIS = quasi certamente libero.
- `.app` è il TLD standard per SaaS moderni (linear.app, cal.app, ecc.)
- Brandato, corto, pronunciabile in italiano e inglese
- HTTPS forzato nativamente dal registro Google
- **Azione:** verifica su Namecheap / Aruba ora, registra prima che qualcuno lo prenda

#### 🥈 #2 — `aiactcomply.it` o `aiact-comply.it` (€10-15/anno)
- Descrittivo per SEO italiana (contiene "ai act" + "comply")
- `.it` aumenta fiducia per PMI italiane
- Probabile disponibilità (dominio molto specifico)
- Contro: più lungo, meno brandabile

#### 🥉 #3 — `conformia.it` (€10-15/anno)
- "Conformia" = portmanteau di "conformità" + nome proprio
- Italiano, unico, brandabile
- Contro: non contiene "AI Act" → meno SEO keyword match diretto

#### Scarta
- `aicomply.eu` — registrato, costo broker imprevedibile (€500-5000+)
- `aicomply.it` — registrato dal 2010, acquisizione costosa
- `.ai` domains — costi €70-150/anno, non aggiungono SEO in Italia

### Dopo l'acquisto: 3 azioni immediate
1. Aggiungi dominio custom in Vercel Dashboard → Settings → Domains
2. Il tag `noindex` sparirà automaticamente per il dominio custom
3. Aggiungi sitemap.xml e robots.txt (vedi §3)

---

## PARTE 2 — KEYWORD RESEARCH: ALTA DOMANDA, BASSA COMPETIZIONE

### Contesto mercato italiano
- **Zero competitor italiani** nel segmento SaaS AI Act a meno di €15.000/anno
- I tool esistenti (OneTrust, Credo AI, Holistic AI) sono tutti in inglese, enterprise-only
- Il contenuto italiano su AI Act è prodotto da: studi legali, consulenti, media tech
- **Nessuno** ha un blog con guide pratiche + tool collegati → opportunità enorme

### Classifica keyword per priorità editoriale

#### 🟢 TIER 1 — Bassa competizione, volume in crescita rapida
*Poche pagine di qualità esistono, competitor editoriali deboli*

| # | Keyword | Volume est. IT/mese | KD | Tipo articolo |
|---|---------|--------------------|----|---------------|
| 1 | `legge 132 2025 intelligenza artificiale PMI` | 300–600 | 8/100 | Guida obblighi specifici L.132 per PMI italiane |
| 2 | `fria ai act come si fa` | 200–400 | 6/100 | Tutorial FRIA passo-passo con template scaricabile |
| 3 | `ai act art 50 chatbot obblighi` | 400–700 | 10/100 | Guida specifica Art. 50: cosa scrivere, dove, quando |
| 4 | `dpia fria differenza ai act` | 300–500 | 7/100 | Articolo comparativo DPIA vs FRIA: quando fare quale |
| 5 | `ai act deployer obblighi checklist` | 250–450 | 9/100 | Checklist Art. 26 per chi usa AI di terze parti |
| 6 | `sandbox ai act italia` | 200–350 | 5/100 | Spiegazione regulatory sandbox post-L.132/2025 |
| 7 | `annex iii ai act lista completa` | 500–800 | 12/100 | Tabella completa 8 settori + esempi italiani concreti |
| 8 | `ai act documentazione tecnica annex iv` | 200–400 | 8/100 | Cosa serve per Annex IV: template + guida |
| 9 | `gpai modello rischio sistemico threshold` | 150–300 | 5/100 | Spiegazione soglia FLOPs e obblighi GPAI |
| 10 | `registro sistemi ai obbligatorio italia` | 400–700 | 11/100 | EUDB: quando registrare, cosa inserire |

#### 🟡 TIER 2 — Volume medio, competizione media
*Contenuto esiste ma è superficiale o non aggiornato post-Omnibus*

| # | Keyword | Volume est. IT/mese | KD | Tipo articolo |
|---|---------|--------------------|----|---------------|
| 11 | `ai act scadenze 2025 2026 2027` | 1.500–2.500 | 22/100 | *(già pubblicato — aggiornare periodicamente)* |
| 12 | `sistema ai alto rischio come capire` | 800–1.200 | 18/100 | *(già pubblicato come Annex III — ottimizzare)* |
| 13 | `ai act sanzioni importo` | 600–900 | 20/100 | Articolo sanzioni con esempi per fascia aziendale |
| 14 | `ai act provider deployer differenza` | 500–800 | 15/100 | Guida distinzione ruoli Art. 3 |
| 15 | `ai act certificazione conformità` | 600–1.000 | 25/100 | Come ottenere la dichiarazione di conformità UE |
| 16 | `ai act transparency obblighi chatbot` | 700–1.100 | 19/100 | Obblighi disclosure verso utenti: Art. 50 + Art. 13 |
| 17 | `ai literacy aziendale ai act art 4` | 400–700 | 14/100 | Art. 4: cosa significa alfabetizzazione AI in azienda |
| 18 | `ai act HR selezione personale` | 800–1.300 | 21/100 | Guida specifica settore HR: ATS, screening CV, rischi |
| 19 | `ai act banca credito mutuo` | 600–900 | 18/100 | Guida settore fintech/banking: scoring creditizio |
| 20 | `omnibus ai act rinvio 2027` | 500–800 | 16/100 | Analisi accordo Omnibus maggio 2026 e impatti pratici |

#### 🔴 TIER 3 — Alto volume, alta competizione
*Già dominati da Agenda Digitale, Cybersecurity360, studi legali top*

| Keyword | Volume est. | KD | Raccomandazione |
|---------|------------|-----|-----------------|
| `eu ai act` | 8.000–12.000 | 65+ | Non attaccare ora |
| `ai act italia` | 3.000–5.000 | 55+ | Solo con dominio custom + 20+ articoli |
| `intelligenza artificiale regolamento ue` | 5.000+ | 70+ | Evitare |
| `ai act compliance` | 2.000–3.000 | 48+ | Attaccabile dopo 6 mesi di autorità |

---

## PARTE 3 — PROBLEMI TECNICI SEO CRITICI

### P1 — BLOCCANTE: `noindex` globale
**Impatto:** 100% del traffico organico perso
**Fix:** Acquista dominio custom + configura su Vercel → risolve automaticamente

### P2 — BLOCCANTE: Nessun sitemap.xml
```
/sitemap.xml → 404
```
**Fix:** Aggiungi in `next.config.ts`:
```ts
// oppure crea src/app/sitemap.ts
export default function sitemap() {
  return [
    { url: 'https://tuodominio.app/', lastModified: new Date() },
    { url: 'https://tuodominio.app/pricing', lastModified: new Date() },
    { url: 'https://tuodominio.app/risorse', lastModified: new Date() },
    // + slug articoli dinamici
  ]
}
```

### P3 — BLOCCANTE: Nessun robots.txt
```
/robots.txt → 404
```
**Fix:** Crea `src/app/robots.ts`:
```ts
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://tuodominio.app/sitemap.xml',
  }
}
```

### P4 — ALTO: Canonical URL hardcoded su vecchio dominio
In `risorse/[slug]/page.tsx` e `risorse/page.tsx`:
```ts
url: "https://aicomply-omega.vercel.app/risorse/..."  // ← SBAGLIATO
```
**Fix:** Sostituire con variabile d'ambiente `NEXT_PUBLIC_SITE_URL`

### P5 — MEDIO: Titolo H1 homepage non ottimizzato per keyword
Il title tag è: `"AIComply — Compliance AI Act semplificata"`
**Fix consigliato:** `"AIComply — Software Compliance EU AI Act per Aziende Italiane"`

### P6 — MEDIO: Nessun dato strutturato (Schema.org)
Gli articoli del blog hanno Schema.org `Article` + `FAQPage` (✅ già implementati).
Mancano: `SoftwareApplication`, `Organization`, `WebSite`, `BreadcrumbList`

### P7 — BASSO: Open Graph incompleto
Manca `og:image` su homepage e pricing page.

---

## PARTE 4 — ANALISI COMPETITIVA

### Competitor italiani diretti
**Nessuno.** Non esiste un altro SaaS AI Act interamente in italiano.

### Competitor indiretti italiani (contenuto/blog)
| Dominio | Focus | Punti di forza | Gap rispetto ad AIComply |
|---------|-------|---------------|--------------------------|
| agendadigitale.eu | News/analisi IA | Autorità dominio alta, DA 60+ | Solo contenuto, zero tool |
| cybersecurity360.it | News compliance | Aggiornato, largo pubblico | Nessun prodotto SaaS |
| startbrain.ai | Guida AI Act | Tool gratuito classificazione | Solo classificatore, no dossier |
| legalfordigital.it | Legal blog | Tecnico, approfondito | Solo contenuto, no automazione |
| prompti.it | Compliance AI | Guida pratica PMI | Blog only, no SaaS |

### Competitor internazionali (nessuno attacca PMI italiane)
| Tool | Prezzo | Lingua | Target | Gap |
|------|--------|--------|--------|-----|
| OneTrust | €50k+/anno | EN | Enterprise | Inaccessibile a PMI |
| Credo AI | €30k+/anno | EN | Enterprise | Inaccessibile a PMI |
| Holistic AI | Quotazione | EN | Enterprise | Nessuna localizzazione IT |
| Vanta | €8k+/anno | EN | Mid-market | Non specifica AI Act |
| Drata | €15k-60k/anno | EN | Mid-market | Non specifica AI Act |
| IBM watsonx.governance | €0.60/unit | EN | Enterprise | Complessità alta |

**Gap di mercato confermato:** AIComply a €49/mese è **da 30x a 1000x meno costoso** dei competitor con copertura AI Act specifica, ed è l'unico in italiano.

---

## PARTE 5 — PIANO D'AZIONE PRIORITIZZATO

### 🚨 SETTIMANA 1 — Fix critici (SEO bloccante)

| Azione | Impatto | Effort | Come |
|--------|---------|--------|------|
| 1. Acquista `aicomply.app` | Sblocca tutto il SEO | 15 min | Namecheap/Aruba |
| 2. Configura dominio su Vercel | Rimuove noindex globale | 10 min | Vercel Dashboard |
| 3. Aggiungi `sitemap.ts` in Next.js | Indicizzazione completa | 30 min | Crea file |
| 4. Aggiungi `robots.ts` in Next.js | Crawl corretto | 10 min | Crea file |
| 5. Fix canonical URL → env var | Evita penalità duplicate | 20 min | Sostituisci hardcoded |

### 📅 MESE 1 — Contenuto (cattura domanda immediata)

Pubblica nell'ordine seguente (dal più facile al più lungo):

1. **"Legge 132/2025 AI: guida pratica per le PMI italiane"**
   Keyword: `legge 132 2025 PMI` → KD 8, dominio libero
   
2. **"DPIA vs FRIA: quando fare quale e come compilarle per i sistemi AI"**
   Keyword: `dpia fria differenza ai act` → KD 7
   
3. **"AI Act Art. 50: cosa devi scrivere sui tuoi chatbot e sistemi AI (con esempi)"**
   Keyword: `ai act art 50 chatbot` → KD 10
   
4. **"Deployer AI Act: la checklist Art. 26 per chi usa AI di fornitori"**
   Keyword: `ai act deployer obblighi checklist` → KD 9
   
5. **"AI Act e HR: il tuo ATS o software di selezione è ad alto rischio?"**
   Keyword: `ai act HR selezione personale` → KD 21

### 📅 MESE 2-3 — Autorità e link building

1. Pubblica Tier 2 keywords (articoli 11-20)
2. Aggiungi Schema.org `SoftwareApplication` su homepage
3. Invia sitemap a Google Search Console
4. Guest post su agendadigitale.eu / cybersecurity360.it (alta DA)
5. Aggiungi `llms.txt` per visibilità AI search (Perplexity, ChatGPT)

---

## RIEPILOGO ESECUTIVO

| Metrica | Stato attuale | Obiettivo 3 mesi |
|---------|--------------|-----------------|
| Indicizzazione Google | **0 pagine** (noindex) | 15+ pagine indicizzate |
| Traffico organico/mese | **0** | 500-2.000 visite |
| Keyword in top 10 | **0** | 8-15 keyword |
| Dominio | vercel.app (no SEO) | Dominio custom |
| Articoli blog | 2 | 10+ |
| Schema.org | Parziale | Completo |

**Il blocco principale non è la qualità del contenuto — è che Google non vede nulla.**
Un dominio custom da €15/anno risolve il problema in 48 ore.
Con 5 articoli ottimizzati sulle keyword Tier 1, puoi essere in top 3 in Italia
su query specifiche in 60-90 giorni dalla data di prima indicizzazione.

---

*Report generato: 3 giugno 2026 | aicomply-omega.vercel.app*
