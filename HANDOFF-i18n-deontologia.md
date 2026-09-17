# HANDOFF — i18n dashboard + correzioni deontologiche

Contesto per riprendere il lavoro in una sessione nuova. Da allegare/incollare all'avvio.
Complementare a `HANDOFF.md` (contesto generale del progetto).

- **Branch**: `claude/home-translation-continued-5b8cc8` (tutto **pushato** su origin, fino a `9fefcb7`).
- **Deploy**: Vercel builda solo `main` → questo branch NON è ancora in produzione.
- **Dev**: `npm run dev -- --webpack` (porta 3000). `npx tsc --noEmit` per il typecheck.

---

## 1. Cosa è stato fatto (tutto committato e pushato)

### A. Fix OTP email (debug) — `9835102`
`sendLoginOTPEmail` ora ritorna `{ok,error}` e controlla l'esito di Resend (prima ignorato):
in produzione la chiave RESEND mancante = errore esplicito, non fallimento silenzioso.
`loginEmail`/`resend` mostrano l'errore invece di bloccare l'utente sulla pagina di verifica.
Rimosso `src/lib/auth/login-otp.ts` (modulo OTP duplicato e mai usato). Il path live è
interamente cookie-based (`src/lib/auth/otp-cookie.ts`).

### B. Correzioni deontologiche forensi — `f45ce8b`, `8876dfc`, `f3d6653`, `14aebcb`, `da3638b`
Modello "una veste sola — Avvocato": RegulaeOS è lo **strumento** con cui l'Avvocato eroga la
consulenza, non un software venduto. Fonte: documento utente "correzioni per la conformità
deontologica forense" (art. 18 L.247/2012 + CDF).
- **Facciata**: footer riscritto (via "RegulaeOS S.r.l."; identifica l'Avvocato + P.IVA); rimossa
  ovunque la formula "gli output non sono parere legale **finché non validati**" (implicava parere
  reso via software) → sostituita con: *output = elaborazioni di lavorazione interne; il parere e i
  documenti di conformità sono prestazione professionale resa dall'Avvocato nell'ambito di un
  incarico*. Applicata a: ChiEroga, Informativa AI, Termini, ExportFooter, onboarding.
- **Pricing**: rinominato "Prezzi"→"Piani di assistenza"; rimosso "abbonamento"→"retainer di
  assistenza continuativa"; FAQ e nota legale riformulate (parcella professionale, non licenza).
- **Post-login**: `AIOutputLabel` ora marca gli output "Bozza interna di lavorazione" + nota
  deliverable finale reso dall'Avvocato; Legal Assistant etichettato "reperimento normativo, non
  pareri".
- **Nome generico**: rimosso "Avv. Umberto Mottola" da TUTTA la UI → "l'Avvocato" / "the Lawyer".
  (Verificato: zero occorrenze nel sorgente.) Identificazione via P.IVA + iscrizione all'Ordine.
- **Gate deliverable**: `src/lib/deontology/deliverable-gate.ts` (`isFinalExportBlocked`, flag
  `NEXT_PUBLIC_DELIVERABLE_GATE`, **default OFF**) + `DeliverableGateGuard` (montato in
  `src/app/dashboard/layout.tsx`) che con flag ON blocca `window.print()` e i download `a[download]`
  su TUTTI i tool. Default OFF = nessun effetto per l'Avvocato titolare (unico utente attuale).

### C. Traduzione bilingue IT/EN — 13 unità
Home (Hero, PlatformSection, + 9 sezioni), **shell dashboard** (`dash`), **landing/overview**
(`dashHome`), e **8 tool**:
`incident`, `nist-ai-rmf`, `deployer-dashboard`, `resilience`, `qms`, `assessment`,
`trust-passport`, `assessment-export`.

---

## 2. Da dove ripartire: TRADUZIONE — ~20 tool rimasti

I tool dashboard ancora **da tradurre** (ordinati per dimensione, righe di `page.tsx`):

```
506  drift-monitor        1015 questionnaire       1379 inventory
519  agid-acn             1043 logvault            1538 docugen
778  transparency         1119 conformity          1593 classifier
792  prohibited           1167 gpai                1893 fria
865  oversight            1237 l132                2150 dpia
887  art50-kit            1251 risk-manager
917  literacy
970  data-audit
```

**Casi speciali:**
- `legal-assistant`: ha SOLO la label deontologica (`tDeon`), il **corpo UI è da tradurre**.
- `risk-manager`: NON tradotto (il match "useT" era `useTTS`, un hook TTS — falso positivo).
- Componenti condivisi `src/components/assessment/*` (UnifiedIntake, SharedSpine, DpiaBranch,
  FriaBranch, UnifiedDraftPanel, AssessmentStepper, ecc.): usati da assessment/dpia/fria — da
  tradurre come cluster quando fai `dpia`/`fria`.
- Altre pagine dashboard fuori da `tools/` con testo IT: `compliance-ops/*`, `post-market`,
  `dossier`, `evidence-layer`, `notifications`, `modules/*`, `onboarding` (parziale).
- ~18 pagine pubbliche fuori home (products, risorse, scanner, roi, privacy, cookie-policy, ecc.)
  ancora IT-only.

---

## 3. Infrastruttura i18n (già pronta, non serve toccarla)

- `src/i18n/config.ts` — locali `it`|`en`, default `it`, cookie `regulaeos_locale`.
- `src/i18n/dictionaries.ts` — dizionari per **namespace** (`it: {...}, en: {...}`), fallback
  `locale → it → chiave`. **Ogni tool = 1 namespace** (`toolIncident`, `toolQms`, …).
- `src/i18n/LocaleProvider.tsx` — `useT(ns)` per i client component; `useLocale()`.
- `src/i18n/server.ts` — `getT(ns)` / `getLocale()` per i server component.
- Levetta IT|EN già in Nav; cambio lingua = cookie + `router.refresh()`.

## 4. Ricetta di traduzione per ogni tool (pattern rodato)

1. `import { useT } from "@/i18n/LocaleProvider";`
2. In cima al componente: `const t = useT("tool<Nome>");`
3. Aggiungi il namespace in `dictionaries.ts` **sia `it` che `en`** (stesse chiavi).
4. Sostituisci ogni stringa UI hardcoded con `{t("chiave")}` (incluse `placeholder`, `title`,
   `aria-label`, `alt`, toast, messaggi d'errore).
5. `npx tsc --noEmit -p tsconfig.json` deve passare.
6. Verifica in browser IT **e** EN (cookie `regulaeos_locale`, viewport ≥1024 per la dashboard —
   sotto scatta il `MobileGate`).
7. Commit singolo per tool: `feat(i18n): dashboard bilingue — tool X (namespace toolX)`.

### Gotchas ricorrenti (importanti)
- **Array module-scope con testo** (es. `STAGES`, `FUNCTIONS`, `templateSections`): convertirli in
  `buildX(t)` DENTRO il componente, oppure rendere via `t()` per chiave. Non lasciare testo a
  livello modulo.
- **Chiavi di matching stabili**: se un array è usato anche per logica (find/filter per titolo),
  NON matchare sul titolo tradotto — introdurre un `id`/`tplId` stabile (vedi `qms` per l'esempio:
  pre-popolamento per `tplId` con fallback al vecchio titolo IT).
- **Shadowing di `t`**: attenzione ai `.map(t => ...)` che ombreggiano il `t` di `useT` — rinominare
  la var (es. `th`, `tpl`). Capitato in `assessment-export` e `qms`.
- **`<strong>` inline nel testo**: usare `dangerouslySetInnerHTML={{__html: t("chiave")}}` (testo
  dal nostro dizionario, sicuro). Vedi `chiEroga.body1/2`, `trust-passport.disclaimer`.
- **Data layer NON tradotto in questo pass** (coerente): output generati dall'AI, titoli scadenze
  (`REGULATORY_DEADLINES`), label in `lib/*` (es. `lib/resilience/*` per minacce/robustezza/
  pilastri). Segnalati nei commit; sono un pass separato.
- Nomi prodotto (Risk Manager, DocuGen, LogVault, GPAI, FRIA, DPIA…) e riferimenti articoli
  (Art. X, Allegato/Annex) **restano invariati**. Terminologia EN allineata alla versione ufficiale
  del Reg. (UE) 2024/1689.

---

## 5. Follow-up aperti (non bloccanti)

1. **P.IVA**: placeholder `[•]` in footer / Termini / Informativa AI — inserire il numero reale.
2. **Gate download**: infrastruttura pronta, flag `NEXT_PUBLIC_DELIVERABLE_GATE=on` per attivarlo
   quando esisterà un accesso "cliente" (oggi OFF, l'Avvocato esporta normalmente). La cornice
   "bozza interna" è comunque già sempre visibile.
3. **Sez. 1,2,5,6,7 del documento deontologico** (no SRL, regime forfettario, marchio a nome
   persona fisica, parere COA Napoli, RC professionale): scelte legali/fiscali, fuori dal codice.
4. Le traduzioni EN vanno **validate dall'utente** (avvocato) — precisione legale.

## 6. Prompt suggerito per la nuova sessione

> Riprendi la traduzione bilingue IT/EN dei tool della dashboard di RegulaeOS.
> Leggi `HANDOFF-i18n-deontologia.md`. Già fatti: incident, nist-ai-rmf, deployer-dashboard,
> resilience, qms, assessment, trust-passport, assessment-export. Continua dai rimanenti
> (parti dai più piccoli: drift-monitor, agid-acn, transparency…), un commit per tool, seguendo
> la ricetta e i gotchas del §4.
