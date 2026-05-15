"use client";

import { Trash2, FileText, CheckCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { writeToStorage, readFromStorage } from "@/lib/dossier/storage-schema";
import type { QMSResult } from "@/lib/dossier/storage-schema";

const templateSections = [
  { id: "compliance", title: "Strategia conformità normativa", desc: "Comprese procedure di valutazione e gestione modifiche", art: "Art. 17(1)(a)" },
  { id: "design", title: "Progettazione e controllo", desc: "Tecniche, procedure e interventi per la progettazione del sistema", art: "Art. 17(1)(b)" },
  { id: "development", title: "Sviluppo e garanzia qualità", desc: "Tecniche e procedure per lo sviluppo del sistema", art: "Art. 17(1)(c)" },
  { id: "testing", title: "Procedure di esame, prova e convalida", desc: "Da effettuare prima, durante e dopo lo sviluppo", art: "Art. 17(1)(d)" },
  { id: "specs", title: "Specifiche tecniche e norme", desc: "Norme armonizzate applicate e mezzi per garantire conformità", art: "Art. 17(1)(e)" },
  { id: "data_mgmt", title: "Gestione dati", desc: "Acquisizione, raccolta, analisi, etichettatura, conservazione", art: "Art. 17(1)(f)" },
  { id: "risk", title: "Sistema gestione rischi", desc: "Integrazione del risk management system (Art. 9)", art: "Art. 17(1)(g)" },
  { id: "monitoring", title: "Monitoraggio post-market", desc: "Predisposizione e manutenzione sistema di monitoraggio", art: "Art. 17(1)(h)" },
  { id: "incidents", title: "Segnalazione incidenti", desc: "Procedure relative alla segnalazione di incidenti gravi", art: "Art. 17(1)(i)" },
  { id: "communication", title: "Comunicazione con autorità", desc: "Gestione rapporti con autorità, organismi notificati e stakeholder", art: "Art. 17(1)(j)" },
  { id: "records", title: "Conservazione registrazioni", desc: "Sistemi e procedure per la conservazione della documentazione", art: "Art. 17(1)(k)" },
  { id: "resources", title: "Gestione risorse", desc: "Misure relative alla sicurezza dell'approvvigionamento", art: "Art. 17(1)(l)" },
  { id: "accountability", title: "Quadro di responsabilità", desc: "Responsabilità dirigenza e personale per tutti gli aspetti", art: "Art. 17(1)(m)" },
];

type QMSSection = {
  id: string;
  title: string;
  desc: string;
  art: string;
  content: string;
  completed: boolean;
};

export default function QMSPage() {
  const [sections, setSections] = useState<QMSSection[]>([]);

  function addSection(s: typeof templateSections[number]) {
    setSections([
      ...sections,
      { id: crypto.randomUUID(), title: s.title, desc: s.desc, art: s.art, content: "", completed: false },
    ]);
  }

  function toggle(id: string) {
    setSections(sections.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  }

  function updateContent(id: string, content: string) {
    setSections(sections.map((s) => (s.id === id ? { ...s, content } : s)));
  }

  function removeSection(id: string) {
    setSections(sections.filter((s) => s.id !== id));
  }

  const completedCount = sections.filter((s) => s.completed).length;
  const [savedAt, setSavedAt] = useState<string | null>(() =>
    readFromStorage<QMSResult>("qms")?.completedAt ?? null
  );

  function saveToDossier() {
    const completedAt = new Date().toISOString();
    writeToStorage<QMSResult>("qms", {
      qmsDocumentRef: `QMS-AIComply-v1.0-${new Date().toISOString().split("T")[0]}`,
      postMarketPlanExists: sections.some((s) => s.id.includes("monitoring") && s.completed),
      internalReviewCycle: "Trimestrale",
      responsibleManager: "AI Compliance Officer",
      certifications: [],
      completedAt,
    });
    setSavedAt(completedAt);
  }

  return (
    <div className="max-w-4xl">
      {savedAt ? (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--font-inter, system-ui)" }}>
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: "#15803d" }} />
          <span style={{ color: "#15803d" }}>✓ Risultati salvati nel dossier · Aggiornato il {new Date(savedAt).toLocaleDateString("it-IT")}</span>
          <Link href="/dashboard/dossier" className="ml-auto text-[11px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#15803d" }}>Vedi dossier →</Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2.5 mb-5 text-[12px]"
          style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", fontFamily: "var(--font-inter, system-ui)" }}>
          <span style={{ color: "rgba(0,0,0,0.45)" }}>Salva la configurazione QMS nel dossier di compliance</span>
          <button onClick={saveToDossier} className="text-[11px] font-medium rounded-full px-3 py-1 hover:opacity-80"
            style={{ background: "#3b82f6", color: "#ffffff", border: "none", cursor: "pointer" }}>
            Salva nel dossier
          </button>
        </div>
      )}
      <h1 className="text-2xl font-bold text-foreground mb-2">QMS Builder</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Sistema di Gestione della Qualità — Art. 17 Regolamento UE 2024/1689.
        Documenta politiche, procedure e istruzioni scritte per garantire la
        conformità.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Sezioni", value: sections.length, color: "text-foreground" },
          { label: "Completate", value: completedCount, color: "text-success" },
          { label: "Template", value: templateSections.length, color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-card p-4">
          <button className="w-full rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
            Esporta SGQ
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-4">
        Aggiungi sezioni QMS
      </h2>
      <div className="grid md:grid-cols-2 gap-2 mb-8">
        {templateSections
          .filter((t) => !sections.find((s) => s.title === t.title))
          .map((t) => (
            <button
              key={t.id}
              onClick={() => addSection(t)}
              className="rounded-lg border border-border px-4 py-2.5 text-xs text-left text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
            >
              {t.title}{" "}
              <span className="text-muted-foreground/50">({t.art})</span>
            </button>
          ))}
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border bg-card p-5 ${
              s.completed ? "border-success/30" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                  {s.art}
                </span>
                <button
                  onClick={() => toggle(s.id)}
                  className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                    s.completed
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {s.completed ? "OK" : "Bozza"}
                </button>
                <button
                  onClick={() => removeSection(s.id)}
                  className="text-muted-foreground hover:text-danger transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <textarea
              value={s.content}
              onChange={(e) => updateContent(s.id, e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Descrivi policy, procedure e istruzioni per questa sezione..."
              rows={3}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
