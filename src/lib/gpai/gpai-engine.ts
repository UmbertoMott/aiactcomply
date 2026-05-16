// GPAI Engine — Art. 51-55 Reg. UE 2024/1689

// ─── CATALOGO MODELLI GPAI NOTI ──────────────────────────────────────────────

export type GPAIProvider =
  | "openai" | "anthropic" | "google" | "mistral"
  | "meta" | "cohere" | "xai" | "deepseek" | "nvidia" | "custom";

export type SystemicRiskLevel = "systemic" | "standard" | "unknown";

export interface GPAIModel {
  id: string;
  provider: GPAIProvider;
  name: string;
  modelId: string;
  systemicRisk: SystemicRiskLevel;
  estimatedFLOPs: string;
  knownCapabilities: string[];
  transparencyPageUrl: string;
  euBasedProvider: boolean;
  notes: string;
}

export const GPAI_CATALOG: GPAIModel[] = [
  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: "o3",
    provider: "openai",
    name: "OpenAI o3",
    modelId: "o3",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^26",
    knownCapabilities: ["reasoning", "math", "code", "science", "multi-step problem solving"],
    transparencyPageUrl: "https://openai.com/policies/usage-policies",
    euBasedProvider: false,
    notes: "Modello di ragionamento avanzato — top performer su benchmark scientifici e matematici (AIME 2025). Rischio sistemico confermato.",
  },
  {
    id: "o4-mini",
    provider: "openai",
    name: "OpenAI o4-mini",
    modelId: "o4-mini",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^25",
    knownCapabilities: ["reasoning", "math", "code", "vision", "function calling"],
    transparencyPageUrl: "https://openai.com/policies/usage-policies",
    euBasedProvider: false,
    notes: "Reasoning model compatto ma con capacità sistemiche — ottimo rapporto costo/prestazioni.",
  },
  {
    id: "gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    modelId: "gpt-4o",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^25",
    knownCapabilities: ["text generation", "code", "vision", "audio", "function calling"],
    transparencyPageUrl: "https://openai.com/policies/usage-policies",
    euBasedProvider: false,
    notes: "Modello multimodale flagship — obblighi Art. 54 per il provider. Come deployer: obblighi trasparenza Art. 50.",
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    name: "GPT-4.1",
    modelId: "gpt-4.1",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^24",
    knownCapabilities: ["text generation", "code", "long context", "instruction following"],
    transparencyPageUrl: "https://openai.com/policies/usage-policies",
    euBasedProvider: false,
    notes: "Ottimizzato per coding e instruction following con contesto 1M token.",
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    name: "GPT-4.1 mini",
    modelId: "gpt-4.1-mini",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^23",
    knownCapabilities: ["text generation", "code", "function calling"],
    transparencyPageUrl: "https://openai.com/policies/usage-policies",
    euBasedProvider: false,
    notes: "Variante veloce ed economica di GPT-4.1.",
  },
  // ── Anthropic ────────────────────────────────────────────────────────────
  {
    id: "claude-opus-4-7",
    provider: "anthropic",
    name: "Claude Opus 4.7",
    modelId: "claude-opus-4-7",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^25",
    knownCapabilities: ["reasoning", "code", "vision", "extended thinking", "tool use", "1M context"],
    transparencyPageUrl: "https://www.anthropic.com/policies/usage",
    euBasedProvider: false,
    notes: "Modello flagship Anthropic — hybrid reasoning, 87.6% SWE-bench, 3.75MP vision. Rischio sistemico.",
  },
  {
    id: "claude-opus-4-5",
    provider: "anthropic",
    name: "Claude Opus 4.5",
    modelId: "claude-opus-4-5",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^25",
    knownCapabilities: ["reasoning", "code", "vision", "extended thinking", "200K context"],
    transparencyPageUrl: "https://www.anthropic.com/policies/usage",
    euBasedProvider: false,
    notes: "Extended thinking abilitato — analisi complesse e ragionamento profondo.",
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    name: "Claude Sonnet 4.6",
    modelId: "claude-sonnet-4-6",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^24",
    knownCapabilities: ["text generation", "code", "vision", "reasoning", "function calling"],
    transparencyPageUrl: "https://www.anthropic.com/policies/usage",
    euBasedProvider: false,
    notes: "Bilanciamento ottimale performance/costo — modello più usato in produzione.",
  },
  {
    id: "claude-haiku-4",
    provider: "anthropic",
    name: "Claude Haiku 4",
    modelId: "claude-haiku-4",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^23",
    knownCapabilities: ["text generation", "code", "fast responses"],
    transparencyPageUrl: "https://www.anthropic.com/policies/usage",
    euBasedProvider: false,
    notes: "GPAI standard — ottimizzato per latenza e costo.",
  },
  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: "gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    modelId: "gemini-2.5-pro",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^25",
    knownCapabilities: ["reasoning", "code", "vision", "audio", "long context", "native audio output"],
    transparencyPageUrl: "https://policies.google.com/terms/generative-ai",
    euBasedProvider: false,
    notes: "#1 WebDev Arena, top USAMO math — deep thinking mode disponibile. Rischio sistemico.",
  },
  {
    id: "gemini-2.5-flash",
    provider: "google",
    name: "Gemini 2.5 Flash",
    modelId: "gemini-2.5-flash",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^23",
    knownCapabilities: ["text generation", "code", "vision", "multimodal"],
    transparencyPageUrl: "https://policies.google.com/terms/generative-ai",
    euBasedProvider: false,
    notes: "Versione rapida e cost-effective di Gemini 2.5.",
  },
  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    id: "pixtral-large",
    provider: "mistral",
    name: "Pixtral Large",
    modelId: "pixtral-large-2502",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^24",
    knownCapabilities: ["text generation", "vision", "code", "long context", "multimodal"],
    transparencyPageUrl: "https://mistral.ai/terms",
    euBasedProvider: true,
    notes: "124B parametri, multimodale frontier — 30 immagini ad alta risoluzione, 128K context. Provider EU (Francia).",
  },
  {
    id: "mistral-large-2",
    provider: "mistral",
    name: "Mistral Large 2",
    modelId: "mistral-large-2407",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^24",
    knownCapabilities: ["text generation", "code", "reasoning", "multilingual"],
    transparencyPageUrl: "https://mistral.ai/terms",
    euBasedProvider: true,
    notes: "Modello testuale di punta Mistral — provider EU (Francia), conformità facilitata.",
  },
  // ── Meta ─────────────────────────────────────────────────────────────────
  {
    id: "llama-4-behemoth",
    provider: "meta",
    name: "Llama 4 Behemoth",
    modelId: "llama-4-behemoth",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^26",
    knownCapabilities: ["reasoning", "code", "vision", "multimodal", "teacher model"],
    transparencyPageUrl: "https://llama.meta.com/llama4/use-policy",
    euBasedProvider: false,
    notes: "2T parametri totali, 288B attivi — modello teacher per distillazione. Open weight con obblighi GPAI se fine-tuned.",
  },
  {
    id: "llama-4-maverick",
    provider: "meta",
    name: "Llama 4 Maverick",
    modelId: "llama-4-maverick",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^24",
    knownCapabilities: ["text generation", "code", "reasoning", "multimodal"],
    transparencyPageUrl: "https://llama.meta.com/llama4/use-policy",
    euBasedProvider: false,
    notes: "17B parametri attivi, 128 esperti MoE — performance paragonabile a GPT-4o. Open weight.",
  },
  {
    id: "llama-4-scout",
    provider: "meta",
    name: "Llama 4 Scout",
    modelId: "llama-4-scout",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^23",
    knownCapabilities: ["text generation", "code", "long context", "on-device"],
    transparencyPageUrl: "https://llama.meta.com/llama4/use-policy",
    euBasedProvider: false,
    notes: "17B attivi, 10M context — gira su singolo H100. Ideale per deployment on-premise.",
  },
  // ── Cohere ────────────────────────────────────────────────────────────────
  {
    id: "command-a",
    provider: "cohere",
    name: "Command A",
    modelId: "command-a-03-2025",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^23",
    knownCapabilities: ["text generation", "RAG", "enterprise", "tool use"],
    transparencyPageUrl: "https://cohere.com/terms-of-use",
    euBasedProvider: false,
    notes: "Modello enterprise ottimizzato per RAG e task aziendali complessi (mar 2025).",
  },
  // ── xAI ──────────────────────────────────────────────────────────────────
  {
    id: "grok-3",
    provider: "xai",
    name: "Grok 3",
    modelId: "grok-3",
    systemicRisk: "systemic",
    estimatedFLOPs: "> 10^25",
    knownCapabilities: ["reasoning", "code", "vision", "real-time web search"],
    transparencyPageUrl: "https://docs.x.ai/docs",
    euBasedProvider: false,
    notes: "Addestrato su cluster 200K GPU — reasoning avanzato, accesso web real-time.",
  },
  {
    id: "grok-4-1",
    provider: "xai",
    name: "Grok 4.1",
    modelId: "grok-4-1",
    systemicRisk: "standard",
    estimatedFLOPs: "~10^24",
    knownCapabilities: ["reasoning", "code", "multimodal", "reduced hallucinations"],
    transparencyPageUrl: "https://docs.x.ai/docs",
    euBasedProvider: false,
    notes: "Migliorato su riduzione allucinazioni e ragionamento multimodale.",
  },
  // ── Custom ────────────────────────────────────────────────────────────────
  {
    id: "custom",
    provider: "custom",
    name: "Modello custom / fine-tuned",
    modelId: "custom",
    systemicRisk: "unknown",
    estimatedFLOPs: "unknown",
    knownCapabilities: [],
    transparencyPageUrl: "",
    euBasedProvider: false,
    notes: "Richiede valutazione manuale FLOPs e capacità per classificazione GPAI.",
  },
];

// ─── RUOLI GPAI ───────────────────────────────────────────────────────────────

export type GPAIRole =
  | "provider"
  | "downstream_provider"
  | "deployer"
  | "fine_tuner";

export interface GPAIUsageEntry {
  id: string;
  modelId: string;
  customModelName?: string;
  role: GPAIRole;
  useCases: string[];
  integratedInSystem: string;
  exposedToEndUsers: boolean;
  endUserCount: string;
  isFineTuned: boolean;
  fineTuningDataset?: string;
  addedAt: string;
}

// ─── OBBLIGHI ─────────────────────────────────────────────────────────────────

export interface GPAIObligation {
  id: string;
  article: string;
  title: string;
  description: string;
  applicableTo: GPAIRole[];
  applicableToSystemicOnly: boolean;
  deadline: string;
  actionRequired: string;
  documentNeeded: string | null;
}

export const GPAI_OBLIGATIONS: GPAIObligation[] = [
  {
    id: "ob-52-techdoc",
    article: "Art. 52.1",
    title: "Documentazione tecnica del modello GPAI",
    description: "Il provider deve redigere e mantenere aggiornata la documentazione tecnica del modello GPAI, inclusa architettura, dati di training, valutazioni delle prestazioni.",
    applicableTo: ["provider", "fine_tuner"],
    applicableToSystemicOnly: false,
    deadline: "2 agosto 2025",
    actionRequired: "Redigi documentazione tecnica conforme all'Allegato XI dell'AI Act.",
    documentNeeded: "Documentazione tecnica GPAI (Allegato XI)",
  },
  {
    id: "ob-52-copyright",
    article: "Art. 52.1.c",
    title: "Policy rispetto del copyright dati di training",
    description: "Il provider deve implementare e rendere pubblica una policy per il rispetto della legge sul diritto d'autore dei dati usati nel training.",
    applicableTo: ["provider", "fine_tuner"],
    applicableToSystemicOnly: false,
    deadline: "2 agosto 2025",
    actionRequired: "Pubblica una copyright compliance policy per i dati di training.",
    documentNeeded: "Copyright Policy Training Data",
  },
  {
    id: "ob-52-summary",
    article: "Art. 52.1.d",
    title: "Sommario pubblico dati di training",
    description: "Il provider deve pubblicare un sommario sufficientemente dettagliato dei dati usati per il training del modello GPAI.",
    applicableTo: ["provider"],
    applicableToSystemicOnly: false,
    deadline: "2 agosto 2025",
    actionRequired: "Pubblica sommario dei dati di training sul sito/registro pubblico.",
    documentNeeded: "Training Data Summary (pubblico)",
  },
  {
    id: "ob-50-transparency",
    article: "Art. 50.2",
    title: "Marcatura contenuti generati da AI",
    description: "I deployer di sistemi AI che generano contenuti sintetici devono informare gli utenti che il contenuto è generato da AI.",
    applicableTo: ["downstream_provider", "deployer"],
    applicableToSystemicOnly: false,
    deadline: "2 agosto 2025",
    actionRequired: "Aggiungi informativa 'contenuto generato da AI' in tutti i touchpoint con gli utenti finali.",
    documentNeeded: "Informativa trasparenza AI per utenti finali",
  },
  {
    id: "ob-53-downstream",
    article: "Art. 53",
    title: "Informazioni ai downstream provider",
    description: "Il provider GPAI deve mettere a disposizione dei downstream provider tutte le informazioni necessarie per il rispetto dei loro obblighi AI Act.",
    applicableTo: ["provider"],
    applicableToSystemicOnly: false,
    deadline: "2 agosto 2025",
    actionRequired: "Verifica che il provider del modello che usi fornisca documentazione adeguata per la tua compliance.",
    documentNeeded: null,
  },
  {
    id: "ob-54-evaluation",
    article: "Art. 54.1.a",
    title: "Valutazione del modello e red-teaming",
    description: "I provider di GPAI con rischio sistemico devono condurre valutazioni del modello incluso adversarial testing prima del rilascio e periodicamente.",
    applicableTo: ["provider", "fine_tuner"],
    applicableToSystemicOnly: true,
    deadline: "2 agosto 2025",
    actionRequired: "Conduci e documenta sessioni di red-teaming sul modello.",
    documentNeeded: "Report Red-Teaming e Adversarial Testing",
  },
  {
    id: "ob-54-incident",
    article: "Art. 54.1.c",
    title: "Segnalazione incidenti gravi all'AI Office UE",
    description: "I provider di GPAI con rischio sistemico devono segnalare all'AI Office UE gli incidenti gravi e le misure correttive adottate.",
    applicableTo: ["provider"],
    applicableToSystemicOnly: true,
    deadline: "2 agosto 2025",
    actionRequired: "Implementa processo di incident reporting verso l'AI Office UE.",
    documentNeeded: "Incident Report AI Office UE",
  },
  {
    id: "ob-54-cybersecurity",
    article: "Art. 54.1.d",
    title: "Protezione cybersecurity del modello",
    description: "I provider di GPAI con rischio sistemico devono garantire adeguato livello di protezione cybersecurity del modello e dell'infrastruttura.",
    applicableTo: ["provider", "fine_tuner"],
    applicableToSystemicOnly: true,
    deadline: "2 agosto 2025",
    actionRequired: "Documenta le misure di cybersecurity per il modello.",
    documentNeeded: "Cybersecurity Assessment GPAI",
  },
  {
    id: "ob-register",
    article: "Art. 49 / Art. 71",
    title: "Registrazione nella banca dati UE",
    description: "I provider di GPAI con rischio sistemico devono registrare il modello nella banca dati UE dei sistemi AI ad alto rischio.",
    applicableTo: ["provider"],
    applicableToSystemicOnly: true,
    deadline: "2 agosto 2025",
    actionRequired: "Registra il modello nella EU AI Act Database.",
    documentNeeded: "Registrazione EU AI Database",
  },
];

// ─── GENERATORI DOCUMENTI ─────────────────────────────────────────────────────

export function generateTransparencyNotice(
  entry: GPAIUsageEntry,
  model: GPAIModel,
  companyName: string
): string {
  const date = new Date().toLocaleDateString("it-IT");
  return `INFORMATIVA SULL'USO DELL'INTELLIGENZA ARTIFICIALE
${companyName} — ${date}

Questo servizio utilizza sistemi di intelligenza artificiale generativa per [descrivere funzionalità].

SISTEMA AI UTILIZZATO
Il sistema si avvale del modello ${model.name} sviluppato da ${model.provider.toUpperCase()}.
Tipo di sistema: General Purpose AI (GPAI) ai sensi dell'Art. 3(63) Reg. UE 2024/1689.
${model.systemicRisk === "systemic" ? "⚠️ Questo modello è classificato a rischio sistemico." : ""}

COSA QUESTO SIGNIFICA PER TE
- I contenuti generati sono prodotti da un sistema AI e potrebbero contenere imprecisioni.
- Le risposte non costituiscono parere professionale (legale, medico, finanziario).
- Un operatore umano supervisiona il sistema e può essere contattato per qualsiasi richiesta.

UTILIZZO DEI DATI
I tuoi input potrebbero essere elaborati dal provider del modello (${model.provider}) secondo
la sua privacy policy: ${model.transparencyPageUrl}
${companyName} non utilizza i tuoi dati per addestrare modelli AI senza tuo esplicito consenso.

DIRITTI DELL'UTENTE
Ai sensi del Reg. UE 2024/1689 e del GDPR, hai diritto a:
- Sapere quando stai interagendo con un sistema AI
- Richiedere revisione umana delle decisioni significative
- Opporti all'uso di dati personali per profilazione automatizzata

CONTATTO
Per domande sull'uso dell'AI: [email compliance] | [nome responsabile AI]

Generato da AIComply — conforme Art. 50 Reg. UE 2024/1689`;
}

export function generateCopyrightPolicy(
  entry: GPAIUsageEntry,
  model: GPAIModel,
  companyName: string
): string {
  return `POLICY SUL DIRITTO D'AUTORE — DATI DI TRAINING
${companyName} | Versione 1.0 | ${new Date().toLocaleDateString("it-IT")}
Riferimento normativo: Art. 52.1.c Reg. UE 2024/1689

1. AMBITO
La presente policy si applica all'utilizzo del modello ${model.name} (${model.provider})
${entry.isFineTuned ? "e al processo di fine-tuning condotto da " + companyName : "come servizio esterno"}.

2. UTILIZZO DI MODELLI DI TERZI
${companyName} utilizza il modello ${model.name} tramite API fornita da ${model.provider}.
La responsabilità per la conformità al diritto d'autore dei dati di pre-training
è in capo a ${model.provider} ai sensi dell'Art. 52 AI Act.
Documentazione disponibile: ${model.transparencyPageUrl}

${entry.isFineTuned ? `3. FINE-TUNING
${companyName} ha condotto operazioni di fine-tuning usando il dataset: ${entry.fineTuningDataset ?? "[specificare]"}
I dati utilizzati per il fine-tuning sono stati acquisiti nel rispetto delle seguenti condizioni:
- Verifica delle licenze di ogni dataset utilizzato
- Esclusione di dati protetti da copyright senza licenza appropriata
- Documentazione delle fonti e delle licenze applicabili` : ""}

4. GENERAZIONE DI OUTPUT
I contenuti generati dal sistema AI potrebbero incorporare elementi dei dati di training.
${companyName} adotta le seguenti misure per gestire questo rischio:
- Revisione umana degli output ad alto impatto prima della pubblicazione
- Divieto di riproduzione integrale di output senza verifica di originalità
- Processo di segnalazione per possibili violazioni del copyright negli output

5. RECLAMI E CONTATTI
Per segnalare presunte violazioni del diritto d'autore: [email legale]
Responsabile: [nome e ruolo]

Generato da AIComply — Art. 52.1.c Reg. UE 2024/1689`;
}

export function generateIncidentReport(
  description: string,
  severity: "critica" | "alta" | "media",
  systemName: string,
  companyName: string
): string {
  const date = new Date().toLocaleDateString("it-IT");
  return `A: ai-office@ec.europa.eu
Oggetto: [NOTIFICA ART. 54 AI ACT] Incidente grave — ${companyName} — ${date}

Gentile AI Office,

Con la presente notifichiamo un incidente grave ai sensi dell'Art. 54.1.c del Reg. UE 2024/1689.

IDENTIFICAZIONE NOTIFICANTE
Organizzazione: ${companyName}
Data notifica: ${date}
Contatto: [nome e email responsabile]

DESCRIZIONE INCIDENTE
Sistema coinvolto: ${systemName}
Gravità: ${severity.toUpperCase()}
Data/ora rilevamento: ${new Date().toISOString()}

${description}

MISURE CORRETTIVE ADOTTATE
[Descrivere le misure già adottate o in corso di adozione]

IMPATTO POTENZIALE
[Descrivere l'impatto stimato su utenti e terzi]

Distinti saluti,
${companyName}

---
Notifica generata da AIComply — Reg. UE 2024/1689 Art. 54.1.c`;
}

// ─── STORAGE & UTILS ─────────────────────────────────────────────────────────

export const GPAI_STORAGE_KEYS = {
  inventory: "aicomply_gpai_inventory",
  obligations: "aicomply_gpai_obligations_status",
} as const;

export function loadGPAIInventory(): GPAIUsageEntry[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(GPAI_STORAGE_KEYS.inventory) || "[]");
  } catch { return []; }
}

export function saveGPAIInventory(entries: GPAIUsageEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GPAI_STORAGE_KEYS.inventory, JSON.stringify(entries));
}

export function loadCompletedObligations(): string[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(GPAI_STORAGE_KEYS.obligations) || "[]");
  } catch { return []; }
}

export function saveCompletedObligations(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GPAI_STORAGE_KEYS.obligations, JSON.stringify(ids));
}

export function getApplicableObligations(entries: GPAIUsageEntry[]): GPAIObligation[] {
  const roles = new Set(entries.map((e) => e.role));
  const hasSystemic = entries.some((e) => {
    const model = GPAI_CATALOG.find((m) => m.id === e.modelId);
    return model?.systemicRisk === "systemic";
  });

  return GPAI_OBLIGATIONS.filter((ob) => {
    const roleMatch = ob.applicableTo.some((r) => roles.has(r));
    const systemicMatch = !ob.applicableToSystemicOnly || hasSystemic;
    return roleMatch && systemicMatch;
  });
}

export function getComplianceScore(obligations: GPAIObligation[], completedIds: string[]): number {
  if (obligations.length === 0) return 100;
  return Math.round(
    (completedIds.filter((id) => obligations.some((o) => o.id === id)).length / obligations.length) * 100
  );
}

export const USE_CASE_SUGGESTIONS = [
  "Customer support", "Document summarization", "Code generation",
  "Content creation", "Data extraction", "Translation",
  "HR screening", "Legal analysis", "Medical triage", "Fraud detection",
];

export const ROLE_DESCRIPTIONS: Record<GPAIRole, string> = {
  deployer: "Usi il sistema AI (già integrato da altri) nel tuo contesto aziendale. Obblighi principali: trasparenza Art. 50, supervisione umana Art. 14.",
  downstream_provider: "Integri il modello GPAI in un sistema AI che distribuisci ad altri. Obblighi: trasparenza Art. 50, verifica doc provider Art. 53.",
  fine_tuner: "Hai modificato o addestrato ulteriormente un modello GPAI. Obblighi aggiuntivi: doc tecnica Art. 52, copyright policy Art. 52.1.c.",
  provider: "Sviluppi e distribuisci direttamente il modello GPAI. Obblighi completi Art. 52-54, inclusi red-teaming e incident reporting.",
};
