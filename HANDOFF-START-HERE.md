# HANDOFF — i18n bilingue IT/EN dei tool dashboard RegulaeOS/AIComply

> **Leggi questo file per primo in una nuova chat: contiene tutto per riprendere senza partire da zero.**

## 0. Percorsi & git

- **Worktree (qui lavori su codice/git)**:
  `/Users/umbertomottola/aicomply/.claude/worktrees/regulaeos-dashboard-i18n-0da9c9`
  → è un **git worktree** isolato. Esegui TUTTI i comandi da qui. NON fare `cd` al repo principale.
- **Repo originale (solo per il dev server)**:
  `/Users/umbertomottola/Desktop/open code - ai act saas/aicomply`
- **Branch**: `claude/regulaeos-dashboard-i18n-0da9c9` — remote `git@github.com:UmbertoMott/aiactcomply.git`
- Stato: **tutto committato e pushato** (HEAD `51109de`, working tree pulito, allineato a origin).
- **Dev server** (Next.js 16, Turbopack crasha): dal repo *originale* →
  `npm run dev -- --webpack` (porta 3000). La dashboard è **auth-gated**: la verifica UI si fa loggati; il gate di verifica di base è `tsc` + parità chiavi. Cambio lingua: cookie `regulaeos_locale` (`it`/`en`).

## 1. Sistema i18n (come funziona)

- `src/i18n/dictionaries.ts` — file centrale (~538 KB). Struttura: `DICTIONARIES = { it: { <namespace>: {...} }, en: { <namespace>: {...} } }`.
  `translate(locale, ns, key)` = `en[ns][key] ?? it[ns][key] ?? key` (fallback en→it→chiave). È **pura**, usabile anche server-side (route API).
- `src/i18n/LocaleProvider.tsx` — `useT(ns)` → `(key)=>string`; `useLocale()` → `"it"|"en"`.
- **Niente interpolazione**: componi con template literal — `` `${t("a")} ${n} ${t("b")}` ``.
- HTML inline: `dangerouslySetInnerHTML={{__html: t("k")}}`.

### Pattern consolidati (IMPORTANTE, riusali)
1. **Componente client**: `const t = useT("toolX")`; sostituisci le stringhe con `t("key")`; aggiungi il namespace `toolX` in **entrambi** `it` ed `en`.
2. **Render-keyed**: array module-scope che sono anche chiavi di storage o hanno id stabili → tieni il const in IT e traduci a render con `t(\`prefix_${id}\`)`. **Mai** matchare sul testo tradotto.
3. **Badge/funzioni module-scope** (es. `riskBadge`, `severityBadge`) → passa `t` come argomento: `riskBadge(level, t)`.
4. **Componenti-badge veri** (`<AiBadge/>`, `<SectionCard/>`, `Sel`) → hook proprio `useT(...)`.
5. **Shadow gotcha**: parametri `.map(t => ...)` / `fn(t: string)` ombreggiano l'hook `t` → rinomina (`tab`/`trg`/`th`/`x`) prima di aggiungere `const t`, **oppure** aliasa l'hook (in DPIA page l'hook è `const tr = useT("toolDpia")` perché `t`=threat ovunque).
6. **Data-layer NON tradotto** (lasciato IT): output AI/server-action, contenuto documenti esportati (registri .txt/JSON), valori `lib/*` generati, payload evidence/storage, array che diventano storage con id **random** (es. `DEFAULT_TRIGGERS`, `STANDARD_*_CHECKS`, `THREAT_PATTERNS`), nomi diritti da `FUNDAMENTAL_RIGHTS`. I riferimenti legali (`ref`/`legalRef` tipo "Art. 27(1)(a)", "WP248") restano invariati.

### Pattern lib locale-aware (per contenuto voluminoso da template)
Usato per il questionario guidato e per `computeDpiaProgress`:
```ts
// nel file lib/*-template.ts
export function getFriaSubpoints(locale: string, t: (k:string)=>string): FriaSubPoint[] {
  if (locale !== "en") return [...FRIA_SUBPOINTS];        // IT = const canonico
  return FRIA_SUBPOINTS.map(sp => ({ ...sp,
    label: t(`${sp.id}_label`), question: t(`${sp.id}_q`),
    examples: sp.examples.map((_, i) => t(`${sp.id}_ex${i}`)) }));
}
```
- Il dizionario ha SOLO il blocco **`en`** per questi namespace (`friaGuided`, `dpiaGuided`): in IT il getter ritorna il const, in EN risolve le chiavi. Niente duplicazione dell'IT.
- Consumer: passano `useLocale()` + `useT("friaGuided")` al getter. Le funzioni progress accettano `(doc, locale, t)`.

### Verifica (fai sempre prima di committare)
```bash
npx tsc --noEmit -p tsconfig.json          # deve essere verde
# parità chiavi IT/EN per un namespace (esempio):
node -e 'const d=require("fs").readFileSync("src/i18n/dictionaries.ts","utf8"); /* estrai it/en di NS e confronta set */'
```
Per i namespace guided (EN-only) verifica invece che ogni chiave richiesta dai getter esista nel blocco `en` (script usati nei commit precedenti).

## 2. FATTO (tutto committato + pushato)

### Tool page (namespace dedicato)
- **classifier** `toolClassifier` (153) — refactor `annexIAnswer` a valori stabili yes/no/unsure.
- **fria** page.tsx `toolFria` (406) — 5 fasi complete.
- **dpia** page.tsx `toolDpia` (540) — 6 step WP248. Hook aliasato `tr`.
- (sessioni precedenti già mergiate: incident, nist-ai-rmf, deployer, resilience, qms, assessment, trust-passport, assessment-export, drift-monitor, agid-acn, transparency, prohibited, oversight, art50, literacy, data-audit, questionnaire, logvault, conformity, gpai, l132, risk-manager*, inventory, docugen)

### Cluster condiviso `src/components/assessment/*` — namespace `assessmentShared` (263)
Tutti e 10: AssessmentStepper, AssessmentSharedHeader, CorrelatedRisksPanel, UnifiedIntake, GuidedQuestion, AssessmentSignOff, SharedSpine, DpiaBranch, FriaBranch, UnifiedDraftPanel.

### Figli fria/dpia (flusso standard) — dentro toolFria/toolDpia
FRIA: ContextCatalog, RightImpactAIDraft, FriaGapCheck, RightsCatalog, NextStepGuide.
DPIA: ProportionalityBalance, DpiaGapCheck, ScreeningCatalog, ThreatCatalog, ThreatImpactAIDraft, DPIATemplateViewer, NextStepGuide.

### Cluster guided-mode + lib
- Fria/DpiaGuidedMode, Fria/DpiaGuidedChat, Fria/DpiaLivePreview, Fria/DpiaProgressRail.
- `computeDpiaProgress(doc, t)` locale-aware (sidebar rail + template viewer bilingui) — namespace toolDpia (`dpp_*`, `art357_*`, `tvmeta_*`).
- **Questionario guidato COMPLETO** (le domande legali vere):
  - `friaGuided` (184 chiavi EN): 40 subpoint × label/domanda/esempi + 7 sezioni + META.
  - `dpiaGuided` (223 chiavi EN): 43 subpoint + 6 sezioni + 9 criteri WP248 + META.
  - Terminologia dai testi ufficiali forniti: **GDPR Reg. 2016/679** (OJ L119, EN) e **AI Act Reg. 2024/1689**.
- **Export PDF DPIA guidata** `/api/dpia-guided/export-pdf`: locale-aware (client invia `locale`, route usa `translate()` server-side + i getter). +5 chiavi `pdf_`.
- `optionExamples` (chat guidate) riconosce prefissi IT **e** EN.

Verifica: `grep -L useT src/components/{fria,dpia,assessment}/*.tsx` → **vuoto**. Parità: toolClassifier 153 · toolFria 406 · toolDpia 540 · assessmentShared 263 (IT=EN, 0 duplicati). tsc verde.

## 3. RIMANE DA FARE

1. **Validazione EN da parte dell'utente (avvocato)** su TUTTO il testo legale tradotto (Art. 6/27/35/36, WP248, Carta UE/CEDU, GDPR) — priorità alta, è machine translation.
2. **`/api/fria-guided/export-pdf` NON esiste** (bug pre-esistente: il bottone "Genera PDF" della FRIA guidata dà 404). Non è i18n: va **creata** la route (specchio di quella DPIA, che è già bilingue → usala come modello con `getFriaSubpoints`/`getFriaSections`/`getFriaTemplateMeta`).
3. **`/api/compliance/export-pdf`** (PDF Risk Register) — ancora IT-only.
4. Pagine dashboard **fuori da `tools/`** (dossier, modules, ecc.) e **~18 pagine pubbliche** fuori dalla home — ancora IT-only.
5. Eventuale **Pull Request** verso `main` per raccogliere il lavoro (branch pronto).

## 4. Note operative
- Commit: uno per componente/unità, messaggio `feat(i18n): ...`, chiudi con
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Prima di editare un namespace già presente cerca l'ancora giusta (le stringhe uguali si ripetono tra namespace: usa una riga unica del namespace target come anchor).
- File di storia dettagliata precedente: `HANDOFF-i18n-dashboard.md` (nello stesso worktree).
