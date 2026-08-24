"use client";

import { Lock } from "lucide-react";
import { isFinalExportBlocked } from "@/lib/deontology/deliverable-gate";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Avvolge i controlli di export/download del DELIVERABLE FINALE.
 *
 * - Gate OFF (default, uso professionale dell'Avvocato): renderizza i children
 *   (i normali bottoni di export) invariati.
 * - Gate ON (accesso cliente, NEXT_PUBLIC_DELIVERABLE_GATE=on): sostituisce i
 *   controlli con l'avviso "il deliverable finale è consegnato dall'Avvocato
 *   dopo revisione", impedendo il self-serve.
 *
 * La cornice "bozza interna di lavorazione" resta comunque su AIOutputLabel ed
 * ExportFooter a prescindere dal gate.
 */
export default function FinalExportGate({ children }: { children: React.ReactNode }) {
  const t = useT("deontology");

  if (!isFinalExportBlocked()) return <>{children}</>;

  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11px]"
      style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}
    >
      <Lock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{t("export_gated")}</span>
    </div>
  );
}
