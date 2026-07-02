// Trust Center — tipi condivisi editor + pagina pubblica (PROMPT AV + BC)
// ✦ AI — verifica e conferma: tabella sezioni ricostruita dalla memoria del modello.
// Validare contro Art. 6, Annex III/IV, Art. 14, Art. 22, Art. 47-50, Art. 72
// del Reg. (UE) 2024/1689 prima della pubblicazione. [verify against current AI Act text]

// ── Access control (PROMPT BC — Art. 13, Art. 50) ─────────────────────────────
export type TrustCenterVisibility = "public" | "restricted" | "invite_only";

export interface TrustCenterAccessConfig {
  visibility: TrustCenterVisibility;
  /** Email esplicite autorizzate (invite_only) */
  allowedEmails: string[];
  /** Domini autorizzati, es. "@regulator.eu" (restricted) */
  allowedDomains: string[];
}

export function createDefaultAccessConfig(): TrustCenterAccessConfig {
  return { visibility: "public", allowedEmails: [], allowedDomains: [] };
}

export type TrustCenterSectionId =
  | "risk_tier"
  | "intended_use"
  | "oversight"
  | "transparency"
  | "conformity"
  | "eudb"
  | "post_market"
  | "contact";

export const ALL_SECTION_IDS: TrustCenterSectionId[] = [
  "risk_tier", "intended_use", "oversight", "transparency",
  "conformity", "eudb", "post_market", "contact",
];

export interface TrustCenterSectionMeta {
  id: TrustCenterSectionId;
  label: string;
  article: string;
  sourceModule: string;
}

export const SECTION_META: Record<TrustCenterSectionId, TrustCenterSectionMeta> = {
  risk_tier: {
    id: "risk_tier",
    label: "Classificazione del rischio",
    article: "Art. 6 + Annex III [verify against current AI Act text]",
    sourceModule: "Triage / AI Inventory",
  },
  intended_use: {
    id: "intended_use",
    label: "Finalità e ambito di utilizzo previsto",
    article: "Annex IV §1-2 [verify against current AI Act text]",
    sourceModule: "DocuGen AI — Annex IV",
  },
  oversight: {
    id: "oversight",
    label: "Misure di sorveglianza umana",
    article: "Art. 14 [verify against current AI Act text]",
    sourceModule: "Oversight (Art. 14)",
  },
  transparency: {
    id: "transparency",
    label: "Informazioni di trasparenza",
    article: "Art. 50(1)/(2)/(3)/(4) [verify against current AI Act text]",
    sourceModule: "Art. 50 Kit",
  },
  conformity: {
    id: "conformity",
    label: "Stato della dichiarazione di conformità",
    article: "Art. 47-48 [verify against current AI Act text]",
    sourceModule: "DocuGen AI / Conformity",
  },
  eudb: {
    id: "eudb",
    label: "Registrazione nella banca dati UE",
    article: "Art. 49 [verify against current AI Act text]",
    sourceModule: "EUDB Registration",
  },
  post_market: {
    id: "post_market",
    label: "Impegno di monitoraggio post-market",
    article: "Art. 72 [verify against current AI Act text]",
    sourceModule: "Post-Market Monitoring",
  },
  contact: {
    id: "contact",
    label: "Contatti e rappresentante autorizzato",
    article: "Art. 22 [verify against current AI Act text]",
    sourceModule: "Authorized Representative / Profilo organizzazione",
  },
};

export interface TrustCenterSectionState {
  is_public: boolean;
  summary: {
    text: string;
    aiConfirmed: boolean;
    updatedAt: string;
  };
}

export interface TrustCenterPage {
  systemId: string;
  publicSlug: string;
  isPublished: boolean;
  noindex: boolean;
  sections: Record<TrustCenterSectionId, TrustCenterSectionState>;
  updatedAt: string;
  /** Access control — PROMPT BC */
  accessConfig: TrustCenterAccessConfig;
}

export function makeEmptySection(): TrustCenterSectionState {
  return {
    is_public: false,
    summary: { text: "", aiConfirmed: false, updatedAt: new Date().toISOString() },
  };
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 24; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export function createEmptyPage(systemId: string): TrustCenterPage {
  const sections = {} as Record<TrustCenterSectionId, TrustCenterSectionState>;
  for (const id of ALL_SECTION_IDS) sections[id] = makeEmptySection();
  return {
    systemId,
    publicSlug: generateSlug(),
    isPublished: false,
    noindex: true,
    sections,
    updatedAt: new Date().toISOString(),
    accessConfig: createDefaultAccessConfig(),
  };
}

const STORAGE_KEY = "aicomply_trust_center_v1";

export function loadTrustCenterPages(): Record<string, TrustCenterPage> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TrustCenterPage>) : {};
  } catch { return {}; }
}

export function loadTrustCenterPage(systemId: string): TrustCenterPage {
  const pages = loadTrustCenterPages();
  if (pages[systemId]) {
    const page = pages[systemId];
    for (const id of ALL_SECTION_IDS) {
      if (!page.sections[id]) page.sections[id] = makeEmptySection();
    }
    // Migrate pages created before PROMPT BC
    if (!page.accessConfig) page.accessConfig = createDefaultAccessConfig();
    return page;
  }
  return createEmptyPage(systemId);
}

export function saveTrustCenterPage(page: TrustCenterPage): void {
  try {
    const pages = loadTrustCenterPages();
    pages[page.systemId] = { ...page, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch { /* ignore */ }
}

export function findPageBySlug(slug: string): TrustCenterPage | null {
  const pages = loadTrustCenterPages();
  return Object.values(pages).find(p => p.publicSlug === slug) ?? null;
}

export function latestPublicSectionDate(page: TrustCenterPage): string {
  const dates = ALL_SECTION_IDS
    .filter(id => page.sections[id].is_public)
    .map(id => page.sections[id].summary.updatedAt)
    .filter(Boolean)
    .sort();
  return dates[dates.length - 1] ?? page.updatedAt;
}

// Source data interface — read-only data surfaced from other modules for each section
export interface TrustCenterSourceData {
  risk_tier: {
    riskTier: string | null;
    role: string | null;
    systemName: string | null;
    complete: boolean;
  };
  intended_use: {
    finalityDescription: string | null;
    applicativeScope: string | null;
    complete: boolean;
  };
  oversight: {
    implementedMeasures: { id: string; description: string }[];
    complete: boolean;
  };
  transparency: {
    activeDisclosures: string[];
    complete: boolean;
  };
  conformity: {
    declarationDrafted: boolean;
    declarationDate: string | null;
    ceMark: boolean;
    complete: boolean;
  };
  eudb: {
    registrationNumber: string | null;
    complete: boolean;
  };
  post_market: {
    methodology: string | null;
    frequency: string | null;
    complete: boolean;
  };
  contact: {
    arName: string | null;
    arCountry: string | null;
    arContact: string | null;
    providerName: string | null;
    providerEmail: string | null;
    complete: boolean;
  };
}

export function readSourceData(): TrustCenterSourceData {
  const s: TrustCenterSourceData = {
    risk_tier:    { riskTier: null, role: null, systemName: null, complete: false },
    intended_use: { finalityDescription: null, applicativeScope: null, complete: false },
    oversight:    { implementedMeasures: [], complete: false },
    transparency: { activeDisclosures: [], complete: false },
    conformity:   { declarationDrafted: false, declarationDate: null, ceMark: false, complete: false },
    eudb:         { registrationNumber: null, complete: false },
    post_market:  { methodology: null, frequency: null, complete: false },
    contact:      { arName: null, arCountry: null, arContact: null, providerName: null, providerEmail: null, complete: false },
  };
  if (typeof window === "undefined") return s;

  try {
    // risk_tier from classifier / AI Inventory
    const classRaw = localStorage.getItem("aicomply_classifier_result");
    if (classRaw) {
      const c = JSON.parse(classRaw) as Record<string, unknown>;
      s.risk_tier.riskTier   = (c.riskLevel ?? c.tier ?? c.riskTier) as string | null;
      s.risk_tier.role       = (c.role) as string | null;
      s.risk_tier.systemName = (c.systemName ?? c.name) as string | null;
      s.risk_tier.complete   = Boolean(s.risk_tier.riskTier);
    }
  } catch { /* silent */ }

  try {
    // intended_use from docugen result
    const docRaw = localStorage.getItem("aicomply_docugen_result");
    if (docRaw) {
      const d = JSON.parse(docRaw) as Record<string, unknown>;
      const sections = (d.sections ?? d.content ?? {}) as Record<string, unknown>;
      s.intended_use.finalityDescription = (sections.s1 ?? sections.finality ?? sections.intended_use) as string | null;
      s.intended_use.applicativeScope    = (sections.s2 ?? sections.scope) as string | null;
      s.intended_use.complete = Boolean(s.intended_use.finalityDescription);
    }
  } catch { /* silent */ }

  try {
    // oversight from oversight record
    const ovRaw = localStorage.getItem("aicomply_oversight_record_v1");
    if (ovRaw) {
      const ov = JSON.parse(ovRaw) as Record<string, unknown>;
      const reqs = (ov.requirements ?? []) as { status?: string; measureDescription?: string; requirementId?: string }[];
      s.oversight.implementedMeasures = reqs
        .filter(r => r.status === "implemented" && r.measureDescription)
        .map(r => ({ id: r.requirementId ?? "", description: r.measureDescription! }));
      s.oversight.complete = s.oversight.implementedMeasures.length > 0;
    }
  } catch { /* silent */ }

  try {
    // transparency from art50 record
    const a50Raw = localStorage.getItem("aicomply_art50_record_v1");
    if (a50Raw) {
      const a50 = JSON.parse(a50Raw) as Record<string, unknown>;
      const sc = (a50.selfCompliance ?? []) as { status?: string; area?: string }[];
      s.transparency.activeDisclosures = sc
        .filter(i => i.status === "compliant")
        .map(i => i.area ?? "");
      s.transparency.complete = s.transparency.activeDisclosures.length > 0;
    }
  } catch { /* silent */ }

  try {
    // conformity from docugen record
    const docRaw = localStorage.getItem("aicomply_docugen_result");
    if (docRaw) {
      const d = JSON.parse(docRaw) as Record<string, unknown>;
      s.conformity.declarationDrafted = Boolean(d.art50_completed ?? d.declaration_drafted ?? d.declarationDrafted);
      s.conformity.declarationDate    = (d.declaration_date ?? d.declarationDate) as string | null;
      s.conformity.ceMark             = Boolean(d.ce_mark ?? d.ceMark);
      s.conformity.complete           = s.conformity.declarationDrafted;
    }
  } catch { /* silent */ }

  try {
    // eudb
    const eudbRaw = localStorage.getItem("aicomply_eudb_draft_v2");
    if (eudbRaw) {
      const e = JSON.parse(eudbRaw) as Record<string, unknown>;
      s.eudb.registrationNumber = (e.eudb_registration_number ?? e.registration_number) as string | null;
      s.eudb.complete = Boolean(s.eudb.registrationNumber);
    }
  } catch { /* silent */ }

  try {
    // post_market
    const pmmRaw = localStorage.getItem("aicomply_pmm_plan_v1");
    if (pmmRaw) {
      const p = JSON.parse(pmmRaw) as Record<string, unknown>;
      s.post_market.methodology = (p.monitoringMethodology) as string | null;
      s.post_market.frequency   = (p.dataCollectionFrequency) as string | null;
      s.post_market.complete    = Boolean(s.post_market.methodology);
    }
  } catch { /* silent */ }

  try {
    // contact from AR record
    const arRaw = localStorage.getItem("aicomply_authorized_rep_record");
    if (arRaw) {
      const ar = JSON.parse(arRaw) as Record<string, unknown>;
      s.contact.arName    = (ar.ar_name) as string | null;
      s.contact.arCountry = (ar.ar_country) as string | null;
      s.contact.arContact = (ar.ar_contact_email ?? ar.ar_contact_name) as string | null;
      s.contact.complete  = Boolean(s.contact.arName);
    }
    if (!s.contact.complete) {
      // fallback to org profile
      const orgRaw = localStorage.getItem("aicomply_org_profile");
      if (orgRaw) {
        const org = JSON.parse(orgRaw) as Record<string, unknown>;
        s.contact.providerName  = (org.companyName ?? org.name) as string | null;
        s.contact.providerEmail = (org.email ?? org.contactEmail) as string | null;
        s.contact.complete      = Boolean(s.contact.providerName);
      }
    }
  } catch { /* silent */ }

  return s;
}
