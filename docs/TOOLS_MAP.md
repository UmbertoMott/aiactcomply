# AIComply — Mappa completa dei Tool

> Aggiornato: 2026-06-17 | Branch: main | 59 pagine mappate

Legenda colonne:
- **Righe** = LOC del file `page.tsx`
- **Storage** = usa `useScopedStorage` / `writeToStorage` / `localStorage` (n° occorrenze)
- **AI** = chiama `generateText` / Vertex o usa `Sparkles` (n° occorrenze)
- **🔵 Blu** = occorrenze di colore blu (`T.blue`, `DK.indigo`, `#1d4ed8`) ancora presenti → da pulire
- **⚠ Verify** = occorrenze di `[verify against current AI Act text]` ancora presenti → da rimuovere

---

## 🏠 Pagine strutturali

| Pagina | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Note |
|--------|-----|------|-------|---------|----|--------|----------|------|
| Dashboard | `/dashboard` | `app/dashboard/page.tsx` | 681 | ✓ | — | 3 | 0 | Radar, quick links, scadenze |
| Triage | `/dashboard/triage` | `app/dashboard/triage/page.tsx` | 1255 | ✓ | ✓ | 6 | 0 | Punto di partenza — classifica il sistema |
| Dossier | `/dashboard/dossier` | `app/dashboard/dossier/page.tsx` | 493 | ✓ | — | 0 | 0 | Export PDF, completamento globale |
| Post-Market | `/dashboard/post-market` | `app/dashboard/post-market/page.tsx` | 2516 | ✓ | ✓ | 4 | 14 | Monitoraggio post-deploy, Art. 72-73 |
| Trust Center (pubblico) | `/dashboard/trust-center` | `app/dashboard/trust-center/page.tsx` | 1046 | — | — | 0 | 0 | Pagina pubblica trust |
| Compliance Nexus | `/dashboard/compliance-nexus` | `app/dashboard/compliance-nexus/page.tsx` | — | — | — | — | — | Hub aggregazione status |
| Journey | `/dashboard/journey` | `app/dashboard/journey/page.tsx` | — | — | — | — | — | Onboarding guidato |
| Evidence Layer | `/dashboard/evidence-layer` | `app/dashboard/evidence-layer/page.tsx` | — | — | — | — | — | Raccolta prove/evidenze |
| Notifications | `/dashboard/notifications` | `app/dashboard/notifications/page.tsx` | — | — | — | — | — | Centro notifiche |
| Discovery | `/dashboard/discovery` | `app/dashboard/discovery/page.tsx` | — | — | — | — | — | Scoperta automatica sistemi AI |
| Copilot | `/dashboard/copilot` | `app/dashboard/copilot/page.tsx` | — | — | — | — | — | AI assistant trasversale |

---

## 🛠 Tools — Percorso compliance core (sidebar Pillar 1-5)

### Pillar 1 — Classificazione & Rischio

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|------|-----|------|-------|---------|----|--------|----------|---------------------|
| **Classifier** | `/dashboard/tools/classifier` | `tools/classifier/page.tsx` | 1579 | 10 | 29 | **15** | 0 | Art. 5, 6, 25 — classificazione alto rischio |
| **Risk Manager** | `/dashboard/tools/risk-manager` | `tools/risk-manager/page.tsx` | 944 | 6 | 32 | 1 | **13** | Art. 6, 9, 12, 51-55, 72 — gestione rischi |
| **Prohibited Practices** | `/dashboard/tools/prohibited` | `tools/prohibited/page.tsx` | 792 | 10 | 12 | 0 | 0 | Art. 5, 50, 99(3) — pratiche vietate |
| **Questionnaire** | `/dashboard/tools/questionnaire` | `tools/questionnaire/page.tsx` | 1015 | 20 | 45 | 0 | 0 | Art. 5, 22, 27, 35 — questionario personalizzato |

### Pillar 2 — Dati & Documentazione

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|------|-----|------|-------|---------|----|--------|----------|---------------------|
| **Data Audit** | `/dashboard/tools/data-audit` | `tools/data-audit/page.tsx` | 806 | 4 | 23 | **17** | **4** | Art. 10 — qualità dati, data governance |
| **DocuGen** | `/dashboard/tools/docugen` | `tools/docugen/page.tsx` | 1269 | 11 | 26 | 0 | 0 | Art. 10, 11 — documentazione tecnica, Annex IV |
| **AI Inventory** | `/dashboard/tools/inventory` | `tools/inventory/page.tsx` | 902 | 0 | 42 | 1 | **6** | Art. 2, 3, 25 — inventario sistemi AI |
| **DPIA** | `/dashboard/tools/dpia` | `tools/dpia/page.tsx` | 1854 | 9 | 42 | **19** | 0 | Art. 16-21, GDPR Art. 35 — valutazione impatto |
| **LogVault** | `/dashboard/tools/logvault` | `tools/logvault/page.tsx` | 1137 | 9 | 32 | **17** | **12** | Art. 12 — logging, conservazione log |

### Pillar 3 — Trasparenza & Supervisione

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|------|-----|------|-------|---------|----|--------|----------|---------------------|
| **Transparency** | `/dashboard/tools/transparency` | `tools/transparency/page.tsx` | 778 | 8 | 13 | 1 | 0 | Art. 13 — obblighi trasparenza verso utenti |
| **Human Oversight** | `/dashboard/tools/oversight` | `tools/oversight/page.tsx` | 867 | 8 | 29 | **10** | **7** | Art. 14 — supervisione umana |
| **Art. 50 Kit** | `/dashboard/tools/art50-kit` | `tools/art50-kit/page.tsx` | 839 | 4 | 54 | **20** | **19** | Art. 50 — obblighi trasparenza GPAI/chatbot |
| **Legal Assistant** | `/dashboard/tools/legal-assistant` | `tools/legal-assistant/page.tsx` | 669 | 0 | 9 | 0 | 0 | Art. 16, 99 — RAG sull'AI Act |

### Pillar 4 — Robustezza & Sicurezza

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|------|-----|------|-------|---------|----|--------|----------|---------------------|
| **Resilience** | `/dashboard/tools/resilience` | `tools/resilience/page.tsx` | 336 | 8 | 1 | 0 | 0 | Art. 15 — accuracy, robustezza, cybersec |
| **Drift Monitor** | `/dashboard/tools/drift-monitor` | `tools/drift-monitor/page.tsx` | 506 | 2 | 2 | 3 | 0 | Art. 9, 12, 15 — monitoraggio drift modello |
| **Incident** | `/dashboard/tools/incident` | `tools/incident/page.tsx` | 256 | 0 | 4 | 3 | 0 | Art. 73 — notifica incidenti alle autorità |

### Pillar 5 — Conformità & Certificazione

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|------|-----|------|-------|---------|----|--------|----------|---------------------|
| **Conformity** | `/dashboard/tools/conformity` | `tools/conformity/page.tsx` | 1119 | 10 | 5 | 0 | 0 | Art. 15, 43 — conformità, organismi notificati |
| **FRIA** | `/dashboard/tools/fria` | `tools/fria/page.tsx` | 1322 | 13 | 11 | **9** | 0 | Art. 27 — Fundamental Rights Impact Assessment |
| **QMS Builder** | `/dashboard/tools/qms` | `tools/qms/page.tsx` | 413 | 12 | 10 | 0 | 0 | Art. 17 — Quality Management System |
| **NIST RMF** | `/dashboard/tools/nist-rmf` | `tools/nist-rmf/page.tsx` | 458 | 1 | 23 | 0 | 0 | Art. 10-15 + NIST AI RMF framework |
| **L.132/2024** | `/dashboard/tools/l132` | `tools/l132/page.tsx` | 1203 | 6 | 25 | 0 | 0 | L. 132/2024 — recepimento italiano AI Act |

### Tool specialistici

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|------|-----|------|-------|---------|----|--------|----------|---------------------|
| **GPAI Assessment** | `/dashboard/tools/gpai` | `tools/gpai/page.tsx` | 1167 | 5 | 68 | **23** | 0 | Art. 49, 51 — GPAI sistemic risk |
| **Literacy** | `/dashboard/tools/literacy` | `tools/literacy/page.tsx` | 917 | 5 | 16 | 0 | 0 | Art. 4 — formazione AI literacy |
| **AGID/ACN** | `/dashboard/tools/agid-acn` | `tools/agid-acn/page.tsx` | 472 | 0 | 42 | **10** | 0 | Art. 15, 23, 33, 35 — autorità IT |
| **Trust Passport** | `/dashboard/tools/trust-passport` | `tools/trust-passport/page.tsx` | 372 | 0 | 5 | 3 | 0 | Art. 5, 10, 11, 50 — kit commerciale/vendita |
| **Deployer Dashboard** | `/dashboard/tools/deployer-dashboard` | `tools/deployer-dashboard/page.tsx` | 267 | 0 | 5 | 0 | 0 | Art. 26 — obblighi deployer |

---

## ⚙️ Compliance Ops — Workflow operativi (nuova generazione, useScopedStorage)

| Tool | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali | Note |
|------|-----|------|-------|---------|----|--------|----------|---------------------|------|
| **Registrazione EUDB** | `/dashboard/compliance-ops/eudb` | `compliance-ops/eudb/page.tsx` | 977 | ✓ | ✓ | **0** ✓ | **0** ✓ | Art. 49, Annex VIII | Wizard 4 step, prefill da altri moduli |
| **Authorized Representative** | `/dashboard/compliance-ops/authorized-rep` | `compliance-ops/authorized-rep/page.tsx` | 1087 | ✓ | ✓ | **0** ✓ | **0** ✓ | Art. 22 | Mandato AR, sync con EUDB |
| **Provider Transition** | `/dashboard/compliance-ops/provider-transition` | `compliance-ops/provider-transition/page.tsx` | 540 | ✓ | — | **0** ✓ | **0** ✓ | Art. 28 | Cambio ruolo provider→deployer |
| **Deadline Timeline** | `/dashboard/compliance-ops/deadlines` | `compliance-ops/deadlines/page.tsx` | 696 | ✓ | — | 0 | 1 | Art. 12-72 | Scadenze AI Act, archivio+ripristino |
| **Trust Center (ops)** | `/dashboard/compliance-ops/trust-center` | `compliance-ops/trust-center/page.tsx` | 858 | ✓ | — | 0 | 0 | — | Gestione pagina trust pubblica |

---

## 🧩 Modules — Moduli verticali per caso d'uso

| Modulo | URL | File | Righe | Storage | AI | 🔵 Blu | ⚠ Verify | Articoli principali |
|--------|-----|------|-------|---------|----|--------|----------|---------------------|
| **GPAI Module** | `/dashboard/modules/gpai` | `modules/gpai/page.tsx` | 1113 | 10 | 55 | 1 | 0 | Art. 14, 18, 50, 51 |
| **XAI (Explainability)** | `/dashboard/modules/xai` | `modules/xai/page.tsx` | 1067 | 5 | 41 | 0 | 0 | Art. 10, 12, 13 |
| **AIA Architect** | `/dashboard/modules/aia-architect` | `modules/aia-architect/page.tsx` | 1188 | 0 | 7 | 2 | 0 | Art. 10, 11, 14, 15 |
| **Trust Labeler** | `/dashboard/modules/trust-labeler` | `modules/trust-labeler/page.tsx` | 1335 | 2 | 30 | 3 | 0 | Art. 50 — label trasparenza GPAI/chatbot |
| **Guardian Agent** | `/dashboard/modules/guardian-agent` | `modules/guardian-agent/page.tsx` | 963 | 9 | 7 | **13** | 0 | Art. 14, 15, 86 — friction gate oversight |
| **FRIA Module** | `/dashboard/modules/fria` | `modules/fria/page.tsx` | 5 | — | — | 0 | 0 | — | Stub/redirect |
| **Rights Simulator** | `/dashboard/modules/rights-simulator` | `modules/rights-simulator/page.tsx` | 5 | — | — | 0 | 0 | — | Stub/redirect |

---

## 🗂 Versioni legacy (tools/) vs nuove (compliance-ops/)

Alcune pagine hanno **due versioni**: la vecchia in `/tools/` e la nuova refactored in `/compliance-ops/`. Le versioni legacy restano per ora nel routing.

| Funzionalità | Legacy (`/tools/`) | Nuova (`/compliance-ops/`) | Stato |
|---|---|---|---|
| Registrazione EUDB | `tools/eudb/page.tsx` (1040 righe) | `compliance-ops/eudb/page.tsx` (977 righe) | Legacy: blu=1 rimasto; Nuova: ✓ pulita |
| Authorized Rep | `tools/authorized-rep/page.tsx` (936 righe) | `compliance-ops/authorized-rep/page.tsx` (1087 righe) | Legacy: blu=10; Nuova: ✓ pulita |
| Provider Transition | `tools/provider-transition/page.tsx` (940 righe) | `compliance-ops/provider-transition/page.tsx` (540 righe) | Legacy: blu=10; Nuova: ✓ pulita |
| Deployer | `tools/deployer/page.tsx` (771 righe) | — | Legacy only: blu=10 |

---

## 🚨 Priorità fix in sospeso

### 🔵 Blu da eliminare (ordinati per impatto)

| Tool | File | Occorrenze blu | Tipo |
|------|------|----------------|------|
| Art. 50 Kit | `tools/art50-kit/page.tsx` | **20** | T.blue → neutro |
| Data Audit | `tools/data-audit/page.tsx` | **17** | T.blue → neutro |
| LogVault | `tools/logvault/page.tsx` | **17** | T.blue → neutro |
| DPIA | `tools/dpia/page.tsx` | **19** | T.blue → neutro |
| GPAI Tool | `tools/gpai/page.tsx` | **23** | T.blue → neutro |
| Classifier | `tools/classifier/page.tsx` | **15** | T.blue → neutro |
| Human Oversight | `tools/oversight/page.tsx` | **10** | T.blue → neutro |
| AGID/ACN | `tools/agid-acn/page.tsx` | **10** | T.blue → neutro |
| Legacy tools/* | `tools/authorized-rep`, `tools/provider-transition`, `tools/deployer` | **10 ciascuno** | T.blue → neutro |
| FRIA | `tools/fria/page.tsx` | **9** | T.blue → neutro |
| Guardian Agent | `modules/guardian-agent/page.tsx` | **13** | T.blue → neutro |
| Post-Market | `post-market/page.tsx` | **4** | T.blue → neutro |

### ⚠ `[verify against current AI Act text]` da rimuovere

| Tool | File | Occorrenze |
|------|------|-----------|
| Art. 50 Kit | `tools/art50-kit/page.tsx` | **19** |
| Post-Market | `post-market/page.tsx` | **14** |
| Risk Manager | `tools/risk-manager/page.tsx` | **13** |
| LogVault | `tools/logvault/page.tsx` | **12** |
| Human Oversight | `tools/oversight/page.tsx` | **7** |
| AI Inventory | `tools/inventory/page.tsx` | **6** |
| Data Audit | `tools/data-audit/page.tsx` | **4** |
| Deadlines | `compliance-ops/deadlines/page.tsx` | **1** |

---

## ✅ Stato design per pillar

| Pillar / Sezione | Colori puliti | Verify puliti | useScopedStorage |
|---|---|---|---|
| compliance-ops/* | ✅ Tutti puliti | ✅ Tutti puliti | ✅ Tutti |
| Dashboard | ⚠ 3 blu residui | ✅ | ✅ |
| Triage | ⚠ 6 blu residui | ✅ | ✅ |
| Classifier | ❌ 15 blu | ✅ | ✅ |
| Risk Manager | ⚠ 1 blu | ❌ 13 verify | ✅ |
| Data Audit | ❌ 17 blu | ❌ 4 verify | ✅ |
| DocuGen | ✅ | ✅ | ✅ |
| Transparency | ⚠ 1 blu | ✅ | ✅ |
| Oversight | ❌ 10 blu | ❌ 7 verify | ✅ |
| Resilience | ✅ | ✅ | ✅ |
| Conformity | ✅ | ✅ | ✅ |
| FRIA (tool) | ❌ 9 blu | ✅ | ✅ |
| DPIA | ❌ 19 blu | ✅ | ✅ |
| LogVault | ❌ 17 blu | ❌ 12 verify | ✅ |
| GPAI Tool | ❌ 23 blu | ✅ | ✅ |
| Art. 50 Kit | ❌ 20 blu | ❌ 19 verify | ✅ |
| Guardian Agent | ❌ 13 blu | ✅ | ✅ |
| Post-Market | ⚠ 4 blu | ❌ 14 verify | ✅ |
| modules/xai | ✅ | ✅ | ✅ |
| modules/trust-labeler | ⚠ 3 blu | ✅ | ⚠ parziale |
