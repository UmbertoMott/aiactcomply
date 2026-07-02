# AIComply — Tool Audit Completo

> Generato il 2026-06-16. Riferimento: sidebar attuale + codebase `main`.  
> Scopo: analisi uno-per-uno di ogni voce della sidebar per identificare gap, inconsistenze e lavori pendenti.

---

## Legenda

| Campo | Significato |
|---|---|
| **Route** | URL effettivo nel browser |
| **File** | Percorso relativo da `src/` |
| **Righe** | Dimensione attuale del file |
| **Storage keys** | Chiavi localStorage usate |
| **AI (server action)** | Chiamate Vertex AI via `src/app/actions/` |
| **SystemSelector** | Componente selettore sistema integrato? |
| **Tema** | Light (#FAFAF9) o Dark (#0D1016) |
| **Stato** | ✅ Completo · ⚠️ Parziale · 🔴 Problemi noti |

---

## 1 · Dashboard (Home)

| | |
|---|---|
| **Route** | `/dashboard` |
| **File** | `app/dashboard/page.tsx` |
| **Art.** | — |
| **Tema** | Light |
| **SystemSelector** | No |
| **Stato** | ⚠️ Parziale |

### Contenuto attuale
Pagina di atterraggio con:
- Banner sistema attivo (legge `aicomply_classifier_result` — vecchio, non usa `useActiveSystem`)
- Suggerimenti contestuali AI (es. "Hai completato Classifier e Risk Manager, genera FRIA")
- Nessun KPI aggregato reale

### Problemi noti
- [ ] Legge ancora `aicomply_classifier_result` invece di `aicomply_active_system_id` → il sistema mostrato può non corrispondere al sistema selezionato nei tool
- [ ] Nessun dossier summary visibile a colpo d'occhio
- [ ] Suggerimenti hard-coded, non derivati dallo stato reale dei tool

---

## 2 · Inventario Sistemi AI

| | |
|---|---|
| **Route** | `/dashboard/tools/inventory` |
| **File** | `app/dashboard/tools/inventory/page.tsx` |
| **Art.** | Art. 6 |
| **Righe** | 902 |
| **Storage key** | `aicomply_ai_inventory` |
| **AI** | `draftAiSystem` (Vertex AI — bozza sistema da descrizione testuale) |
| **SystemSelector** | No (è la fonte dati del selector) |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- CRUD completo dei sistemi AI (aggiungi / modifica / elimina / clona)
- Ogni sistema ha: `id`, `name`, `owner`, `description`, `status`, `tier`, `role`, `dualRoleFlag`, `completedObligations[]`, `nextReview`, ecc.
- AI Copilot: descrizione testo libero → genera bozza strutturata `AISystem`
- Tier selector con label normativa e base giuridica
- Obblighi tracciati per sistema

### Problemi noti
- [ ] `aicomply_active_system_id` non viene scritto da questa pagina → se l'utente aggiunge il primo sistema, deve andare in un tool per vederlo selezionato
- [ ] Nessun link diretto ai tool per sistema (es. "Apri Risk Manager per questo sistema")
- [ ] Il campo `tierBasis` include `[verify against current AI Act text]` ma non viene sanitizzato nella UI

---

## 3 · Triage

| | |
|---|---|
| **Route** | `/dashboard/triage` |
| **File** | `app/dashboard/triage/page.tsx` |
| **Art.** | Art. 5 / 6 / 51 |
| **Righe** | 1255 |
| **Storage keys** | `aicomply_classifier_result`, `aicomply_prohibited_result`, `aicomply_org_profile` |
| **AI** | No (logica deterministica locale) |
| **SystemSelector** | No (è il punto di ingresso per classificare) |
| **Tema** | Light ← **riferimento di design per tutti i tool** |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Wizard 4 step: Contesto → Sistema → Persone → Deployment → Risultato
- Calcola `riskTier`: `prohibited | high | limited | minimal | gpai`
- Scrive `aicomply_classifier_result` con `systemName`, `riskLevel`, `roleConfirmed`, `urgentActions[]`, `applicableArticles[]`
- Scrive `aicomply_prohibited_result` con `verdict`
- Scrive `aicomply_org_profile` (gpaiDetected, PA flags)
- Design token di riferimento: `#0D1016`, `rgba(0,0,0,0.40)`, card `#ffffff`, border `rgba(0,0,0,0.07)`

### Problemi noti
- [ ] Scrive su `aicomply_classifier_result` (singolo sistema) ma **non su** `aicomply_ai_inventory` — i risultati del Triage non vengono aggiunti all'inventario
- [ ] Un secondo Triage sovrascrive il primo senza storico
- [ ] Non legge `aicomply_active_system_id` → non sa su quale sistema dell'inventario sta lavorando

---

## 4 · Risk Manager / Risk Register

| | |
|---|---|
| **Route** | `/dashboard/tools/risk-manager` |
| **File** | `app/dashboard/tools/risk-manager/page.tsx` |
| **Art.** | Art. 9 |
| **Righe** | 944 |
| **Storage keys** | `aicomply_risk_register_v1`, `aicomply_risk_manager_chat_v3` |
| **AI** | `riskManagerChat` (Vertex AI — chat contestuale sul risk register) |
| **SystemSelector** | ✅ Integrato |
| **Banner extra** | `ProviderTransitionAlertBanner` |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Risk register con rischi CRUD (id, categoria, descrizione, probabilità, impatto, misure)
- Chat AI RAG-based per consulenza su rischi specifici
- Cross-read: legge `aicomply_classifier_result` per system context
- Scritto da: FRIA (legge `aicomply_risk_register_v1`), XAI, Post-Market

### Problemi noti
- [ ] `aicomply_risk_register_v1` non è scopato per sistema — se hai 3 sistemi in inventario, il Risk Register è unico
- [ ] Chat history persiste in `_v3` ma non viene resettata al cambio sistema
- [ ] ProviderTransitionAlertBanner legge il suo storage indipendentemente dal sistema attivo

---

## 5 · Risk Manager / FRIA

| | |
|---|---|
| **Route** | `/dashboard/tools/fria` |
| **File** | `app/dashboard/tools/fria/page.tsx` |
| **Art.** | Art. 27 |
| **Righe** | 1322 |
| **Storage keys** | `aicomply_fria_document`, `aicomply_classifier_result` (read) |
| **AI** | `draftFria` (Vertex AI — genera bozza FRIA da risk register + classifier) |
| **SystemSelector** | ✅ Integrato |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Documento FRIA strutturato: 6 sezioni (Descrizione → Scopo → Rischi → Misure → Conclusione → Firma)
- Bozza AI: legge `aicomply_risk_register_v1` + `aicomply_classifier_result`
- Export PDF/DOCX
- `aiConfirmed` per ogni sezione generata dall'AI
- Wizard step con progress bar

### Problemi noti
- [ ] Storage non scopato per sistema (stesso problema di Risk Register)
- [ ] Se `aicomply_risk_register_v1` è vuoto, la bozza AI genera contenuto generico non utile
- [ ] Nessun link bidirezionale verso Risk Register (non aggiorna i rischi dopo la FRIA)

---

## 6 · Risk Manager / DPIA

| | |
|---|---|
| **Route** | `/dashboard/tools/dpia` |
| **File** | `app/dashboard/tools/dpia/page.tsx` |
| **Art.** | Art. 35 (GDPR) / correlato Art. 9 AI Act |
| **Righe** | 1854 |
| **Storage key** | `aicomply_dpia_result` |
| **AI** | `draftDpiaSections`, `checkPriorConsultation`, `parseIntakeContext` (3 server actions Vertex AI) |
| **SystemSelector** | ✅ Integrato |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- DPIA completa: intake → analisi rischi privacy → misure → consultazione preventiva
- `parseIntakeContext`: AI estrae info strutturate da descrizione libera
- `draftDpiaSections`: genera sezioni DPIA da intake + classificatore
- `checkPriorConsultation`: AI valuta se è necessaria consultazione preventiva GDPR Art. 36
- Export strutturato

### Problemi noti
- [ ] File più grande del codebase (1854 righe) — candidato a split in sub-componenti
- [ ] `aicomply_dpia_result` non scopato per sistema
- [ ] Non legge `aicomply_risk_register_v1` (DPIA e Risk Register non sono collegati)

---

## 7 · DocuGen AI

| | |
|---|---|
| **Route** | `/dashboard/tools/docugen` |
| **File** | `app/dashboard/tools/docugen/page.tsx` |
| **Art.** | All. IV |
| **Righe** | 1269 |
| **Storage keys** | `docugen_state`, `aicomply_docugen_record`, `aicomply_classifier_result` (read) |
| **AI** | `checkAnnexIVGaps`, `validateDocuGenCoherence`, `assessChangeImpact` (3 server actions) |
| **SystemSelector** | ✅ Integrato |
| **Banner extra** | `ProviderTransitionAlertBanner` |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Generazione documentazione tecnica AI Act Allegato IV
- 7 sezioni: descrizione sistema → dati → architettura → accuratezza → cybersecurity → human oversight → cambiamenti
- Gap analysis AI: confronta bozza con requisiti Allegato IV
- Coerenza: cross-check tra sezioni
- Change impact: valuta impatto modifiche su documentazione esistente
- `aicomply_docugen_record` letto da: Authorized Representative, Trust Center

### Problemi noti
- [ ] `docugen_state` ≠ `aicomply_docugen_record` — due storage key per la stessa pagina (legacy)
- [ ] Non scopato per sistema
- [ ] ProviderTransitionAlertBanner non conosce il sistema attivo selezionato

---

## 8 · Qualità Dati

| | |
|---|---|
| **Route** | `/dashboard/tools/data-audit` |
| **File** | `app/dashboard/tools/data-audit/page.tsx` |
| **Art.** | Art. 10 |
| **Righe** | 806 |
| **Storage keys** | Via `loadDataAuditRecord` / `saveDataAuditRecord` (lib dedicata) |
| **AI** | `draftGovernancePracticeDocumentation`, `analyzeBiasIndicators` (Vertex AI) |
| **SystemSelector** | ✅ Integrato (`checkProhibited={false}`) |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Upload dataset CSV (training / validation / test) — solo profiling, dati NON salvati
- Governance practices checklist (Art. 10): 8 aree (provenienza, etichettatura, bias, qualità, ecc.)
- Categorie speciali Art. 9 GDPR (dati sensibili)
- AI: genera documentazione per ogni pratica + analisi bias da profilo CSV
- Export al dossier

### Problemi noti
- [ ] `checkProhibited={false}` — unico tool che non blocca i sistemi prohibited. Valutare se corretto (Art. 10 non si applica a sistemi vietati)
- [ ] Storage non scopato per sistema
- [ ] Il profilo CSV viene scartato dopo l'analisi (corretto) ma la documentazione AI non cita quale dataset era stato caricato

---

## 9 · Deployer Dashboard

| | |
|---|---|
| **Route** | `/dashboard/tools/deployer-dashboard` |
| **File** | `app/dashboard/tools/deployer-dashboard/page.tsx` |
| **Art.** | Art. 26 |
| **Righe** | 267 |
| **Storage keys** | `aicomply_deployer_rec_v1` (via lib) |
| **AI** | No |
| **SystemSelector** | No — usa ancora banner custom |
| **Banner extra** | `ProviderTransitionAlertBanner` |
| **Tema** | Light |
| **Stato** | ⚠️ Parziale |

### Contenuto attuale
- Checklist obblighi deployer Art. 26 (registrazione, monitoraggio, segnalazione, formazione)
- Link a deep-link Post-Market (`?tab=incidents`)
- ProviderTransitionAlertBanner

### Problemi noti
- [ ] **File più corto del codebase (267 righe)** — contenuto molto limitato rispetto all'art. 26 che ha 10 paragrafi
- [ ] **Manca SystemSelector** — non è stato incluso nella migrazione (controlla le pagine aggiornate)
- [ ] Non ha AI assistance
- [ ] Esiste anche `/dashboard/tools/deployer-dashboard/[systemId]/page.tsx` (route dinamica) — relazione non chiara con la pagina base

---

## 10 · Scadenze

| | |
|---|---|
| **Route** | `/dashboard/compliance-ops/deadlines` |
| **File** | `app/dashboard/compliance-ops/deadlines/page.tsx` |
| **Art.** | — (aggregatore cross-normativo) |
| **Righe** | 525 |
| **Storage keys** | `aicomply_timeline_prefs`, `aicomply_timeline_copilot_confirmed`, `aicomply_ai_inventory` (read), vari read da altri tool |
| **AI** | `prioritizeDeadlines` (Vertex AI — prioritizzazione AI delle scadenze) |
| **SystemSelector** | No — legge direttamente `loadInventory()` |
| **Tema** | Light (convertito) |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Scadenze statiche AI Act (da `deadline-constants.ts`) filtrate per tier utente
- Scadenze dinamiche (da `buildDynamicDeadlines`) calcolate da: inventory, Provider Transition, AR
- Timeline con dot, filtri per stato (urgente / in arrivo / future / passate)
- Copilot AI: prioritizzazione e raggruppamento scadenze
- Vista cronologica o AI

### Problemi noti
- [ ] `buildDynamicDeadlines` legge direttamente da localStorage senza passare per `useActiveSystem` — calcola le scadenze su TUTTI i sistemi mescolati
- [ ] Scadenza "Pratiche vietate e alfabetizzazione AI" Art. 5 è già passata (499 giorni fa) e appare sempre in cima — potrebbe essere nascosta o archiviata automaticamente

---

## 11 · LogVault

| | |
|---|---|
| **Route** | `/dashboard/tools/logvault` |
| **File** | `app/dashboard/tools/logvault/page.tsx` |
| **Art.** | Art. 12 |
| **Righe** | 937 |
| **Storage keys** | `aicomply_oversight_record_v1` (read per auto-detect), storage interno LogVault (lib) |
| **AI** | `suggestEventSeverity`, `parseLogFile`, `analyzeLogCoverage` (Vertex AI) |
| **SystemSelector** | ✅ Integrato |
| **Tema** | Light |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Registro eventi sistema AI in deployment (log operativi, anomalie, metriche)
- Auto-detection da `aicomply_oversight_record_v1`
- AI: classifica severità evento, parse file log, analisi copertura logging
- Feed a Post-Market: `detectDraftIncidentsFromLogVault()` legge LogVault e crea bozze incidenti
- **VINCOLO CRITICO**: Non salva contenuto integrale dei log — solo metadati aggregati

### Problemi noti
- [ ] Non scopato per sistema — tutti i sistemi condividono lo stesso log
- [ ] La relazione con Post-Market è unidirezionale (LogVault → Post-Market) ma non c'è feedback inverso
- [ ] `aicomply_oversight_record_v1` è scritto da quale tool? (Oversight/Transparency) — la chain non è documentata in-app

---

## 12 · Post-Market (Art. 72–73)

| | |
|---|---|
| **Route** | `/dashboard/post-market` |
| **File** | `app/dashboard/post-market/page.tsx` |
| **Art.** | Art. 72 (monitoraggio) + Art. 73 (notifica incidenti) |
| **Righe** | 2502 |
| **Storage keys** | `post_market_incidents`, `post_market_plan`, `aicomply_pmm_plan_v1`, `aicomply_risk_register_v1` (read) |
| **AI** | `proposePMMPlan`, `draftPostMarketReport` (Vertex AI) |
| **SystemSelector** | No |
| **Deep link** | `?tab=incidents`, `?tab=monitoring`, `?tab=plan`, `?incident=<id>` |
| **Tema** | Light |
| **Stato** | ⚠️ Parziale |

### Contenuto attuale
- **3 tab**: Incidenti (Art. 73) · Piano Art. 72 · Monitoraggio (Art. 72)
- Tab Incidenti: CRUD incidenti, classificazione severità AI, rapporto Art. 73(4), deep link per `?incident=<id>`
- Tab Piano: checklist monitoraggio con frequenze
- Tab Monitoraggio: dashboard metriche, reportistica con AI
- Deep link URL-based: `useSearchParams()` + `<Suspense>` — implementato in PROMPT AX
- Auto-detection incidenti da LogVault

### Problemi noti
- [ ] **File più grande del progetto (2502 righe)** — urgente split in sub-componenti per manutenibilità
- [ ] **SystemSelector mancante** — nessun selettore sistema in questa pagina
- [ ] `post_market_incidents` ≠ `aicomply_pmm_plan_v1` — due storage diversi nella stessa pagina (legacy + nuovo)
- [ ] SEED_INCIDENTS hardcoded caricati al primo accesso — potrebbero confondere l'utente reale
- [ ] Non scopato per sistema

---

## 13 · EUDB (Registrazione EU Database)

| | |
|---|---|
| **Route** | `/dashboard/compliance-ops/eudb` |
| **File** | `app/dashboard/compliance-ops/eudb/page.tsx` |
| **Art.** | Art. 49 |
| **Righe** | 897 |
| **Storage key** | `aicomply_eudb_draft_v2` (via `EUDB_DRAFT_KEY`) |
| **AI** | Server action per bozza campi EUDB (Vertex AI) |
| **SystemSelector** | ✅ Integrato |
| **Tema** | Light (convertito) |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Form registrazione EU AI Database (Art. 49): 8 sezioni obbligatorie
- AI Copilot: genera bozza da dati sistema (`aicomply_classifier_result` + `docugen_record`)
- `aiConfirmed` per ogni campo AI-generato
- Export XML/PDF per submission
- Letto da: Trust Center (sezione `eudb`)

### Problemi noti
- [ ] Non scopato per sistema — `aicomply_eudb_draft_v2` è unico
- [ ] La submission effettiva verso il database EU non è implementata (stub)
- [ ] Legge ancora da `aicomply_classifier_result` (vecchio) invece di `useActiveSystem`

---

## 14 · Repr. Autorizzato (Authorized Representative)

| | |
|---|---|
| **Route** | `/dashboard/compliance-ops/authorized-rep` |
| **File** | `app/dashboard/compliance-ops/authorized-rep/page.tsx` |
| **Art.** | Art. 22 |
| **Righe** | 952 |
| **Storage key** | `aicomply_authorized_rep_record` (via `AR_RECORD_KEY`) |
| **AI** | Server action per bozza mandato e verifica requisiti |
| **SystemSelector** | ✅ Integrato |
| **Tema** | Light (convertito) |
| **Stato** | ✅ Completo |

### Contenuto attuale
- Wizard: verifica obbligo AR → dati rappresentante → bozza mandato → firma
- AI: genera bozza mandato da dati DocuGen + sistema
- Legge `aicomply_docugen_record` (DocuGen output)
- Scrive su `aicomply_ai_inventory` (aggiorna sistema con AR info)
- Letto da: Scadenze (buildDynamicDeadlines), Trust Center, Provider Transition

### Problemi noti
- [ ] Se `aicomply_docugen_record` è vuoto, la bozza AI è generica
- [ ] Non scopato per sistema (AR_RECORD_KEY unico)
- [ ] La firma è simulata (checkbox) — non c'è integrazione con DocuSign o equivalente

---

## 15 · Provider Transition

| | |
|---|---|
| **Route** | `/dashboard/compliance-ops/provider-transition` |
| **File** | `app/dashboard/compliance-ops/provider-transition/page.tsx` |
| **Art.** | Art. 28 |
| **Righe** | 539 |
| **Storage keys** | `provider_transition_answers`, `provider_transition_modifications`, `provider_transition_obligations` |
| **AI** | No |
| **SystemSelector** | ✅ Integrato |
| **Tema** | Light (convertito) |
| **Stato** | ✅ Completo |

### Contenuto attuale
- **3 sezioni**: Verifica transizione (6 domande Sì/No/Incerto) → Registro Modifiche → Obblighi Provider
- Verdetto: `deployer` | `provider` | `risk` | `unclear`
- Registro Modifiche: source `manual | logvault_auto` — LogVault auto-entries NON settano `is_substantial`
- Obblighi provider derivati automaticamente da: DocuGen, EUDB, Post-Market
- Banner `ProviderTransitionAlertBanner` in Risk Manager, DocuGen, Deployer Dashboard
- Scadenza dinamica: 30 giorni dalla prima modifica sostanziale

### Problemi noti
- [ ] Non scopato per sistema
- [ ] `logvault_auto` entries richiedono review manuale per `is_substantial` ma non c'è notifica in-app
- [ ] Verdetto `unclear` non ha raccomandazioni specifiche

---

## 16 · Trust Center

| | |
|---|---|
| **Route** | `/dashboard/compliance-ops/trust-center` (editor) |
| **Route pubblica** | `/trust/[slug]` |
| **File editor** | `app/dashboard/compliance-ops/trust-center/page.tsx` |
| **File pubblico** | `app/trust/[slug]/TrustCenterPublicView.tsx` |
| **Art.** | Art. 13 / Art. 50 |
| **Righe** | 572 + 200 (public view) |
| **Storage key** | `aicomply_trust_center_v1` (oggetto per systemId) |
| **AI** | `generateTrustCenterSummary` (Vertex AI — 8 sezioni) |
| **SystemSelector** | No — usa `useSystemId()` hook interno |
| **Tema** | Light (convertito) |
| **Stato** | ✅ Completo |

### Contenuto attuale
- **8 sezioni pubblicabili**: risk_tier · intended_use · oversight · transparency · conformity · eudb · post_market · contact
- Editor con live preview (simulazione browser)
- Master switch pubblicazione (2 step: click → conferma ambra)
- `noindex: true` default (privacy by default)
- Slug alfanumerico per URL pubblico (`/trust/<slug>`)
- 404 per: slug sconosciuto, pagina non pubblicata, zero sezioni pubbliche
- Badge "Pubblicato" verde nella sidebar
- Letto da: `aicomply_classifier_result`, `docugen_record`, `oversight_record_v1`, `art50_record_v1`, `eudb_draft_v2`, `pmm_plan_v1`, `authorized_rep_record`, `org_profile`

### Problemi noti
- [ ] L'unico tool scopato per systemId (usa systemId interno, non `aicomply_active_system_id`)
- [ ] `TrustCenterPublicView` chiama `notFound()` in `useEffect` (client component) — pattern non convenzionale in Next.js App Router
- [ ] Il slug non ha access control reale — chiunque con il link può accedere se la pagina è pubblicata
- [ ] "Pagina riservata/invitati" mostrata come disabled con nota esplicativa (corretta scelta UX ma funzionalità mancante)

---

## Riepilogo Critico

### Gap sistematici (tutti i tool)

| Problema | Tool affetti | Priorità |
|---|---|---|
| Storage non scopato per sistema | Tutti tranne Trust Center | Alta |
| Legge `aicomply_classifier_result` invece di `useActiveSystem` | Triage, Dashboard, EUDB, FRIA, DocuGen | Alta |
| SystemSelector mancante | Post-Market, Deployer Dashboard | Media |
| File troppo grande (>1500 righe) | Post-Market (2502), DPIA (1854), Triage (1255) | Media |

### Tool da approfondire in priorità

1. **Post-Market** — il più critico: 2502 righe, no SystemSelector, SEED_INCIDENTS hardcoded, doppio storage legacy
2. **Deployer Dashboard** — solo 267 righe per Art. 26 (10 paragrafi), contenuto insufficiente, no SystemSelector
3. **Triage** — non scrive su inventory, sovrascrive classificazione precedente
4. **Dashboard (Home)** — legge vecchio storage, nessun KPI reale, suggerimenti hardcoded

### Tool completi e stabili
- Qualità Dati ✅
- LogVault ✅
- Risk Register ✅
- FRIA ✅
- Repr. Autorizzato ✅
- Provider Transition ✅
- Trust Center ✅
- Scadenze ✅
- EUDB ✅
