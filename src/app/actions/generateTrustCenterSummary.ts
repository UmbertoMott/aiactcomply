"use server";
import { generateText } from "@/lib/rag/rag-vertex";
import type { TrustCenterSectionId, TrustCenterSourceData } from "@/lib/trust-center/trust-center-types";

export interface TrustCenterSummaryResult {
  text: string;
  aiConfirmed: false;
  sourceComplete: boolean;
}

const TIER_LABELS: Record<string, string> = {
  high_risk:        "Sistema classificato ad alto rischio secondo l'Allegato III del Reg. (UE) 2024/1689",
  high_risk_annex3: "Sistema classificato ad alto rischio secondo l'Allegato III del Reg. (UE) 2024/1689",
  high_risk_annex1: "Sistema classificato ad alto rischio secondo l'Allegato I del Reg. (UE) 2024/1689",
  gpai:             "Sistema di IA per uso generale (GPAI) ai sensi del Reg. (UE) 2024/1689",
  gpai_systemic:    "Sistema di IA per uso generale con rischio sistemico ai sensi del Reg. (UE) 2024/1689",
  limited:          "Sistema AI a rischio limitato ai sensi del Reg. (UE) 2024/1689",
  minimal:          "Sistema AI a rischio minimo ai sensi del Reg. (UE) 2024/1689",
  prohibited:       "Sistema AI potenzialmente vietato — in fase di valutazione normativa",
  unclassified:     "Sistema AI — classificazione del rischio in corso",
};

const FREQ_LABELS: Record<string, string> = {
  continuous: "continuativa",
  monthly:    "mensile",
  quarterly:  "trimestrale",
  annual:     "annuale",
};

export async function generateTrustCenterSummary(
  sectionId: TrustCenterSectionId,
  sourceData: TrustCenterSourceData,
): Promise<TrustCenterSummaryResult> {
  const notComplete = (msg: string): TrustCenterSummaryResult => ({
    text: msg,
    aiConfirmed: false,
    sourceComplete: false,
  });

  switch (sectionId) {
    case "risk_tier": {
      const { riskTier, role, systemName, complete } = sourceData.risk_tier;
      if (!complete || !riskTier) {
        return notComplete("Dati non disponibili — completa la classificazione nel Triage o nell'AI Inventory per poter pubblicare questa sezione.");
      }
      const tierLabel = TIER_LABELS[riskTier] ?? `Sistema AI (livello: ${riskTier})`;
      const roleLabel = role === "provider" ? "sviluppato e commercializzato da questa organizzazione"
        : role === "deployer" ? "utilizzato da questa organizzazione"
        : role === "authorized_rep" ? "rappresentato da questa organizzazione come Authorized Representative"
        : "";
      const prompt = `Sei un esperto di conformità AI Act UE (Reg. 2024/1689). Scrivi 2-3 frasi chiare e non tecniche per comunicare la classificazione del rischio di un sistema AI a un pubblico esterno (clienti, partner, regolatori).

Dati:
- Nome sistema: ${systemName ?? "sistema AI"}
- Classificazione: ${tierLabel}
- Ruolo organizzazione: ${roleLabel || "non specificato"}

Istruzioni:
- Usa linguaggio comprensibile a non-esperti
- Non inventa informazioni non presenti nei dati forniti
- Ogni riferimento normativo termina con [verify against current AI Act text]
- Output: solo il testo della sezione, nessuna formattazione Markdown

Scrivi il testo della sezione "Classificazione del rischio" per il Trust Center:`;
      const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 256 });
      return { text: text.trim(), aiConfirmed: false, sourceComplete: true };
    }

    case "intended_use": {
      const { finalityDescription, applicativeScope, complete } = sourceData.intended_use;
      if (!complete || !finalityDescription) {
        return notComplete("Dati non disponibili — completa la sezione Annex IV §1-2 in DocuGen AI per poter pubblicare questa sezione.");
      }
      const prompt = `Sei un esperto di conformità AI Act UE. Scrivi 2-4 frasi per comunicare la finalità e l'ambito di utilizzo di un sistema AI a un pubblico esterno.

Finalità prevista (Annex IV §1): ${finalityDescription}
Ambito applicativo (Annex IV §2): ${applicativeScope ?? "non specificato"}

Istruzioni:
- Usa linguaggio chiaro e non tecnico
- Non inventa informazioni non presenti nei dati forniti
- Ogni riferimento normativo termina con [verify against current AI Act text]
- Output: solo il testo della sezione, nessuna formattazione Markdown

Scrivi il testo della sezione "Finalità e ambito di utilizzo previsto" per il Trust Center:`;
      const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 384 });
      return { text: text.trim(), aiConfirmed: false, sourceComplete: true };
    }

    case "oversight": {
      const { implementedMeasures, complete } = sourceData.oversight;
      if (!complete || implementedMeasures.length === 0) {
        return notComplete("Dati non disponibili — completa le misure di sorveglianza umana (a)-(e) nello strumento Oversight (Art. 14) per poter pubblicare questa sezione.");
      }
      const measuresList = implementedMeasures
        .map((m, i) => `${i + 1}. ${m.description}`)
        .join("\n");
      const prompt = `Sei un esperto di conformità AI Act UE. Scrivi 2-4 frasi per comunicare le misure di sorveglianza umana adottate per un sistema AI ad alto rischio.

Misure implementate (Art. 14 Reg. (UE) 2024/1689 [verify against current AI Act text]):
${measuresList}

Istruzioni:
- Sintetizza solo le misure effettivamente implementate — non aggiungere misure non elencate
- Usa linguaggio comprensibile a non-esperti
- Ogni riferimento normativo termina con [verify against current AI Act text]
- Output: solo il testo della sezione, nessuna formattazione Markdown

Scrivi il testo della sezione "Misure di sorveglianza umana" per il Trust Center:`;
      const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 384 });
      return { text: text.trim(), aiConfirmed: false, sourceComplete: true };
    }

    case "transparency": {
      const { activeDisclosures, complete } = sourceData.transparency;
      if (!complete || activeDisclosures.length === 0) {
        return notComplete("Dati non disponibili — attiva e conferma le disclosure richieste nell'Art. 50 Kit per poter pubblicare questa sezione.");
      }
      const discList = activeDisclosures.filter(Boolean).join(", ");
      const prompt = `Sei un esperto di conformità AI Act UE. Scrivi 2-3 frasi per comunicare le misure di trasparenza adottate per un sistema AI ai sensi dell'Art. 50 del Reg. (UE) 2024/1689.

Disclosure attive: ${discList}

Istruzioni:
- Elenca in modo chiaro le disclosure effettivamente attive — non inventa obblighi non listati
- Usa linguaggio comprensibile a non-esperti
- Ogni riferimento normativo termina con [verify against current AI Act text]
- Output: solo il testo della sezione, nessuna formattazione Markdown

Scrivi il testo della sezione "Informazioni di trasparenza" per il Trust Center:`;
      const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 256 });
      return { text: text.trim(), aiConfirmed: false, sourceComplete: true };
    }

    case "conformity": {
      const { declarationDrafted, declarationDate, ceMark, complete } = sourceData.conformity;
      if (!complete || !declarationDrafted) {
        return notComplete("Dati non disponibili — redigi la Dichiarazione di Conformità UE in DocuGen AI (Art. 47-48) per poter pubblicare questa sezione.");
      }
      const prompt = `Sei un esperto di conformità AI Act UE. Scrivi 2-3 frasi per comunicare lo stato della dichiarazione di conformità UE di un sistema AI.

Dati:
- Dichiarazione di Conformità UE redatta: ${declarationDrafted ? "Sì" : "No"}
- Data: ${declarationDate ?? "non specificata"}
- Marcatura CE: ${ceMark ? "apposta" : "non ancora apposta"}

Istruzioni:
- Ogni riferimento normativo termina con [verify against current AI Act text]
- Output: solo il testo della sezione, nessuna formattazione Markdown

Scrivi il testo della sezione "Stato della dichiarazione di conformità" per il Trust Center:`;
      const text = await generateText(prompt, { temperature: 0.15, maxOutputTokens: 256 });
      return { text: text.trim(), aiConfirmed: false, sourceComplete: true };
    }

    case "eudb": {
      const { registrationNumber, complete } = sourceData.eudb;
      if (!complete || !registrationNumber) {
        return notComplete("Dati non disponibili — completa la registrazione EUDB (Art. 49) per ottenere il numero di registrazione e poter pubblicare questa sezione.");
      }
      const text = `Il sistema AI è registrato nella banca dati europea dei sistemi AI ad alto rischio (EU AI Database) ai sensi dell'Art. 49 del Reg. (UE) 2024/1689 [verify against current AI Act text]. Numero di registrazione: ${registrationNumber}.`;
      return { text, aiConfirmed: false, sourceComplete: true };
    }

    case "post_market": {
      const { methodology, frequency, complete } = sourceData.post_market;
      if (!complete || !methodology) {
        return notComplete("Dati non disponibili — completa il Piano di Monitoraggio Post-Market (Art. 72) per poter pubblicare questa sezione.");
      }
      const freqLabel = FREQ_LABELS[frequency ?? ""] ?? frequency ?? "non specificata";
      const prompt = `Sei un esperto di conformità AI Act UE. Scrivi 2-3 frasi per comunicare l'impegno di monitoraggio post-market di un sistema AI ad alto rischio.

Dati:
- Metodologia di monitoraggio: ${methodology}
- Frequenza raccolta dati: ${freqLabel}

Istruzioni:
- Usa linguaggio comprensibile a non-esperti
- Ogni riferimento normativo termina con [verify against current AI Act text]
- Output: solo il testo della sezione, nessuna formattazione Markdown

Scrivi il testo della sezione "Impegno di monitoraggio post-market" per il Trust Center:`;
      const text = await generateText(prompt, { temperature: 0.2, maxOutputTokens: 256 });
      return { text: text.trim(), aiConfirmed: false, sourceComplete: true };
    }

    case "contact": {
      const { arName, arCountry, arContact, providerName, providerEmail, complete } = sourceData.contact;
      if (!complete) {
        return notComplete("Dati non disponibili — inserisci i dati dell'Authorized Representative (Art. 22) o il profilo dell'organizzazione per poter pubblicare questa sezione.");
      }
      const lines: string[] = [];
      if (arName) {
        lines.push(`Authorized Representative (Art. 22 Reg. (UE) 2024/1689 [verify against current AI Act text]): ${arName}${arCountry ? `, ${arCountry}` : ""}${arContact ? ` — ${arContact}` : ""}.`);
      }
      if (providerName || providerEmail) {
        lines.push(`Provider: ${providerName ?? ""}${providerEmail ? ` — ${providerEmail}` : ""}.`);
      }
      return {
        text: lines.join("\n"),
        aiConfirmed: false,
        sourceComplete: true,
      };
    }

    default:
      return notComplete("Sezione non riconosciuta.");
  }
}
