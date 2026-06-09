"use client";

import { useState, useEffect } from "react";
import { History, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { listVersions, type VersionSnapshot } from "@/lib/projects/version-history";

interface VersionHistoryPanelProps {
  toolId:    string;
  onRestore: (data: unknown) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("it-IT", {
      day:    "2-digit",
      month:  "short",
      hour:   "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function VersionHistoryPanel({ toolId, onRestore }: VersionHistoryPanelProps) {
  const [expanded, setExpanded]     = useState(false);
  const [versions, setVersions]     = useState<VersionSnapshot[]>([]);
  const [restoring, setRestoring]   = useState<string | null>(null);

  useEffect(() => {
    if (expanded) setVersions(listVersions(toolId));
  }, [expanded, toolId]);

  function handleRestore(v: VersionSnapshot) {
    setRestoring(v.id);
    try {
      onRestore(v.data);
    } finally {
      setRestoring(null);
      setExpanded(false);
    }
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "rgba(0,0,0,0.07)", background: "#fff" }}
    >
      {/* Header — sempre visibile */}
      <button
        onClick={() => {
          setExpanded((v) => !v);
          if (!expanded) setVersions(listVersions(toolId));
        }}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-black/3 transition-colors"
      >
        <History className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.4)" }} />
        <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
          Cronologia versioni
        </span>
        {versions.length > 0 && !expanded && (
          <span
            className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(13,16,22,0.07)", color: "rgba(13,16,22,0.5)" }}
          >
            {versions.length}
          </span>
        )}
        <span className="ml-auto" style={{ color: "rgba(0,0,0,0.3)" }}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {/* Lista versioni */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          {versions.length === 0 ? (
            <div className="px-4 py-4 text-center text-[11px]" style={{ color: "rgba(0,0,0,0.3)" }}>
              Nessuna versione salvata ancora.<br />
              I salvataggi automatici appariranno qui ogni 30 secondi.
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/2 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: "#0D1016" }}>
                      {i === 0 ? "Più recente" : v.label}
                    </div>
                    <div className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                      {formatDate(v.savedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(v)}
                    disabled={restoring === v.id}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-40"
                    style={{ borderColor: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.55)" }}
                    title="Ripristina questa versione"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Ripristina
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
