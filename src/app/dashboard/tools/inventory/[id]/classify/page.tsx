"use client";
// Classificazione guidata di un sistema dell'inventario: Ruolo → Rischio → Obblighi.
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClassifyWizard from "@/components/obligations/ClassifyWizard";
import { loadInventory, type AISystem } from "@/lib/inventory/ai-system";
import { saveAssessment } from "@/lib/inventory/classifier-bridge";

const T = { text: "#0D1016", muted: "#0D1016", bg: "#FAFAF9" } as const;

export default function ClassifyPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [system, setSystem] = useState<AISystem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const s = loadInventory().find(x => x.id === id);
    if (!s) { setNotFound(true); return; }
    setSystem(s);
  }, [id]);

  if (notFound) return (
    <div style={{ padding: 48 }}>
      <p style={{ color: T.muted, fontSize: 13 }}>Sistema non trovato. <Link href="/dashboard/tools/inventory" style={{ color: T.text, fontWeight: 600 }}>Torna all&apos;inventario</Link></p>
    </div>
  );
  if (!system) return null;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "24px 28px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href={`/dashboard/tools/inventory/${system.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: T.muted, textDecoration: "none", marginBottom: 16 }}>
          <ArrowLeft size={13} /> {system.name}
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 4px", letterSpacing: "-0.4px" }}>Classifica il sistema</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 18px", lineHeight: 1.5 }}>
          Rispondi a domande sui fatti: ruolo e rischio li ricava la piattaforma dal Regolamento (UE) 2024/1689, come modificato dal Regolamento (UE) 2026/1744 (Omnibus digitale). Alla fine trovi solo gli obblighi che riguardano questo sistema.
        </p>
        <ClassifyWizard
          key={system.id}
          initialRole={system.roleAnswers}
          initialRisk={system.riskAnswers}
          onPersist={s => saveAssessment(system.id, s)}
          onFinish={s => { saveAssessment(system.id, s); router.push(`/dashboard/tools/inventory/${system.id}`); }}
          finishLabel="Salva e vai alla scheda del sistema"
        />
      </div>
    </div>
  );
}
