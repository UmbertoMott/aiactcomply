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
risk-manager (`toolRiskManager` — **solo chrome+fasi**, vedi sotto), inventory (`toolInventory`),
docugen (`toolDocugen`).

Già tradotti nella sessione precedente (mergiati): incident, nist-ai-rmf, deployer-dashboard,
resilience, qms, assessment, trust-passport, assessment-export.

## FATTI dopo (questa sessione di continuazione)
- **classifier** (`toolClassifier`, 154 chiavi) — refactor annexIAnswer a valori stabili.
- **fria** page.tsx (`toolFria`, 284 chiavi) — 5 fasi complete. Componenti figli ancora IT.
- **dpia** page.tsx (`toolDpia`, 257 chiavi) — 6 step WP248. Render-keyed criteri/prop/rights/steps.
  Hook aliasato `tr` (evita shadow param `t`=threat). Componenti figli ancora IT.

## FATTO: cluster `src/components/assessment/*` COMPLETO (namespace `assessmentShared`, 263 chiavi)
Tutti e 10 i componenti condivisi (usati da FRIA/DPIA/assessment page):
AssessmentStepper, AssessmentSharedHeader, CorrelatedRisksPanel, UnifiedIntake,
GuidedQuestion, AssessmentSignOff, SharedSpine, DpiaBranch, FriaBranch, UnifiedDraftPanel.
Verifica: `grep -L useT src/components/assessment/*.tsx` → vuoto.

## FATTO: componenti figli del FLUSSO STANDARD (non-guided) — COMPLETI
FRIA (`toolFria`): ContextCatalog, RightImpactAIDraft, FriaGapCheck, RightsCatalog, NextStepGuide.
DPIA (`toolDpia`): ProportionalityBalance, DpiaGapCheck, ScreeningCatalog, ThreatCatalog,
  ThreatImpactAIDraft, DPIATemplateViewer, NextStepGuide.
Pattern: contenuto da lib/engine/server-action/array-persistiti = data-layer (IT);
tradotto solo il chrome. Badge module-scope ricevono `t`; NextStepGuide render-keyed
per stepKey (nsg_/dnsg_); STEP_DEFS resta IT per la chiamata server.

## RIMANENTI: SOLO il cluster GUIDED-MODE (UI conversazionale alternativa, ~2400 righe)
Appare solo quando l'utente passa a "modalità guidata". 8 componenti:
+ FRIA: `FriaGuidedMode` (332), `FriaGuidedChat` (370), `FriaLivePreview` (184), `FriaProgressRail` (170).
+ DPIA: `DpiaGuidedMode` (445), `DpiaGuidedChat` (506), `DpiaLivePreview` (418), `DpiaProgressRail` (154).
Nota: FriaProgressRail NON è reso in fria/page.tsx (solo un commento "style"); il rail
del flusso standard è inline nella page (già tradotto). Le live-preview rendono
molto contenuto da lib (data-layer) — tradurre solo il chrome.

+ `src/lib/dpia/dpia-progress.ts` + `src/lib/dpia/dpia-template.ts` — label/META rail/step/coverage
  (lib output; sidebar DPIA e parte del DPIATemplateViewer restano IT finché non tradotti). Pass separato.

### Gotcha assessmentShared (per continuità)
- Badge module-scope (riskBadge/severityBadge/lensBadge) → passa `t` come argomento.
- Componenti-badge veri (`<AiBadge/>`, `<ConfidenceBadge/>`, `<SectionCard/>`) → hook proprio `useT("assessmentShared")`.
- Array che diventano storage con id random (STANDARD_*_CHECKS in DpiaBranch, GuidedQuestion buttons)
  = data-layer: mantieni il valore IT, traduci solo il display (render-keyed o lookup).
- Nomi diritti da `FUNDAMENTAL_RIGHTS` (fria-engine) = data-layer.

**Gotcha fria (applica anche a dpia)**: parametri `.map((t)=>...)` e `fn(t: string)`
ombreggiano l'hook `t` — rinominare (tab/trg/x) prima di aggiungere `const t`.
Il componente module-scope `Sel` ha un proprio `useT` per il placeholder "— seleziona —".

**Gotcha classifier**: `annexIAnswer` è confrontato come stringa in `finalizeClassification`
(`annexIAnswer === "Sì — è safety component di prodotto Annex I"`) e usato come `value` dei radio.
Prima di tradurre le label, refactor a `{value:"yes"/"no"/"unsure", label}` con VALORE stabile,
e aggiornare il confronto a `=== "yes"`. (Stesso principio §4 gotcha "chiavi stabili".)
**Data-layer classifier**: output di `lib/semantic/*`, `lib/simulation/*`, passport/audit, Code-to-Law
map = generati/data → non tradurre; tradurre solo chrome (step0, brain-dump, mode selector, risultato,
discovery UI, esenzione, header).

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
