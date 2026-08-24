"use client";

import { useEffect } from "react";
import { isFinalExportBlocked } from "@/lib/deontology/deliverable-gate";
import { useT } from "@/i18n/LocaleProvider";

/**
 * Gate deliverable universale (montato una volta nella dashboard).
 *
 * Quando NEXT_PUBLIC_DELIVERABLE_GATE=on (accesso cliente), impedisce il
 * self-serve del deliverable finale su TUTTI i tool intercettando i due
 * meccanismi di export usati in app: window.print() e i link/anchor con
 * attributo `download` (pattern createElement("a") + a.click()).
 *
 * Default OFF: l'effetto è nullo (l'Avvocato titolare esporta normalmente).
 * La cornice "bozza interna di lavorazione" resta comunque sempre visibile via
 * AIOutputLabel ed ExportFooter, a prescindere da questo gate.
 */
export default function DeliverableGateGuard() {
  const t = useT("deontology");
  const msg = t("export_gated");

  useEffect(() => {
    if (!isFinalExportBlocked()) return;

    const origPrint = window.print;
    const origClick = HTMLAnchorElement.prototype.click;

    window.print = function () {
      window.alert(msg);
    };
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.hasAttribute("download")) {
        window.alert(msg);
        return;
      }
      return origClick.apply(this);
    };

    return () => {
      window.print = origPrint;
      HTMLAnchorElement.prototype.click = origClick;
    };
  }, [msg]);

  return null;
}
