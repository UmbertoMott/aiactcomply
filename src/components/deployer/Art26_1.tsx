"use client";

// Art. 26(1) — Instructions for Use reader con AI insights — PROMPT BD

import React, { useState } from "react";
import { Upload, Check } from "lucide-react";
import type { DeployerRecord } from "@/types/deployer";
import { extractInstructionsInsights, type InstructionsInsights } from "@/app/dashboard/tools/deployer-dashboard/actions";

interface Props {
  record: DeployerRecord;
  onChange: (updater: (prev: DeployerRecord) => DeployerRecord) => void;
}

function InsightCard({
  title,
  items,
  icon,
  color,
}: {
  title: string;
  items: string[];
  icon: string;
  color: "orange" | "green" | "red";
}) {
  const colorMap = {
    orange: "text-orange-400 border-orange-800/40 bg-orange-950/20",
    green:  "text-green-400 border-green-800/40 bg-green-950/20",
    red:    "text-red-400 border-red-800/40 bg-red-950/20",
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <p className="text-xs font-semibold mb-2">
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Nessun elemento estratto.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-slate-300">• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Art26_1({ record, onChange }: Props) {
  const [insights, setInsights] = useState<InstructionsInsights | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [aiConfirmedLocal, setAiConfirmedLocal] = useState(false);

  async function handleAnalyze(file: File) {
    setIsAnalyzing(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = await extractInstructionsInsights(text);
      setInsights(result);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload istruzioni */}
      <div>
        <input
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={e => e.target.files?.[0] && handleAnalyze(e.target.files[0])}
          className="hidden"
          id="instructions-upload"
        />
        <label
          htmlFor="instructions-upload"
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-5 cursor-pointer hover:border-slate-600 transition-colors"
        >
          <Upload className="h-5 w-5 mb-2 text-slate-600" />
          <span className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            {fileName ? fileName : "Carica Instructions for Use (PDF, TXT, DOCX)"}
          </span>
          <span className="text-xs text-slate-600 mt-1">Analisi automatica con AI</span>
        </label>
      </div>

      {/* AI spinner */}
      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="animate-spin text-indigo-400">✦</span>
          Analisi in corso...
          <span className="text-xs text-slate-600">✦ AI — verifica e conferma</span>
        </div>
      )}

      {/* AI output */}
      {insights && !isAnalyzing && (
        <div className="space-y-3">
          <p className="text-xs text-yellow-400 font-medium">
            ✦ AI — verifica e conferma prima di procedere
          </p>
          <InsightCard
            title="Limiti operativi dichiarati"
            items={insights.operationalLimits}
            icon="⚠"
            color="orange"
          />
          <InsightCard
            title="Parametri di input corretti"
            items={insights.correctInputParams}
            icon="✓"
            color="green"
          />
          <InsightCard
            title="Procedura sospensione d&apos;emergenza"
            items={insights.emergencyStopProcedure}
            icon="⊘"
            color="red"
          />

          {!aiConfirmedLocal && (
            <button
              onClick={() => {
                setAiConfirmedLocal(true);
                onChange(prev => ({
                  ...prev,
                  instructionsRead: true,
                  instructionsReadAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }));
              }}
              className="w-full rounded-lg bg-black border border-slate-700 text-slate-300
                         hover:bg-slate-900 hover:border-slate-600 transition-colors
                         py-2.5 text-sm font-medium"
            >
              Conferma lettura e accettazione istruzioni
            </button>
          )}
        </div>
      )}

      {/* Stato lettura confermata */}
      {record.instructionsRead && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Check size={12} />
          Lette il{" "}
          {new Date(record.instructionsReadAt!).toLocaleDateString("it-IT", {
            day: "2-digit", month: "long", year: "numeric",
          })}
        </div>
      )}

      {/* Conferma manuale senza upload */}
      {!record.instructionsRead && !insights && (
        <button
          onClick={() =>
            onChange(prev => ({
              ...prev,
              instructionsRead: true,
              instructionsReadAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
          }
          className="text-xs text-slate-500 hover:text-slate-400 underline transition-colors"
        >
          Conferma lettura manuale (senza analisi AI)
        </button>
      )}
    </div>
  );
}
