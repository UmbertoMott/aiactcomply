// src/lib/obligations/engine.ts
//
// Motore "ruolo + rischio → obblighi" per singolo sistema di IA.
// Passo 2: determineRoles()   — chi è l'organizzazione rispetto al sistema (Art. 3, 25)
// Passo 3: assessRisk()       — in quale categoria rientra il sistema (Artt. 2, 3(1), 5, 6, 50, 51)
// Passo 4: computeObligations() — gli obblighi che ne derivano, con articolo,
//          data di applicazione (Artt. 111, 113) e corrispondenza ISO/IEC 42001.
//
// Fonte: Regolamento (UE) 2024/1689 (GU L del 12.7.2024) come modificato dal
// Regolamento (UE) 2026/1744 "Omnibus digitale sull'IA" (GU L del 24.7.2026, in vigore dal 27.7.2026):
// nuove date dell'Art. 113, Art. 111(2) e (4), Art. 5(1)(ba)-(bb), nuovo Art. 4, Art. 6(1 bis)-(1 quater),
// regolamento macchine spostato nell'Allegato I, sezione B.
// Corrispondenze con ISO/IEC 42001:2023: numerazione e titoli di clausole e
// controlli dell'Allegato A verificati sulla prima edizione (2023-12); l'abbinamento
// articolo ↔ clausola è interpretativo (la norma non è un'attuazione del regolamento).
//
// File volutamente autonomo (nessun import): è usato dalle pagine e dai test.

// ─── Passo 2 · Ruolo ──────────────────────────────────────────────────────────

export type Developer = "us" | "commissioned" | "third_party";
export type OwnUse = "internal_use" | "market" | "development_only";
export type ThirdPartyUse = "use" | "import" | "distribute";
export type Art25Trigger = "own_brand" | "substantial_modification" | "purpose_change";
export type PublicStatus = "public_authority" | "public_service" | "none";

export interface RoleAnswers {
  /** Chi ha sviluppato il sistema (Art. 3(3): "sviluppa o fa sviluppare") */
  developer?: Developer;
  /** Se sviluppato da noi o per noi: come è usato o distribuito (Art. 3(9), 3(11)) */
  ownUse?: OwnUse[];
  /** Se sviluppato da terzi: cosa ne fa l'organizzazione (Art. 3(4), 3(6), 3(7)) */
  thirdPartyUse?: ThirdPartyUse[];
  /** Se sviluppato da terzi: circostanze dell'Art. 25(1) */
  art25?: Art25Trigger[];
  /** Natura dell'organizzazione (Artt. 26(8), 27(1), 49(3)) */
  publicStatus?: PublicStatus;
  /** Organizzazione stabilita fuori dall'UE (Artt. 22, 54) */
  establishedOutsideEU?: boolean;
}

export type Role = "provider" | "deployer" | "importer" | "distributor";

export const ROLE_LABEL: Record<Role, string> = {
  provider: "Fornitore",
  deployer: "Deployer (utilizzatore)",
  importer: "Importatore",
  distributor: "Distributore",
};

export interface RoleResult {
  roles: Role[];
  /** Motivazione per ciascun ruolo, con articolo */
  basis: string[];
  /** Solo sviluppo/prova: fuori ambito fino all'immissione o messa in servizio (Art. 2(8)) */
  preMarketOnly: boolean;
  /** Circostanze Art. 25(1) dichiarate: diventano ruolo di fornitore solo se il sistema è ad alto rischio */
  art25Pending: Art25Trigger[];
  complete: boolean;
}

export function determineRoles(a: RoleAnswers): RoleResult {
  const roles = new Set<Role>();
  const basis: string[] = [];
  let preMarketOnly = false;
  const art25Pending: Art25Trigger[] = [];

  if (a.developer === "us" || a.developer === "commissioned") {
    const uses = a.ownUse ?? [];
    if (uses.includes("market") || uses.includes("internal_use")) {
      roles.add("provider");
      basis.push(
        uses.includes("market")
          ? "Fornitore: sviluppa o fa sviluppare il sistema e lo immette sul mercato con il proprio nome o marchio (Art. 3(3), 3(9))."
          : "Fornitore: sviluppa o fa sviluppare il sistema e lo mette in servizio per uso proprio con il proprio nome o marchio (Art. 3(3), 3(11))."
      );
    }
    if (uses.includes("internal_use")) {
      roles.add("deployer");
      basis.push("Deployer: utilizza il sistema sotto la propria autorità nell'attività professionale (Art. 3(4)).");
    }
    if (uses.length > 0 && uses.every(u => u === "development_only")) {
      preMarketOnly = true;
      basis.push("Solo attività di ricerca, prova o sviluppo prima dell'immissione sul mercato o della messa in servizio: il regolamento non si applica finché non avviene (Art. 2(8)); le prove in condizioni reali restano incluse.");
    }
  }

  if (a.developer === "third_party") {
    const uses = a.thirdPartyUse ?? [];
    if (uses.includes("use")) {
      roles.add("deployer");
      basis.push("Deployer: utilizza sotto la propria autorità un sistema sviluppato da altri (Art. 3(4)).");
    }
    if (uses.includes("import")) {
      roles.add("importer");
      basis.push("Importatore: immette sul mercato dell'Unione un sistema recante il nome o il marchio di un soggetto stabilito in un paese terzo (Art. 3(6)).");
    }
    if (uses.includes("distribute")) {
      roles.add("distributor");
      basis.push("Distributore: mette a disposizione sul mercato un sistema senza esserne fornitore o importatore (Art. 3(7)).");
    }
    art25Pending.push(...(a.art25 ?? []));
  }

  const complete =
    a.developer !== undefined &&
    (a.developer === "third_party"
      ? (a.thirdPartyUse?.length ?? 0) > 0
      : (a.ownUse?.length ?? 0) > 0) &&
    a.publicStatus !== undefined;

  return { roles: [...roles], basis, preMarketOnly, art25Pending, complete };
}

// ─── Passo 3 · Rischio ────────────────────────────────────────────────────────

export type ScopeExclusion = "military" | "scientific_research";
export type Art5Letter = "a" | "b" | "ba" | "bb" | "c" | "d" | "e" | "f" | "g" | "h";
export type Art63Condition = "a" | "b" | "c" | "d";
export type AnnexISection = "A" | "B";

export interface Art5Practice {
  letter: Art5Letter;
  /** Formulazione semplice per la domanda */
  question: string;
  /** Rinvio sintetico al testo */
  ref: string;
  /** Eccezione o limite previsto dal testo, se esiste */
  exception?: string;
  /** Data di applicazione del divieto (Art. 113) */
  appliesFrom: string;
}

export const ART5_PRACTICES: Art5Practice[] = [
  { letter: "a", appliesFrom: "2025-02-02", ref: "Art. 5(1)(a)",
    question: "Usa tecniche subliminali, manipolative o ingannevoli che alterano in modo rilevante il comportamento delle persone e possono causare un danno significativo?" },
  { letter: "b", appliesFrom: "2025-02-02", ref: "Art. 5(1)(b)",
    question: "Sfrutta le vulnerabilità dovute a età, disabilità o situazione sociale o economica per alterare il comportamento delle persone, con possibile danno significativo?" },
  { letter: "ba", appliesFrom: "2026-12-02", ref: "Art. 5(1)(ba)",
    question: "Genera o manipola immagini, video o audio realistici delle parti intime di una persona identificabile, o che la ritraggono in attività sessualmente esplicite, senza il suo consenso esplicito?" },
  { letter: "bb", appliesFrom: "2026-12-02", ref: "Art. 5(1)(bb)",
    question: "Genera o manipola materiale pedopornografico ai sensi dell'Art. 2, lettere c) ed e), della direttiva 2011/93/UE?",
    exception: "Non vietato se si applica una causa di giustificazione (\"without right\" defence) prevista dal diritto nazionale." },
  { letter: "c", appliesFrom: "2025-02-02", ref: "Art. 5(1)(c)",
    question: "Assegna un \"punteggio sociale\" alle persone in base al comportamento o alla personalità, con trattamenti sfavorevoli in contesti diversi o sproporzionati?" },
  { letter: "d", appliesFrom: "2025-02-02", ref: "Art. 5(1)(d)",
    question: "Valuta il rischio che una persona commetta un reato basandosi solo sulla profilazione o sui tratti della personalità?",
    exception: "Non vietato se supporta una valutazione umana già basata su fatti oggettivi e verificabili connessi a un'attività criminosa." },
  { letter: "e", appliesFrom: "2025-02-02", ref: "Art. 5(1)(e)",
    question: "Crea o amplia banche dati di riconoscimento facciale raccogliendo immagini del volto da internet o da telecamere in modo non mirato (scraping)?" },
  { letter: "f", appliesFrom: "2025-02-02", ref: "Art. 5(1)(f)",
    question: "Deduce le emozioni delle persone sul luogo di lavoro o negli istituti di istruzione?",
    exception: "Non vietato se l'uso è destinato a motivi medici o di sicurezza." },
  { letter: "g", appliesFrom: "2025-02-02", ref: "Art. 5(1)(g)",
    question: "Classifica le persone in base ai dati biometrici per dedurne razza, opinioni politiche, appartenenza sindacale, convinzioni religiose o filosofiche, vita od orientamento sessuale?",
    exception: "Non vietato per l'etichettatura o il filtraggio di set di dati biometrici acquisiti legalmente o per la categorizzazione nelle attività di contrasto." },
  { letter: "h", appliesFrom: "2025-02-02", ref: "Art. 5(1)(h)",
    question: "Identifica le persone a distanza, in tempo reale, tramite dati biometrici in spazi accessibili al pubblico, a fini di attività di contrasto?",
    exception: "Ammesso solo per gli obiettivi tassativi dell'Art. 5(1)(h)(i)-(iii), con autorizzazione preventiva e le condizioni dei paragrafi 2-7." },
];

export interface AnnexIAct {
  id: string;
  section: AnnexISection;
  label: string;
  ref: string;
}

/** Allegato I — normativa di armonizzazione dell'Unione */
export const ANNEX_I_ACTS: AnnexIAct[] = [
  
  { id: "toys", section: "A", label: "Giocattoli", ref: "Dir. 2009/48/CE" },
  { id: "recreational_craft", section: "A", label: "Imbarcazioni da diporto e moto d'acqua", ref: "Dir. 2013/53/UE" },
  { id: "lifts", section: "A", label: "Ascensori e componenti di sicurezza", ref: "Dir. 2014/33/UE" },
  { id: "atex", section: "A", label: "Apparecchi per atmosfere potenzialmente esplosive", ref: "Dir. 2014/34/UE" },
  { id: "radio", section: "A", label: "Apparecchiature radio", ref: "Dir. 2014/53/UE" },
  { id: "pressure", section: "A", label: "Attrezzature a pressione", ref: "Dir. 2014/68/UE" },
  { id: "cableways", section: "A", label: "Impianti a fune", ref: "Reg. (UE) 2016/424" },
  { id: "ppe", section: "A", label: "Dispositivi di protezione individuale", ref: "Reg. (UE) 2016/425" },
  { id: "gas_appliances", section: "A", label: "Apparecchi che bruciano carburanti gassosi", ref: "Reg. (UE) 2016/426" },
  { id: "medical_devices", section: "A", label: "Dispositivi medici", ref: "Reg. (UE) 2017/745" },
  { id: "ivd", section: "A", label: "Dispositivi medico-diagnostici in vitro", ref: "Reg. (UE) 2017/746" },
  { id: "civil_aviation_security", section: "B", label: "Sicurezza dell'aviazione civile", ref: "Reg. (CE) n. 300/2008" },
  { id: "two_three_wheel", section: "B", label: "Veicoli a due o tre ruote e quadricicli", ref: "Reg. (UE) n. 168/2013" },
  { id: "agricultural", section: "B", label: "Veicoli agricoli e forestali", ref: "Reg. (UE) n. 167/2013" },
  { id: "marine", section: "B", label: "Equipaggiamento marittimo", ref: "Dir. 2014/90/UE" },
  { id: "rail", section: "B", label: "Interoperabilità del sistema ferroviario", ref: "Dir. (UE) 2016/797" },
  { id: "motor_vehicles", section: "B", label: "Veicoli a motore e loro rimorchi", ref: "Reg. (UE) 2018/858" },
  { id: "vehicle_safety", section: "B", label: "Sicurezza generale dei veicoli", ref: "Reg. (UE) 2019/2144" },
  { id: "civil_aviation", section: "B", label: "Aviazione civile (aeromobili senza equipaggio)", ref: "Reg. (UE) 2018/1139" },
  { id: "machinery", section: "B", label: "Prodotti macchina", ref: "Reg. (UE) 2023/1230 (spostato nella sezione B dal Reg. (UE) 2026/1744)" },
];

export interface AnnexIIIUse {
  /** Punto e lettera, es. "4a" */
  id: string;
  point: number;
  label: string;
  ref: string;
}

/** Allegato III — casi d'uso ad alto rischio (Art. 6(2)) */
export const ANNEX_III_USES: AnnexIIIUse[] = [
  { id: "1a", point: 1, ref: "All. III, punto 1(a)", label: "Identificazione biometrica remota (esclusa la sola verifica dell'identità)" },
  { id: "1b", point: 1, ref: "All. III, punto 1(b)", label: "Categorizzazione biometrica in base ad attributi o caratteristiche sensibili" },
  { id: "1c", point: 1, ref: "All. III, punto 1(c)", label: "Riconoscimento delle emozioni" },
  { id: "2", point: 2, ref: "All. III, punto 2", label: "Componente di sicurezza di infrastrutture digitali critiche, traffico stradale, fornitura di acqua, gas, riscaldamento o elettricità" },
  { id: "3a", point: 3, ref: "All. III, punto 3(a)", label: "Istruzione: accesso, ammissione o assegnazione agli istituti" },
  { id: "3b", point: 3, ref: "All. III, punto 3(b)", label: "Istruzione: valutazione dei risultati dell'apprendimento" },
  { id: "3c", point: 3, ref: "All. III, punto 3(c)", label: "Istruzione: valutazione del livello di istruzione adeguato" },
  { id: "3d", point: 3, ref: "All. III, punto 3(d)", label: "Istruzione: monitoraggio di comportamenti vietati durante le prove" },
  { id: "4a", point: 4, ref: "All. III, punto 4(a)", label: "Lavoro: assunzione o selezione (annunci mirati, filtro candidature, valutazione candidati)" },
  { id: "4b", point: 4, ref: "All. III, punto 4(b)", label: "Lavoro: decisioni su condizioni, promozioni, cessazioni, assegnazione compiti, monitoraggio e valutazione" },
  { id: "5a", point: 5, ref: "All. III, punto 5(a)", label: "Autorità pubbliche: ammissibilità a prestazioni e servizi di assistenza pubblica essenziali" },
  { id: "5b", point: 5, ref: "All. III, punto 5(b)", label: "Affidabilità creditizia o merito di credito delle persone fisiche (esclusa l'individuazione di frodi)" },
  { id: "5c", point: 5, ref: "All. III, punto 5(c)", label: "Valutazione dei rischi e prezzi per assicurazioni sulla vita e sanitarie" },
  { id: "5d", point: 5, ref: "All. III, punto 5(d)", label: "Chiamate di emergenza, invio dei soccorsi, triage dei pazienti in emergenza" },
  { id: "6", point: 6, ref: "All. III, punto 6(a)-(e)", label: "Attività di contrasto (uso da parte o per conto delle autorità di contrasto)" },
  { id: "7", point: 7, ref: "All. III, punto 7(a)-(d)", label: "Migrazione, asilo e controllo delle frontiere (uso da parte delle autorità competenti)" },
  { id: "8a", point: 8, ref: "All. III, punto 8(a)", label: "Assistenza alle autorità giudiziarie o alla risoluzione alternativa delle controversie" },
  { id: "8b", point: 8, ref: "All. III, punto 8(b)", label: "Influenzare l'esito di elezioni o referendum o il comportamento di voto" },
];

export const ART63_CONDITIONS: { id: Art63Condition; label: string }[] = [
  { id: "a", label: "Esegue un compito procedurale limitato (es. trasforma dati non strutturati in strutturati, classifica documenti, rileva duplicati)" },
  { id: "b", label: "Migliora il risultato di un'attività umana già completata (es. migliora il linguaggio di un testo già redatto)" },
  { id: "c", label: "Rileva schemi decisionali o deviazioni da schemi precedenti, senza sostituire o influenzare la valutazione umana senza adeguata revisione" },
  { id: "d", label: "Esegue un compito solo preparatorio rispetto a una valutazione rilevante (es. indicizzazione, ricerca, traduzione di documenti)" },
];

export interface RiskAnswers {
  // Art. 2 — ambito
  scopeExclusions?: ScopeExclusion[];
  /** Licenza libera e open source (Art. 2(12)) */
  openSource?: boolean;
  // Art. 3(1) — è un sistema di IA?
  aiDefinition?: "infers" | "rules_only" | "unsure";
  // Art. 5
  art5?: Art5Letter[];
  /** Lettere per cui ricorre l'eccezione o il limite previsto dal testo */
  art5Exceptions?: Art5Letter[];
  // Art. 6(1) — Allegato I
  annexIActId?: string | null;
  annexIThirdParty?: boolean;
  // Art. 6(2) — Allegato III
  annexIII?: string[];
  // Art. 6(3)
  profiling?: boolean;
  art63?: Art63Condition | "none";
  // Art. 50
  interactsWithPersons?: boolean;
  generatesSynthetic?: boolean;
  /** Solo assistenza all'editing standard o nessuna modifica sostanziale dell'input (Art. 50(2)) */
  syntheticEditingOnly?: boolean;
  emotionOrBiometricCategorisation?: boolean;
  deepFake?: boolean;
  publicInterestText?: boolean;
  /** Testo sottoposto a revisione umana con responsabilità editoriale (Art. 50(4)) */
  publicInterestTextReviewed?: boolean;
  // Capo V — modelli GPAI
  gpaiModelProvider?: boolean;
  gpaiSystemic?: boolean;
  gpaiOpenWeights?: boolean;
  gpaiPlacedBeforeAug2025?: boolean;
  // Contesto d'uso (alto rischio)
  workplace?: boolean;
  decisionsOnPersons?: boolean;
  personalData?: boolean;
  /** Immesso sul mercato o messo in servizio prima della data di applicazione del Capo III
   *  (2/12/2027 All. III, 2/8/2028 All. I) e senza modifiche significative di progettazione da allora (Art. 111(2)) */
  legacyNoSignificantChange?: boolean;
  /** Sistema che genera contenuti sintetici già immesso sul mercato prima del 2/8/2026 (Art. 111(4)) */
  syntheticPlacedBeforeAug2026?: boolean;
}

export type RiskCategory =
  | "out_of_scope"
  | "not_ai"
  | "prohibited"
  | "high_risk_annex_i"
  | "high_risk_annex_iii"
  | "annex_iii_exempt"
  | "transparency"
  | "minimal";

export const RISK_LABEL: Record<RiskCategory, string> = {
  out_of_scope: "Fuori dall'ambito del regolamento",
  not_ai: "Non è un sistema di IA",
  prohibited: "Pratica vietata",
  high_risk_annex_i: "Alto rischio — Allegato I",
  high_risk_annex_iii: "Alto rischio — Allegato III",
  annex_iii_exempt: "Non ad alto rischio (deroga Art. 6(3))",
  transparency: "Obblighi di trasparenza",
  minimal: "Rischio minimo",
};

export type Art50Duty = "50_1" | "50_2" | "50_3" | "50_4_deepfake" | "50_4_text";

export interface RiskResult {
  category: RiskCategory;
  rationale: string[];
  prohibited: Art5Letter[];
  annexIAct: AnnexIAct | null;
  annexIIIUses: AnnexIIIUse[];
  /** Art. 6(3) invocata ma esclusa per profilazione */
  profilingOverride: boolean;
  /** Obblighi Art. 50, cumulativi con l'alto rischio (Art. 50(6)) */
  art50: Art50Duty[];
  gpai: boolean;
  gpaiSystemic: boolean;
  /** Se l'utente ha risposto "non so" alla definizione di sistema di IA */
  aiDefinitionUncertain: boolean;
}

export function assessRisk(a: RiskAnswers): RiskResult {
  const base: RiskResult = {
    category: "minimal", rationale: [], prohibited: [], annexIAct: null,
    annexIIIUses: [], profilingOverride: false, art50: [],
    gpai: a.gpaiModelProvider === true,
    gpaiSystemic: a.gpaiModelProvider === true && a.gpaiSystemic === true,
    aiDefinitionUncertain: a.aiDefinition === "unsure",
  };

  const excl = a.scopeExclusions ?? [];
  if (excl.length > 0) {
    base.category = "out_of_scope";
    if (excl.includes("military")) base.rationale.push("Uso esclusivo per scopi militari, di difesa o di sicurezza nazionale (Art. 2(3)).");
    if (excl.includes("scientific_research")) base.rationale.push("Sviluppato e messo in servizio al solo scopo di ricerca e sviluppo scientifici (Art. 2(6)).");
    return base;
  }

  if (a.aiDefinition === "rules_only") {
    base.category = "not_ai";
    base.rationale.push("Il sistema segue solo regole definite unicamente da persone fisiche, senza capacità inferenziale: non rientra nella definizione di sistema di IA (Art. 3(1), considerando 12).");
    return base;
  }
  if (a.aiDefinition === "unsure") {
    base.rationale.push("Definizione di sistema di IA non accertata (Art. 3(1)): in via prudenziale il sistema è trattato come sistema di IA; verificare con gli orientamenti della Commissione (Art. 96(1)(f)).");
  }

  // Art. 5
  const exceptions = new Set(a.art5Exceptions ?? []);
  const prohibited = (a.art5 ?? []).filter(l => !((["bb", "d", "f", "g", "h"] as Art5Letter[]).includes(l) && exceptions.has(l)));
  if (prohibited.length > 0) {
    base.category = "prohibited";
    base.prohibited = prohibited;
    base.rationale.push(`Rientra nelle pratiche vietate: ${prohibited.map(l => `Art. 5(1)(${l})`).join(", ")}. Non può essere immesso sul mercato, messo in servizio o usato (Art. 5; sanzioni Art. 99(3)).`);
    return base;
  }

  // Art. 50 — calcolato sempre: si cumula con l'alto rischio (Art. 50(6))
  if (a.interactsWithPersons) base.art50.push("50_1");
  if (a.generatesSynthetic && !a.syntheticEditingOnly) base.art50.push("50_2");
  if (a.emotionOrBiometricCategorisation) base.art50.push("50_3");
  if (a.deepFake) base.art50.push("50_4_deepfake");
  if (a.publicInterestText && !a.publicInterestTextReviewed) base.art50.push("50_4_text");

  // Art. 6(1) — Allegato I
  const act = a.annexIActId ? ANNEX_I_ACTS.find(x => x.id === a.annexIActId) ?? null : null;
  if (act && a.annexIThirdParty === true) {
    base.category = "high_risk_annex_i";
    base.annexIAct = act;
    base.rationale.push(`Componente di sicurezza di un prodotto (o prodotto) disciplinato da ${act.ref}, soggetto a valutazione della conformità da parte di terzi: alto rischio (Art. 6(1), Allegato I, sezione ${act.section}).`);
    if (act.section === "B") base.rationale.push("Per la sezione B dell'Allegato I si applicano solo l'Art. 6(1), gli Artt. 102-109 e l'Art. 112 (Art. 2(2)): i requisiti operano tramite la normativa di settore.");
    return withOpenSource(base, a);
  }

  // Art. 6(2) — Allegato III
  const uses = ANNEX_III_USES.filter(u => (a.annexIII ?? []).includes(u.id));
  if (uses.length > 0) {
    base.annexIIIUses = uses;
    if (a.profiling === true) {
      base.category = "high_risk_annex_iii";
      base.profilingOverride = a.art63 !== undefined && a.art63 !== "none";
      base.rationale.push(`Caso d'uso dell'Allegato III (${uses.map(u => u.ref).join("; ")}) con profilazione di persone fisiche: sempre ad alto rischio (Art. 6(3), terzo comma).`);
    } else if (a.art63 && a.art63 !== "none") {
      base.category = "annex_iii_exempt";
      base.rationale.push(`Caso d'uso dell'Allegato III (${uses.map(u => u.ref).join("; ")}), ma ricorre la condizione dell'Art. 6(3), lettera ${a.art63}): non ad alto rischio. Il fornitore documenta la valutazione prima dell'immissione o messa in servizio e registra il sistema (Art. 6(4), Art. 49(2)).`);
    } else {
      base.category = "high_risk_annex_iii";
      base.rationale.push(`Caso d'uso dell'Allegato III: ${uses.map(u => u.ref).join("; ")} — alto rischio (Art. 6(2)).`);
    }
    if (base.category !== "annex_iii_exempt") return withOpenSource(base, a);
  }

  if (base.category !== "annex_iii_exempt") {
    base.category = base.art50.length > 0 ? "transparency" : "minimal";
  }
  if (base.art50.length > 0) base.rationale.push("Si applicano obblighi di trasparenza dell'Art. 50.");
  if (base.category === "minimal") base.rationale.push("Nessun caso d'uso vietato, ad alto rischio o soggetto all'Art. 50: nessun requisito specifico oltre all'alfabetizzazione (Art. 4); codici di condotta volontari (Art. 95).");
  return withOpenSource(base, a);
}

/** Art. 2(12): i sistemi open source sono esclusi salvo alto rischio, Art. 5 o Art. 50 */
function withOpenSource(r: RiskResult, a: RiskAnswers): RiskResult {
  const highRisk = r.category === "high_risk_annex_i" || r.category === "high_risk_annex_iii";
  if (a.openSource && !highRisk && r.art50.length === 0 && !r.gpai) {
    return {
      ...r,
      category: "out_of_scope",
      rationale: [...r.rationale, "Rilasciato con licenza libera e open source e non ad alto rischio né rientrante negli Artt. 5 o 50: escluso (Art. 2(12))."],
    };
  }
  return r;
}

export function isHighRisk(c: RiskCategory) {
  return c === "high_risk_annex_i" || c === "high_risk_annex_iii";
}

// ─── Passo 4 · Obblighi ───────────────────────────────────────────────────────

export type ObligationGroup = "all" | "provider" | "deployer" | "importer" | "distributor" | "transparency" | "gpai" | "prohibited";

export interface Obligation {
  id: string;
  group: ObligationGroup;
  /** Chi deve adempiere */
  role: Role | "all";
  title: string;
  /** Cosa fare, in parole semplici */
  what: string;
  article: string;
  /** Corrispondenza indicativa ISO/IEC 42001:2023 */
  iso: string[];
  /** Data di applicazione (Art. 113, Art. 111) */
  appliesFrom: string;
  tool?: { href: string; label: string };
  /** Chiave di storage del tool: se ha dati, l'obbligo risulta "in corso" */
  storageKey?: string;
  note?: string;
}

export interface ObligationsResult {
  /** Ruoli effettivi dopo l'Art. 25 */
  roles: Role[];
  obligations: Obligation[];
  notes: string[];
}

const D_FEB_2025 = "2025-02-02";
const D_AUG_2025 = "2025-08-02";
const D_AUG_2026 = "2026-08-02";
const D_AUG_2027 = "2027-08-02";
const D_DEC_2026 = "2026-12-02";
const D_DEC_2027 = "2027-12-02";
const D_AUG_2028 = "2028-08-02";
const D_AUG_2030 = "2030-08-02";

const T = {
  literacy: { href: "/dashboard/tools/literacy", label: "Alfabetizzazione" },
  risk: { href: "/dashboard/tools/risk-manager", label: "Registro dei rischi" },
  data: { href: "/dashboard/tools/data-audit", label: "Qualità dati" },
  docugen: { href: "/dashboard/tools/docugen", label: "DocuGen" },
  logvault: { href: "/dashboard/tools/logvault", label: "LogVault" },
  transparency: { href: "/dashboard/tools/transparency", label: "Trasparenza" },
  oversight: { href: "/dashboard/tools/oversight", label: "Sorveglianza umana" },
  resilience: { href: "/dashboard/tools/resilience", label: "Robustezza" },
  qms: { href: "/dashboard/tools/qms", label: "Sistema qualità" },
  conformity: { href: "/dashboard/tools/conformity", label: "Conformità" },
  eudb: { href: "/dashboard/compliance-ops/eudb", label: "Banca dati UE" },
  postMarket: { href: "/dashboard/post-market", label: "Post-market" },
  authRep: { href: "/dashboard/compliance-ops/authorized-rep", label: "Rappresentante" },
  deployer: { href: "/dashboard/tools/deployer-dashboard", label: "Obblighi deployer" },
  fria: { href: "/dashboard/tools/fria", label: "FRIA" },
  dpia: { href: "/dashboard/tools/dpia", label: "DPIA" },
  art50: { href: "/dashboard/tools/art50-kit", label: "Art. 50 Kit" },
  gpai: { href: "/dashboard/tools/gpai", label: "GPAI" },
  transition: { href: "/dashboard/compliance-ops/provider-transition", label: "Cambio di ruolo" },
  prohibited: { href: "/dashboard/triage", label: "Triage — Art. 5" },
} as const;

export function computeObligations(roleAnswers: RoleAnswers, roleResult: RoleResult, risk: RiskResult, riskAnswers: RiskAnswers): ObligationsResult {
  const notes: string[] = [];
  const roles = new Set<Role>(roleResult.roles);
  const out: Obligation[] = [];
  const add = (o: Obligation) => out.push(o);

  const highRisk = isHighRisk(risk.category);
  const annexIII = risk.category === "high_risk_annex_iii";
  const annexI = risk.category === "high_risk_annex_i";
  const annexISectionB = annexI && risk.annexIAct?.section === "B";
  const onlyPoint2 = risk.annexIIIUses.length > 0 && risk.annexIIIUses.every(u => u.point === 2);
  const publicAuthority = roleAnswers.publicStatus === "public_authority";
  const publicService = roleAnswers.publicStatus === "public_service";

  // Art. 25(1): il terzo diventa fornitore se il sistema è (o diventa) ad alto rischio
  if (roleResult.art25Pending.length > 0) {
    if (highRisk) {
      roles.add("provider");
      notes.push(`Per le circostanze dichiarate (${roleResult.art25Pending.map(t => ART25_LABEL[t]).join("; ")}) l'organizzazione è considerata fornitore del sistema ad alto rischio e assume gli obblighi dell'Art. 16 (Art. 25(1)). Per il marchio, fatti salvi accordi contrattuali che ripartiscano diversamente gli obblighi.`);
    } else {
      notes.push("Le circostanze dell'Art. 25(1) rilevano solo per i sistemi ad alto rischio: con la classificazione attuale il ruolo non cambia. Riesaminare se il sistema o la sua finalità cambiano.");
    }
  }

  if (roleResult.preMarketOnly && roles.size === 0) {
    notes.push("Sistema solo in sviluppo o prova: gli obblighi si applicano dall'immissione sul mercato o dalla messa in servizio (Art. 2(8)). Le prove in condizioni reali sono soggette agli Artt. 60-61.");
  }

  if (risk.category === "out_of_scope" || risk.category === "not_ai") {
    notes.push("Nessun obbligo derivante dal regolamento per questo sistema. Conservare la motivazione della valutazione e riesaminarla se cambiano uso o funzionamento.");
    return { roles: [...roles], obligations: out, notes };
  }

  const isProvider = roles.has("provider");
  const isDeployer = roles.has("deployer");

  // ── Tutti: Art. 4 ──
  if (isProvider || isDeployer) {
    add({ id: "art4-literacy", group: "all", role: "all", title: "Alfabetizzazione in materia di IA",
      what: "Adottare misure volte a sostenere lo sviluppo dell'alfabetizzazione in materia di IA di chi usa o gestisce il sistema, tenendo conto di conoscenze, contesto d'uso e persone interessate. Non è richiesto un livello specifico.",
      article: "Art. 4 (testo modificato dal Reg. (UE) 2026/1744)", iso: ["7.2", "7.3", "A.4.6"], appliesFrom: D_FEB_2025, tool: T.literacy, storageKey: "aicomply_literacy_result" });
  }

  // ── Pratiche vietate ──
  if (risk.category === "prohibited") {
    add({ id: "art5-stop", group: "prohibited", role: "all", title: "Interrompere la pratica vietata",
      what: "Il sistema non può essere immesso sul mercato, messo in servizio o usato nella forma attuale. Interromperne l'uso o modificarlo in modo che non ricada più nell'Art. 5.",
      article: `Art. 5(1)(${risk.prohibited.join(", ")})`, iso: ["6.1.2", "A.5.4"],
      appliesFrom: risk.prohibited.every(l => l === "ba" || l === "bb") ? D_DEC_2026 : D_FEB_2025, tool: T.prohibited,
      note: "Sanzione fino a 35 000 000 EUR o al 7 % del fatturato mondiale annuo (Art. 99(3))." });
    return { roles: [...roles], obligations: out, notes };
  }

  // ── Transitorio Art. 111(2) ──
  let hrFrom = annexI ? D_AUG_2028 : D_DEC_2027;
  if (highRisk && riskAnswers.legacyNoSignificantChange) {
    if (publicAuthority) {
      hrFrom = D_AUG_2030;
      notes.push("Sistema immesso sul mercato o in servizio prima della data di applicazione del Capo III e senza modifiche significative: per i sistemi destinati alle autorità pubbliche, fornitori e deployer si conformano comunque entro il 2 agosto 2030 (Art. 111(2)).");
    } else {
      notes.push(`Sistema immesso sul mercato o in servizio prima del ${formatDate(hrFrom)}: gli obblighi per l'alto rischio si applicano solo se da quella data subisce modifiche significative di progettazione (Art. 111(2), come modificato dal Reg. (UE) 2026/1744). Gli obblighi sono mostrati per pianificare l'adeguamento.`);
    }
  }

  // ── Fornitore di sistema ad alto rischio ──
  if (highRisk && isProvider && annexISectionB) {
    notes.push("Allegato I, sezione B: i requisiti per l'alto rischio sono recepiti attraverso la normativa di settore e i relativi atti delegati o di esecuzione (Art. 2(2), Artt. 102-109). Seguire le procedure dell'atto di settore.");
  }
  if (highRisk && isProvider && !annexISectionB) {
    const p = (o: Omit<Obligation, "group" | "role" | "appliesFrom">) => add({ ...o, group: "provider", role: "provider", appliesFrom: hrFrom });
    p({ id: "art9", title: "Sistema di gestione dei rischi", what: "Istituire, documentare e mantenere un processo continuo per identificare, stimare e trattare i rischi per salute, sicurezza e diritti fondamentali lungo tutto il ciclo di vita.",
      article: "Art. 9", iso: ["6.1.2", "6.1.3", "8.2", "8.3"], tool: T.risk, storageKey: "aicomply_risk_manager_result" });
    p({ id: "art10", title: "Dati e governance dei dati", what: "Applicare pratiche di governance ai set di addestramento, convalida e prova: origine, preparazione, rappresentatività, esame e attenuazione delle distorsioni.",
      article: "Art. 10", iso: ["A.7.2", "A.7.3", "A.7.4", "A.7.5", "A.7.6"], tool: T.data, storageKey: "aicomply_data_audit_result" });
    p({ id: "art11", title: "Documentazione tecnica", what: "Redigere prima dell'immissione sul mercato la documentazione tecnica con almeno gli elementi dell'Allegato IV e tenerla aggiornata.",
      article: "Art. 11, Allegato IV", iso: ["7.5", "A.6.2.7"], tool: T.docugen, storageKey: "aicomply_docugen_result" });
    p({ id: "art12", title: "Registrazione automatica degli eventi (log)", what: "Progettare il sistema in modo che registri automaticamente gli eventi rilevanti per tutta la sua durata.",
      article: "Art. 12", iso: ["A.6.2.8"], tool: T.logvault, storageKey: "aicomply_logvault_result" });
    p({ id: "art13", title: "Istruzioni per l'uso ai deployer", what: "Fornire istruzioni chiare con finalità prevista, livello di accuratezza e metriche, limiti, rischi noti, misure di sorveglianza umana, manutenzione e gestione dei log.",
      article: "Art. 13(2)-(3)", iso: ["A.8.2"], tool: T.transparency, storageKey: "aicomply_transparency_result" });
    p({ id: "art14", title: "Progettare la sorveglianza umana", what: "Progettare il sistema perché possa essere supervisionato efficacemente: comprendere limiti, evitare l'eccessivo affidamento, ignorare o ribaltare l'output, arrestarlo in sicurezza.",
      article: "Art. 14", iso: ["A.6.2.2", "A.6.2.3"], tool: T.oversight, storageKey: "aicomply_oversight_result",
      note: risk.annexIIIUses.some(u => u.id === "1a") ? "Identificazione biometrica remota: nessuna decisione senza verifica separata di almeno due persone (Art. 14(5))." : undefined });
    p({ id: "art15", title: "Accuratezza, robustezza e cibersicurezza", what: "Raggiungere livelli adeguati di accuratezza, robustezza e cibersicurezza, dichiarare le metriche nelle istruzioni e proteggere da attacchi specifici dell'IA.",
      article: "Art. 15", iso: ["A.6.2.4"], tool: T.resilience, storageKey: "aicomply_resilience_result" });
    p({ id: "art16b", title: "Identificazione del fornitore", what: "Indicare sul sistema, o su imballaggio o documenti, nome, marchio e indirizzo di contatto.",
      article: "Art. 16(b)", iso: ["A.8.2"] });
    p({ id: "art17", title: "Sistema di gestione della qualità", what: "Documentare politiche, procedure e istruzioni che coprano almeno gli aspetti dell'Art. 17(1)(a)-(m), in proporzione alle dimensioni dell'organizzazione.",
      article: "Art. 17", iso: ["4-10 (sistema di gestione)"], tool: T.qms, storageKey: "aicomply_qms_result" });
    p({ id: "art18-19", title: "Conservazione di documenti e log", what: "Tenere a disposizione delle autorità per 10 anni la documentazione (tecnica, qualità, dichiarazione UE) e conservare i log sotto il proprio controllo per almeno 6 mesi.",
      article: "Artt. 18-19", iso: ["7.5.3"], tool: T.logvault });
    p({ id: "art43", title: "Valutazione della conformità", what: annexI
        ? "Seguire la procedura di valutazione della conformità prevista dalla normativa di settore dell'Allegato I, includendovi i requisiti del capo III, sezione 2 (Art. 43(3))."
        : risk.annexIIIUses.some(u => u.point === 1)
          ? "Biometria (Allegato III, punto 1): controllo interno (Allegato VI) se applicate norme armonizzate o specifiche comuni, altrimenti procedura con organismo notificato (Allegato VII) (Art. 43(1))."
          : "Controllo interno secondo l'Allegato VI, senza organismo notificato (Art. 43(2)).",
      article: "Art. 43", iso: ["9.2"], tool: T.conformity, storageKey: "aicomply_conformity_result" });
    p({ id: "art47-48", title: "Dichiarazione di conformità UE e marcatura CE", what: "Redigere la dichiarazione UE (Allegato V), conservarla 10 anni e apporre la marcatura CE, digitale se il sistema è fornito digitalmente.",
      article: "Artt. 47-48", iso: [], tool: T.conformity });
    if (annexIII) {
      p({ id: "art49-1", title: onlyPoint2 ? "Registrazione a livello nazionale" : "Registrazione nella banca dati UE",
        what: onlyPoint2
          ? "Per i sistemi dell'Allegato III, punto 2 (infrastrutture critiche) la registrazione avviene a livello nazionale (Art. 49(5))."
          : "Prima dell'immissione sul mercato o messa in servizio, registrarsi e registrare il sistema nella banca dati UE con le informazioni dell'Allegato VIII, sezione A (Art. 49(1), Art. 71).",
        article: onlyPoint2 ? "Art. 49(5)" : "Art. 49(1)", iso: [], tool: T.eudb, storageKey: "aicomply_eudb_registration" });
    }
    p({ id: "art72", title: "Monitoraggio successivo all'immissione sul mercato", what: "Istituire e documentare un sistema e un piano di monitoraggio post-market che raccolga e analizzi i dati sulle prestazioni per tutto il ciclo di vita.",
      article: "Art. 72", iso: ["9.1", "A.6.2.6"], tool: T.postMarket });
    p({ id: "art20-73", title: "Misure correttive e segnalazione degli incidenti gravi", what: "Adottare subito misure correttive in caso di non conformità e segnalare gli incidenti gravi all'autorità di vigilanza: entro 15 giorni; 2 giorni per infrazione diffusa o infrastrutture critiche; 10 giorni in caso di decesso.",
      article: "Artt. 20, 73", iso: ["10.2", "A.8.4"], tool: T.postMarket });
    p({ id: "art16l", title: "Requisiti di accessibilità", what: "Garantire la conformità ai requisiti di accessibilità delle direttive (UE) 2016/2102 e 2019/882.",
      article: "Art. 16(l)", iso: [] });
    p({ id: "art25-4", title: "Accordi scritti con i fornitori di componenti", what: "Con i terzi che forniscono sistemi, strumenti, servizi o componenti integrati, precisare per iscritto informazioni, capacità, accesso tecnico e assistenza necessari per adempiere al regolamento.",
      article: "Art. 25(4)", iso: ["A.10.2", "A.10.3"] });
    if (roleAnswers.establishedOutsideEU) {
      p({ id: "art22", title: "Nominare un rappresentante autorizzato nell'UE", what: "Prima di mettere il sistema a disposizione nell'Unione, nominare con mandato scritto un rappresentante autorizzato stabilito nell'UE, con i compiti dell'Art. 22(3).",
        article: "Art. 22", iso: [], tool: T.authRep });
    }
  }

  // ── Fornitore: deroga Art. 6(3) ──
  if (risk.category === "annex_iii_exempt" && isProvider) {
    add({ id: "art6-4", group: "provider", role: "provider", appliesFrom: D_AUG_2026, title: "Documentare la valutazione di non alto rischio",
      what: "Documentare la valutazione prima dell'immissione sul mercato o messa in servizio e fornirla alle autorità su richiesta.",
      article: "Art. 6(4)", iso: ["6.1.4", "7.5"] });
    add({ id: "art49-2", group: "provider", role: "provider", appliesFrom: D_AUG_2026, title: "Registrazione nella banca dati UE",
      what: "Registrarsi e registrare il sistema nella banca dati UE con le informazioni dell'Allegato VIII, sezione B, incluse le condizioni dell'Art. 6(3) invocate.",
      article: "Art. 49(2)", iso: [], tool: T.eudb });
  }

  // ── Deployer di sistema ad alto rischio ──
  if (highRisk && isDeployer) {
    const d = (o: Omit<Obligation, "group" | "role" | "appliesFrom">) => add({ ...o, group: "deployer", role: "deployer", appliesFrom: hrFrom });
    d({ id: "art26-1", title: "Uso conforme alle istruzioni", what: "Adottare misure tecniche e organizzative per usare il sistema secondo le istruzioni per l'uso del fornitore.",
      article: "Art. 26(1)", iso: ["A.9.2", "A.9.4"], tool: T.deployer });
    d({ id: "art26-2", title: "Affidare la sorveglianza umana", what: "Affidare la sorveglianza umana a persone con competenza, formazione e autorità necessarie, e con il supporto necessario.",
      article: "Art. 26(2)", iso: ["5.3", "7.2", "A.3.2"], tool: T.oversight, storageKey: "aicomply_oversight_result" });
    d({ id: "art26-4", title: "Dati di input pertinenti", what: "Se controlla i dati di input, garantire che siano pertinenti e sufficientemente rappresentativi rispetto alla finalità prevista.",
      article: "Art. 26(4)", iso: ["A.7.4"], tool: T.data });
    d({ id: "art26-5", title: "Monitorare il funzionamento", what: "Monitorare il sistema secondo le istruzioni; se presenta un rischio sospenderne l'uso e informare fornitore e autorità; in caso di incidente grave informare subito il fornitore.",
      article: "Art. 26(5)", iso: ["9.1", "A.6.2.6", "A.8.4"], tool: T.postMarket });
    d({ id: "art26-6", title: "Conservare i log", what: "Conservare i log generati automaticamente sotto il proprio controllo per almeno 6 mesi, salvo diversa disposizione.",
      article: "Art. 26(6)", iso: ["A.6.2.8"], tool: T.logvault, storageKey: "aicomply_logvault_result" });
    if (riskAnswers.workplace) {
      d({ id: "art26-7", title: "Informare i lavoratori", what: "Prima di usare il sistema sul luogo di lavoro, informare i rappresentanti dei lavoratori e i lavoratori interessati.",
        article: "Art. 26(7)", iso: ["7.4"] });
    }
    if (publicAuthority && annexIII && !onlyPoint2) {
      d({ id: "art26-8", title: "Registrare l'uso nella banca dati UE", what: "Come autorità pubblica, registrarsi, selezionare il sistema e registrarne l'uso nella banca dati UE prima di utilizzarlo; non usarlo se il fornitore non l'ha registrato.",
        article: "Artt. 26(8), 49(3)", iso: [], tool: T.eudb });
    }
    if (riskAnswers.personalData) {
      d({ id: "art26-9", title: "Valutazione d'impatto sulla protezione dei dati", what: "Usare le informazioni fornite ai sensi dell'Art. 13 per effettuare la DPIA (Art. 35 GDPR).",
        article: "Art. 26(9)", iso: ["6.1.4", "A.5.2"], tool: T.dpia, storageKey: "aicomply_dpia_result" });
    }
    if (annexIII && riskAnswers.decisionsOnPersons) {
      d({ id: "art26-11", title: "Informare le persone interessate", what: "Informare le persone fisiche che sono soggette all'uso del sistema quando adotta decisioni o aiuta ad adottarle nei loro confronti.",
        article: "Art. 26(11)", iso: ["A.8.5"], tool: T.transparency });
      if (!onlyPoint2) {
        d({ id: "art86", title: "Spiegazione delle singole decisioni", what: "Su richiesta, fornire spiegazioni chiare e significative sul ruolo del sistema nella decisione e sui suoi elementi principali, quando la decisione ha effetti giuridici o incide significativamente sulla persona.",
          article: "Art. 86", iso: ["A.8.5"] });
      }
    }
    const friaBySector = risk.annexIIIUses.some(u => u.id === "5b" || u.id === "5c");
    if (annexIII && !onlyPoint2 && (publicAuthority || publicService || friaBySector)) {
      d({ id: "art27", title: "Valutazione d'impatto sui diritti fondamentali (FRIA)", what: "Prima del primo uso, valutare l'impatto sui diritti fondamentali con gli elementi dell'Art. 27(1)(a)-(f) e notificarne i risultati all'autorità di vigilanza del mercato.",
        article: "Art. 27", iso: ["6.1.4", "8.4", "A.5.2", "A.5.3", "A.5.4", "A.5.5"], tool: T.fria, storageKey: "aicomply_fria_result" });
    }
  }

  // ── Importatore / distributore ──
  if (highRisk && roles.has("importer")) {
    add({ id: "art23", group: "importer", role: "importer", appliesFrom: hrFrom, title: "Verifiche prima dell'immissione sul mercato",
      what: "Verificare valutazione della conformità, documentazione tecnica, marcatura CE, dichiarazione UE, istruzioni e rappresentante autorizzato; indicare il proprio nome; conservare i documenti per 10 anni.",
      article: "Art. 23", iso: ["A.10.3"] });
  }
  if (highRisk && roles.has("distributor")) {
    add({ id: "art24", group: "distributor", role: "distributor", appliesFrom: hrFrom, title: "Verifiche prima della messa a disposizione",
      what: "Verificare marcatura CE, dichiarazione UE e istruzioni per l'uso; non mettere a disposizione sistemi non conformi; cooperare con le autorità.",
      article: "Art. 24", iso: ["A.10.3"] });
  }

  // ── Art. 50 ──
  const t = (o: Omit<Obligation, "group" | "appliesFrom" | "iso" | "tool">) => add({ ...o, group: "transparency", appliesFrom: D_AUG_2026, iso: o.role === "provider" ? ["A.8.2"] : ["A.8.5"], tool: T.art50 });
  if (risk.art50.includes("50_1") && isProvider) t({ id: "art50-1", role: "provider", title: "Avvisare che si interagisce con un'IA",
    what: "Progettare il sistema perché le persone siano informate che stanno interagendo con un'IA, salvo che sia evidente dal contesto, al più tardi alla prima interazione.", article: "Art. 50(1), (5)" });
  if (risk.art50.includes("50_2") && isProvider) {
    add({ id: "art50-2", role: "provider", group: "transparency", iso: ["A.8.2"], tool: T.art50,
      appliesFrom: riskAnswers.syntheticPlacedBeforeAug2026 ? D_DEC_2026 : D_AUG_2026, title: "Marcare i contenuti generati",
      what: "Marcare gli output audio, immagine, video o testo sintetici in formato leggibile meccanicamente e rilevabili come generati o manipolati artificialmente.",
      article: riskAnswers.syntheticPlacedBeforeAug2026 ? "Art. 50(2); Art. 111(4)" : "Art. 50(2)" });
  }
  if (risk.art50.includes("50_3") && isDeployer) t({ id: "art50-3", role: "deployer", title: "Informare su riconoscimento emozioni o categorizzazione biometrica",
    what: "Informare le persone esposte del funzionamento del sistema e trattare i dati nel rispetto del GDPR.", article: "Art. 50(3), (5)" });
  if (risk.art50.includes("50_4_deepfake") && isDeployer) t({ id: "art50-4-df", role: "deployer", title: "Dichiarare i deep fake",
    what: "Rendere noto che immagini, audio o video sono stati generati o manipolati artificialmente; per opere manifestamente artistiche, creative o satiriche basta rivelarne l'esistenza senza ostacolarne la fruizione.", article: "Art. 50(4), primo comma" });
  if (risk.art50.includes("50_4_text") && isDeployer) t({ id: "art50-4-txt", role: "deployer", title: "Dichiarare i testi generati di interesse pubblico",
    what: "Rendere noto che il testo pubblicato per informare il pubblico su questioni di interesse pubblico è stato generato o manipolato artificialmente.", article: "Art. 50(4), secondo comma" });

  // ── Capo V: fornitori di modelli GPAI ──
  if (risk.gpai) {
    const gFrom = riskAnswers.gpaiPlacedBeforeAug2025 ? D_AUG_2027 : D_AUG_2025;
    if (riskAnswers.gpaiPlacedBeforeAug2025) notes.push("Modello GPAI immesso sul mercato prima del 2 agosto 2025: adeguamento entro il 2 agosto 2027 (Art. 111(3)).");
    const openExempt = riskAnswers.gpaiOpenWeights === true && !risk.gpaiSystemic;
    const g = (o: Omit<Obligation, "group" | "role" | "appliesFrom" | "tool">) => add({ ...o, group: "gpai", role: "provider", appliesFrom: gFrom, tool: T.gpai });
    if (!openExempt) {
      g({ id: "art53-a", title: "Documentazione tecnica del modello", what: "Redigere e aggiornare la documentazione tecnica con almeno gli elementi dell'Allegato XI, da fornire su richiesta all'ufficio per l'IA e alle autorità.", article: "Art. 53(1)(a)", iso: ["A.6.2.7"] });
      g({ id: "art53-b", title: "Informazioni ai fornitori a valle", what: "Mettere a disposizione dei fornitori che integrano il modello le informazioni dell'Allegato XII.", article: "Art. 53(1)(b)", iso: ["A.8.2", "A.10.4"] });
    } else {
      notes.push("Modello con licenza libera e open source e pesi pubblici, senza rischio sistemico: esonerato dall'Art. 53(1)(a)-(b) e dall'Art. 54 (Art. 53(2), Art. 54(6)).");
    }
    g({ id: "art53-c", title: "Politica sul diritto d'autore", what: "Attuare una politica per rispettare il diritto d'autore e, in particolare, la riserva dei diritti espressa ai sensi dell'Art. 4(3) della direttiva (UE) 2019/790.", article: "Art. 53(1)(c)", iso: ["A.7.3"] });
    g({ id: "art53-d", title: "Sintesi dei contenuti di addestramento", what: "Pubblicare una sintesi sufficientemente dettagliata dei contenuti usati per l'addestramento, secondo il modello dell'ufficio per l'IA.", article: "Art. 53(1)(d)", iso: ["A.7.5"] });
    if (roleAnswers.establishedOutsideEU && !openExempt) {
      g({ id: "art54", title: "Rappresentante autorizzato per il modello", what: "Prima di immettere il modello sul mercato dell'Unione, nominare con mandato scritto un rappresentante autorizzato stabilito nell'UE.", article: "Art. 54", iso: [] });
    }
    if (risk.gpaiSystemic) {
      g({ id: "art52", title: "Notifica alla Commissione", what: "Informare la Commissione senza ritardo e comunque entro due settimane dal superamento della soglia o da quando si sa che sarà superata.", article: "Art. 52(1)", iso: [] });
      g({ id: "art55", title: "Obblighi per il rischio sistemico", what: "Valutare il modello anche con test contraddittorio, valutare e attenuare i rischi sistemici, segnalare gli incidenti gravi all'ufficio per l'IA, garantire la cibersicurezza.", article: "Art. 55(1)(a)-(d)", iso: ["6.1.2", "A.6.2.4", "A.8.4"] });
    }
  }

  if (risk.category === "minimal" && out.length <= 1) {
    notes.push("Facoltativo: adesione a codici di condotta per l'applicazione volontaria di requisiti (Art. 95).");
  }
  if (risk.aiDefinitionUncertain) {
    notes.push("Da confermare: se il sistema non ha capacità inferenziale non è un sistema di IA e gli obblighi non si applicano (Art. 3(1)).");
  }

  return { roles: [...roles], obligations: out, notes };
}

// ─── Tool necessari per l'insieme dei sistemi (menu e riquadro dei tool) ──────

/** Tool di supporto che servono quando serve il tool principale indicato */
const TOOL_COMPANIONS: Record<string, string[]> = {
  [T.postMarket.href]: ["/dashboard/tools/drift-monitor"],
};

export interface ToolNeed {
  href: string;
  /** Sistemi per cui il tool serve */
  systems: string[];
  /** Articoli degli obblighi coperti dal tool */
  articles: string[];
  /** Ruoli che devono adempiere */
  roles: Role[];
}

export interface ToolNeeds {
  /** Sistemi con classificazione guidata completata */
  assessed: number;
  /** Ruoli effettivi su tutti i sistemi classificati */
  roles: Role[];
  tools: Record<string, ToolNeed>;
}

export function toolNeeds(systems: { name: string; roleAnswers?: RoleAnswers; riskAnswers?: RiskAnswers }[]): ToolNeeds {
  const tools: Record<string, ToolNeed> = {};
  const roles = new Set<Role>();
  let assessed = 0;
  const mark = (href: string, system: string, article: string | null, role: Role | null) => {
    const n = tools[href] ??= { href, systems: [], articles: [], roles: [] };
    if (!n.systems.includes(system)) n.systems.push(system);
    if (article && !n.articles.includes(article)) n.articles.push(article);
    if (role && !n.roles.includes(role)) n.roles.push(role);
  };
  for (const s of systems) {
    if (!s.roleAnswers || !s.riskAnswers) continue;
    assessed++;
    const rr = determineRoles(s.roleAnswers);
    const risk = assessRisk(s.riskAnswers);
    const res = computeObligations(s.roleAnswers, rr, risk, s.riskAnswers);
    res.roles.forEach(r => roles.add(r));
    for (const o of res.obligations) {
      if (!o.tool) continue;
      const role = o.role === "all" ? null : o.role;
      mark(o.tool.href, s.name, o.article, role);
      for (const c of TOOL_COMPANIONS[o.tool.href] ?? []) mark(c, s.name, o.article, role);
    }
    if (rr.art25Pending.length > 0 || (s.roleAnswers.art25?.length ?? 0) > 0) mark(T.transition.href, s.name, "Art. 25", "provider");
  }
  return { assessed, roles: [...roles], tools };
}

export const ART25_LABEL: Record<Art25Trigger, string> = {
  own_brand: "nome o marchio proprio apposto sul sistema (Art. 25(1)(a))",
  substantial_modification: "modifica sostanziale (Art. 25(1)(b))",
  purpose_change: "modifica della finalità prevista (Art. 25(1)(c))",
};

// ─── Compatibilità con il modello AISystem esistente ──────────────────────────

/** Tier legacy usato dal resto dell'app */
export function legacyTier(r: RiskResult): "prohibited" | "high_risk" | "limited" | "minimal" | "gpai" | "gpai_systemic" {
  if (r.category === "prohibited") return "prohibited";
  if (isHighRisk(r.category)) return "high_risk";
  if (r.art50.length > 0) return "limited";
  if (r.gpaiSystemic) return "gpai_systemic";
  if (r.gpai) return "gpai";
  return "minimal";
}

/** Ruolo principale legacy (il fornitore prevale perché ha più obblighi) */
export function legacyRole(roles: Role[]): Role | null {
  for (const r of ["provider", "deployer", "importer", "distributor"] as Role[]) if (roles.includes(r)) return r;
  return null;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  return `${d} ${months[m - 1]} ${y}`;
}
