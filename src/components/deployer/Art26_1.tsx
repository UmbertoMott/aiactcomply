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
    green:  "text-green-700 border-green-200 bg-green-50",
    red:    "text-red-600 border-red-200 bg-red-50",
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <p className="text-[11px] font-semibold mb-2">
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-[#0D1016] italic">Nessun elemento estratto.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-[11px] text-[#0D1016]">• {item}</li>
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
          className="flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-lg p-5 cursor-pointer hover:border-black/25 transition-colors"
        >
          <Upload className="h-5 w-5 mb-2 text-[#0D1016]" />
          <span className="text-[13px] text-[#0D1016] hover:text-[#0D1016] transition-colors">
            {fileName ? fileName : "Carica Instructions for Use (PDF, TXT, DOCX)"}
          </span>
          <span className="text-[11px] text-[#0D1016] mt-1">Analisi automatica con AI</span>
        </label>
      </div>

      {/* AI spinner */}
      {isAnalyzing && (
        <div className="flex items-center gap-2 text-[13px] text-[#0D1016]">
          <span className="animate-spin text-[#0D1016]">✦</span>
          Analisi in corso...
          <span className="text-[11px] text-[#0D1016]">✦ AI — verifica e conferma</span>
        </div>
      )}

      {/* AI output */}
      {insights && !isAnalyzing && (
        <div className="space-y-3">
          <p className="text-[11px] text-amber-700 font-medium">
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
              className="w-full rounded-lg bg-black border border-black/10 text-[#0D1016]
                         hover:bg-black/[0.03] hover:border-black/25 transition-colors
                         py-2.5 text-[13px] font-medium"
            >
              Conferma lettura e accettazione istruzioni
            </button>
          )}
        </div>
      )}

      {/* Stato lettura confermata */}
      {record.instructionsRead && (
        <div className="flex items-center gap-2 text-[11px] text-green-700">
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
          className="text-[11px] text-[#0D1016] hover:text-[#0D1016] underline transition-colors"
        >
          Conferma lettura manuale (senza analisi AI)
        </button>
      )}
    </div>
  );
}
