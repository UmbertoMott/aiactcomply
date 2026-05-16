"use client";

import { useState, useCallback } from "react";
import {
  ClipboardList,
  Code2,
  FileCode,
  Download,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import {
  analyzeCodeAST,
  generateAnnexIVJSON,
  signDocument,
  type ParsedFunction,
  type AnnexIVDocument,
} from "@/lib/simulation/ast-parser";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemProfile {
  // Identità
  nomesistema: string;
  versione: string;
  fornitore: string;
  settore: string;
  descrizione: string;
  finalita: string;
  // Architettura tecnica
  architettura: string;
  framework: string;
  tipoInput: string;
  tipoOutput: string;
  fontiDati: Set<string>;
  tecnicaTraining: string;
  // Sorveglianza umana
  livelloAutonomia: string;
  oversightMechanism: string;
  killSwitch: string;
  escalation: string;
  // Metriche e conformità
  accuratezza: string;
  metricaBias: string;
  sicurezzaDati: string;
  certificazioni: Set<string>;
  // Deployment
  paeseDeployment: string;
  dataRilascio: string;
  contesto: string;
  responsabile: string;
}

const EMPTY_PROFILE: SystemProfile = {
  nomesistema: "",
  versione: "",
  fornitore: "",
  settore: "",
  descrizione: "",
  finalita: "",
  architettura: "",
  framework: "",
  tipoInput: "",
  tipoOutput: "",
  fontiDati: new Set(),
  tecnicaTraining: "",
  livelloAutonomia: "",
  oversightMechanism: "",
  killSwitch: "",
  escalation: "",
  accuratezza: "",
  metricaBias: "",
  sicurezzaDati: "",
  certificazioni: new Set(),
  paeseDeployment: "",
  dataRilascio: "",
  contesto: "",
  responsabile: "",
};

const CODE_SAMPLE = `def clean_data(df):
    """Rimuove duplicati e valori nulli"""
    df = df.drop_duplicates()
    df = df.dropna()
    return df

def normalize_age(df):
    df['age_norm'] = (df['eta'] - df['eta'].min()) / (df['eta'].max() - df['eta'].min())
    return df

def train_model(X_train, y_train):
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    return model

def predict_candidate(model, X_test):
    return model.predict_proba(X_test)

def evaluate(y_true, y_pred):
    return accuracy_score(y_true, y_pred)`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAnnexIVFromProfile(
  profile: SystemProfile,
  astFunctions?: ParsedFunction[]
): AnnexIVDocument {
  const functions = astFunctions ?? [];
  const doc = generateAnnexIVJSON(profile.nomesistema || "Sistema AI", functions);

  // Override first two sections with profile data
  doc.sections[0].content = JSON.stringify(
    {
      name: profile.nomesistema,
      version: profile.versione,
      supplier: profile.fornitore,
      sector: profile.settore,
      description: profile.descrizione,
      purpose: profile.finalita,
      deployment: profile.paeseDeployment,
      releaseDate: profile.dataRilascio,
      context: profile.contesto,
      responsabile: profile.responsabile,
    },
    null,
    2
  );

  doc.sections[1].content = JSON.stringify(
    {
      architecture: profile.architettura,
      framework: profile.framework,
      inputType: profile.tipoInput,
      outputType: profile.tipoOutput,
      dataSources: Array.from(profile.fontiDati),
      trainingTechnique: profile.tecnicaTraining,
      components: functions.map((f) => ({
        function: f.name,
        type: f.type,
        art10Relevant: f.art10Relevant,
        description: f.description,
      })),
    },
    null,
    2
  );

  doc.sections[4].content = JSON.stringify(
    {
      autonomyLevel: profile.livelloAutonomia,
      oversightMechanism: profile.oversightMechanism,
      killSwitch: profile.killSwitch,
      escalation: profile.escalation,
    },
    null,
    2
  );

  doc.sections[5].content = JSON.stringify(
    {
      accuracy: profile.accuratezza,
      biasMetric: profile.metricaBias,
      dataSecurity: profile.sicurezzaDati,
      certifications: Array.from(profile.certificazioni),
    },
    null,
    2
  );

  return doc;
}

function computeProgress(profile: SystemProfile): number {
  const fields: Array<string | Set<string>> = [
    profile.nomesistema,
    profile.versione,
    profile.fornitore,
    profile.settore,
    profile.descrizione,
    profile.finalita,
    profile.architettura,
    profile.framework,
    profile.tipoInput,
    profile.tipoOutput,
    profile.tecnicaTraining,
    profile.livelloAutonomia,
    profile.oversightMechanism,
    profile.killSwitch,
    profile.accuratezza,
    profile.metricaBias,
    profile.sicurezzaDati,
    profile.paeseDeployment,
    profile.dataRilascio,
    profile.responsabile,
  ];
  const filled = fields.filter((f) =>
    typeof f === "string" ? f.trim() !== "" : f.size > 0
  ).length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[11px] font-medium mb-1"
        style={{ color: "rgba(0,0,0,0.5)" }}
      >
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: "13px",
  color: "#0D1016",
  background: "#fff",
  outline: "none",
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: "pointer",
};

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              const next = new Set(value);
              if (active) next.delete(opt);
              else next.add(opt);
              onChange(next);
            }}
            style={{
              padding: "3px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 500,
              border: active ? "1px solid #0D1016" : "1px solid rgba(0,0,0,0.12)",
              background: active ? "#0D1016" : "#fff",
              color: active ? "#fff" : "rgba(0,0,0,0.55)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  filled,
  total,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  filled: number;
  total: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3.5"
      style={{
        background: "transparent",
        borderBottom: open ? "1px solid rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
          {title}
        </span>
        <span
          className="text-[10px] font-medium rounded-full px-2 py-0.5"
          style={{
            background: filled === total ? "rgba(22,163,74,0.1)" : "rgba(0,0,0,0.05)",
            color: filled === total ? "#15803d" : "rgba(0,0,0,0.4)",
          }}
        >
          {filled}/{total}
        </span>
      </div>
      {open ? (
        <ChevronUp className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.3)" }} />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" style={{ color: "rgba(0,0,0,0.3)" }} />
      )}
    </button>
  );
}

type TabId = "scheda" | "ast" | "annex";

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIAArchitectPage() {
  const [tab, setTab] = useState<TabId>("scheda");
  const [profile, setProfile] = useState<SystemProfile>(EMPTY_PROFILE);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["identita"])
  );
  const [code, setCode] = useState(CODE_SAMPLE);
  const [parsed, setParsed] = useState<ParsedFunction[] | null>(null);
  const [annex, setAnnex] = useState<AnnexIVDocument | null>(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof SystemProfile>(key: K, value: SystemProfile[K]) => {
      setProfile((p) => ({ ...p, [key]: value }));
    },
    []
  );

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleGenerateAnnex() {
    setGenerating(true);
    try {
      const draft = buildAnnexIVFromProfile(profile, parsed ?? undefined);
      const signed = await signDocument(draft);
      setAnnex(signed);
      setTab("annex");
      showToast("Annex IV generato e firmato SHA-256");
    } finally {
      setGenerating(false);
    }
  }

  function runAST() {
    const result = analyzeCodeAST(code);
    setParsed(result);
    showToast(`AST Scan completato: ${result.length} funzioni trovate`);
  }

  function exportJSON() {
    if (!annex) return;
    const blob = new Blob([JSON.stringify(annex, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annex-iv-${profile.nomesistema.replace(/\s+/g, "-").toLowerCase() || "sistema"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON esportato");
  }

  function exportText() {
    if (!annex) return;
    const lines = [
      `ALLEGATO IV — DOCUMENTAZIONE TECNICA`,
      `Sistema: ${annex.systemName}`,
      `Versione: ${annex.version}`,
      `Generato: ${annex.generatedAt}`,
      `Root Hash: ${annex.rootHash}`,
      `Firma: ${annex.signature}`,
      "",
      ...annex.sections.flatMap((s) => [
        `=== ${s.id} — ${s.title} ===`,
        s.content,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annex-iv-${profile.nomesistema || "sistema"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Testo esportato");
  }

  async function addToEvidenceLayer() {
    if (!annex) return;
    await appendEvidence(
      "audit",
      {
        title: `Annex IV — ${annex.systemName} v${annex.version}`,
        rootHash: annex.rootHash,
        signature: annex.signature,
        sections: annex.sections.map((s) => ({ id: s.id, title: s.title })),
        tags: ["annex-iv", "art11", "documentazione-tecnica"],
      },
      profile.responsabile || "AIA-Architect"
    );
    showToast("Aggiunto all'Evidence Layer ✓");
  }

  const progress = computeProgress(profile);

  // Count filled per section for badges
  const identitaFilled = [
    profile.nomesistema,
    profile.versione,
    profile.fornitore,
    profile.settore,
    profile.descrizione,
    profile.finalita,
  ].filter((v) => (v as string)?.trim() !== "").length;

  const archFilled = [
    profile.architettura,
    profile.framework,
    profile.tipoInput,
    profile.tipoOutput,
    profile.tecnicaTraining,
  ].filter((v) => v?.trim() !== "").length + (profile.fontiDati.size > 0 ? 1 : 0);

  const sorvFilled = [
    profile.livelloAutonomia,
    profile.oversightMechanism,
    profile.killSwitch,
    profile.escalation,
  ].filter((v) => v?.trim() !== "").length;

  const metricaFilled = [
    profile.accuratezza,
    profile.metricaBias,
    profile.sicurezzaDati,
  ].filter((v) => v?.trim() !== "").length + (profile.certificazioni.size > 0 ? 1 : 0);

  const tabs: { id: TabId; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: "scheda", label: "Scheda Sistema", Icon: ClipboardList },
    { id: "ast", label: "AST Scanner", Icon: Code2 },
    { id: "annex", label: "Annex IV", Icon: FileCode },
  ];

  const typeBadge: Record<ParsedFunction["type"], { bg: string; color: string; label: string }> = {
    preprocessing: { bg: "rgba(59,130,246,0.1)", color: "#1d4ed8", label: "Preprocessing" },
    training: { bg: "rgba(139,92,246,0.1)", color: "#6d28d9", label: "Training" },
    inference: { bg: "rgba(16,185,129,0.1)", color: "#065f46", label: "Inferenza" },
    validation: { bg: "rgba(245,158,11,0.1)", color: "#92400e", label: "Validazione" },
    postprocessing: { bg: "rgba(236,72,153,0.1)", color: "#9d174d", label: "Post-proc." },
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1
          style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.5px", color: "#0D1016" }}
        >
          AIA-Architect
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
          Compila la scheda del tuo sistema AI → genera il Dossier Vivente Allegato IV firmato SHA-256.
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-2.5 mb-5"
        style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}
      >
        <span className="text-[11px] font-medium flex-shrink-0" style={{ color: "rgba(0,0,0,0.4)" }}>
          Completamento scheda
        </span>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress >= 80 ? "#15803d" : progress >= 40 ? "#d97706" : "#3b82f6",
            }}
          />
        </div>
        <span
          className="text-[12px] font-semibold flex-shrink-0"
          style={{ color: "#0D1016" }}
        >
          {progress}%
        </span>
      </div>

      {/* Tab nav */}
      <div
        className="flex gap-5 mb-5"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 pb-3 text-[12px] font-medium transition-all border-b-2"
            style={
              tab === id
                ? { borderColor: "#0D1016", color: "#0D1016" }
                : { borderColor: "transparent", color: "rgba(0,0,0,0.42)" }
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "annex" && annex && (
              <CheckCircle className="h-3 w-3 ml-0.5" style={{ color: "#15803d" }} />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Scheda Sistema ── */}
      {tab === "scheda" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
        >
          {/* Section: Identità */}
          <SectionHeader
            title="Identità del sistema"
            open={openSections.has("identita")}
            onToggle={() => toggleSection("identita")}
            filled={identitaFilled}
            total={6}
          />
          {openSections.has("identita") && (
            <div className="px-5 py-4 grid grid-cols-2 gap-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <Field label="Nome sistema" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="es. CV-Screener Pro"
                  value={profile.nomesistema}
                  onChange={(e) => set("nomesistema", e.target.value)}
                />
              </Field>
              <Field label="Versione" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="es. 2.3.1"
                  value={profile.versione}
                  onChange={(e) => set("versione", e.target.value)}
                />
              </Field>
              <Field label="Fornitore / Sviluppatore" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="Ragione sociale"
                  value={profile.fornitore}
                  onChange={(e) => set("fornitore", e.target.value)}
                />
              </Field>
              <Field label="Settore applicativo" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.settore}
                  onChange={(e) => set("settore", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>HR e selezione del personale</option>
                  <option>Credito e finanza</option>
                  <option>Salute e diagnostica</option>
                  <option>Giustizia e forze dell&apos;ordine</option>
                  <option>Istruzione e formazione</option>
                  <option>Infrastrutture critiche</option>
                  <option>Altro</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Descrizione sistema" required>
                  <textarea
                    style={{ ...INPUT_STYLE, minHeight: "72px", resize: "vertical" }}
                    placeholder="Descrivi in 2-3 righe cosa fa il sistema AI..."
                    value={profile.descrizione}
                    onChange={(e) => set("descrizione", e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Finalità e contesto d&apos;uso" required>
                  <textarea
                    style={{ ...INPUT_STYLE, minHeight: "60px", resize: "vertical" }}
                    placeholder="Scopo del sistema, chi sono gli utenti finali..."
                    value={profile.finalita}
                    onChange={(e) => set("finalita", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Section: Architettura */}
          <SectionHeader
            title="Architettura tecnica"
            open={openSections.has("architettura")}
            onToggle={() => toggleSection("architettura")}
            filled={archFilled}
            total={6}
          />
          {openSections.has("architettura") && (
            <div className="px-5 py-4 grid grid-cols-2 gap-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <Field label="Architettura modello" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.architettura}
                  onChange={(e) => set("architettura", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>Transformer / LLM</option>
                  <option>CNN (Convolutional Neural Network)</option>
                  <option>Random Forest / Gradient Boosting</option>
                  <option>Regressione logistica</option>
                  <option>SVM (Support Vector Machine)</option>
                  <option>RNN / LSTM</option>
                  <option>Graph Neural Network</option>
                  <option>Ensemble / Ibrido</option>
                  <option>Altro</option>
                </select>
              </Field>
              <Field label="Framework / Libreria" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="es. PyTorch 2.1, TensorFlow 2.14"
                  value={profile.framework}
                  onChange={(e) => set("framework", e.target.value)}
                />
              </Field>
              <Field label="Tipo di input" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.tipoInput}
                  onChange={(e) => set("tipoInput", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>Testo</option>
                  <option>Immagine</option>
                  <option>Audio</option>
                  <option>Dati tabulari</option>
                  <option>Multimodale</option>
                  <option>Serie temporali</option>
                  <option>Video</option>
                </select>
              </Field>
              <Field label="Tipo di output" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.tipoOutput}
                  onChange={(e) => set("tipoOutput", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>Classificazione binaria</option>
                  <option>Classificazione multiclasse</option>
                  <option>Regressione numerica</option>
                  <option>Testo generato</option>
                  <option>Ranking / Score</option>
                  <option>Segmentazione</option>
                  <option>Rilevamento anomalie</option>
                </select>
              </Field>
              <Field label="Tecnica di training" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.tecnicaTraining}
                  onChange={(e) => set("tecnicaTraining", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>Supervised learning</option>
                  <option>Unsupervised learning</option>
                  <option>Semi-supervised</option>
                  <option>Reinforcement learning</option>
                  <option>Fine-tuning su modello pre-addestrato</option>
                  <option>RAG (Retrieval-Augmented Generation)</option>
                  <option>Nessun training (rule-based)</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Fonti dati (selezione multipla)">
                  <Chips
                    options={["Database interno", "API esterna", "Web scraping", "Dati sintetici", "Open dataset", "Partner commerciale", "Utente finale"]}
                    value={profile.fontiDati}
                    onChange={(v) => set("fontiDati", v)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Section: Sorveglianza umana */}
          <SectionHeader
            title="Sorveglianza umana — Art. 14"
            open={openSections.has("sorveglianza")}
            onToggle={() => toggleSection("sorveglianza")}
            filled={sorvFilled}
            total={4}
          />
          {openSections.has("sorveglianza") && (
            <div className="px-5 py-4 grid grid-cols-2 gap-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <Field label="Livello di autonomia" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.livelloAutonomia}
                  onChange={(e) => set("livelloAutonomia", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>Human-in-the-loop (ogni decisione approvata)</option>
                  <option>Human-on-the-loop (revisione post-hoc)</option>
                  <option>Autonomo con override manuale</option>
                  <option>Completamente autonomo</option>
                </select>
              </Field>
              <Field label="Meccanismo di oversight" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="es. Dashboard revisione, alert soglia..."
                  value={profile.oversightMechanism}
                  onChange={(e) => set("oversightMechanism", e.target.value)}
                />
              </Field>
              <Field label="Kill switch / Interruzione" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.killSwitch}
                  onChange={(e) => set("killSwitch", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>Sì — interruzione immediata disponibile</option>
                  <option>Sì — interruzione graduale (graceful shutdown)</option>
                  <option>Parziale — solo in modalità manutenzione</option>
                  <option>No — sistema sempre attivo</option>
                </select>
              </Field>
              <Field label="Escalation procedure" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="es. 3 livelli: Watch → Assist → Manual"
                  value={profile.escalation}
                  onChange={(e) => set("escalation", e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* Section: Metriche */}
          <SectionHeader
            title="Metriche e conformità — Art. 15"
            open={openSections.has("metriche")}
            onToggle={() => toggleSection("metriche")}
            filled={metricaFilled}
            total={4}
          />
          {openSections.has("metriche") && (
            <div className="px-5 py-4 grid grid-cols-2 gap-4">
              <Field label="Accuratezza (es. 0.94)" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="0.00 – 1.00"
                  value={profile.accuratezza}
                  onChange={(e) => set("accuratezza", e.target.value)}
                />
              </Field>
              <Field label="Metrica bias / equità" required>
                <input
                  style={INPUT_STYLE}
                  placeholder="es. Disparate Impact 0.82"
                  value={profile.metricaBias}
                  onChange={(e) => set("metricaBias", e.target.value)}
                />
              </Field>
              <Field label="Sicurezza dati" required>
                <select
                  style={SELECT_STYLE}
                  value={profile.sicurezzaDati}
                  onChange={(e) => set("sicurezzaDati", e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  <option>AES-256 at rest + TLS 1.3 in transit</option>
                  <option>AES-128 at rest + TLS 1.2 in transit</option>
                  <option>Solo TLS in transit</option>
                  <option>Nessuna cifratura specifica</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Certificazioni / Standard">
                  <Chips
                    options={["ISO 27001", "ISO 42001", "SOC 2 Type II", "GDPR DPO nominato", "CE Mark", "IEC 62443", "NIST AI RMF"]}
                    value={profile.certificazioni}
                    onChange={(v) => set("certificazioni", v)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.015)" }}
          >
            <div className="flex items-center gap-2">
              {progress < 40 && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#d97706" }}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Compila almeno il 40% per generare l&apos;Annex IV
                </div>
              )}
              {progress >= 40 && progress < 80 && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#3b82f6" }}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Puoi già generare — completa per un dossier completo
                </div>
              )}
              {progress >= 80 && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#15803d" }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Scheda completa — pronto per la generazione
                </div>
              )}
            </div>
            <button
              onClick={handleGenerateAnnex}
              disabled={progress < 40 || generating}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                background: progress >= 40 ? "#0D1016" : "rgba(0,0,0,0.1)",
                color: progress >= 40 ? "#fff" : "rgba(0,0,0,0.3)",
                border: "none",
                cursor: progress >= 40 ? "pointer" : "not-allowed",
                transition: "opacity 0.15s",
              }}
            >
              {generating ? "Generazione..." : "Genera Annex IV →"}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: AST Scanner ── */}
      {tab === "ast" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                Scanner AST del codice sorgente
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.42)" }}>
                Incolla il codice Python o JavaScript — il parser identifica funzioni rilevanti Art. 10
              </p>
            </div>
            <button
              onClick={runAST}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                background: "#0D1016",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Esegui scan
            </button>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%",
              minHeight: "200px",
              padding: "16px 20px",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#0D1016",
              background: "#FAFAF9",
              border: "none",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              outline: "none",
              resize: "vertical",
            }}
            placeholder="Incolla qui il codice sorgente del pipeline..."
          />

          {parsed !== null && (
            <div>
              {/* Results list */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgba(0,0,0,0.35)" }}>
                  Funzioni rilevate
                </span>
                <span
                  className="text-[11px] font-medium rounded-full px-2.5 py-0.5"
                  style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}
                >
                  {parsed.length} funzioni
                </span>
              </div>

              {parsed.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                  Nessuna funzione riconosciuta. Prova con nomi standard (clean, train, predict, evaluate...).
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                  {parsed.map((fn, i) => {
                    const badge = typeBadge[fn.type];
                    return (
                      <div key={i} className="px-5 py-3 flex items-center gap-3">
                        <GitBranch className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.25)" }} />
                        <span className="text-[12px] font-mono font-medium" style={{ color: "#0D1016", minWidth: "140px" }}>
                          {fn.name}
                        </span>
                        <span
                          className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                        {fn.art10Relevant && (
                          <span
                            className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                            style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c" }}
                          >
                            Art. 10
                          </span>
                        )}
                        <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: "rgba(0,0,0,0.4)" }}>
                          {fn.description}
                        </span>
                        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "rgba(0,0,0,0.25)" }}>
                          :{fn.line}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Art. 10 summary */}
              {parsed.filter((f) => f.art10Relevant).length > 0 && (
                <div
                  className="mx-5 my-4 rounded-lg p-4"
                  style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}
                >
                  <p className="text-[11px] font-semibold mb-1" style={{ color: "#b91c1c" }}>
                    Art. 10 — Dati di addestramento e governance
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                    Rilevate{" "}
                    <strong>{parsed.filter((f) => f.art10Relevant).length}</strong> funzioni
                    soggette all&apos;obbligo di documentazione dati (preprocessing + training).
                    Assicurati di documentare dataset, criteri di qualità e misure anti-bias.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Annex IV ── */}
      {tab === "annex" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
        >
          {!annex ? (
            <div className="px-5 py-16 text-center">
              <FileCode className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(0,0,0,0.2)" }} />
              <p className="text-[13px] font-medium mb-1" style={{ color: "rgba(0,0,0,0.5)" }}>
                Nessun documento generato
              </p>
              <p className="text-[11px] mb-5" style={{ color: "rgba(0,0,0,0.35)" }}>
                Compila la Scheda Sistema e clicca &quot;Genera Annex IV&quot;
              </p>
              <button
                onClick={() => setTab("scheda")}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "#0D1016",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ← Vai alla Scheda
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#0D1016" }}>
                    {annex.systemName} — v{annex.version}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(0,0,0,0.35)" }}>
                    {annex.rootHash.slice(0, 32)}...
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#15803d" }}>
                    <CheckCircle className="h-3 w-3" />
                    SHA-256
                  </span>
                  <button
                    onClick={exportJSON}
                    className="flex items-center gap-1 text-[11px] font-medium rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                    style={{ border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)" }}
                  >
                    <Download className="h-3 w-3" /> JSON
                  </button>
                  <button
                    onClick={exportText}
                    className="flex items-center gap-1 text-[11px] font-medium rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                    style={{ border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)" }}
                  >
                    <Download className="h-3 w-3" /> TXT
                  </button>
                  <button
                    onClick={addToEvidenceLayer}
                    className="flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity"
                    style={{ background: "#0D1016", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    + Evidence Layer
                  </button>
                </div>
              </div>

              {/* Sections */}
              <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                {annex.sections.map((sec) => (
                  <details key={sec.id} className="group">
                    <summary
                      className="flex items-center gap-2 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors list-none"
                      style={{ userSelect: "none" }}
                    >
                      <FileCode className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.25)" }} />
                      <span className="text-[13px] font-medium flex-1" style={{ color: "#0D1016" }}>
                        {sec.title}
                      </span>
                      <span
                        className="text-[10px] font-mono rounded px-1.5 py-0.5"
                        style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.35)" }}
                      >
                        {sec.id}
                      </span>
                      <ChevronDown
                        className="h-3.5 w-3.5 flex-shrink-0 group-open:rotate-180 transition-transform"
                        style={{ color: "rgba(0,0,0,0.25)" }}
                      />
                    </summary>
                    <div className="px-5 pb-4">
                      <pre
                        className="rounded-lg p-4 text-[11px] font-mono overflow-x-auto"
                        style={{
                          background: "#FAFAF9",
                          border: "1px solid rgba(0,0,0,0.06)",
                          color: "rgba(0,0,0,0.65)",
                          lineHeight: 1.6,
                        }}
                      >
                        {sec.content}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3 text-[10px] font-mono"
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  background: "rgba(0,0,0,0.01)",
                  color: "rgba(0,0,0,0.3)",
                }}
              >
                Signature: {annex.signature} · Generato: {new Date(annex.generatedAt).toLocaleString("it-IT")}
              </div>
            </>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0D1016",
            color: "#fff",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 500,
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
