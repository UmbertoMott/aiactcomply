/**
 * classify.ts
 *
 * Pipeline `classify(answers)` — albero decisionale esaustivo EU AI Act.
 * Passi 0–8 + asse GPAI parallelo. Nessun ramo esclusivo.
 *
 * Fonte: Regolamento (UE) 2024/1689 [verifica contro il testo vigente]
 *        Draft Guidelines Annex I, Annex III, General Principles [verifica]
 */

import {
  ART5_PRACTICES,
  ANNEX_III_AREAS,
  ART63_EXCEPTIONS,
  ANNEX_I_PRODUCTS,
  ARTICLE_OBLIGATIONS,
  type Art5Practice,
  type AnnexIIIArea,
  type Art63Exception,
  type ArticleObligation,
} from "./classifier-rules";

// ─── Tipi di input ─────────────────────────────────────────────────────────────

export type Role =
  | "provider"
  | "deployer"
  | "importer"
  | "distributor"
  | "authorized_rep"
  | "product_manufacturer"
  | "unknown";

export interface ClassifyAnswers {
  // Passo 0 — Ambito Art. 2
  scopeExclusions?: Array<"military" | "research_premarket" | "personal_nonprofessional" | "foss_no_high_risk">;

  // Passo 1 — È un sistema di IA? Art. 3(1)
  hasMLOrInference?: boolean;
  producesInfluentialOutput?: boolean;
  isPurelyDeterministic?: boolean;

  // Passo 2 — Art. 5 pratiche vietate
  /** ID delle fattispecie Art. 5 che l'utente ritiene applicabili */
  art5Flags?: Array<"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h">;
  /** Eccezioni applicate (per lettere d, f, g, h) */
  art5ExceptionsApplied?: Partial<Record<"d" | "f" | "g" | "h", boolean>>;

  // Passo 3 — GPAI (Art. 51-55) — asse parallelo
  isGPAIModel?: boolean;
  gpaiSystemicRisk?: boolean; // ≥ 10^25 FLOP o designazione Commissione

  // Passo 4 — Allegato I (Art. 6(1))
  annexIProductId?: string | null;   // id del prodotto (es. "medical_devices")
  annexIRequiresThirdPartyAssessment?: boolean;

  // Passo 5 — Allegato III aree (Art. 6(2))
  annexIIIAreaIds?: number[];  // 1-8

  // Passo 6 — Eccezioni Art. 6(3)
  art63ExceptionId?: Art63Exception["id"] | null;
  /** Se true, override: il sistema effettua profilazione di persone fisiche */
  profilingOfPersons?: boolean;

  // Passo 7 — Rischio limitato / trasparenza Art. 50
  isChatbot?: boolean;
  generatesSyntheticMedia?: boolean;
  hasEmotionRecognitionNonProhibited?: boolean;
  hasNonProhibitedBiometricCategorization?: boolean;
  generatesPublicInterestText?: boolean;

  // Passo trasversale — Ruolo e Art. 25/22
  role?: Role;
  /** Provider stabilito fuori UE → obbligo Art. 22 rappresentante autorizzato */
  outsideEUProvider?: boolean;
  /** Chi immette sul mercato un sistema altrui come proprio → Art. 25 */
  isProductManufacturerProvider?: boolean;
}

// ─── Tipi di output ────────────────────────────────────────────────────────────

export type ClassificationOutcome =
  | "out_of_scope"
  | "not_ai_system"
  | "prohibited"
  | "high_risk_annex_i"
  | "high_risk_annex_iii"
  | "limited"
  | "minimal";

export interface ClassifyResult {
  outcome: ClassificationOutcome;
  /** Motivazione dettagliata dell'esito */
  rationale: string;

  // Flag parallelo GPAI (non esclusivo)
  gpai: boolean;
  gpaiSystemic: boolean;

  // Art. 5
  prohibitedPractices: Art5Practice[];
  /** Se true, la pratica ha un'eccezione tassativa applicabile */
  prohibitionWithException: boolean;

  // Annex I
  annexIProduct: string | null;

  // Annex III
  annexIIIAreas: AnnexIIIArea[];
  /** Eccezione Art. 6(3) applicata (solo se non c'è profilazione) */
  exception63Applied: Art63Exception | null;
  /** Se true, la profilazione ha bloccato l'eccezione Art. 6(3) */
  profilingOverride: boolean;

  // Art. 50
  transparencyObligations: string[];

  // Ruolo e obblighi
  role: Role;
  obligations: ArticleObligation[];

  // Ref normativi
  applicableArticles: string[];

  // Note di verifica
  legalNote: string;
}

// ─── Pipeline ──────────────────────────────────────────────────────────────────

const LEGAL_NOTE =
  "[verifica contro il testo vigente dell'AI Act (Reg. (UE) 2024/1689) e le Draft Guidelines della Commissione]";

export function classify(answers: ClassifyAnswers): ClassifyResult {
  const role: Role = answers.role ?? "unknown";
  const articles = new Set<string>();
  const transparencyObligations: string[] = [];

  // ── Passo 0: Ambito Art. 2 ──────────────────────────────────────────────────
  const exclusions = answers.scopeExclusions ?? [];
  if (exclusions.length > 0) {
    return {
      outcome: "out_of_scope",
      rationale: `Sistema escluso dall'ambito di applicazione dell'AI Act (Art. 2) per: ${exclusions
        .map(e => SCOPE_EXCLUSION_LABELS[e])
        .join("; ")}.`,
      gpai: false,
      gpaiSystemic: false,
      prohibitedPractices: [],
      prohibitionWithException: false,
      annexIProduct: null,
      annexIIIAreas: [],
      exception63Applied: null,
      profilingOverride: false,
      transparencyObligations: [],
      role,
      obligations: [],
      applicableArticles: ["Art. 2"],
      legalNote: LEGAL_NOTE,
    };
  }

  // ── Passo 1: È un sistema di IA? Art. 3(1) ──────────────────────────────────
  // Un sistema è AI se usa ML/inferenza O produce output autonomi e non è puramente deterministico
  const isAISystem =
    (answers.hasMLOrInference === true || answers.producesInfluentialOutput === true) &&
    answers.isPurelyDeterministic !== true;

  if (isAISystem === false && answers.isPurelyDeterministic === true) {
    return {
      outcome: "not_ai_system",
      rationale:
        "Il sistema è puramente deterministico (regole esplicite pre-programmate) e non soddisfa la definizione di sistema di IA ai sensi dell'Art. 3(1) EU AI Act.",
      gpai: false,
      gpaiSystemic: false,
      prohibitedPractices: [],
      prohibitionWithException: false,
      annexIProduct: null,
      annexIIIAreas: [],
      exception63Applied: null,
      profilingOverride: false,
      transparencyObligations: [],
      role,
      obligations: [],
      applicableArticles: ["Art. 3(1)"],
      legalNote: LEGAL_NOTE,
    };
  }

  articles.add("Art. 3(1)");

  // ── Passo 3 (asse parallelo): GPAI Art. 51-55 ───────────────────────────────
  const gpai = answers.isGPAIModel === true;
  const gpaiSystemic = gpai && answers.gpaiSystemicRisk === true;
  if (gpai) {
    articles.add("Art. 51");
    articles.add("Art. 53");
    if (gpaiSystemic) articles.add("Art. 55");
  }

  // ── Passo 2: Pratiche vietate Art. 5 ────────────────────────────────────────
  const art5Flags = answers.art5Flags ?? [];
  const prohibitedPractices = ART5_PRACTICES.filter(p => art5Flags.includes(p.letter));

  // Verifica se le eccezioni tassative rimuovono il divieto
  const exceptionsApplied = answers.art5ExceptionsApplied ?? {};
  // Solo per (d), (f), (g), (h) esiste un'eccezione tassativa nell'AI Act
  const prohibitedWithoutException = prohibitedPractices.filter(p => {
    if ((p.letter === "d" || p.letter === "f" || p.letter === "g" || p.letter === "h") &&
        exceptionsApplied[p.letter] === true) {
      return false; // eccezione applicata
    }
    return true;
  });

  if (prohibitedWithoutException.length > 0) {
    articles.add("Art. 5");
    articles.add("Art. 99");
    const obls = getObligations(role, ["Art. 5", "Art. 99"]);
    return {
      outcome: "prohibited",
      rationale: `Il sistema rientra nelle pratiche vietate dall'Art. 5 EU AI Act: ${prohibitedWithoutException
        .map(p => `(${p.letter}) ${p.label}`)
        .join("; ")}. Non può essere immesso sul mercato o messo in servizio nell'UE nella forma attuale.`,
      gpai,
      gpaiSystemic,
      prohibitedPractices: prohibitedWithoutException,
      prohibitionWithException: prohibitedPractices.length > prohibitedWithoutException.length,
      annexIProduct: null,
      annexIIIAreas: [],
      exception63Applied: null,
      profilingOverride: false,
      transparencyObligations: [],
      role,
      obligations: obls,
      applicableArticles: [...articles],
      legalNote: LEGAL_NOTE,
    };
  }

  // Se ci sono pratiche con eccezione applicata (d/f/g/h), segnala
  const prohibitionWithException =
    prohibitedPractices.length > 0 && prohibitedWithoutException.length === 0;

  // ── Passo 4: Alto rischio — Allegato I (Art. 6(1)) ──────────────────────────
  const annexIProductId = answers.annexIProductId ?? null;
  const annexIProduct = annexIProductId
    ? (ANNEX_I_PRODUCTS.find(p => p.id === annexIProductId)?.label ?? annexIProductId)
    : null;
  const isAnnexI =
    !!annexIProductId && answers.annexIRequiresThirdPartyAssessment === true;

  if (isAnnexI) {
    articles.add("Art. 6(1)");
    articles.add("Allegato I");
    addHighRiskArticles(articles, role);
    const obls = getObligations(role, [...articles]);
    return {
      outcome: "high_risk_annex_i",
      rationale: `Sistema ad alto rischio per percorso Allegato I (Art. 6(1)): è un componente di sicurezza (o è esso stesso un prodotto) soggetto alla normativa di armonizzazione UE "${annexIProduct}" che richiede valutazione di conformità di terzi.`,
      gpai,
      gpaiSystemic,
      prohibitedPractices: [],
      prohibitionWithException,
      annexIProduct,
      annexIIIAreas: [],
      exception63Applied: null,
      profilingOverride: false,
      transparencyObligations: [],
      role,
      obligations: obls,
      applicableArticles: [...articles],
      legalNote: LEGAL_NOTE,
    };
  }

  // ── Passo 5: Candidato alto rischio — Allegato III (Art. 6(2)) ──────────────
  const annexIIIAreaIds = answers.annexIIIAreaIds ?? [];
  const annexIIIAreas = ANNEX_III_AREAS.filter(a => annexIIIAreaIds.includes(a.id));
  const isCandidateAnnexIII = annexIIIAreas.length > 0;

  if (isCandidateAnnexIII) {
    // ── Passo 6: Eccezioni Art. 6(3) ──────────────────────────────────────────
    const profilingOverride = answers.profilingOfPersons === true;
    const exceptionId = answers.art63ExceptionId;
    const exception63 = exceptionId
      ? ART63_EXCEPTIONS.find(e => e.id === exceptionId) ?? null
      : null;

    // L'eccezione si applica solo se NON c'è profilazione
    const exceptionApplied = exception63 !== null && !profilingOverride;

    if (exceptionApplied) {
      // Declassato: NON alto rischio
      articles.add("Art. 6(3)");
      // Obbligo di documentare la valutazione di esenzione
      const obls = getObligations(role, ["Art. 6(3)", "Art. 50"]);
      // Verifica Art. 50 (trasparenza)
      collectTransparency(answers, transparencyObligations, articles);

      const outcome: ClassificationOutcome =
        transparencyObligations.length > 0 ? "limited" : "minimal";

      return {
        outcome,
        rationale: `Sistema candidato Allegato III (area/e: ${annexIIIAreas.map(a => a.label).join(", ")}), ma declassato per eccezione Art. 6(3) — "${exception63!.label}". Nessuna profilazione di persone fisiche rilevata. Obbligo di registrare la valutazione di esenzione.`,
        gpai,
        gpaiSystemic,
        prohibitedPractices: [],
        prohibitionWithException,
        annexIProduct: null,
        annexIIIAreas,
        exception63Applied: exception63,
        profilingOverride: false,
        transparencyObligations,
        role,
        obligations: obls,
        applicableArticles: [...articles],
        legalNote: LEGAL_NOTE,
      };
    }

    // Alto rischio confermato (Allegato III)
    articles.add("Art. 6(2)");
    articles.add("Allegato III");
    addHighRiskArticles(articles, role);
    if (profilingOverride && exception63) {
      // L'eccezione era richiesta ma bloccata dalla profilazione
      articles.add("Art. 6(3) [eccezione negata — profilazione]");
    }
    const obls = getObligations(role, [...articles]);
    return {
      outcome: "high_risk_annex_iii",
      rationale: `Sistema ad alto rischio per percorso Allegato III (Art. 6(2)), area/e: ${annexIIIAreas
        .map(a => `§${a.id} — ${a.label}`)
        .join("; ")}.${
        profilingOverride
          ? " Eccezione Art. 6(3) non applicabile: il sistema effettua profilazione di persone fisiche (override obbligatorio)."
          : ""
      }`,
      gpai,
      gpaiSystemic,
      prohibitedPractices: [],
      prohibitionWithException,
      annexIProduct: null,
      annexIIIAreas,
      exception63Applied: null,
      profilingOverride,
      transparencyObligations: [],
      role,
      obligations: obls,
      applicableArticles: [...articles],
      legalNote: LEGAL_NOTE,
    };
  }

  // ── Passi 7–8: Rischio limitato / minimo ────────────────────────────────────
  collectTransparency(answers, transparencyObligations, articles);

  if (transparencyObligations.length > 0) {
    articles.add("Art. 50");
    const obls = getObligations(role, [...articles]);
    return {
      outcome: "limited",
      rationale: `Sistema a rischio limitato. Obblighi di trasparenza Art. 50: ${transparencyObligations.join("; ")}.`,
      gpai,
      gpaiSystemic,
      prohibitedPractices: [],
      prohibitionWithException,
      annexIProduct: null,
      annexIIIAreas: [],
      exception63Applied: null,
      profilingOverride: false,
      transparencyObligations,
      role,
      obligations: obls,
      applicableArticles: [...articles],
      legalNote: LEGAL_NOTE,
    };
  }

  // Minimo
  articles.add("Art. 95");
  const obls = getObligations(role, [...articles]);
  return {
    outcome: "minimal",
    rationale:
      "Sistema a rischio minimale. Nessun obbligo specifico oltre alla verifica delle pratiche vietate (Art. 5). Adozione volontaria di codici di condotta (Art. 95) raccomandata.",
    gpai,
    gpaiSystemic,
    prohibitedPractices: [],
    prohibitionWithException,
    annexIProduct: null,
    annexIIIAreas: [],
    exception63Applied: null,
    profilingOverride: false,
    transparencyObligations: [],
    role,
    obligations: obls,
    applicableArticles: [...articles],
    legalNote: LEGAL_NOTE,
  };
}

// ─── Helper: articoli obbligatori alto rischio ─────────────────────────────────

function addHighRiskArticles(articles: Set<string>, role: Role) {
  if (role === "provider" || role === "product_manufacturer") {
    ["Art. 9", "Art. 10", "Art. 11", "Art. 12", "Art. 13", "Art. 14",
     "Art. 15", "Art. 17", "Art. 43", "Art. 47", "Art. 49"].forEach(a => articles.add(a));
  }
  if (role === "deployer") {
    ["Art. 14", "Art. 26", "Art. 27", "Art. 49"].forEach(a => articles.add(a));
  }
  if (role === "importer" || role === "distributor") {
    ["Art. 23", "Art. 24"].forEach(a => articles.add(a));
  }
  if (role === "authorized_rep") {
    articles.add("Art. 22");
  }
  articles.add("Art. 99");
}

// ─── Helper: trasparenza Art. 50 ──────────────────────────────────────────────

function collectTransparency(
  answers: ClassifyAnswers,
  obligations: string[],
  articles: Set<string>,
) {
  if (answers.isChatbot) {
    obligations.push("Disclosure all'utente dell'interazione con un sistema AI (Art. 50(1))");
    articles.add("Art. 50(1)");
  }
  if (answers.generatesSyntheticMedia) {
    obligations.push("Marcatura automatica e rilevabile dei contenuti sintetici/deepfake (Art. 50(2)–(4))");
    articles.add("Art. 50(2)");
  }
  if (answers.hasEmotionRecognitionNonProhibited) {
    obligations.push("Informare le persone fisiche del funzionamento di riconoscimento emozioni (Art. 50(1))");
    articles.add("Art. 50(1)");
  }
  if (answers.hasNonProhibitedBiometricCategorization) {
    obligations.push("Informare le persone fisiche della categorizzazione biometrica (Art. 50(1))");
    articles.add("Art. 50(1)");
  }
  if (answers.generatesPublicInterestText) {
    obligations.push("Marcatura di testi AI di interesse pubblico (Art. 50(3))");
    articles.add("Art. 50(3)");
  }
}

// ─── Helper: filtro obblighi per ruolo ────────────────────────────────────────

function getObligations(role: Role, articleIds: string[]): ArticleObligation[] {
  return ARTICLE_OBLIGATIONS.filter(
    o =>
      (role === "unknown" || o.applies.includes(role as never)) &&
      articleIds.some(a => a === o.article || a.startsWith(o.article))
  );
}

// ─── Labels esclusioni ambito ─────────────────────────────────────────────────

const SCOPE_EXCLUSION_LABELS: Record<string, string> = {
  military: "finalità militari/difesa/sicurezza nazionale (Art. 2(3))",
  research_premarket: "ricerca e sviluppo pre-immissione sul mercato (Art. 2(6))",
  personal_nonprofessional: "uso personale non professionale (Art. 2(10))",
  foss_no_high_risk: "software open source senza distribuzione come alto rischio/GPAI (Art. 2(12))",
};

// ─── Test cases (8-10 scenari) ─────────────────────────────────────────────────
//
// Scenario 1 — Fuori ambito (sicurezza nazionale)
//   Input:  { scopeExclusions: ["military"] }
//   Atteso: outcome = "out_of_scope"
//
// Scenario 2 — Non AI (regole deterministiche)
//   Input:  { isPurelyDeterministic: true }
//   Atteso: outcome = "not_ai_system"
//
// Scenario 3 — Art. 5(h) RBI real-time in spazi pubblici (pratica vietata)
//   Input:  { hasMLOrInference: true, producesInfluentialOutput: true, art5Flags: ["h"] }
//   Atteso: outcome = "prohibited", prohibitedPractices[0].letter = "h"
//
// Scenario 4 — Art. 5(b) sfruttamento vulnerabilità (lettera corretta)
//   Input:  { hasMLOrInference: true, art5Flags: ["b"] }
//   Atteso: outcome = "prohibited", prohibitedPractices[0].letter = "b" (NON "a")
//
// Scenario 5 — Dispositivo medico con AI (Allegato I)
//   Input:  { hasMLOrInference: true, annexIProductId: "medical_devices",
//             annexIRequiresThirdPartyAssessment: true, role: "provider" }
//   Atteso: outcome = "high_risk_annex_i", annexIProduct includes "Dispositivi medici"
//
// Scenario 6 — HR screening CV (Allegato III area 4), nessuna eccezione
//   Input:  { hasMLOrInference: true, annexIIIAreaIds: [4], role: "provider" }
//   Atteso: outcome = "high_risk_annex_iii", annexIIIAreas[0].id = 4
//
// Scenario 7 — Annex III + eccezione 6(3) senza profilazione (declassato)
//   Input:  { hasMLOrInference: true, annexIIIAreaIds: [3],
//             art63ExceptionId: "preparatory_task", profilingOfPersons: false }
//   Atteso: outcome = "minimal" o "limited", exception63Applied !== null
//
// Scenario 8 — Annex III + eccezione 6(3) CON profilazione (override → alto rischio)
//   Input:  { hasMLOrInference: true, annexIIIAreaIds: [3],
//             art63ExceptionId: "preparatory_task", profilingOfPersons: true }
//   Atteso: outcome = "high_risk_annex_iii", profilingOverride = true
//
// Scenario 9 — GPAI + Annex III (asse parallelo, coesistono)
//   Input:  { hasMLOrInference: true, isGPAIModel: true, annexIIIAreaIds: [4],
//             role: "provider" }
//   Atteso: outcome = "high_risk_annex_iii", gpai = true
//
// Scenario 10 — Chatbot (rischio limitato Art. 50)
//   Input:  { hasMLOrInference: true, producesInfluentialOutput: true,
//             isChatbot: true, role: "provider" }
//   Atteso: outcome = "limited", transparencyObligations.length > 0
