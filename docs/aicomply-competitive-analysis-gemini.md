# AIComply — Documento per Analisi Comparativa di Mercato

> Versione: giugno 2026 | Uso: input per analisi competitiva con Google Gemini  
> Precisione: tutte le feature sono verificate sul codice sorgente (non marketing)

---

## 1. IDENTITÀ DEL PRODOTTO

**Nome:** AIComply  
**Tipo:** SaaS web-app B2B per compliance normativa  
**Normativa coperta:** EU AI Act (Reg. UE 2024/1689) + Legge italiana 132/2025 + D.Lgs. 231/2001 (MOG 231)  
**Lingua:** 100% italiano (unico prodotto nel mercato europeo completamente in italiano)  
**Target primario:** PMI italiane, startup AI, compliance officer, studi legali, PA  
**Target secondario:** Enterprise, banche, assicurazioni, infrastrutture critiche (tramite self-hosting)  
**Stato attuale:** waitlist aperta, early access  
**URL produzione:** https://aicomply-omega.vercel.app  

### Pricing

| Piano | Prezzo | Incluso |
|-------|--------|---------|
| Scanner | €0 (gratuito, anonimo) | Scanner Art. 50 pubblico |
| Starter | €49/mese | 1 sistema AI, tutti i tool, dossier completo |
| Professional | €199/mese | 5 sistemi AI, Legal Assistant RAG, export avanzati |
| Enterprise (self-hosted) | negoziabile | Deploy on-premise/VPC, Ollama locale, nessun dato cloud |

---

## 2. STACK TECNOLOGICO

| Layer | Tecnologia |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth + DB | Supabase (PostgreSQL + RLS + GoTrue Auth) |
| LLM (cloud) | Gemini 2.0 Flash via Vertex AI REST |
| LLM (self-hosted) | Ollama (`llama3.1:8b` / `llama3.1:70b` / `mistral:7b`) |
| Embeddings (cloud) | Vertex AI `text-embedding-004` |
| Embeddings (self-hosted) | Ollama `nomic-embed-text` |
| RAG ingestione | Python (pdfminer, pytesseract, psycopg2) |
| Deploy (cloud) | Vercel |
| Deploy (self-hosted) | Docker Compose (postgres + postgrest + ollama + app) |
| Sicurezza | HMAC session signing, OTP email, RLS Supabase, CORS strict, IP hashing |

---

## 3. ARCHITETTURA FUNZIONALE

### 3.1 Layer dati condivisi

Ogni tool della dashboard scrive in tre layer sincronizzati:

1. **localStorage** — stato persistente client-side per ogni tool (chiavi tipo `aicomply_classifier_result`, `aicomply_risk_manager_result`, ecc.)
2. **Dossier Aggregato (Annex IV)** — documento tecnico EU AI Act costruito automaticamente da tutti i tool completati, esportabile
3. **Evidence Layer** — registro prove digitali con hash SHA-256, timestamp e firma del responsabile

### 3.2 Sistema di Synergy

Il **SystemContextBanner** (componente condiviso) appare in cima a ogni tool e:
- Mostra il nome e il tier di rischio del sistema classificato
- Mostra alert se il sistema è stato classificato come "pratica vietata" (Art. 5)
- Guida l'utente al Classifier se non ha ancora classificato il sistema

I tool si **pre-popolano automaticamente** dal Classifier: nome sistema, tier di rischio e settore vengono propagati a tutti i tool downstream (Risk Manager, FRIA, DPIA, Deployer, DocuGen, ecc.).

### 3.3 Copilot di compliance

Il **Compliance Copilot** (`/dashboard/copilot`) genera una roadmap personalizzata in base a 3 domande (profilo, tier di rischio, urgenza). La copertura di ogni step è verificata **in tempo reale** sullo storage reale dei tool — non su flag manuali.

### 3.4 DBStatusBadge

Badge visivo su ogni tool che indica la modalità operativa: **DB sincronizzato** / **Dati locali** / **Offline**. Si aggiorna automaticamente al ritorno su tab.

---

## 4. PAGINE PUBBLICHE (MARKETING)

| URL | Contenuto |
|-----|-----------|
| `/` | Landing page — hero, pain points, stepper feature, stats, tool gallery, CTA |
| `/pricing` | Tre piani con feature list dettagliata e CTA waitlist |
| `/waitlist` | Form raccolta early access: nome, email, azienda, ruolo, n. sistemi AI, piano |
| `/scanner` | Scanner Art. 50 **gratuito e anonimo** — analisi sito/prodotto AI |
| `/risorse` | Blog — guide pratiche EU AI Act in italiano |
| `/risorse/[slug]` | Articoli statici (SSG) con schema Article + FAQPage JSON-LD |

**Articoli pubblicati (giugno 2026):**
- "Scadenze AI Act 2025–2028: calendario aggiornato dopo il rinvio Omnibus" (2 giu 2026)
- "Cos'è un sistema AI ad alto rischio: la guida pratica all'Annex III" (3 giu 2026)

**SEO/GEO:**
- Schema.org: `Organization`, `SoftwareApplication` (con featureList + 3 Offer), `WebSite` + `SearchAction`, `Article`, `FAQPage`, `BreadcrumbList`
- `public/llms.txt` per AI crawlers (ChatGPT, Claude, Perplexity)
- Sitemap dinamica con lastmod reale degli articoli
- Canonical URL da env var `NEXT_PUBLIC_SITE_URL`

---

## 5. DASHBOARD APPLICATIVA — SEZIONI CORE

| URL | Funzione |
|-----|---------|
| `/dashboard` | Home — overview sistemi AI registrati + compliance score globale |
| `/dashboard/copilot` | Compliance Copilot — roadmap personalizzata, completamento verificato su storage reale |
| `/dashboard/triage` | **Triage Wizard 9 step** — classificazione rapida con branching logic (vedi §6.1) |
| `/dashboard/journey` | Compliance Journey — percorso passo-passo per articolo con status completamento |
| `/dashboard/discovery` | Scansione codebase e repository — rileva pattern AI nel codice |
| `/dashboard/dossier` | Dossier tecnico aggregato — tutte le sezioni Annex IV, score completamento |
| `/dashboard/evidence-layer` | Evidence Layer — prove digitali con hash + firma del responsabile |
| `/dashboard/compliance-nexus` | Nexus — mappa sinaptica tra tutti i tool con stato completamento |
| `/dashboard/post-market` | Post-Market Monitoring Art. 72 + Incident Reporting Art. 73 |
| `/dashboard/modules/aia-architect` | Doc Monitor — Art. 11 |
| `/dashboard/modules/guardian-agent` | Oversight Monitor — Art. 14 |
| `/dashboard/modules/trust-labeler` | AI Disclosure — Art. 50 |
| `/dashboard/modules/gpai` | GPAI Module avanzato |
| `/dashboard/modules/xai` | XAI Lab — Explainability |
| `/dashboard/connectors` | Connettori dati (Snowflake, GitHub, DB) |
| `/dashboard/trust-center` | Trust Center per clienti |
| `/dashboard/notifications` | Alert scadenze normative personalizzate |

---

## 6. TOOL DI COMPLIANCE (26 TOOL ATTIVI)

### 6.1 TRIAGE WIZARD — Classificazione rapida
**URL:** `/dashboard/triage`  
**Articoli:** Art. 5, Art. 6, Art. 27, Art. 50, Art. 51–55  
**Tipo:** Wizard 9 step con branching logic — non checklist statica

**Step del wizard:**
1. **Ruolo** — provider / deployer / importatore / distributore
2. **Settore** — HR, sanità, istruzione, finanza, sicurezza pubblica, PA, infrastrutture, altro
3. **Tipo output** — decisioni su persone / generazione contenuti / profilazione / biometria / ottimizzazione interna
4. **Dati personali** — sensibili / standard / nessuno
5. **Decisioni automatizzate** — piena automatizzazione / supporto umano / nessuna
6. **Utenti finali** *(multi-select)* — consumatori / professionisti / dipendenti / minori / persone vulnerabili
7. **Deployment** — solo UE / UE + altro / fuori UE con utenti UE
8. **Stato** — sviluppo / produzione / aggiornamento sostanziale
9. **Segnali di rischio** *(multi-select)* — 11 segnali tra cui biometria real-time, social scoring, deepfake, chatbot, Annex III esplicito

**Report immediato** con 5 tier di rischio:
- 🔴 **Pratica vietata** — con lista violazioni Art. 5 specifiche
- 🟠 **Alto rischio** — azioni prioritarie diverse per provider vs deployer
- 🟣 **GPAI** — con verifica soglia 10²⁵ FLOPS
- 🟡 **Rischio limitato** — focus Art. 50 disclosure
- 🟢 **Rischio minimale** — verifica Art. 5 + codice di condotta volontario

**Output:** report salvato in localStorage (`aicomply_triage_result`), pre-popola gli altri tool

---

### 6.2 CLASSIFIER — Classificatore di rischio AI
**URL:** `/dashboard/tools/classifier`  
**Articoli:** Art. 5, Art. 6, Annex I, Annex III

**Funzionalità:**
- Classificazione sistema AI in 4 tier: proibito / alto rischio / rischio limitato / rischio minimo
- Wizard di classificazione con domande branching su settore, output, dati, utenti
- Rilevamento segnali Annex III (8 settori: HR, sanità, istruzione, finanza, sicurezza pubblica, PA, infrastrutture, giustizia)
- Generazione **dossier esenzione Art. 6(3)** — 4 criteri legali (task procedurale delimitato, miglioramento attività umana, rilevamento pattern, compito preparatorio)
- Flag sistemi Annex I (embedded in prodotti fisici regolamentati CE)
- Generazione **Conformity Passport** — documento crittografato esportabile con hash
- Integrazione `code-to-law` — mappa file/funzioni del repository → articoli EU AI Act applicabili
- AI Risk Scorer — scoring probabilistico multi-dimensionale
- Salva `riskLevel`, `systemName`, `annex3Category` per pre-popolare tutti i tool

**Output:** JSON + Conformity Passport firmato, scritto nel Dossier

---

### 6.3 ART. 5 CHECKER — Pratiche vietate
**URL:** `/dashboard/tools/prohibited`  
**Articoli:** Art. 5(1)(a)-(h)

**Funzionalità:**
- Checklist interattiva per tutte le 8 pratiche vietate dall'Art. 5:
  - Manipolazione subliminale / sfruttamento vulnerabilità (a)
  - Identificazione biometrica in tempo reale in spazi pubblici (b) + eccezioni forze dell'ordine
  - Social scoring da autorità pubbliche (c)
  - Valutazione del rischio di reati futuri basata su profilazione (d)
  - Ricostruzione banche dati facciali da internet (e)
  - Deduzione emozioni in ambienti di lavoro/istruzione (f)
  - Categorizzazione biometrica da caratteristiche sensibili (g)
  - AI generativa per manipolazione delle elezioni (h)
- Per ogni pratica: descrizione tecnica, esempi concreti, eccezioni legali applicabili
- Verdict: `clear` / `conditional` / `potential_violation` / `violation`
- Se violation → blocco red banner su tutti i tool

**Output:** Verdict + evidence Art. 5 nel Dossier

---

### 6.4 RISK MANAGER — Gestione del rischio
**URL:** `/dashboard/tools/risk-manager`  
**Articolo:** Art. 9

**Funzionalità:**
- Catalogo rischi con oltre 20 rischi pre-caricati per categoria (tecnica, normativa, operativa, etica)
- Aggiunta rischi custom con descrizione, probabilità, impatto, contromisure
- **Monte Carlo simulation** — 10.000 iterazioni per stima Risk Exposure Score
- **PSI drift detection** (Population Stability Index) — rileva drift del dataset rispetto alla baseline con soglie: PSI < 0.1 = stabile, 0.1–0.25 = warning, > 0.25 = critical
- **Sanction Tracker** — mappa rischi→sanzioni EU AI Act con importi massimi (€7.5M / €15M / €35M)
- **KRI configurabili** (Key Risk Indicators) con soglie di alert
- Review cycle tracker — data prossima revisione, cadenza configurabile
- Drift windows — storico rilevamenti drift con timestamp

**Output:** Risk Assessment Report JSON, scritto nel Dossier Annex IV §3

---

### 6.5 DATA AUDIT — Governance dati e bias
**URL:** `/dashboard/tools/data-audit`  
**Articolo:** Art. 10(1)(2)(3)(4)(5)

**Funzionalità:**
**Tab "Dataset demo":**
- 5 dataset di esempio (CV screening, loan approval, medical triage, recidivism, insurance pricing)
- Simulazione temporale con 6 snapshot storici
- 4 metriche di fairness calcolate:
  - **OFI** (Objective Fairness Index): B − E, soglia 0.15
  - **SPD** (Statistical Parity Difference): soglia 0.10
  - **DI** (Disparate Impact): regola 4/5 < 0.8
  - **EOD** (Equalized Odds Difference): ΔTPR/ΔFPR, soglia 0.10
- Rilevamento gruppi sottorappresentati
- **CTGAN augmentation** — generazione sintetica per bilanciare dataset sbilanciati
- **Column Lineage** — traccia provenienza di ogni colonna (source, transformation, legal basis)

**Tab "Carica CSV reale":**
- Upload CSV del proprio dataset (client-side, nessun dato inviato al server)
- Selezione colonne: caratteristica sensibile + outcome + valore positivo
- Calcolo OFI/SPD/DI/EOD su dati reali
- Tabella distribuzione per gruppo con badge "sottorappresentato"
- Nota metodologica per EOD semplificato (senza ground truth)

**Sezioni aggiuntive Art. 10:**
- Art. 10(3): Pratiche di gestione dati documentate
- Art. 10(4): Misure per dati speciali (biometrici, etnici, sanitari)
- Art. 10(5): Dataset di test separati

**Output:** BiasReport + evidence Art. 10 nel Dossier

---

### 6.6 LOGVAULT — Logging hash-chained
**URL:** `/dashboard/tools/logvault`  
**Articoli:** Art. 12, Art. 14(5), Art. 26(6)

**Funzionalità:**
**Tab "Log simulati":**
- Generazione log hash-chained (SHA-256 progressivo, prevHash → entryHash)
- 5 livelli evento: `safe`, `warning`, `critical`
- Metriche: critici, warning, drift score max, integrità %
- **Verifica integrità catena** — rileva manipolazioni (tamper detection)
- **C2PA attestation** — flag per contenuti con Content Credentials
- **Kill Switch Art. 14** — pulsante hold-3-secondi per disabilitazione sistema documentata
- Configurazione sistema: nome, log count, retention
- Filtri per livello evento
- Export evidence JSON con hash anchor (genesis + head)
- Retention: **180 giorni** (Art. 26(6) AI Act — minimo 6 mesi)

**Tab "Importa log reali":**
- Upload drag&drop file JSON o CSV dai sistemi di produzione
- Auto-rilevamento separatore CSV (`,` o `;`)
- Normalizzazione timestamp (ISO string / epoch ms / epoch seconds)
- Normalizzazione livelli: `error`/`fatal` → `critical`, `warn` → `warning`
- Gestione valori quotati CSV con campo `timestamp` obbligatorio
- Stats post-import: log importati / critici / warning / integrità catena
- Alert drift se drift score max > 60%
- Salvataggio nel dossier con sourceFormat (json/csv)

**API realtime:**
- `POST /api/logvault/ingest` — ingestione log da sistemi esterni
- `GET /api/logvault/ingest` — healthcheck connessione DB
- `GET /api/logvault/drift?ai_system_id=X&window_hours=N` — analisi drift su log reali

---

### 6.7 DRIFT MONITOR — Dashboard real-time
**URL:** `/dashboard/tools/drift-monitor`  
**Articoli:** Art. 12, Art. 15, Art. 9

**Funzionalità:**
- Chiama `GET /api/logvault/drift` in polling automatico
- **Auto-refresh configurabile:** 30 secondi / 1 minuto / 5 minuti
- Countdown visivo al prossimo aggiornamento
- Pausa/riprendi polling senza perdere lo storico
- Finestre temporali selezionabili: 1h / 6h / 24h / 72h
- **5 metriche monitorate:**
  - `latency_p99_ms` — Latenza p99
  - `error_rate_pct` — Tasso errori
  - `flagged_rate_pct` — Percentuale eventi flaggati
  - `guardrail_breach_pct` — Violazioni guardrail
  - `token_spike_pct` — Spike token
- Alert con severità `warning` / `critical` + barra deviazione %
- Status badge: 🟢 Nessun drift / 🟡 Warning / 🔴 Critical
- **HistoryTimeline** — mini-bar chart degli ultimi 20 snapshot (tooltip con timestamp)
- Rileva `ai_system_id` dal localStorage del Classifier
- Empty state con link a LogVault se nessun log nella finestra

---

### 6.8 TRANSPARENCY — Documentazione Art. 13
**URL:** `/dashboard/tools/transparency`  
**Articoli:** Art. 13, Art. 13(3)(a)-(h), Art. 50

**Funzionalità:**
- 8 sezioni documentali obbligatorie:
  - Identità e contatto provider (a)
  - Caratteristiche, capacità e limitazioni performance (b)
  - Specifiche dati di addestramento (c)
  - Livelli di accuracy, robustezza, cybersecurity (d)
  - Misure supervisione umana (e)
  - Requisiti hardware/software (f)
  - Durata attesa e misure manutenzione (g)
  - Descrizione meccanismi di logging (h)
- **AI Output Label** — snippet HTML/React/WordPress per disclosure Art. 50
- Stato completamento per sezione con progress bar
- Pre-popola nome sistema dal Classifier

**Output:** Documento trasparenza + disclosure snippet Art. 50, nel Dossier Annex IV §5

---

### 6.9 OVERSIGHT — Supervisione umana
**URL:** `/dashboard/tools/oversight`  
**Articolo:** Art. 14

**Funzionalità:**
- Configurazione protocolli di supervisione per tipo di sistema
- Override conditions — condizioni che attivano intervento umano
- Sessioni di supervisione documentate con timestamp
- Nomina supervisori con ruoli e competenze richieste
- Protocolli di escalation documentati
- Pre-popola `do_not_use_conditions` dai top rischi del Risk Manager
- Integrazione Kill Switch (link a LogVault)

**Output:** Oversight Protocol nel Dossier Annex IV §6

---

### 6.10 RESILIENCE — Accuratezza e robustezza
**URL:** `/dashboard/tools/resilience`  
**Articolo:** Art. 15

**Funzionalità:**
- Configurazione soglie di accuracy con metriche (precision, recall, F1, AUC)
- Test fallback — comportamento del sistema in caso di errore
- **Red Team Testing** — simulazione attacchi adversariali:
  - Data poisoning
  - Model evasion
  - Prompt injection
  - Distribution shift
- Configurazione soglie di allerta per drift
- Report breach con evidence per ogni test fallito

**Output:** Resilience Assessment + Red Team Report, nel Dossier Annex IV §7

---

### 6.11 FRIA — Valutazione impatto diritti fondamentali
**URL:** `/dashboard/tools/fria`  
**Articolo:** Art. 27

**Funzionalità:**
- **Sezione 1 — Contesto sistema:** overview tecnologica, componenti generativa, tipi dati, GDPR compliance, bias assessment, qualità dati, dati personali trattati
- **Sezione 2 — Scenari e diritti:** per ogni scenario di deployment:
  - Descrizione scenario e tipo
  - Valutazione 11 diritti fondamentali (dignità, privacy, non discriminazione, tutela dati, libertà espressione, libera circolazione, accesso giustizia, ecc.)
  - Per ogni diritto: impatto (`no_impact` / `low` / `medium` / `high`) + descrizione + misure mitigazione
  - Tab "Matrice impatti" — tabella incrociata scenari×diritti
- **Sezione 3 — Decisione di deployment:**
  - Stakeholder engagement documentato
  - Raccomandazione: `proceed` / `proceed_with_conditions` / `defer` / `reject`
  - Approvazione con nome, ruolo, data
- Completeness score con indicatori di gap

**Output:** FRIA completo nel Dossier, evidence Art. 27

---

### 6.12 DPIA — Data Protection Impact Assessment
**URL:** `/dashboard/tools/dpia`  
**Articoli:** Art. 35 GDPR, Art. 36 GDPR, WP248 rev.01

**Funzionalità — Wizard 6 step:**
- **Step 0** — Screening: 9 criteri WP248 per obbligatorietà DPIA (profilazione, dati sensibili, matching dataset, dati vulnerabili, decisioni automatizzate, biometria, larga scala, monitoraggio sistematico, tecnologie innovative)
- **Step 1** — Descrizione trattamento: finalità, categorie dati, destinatari, trasferimenti extra-UE, retention
- **Step 2** — Necessità e proporzionalità: base giuridica, minimizzazione, limitazione finalità, trasparenza, diritti interessati
- **Step 3** — Rischi identificati: minacce alla riservatezza, integrità, disponibilità con probabilità e gravità
- **Step 4** — Misure di sicurezza: tecniche e organizzative per ogni rischio
- **Step 5** — Consultazione preventiva: verifica se necessaria (Art. 36), autorità competente, documentazione

**Output:** DPIA completa esportabile TXT + evidence nel Dossier

---

### 6.13 QMS — Quality Management System
**URL:** `/dashboard/tools/qms`  
**Articolo:** Art. 17(1)(a)-(j)

**Funzionalità:**
- 10 sezioni obbligatorie Art. 17(1):
  - (a) Strategia conformità normativa
  - (b) Progettazione e controllo
  - (c) Sviluppo e garanzia qualità
  - (d) Gestione del rischio
  - (e) Post-market monitoring
  - (f) Gestione incidenti gravi
  - (g) Gestione aggiornamenti
  - (h) Gestione documentazione
  - (i) Gestione risorse umane e formazione
  - (j) Programma di audit interno
- Per ogni sezione: campo testo libero + status + timestamp
- Progress indicator globale
- Ciclo di miglioramento continuo: data prossima revisione

**Output:** QMS completo nel Dossier Annex IV §8

---

### 6.14 DOCUGEN — Documentazione tecnica Annex IV
**URL:** `/dashboard/tools/docugen`  
**Articoli:** Art. 11, Annex IV, Art. 43

**Funzionalità:**
- Generazione automatica della documentazione tecnica obbligatoria Annex IV in 9 sezioni:
  - §1 Descrizione generale del sistema
  - §2 Descrizione delle funzionalità
  - §3 Informazioni sui dati di addestramento (auto-import da Data Audit)
  - §4 Procedure di testing e validazione (auto-import da Risk Manager)
  - §5 Monitoraggio e logging
  - §6 Cybersecurity e robustezza
  - §7 Conformità a standard armonizzati
  - §8 Informazioni di contatto
  - §9 Firma e data
- **Auto-import** dai tool completati: Data Audit (dati, bias), Risk Manager (rischi, KRI)
- Campo testo ricco per ogni sezione
- Preview in tempo reale del documento
- Export `.txt` formattato

**Output:** Documentazione Annex IV completa nel Dossier

---

### 6.15 GPAI — General Purpose AI Compliance
**URL:** `/dashboard/tools/gpai`  
**Articoli:** Art. 51, Art. 52, Art. 53(1)(a)(b), Art. 54, Art. 55, Art. 56

**Funzionalità:**
- Classificazione GPAI: verifica se il modello supera soglia 10²³ FLOPS (presunzione GPAI)
- Classificazione rischio sistemico: soglia 10²⁵ FLOPS o performance comparabili ai modelli top
- Distinzione modelli specializzati (non GPAI) vs generali
- Obblighi per ogni livello (GPAI standard vs GPAI systemic risk):
  - Art. 53(1)(a): documentazione tecnica modello
  - Art. 53(1)(b): conformità copyright e diritti d'autore
  - Art. 54: adversarial testing obbligatorio per rischio sistemico
  - Art. 55: incident reporting per rischio sistemico
  - Art. 56: partecipazione Code of Practice AI Office
- Checklist obblighi con status per ciascuno
- Modelli open-source: gestione esenzioni e soglie speciali
- Nomina Authorized Representative se provider extra-UE

**Output:** GPAI Assessment nel Dossier, evidence Art. 51-55

---

### 6.16 ART. 50 KIT — Disclosure utenti finali
**URL:** `/dashboard/tools/art50-kit`  
**Articoli:** Art. 50(1), Art. 50(2), Art. 50(3), Art. 50(4)

**Funzionalità:**
- Registro sistemi Art. 50 con status compliance per ciascuno
- Generazione snippet disclosure:
  - **HTML snippet** — banner/tooltip per siti web
  - **React component** — componente riusabile NPM-ready
  - **WordPress shortcode** — plugin-ready
- Label AI-generated content per deepfake/media sintetici (Art. 50(4))
- Calcolo punteggio Art. 50: 0–100 con indicatori per sotto-obbligo
- Registro Implementazione — storico deploy disclosure per audit
- Deadline reminder: 2 dicembre 2026 (Art. 50(2))
- **Integrazione L.132/2025** — obbligo watermarking + sanzioni penali deepfake

**Output:** Disclosure snippet + Registro Implementazione nel Dossier

---

### 6.17 CONFORMITY — Dichiarazione di Conformità UE
**URL:** `/dashboard/tools/conformity`  
**Articoli:** Art. 43, Art. 47, Annex V

**Funzionalità — Wizard 5 step:**
- **Step 1** — Determinazione percorso: self-assessment (Art. 43(2)) vs organismo notificato (Art. 43(1)) in base al tipo di sistema e Annex I
- **Step 2** — Checklist conformità: verifica di tutti i requisiti Art. 9–17 con evidenze dai tool completati (Risk Manager, Data Audit, LogVault, Transparency, Oversight, Resilience, FRIA, DPIA, QMS)
- **Step 3** — Generazione dichiarazione: **Dichiarazione UE di Conformità** con dati firmatario (nome, ruolo, azienda, indirizzo), testo legale completo Annex V, scaricabile `.txt`
- **Step 4** — Checklist finale: conferma firma, conservazione 10 anni, disponibilità per autorità
- **Step 5** — Riepilogo: score conformità (passed/total), data completamento

**Output:** Dichiarazione di Conformità UE (Art. 43 + Art. 47) nel Dossier + Evidence Layer

---

### 6.18 DEPLOYER — Obblighi Art. 26
**URL:** `/dashboard/tools/deployer`  
**Articolo:** Art. 26(1)-(9)

**Funzionalità:**
- 9 obblighi Art. 26 con checklist interattiva:
  - Art. 26(1): misure tecniche e organizzative secondo istruzioni provider
  - Art. 26(2): nomina supervisore umano con qualifiche adeguate
  - Art. 26(3): monitoraggio sistema in operazione
  - Art. 26(4): comunicazione incidenti al provider
  - Art. 26(5): feedback al provider su incidenti
  - Art. 26(6): log retention ≥ 6 mesi (180 giorni)
  - Art. 26(7): DPIA per dati personali sensibili
  - Art. 26(8): registrazione EUDB per sistemi PA
  - Art. 26(9): cooperazione con autorità di vigilanza
- Note libere per ogni obbligo
- Score compliance deployer: obblighi soddisfatti / totale
- Pre-popola `system_name` dal Classifier

**Output:** Deployer Obligations nel Dossier, evidence Art. 26

---

### 6.19 EUDB — Registrazione Database UE
**URL:** `/dashboard/tools/eudb`  
**Articoli:** Art. 49, Annex VIII

**Funzionalità — Wizard multi-step:**
- Classificazione sistema per tipo registrazione: Annex III / Annex I / GPAI systemic
- Compilazione **Annex VIII** pre-strutturato con tutti i campi obbligatori:
  - Identificazione provider e sistema
  - Categoria di rischio e classificazione
  - Descrizione intended purpose
  - Dati di addestramento e testing
  - Misure post-market
  - URL documentazione tecnica
  - Versione sistema
- Generazione report EUDB formattato (esportabile)
- Auto-import `system_name` dal Classifier e `technical_doc_url` dal DocuGen

**Output:** EUDB Registration nel Dossier, evidence Art. 49

---

### 6.20 AUTHORIZED REPRESENTATIVE — Art. 22
**URL:** `/dashboard/tools/authorized-rep`  
**Articolo:** Art. 22

**Funzionalità:**
- Wizard mandato di rappresentanza per provider non-UE
- Verifica obblighi AR secondo Art. 22(2):
  - (a) Registrazione EUDB per conto del provider
  - (b) Dichiarazione di conformità UE in custodia
  - (c) Cooperazione con autorità di vigilanza
  - (d) Disponibilità documentazione tecnica
- Generazione mandato di rappresentanza formale (testo legale)
- Dati AR: ragione sociale, indirizzo UE, contatto, ruolo
- Dati provider extra-UE: identificazione, paese, sistema rappresentato

**Output:** Mandato AR nel Dossier, evidence Art. 22

---

### 6.21 PROVIDER TRANSITION — Art. 28
**URL:** `/dashboard/tools/provider-transition`  
**Articolo:** Art. 28

**Funzionalità:**
- Verifica se il deployer è diventato provider a seguito di modifiche sostanziali
- 8 trigger di riqualificazione Art. 28(1):
  - Art. 28(1)(a): immissione sul mercato con proprio nome
  - Art. 28(1)(b) + Art. 3(23): modifica sostanziale del sistema
  - Art. 28(1)(b) + Art. 3(23)(a): nuova intended purpose ad alto rischio
  - + ulteriori trigger per white-label, fine-tuning, re-branding
- Per ogni trigger: descrizione tecnica + conseguenze legali
- Calcolo impatto: se riqualificato → lista obblighi provider applicabili
- Alert integrazione con GPAI per fine-tuning di modelli fondazionali

**Output:** Provider Transition Check nel Dossier, evidence Art. 28

---

### 6.22 L.132/2025 — Legge italiana intelligenza artificiale
**URL:** `/dashboard/tools/l132`  
**Articoli:** L. 23 settembre 2025, n. 132 (in vigore dal 10 ottobre 2025)

**Funzionalità:**
- Obblighi specifici della legge italiana:
  - Trasparenza: obbligo disclosure per sistemi AI che interagiscono con umani
  - Deepfake: watermarking obbligatorio, disclosure obbligatoria
  - Art. 612-quater c.p. (introdotto dalla L.132): deepfake non consensuali → fino a 5 anni
  - Obblighi PA: comunicazione all'Agenzia Nazionale AI
  - PMI: accesso al fondo 1 miliardo (Art. 23 L.132)
- **Integrazione MOG 231** — verifica che il Modello Organizzativo 231 sia aggiornato per includere protocolli AI
- Generazione snippet disclosure Art. 50 + L.132 integrati
- Sanzioni L.132 + sanzioni EU AI Act in tabella comparativa
- Riferimento penale: Art. 612-quater c.p. + aggravanti

**Output:** L.132 Compliance nel Dossier, evidence L.132/2025

---

### 6.23 AI LITERACY — Art. 4 + MOG 231
**URL:** `/dashboard/tools/literacy`  
**Articoli:** Art. 4 EU AI Act, L.132/2025, D.Lgs. 231/2001

**Funzionalità:**
- Registro documentale sessioni di formazione sull'intelligenza artificiale
- Per ogni sessione: data, titolo, categoria, formatore, durata (minuti), note
- **6 categorie di formazione:** fondamenti AI / rischi e bias / normativa EU AI Act / strumenti aziendali / etica e responsabilità / altro
- **Tracking per ruolo aziendale** (6 ruoli):
  - Dirigenti/CXO — soglia minima: 4 ore
  - Manager sistemi AI — soglia minima: 8 ore
  - Sviluppatori/Data scientist — soglia minima: 6 ore
  - Risorse umane — soglia minima: 4 ore
  - Legale/Compliance — soglia minima: 6 ore
  - Tutti i dipendenti — soglia minima: 2 ore
- **Pannello RoleCompliancePanel** — barre ore accumulate vs soglie MOG 231 con score %:
  - 🟢 ≥ 80% = Conforme
  - 🟡 ≥ 50% = Parziale
  - 🔴 < 50% = Insufficiente
- **Sync MOG 231** — chiama `POST /api/mog231` per aggiornare `part_d_training` nel DB; se score ≥ 80% imposta `l132_hr_transparency: true`
- Export registro TXT con tutti i dati (Art. 4 EU AI Act — nessun formato prescritto)
- Stats: sessioni totali, ore totali, partecipanti unici, ultima sessione
- DBStatusBadge — indica se dati sincronizzati con DB o solo locali

**Output:** Registro AI Literacy esportabile + sync MOG 231 DB

---

### 6.24 LEGAL ASSISTANT — RAG su EU AI Act
**URL:** `/dashboard/tools/legal-assistant`  
**Base normativa:** testo integrale EU AI Act + linee guida Commissione UE

**Funzionalità:**
- Interfaccia chat in italiano per domande libere sull'EU AI Act
- **RAG (Retrieval-Augmented Generation)** su documenti indicizzati:
  - Testo italiano EU AI Act completo
  - Draft Guidelines on the classification of high-risk AI (Annex I, III, principi generali)
  - ISO/IEC 22989:2022 (terminologia AI)
  - SCAN-ISO 42001:2023 (AI management systems)
- Citazioni normative con riferimento articolo (`Art. X(y)`)
- Chunk retrieval con score di rilevanza
- Risposta con `chunkTexts` — testi fonte mostrati all'utente per verifica
- LLM cloud: Gemini 2.0 Flash via Vertex AI
- LLM self-hosted: Ollama `llama3.1:8b` (configurabile via `AICOMPLY_MODE=self-hosted`)

---

### 6.25 AGID / ACN / GARANTE PRIVACY — Autorità italiane
**URL:** `/dashboard/tools/agid-acn`  
**Articoli:** Art. 57 EU AI Act, Art. 73, NIS2, GDPR, L.132/2025

**Funzionalità — 3 tab:**

**Tab 1 — Autorità di vigilanza:**
- **AGID** (Agenzia per l'Italia Digitale): poteri, contatti verificati (`protocollo@pec.agid.gov.it`, +39 06 85264.1), quando notificare (72h incidente, domanda sandbox, Art. 49 pre-deploy), info Regulatory Sandbox AI (operativa entro 2 agosto 2026)
- **ACN** (Agenzia per la Cybersicurezza Nazionale): supervisione Art. 15, NIS2, adversarial testing, contatti verificati (`info@acn.gov.it`, `acn@pec.acn.gov.it`)
- **Garante Privacy**: GDPR + AI Act intersezione, sanzioni €20M / 4%, contatti verificati (`protocollo@gpdp.it`, `protocollo@pec.gpdp.it`, +39 06 696771)

**Tab 2 — Rischi penali L.132/2025:**
- 4 reati con pene, aggravanti, chi è a rischio, come mitigare, link tool mitigazione:
  - Deepfake non consensuali (1–7 anni)
  - Manipolazione/frode tramite AI (1–5 anni)
  - Violazione tutela minori under 14 (fino 3 anni)
  - Reati D.Lgs. 231/2001 tramite AI (fino €1.5M + interdizione)

**Tab 3 — Sanzioni amministrative EU AI Act:**
- Art. 5 violazioni: €35M o 7% fatturato
- Art. 6-49 violazioni: €15M o 3% fatturato
- Art. 82 false informazioni: €7.5M o 1% fatturato
- Riduzione automatica 50% per PMI (< 250 dipendenti)

---

### 6.26 NIST AI RMF — Multi-framework compliance
**URL:** `/dashboard/tools/nist-rmf`  
**Framework:** NIST AI Risk Management Framework (GOVERN / MAP / MEASURE / MANAGE)

**Funzionalità:**
- **16 subcategorie NIST** mappate su articoli EU AI Act:
  - GOVERN (5): GV-1.1, GV-1.2, GV-2.1, GV-4.1, GV-6.1 → Art. 9, 17, 4, 26, 14, 13, 50, 72
  - MAP (4): MP-1.1, MP-2.2, MP-3.5, MP-5.1 → Art. 6, 5, 9, 27, 10, 35 GDPR
  - MEASURE (4): MS-1.1, MS-2.5, MS-2.6, MS-4.1 → Art. 9, 15, 12, 72, 10, 11
  - MANAGE (4): MG-1.3, MG-2.4, MG-3.1, MG-4.1 → Art. 9, 14, 73, 20, 72, 17, 26
- **Score card per funzione** — % copertura calcolata da localStorage reale (non manuale)
- Filtro per funzione NIST con banner descrittivo
- Accordion espandibile per subcategoria con link ai tool
- Badge articolo: 🟢 completato / ⚪ da fare
- Note: la conformità EU AI Act non equivale automaticamente a conformità NIST — la mappatura indica aree di sovrapposizione

---

### 6.27 QUESTIONNAIRE — Q-AutoFill
**URL:** `/dashboard/tools/questionnaire`  
**Funzione:** Auto-compilazione questionari buyer (procurement AI)

**Funzionalità:**
- Template questionari per procurement AI enterprise
- Auto-fill da dati già presenti nel Dossier AIComply
- Export risposte per RFP/RFI

---

## 7. INFRASTRUTTURA AVANZATA

### 7.1 Post-Market Monitoring — Art. 72 + Art. 73
**URL:** `/dashboard/post-market`

- **Incident Registry** — registrazione incidenti gravi AI con ID, sistema, data, descrizione, gravità (low/medium/high/critical), stato
- **Rapporto preliminare** (Art. 73(3)) — generabile con 15 giorni di deadline
- **Rapporto completo** (Art. 73(4)) — Sezione 4 (causa radice) + Sezione 6 (misure definitive) obbligatorie prima della generazione
- Notifica alle autorità con timestamp e documentazione
- Export rapporto `.txt` formattato
- Storico incidenti con filtri per stato e gravità

### 7.2 Evidence Layer
**URL:** `/dashboard/evidence-layer`

- Raccolta automatica prove digitali da tutti i tool
- Ogni evidence ha: tipo, fonte, hash SHA-256, timestamp, dati payload
- Sign-Off Panel — firma digitale del responsabile compliance per ogni evidence
- Export evidence pack per audit regolamentare

### 7.3 Discovery
**URL:** `/dashboard/discovery`

- Scansione codebase/repository per rilevare pattern AI
- Mappa file → articoli EU AI Act applicabili
- Integrazione con Classifier per classificazione automatica

### 7.4 Compliance Nexus
**URL:** `/dashboard/compliance-nexus`

- Mappa visiva delle interconnessioni tra tutti i tool
- Status completamento per ogni nodo
- Identificazione gap nella copertura normativa

---

## 8. SELF-HOSTING / SOVEREIGN DEPLOY

### 8.1 Per chi è pensato
Organizzazioni che non possono inviare dati a cloud esterni: banche, PA, studi legali, infrastrutture critiche.

### 8.2 Stack self-hosted (docker-compose.yml)
- **postgres:15-alpine** — database locale
- **postgrest/postgrest:v12** — API Supabase-compatibile
- **ollama/ollama:latest** — LLM e embeddings locali
- **ollama-init** — pull automatico modelli al primo avvio (`llama3.1:8b` + `nomic-embed-text`)
- **rag-ingestor** — Python con tesseract-ita + poppler per PDF normativi
- **app** — Next.js buildato localmente

### 8.3 Modelli Ollama supportati
| Modello | RAM | Qualità |
|---------|-----|---------|
| `llama3.1:8b` | 8 GB | ★★★★☆ — produzione base |
| `llama3.1:70b` | 48 GB | ★★★★★ — enterprise GPU |
| `mistral:7b` | 6 GB | ★★★☆☆ — server low RAM |
| `nomic-embed-text` | 1 GB | ★★★★★ — embeddings sempre |

### 8.4 Configurazione (env vars chiave)
```
AICOMPLY_MODE=self-hosted
AICOMPLY_RAG_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_LLM_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
VERTEX_PROJECT_ID=            # vuoto in self-hosted
```

### 8.5 Requisiti hardware
| Config | CPU | RAM | Storage |
|--------|-----|-----|---------|
| Minima (test) | 4 core | 16 GB | 50 GB SSD |
| Raccomandata | 8 core | 32 GB | 100 GB SSD |
| Enterprise | 16 core + GPU | 64 GB+ | 200 GB NVMe |

---

## 9. SICUREZZA

- **Autenticazione:** HMAC session signing + OTP email verification
- **Database:** RLS (Row Level Security) Supabase — ogni utente vede solo i propri dati
- **API:** Endpoint protetti da session check (GDPR, audit, cron)
- **SSRF:** Protezione whitelist IP + URL validation
- **CORS:** Strict origin matching
- **Headers HTTP:** X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **IP hashing:** In audit log per GDPR compliance
- **Segreti:** SESSION_SECRET in .env.local, chiavi non committate

---

## 10. DIFFERENZIATORI COMPETITIVI

| Differenziatore | Dettaglio |
|----------------|-----------|
| **Unico in italiano** | Tutti i tool, la UI, il Legal Assistant RAG e il blog sono 100% in italiano — nessun competitor diretto lo fa |
| **Copertura completa Annex IV** | DocuGen genera la documentazione tecnica strutturata su 9 sezioni Annex IV auto-importando dati dagli altri tool |
| **Synergy automatica** | 12+ tool si pre-popolano automaticamente dal Classifier — zero re-inserimento dati |
| **L.132/2025 dedicata** | Unica piattaforma con tool specifico per la legge italiana (in vigore ottobre 2025), inclusi rischi penali Art. 612-quater c.p. |
| **AGID/ACN coverage** | Unica piattaforma con informazioni operative sulle autorità di vigilanza italiane (contatti verificati, deadline, sandbox) |
| **NIST AI RMF mapping** | Mapping cross-framework EU AI Act ↔ NIST con coverage calcolata dai tool completati |
| **Sovereign deploy** | Docker Compose + Ollama per deploy completamente on-premise, dati mai sul cloud |
| **RAG su normativa italiana** | Legal Assistant su testo italiano AI Act + linee guida UE + ISO 22989 + ISO 42001 |
| **Drift monitoring real-time** | API + dashboard polling automatico per rilevazione deviazioni latenza/errori/guardrail in produzione |
| **Triage 9-step** | Wizard branching che produce report immediato con tier rischio + articoli applicabili + roadmap — non checklist statica |
| **Art. 50 Kit completo** | Generazione snippet HTML/React/WordPress per disclosure, registro implementazione, punteggio 0–100 |
| **MOG 231 integrazione** | Literacy tool aggiorna automaticamente il MOG 231 nel DB quando la formazione raggiunge le soglie per ruolo |

---

## 11. METRICHE DI COMPLETEZZA NORMATIVA

| Articolo EU AI Act | Tool dedicato | Copertura |
|-------------------|--------------|-----------|
| Art. 5 (pratiche vietate) | Art. 5 Checker | ✅ Tutte e 8 le pratiche |
| Art. 6 (classificazione) | Classifier | ✅ Path 6(1), 6(2), 6(3) exemption |
| Art. 9 (risk management) | Risk Manager | ✅ Monte Carlo + PSI + KRI + Sanction Tracker |
| Art. 10 (governance dati) | Data Audit | ✅ OFI/SPD/DI/EOD + CTGAN + CSV reale + Art.10(3)(4)(5) |
| Art. 11 (documentazione) | DocuGen | ✅ Annex IV completo, auto-import |
| Art. 12 (logging) | LogVault | ✅ Hash-chain + C2PA + import reale + API drift |
| Art. 13 (trasparenza) | Transparency | ✅ Art.13(3)(a)-(h) + Art.50 snippet |
| Art. 14 (supervisione umana) | Oversight | ✅ Protocolli + sessioni + override |
| Art. 15 (accuratezza/robustezza) | Resilience | ✅ Red Team + fallback + soglie |
| Art. 17 (QMS) | QMS | ✅ Art.17(1)(a)-(j) completo |
| Art. 22 (authorized rep) | Authorized Rep | ✅ Mandato + obblighi Art.22(2) |
| Art. 26 (deployer) | Deployer | ✅ Art.26(1)-(9) completo |
| Art. 27 (FRIA) | FRIA | ✅ 11 diritti + scenari + deployment decision |
| Art. 28 (provider transition) | Provider Transition | ✅ 8 trigger Art.28(1) |
| Art. 35 GDPR (DPIA) | DPIA | ✅ WP248 screening + 6 step |
| Art. 43 (conformity assessment) | Conformity | ✅ Self-assessment + notified body |
| Art. 47 (dichiarazione conformità) | Conformity | ✅ Annex V testo legale generato |
| Art. 49 (EUDB) | EUDB | ✅ Annex VIII pre-compilato |
| Art. 50 (disclosure utenti) | Art. 50 Kit | ✅ HTML/React/WP + registro |
| Art. 51-55 (GPAI) | GPAI | ✅ FLOPS threshold + systemic risk |
| Art. 72-73 (post-market) | Post-Market | ✅ Incident registry + rapporti |
| L. 132/2025 (legge italiana) | L.132 | ✅ Obblighi + penali + deepfake |
| Art. 4 (AI literacy) | Literacy | ✅ MOG 231 + tracking ruoli |

**Totale articoli coperti: 23/23 articoli chiave EU AI Act + L.132/2025 + MOG 231**

---

## 12. CONFRONTO CON COMPETITOR NOTI

> *(Per l'analisi Gemini — questa sezione è vuota: chiedi a Gemini di compilarla con i competitor reali)*

Competitor da analizzare:
- **Certa** (certa.ai)
- **Holistic AI**
- **Fairly AI**
- **Trustible**
- **Luminos.Law**
- **Compliance.ai**
- **LogicGate**
- **OneTrust AI Governance**
- **TrustArc**
- **Palantir AI Governance**
- Strumenti legali/consulenza: Linklaters Nora, DLA Piper AI compliance tools

**Asse di analisi suggerita:**
1. Copertura normativa (quanti articoli EU AI Act coperti da tool specifici, non semplici checklist)
2. Lingua/localizzazione (italiano vs solo inglese)
3. Integrazione L.132/2025 e normativa italiana
4. Self-hosting / sovereign deploy disponibile
5. RAG su normativa (LLM nativo vs link esterni)
6. Tool quantitativi (bias metrics, Monte Carlo, PSI) vs solo documentali
7. Prezzo (PMI-friendly vs enterprise-only)
8. Template vs tool funzionanti (demo vs produzione)

---

*Documento generato da AIComply — giugno 2026. Feature verificate sul codice sorgente.*
