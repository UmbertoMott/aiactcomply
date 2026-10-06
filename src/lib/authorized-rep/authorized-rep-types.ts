// Shared source-of-truth for AR data — consumed by both the AR Wizard and EUDB Step 2

export const AR_RECORD_KEY = "aicomply_authorized_rep_record";
export const AR_DRAFT_KEY  = "aicomply_auth_rep_draft_v2";

export interface AuthorizedRepresentativeRecord {
  ar_name: string;
  ar_country: string;
  ar_address: string;
  ar_contact_name: string;
  ar_contact_email: string;
  ar_contact_phone: string;
  ar_vat_number: string;
  updatedAt: string;
  updatedBy: "authorized-rep-tool" | "eudb-tool";
}

export interface AuthRepDoc {
  // Eligibility
  eligibility: {
    provider_non_eu: "yes" | "no" | "unsure" | "";
    high_risk:       "yes" | "no" | "unsure" | "";
  };
  // Provider — prefilled from AI Inventory / org profile
  provider_name: string;
  provider_country: string;
  provider_address: string;
  provider_contact_email: string;
  // Authorized Representative — shared record
  representative: AuthorizedRepresentativeRecord;
  // System — prefilled from DocuGen / Risk Manager
  system_name: string;
  system_version: string;
  annex_reference: string;
  mandate_start_date: string;
  mandate_duration: "indefinite" | "fixed";
  mandate_end_date?: string;
  // Mandate state
  mandate_signed: boolean;
  mandate_signed_date?: string;
  eudb_registered_by_ar: boolean;
  eudb_number?: string;
  // Checklist
  checklist: ARChecklistItem[];
  // Meta
  prefillSources: {
    applicability: "triage" | "manual";
    provider:      "ai_inventory" | "manual";
    system:        "risk_manager_docugen" | "manual";
  };
  updatedAt: string;
  aiConfirmed: boolean;
}

export interface ARChecklistItem {
  id: string;
  label: string;
  article: string;
  completed: boolean;
  notes: string;
  evidenceLabel?: string;
  evidenceValue: string;
}

export function makeChecklist(): ARChecklistItem[] {
  return [
    {
      id: "eudb",
      label: "Obblighi di registrazione Art. 49(1) adempiuti, o correttezza dei dati dell'Allegato VIII, sezione A, punto 3 verificata",
      article: "Art. 22(3)(e)",
      completed: false, notes: "",
      evidenceLabel: "Numero registrazione EUDB", evidenceValue: "",
    },
    {
      id: "doc_conformity",
      label: "Verificato che dichiarazione UE e documentazione tecnica siano redatte e la valutazione della conformità eseguita",
      article: "Art. 22(3)(a)",
      completed: false, notes: "", evidenceValue: "",
    },
    {
      id: "doc_technical",
      label: "Dati del fornitore, dichiarazione UE, documentazione tecnica ed eventuale certificato a disposizione delle autorità per 10 anni",
      article: "Art. 22(3)(b)",
      completed: false, notes: "", evidenceValue: "",
    },
    {
      id: "notifica_autorita",
      label: "Procedura trasmissione informazioni alle autorità di vigilanza attivata",
      article: "Art. 22(3)(c)",
      completed: false, notes: "", evidenceValue: "",
    },
    {
      id: "notifica_provider",
      label: "Procedura notifica al provider di richieste/indagini delle autorità attivata",
      article: "Buona prassi (mandato)",
      completed: false, notes: "", evidenceValue: "",
    },
    {
      id: "cooperazione",
      label: "Cooperazione con autorità di vigilanza per azioni correttive pianificata",
      article: "Art. 22(3)(d)",
      completed: false, notes: "", evidenceValue: "",
    },
    {
      id: "terminazione",
      label: "Procedura di terminazione mandato documentata (con notifica alle autorità)",
      article: "Art. 22(4)",
      completed: false, notes: "", evidenceValue: "",
    },
    {
      id: "firma",
      label: "Mandato firmato da entrambe le parti e archiviato (conservazione min. 10 anni)",
      article: "Art. 22(1)+(3)",
      completed: false, notes: "",
      evidenceLabel: "Data firma", evidenceValue: "",
    },
  ];
}

export function createEmptyDoc(): AuthRepDoc {
  return {
    eligibility: { provider_non_eu: "", high_risk: "" },
    provider_name: "", provider_country: "", provider_address: "", provider_contact_email: "",
    representative: {
      ar_name: "", ar_country: "Italia", ar_address: "",
      ar_contact_name: "", ar_contact_email: "", ar_contact_phone: "", ar_vat_number: "",
      updatedAt: new Date().toISOString(),
      updatedBy: "authorized-rep-tool",
    },
    system_name: "", system_version: "", annex_reference: "",
    mandate_start_date: "", mandate_duration: "indefinite",
    mandate_signed: false, eudb_registered_by_ar: false,
    checklist: makeChecklist(),
    prefillSources: { applicability: "manual", provider: "manual", system: "manual" },
    updatedAt: new Date().toISOString(),
    aiConfirmed: false,
  };
}

export function loadARDraft(): AuthRepDoc {
  try {
    if (typeof window === "undefined") return createEmptyDoc();
    const raw = localStorage.getItem(AR_DRAFT_KEY);
    if (!raw) {
      // Migrate from old draft key if present
      const legacy = localStorage.getItem("aicomply_auth_rep_draft");
      if (legacy) {
        const old = JSON.parse(legacy) as Record<string, unknown>;
        const base = createEmptyDoc();
        const rep = base.representative;
        return {
          ...base,
          provider_name:          (old.provider_name as string)         ?? "",
          provider_country:       (old.provider_country as string)       ?? "",
          provider_address:       (old.provider_address as string)       ?? "",
          provider_contact_email: (old.provider_contact_email as string) ?? "",
          system_name:            (old.system_name as string)            ?? "",
          system_version:         (old.system_version as string)         ?? "",
          annex_reference:        (old.annex_reference as string)        ?? "",
          mandate_start_date:     (old.mandate_start_date as string)     ?? "",
          mandate_duration:       ((old.mandate_duration as "indefinite"|"fixed") ?? "indefinite"),
          mandate_end_date:       (old.mandate_end_date as string)       ?? "",
          mandate_signed:         Boolean(old.mandate_signed),
          mandate_signed_date:    (old.mandate_signed_date as string)    ?? "",
          eudb_registered_by_ar:  Boolean(old.eudb_registered_by_ar),
          eudb_number:            (old.eudb_number as string)            ?? "",
          representative: {
            ...rep,
            ar_name:         (old.ar_name as string)         ?? "",
            ar_country:      (old.ar_country as string)      ?? "Italia",
            ar_address:      (old.ar_address as string)      ?? "",
            ar_contact_name: (old.ar_contact_name as string) ?? "",
            ar_contact_email:(old.ar_contact_email as string)?? "",
            ar_contact_phone:(old.ar_contact_phone as string)?? "",
            ar_vat_number:   (old.ar_vat_number as string)   ?? "",
          },
          checklist: Array.isArray(old.checklist) && (old.checklist as unknown[]).length > 0
            ? (old.checklist as ARChecklistItem[])
            : makeChecklist(),
        };
      }
      return createEmptyDoc();
    }
    const parsed = JSON.parse(raw) as Partial<AuthRepDoc>;
    const base = createEmptyDoc();
    return {
      ...base,
      ...parsed,
      eligibility: { ...base.eligibility, ...(parsed.eligibility ?? {}) },
      representative: { ...base.representative, ...(parsed.representative ?? {}) },
      checklist: parsed.checklist?.length ? parsed.checklist : base.checklist,
      prefillSources: { ...base.prefillSources, ...(parsed.prefillSources ?? {}) },
    };
  } catch {
    return createEmptyDoc();
  }
}

export function saveARDraft(doc: AuthRepDoc): void {
  try {
    localStorage.setItem(AR_DRAFT_KEY, JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }));
    // Keep shared AR record in sync
    localStorage.setItem(AR_RECORD_KEY, JSON.stringify({
      ...doc.representative,
      updatedAt: new Date().toISOString(),
      updatedBy: "authorized-rep-tool",
    } satisfies AuthorizedRepresentativeRecord));
  } catch { /* ignore */ }
}

export function loadARRecord(): AuthorizedRepresentativeRecord | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(AR_RECORD_KEY);
    return raw ? (JSON.parse(raw) as AuthorizedRepresentativeRecord) : null;
  } catch { return null; }
}

export function prefillARFromModules(): {
  eligibility: { provider_non_eu: boolean | null; high_risk: boolean | null };
  provider: Partial<Pick<AuthRepDoc, "provider_name"|"provider_country"|"provider_address"|"provider_contact_email">>;
  system: Partial<Pick<AuthRepDoc, "system_name"|"system_version"|"annex_reference">>;
  sources: AuthRepDoc["prefillSources"];
  prefillCount: number;
} {
  const sources: AuthRepDoc["prefillSources"] = { applicability: "manual", provider: "manual", system: "manual" };
  let prefillCount = 0;

  // ── Eligibility from Triage ─────────────────────────────────────────────
  let provider_non_eu: boolean | null = null;
  let high_risk: boolean | null = null;
  try {
    const EU_COUNTRIES_SET = new Set([
      "Austria","Belgio","Bulgaria","Cipro","Croazia","Danimarca","Estonia","Finlandia",
      "Francia","Germania","Grecia","Irlanda","Italia","Lettonia","Lituania","Lussemburgo",
      "Malta","Paesi Bassi","Polonia","Portogallo","Repubblica Ceca","Romania","Slovacchia",
      "Slovenia","Spagna","Svezia","Ungheria",
    ]);
    const orgRaw = localStorage.getItem("aicomply_org_profile") ?? localStorage.getItem("aicomply_org_settings");
    if (orgRaw) {
      const org = JSON.parse(orgRaw) as Record<string, unknown>;
      const country = (org.country ?? org.countryOfEstablishment) as string | undefined;
      if (country) { provider_non_eu = !EU_COUNTRIES_SET.has(country); prefillCount++; }
    }
    const triageRaw = localStorage.getItem("aicomply_triage_result") ?? localStorage.getItem("aicomply_classifier_result");
    if (triageRaw) {
      const triage = JSON.parse(triageRaw) as Record<string, unknown>;
      const tier = (triage.riskTier ?? triage.tier ?? triage.systemTier) as string | undefined;
      if (tier) {
        high_risk = tier === "high_risk" || tier === "gpai_systemic" || tier === "high_risk_annex3";
        prefillCount++;
        sources.applicability = "triage";
      }
    }
  } catch { /* silent */ }

  // ── Provider from AI Inventory / org profile ────────────────────────────
  const provider: Partial<Pick<AuthRepDoc,"provider_name"|"provider_country"|"provider_address"|"provider_contact_email">> = {};
  try {
    const orgRaw = localStorage.getItem("aicomply_org_profile") ?? localStorage.getItem("aicomply_org_settings");
    if (orgRaw) {
      const org = JSON.parse(orgRaw) as Record<string, unknown>;
      if (org.companyName ?? org.name)            { provider.provider_name           = (org.companyName ?? org.name) as string; prefillCount++; }
      if (org.country ?? org.countryOfEstablishment) { provider.provider_country      = (org.country ?? org.countryOfEstablishment) as string; prefillCount++; }
      if (org.address ?? org.legalAddress)        { provider.provider_address         = (org.address ?? org.legalAddress) as string; prefillCount++; }
      if (org.email ?? org.contactEmail)          { provider.provider_contact_email   = (org.email ?? org.contactEmail) as string; prefillCount++; }
      if (Object.keys(provider).length > 0) sources.provider = "ai_inventory";
    }
  } catch { /* silent */ }

  // ── System from DocuGen / Risk Manager ──────────────────────────────────
  const system: Partial<Pick<AuthRepDoc,"system_name"|"system_version"|"annex_reference">> = {};
  try {
    const docuRaw = localStorage.getItem("aicomply_docugen_record");
    if (docuRaw) {
      const docu = JSON.parse(docuRaw) as Record<string, unknown>;
      if (docu.system_name)    { system.system_name    = docu.system_name    as string; prefillCount++; }
      if (docu.system_version) { system.system_version = docu.system_version as string; prefillCount++; }
    }
    const riskRaw = localStorage.getItem("aicomply_risk_register_v1");
    if (riskRaw) {
      const risk = JSON.parse(riskRaw) as Record<string, unknown>;
      if (risk.annex_reference ?? risk.annexReference) {
        system.annex_reference = (risk.annex_reference ?? risk.annexReference) as string;
        prefillCount++;
      }
    }
    if (Object.keys(system).length > 0) sources.system = "risk_manager_docugen";
  } catch { /* silent */ }

  return { eligibility: { provider_non_eu, high_risk }, provider, system, sources, prefillCount };
}

// ── generateMandate ─────────────────────────────────────────────────────────

const SEP = "-------------------------------------------";

export function generateMandate(doc: AuthRepDoc): string {
  const r = doc.representative;
  const durationLine = doc.mandate_duration === "indefinite"
    ? "Tempo indeterminato"
    : `Fino al ${doc.mandate_end_date ?? "[DA INSERIRE]"}`;

  return `MANDATO DI AUTHORIZED REPRESENTATIVE
ai sensi dell'Art. 22 del Regolamento (UE) 2024/1689 (AI Act)

Generato da RegulaeOS il ${new Date().toLocaleDateString("it-IT")}

${SEP}
PARTI
${SEP}
PROVIDER (mandante):
${doc.provider_name     || "[DA INSERIRE]"}
${doc.provider_address  || "[DA INSERIRE]"} -- ${doc.provider_country || "[DA INSERIRE]"}
Email: ${doc.provider_contact_email || "[DA INSERIRE]"}

AUTHORIZED REPRESENTATIVE (mandatario):
${r.ar_name    || "[DA INSERIRE]"}
${r.ar_address || "[DA INSERIRE]"} -- ${r.ar_country || "[DA INSERIRE]"} (Unione Europea)
Referente: ${r.ar_contact_name || "[DA INSERIRE]"} | ${r.ar_contact_email || "[DA INSERIRE]"} | ${r.ar_contact_phone || "[DA INSERIRE]"}
VAT/P.IVA: ${r.ar_vat_number || "[DA INSERIRE]"}

${SEP}
OGGETTO DEL MANDATO
${SEP}
Sistema di IA: ${doc.system_name    || "[DA INSERIRE]"} -- Versione ${doc.system_version || "[DA INSERIRE]"}
Riferimento normativo: ${doc.annex_reference || "[DA INSERIRE]"}
Decorrenza: ${doc.mandate_start_date || "[DA INSERIRE]"}
Durata: ${durationLine}

${SEP}
POTERI CONFERITI
${SEP}
Il Provider conferisce all'AR il mandato di eseguire i seguenti compiti (Art. 22(3) del Regolamento (UE) 2024/1689):

(a) verificare che la dichiarazione di conformità UE e la documentazione tecnica siano state redatte e che il Provider abbia eseguito un'adeguata procedura di valutazione della conformità;
(b) tenere a disposizione delle autorità competenti e delle autorità o organismi nazionali, per 10 anni dall'immissione sul mercato o dalla messa in servizio, i dati di contatto del Provider, una copia della dichiarazione di conformità UE, la documentazione tecnica e, se del caso, il certificato dell'organismo notificato;
(c) fornire all'autorità competente, su richiesta motivata, tutte le informazioni e la documentazione necessarie a dimostrare la conformità, compreso l'accesso ai log generati automaticamente nella misura in cui sono sotto il controllo del Provider;
(d) cooperare con le autorità competenti, su richiesta motivata, in qualsiasi azione intrapresa in relazione al sistema, in particolare per ridurne e attenuarne i rischi;
(e) se del caso, adempiere agli obblighi di registrazione dell'Art. 49(1) o, se la registrazione è effettuata dal Provider, verificare la correttezza delle informazioni dell'Allegato VIII, sezione A, punto 3.

Il mandato consente all'AR di essere interpellato, in aggiunta o in sostituzione del Provider, dalle autorità competenti su tutte le questioni relative alla conformità al Regolamento.
L'AR pone fine al mandato se ritiene o ha motivo di ritenere che il Provider agisca in modo contrario ai propri obblighi, e ne informa immediatamente l'autorità di vigilanza del mercato competente e, se del caso, l'organismo notificato (Art. 22(4)).

Clausola contrattuale ulteriore (non prevista dall'Art. 22): l'AR informa senza ritardo il Provider di qualsiasi richiesta o indagine delle autorità.

${SEP}
OBBLIGHI DEL PROVIDER
${SEP}
Il Provider si impegna a:
- Fornire all'AR tutta la documentazione tecnica necessaria
- Informare tempestivamente l'AR di qualsiasi modifica al sistema
- Non agire in modo incompatibile con il presente mandato

${SEP}
FIRME
${SEP}
Provider: _________________________ Data: _____________
Nome e qualifica: _________________________

Authorized Representative: _________________________ Data: _____________
Nome e qualifica: _________________________

[Il presente mandato deve essere firmato da entrambe le parti e conservato per tutta la durata
della commercializzazione del sistema di IA nell'UE e per almeno 10 anni successivi
— Art. 22(1)+(3)]`.trim();
}
