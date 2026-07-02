"use client";

import React, { useState, useRef, useEffect, useCallback, CSSProperties } from "react";
import {
  MessageCircle, X, Send, ChevronDown,
  RotateCcw, Minimize2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
}

interface KBEntry {
  id: string;
  keywords: string[];
  topic: string;
  answer: string;
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KB: KBEntry[] = [
  // ── GENERALE ────────────────────────────────────────────────────────────────
  {
    id: "gen_start",
    topic: "Per iniziare",
    keywords: ["iniziare", "start", "cominciare", "primo passo", "dove", "come iniziare", "sequenza", "ordine", "percorso"],
    answer: `**Da dove iniziare con AIComply?**

Il percorso consigliato è sequenziale:

1. 🔴 **Art. 5 Checker** — Prima di tutto, verifica se il tuo sistema AI rientra nelle pratiche *vietate*. Se c'è una violazione, inutile continuare.
2. 🎯 **AI Classifier** — Classifica il livello di rischio (inaccettabile / alto / limitato / minimale). Questo determina tutti gli obblighi successivi.
3. ⚙️ Segui la **Roadmap** (menu → Roadmap) che ti guida passo passo in base al tuo ruolo (Provider, Deployer, Importer, Distributor) e al livello di rischio emerso.

Se il sistema è ad **alto rischio** (Allegato III), dovrai completare tutti i tool principali: Risk Manager, Data Audit, DocuGen, LogVault, Transparency, Oversight, Resilience, QMS, Conformity.`,
  },
  {
    id: "gen_aiact",
    topic: "AI Act",
    keywords: ["ai act", "regolamento", "cosa è", "ue", "europa", "normativa", "legge", "2024", "2025", "obblighi", "compliance"],
    answer: `**Cos'è l'EU AI Act?**

Il Regolamento UE 2024/1689 (AI Act) è il primo quadro normativo completo sull'intelligenza artificiale al mondo. È entrato in vigore il **1° agosto 2024**.

**Timeline applicativa:**
- Febbraio 2025 → divieti pratiche vietate (Art. 5)
- Agosto 2025 → obblighi GPAI e governance
- Agosto 2026 → obblighi sistemi alto rischio (Allegato III)
- Agosto 2027 → sistemi alto rischio già sul mercato

**Struttura a livelli di rischio:**
- 🚫 **Inaccettabile** — proibiti
- 🔴 **Alto rischio** — obblighi estesi (Allegati II e III)
- 🟡 **Rischio limitato** — obblighi trasparenza
- 🟢 **Rischio minimale** — liberi

AIComply copre tutti gli obblighi attraverso i suoi tool.`,
  },
  {
    id: "gen_ruoli",
    topic: "Ruoli",
    keywords: ["ruolo", "provider", "deployer", "fornitore", "distributore", "importer", "importatore", "chi sono", "mio ruolo"],
    answer: `**Ruoli AI Act — chi sei?**

🏭 **Provider (Fornitore):** Sviluppa e immette sul mercato sistemi AI. Ha gli obblighi più ampi: documentazione tecnica, QMS, conformity assessment, registrazione EU.

🏢 **Deployer (Operatore/Utilizzatore):** Usa il sistema AI in un contesto professionale. Deve fare FRIA (settore pubblico), DPIA (se dati personali), supervisione umana.

📦 **Importer:** Importa da paesi terzi sistemi AI ad alto rischio. Verifica la conformità del provider straniero.

🛒 **Distributor:** Distribuisce senza modificare. Obblighi limitati: verifica marcatura CE, documentazione presente.

Puoi cambiare il tuo ruolo in AIComply dal menu in alto → "cambia".`,
  },
  {
    id: "gen_dossier",
    topic: "Dossier",
    keywords: ["dossier", "completamento", "percentuale", "export", "download", "report", "archivio", "documentazione"],
    answer: `**Il Dossier AIComply**

Il Dossier aggrega automaticamente i risultati di tutti i tool completati in un unico documento strutturato.

**Come funziona:**
- Ogni tool, una volta completato, salva i dati in localStorage
- Il Dossier li raccoglie e mostra la % di completamento
- Puoi esportare il dossier completo in formato JSON

**Cosa contiene:**
Risultati di tutti i tool: Classifier, Risk Manager, Data Audit, DocuGen, LogVault, Transparency, Oversight, Resilience, QMS, FRIA, DPIA, Conformity, XAI, GPAI e altri.

**Consiglio:** Completa prima tutti i tool obbligatori per il tuo livello di rischio, poi esporta il dossier per l'audit o la valutazione di conformità.`,
  },

  // ── ART. 5 CHECKER ──────────────────────────────────────────────────────────
  {
    id: "tool_prohibited",
    topic: "Art. 5 Checker",
    keywords: ["art 5", "vietato", "proibito", "pratiche vietate", "prohibited", "checker", "manipolazione", "social scoring", "biometria", "sublim"],
    answer: `**Art. 5 Checker — Pratiche vietate**

📍 Menu: *Valutazioni → Art. 5 Checker*

**A cosa serve:** Verifica se il tuo sistema AI rientra nelle 8 categorie di pratiche vietate dall'Art. 5 dell'AI Act (dal febbraio 2025).

**Pratiche vietate principali:**
1. Manipolazione subliminale (al di là della coscienza)
2. Sfruttamento vulnerabilità (età, disabilità, situazione socioeconomica)
3. Social scoring da autorità pubbliche
4. Riconoscimento biometrico real-time in spazi pubblici (con eccezioni)
5. Inferenza emozioni in luoghi di lavoro/istruzione
6. Classificazione biometrica per caratteristiche sensibili
7. Predictive policing su base individuale
8. Web scraping biometrico per database di riconoscimento facciale

**Cosa ti serve:**
- Descrizione del sistema AI
- Rispondere sì/no/non so a ciascuna pratica

**Risultato:** Verdict — *clear*, *conditional*, *potential violation*, *violation*.`,
  },

  // ── AI CLASSIFIER ───────────────────────────────────────────────────────────
  {
    id: "tool_classifier",
    topic: "AI Classifier",
    keywords: ["classifier", "classificatore", "rischio", "alto rischio", "limitato", "minimale", "allegato iii", "annex", "livello", "categoria", "art 6"],
    answer: `**AI Classifier — Classificazione del rischio**

📍 Menu: *Valutazioni → AI Classifier*

**A cosa serve:** Determina il livello di rischio del sistema AI secondo l'Art. 6 e l'Allegato III dell'AI Act.

**Livelli di rischio:**
- 🚫 **Inaccettabile** → pratica vietata
- 🔴 **Alto rischio** → obblighi Art. 9-17 + conformity
- 🟡 **Rischio limitato** → obblighi trasparenza (Art. 50)
- 🟢 **Rischio minimale** → nessun obbligo specifico

**Allegato III (settori alto rischio):**
Infrastrutture critiche, istruzione, occupazione/HR, servizi essenziali, law enforcement, migrazione/asilo, giustizia, dispositivi medici, veicoli autonomi.

**Cosa ti serve:**
- Nome e descrizione del sistema
- Settore di applicazione
- Funzioni principali del sistema
- Se fa parte di un prodotto regolamentato (Allegato II)

**Output:** Risk level + articoli applicabili + flag Allegato III.`,
  },

  // ── RISK MANAGER ────────────────────────────────────────────────────────────
  {
    id: "tool_risk",
    topic: "Risk Manager",
    keywords: ["risk manager", "gestione rischi", "rischi", "minacce", "vulnerabilità", "likelihood", "impact", "mitigazione", "art 9", "sistema gestione"],
    answer: `**Risk Manager — Art. 9 AI Act**

📍 Menu: *Valutazioni → Risk Manager*

**A cosa serve:** Identifica, valuta e gestisce i rischi del sistema AI come richiesto dall'Art. 9 (obbligatorio per sistemi alto rischio).

**Metodologia:** Matrice rischi likelihood × impact
- Likelihood: bassa / media / alta
- Impact: basso / medio / alto
- Rischio residuo: accettabile / da rivedere / inaccettabile

**Cosa ti serve per ogni rischio:**
1. Titolo del rischio
2. Descrizione dettagliata
3. Probabilità (likelihood)
4. Impatto
5. Misura di mitigazione
6. Rischio residuo dopo la mitigazione

**Esempi di rischi comuni per AI:**
- Bias e discriminazione algoritmica
- Errori di classificazione ad alto impatto
- Accesso non autorizzato al sistema
- Deriva del modello (model drift)
- Attacchi adversariali

**Output:** Registro rischi completo + overall risk level (low/medium/high/critical).`,
  },

  // ── DATA AUDIT ──────────────────────────────────────────────────────────────
  {
    id: "tool_dataaudit",
    topic: "Data Audit",
    keywords: ["data audit", "dataset", "dati", "training", "bias", "qualità", "art 10", "dati training", "dati test", "validazione"],
    answer: `**Data Audit — Art. 10 AI Act**

📍 Menu: *Valutazioni → Data Audit*

**A cosa serve:** Documenta e verifica la qualità, la provenienza e la correttezza dei dataset usati per training, validazione e test del sistema AI. Obbligatorio per sistemi alto rischio (Art. 10).

**Per ogni dataset ti serve:**
- Nome del dataset
- Fonte/provenienza
- Dimensione approssimativa
- Se è stato controllato per bias ✓/✗
- Score di qualità (0-100)
- Se contiene dati personali ✓/✗
- Eventuali problemi noti

**Cosa verifica:**
- Rappresentatività e completezza
- Assenza di bias sistematici
- Correttezza delle etichette
- Conformità GDPR se ci sono dati personali

**Output:** Valutazione complessiva — *pass* / *review* / *fail*.

💡 Se il dataset contiene dati personali, considera anche la **DPIA** (Art. 35 GDPR).`,
  },

  // ── DOCUGEN ─────────────────────────────────────────────────────────────────
  {
    id: "tool_docugen",
    topic: "DocuGen",
    keywords: ["docugen", "documentazione tecnica", "art 11", "technical documentation", "doc", "manuale", "specifiche"],
    answer: `**DocuGen — Documentazione Tecnica (Art. 11)**

📍 Menu: *Valutazioni → DocuGen AI*

**A cosa serve:** Genera la documentazione tecnica obbligatoria per sistemi AI ad alto rischio secondo l'Art. 11 e l'Allegato IV dell'AI Act.

**Informazioni necessarie:**
- Nome sistema e provider/fornitore
- Scopo e finalità del sistema
- Capacità e funzionalità principali
- Limitazioni note (casi non gestiti, contesti non supportati)
- Meccanismi di supervisione umana previsti
- Metriche di performance (accuratezza, precision, recall, ecc.)
- Descrizione dei dati di training

**Cosa deve contenere la documentazione tecnica (Allegato IV):**
1. Descrizione generale del sistema
2. Architettura e componenti
3. Dati di training e validazione
4. Capacità e limiti di accuratezza
5. Misure di supervisione umana
6. Identificazione dei rischi

**Output:** Documento strutturato pronto per audit e dossier tecnico.`,
  },

  // ── LOGVAULT ────────────────────────────────────────────────────────────────
  {
    id: "tool_logvault",
    topic: "LogVault",
    keywords: ["logvault", "log", "logging", "registri", "art 12", "audit trail", "retention", "conservazione log", "eventi"],
    answer: `**LogVault — Registri Automatici (Art. 12)**

📍 Menu: *Valutazioni → LogVault*

**A cosa serve:** Configura e documenta il sistema di logging obbligatorio per i sistemi AI ad alto rischio. L'Art. 12 richiede che i sistemi generino automaticamente log degli eventi rilevanti.

**Cosa configurare:**
- Abilitare/disabilitare il logging
- Periodo di retention (giorni — min. raccomandato: 6 mesi per alto rischio)
- Tipi di eventi da registrare
- Posizione di storage
- Controllo accessi ai log

**Eventi tipici da loggare:**
- Avvio e arresto del sistema
- Input/output delle decisioni ad alto impatto
- Interventi umani di supervisione
- Errori e anomalie
- Modifiche alla configurazione
- Accessi non autorizzati

**Retention minima raccomandata:**
- Sistemi alto rischio: almeno 6 mesi
- Sistemi law enforcement: secondo normative specifiche

**Output:** Configurazione logging documentata nel dossier.`,
  },

  // ── TRANSPARENCY ────────────────────────────────────────────────────────────
  {
    id: "tool_transparency",
    topic: "Transparency",
    keywords: ["transparency", "trasparenza", "art 13", "informazioni utenti", "informare", "chatbot", "deepfake", "disclosure"],
    answer: `**Transparency — Obblighi Trasparenza (Art. 13)**

📍 Menu: *Valutazioni → Transparency*

**A cosa serve:** Documenta come vengono informati gli utenti sull'utilizzo di un sistema AI. L'Art. 13 richiede che i sistemi siano trasparenti verso gli utenti.

**Cosa ti serve:**
- Se gli utenti sono informati dell'interazione con AI (sì/no)
- Tipo di informazioni fornite (natura AI, capacità, limitazioni, contatti)
- Punto di contatto per domande/reclami
- Lingue disponibili per le informazioni

**Obblighi specifici per:**
- **Chatbot/Agenti conversazionali:** Devono informare che si tratta di AI (Art. 50)
- **Deepfake/contenuti sintetici:** Etichettatura obbligatoria
- **Sistemi emotivi/biometrici:** Informativa specifica

**Collegamento con L.132/2025:**
La legge italiana aggiunge obblighi su HR (avviso ai lavoratori) e contenuti generati da AI.

**Output:** Piano di trasparenza documentato.`,
  },

  // ── OVERSIGHT ───────────────────────────────────────────────────────────────
  {
    id: "tool_oversight",
    topic: "Oversight",
    keywords: ["oversight", "supervisione", "supervisione umana", "art 14", "human oversight", "controllo", "intervento umano", "stop"],
    answer: `**Oversight — Supervisione Umana (Art. 14)**

📍 Menu: *Valutazioni → Oversight*

**A cosa serve:** Documenta i meccanismi di supervisione umana del sistema AI come richiesto dall'Art. 14 (obbligatorio per sistemi alto rischio).

**Cosa ti serve:**
- Meccanismo di supervisione (es: revisione post-hoc, approvazione pre-decisione, monitoraggio continuo)
- Punti specifici dove un umano può intervenire
- Capacità di arrestare o bloccare il sistema (kill switch)
- Persone responsabili della supervisione (ruoli, non nomi)

**Tipologie di supervisione:**
- **Human-in-the-loop:** l'umano approva ogni decisione
- **Human-on-the-loop:** l'umano monitora e può intervenire
- **Human-in-command:** l'umano può fermare il sistema in qualsiasi momento

**Art. 14(4):** I deployer devono assegnare supervisori con competenze adeguate.

**Output:** Piano di supervisione umana documentato nel dossier.`,
  },

  // ── RESILIENCE ──────────────────────────────────────────────────────────────
  {
    id: "tool_resilience",
    topic: "Resilience",
    keywords: ["resilience", "robustezza", "accuratezza", "cybersecurity", "art 15", "attacchi", "adversarial", "fallback", "sicurezza"],
    answer: `**Resilience — Accuratezza e Robustezza (Art. 15)**

📍 Menu: *Valutazioni → Resilience*

**A cosa serve:** Documenta accuratezza, robustezza e sicurezza informatica del sistema AI. Obbligatorio per sistemi alto rischio (Art. 15).

**Cosa ti serve:**
- Metrica di accuratezza principale (es: 94.2% accuracy su test set)
- Se sono stati eseguiti test di robustezza (sì/no)
- Misure di cybersecurity adottate (es: input validation, rate limiting, crittografia)
- Procedura di fallback in caso di guasto/anomalia
- Data dell'ultimo test eseguito

**Test di robustezza includono:**
- Test su distribuzioni di dati diverse dal training
- Adversarial testing (input manipolati)
- Stress test (volume elevato, edge cases)
- Concept drift detection

**Misure cybersecurity tipiche:**
- Validazione e sanitizzazione degli input
- Protezione del modello da estrazione
- Accesso autenticato alle API
- Monitoraggio anomalie in produzione

**Output:** Report accuratezza e robustezza nel dossier.`,
  },

  // ── QMS ─────────────────────────────────────────────────────────────────────
  {
    id: "tool_qms",
    topic: "QMS Builder",
    keywords: ["qms", "qualità", "sistema gestione qualità", "art 17", "post market", "revisione", "ciclo", "certificazione", "iso"],
    answer: `**QMS Builder — Sistema di Gestione Qualità (Art. 17)**

📍 Menu: *Valutazioni → QMS Builder*

**A cosa serve:** Documenta il Sistema di Gestione della Qualità (SGQ/QMS) obbligatorio per i **Provider** di sistemi AI ad alto rischio (Art. 17).

**Cosa ti serve:**
- Riferimento al documento QMS esistente (es: ISO 9001, ISO/IEC 42001)
- Se esiste un piano di monitoraggio post-market (sì/no)
- Ciclo di revisione interno (mensile/trimestrale/semestrale/annuale)
- Manager responsabile del QMS
- Certificazioni esistenti (ISO 27001, ISO 42001, CE, ecc.)

**Il QMS deve coprire (Art. 17):**
1. Politica di gestione della qualità AI
2. Procedure di sviluppo e test
3. Gestione delle non conformità
4. Monitoraggio e reporting post-market
5. Gestione dei cambiamenti al sistema

**Collegamento con Post-Market Surveillance (Art. 72):**
Il QMS include il piano di monitoraggio post-immissione in commercio.

**Output:** Configurazione QMS nel dossier.`,
  },

  // ── FRIA ────────────────────────────────────────────────────────────────────
  {
    id: "tool_fria",
    topic: "FRIA",
    keywords: ["fria", "diritti fondamentali", "fundamental rights", "art 27", "valutazione impatto", "carta ue", "charter", "settore pubblico", "deployer pubblico"],
    answer: `**FRIA — Fundamental Rights Impact Assessment (Art. 27)**

📍 Menu: *Valutazioni → FRIA*

**A cosa serve:** Valuta l'impatto del sistema AI sui diritti fondamentali (Carta UE dei diritti fondamentali). Obbligatorio per **Deployer del settore pubblico** e deployer privati che gestiscono servizi pubblici.

**5 Fasi ECNL/DIHR:**
1. **Contesto** — Descrizione sistema, settore, popolazione, quadro legale, contesto istituzionale
2. **Scenari e diritti** — Identificare scenari d'uso, valutare impatto su 45+ diritti fondamentali, matrice 3×3
3. **Decisione deployment** — Modalità di deployment, summary pubblico, firma del revisore
4. **Monitoraggio** — Piano di monitoraggio continuo, trigger per revisione
5. **Stakeholder** — Mappatura stakeholder, log engagement

**Diritti valutati (45+):**
Dignità umana, privacy, non discriminazione, giusto processo, libertà di espressione, diritti del minore, diritto al lavoro, salute, ecc. (Artt. 1-50 Carta UE)

**Cosa ti serve:**
- Nome sistema e organizzazione
- Descrizione contesto di deployment
- Scenari concreti di utilizzo
- Team responsabile

**Output:** Documento FRIA completo + summary pubblico + sign-off.`,
  },

  // ── DPIA ────────────────────────────────────────────────────────────────────
  {
    id: "tool_dpia",
    topic: "DPIA",
    keywords: ["dpia", "privacy", "gdpr", "art 35", "protezione dati", "impatto dati", "wp248", "dpo", "trattamento dati", "interessati"],
    answer: `**DPIA — Data Protection Impact Assessment (Art. 35 GDPR)**

📍 Menu: *Valutazioni → DPIA*

**A cosa serve:** Valuta i rischi per la protezione dei dati personali. Richiesta dal GDPR Art. 35 quando il trattamento presenta rischi elevati, secondo la metodologia WP248 rev.01 (Gruppo Art. 29).

**6 Step WP248:**
0. **Screening** — 9 criteri WP248 (DPIA richiesta se ≥2 criteri)
1. **Descrizione** — Sistema, DPO, responsabili, categorie dati, asset
2. **Necessità** — Proporzionalità, 7 principi GDPR Art. 5, 8 diritti
3. **Rischi WP248** — 3 categorie: accesso illegittimo, modifica indesiderata, scomparsa dati
4. **Misure** — Tecniche e organizzative, rischio residuo, consultazione Art. 36
5. **Conclusione** — Conforme/condizionale/non conforme + report scaricabile

**9 Criteri screening WP248 (esempi):**
- Profilazione sistematica
- Categorie particolari Art. 9 su larga scala
- Sorveglianza aree pubbliche
- Decisioni automatizzate con effetti legali
- Soggetti vulnerabili (minori, pazienti)

**⚠️ Consultazione Art. 36:** Se il rischio residuo è ALTO → obbligatoria consultazione preventiva con il Garante Privacy prima di procedere.

**Cosa ti serve:** Titolare trattamento, DPO, categorie dati, finalità, base giuridica.`,
  },

  // ── L132 ────────────────────────────────────────────────────────────────────
  {
    id: "tool_l132",
    topic: "L.132/2025",
    keywords: ["l132", "l 132", "legge 132", "decreto 132", "italia", "normativa italiana", "dl 132", "etichettatura", "deepfake", "hr", "lavoratori"],
    answer: `**L.132/2025 — Normativa Italiana AI**

📍 Menu: *Valutazioni → L.132/2025*

**A cosa serve:** Verifica la conformità al Decreto Legislativo 132/2025, la normativa italiana di recepimento e integrazione dell'AI Act.

**4 Aree di valutazione:**

1. **Trasparenza HR** — Se il sistema AI è usato in ambito lavorativo (selezione, valutazione performance), devono essere informati i lavoratori e le rappresentanze sindacali prima dell'uso.

2. **Etichettatura contenuti** — I contenuti generati da AI (testi, immagini, audio, video) devono essere chiaramente etichettati come tali.

3. **Rischio Deepfake** — Sistemi che generano o modificano immagini/video di persone reali: obblighi specifici di consenso e disclosure.

4. **Accessibilità** — I sistemi AI devono rispettare i requisiti di accessibilità (WCAG 2.1 AA).

**Chi deve farlo:**
Tutti i soggetti che usano o distribuiscono AI in Italia, inclusi deployer e provider.

**Output:** Stato conformità per area (conforme / parzialmente conforme / non conforme / non applicabile).`,
  },

  // ── GPAI ────────────────────────────────────────────────────────────────────
  {
    id: "tool_gpai",
    topic: "GPAI",
    keywords: ["gpai", "general purpose", "uso generale", "fondation model", "llm", "gpt", "art 51", "art 52", "art 53", "rischio sistemico", "flops"],
    answer: `**GPAI Module — Modelli AI di Uso Generale (Artt. 51-55)**

📍 Menu: *Monitoraggio → GPAI Module*

**A cosa serve:** Valuta gli obblighi per i fornitori di modelli AI di uso generale (GPAI), come LLM, modelli multimodali, foundation models.

**Chi è soggetto:**
Provider che mettono a disposizione modelli GPAI nell'UE, incluse API commerciali e open source con certe condizioni.

**Obblighi base (Art. 53):**
- Documentazione tecnica del modello
- Rispetto del copyright (training data)
- Politica di utilizzo accettabile

**Rischio sistemico (Art. 55) — se >10²⁵ FLOPS:**
- Valutazione avversariale (red teaming)
- Notifica incidenti gravi alla Commissione UE
- Misure di cybersecurity
- Reporting energetico

**Cosa ti serve:**
- Numero di modelli GPAI
- Se c'è rischio sistemico (capacità di calcolo training)
- Ruoli: provider modello, provider sistema AI basato su GPAI, o entrambi
- Obblighi completati / totale

**Output:** Stato compliance GPAI nel dossier.`,
  },

  // ── CONFORMITY ──────────────────────────────────────────────────────────────
  {
    id: "tool_conformity",
    topic: "Conformity",
    keywords: ["conformity", "conformità", "art 43", "dichiarazione conformità", "marcatura ce", "registrazione eu", "valutazione conformità", "notified body", "organismo notificato"],
    answer: `**Conformity — Valutazione di Conformità (Art. 43)**

📍 Menu: *Valutazioni → Conformity*

**A cosa serve:** Completa la valutazione di conformità dell'AI Act e genera la Dichiarazione di Conformità UE. È il passo finale per immettere un sistema AI ad alto rischio sul mercato.

**2 Percorsi:**
- **Self-assessment:** Per sistemi Allegato III (eccetto biometria/infrastrutture critiche). Il provider attesta autonomamente la conformità.
- **Third-party (Organismo Notificato):** Obbligatorio per sistemi Allegato II (sicurezza prodotti) e casi specifici Allegato III.

**Prerequisiti (completare prima):**
Risk Manager ✓ → Data Audit ✓ → DocuGen ✓ → LogVault ✓ → Transparency ✓ → Oversight ✓ → Resilience ✓ → QMS ✓

**La dichiarazione di conformità include (Art. 47):**
- Identificazione sistema AI
- Dichiarazione di rispetto dell'AI Act
- Riferimenti a standard tecnici armonizzati
- Firma del rappresentante legale

**Database EU (Art. 49):**
I sistemi ad alto rischio devono essere registrati nel database EU prima dell'immissione sul mercato.

**Output:** Score conformità + dichiarazione scaricabile + ref. registrazione.`,
  },

  // ── XAI ─────────────────────────────────────────────────────────────────────
  {
    id: "tool_xai",
    topic: "XAI Lab",
    keywords: ["xai", "explainable", "spiegabilità", "interpretabilità", "black box", "spiegazione", "decisioni", "motivazioni", "lime", "shap"],
    answer: `**XAI Lab — Spiegabilità (Explainable AI)**

📍 Menu: *Monitoraggio → XAI Lab*

**A cosa serve:** Valuta e documenta la capacità del sistema AI di spiegare le proprie decisioni. Collegato all'Art. 13 (trasparenza) e alle aspettative degli interessati di ricevere spiegazioni sulle decisioni automatizzate.

**Cosa valuta:**
- Score XAI complessivo del modello
- Versione del modello analizzata
- Flag di compliance (es: "nessuna spiegazione locale", "feature importance non disponibile")
- Presenza di flag critici

**Tecniche XAI comuni:**
- **LIME** (Local Interpretable Model-agnostic Explanations)
- **SHAP** (SHapley Additive exPlanations)
- **Attention maps** (modelli transformer)
- **Counterfactual explanations** ("Se X fosse diverso, la decisione sarebbe cambiata")
- **Feature importance** (importanza delle variabili)

**Collegamento normativo:**
- Art. 13 AI Act: trasparenza verso gli utenti
- Art. 22 GDPR: diritto a non essere soggetti a decisioni automatizzate
- Art. 22(3) GDPR: diritto a spiegazioni significative

**Output:** Score XAI + flag compliance nel dossier.`,
  },

  // ── ROADMAP ─────────────────────────────────────────────────────────────────
  {
    id: "tool_roadmap",
    topic: "Roadmap",
    keywords: ["roadmap", "percorso", "journey", "guida", "piano", "cosa fare", "step", "passi", "milestone"],
    answer: `**Roadmap — Il tuo percorso di conformità**

📍 Menu: *Core → Roadmap*

**A cosa serve:** Ti mostra una roadmap personalizzata in base al tuo ruolo e al livello di rischio del tuo sistema AI.

**Struttura tipica per sistemi alto rischio (Provider):**
1. Art. 5 Checker
2. AI Classifier
3. Risk Manager
4. Data Audit
5. DocuGen
6. LogVault
7. Transparency
8. Oversight
9. Resilience
10. QMS Builder
11. Conformity Assessment
12. FRIA (se deployer pubblico)
13. DPIA (se dati personali)

**Per sistemi a rischio limitato:**
Principalmente Art. 5 Checker → AI Classifier → Transparency → DPIA (se dati personali)

**Discovery:** Prima di tutto, usa il modulo *Discovery* per mappare tutti i sistemi AI della tua organizzazione.

💡 **Consiglio:** Completa sempre Art. 5 Checker e AI Classifier per primi — determinano tutto il resto.`,
  },

  // ── ART. 50 KIT ──────────────────────────────────────────────────────────────
  {
    id: "tool_art50",
    topic: "Art. 50 Kit",
    keywords: ["art 50", "trasparenza utenti", "chatbot", "disclosure", "etichetta ai", "contenuti sintetici", "deepfake"],
    answer: `**Art. 50 Kit — Trasparenza verso gli utenti**

📍 Menu: *Valutazioni → Art. 50 Kit*

**A cosa serve:** Verifica e documenta la conformità agli obblighi di trasparenza verso gli utenti finali (Art. 50 AI Act), in vigore da agosto 2026.

**Obblighi Art. 50:**
1. **Chatbot/Agenti AI:** Informare l'utente che sta interagendo con un sistema AI (a meno che non sia ovvio)
2. **Contenuti sintetici (deepfake):** Etichettare i contenuti generati/modificati da AI in modo da essere distinguibili
3. **AI emotiva:** Informare le persone che il sistema rileva o inferisce emozioni
4. **Biometria categorizzante:** Informare le persone coinvolte

**Cosa si applica a te:**
Dipende dal tipo di sistema: generativo, conversazionale, di raccomandazione, di riconoscimento, ecc.

**Collegamento con L.132/2025:**
La normativa italiana aggiunge etichettatura obbligatoria per contenuti AI nel settore dell'informazione e comunicazione.

**Output:** Checklist conformità Art. 50 + piano di disclosure.`,
  },

  // ── AI LITERACY ─────────────────────────────────────────────────────────────
  {
    id: "tool_literacy",
    topic: "AI Literacy",
    keywords: ["literacy", "formazione", "competenze", "art 4", "alfabetizzazione", "personale", "dipendenti", "training personale"],
    answer: `**AI Literacy — Competenze AI (Art. 4)**

📍 Menu: *Valutazioni → AI Literacy*

**A cosa serve:** Documenta le misure adottate per garantire un adeguato livello di alfabetizzazione AI al personale che lavora con sistemi AI. L'Art. 4 dell'AI Act richiede che provider e deployer adottino misure per garantire literacy adeguata.

**Chi deve essere formato:**
- Personale che usa o supervisiona sistemi AI
- Manager responsabili di decisioni basate su AI
- Team di sviluppo e deployment
- Addetti alla compliance AI

**Contenuti minimi della formazione:**
- Funzionamento dei sistemi AI usati
- Limiti e rischi dei sistemi AI
- Come riconoscere output errati o distorti
- Obblighi normativi applicabili
- Come segnalare problemi

**Output:** Piano di formazione documentato + attestazione competenze nel dossier.`,
  },

  // ── EVIDENCE LAYER ──────────────────────────────────────────────────────────
  {
    id: "tool_evidence",
    topic: "Evidence Layer",
    keywords: ["evidence", "prove", "audit trail", "log attività", "adr", "decisioni", "traccia", "storico"],
    answer: `**Evidence Layer — Traccia di Audit**

📍 Menu: *Core → Evidence Layer*

**A cosa serve:** Registra automaticamente le decisioni, azioni e attività chiave svolte nell'ambito della compliance. Crea una traccia di audit verificabile.

**Tipi di evidenza registrati:**
- **adr** — Archival Decision Records (decisioni rilevanti)
- **log** — Attività di sistema
- **decision** — Decisioni compliance
- **audit** — Attività di audit
- **test** — Test e validazioni
- **incident** — Incidenti
- **monitoring** — Attività di monitoraggio

**Come funziona:**
Ogni tool (Risk Manager, DPIA, FRIA, ecc.) salva automaticamente le proprie decisioni nell'Evidence Layer quando completi un'azione significativa.

**Utilizzo in audit:**
L'Evidence Layer è consultabile per dimostrare che la compliance è stata effettuata con metodo e continuità.`,
  },

  // ── SIGN OFF ────────────────────────────────────────────────────────────────
  {
    id: "tool_signoff",
    topic: "Firma del revisore",
    keywords: ["firma", "sign off", "approvazione", "revisore", "dpo", "legale", "approvare", "firmare"],
    answer: `**Firma del revisore (Sign-Off)**

Ogni tool principale di AIComply include un pannello di **firma del revisore** nella sezione conclusiva.

**A cosa serve:**
Garantisce che il documento/valutazione sia stato rivisto e approvato da una persona qualificata prima di essere inserito nel dossier. Richiesto per audit e dimostrazioni di conformità.

**Come funziona:**
1. Compilare nome e cognome del revisore
2. Indicare il ruolo/qualifica (es: DPO, CTO, Legal Counsel, Compliance Officer)
3. Aggiungere eventuali note di revisione
4. Cliccare "Firma e approva"

**Chi può firmare:**
- **DPIA** → Il DPO (idealmente) o il Titolare del trattamento
- **FRIA** → Responsabile compliance o legale
- **Conformity** → Rappresentante legale dell'organizzazione
- **QMS** → Quality Manager
- **Risk Manager** → Risk Officer o CTO

**Revoca:** La firma può essere revocata e rifirmata se il documento viene aggiornato.`,
  },

  // ── POST-MARKET ─────────────────────────────────────────────────────────────
  {
    id: "tool_postmarket",
    topic: "Post-Market",
    keywords: ["post market", "post-market", "sorveglianza", "monitoraggio", "art 72", "incidenti", "segnalazione", "in produzione"],
    answer: `**Post-Market Surveillance — Art. 72**

📍 Menu: *Monitoraggio → Post-Market*

**A cosa serve:** Monitora le performance e gli incidenti dei sistemi AI già in produzione. L'Art. 72 richiede ai provider di sistemi alto rischio di implementare un piano di monitoraggio post-market.

**Cosa monitorare:**
- Performance del sistema nel tempo (drift)
- Incidenti e near-miss
- Feedback degli utenti
- Cambiamenti nel contesto di deployment
- Aggiornamenti normativi rilevanti

**Obblighi segnalazione:**
- Incidenti gravi → autorità di vigilanza nazionale entro 15 giorni
- Per GPAI con rischio sistemico → Commissione UE

**Collegamento con QMS:**
Il piano post-market fa parte del QMS (Art. 17). Devono essere definiti frequenza delle revisioni e trigger per revisioni straordinarie.

**Quando fare una revisione straordinaria:**
- Cambio significativo delle finalità di utilizzo
- Rilevazione di bias sistematici
- Incidente grave
- Nuovo atto normativo applicabile`,
  },
];

// ─── Response engine ──────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i").replace(/[òóôõ]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function score(query: string, entry: KBEntry): number {
  const q = normalize(query);
  const words = q.split(" ").filter(w => w.length > 2);
  let s = 0;
  for (const kw of entry.keywords) {
    const normKw = normalize(kw);
    if (q.includes(normKw)) s += normKw.split(" ").length * 3;
  }
  for (const w of words) {
    for (const kw of entry.keywords) {
      if (normalize(kw).includes(w)) s += 1;
    }
  }
  return s;
}

function findAnswer(query: string): string {
  if (!query.trim()) return "Puoi chiedermi informazioni su qualsiasi tool di AIComply o sulla procedura di conformità AI Act!";

  const scored = KB.map(e => ({ entry: e, s: score(query, e) }))
    .sort((a, b) => b.s - a.s);

  if (scored[0].s === 0) {
    return `Non ho trovato una risposta specifica per "${query}".

Prova a chiedermi di un tool specifico come:
- **Art. 5 Checker**, **AI Classifier**, **Risk Manager**
- **DPIA**, **FRIA**, **Data Audit**, **DocuGen**
- **LogVault**, **Transparency**, **Oversight**, **Resilience**
- **QMS**, **Conformity**, **GPAI**, **XAI**
- Oppure "da dove iniziare" o "quali tool sono obbligatori"`;
  }

  return scored[0].entry.answer;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────

function renderMd(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (!line.trim()) {
      result.push(<div key={key++} style={{ height: 6 }} />);
      continue;
    }
    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      result.push(
        <p key={key++} style={{ fontWeight: 700, fontSize: 12, color: "#0D1016", marginBottom: 2 }}>
          {line.slice(2, -2)}
        </p>
      );
      continue;
    }
    // Inline bold + emoji bullets
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>
        : p
    );
    const isBullet = line.trimStart().startsWith("-") || /^\d+\.\s/.test(line.trimStart()) || /^[🔴🟡🟢🚫🏭🏢📦🛒⚠️💡📍]/.test(line.trim());
    result.push(
      <p key={key++} style={{
        fontSize: 12,
        lineHeight: 1.65,
        color: "#0D1016",
        marginBottom: isBullet ? 1 : 3,
        paddingLeft: isBullet && line.trimStart().startsWith("-") ? 8 : 0,
      }}>
        {rendered}
      </p>
    );
  }
  return result;
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  "Da dove inizio?",
  "Cos'è l'AI Act?",
  "Art. 5 Checker",
  "Come fare la DPIA?",
  "Cos'è la FRIA?",
  "Quali tool sono obbligatori?",
  "Come si fa la Conformity?",
  "Ruoli AI Act",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      ts: Date.now(),
      text: `**Ciao! Sono l'assistente AIComply** 👋

Sono qui per guidarti nel percorso di conformità all'**EU AI Act** e alle normative correlate (GDPR, L.132/2025).

Puoi chiedermi:
- A cosa serve un tool specifico
- Quali informazioni ti servono per completarlo
- Come funziona la procedura step by step
- Quali obblighi si applicano al tuo caso

Come posso aiutarti?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, minimized]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: "user", text: text.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    const delay = 400 + Math.random() * 400;
    setTimeout(() => {
      const answer = findAnswer(text);
      const botMsg: Message = { id: `b${Date.now()}`, role: "assistant", text: answer, ts: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, delay);
  }, []);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function clearChat() {
    setMessages([{
      id: "welcome2",
      role: "assistant",
      ts: Date.now(),
      text: "Chat resettata. Come posso aiutarti?",
    }]);
  }

  // Styles
  const panelW = 380;

  const panelSt: CSSProperties = {
    position: "fixed",
    bottom: 24,
    right: 24,
    width: panelW,
    height: minimized ? "auto" : 580,
    borderRadius: 16,
    background: "#ffffff",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9999,
    transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(16px)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1), opacity 0.18s ease",
    transformOrigin: "bottom right",
  };

  const fabSt: CSSProperties = {
    position: "fixed",
    bottom: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    background: "#0D1016",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
    zIndex: 9998,
    transition: "transform 0.15s, box-shadow 0.15s",
  };

  return (
    <>
      {/* FAB */}
      <button
        style={{
          ...fabSt,
          transform: open ? "scale(0.88)" : "scale(1)",
          opacity: open ? 0.6 : 1,
        }}
        onClick={() => { setOpen(o => !o); setMinimized(false); }}
        aria-label="Assistente AIComply"
        title="Assistente AIComply"
      >
        {open
          ? <X style={{ width: 16, height: 16, color: "#fff" }} />
          : <MessageCircle style={{ width: 18, height: 18, color: "#fff" }} />
        }
      </button>

      {/* Panel */}
      <div style={panelSt}>
        {/* Header */}
        <div style={{
          background: "#0D1016",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: "rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <MessageCircle style={{ width: 15, height: 15, color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
              Assistente AIComply
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
              AI Act · GDPR · L.132/2025
            </p>
          </div>
          <button onClick={clearChat} title="Resetta chat"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.4)", borderRadius: 6 }}>
            <RotateCcw style={{ width: 13, height: 13 }} />
          </button>
          <button onClick={() => setMinimized(m => !m)} title={minimized ? "Espandi" : "Minimizza"}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.4)", borderRadius: 6 }}>
            {minimized
              ? <ChevronDown style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
              : <Minimize2 style={{ width: 13, height: 13 }} />
            }
          </button>
          <button onClick={() => setOpen(false)} title="Chiudi"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.4)", borderRadius: 6 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {!minimized && (
          <>
            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0,0,0,0.1) transparent",
            }}>
              {messages.map(msg => (
                <div key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{
                    maxWidth: "88%",
                    padding: "9px 12px",
                    borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: msg.role === "user" ? "#0D1016" : "#F4F4F5",
                    color: msg.role === "user" ? "#fff" : "#0D1016",
                  }}>
                    {msg.role === "user"
                      ? <p style={{ fontSize: 12, lineHeight: 1.5, color: "#fff", margin: 0 }}>{msg.text}</p>
                      : <div>{renderMd(msg.text)}</div>
                    }
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(0,0,0,0.28)", marginTop: 3, paddingLeft: msg.role === "user" ? 0 : 4 }}>
                    {new Date(msg.ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "12px 12px 12px 2px",
                    background: "#F4F4F5",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: 3,
                        background: "#0D1016",
                        opacity: 0.35,
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 2 && (
              <div style={{
                padding: "6px 14px 4px",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                flexShrink: 0,
                borderTop: "1px solid rgba(0,0,0,0.06)",
              }}>
                {QUICK_ACTIONS.slice(0, 5).map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    style={{
                      fontSize: 11, padding: "4px 9px",
                      borderRadius: 20,
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "#fff",
                      color: "#0D1016",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f4f4f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(0,0,0,0.07)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              background: "#fafafa",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Chiedi di un tool, procedura, obbligo…"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 20,
                  border: "1px solid rgba(0,0,0,0.1)",
                  fontSize: 12,
                  color: "#0D1016",
                  background: "#fff",
                  outline: "none",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || typing}
                style={{
                  width: 34, height: 34,
                  borderRadius: 17,
                  background: input.trim() && !typing ? "#0D1016" : "rgba(0,0,0,0.08)",
                  border: "none",
                  cursor: input.trim() && !typing ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                  flexShrink: 0,
                }}
              >
                <Send style={{ width: 14, height: 14, color: input.trim() && !typing ? "#fff" : "rgba(0,0,0,0.3)" }} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bounce animation keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
