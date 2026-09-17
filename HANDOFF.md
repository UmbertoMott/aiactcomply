# RegulaeOS — Contesto per nuova chat

Riassunto dei lavori recenti e stato del progetto. Da incollare/allegare all'avvio di una nuova sessione.

## Progetto
- **RegulaeOS** (ex "AIComply"): SaaS di conformità EU AI Act (Reg. UE 2024/1689). Servizio legale professionale (Avv. Umberto Mottola).
- **Stack**: Next.js **16.2.6** (App Router, React 19), TypeScript, Tailwind, framer-motion, lucide-react.
- **⚠️ Next 16 ha breaking changes**: leggere i doc in `node_modules/next/dist/docs/` prima di scrivere codice. `middleware` è rinominato **`proxy`**.
- **Build**: `npx next build --webpack` (Turbopack crasha con "Next.js package not found"). **Dev**: `npm run dev -- --webpack` (porta 3000).
- **Deploy**: Vercel builda **solo `main`** → `regulaeos.com`. Repo GitHub: `git@github.com:UmbertoMott/aiactcomply.git`.
- **Login**: ristretto a `dridrop@gmail.com` (allowlist in `src/app/(auth)/actions/auth.ts`, env `AUTH_ALLOWED_EMAILS`). La dashboard non è ispezionabile via browser senza quell'account.

## Ambiente / note operative
- **Cartella progetto**: `/Users/umbertomottola/aicomply` (branch `main`). NB: è stata **spostata dal Desktop** perché macOS (TCC) bloccava l'accesso degli strumenti alle cartelle protette (Desktop/Documenti/Download). Tenerla fuori dal Desktop.
- Design tokens: testo `#0D1016`, muted `rgba(0,0,0,0.42)`, sfondo `#fafaf9`/`#FAFAF9`, serif Georgia, mono "DM Mono". **NO blu** nell'UI di prodotto.
- Citazioni AI Act verificate contro il Reg. (UE) 2024/1689; per l'EN usare la terminologia ufficiale della versione inglese del Regolamento.

## Lavori completati (questa fase) — tutto committato e pushato su `main`

1. **Rimozione marcatori `[verify]`** (`0b460c3`)
   - Tolte **408 occorrenze** di `[verify against current AI Act text]`, `[verify]` e varianti IT (`[verificare sul testo AI Act vigente]`, ecc.) da label, placeholder e stringhe UI in ~90 file.
   - Tagliati **alla fonte** nei prompt AI (`src/app/actions/*.ts`): rimosse le istruzioni che chiedevano al modello di appendere il marcatore → non verrà più generato.
   - Rimossa la logica di gating nel modal `inventory` che obbligava a lasciare `[verify]` nel campo per salvare.
   - Preservati gli identificatori di codice (`[verifyResult]`, `[verified]`).

2. **Ottimizzazione video hero** (`2f43daf`)
   - `public/videos/hero-demo.mp4`: **5.9MB → 1.3MB** (H.264 CRF 30, faststart, audio rimosso via ffmpeg).
   - Aggiunto **poster** `hero-demo-poster.jpg` → l'hero appare subito invece di restare nero.
   - Rimosso il `preload()` a priorità alta in `src/app/page.tsx` che rubava banda al primo paint.

3. **Infrastruttura bilingue IT/EN + levetta** (`2f66ad9`) — **approccio A: cookie + contesto, nessun cambio URL**
   - `src/i18n/config.ts` — locali (`it`|`en`), default `it`, cookie `regulaeos_locale`.
   - `src/i18n/dictionaries.ts` — dizionari per **namespace** (sezione → chiave → testo) con fallback `locale → it → chiave`. Funzione `translate(locale, ns, key)`.
   - `src/i18n/LocaleProvider.tsx` (client) — `LocaleProvider`, `useLocale()`, **`useT(ns)`** (hook per client component), `setLocaleCookie()`.
   - `src/i18n/server.ts` — `getLocale()`, `getT(ns)` per i server component (leggono il cookie via `next/headers`).
   - `src/components/LanguageToggle.tsx` — levetta **IT|EN**: salva il cookie e fa `router.refresh()` → il server ri-renderizza nella lingua scelta (aggiorna anche `<html lang>`), senza reload completo.
   - `src/app/layout.tsx` — root layout **async**: legge il cookie, imposta `<html lang>`, avvolge in `LocaleProvider`.
   - **Verificato end-to-end**: click EN → cookie `=en`, `<html lang>=en`, testo tradotto.

4. **Home bilingue — parziale** (`dd71371`)
   - Tradotti: **Nav** (namespace `nav`), **Hero** (namespace `hero`, incluse le parole animate del typewriter), **PlatformSection** (namespace `platform`, header + 8 moduli).
   - Nomi tecnici/prodotto lasciati invariati; "Documentazione"→"Documentation".

5. **Pagina notifiche** `src/app/dashboard/notifications/page.tsx` (`6012aaf`)
   - Contenuto **centrato** (`mx-auto`) invece che a sinistra; toggle centrato.
   - Rimosse le icone dai tab (campanella/calendario) e il funnel dai filtri.
   - Nuovo **"Ripristina rimosse"**: pulsante nella barra azioni (se ci sono notifiche rimosse) + nell'empty-state. Handler `handleRestoreDismissed()` azzera i `dismissed` e rigenera scadenze/progressi.

## Da fare (pendenti)

### A. Completare la home bilingue (prossimo task naturale)
Restano **9 sezioni** in `src/components/sections/`:
`Pain`, `Stepper`, `Stats`, `VideoShowcase`, `Quote`, `ChiEroga`, `CtaFinal`, `BookDemoBanner`, `Footer`.

**Pattern da seguire per ogni sezione** (client component):
1. `import { useT } from "@/i18n/LocaleProvider";`
2. In cima al componente: `const t = useT("<namespace>");`
3. Sostituire le stringhe hardcoded con `{t("chiave")}`.
4. Aggiungere il namespace in `src/i18n/dictionaries.ts` **sia in `it` che in `en`** (stesse chiavi).
5. Per array module-level con testo (es. liste), spostarli dentro il componente e usare `t`, oppure dare una `key` stabile e mettere i testi nel dizionario per chiave.
6. Server component: usare `await getT(ns)` da `@/i18n/server` invece dell'hook.
7. `npx tsc --noEmit` per verificare.

### B. Poi: resto del sito bilingue (multi-sessione)
Le altre ~18 pagine pubbliche, poi i 58 tool della dashboard (testo tecnico-legale pesante). Scelte già prese dall'utente: **bilingue completo** e **"traduco io, valida l'utente"**. Procedere **a blocchi, una sessione per volta** (per contenere i token: sessioni nuove `/clear` costano molto meno perché non ricaricano la cronologia).

### C. Firma Evidence Layer (task sospeso, non iniziato)
Pagina orfana `src/app/dashboard/evidence-layer/page.tsx` + lib `src/lib/evidence/evidence-layer.ts` (registro probatorio a catena hash; `appendEvidence` è usata da ~26 file in tutta l'app). Richiesta: sostituire la **firma simbolica** (`signed:autore:hash`) con firma **verificabile** (ECDSA P-256 via Web Crypto ora; adapter QTSP/eIDAS come stub documentato dopo), più: rimuovere auto-popolamento demo, storage per-progetto con migrazione, provenienza in UI. **Sospeso in attesa di 2 decisioni utente**:
1. Ambito firma: tutta la catena (tutti i tool) vs solo record manuali della pagina.
2. Storage: per-progetto (`regulaeos_evidence_<projectId>`, con migrazione da `algorithmic_trust_evidence`) vs catena unica solo rinominata.

## Preferenze utente rilevanti
- **Molto attento ai token**: preferisce interventi mirati, sessioni brevi/nuove, e che non si sprechi lavoro. Indicargli sempre i comandi shell in blocco `bash` quando serve.
- Vuole **committare e pushare** spesso (workflow diretto su `main`).
- Precisione legale = tutto (è avvocato): le traduzioni EN le valida lui.
- Estetica sempre "in linea col sito" (tokens sopra), niente stravolgimenti cromatici.
