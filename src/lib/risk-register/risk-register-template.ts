/**
 * risk-register-template.ts
 * Domande guidate per il Risk Register — Art. 9 AI Act.
 * Struttura: GuidedQ con ref badge + ESEMPI + starters.
 * La fase "scoping" è la principale (identificazione rischi).
 *
 * FONTE: Registro_Rischi_Template_AI_Act_Art9.docx + EU AI Act Art. 9.
 */

import type { GuidedQ } from "@/lib/guided/guided-types";

export const RISK_SCOPING_QUESTIONS: GuidedQ[] = [
  {
    id: "r_risk_description",
    ref: "AI Act Art. 9(2)(a)",
    question: "Descrivi il rischio principale identificato per il sistema AI (salute, sicurezza, diritti fondamentali).",
    mapsTo: "description",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Alto —", text: "Rischio di discriminazione basata su genere nell'algoritmo di selezione del personale — il modello penalizza sistematicamente i CV con nomi femminili nelle fasi di screening iniziale." },
      { label: "Alto —", text: "Rischio di errori diagnostici critici: il sistema AI di supporto alla diagnosi medica genera falsi negativi nel 7% dei casi per pazienti con pelle scura, con potenziale danno fisico diretto." },
      { label: "Medio —", text: "Rischio di violazione della privacy: il sistema raccoglie e analizza dati comportamentali degli utenti senza consenso esplicito per le finalità di personalizzazione." },
      { label: "Basso —", text: "Rischio di dipendenza eccessiva: gli operatori tendono ad accettare acriticamente le raccomandazioni AI senza verifica umana adeguata, riducendo la supervisione effettiva." },
    ],
  },
  {
    id: "r_risk_category",
    ref: "AI Act Art. 9(2)(b) / Allegato III",
    question: "In quale categoria di rischio rientra (salute, sicurezza, diritti fondamentali, altro)?",
    mapsTo: "category",
    answerType: "choices",
    choices: ["Salute e sicurezza fisica", "Diritti fondamentali", "Privacy e dati personali", "Discriminazione", "Autonomia e supervisione umana", "Altro"],
    required: true,
    examples: [
      { label: "Diritti fondamentali —", text: "Il rischio rientra nell'area dei diritti fondamentali (non discriminazione, Art. 21 Carta UE) in quanto il sistema può determinare accesso a servizi pubblici essenziali." },
      { label: "Salute —", text: "Il rischio rientra nell'area della salute e sicurezza fisica in quanto il sistema AI è impiegato in ambito medico-diagnostico con effetti diretti sulle cure dei pazienti." },
    ],
  },
  {
    id: "r_likelihood",
    ref: "AI Act Art. 9(2) / ISO 31000",
    question: "Qual è la probabilità di materializzazione del rischio (alta/media/bassa)?",
    mapsTo: "probability",
    answerType: "choices",
    choices: ["Alta", "Media", "Bassa"],
    required: true,
    examples: [
      { label: "Alta —", text: "Alta probabilità: il bias è già stato osservato nei test pre-deployment su dataset storici; il rischio è attivo dal primo utilizzo in produzione." },
      { label: "Media —", text: "Media probabilità: il rischio potrebbe manifestarsi in condizioni specifiche (es. dati fuori distribuzione, utenti edge case) — stima 30–60% in 12 mesi." },
      { label: "Bassa —", text: "Bassa probabilità: il rischio è teoricamente possibile ma le misure di controllo attive lo rendono molto improbabile (< 10% su orizzonte annuale)." },
    ],
  },
  {
    id: "r_severity",
    ref: "AI Act Art. 9(4) / WP248",
    question: "Qual è la gravità dell'impatto se il rischio si materializza?",
    mapsTo: "severity",
    answerType: "choices",
    choices: ["Alta", "Media", "Bassa"],
    required: true,
    examples: [
      { label: "Alta —", text: "Alta gravità: l'impatto è irreversibile o difficilmente reversibile (danno fisico permanente, esclusione da servizi essenziali, violazione massiva di dati personali)." },
      { label: "Media —", text: "Media gravità: l'impatto è significativo ma recuperabile (disservizi temporanei, danni economici limitati, errori correggibili con revisione umana)." },
      { label: "Bassa —", text: "Bassa gravità: l'impatto è minimo e facilmente rimediabile (piccole imprecisioni nelle raccomandazioni, disagi marginali per gli utenti)." },
    ],
  },
  {
    id: "r_mitigation",
    ref: "AI Act Art. 9(4) / Art. 14",
    question: "Descrivi le misure di mitigazione previste o già implementate.",
    mapsTo: "mitigation",
    answerType: "free_text",
    required: true,
    examples: [
      { label: "Esempio —", text: "Implementazione di un audit di equità mensile con metriche di disparate impact ratio; introduzione di revisione umana obbligatoria per tutte le decisioni ad alto impatto; formazione specifica del team HR sui bias algoritmici." },
      { label: "Esempio —", text: "Randomizzazione dei nomi nei CV prima dell'elaborazione AI (name-blind screening); test continuativo su dataset diversificati; feedback loop con gli interessati per segnalazioni di discriminazione." },
      { label: "Esempio —", text: "Soglie di confidenza elevate (>95%) per le raccomandazioni AI; richiesta di doppia verifica umana per casi ad alta incertezza; log audit di tutte le decisioni con conservazione 5 anni." },
    ],
  },
  {
    id: "r_residual",
    ref: "AI Act Art. 9(4) / GDPR Art. 35(7)(d)",
    question: "Qual è il rischio residuo dopo l'applicazione delle misure di mitigazione?",
    mapsTo: "residual",
    answerType: "choices",
    choices: ["Accettabile", "Da rivedere", "Non accettabile"],
    required: true,
    examples: [
      { label: "Accettabile —", text: "Rischio residuo accettabile: le misure riducono il rischio al di sotto della soglia di tolleranza definita dalla policy aziendale. Nessuna azione urgente richiesta." },
      { label: "Da rivedere —", text: "Rischio residuo da rivedere: le misure attenuano parzialmente il rischio ma non sufficientemente. Richiesta revisione del piano di mitigazione entro 90 giorni." },
      { label: "Non accettabile —", text: "Rischio residuo non accettabile: le misure non riducono il rischio a livelli tollerabili. Sospendere l'uso del sistema in attesa di soluzioni strutturali." },
    ],
  },
];

export const RISK_PHASE_GUIDES: Record<string, {
  goal: string;
  ref: string;
  examples: { label: string; text: string }[];
  starters: string[];
}> = {
  scoping: {
    goal: "Identificare e descrivere tutti i rischi rilevanti per salute, sicurezza e diritti fondamentali delle persone interessate.",
    ref: "AI Act Art. 9(2)(a)–(b)",
    examples: [
      { label: "Bias algoritmo selezione HR", text: "Rischio di discriminazione per genere nell'algoritmo di selezione CV — penalizzazione sistematica di nomi femminili nel ranking iniziale." },
      { label: "Errori diagnostica AI", text: "Rischio di falsi negativi nel sistema di supporto alla diagnosi medica per sottogruppi demografici sottorappresentati nel training data." },
      { label: "Violazione privacy", text: "Raccolta dati comportamentali senza consenso esplicito per finalità di personalizzazione non dichiarate nell'informativa." },
    ],
    starters: [
      "Il sistema potrebbe discriminare gruppi vulnerabili perché…",
      "L'impatto sulla salute/sicurezza si manifesta quando…",
      "Il rischio per la privacy deriva da…",
    ],
  },
  quantitative: {
    goal: "Stimare quantitativamente la distribuzione delle perdite attese con simulazione Monte Carlo.",
    ref: "AI Act Art. 9(4) / ISO 42001 §6.1",
    examples: [
      { label: "Stima perdita attesa", text: "Valore atteso della perdita (EL): €150k con deviazione standard €80k. Il 95° percentile della perdita è €320k." },
    ],
    starters: [
      "Il numero di simulazioni ottimale per questo rischio è…",
      "La distribuzione della perdita attesa è…",
    ],
  },
  temporal: {
    goal: "Tracciare l'evoluzione del rischio nel tempo con audit bitemporale (transaction time + valid time).",
    ref: "AI Act Art. 9(5) / Art. 72",
    examples: [
      { label: "Record temporale", text: "Il rischio di drift del modello è aumentato del 15% nell'ultimo trimestre — rilevato variazione PSI > 0.2 su feature 'età' e 'reddito'." },
    ],
    starters: [
      "Il rischio è cambiato nel periodo dall'ultima valutazione perché…",
    ],
  },
  drift: {
    goal: "Rilevare scostamenti statistici del modello rispetto alla distribuzione di training (concept/data drift).",
    ref: "AI Act Art. 9(1)(b) — monitoraggio post-market",
    examples: [
      { label: "Drift rilevato", text: "PSI > 0.25 sulla feature 'nazionalità_richiedente' — il comportamento del modello è cambiato significativamente rispetto alla baseline iniziale." },
    ],
    starters: [
      "Il drift è stato rilevato sulla feature X perché…",
    ],
  },
  gpai: {
    goal: "Valutare i rischi sistemici per modelli GPAI ad alto impatto (>10^25 FLOPs di training).",
    ref: "AI Act Art. 51–55 (rischio sistemico GPAI)",
    examples: [
      { label: "Rischio sistemico", text: "Il modello GPAI presenta rischio sistemico per capacità di generazione di deepfake ad alta qualità — potenziale impatto su ecosistema informativo a scala nazionale." },
    ],
    starters: [
      "Il rischio sistemico del GPAI consiste in…",
    ],
  },
  sanctions: {
    goal: "Documentare l'analisi delle sanzioni applicabili e le misure di governance per la prevenzione.",
    ref: "AI Act Art. 99–101",
    examples: [
      { label: "Sanzione applicabile", text: "Violazione Art. 9: sanzione fino al 3% fatturato mondiale o €15M. Rischio concreto per assenza di sistema di gestione rischi formale." },
    ],
    starters: [
      "La sanzione più rilevante per questo sistema è…",
    ],
  },
  output: {
    goal: "Finalizzare il report di rischio con rating complessivo, piano d'azione e firma del responsabile.",
    ref: "AI Act Art. 9(9)",
    examples: [
      { label: "Conclusione report", text: "Il sistema AI presenta un rischio residuo MEDIO — accettabile con le misure attive. Piano di revisione: trimestrale. Approvato da: Risk Manager, data 2025-06-30." },
    ],
    starters: [
      "Il rating complessivo del rischio è… perché…",
    ],
  },
};
