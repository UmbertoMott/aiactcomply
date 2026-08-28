"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useRef, useEffect, useCallback } from "react"
import { Bot, ScanSearch, PenLine, FileDown, Send, Trash2 } from "lucide-react"
import { useT } from "@/i18n/LocaleProvider"

type TFn = (key: string) => string
import { classifyChat, type ChatMessage as ClassifyChatMsg } from "@/app/actions/classifyChat"
import {
  loadInventory, addSystem, updateSystem, deleteSystem,
  nextSystemId, computeObligationCount,
} from "@/lib/inventory/ai-system"
import type { AISystem, SystemTier } from "@/lib/inventory/ai-system"
import { draftAiSystem } from "@/app/actions/draftAiSystem"
import type { AiSystemDraft } from "@/app/actions/draftAiSystem"
import { matchKnownSystem } from "@/lib/inventory/known-systems"
import { parseInventoryCsv, buildSystemFromRow } from "@/lib/inventory/csv-import"
import {
  simulateScan, SOURCE_CATALOG,
  type SourceType, type DiscoverySource, type DiscoveredSystem,
} from "@/lib/simulation/discovery-engine"

// ─── Palette + guida tier ─────────────────────────────────────────────────────
type TierCfg = {
  label: string; bg: string; border: string; text: string; dot: string;
  article: string;
  what: string;
  examples: string[];
  obligations: string[];
}
const TIER_CONFIG: Record<SystemTier, TierCfg> = {
  prohibited: {
    label: "Vietato", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.25)", text: "#dc2626", dot: "#dc2626",
    article: "Art. 5 AI Act",
    what: "Il sistema utilizza tecniche proibite: manipolazione subliminale, sfruttamento delle vulnerabilità, social scoring governativo, identificazione biometrica in tempo reale in spazi pubblici (con eccezioni limitate), sistemi di inferenza delle emozioni sul lavoro/scuola.",
    examples: ["Sistema di scoring della fiducia cittadina per la PA", "Riconoscimento facciale live in piazze o strade", "AI che deduce lo stato emotivo degli studenti durante gli esami", "Chatbot che manipola l'utente sfruttandone la solitudine"],
    obligations: ["Non puoi deploiarlo — punto.", "Verifica se il tuo sistema rientra nelle eccezioni molto limitate (es. ricerca di persone scomparse)", "In caso di dubbio, consulta immediatamente un legale specializzato in AI Act"],
  },
  high_risk: {
    label: "Alto rischio", bg: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.25)", text: "#ea580c", dot: "#ea580c",
    article: "Art. 6 + Allegato III AI Act",
    what: "Il sistema prende o influenza decisioni che impattano significativamente persone fisiche in settori sensibili elencati nell'Allegato III (occupazione, istruzione, servizi essenziali, forze dell'ordine, migrazione, giustizia, infrastrutture critiche).",
    examples: ["AI per la pre-selezione dei CV", "Sistema di scoring del credito bancario", "AI per l'assegnazione di sussidi di disoccupazione", "Diagnosi medica assistita da AI", "AI per la valutazione del rischio di recidiva penale"],
    obligations: ["Documentazione tecnica completa (Art. 11 + Allegato IV)", "FRIA — Valutazione impatto diritti fondamentali (Art. 27)", "Risk Register Art. 9", "Supervisione umana obbligatoria (Art. 14)", "Registrazione nel database EU (Art. 49)", "Conformità assessment prima del deployment"],
  },
  limited: {
    label: "Limitato", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)", text: "#d97706", dot: "#d97706",
    article: "Art. 50 AI Act",
    what: "Il sistema interagisce con persone o genera contenuti, ma non prende decisioni ad alto impatto. L'obbligo principale è la trasparenza: l'utente deve sempre sapere che sta interagendo con un AI.",
    examples: ["Chatbot di assistenza clienti", "AI che genera testi o immagini su richiesta", "Deepfake o contenuti sintetici (audio/video)", "Assistente virtuale sul sito web", "AI che risponde a email in modo automatico"],
    obligations: ["Dichiarazione esplicita all'utente che sta interagendo con un AI (Art. 50(1))", "Etichettatura dei contenuti generati da AI (Art. 50(2))", "Nessuna conformity assessment, nessuna registrazione obbligatoria"],
  },
  minimal: {
    label: "Minimale", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.25)", text: "#16a34a", dot: "#16a34a",
    article: "Art. 69 AI Act",
    what: "Il sistema non rientra nelle categorie proibite, ad alto rischio o a rischio limitato. Nessun obbligo legale obbligatorio — si applica solo un regime volontario di buone pratiche.",
    examples: ["Filtro antispam nella posta elettronica", "Algoritmo di raccomandazione prodotti in e-commerce", "AI per il riconoscimento di immagini in un'app fotografica", "Assistente per la scrittura di email interne", "Ottimizzazione logistica aziendale"],
    obligations: ["Nessun obbligo obbligatorio per legge", "Volontario: adesione a codici di condotta (Art. 69)", "Raccomandato: documentazione interna minima e governance AI di base"],
  },
  gpai: {
    label: "GPAI", bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.25)", text: "#6366f1", dot: "#6366f1",
    article: "Art. 51–55 AI Act",
    what: "Stai usando (come deployer) o distribuendo (come provider) un modello di IA per uso generale — un modello fondazionale come GPT, Claude, Gemini, Llama — che può essere usato per molteplici scopi. Gli obblighi variano a seconda del ruolo.",
    examples: ["GPT-4 integrato nel tuo prodotto via API", "Claude usato per generare report automatici", "Llama 3 fine-tuned su dati aziendali", "Gemini integrato in un assistente HR interno", "Modello open source adattato per uso in produzione"],
    obligations: ["Se sei provider del modello GPAI: documentazione tecnica, diritti d'autore, politica d'uso accettabile (Art. 53)", "Se sei deployer: verifica dei termini d'uso del provider, trasparenza verso utenti", "Valutazione se il modello supera la soglia di rischio sistemico (10²⁵ FLOP)"],
  },
  gpai_systemic: {
    label: "GPAI Sistemico", bg: "rgba(139,92,246,0.07)", border: "rgba(139,92,246,0.25)", text: "#7c3aed", dot: "#7c3aed",
    article: "Art. 55 AI Act",
    what: "Modello GPAI con capacità computazionale di addestramento superiore a 10²⁵ FLOP — classificato come modello con rischio sistemico potenziale per la società. Si applicano obblighi aggiuntivi rispetto al GPAI standard.",
    examples: ["GPT-4 (OpenAI) — provider", "Gemini Ultra (Google) — provider", "Claude 3 Opus (Anthropic) — provider", "Llama 3.1 405B — provider o deployer che lo ridistribuisce"],
    obligations: ["Tutti gli obblighi GPAI base (Art. 53)", "Valutazione e mitigazione rischi sistemici (Art. 55(1)(a))", "Test avversariali red-team obbligatori (Art. 55(1)(b))", "Segnalazione incidenti gravi alla Commissione EU (Art. 55(1)(c))", "Misure di cybersecurity (Art. 55(1)(d))"],
  },
  unclassified: {
    label: "Non classificato", bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.12)", text: "#6b7280", dot: "#9ca3af",
    article: "Da determinare",
    what: "Non hai ancora completato la classificazione di questo sistema. Finché rimane non classificato, non puoi generare documentazione di conformità per esso.",
    examples: ["Sistema in fase di valutazione iniziale", "Sistema appena aggiunto all'inventario", "Sistema per cui è in corso una consulenza legale sulla classificazione"],
    obligations: ["Nessun obbligo specifico fino alla classificazione", "Raccomandato: completare la classificazione prima del deployment"],
  },
}

// ─── Guida ruolo ──────────────────────────────────────────────────────────────
const ROLE_GUIDE: Record<string, { what: string; example: string; article: string }> = {
  provider:             { article: "Art. 3(3)", what: "Hai sviluppato o fatto sviluppare il sistema AI e lo metti a disposizione sul mercato o in servizio — anche per uso proprio.", example: "Hai addestrato o customizzato il modello; sei il titolare del sistema." },
  deployer:             { article: "Art. 3(4)", what: "Usi un sistema AI sviluppato da altri nell'ambito della tua attività professionale, per produrre effetti su persone fisiche.", example: "Hai acquistato o integrato un sistema AI di un fornitore terzo nel tuo processo aziendale." },
  importer:             { article: "Art. 3(6)", what: "Stabilito nell'UE, metti a disposizione sul mercato UE un sistema AI sviluppato fuori UE.", example: "Rivenditore europeo di un sistema AI di un'azienda americana o asiatica." },
  distributor:          { article: "Art. 3(7)", what: "Rendi disponibile sul mercato un sistema AI sviluppato da altri, senza modificarlo (altrimenti diventi provider).", example: "Marketplace o rivenditore che distribuisce AI senza modificarne il funzionamento." },
  authorized_rep:       { article: "Art. 3(5)", what: "Persona fisica o giuridica stabilita nell'UE che agisce per conto di un provider extra-UE.", example: "Ufficio europeo di un'azienda AI americana, nominato come rappresentante ufficiale UE." },
  product_manufacturer: { article: "Art. 25(1)(b)", what: "Produttore di un prodotto che incorpora un sistema AI come componente, che mette a disposizione il prodotto finale.", example: "Casa automobilistica che integra AI nel sistema di guida assistita." },
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Pianificato", in_development: "In sviluppo",
  in_production: "In produzione", deprecated: "Deprecato",
}
const ROLE_LABELS: Record<string, string> = {
  provider: "Provider", deployer: "Deployer", importer: "Importatore",
  distributor: "Distributore", authorized_rep: "Rapp. autorizzato",
  product_manufacturer: "Prod. prodotto",
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7,
  border: "1px solid rgba(0,0,0,0.12)", fontSize: 13,
  outline: "none", boxSizing: "border-box", background: "white",
}

// ─── AI Badge ─────────────────────────────────────────────────────────────────
function AiBadge() {
  const t = useT("toolInventory")
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
      background: "rgba(217,119,6,0.08)", color: "#d97706",
      border: "1px solid rgba(217,119,6,0.15)",
    }}>
      ✦ {t("aiVerify")}
    </span>
  )
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────
function FieldLabel({ label, showAi }: { label: string; showAi: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
      {showAi && <AiBadge />}
    </div>
  )
}

// ─── ModalShell ───────────────────────────────────────────────────────────────
function ModalShell({
  title, subtitle, maxWidth = 700, onClose, children,
}: {
  title: string; subtitle?: string; maxWidth?: number
  onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "white", borderRadius: 16, width: "100%",
        maxWidth, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          padding: "18px 22px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: "white", zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        <div style={{ padding: "20px 22px" }}>{children}</div>
      </div>
    </div>
  )
}

// ─── SystemCard ───────────────────────────────────────────────────────────────
function SystemCard({ system, onEdit, onClassify, onDelete }: {
  system: AISystem; onEdit: () => void; onClassify: () => void; onDelete: () => void
}) {
  const t = useT("toolInventory")
  const cfg = TIER_CONFIG[system.tier]
  const { total, done } = computeObligationCount(system)
  const pct = total > 0 ? Math.round((done / total) * 100) : 100
  const needsReview = system.nextReview
    ? new Date(system.nextReview) <= new Date(Date.now() + 30 * 86400000)
    : false

  return (
    <div style={{ background: "white", borderRadius: 12, border: `1px solid ${cfg.border}`, overflow: "hidden" }}>
      <div style={{ height: 4, background: cfg.dot }} />
      <div style={{ padding: "14px 16px" }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
            background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
          }}>
            {t(`tier_${system.tier}_label`).toUpperCase()}
          </span>
          {system.dualRoleFlag && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
              background: "rgba(234,88,12,0.08)", color: "#ea580c", border: "1px solid rgba(234,88,12,0.2)",
            }}>⚠ Dual-role</span>
          )}
          {needsReview && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
              background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)",
            }}>{t("reviewIn30")}</span>
          )}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px", color: "#111" }}>{system.name}</h3>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>
          {system.id} · {system.owner || "—"} · {t(`status_${system.status}`)}
        </p>
        <p style={{
          fontSize: 12, color: "#6b7280", margin: "0 0 12px",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {system.description || t("noDescription")}
        </p>
        {/* Role + EU Nexus */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {system.role && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: "#374151", border: "1px solid rgba(0,0,0,0.08)" }}>
              {t(`roleLabel_${system.role}`)}
            </span>
          )}
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 4,
            background: system.euNexus ? "rgba(37,99,235,0.06)" : "rgba(0,0,0,0.04)",
            color: system.euNexus ? "#2563eb" : "#9ca3af",
            border: `1px solid ${system.euNexus ? "rgba(37,99,235,0.15)" : "rgba(0,0,0,0.08)"}`,
          }}>
            {system.euNexus ? t("euNexusYes") : t("euNexusNo")}
          </span>
        </div>
        {/* Progress obblighi */}
        {total > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{t("obligationsCompleted")}</span>
              <span style={{ fontSize: 11, color: pct === 100 ? "#16a34a" : "#374151", fontWeight: 600 }}>{done}/{total}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "#f3f4f6", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${pct}%`,
                background: pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : "#dc2626",
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}
        {/* Azioni */}
        <div style={{ display: "flex", gap: 6, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
          <Link href={`/dashboard/tools/inventory/${system.id}`} style={{
            flex: 1, padding: "6px", borderRadius: 7, textAlign: "center",
            fontSize: 12, fontWeight: 600, textDecoration: "none",
            border: "none", background: "#111", color: "white", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            {t("analysis360")}
          </Link>
          {system.tier === "unclassified" ? (
            <button onClick={onClassify} style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: "rgba(0,0,0,0.06)", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {t("classify")}
            </button>
          ) : (
            <button onClick={onClassify} style={{ padding: "6px 10px", borderRadius: 7, fontSize: 12, border: "1px solid rgba(0,0,0,0.1)", background: "white", color: "#374151", cursor: "pointer" }}>
              {t("reclassify")}
            </button>
          )}
          <button onClick={onEdit} style={{ padding: "6px 10px", borderRadius: 7, fontSize: 12, border: "1px solid rgba(0,0,0,0.1)", background: "white", color: "#374151", cursor: "pointer" }}>
            {t("edit")}
          </button>
          <button
            onClick={() => { if (confirm(`${t("confirmDelete")} "${system.name}"?`)) onDelete() }}
            style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.04)", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          ><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  const t = useT("toolInventory")
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: 14, border: "1px dashed rgba(0,0,0,0.12)" }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
        {hasFilter ? t("emptyFiltered") : t("emptyTitle")}
      </p>
      <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 400, margin: "0 auto 20px" }}>
        {hasFilter
          ? t("emptyFilteredDesc")
          : t("emptyDesc")}
      </p>
      {!hasFilter && (
        <button onClick={onAdd} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#111", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {t("addFirstSystem")}
        </button>
      )}
    </div>
  )
}

// ─── AddSystemModal ───────────────────────────────────────────────────────────
// Discovery source catalog (subset for modal — full page at /dashboard/discovery)
const MODAL_SOURCES: Array<{ type: SourceType; label: string; placeholder: string; hint: string }> = [
  { type: "github_repo",   label: "GitHub Repository",   placeholder: "https://github.com/org/repo",         hint: "Scansiona librerie AI, model files, endpoint" },
  { type: "huggingface",   label: "HuggingFace Model",   placeholder: "org/model-name",                      hint: "Rileva architettura, task, licenza" },
  { type: "npm_package",   label: "Pacchetto npm",        placeholder: "package-name@version",                hint: "Trova dipendenze AI/ML nel pacchetto" },
  { type: "docker_image",  label: "Docker Image",         placeholder: "registry/image:tag",                  hint: "Analizza layers per modelli e API" },
  { type: "aws_sagemaker", label: "AWS SageMaker",        placeholder: "endpoint-name",                       hint: "Importa endpoint come sistema AI" },
  { type: "azure_ml",      label: "Azure ML",             placeholder: "workspace/model-name",                hint: "Importa deployment Azure come sistema AI" },
]

const RISK_TIER_MAP: Record<string, SystemTier> = {
  unacceptable: "prohibited", high: "high_risk", limited: "limited", minimal: "minimal",
}

type AddStep = "channel" | "describe" | "discovery" | "review"

function AddSystemModal({ onClose, onSave, existingSystems, initialStep = "channel" }: {
  onClose: () => void; onSave: () => void; existingSystems: AISystem[]
  initialStep?: AddStep
}) {
  const t = useT("toolInventory")
  const [step, setStep] = React.useState<AddStep>(initialStep)
  const [freeText, setFreeText] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [draft, setDraft] = React.useState<AiSystemDraft | null>(null)
  const [knownMatch, setKnownMatch] = React.useState<ReturnType<typeof matchKnownSystem>>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Discovery state
  const [discSourceType, setDiscSourceType] = React.useState<SourceType>("github_repo")
  const [discInput, setDiscInput] = React.useState("")
  const [discScanning, setDiscScanning] = React.useState(false)
  const [discResults, setDiscResults] = React.useState<DiscoveredSystem[] | null>(null)

  // Form fields
  const [name, setName] = React.useState("")
  const [owner, setOwner] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState("in_production")
  const [euNexus, setEuNexus] = React.useState(true)
  const [role, setRole] = React.useState("")
  const [roleBasis, setRoleBasis] = React.useState("")
  const [tier, setTier] = React.useState("unclassified")
  const [tierBasis, setTierBasis] = React.useState("")
  const [obligationsNote, setObligationsNote] = React.useState("")
  const [aiFields, setAiFields] = React.useState<Set<string>>(new Set())

  function removeAiField(field: string) {
    setAiFields(f => { const n = new Set(f); n.delete(field); return n })
  }

  function applyDraft(d: AiSystemDraft) {
    setName(d.name ?? ""); setOwner(d.owner ?? ""); setDescription(d.description ?? "")
    setStatus(d.status ?? "in_production"); setEuNexus(d.euNexus ?? true)
    setRole(d.role ?? ""); setRoleBasis(d.roleBasis ?? "")
    setTier(d.tier ?? "unclassified"); setTierBasis(d.tierBasis ?? "")
    setObligationsNote(d.obligationsNote ?? "")
    setAiFields(new Set(["name","owner","description","status","euNexus","role","roleBasis","tier","tierBasis","obligationsNote"]))
  }

  function applyDiscovered(sys: DiscoveredSystem) {
    setName(sys.name)
    setDescription(sys.description)
    setStatus("in_production")
    setTier(RISK_TIER_MAP[sys.inferredRiskLevel] ?? "unclassified")
    setTierBasis(sys.inferredAnnexCategory ? `${sys.inferredAnnexCategory} — rilevato automaticamente da Discovery` : "Rilevato automaticamente — verificare")
    setObligationsNote(sys.evidence.slice(0, 3).join("; "))
    setAiFields(new Set(["name","description","tier","tierBasis","obligationsNote"]))
    setStep("review")
  }

  function handleDiscoveryScan() {
    if (!discInput.trim()) return
    setDiscScanning(true)
    setDiscResults(null)
    const source: DiscoverySource = {
      id: `modal-${Date.now()}`,
      type: discSourceType,
      label: discInput.trim(),
      config: { url: discInput.trim(), repo: discInput.trim(), model: discInput.trim(), package: discInput.trim(), endpoint: discInput.trim() },
      status: "scanning",
    }
    setTimeout(() => {
      try {
        const results = simulateScan(source)
        setDiscResults(results.length > 0 ? results : [])
      } catch {
        setDiscResults([])
      }
      setDiscScanning(false)
    }, 1400)
  }

  async function handleGenerate() {
    if (freeText.trim().length < 15) return
    setLoading(true); setError(null)
    const known = matchKnownSystem(freeText)
    setKnownMatch(known)
    const result = await draftAiSystem(
      freeText,
      existingSystems.map(s => ({ id: s.id, name: s.name, description: s.description }))
    )
    setLoading(false)
    if ("error" in result) { setError(result.error); return }
    setDraft(result); applyDraft(result); setStep("review")
  }

  function handleSave() {
    if (!name.trim()) return
    const sys: AISystem = {
      id: nextSystemId(), name: name.trim(), owner: owner.trim(), description: description.trim(),
      status: status as AISystem["status"], euNexus,
      role: (role || null) as AISystem["role"], roleBasis: roleBasis.trim(),
      tier: tier as SystemTier, tierBasis: tierBasis.trim(),
      dualRoleFlag: draft?.dualRoleFlag ?? false,
      obligationsAssessed: false, obligationsNote: obligationsNote.trim(),
      nextReview: draft?.nextReview ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      reviewTrigger: "on substantial modification or annually",
      completedObligations: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      source: step === "review" && discResults ? "import" : draft ? "ai_draft" : "manual",
    }
    addSystem(sys); onSave()
  }

  const isDescribeReady = !loading && freeText.trim().length >= 15
  const discSrc = MODAL_SOURCES.find(s => s.type === discSourceType)!

  // ── Title/subtitle per step
  const titles: Record<typeof step, { title: string; sub: string; maxW: number }> = {
    channel:   { title: t("add_channel_title"), sub: t("add_channel_sub"), maxW: 520 },
    describe:  { title: t("add_describe_title"), sub: t("add_describe_sub"), maxW: 520 },
    discovery: { title: t("add_discovery_title"), sub: t("add_discovery_sub"), maxW: 560 },
    review:    { title: t("add_review_title"), sub: t("add_review_sub"), maxW: 700 },
  }
  const { title, sub, maxW } = titles[step]

  return (
    <ModalShell title={title} subtitle={sub} maxWidth={maxW} onClose={onClose}>

      {/* ── STEP 0: Channel selection ── */}
      {step === "channel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              key: "ai" as const,
              label: t("ch_ai_label"),
              badge: t("ch_recommended"),
              desc: t("ch_ai_desc"),
              action: () => setStep("describe"),
            },
            {
              key: "discovery" as const,
              label: t("ch_discovery_label"),
              badge: t("ch_automatic"),
              desc: t("ch_discovery_desc"),
              action: () => setStep("discovery"),
            },
            {
              key: "manual" as const,
              label: t("ch_manual_label"),
              badge: t("ch_form"),
              desc: t("ch_manual_desc"),
              action: () => { setStep("review"); setAiFields(new Set()) },
            },
          ].map((ch, i) => (
            <button key={ch.key} onClick={ch.action} style={{
              display: "flex", alignItems: "flex-start", gap: 14, width: "100%",
              padding: "14px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
              border: i === 0 ? "1.5px solid #0D1016" : "1px solid rgba(0,0,0,0.10)",
              background: i === 0 ? "#0D1016" : "white",
              transition: "border-color 0.15s, background 0.15s",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "white" : "#0D1016" }}>{ch.label}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: i === 0 ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
                    color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.40)",
                  }}>{ch.badge}</span>
                </div>
                <p style={{ fontSize: 12, color: i === 0 ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)", margin: 0, lineHeight: 1.45 }}>
                  {ch.desc}
                </p>
              </div>
              <span style={{ fontSize: 16, color: i === 0 ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.20)", flexShrink: 0, marginTop: 2 }}>→</span>
            </button>
          ))}
        </div>
      )}

      {/* ── STEP 1a: AI describe ── */}
      {step === "describe" && (
        <>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder={t("describePh")}
            rows={5}
            style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit", lineHeight: 1.55 }}
          />
          {error && <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleGenerate} disabled={!isDescribeReady} style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              background: isDescribeReady ? "#111" : "#e5e7eb",
              color: isDescribeReady ? "white" : "#9ca3af",
              fontSize: 13, fontWeight: 600, cursor: isDescribeReady ? "pointer" : "default",
            }}>
              {loading ? t("analyzing") : t("analyzeAiFill")}
            </button>
            <button onClick={() => setStep("channel")} style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(0,0,0,0.12)", background: "white", color: "#374151", cursor: "pointer" }}>
              {t("backChannels")}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, textAlign: "center" }}>
            {t("aiFieldsNote")}
          </p>
        </>
      )}

      {/* ── STEP 1b: Discovery ── */}
      {step === "discovery" && (
        <>
          {/* Source type selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
            {MODAL_SOURCES.map(src => (
              <button key={src.type} onClick={() => { setDiscSourceType(src.type); setDiscInput(""); setDiscResults(null) }} style={{
                padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                border: discSourceType === src.type ? "1.5px solid #0D1016" : "1px solid rgba(0,0,0,0.10)",
                background: discSourceType === src.type ? "#0D1016" : "white",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: discSourceType === src.type ? "white" : "#0D1016", display: "block" }}>
                  {src.label}
                </span>
              </button>
            ))}
          </div>

          {/* Input + scan */}
          <p style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", margin: "0 0 6px" }}>{discSrc.hint}</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              value={discInput}
              onChange={e => { setDiscInput(e.target.value); setDiscResults(null) }}
              placeholder={discSrc.placeholder}
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
            <button
              onClick={handleDiscoveryScan}
              disabled={!discInput.trim() || discScanning}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none", whiteSpace: "nowrap",
                background: discInput.trim() && !discScanning ? "#0D1016" : "#e5e7eb",
                color: discInput.trim() && !discScanning ? "white" : "#9ca3af",
                fontSize: 12, fontWeight: 600, cursor: discInput.trim() && !discScanning ? "pointer" : "default",
              }}
            >
              {discScanning ? t("scanning") : t("scan")}
            </button>
          </div>

          {/* Results */}
          {discScanning && (
            <div style={{ padding: "20px", textAlign: "center", color: "rgba(0,0,0,0.40)", fontSize: 13 }}>
              {t("scanningSource")}
            </div>
          )}
          {discResults !== null && !discScanning && (
            discResults.length === 0 ? (
              <div style={{ padding: "16px", borderRadius: 8, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "rgba(0,0,0,0.40)", margin: 0 }}>{t("noSystemDetected")}</p>
                <p style={{ fontSize: 11, color: "rgba(0,0,0,0.30)", margin: "4px 0 0" }}>{t("tryOtherSource")}</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>
                  {discResults.length} {discResults.length > 1 ? t("systemsDetected") : t("systemDetected")}
                </p>
                {discResults.map(sys => (
                  <button key={sys.id} onClick={() => applyDiscovered(sys)} style={{
                    display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                    padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                    border: "1px solid rgba(0,0,0,0.10)", background: "white",
                    transition: "border-color 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1016" }}>{sys.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                        background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.40)",
                      }}>
                        {sys.confidence.toUpperCase()} {t("confidenceWord")}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", margin: "0 0 6px", lineHeight: 1.4 }}>{sys.description}</p>
                    {sys.evidence.slice(0, 2).map((e, i) => (
                      <span key={i} style={{
                        display: "inline-block", fontSize: 10, padding: "2px 7px", borderRadius: 4, marginRight: 4,
                        background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.45)",
                      }}>{e}</span>
                    ))}
                    <span style={{ fontSize: 11, color: "rgba(0,0,0,0.30)", float: "right" }}>{t("importArrow")}</span>
                  </button>
                ))}
              </div>
            )
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => setStep("channel")} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, border: "1px solid rgba(0,0,0,0.10)", background: "white", color: "#374151", cursor: "pointer" }}>
              {t("backChannels")}
            </button>
            <button onClick={() => { setStep("review"); setAiFields(new Set()) }} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, border: "1px solid rgba(0,0,0,0.10)", background: "white", color: "#374151", cursor: "pointer", marginLeft: "auto" }}>
              {t("manualEntry")}
            </button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          {/* Banner confidenza AI */}
          {draft && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 18,
              background: draft.confidenceLevel === "high" ? "rgba(22,163,74,0.05)" : "rgba(217,119,6,0.05)",
              border: `1px solid ${draft.confidenceLevel === "high" ? "rgba(22,163,74,0.2)" : "rgba(217,119,6,0.2)"}`,
            }}>
              <p style={{ fontSize: 12, margin: 0, color: draft.confidenceLevel === "high" ? "#16a34a" : "#d97706" }}>
                <strong>{t("aiConfidence")} {draft.confidenceLevel.toUpperCase()}</strong> — {draft.confidenceNote}
              </p>
              {draft.knownVendor && (
                <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>
                  {t("recognizedSystem")} <strong>{draft.knownVendor}</strong>
                </p>
              )}
            </div>
          )}
          {/* Banner sistema noto */}
          {knownMatch?.warningNote && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 18, background: "rgba(234,88,12,0.05)", border: "1px solid rgba(234,88,12,0.2)" }}>
              <p style={{ fontSize: 12, color: "#ea580c", margin: 0 }}>⚠ {knownMatch.warningNote}</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel label={t("f_systemName")} showAi={aiFields.has("name")} />
              <input value={name} onChange={e => { setName(e.target.value); removeAiField("name") }} style={INPUT_STYLE} />
            </div>
            <div>
              <FieldLabel label={t("f_owner")} showAi={aiFields.has("owner")} />
              <input value={owner} onChange={e => { setOwner(e.target.value); removeAiField("owner") }} style={INPUT_STYLE} placeholder={t("ownerPh")} />
            </div>
            <div>
              <FieldLabel label={t("f_status")} showAi={aiFields.has("status")} />
              <select value={status} onChange={e => { setStatus(e.target.value); removeAiField("status") }} style={INPUT_STYLE}>
                <option value="planned">{t("status_planned")}</option>
                <option value="in_development">{t("status_in_development")}</option>
                <option value="in_production">{t("status_in_production")}</option>
                <option value="deprecated">{t("status_deprecated")}</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel label={t("f_description")} showAi={aiFields.has("description")} />
              <textarea value={description} onChange={e => { setDescription(e.target.value); removeAiField("description") }} rows={3} style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="euNexusAdd" checked={euNexus} onChange={e => { setEuNexus(e.target.checked); removeAiField("euNexus") }} style={{ width: 16, height: 16 }} />
              <label htmlFor="euNexusAdd" style={{ fontSize: 13, color: "#374151" }}>
                {t("euNexusFull")}
                {aiFields.has("euNexus") && <span style={{ fontSize: 10, color: "#d97706", marginLeft: 6, fontWeight: 600 }}>✦ AI</span>}
              </label>
            </div>
            <div>
              <FieldLabel label={t("f_role")} showAi={aiFields.has("role")} />
              <select value={role} onChange={e => { setRole(e.target.value); removeAiField("role") }} style={INPUT_STYLE}>
                <option value="">{t("role_undefined")}</option>
                <option value="provider">Provider</option>
                <option value="deployer">Deployer</option>
                <option value="importer">{t("role_importer")}</option>
                <option value="distributor">{t("role_distributor")}</option>
                <option value="authorized_rep">{t("role_authorized_rep")}</option>
                <option value="product_manufacturer">{t("role_product_manufacturer")}</option>
              </select>
            </div>
            <div>
              <FieldLabel label={t("f_tier")} showAi={aiFields.has("tier")} />
              <select value={tier} onChange={e => { setTier(e.target.value); removeAiField("tier") }} style={INPUT_STYLE}>
                <option value="unclassified">{t("tier_unclassified_opt")}</option>
                <option value="prohibited">{t("tier_prohibited_opt")}</option>
                <option value="high_risk">{t("tier_high_risk_opt")}</option>
                <option value="limited">{t("tier_limited_opt")}</option>
                <option value="minimal">{t("tier_minimal_opt")}</option>
                <option value="gpai">{t("tier_gpai_opt")}</option>
                <option value="gpai_systemic">{t("tier_gpai_systemic_opt")}</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel label={t("f_roleBasis")} showAi={aiFields.has("roleBasis")} />
              <input value={roleBasis} onChange={e => { setRoleBasis(e.target.value); removeAiField("roleBasis") }} style={INPUT_STYLE} placeholder={t("roleBasisPh")} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel label={t("f_tierBasis")} showAi={aiFields.has("tierBasis")} />
              <input value={tierBasis} onChange={e => { setTierBasis(e.target.value); removeAiField("tierBasis") }} style={INPUT_STYLE} placeholder={t("tierBasisPh")} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel label={t("f_obligations")} showAi={aiFields.has("obligationsNote")} />
              <textarea value={obligationsNote} onChange={e => { setObligationsNote(e.target.value); removeAiField("obligationsNote") }} rows={2} style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 8 }}>
            <button onClick={() => setStep("describe")} style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(0,0,0,0.12)", background: "white", color: "#374151", cursor: "pointer" }}>
              {t("rewriteDescription")}
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: name.trim() ? "#111" : "#e5e7eb", color: name.trim() ? "white" : "#9ca3af", fontSize: 13, fontWeight: 600, cursor: name.trim() ? "pointer" : "default" }}
            >
              {t("saveSystem")}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  )
}


// ─── EditSystemModal ──────────────────────────────────────────────────────────
function EditSystemModal({ system, onClose, onSave }: {
  system: AISystem; onClose: () => void; onSave: () => void
}) {
  const t = useT("toolInventory")
  const [name, setName] = React.useState(system.name)
  const [owner, setOwner] = React.useState(system.owner)
  const [description, setDescription] = React.useState(system.description)
  const [status, setStatus] = React.useState(system.status)
  const [euNexus, setEuNexus] = React.useState(system.euNexus)
  const [obligationsNote, setObligationsNote] = React.useState(system.obligationsNote)
  const [nextReview, setNextReview] = React.useState(system.nextReview)
  const [reviewTrigger, setReviewTrigger] = React.useState(system.reviewTrigger)
  const [dualRoleFlag, setDualRoleFlag] = React.useState(system.dualRoleFlag)

  function handleSave() {
    if (!name.trim()) return
    updateSystem(system.id, {
      name: name.trim(), owner: owner.trim(), description: description.trim(),
      status: status as AISystem["status"], euNexus,
      obligationsNote: obligationsNote.trim(),
      nextReview, reviewTrigger, dualRoleFlag,
    })
    onSave()
  }

  return (
    <ModalShell title={`${t("editWord")} — ${system.id}`} subtitle={system.name} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel label={t("f_systemName")} showAi={false} />
          <input value={name} onChange={e => setName(e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <FieldLabel label={t("f_owner")} showAi={false} />
          <input value={owner} onChange={e => setOwner(e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <FieldLabel label={t("f_status")} showAi={false} />
          <select value={status} onChange={e => setStatus(e.target.value as AISystem["status"])} style={INPUT_STYLE}>
            <option value="planned">{t("status_planned")}</option>
            <option value="in_development">{t("status_in_development")}</option>
            <option value="in_production">{t("status_in_production")}</option>
            <option value="deprecated">{t("status_deprecated")}</option>
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel label={t("f_description")} showAi={false} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="euNexusEdit" checked={euNexus} onChange={e => setEuNexus(e.target.checked)} style={{ width: 16, height: 16 }} />
          <label htmlFor="euNexusEdit" style={{ fontSize: 13, color: "#374151" }}>{t("euNexusActive")}</label>
        </div>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="dualRole" checked={dualRoleFlag} onChange={e => setDualRoleFlag(e.target.checked)} style={{ width: 16, height: 16 }} />
          <label htmlFor="dualRole" style={{ fontSize: 13, color: "#374151" }}>
            {t("dualRoleFull")}
          </label>
        </div>
        <div>
          <FieldLabel label={t("f_nextReview")} showAi={false} />
          <input type="date" value={nextReview} onChange={e => setNextReview(e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <FieldLabel label={t("f_reviewTrigger")} showAi={false} />
          <input value={reviewTrigger} onChange={e => setReviewTrigger(e.target.value)} style={INPUT_STYLE} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel label={t("f_obligationsShort")} showAi={false} />
          <textarea value={obligationsNote} onChange={e => setObligationsNote(e.target.value)} rows={2} style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 8 }}>
        <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(0,0,0,0.12)", background: "white", color: "#374151", cursor: "pointer" }}>{t("cancel")}</button>
        <button onClick={handleSave} disabled={!name.trim()} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: name.trim() ? "#111" : "#e5e7eb", color: name.trim() ? "white" : "#9ca3af", fontSize: 13, fontWeight: 600, cursor: name.trim() ? "pointer" : "default" }}>
          {t("saveChanges")}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── ClassifyModal ─────────────────────────────────────────────────────────────
function ClassifyModal({ system, onClose, onSave }: {
  system: AISystem; onClose: () => void; onSave: () => void
}) {
  const t = useT("toolInventory")
  // Form state — valori vuoti all'apertura (placeholder guida l'utente)
  const [role, setRole] = React.useState(system.role ?? "")
  const [roleBasis, setRoleBasis] = React.useState("")
  const [tier, setTier] = React.useState(system.tier)
  const [tierBasis, setTierBasis] = React.useState("")
  const [dualRoleFlag, setDualRoleFlag] = React.useState(system.dualRoleFlag)
  const [obligationsNote, setObligationsNote] = React.useState("")
  const [showTierGuide, setShowTierGuide] = React.useState(true)
  const [showRoleGuide, setShowRoleGuide] = React.useState(false)

  // Chat AI state
  const initMsg: ClassifyChatMsg = {
    role: "assistant",
    content: `${t("chatGreetPre")} "${system.name}" ${t("chatGreetPost")}`,
  }
  const [chatMessages, setChatMessages] = React.useState<ClassifyChatMsg[]>([initMsg])
  const [chatInput, setChatInput] = React.useState("")
  const [chatLoading, setChatLoading] = React.useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const tierCfg = TIER_CONFIG[tier as SystemTier] ?? TIER_CONFIG.unclassified
  const roleGuide = role ? ROLE_GUIDE[role] : null

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const userMsg: ClassifyChatMsg = { role: "user", content: text }
    const updated = [...chatMessages, userMsg]
    setChatMessages(updated)
    setChatInput("")
    setChatLoading(true)
    const result = await classifyChat(updated, system.name)
    setChatLoading(false)
    if (result.error) {
      setChatMessages([...updated, { role: "assistant", content: result.error }])
      return
    }
    const aiMsg: ClassifyChatMsg = { role: "assistant", content: result.reply ?? "" }
    setChatMessages([...updated, aiMsg])
    // Auto-applica suggerimento dal campo <suggest>
    if (result.suggestion) {
      const s = result.suggestion
      if (s.tier && TIER_CONFIG[s.tier as SystemTier]) setTier(s.tier as SystemTier)
      if (s.role) setRole(s.role)
      if (s.roleBasis) setRoleBasis(s.roleBasis)
      if (s.tierBasis) setTierBasis(s.tierBasis)
      if (s.obligationsNote) setObligationsNote(s.obligationsNote)
    }
  }, [chatInput, chatLoading, chatMessages, system.name])

  function handleSave() {
    updateSystem(system.id, {
      role: (role || null) as AISystem["role"],
      roleBasis: roleBasis.trim(),
      tier: tier as SystemTier,
      tierBasis: tierBasis.trim(),
      dualRoleFlag,
      obligationsNote: obligationsNote.trim(),
      obligationsAssessed: tier !== "unclassified",
    })
    onSave()
  }

  const canSave = tier !== "unclassified"
    ? tierBasis.trim().length > 0
    : true

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.45)", padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 16, width: "min(95vw, 1060px)", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0D1016", margin: 0 }}>{t("classify")} — {system.name}</h2>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0" }}>{t("classifySub")}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, marginTop: 2 }}>✕</button>
        </div>

        {/* Body — split layout */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ─── SINISTRA: form ─────────────────────────────────────── */}
          <div style={{ flex: "0 0 56%", overflowY: "auto", padding: "18px 20px", borderRight: "1px solid rgba(0,0,0,0.06)" }}>

            {/* Banner */}
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(13,16,22,0.04)", border: "1px solid rgba(13,16,22,0.10)" }}>
              <p style={{ fontSize: 12, color: "#0D1016", margin: 0, lineHeight: 1.55 }}>
                <span dangerouslySetInnerHTML={{ __html: t("classifyWarning") }} />
              </p>
            </div>

            {/* Tier buttons */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <FieldLabel label={t("tierLabel")} showAi={false} />
                <button onClick={() => setShowTierGuide(v => !v)} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  {showTierGuide ? t("hideGuide") : t("showGuide")}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))", gap: 6 }}>
                {(Object.entries(TIER_CONFIG) as [SystemTier, TierCfg][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => { setTier(key); setShowTierGuide(true); }}
                    style={{ padding: "8px 6px", borderRadius: 7, cursor: "pointer", textAlign: "center", border: `2px solid ${tier === key ? cfg.border : "rgba(0,0,0,0.08)"}`, background: tier === key ? cfg.bg : "white", transition: "all 0.1s" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, margin: "0 auto 5px" }} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: tier === key ? cfg.text : "#6b7280", margin: 0 }}>{t(`tier_${key}_label`)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Guida tier */}
            {showTierGuide && (
              <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 9, background: tierCfg.bg, border: `1px solid ${tierCfg.border}` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tierCfg.text }}>{t(`tier_${tier}_label`)}</span>
                  <span style={{ fontSize: 9, color: "#9ca3af", fontFamily: "monospace" }}>{tierCfg.article}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 }}>{t(`tier_${tier}_what`)}</p>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>{t("typicalExamples")}</p>
                <ul style={{ margin: "0 0 8px", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                  {tierCfg.examples.map((ex, i) => <li key={i} style={{ fontSize: 11, color: "#374151", lineHeight: 1.4 }}>{t(`tier_${tier}_ex${i}`)}</li>)}
                </ul>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>{t("mainObligations")}</p>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                  {tierCfg.obligations.map((ob, i) => <li key={i} style={{ fontSize: 11, color: "#374151", lineHeight: 1.4 }}>{t(`tier_${tier}_ob${i}`)}</li>)}
                </ul>
              </div>
            )}

            {/* Ruolo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <FieldLabel label={t("f_role")} showAi={false} />
                  {role && <button onClick={() => setShowRoleGuide(v => !v)} style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginBottom: 6 }}>{showRoleGuide ? t("hide") : t("whatIsIt")}</button>}
                </div>
                <select value={role} onChange={e => { setRole(e.target.value); setShowRoleGuide(true); }} style={INPUT_STYLE}>
                  <option value="">{t("role_undefined")}</option>
                  <option value="provider">Provider</option>
                  <option value="deployer">Deployer</option>
                  <option value="importer">{t("role_importer")}</option>
                  <option value="distributor">{t("role_distributor")}</option>
                  <option value="authorized_rep">{t("role_authorized_rep")}</option>
                  <option value="product_manufacturer">{t("role_product_manufacturer")}</option>
                </select>
                {showRoleGuide && roleGuide && (
                  <div style={{ marginTop: 7, padding: "9px 11px", background: "rgba(0,0,0,0.03)", borderRadius: 7, border: "1px solid rgba(0,0,0,0.07)" }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: "#6b7280", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{roleGuide.article}</p>
                    <p style={{ fontSize: 11.5, color: "#374151", margin: "0 0 4px", lineHeight: 1.45 }}>{t(`roleGuide_${role}_what`)}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0, fontStyle: "italic", lineHeight: 1.35 }}>{t(`roleGuide_${role}_ex`)}</p>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9, paddingTop: 26 }}>
                <input type="checkbox" id="dualRoleClassify" checked={dualRoleFlag} onChange={e => setDualRoleFlag(e.target.checked)} style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <label htmlFor="dualRoleClassify" style={{ fontSize: 12.5, color: "#374151", cursor: "pointer" }}>{t("dualRole25")}</label>
                  <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0", lineHeight: 1.4 }}>{t("dualRole25Desc")}</p>
                </div>
              </div>
            </div>

            {/* Campi testo con PLACEHOLDER (non precompilati) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <FieldLabel label={t("roleBasisLabel")} showAi={false} />
                <input
                  value={roleBasis}
                  onChange={e => setRoleBasis(e.target.value)}
                  style={INPUT_STYLE}
                  placeholder={t("roleBasisClassifyPh")}
                />
              </div>
              <div>
                <FieldLabel label={t("tierBasisLabel")} showAi={false} />
                <input
                  value={tierBasis}
                  onChange={e => setTierBasis(e.target.value)}
                  style={{ ...INPUT_STYLE, borderColor: "rgba(0,0,0,0.12)" }}
                  placeholder={t("tierBasisClassifyPh")}
                />
              </div>
              <div>
                <FieldLabel label={t("f_obligations")} showAi={false} />
                <textarea
                  value={obligationsNote}
                  onChange={e => setObligationsNote(e.target.value)}
                  rows={3}
                  style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }}
                  placeholder={t("obligationsClassifyPh")}
                />
                {tier !== "unclassified" && !obligationsNote.trim() && (
                  <button onClick={() => setObligationsNote(tierCfg.obligations.join("\n"))}
                    style={{ marginTop: 4, fontSize: 11, color: "#6b7280", background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>
                    {t("fillFromGuide")}
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 8 }}>
              <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(0,0,0,0.12)", background: "white", color: "#374151", cursor: "pointer" }}>{t("cancel")}</button>
              <button onClick={handleSave} disabled={!canSave}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: canSave ? "#111" : "#e5e7eb", color: canSave ? "white" : "#9ca3af", fontSize: 13, fontWeight: 600, cursor: canSave ? "pointer" : "default" }}>
                {t("confirmClassification")}
              </button>
            </div>
          </div>

          {/* ─── DESTRA: chat AI ────────────────────────────────────── */}
          <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "column", background: "#f9f9f8" }}>
            {/* Chat header */}
            <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "white", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0D1016" }}>{t("classifyAssistant")}</span>
              </div>
              <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0" }}>{t("guidedOn")}</p>
            </div>

            {/* Messaggi */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "86%", padding: "9px 13px", borderRadius: msg.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    background: msg.role === "user" ? "#0D1016" : "white",
                    border: msg.role === "assistant" ? "1px solid rgba(0,0,0,0.08)" : "none",
                    fontSize: 12, color: msg.role === "user" ? "#fff" : "#374151", lineHeight: 1.55, whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ padding: "9px 13px", borderRadius: "14px 14px 14px 3px", background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <span style={{ fontSize: 18, letterSpacing: 2, color: "#9ca3af" }}>···</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input chat */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(0,0,0,0.07)", background: "white", flexShrink: 0 }}>
              {/* Suggerimento quick reply */}
              {chatMessages.length <= 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {[
                    t("qr_chatbot"),
                    t("qr_gpt4cv"),
                    t("qr_credit"),
                    t("qr_logistics"),
                  ].map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      style={{ fontSize: 10.5, padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.03)", color: "#374151", cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder={t("chatPh")}
                  rows={2}
                  style={{ flex: 1, resize: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 9, padding: "8px 11px", fontSize: 12, color: "#0D1016", background: "#f9f9f8", outline: "none", lineHeight: 1.5, fontFamily: "inherit" }}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: chatInput.trim() && !chatLoading ? "#0D1016" : "rgba(0,0,0,0.08)", color: chatInput.trim() && !chatLoading ? "#fff" : "rgba(0,0,0,0.28)", cursor: chatInput.trim() && !chatLoading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Send size={13} />
                </button>
              </div>
              <p style={{ fontSize: 9.5, color: "#9ca3af", margin: "5px 0 0", lineHeight: 1.4 }}>
                {t("aiRepliesNote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ImportCsvModal ───────────────────────────────────────────────────────────
function ImportCsvModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const t = useT("toolInventory")
  const [csvText, setCsvText] = React.useState("")
  const [preview, setPreview] = React.useState<ReturnType<typeof parseInventoryCsv>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [imported, setImported] = React.useState(false)

  function handleParse() {
    const rows = parseInventoryCsv(csvText)
    if (rows.length === 0) {
      setError(t("noValidRows"))
      setPreview([])
      return
    }
    setPreview(rows)
    setError(null)
  }

  function handleImport() {
    // Aggiungo i sistemi uno per uno in modo che nextSystemId() veda gli aggiornamenti
    preview.forEach(row => {
      const id = nextSystemId()
      const sys = buildSystemFromRow(row, id)
      addSystem(sys)
    })
    setImported(true)
    setTimeout(() => onSave(), 1200)
  }

  const exampleCsv = `name,owner,description,status
HireVue Video Interview,HR,Sistema AI per valutazione video candidati nella selezione,in_production
GitHub Copilot,Engineering,Assistente AI alla scrittura di codice,in_production
Chatbot Supporto Clienti,Customer Care,Assistente virtuale basato su GPT-4 per il sito,in_production`

  return (
    <ModalShell title={t("importCsv")} subtitle={t("importCsvSub")} onClose={onClose}>
      {/* Istruzioni formato */}
      <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>{t("csvFormat")}</p>
        <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px" }}>
          <span dangerouslySetInnerHTML={{ __html: t("csvColumns") }} />
        </p>
        <button
          onClick={() => setCsvText(exampleCsv)}
          style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          {t("loadExample")}
        </button>
      </div>

      <textarea
        value={csvText}
        onChange={e => { setCsvText(e.target.value); setPreview([]); setError(null) }}
        placeholder={"name,owner,description,status\nWorkday ATS,HR,Sistema ATS per screening CV,in_production"}
        rows={6}
        style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5 }}
      />
      {error && <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>{error}</p>}

      <button
        onClick={handleParse}
        disabled={csvText.trim().length < 5}
        style={{
          width: "100%", marginTop: 10, padding: "9px", borderRadius: 8, fontSize: 13,
          border: "1px solid rgba(0,0,0,0.12)", background: "white", color: "#374151",
          cursor: csvText.trim().length >= 5 ? "pointer" : "default", fontWeight: 500,
        }}
      >
        {t("analyzeCsv")}
      </button>

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* Banner guardrail import */}
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 12, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)" }}>
            <p style={{ fontSize: 12, color: "#d97706", margin: 0 }}>
              <strong>{preview.length} {preview.length !== 1 ? t("systemsReady") : t("systemReady")}</strong> — {t("importBannerRest")}
            </p>
          </div>

          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{t("th_name")}</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Owner</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Status</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Tier</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < preview.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <td style={{ padding: "8px 12px", color: "#111", fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>{row.owner || "—"}</td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>{t(`status_${row.status ?? ""}`) || row.status}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: "#6b7280", border: "1px solid rgba(0,0,0,0.1)" }}>
                        {t("unclassifiedUpper")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {imported ? (
            <div style={{ textAlign: "center", padding: "16px", color: "#16a34a", fontWeight: 600, fontSize: 14 }}>
              ✓ {preview.length} {preview.length !== 1 ? t("systemsImported") : t("systemImported")}!
            </div>
          ) : (
            <button
              onClick={handleImport}
              style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 8, border: "none", background: "#111", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {t("importWord")} {preview.length} {preview.length !== 1 ? t("systemsWord") : t("systemWord")}
            </button>
          )}
        </div>
      )}
    </ModalShell>
  )
}

// ─── InventoryPage (root export) ──────────────────────────────────────────────
export default function InventoryPage() {
  const t = useT("toolInventory")
  const [systems, setSystems] = React.useState<AISystem[]>([])
  const router = useRouter()
  const [filterTier, setFilterTier] = React.useState<SystemTier | "all">("all")
  const [modal, setModal] = React.useState<
    | { type: "add"; initialStep?: AddStep }
    | { type: "edit"; system: AISystem }
    | { type: "import" }
    | null
  >(null)

  React.useEffect(() => { setSystems(loadInventory()) }, [])
  function refresh() { setSystems(loadInventory()) }

  const filtered = filterTier === "all" ? systems : systems.filter(s => s.tier === filterTier)
  const counts = systems.reduce((acc, s) => {
    acc[s.tier] = (acc[s.tier] ?? 0) + 1; return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ width: "100%", paddingBottom: 40 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t("title")}</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              {systems.length} {systems.length !== 1 ? t("systemsRegistered") : t("systemRegistered")} · {t("registerLabel")}
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "import" })}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "white", fontSize: 12, cursor: "pointer", color: "#6b7280", flexShrink: 0 }}
          >
            <FileDown size={12} /> CSV
          </button>
        </div>

        {/* 3 channel cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {([
            { icon: Bot, label: t("ch_ai_label"), badge: t("ch_recommended"), desc: t("ch_ai_desc2"), step: "describe" as AddStep, primary: true },
            { icon: ScanSearch, label: t("ch_discovery_label"), badge: t("ch_automatic"), desc: t("ch_discovery_desc2"), step: "discovery" as AddStep, primary: false },
            { icon: PenLine, label: t("ch_manual_label"), badge: t("ch_form"), desc: t("ch_manual_desc2"), step: "review" as AddStep, primary: false },
          ] as const).map((ch) => {
            const Icon = ch.icon
            return (
              <button
                key={ch.step}
                onClick={() => setModal({ type: "add", initialStep: ch.step })}
                style={{
                  flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  border: ch.primary ? "1.5px solid #0D1016" : "1px solid rgba(0,0,0,0.10)",
                  background: ch.primary ? "#0D1016" : "white",
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <Icon size={14} color={ch.primary ? "rgba(255,255,255,0.9)" : "#374151"} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: ch.primary ? "white" : "#0D1016" }}>{ch.label}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, flexShrink: 0,
                    background: ch.primary ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
                    color: ch.primary ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.40)",
                  }}>{ch.badge}</span>
                </div>
                <p style={{ fontSize: 11, color: ch.primary ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)", margin: 0, lineHeight: 1.45 }}>
                  {ch.desc}
                </p>
              </button>
            )
          })}
        </div>
        {/* Filtri tier */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterTier("all")}
            style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer", background: filterTier === "all" ? "#111" : "white", color: filterTier === "all" ? "white" : "#374151" }}
          >
            {t("allFilter")} ({systems.length})
          </button>
          {(Object.keys(TIER_CONFIG) as SystemTier[]).filter(t => counts[t]).map(tier => {
            const cfg = TIER_CONFIG[tier]
            return (
              <button
                key={tier}
                onClick={() => setFilterTier(filterTier === tier ? "all" : tier)}
                style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${filterTier === tier ? cfg.border : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer",
                  background: filterTier === tier ? cfg.bg : "white",
                  color: filterTier === tier ? cfg.text : "#6b7280",
                }}
              >
                {t(`tier_${tier}_label`)} ({counts[tier]})
              </button>
            )
          })}
        </div>
      </div>

      {/* GRIGLIA */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={() => setModal({ type: "add" })} hasFilter={filterTier !== "all"} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map(system => (
            <SystemCard
              key={system.id}
              system={system}
              onEdit={() => setModal({ type: "edit", system })}
              onClassify={() => router.push(`/dashboard/tools/inventory/${system.id}/classify`)}
              onDelete={() => { deleteSystem(system.id); refresh() }}
            />
          ))}
        </div>
      )}

      {/* MODAL */}
      {modal?.type === "add" && (
        <AddSystemModal onClose={() => setModal(null)} onSave={() => { refresh(); setModal(null) }} existingSystems={systems} initialStep={modal.initialStep} />
      )}
      {modal?.type === "edit" && (
        <EditSystemModal system={modal.system} onClose={() => setModal(null)} onSave={() => { refresh(); setModal(null) }} />
      )}
      {modal?.type === "import" && (
        <ImportCsvModal onClose={() => setModal(null)} onSave={() => { refresh(); setModal(null) }} />
      )}
    </div>
  )
}
