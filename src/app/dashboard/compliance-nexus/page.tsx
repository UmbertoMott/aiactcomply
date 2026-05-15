"use client";

import { useState } from "react";
import {
  Shield,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  Building2,
  ExternalLink,
} from "lucide-react";
import {
  submitToAuthority,
  generateSMEFastTrack,
  getRegistrationRequirements,
  getDeadline,
} from "@/lib/compliance/gateway";

const RISK_CLASSES = ["high", "limited", "minimal", "unacceptable"];

export default function ComplianceNexusPage() {
  const [riskClass, setRiskClass] = useState("high");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Awaited<ReturnType<typeof submitToAuthority>> | null>(null);
  const [sandbox, setSandbox] = useState<ReturnType<typeof generateSMEFastTrack> | null>(null);
  const [form, setForm] = useState({ company: "AI Tech S.r.l.", system: "CV-Screener v2.3", desc: "Screening CV per HR" });

  async function handleSubmit() {
    setSubmitting(true);
    const reqs = getRegistrationRequirements(riskClass);
    const result = await submitToAuthority(form.system, riskClass, reqs);
    setSubmission(result);
    setSubmitting(false);
  }

  function handleSandbox() {
    const sb = generateSMEFastTrack(form.company, form.system, form.desc);
    setSandbox(sb);
  }

  const requirements = getRegistrationRequirements(riskClass);
  const deadline = getDeadline(riskClass);

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Compliance-Nexus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gateway Autorità verso la banca dati UE (Art. 71) e Sandbox regolatorie (Art. 57).
          SME-Fast-Track per PMI.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Registration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Registrazione sistema — Banca dati UE
            </h2>
            <div className="space-y-3 mb-4">
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground"
                placeholder="Nome azienda"
              />
              <input
                value={form.system}
                onChange={(e) => setForm({ ...form, system: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground"
                placeholder="Nome sistema AI"
              />
              <input
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground"
                placeholder="Descrizione"
              />
              <div className="flex gap-2">
                {RISK_CLASSES.map((rc) => (
                  <button
                    key={rc}
                    onClick={() => setRiskClass(rc)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-medium border transition-colors ${
                      riskClass === rc ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {rc}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3 mb-4">
              <p className="text-[10px] text-muted-foreground mb-2">
                <strong className="text-foreground">Scadenza:</strong> {deadline}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Documenti richiesti:</p>
              <ul className="space-y-1">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <CheckCircle className="h-2.5 w-2.5 text-success mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Invio in corso..." : "Invia al Garante (Art. 71)"}
            </button>

            {submission && (
              <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium text-success">Notifica inviata con successo</span>
                </div>
                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p>Rif: <span className="font-mono text-foreground">{submission.referenceNumber}</span></p>
                  <p>Autorità: {submission.authority}</p>
                  <p>Data: {submission.submissionDate.slice(0, 10)}</p>
                </div>
              </div>
            )}
          </div>

          {/* SME Fast-Track */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">SME-Fast-Track — Sandbox (Art. 57)</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Per PMI: accesso semplificato alle Sandbox regolatorie</p>
              </div>
              {!sandbox && (
                <button onClick={handleSandbox} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  Genera pacchetto
                </button>
              )}
            </div>
            {sandbox && (
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <p><strong className="text-foreground">ID:</strong> <span className="font-mono">{sandbox.id}</span></p>
                  <p><strong className="text-foreground">Sandbox:</strong> {sandbox.sandboxName}</p>
                  <p><strong className="text-foreground">Azienda:</strong> {sandbox.companyName}</p>
                  <p><strong className="text-foreground">Stato:</strong> <span className="text-warning">{sandbox.status}</span></p>
                </div>
                <button className="mt-3 rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Apri pratica su EU Digital Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: info panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Status registrazioni</h2>
            <div className="space-y-2">
              {[
                { name: "Banca dati UE (Art. 49)", status: submission ? "Notificato" : "Non registrato", active: !!submission },
                { name: "Sandbox Italia (Art. 57)", status: sandbox ? "Bozza pronta" : "Non avviato", active: !!sandbox },
                { name: "Organismo notificato", status: "Da designare", active: false },
                { name: "FRIA depositato", status: "Da fare", active: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className={`text-[10px] ${item.active ? "text-success" : "text-muted-foreground"}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Timeline normativa</h2>
            {[
              { date: "2 Feb 2025", event: "Pratiche vietate (Art. 5)", done: true },
              { date: "2 Ago 2025", event: "GPAI models (Art. 53-55)", done: true },
              { date: "2 Ago 2026", event: "Alto rischio — Allegato III", done: false },
              { date: "2 Ago 2027", event: "Alto rischio — Allegato III (p.6-8)", done: false },
            ].map((t) => (
              <div key={t.date} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 ${t.done ? "bg-success" : "bg-warning"}`} />
                <div>
                  <p className="text-xs text-foreground">{t.event}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{t.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
