"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, MailCheck } from "lucide-react";
import {
  evaluateQuickScan,
  QUICK_SCAN_QUESTIONS,
  type QuickScanAnswers,
} from "@/lib/quick-scan/quick-scan";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";
const TEXT = "#0D1016";
const MUTED = "rgba(0,0,0,0.48)";
const BORDER = "rgba(0,0,0,0.08)";
const SOFT = "#FAFAF9";

const roleOptions = [
  "Founder / CEO",
  "CTO / CIO",
  "Legal / Compliance",
  "AI Governance",
  "Privacy / DPO",
  "Risk / Security",
  "Product / Engineering",
  "Consulente",
  "Altro",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  fontSize: 14,
  color: TEXT,
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.14)",
  borderRadius: 9,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: "rgba(0,0,0,0.55)",
  marginBottom: 7,
};

type Stage = "intro" | "quiz" | "lead" | "success";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "rgba(0,0,0,0.45)",
        background: "rgba(0,0,0,0.05)",
        borderRadius: 20,
        padding: "5px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function QuickScanClient() {
  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<QuickScanAnswers>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    marketing: true,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = QUICK_SCAN_QUESTIONS[current];
  const result = useMemo(() => evaluateQuickScan(answers), [answers]);
  const progress = Math.round(((current + 1) / QUICK_SCAN_QUESTIONS.length) * 100);
  const canContinue = Boolean(answers[question.id]);

  const updateForm = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.type === "checkbox"
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function selectAnswer(answerId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: answerId }));
  }

  function nextQuestion() {
    if (!canContinue) return;
    if (current < QUICK_SCAN_QUESTIONS.length - 1) {
      setCurrent((value) => value + 1);
      return;
    }
    setStage("lead");
  }

  function previousQuestion() {
    if (current > 0) setCurrent((value) => value - 1);
  }

  async function submitLead(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/quick-scan-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, answers }),
      });
      if (!response.ok) throw new Error("Report request failed");
      setStage("success");
    } catch {
      setError("Non siamo riusciti a inviare il report. Riprova tra qualche secondo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#ffffff", color: TEXT }}>
      <style>{`
        .quick-scan-shell {
          max-width: 1040px;
          margin: 0 auto;
          padding: 64px 24px 96px;
        }
        .quick-scan-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
          gap: clamp(28px, 5vw, 68px);
          align-items: start;
        }
        .quick-scan-panel {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.06);
        }
        .quick-scan-answer {
          width: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          text-align: left;
          border: 1px solid rgba(0,0,0,0.09);
          background: #ffffff;
          border-radius: 12px;
          padding: 16px 16px;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
        }
        .quick-scan-answer:hover {
          border-color: rgba(0,0,0,0.25);
          transform: translateY(-1px);
        }
        .quick-scan-answer[data-selected="true"] {
          border-color: #0D1016;
          background: rgba(0,0,0,0.035);
        }
        .quick-scan-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 860px) {
          .quick-scan-shell { padding-top: 40px; }
          .quick-scan-grid { grid-template-columns: 1fr; }
          .quick-scan-panel { border-radius: 14px; }
        }
        @media (max-width: 620px) {
          .quick-scan-shell { padding: 32px 18px 72px; }
          .quick-scan-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="quick-scan-shell">
        <div style={{ marginBottom: 34 }}>
          <Link
            href="/risorse/ai-act-quick-scan-10-domande-gap-compliance"
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: "rgba(0,0,0,0.35)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Torna all&apos;articolo
          </Link>
        </div>

        <div className="quick-scan-grid">
          <section>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              <Pill>AI Act Quick Scan</Pill>
              <Pill>5 minuti</Pill>
              <Pill>Report PDF</Pill>
            </div>

            <h1
              style={{
                fontFamily: SERIF,
                fontSize: "clamp(38px, 5.8vw, 72px)",
                fontWeight: 400,
                letterSpacing: "-2.4px",
                lineHeight: 0.98,
                margin: "0 0 22px",
                maxWidth: 620,
              }}
            >
              Scopri se il tuo sistema AI ha gap prima del 2 dicembre 2026.
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.72, color: MUTED, maxWidth: 560, margin: "0 0 30px" }}>
              Rispondi a 8 domande. Il risultato completo non viene chiesto all&apos;inizio:
              prima analizziamo il caso, poi sblocchi il mini-report personalizzato via email.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                maxWidth: 560,
              }}
            >
              {[
                ["8", "domande mirate"],
                ["0", "email prima del valore"],
                ["PDF", "report preliminare"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    paddingTop: 14,
                    minWidth: 0,
                  }}
                >
                  <p style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1, margin: "0 0 5px" }}>{value}</p>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.36)", margin: 0, lineHeight: 1.45 }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="quick-scan-panel" style={{ overflow: "hidden" }}>
            {stage === "intro" && (
              <div style={{ padding: "clamp(28px, 4vw, 40px)" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: TEXT,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 28,
                  }}
                >
                  <FileText size={22} strokeWidth={1.8} />
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 400, letterSpacing: "-0.8px", lineHeight: 1.12, margin: "0 0 12px" }}>
                  Fai il Quick Scan AI Act.
                </h2>
                <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.7, margin: "0 0 28px" }}>
                  Alla fine vedrai un teaser con aree critiche, priorità e gap documentali.
                  Il report completo viene inviato solo dopo il form.
                </p>
                <button
                  type="button"
                  onClick={() => setStage("quiz")}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: 10,
                    background: TEXT,
                    color: "#ffffff",
                    fontFamily: MONO,
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "15px 18px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                  }}
                >
                  Inizia il Quick Scan
                  <ArrowRight size={16} strokeWidth={1.9} />
                </button>
                <p style={{ fontSize: 11.5, color: "rgba(0,0,0,0.35)", lineHeight: 1.55, margin: "16px 0 0", textAlign: "center" }}>
                  Preliminary assessment. Non costituisce parere legale o certificazione.
                </p>
              </div>
            )}

            {stage === "quiz" && (
              <div>
                <div style={{ padding: "24px 28px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.36)" }}>
                      Domanda {current + 1} di {QUICK_SCAN_QUESTIONS.length}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.36)" }}>
                      {progress}%
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, background: TEXT, transition: "width 0.25s ease" }} />
                  </div>
                </div>

                <div style={{ padding: "30px 28px 28px" }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(0,0,0,0.36)", margin: "0 0 12px" }}>
                    {question.eyebrow}
                  </p>
                  <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 400, letterSpacing: "-0.8px", lineHeight: 1.15, margin: "0 0 24px" }}>
                    {question.text}
                  </h2>

                  <div style={{ display: "grid", gap: 11 }}>
                    {question.answers.map((answer) => {
                      const selected = answers[question.id] === answer.id;
                      return (
                        <button
                          key={answer.id}
                          type="button"
                          className="quick-scan-answer"
                          data-selected={selected}
                          onClick={() => selectAnswer(answer.id)}
                        >
                          <span>
                            <span style={{ display: "block", fontSize: 14.5, color: TEXT, lineHeight: 1.45 }}>{answer.text}</span>
                            {answer.helper && (
                              <span style={{ display: "block", fontSize: 12, color: MUTED, lineHeight: 1.5, marginTop: 4 }}>
                                {answer.helper}
                              </span>
                            )}
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              border: selected ? `5px solid ${TEXT}` : "1px solid rgba(0,0,0,0.20)",
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 28 }}>
                    <button
                      type="button"
                      onClick={previousQuestion}
                      disabled={current === 0}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: current === 0 ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.52)",
                        fontFamily: MONO,
                        fontSize: 12,
                        cursor: current === 0 ? "default" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <ArrowLeft size={14} strokeWidth={1.8} />
                      Indietro
                    </button>
                    <button
                      type="button"
                      onClick={nextQuestion}
                      disabled={!canContinue}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        background: TEXT,
                        color: "#ffffff",
                        opacity: canContinue ? 1 : 0.38,
                        fontFamily: MONO,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "12px 18px",
                        cursor: canContinue ? "pointer" : "not-allowed",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {current === QUICK_SCAN_QUESTIONS.length - 1 ? "Vedi il risultato" : "Continua"}
                      <ArrowRight size={15} strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stage === "lead" && (
              <div style={{ padding: "clamp(28px, 4vw, 40px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <CheckCircle2 size={24} strokeWidth={1.7} color={TEXT} />
                  <span style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(0,0,0,0.38)" }}>
                    Assessment completed
                  </span>
                </div>

                <h2 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 400, letterSpacing: "-1px", lineHeight: 1.08, margin: "0 0 14px" }}>
                  Il tuo assessment è pronto.
                </h2>
                <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.7, margin: "0 0 26px" }}>
                  Abbiamo analizzato le tue risposte. Per ricevere il mini-report PDF completo,
                  inserisci i dati aziendali qui sotto.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {[
                    [String(result.criticalAreas), "area critica"],
                    [String(result.highPriorityAreas), "alta priorità"],
                    [String(result.mediumPriorityAreas), "da approfondire"],
                  ].map(([value, label]) => (
                    <div key={label} style={{ background: SOFT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 12px" }}>
                      <p style={{ fontFamily: SERIF, fontSize: 29, lineHeight: 1, margin: "0 0 6px" }}>{value}</p>
                      <p style={{ fontFamily: MONO, fontSize: 9.5, color: "rgba(0,0,0,0.38)", margin: 0, lineHeight: 1.4 }}>{label}</p>
                    </div>
                  ))}
                </div>

                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 16px", marginBottom: 26 }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(0,0,0,0.36)", margin: "0 0 10px" }}>
                    Teaser report
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: TEXT, margin: 0 }}>
                    Potenziali gap individuati: <strong>{result.potentialGaps}</strong>.
                    Possibili gap documentali: <strong>{result.documentGaps}</strong>.
                    Il punteggio completo e i 3 gap principali sono nel PDF.
                  </p>
                </div>

                <form onSubmit={submitLead}>
                  <div className="quick-scan-form-grid" style={{ marginBottom: 16 }}>
                    <Field label="Nome *">
                      <input required style={inputStyle} placeholder="Nome e cognome" value={form.name} onChange={updateForm("name")} />
                    </Field>
                    <Field label="Email aziendale *">
                      <input required type="email" style={inputStyle} placeholder="nome@azienda.com" value={form.email} onChange={updateForm("email")} />
                    </Field>
                    <Field label="Azienda *">
                      <input required style={inputStyle} placeholder="Nome azienda" value={form.company} onChange={updateForm("company")} />
                    </Field>
                    <Field label="Ruolo">
                      <select
                        style={{ ...inputStyle, color: form.role ? TEXT : "rgba(0,0,0,0.38)", cursor: "pointer" }}
                        value={form.role}
                        onChange={updateForm("role")}
                      >
                        <option value="">Seleziona...</option>
                        {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </Field>
                  </div>

                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.marketing}
                      onChange={updateForm("marketing")}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: TEXT, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", lineHeight: 1.5 }}>
                      Acconsento a ricevere il report e comunicazioni su servizi RegulaeOS.
                      Posso disiscrivermi in qualsiasi momento.
                    </span>
                  </label>

                  {error && <p style={{ fontSize: 12.5, color: "#b42318", margin: "0 0 14px" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 10,
                      background: TEXT,
                      color: "#ffffff",
                      fontFamily: MONO,
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "15px 18px",
                      cursor: sending ? "wait" : "pointer",
                      opacity: sending ? 0.7 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 9,
                    }}
                  >
                    {sending ? "Invio report..." : "Ricevi il mio report"}
                    <ArrowRight size={16} strokeWidth={1.9} />
                  </button>
                  <p style={{ fontSize: 11.5, color: "rgba(0,0,0,0.38)", lineHeight: 1.55, margin: "15px 0 0", textAlign: "center" }}>
                    Trattiamo i dati secondo la <Link href="/privacy" style={{ color: "rgba(0,0,0,0.58)", textDecoration: "underline" }}>Privacy Policy</Link>.
                  </p>
                </form>
              </div>
            )}

            {stage === "success" && (
              <div style={{ padding: "clamp(32px, 5vw, 52px)", textAlign: "center" }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: TEXT,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}
                >
                  <MailCheck size={25} strokeWidth={1.8} />
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 400, letterSpacing: "-1.2px", lineHeight: 1.08, margin: "0 0 14px" }}>
                  Report in preparazione.
                </h2>
                <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, maxWidth: 430, margin: "0 auto 28px" }}>
                  Riceverai il mini-report AI Act Quick Scan con readiness score,
                  principali gap, priorità operative e prossimi documenti da preparare.
                </p>
                <Link
                  href="/pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    background: TEXT,
                    color: "#ffffff",
                    borderRadius: 999,
                    padding: "13px 24px",
                    textDecoration: "none",
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Avvia assessment completo
                  <ArrowRight size={15} strokeWidth={1.9} />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
