"use server";
import { generateText } from "@/lib/rag/rag-vertex";

// 9 step numerati (1-9) + 1 modulo condizionale (gpai_systemic_risk, non numerato)
export type RiskPhaseId =
  | "scoping"
  | "identification"
  | "estimation"
  | "testing"
  | "mitigation"
  | "monitoring"
  | "gap_check"
  | "traceability"
  | "signoff"
  | "gpai_systemic_risk"; // modulo condizionale

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StructuredRiskEntry {
  id?: string;
  category?: string;
  description?: string;
  art9Reference?: string;
  likelihood?: "low" | "medium" | "high";
  impact?: "low" | "medium" | "high";
  mitigations?: string;
  owner?: string;
  status?: "open" | "assessing" | "mitigating" | "mitigated" | "accepted" | "transferred";
  nextReviewDate?: string;
}

export interface RiskDocumentation {
  // Step 1 — Scoping (Sez. 3)
  scoping?: {
    systemName?: string;
    context?: string;
    classification?: string;
    scope?: string;
    article?: string;
    identification?: {
      systemName?: string;
      providerDeployerRole?: string;
      descriptionAndPurpose?: string;
      riskTier?: "minimal" | "limited" | "high_risk" | "gpai" | "unclassified";
      annexIIIArea?: string;
      applicableArticles?: string[];
      personalDataProcessed?: "yes" | "no" | "unspecified";
      legalBasis?: string;
      humanOversightRequired?: boolean;
      registerOwner?: string;
      incorporatesGpaiModel?: "yes" | "no" | "unspecified";
    };
  };
  // Step 2 — Identification (Sez. 5)
  identification?: {
    risks?: string[];
    count?: number;
    categories?: string[];
    highRisks?: string[];
    riskEntries?: StructuredRiskEntry[];
    vulnerableGroupsImpactAssessment?: string; // Art. 9(9)
  };
  // Step 3 — Estimation (Sez. 5)
  estimation?: {
    intendedUseCases?: string[];
    foreseenMisuse?: string[];
    impactAssessment?: string;
    affectedPersonsCount?: string;
  };
  // Step 4 — Testing (Sez. 4) — era montecarlo
  testing?: {
    iterations?: number;
    meanScore?: number;
    p95?: number;
    worstCase?: string;
    confidenceLevel?: string;
    testMetrics?: string[];
    thresholds?: string;
    validationOutcome?: string;
  };
  // Step 5 — Mitigation (Sez. 5 + 6) — era governance
  mitigation?: {
    measures?: string[];
    residualRisk?: string;
    responsiblePerson?: string;
    reviewCycle?: string;
  };
  // Step 6 — Monitoring (Sez. 7) — era drift
  monitoring?: {
    psiScore?: number;
    driftDetected?: boolean;
    monitoringFrequency?: string;
    alertThreshold?: string;
    postMarketPlan?: string;
    reviewLog?: Array<{
      date?: string;
      trigger?: string;
      outcome?: string;
      reviewer?: string;
      nextReviewDate?: string;
    }>;
  };
  // Step 7 — Gap Check (Sez. 6)
  gap_check?: {
    coverageScore?: number;
    assessment?: string;
    missingAreas?: Array<{
      area?: string;
      art9Requirement?: string;
      suggestedRiskTitle?: string;
      priority?: "obbligatorio" | "raccomandato";
    }>;
  };
  // Step 8 — Traceability (trasversale) — era bitemporal
  traceability?: {
    versionsTracked?: number;
    lastAuditDate?: string;
    changes?: string[];
    retentionPolicy?: string;
  };
  // Step 9 — Sign-off (Sez. 8) — era final
  signoff?: {
    overallRisk?: string;
    score?: number;
    recommendation?: string;
    nextReviewDate?: string;
    completedAt?: string;
    signOff?: {
      riskOwner?: { name?: string; date?: string; signed?: boolean };
      complianceLegal?: { name?: string; date?: string; signed?: boolean };
      legalRepresentative?: { name?: string; date?: string; signed?: boolean };
    };
  };
  // Modulo condizionale (non numerato) — era gpai
  gpai_systemic_risk?: {
    role?: string;
    systemicRisk?: boolean;
    art53Score?: number;
    codeOfPractice?: string;
  };
}

interface ChatResponse {
  reply?: string;
  patch?: Partial<RiskDocumentation>;
  stepComplete?: boolean;
  error?: string;
}

const PHASE_PROMPTS: Record<RiskPhaseId, string> = {
  scoping: `Stai guidando lo STEP 1 — SCOPING (Art. 9(1) AI Act [verify against current AI Act text]; supporto Art. 6, Allegato III).
Obiettivi (Sezione 3): nome sistema, ruolo (provider/deployer), descrizione e finalità, tier di rischio, area Allegato III, articoli applicabili, dati personali trattati (e base giuridica se sì), supervisione umana richiesta (Art. 14), risk owner del registro.
Aggiungi anche la domanda di triage GPAI: "Il sistema è, o incorpora, un modello GPAI con rischio sistemico (Art. 51 [verify against current AI Act text])?" — salva in incorporatesGpaiModel.
Quando hai sufficienti informazioni includi <extract> (compila SOLO i campi comunicati):
{ "scoping": { "systemName": "...", "context": "...", "identification": { "systemName": "...", "providerDeployerRole": "provider|deployer", "descriptionAndPurpose": "...", "riskTier": "minimal|limited|high_risk|gpai", "annexIIIArea": "...", "applicableArticles": ["Art. 9(1) [verify against current AI Act text]"], "personalDataProcessed": "yes|no", "legalBasis": "...", "humanOversightRequired": true, "registerOwner": "...", "incorporatesGpaiModel": "yes|no|unspecified" } } }`,

  identification: `Stai guidando lo STEP 2 — IDENTIFICAZIONE RISCHI (Art. 9(2)(a) AI Act [verify against current AI Act text]; supporto Art. 9(9) [verify against current AI Act text]).
Obiettivi (Sezione 5): identificare rischi per diritti fondamentali, bias algoritmico, opacità, perdita di controllo umano, dipendenze tecnologiche. Includi anche la valutazione Art. 9(9): impatto su minori (<18 anni) e altri gruppi vulnerabili — salva in vulnerableGroupsImpactAssessment.
Per ogni rischio chiedi (gradualmente): categoria, descrizione, probabilità (bassa/media/alta), impatto (basso/medio/alto), misure di mitigazione, owner, prossima revisione.
Aiuta l'utente a elencare almeno 3-5 rischi concreti. Quando ha sufficienti rischi includi <extract>:
{ "identification": { "riskEntries": [ { "id": "R-01", "category": "...", "description": "...", "art9Reference": "Art. 9(2)(a) [verify against current AI Act text]", "likelihood": "low|medium|high", "impact": "low|medium|high", "mitigations": "...", "owner": "...", "status": "open", "nextReviewDate": "2026-09-01" } ], "vulnerableGroupsImpactAssessment": "Valutazione impatto su minori e gruppi vulnerabili: ..." } }
REGOLA: ogni art9Reference DEVE terminare con "[verify against current AI Act text]".`,

  estimation: `Stai guidando lo STEP 3 — STIMA E VALUTAZIONE (Art. 9(2)(b) AI Act [verify against current AI Act text]).
Obiettivi: definire tutti gli usi previsti del sistema, identificare usi impropri ragionevolmente prevedibili, stimare numero e tipologia di persone coinvolte, valutare la probabilità di danno e la sua reversibilità.
Guida l'utente a documentare: casi d'uso previsti, scenari di misuso (es. abuso per discriminazione), popolazione impattata (numero persone, categorie, vulnerabilità).
Includi <extract> quando i principali casi sono coperti:
{ "estimation": { "intendedUseCases": ["..."], "foreseenMisuse": ["..."], "impactAssessment": "...", "affectedPersonsCount": "..." } }`,

  testing: `Stai guidando lo STEP 4 — TEST E VALIDAZIONE (Art. 9(6)-(8) AI Act [verify against current AI Act text]).
Obiettivi: definire le metriche di validazione, le soglie di accettabilità, i metodi di test, i criteri per il rilascio in produzione (Art. 9(8)). Nota metodologica: le linee guida ENISA possono essere usate come riferimento per i parametri probabilistici.
Guida l'utente su: metriche di accuratezza/fairness/robustezza, soglie accettabili, frequenza dei test, procedura di approvazione prima del rilascio.
Includi <extract> quando le metriche sono definite:
{ "testing": { "testMetrics": ["accuratezza >90%", "..."], "thresholds": "...", "validationOutcome": "...", "worstCase": "...", "confidenceLevel": "..." } }`,

  mitigation: `Stai guidando lo STEP 5 — MISURE DI GESTIONE DEL RISCHIO E RISCHIO RESIDUO (Art. 9(2)(d), 9(4)-(5) AI Act [verify against current AI Act text]; supporto Art. 13 [verify against current AI Act text]).
Obiettivi (Sezione 5 + 6): definire misure di mitigazione concrete per ogni rischio identificato, valutare il rischio residuo dopo le misure, identificare responsabile AI e ciclo di revisione.
Guida l'utente su: misure tecniche (validazione input, spiegabilità, logging), misure organizzative (formazione, procedure escalation), rischio residuo accettabile, responsabile compliance.
Includi <extract> quando le misure sono definite:
{ "mitigation": { "measures": ["..."], "residualRisk": "...", "responsiblePerson": "...", "reviewCycle": "..." } }`,

  monitoring: `Stai guidando lo STEP 6 — MONITORAGGIO POST-MARKET E DRIFT DETECTION (Art. 9(2)(c) AI Act [verify against current AI Act text]; supporto Art. 72 [verify against current AI Act text]).
Obiettivi (Sezione 7): definire soglie PSI (Population Stability Index), frequenza controllo deriva, trigger di alert, procedure di risposta, log di revisione del Risk Register.
PSI < 0.1 = stabile, 0.1-0.2 = attenzione, > 0.2 = deriva significativa. Trigger revisione: pianificata / modifica sostanziale / incidente / nuovi dati.
Includi <extract> quando i parametri sono definiti:
{ "monitoring": { "monitoringFrequency": "...", "alertThreshold": "PSI > 0.2", "postMarketPlan": "...", "reviewLog": [ { "date": "2026-06-13", "trigger": "pianificata", "outcome": "...", "reviewer": "...", "nextReviewDate": "2026-09-13" } ] } }`,

  gap_check: `Stai guidando lo STEP 7 — VERIFICA DI COPERTURA ART. 9 (Art. 9(2)(a)-(d), 9(6)-(8), 9(9) AI Act [verify against current AI Act text]).
Obiettivi (Sezione 6): verificare che tutti i requisiti Art. 9 siano coperti dal Risk Register, assegnare un punteggio di copertura 0-100, identificare le aree non coperte con priorità obbligatorio/raccomandato. Questo step richiede almeno 3 rischi identificati nello step 2.
Analizza la copertura di: (a) identificazione rischi, (b) stima e valutazione, (c) monitoraggio, (d) misure di gestione, + test (6-8) e gruppi vulnerabili (9).
Includi <extract>:
{ "gap_check": { "coverageScore": 75, "assessment": "...", "missingAreas": [ { "area": "...", "art9Requirement": "Art. 9(2)(c) [verify against current AI Act text]", "suggestedRiskTitle": "...", "priority": "obbligatorio" } ] } }
REGOLA: ogni art9Requirement DEVE terminare con "[verify against current AI Act text]".`,

  traceability: `Stai guidando lo STEP 8 — TRACCIABILITÀ E MANTENIMENTO CONTINUO (Art. 9(1)-(2) AI Act [verify against current AI Act text]; supporto Art. 12, 17 [verify against current AI Act text]).
Obiettivi: definire la policy di versionamento del Risk Register, frequenza audit, periodo di retention dei log, responsabili della tracciabilità. Assicura copertura di: versioni software, dati di training, configurazioni, incidenti.
Includi <extract> quando completo:
{ "traceability": { "versionsTracked": 3, "lastAuditDate": "2026-06-13", "changes": ["..."], "retentionPolicy": "5 anni" } }`,

  signoff: `Stai guidando lo STEP 9 — APPROVAZIONE, FIRME E FINALIZZAZIONE (Art. 9(1) AI Act [verify against current AI Act text]).
Obiettivi (Sezione 8): raccogliere nominativi per il sign-off (risk owner, responsabile compliance/legale, rappresentante legale), valutazione complessiva del rischio, data prossima revisione. Se personalDataProcessed === "yes", cita anche Art. 9(10) [verify against current AI Act text].
Presenta un sommario strutturato. Includi <extract>:
{ "signoff": { "overallRisk": "...", "recommendation": "...", "nextReviewDate": "...", "signOff": { "riskOwner": { "name": "...", "signed": false }, "complianceLegal": { "name": "...", "signed": false }, "legalRepresentative": { "name": "...", "signed": false } } } }`,

  gpai_systemic_risk: `Stai guidando il MODULO CONDIZIONALE — GPAI & RISCHIO SISTEMICO (Art. 51-55 Capo V AI Act [verify against current AI Act text]).
ATTENZIONE: questo modulo riguarda obblighi specifici del fornitore del modello GPAI — un regime distinto dal Risk Register Art. 9. Può applicarsi anche se il sistema non è classificato ad alto rischio.
Obiettivi: determinare il ruolo (fornitore del modello GPAI / deployer), valutare rischio sistemico (soglia 10^25 FLOP), verificare adesione a codici di condotta, obblighi di trasparenza Art. 53.
Se non applicabile, documenta perché. Includi <extract>:
{ "gpai_systemic_risk": { "role": "provider|deployer", "systemicRisk": true, "art53Score": 80, "codeOfPractice": "..." } }`,
};

function parseResponse(raw: string): { reply: string; patch?: Partial<RiskDocumentation>; stepComplete?: boolean } {
  const extractMatch = raw.match(/<extract>([\s\S]*?)<\/extract>/);
  const reply = raw.replace(/<extract>[\s\S]*?<\/extract>/g, "").trim();

  if (!extractMatch) return { reply };

  try {
    const patch = JSON.parse(extractMatch[1].trim()) as Partial<RiskDocumentation>;
    return { reply, patch, stepComplete: true };
  } catch {
    return { reply };
  }
}

export async function riskManagerChat(
  messages: ChatMessage[],
  currentPhase: RiskPhaseId,
  documentation: RiskDocumentation,
  systemContext: { systemName?: string; riskLevel?: string; isGPAI?: boolean } = {}
): Promise<ChatResponse> {
  const phasePrompt = PHASE_PROMPTS[currentPhase];

  const completedSummary = Object.keys(documentation)
    .filter(k => k !== currentPhase)
    .map(k => `- ${k}: completata`)
    .join("\n") || "nessuna fase completata";

  const systemPrompt = `Sei un esperto EU AI Act integrato in AIComply Risk Manager.
Rispondi in italiano. Sii conciso (max 5 frasi). Cita gli articoli AI Act rilevanti.

SISTEMA: ${systemContext.systemName ?? "non specificato"} | Risk: ${systemContext.riskLevel ?? "N/D"} | GPAI: ${systemContext.isGPAI ? "Sì" : "No"}
FASI COMPLETATE: ${completedSummary}

FASE CORRENTE — ${currentPhase.toUpperCase()}:
${phasePrompt}

ISTRUZIONE IMPORTANTE: Quando hai raccolto abbastanza informazioni per la fase corrente,
includi alla fine della tua risposta un blocco JSON così formattato (NON visibile all'utente come testo):
<extract>
{ "${currentPhase}": { ... campi estratti ... } }
</extract>
Il blocco <extract> NON deve apparire nel testo della risposta mostrata all'utente.
Includi nel patch SOLO la chiave della fase corrente ("${currentPhase}").
Non inventare dati — usa solo ciò che l'utente ha effettivamente comunicato.`;

  const conversation = messages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Utente" : "Assistente"}: ${m.content}`)
    .join("\n\n");

  const fullPrompt = `${systemPrompt}\n\n---\nCONVERSAZIONE:\n${conversation}`;

  try {
    const raw = await generateText(fullPrompt, { temperature: 0.3, maxOutputTokens: 1600 });
    return parseResponse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[riskManagerChat] generateText failed:", msg);
    return { error: `Errore AI: ${msg}` };
  }
}
