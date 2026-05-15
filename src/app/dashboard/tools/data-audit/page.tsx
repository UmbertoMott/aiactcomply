"use client";

import { Database, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

const checks = [
  {
    id: "origin",
    title: "Origine e raccolta dati",
    desc: "I dati sono stati raccolti con processi documentati e con finalità chiare",
    question: "Hai documentato l'origine dei dati, il processo di raccolta e la finalità originaria?",
  },
  {
    id: "annotation",
    title: "Annotazione ed etichettatura",
    desc: "I dati sono stati annotati, puliti e preparati con processi verificabili",
    question: "Sono documentate le operazioni di annotazione, etichettatura e pulizia dei dati?",
  },
  {
    id: "bias",
    title: "Analisi distorsioni (bias)",
    desc: "I dati sono stati esaminati per potenziali distorsioni che possono causare discriminazioni",
    question: "È stata condotta un'analisi delle possibili distorsioni (bias) per età, genere, etnia, etc.?",
  },
  {
    id: "representativeness",
    title: "Rappresentatività",
    desc: "I dataset sono sufficientemente rappresentativi del contesto di utilizzo",
    question: "I set di dati sono pertinenti e rappresentativi delle persone/gruppi su cui il sistema sarà usato?",
  },
  {
    id: "completeness",
    title: "Completezza e accuratezza",
    desc: "I dati sono esenti da errori e completi per la finalità prevista",
    question: "Sono state identificate e documentate eventuali lacune o carenze nei dati?",
  },
  {
    id: "context",
    title: "Contesto geografico e funzionale",
    desc: "I dati tengono conto delle specificità del contesto di utilizzo",
    question: "I dataset considerano le caratteristiche dello specifico ambito geografico, contestuale e funzionale?",
  },
  {
    id: "governance",
    title: "Data governance",
    desc: "Esistono pratiche documentate di governance dei dati",
    question: "Sono stabilite ipotesi chiare su ciò che i dati misurano e rappresentano?",
  },
];

export default function DataAuditPage() {
  const [responses, setResponses] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  function toggle(id: string, value: boolean) {
    setResponses({ ...responses, [id]: value });
  }

  const completed = Object.keys(responses).length;
  const passed = Object.values(responses).filter(Boolean).length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">Data Audit</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Audit qualità dei dataset — Art. 10 Regolamento UE 2024/1689. Verifica
        la conformità dei tuoi dati di addestramento, convalida e test.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Checklist completati", value: `${completed}/${checks.length}`, color: "text-foreground" },
          { label: "Check superati", value: passed, color: "text-success" },
          { label: "Check falliti", value: completed - passed, color: "text-danger" },
          { label: "Score compliance", value: completed > 0 ? `${Math.round((passed / completed) * 100)}%` : "—", color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {checks.map((check) => (
          <div
            key={check.id}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {check.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  {check.desc}
                </p>
                <p className="text-xs text-foreground bg-muted rounded-lg p-3 mb-3">
                  <Info className="h-3 w-3 inline mr-1 text-primary" />
                  {check.question}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(check.id, true)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                      responses[check.id] === true
                        ? "bg-success/10 border-success text-success"
                        : "border-border text-muted-foreground hover:border-success/30"
                    }`}
                  >
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Sì
                  </button>
                  <button
                    onClick={() => toggle(check.id, false)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                      responses[check.id] === false
                        ? "bg-danger/10 border-danger text-danger"
                        : "border-border text-muted-foreground hover:border-danger/30"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    No
                  </button>
                  {responses[check.id] === false && (
                    <input
                      value={notes[check.id] || ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [check.id]: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Descrivi la criticità..."
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
