// EUDB — precompilazione dai dati degli altri moduli.
// Art. 49 Reg. (UE) 2024/1689: (1) fornitore di sistema ad alto rischio dell'Allegato III (escluso il punto 2);
// (2) fornitore che ha concluso che un sistema dell'Allegato III non è ad alto rischio (Art. 6(3));
// (3) deployer autorità pubblica / istituzione dell'Unione o per loro conto. I modelli GPAI non si registrano qui.

import { loadInventory } from "@/lib/inventory/ai-system";
import { referenceSystem } from "@/lib/inventory/classifier-bridge";
import { determineRoles, assessRisk } from "@/lib/obligations/engine";
import { AR_RECORD_KEY } from "@/lib/authorized-rep/authorized-rep-types";

export type EligibilityAnswer = "yes" | "no" | "unsure" | "";

export interface EUDBEligibility {
  q1_high_risk: EligibilityAnswer;
  q2_is_provider: EligibilityAnswer;
  q3_public_deployer: EligibilityAnswer;
  /** Storicamente "GPAI sistemico"; ora: fornitore che invoca la deroga dell'Art. 6(3) (Art. 49(2)). */
  q4_gpai_systemic: EligibilityAnswer;
}

export interface EUDBProviderData {
  provider_name: string;
  provider_address: string;
  provider_country: string;
  contact_email: string;
  contact_phone: string;
  contact_name: string;
  has_authorized_rep: boolean;
  ar_name: string;
  ar_address: string;
  ar_country: string;
  ar_email: string;
}

export interface EUDBSystemData {
  system_name: string;
  system_version: string;
  intended_purpose: string;
  registration_status: "new" | "update" | "withdrawal";
  member_states: string[];
  risk_classification: string;
  annex_reference: string;
  conformity_declaration_number: string;
  instructions_url: string;
  /** Non richiesto dall'Allegato VIII: riferimento interno. */
  technical_doc_url: string;
  notified_body_certificate: string;
  /** Allegato VIII, sezione A, punto 13: indirizzo internet per ulteriori informazioni (facoltativo). */
  info_url?: string;
}

export interface EUDBDoc {
  eligibility: EUDBEligibility;
  provider: EUDBProviderData;
  system: EUDBSystemData;
  eudb_registration_number?: string;
  updatedAt: string;
  prefillSources: {
    eligibility: "triage" | "manual";
    provider: "ai_inventory" | "manual";
    system: "risk_manager_docugen" | "manual";
  };
  aiConfirmed: boolean;
}

export const EUDB_DRAFT_KEY = "aicomply_eudb_draft_v2";

export const EU_MEMBER_STATES = [
  "Tutti gli Stati Membri UE",
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca",
  "Estonia", "Finlandia", "Francia", "Germania", "Grecia", "Irlanda",
  "Italia", "Lettonia", "Lituania", "Lussemburgo", "Malta", "Paesi Bassi",
  "Polonia", "Portogallo", "Repubblica Ceca", "Romania", "Slovacchia",
  "Slovenia", "Spagna", "Svezia", "Ungheria",
];

export const EU_COUNTRIES = [
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca",
  "Estonia", "Finlandia", "Francia", "Germania", "Grecia", "Irlanda",
  "Italia", "Lettonia", "Lituania", "Lussemburgo", "Malta", "Paesi Bassi",
  "Polonia", "Portogallo", "Repubblica Ceca", "Romania", "Slovacchia",
  "Slovenia", "Spagna", "Svezia", "Ungheria",
  "Norvegia (SEE)", "Islanda (SEE)", "Liechtenstein (SEE)", "Svizzera", "Altro",
];

// Art. 49(1)-(2): si registrano i sistemi dell'Allegato III (esclusi i prodotti del solo Allegato I).
export const RISK_CLASSIFICATIONS = [
  "Sistema ad alto rischio — Annex III (Art. 6(2))",
  "Deroga Art. 6(3) — registrazione Art. 49(2)",
  "Sistema ad alto rischio — Annex I + Annex III",
];

export function createEmptyDoc(): EUDBDoc {
  return {
    eligibility: { q1_high_risk: "", q2_is_provider: "", q3_public_deployer: "", q4_gpai_systemic: "" },
    provider: {
      provider_name: "", provider_address: "", provider_country: "Italia",
      contact_email: "", contact_phone: "", contact_name: "",
      has_authorized_rep: false, ar_name: "", ar_address: "", ar_country: "", ar_email: "",
    },
    system: {
      system_name: "", system_version: "", intended_purpose: "",
      registration_status: "new", member_states: [],
      risk_classification: "", annex_reference: "",
      conformity_declaration_number: "", instructions_url: "",
      technical_doc_url: "", notified_body_certificate: "",
    },
    eudb_registration_number: undefined,
    updatedAt: new Date().toISOString(),
    prefillSources: { eligibility: "manual", provider: "manual", system: "manual" },
    aiConfirmed: false,
  };
}

export function loadEUDBDraft(): EUDBDoc {
  if (typeof window === "undefined") return createEmptyDoc();
  try {
    const raw = localStorage.getItem(EUDB_DRAFT_KEY);
    if (!raw) return createEmptyDoc();
    const parsed = JSON.parse(raw) as EUDBDoc;
    // ensure prefillSources exists (backward compat)
    if (!parsed.prefillSources) {
      parsed.prefillSources = { eligibility: "manual", provider: "manual", system: "manual" };
    }
    return parsed;
  } catch { return createEmptyDoc(); }
}

export function saveEUDBDraft(doc: EUDBDoc): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EUDB_DRAFT_KEY, JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }));
}

export function eligibilityStatus(e: EUDBEligibility): "required" | "not_required" | "unsure" | "incomplete" {
  const answers = [e.q1_high_risk, e.q2_is_provider, e.q3_public_deployer, e.q4_gpai_systemic];
  if (answers.some(a => a === "")) return "incomplete";
  if (answers.some(a => a === "unsure")) return "unsure";
  if ((e.q1_high_risk === "yes" && e.q2_is_provider === "yes") ||
    e.q3_public_deployer === "yes" ||
    e.q4_gpai_systemic === "yes") return "required";
  return "not_required";
}

/** Intestazioni delle tre parti dell'export (usate dalla pagina EUDB per suddividere l'anteprima). */
export const ANNEX_VIII_PARTS = {
  provider: "PARTE 1",
  system: "PARTE 2",
  documents: "PARTE 3",
} as const;

export function generateAnnexVIII(doc: EUDBDoc): string {
  const p = doc.provider;
  const s = doc.system;
  // Art. 49(2): sistemi dell'Allegato III ritenuti non ad alto rischio (Art. 6(3)) → Allegato VIII, sezione B
  const derogation = s.risk_classification.includes("6(3)");
  const sec = derogation ? "B" : "A";
  const pt = (a: string, b?: string) => derogation ? (b ? `[sez. B, punto ${b}]` : "[non richiesto in sez. B]") : `[sez. A, punto ${a}]`;
  const regStatusLabel =
    s.registration_status === "new" ? "Prima registrazione" :
    s.registration_status === "update" ? "Aggiornamento" : "Ritiro dal mercato";
  const systemStatus = s.registration_status === "withdrawal"
    ? "non più immesso sul mercato / in servizio (o richiamato)"
    : "[DA INDICARE: sul mercato o in servizio]";
  const documents = derogation
    ? `Per i sistemi registrati a norma dell'Art. 49(2) l'Allegato VIII, sezione B, non richiede certificato,
dichiarazione di conformità UE né istruzioni per l'uso. Indicare invece la o le condizioni dell'Art. 6(3)
sulla base delle quali il sistema non è ritenuto ad alto rischio [sez. B, punto 6].
(I punti 7 e 9 della sezione B sono soppressi dal Reg. (UE) 2026/1744.)`
    : `Certificato dell'organismo notificato (tipo, numero, scadenza, nome o numero dell'organismo) ${pt("8")}: ${s.notified_body_certificate || "Non applicabile"}
Copia scannerizzata del certificato ${pt("9")}: ${s.notified_body_certificate ? "[DA ALLEGARE]" : "Non applicabile"}
Copia della dichiarazione di conformità UE (Art. 47) ${pt("11")}: ${s.conformity_declaration_number ? `[DA ALLEGARE] — rif. ${s.conformity_declaration_number}` : "[DA ALLEGARE]"}
Istruzioni per l'uso in formato elettronico ${pt("12")}: ${s.instructions_url || "[DA INSERIRE]"}
Indirizzo internet per ulteriori informazioni (facoltativo) ${pt("13")}: ${s.info_url || "—"}
URL documentazione tecnica (riferimento interno, non richiesto dall'Allegato VIII): ${s.technical_doc_url || "—"}`;

  return `ALLEGATO VIII, SEZIONE ${sec} — INFORMAZIONI PER LA REGISTRAZIONE NELLA BANCA DATI UE (Art. 49(${derogation ? "2" : "1"}))
Regolamento (UE) 2024/1689 — Generato da RegulaeOS il ${new Date().toLocaleDateString("it-IT")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ANNEX_VIII_PARTS.provider} — FORNITORE E RAPPRESENTANTE AUTORIZZATO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fornitore ${pt("1", "1")}: ${p.provider_name || "[DA INSERIRE]"}
Indirizzo: ${p.provider_address || "[DA INSERIRE]"}, ${p.provider_country || "[DA INSERIRE]"}
Dati di contatto: ${p.contact_name || "[DA INSERIRE]"} | ${p.contact_email || "[DA INSERIRE]"} | ${p.contact_phone || "[DA INSERIRE]"}
${p.has_authorized_rep
  ? `\nRappresentante autorizzato ${pt("3", "3")}: ${p.ar_name || "[DA INSERIRE]"}\nIndirizzo: ${p.ar_address || "[DA INSERIRE]"}, ${p.ar_country || "[DA INSERIRE]"}\nEmail: ${p.ar_email || "[DA INSERIRE]"}`
  : `Rappresentante autorizzato ${pt("3", "3")}: non applicabile (fornitore stabilito nell'UE)`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ANNEX_VIII_PARTS.system} — SISTEMA DI IA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Denominazione commerciale ${pt("4", "4")}: ${s.system_name || "[DA INSERIRE]"} — Versione ${s.system_version || "[DA INSERIRE]"}
Finalità prevista ${pt("5", "5")}: ${s.intended_purpose || "[DA INSERIRE]"}
Status del sistema ${pt("7", "8")}: ${systemStatus}
Stati membri ${pt("10")}: ${s.member_states.length > 0 ? s.member_states.join(", ") : "[DA INSERIRE]"}
Tipo di operazione: ${regStatusLabel}
Classificazione (riferimento interno): ${s.risk_classification || "[DA INSERIRE]"}
Caso d'uso dell'Allegato III: ${s.annex_reference || "[DA INSERIRE]"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ANNEX_VIII_PARTS.documents} — CERTIFICATI, DICHIARAZIONE E ISTRUZIONI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${documents}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUMERO REGISTRAZIONE EUDB (dopo upload)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${doc.eudb_registration_number || "[INSERIRE DOPO REGISTRAZIONE SUL PORTALE EC]"}`.trim();
}

export interface PrefillResult {
  eligibility: Partial<EUDBEligibility>;
  provider: Partial<EUDBProviderData>;
  system: Partial<EUDBSystemData>;
  sources: EUDBDoc["prefillSources"];
  missingFields: string[];
  prefillCount: number;
}

export function prefillEUDBFromModules(): PrefillResult {
  if (typeof window === "undefined") {
    return {
      eligibility: {}, provider: {}, system: {},
      sources: { eligibility: "manual", provider: "manual", system: "manual" },
      missingFields: [], prefillCount: 0,
    };
  }

  const eligibility: Partial<EUDBEligibility> = {};
  const provider: Partial<EUDBProviderData> = {};
  const system: Partial<EUDBSystemData> = {};
  const missingFields: string[] = [];
  let prefillCount = 0;
  const sources: EUDBDoc["prefillSources"] = {
    eligibility: "manual", provider: "manual", system: "manual",
  };

  // ── Step 1: idoneità dal sistema valutato nell'inventario (Passi 2-3) ──
  try {
    const sys = referenceSystem(loadInventory());
    if (sys?.roleAnswers && sys.riskAnswers) {
      const roles = determineRoles(sys.roleAnswers).roles;
      const risk = assessRisk(sys.riskAnswers);
      const onlyPoint2 = risk.annexIIIUses.length > 0 && risk.annexIIIUses.every(u => u.point === 2);
      eligibility.q1_high_risk = risk.category === "high_risk_annex_iii" && !onlyPoint2 ? "yes" : "no";
      eligibility.q2_is_provider = roles.includes("provider") ? "yes" : "no";
      eligibility.q3_public_deployer = roles.includes("deployer") && sys.roleAnswers.publicStatus === "public_authority"
        && risk.category === "high_risk_annex_iii" && !onlyPoint2 ? "yes" : "no";
      eligibility.q4_gpai_systemic = risk.category === "annex_iii_exempt" && roles.includes("provider") ? "yes" : "no";
      prefillCount += 4;
      sources.eligibility = "triage";
      if (sys.name && !system.system_name) { system.system_name = sys.name; prefillCount++; }
    } else {
      missingFields.push("Q1-Q4 (sistema non ancora valutato nell'inventario)");
    }
  } catch { /* silent */ }

  // ── Step 2: Provider from AI Inventory / OrgProfile ──
  try {
    const orgRaw = localStorage.getItem("aicomply_org_profile") ??
      localStorage.getItem("aicomply_org_settings");
    if (orgRaw) {
      const org = JSON.parse(orgRaw);
      if (org.name && !provider.provider_name) { provider.provider_name = org.name; prefillCount++; }
      if (org.address && !provider.provider_address) { provider.provider_address = org.address; prefillCount++; }
      if (org.country && !provider.provider_country) { provider.provider_country = org.country; prefillCount++; }
      if (org.email && !provider.contact_email) { provider.contact_email = org.email; prefillCount++; }
      if (org.phone && !provider.contact_phone) { provider.contact_phone = org.phone; prefillCount++; }
      if (org.contactName && !provider.contact_name) { provider.contact_name = org.contactName; prefillCount++; }
      sources.provider = "ai_inventory";
    } else {
      missingFields.push("Dati provider (profilo azienda non configurato)");
    }

    // Authorized Representative from AuthRep record
    const arRaw = localStorage.getItem(AR_RECORD_KEY);
    if (arRaw) {
      const ar = JSON.parse(arRaw);
      if (ar.ar_name) { provider.ar_name = ar.ar_name; provider.has_authorized_rep = true; prefillCount++; }
      if (ar.ar_address) { provider.ar_address = ar.ar_address; prefillCount++; }
      if (ar.ar_country) { provider.ar_country = ar.ar_country; prefillCount++; }
      if (ar.ar_contact_email) { provider.ar_email = ar.ar_contact_email; prefillCount++; }
    }
  } catch { /* silent */ }

  // ── Step 3: System from Risk Manager + DocuGen ──
  try {
    // Nome e finalità prevista dalla documentazione tecnica (Allegato IV, punto 1)
    const docuRaw = localStorage.getItem("docugen_state");
    if (docuRaw) {
      const docu = JSON.parse(docuRaw) as { systemName?: string; content?: Record<string, string> };
      if (docu.systemName && !system.system_name) { system.system_name = docu.systemName; prefillCount++; }
      const purpose = docu.content?.s1?.trim();
      if (purpose && !system.intended_purpose) { system.intended_purpose = purpose.slice(0, 1000); prefillCount++; }
      sources.system = "risk_manager_docugen";
    } else {
      missingFields.push("Dati sistema (documentazione tecnica non compilata)");
    }

    // risk_classification + annex_reference from Risk Manager
    const rmRaw = localStorage.getItem("aicomply_risk_register_v1") ??
      localStorage.getItem("aicomply_risk_manager");
    if (rmRaw) {
      const rm = JSON.parse(rmRaw);
      if (rm.riskClassification && !system.risk_classification) { system.risk_classification = rm.riskClassification; prefillCount++; }
      if (rm.annexReference && !system.annex_reference) { system.annex_reference = rm.annexReference; prefillCount++; }
      sources.system = "risk_manager_docugen";
    } else {
      missingFields.push("Classificazione rischio (Risk Manager non compilato)");
    }

  } catch { /* silent */ }

  return { eligibility, provider, system, sources, missingFields, prefillCount };
}

// Merge prefill into existing doc — non-distruttivo (non sovrascrive valori già inseriti manualmente)
export function mergePrefillIntoDoc(doc: EUDBDoc, prefill: PrefillResult): EUDBDoc {
  const mergedEligibility = { ...doc.eligibility };
  for (const [k, v] of Object.entries(prefill.eligibility)) {
    if (!mergedEligibility[k as keyof EUDBEligibility]) {
      (mergedEligibility as Record<string, string>)[k] = v as string;
    }
  }

  const mergedProvider = { ...doc.provider };
  for (const [k, v] of Object.entries(prefill.provider)) {
    const key = k as keyof EUDBProviderData;
    if (!mergedProvider[key] && mergedProvider[key] !== (true as unknown)) {
      (mergedProvider as Record<string, unknown>)[k] = v;
    }
  }

  const mergedSystem = { ...doc.system };
  for (const [k, v] of Object.entries(prefill.system)) {
    const key = k as keyof EUDBSystemData;
    if (!mergedSystem[key] || (Array.isArray(mergedSystem[key]) && (mergedSystem[key] as string[]).length === 0)) {
      (mergedSystem as Record<string, unknown>)[k] = v;
    }
  }

  return {
    ...doc,
    eligibility: mergedEligibility,
    provider: mergedProvider,
    system: mergedSystem,
    prefillSources: prefill.prefillCount > 0 ? prefill.sources : doc.prefillSources,
    aiConfirmed: false,
  };
}

// markEUDBRegistrationComplete — aggiorna localStorage e segnala completion cross-modulo
export function markEUDBRegistrationComplete(registrationNumber: string): void {
  if (typeof window === "undefined") return;
  try {
    // 1. Update draft with registration number
    const draftRaw = localStorage.getItem(EUDB_DRAFT_KEY);
    if (draftRaw) {
      const draft = JSON.parse(draftRaw) as EUDBDoc;
      localStorage.setItem(EUDB_DRAFT_KEY, JSON.stringify({
        ...draft,
        eudb_registration_number: registrationNumber,
        updatedAt: new Date().toISOString(),
      }));
    }

    // 2. Update EUDBResult in dossier (key used by storage-schema writeToStorage)
    const dossierRaw = localStorage.getItem("aicomply_dossier");
    if (dossierRaw) {
      const dossier = JSON.parse(dossierRaw);
      dossier.eudb = {
        ...(dossier.eudb ?? {}),
        registration_number: registrationNumber,
        registrationRequired: true,
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem("aicomply_dossier", JSON.stringify(dossier));
    }

    // 3. Mark deployer obligation registration_public_body as completed
    const deplRaw = localStorage.getItem("aicomply_deployer_obligations");
    if (deplRaw) {
      const depl = JSON.parse(deplRaw);
      if (depl.obligations) {
        depl.obligations = depl.obligations.map((o: { id: string }) =>
          o.id === "registration_public_body"
            ? { ...o, status: "completed", registrationNumber, completedAt: new Date().toISOString() }
            : o
        );
        localStorage.setItem("aicomply_deployer_obligations", JSON.stringify(depl));
      }
    }

    // 4. Signal to deadline aggregator (eudb_<systemId> will return null on next buildDynamicDeadlines call
    //    because eudb_registration_number is now populated in draft)
  } catch { /* silent */ }
}
