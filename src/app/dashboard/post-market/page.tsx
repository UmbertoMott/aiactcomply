"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  FileText,
  Send,
  CheckCircle,
  Eye,
  Bell,
} from "lucide-react";

const TIMELINE_HOURS = 15 * 24; // 15 days in hours

interface Incident {
  id: string;
  title: string;
  system: string;
  date: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "reported" | "investigating" | "resolved" | "pending";
  notified: boolean;
  daysRemaining: number;
  description: string;
  authority: string;
}

const initialIncidents: Incident[] = [
  {
    id: "INC-001",
    title: "Falso positivo screening biometrico",
    system: "FaceID-API v2.3",
    date: "2026-05-06",
    severity: "high",
    status: "investigating",
    notified: true,
    daysRemaining: 13,
    description: "Tasso di falsi positivi all'8.3% su soggetti con pigmentazione scura",
    authority: "Garante Privacy (notificato)",
  },
  {
    id: "INC-002",
    title: "Prompt injection riuscita su chatbot HR",
    system: "HR-Assist LLM",
    date: "2026-05-08",
    severity: "critical",
    status: "pending",
    notified: false,
    daysRemaining: 15,
    description: "Utente non autorizzato ha estratto dati stipendiali via prompt injection",
    authority: "Da notificare — entro 15 giorni",
  },
  {
    id: "INC-003",
    title: "Deriva performance modello creditizio",
    system: "Credit-Score v4.1",
    date: "2026-04-30",
    severity: "medium",
    status: "resolved",
    notified: true,
    daysRemaining: 0,
    description: "Accuratezza scesa dal 94% all'87% su coorte giovani",
    authority: "Notificato ad AGCOM",
  },
];

const severityColors: Record<string, string> = {
  critical: "text-danger bg-danger/10 border-danger/30",
  high: "text-warning bg-warning/10 border-warning/30",
  medium: "text-primary bg-primary/10 border-primary/30",
  low: "text-muted-foreground bg-muted border-border",
};

const statusColors: Record<string, string> = {
  reported: "text-primary",
  investigating: "text-warning",
  resolved: "text-success",
  pending: "text-danger",
};

export default function PostMarketPage() {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [showReport, setShowReport] = useState(false);

  function notifyAuthority(id: string) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              notified: true,
              status: "reported" as const,
              authority: "Notificato — in attesa riscontro",
              daysRemaining: 0,
            }
          : inc
      )
    );
  }

  const pendingNotifications = incidents.filter((i) => !i.notified).length;

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Post-Market Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoraggio continuo post-immissione e segnalazione incidenti gravi.
            Art. 72 — Piano di monitoraggio. Art. 73 — Notifica entro 15 giorni.
          </p>
        </div>
        {pendingNotifications > 0 && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-xs font-medium text-danger flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {pendingNotifications} incident{ pendingNotifications > 1 ? "i" : "" } da notificare
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Incidenti totali", value: incidents.length, color: "text-foreground", icon: AlertTriangle },
          { label: "Da notificare", value: pendingNotifications, color: "text-danger", icon: Bell },
          { label: "In investigazione", value: incidents.filter((i) => i.status === "investigating").length, color: "text-warning", icon: Eye },
          { label: "Risolti", value: incidents.filter((i) => i.status === "resolved").length, color: "text-success", icon: CheckCircle },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <card.icon className="h-4 w-4 text-muted-foreground mb-2" />
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Registro incidenti</h2>
              <button onClick={() => setShowReport(!showReport)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Nuovo incidente
              </button>
            </div>

            {showReport && (
              <div className="px-5 py-4 border-b border-border bg-muted/30">
                <p className="text-xs font-medium text-foreground mb-3">Nuova segnalazione incidente grave (Art. 73)</p>
                <div className="space-y-3">
                  <input placeholder="Titolo incidente" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground" />
                  <input placeholder="Sistema coinvolto" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground" />
                  <textarea placeholder="Descrizione dettagliata..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground" rows={3} />
                  <button className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Invia notifica preliminare
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border/50">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`px-5 py-4 hover:bg-muted/30 cursor-pointer ${selected?.id === inc.id ? "bg-muted/50" : ""}`}
                  onClick={() => setSelected(inc)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{inc.id}</span>
                      <h3 className="text-sm font-medium text-foreground">{inc.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${severityColors[inc.severity]}`}>
                        {inc.severity}
                      </span>
                      <span className={`text-[10px] font-medium ${statusColors[inc.status]}`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">{inc.system} · {inc.date}</p>
                  {!inc.notified && inc.daysRemaining > 0 && (
                    <div className="flex items-center gap-1 mt-2 ml-4">
                      <Clock className="h-3 w-3 text-danger" />
                      <span className="text-[10px] text-danger font-medium">
                        Notifica entro {inc.daysRemaining} giorni (Art. 73)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          {selected ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                {selected.id}: {selected.title}
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Sistema</span>
                  <p className="text-xs text-foreground">{selected.system}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Data rilevamento</span>
                  <p className="text-xs text-foreground">{selected.date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Descrizione</span>
                  <p className="text-xs text-muted-foreground">{selected.description}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Autorità competente</span>
                  <p className={`text-xs ${selected.notified ? "text-success" : "text-danger"}`}>
                    {selected.authority}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {!selected.notified && (
                    <button
                      onClick={() => notifyAuthority(selected.id)}
                      className="flex-1 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white hover:bg-danger/90 flex items-center justify-center gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Notifica autorità
                    </button>
                  )}
                  {selected.notified && (
                    <span className="flex-1 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success text-center flex items-center justify-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Notificato
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Dettaglio incidente</h2>
              <p className="text-xs text-muted-foreground">Seleziona un incidente per vedere i dettagli.</p>
            </div>
          )}

          {/* Timeline reminder */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Scadenze Art. 73</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Notifica preliminare</span>
                <span className="text-foreground font-mono">24h</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rapporto completo</span>
                <span className="text-foreground font-mono">15 giorni</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Aggiornamenti periodici</span>
                <span className="text-foreground font-mono">30 giorni</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
