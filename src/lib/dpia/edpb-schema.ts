// ─── EDPB DPIA Template 2026 — modello dati ───────────────────────────────────
// Struttura conforme al "Template [2026] for Data Protection Impact Assessment
// ('DPIA')" dell'EDPB (v1.0, adottato 10 marzo 2026) e al relativo Explainer.
// Ogni sezione 0→6 del template è rappresentata qui. La UI viene costruita a
// tappe; il modello è completo fin dalla Tappa 1 così le tappe successive
// aggiungono solo interfaccia.

export type MeasureStatus = "planned" | "partial" | "implemented";
export type RiskLevel = "low" | "medium" | "high";
export type DpiaDecision =
  | ""
  | "abandon"        // (a) abbandonare il trattamento
  | "consult_sa"     // (b) consultare l'autorità di controllo
  | "proceed"        // (c) procedere come pianificato
  | "conditional";   // (d) procedere con condizioni

// 0.1 / 0.2 — Titolari, Responsabili e sub-responsabili
export interface EdpbParty {
  id: string;
  name: string;        // denominazione
  role: string;        // ruolo (titolare, contitolare, responsabile, sub-responsabile)
  contact: string;     // contatti (unità, stabilimento, rappresentante, DPO…)
  obligations: string; // obblighi e compiti
}

// 0.5 — Team che conduce la DPIA (matrice RACI opzionale)
export interface EdpbTeamMember {
  id: string;
  name: string;
  role: string;
  raci: string; // R / A / C / I
}

// 1.1.2 + 2.1.1 — Finalità con relativa base giuridica
export interface EdpbPurpose {
  id: string;
  purpose: string;    // finalità specifica ed esplicita
  legalBasis: string; // base giuridica (Art. 6 / Art. 9 GDPR)
}

// 1.3 — Asset di supporto (inventario)
export interface EdpbAsset {
  id: string;
  name: string;
  group: string;       // modulo logico / layer tecnico / funzione
  type: string;        // hardware, software, personale, sito, organizzativo…
  description: string; // cosa contiene e come si collega al trattamento
}

// 2.3 — Misure a supporto della conformità (con stato di implementazione)
export interface EdpbMeasure {
  id: string;
  description: string;
  status: MeasureStatus;
}

// 4.1.3 — Rischi inerenti
export interface EdpbRisk {
  id: string;
  scenario: string;      // evento (materializzazione della minaccia) e conseguenze
  threat: string;        // minaccia
  riskSource: string;    // sorgente di rischio
  impact: string;        // impatto su diritti e libertà
  likelihood: RiskLevel; // verosimiglianza
  severity: RiskLevel;   // gravità
  modulating: string;    // fattori modulanti (aggravanti / mitiganti)
  acceptable: boolean;   // accettabile senza ulteriori mitigazioni?
}

// 4.2.1 — Misure di mitigazione aggiuntive
export interface EdpbMitigation {
  id: string;
  description: string;
  status: MeasureStatus;
  targetsRisk: string;   // rischio/i mitigati (riferimento)
}

export interface DpiaEdpbDoc {
  schemaVersion: 1;

  // ── 0. OVERVIEW DEL TRATTAMENTO ──────────────────────────────────────────
  controllers: EdpbParty[];            // 0.1
  processors: EdpbParty[];             // 0.2
  processingName: string;              // 0.3 nome interno del trattamento
  processingVersion: string;           // 0.3 versione / storico
  launchDate: string;                  // 0.4 data di avvio stimata
  endDate: string;                     // 0.4 data di fine / condizioni di scadenza
  // 0.5 scheda tecnica DPIA
  templateVersion: string;             // versione del template DPIA
  versionLog: string;                  // log delle modifiche
  team: EdpbTeamMember[];              // team + RACI
  references: string;                  // linee guida, standard, codici, materiali
  reasons: {                           // motivi per condurre la DPIA (più selezioni)
    mandatory: boolean;
    art35_3a: boolean;                 // valutazione sistematica/automatizzata
    art35_3b: boolean;                 // trattamento su larga scala categorie particolari
    art35_3c: boolean;                 // monitoraggio sistematico area accessibile al pubblico
    beneficial: boolean;               // ritenuta necessaria/utile dal titolare
    other: string;                     // altro (testo libero)
  };
  scope: string;                       // ambito della DPIA (cosa dentro/fuori e perché)
  completionDate: string;              // data di completamento
  validationDate: string;              // data di validazione formale
  publication: string;                 // intento di pubblicazione/condivisione

  // ── 1. DESCRIZIONE SISTEMATICA ───────────────────────────────────────────
  personalData: string;                // 1.1.1 dati personali trattati
  specialCategories: string;           // 1.1.1 categorie particolari
  purposes: EdpbPurpose[];            // 1.1.2 finalità (+ base giuridica)
  secondaryUses: string;               // 1.1.3 usi secondari o compatibili
  nature: string;                      // 1.1.4 natura del trattamento
  scopeDesc: string;                   // 1.1.4 ambito (volume, portata, frequenza)
  context: string;                     // 1.1.4 contesto (soggetti vulnerabili, transfrontaliero…)
  functionalDescription: string;       // 1.2 descrizione funzionale (fasi)
  lifecycle: {                         // 1.2 ciclo di vita dei dati
    collection: string;
    use: string;
    storage: string;
    sharing: string;
    deletion: string;
  };
  assets: EdpbAsset[];                // 1.3 mezzi e asset di supporto
  architecture: string;                // 1.3 architettura sottostante
  codesOfConduct: string;              // 1.4 codici di condotta approvati

  // ── 2. ANALISI DEL TRATTAMENTO ───────────────────────────────────────────
  legalBasisAnalysis: string;          // 2.1.1 analisi della base giuridica per ciascuna finalità
  liftProhibition: string;             // 2.1.2 motivi per revocare il divieto (categorie particolari)
  minimisationRetention: string;       // 2.2.1 minimizzazione, destinatari, periodi di conservazione
  dataQuality: string;                 // 2.2.2 qualità dei dati
  measuresArt5: EdpbMeasure[];        // 2.3.1 principi Art. 5(1)(a-f)
  measuresRights: EdpbMeasure[];      // 2.3.2 diritti degli interessati
  measuresOther: EdpbMeasure[];       // 2.3.3 altri obblighi GDPR (consenso, Art. 28, trasferimenti)
  measuresDpbdd: EdpbMeasure[];       // 2.3.4 privacy by design/default (Art. 25)
  measuresSecurity: EdpbMeasure[];    // 2.3.5 sicurezza (Art. 32)

  // ── 3. NECESSITÀ E PROPORZIONALITÀ ───────────────────────────────────────
  impactsRightsFreedoms: string;       // 3.1 impatti su diritti e libertà (rischio inerente strutturale)
  necessity: string;                   // 3.2 valutazione di necessità
  proportionality: string;             // 3.3 valutazione di proporzionalità

  // ── 4. VALUTAZIONE E GESTIONE DEL RISCHIO ────────────────────────────────
  eventImpacts: string;                // 4.1.1 impatti da eventi accidentali/illeciti/anomali
  riskMethod: string;                  // 4.1.2 metodo (scale, metriche, soglie di accettazione)
  risks: EdpbRisk[];                  // 4.1.3 rischi inerenti
  mitigations: EdpbMitigation[];      // 4.2.1 misure di mitigazione aggiuntive
  residualRisk: string;                // 4.2.2 rischio residuo
  actionPlan: string;                  // 4.2.3 piano (responsabili, tempistiche, monitoraggio)

  // ── 5. COINVOLGIMENTO PARTI INTERESSATE ──────────────────────────────────
  dpoAdvice: string;                   // 5.1 parere del DPO
  dpoFollowUp: string;                 // 5.1 azioni intraprese a seguito del parere
  dataSubjectsViews: string;           // 5.2 opinione degli interessati
  dataSubjectsParticipation: string;   // 5.2 spiegazione della partecipazione

  // ── 6. CONCLUSIONE E DECISIONE ───────────────────────────────────────────
  decision: DpiaDecision;              // 6 decisione sulla viabilità
  decisionConditions: string;          // 6 condizioni (se procedere con condizioni)
  decisionJustification: string;       // 6 motivazione (facoltativa)

  updatedAt: string;
}

const pid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`;

export function emptyParty(): EdpbParty {
  return { id: pid(), name: "", role: "", contact: "", obligations: "" };
}
export function emptyTeamMember(): EdpbTeamMember {
  return { id: pid(), name: "", role: "", raci: "" };
}
export function emptyPurpose(): EdpbPurpose {
  return { id: pid(), purpose: "", legalBasis: "" };
}
export function emptyAsset(): EdpbAsset {
  return { id: pid(), name: "", group: "", type: "", description: "" };
}
export function emptyMeasure(): EdpbMeasure {
  return { id: pid(), description: "", status: "planned" };
}
export function emptyRisk(): EdpbRisk {
  return { id: pid(), scenario: "", threat: "", riskSource: "", impact: "", likelihood: "medium", severity: "medium", modulating: "", acceptable: false };
}
export function emptyMitigation(): EdpbMitigation {
  return { id: pid(), description: "", status: "planned", targetsRisk: "" };
}

export function createEmptyDpiaEdpb(): DpiaEdpbDoc {
  return {
    schemaVersion: 1,
    controllers: [emptyParty()],
    processors: [],
    processingName: "",
    processingVersion: "",
    launchDate: "",
    endDate: "",
    templateVersion: "EDPB 2026 v1.0",
    versionLog: "",
    team: [],
    references: "",
    reasons: { mandatory: false, art35_3a: false, art35_3b: false, art35_3c: false, beneficial: false, other: "" },
    scope: "",
    completionDate: "",
    validationDate: "",
    publication: "",
    personalData: "",
    specialCategories: "",
    purposes: [emptyPurpose()],
    secondaryUses: "",
    nature: "",
    scopeDesc: "",
    context: "",
    functionalDescription: "",
    lifecycle: { collection: "", use: "", storage: "", sharing: "", deletion: "" },
    assets: [],
    architecture: "",
    codesOfConduct: "",
    legalBasisAnalysis: "",
    liftProhibition: "",
    minimisationRetention: "",
    dataQuality: "",
    measuresArt5: [],
    measuresRights: [],
    measuresOther: [],
    measuresDpbdd: [],
    measuresSecurity: [],
    impactsRightsFreedoms: "",
    necessity: "",
    proportionality: "",
    eventImpacts: "",
    riskMethod: "",
    risks: [],
    mitigations: [],
    residualRisk: "",
    actionPlan: "",
    dpoAdvice: "",
    dpoFollowUp: "",
    dataSubjectsViews: "",
    dataSubjectsParticipation: "",
    decision: "",
    decisionConditions: "",
    decisionJustification: "",
    updatedAt: new Date().toISOString(),
  };
}

// Le 7 sezioni per il navigatore della UI.
export const EDPB_SECTIONS = [
  { id: 0, key: "sec0" },
  { id: 1, key: "sec1" },
  { id: 2, key: "sec2" },
  { id: 3, key: "sec3" },
  { id: 4, key: "sec4" },
  { id: 5, key: "sec5" },
  { id: 6, key: "sec6" },
] as const;
