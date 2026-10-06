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
    answer: `**Da dove iniziare?**

Il percorso è in 4 passi, visibile in Home:

1. 📋 **Inventario** — elenca i sistemi di IA che sviluppi, fai sviluppare o usi.
2. 👤 **Ruolo** — per ciascun sistema rispondi a domande sui fatti: risulti fornitore, deployer, importatore o distributore (Artt. 3, 25).
3. ⚖️ **Rischio** — domande nell'ordine del Regolamento: pratiche vietate (Art. 5), alto rischio (Art. 6, Allegati I e III), trasparenza (Art. 50), modelli per finalità generali (Capo V).
4. ✅ **Obblighi** — l'elenco degli obblighi deriva da ruolo e rischio, con articolo, data di applicazione e tool da usare.

Dopo la classificazione il menu mostra solo i tool che ti servono. Per una verifica veloce di un singolo caso c'è il **Triage**.`,
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

RegulaeOS copre tutti gli obblighi attraverso i suoi tool.`,
  },
  {
    id: "gen_ruoli",
    topic: "Ruoli",
    keywords: ["ruolo", "provider", "deployer", "fornitore", "distributore", "importer", "importatore", "chi sono", "mio ruolo"],
    answer: `**Ruoli AI Act — chi sei?**

🏭 **Provider (Fornitore):** Sviluppa e immette sul mercato sistemi di IA. Ha gli obblighi più ampi: documentazione tecnica, QMS, conformity assessment, registrazione EU.

🏢 **Deployer (Operatore/Utilizzatore):** Usa il sistema di IA in un contesto professionale. Deve fare FRIA (settore pubblico), DPIA (se dati personali), sorveglianza umana.

📦 **Importer:** Importa da paesi terzi sistemi di IA ad alto rischio. Verifica la conformità del provider straniero.

🛒 **Distributor:** Distribuisce senza modificare. Obblighi limitati: verifica marcatura CE, documentazione presente.

Il ruolo si stabilisce per ogni sistema, nell'inventario (Passo 2).`,
  },
  {
    id: "gen_dossier",
    topic: "Dossier",
    keywords: ["dossier", "completamento", "percentuale", "export", "download", "report", "archivio", "documentazione"],
    answer: `**Il Dossier RegulaeOS**

Il Dossier aggrega automaticamente i risultati di tutti i tool completati in un unico documento strutturato.

**Come funziona:**
- Ogni tool, una volta completato, salva i dati in localStorage
- Il Dossier li raccoglie e mostra la % di completamento
- Puoi esportare il dossier completo in formato JSON

**Cosa contiene:**
Risultati di tutti i tool: Classifier, Risk Manager, Data Audit, DocuGen, LogVault, Transparency, Oversight, Resilience, QMS, FRIA, DPIA, Conformity, GPAI e altri.

**Consiglio:** Completa prima tutti i tool obbligatori per il tuo livello di rischio, poi esporta il dossier per l'audit o la valutazione di conformità.`,
  },

  // ── ART. 5 CHECKER ──────────────────────────────────────────────────────────
  {
    id: "tool_prohibited",
    topic: "Pratiche vietate (Art. 5)",
    keywords: ["art 5", "vietato", "proibito", "pratiche vietate", "prohibited", "checker", "manipolazione", "social scoring", "biometria", "sublim"],
    answer: `**Pratiche vietate — Art. 5**

📍 Menu: *Triage* (passo "Sistema & Art. 5") oppure classificazione guidata del sistema nell'inventario.

**Le pratiche vietate (Art. 5(1)):**
- (a) tecniche subliminali, manipolative o ingannevoli che causano danno significativo
- (b) sfruttamento delle vulnerabilità (età, disabilità, situazione sociale o economica)
- (ba) e (bb) immagini intime non consensuali e materiale pedopornografico generati dall'IA — dal 2 dicembre 2026 (Reg. (UE) 2026/1744)
- (c) punteggio sociale, da parte di soggetti pubblici o privati
- (d) valutazione del rischio di reato basata solo su profilazione o tratti della personalità
- (e) banche dati di riconoscimento facciale da scraping non mirato
- (f) riconoscimento delle emozioni sul lavoro e a scuola, salvo motivi medici o di sicurezza
- (g) categorizzazione biometrica per dedurre caratteristiche sensibili
- (h) identificazione biometrica remota in tempo reale in spazi pubblici a fini di contrasto, salvo le eccezioni tassative

**Risultato:** l'esito è salvato nel dossier. Sanzione fino a 35 milioni € o al 7% del fatturato mondiale annuo (Art. 99(3)).`,
  },

  // ── AI CLASSIFIER ───────────────────────────────────────────────────────────
  {
    id: "tool_classifier",
    topic: "Classificazione del sistema",
    keywords: ["classifier", "classificatore", "classificare", "rischio", "alto rischio", "limitato", "minimale", "allegato iii", "annex", "livello", "categoria", "art 6", "ruolo"],
    answer: `**Classificazione del sistema**

📍 *Inventario → Classifica* (su ciascun sistema)

Rispondi a domande sui fatti in due parti:
- **Ruolo** — chi ha sviluppato il sistema e come lo usi: fornitore, deployer, importatore o distributore (Artt. 3, 25).
- **Rischio** — nell'ordine del Regolamento: pratiche vietate (Art. 5), alto rischio (Art. 6 e Allegati I e III, con la deroga dell'Art. 6(3) se non c'è profilazione), trasparenza (Art. 50), modelli per finalità generali (Capo V).

Alla fine trovi solo gli obblighi che riguardano quel sistema, con articolo, data di applicazione e tool da usare. Il sistema classificato diventa quello di riferimento per gli altri tool.`,
  },

  // ── RISK MANAGER ────────────────────────────────────────────────────────────
  {
    id: "tool_risk",
    topic: "Risk Manager",
    keywords: ["risk manager", "gestione rischi", "rischi", "minacce", "vulnerabilità", "likelihood", "impact", "mitigazione", "art 9", "sistema gestione"],
    answer: `**Risk Manager — Art. 9 AI Act**

📍 Menu: *Valutazioni → Risk Manager*

**A cosa serve:** Identifica, valuta e gestisce i rischi del sistema di IA come richiesto dall'Art. 9 (obbligatorio per sistemi alto rischio).

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

**A cosa serve:** Documenta e verifica la qualità, la provenienza e la correttezza dei dataset usati per training, validazione e test del sistema di IA. Obbligatorio per sistemi alto rischio (Art. 10).

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

**A cosa serve:** Genera la documentazione tecnica obbligatoria per sistemi di IA ad alto rischio secondo l'Art. 11 e l'Allegato IV dell'AI Act.

**Informazioni necessarie:**
- Nome sistema e provider/fornitore
- Scopo e finalità del sistema
- Capacità e funzionalità principali
- Limitazioni note (casi non gestiti, contesti non supportati)
- Meccanismi di sorveglianza umana previsti
- Metriche di performance (accuratezza, precision, recall, ecc.)
- Descrizione dei dati di training

**Cosa deve contenere la documentazione tecnica (Allegato IV):**
1. Descrizione generale del sistema
2. Architettura e componenti
3. Dati di training e validazione
4. Capacità e limiti di accuratezza
5. Misure di sorveglianza umana
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

**A cosa serve:** Configura e documenta il sistema di logging obbligatorio per i sistemi di IA ad alto rischio. L'Art. 12 richiede che i sistemi generino automaticamente log degli eventi rilevanti.

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
    keywords: ["transparency", "trasparenza", "art 13", "istruzioni per l'uso", "istruzioni d'uso", "spiegabilità", "xai", "explainable"],
    answer: `**Trasparenza — Istruzioni per l'uso (Art. 13)**

📍 Menu: *Trasparenza*

**A cosa serve:** Il fornitore di un sistema ad alto rischio scrive le istruzioni per l'uso da consegnare ai deployer, voce per voce secondo l'Art. 13(3), e le scarica come documento.

**Le voci (Art. 13(3)):**
- (a) identità e contatti del fornitore e del rappresentante autorizzato
- (b) finalità prevista, accuratezza/robustezza/cibersicurezza, situazioni di rischio, spiegabilità dell'output, prestazioni su gruppi specifici, dati di input e di addestramento, interpretazione dell'output
- (c) modifiche predeterminate
- (d) misure di sorveglianza umana (Art. 14)
- (e) risorse, durata del ciclo di vita, manutenzione e aggiornamenti
- (f) meccanismi di registrazione dei log (Art. 12)

**Deployer:** deve usare il sistema conformemente alle istruzioni (Art. 26(1)).

**Avvisi a chi usa un chatbot o vede contenuti generati dall'IA:** sono obblighi dell'Art. 50 → *Art. 50 kit*.`,
  },

  // ── OVERSIGHT ───────────────────────────────────────────────────────────────
  {
    id: "tool_oversight",
    topic: "Oversight",
    keywords: ["oversight", "supervisione", "sorveglianza umana", "art 14", "human oversight", "controllo", "intervento umano", "stop"],
    answer: `**Oversight — Supervisione Umana (Art. 14)**

📍 Menu: *Valutazioni → Oversight*

**A cosa serve:** Documenta i meccanismi di sorveglianza umana del sistema di IA come richiesto dall'Art. 14 (obbligatorio per sistemi alto rischio).

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

**Output:** Piano di sorveglianza umana documentato nel dossier.`,
  },

  // ── RESILIENCE ──────────────────────────────────────────────────────────────
  {
    id: "tool_resilience",
    topic: "Resilience",
    keywords: ["resilience", "robustezza", "accuratezza", "cybersecurity", "art 15", "attacchi", "adversarial", "fallback", "sicurezza"],
    answer: `**Resilience — Accuratezza e Robustezza (Art. 15)**

📍 Menu: *Valutazioni → Resilience*

**A cosa serve:** Documenta accuratezza, robustezza e sicurezza informatica del sistema di IA. Obbligatorio per sistemi alto rischio (Art. 15).

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

**A cosa serve:** Documenta il Sistema di Gestione della Qualità (SGQ/QMS) obbligatorio per i **Provider** di sistemi di IA ad alto rischio (Art. 17).

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

**A cosa serve:** Valuta l'impatto del sistema di IA sui diritti fondamentali (Carta UE dei diritti fondamentali). Obbligatorio per **Deployer del settore pubblico** e deployer privati che gestiscono servizi pubblici.

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

1. **Trasparenza HR** — Se il sistema di IA è usato in ambito lavorativo (selezione, valutazione performance), devono essere informati i lavoratori e le rappresentanze sindacali prima dell'uso.

2. **Etichettatura contenuti** — I contenuti generati da AI (testi, immagini, audio, video) devono essere chiaramente etichettati come tali.

3. **Rischio Deepfake** — Sistemi che generano o modificano immagini/video di persone reali: obblighi specifici di consenso e disclosure.

4. **Accessibilità** — I sistemi di IA devono rispettare i requisiti di accessibilità (WCAG 2.1 AA).

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
- Documentazione tecnica del modello (Allegato XI)
- Informazioni per i fornitori a valle (Allegato XII)
- Politica sul diritto d'autore
- Sintesi dei contenuti di addestramento

**Rischio sistemico (Art. 55) — se >10²⁵ FLOPS:**
- Valutazione del modello, incluso il test contraddittorio
- Valutazione e attenuazione dei rischi sistemici
- Segnalazione degli incidenti gravi all'ufficio per l'IA
- Cibersicurezza adeguata

**Cosa ti serve:**
- Numero di modelli GPAI
- Se c'è rischio sistemico (capacità di calcolo training)
- Ruoli: provider modello, provider sistema di IA basato su GPAI, o entrambi
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

**A cosa serve:** Completa la valutazione di conformità dell'AI Act e genera la Dichiarazione di Conformità UE. È il passo finale per immettere un sistema di IA ad alto rischio sul mercato.

**2 Percorsi:**
- **Self-assessment:** Per sistemi Allegato III (eccetto biometria/infrastrutture critiche). Il provider attesta autonomamente la conformità.
- **Third-party (Organismo Notificato):** Obbligatorio per sistemi Allegato II (sicurezza prodotti) e casi specifici Allegato III.

**Prerequisiti (completare prima):**
Risk Manager ✓ → Data Audit ✓ → DocuGen ✓ → LogVault ✓ → Transparency ✓ → Oversight ✓ → Resilience ✓ → QMS ✓

**La dichiarazione di conformità include (Art. 47):**
- Identificazione sistema di IA
- Dichiarazione di rispetto dell'AI Act
- Riferimenti a standard tecnici armonizzati
- Firma del rappresentante legale

**Database EU (Art. 49):**
I sistemi ad alto rischio devono essere registrati nel database EU prima dell'immissione sul mercato.

**Output:** Score conformità + dichiarazione scaricabile + ref. registrazione.`,
  },

  // ── ROADMAP ─────────────────────────────────────────────────────────────────
  {
    id: "tool_roadmap",
    topic: "Percorso",
    keywords: ["roadmap", "percorso", "journey", "guida", "piano", "cosa fare", "step", "passi", "milestone"],
    answer: `**Il tuo percorso**

📍 *Home → Il tuo percorso in 4 passi*

Inventario → Ruolo → Rischio → Obblighi. Ogni passo mostra a che punto sei e porta al sistema da completare.

Gli obblighi di ciascun sistema sono nella sua scheda dell'inventario; il menu laterale mostra solo i tool che servono, e in cima a ogni tool la guida dice cosa fare, chi deve farlo e quando hai finito.`,
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
1. **Chatbot/Agenti AI:** Informare l'utente che sta interagendo con un sistema di IA (a meno che non sia ovvio)
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

**A cosa serve:** Documenta le misure adottate per garantire un adeguato livello di alfabetizzazione AI al personale che lavora con sistemi di IA. L'Art. 4 dell'AI Act richiede che provider e deployer adottino misure per garantire literacy adeguata.

**Chi deve essere formato:**
- Personale che usa o supervisiona sistemi di IA
- Manager responsabili di decisioni basate su AI
- Team di sviluppo e deployment
- Addetti alla compliance AI

**Contenuti minimi della formazione:**
- Funzionamento dei sistemi di IA usati
- Limiti e rischi dei sistemi di IA
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

Ogni tool principale di RegulaeOS include un pannello di **firma del revisore** nella sezione conclusiva.

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

**A cosa serve:** Monitora le performance e gli incidenti dei sistemi di IA già in produzione. L'Art. 72 richiede ai provider di sistemi alto rischio di implementare un piano di monitoraggio post-market.

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
  if (!query.trim()) return "Puoi chiedermi informazioni su qualsiasi tool di RegulaeOS o sulla procedura di conformità AI Act!";

  const scored = KB.map(e => ({ entry: e, s: score(query, e) }))
    .sort((a, b) => b.s - a.s);

  if (scored[0].s === 0) {
    return `Non ho trovato una risposta specifica per "${query}".

Prova a chiedermi di un tool specifico come:
- **Art. 5 Checker**, **AI Classifier**, **Risk Manager**
- **DPIA**, **FRIA**, **Data Audit**, **DocuGen**
- **LogVault**, **Transparency**, **Oversight**, **Resilience**
- **QMS**, **Conformity**, **GPAI**
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
      text: `**Ciao! Sono l'assistente RegulaeOS** 👋

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
        aria-label="Assistente RegulaeOS"
        title="Assistente RegulaeOS"
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
              Assistente RegulaeOS
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
