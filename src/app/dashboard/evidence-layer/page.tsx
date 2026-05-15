"use client";

import { useState } from "react";
import {
  Database,
  Link2,
  Shield,
  CheckCircle,
  AlertTriangle,
  Plus,
  FileCode,
} from "lucide-react";
import { appendEvidence, getAllEvidence, verifyChain, getEvidenceByType, type EvidenceRecord, type EvidenceType } from "@/lib/evidence/evidence-layer";

export default function EvidenceLayerPage() {
  const [records, setRecords] = useState<EvidenceRecord[]>(() => getAllEvidence());
  const [chainValid, setChainValid] = useState(() => verifyChain().valid);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ type: EvidenceType; author: string; content: string }>({ type: "adr", author: "", content: "" });

  function refresh() {
    setRecords(getAllEvidence());
    setChainValid(verifyChain().valid);
  }

  async function addRecord() {
    if (!form.content || !form.author) return;
    try {
      const parsed = JSON.parse(form.content);
      await appendEvidence(form.type, parsed, form.author);
      setForm({ type: "adr", author: "", content: "" });
      setShowForm(false);
      refresh();
    } catch {
      alert("Il contenuto deve essere JSON valido");
    }
  }

  const types: { label: string; key: EvidenceType; icon: typeof Database }[] = [
    { label: "ADR", key: "adr", icon: FileCode },
    { label: "Log", key: "log", icon: Database },
    { label: "Decisione", key: "decision", icon: Link2 },
    { label: "Audit", key: "audit", icon: Shield },
    { label: "Test", key: "test", icon: CheckCircle },
    { label: "Incidente", key: "incident", icon: AlertTriangle },
    { label: "Monitor", key: "monitoring", icon: AlertTriangle },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Evidence Layer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Archivio bitemporale immutabile con hash crittografico. Ogni record è
          concatenato al precedente, garantendo l&apos;integrità della prova normativa.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Record totali", value: records.length, color: "text-foreground" },
          { label: "ADR", value: getEvidenceByType("adr").length, color: "text-primary" },
          { label: "Catena hash", value: chainValid ? "Integra" : "ROTTA!", color: chainValid ? "text-success" : "text-danger" },
          { label: "Log monitor", value: getEvidenceByType("monitoring").length, color: "text-warning" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      {!chainValid && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
          <p className="text-sm text-danger">
            Allarme: la catena dei record è stata manomessa. Verifica
            l&apos;integrità dell&apos;archivio.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Records</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuovo record
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {types.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setForm({ ...form, type: t.key })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                    form.type === t.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <t.icon className="h-3 w-3 inline mr-1" />
                  {t.label}
                </button>
              ))}
            </div>
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Autore (es. mario.rossi@azienda.it)"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono"
              placeholder='{"decision": "Scelto modello X per classificazione", "motivazione": "..."}'
              rows={3}
            />
            <button
              onClick={addRecord}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Scrivi su Evidence Layer
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase">Hash</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase">Autore</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase">Timestamp</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase">Prev Hash</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nessun record. Crea il primo per iniziare la catena di evidenze.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-primary">
                      {r.hash.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.author}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {r.timestamp.slice(11, 19)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {r.previousHash === "genesis" ? "GENESIS" : `${r.previousHash.slice(0, 8)}...`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
