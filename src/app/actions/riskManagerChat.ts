"use server";
import { generateText } from "@/lib/rag/rag-vertex";

export type RiskPhaseId =
  | "scoping"
  | "identification"
  | "montecarlo"
  | "bitemporal"
  | "drift"
  | "gpai"
  | "governance"
  | "final";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Voce strutturata del registro (Sezione 5 del template docx)
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
  scoping?: {
    systemName?: string;
    context?: string;
    classification?: string;
    scope?: string;
    article?: string;
    // Sezione 3 del template — identificazione strutturata
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
    };
  };
  identification?: {
    risks?: string[];
    count?: number;
    categories?: string[];
    highRisks?: string[];
    // Sezione 5 del template — voci strutturate
    riskEntries?: StructuredRiskEntry[];
  };
  montecarlo?: {
    iterations?: number;
    meanScore?: number;
    p95?: number;
    worstCase?: string;
    confidenceLevel?: string;
  };
  bitemporal?: {
    versionsTracked?: number;
    lastAuditDate?: string;
    changes?: string[];
    retentionPolicy?: string;
  };
  drift?: {
    psiScore?: number;
    driftDetected?: boolean;
    monitoringFrequency?: string;
    alertThreshold?: string;
  };
  gpai?: {
    role?: string;
    systemicRisk?: boolean;
    art53Score?: number;
    codeOfPractice?: string;
  };
  governance?: {
    art9Measures?: string[];
    sanctionRisk?: string;
    responsiblePerson?: string;
    reviewCycle?: string;
    // Sezione 7 del template — log di revisione
    reviewLog?: Array<{
      date?: string;
      trigger?: string;
      outcome?: string;
      reviewer?: string;
      nextReviewDate?: string;
    }>;
  };
  final?: {
    overallRisk?: string;
    score?: number;
    recommendation?: string;
    nextReviewDate?: string;
    completedAt?: string;
    // Sezione 6 del template — gap check Art. 9
    gapCheck?: {
      coverageScore?: number;
      assessment?: string;
      missingAreas?: Array<{
        area?: string;
        art9Requirement?: string;
        suggestedRiskTitle?: string;
        priority?: "obbligatorio" | "raccomandato";
      }>;
    };
    // Sezione 8 del template — sign-off
    signOff?: {
      riskOwner?: { name?: string; date?: string; signed?: boolean };
      complianceLegal?: { name?: string; date?: string; signed?: boolean };
      legalRepresentative?: { name?: string; date?: string; signed?: boolean };
    };
  };
}

interface ChatResponse {
  reply?: string;
  patch?: Partial<RiskDocumentation>;
  stepComplete?: boolean;
  error?: string;
}

const PHASE_PROMPTS: Record<RiskPhaseId, string> = {
  scoping: `Stai guidando l'utente nella fase di SCOPING del Risk Manager AI Act (Art. 9 Reg. UE 2024/1689).
Obiettivi (Sezione 3 del Registro dei Rischi): nome sistema, ruolo (provider/deployer), descrizione e finalità, tier di rischio, area Allegato III, articoli applicabili, dati personali trattati (e base giuridica se sì), supervisione umana richiesta (Art. 14), risk owner del registro.
Fai domande mirate e progressive. Quando hai sufficienti informazioni includi <extract> con questa struttura (compila SOLO i campi effettivamente comunicati dall'utente, ometti gli altri):
{ "scoping": { "systemName": "...", "context": "...", "identification": { "systemName": "...", "providerDeployerRole": "provider|deployer", "descriptionAndPurpose": "...", "riskTier": "minimal|limited|high_risk|gpai", "annexIIIArea": "...", "applicableArticles": ["Art. 9", "..."], "personalDataProcessed": "yes|no", "legalBasis": "...", "humanOversightRequired": true, "registerOwner": "..." } } }`,

  identification: `Stai guidando la fase di IDENTIFICAZIONE RISCHI (Art. 9(2) AI Act) — Sezione 5 del Registro dei Rischi.
Obiettivi: identificare rischi per diritti fondamentali, bias algoritmico, opacità, perdita di controllo umano, dipendenze tecnologiche.
Per ogni rischio chiedi (gradualmente, non tutto insieme): categoria, descrizione, probabilità (bassa/media/alta), impatto (basso/medio/alto), misure di mitigazione, owner, prossima revisione.
Aiuta l'utente a elencare almeno 3-5 rischi concreti. Quando hai sufficienti rischi includi <extract> con (compila SOLO ciò che l'utente ha comunicato):
{ "identification": { "riskEntries": [ { "id": "R-01", "category": "...", "description": "...", "art9Reference": "Art. 9(2)(a) [verificare sul testo AI Act vigente]", "likelihood": "low|medium|high", "impact": "low|medium|high", "mitigations": "...", "owner": "...", "status": "open", "nextReviewDate": "2026-09-01" } ] } }
REGOLA: ogni art9Reference DEVE terminare con "[verificare sul testo AI Act vigente]".`,

  montecarlo: `Stai guidando la SIMULAZIONE MONTE CARLO per quantificazione rischi (metodologia ENISA AI Security Guidelines).
Obiettivi: definire parametri probabilistici per ogni rischio, stimare score medio atteso, P95, worst case.
Guida l'utente a stimare: probabilità di occorrenza (0-1), impatto (1-10), numero simulazioni (minimo 1000).
Quando hai i parametri, calcola e presenta i risultati, poi includi <extract>.`,

  bitemporal: `Stai guidando l'AUDIT BITEMPORALE (requisiti di tracciabilità Art. 12 e 17 AI Act).
Obiettivi: definire policy di versionamento del modello, frequenza audit, periodo di retention dei log, responsabili.
Assicura copertura di: versioni software, dati training, configurazioni, incidenti. Includi <extract> quando completo.`,

  drift: `Stai guidando la DRIFT DETECTION (monitoraggio post-market Art. 72 AI Act).
Obiettivi: definire soglie PSI (Population Stability Index), frequenza controllo deriva, trigger di alert, procedure di risposta.
PSI < 0.1 = stabile, 0.1-0.2 = attenzione, > 0.2 = deriva significativa.
Quando l'utente ha definito le metriche, includi <extract>.`,

  gpai: `Stai guidando la valutazione GPAI & RISCHIO SISTEMICO (Art. 51-55 AI Act, applicabile se il sistema usa o è un GPAI).
Obiettivi: determinare se c'è un GPAI upstream, valutare rischio sistemico (soglia 10^25 FLOP), verificare adesione a codici di condotta.
Se non applicabile, documenta perché. Includi <extract> con la valutazione.`,

  governance: `Stai guidando la fase GOVERNANCE & SANZIONI (Art. 9 sistema di gestione rischi + Art. 99-100 AI Act) — Sezione 7 del Registro.
Obiettivi: misure di governance concrete (responsabile AI, comitato revisione, procedure escalation), esposizione sanzionatoria (max 35M€ o 7% fatturato), ciclo di revisione del registro (trigger: pianificata / modifica sostanziale / incidente / nuovi dati).
Quando la governance è definita includi <extract> con (solo campi comunicati):
{ "governance": { "art9Measures": ["..."], "responsiblePerson": "...", "reviewCycle": "...", "reviewLog": [ { "date": "2026-06-12", "trigger": "pianificata", "outcome": "...", "reviewer": "...", "nextReviewDate": "2026-09-12" } ] } }`,

  final: `Stai guidando la FINALIZZAZIONE del Risk Register (sintesi Art. 9 AI Act) — Sezioni 6 e 8 del Registro.
Obiettivi: verifica di copertura Art. 9 (gap check: punteggio 0-100, valutazione sintetica, aree non coperte con priorità obbligatorio/raccomandato), raccolta nominativi per il sign-off (risk owner, responsabile compliance/legale, rappresentante legale), data prossima revisione.
Presenta un sommario strutturato. Includi <extract> con (solo campi comunicati):
{ "final": { "overallRisk": "...", "recommendation": "...", "nextReviewDate": "...", "gapCheck": { "coverageScore": 75, "assessment": "...", "missingAreas": [ { "area": "...", "art9Requirement": "Art. 9(2)(c) [verificare sul testo AI Act vigente]", "suggestedRiskTitle": "...", "priority": "obbligatorio" } ] }, "signOff": { "riskOwner": { "name": "...", "signed": false }, "complianceLegal": { "name": "...", "signed": false }, "legalRepresentative": { "name": "...", "signed": false } } } }
REGOLA: ogni art9Requirement DEVE terminare con "[verificare sul testo AI Act vigente]".`,
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

  // Solo le fasi già completate, senza il JSON completo per tenere il prompt corto
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

  // Ultimi 6 messaggi per tenere il prompt entro i limiti di token
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
