# Design Spec — Assessment unificato (DPIA + FRIA)

> **Scopo.** Unificare i processi DPIA (GDPR, WP248 rev.01) e FRIA (AI Act Art. 27, framework DIHR/ECNL)
> in un unico oggetto `Assessment` di cui DPIA e FRIA sono **due viste**, eliminando la duplicazione dei
> dati identitari, collegando le mitigazioni al `risk-register` e introducendo una tabella di correlazione
> normativa WP29 ⇄ DIHR.
>
> **Decisioni prese.** Scoping **per progetto** (si mantiene `src/lib/dossier/storage-schema.ts`). Nessuna
> migrazione a `useScopedStorage`. Riuso massimo dei tipi esistenti (`DPIAResult`, `FRIADocument`).
>
> **Stato.** Spec di design — da approvare prima dell'implementazione. Nessun codice modificato.

---

## 1. Stato attuale (codice reale)

### 1.1 Due sistemi di persistenza concorrenti

| Sistema | File | Chiave | Usato da | Extra |
|---|---|---|---|---|
| **Project-scoped** (scelto) | `src/lib/dossier/storage-schema.ts` | `aicomply_p_{projectId}_{tool}` + fallback legacy `aicomply_{tool}_result` | DPIA, FRIA, tutti i tool | Supabase sync (debounced) + version history |
| System-scoped (da deprecare) | `src/lib/hooks/useScopedStorage.ts` | `aicomply_{keyBase}_v2_[{systemId}]` | residuale | nessuno |

`readFromStorage<T>(key)` / `writeToStorage<T>(key, data)` sono i punti d'accesso ufficiali; risolvono la
chiave via `scopedKey()` leggendo `aicomply_active_project_id`. **Tutta l'unificazione passa da qui.**

### 1.2 DPIA — schema ricco e condiviso

`DPIAResult` (in `storage-schema.ts`, WP248 rev.01) è già completo e persistito nel dossier:
`screening` → `description` → `proportionality` (con `rights_checks[]` legati ad articoli GDPR) →
`risks.threats[]` → `measures` → `conclusion`. Pre-popolato dal Classifier
(`readFromStorage<ClassifierResult>("classifier")`, vedi `dpia/page.tsx` ~riga 387-426).

### 1.3 FRIA — asimmetrica

Il modello ricco vive in `src/lib/simulation/fria-engine.ts` (`FRIADocument`):
`context` (FRIAContext) → `scenarios[]` con `right_impacts[]` mappati al catalogo `FUNDAMENTAL_RIGHTS`
(Carta UE / CFR, con `is_absolute`) → `deployment` → `monitoring` → `stakeholders` → `engagement_log`.

**Problema:** `FRIADocument` è salvato a parte sotto `aicomply_fria_document` (`FRIA_DOC_KEY` in `fria/page.tsx`),
**fuori** dallo schema condiviso. Nel dossier finisce solo il riassunto `FRIAResult`
(`systemName, organizationName, overallRisk, completeness, status, approvedBy, completedAt`).
Quindi gli altri tool **non** possono leggere la FRIA come leggono la DPIA.

### 1.4 Mappa dei tipi rilevanti

```
ClassifierResult     → systemName, systemDescription, riskLevel, annexIII, role, isGPAI
DPIAResult           → screening, description{...}, proportionality{rights_checks[]}, risks{threats[]}, measures, conclusion
FRIADocument         → context, scenarios[]{right_impacts[]{severity, mitigations[]}}, deployment, monitoring
FRIAResult           → riassunto thin (dossier)
RiskManagerResult    → risks[]{likelihood, impact, mitigation, residualRisk}   ← il "risk-register"
FUNDAMENTAL_RIGHTS   → catalogo CFR (id, code, charter_art, is_absolute, ...)
```

---

## 2. Gap da colmare per unificare

1. **Nessun contenitore unico.** I dati identitari sono triplicati: `ClassifierResult`,
   `DPIAResult.description` (`system_name`, `organization_name`, `controller_name`, `processing_purposes`,
   `personal_data_categories`, `data_subjects_categories`) e `FRIADocument`/`FRIAContext`
   (`system_name`, `organization`, `legal_basis`, `personal_data_types`).
2. **Link DPIA↔FRIA finto.** `FRIAContext.dpia_done` / `dpia_explanation` sono **testo libero**, non un
   riferimento vivo all'oggetto DPIA. L'utente ridichiara informazioni che il sistema già possiede.
3. **Nessuna tabella di correlazione.** Una mitigazione non è mai legata *insieme* a WP29/Art.35 **e** a
   DIHR/CFR. Manca lo strato che lo rende possibile.
4. **Tre liste di rischio scollegate.** `DPIAThreat[]`, `FRIARightImpact[]` e `RiskManagerResult.risks[]`
   non si parlano. "Applica mitigazione → risk-register" oggi non esiste.
5. **FRIA fuori dal dossier.** `aicomply_fria_document` non è leggibile dagli altri tool via
   `readFromStorage`.

---

## 3. Struttura proposta — `Assessment`

**Principio:** non riscrivere i modelli ricchi (DPIA ~1854 righe, FRIA ~1322 + engine). L'`Assessment`
è un **contenitore** con un nucleo `shared` come unica fonte di verità, che **referenzia** i tipi esistenti
come due viste, più uno strato di rischio correlato che fa da ponte verso il `risk-register`.

```typescript
// src/lib/assessment/assessment-schema.ts  (nuovo file)
import type {
  ClassifierResult, DPIAResult, RiskManagerResult,
} from "@/lib/dossier/storage-schema";
import type { FRIADocument } from "@/lib/simulation/fria-engine";

/** Nucleo condiviso — unica fonte di verità, pre-popolata dal Classifier. */
export interface AssessmentShared {
  systemName: string;
  organization: string;
  riskLevel: ClassifierResult["riskLevel"];   // "unacceptable"|"high"|"limited"|"minimal"
  annexIII: boolean;
  role?: ClassifierResult["role"];
  isGPAI?: boolean;
  purpose: string;
  legalBasis: string;                          // GDPR Art. 6
  processesPersonalData: boolean;
  personalDataCategories: string[];
  specialCategories: string[];
  dataSubjects: string[];
}

/** Riferimento normativo per la tabella di correlazione. */
export interface ComplianceRef {
  framework: "WP29" | "DIHR" | "AI_ACT" | "GDPR" | "CFR";
  citation: string;        // es. "WP29/Art.35(7)(d)" | "DIHR Step 4" | "CFR Art.21"
}

/** Rischio correlato — ponte tra DPIAThreat, FRIARightImpact e risk-register. */
export interface CorrelatedRisk {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceView: "dpia" | "fria" | "both" | "manual";
  sourceRefId?: string;                        // id del DPIAThreat o del FRIARightImpact d'origine
  refs: ComplianceRef[];                       // ← tabella di correlazione
  mitigation?: {
    text: string;
    appliedToRegister: boolean;                // true dopo "Applica mitigazione"
    registerRiskId?: string;                   // id creato in RiskManagerResult.risks[]
  };
}

/** Root: DPIA e FRIA come due viste di un unico oggetto. */
export interface Assessment {
  id: string;
  scopeId: string;                             // = aicomply_active_project_id
  shared: AssessmentShared;
  dpia: DPIAResult;                            // vista GDPR / WP248
  fria: FRIADocument;                          // vista AI Act Art. 27 / DIHR
  correlatedRisks: CorrelatedRisk[];           // strato di unificazione
  meta: {
    createdAt: string;
    updatedAt: string;
    version: number;                           // per version-history
  };
}
```

### 3.1 Chiave di storage

Aggiungere a `STORAGE_KEYS`:

```typescript
assessment: "aicomply_assessment",   // → scopedKey ⇒ aicomply_p_{projectId}_assessment
```

`readFromStorage<Assessment>("assessment")` / `writeToStorage<Assessment>("assessment", a)` ereditano
gratis Supabase sync + version history.

### 3.2 Regola "single source of truth"

`shared` è scritto **una volta** (Classifier → seed dell'Assessment). DPIA e FRIA leggono i propri campi
identitari da `assessment.shared` in **sola lettura**; `DPIAResult.description.*` e `FRIAContext.*`
restano per i campi specifici di ciascuna vista ma non duplicano più gli identitari.
`FRIAContext.dpia_done` diventa derivato: `assessment.dpia.conclusion.compliant !== ""`.

---

## 4. Tabella di correlazione WP29 ⇄ DIHR

File dati statico `src/lib/assessment/correlation-map.ts`. Lega un **tema di rischio** ai due framework,
così che ogni `CorrelatedRisk` possa ereditare i `refs` corretti in automatico.

| Tema | WP29 / GDPR | DIHR / CFR | Note |
|---|---|---|---|
| Decisione automatizzata su persone | Art. 22; WP248 §necessità | DIHR Step 3–4; CFR Art. 8, 21 | revisione umana |
| Profilazione / scoring | Art. 35(3)(a); WP248 rights_checks | DIHR Step 4; CFR Art. 1, 21 | dignità, non-discriminazione |
| Categorie particolari | Art. 9; Art. 35(3)(b) | DIHR Step 4; CFR Art. 21 | bias |
| Sorveglianza / monitoraggio | Art. 35(3)(c) | DIHR Step 3; CFR Art. 7, 8 | privacy, vita privata |
| Trasferimenti internazionali | Art. 44–49 | — | safeguards |
| Diritti assoluti (dignità, tortura) | — | DIHR §3.2; CFR Art. 1, 4 | **non bilanciabili** |

> Struttura dati: `{ themeId, label, wp29: ComplianceRef[], dihr: ComplianceRef[], isAbsolute }`.
> Il mapping CFR esiste già nel catalogo `FUNDAMENTAL_RIGHTS` (`charter_art`, `is_absolute`): la mappa
> riusa quegli `id`.

---

## 5. Piano di refactor (a step, ognuno con `npx tsc --noEmit` = 0 errori)

**Step 0 — Fondamenta (nessuna UI).**
Creare `assessment-schema.ts` e `correlation-map.ts`. Aggiungere chiave `assessment` a `STORAGE_KEYS`.
Funzioni helper: `seedAssessmentFromClassifier()`, `getAssessment()`, `patchShared()`,
`addCorrelatedRisk()`, `applyMitigationToRegister()`.

**Step 1 — Migrazione FRIA nel dossier.**
Spostare la persistenza di `FRIADocument` da `aicomply_fria_document` dentro `assessment.fria`
(con migrazione one-shot: se esiste la vecchia chiave, importala e poi deprecala). FRIA continua a
funzionare identica; cambia solo dove legge/scrive.

**Step 2 — `shared` come fonte di verità.**
Classifier scrive `assessment.shared`. DPIA e FRIA leggono gli identitari da lì (sola lettura) invece di
ridichiararli. `FRIAContext.dpia_done` derivato dalla DPIA.

**Step 3 — Rischi correlati + risk-register.**
Generare `CorrelatedRisk[]` da `DPIAThreat[]` e `FRIARightImpact[]`, applicando `correlation-map`.
Bottone "Applica mitigazione" → crea voce in `RiskManagerResult.risks[]` e setta
`mitigation.appliedToRegister = true`.

**Step 4 — Due viste sullo stesso oggetto.**
DPIA e FRIA diventano route che leggono/scrivono lo stesso `Assessment`. Stepper condiviso
Intake → Analysis → Mitigations → Export. `shared` mostrato in sola lettura in entrambe.

**Step 5 — Export.**
Componente unico che genera il PDF (B/W) leggendo `Assessment` per DPO. Riusa la spec PDF esistente
(`docs/PDF-A3-PAdES-SPEC.md`).

---

## 6. Direttive di design (B/W) — da applicare durante gli step 4–5

- **Palette:** solo scala di grigi `neutral-50 … neutral-950`. Rimuovere ogni `T.blue` / blu / indigo
  (presente almeno in `fria/page.tsx`, oggetto `T` ~riga 41, e `RiskColor` include `"blue"`).
- **Componenti:** Action Cards (bordo `1px solid neutral-200`, shadow minima); Stepper per il flusso;
  Badge severità in grigio (chiaro = basso → nero = critico).
- **Focus Mode:** nasconde le sidebar durante la compilazione delle sezioni critiche.
- **Output normativo:** ogni rischio renderizzato come `[Rischio] | [Severità] | [Rif. normativo]`,
  con `refs` dalla tabella di correlazione. Testi generati (`generateText`) in tono asciutto, con citazione
  della fonte (es. "Ai sensi del framework del Danish Institute for Human Rights…").
- **Pulizia:** rimuovere i commenti `[verify against current AI Act text]` residui.

---

## 7. Rischi & note d'implementazione

- `DPIAResult` e `FRIADocument` **non** vanno appiattiti: si referenziano. Riduce il rischio di regressione
  sui due tool da ~3000 righe complessive.
- La migrazione FRIA (Step 1) richiede un import one-shot dalla vecchia chiave per non perdere i dati
  utente esistenti in localStorage / Supabase.
- `appliedToRegister` deve essere idempotente (non duplicare la voce nel risk-register se ricliccato).
- Mantenere il fallback legacy di `readFromStorage` finché non si è certi che tutti i progetti siano
  migrati.
```
