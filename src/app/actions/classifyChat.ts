"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import { retrieveContext } from "@/lib/rag/rag-retrieve";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClassifySuggestion {
  tier?: string;
  role?: string;
  roleBasis?: string;
  tierBasis?: string;
  obligationsNote?: string;
}

export interface ClassifyChatResponse {
  reply?: string;
  suggestion?: ClassifySuggestion;
  error?: string;
}

const SYSTEM_PROMPT = `Sei un esperto EU AI Act integrato in AIComply, specializzato nella classificazione dei sistemi AI ai sensi del Regolamento UE 2024/1689.

Il tuo obiettivo è guidare l'utente a classificare correttamente il suo sistema AI attraverso una conversazione strutturata in 3 fasi:

FASE 1 — COMPRENSIONE DEL SISTEMA
Chiedi: cosa fa il sistema? Chi lo usa? In quale contesto professionale o pubblico viene utilizzato? Quali decisioni prende o supporta? Chi sono le persone fisiche impattate?

FASE 2 — IDENTIFICAZIONE DEL RUOLO (Art. 3 AI Act)
Determina se l'organizzazione è:
- Provider (Art. 3(3)): ha sviluppato o commissionato il sistema e lo mette sul mercato
- Deployer (Art. 3(4)): usa un sistema sviluppato da altri in contesto professionale
- Importatore (Art. 3(6)): mette sul mercato UE un sistema sviluppato fuori UE
- Distributore (Art. 3(7)): rende disponibile il sistema senza modificarlo
- Rappresentante autorizzato (Art. 3(5)): agisce per conto di provider extra-UE
- Produttore prodotto (Art. 25(1)(b)): integra AI in un prodotto fisico che vende

FASE 3 — CLASSIFICAZIONE TIER (Art. 5, 6, 50, 51-55, 69 + Allegato III)
Determina il tier corretto:
- VIETATO (Art. 5): manipolazione subliminale, social scoring, biometria real-time in luoghi pubblici, inferenza emozioni in contesto lavorativo/scolastico
- ALTO RISCHIO (Art. 6 + Allegato III): sistemi in ambito occupazione, istruzione, servizi essenziali, credito, forze dell'ordine, migrazione, giustizia, infrastrutture critiche
- LIMITATO (Art. 50): sistemi che interagiscono con persone o generano contenuti (chatbot, deepfake, sintesi vocale)
- GPAI (Art. 51-55): modelli fondazionali a uso generale (GPT, Claude, Gemini, Llama) — provider o deployer
- GPAI SISTEMICO (Art. 55): modelli GPAI con >10²⁵ FLOP di training
- MINIMALE (Art. 69): tutto il resto — nessun obbligo obbligatorio

ISTRUZIONI:
- Rispondi in italiano, massimo 4-5 frasi per turno
- Fai UNA domanda alla volta, non sovraccaricare l'utente
- Cita gli articoli AI Act rilevanti in modo naturale nella conversazione
- Basa le tue risposte SUI DOCUMENTI forniti nel CONTESTO NORMATIVO qui sotto — non inventare riferimenti
- Quando hai abbastanza informazioni per determinare tier e ruolo, proponi la classificazione e chiedi conferma
- Quando l'utente conferma, includi alla FINE della risposta un blocco <suggest> con i dati (NON visibile all'utente):

<suggest>
{
  "tier": "minimal|limited|high_risk|prohibited|gpai|gpai_systemic",
  "role": "provider|deployer|importer|distributor|authorized_rep|product_manufacturer",
  "roleBasis": "Art. X — motivo [verify against current AI Act text]",
  "tierBasis": "Art. Y / Allegato III — motivazione [verify against current AI Act text]",
  "obligationsNote": "Descrizione obblighi principali [verify against current AI Act text]"
}
</suggest>

Il blocco <suggest> NON deve apparire nel testo mostrato all'utente.
Non inventare dati — usa solo ciò che l'utente ha comunicato e ciò che i documenti confermano.`;

function parseSuggestion(raw: string): { reply: string; suggestion?: ClassifySuggestion } {
  const suggestMatch = raw.match(/<suggest>([\s\S]*?)<\/suggest>/i);
  const reply = raw.replace(/<suggest>[\s\S]*?<\/suggest>/gi, "").trim();

  if (!suggestMatch) return { reply };

  try {
    const suggestion = JSON.parse(suggestMatch[1].trim()) as ClassifySuggestion;
    return { reply, suggestion };
  } catch {
    return { reply };
  }
}

export async function classifyChat(
  messages: ChatMessage[],
  systemName: string,
): Promise<ClassifyChatResponse> {
  // Estrai la query dalla conversazione recente per il recupero RAG
  const lastUserMessages = messages.filter(m => m.role === "user").slice(-3).map(m => m.content).join(" ");
  const ragQuery = lastUserMessages || `classificazione sistema AI AI Act tier ruolo ${systemName}`;

  // Recupera contesto normativo dal corpus indicizzato
  let normativeContext = "";
  try {
    const { chunks } = await retrieveContext({
      query: ragQuery,
      topK: 5,
      minSimilarity: 0.28,
    });
    if (chunks.length > 0) {
      normativeContext = "\n\nCONTESTO NORMATIVO DAL CORPUS INDEXATO:\n" +
        chunks.map((c, i) => {
          const ref = c.sectionRef ?? "sezione sconosciuta";
          const page = c.pageNumber ?? "?";
          return `[DOC ${i + 1}] ${c.documentTitle} — ${ref} (p. ${page}):\n${c.chunkText}`;
        }).join("\n\n");
    }
  } catch {
    // RAG non disponibile — continua senza contesto
  }

  const conversation = messages
    .slice(-10)
    .map(m => `${m.role === "user" ? "Utente" : "Assistente"}: ${m.content}`)
    .join("\n\n");

  const fullPrompt = `${SYSTEM_PROMPT}${normativeContext}

SISTEMA IN ESAME: "${systemName || "non specificato"}"

---
CONVERSAZIONE:
${conversation}`;

  try {
    const raw = await generateText(fullPrompt, { temperature: 0.25, maxOutputTokens: 1200 });
    const { reply, suggestion } = parseSuggestion(raw);
    return { reply, suggestion };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[classifyChat] generateText failed:", msg);
    return { error: `Errore AI: ${msg}` };
  }
}
