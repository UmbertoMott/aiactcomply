// src/lib/inventory/known-systems.ts
// Profili di partenza per sistemi AI enterprise noti.
// Tutti i valori sono bozze che richiedono conferma — mai classificazione definitiva.

export interface KnownSystemProfile {
  vendorName: string
  keywords: string[]    // parole chiave per match nella descrizione libera
  typicalRole: string
  typicalTier: string
  tierBasisHint: string
  obligationsHint: string
  warningNote?: string
}

export const KNOWN_SYSTEMS: KnownSystemProfile[] = [
  {
    vendorName: "Workday",
    keywords: ["workday", "ats", "screening cv", "recruiting workday"],
    typicalRole: "deployer",
    typicalTier: "high_risk",
    tierBasisHint: "Annex III(4)(a) — employment, recruitment/selection of natural persons [verify against current AI Act text]",
    obligationsHint: "Art. 26: human oversight, input data quality, monitoring, informing workers. Art. 27 FRIA if public body.",
    warningNote: "Verifica se il modulo usato fa decisioni automatizzate su candidati — distingue tra supporto decisionale e decisione automatica."
  },
  {
    vendorName: "HireVue",
    keywords: ["hirevue", "video interview", "ai interview"],
    typicalRole: "deployer",
    typicalTier: "high_risk",
    tierBasisHint: "Annex III(4)(a) — employment, recruitment, evaluation during selection [verify against current AI Act text]",
    obligationsHint: "Art. 26 obblighi deployer. Attenzione Art. 5(1)(f) — emotion recognition in contesto lavorativo.",
    warningNote: "⚠ Se il sistema analizza emozioni durante i colloqui, valutare Art. 5(1)(f) — potrebbe essere pratica vietata."
  },
  {
    vendorName: "GitHub Copilot",
    keywords: ["github copilot", "copilot", "github ai", "coding assistant"],
    typicalRole: "deployer",
    typicalTier: "minimal",
    tierBasisHint: "Assistente alla scrittura di codice — nessuna delle categorie Annex III, nessuna pratica Art. 5 [verify against current AI Act text]",
    obligationsHint: "Nessun obbligo specifico EU AI Act se usato come strumento di supporto senza decisioni automatizzate su persone.",
  },
  {
    vendorName: "Salesforce Einstein",
    keywords: ["salesforce", "einstein", "salesforce ai", "crm ai"],
    typicalRole: "deployer",
    typicalTier: "limited",
    tierBasisHint: "Dipende dal modulo: lead scoring = potenzialmente high-risk se decisioni su credito/assicurazione. CRM standard = limited/minimal [verify against current AI Act text]",
    obligationsHint: "Art. 50 trasparenza se interagisce con persone. Verificare modulo specifico per tier definitivo.",
    warningNote: "Tier dipende dal modulo: Sales Cloud ≠ Financial Services Cloud. Classificare per modulo specifico."
  },
  {
    vendorName: "Azure OpenAI / ChatGPT Enterprise",
    keywords: ["azure openai", "chatgpt enterprise", "openai api", "gpt-4", "gpt4"],
    typicalRole: "deployer",
    typicalTier: "gpai",
    tierBasisHint: "GPAI — modello general purpose con capacità generiche su ampio range di task. Art. 51 EU AI Act [verify against current AI Act text]",
    obligationsHint: "Come deployer di GPAI: Art. 26 obblighi deployer + Art. 50 trasparenza se interagisce con utenti finali.",
  },
  {
    vendorName: "SAP SuccessFactors",
    keywords: ["sap successfactors", "successfactors", "sap hr ai"],
    typicalRole: "deployer",
    typicalTier: "high_risk",
    tierBasisHint: "Annex III(4) — employment, worker management, task allocation if AI-driven [verify against current AI Act text]",
    obligationsHint: "Art. 26 deployer. Verificare quali moduli usano AI per decisioni su lavoratori.",
  },
  {
    vendorName: "Cohere / RAG interno",
    keywords: ["cohere", "rag", "retrieval augmented", "llm interno", "modello interno"],
    typicalRole: "provider",
    typicalTier: "unclassified",
    tierBasisHint: "Dipende dall'applicazione — classificare in base all'use case specifico, non al modello base [verify against current AI Act text]",
    obligationsHint: "Se sviluppato internamente: obblighi provider (Art. 16+). Tier determinato dall'applicazione, non dal modello.",
    warningNote: "Sistema sviluppato internamente = ruolo provider con obblighi Art. 16. Tier dipende dall'applicazione finale."
  },
  {
    vendorName: "Chatbot website / assistente virtuale",
    keywords: ["chatbot", "virtual assistant", "assistente virtuale", "bot", "livechat ai"],
    typicalRole: "deployer",
    typicalTier: "limited",
    tierBasisHint: "Art. 50(1) — sistema che interagisce con persone fisiche (chatbot) — obblighi trasparenza [verify against current AI Act text]",
    obligationsHint: "Art. 50: informare l'utente che sta interagendo con un sistema AI. Obbligo attivo dal 2 agosto 2026.",
  },
]

export function matchKnownSystem(description: string): KnownSystemProfile | null {
  const lower = description.toLowerCase()
  for (const profile of KNOWN_SYSTEMS) {
    if (profile.keywords.some(kw => lower.includes(kw))) {
      return profile
    }
  }
  return null
}
