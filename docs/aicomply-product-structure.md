# AIComply — Struttura completa del prodotto
> Documento generato per analisi comparativa di mercato · 3 giugno 2026

---

## 1. Panoramica del prodotto

**AIComply** è una SaaS web-app per la compliance all'EU AI Act (Regolamento UE 2024/1689). Si rivolge a sviluppatori, provider e deployer di sistemi AI che operano nel mercato europeo (focus Italia). Il prodotto è interamente in italiano.

**URL produzione:** https://aicomply-omega.vercel.app  
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase (Auth + DB), Vercel  
**Stato:** waitlist aperta, non ancora in vendita pubblica  
**Modello di go-to-market:** painted-door / early access con prezzo bloccato

---

## 2. Architettura della piattaforma

### 2.1 Pagine pubbliche (marketing)

| URL | Contenuto |
|-----|-----------|
| `/` | Landing page — hero + feature highlights + CTA scanner/waitlist |
| `/pricing` | Tre piani (Scanner gratuito, Starter €49/mese, Professional €199/mese) |
| `/waitlist` | Form raccolta early access — nome, email, azienda, n. sistemi AI, piano |
| `/scanner` | Scanner gratuito Art. 50 — analisi sito/prodotto AI anonima |
| `/risorse` | Blog / knowledge base AI Act |
| `/risorse/[slug]` | Articoli individuali (SSG) |
| `/trust/[slug]` | Trust Center — pagine per clienti su sicurezza e privacy |
| `/register` | Registrazione account |
| `/login` | Login |
| `/verify` | Verifica OTP email |

### 2.2 Dashboard applicativa (post-login)

| URL | Sezione |
|-----|---------|
| `/dashboard` | Home dashboard — overview sistemi + compliance score |
| `/dashboard/onboarding` | Wizard di onboarding guidato |
| `/dashboard/journey` | Compliance journey — percorso passo-passo per articolo |
| `/dashboard/discovery` | Scansione codebase e repository |
| `/dashboard/dossier` | Dossier tecnico aggregato (Annex IV) |
| `/dashboard/compliance-nexus` | Nexus — mappa sinergica tra tutti i tool |
| `/dashboard/connectors` | Connettori dati (Snowflake, GitHub, DB) |
| `/dashboard/evidence-layer` | Layer prove digitali — hash + firma |
| `/dashboard/trust-center` | Trust center interno |
| `/dashboard/notifications` | Alert scadenze normative |
| `/dashboard/post-market` | Monitoraggio post-market (Art. 72) |

---

## 3. Tool di compliance (18 tool attivi)

Tutti i tool sono accessibili da `/dashboard/tools/[nome]`. Ogni tool:
- Salva il proprio stato in `localStorage` (dossier locale)
- Scrive automaticamente nel **Dossier Annex IV** condiviso
- Aggiunge prove all'**Evidence Layer** (hash + timestamp)
- Include un **Sign-Off Panel** per firma digitale del responsabile

---

### 3.1 Classifier — Classificatore di rischio AI
**URL:** `/dashboard/tools/classifier`  
**Articolo di riferimento:** Art. 6, Annex III, Annex I  

**Funzionalità:**
- Classificazione del sistema AI in tier: proibito / alto rischio / rischio limitato / rischio minimo
- Analisi codice sorgente/repository per inferenza automatica del rischio
- Rilevamento segnali di profilazione (Art. 6(3) exemption engine)
- Generazione dossier esenzione Art. 6(3) con 4 criteri legali
- Generazione **Conformity Passport** — documento crittografato esportabile
- Flag sistemi Annex I (embedded in prodotti fisici regolamentati)
- Integrazione con `code-to-law`: mappa file/funzioni → articoli AI Act
- Scoring probabilistico con AI Risk Scorer

**Output esportabile:** JSON + conformity passport firmato

---

### 3.2 Risk Manager — Gestione del rischio Art. 9
**URL:** `/dashboard/tools/risk-manager`  
**Articolo di riferimento:** Art. 9

**Funzionalità:**
- Registro rischi strutturato con categoria, severità, probabilità
- Calcolo score di rischio residuo
- Simulazione Monte Carlo per incertezza probabilistica
- Rilevamento drift tramite PSI (Population Stability Index)
- Record temporali per confronto storico
- Valutazione rischi GPAI specifici
- Sanction Tracker — monitoraggio sanzioni e precedenti EU
- Analisi descrizione rischio con suggerimenti automatici
- Validazione coerenza rischio residuo vs misure dichiarate
- Ciclo di revisione programmato (nextReviewDate + reviewCycle)

**Output esportabile:** Risk Manager Report PDF/JSON

---

### 3.3 Data Audit — Governance dei dati Art. 10
**URL:** `/dashboard/tools/data-audit`  
**Articolo di riferimento:** Art. 10, Art. 10(3)(4)(5)

**Funzionalità:**
- Analisi bias su dataset con metriche standard:
  - **OFI** — Objective Fairness Index
  - **SPD** — Statistical Parity Difference
  - **DI** — Disparate Impact (regola 4/5, soglia 0.8)
  - **EOD** — Equalized Odds Difference
- Snapshot temporali bitemporali (6 snapshot da gen 2024 a mag 2025)
- Toggle CTGAN — simulazione data augmentation sintetica per riduzione bias
- Column lineage tracker — tracciamento proxy variabili (es. CAP → etnia)
- Importazione dataset CSV reale per analisi su dati propri
- Calcolo gruppi sottorappresentati
- Sezioni Art. 10(3): qualità, pertinenza, mancanza bias
- Sezioni Art. 10(4): misure di governance
- Sezioni Art. 10(5): accesso speciale ai dati sensibili
- Dataset demo: HR Screening, Credit Scoring, Medical Triage

**Output esportabile:** Bias Report con raccomandazioni

---

### 3.4 LogVault — Logging automatico Art. 12 & 14
**URL:** `/dashboard/tools/logvault`  
**Articolo di riferimento:** Art. 12, Art. 14

**Funzionalità:**
- Log chain hash-concatenato (SHA-256 simulato, append-only)
- Verifica integrità catena — rilevamento manomissioni
- Attestazione C2PA per eventi critici
- Drift score per ogni entry (0–1)
- Kill Switch Art. 14 — disattivazione sistema in 3 secondi (hold button)
- Import log da JSON e CSV con mapping automatico campi
- Modalità tampered per demo integrità violata
- Visualizzazione per livelli: safe / warning / critical
- Operatori: system_auto + operatori umani con ID
- Retention: conforme ai 6 mesi Annex III / 3 anni biometria

**Output esportabile:** Log chain JSON + report integrità

---

### 3.5 Transparency — Documentazione Art. 13
**URL:** `/dashboard/tools/transparency`  
**Articolo di riferimento:** Art. 13, Art. 13(3)

**Funzionalità:**
- Nutrition Label AI — scheda sintetica del sistema in formato leggibile
- Wizard per tutti i campi Art. 13(3):
  - Identità e contatti provider
  - Caratteristiche, capacità, limitazioni performance
  - Specifiche dati di addestramento
  - Performance attesa, livelli di accuratezza
  - Capacità supervisione umana
  - Misure di mantenimento
  - Istruzioni uso per deployer
- Sezione Art. 50 — obblighi disclosure verso utenti finali
- Sample decisions — casi decisionali documentati

**Output esportabile:** Scheda trasparenza PDF

---

### 3.6 Oversight — Supervisione umana Art. 14
**URL:** `/dashboard/tools/oversight`  
**Articolo di riferimento:** Art. 14

**Funzionalità:**
- Configurazione supervisori umani con ruoli e poteri
- Protocolli di intervento e override
- Registrazione sessioni di supervisione
- Misure tecniche per override umano
- Kill switch collegato a LogVault
- Documentazione misure di prevenzione automation bias

---

### 3.7 Resilience — Accuratezza e robustezza Art. 15
**URL:** `/dashboard/tools/resilience`  
**Articolo di riferimento:** Art. 15

**Funzionalità:**
- Red Team Testing simulato — attacchi avversariali
- Soglie di accuratezza e fallback configurabili
- Test di robustezza su input rumorosi / OOD
- Monitoraggio degrado performance nel tempo
- Cybersecurity assessment AI-specifico
- Rapporto Red Team esportabile (Art. 15 EU AI Act)

---

### 3.8 FRIA — Valutazione impatto diritti fondamentali
**URL:** `/dashboard/tools/fria`  
**Articolo di riferimento:** Art. 27, Carta dei Diritti Fondamentali UE

**Funzionalità:**
- 11 diritti fondamentali strutturati in 5 gruppi (Dignità, Libertà, Uguaglianza, Giustizia, Sociale)
- Valutazione per scenario con matrice severità × probabilità
- Score automatico severità: extent × scope × persons × gravity × irreversibility
- Misure di mitigazione per categoria (tecnica / organizzativa / legale / procedurale)
- Stakeholder engagement tracker (rights holders, civil society, regulators)
- Log coinvolgimento stakeholder con how_incorporated
- Piano di monitoraggio post-deploy
- Decisione finale deploy: deploy / deploy con condizioni / non deployer
- Calcolo completeness score (%)
- Generazione sintesi pubblica in italiano
- Calcolo rischio complessivo FRIA

**Output esportabile:** Documento FRIA completo JSON

---

### 3.9 DPIA — Data Protection Impact Assessment
**URL:** `/dashboard/tools/dpia`  
**Articolo di riferimento:** Art. 35 GDPR + AI Act

**Funzionalità:**
- Wizard multi-step per DPIA completa
- Verifica obbligo DPIA (trattamento sistematico, profilazione, dati sensibili)
- Mappatura trattamenti dati personali
- Identificazione misure tecniche e organizzative (GDPR + AI Act)
- Valutazione rischi residui per interessati
- Integrazione con output Classifier per allineamento sistemi AI

---

### 3.10 QMS — Sistema di gestione qualità Art. 17
**URL:** `/dashboard/tools/qms`  
**Articolo di riferimento:** Art. 17

**Funzionalità:**
- 10 sezioni Art. 17(1)(a)–(j):
  - Strategia conformità normativa
  - Progettazione e controllo
  - Sviluppo e garanzia qualità
  - Verifica, validazione, test
  - Gestione rischi (collegato a Risk Manager)
  - Controllo qualità post-market
  - Gestione modifiche sostanziali
  - Gestione fornitori e terze parti
  - Responsabilità e accountability
  - Gestione reclami
- Collegamento automatico a Risk Manager e Data Audit (synergy)

---

### 3.11 DocuGen — Generazione documentazione tecnica Annex IV
**URL:** `/dashboard/tools/docugen`  
**Articolo di riferimento:** Art. 11, Annex IV

**Funzionalità:**
- 9 sezioni Annex IV:
  - §1 Descrizione generale
  - §2a Logica e architettura
  - §2b Dati di addestramento
  - §2c Performance e metriche
  - §3 Monitoraggio e logging
  - §4 Validazione e test
  - §5 Gestione rischi
  - §6 Modifiche post-market
  - §7 Standard applicabili
- Auto-import da Data Audit (Art. 10) e Risk Manager (Art. 9)
- Generazione documento completo in formato regolatorio

**Output esportabile:** Documentazione tecnica Annex IV (PDF/MD)

---

### 3.12 GPAI — General Purpose AI compliance
**URL:** `/dashboard/tools/gpai`  
**Articolo di riferimento:** Art. 51–55, Annex XI, Annex XII

**Funzionalità:**
- Verifica soglia FLOPs per rischio sistemico (Art. 51)
- Checklist obblighi provider GPAI:
  - Documentazione tecnica modello (Annex XI)
  - Policy dati addestramento (Art. 53(1)(c))
  - Conformità copyright (Art. 53(1)(c))
  - Sommario dati addestramento (Annex XII)
  - Misure cybersecurity per modelli sistemici (Art. 55(1)(b))
  - Red teaming avversariale (Art. 55(1)(c))
- Supporto modelli open-source con eccezioni specifiche

---

### 3.13 Art. 50 Kit — Disclosure utenti finali
**URL:** `/dashboard/tools/art50-kit`  
**Articolo di riferimento:** Art. 50

**Funzionalità:**
- Wizard per configurazione sistemi AI (chatbot, generatori contenuto, ecc.)
- Calcolo score Art. 50 (0–100)
- Generazione componenti tecnici di disclosure:
  - Snippet HTML (banner disclosure)
  - Snippet React (componente)
  - Snippet WordPress (shortcode)
- Registro Implementazione Art. 50 con timestamp
- Scansione multi-sistema
- Re-scan automatico post-installazione
- Notifiche scadenza (90/30/7 giorni)
- Esportazione dichiarazione Art. 50(1)

**Output esportabile:** Dichiarazione Art. 50 + Registro Implementazione

---

### 3.14 Conformity — Dichiarazione di conformità UE Art. 47
**URL:** `/dashboard/tools/conformity`  
**Articolo di riferimento:** Art. 47, Annex V

**Funzionalità:**
- 3-step wizard (percorso → requisiti → dichiarazione)
- Selezione percorso di conformità (self-assessment vs terza parte)
- Verifica requisiti articolo per articolo (Art. 9–15 + 17 + 61–62)
- Generazione Dichiarazione di Conformità UE formale
- Collegamento al Conformity Passport del Classifier

**Output esportabile:** EU Declaration of Conformity (PDF)

---

### 3.15 EUDB — Registrazione database UE Art. 49
**URL:** `/dashboard/tools/eudb`  
**Articolo di riferimento:** Art. 49, Annex VIII

**Funzionalità:**
- Generazione automatica Annex VIII — tutte le informazioni richieste per registrazione EUDB
- Supporto tipologie: Annex III standalone / Annex I embedded / GPAI sistemico
- Campi: nome sistema, descrizione, categoria, provider, deployed countries, intended purpose
- technical_doc_url + versione sistema
- Esportazione in formato testo per copia nel portale EU

**Output esportabile:** Annex VIII pre-compilato

---

### 3.16 Deployer — Obblighi deployer Art. 26
**URL:** `/dashboard/tools/deployer`  
**Articolo di riferimento:** Art. 26

**Funzionalità:**
- Checklist obblighi deployer (Art. 26(1)–(9)):
  - Misure tecniche e organizzative secondo istruzioni provider
  - Verifica destinazione d'uso
  - Supervisione umana
  - Segnalazione incidenti al provider
  - DPIA se trattamento dati personali
  - Informazione lavoratori se impatto su occupazione
  - Registrazione log (se accesso)
  - Segnalazione autorità competenti
- Status tracking per ogni obbligo

---

### 3.17 Provider Transition — Transizione provider→deployer Art. 28
**URL:** `/dashboard/tools/provider-transition`  
**Articolo di riferimento:** Art. 28

**Funzionalità:**
- Verifica trigger di "riqualificazione" da deployer a provider:
  - Art. 28(1)(a): modifica sostanziale del sistema
  - Art. 28(1)(b): immissione sul mercato con proprio nome/marchio
  - Art. 28(1)(b) + Art. 3(23)(a): fine-tuning significativo
  - Art. 28(1)(b) + Art. 3(23)(b): integrazione in prodotto proprio
- Calcolo score rischio riqualificazione
- Roadmap obblighi aggiuntivi se provider

---

### 3.18 Authorized Representative — Rappresentante autorizzato Art. 22
**URL:** `/dashboard/tools/authorized-rep`  
**Articolo di riferimento:** Art. 22

**Funzionalità:**
- Verifica obbligo AR per provider extra-UE
- Checklist obblighi AR:
  - Registrazione EUDB per conto del provider (Art. 22(2)(a))
  - Custodia dichiarazione di conformità (Art. 22(2)(b))
  - Cooperazione con autorità competenti (Art. 22(2)(c))
  - Aggiornamento documentazione tecnica (Art. 22(2)(d))
- Configurazione dati AR (nome, indirizzo UE, contatti)

---

### 3.19 L. 132/2025 — Legge italiana di adeguamento
**URL:** `/dashboard/tools/l132`  
**Articolo di riferimento:** Legge italiana L. 132/2025

**Funzionalità:**
- Checklist obblighi specifici della legge italiana di adeguamento all'AI Act
- Status tracking conformità (Conforme / Parzialmente conforme / Non conforme)
- Note per ogni obbligo

---

### 3.20 Legal Assistant — Assistente RAG AI Act
**URL:** `/dashboard/tools/legal-assistant`  
**Tecnologia:** Retrieval Augmented Generation (RAG) su testo EU AI Act

**Funzionalità:**
- Domande libere in linguaggio naturale sull'EU AI Act
- Chip suggeriti per query frequenti (Art. 5, Art. 6, Art. 50, GPAI, ecc.)
- Estrazione automatica riferimenti normativi dalla risposta (Art. X(y))
- Citazione chunk di testo regolatorio a supporto della risposta
- Interfaccia conversazionale

---

## 4. Moduli avanzati (in roadmap / parzialmente implementati)

| Modulo | URL | Descrizione |
|--------|-----|-------------|
| AIA Architect | `/dashboard/modules/aia-architect` | Wizard architetturale per sistemi AI conformi |
| FRIA (moduli) | `/dashboard/modules/fria` | Versione modulare FRIA |
| GPAI (moduli) | `/dashboard/modules/gpai` | Dashboard GPAI avanzata |
| Guardian Agent | `/dashboard/modules/guardian-agent` | Agente AI per monitoring continuo |
| Rights Simulator | `/dashboard/modules/rights-simulator` | Simulatore impatto diritti fondamentali |
| Trust Labeler | `/dashboard/modules/trust-labeler` | Generazione label fiducia AI |
| XAI | `/dashboard/modules/xai` | Explainability — Art. 13 + 14 |

---

## 5. Infrastruttura trasversale

### 5.1 Dossier e synergy engine
- Tutti i tool scrivono in un **dossier condiviso** (`localStorage` → Supabase)
- **Synergy automatica**: modifiche in un tool pre-popolano campi correlati in altri tool
  - Oversight + Resilience si pre-popolano a vicenda
  - DPIA + QMS condividono mappatura trattamenti
  - Docugen legge da Data Audit e Risk Manager
  - Provider Transition + Deployer + EUDB sono collegati
- Schema unificato: `ClassifierResult`, `RiskManagerReport`, `DataAuditResult`, `LogvaultResult`, `FRIAResult`, ecc.

### 5.2 Evidence Layer
- Hash SHA-256 su ogni azione significativa
- Timestamp + operatorId per ogni write
- Esportabile come prova di due diligence

### 5.3 Conformity Passport
- Documento crittografato generato dal Classifier
- Contiene: systemName, riskTier, articoli violati/rispettati, timestamp, firma
- Verificabile da terze parti (exportForRegulator)
- Formato: JSON firmato + QR code

### 5.4 Sign-Off Panel
- Componente presente in ogni tool
- Permette firma del responsabile compliance
- Campi: nome, ruolo, data, note approvazione
- Registrata nel dossier

### 5.5 Auth e sicurezza
- Supabase Auth (OTP email)
- HMAC session signing
- Rate limiting su endpoint critici
- SSRF protection
- CSP headers strict
- IP hashing in audit log

---

## 6. Scanner pubblico gratuito (Art. 50)

**URL:** `/scanner`  
**Autenticazione:** non richiesta  
**Anonimato:** sì (no email/IP raccolti)

**Funzionalità:**
- Analisi URL sito o descrizione prodotto AI
- Verifica presenza disclosure Art. 50 (chatbot label, watermark, info AI)
- Output: score 0–100, criticità trovate, raccomandazioni
- CTA a Starter per remediation completa

---

## 7. Piani e pricing

| Piano | Prezzo mensile | Prezzo annuale | Target |
|-------|---------------|----------------|--------|
| **Scanner** | €0 (gratuito) | — | Chiunque voglia verificare Art. 50 |
| **Starter** | €49/mese | €41/mese (€490/anno) | PMI, startup, 1 sistema AI |
| **Professional** | €199/mese | €166/mese (€1.990/anno) | Sviluppatori, provider, fino a 5 sistemi |

### Piano Scanner (gratuito)
- Scanner Art. 50 anonimo
- Score conformità
- Report criticità
- Nessuna registrazione

### Piano Starter (€49/mese)
- Tutto di Scanner
- Piano di remediation completo
- Snippet HTML / React / WordPress per disclosure
- Wizard installazione guidata
- Registro Implementazione Art. 50
- Re-scan automatico post-installazione
- 1 sistema AI registrato
- Notifiche scadenza (90/30/7 giorni)
- Scansione multi-sistema
- AI Classifier (Art. 6)
- Accesso early access con prezzo bloccato

### Piano Professional (€199/mese)
- Tutto di Starter
- 5 sistemi AI registrati
- AI Classifier — mapping codice → rischio
- Exemption dossier Art. 6(3)
- Scansione repository GitHub
- Conformity record esportabile
- Legal Assistant RAG (EU AI Act)
- Supporto via email prioritario

> **Nota:** entrambi i piani a pagamento sono in accesso anticipato (waitlist). Il prezzo è "bloccato a vita" per i primi iscritti.

---

## 8. Contenuti editoriali (Blog / Risorse)

### Articoli pubblicati
1. **"Scadenze AI Act aggiornate: il calendario 2025–2028 dopo il rinvio dell'Omnibus"**  
   Slug: `scadenze-ai-act-aggiornate-calendario-2025-2028`  
   Data: 2 giugno 2026 · 8 min · Categoria: Normativa  
   Tag: AI Act, scadenze, compliance, Omnibus, alto rischio

2. **"Cos'è un sistema AI ad alto rischio: la guida pratica all'Annex III"**  
   Slug: `sistema-ai-alto-rischio-annex-iii-obblighi`  
   Data: 3 giugno 2026 · 9 min · Categoria: Guide  
   Tag: AI Act, alto rischio, Annex III, Art. 6, compliance, obblighi

---

## 9. Positioning e differenziatori chiave

### Target dichiarato
- Provider di sistemi AI (startup, software house, aziende tech)
- Deployer di sistemi AI di terze parti (HR, fintech, healthcare)
- DPO / compliance officer / legal in aziende italiane
- PMI che non si sono ancora accorte di avere un sistema ad alto rischio

### Differenziatori vs soluzioni generiche di compliance
1. **Specificità AI Act**: zero strumenti generici GDPR/ISO — ogni tool mappa un articolo preciso
2. **18 tool integrati** con dossier condiviso e synergy automatica (vs strumenti standalone)
3. **Output tecnici direttamente usabili**: snippet HTML disclosure, Annex VIII pre-compilato, Annex IV, EU Declaration of Conformity
4. **Legal Assistant RAG** su testo EU AI Act in italiano
5. **Evidence Layer crittografico**: ogni azione produce prova di due diligence firmata
6. **Conformity Passport** verificabile da terze parti
7. **Interfaccia in italiano**: unico prodotto AI Act SaaS completamente in italiano
8. **Focus PMI italiane**: prezzo entry-level (€49/mese vs consulenze a €30k+)

### Gap rispetto a prodotti enterprise (non coperti oggi)
- Integrazione API real-time con sistemi produzione
- Multi-tenant / gestione team
- Notified body submission workflow
- Integrazione ERP/MDM
- White-label per studi legali

---

## 10. Articoli AI Act coperti dal prodotto

| Articolo | Tool che lo copre | Obbligo |
|----------|------------------|---------|
| Art. 5 | Prohibited Practices checker | Pratiche vietate |
| Art. 6 | Classifier | Classificazione alto rischio |
| Art. 9 | Risk Manager | Sistema gestione rischi |
| Art. 10 | Data Audit | Governance dati |
| Art. 11 | DocuGen | Documentazione tecnica (Annex IV) |
| Art. 12 | LogVault | Logging automatico |
| Art. 13 | Transparency | Trasparenza verso deployer |
| Art. 14 | Oversight + LogVault | Supervisione umana + Kill Switch |
| Art. 15 | Resilience | Accuratezza e robustezza |
| Art. 17 | QMS | Quality Management System |
| Art. 22 | Authorized Rep | Rappresentante autorizzato |
| Art. 26 | Deployer | Obblighi deployer |
| Art. 27 | FRIA | Impatto diritti fondamentali |
| Art. 28 | Provider Transition | Riqualificazione provider |
| Art. 47 | Conformity | Dichiarazione conformità UE |
| Art. 49 | EUDB | Registrazione database UE |
| Art. 50 | Art. 50 Kit + Scanner | Disclosure utenti finali |
| Art. 51–55 | GPAI | General Purpose AI |
| L. 132/2025 | L132 tool | Legge italiana adeguamento |

---

*Fine documento — AIComply Product Structure v1.0 · 3 giugno 2026*
