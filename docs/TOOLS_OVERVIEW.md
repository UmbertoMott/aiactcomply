# AIComply — Panoramica Completa dei Tool

> **Documento di riferimento interno** — descrive cosa fa ogni tool, stato attuale, cosa manca, note di miglioramento.
> Generato: 2026-06-09 | Stack: Next.js 16 App Router, TypeScript, Supabase, Vertex AI (Gemini 2.0 Flash)

---

## Architettura generale

```
/src/app/dashboard/
  triage/              → Step 0: Questionario guidato (replace del vecchio Classifier)
  tools/               → I tool operativi singoli
    classifier/        → AI Classifier (step 1 legacy, ancora presente)
    prohibited/        → Art. 5 Checker
    risk-manager/      → Risk Manager (Art. 9)
    fria/              → FRIA (Art. 27)
    dpia/              → DPIA (GDPR Art. 35)
    docugen/           → DocuGen AI (Art. 11)
    data-audit/        → Data Audit (Art. 10)
    logvault/          → LogVault (Art. 12)
    transparency/      → Transparency Kit (Art. 13)
    oversight/         → Human Oversight (Art. 14)
    resilience/        → Accuracy & Resilience (Art. 15)
    conformity/        → Conformity Assessment (Art. 43)
    qms/               → QMS Builder (Art. 17)
    gpai/              → GPAI Compliance (Art. 51–55)
    eudb/              → EUDB Registration (Art. 49)
    authorized-rep/    → Authorized Representative (Art. 22)
    provider-transition/ → Provider Transition (Art. 28)
    inventory/         → AI System Inventory (Art. 6 + Annex III) ← NUOVO
    l132/              → L.132/2025 Italia
    literacy/          → AI Literacy (Art. 4)
    art50-kit/         → Art. 50 Disclosure Kit
    nist-rmf/          → NIST AI RMF mapping
  post-market/         → Post-Market Monitoring (Art. 72–73)
  dossier/             → Dossier aggregato (preview + export)
  journey/             → Deadline Timeline (roadmap normativa)
  trust-center/        → Trust Center pubblico
  compliance-nexus/    → Compliance Hub (cruscotto globale)
  discovery/           → Discovery infrastruttura (GitHub/AWS/Azure)
```

### Storage pattern
Ogni tool salva il proprio risultato in `localStorage` via `writeToStorage(key, data)` (`src/lib/dossier/storage-schema.ts`).  
Il **Dossier** legge tutti i key e produce il Technical File aggregato.  
I tool multi-progetto usano `aicomply_p_{projectId}_{key}` come chiave scoped.

---

## 0. Triage (step 0 — entry point principale)

**Path:** `/dashboard/triage`  
**Art. EU AI Act:** Art. 5/6/51  
**Storage key:** `aicomply_classifier_result` (condiviso con Classifier)

### Cosa fa
Questionario guidato in 4 macro-aree → produce automaticamente un `TriageReport` con:
- `riskTier`: prohibited / high / limited / minimal / gpai
- `urgentActions[]`: azioni urgenti con articolo e deadline
- `applicableArticles[]`: obblighi applicabili
- `estimatedEffortDays`: stima giorni di lavoro
- `prohibitedFlags[]`: se ci sono segnali di pratiche vietate

**Step del questionario:**
1. **Context** — Ruolo (provider/deployer/importer/distributor), settore (HR, salute, finanza, PA…)
2. **System** — Tipo di output (decisioni, profiling, biometrico, ottimizzazione interna), GPAI?
3. **People** — Dati personali trattati, automazione decisionale (full/supporto/no), utenti finali
4. **Deployment** — Ambito geografico, fase (sviluppo/produzione/aggiornamento), segnali di rischio

### Output salvato
```ts
type ClassifierResult = {
  systemName: string
  riskLevel: "prohibited" | "high" | "limited" | "minimal" | "gpai"
  role: string
  urgentActions: { label, article, deadline, href }[]
  applicableArticles: { article, description, obligation }[]
  estimatedEffortDays: number
  completedAt: string
}
```

### Stato attuale
- ✅ Logica di classificazione completa (pure function `computeTriage`)
- ✅ Salva in storage condiviso con AI Classifier
- ✅ Segnali pratiche vietate → link diretto all'Art. 5 Checker
- ⚠️ **Non ha AI draft** — classificazione è 100% rule-based (intenzionale per accuratezza normativa)
- ❌ **Non legge dall'Inventory** — dovrebbe pre-popolare da `AISystem` già classificato

---

## 1. AI Classifier (legacy)

**Path:** `/dashboard/tools/classifier`  
**Art.:** Art. 6  
**Storage key:** `aicomply_classifier_result`

### Cosa fa
Analisi più avanzata del Triage, con:
- Scan repository simulato (mock + file reali)
- `AIRiskScorer` — scoring multi-dimensionale
- `scanProfiling` / `exemptionEngine` — rilevamento esenzioni
- Generazione **Conformity Passport** (firma crypto, UUID, export JSON/PDF)
- `matchCodeToLaw` — mapping automatico codice → articoli applicabili
- `generatePolicyCard` / `translateToHumanText` — output leggibile

### Stato attuale
- ✅ Feature-rich, molto completo
- ✅ Genera passaporto verificabile (crypto)
- ⚠️ Duplica parte del Triage — nel journey è step successivo, non sostitutivo
- ❌ Scan repository è ancora mock — non si connette a GitHub/AWS reali (vedi Discovery)

---

## 2. Art. 5 Checker (Pratiche vietate)

**Path:** `/dashboard/tools/prohibited`  
**Art.:** Art. 5 EU AI Act  
**Storage key:** `aicomply_prohibited_result`  
**Urgenza:** 🔴 immediata (in vigore dal 2 febbraio 2025)

### Cosa fa
Checklist di 8 pratiche vietate dall'Art. 5. Per ogni pratica:
- Domanda in linguaggio chiaro
- 3 risposte: **No** / **Sì** / **Non sono sicuro**
- Verdict finale: `clear` / `flag` / `block`

**Pratiche coperte:**
1. Manipolazione subliminale o ingannevole
2. Sfruttamento di vulnerabilità (età, disabilità)
3. Social scoring governativo
4. Inferenza emozioni su luoghi di lavoro/istruzione
5. Profilazione biometrica per caratteristiche protette
6. Identificazione biometrica real-time in spazi pubblici (LE)
7. Identificazione biometrica remota a posteriori (LE)
8. Predizione criminosa basata su profiling

### Output salvato
```ts
type ProhibitedCheckResult = {
  verdict: "clear" | "flag" | "block"
  answers: Record<string, "yes" | "no" | "unsure">
  completedAt: string
}
```

### Stato attuale
- ✅ Completo e normativo
- ✅ Badge Art. 50 (AI output label) su risultati
- ❌ **Mancano le esenzioni Art. 5(3)** — es. uso LE con autorizzazione giudiziaria
- ❌ Non genera report esportabile con evidenza

---

## 3. Risk Manager

**Path:** `/dashboard/tools/risk-manager`  
**Art.:** Art. 9, 27, 35  
**Storage key:** `aicomply_risk_manager_result`

### Cosa fa
Sistema completo di gestione rischi con 5 fasi:

**Fase 1 — Scoping:** definisce sistema, contesto, categorizza rischi
- **AI Suggestions** (Gemini 2.0): a partire da nome/descrizione/riskLevel → suggerisce 5 scenari di rischio con `likelihood` 1–5, `severity` 1–5, `affectedGroups`, `mitigationHint`

**Fase 2 — Risk Register:** tabella rischi con:
- `severity` × `probability` → `riskScore` (matrice 5×5)
- `residualRisk` → warning se residual > initial
- Categorie: technical / operational / fundamental_rights / gdpr / security / business

**Fase 3 — Montecarlo:** simulazione statistica
- Input: distribuzione di probability per ogni rischio
- Output: P95, P99, distribuzione attesa perdite
- Visualizzazione istogramma

**Fase 4 — Drift:** Population Stability Index (PSI)
- Confronta distribuzioni temporali feature
- Alert se PSI > 0.2 (drift significativo)

**Fase 5 — GPAI Risk:** assessment specifico per modelli GPAI
- Valutazione sistemic risk, copyright, cybersecurity

**Extra:** Sanction Tracker — monitora sanzioni EU AI Act nel mercato

### Output salvato
```ts
type RiskManagerResult = {
  systemName: string
  riskLevel: string
  overallScore: number
  overallRating: "low" | "medium" | "high" | "critical"
  risks: RiskItem[]
  monteCarloResult: MonteCarloResult | null
  completedAt: string
}
```

### Stato attuale
- ✅ Molto robusto, logica normativa corretta
- ✅ AI suggestions con Gemini (badge "✦ AI — verifica")
- ✅ Auto-save 30s + version history
- ❌ **Fase Montecarlo** — i numeri sono simulati, non basati su dati reali dell'utente
- ❌ Drift monitor non si connette a dati reali (vedi Drift Monitor separato)
- ❌ Manca export PDF del report completo

---

## 4. FRIA (Fundamental Rights Impact Assessment)

**Path:** `/dashboard/tools/fria`  
**Art.:** Art. 27 EU AI Act  
**Storage key:** `aicomply_fria_result`  
**Obbligatorio per:** enti pubblici + deployer privati che gestiscono servizi pubblici

### Cosa fa
FRIA completa in 8 sezioni:
1. **Contesto** — scopo sistema, deployment, natura
2. **Diritti fondamentali** — impatto su 9 diritti (dignità, non-discriminazione, privacy, tutela consumatori, accesso servizi pubblici, ricorso effettivo, libertà espressione, uguaglianza, bambini)
3. **Scenari** — scenari di impatto con `affectedPersons`, `likelihood` 1–5
4. **Stakeholder** — consultazione stakeholder, note
5. **Misure mitigazione** — per ogni diritto impattato
6. **Monitoring** — piano di monitoraggio continuo
7. **Engagement** — log consultazioni effettuate
8. **Summary** — riepilogo pubblico generato automaticamente

**AI Draft (Gemini 2.0):** genera bozza fasi 1–3 da nome/descrizione sistema + dati da Risk Manager. Risultato con badge "✦ AI — verifica" su ogni campo.

### Output salvato
```ts
type FRIAResult = {
  completed: boolean
  completedAt: string
  overallRisk: "low" | "medium" | "high" | "critical"
  completeness: number  // 0-100
}
```

### Stato attuale
- ✅ FRIA più completa disponibile su mercato SaaS EU
- ✅ AI draft con contesto da Risk Manager
- ✅ Auto-save + version history
- ❌ **Export PDF/Word** mancante — critico per enti pubblici che devono allegarlo
- ❌ Non ha workflow di approvazione (sign-off multi-stakeholder)

---

## 5. DPIA (Data Protection Impact Assessment)

**Path:** `/dashboard/tools/dpia`  
**Art.:** GDPR Art. 35  
**Storage key:** `aicomply_dpia_result`

### Cosa fa
DPIA in 6 fasi:
1. **Screening** — 9 criteri EDPB per determinare se la DPIA è obbligatoria
2. **Assets** — catalogo dei trattamenti dati (tipo dato, base giuridica, ritenzione)
3. **Threats** — minacce (likelihood × impact = risk score), misure di mitigazione
4. **Proportionality** — verifica proporzionalità trattamento (finalità, necessità, bilanciamento)
5. **Rights** — impatto sui diritti degli interessati
6. **Report** — DPIA finale con tutti i campi richiesti GDPR

Pre-popola da:
- `ClassifierResult` → nome sistema, tipo dati
- `DataAuditResult` → dataset, feature sensibili

### Stato attuale
- ✅ Struttura EDPB-compliant
- ✅ Sign-off panel con firma digitale
- ❌ **No AI assistance** — tutto manuale (priorità alta miglioramento)
- ❌ Non genera DPIA in formato EDPB/garante italiano esportabile

---

## 6. DocuGen AI

**Path:** `/dashboard/tools/docugen`  
**Art.:** Art. 11 (+ Allegato IV)  
**Storage key:** `aicomply_docugen_result`

### Cosa fa
Genera il **Technical File** (Allegato IV EU AI Act) strutturato in sezioni:

| Sezione | Contenuto | Allegato IV ref |
|---------|-----------|-----------------|
| general_description | Descrizione generale sistema | IV(1) |
| intended_purpose | Scopo, utenti, contesto deployment | IV(1)(a) |
| system_architecture | Architettura tecnica | IV(1)(b) |
| training_data | Dati addestramento, fonti | IV(2)(a) |
| performance_metrics | Accuracy, metriche valutazione | IV(2)(b) |
| risk_management | Collegamento a Risk Manager | IV(2)(c) |
| human_oversight | Misure sorveglianza | IV(2)(d) |
| cybersecurity | Misure sicurezza | IV(2)(e) |
| changes_log | Modifiche sostanziali | IV(3) |

Ogni sezione: editor di testo + stato (empty/draft/done) + indicatore completamento.

**DB sync:** salva anche su Supabase (`/api/technical-file`) se disponibile.  
**Auto-save:** 30s + version history.  
**Export PDF:** gated su piano a pagamento.

### Stato attuale
- ✅ Struttura Allegato IV completa
- ✅ Pre-popola da Triage/Classifier (nome sistema, risk level)
- ✅ Sync DB + localStorage fallback
- ❌ **Nessuna generazione AI per sezione** — l'utente scrive tutto manualmente
- ❌ Export PDF è solo un gate commerciale, non ancora implementato

---

## 7. Data Audit

**Path:** `/dashboard/tools/data-audit`  
**Art.:** Art. 10  
**Storage key:** `aicomply_data_audit_result`

### Cosa fa
Audit della qualità e bias del dataset in 2 modalità:

**Modalità Demo:**
- 3 dataset simulati (CV Screener, Loan Risk, Medical Diagnosis)
- Report bias con metriche: demographic parity, equalized odds, accuracy parity, calibration
- Analisi temporal drift con PSI
- Column lineage (provenienza feature)

**Modalità Reale:**
- Upload CSV dall'utente
- Parsing + analisi statistica locale
- **AI Bias Report (Gemini 2.0):** analisi da CSV preview → identifica colonne sensibili, valori mancanti, rischi bias, quality score 0–100, raccomandazione principale

### Output salvato
```ts
type DataAuditResult = {
  datasetName: string
  biasScore: number
  qualityScore: number
  sensitiveFeatures: string[]
  completedAt: string
}
```

### Stato attuale
- ✅ Bias metrics normative (demographic parity ecc.)
- ✅ AI bias report da CSV
- ✅ Sign-off panel
- ❌ **Demo data è simulata** — non si connette a database reali
- ❌ Manca analisi su più dataset in parallelo
- ❌ Nessun export report dettagliato

---

## 8. LogVault

**Path:** `/dashboard/tools/logvault`  
**Art.:** Art. 12, 14  
**Storage key:** `aicomply_logvault_result`

### Cosa fa
Sistema di logging audit-proof con 3 sezioni:

**Config:**
- Nome sistema, numero log da generare
- **Kill Switch** (Art. 14) — hold 3s per attivare arresto sistema
- **AI Severity Suggestion (Gemini 2.0):** inserisci descrizione evento → AI suggerisce severity (low/medium/high/critical) + rationale + flag normativo (es. "Art. 73 — notifica entro 15gg se danno grave")

**Demo Log:**
- Genera catena di log con hash SHA256 concatenati (tamper-evident)
- Livelli: debug / info / warning / error / critical
- Verifica integrità catena in tempo reale
- Simulazione tamper → evidenzia hash rotto
- Kill Switch → inserisce evento EMERGENCY_STOP

**Import:**
- Import JSON o CSV di log esistenti
- Stessa visualizzazione e verifica integrità

**DB sync:** `GET /api/logvault/ingest` per capire se ci sono log da DB.

### Stato attuale
- ✅ Kill Switch è feature unica sul mercato
- ✅ Hash chain tamper-evident visiva
- ✅ AI severity suggestion on-blur
- ❌ **Log sono simulati/importati** — non si integra con sistemi reali di logging (es. Datadog, CloudWatch)
- ❌ Nessun alert automatico per eventi critici
- ❌ Retention policy non implementata

---

## 9. Transparency Kit

**Path:** `/dashboard/tools/transparency`  
**Art.:** Art. 13  
**Storage key:** `aicomply_transparency_result`

### Cosa fa
3 componenti di trasparenza:

**1. Explain (XAI):**
- Simulazione SHAP values per 3 decisioni campione
- Visualizzazione feature importance con barre bipolari (positive/negative)
- Per ogni decisione: output, confidence, feature più impattanti

**2. Nutrition Label:**
- "Etichetta nutrizionale AI" (ispirata alla nutrition label MIT)
- Campi: intended_purpose, training_data, accuracy, bias_flags, human_oversight

**3. Instructions for Use (Art. 13(3)):**
- 6 campi obbligatori: identità provider, performance specs, dati training, accuracy, oversight, lifecycle
- Editor testo + stato completamento

### Stato attuale
- ✅ SHAP demo visivamente efficace
- ✅ Tutti i campi Art. 13(3) coperti
- ❌ **SHAP è simulazione statica** — non calcola valori reali da modello
- ❌ Nutrition label non è esportabile come immagine/PDF
- ❌ Instructions for Use non genera documento Word/PDF

---

## 10. Human Oversight

**Path:** `/dashboard/tools/oversight`  
**Art.:** Art. 14  
**Storage key:** `aicomply_oversight_result`

### Cosa fa
Definisce e documenta i meccanismi di sorveglianza umana:

- **Oversight measures:** lista misure concrete (checkbox + descrizione)
  - Categorie: monitoring, intervention, logging, training, escalation
- **Intervention points:** punti specifici dove l'umano può intervenire
  - Con `trigger`, `responsible`, `maxResponseTime`
- **Simulation:** simulazione di un alert in produzione → testa il workflow
  - Stati: `alert_triggered` → `human_notified` → `reviewed` → `action_taken`
- **Sign-off:** firma digitale del responsabile oversight

Pre-popola da `RiskManagerResult` (scenari di rischio) e `ResilienceResult`.

### Stato attuale
- ✅ Workflow simulazione alert funzionante
- ✅ Integrazione con Risk Manager
- ❌ **No notifiche reali** — simulation è puramente visiva
- ❌ Manca integrazione con sistemi di ticketing (Jira, ServiceNow)

---

## 11. Accuracy & Resilience

**Path:** `/dashboard/tools/resilience`  
**Art.:** Art. 15  
**Storage key:** `aicomply_resilience_result`

### Cosa fa
**Red Team Testing** simulato:
- Libreria di 8+ attacchi: data poisoning, adversarial inputs, prompt injection, model inversion, membership inference, evasion, model extraction, supply chain
- Per ogni attacco: `severity` + `exploitability` + status (pass/fail/partial)
- `getDefenseHealth()` → score globale difese 0–100
- Soglia accuracy configurabile (default 95%)
- Fallback checks: cosa fare se accuracy cala sotto soglia

**Metriche output:**
- Accuracy threshold compliance
- Defense health score
- Attack surface coverage

### Stato attuale
- ✅ Concettualmente solido, cover Art. 15(4) cybersecurity
- ❌ **Tutti gli attacchi sono simulati** — non testa il modello reale
- ❌ Manca integrazione con framework red team reali (Garak, PyRIT)
- ❌ Non genera report tecnico esportabile

---

## 12. QMS Builder

**Path:** `/dashboard/tools/qms`  
**Art.:** Art. 17  
**Storage key:** `aicomply_qms_result`

### Cosa fa
Sistema di Gestione della Qualità in 13 sezioni (Art. 17(1)(a)–(m)):

| ID | Titolo | Art. |
|----|--------|------|
| compliance | Strategia conformità normativa | 17(1)(a) |
| design | Progettazione e controllo | 17(1)(b) |
| development | Sviluppo e garanzia qualità | 17(1)(c) |
| testing | Procedure di esame e convalida | 17(1)(d) |
| specs | Specifiche tecniche e norme | 17(1)(e) |
| data_mgmt | Gestione dati | 17(1)(f) |
| risk | Sistema gestione rischi | 17(1)(g) |
| monitoring | Monitoraggio post-market | 17(1)(h) |
| incidents | Segnalazione incidenti | 17(1)(i) |
| communication | Comunicazione con autorità | 17(1)(j) |
| records | Conservazione registrazioni | 17(1)(k) |
| resources | Gestione risorse | 17(1)(l) |
| accountability | Quadro di responsabilità | 17(1)(m) |

Ogni sezione: editor di testo + `completed` flag + sign-off finale.

### Stato attuale
- ✅ Tutte le 13 sezioni Art. 17 coperte
- ✅ Sign-off panel
- ❌ **Nessuna AI assistance** — tutto manuale (alta priorità miglioramento)
- ❌ Nessun template pre-compilato per settore (es. HR vs Healthcare)
- ❌ Manca export come documento QMS (ISO 9001-style)

---

## 13. Conformity Assessment

**Path:** `/dashboard/tools/conformity`  
**Art.:** Art. 43  
**Storage key:** `aicomply_conformity_assessment`

### Cosa fa
Determina il percorso di valutazione della conformità e genera la **EU Declaration of Conformity**:

1. **Path Determination** — calcola se self-assessment o third-party (notified body) basato su:
   - Risk tier, settore, tipo sistema, modifiche sostanziali
2. **Requirements Check** — checklist 15+ requisiti (documenti, test, misure tecniche)
3. **Evidence Collection** — aggrega evidenze da tutti gli altri tool (DocuGen, Risk Manager, LogVault…)
4. **Declaration of Conformity** — genera documento Art. 47 con:
   - Numero unico dichiarazione
   - Riferimenti normativi applicabili
   - Norme armonizzate utilizzate
   - Firma e data

**Submit to Authority** — `submitToAuthority()` in `src/lib/compliance/gateway.ts`.

### Stato attuale
- ✅ Logica percorso conformità corretta
- ✅ Aggrega evidenze da tutti i tool
- ❌ **`submitToAuthority()` è stub** — non si connette a EUDB reale
- ❌ Declaration of Conformity non genera PDF firmato digitalmente

---

## 14. GPAI Compliance

**Path:** `/dashboard/tools/gpai`  
**Art.:** Art. 51–55 EU AI Act  
**Storage key:** `aicomply_gpai_result`

### Cosa fa
Compliance specifica per **General Purpose AI Models** in 5 sezioni:

1. **Model Profile** — informazioni modello (nome, provider, parametri, training data, capabilities)
2. **Transparency Obligations** — documentazione tecnica per downstream providers (Art. 53)
3. **Copyright Policy** — policy rispetto copyright dati training (Art. 53(1)(c))
4. **Systemic Risk Assessment** — se FLOP > 10²⁵ → obbligo valutazione rischi sistemici (Art. 55)
5. **Incident Reporting** — workflow segnalazione incidenti AI Office UE

### Stato attuale
- ✅ Copre obblighi GPAI specifici (Art. 51–55)
- ✅ Distingue GPAI normale da GPAI sistemico
- ❌ **Soglia FLOP** non verificata automaticamente
- ❌ Manca collegamento con AI Office EU per notifiche reali

---

## 15. EUDB Registration

**Path:** `/dashboard/tools/eudb`  
**Art.:** Art. 49  
**Storage key:** `aicomply_eudb_result`

### Cosa fa
Registrazione nel **Database EU AI Act** (EUDB) gestito dalla Commissione Europea:

- Compila record di registrazione con tutti i campi obbligatori Art. 49
- Pre-popola da DocuGen, Conformity, AuthRep
- Genera **ID Registrazione** simulato (formato: `EU-AIA-YYYY-NNNNN`)
- Copy-paste dei campi per inserimento manuale nel portale EUDB reale
- Status tracking: draft → submitted → registered

### Stato attuale
- ✅ Campi conformi ad Art. 49
- ⚠️ **Non si connette al portale EUDB reale** (non ancora disponibile pubblicamente)
- ❌ ID generato è simulato — il portale reale assegnerà il suo ID

---

## 16. Authorized Representative

**Path:** `/dashboard/tools/authorized-rep`  
**Art.:** Art. 22 EU AI Act  
**Storage key:** `aicomply_auth_rep_result`

### Cosa fa
Configura e documenta il **Rappresentante Autorizzato UE** per provider non-UE:

- Determina se necessario (provider fuori UE + sistema offerto in UE)
- Dati rappresentante (nome, indirizzo, contatto, mandato)
- Genera bozza **Mandato di Rappresentanza** (testo legale)
- Genera **Dichiarazione di Disponibilità** documentazione tecnica
- Sign-off

### Stato attuale
- ✅ Workflow completo
- ❌ Testi legali non localizzati per paese UE (solo IT)
- ❌ Manca integrazione con Conformity (cross-link automatico)

---

## 17. Provider Transition

**Path:** `/dashboard/tools/provider-transition`  
**Art.:** Art. 28 EU AI Act  
**Storage key:** `aicomply_provider_transition_result`

### Cosa fa
Gestisce la transizione di responsabilità da provider a deployer in caso di **modifica sostanziale** (Art. 25/28):

- **Checklist modifica sostanziale**: determina se la modifica richiede nuovo ruolo provider
- **Transfer Agreement**: bozza accordo di trasferimento obblighi
- **Obligations Mapping**: chi è responsabile di cosa dopo la transizione
- **Notification Workflow**: notifica all'autorità competente
- Dual-role flag: se l'organizzazione diventa sia provider che deployer

### Stato attuale
- ✅ Copre Art. 25 (substantial modification) e Art. 28
- ❌ **Bozza accordo non è documento legalmente validato**
- ❌ Manca workflow di firma bi-laterale

---

## 18. AI System Inventory (NUOVO)

**Path:** `/dashboard/tools/inventory`  
**Art.:** Art. 6 + Annex III  
**Storage key:** `aicomply_ai_inventory`

### Cosa fa
Registro centrale di **tutti i sistemi AI** dell'organizzazione:

**Tipo di dato `AISystem`:**
- `id`: sys-001, sys-002…
- `tier`: prohibited / high_risk / limited / minimal / gpai / gpai_systemic / unclassified
- `role`: provider / deployer / importer / distributor / authorized_rep / product_manufacturer
- `source`: manual / ai_draft / import / clone
- `dualRoleFlag`: Art. 25 substantial modification
- `completedObligations[]`: IDs obblighi completati negli altri tool
- `roleBasis` + `tierBasis`: sempre con `[verify against current AI Act text]`

**Funzionalità:**
1. **Grid dashboard** — schede con striscia colorata per tier, progress bar obblighi
2. **AI Draft** (Gemini 2.0) — descrizione libera → pre-compila tutti i campi + confidenceLevel (high/medium/low) + badge "✦ AI — verifica"
3. **Known Systems dictionary** — 8 profili vendor (Workday, HireVue, GitHub Copilot, Salesforce, Azure OpenAI, SAP SuccessFactors, Cohere/RAG interno, Chatbot)
4. **Import CSV** — bulk import → tutti con tier "unclassified" (no silent classification)
5. **ClassifyModal** — workflow dedicato classificazione tier/role
6. **EditModal** — modifica completa di tutti i campi

**Guardrail normativo:** nessun sistema può essere salvato con tier ≠ "unclassified" senza conferma esplicita dell'utente.

### Stato attuale
- ✅ Appena implementato (PROMPT AD)
- ❌ **Non collegato al Triage** — idealmente Triage dovrebbe creare automaticamente un AISystem nell'Inventory al completamento
- ❌ Progress bar obblighi non legge da localStorage degli altri tool (solo campo manuale)
- ❌ Manca clone di sistema (per varianti dello stesso modello)

---

## 19. Post-Market Monitoring

**Path:** `/dashboard/post-market`  
**Art.:** Art. 72–73 EU AI Act  
**Storage key:** non persistito in localStorage (state locale)

### Cosa fa
Sistema di monitoraggio post-mercato in 3 sezioni:

**Incidents:**
- Registro incidenti con severity (critical/high/medium/low) + status (pending/reported/investigating/resolved/closed)
- Ogni incidente: titolo, sistema, data, descrizione, autorità notificata
- **Art. 73 Report:** genera rapporto strutturato con root cause + misure correttive
- **Notifica autorità**: log notifica con timestamp

**Monitoring Checks:**
- Checklist di controlli periodici (frequenza: daily/weekly/monthly/quarterly/annual)
- Ogni check: articolo di riferimento, ultimo eseguito, prossima scadenza
- Alert visivo se check scaduto

**Feedback Collection:**
- Raccolta feedback utenti finali
- Categorizzazione per tipo (accuracy, bias, usability, safety)

**Reads from:** `RiskManagerResult` per pre-popolare rischi noti.

### Stato attuale
- ✅ Struttura Art. 72–73 completa
- ✅ Rapporto incidente Art. 73(4) strutturato
- ❌ **No persistenza** — ricaricando la pagina si perde tutto
- ❌ **No alert automatici** — le scadenze sono calcolate ma non inviano notifiche
- ❌ Non si integra con sistemi di monitoring reali (PagerDuty, Grafana)

---

## 20. L.132/2025 (Italia)

**Path:** `/dashboard/tools/l132`  
**Art.:** Legge 132/2025 (legge AI italiana)  
**Storage key:** `aicomply_l132_result`  
**Flag:** `paItaly` — visibile solo se attivato in OrgProfile

### Cosa fa
Compliance alla legge AI italiana in aree specifiche:

- **HR Transparency** — obblighi trasparenza uso AI in ambito HR (Art. 4 L.132)
- **Deepfake** — policy e misure contro contenuti sintetici
- **Accessibilità** — requisiti accessibilità sistemi AI per PA
- **MOG 231** — Modello Organizzativo Gestione 231 per sistemi AI
- DB sync: salva su Supabase (`/api/mog231`)

### Stato attuale
- ✅ Copertura legge italiana
- ⚠️ Legge 132/2025 è recentissima — contenuto potrebbe richiedere aggiornamenti
- ❌ MOG 231 è molto basilare

---

## 21. AI Literacy

**Path:** `/dashboard/tools/literacy`  
**Art.:** Art. 4 EU AI Act  
**Storage key:** `ai_literacy_store`  
**Urgenza:** 🔴 in vigore dal 2 febbraio 2025

### Cosa fa
Gestione del piano formativo AI per il personale:

- **Training Records** — log sessioni formative per persona/team
- **Categorie:** fondamenti AI / rischi e bias / normativa / strumenti aziendali / etica
- **Ruoli target** (Art. 4 L.132/2025 + MOG 231): dirigenti, manager AI, developer, HR, legal/compliance, tutti i dipendenti
- **Metrics:** ore totali, copertura ruoli, completamento per categoria
- **Export:** lista attestati formazione
- DB sync: `DBStatusBadge` indica se dati sono da DB o localStorage

### Stato attuale
- ✅ Struttura tracciamento completa
- ❌ **Non si integra con LMS reali** (Docebo, Moodle, Cornerstone)
- ❌ Nessun contenuto formativo interno — solo tracking
- ❌ Attestati non sono documenti formali

---

## 22. Art. 50 Kit (Disclosure AI)

**Path:** `/dashboard/tools/art50-kit`  
**Art.:** Art. 50 EU AI Act  
**Urgenza:** 🔴 obbligo dal 2 agosto 2026  
**Storage key:** non persistito

### Cosa fa
Kit per la disclosure AI verso utenti finali:
- Banner/modal di disclosure (testo pronto)
- Metadati machine-readable (JSON-LD, meta tags)
- Watermarking sintetico (audio/video)
- Checklist implementazione per sito web

**`MachineMarkers` component** — già iniettato nel layout dashboard (meta tags + JSON-LD Art. 50 su ogni pagina).

### Stato attuale
- ✅ MachineMarkers già attivi in produzione
- ❌ Kit non è ancora completo come tool interattivo
- ❌ Manca generatore codice copia-incolla per siti esterni

---

## 23. NIST AI RMF Mapping

**Path:** `/dashboard/tools/nist-rmf`  
**Storage key:** non persistito

### Cosa fa
Mappa i 4 framework NIST AI RMF → articoli EU AI Act corrispondenti:

| NIST Function | Descrizione | Tool collegati |
|---------------|-------------|----------------|
| GOVERN | Governance e accountability | Triage, QMS, Oversight |
| MAP | Identificazione contesto e rischi | Classifier, Risk Manager |
| MEASURE | Misurazione e analisi rischi | Data Audit, Resilience, XAI |
| MANAGE | Risposta e mitigazione rischi | LogVault, Post-Market, FRIA |

Per ogni subcategory NIST: link diretto al tool AIComply corrispondente.

### Stato attuale
- ✅ Mapping normativo accurato
- ❌ **Solo read-only** — non traccia completamento NIST subcategories
- ❌ Non genera NIST AI RMF report esportabile

---

## 24. Dossier

**Path:** `/dashboard/dossier`  
**Storage key:** aggrega tutti gli altri

### Cosa fa
**Aggregatore** di tutti i tool completati → Technical File EU AI Act:

- Legge da tutti i `STORAGE_KEYS` via `aggregateDossier()`
- `getDossierSections()` → 21 sezioni con status (complete/partial/empty)
- `getCompletionPercentage()` → progress globale %
- **Preview** documento (componente `DossierPreview` lazy-loaded)
- **Export** — gated su piano a pagamento
- DB sync: `appendEvidence()` su ogni sezione completata

### Stato attuale
- ✅ Aggregazione completa da tutti i tool
- ✅ Progress bar globale visibile anche in sidebar
- ❌ **Preview è testo grezzo** — non è formattato come documento ufficiale
- ❌ Export PDF non implementato (solo gate commerciale)

---

## 25. Deadline Timeline (Journey)

**Path:** `/dashboard/journey`  
**Storage key:** legge da tutti gli altri (read-only)

### Cosa fa
Roadmap normativa in **5 fasi** con stato completamento:

| Fase | Titolo | Tool |
|------|--------|------|
| 1 | Scopri & Classifica | Discovery, AI Literacy, Art.5 Checker, AI Classifier |
| 2 | Valuta i Rischi | Risk Manager, Data Audit, DPIA, FRIA |
| 3 | Documenta | DocuGen AI, LogVault, QMS Builder |
| 4 | Implementa | Transparency, Oversight, Resilience, Art.50 Kit, L.132/2025 |
| 5 | Certifica & Monitora | XAI Lab, Conformity, Post-Market, Compliance Hub |

Ogni tool mostra stato: done ✓ / pending ○ basato su localStorage.

### Stato attuale
- ✅ Overview normativa chiara
- ❌ **Inventory non è ancora incluso** nella timeline
- ❌ Scadenze normative hardcoded — non si aggiornano da official sources

---

## 26. Discovery

**Path:** `/dashboard/discovery`  
**Storage key:** `aicomply_discovery_sources`

### Cosa fa
Mappa i sistemi AI nella infrastruttura aziendale:
- Connettori: GitHub, AWS SageMaker, Azure ML, Hugging Face, GCP Vertex
- Scan repository per pattern AI (import torch, from transformers, openai…)
- Export lista sistemi scoperti → feed all'Inventory

### Stato attuale
- ⚠️ **Connettori sono mock** — nessuna integrazione reale con GitHub/AWS/Azure
- ❌ Non crea AISystem nell'Inventory automaticamente

---

## 27. Trust Center

**Path:** `/dashboard/trust-center`  
**Storage key:** non persistito

### Cosa fa
Pagina pubblica-facing per comunicare la postura di compliance AI:
- Badge livello conformità
- Lista documenti pubblici (Technical File summary, FRIA summary, Declaration of Conformity)
- Link a certificazioni

### Stato attuale
- ⚠️ Placeholder — non genera pagina pubblica reale
- ❌ Non si connette al Dossier per popolarsi automaticamente

---

## 28. Compliance Hub (Nexus)

**Path:** `/dashboard/compliance-nexus`  
**Storage key:** legge da tutti

### Cosa fa
Cruscotto globale con:
- Stato complessivo conformità (% per fase)
- Scadenze normative (timeline EU AI Act 2024–2027)
- Alert per obblighi urgenti
- Quick links ai tool non completati

### Stato attuale
- ✅ Panoramica globale utile
- ❌ Timeline scadenze è hardcoded — non personalizzata per riskTier

---

## Infrastruttura trasversale

### AI Integration (Vertex AI / Gemini 2.0 Flash)
| Tool | AI Feature | Server Action |
|------|-----------|---------------|
| Risk Manager | Scenario generation (Art. 9) | `suggestRiskScenarios.ts` |
| Data Audit | Bias report da CSV (Art. 10) | `analyzeCsvBias.ts` |
| FRIA | Draft fasi 1–3 (Art. 27) | `draftFria.ts` |
| LogVault | Severity suggestion (Art. 73) | `suggestEventSeverity.ts` |
| Inventory | Full draft da testo libero | `draftAiSystem.ts` |

Tutte le azioni usano `generateText()` da `src/lib/rag/rag-vertex.ts` → Gemini 2.0 Flash via REST + service account JWT.

### Session Persistence
- `useAutoSave(toolId, state, saveFn)` — salva ogni 30s, badge "Salvato automaticamente"
- `VersionHistoryPanel` — mostra le ultime 20 versioni, pulsante "Ripristina"
- `ProjectSwitcher` — dropdown per selezionare progetto attivo; chiavi storage scoped per progetto

### Evidence Layer
`appendEvidence(toolId, data)` — ogni tool chiama questa funzione al sign-off → crea record evidence nel Dossier.

### Sign-off
`SignOffPanel` — componente condiviso con:
- Data firma, nome, ruolo
- Checkmark "confermo di aver revisionato"
- Salva `completedAt` nel result

---

## Priorità di miglioramento (suggerite)

### 🔴 Alta priorità (gap normativi)

| Problema | Tool | Impatto |
|----------|------|---------|
| Post-Market non persiste dati | Post-Market | Dati incidenti persi al reload |
| Export PDF mancante | DocuGen, FRIA, DPIA | Obbligatorio per audit |
| DPIA senza AI assistance | DPIA | Tool completamente manuale |
| QMS senza AI assistance | QMS | 13 sezioni tutte manuali |
| Inventory non collegato a Triage | Inventory + Triage | Workflow spezzato |
| `submitToAuthority()` è stub | Conformity | Registrazione EUDB non funziona |

### 🟡 Media priorità (UX e completezza)

| Problema | Tool | Impatto |
|----------|------|---------|
| Demo data simulata ovunque | Risk Manager, Data Audit, Resilience | Credibilità prodotto |
| Discovery connettori mock | Discovery | Feature principale non funziona |
| Obligation progress bar non legge da storage | Inventory | Dati obblighi sempre 0 |
| Scadenze normative hardcoded | Journey, Compliance Hub | Non si aggiorna automaticamente |
| FRIA manca export Word | FRIA | Enti pubblici ne hanno bisogno |

### 🟢 Bassa priorità (nice to have)

| Problema | Tool | Impatto |
|----------|------|---------|
| NIST RMF read-only | NIST RMF | Non traccia completamento |
| Trust Center placeholder | Trust Center | Feature pubblica non attiva |
| Literacy non si integra con LMS | Literacy | Tracking manuale |
| Art. 50 Kit incompleto | Art. 50 Kit | Manca generatore codice |

---

## Stack tecnico di riferimento

```
Framework:    Next.js 16 App Router
Language:     TypeScript (strict)
Auth:         Supabase Auth (JWT + MFA TOTP)
DB:           Supabase PostgreSQL
Storage:      localStorage (primary) + Supabase (sync)
AI:           Google Vertex AI — Gemini 2.0 Flash via REST
              src/lib/rag/rag-vertex.ts → generateText(prompt, options)
Styling:      Tailwind CSS + inline styles (design system custom)
Icons:        lucide-react
Animation:    framer-motion
PDF:          (non implementato — gate commerciale)
Deployment:   Vercel
Env vars:     VERTEX_SERVICE_ACCOUNT_JSON (full JSON service account)
              NEXT_PUBLIC_SUPABASE_URL
              NEXT_PUBLIC_SUPABASE_ANON_KEY
```
