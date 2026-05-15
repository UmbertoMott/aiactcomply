"use client";

import { useState } from "react";
import { FileText, Brain, Lightbulb, ChevronRight } from "lucide-react";
import { generateExplainCard } from "@/lib/simulation/red-team";

const FEATURES = [
  { name: "eta_candidato", value: 1.82, label: "Età del candidato", decision: "Idoneo" },
  { name: "esperienza_precedente", value: 2.45, label: "Anni di esperienza", decision: "Idoneo" },
  { name: "titolo_studio", value: 1.15, label: "Livello di istruzione", decision: "Idoneo" },
  { name: "genere", value: -1.92, label: "Genere del candidato", decision: "Idoneo" },
  { name: "cap_residenza", value: -0.85, label: "CAP di residenza", decision: "Idoneo" },
  { name: "settore_precedente", value: 0.65, label: "Settore lavorativo", decision: "Idoneo" },
];

export default function TransparencyPage() {
  const [selectedFeature, setSelectedFeature] = useState<typeof FEATURES[number] | null>(null);
  const [card, setCard] = useState<ReturnType<typeof generateExplainCard> | null>(null);

  function explainFeature(f: typeof FEATURES[number]) {
    setSelectedFeature(f);
    setCard(generateExplainCard(f.label, f.value, f.decision));
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">AI Explain Cards (Art. 13)</h1>
      <p className="text-sm text-muted-foreground mb-8">Traduzione di SHAP/LIME values in spiegazioni testuali semplici. Ogni decisione è spiegabile.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">SHAP Values — Contributo features</h2>
          </div>
          <div className="divide-y divide-border/50">
            {FEATURES.map((f) => (
              <div
                key={f.name}
                className={`px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${selectedFeature?.name === f.name ? "bg-muted/50" : ""}`}
                onClick={() => explainFeature(f)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{f.label}</span>
                  <span className={`text-xs font-mono font-bold ${f.value > 0 ? "text-success" : "text-danger"}`}>
                    {f.value > 0 ? "+" : ""}{f.value.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${f.value > 0 ? "bg-success" : "bg-danger"}`}
                    style={{ width: `${Math.min(Math.abs(f.value) * 35, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {card && selectedFeature ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Explain Card</h2>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4 mb-4">
                <p className="text-sm text-foreground leading-relaxed">{card.plainText}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                    card.impact === "positive" ? "bg-success/10 text-success" : card.impact === "negative" ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                  }`}>{card.impact === "positive" ? "Impatto positivo" : "Impatto negativo"}</span>
                  <span className="text-[10px] text-muted-foreground">Decisione: {selectedFeature.decision}</span>
                </div>
              </div>
              <div className="space-y-2 text-[10px] text-muted-foreground">
                <p><strong className="text-foreground">Feature:</strong> {selectedFeature.name}</p>
                <p><strong className="text-foreground">SHAP value:</strong> {selectedFeature.value > 0 ? "+" : ""}{selectedFeature.value.toFixed(2)}</p>
                <p><strong className="text-foreground">Modello:</strong> Random Forest Classifier (85M params)</p>
                <p><strong className="text-foreground">Metodo:</strong> SHAP Kernel Explainer</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Clicca una feature per vedere la spiegazione.</p>
              <p className="text-[10px] text-muted-foreground mt-2">Art. 86 — Diritto alla spiegazione dei singoli processi decisionali.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
