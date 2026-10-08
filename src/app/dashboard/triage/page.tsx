"use client";
// Triage: verifica rapida di un caso con le stesse domande e lo stesso motore della
// classificazione guidata (lib/obligations/engine.ts). Il risultato si può salvare
// come sistema nell'inventario.
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ClassifyWizard, { type ClassifyState } from "@/components/obligations/ClassifyWizard";
import { addSystem, nextSystemId } from "@/lib/inventory/ai-system";
import { saveAssessment } from "@/lib/inventory/classifier-bridge";
import { writeToStorage, type ProhibitedCheckResult } from "@/lib/dossier/storage-schema";
import { ART5_PRACTICES } from "@/lib/obligations/engine";

const T = { text: "#0D1016", muted: "#0D1016", border: "rgba(0,0,0,0.08)", bg: "#FAFAF9" } as const;

/** Esito della verifica Art. 5, letto da dossier e valutazione di conformità */
function saveArt5Check({ rk, risk }: ClassifyState) {
  if (!rk.aiDefinition && !(rk.scopeExclusions?.length)) return;
  const flagged = rk.art5 ?? [];
  writeToStorage<ProhibitedCheckResult>("prohibited", {
    answers: Object.fromEntries(ART5_PRACTICES.map(p => [p.letter, risk.prohibited.includes(p.letter) ? "yes" : "no"])),
    verdict: risk.prohibited.length > 0 ? "violation" : flagged.length > 0 ? "conditional" : "clear",
    violatedChecks: risk.prohibited.map(l => `Art. 5(1)(${l})`),
    completedAt: new Date().toISOString(),
  });
}

export default function TriagePage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function saveToInventory(s: ClassifyState) {
    saveArt5Check(s);
    const id = nextSystemId();
    const now = new Date().toISOString();
    addSystem({
      id, name: name.trim(), owner: "", description: "", status: "in_production", euNexus: true,
      role: null, roleBasis: "", tier: "unclassified", tierBasis: "", dualRoleFlag: false,
      obligationsAssessed: false, obligationsNote: "",
      nextReview: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      reviewTrigger: "on substantial modification or annually",
      completedObligations: [], createdAt: now, updatedAt: now, source: "manual",
    });
    saveAssessment(id, s);
    router.push(`/dashboard/tools/inventory/${id}`);
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "24px 28px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 4px", letterSpacing: "-0.4px" }}>Triage</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 18px", lineHeight: 1.5 }}>
          Verifica rapida di un caso: ruolo, livello di rischio (comprese le pratiche vietate dell&apos;Art. 5) e obblighi, secondo il Regolamento (UE) 2024/1689 come modificato dal Regolamento (UE) 2026/1744. Sono le stesse domande della classificazione nell&apos;inventario: alla fine puoi salvare il caso come sistema.
        </p>
        <ClassifyWizard
          onPersist={saveArt5Check}
          onFinish={saveToInventory}
          finishLabel="Salva nell'inventario"
          finishDisabled={name.trim().length === 0}
          finishExtra={
            <div style={{ background: "white", border: `1px solid ${T.border}`, borderRadius: 8, padding: "16px 18px", marginTop: 12 }}>
              <label htmlFor="triage-name" style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>
                Nome del sistema
              </label>
              <input
                id="triage-name" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Software di selezione dei CV"
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}
              />
              <p style={{ fontSize: 11, color: T.muted, margin: "6px 0 0" }}>
                Salvandolo, il sistema entra nell&apos;inventario con questa classificazione e diventa quello di riferimento per gli altri tool.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
