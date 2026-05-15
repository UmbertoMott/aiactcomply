"use client";

import { useState } from "react";
import { Clock, Eye, Download, Shield, UserCheck, Database } from "lucide-react";
import { getAllEvidence, type EvidenceRecord } from "@/lib/evidence/evidence-layer";

const mockLogs = Array.from({ length: 12 }, (_, i) => ({
  time: new Date(Date.now() - i * 120000).toISOString().slice(11, 19),
  sessionId: `SES-${(1000 + i).toString(36).toUpperCase()}`,
  dbRef: `db_cv_${Math.floor(Math.random() * 4) + 1}`,
  output: Math.random() > 0.3 ? "class_0 (Idoneo)" : "class_1 (Non idoneo)",
  humanValidator: ["m.rossi@azienda.it", "l.bianchi@azienda.it", "g.verdi@azienda.it", "e.neri@azienda.it"][Math.floor(Math.random() * 4)],
  referenceDb: `DB_UTENTI_V${Math.floor(Math.random() * 3) + 2}.prod`,
}));

export default function LogVaultPage() {
  const [selectedSession, setSelectedSession] = useState<typeof mockLogs[number] | null>(null);
  const evidenceCount = getAllEvidence().length;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">LogVault — Tamper-Evident (Art. 12)</h1>
      <p className="text-sm text-muted-foreground mb-8">Bucket log a prova di manomissione. Ogni record include data/ora, database di riferimento, output generato e ID dell&apos;umano che ha validato.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Clock, label: "Sessioni tracciate", value: mockLogs.length, color: "text-foreground" },
          { icon: UserCheck, label: "Validator umani", value: 4, color: "text-primary" },
          { icon: Database, label: "DB referenza", value: 3, color: "text-success" },
          { icon: Shield, label: "Record Evidence Layer", value: evidenceCount, color: "text-primary" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <c.icon className="h-4 w-4 text-muted-foreground mb-2" />
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Registro sessioni</h2>
              <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">
                <Download className="h-3 w-3" /> Export audit
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground">Ora</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground">Sessione</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground">DB Riferimento</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground">Output</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground">Validatore</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLogs.map((log, i) => (
                    <tr key={i} className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${selectedSession?.sessionId === log.sessionId ? "bg-muted/50" : ""}`}
                      onClick={() => setSelectedSession(log)}>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{log.time}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-primary">{log.sessionId}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{log.referenceDb}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{log.output}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{log.humanValidator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          {selectedSession ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Dettaglio sessione</h2>
              <div className="space-y-2 text-xs">
                {[
                  ["ID Sessione", selectedSession.sessionId],
                  ["Timestamp", selectedSession.time],
                  ["Database di riferimento", selectedSession.referenceDb],
                  ["Output generato", selectedSession.output],
                  ["Validatore umano", selectedSession.humanValidator],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-mono text-[10px]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-muted p-3 text-[10px] text-muted-foreground">
                <Shield className="h-3 w-3 text-primary inline mr-1" /> Tamper-Evident: record protetto da hash SHA-256 nell&apos;Evidence Layer.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Dettaglio sessione</h2>
              <p className="text-xs text-muted-foreground">Clicca una riga per i dettagli.</p>
              <p className="text-[10px] text-muted-foreground mt-2">Art. 12(3): Include data/ora, database, output e ID validatore.</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Evidence Layer</h2>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Record crittografici</span>
              <span className="text-foreground font-bold">{evidenceCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Catena hash</span>
              <span className="text-success text-[10px]">Integra</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
