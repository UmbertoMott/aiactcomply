"use client";
import React, { useRef, useEffect, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { loadInventory, updateSystem } from "@/lib/inventory/ai-system";
import type { AISystem, SystemTier } from "@/lib/inventory/ai-system";
import { classifyChat, type ChatMessage as ClassifyChatMsg } from "@/app/actions/classifyChat";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.20)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#FAFAFA",
} as const;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
  border: "1px solid rgba(0,0,0,0.12)", background: "white",
  color: T.text, outline: "none", boxSizing: "border-box",
};

// ─── Tier config ──────────────────────────────────────────────────────────────
type TierCfg = {
  label: string; bg: string; border: string; text: string; dot: string;
  article: string; what: string; examples: string[]; obligations: string[];
}
const TIER_CONFIG: Record<SystemTier, TierCfg> = {
  prohibited: {
    label: "Vietato", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.25)", text: "#dc2626", dot: "#dc2626",
    article: "Art. 5 AI Act",
    what: "Il sistema utilizza tecniche proibite: manipolazione subliminale, sfruttamento delle vulnerabilità, social scoring governativo, identificazione biometrica in tempo reale in spazi pubblici, inferenza delle emozioni sul lavoro o a scuola.",
    examples: ["Sistema di scoring della fiducia cittadina per la PA", "Riconoscimento facciale live in piazze o strade", "AI che deduce lo stato emotivo degli studenti durante gli esami"],
    obligations: ["Non puoi deploiarlo — punto.", "Verifica se il sistema rientra nelle eccezioni molto limitate (es. ricerca persone scomparse)", "In caso di dubbio, consulta immediatamente un legale specializzato in AI Act"],
  },
  high_risk: {
    label: "Alto rischio", bg: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.25)", text: "#ea580c", dot: "#ea580c",
    article: "Art. 6 + Allegato III AI Act",
    what: "Il sistema prende o influenza decisioni che impattano significativamente persone fisiche in settori sensibili elencati nell'Allegato III (occupazione, istruzione, servizi essenziali, credito, forze dell'ordine, migrazione, giustizia, infrastrutture critiche).",
    examples: ["AI per la pre-selezione dei CV", "Sistema di scoring del credito bancario", "AI per l'assegnazione di sussidi di disoccupazione", "Diagnosi medica assistita da AI"],
    obligations: ["Documentazione tecnica completa (Art. 11 + Allegato IV)", "FRIA — Valutazione impatto diritti fondamentali (Art. 27)", "Risk Register Art. 9", "Supervisione umana obbligatoria (Art. 14)", "Registrazione nel database EU (Art. 49)"],
  },
  limited: {
    label: "Limitato", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)", text: "#d97706", dot: "#d97706",
    article: "Art. 50 AI Act",
    what: "Il sistema interagisce con persone o genera contenuti, ma non prende decisioni ad alto impatto. L'utente deve sapere che sta interagendo con un AI.",
    examples: ["Chatbot di assistenza clienti", "AI che genera testi o immagini su richiesta", "Deepfake o contenuti sintetici", "Assistente virtuale sul sito web"],
    obligations: ["Dichiarazione esplicita all'utente che sta interagendo con un AI (Art. 50(1))", "Etichettatura dei contenuti generati da AI (Art. 50(2))", "Nessuna conformity assessment obbligatoria"],
  },
  minimal: {
    label: "Minimale", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.25)", text: "#16a34a", dot: "#16a34a",
    article: "Art. 69 AI Act",
    what: "Il sistema non rientra nelle categorie proibite, ad alto rischio o a rischio limitato. Nessun obbligo legale obbligatorio — solo un regime volontario di buone pratiche.",
    examples: ["Filtro antispam nella posta elettronica", "Algoritmo di raccomandazione prodotti in e-commerce", "Assistente per la scrittura di email interne", "Ottimizzazione logistica aziendale"],
    obligations: ["Nessun obbligo obbligatorio per legge", "Volontario: adesione a codici di condotta (Art. 69)", "Raccomandato: documentazione interna minima e governance AI di base"],
  },
  gpai: {
    label: "GPAI", bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.25)", text: "#6366f1", dot: "#6366f1",
    article: "Art. 51–55 AI Act",
    what: "Stai usando o distribuendo un modello di IA per uso generale (fondazionale) come GPT, Claude, Gemini, Llama. Gli obblighi variano a seconda del ruolo.",
    examples: ["GPT-4 integrato nel prodotto via API", "Claude usato per generare report automatici", "Llama 3 fine-tuned su dati aziendali"],
    obligations: ["Se provider del modello: documentazione tecnica, diritti d'autore, politica d'uso accettabile (Art. 53)", "Se deployer: verifica termini d'uso del provider, trasparenza verso utenti"],
  },
  gpai_systemic: {
    label: "GPAI Sistemico", bg: "rgba(139,92,246,0.07)", border: "rgba(139,92,246,0.25)", text: "#7c3aed", dot: "#7c3aed",
    article: "Art. 55 AI Act",
    what: "Modello GPAI con capacità computazionale di addestramento superiore a 10²⁵ FLOP — classificato come modello con rischio sistemico. Obblighi aggiuntivi rispetto al GPAI standard.",
    examples: ["GPT-4 (OpenAI) — provider", "Gemini Ultra (Google) — provider", "Claude 3 Opus (Anthropic) — provider"],
    obligations: ["Tutti gli obblighi GPAI base (Art. 53)", "Valutazione e mitigazione rischi sistemici (Art. 55(1)(a))", "Test avversariali red-team obbligatori (Art. 55(1)(b))", "Segnalazione incidenti gravi alla Commissione EU (Art. 55(1)(c))"],
  },
  unclassified: {
    label: "Non classificato", bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.12)", text: "#6b7280", dot: "#9ca3af",
    article: "Da determinare",
    what: "Non hai ancora completato la classificazione. Finché rimane non classificato non puoi generare documentazione di conformità.",
    examples: ["Sistema in fase di valutazione iniziale", "Sistema appena aggiunto all'inventario"],
    obligations: ["Nessun obbligo specifico fino alla classificazione", "Raccomandato: completare la classificazione prima del deployment"],
  },
}

const ROLE_GUIDE: Record<string, { what: string; example: string; article: string }> = {
  provider:             { article: "Art. 3(3)", what: "Hai sviluppato o fatto sviluppare il sistema AI e lo metti a disposizione sul mercato — anche per uso proprio.", example: "Hai addestrato o customizzato il modello; sei il titolare del sistema." },
  deployer:             { article: "Art. 3(4)", what: "Usi un sistema AI sviluppato da altri nell'ambito della tua attività professionale, per produrre effetti su persone fisiche.", example: "Hai acquistato o integrato un sistema AI di un fornitore terzo nel tuo processo aziendale." },
  importer:             { article: "Art. 3(6)", what: "Stabilito nell'UE, metti a disposizione sul mercato UE un sistema AI sviluppato fuori UE.", example: "Rivenditore europeo di un sistema AI di un'azienda americana o asiatica." },
  distributor:          { article: "Art. 3(7)", what: "Rendi disponibile sul mercato un sistema AI sviluppato da altri, senza modificarlo.", example: "Marketplace o rivenditore che distribuisce AI senza modificarne il funzionamento." },
  authorized_rep:       { article: "Art. 3(5)", what: "Persona fisica o giuridica stabilita nell'UE che agisce per conto di un provider extra-UE.", example: "Ufficio europeo di un'azienda AI americana, nominato come rappresentante ufficiale UE." },
  product_manufacturer: { article: "Art. 25(1)(b)", what: "Produttore di un prodotto che incorpora un sistema AI come componente.", example: "Casa automobilistica che integra AI nel sistema di guida assistita." },
}

// ─── Pagina classificazione ────────────────────────────────────────────────────
export default function ClassifyPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [system, setSystem] = useState<AISystem | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [tier, setTier] = useState<SystemTier>("unclassified");
  const [role, setRole] = useState("");
  const [roleBasis, setRoleBasis] = useState("");
  const [tierBasis, setTierBasis] = useState("");
  const [dualRoleFlag, setDualRoleFlag] = useState(false);
  const [obligationsNote, setObligationsNote] = useState("");
  const [verified, setVerified] = useState(false);
  const [showTierGuide, setShowTierGuide] = useState(true);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [saved, setSaved] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ClassifyChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inv = loadInventory();
    const s = inv.find(x => x.id === id);
    if (!s) { setNotFound(true); return; }
    setSystem(s);
    setTier(s.tier);
    setRole(s.role ?? "");
    setDualRoleFlag(s.dualRoleFlag);
    setChatMessages([{
      role: "assistant",
      content: `Ciao! Sono qui per aiutarti a classificare "${s.name}" ai sensi dell'EU AI Act.\n\nPuoi descrivermi cosa fa questo sistema e in quale contesto viene utilizzato?`,
    }]);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.unclassified;
  const roleGuide = role ? ROLE_GUIDE[role] : null;

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !system) return;
    const userMsg: ClassifyChatMsg = { role: "user", content: chatInput.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);
    const result = await classifyChat(updated, system.name);
    setChatLoading(false);
    if (result.error) {
      setChatMessages([...updated, { role: "assistant", content: result.error }]);
      return;
    }
    setChatMessages([...updated, { role: "assistant", content: result.reply ?? "" }]);
    if (result.suggestion) {
      const s = result.suggestion;
      if (s.tier && TIER_CONFIG[s.tier as SystemTier]) setTier(s.tier as SystemTier);
      if (s.role) setRole(s.role);
      if (s.roleBasis) setRoleBasis(s.roleBasis);
      if (s.tierBasis) setTierBasis(s.tierBasis);
      if (s.obligationsNote) setObligationsNote(s.obligationsNote);
    }
  }, [chatInput, chatLoading, chatMessages, system]);

  function handleSave() {
    if (!system) return;
    updateSystem(system.id, {
      role: (role || null) as AISystem["role"],
      roleBasis: roleBasis.trim(),
      tier,
      tierBasis: tierBasis.trim(),
      dualRoleFlag,
      obligationsNote: obligationsNote.trim(),
      obligationsAssessed: tier !== "unclassified",
    });
    setSaved(true);
    setTimeout(() => router.push(`/dashboard/tools/inventory/${system.id}`), 1200);
  }

  const canSave = tier !== "unclassified" && verified && tierBasis.trim().length > 0;

  if (notFound) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: T.muted }}>Sistema non trovato.</p>
      <Link href="/dashboard/tools/inventory" style={{ color: T.text, fontSize: 13 }}>← Torna all'inventario</Link>
    </div>
  );
  if (!system) return <div style={{ padding: 40, color: T.muted, fontSize: 13 }}>Caricamento…</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>

      {/* ─── Topbar ─────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${T.border}`, background: T.card, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href={`/dashboard/tools/inventory/${system.id}`} style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft size={15} /> Torna al sistema
          </Link>
          <div style={{ width: 1, height: 18, background: T.border }} />
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Classifica — {system.name}</span>
            <span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>AI Act Reg. UE 2024/1689</span>
          </div>
        </div>
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Salvato — reindirizzamento…
          </div>
        )}
      </div>

      {/* ─── Body split ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SINISTRA: form ──────────────────────────────────────── */}
        <div style={{ flex: "0 0 55%", overflowY: "auto", padding: "28px 32px", borderRight: `1px solid ${T.border}` }}>

          {/* Banner */}
          <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 24, background: "rgba(13,16,22,0.04)", border: "1px solid rgba(13,16,22,0.10)" }}>
            <p style={{ fontSize: 13, color: T.text, margin: 0, lineHeight: 1.55 }}>
              <strong>Attenzione:</strong> La classificazione è una responsabilità legale tua, non dell'AI. Indica l'articolo EU AI Act che giustifica la tua scelta — ti protegge in caso di audit o ispezione regolatoria.
            </p>
          </div>

          {/* Tier buttons */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Tier di rischio EU AI Act *</label>
              <button onClick={() => setShowTierGuide(v => !v)} style={{ fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                {showTierGuide ? "Nascondi guida" : "Mostra guida"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
              {(Object.entries(TIER_CONFIG) as [SystemTier, TierCfg][]).map(([key, cfg]) => (
                <button key={key} onClick={() => { setTier(key); setShowTierGuide(true); setVerified(false); }}
                  style={{ padding: "10px 8px", borderRadius: 9, cursor: "pointer", textAlign: "center", border: `2px solid ${tier === key ? cfg.border : T.border}`, background: tier === key ? cfg.bg : T.card, transition: "all 0.1s" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: tier === key ? cfg.text : T.muted, margin: 0 }}>{cfg.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Guida tier */}
          {showTierGuide && (
            <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 10, background: tierCfg.bg, border: `1px solid ${tierCfg.border}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: tierCfg.text }}>{tierCfg.label}</span>
                <span style={{ fontSize: 10, color: T.muted, fontFamily: "monospace" }}>{tierCfg.article}</span>
              </div>
              <p style={{ fontSize: 13, color: "#374151", margin: "0 0 12px", lineHeight: 1.55 }}>{tierCfg.what}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 5px" }}>Esempi tipici</p>
              <ul style={{ margin: "0 0 10px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
                {tierCfg.examples.map((ex, i) => <li key={i} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.45 }}>{ex}</li>)}
              </ul>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 5px" }}>Obblighi principali</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
                {tierCfg.obligations.map((ob, i) => <li key={i} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.45 }}>{ob}</li>)}
              </ul>
            </div>
          )}

          {/* Ruolo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Ruolo (Art. 2)</label>
                {role && <button onClick={() => setShowRoleGuide(v => !v)} style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{showRoleGuide ? "Nascondi" : "Cos'è?"}</button>}
              </div>
              <select value={role} onChange={e => { setRole(e.target.value); setShowRoleGuide(true); }} style={INPUT_STYLE}>
                <option value="">Da definire</option>
                <option value="provider">Provider</option>
                <option value="deployer">Deployer</option>
                <option value="importer">Importatore</option>
                <option value="distributor">Distributore</option>
                <option value="authorized_rep">Rappresentante autorizzato</option>
                <option value="product_manufacturer">Produttore prodotto</option>
              </select>
              {showRoleGuide && roleGuide && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(0,0,0,0.03)", borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{roleGuide.article}</p>
                  <p style={{ fontSize: 12.5, color: "#374151", margin: "0 0 5px", lineHeight: 1.5 }}>{roleGuide.what}</p>
                  <p style={{ fontSize: 12, color: T.muted, margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>{roleGuide.example}</p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingTop: 28 }}>
              <input type="checkbox" id="dualRole" checked={dualRoleFlag} onChange={e => setDualRoleFlag(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: "pointer" }} />
              <div>
                <label htmlFor="dualRole" style={{ fontSize: 13, color: T.text, cursor: "pointer", fontWeight: 500 }}>Dual-role (Art. 25)</label>
                <p style={{ fontSize: 11.5, color: T.muted, margin: "3px 0 0", lineHeight: 1.4 }}>L'organizzazione ha due ruoli sullo stesso sistema — es. sviluppatore del modello (provider) e utente interno (deployer).</p>
              </div>
            </div>
          </div>

          {/* Campi normativi */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>Base ruolo — articolo di riferimento *</label>
              <input value={roleBasis} onChange={e => setRoleBasis(e.target.value)} style={INPUT_STYLE}
                placeholder="Es. Art. 3(4) — usiamo un sistema AI di un fornitore terzo in contesto professionale HR" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>Base classificazione tier — articolo o Allegato *</label>
              <input value={tierBasis} onChange={e => setTierBasis(e.target.value)} style={INPUT_STYLE}
                placeholder="Es. Allegato III(4)(a) — sistema di pre-selezione CV, ambito occupazione e gestione risorse umane" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>Note obblighi applicabili</label>
              <textarea value={obligationsNote} onChange={e => setObligationsNote(e.target.value)} rows={3}
                style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }}
                placeholder="Es. Documentazione tecnica (Art. 11), supervisione umana (Art. 14), registrazione EU DB (Art. 49)" />
              {tier !== "unclassified" && !obligationsNote.trim() && (
                <button onClick={() => setObligationsNote(tierCfg.obligations.join("\n"))}
                  style={{ marginTop: 6, fontSize: 12, color: T.muted, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
                  Compila dalla guida tier
                </button>
              )}
            </div>
          </div>

          {/* Checkbox verifica — sostituisce la stringa [verify] */}
          <div style={{ marginTop: 22, padding: "14px 16px", background: "rgba(0,0,0,0.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}
                style={{ width: 17, height: 17, marginTop: 2, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>
                <strong>Confermo</strong> di aver verificato i riferimenti normativi indicati sopra contro il testo aggiornato del Regolamento UE 2024/1689 (AI Act). Sono consapevole che questa classificazione è sotto la mia responsabilità legale.
              </span>
            </label>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingBottom: 16 }}>
            <Link href={`/dashboard/tools/inventory/${system.id}`}
              style={{ padding: "10px 18px", borderRadius: 9, fontSize: 13, border: `1px solid ${T.border}`, background: T.card, color: "#374151", textDecoration: "none", display: "inline-block" }}>
              Annulla
            </Link>
            <button onClick={handleSave} disabled={!canSave}
              style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: canSave ? "#0D1016" : "#e5e7eb", color: canSave ? "white" : "#9ca3af", fontSize: 13, fontWeight: 600, cursor: canSave ? "pointer" : "default", transition: "background 0.15s" }}>
              {saved ? "Salvato ✓" : "Conferma classificazione"}
            </button>
          </div>
        </div>

        {/* ── DESTRA: chat AI ─────────────────────────────────────── */}
        <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", background: "#f9f9f8" }}>
          {/* Chat header */}
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Assistente Classificazione AI Act</span>
            </div>
            <p style={{ fontSize: 11, color: T.muted, margin: "3px 0 0" }}>Basato su corpus normativo indicizzato · Art. 3, 5, 6, 50–55, 69 + Allegato III</p>
          </div>

          {/* Messaggi */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "84%", padding: "11px 15px",
                  borderRadius: msg.role === "user" ? "16px 16px 3px 16px" : "16px 16px 16px 3px",
                  background: msg.role === "user" ? "#0D1016" : T.card,
                  border: msg.role === "assistant" ? `1px solid ${T.border}` : "none",
                  fontSize: 13, color: msg.role === "user" ? "#fff" : "#374151",
                  lineHeight: 1.6, whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex" }}>
                <div style={{ padding: "11px 15px", borderRadius: "16px 16px 16px 3px", background: T.card, border: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 20, letterSpacing: 3, color: T.muted }}>···</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
            {chatMessages.length <= 1 && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                {["È un chatbot di assistenza clienti", "Usa GPT-4 per analizzare i CV", "Sistema di scoring del credito", "Ottimizzazione logistica interna"].map(q => (
                  <button key={q} onClick={() => setChatInput(q)}
                    style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 14, border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.03)", color: "#374151", cursor: "pointer" }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Descrivi il sistema AI o fai una domanda…"
                rows={2}
                style={{ flex: 1, resize: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 13px", fontSize: 13, color: T.text, background: "#f9f9f8", outline: "none", lineHeight: 1.5, fontFamily: "inherit" }}
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: chatInput.trim() && !chatLoading ? T.text : "rgba(0,0,0,0.08)", color: chatInput.trim() && !chatLoading ? "#fff" : "rgba(0,0,0,0.28)", cursor: chatInput.trim() && !chatLoading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                <Send size={14} />
              </button>
            </div>
            <p style={{ fontSize: 10.5, color: T.faint, margin: "5px 0 0", lineHeight: 1.4 }}>Le risposte AI sono suggerimenti. Verifica sempre con le fonti normative aggiornate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
