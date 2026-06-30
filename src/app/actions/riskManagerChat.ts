"use server";
import { generateText } from "@/lib/rag/rag-vertex";

// 11 step numerati (1-11) + 1 modulo condizionale (gpai_systemic_risk, non numerato)
export type RiskPhaseId =
  | "scoping"
  | "identification"
  | "estimation"
  | "testing"
  | "mitigation"
  | "monitoring"
  | "gap_check"
  | "traceability"
  | "dismissal"
  | "signoff"
  | "communication"
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
      riskAppetite?: string;
      usageContext?: string;
      lifeCyclePhase?: string;
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
    evaluationAgainstCriteria?: string;
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
    treatmentOption?: string; // Modifica/Evitamento/Condivisione/Ritenzione
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
    qmsIntegration?: string; // integrazione QMS — Art. 17
  };
  // Step 9 — Dismissione / ritiro (ISO 23894 Annex C)
  dismissal?: {
    dismissalRisks?: string;
    dataDeletion?: string;
    downstreamDependencies?: string;
    communicationToDeployers?: string;
  };
  // Step 10 — Sign-off (Sez. 8) — era final
  signoff?: {
    overallRisk?: string;
    score?: number;
    recommendation?: string;
    nextReviewDate?: string;
    completedAt?: string;
    otherRegimesIntegration?: string; // Art. 9(10)
    signOff?: {
      riskOwner?: { name?: string; date?: string; signed?: boolean };
      complianceLegal?: { name?: string; date?: string; signed?: boolean };
      legalRepresentative?: { name?: string; date?: string; signed?: boolean };
    };
  };
  // Step 11 — Comunicazione e consultazione (ISO 23894 §6.2)
  communication?: {
    stakeholdersInvolved?: string;
    friaLink?: string;
    externalConsultees?: string;
    consultationDocumented?: boolean;
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
Obiettivi (§0 Template): nome sistema, ruolo (provider/deployer), descrizione e finalità, tier di rischio, area Allegato III, articoli applicabili, dati personali trattati (e base giuridica se sì), supervisione umana richiesta (Art. 14), risk owner del registro.
Chiedi anche: (a) criteri di accettabilità del rischio (risk appetite): es. "nessun rischio alto sui diritti fondamentali è accettabile senza misure"; (b) ambito e contesto d'uso: deployment, utenti finali, ambiente operativo; (c) fase del ciclo di vita attuale (design/sviluppo/deployment/monitoraggio/dismissione).
Aggiungi anche il triage GPAI: "Il sistema incorpora un modello GPAI con rischio sistemico (Art. 51)?" — salva in incorporatesGpaiModel.
Quando hai sufficienti informazioni includi <extract> (compila SOLO i campi comunicati):
{ "scoping": { "systemName": "...", "context": "...", "identification": { "systemName": "...", "providerDeployerRole": "provider|deployer", "descriptionAndPurpose": "...", "riskTier": "minimal|limited|high_risk|gpai", "annexIIIArea": "...", "applicableArticles": ["Art. 9(1) [verify against current AI Act text]"], "personalDataProcessed": "yes|no", "legalBasis": "...", "humanOversightRequired": true, "registerOwner": "...", "incorporatesGpaiModel": "yes|no|unspecified", "riskAppetite": "...", "usageContext": "...", "lifeCyclePhase": "design|sviluppo|deployment|monitoraggio|dismissione" } } }`,

  identification: `Stai guidando lo STEP 2 — IDENTIFICAZIONE RISCHI (Art. 9(2)(a) AI Act [verify against current AI Act text]; supporto Art. 9(9) [verify against current AI Act text]).
Obiettivi (Sezione 5): identificare rischi per diritti fondamentali, bias algoritmico, opacità, perdita di controllo umano, dipendenze tecnologiche. Includi anche la valutazione Art. 9(9): impatto su minori (<18 anni) e altri gruppi vulnerabili — salva in vulnerableGroupsImpactAssessment.
Per ogni rischio chiedi (gradualmente): categoria, descrizione, probabilità (bassa/media/alta), impatto (basso/medio/alto), misure di mitigazione, owner, prossima revisione.
Aiuta l'utente a elencare almeno 3-5 rischi concreti. Quando ha sufficienti rischi includi <extract>:
{ "identification": { "riskEntries": [ { "id": "R-01", "category": "...", "description": "...", "art9Reference": "Art. 9(2)(a) [verify against current AI Act text]", "likelihood": "low|medium|high", "impact": "low|medium|high", "mitigations": "...", "owner": "...", "status": "open", "nextReviewDate": "2026-09-01" } ], "vulnerableGroupsImpactAssessment": "Valutazione impatto su minori e gruppi vulnerabili: ..." } }
REGOLA: ogni art9Reference DEVE terminare con "[verify against current AI Act text]".`,

  estimation: `Stai guidando lo STEP 3 — STIMA E VALUTAZIONE (Art. 9(2)(b) AI Act [verify against current AI Act text]).
Obiettivi (§2 Template): definire tutti gli usi previsti del sistema, identificare usi impropri ragionevolmente prevedibili (non solo uso conforme, ma anche misuso prevedibile), stimare numero e tipologia di persone coinvolte, valutare la probabilità di danno e la sua reversibilità. Chiedi infine: come il rischio stimato si confronta con i criteri di accettabilità definiti al §0 (risk appetite)? — salva in evaluationAgainstCriteria.
Includi <extract> quando i principali casi sono coperti:
{ "estimation": { "intendedUseCases": ["..."], "foreseenMisuse": ["..."], "impactAssessment": "...", "affectedPersonsCount": "...", "evaluationAgainstCriteria": "..." } }`,

  testing: `Stai guidando lo STEP 4 — TEST E VALIDAZIONE (Art. 9(6)-(8) AI Act [verify against current AI Act text]).
Obiettivi: definire le metriche di validazione, le soglie di accettabilità, i metodi di test, i criteri per il rilascio in produzione (Art. 9(8)). Nota metodologica: le linee guida ENISA possono essere usate come riferimento per i parametri probabilistici.
Guida l'utente su: metriche di accuratezza/fairness/robustezza, soglie accettabili, frequenza dei test, procedura di approvazione prima del rilascio.
Includi <extract> quando le metriche sono definite:
{ "testing": { "testMetrics": ["accuratezza >90%", "..."], "thresholds": "...", "validationOutcome": "...", "worstCase": "...", "confidenceLevel": "..." } }`,

  mitigation: `Stai guidando lo STEP 5 — TRATTAMENTO DEL RISCHIO E RISCHIO RESIDUO (Art. 9(2)(d), 9(4)-(5) AI Act [verify against current AI Act text]; supporto Art. 13 [verify against current AI Act text]).
Obiettivi (§4 Template): definire l'opzione di trattamento scelta (Modifica/design-mitigazione · Evitamento/non distribuire · Condivisione/contrattuale-assicurativa · Ritenzione/accettazione consapevole), le misure concrete secondo la gerarchia Art. 9(5): 1) eliminazione/riduzione tramite progettazione, 2) controllo per rischi non eliminabili, 3) informazione e formazione ai deployer (Art. 13). Valutare poi il rischio residuo accettabile e il responsabile compliance.
Includi <extract> quando le misure sono definite:
{ "mitigation": { "treatmentOption": "Modifica|Evitamento|Condivisione|Ritenzione", "measures": ["..."], "residualRisk": "...", "responsiblePerson": "...", "reviewCycle": "..." } }`,

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
Obiettivi (§7 Template): definire la policy di versionamento del Risk Register (storico versioni, log generati automaticamente per Art. 12), periodo di retention dei log, responsabili della tracciabilità. Chiedi anche: il sistema di gestione dei rischi è incorporato nel QMS aziendale (Art. 17)? — salva in qmsIntegration.
Includi <extract> quando completo:
{ "traceability": { "versionsTracked": 3, "lastAuditDate": "2026-06-13", "changes": ["..."], "retentionPolicy": "5 anni", "qmsIntegration": "..." } }`,

  dismissal: `Stai guidando lo STEP 9 — DISMISSIONE E RITIRO (ISO 23894 Annex C; Art. 9 AI Act [verify against current AI Act text]).
Obiettivi (§8 Template): identificare i rischi specifici della fase di dismissione del sistema AI. Guida l'utente su: (a) rischi da cancellazione/anonimizzazione dei dati residui; (b) dipendenze a valle verso altri sistemi o clienti che usano gli output; (c) procedure di migrazione dati se necessario; (d) obblighi di comunicazione del ritiro ai deployer e agli interessati.
Includi <extract> quando i rischi di dismissione sono definiti:
{ "dismissal": { "dismissalRisks": "...", "dataDeletion": "...", "downstreamDependencies": "...", "communicationToDeployers": "..." } }`,

  signoff: `Stai guidando lo STEP 10 — APPROVAZIONE, FIRME E FINALIZZAZIONE (Art. 9(1) + Art. 9(10) AI Act [verify against current AI Act text]).
Obiettivi (§9 Template): raccogliere nominativi per il sign-off (risk owner, responsabile compliance/legale, rappresentante legale), valutazione complessiva del rischio, data prossima revisione. Se il provider è già soggetto ad altri obblighi di risk management (es. dispositivi medici, macchine), documentare come i processi si integrano/combinano — salva in otherRegimesIntegration.
Presenta un sommario strutturato. Includi <extract>:
{ "signoff": { "overallRisk": "...", "recommendation": "...", "nextReviewDate": "...", "otherRegimesIntegration": "...", "signOff": { "riskOwner": { "name": "...", "signed": false }, "complianceLegal": { "name": "...", "signed": false }, "legalRepresentative": { "name": "...", "signed": false } } } }`,

  communication: `Stai guidando lo STEP 11 — COMUNICAZIONE E CONSULTAZIONE (ISO 23894 §6.2 — trasversale all'intero processo).
Obiettivi (Template trasversale): documentare chi è stato coinvolto o consultato lungo tutto il processo di risk management. Guida l'utente su: (a) interni: risk owner, legale, DPO, team prodotto/engineering; (b) esterni dove rilevante: clienti deployer, autorità di vigilanza, organismi notificati; (c) se la FRIA (Fundamental Rights Impact Assessment) ha informato la parte sui diritti fondamentali — salva in friaLink; (d) documentare come l'input degli stakeholder è stato considerato nel registro.
Includi <extract>:
{ "communication": { "stakeholdersInvolved": "...", "friaLink": "FRIA compilata / non applicabile / link", "externalConsultees": "...", "consultationDocumented": true } }`,

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
