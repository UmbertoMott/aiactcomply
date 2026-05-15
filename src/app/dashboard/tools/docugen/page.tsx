"use client";

import { FileText, Plus, Download } from "lucide-react";
import { useState } from "react";

type DocSection = {
  id: string;
  title: string;
  allegato: string;
  content: string;
  completed: boolean;
};

const templates: Omit<DocSection, "id" | "content" | "completed">[] = [
  { title: "Descrizione generale del sistema AI", allegato: "IV.1(a)" },
  { title: "Specifiche di progettazione del sistema", allegato: "IV.1(b)" },
  { title: "Architettura e algoritmo del sistema", allegato: "IV.1(c)" },
  { title: "Dati di addestramento e governance", allegato: "IV.1(d)" },
  { title: "Misure di sorveglianza umana", allegato: "IV.1(e)" },
  { title: "Metriche di accuratezza e robustezza", allegato: "IV.1(f)" },
  { title: "Gestione dei rischi e misure adottate", allegato: "IV.1(g)" },
  { title: "Modifiche e versioning del sistema", allegato: "IV.1(h)" },
  { title: "Elenco norme armonizzate applicate", allegato: "IV.1(i)" },
  { title: "Dichiarazione di conformità UE", allegato: "IV.1(j)" },
  { title: "Sistema di gestione della qualità", allegato: "IV.1(k)" },
];

export default function DocuGenPage() {
  const [sections, setSections] = useState<DocSection[]>([]);

  function addSection(title: string, allegato: string) {
    setSections([
      ...sections,
      {
        id: crypto.randomUUID(),
        title,
        allegato,
        content: "",
        completed: false,
      },
    ]);
  }

  function updateContent(id: string, content: string) {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, content } : s))
    );
  }

  function toggleComplete(id: string) {
    setSections(
      sections.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s
      )
    );
  }

  const completedCount = sections.filter((s) => s.completed).length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">DocuGen AI</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Generatore di documentazione tecnica conforme all&apos;Art. 11 e
        Allegato IV — Regolamento UE 2024/1689.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Sezioni", value: sections.length, color: "text-foreground" },
          { label: "Completate", value: completedCount, color: "text-success" },
          { label: "Template disponibili", value: templates.length, color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-card p-4">
          <button className="w-full rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center gap-1">
            <Download className="h-3.5 w-3.5" />
            Esporta PDF
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 text-primary" />
        Aggiungi sezioni dalla checklist Allegato IV
      </h2>
      <div className="grid md:grid-cols-2 gap-2 mb-8">
        {templates
          .filter((t) => !sections.find((s) => s.title === t.title))
          .map((t) => (
            <button
              key={t.title}
              onClick={() => addSection(t.title, t.allegato)}
              className="rounded-lg border border-border px-4 py-2.5 text-xs text-left text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
            >
              {t.title}{" "}
              <span className="text-muted-foreground/50">({t.allegato})</span>
            </button>
          ))}
      </div>

      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Aggiungi le sezioni dalla checklist per iniziare a compilare la
              documentazione tecnica.
            </p>
          </div>
        ) : (
          sections.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border bg-card p-5 ${
                s.completed ? "border-success/30" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {s.allegato}
                  </span>
                </div>
                <button
                  onClick={() => toggleComplete(s.id)}
                  className={`text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors ${
                    s.completed
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {s.completed ? "Completato" : "In bozza"}
                </button>
              </div>
              <textarea
                value={s.content}
                onChange={(e) => updateContent(s.id, e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Inserisci il contenuto della sezione..."
                rows={3}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
