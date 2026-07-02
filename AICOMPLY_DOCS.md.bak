# AIComply — Documentazione Tecnica e Funzionale Completa

> **Versione**: Giugno 2026  
> **Stack**: Next.js 16, Supabase, Vercel  
> **Scopo**: Piattaforma SaaS per la conformità al Regolamento UE 2024/1689 (EU AI Act)

---

## Indice

1. [Architettura generale](#1-architettura-generale)
2. [Autenticazione e sicurezza](#2-autenticazione-e-sicurezza)
3. [Dashboard — struttura e navigazione](#3-dashboard--struttura-e-navigazione)
4. [CORE — Strumenti principali](#4-core--strumenti-principali)
5. [Moduli di monitoraggio](#5-moduli-di-monitoraggio)
6. [Strumenti di valutazione](#6-strumenti-di-valutazione)
7. [Integrazioni](#7-integrazioni)
8. [Evidence Layer — sistema di prove](#8-evidence-layer--sistema-di-prove)
9. [Dossier Engine — stato di completamento](#9-dossier-engine--stato-di-completamento)
10. [Sistema di notifiche e scadenze](#10-sistema-di-notifiche-e-scadenze)
11. [Compliance Gateway e autorità](#11-compliance-gateway-e-autorità)
12. [Disclosure Art. 50 — componenti obbligatori](#12-disclosure-art-50--componenti-obbligatori)
13. [Account, fatturazione e impostazioni utente](#13-account-fatturazione-e-impostazioni-utente)
14. [Flusso dati e storage locale](#14-flusso-dati-e-storage-locale)
15. [Ruoli utente e visibilità](#15-ruoli-utente-e-visibilità)
16. [Limitazioni attuali e roadmap tecnica](#16-limitazioni-attuali-e-roadmap-tecnica)

---

## 1. Architettura generale

### Stack tecnologico

| Layer | Tecnologia | Versione |
|---|---|---|
| Frontend | Next.js (App Router) | 16 |
| Auth & Database | Supabase | Free plan |
| Deploy | Vercel | Auto da `main` branch |
| Styling | Tailwind CSS + inline styles | — |
| Animazioni | Framer Motion | — |
| Icone | Lucide React | — |

### Struttura cartelle principali

```
src/
├── app/
│   ├── (auth)/              # Pagine login, register, verify, verify-mfa
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify/
│   │   ├── verify-mfa/
│   │   └── actions/auth.ts  # Server Actions autenticazione
│   ├── auth/callback/       # OAuth redirect handler
│   ├── dashboard/           # Tutte le pagine autenticate
│   │   ├── layout.tsx       # Sidebar + topbar + wrapper globale
│   │   ├── page.tsx         # Homepage dashboard
│   │   ├── account/         # Pagina account utente
│   │   ├── billing/         # Pagina fatturazione
│   │   ├── security/mfa/    # Setup e gestione 2FA TOTP
│   │   ├── copilot/         # Wizard onboarding intelligente
│   │   ├── triage/          # Classificatore urgenza AI Act
│   │   ├── journey/         # Roadmap compliance step-by-step
│   │   ├── discovery/       # Scansione e inventario sistemi AI
│   │   ├── evidence-layer/  # Registro prove e audit trail
│   │   ├── modules/         # Moduli avanzati (Doc Monitor, Oversight, ecc.)
│   │   ├── tools/           # Tutti gli strumenti di valutazione
│   │   ├── post-market/     # Sorveglianza post-mercato
│   │   ├── compliance-nexus/# Hub normativo multi-framework
│   │   ├── trust-center/    # Gestione passaporti AI
│   │   ├── connectors/      # Integrazioni esterne
│   │   └── notifications/   # Centro notifiche
│   └── scanner/             # Scanner pubblico Art. 50 (no login)
├── components/
│   ├── dashboard/UserMenu.tsx     # Menu utente topbar
│   ├── disclosure/                # Componenti Art. 50
│   ├── notifications/             # NotificationBell
│   ├── compliance/                # SystemContextBanner
│   └── ui/                        # Componenti riutilizzabili
├── lib/
│   ├── auth/                      # Rate limiting, password validator
│   ├── supabase/                  # Client, server, middleware
│   ├── dossier/                   # Storage schema, dossier engine
│   ├── evidence/                  # Evidence layer, templates
│   ├── simulation/                # Engine logica AI Act
│   ├── semantic/                  # Inferenza rischio AI, scoring
│   ├── crypto/                    # Passaporti, C2PA, firma digitale
│   ├── gpai/                      # Motore GPAI
│   ├── conformity/                # Motore conformità
│   ├── compliance/                # Gateway autorità
│   ├── notifications/             # Scadenze normative
│   └── hooks/                     # useUserRole, ecc.
```

### Flusso di una richiesta autenticata

```
Browser → Next.js Middleware → [controlla sessione Supabase]
                             → [controlla 24h last_sign_in]
                             → [controlla AAL2 se TOTP attivo]
                             → Dashboard (se tutto OK)
                             → /login?reason=session_expired (se 24h scadute)
                             → /verify-mfa (se TOTP richiesto)
```

---

## 2. Autenticazione e sicurezza

### 2.1 Login email + password

**File**: `src/app/(auth)/login/page.tsx` + `src/app/(auth)/actions/auth.ts`

**Flusso**:
1. L'utente inserisce email e password nel form
2. Il client invia i dati via **Server Action** (`loginEmail`)
3. Il server verifica il **rate limit** (max 5 tentativi per IP ogni 15 minuti)
4. Se rate limit OK → chiama `supabase.auth.signInWithPassword()`
5. Se credenziali errate → restituisce errore generico ("Email o password non corretti")
6. Se login OK → controlla il livello AAL
   - Se `nextLevel === 'aal2'` (TOTP attivo) → redirect a `/verify-mfa`
   - Altrimenti → redirect a `/dashboard`

**Errori gestiti**:
- `Invalid login credentials` → "Email o password non corretti."
- `Email not confirmed` → "Email non ancora verificata."
- Rate limit superato → "Troppi tentativi. Riprova tra X minuti."

### 2.2 Registrazione

**File**: `src/app/(auth)/register/page.tsx`

**Campi**: email, password, telefono, nome azienda

**Validazioni** (via `registrationSchema` Zod):
- Email valida
- Password minimo 8 caratteri
- Azienda obbligatoria

**Controlli duplicati** (via Supabase Admin SDK):
- Email già registrata → errore specifico
- Nome azienda già registrato → errore specifico

Dopo registrazione: l'utente riceve email di verifica da Supabase. Inserisce codice OTP a 6 cifre nella pagina `/verify`.

### 2.3 Google OAuth

**File**: `src/app/(auth)/login/page.tsx` (componente `OAuthButton`) + `src/app/auth/callback/route.ts`

**Flusso**:
1. Click su "Accedi con Google"
2. Browser chiama `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin/auth/callback })`
3. Supabase reindirizza a Google
4. Dopo consenso Google → reindirizza a `[dominio]/auth/callback?code=...`
5. Il route handler scambia il code con una sessione: `supabase.auth.exchangeCodeForSession(code)`
6. Redirect a `/dashboard` se successo, `/login?error=oauth_failed` se fallisce

**Configurazione richiesta**:
- Google Cloud Console → OAuth 2.0 → tipo "Applicazione web"
- Authorized redirect URI: `https://[progetto].supabase.co/auth/v1/callback`
- Origini JavaScript autorizzate: `https://[tuo-dominio].vercel.app`
- Client ID + Secret inseriti in Supabase → Authentication → Providers → Google

### 2.4 TOTP 2FA (Two-Factor Authentication)

**File setup**: `src/app/dashboard/security/mfa/page.tsx`
**File verifica al login**: `src/app/(auth)/verify-mfa/page.tsx`

**Stati della pagina setup (5 step)**:

| Stato | Descrizione |
|---|---|
| `loading` | Controlla se TOTP è già enrollato |
| `setup-start` | Mostra pulsante "Attiva 2FA" |
| `setup-verify` | Mostra QR code + campo codice per verifica |
| `enrolled` | 2FA attivo, mostra opzione disattiva |
| `unenroll-confirm` | Chiede conferma prima di disattivare |

**Enrollment**:
1. `supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'AIComply' })`
2. Restituisce: `id` (factorId), `totp.qr_code` (immagine base64), `totp.secret` (chiave manuale)
3. L'utente scansiona il QR con Google Authenticator / Authy / Microsoft Authenticator
4. Inserisce codice a 6 cifre
5. `supabase.auth.mfa.challenge({ factorId })` → ottiene `challengeId`
6. `supabase.auth.mfa.verify({ factorId, challengeId, code })` → conferma enrollment

**Verifica al login**:
1. `supabase.auth.mfa.listFactors()` → recupera `factorId` TOTP attivo
2. `supabase.auth.mfa.challengeAndVerify({ factorId, code })` → verifica e aggiorna sessione a AAL2
3. Redirect a `/dashboard`

**Disattivazione**:
- `supabase.auth.mfa.unenroll({ factorId })` → rimuove il factor

### 2.5 Rate limiting

**File**: `src/lib/auth/rate-limit.ts`

- Storage: Map in memoria (reset al riavvio server)
- Limite: 5 tentativi per IP ogni 15 minuti (900 secondi)
- Al superamento: messaggio con minuti rimanenti
- Reset automatico al login riuscito

**Struttura**:
```typescript
Map<ip: string, { count: number; resetAt: number }>
```

> ⚠️ Limitazione: in-memory non persiste tra riavvii o istanze multiple. Per produzione su larga scala considerare Redis.

### 2.6 Sessione giornaliera (24h)

**File**: `src/lib/supabase/middleware.ts`

Ogni richiesta al dashboard controlla:
```typescript
const lastSignIn = new Date(user.last_sign_in_at ?? 0).getTime();
if (Date.now() - lastSignIn > 86_400_000) { // 24 ore
  await supabase.auth.signOut();
  redirect('/login?reason=session_expired');
}
```

Alla pagina login, se `?reason=session_expired` è presente, appare un banner giallo: "La tua sessione è scaduta (24h). Accedi di nuovo per continuare."

### 2.7 Middleware di protezione

**File**: `src/lib/supabase/middleware.ts`

Ordine di controlli per ogni richiesta al dashboard:
1. Utente non autenticato → `/login`
2. Sessione > 24h → signOut + `/login?reason=session_expired`
3. TOTP attivo ma sessione AAL1 → `/verify-mfa`
4. Utente autenticato su pagine auth → `/dashboard`

---

## 3. Dashboard — struttura e navigazione

### 3.1 Layout generale

**File**: `src/app/dashboard/layout.tsx`

**Componenti fissi**:
- `MachineMarkers` — meta tag JSON-LD Art. 50 (machine-readable, invisibile)
- `DisclosureModal` — modal di prima sessione Art. 50
- `DisclosureBanner` — barra blu dismissibile in cima (Art. 50)
- Sidebar sinistra (collassabile)
- Topbar bianca con breadcrumb, ruolo, NotificationBell, UserMenu
- `ChatAssistant` — assistente AI flottante in basso a destra

### 3.2 Sidebar

**Design**: sfondo `#0D1016` (quasi nero), testo bianco a varie opacità

**Comportamenti**:
- Collassabile (icone sole) con persistenza in `localStorage("sidebar_collapsed")`
- Responsive: su mobile si apre come overlay con sfondo scuro
- Voce attiva: `background: rgba(255,255,255,0.12)`, testo bianco pieno
- Voce normale: testo `rgba(255,255,255,0.65)`
- Badge colorati ("New", "Urgente", articolo di riferimento) accanto a ogni voce
- Barra completamento dossier in fondo

**Gruppi di navigazione**:

| Gruppo | Voci |
|---|---|
| Core | Copilot, Triage AI, Roadmap, Discovery, Evidence Layer |
| Monitoraggio | Doc Monitor, Oversight Monitor, AI Disclosure, Post-Market, Compliance Hub, NIST RMF, GPAI Module, XAI Lab |
| Integrazioni | Connectors, Trust Center, AI-Trust Passport, Notifiche, Q-AutoFill |
| Valutazioni | AI Literacy, L.132/2025, AGID/ACN, DPIA, Art. 5 Checker, AI Classifier, GPAI Assessment, Risk Manager, Data Audit, DocuGen AI, LogVault, Drift Monitor, Transparency, Oversight, Deployer, EUDB Registration, Authorized Rep., Provider Transition, Resilience, QMS Builder, FRIA, Art. 50 Kit, Conformity, Legal Assistant |

### 3.3 Topbar

**Design**: bianca `#ffffff`, altezza `h-14`, bordo inferiore sottile

**Elementi** (sinistra → destra):
- Menu hamburger (solo mobile)
- Breadcrumb: "Dashboard › [pagina corrente]"
- Badge ruolo utente (Deployer / Fornitore / Importatore / Distributore) + link "cambia"
- `NotificationBell` — campanella notifiche
- `UserMenu` — menu utente a tendina

### 3.4 UserMenu (menu utente)

**File**: `src/components/dashboard/UserMenu.tsx`

**Trigger**: avatar con iniziali (da nome azienda o email) + nome abbreviato + chevron

**Voci del dropdown**:

| Voce | Destinazione | Note |
|---|---|---|
| Account | `/dashboard/account` | Gestione dati personali (stub) |
| Fatturazione | `/dashboard/billing` | Abbonamento e fatture (stub) |
| Sicurezza 2FA | `/dashboard/security/mfa` | Setup/rimozione TOTP |
| Documentazione | `https://docs.aicomply.it` | Apre in nuova tab |
| Esci | Sign out + `/login` | In rosso, hover con sfondo rosso pallido |

**Comportamento**: si chiude al click fuori (listener `mousedown` sul document)

---

## 4. CORE — Strumenti principali

### 4.1 Copilot (`/dashboard/copilot`)

**Tipo**: wizard guidato a step con animazioni Framer Motion

**Scopo**: orientare il nuovo utente ai tool giusti in base al suo profilo

**Step del wizard**:
1. **Profilo** — Startup/Developer o Enterprise/DPO
2. **Livello di rischio** — Alto, Limitato, Minimale, GPAI
3. **Urgenza** — Immediata, Pianificazione, Esplorazione

**Output**: roadmap personalizzata di tool da completare, con stato di avanzamento (fatto/da fare) letto da `localStorage`.

**Profilo Startup/Developer**: priorità a Classifier, Scanner Art.50, DocuGen, LogVault
**Profilo Enterprise/DPO**: priorità a Risk Manager, DPIA, Conformity, QMS Builder, FRIA

### 4.2 Triage AI (`/dashboard/triage`)

**Tipo**: wizard multi-step con logica di classificazione interna

**Scopo**: determinare il livello di rischio di un sistema AI secondo l'EU AI Act, identificare obblighi urgenti

**Step**:
1. **Ruolo** — Provider, Deployer, Importatore, Distributore, Sconosciuto
2. **Settore** — HR, Salute, Educazione, Finanza, Forze dell'ordine, Infrastrutture, PA, Altro
3. **Tipo output** — Decisioni, Generazione contenuti, Profilazione, Biometria, Ottimizzazione interna, Altro
4. **Dati personali** — Sensibili, Personali, Nessuno
5. **Decisioni automatizzate** — Totali, Di supporto, Nessuna
6. **Utenti finali** — Cittadini, Lavoratori, Minori, ecc.
7. **Deployment** — Solo UE, UE + altri, Fuori UE
8. **Fase** — Sviluppo, Produzione, Aggiornamento
9. **Segnali di rischio** — Biometria, Infrastrutture critiche, Giustizia, ecc.
10. **Risultato** — Report completo

**Output (TriageReport)**:
- `riskTier`: `prohibited` | `high` | `limited` | `minimal` | `gpai`
- `urgentActions[]`: azioni urgenti con articolo, scadenza e link al tool
- `applicableArticles[]`: articoli applicabili con obblighi
- `estimatedEffortDays`: stima giorni di lavoro
- `summary`: testo descrittivo
- `prohibitedFlags[]`: flag pratiche vietate rilevate

**Tier vietato** (`prohibited`): se rileva segnali come sistemi social scoring, manipolazione subliminale, identificazione biometrica in spazi pubblici per forze dell'ordine senza eccezioni → blocco con messaggio critico e link all'Art. 5 Checker.

### 4.3 Roadmap (`/dashboard/journey`)

**Tipo**: checklist interattiva per fasi

**Scopo**: guida step-by-step attraverso il percorso di conformità completo

**Struttura**: fasi numerate, ognuna con tool collegati. Per ogni tool:
- Stato: completato ✓ (verde) o da fare (grigio)
- Stato letto da `localStorage` tramite `storageKey`
- Link diretto al tool
- Articolo di riferimento EU AI Act
- Urgenza (`urgent: true` → bordo rosso)
- Opzionalità (`optional: true`)

**Fasi tipiche**:
1. Classificazione e assessment iniziale
2. Documentazione tecnica
3. Governance e controllo umano
4. Trasparenza e disclosure
5. Registrazione e conformità

### 4.4 Discovery (`/dashboard/discovery`)

**Tipo**: scanner inventario sistemi AI

**Scopo**: mappare tutti i sistemi AI in uso nell'organizzazione prima di iniziare la compliance

**Sorgenti supportate**:
- Upload file (codice, manifest, requirements.txt)
- Connessione a repository GitHub
- Scan di pacchetti npm/pip
- Connessione a cloud provider (AWS, GCP, Azure)
- Rilevamento modelli AI (API keys, endpoint)

**Output per ogni sistema scoperto**:
- Nome e tipo sistema
- Livello di rischio stimato
- Articoli EU AI Act applicabili
- Raccomandazioni immediate

**Salvataggio**: `localStorage` con chiave `discovery_sources` e `discovered_systems`

---

## 5. Moduli di monitoraggio

### 5.1 Doc Monitor — AIA Architect (`/dashboard/modules/aia-architect`)

**Articolo**: Art. 11 EU AI Act (Documentazione tecnica)

**Scopo**: analisi AST del codice sorgente per generare automaticamente la documentazione tecnica richiesta dall'Allegato IV

**Funzioni**:
- `analyzeCodeAST()` — analizza il codice e rileva funzioni, classi, dipendenze
- `generateAnnexIVJSON()` — genera documento strutturato Allegato IV
- `signDocument()` — firma digitale del documento

**Output**: documento JSON/PDF scaricabile con struttura Allegato IV EU AI Act

**Integrazione**: scrive su `evidence-layer` e `dossier storage`

### 5.2 Oversight Monitor — Guardian Agent (`/dashboard/modules/guardian-agent`)

**Articolo**: Art. 14 EU AI Act (Supervisione umana)

**Scopo**: monitor in tempo reale del sistema AI con kill switch e log eventi

**Stati del Kill Switch**:
- `disarmed` — disattivato
- `armed` — armato (attivazione rapida possibile)
- `triggered` — attivato, sistema bloccato
- `overridden` — override manuale operatore

**Livelli di escalation**:
- `watch` — monitoraggio passivo
- `assist` — assistenza decisionale
- `autonomous` — operazione autonoma (massimo rischio)

**Log eventi**: severità `info` | `warning` | `critical`, con trace e timestamp

**Integrazione**: scrive eventi su `evidence-layer`

### 5.3 AI Disclosure — Trust Labeler (`/dashboard/modules/trust-labeler`)

**Articolo**: Art. 50 EU AI Act (Obblighi di trasparenza)

**Scopo**: generare e verificare etichette di disclosure per contenuti AI (testi, immagini, video, audio)

**Tipi di contenuto supportati**:
- Messaggi di chat
- Immagini
- Video
- Audio
- Documenti

**Funzioni**:
- `generateC2PAManifest()` — genera manifest C2PA (standard Content Provenance)
- `verifyC2PAManifest()` — verifica autenticità manifest esistente

**Output**: label AI con firma digitale, scaricabile e copiabile

### 5.4 Post-Market Surveillance (`/dashboard/post-market`)

**Articolo**: Art. 72 EU AI Act

**Scopo**: gestione sorveglianza post-mercato e segnalazione incidenti

**Funzionalità**:
- Registro incidenti (data, tipo, gravità, descrizione)
- Form segnalazione all'autorità competente
- Notifiche automatiche per nuovi incidenti
- Timeline eventi
- Download report PDF

**Output**: ogni incidente viene aggiunto all'`evidence-layer`

### 5.5 Compliance Hub (`/dashboard/compliance-nexus`)

**Articolo**: Art. 71 EU AI Act (Sorveglianza del mercato)

**Scopo**: hub multi-framework per gestire la conformità a più normative contemporaneamente

**Framework supportati**:
- EU AI Act
- GDPR
- NIS2
- ISO 27001
- SOC 2

**Funzionalità**:
- Stato conformità per ogni framework
- Link alle autorità competenti
- Download dichiarazioni
- Comunicazioni con autorità (via Compliance Gateway)

### 5.6 NIST AI RMF (`/dashboard/tools/nist-rmf`)

**Tipo**: checklist interattiva multi-framework

**Scopo**: mappare la conformità al NIST AI Risk Management Framework (versione US), in parallelo all'EU AI Act

**Funzioni NIST**:
- `GOVERN` — governance e cultura del rischio
- `MAP` — identificazione contesto e rischi
- `MEASURE` — misurazione e analisi rischi
- `MANAGE` — gestione e risposta ai rischi

Ogni sotto-categoria ha stato di completamento con persistenza in `localStorage`.

### 5.7 GPAI Module (`/dashboard/modules/gpai`)

**Articoli**: Art. 51-55 EU AI Act (Modelli AI per uso generale)

**Scopo**: gestione inventario modelli GPAI e obblighi specifici

**Funzionalità**:
- Catalogo modelli GPAI in uso (GPT-4, Claude, Gemini, ecc.)
- Ruolo dell'organizzazione: provider del modello o deployer
- Obblighi applicabili per ruolo e tipo modello
- Punteggio di conformità GPAI
- Generazione documenti:
  - Notice di trasparenza
  - Policy copyright
  - Report incidenti
- Red team simulation: test attacchi avversariali
- Drift monitor: rilevamento deriva del modello nel tempo

### 5.8 XAI Lab (`/dashboard/modules/xai`)

**Articolo**: Art. 13 EU AI Act (Trasparenza e fornitura di informazioni)

**Scopo**: analisi della spiegabilità del sistema AI (Explainable AI)

**Funzioni**:
- `computeGlobalFeatureImportance()` — importanza globale delle feature
- `runBiasAnalysis()` — analisi bias per gruppi demografici
- `generateCounterfactuals()` — esempi controfattuali ("cosa sarebbe cambiato se...")

**Output**: grafici, tabelle, testo esplicativo scaricabile

---

## 6. Strumenti di valutazione

### 6.1 AI Classifier (`/dashboard/tools/classifier`)

**Articolo**: Art. 6 EU AI Act (Classificazione sistemi AI ad alto rischio)

**Scopo**: classificare il sistema AI per livello di rischio con analisi del codice

**Pipeline di analisi**:
1. Input: codice sorgente o descrizione del sistema
2. `scanRepository()` — scansione file e dipendenze
3. `classifyRisk()` — classificazione rischio base
4. `matchCodeToLaw()` — mappa frammenti di codice agli articoli EU AI Act
5. `inferRisk()` — inferenza semantica del rischio
6. `analyzeSchema()` — analisi schema dati
7. `generatePolicyCard()` — genera scheda policy
8. `translateToHumanText()` — testo leggibile per non tecnici
9. `AIRiskScorer` — punteggio finale 0-100
10. `scanProfiling()` — rileva segnali di profilazione
11. `hasHardBlock()` — rileva pratiche vietate
12. `generateExemptionDossier()` — genera dossier esenzioni se applicabile

**Output**:
- Tier di rischio: `unacceptable` | `high` | `limited` | `minimal`
- Articoli applicabili
- Punteggio rischio
- Policy card scaricabile
- Conformity Passport con firma crittografica

**Integrazione**: scrive risultato su `storage_schema` (chiave `classifier`) e `evidence-layer`

### 6.2 Risk Manager (`/dashboard/tools/risk-manager`)

**Articolo**: Art. 9 EU AI Act (Sistema di gestione del rischio)

**Scopo**: registro completo dei rischi con scoring e piano di mitigazione

**Struttura di un rischio**:
- Categoria: `RiskCategory` (tecnico, operativo, normativo, etico, ecc.)
- Probabilità (1-5)
- Impatto (1-5)
- Score = Probabilità × Impatto
- Controlli di mitigazione
- Responsabile
- Stato (aperto, in mitigazione, chiuso)

**Funzionalità**:
- Aggiunta, modifica, eliminazione rischi
- Calcolo automatico score
- Matrice rischio visuale
- Filtri per categoria/stato
- Export CSV/JSON
- Firma digitale (Sign Off Panel)

**Integrazione**: scrive su `dossier storage` e `evidence-layer`

### 6.3 Art. 5 Checker (`/dashboard/tools/prohibited`)

**Articolo**: Art. 5 EU AI Act (Pratiche di IA vietate)

**Scopo**: verificare che il sistema AI non rientri nelle pratiche vietate dall'EU AI Act

**Pratiche verificate** (da `PROHIBITED_CHECKS`):
- Manipolazione subliminale o subconsciente
- Sfruttamento vulnerabilità (età, disabilità)
- Social scoring governativo
- Valutazione rischio criminale basata su caratteristiche personali
- Riconoscimento emozioni sul lavoro/scuola
- Categorizzazione biometrica per caratteristiche protette
- Identificazione biometrica remota real-time in spazi pubblici

**Risposta possibile per ogni check**: Sì / No / Non applicabile / Non so

**Output** (`FinalVerdict`):
- `clear` — nessuna pratica vietata
- `warning` — aree grigie, revisione legale necessaria
- `blocked` — sistema potenzialmente vietato, richiede analisi legale urgente

**Integrazione**: scrive su `dossier storage` e `evidence-layer`

### 6.4 DocuGen AI (`/dashboard/tools/docugen`)

**Articolo**: Art. 11 + Allegato IV EU AI Act

**Scopo**: generare automaticamente la documentazione tecnica richiesta

**Sezioni del documento** (Allegato IV):
1. Descrizione generale del sistema
2. Descrizione dello sviluppo
3. Informazioni su dati di addestramento e test
4. Misure di monitoraggio e supervisione
5. Spiegazione delle decisioni automatizzate
6. Misure di cybersecurity
7. Descrizione delle misure di supervisione umana

**Funzionalità**:
- Pre-compilazione da dati già inseriti in altri tool (Classifier, Data Audit, Risk Manager)
- Editor testo per ogni sezione
- Stato sezione: `empty` | `draft` | `done`
- Versioning (versione attiva selezionabile)
- Download PDF/JSON
- `SystemContextBanner` — mostra dati di contesto sistema già salvati

**Integrazione**: legge da `classifier`, `data-audit`, `risk-manager` nello storage; scrive su `docugen` e `evidence-layer`

### 6.5 Data Audit (`/dashboard/tools/data-audit`)

**Articolo**: Art. 10 EU AI Act (Dati e governance dei dati)

**Scopo**: audit completo dei dataset usati per addestrare/valutare il sistema AI

**Campi per ogni dataset**:
- Nome e descrizione
- Origine dati
- Contenuto dati personali (sì/no + tipo)
- Misure di pulizia applicate
- Bias identificati e mitigazioni
- Dimensione e periodo temporale

**Output**: report audit dati scaricabile, integrazione con DocuGen

### 6.6 DPIA (`/dashboard/tools/dpia`)

**Articolo**: Art. 35 GDPR + Art. 9 EU AI Act

**Scopo**: Data Protection Impact Assessment per sistemi AI che trattano dati personali

**Sezioni del wizard multi-step**:
1. **Screening** — criteri per determinare se DPIA è obbligatoria
2. **Asset** — inventario dati personali trattati
3. **Minacce** — analisi minacce alla privacy
4. **Proporzionalità** — verifica necessità e proporzionalità
5. **Diritti** — impatto sui diritti degli interessati
6. **Misure** — misure di mitigazione

**Pre-compilazione**: legge da `classifier` e `data-audit` già completati

**Output**: report DPIA completo firmabile e scaricabile

### 6.7 LogVault (`/dashboard/tools/logvault`)

**Articolo**: Art. 12 EU AI Act (Registrazione automatica dei log)

**Scopo**: sistema di logging immutabile con catena hash per audit trail

**Funzioni**:
- `generateLogChain()` — genera catena di log con hash SHA-256 concatenati
- `verifyChain()` — verifica integrità della catena (nessun log alterato)
- `parseImportedJSON()` / `parseImportedCSV()` — importa log esistenti
- **Kill Switch**: pulsante che va tenuto premuto 3 secondi per attivare blocco di emergenza

**Livelli di evento**: `info` | `warning` | `error` | `critical`

**Output**: export JSON/CSV della catena di log verificata

**DBStatusBadge**: indicatore visivo della sorgente dati (database, localStorage, simulato)

### 6.8 AI Literacy (`/dashboard/tools/literacy`)

**Articolo**: Art. 4 EU AI Act (Alfabetizzazione AI)

**Scopo**: tracciare il programma di formazione obbligatoria del personale

**Struttura record formazione**:
- Categoria: `fondamenti` | `rischi` | `normativa` | `strumenti` | `etica` | `altro`
- Titolo e descrizione corso
- Dipendenti formati (lista nomi)
- Data completamento
- Ore di formazione
- Materiale allegato (link)
- Stato: `pianificato` | `in corso` | `completato`

**Funzionalità**:
- Aggiunta/rimozione record
- Filtro per categoria
- Dashboard riepilogo: totale ore, % personale formato
- Export CSV

### 6.9 L.132/2025 (`/dashboard/tools/l132`)

**Riferimento**: Legge italiana 132/2025 (recepimento EU AI Act in Italia)

**Scopo**: checklist obblighi specifici della legge italiana sull'AI

**Funzionalità**: wizard di verifica con articoli specifici della legge nazionale, integrazione con il dossier europeo

### 6.10 AGID / ACN (`/dashboard/tools/agid-acn`)

**Riferimento**: Linee guida AGID e ACN per IA nella PA italiana

**Scopo**: conformità specifica per Pubblica Amministrazione italiana

### 6.11 Drift Monitor (`/dashboard/tools/drift-monitor`)

**Articolo**: Art. 15 EU AI Act (Accuratezza, robustezza e cybersecurity)

**Scopo**: monitoraggio deriva del modello AI nel tempo

**Metriche monitorate**:
- Deriva delle feature (feature drift)
- Deriva del target (concept drift)
- Deriva delle prestazioni (accuracy drift)
- Alerting su soglie configurabili

### 6.12 Transparency (`/dashboard/tools/transparency`)

**Articolo**: Art. 13 EU AI Act

**Scopo**: generazione documenti di trasparenza per utenti finali e stakeholder

### 6.13 Oversight (`/dashboard/tools/oversight`)

**Articolo**: Art. 14 EU AI Act

**Scopo**: piano di supervisione umana del sistema AI

### 6.14 QMS Builder (`/dashboard/tools/qms`)

**Articolo**: Art. 17 EU AI Act (Sistema di gestione della qualità)

**Scopo**: costruire e documentare il Quality Management System

### 6.15 FRIA (`/dashboard/tools/fria`)

**Articolo**: Art. 27 EU AI Act (Valutazione impatto diritti fondamentali)

**Scopo**: Fundamental Rights Impact Assessment

### 6.16 Conformity Assessment (`/dashboard/tools/conformity`)

**Articolo**: Art. 43 EU AI Act (Valutazione di conformità)

**Scopo**: determinare il percorso di valutazione e generare la Dichiarazione di Conformità

**Funzioni**:
- `determineAssessmentPath()` — auto-valutazione o terza parte?
- `loadAllEvidence()` — aggrega prove da tutti i tool
- `calculateConformityScore()` — punteggio 0-100
- `generateDeclarationOfConformity()` — genera dichiarazione formale
- `submitToAuthority()` — invia a autorità tramite Compliance Gateway

**Output**: Dichiarazione di Conformità UE scaricabile e firmabile

### 6.17 EUDB Registration (`/dashboard/tools/eudb`)

**Articolo**: Art. 49 EU AI Act (Registrazione nella banca dati UE)

**Scopo**: preparare e inviare la registrazione al database europeo EU AI Act

### 6.18 Authorized Rep. (`/dashboard/tools/authorized-rep`)

**Articolo**: Art. 22 EU AI Act (Rappresentante autorizzato)

**Scopo**: gestione del mandato al rappresentante autorizzato UE (per provider extra-UE)

### 6.19 Provider Transition (`/dashboard/tools/provider-transition`)

**Articolo**: Art. 28 EU AI Act (Obblighi dei deployer che diventano provider)

**Scopo**: gestire la transizione di ruolo da deployer a provider

### 6.20 Resilience (`/dashboard/tools/resilience`)

**Articolo**: Art. 15 EU AI Act

**Scopo**: piano di resilienza e continuità operativa del sistema AI

### 6.21 Art. 50 Kit (`/dashboard/tools/art50-kit`)

**Articolo**: Art. 50 EU AI Act (Obblighi di trasparenza)

**Scopo**: kit completo per la compliance Art. 50 (label AI, watermark, disclosure)

### 6.22 Legal Assistant (`/dashboard/tools/legal-assistant`)

**Articolo**: Art. 9 EU AI Act

**Scopo**: assistente AI per domande legali sulla compliance EU AI Act

### 6.23 Deployer Tool (`/dashboard/tools/deployer`)

**Articolo**: Art. 26 EU AI Act (Obblighi dei deployer)

**Scopo**: checklist obblighi specifici per i deployer di sistemi AI

### 6.24 GPAI Assessment (`/dashboard/tools/gpai`)

**Articoli**: Art. 53-55 EU AI Act

**Scopo**: valutazione specifica per provider di modelli AI per uso generale

### 6.25 Q-AutoFill (`/dashboard/tools/questionnaire`)

**Scopo**: compilazione automatica di questionari acquirenti (Buyer Q)

**Funzionalità**: carica questionario di un potenziale cliente o partner, pre-compila le risposte basandosi sui dati già inseriti nel dossier

---

## 7. Integrazioni

### 7.1 Connectors (`/dashboard/connectors`)

**Scopo**: collegare AIComply a sistemi esterni

**Integrazioni previste**:
- GitHub / GitLab (repository codice)
- Jira / Linear (issue tracking)
- Slack / Teams (notifiche)
- AWS / GCP / Azure (cloud scanning)
- SIEM (log security)

### 7.2 Trust Center (`/dashboard/trust-center`)

**Scopo**: portale pubblico di fiducia dell'organizzazione

**Funzionalità**:
- Generazione e gestione Conformity Passport
- `generatePassport()` — crea passaporto con firma crittografica
- `getPassportSummary()` — riepilogo pubblico del passaporto
- `exportForRegulator()` — export formato autorità di vigilanza
- URL pubblico condivisibile con clienti/partner/autorità

### 7.3 AI-Trust Passport (`/dashboard/tools/trust-passport`)

**Scopo**: passaporto digitale del sistema AI (Selling Kit)

**Contenuto**:
- Identità del sistema
- Livello di rischio certificato
- Obblighi assolti (lista con checksum)
- Firma digitale con timestamp
- QR code verificabile

**Funzioni crittografiche** (`src/lib/crypto/passport.ts`):
- `generatePassport()` — genera con firma
- `verifyPassport()` — verifica autenticità
- `exportForRegulator()` — formato regolatorio

---

## 8. Evidence Layer — sistema di prove

**File**: `src/lib/evidence/evidence-layer.ts` + `src/app/dashboard/evidence-layer/page.tsx`

### Scopo

Registro immutabile di tutte le prove di conformità generate dall'utente durante l'uso dei tool. Ogni tool scrive automaticamente sull'evidence layer quando produce un risultato.

### Struttura di un record

```typescript
interface EvidenceRecord {
  id: string;           // UUID univoco
  type: EvidenceType;   // tipo di prova
  timestamp: string;    // ISO 8601
  hash: string;         // SHA-256 del contenuto
  content: object;      // dati specifici per tipo
  prevHash: string;     // hash record precedente (catena)
}
```

### Tipi di prove (EvidenceType)

| Tipo | Tool di origine | Descrizione |
|---|---|---|
| `adr` | Risk Manager | Architectural Decision Record |
| `log` | LogVault | Evento di log |
| `classifier` | AI Classifier | Risultato classificazione rischio |
| `dpia` | DPIA | Data Protection Impact Assessment |
| `docugen` | DocuGen AI | Sezione documentazione tecnica |
| `conformity` | Conformity | Risultato valutazione conformità |
| `audit` | Data Audit | Record audit dati |
| `incident` | Post-Market | Segnalazione incidente |
| `training` | AI Literacy | Record formazione completata |
| `passport` | Trust Center | Passaporto AI generato |

### Integrità della catena

`verifyChain()` verifica che ogni record contenga l'hash del precedente. Se un record è stato alterato, la catena si rompe → alert visivo.

### Templates

`EVIDENCE_TEMPLATES` fornisce strutture predefinite per ogni tipo di prova, facilitando la compilazione manuale dall'interfaccia Evidence Layer.

---

## 9. Dossier Engine — stato di completamento

**File**: `src/lib/dossier/dossier-engine.ts` + `src/lib/dossier/storage-schema.ts`

### Scopo

Calcola la percentuale di completamento del dossier di conformità leggendo da `localStorage` i risultati di tutti i tool.

### Sezioni del dossier

Ogni sezione corrisponde a uno o più tool:

| Sezione | Tool | Storage key |
|---|---|---|
| Classificazione rischio | AI Classifier | `classifier` |
| Pratiche vietate | Art. 5 Checker | `prohibited` |
| Gestione rischio | Risk Manager | `risk_manager` |
| Dati e governance | Data Audit | `data_audit` |
| Documentazione tecnica | DocuGen AI | `docugen` |
| Logging | LogVault | `logvault` |
| DPIA | DPIA | `dpia` |
| Conformità | Conformity | `conformity` |
| Formazione | AI Literacy | `literacy` |

### Calcolo completamento

```typescript
getCompletionPercentage(sections) // → 0-100
getCompletedCount(sections)       // → { done: N, total: N }
```

### Visualizzazione

- Sidebar: barra progresso in fondo
- Dashboard homepage: card con % e conteggio sezioni

---

## 10. Sistema di notifiche e scadenze

**File**: `src/lib/notifications/notifications-engine.ts`
**Componente**: `src/components/notifications/NotificationBell.tsx`

### Scadenze normative (`REGULATORY_DEADLINES`)

Array di scadenze EU AI Act con:
- Data scadenza
- Articolo di riferimento
- Descrizione obbligo
- Urgenza (giorni rimanenti)
- Link al tool

### NotificationBell

- Campanella in topbar con badge rosso se ci sono scadenze urgenti
- Click apre pannello notifiche
- Notifiche divise per: urgenti (<30gg), imminenti (<90gg), future

### `daysUntil(deadline)`

Calcola giorni alla scadenza da oggi (2026-06-08).

---

## 11. Compliance Gateway e autorità

**File**: `src/lib/compliance/gateway.ts`

### Scopo

Interfaccia per comunicare formalmente con le autorità di vigilanza nazionali ed europee.

### Funzione principale

`submitToAuthority(data, authority)` — invia documentazione formale

### Autorità supportate
- AGID (Italia — sistemi PA)
- Garante Privacy (Italia — sistemi con dati personali)
- ENISA (EU — cybersecurity)
- Commissione Europea — database EUDB

---

## 12. Disclosure Art. 50 — componenti obbligatori

Tre componenti presenti su **tutte** le pagine autenticate, non rimovibili dal codice (solo il banner è dismissibile dall'utente):

### 12.1 MachineMarkers

**File**: `src/components/disclosure/MachineMarkers.tsx`

Inietta nel `<head>` della pagina:
- Meta tag `<meta name="ai-generated" content="partial">`
- JSON-LD Schema.org con `disclosure: "AI-assisted"`

Invisibile all'utente, leggibile da crawler e strumenti automatici.

### 12.2 DisclosureModal

**File**: `src/components/disclosure/DisclosureModal.tsx`

- Modal bloccante alla **prima sessione** dell'utente
- Testo legale Art. 50 in italiano/inglese
- Richiede click su "Ho capito" per proseguire
- Stato salvato in `localStorage` per non mostrarlo nuovamente

### 12.3 DisclosureBanner

**File**: `src/components/disclosure/DisclosureBanner.tsx`

- Barra blu `#E6F1FB` in cima, altezza 32px
- Testo: "I contenuti di AIComply sono generati con il supporto dell'intelligenza artificiale — Art. 50 Reg. UE 2024/1689. Richiedono sempre revisione legale prima dell'uso ufficiale."
- Pulsante X a destra per dismissione (solo UI, non persiste nel reload)

### 12.4 AIOutputLabel

**File**: `src/components/disclosure/AIOutputLabel.tsx`

Componente inline usato all'interno dei tool per etichettare singoli output AI con label "Generato con AI — revisione richiesta".

---

## 13. Account, fatturazione e impostazioni utente

### 13.1 Account (`/dashboard/account`)

**Stato attuale**: stub (placeholder)

**Funzionalità pianificate**:
- Modifica email
- Cambio password
- Aggiornamento nome azienda e telefono
- Eliminazione account

### 13.2 Fatturazione (`/dashboard/billing`)

**Stato attuale**: stub (placeholder)

**Funzionalità pianificate**:
- Visualizzazione piano corrente
- Upgrade/downgrade piano
- Metodi di pagamento
- Storico fatture e download

### 13.3 Sicurezza 2FA (`/dashboard/security/mfa`)

**Stato attuale**: completamente funzionale (vedi sezione 2.4)

---

## 14. Flusso dati e storage locale

### Strategia di storage

AIComply usa principalmente **localStorage** del browser per la persistenza dei dati del dossier. Questo significa:

| Pro | Contro |
|---|---|
| Nessun costo database | Dati non sincronizzati tra dispositivi |
| Privacy by default (dati sul device) | Persi se si cancella la cache |
| Funziona offline | Non accessibili da API esterne |
| Veloce (nessuna latenza) | Limite ~5-10MB per origine |

### Schema storage (`src/lib/dossier/storage-schema.ts`)

Ogni tool ha una chiave dedicata e un tipo TypeScript:

```typescript
// Esempio
writeToStorage<ClassifierResult>('classifier', result);
readFromStorage<ClassifierResult>('classifier'); // → ClassifierResult | null
```

### Chiavi storage principali

| Chiave | Tipo | Tool |
|---|---|---|
| `classifier` | `ClassifierResult` | AI Classifier |
| `risk_manager` | `RiskManagerResult` | Risk Manager |
| `prohibited` | `ProhibitedCheckResult` | Art. 5 Checker |
| `data_audit` | `DataAuditResult` | Data Audit |
| `docugen_state` | `DocuGenState` | DocuGen AI |
| `logvault` | `LogvaultResult` | LogVault |
| `dpia` | `DPIAResult` | DPIA |
| `conformity` | `ConformitySnapshot` | Conformity |
| `ai_literacy_store` | `LiteracyStore` | AI Literacy |
| `discovery_sources` | `DiscoverySource[]` | Discovery |
| `sidebar_collapsed` | `boolean` | Layout |
| `onboarding_done` | `boolean` | Onboarding |
| `disclosure_modal_shown` | `boolean` | DisclosureModal |

---

## 15. Ruoli utente e visibilità

**File**: `src/lib/hooks/useUserRole.ts`

### Ruoli disponibili

| Ruolo | Label | Descrizione |
|---|---|---|
| `provider` | Fornitore | Sviluppa e commercializza il sistema AI |
| `deployer` | Deployer | Usa il sistema AI per scopi propri |
| `importer` | Importatore | Importa sistemi AI da paesi extra-UE |
| `distributor` | Distributore | Distribuisce sistemi AI senza modificarli |

### Tool nascosti per ruolo

Alcuni tool non sono rilevanti per certi ruoli e vengono nascosti dalla sidebar:

**Deployer** — nascosti: AIA Architect, DocuGen, Resilience, QMS, Conformity, XAI Lab, GPAI Module  
**Importatore** — nascosti: AIA Architect, Guardian Agent, Oversight, Resilience, QMS, GPAI Module  
**Distributore** — nascosti: molti tool tecnici (AIA Architect, Guardian Agent, DocuGen, Oversight, Data Audit, Resilience, QMS, Conformity, XAI Lab, GPAI Module, FRIA, Risk Manager, LogVault, Post-Market)

### Cambio ruolo

Link "cambia" nella topbar → `/dashboard/onboarding?changeRole=1` → ri-esegue wizard onboarding per selezionare nuovo ruolo.

---

## 16. Limitazioni attuali e roadmap tecnica

### Limitazioni attuali

| Limitazione | Dettaglio | Soluzione futura |
|---|---|---|
| Storage browser-only | Dati persi cambiando device/browser | Migrazione a Supabase DB |
| Rate limiting in-memory | Non persiste tra riavvii | Redis o Supabase Edge Functions |
| Stub pages account/billing | Non funzionali | Integrazione Stripe + gestione profilo |
| Supabase Free plan | No time-box sessioni nativo, limiti API | Upgrade a Supabase Pro |
| Microsoft OAuth | Rimosso (client Azure non configurato) | Riabilitare con credenziali Azure corrette |
| Nessun DB per Evidence Layer | Solo localStorage | Supabase tabella `evidence_records` |
| Scanner Art. 50 pubblico | Non documentato qui, ma esiste `/scanner` | — |
| Documentazione `docs.aicomply.it` | Dominio non ancora attivo | Da configurare |

### Prossimi sviluppi tecnici consigliati

1. **Persistenza cloud**: migrare `writeToStorage/readFromStorage` su Supabase PostgreSQL con RLS per multi-device
2. **Stripe billing**: integrare Stripe per gestione abbonamenti in `/dashboard/billing`
3. **Profilo utente**: endpoint Supabase per aggiornare `user_metadata` da `/dashboard/account`
4. **Email transazionali**: Supabase + Resend per notifiche scadenze normative
5. **Microsoft OAuth**: configurare Azure App Registration e riabilitare il pulsante
6. **Export PDF reale**: usare Puppeteer/html2pdf al posto di testo plain per i download
7. **Multi-tenant**: separare dossier per organizzazione (company ID come prefisso storage)
8. **API pubblica**: endpoints REST per integrazioni enterprise

---

*Documento generato automaticamente dal codice sorgente AIComply — Giugno 2026*  
*Per modifiche o correzioni: aprire issue su GitHub o contattare il team tecnico.*
