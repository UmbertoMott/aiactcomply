// EUDB auto-prefill from cross-module data — PROMPT AS
// ✦ AI — verifica e conferma: mappatura campi Annex VIII su altri moduli
// ricostruita dalla memoria del modello. Validare contro testo consolidato Art. 49
// e Annex VIII Reg. (UE) 2024/1689. [verify against current AI Act text]

export type EligibilityAnswer = "yes" | "no" | "unsure" | "";

export interface EUDBEligibility {
  q1_high_risk: EligibilityAnswer;
  q2_is_provider: EligibilityAnswer;
  q3_public_deployer: EligibilityAnswer;
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
  technical_doc_url: string;
  notified_body_certificate: string;
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

export const RISK_CLASSIFICATIONS = [
  "Sistema ad alto rischio — Annex III (Art. 6(2)) [verify against current AI Act text]",
  "Sistema ad alto rischio — Annex I (Art. 6(1)) [verify against current AI Act text]",
  "GPAI model — rischio sistemico (Art. 51) [verify against current AI Act text]",
  "Sistema ad alto rischio — Annex I + Annex III [verify against current AI Act text]",
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

export function generateAnnexVIII(doc: EUDBDoc): string {
  const p = doc.provider;
  const s = doc.system;
  const regStatusLabel =
    s.registration_status === "new" ? "Prima registrazione" :
    s.registration_status === "update" ? "Aggiornamento" : "Ritiro dal mercato";
  return `ANNEX VIII — INFORMAZIONI PER LA REGISTRAZIONE NEL DATABASE UE (Art. 49)
Regolamento (UE) 2024/1689 — Generato da AIComply il ${new Date().toLocaleDateString("it-IT")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEZIONE A — DATI DEL PROVIDER / AUTHORIZED REPRESENTATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provider: ${p.provider_name || "[DA INSERIRE]"}
Indirizzo: ${p.provider_address || "[DA INSERIRE]"}, ${p.provider_country || "[DA INSERIRE]"}
Referente: ${p.contact_name || "[DA INSERIRE]"} | ${p.contact_email || "[DA INSERIRE]"} | ${p.contact_phone || "[DA INSERIRE]"}
${p.has_authorized_rep
  ? `\nAuthorized Representative: ${p.ar_name || "[DA INSERIRE]"}\nIndirizzo AR: ${p.ar_address || "[DA INSERIRE]"}, ${p.ar_country || "[DA INSERIRE]"}\nEmail AR: ${p.ar_email || "[DA INSERIRE]"}`
  : "Authorized Representative: Non applicabile (provider stabilito in UE)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEZIONE B — DATI DEL SISTEMA AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Denominazione: ${s.system_name || "[DA INSERIRE]"} — Versione ${s.system_version || "[DA INSERIRE]"}
Scopo previsto: ${s.intended_purpose || "[DA INSERIRE]"}
Stato registrazione: ${regStatusLabel}
Classificazione rischio: ${s.risk_classification || "[DA INSERIRE]"}
Riferimento normativo: ${s.annex_reference || "[DA INSERIRE]"}
Stati membri: ${s.member_states.length > 0 ? s.member_states.join(", ") : "[DA INSERIRE]"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEZIONE C — DOCUMENTAZIONE DI CONFORMITÀ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N. Dichiarazione di Conformità UE: ${s.conformity_declaration_number || "[DA INSERIRE]"}
URL Istruzioni per l'uso: ${s.instructions_url || "[DA INSERIRE]"}
URL Documentazione Tecnica (Annex VIII): ${s.technical_doc_url || "[DA INSERIRE]"}
Certificato Notified Body: ${s.notified_body_certificate || "Non applicabile"}

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

  // ── Step 1: Eligibility from Triage ──
  try {
    const trRaw = localStorage.getItem("aicomply_triage_result") ??
      localStorage.getItem("aicomply_classifier_result");
    if (trRaw) {
      const tr = JSON.parse(trRaw);
      const tier: string = tr.riskTier ?? tr.tier ?? "";
      const role: string = tr.role ?? "";

      if (tier === "high_risk" || tier === "high_risk_annex3" || tier === "high_risk_annex1") {
        eligibility.q1_high_risk = "yes";
        prefillCount++;
      } else if (tier === "minimal" || tier === "limited") {
        eligibility.q1_high_risk = "no";
        prefillCount++;
      }

      if (tier === "gpai_systemic") {
        eligibility.q4_gpai_systemic = "yes";
        prefillCount++;
      }

      if (role === "provider" || role === "authorized_rep") {
        eligibility.q2_is_provider = "yes";
        prefillCount++;
      } else if (role === "deployer") {
        eligibility.q2_is_provider = "no";
        // q3_public_deployer requires manual answer (not derivable)
      }

      sources.eligibility = "triage";
    } else {
      missingFields.push("Q1/Q2 (Triage non compilato)");
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
    const arRaw = localStorage.getItem("aicomply_auth_rep_result") ??
      localStorage.getItem("aicomply_authorized_rep");
    if (arRaw) {
      const ar = JSON.parse(arRaw);
      if (ar.ar_name) { provider.ar_name = ar.ar_name; provider.has_authorized_rep = true; prefillCount++; }
      if (ar.ar_address) { provider.ar_address = ar.ar_address; prefillCount++; }
      if (ar.ar_country) { provider.ar_country = ar.ar_country; prefillCount++; }
      if (ar.ar_email) { provider.ar_email = ar.ar_email; prefillCount++; }
    }
  } catch { /* silent */ }

  // ── Step 3: System from Risk Manager + DocuGen ──
  try {
    // system_name, version, intended_purpose from DocuGen Annex IV
    const docuRaw = localStorage.getItem("aicomply_docugen_record") ??
      localStorage.getItem("aicomply_docugen_draft");
    if (docuRaw) {
      const docu = JSON.parse(docuRaw);
      if (docu.systemName && !system.system_name) { system.system_name = docu.systemName; prefillCount++; }
      if (docu.systemVersion && !system.system_version) { system.system_version = docu.systemVersion; prefillCount++; }
      if (docu.intendedPurpose && !system.intended_purpose) { system.intended_purpose = docu.intendedPurpose; prefillCount++; }
      if (docu.instructionsUrl && !system.instructions_url) { system.instructions_url = docu.instructionsUrl; prefillCount++; }
      if (docu.technicalDocUrl && !system.technical_doc_url) { system.technical_doc_url = docu.technicalDocUrl; prefillCount++; }
      // Conformity declaration — only if art50 completed
      if (docu.art50_completed || docu.conformityDeclarationNumber) {
        if (docu.conformityDeclarationNumber) {
          system.conformity_declaration_number = docu.conformityDeclarationNumber;
          prefillCount++;
        }
        if (docu.notifiedBodyCertificate) {
          system.notified_body_certificate = docu.notifiedBodyCertificate;
          prefillCount++;
        }
      } else {
        missingFields.push("Dichiarazione di Conformità (completa Kit Art. 50 in DocuGen AI)");
      }
      sources.system = "risk_manager_docugen";
    } else {
      missingFields.push("Dati sistema (DocuGen Annex IV non compilato)");
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

    // conformity from old conformity storage
    const confRaw = localStorage.getItem("aicomply_conformity_result");
    if (confRaw && !system.conformity_declaration_number) {
      const conf = JSON.parse(confRaw);
      if (conf.registrationRef) { system.conformity_declaration_number = conf.registrationRef; prefillCount++; }
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
