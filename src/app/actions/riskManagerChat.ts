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

export interface RiskDocumentation {
  scoping?: {
    systemName?: string;
    context?: string;
    classification?: string;
    scope?: string;
    article?: string;
  };
  identification?: {
    risks?: string[];
    count?: number;
    categories?: string[];
    highRisks?: string[];
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
  };
  final?: {
    overallRisk?: string;
    score?: number;
    recommendation?: string;
    nextReviewDate?: string;
    completedAt?: string;
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
Obiettivi: raccogliere nome sistema, contesto di deployment, classificazione rischio, ambito territoriale e casi d'uso previsti.
Fai domande mirate e progressive. Quando hai sufficienti informazioni, includi un blocco <extract> con i dati raccolti.`,

  identification: `Stai guidando la fase di IDENTIFICAZIONE RISCHI (Art. 9(2) AI Act).
Obiettivi: identificare rischi per diritti fondamentali, bias algoritmico, opacità, perdita di controllo umano, dipendenze tecnologiche.
Usa categorie: tecnico, etico, normativo, operativo, reputazionale.
Aiuta l'utente a elencare almeno 3-5 rischi concreti. Quando hai sufficienti rischi, includi <extract>.`,

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

  governance: `Stai guidando la fase GOVERNANCE & SANZIONI (Art. 9 sistema di gestione rischi + Art. 99-100 AI Act).
Obiettivi: identificare misure di governance concrete (responsabile AI, comitato revisione, procedure escalation), valutare esposizione sanzionatoria (max 35M€ o 7% fatturato), definire ciclo di revisione.
Includi <extract> quando la governance è definita.`,

  final: `Stai guidando la FINALIZZAZIONE del Risk Register (sintesi Art. 9 AI Act).
Obiettivi: consolidare tutti i dati raccolti, calcolare punteggio complessivo di rischio, generare raccomandazioni prioritizzate, definire data prossima revisione.
Presenta un sommario strutturato del Risk Register completo. Includi <extract> con il riepilogo finale.`,
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
    const raw = await generateText(fullPrompt, { temperature: 0.3, maxOutputTokens: 800 });
    return parseResponse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[riskManagerChat] generateText failed:", msg);
    return { error: `Errore AI: ${msg}` };
  }
}
