# HANDOFF — i18n dashboard (branch `claude/regulaeos-dashboard-i18n-0da9c9`)

Continuazione della traduzione bilingue IT/EN dei tool della dashboard RegulaeOS.
Complementare a `HANDOFF-i18n-deontologia.md` (sessione precedente).

## Stato branch
- Questo branch è nato da `dd71371` (home bilingue) + il commit `notifications`, poi
  **mergiato** con `claude/home-translation-continued-5b8cc8` per riportare gli 8 tool
  già tradotti + le correzioni deontologiche. Da lì, tradotti **15 tool aggiuntivi**.
- Gate per ogni tool: `npx tsc --noEmit` verde + parità chiavi IT/EN (script node) + commit singolo.
- Runtime verificato: cookie `regulaeos_locale` → `useT` → `dictionaries.ts` funziona (nav home
  passa a EN). I tool dashboard sono auth-gated (non visualizzabili senza login), ma il
  meccanismo è identico agli 8 tool già mergiati e verificati in browser.

## Tradotti in QUESTA sessione (namespace)
drift-monitor (`toolDriftMonitor`), agid-acn (`toolAgidAcn`), transparency (`toolTransparency`),
prohibited (`toolProhibited`), oversight (`toolOversight`), art50-kit (`toolArt50`),
literacy (`toolLiteracy`), data-audit (`toolDataAudit` + `DataAuditPanels.tsx`),
questionnaire (`toolQuestionnaire`), logvault (`toolLogvault` + `LogVaultPanels.tsx`),
conformity (`toolConformity`), gpai (`toolGpai`), l132 (`toolL132`),
risk-manager (`toolRiskManager` — **solo chrome+fasi**, vedi sotto), inventory (`toolInventory`).

Già tradotti nella sessione precedente (mergiati): incident, nist-ai-rmf, deployer-dashboard,
resilience, qms, assessment, trust-passport, assessment-export.

## RIMANENTI da tradurre (i 4 più grandi)
```
1538  docugen        1593  classifier
1893  fria           2150  dpia
```
+ componenti condivisi `src/components/assessment/*` (cluster DPIA/FRIA, vedi §4 handoff precedente).

## Decisioni di scope applicate (coerenti con "data-layer = pass separato")
- **Data-layer NON tradotto**: output generati dall'AI (chat, bozze), contenuto documenti
  esportati (registri .txt, JSON), label in `lib/*`, payload evidence/storage, e gli array
  che fungono anche da CHIAVI di storage (es. gpai Art.55 `fields`, MODAL_SOURCES inventory).
  Tradotti a render tramite `t()` keyed-by-id dove il valore serviva sia display che logica.
- **risk-manager**: tradotti header/tab/controlli/chat-UI/fasi. NON tradotti: PHASE_GUIDES
  (goal/examples/starters dettagliati), il componente `RiskRegisterGuidedMode`, il viewer
  documento e i contenuti chat AI. → follow-up.

## Ricetta (rodata su 15 tool)
1. `import { useT } from "@/i18n/LocaleProvider"` (+ `useLocale` se servono date localizzate).
2. `const t = useT("tool<Nome>")` in cima al/ai componente/i (sotto-componenti: hook proprio).
3. Array module-scope con testo → tradurre a render con `t(\`prefix_${id}\`)` per id STABILE
   (mai matchare sul testo tradotto; vedi gpai/l132/inventory).
4. `dangerouslySetInnerHTML={{__html: t("k")}}` per testo con `<strong>`/`<span>` inline.
5. Aggiungere il namespace in `dictionaries.ts` sia `it` che `en` (stesse chiavi).
6. `npx tsc --noEmit -p tsconfig.json` verde + check parità chiavi.
7. Commit singolo: `feat(i18n): dashboard bilingue — tool X (namespace toolX)`.

## Follow-up aperti (non bloccanti)
- Le traduzioni EN vanno **validate dall'utente** (avvocato) — precisione legale, in particolare
  FRIA/DPIA/L.132 e i testi con articoli.
- risk-manager: completare guide/guided-mode/viewer.
- Pagine dashboard fuori da `tools/` e ~18 pagine pubbliche fuori home ancora IT-only.
