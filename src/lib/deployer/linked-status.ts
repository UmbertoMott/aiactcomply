// Stato degli obblighi del deployer che si adempiono in un altro tool:
// il dettaglio Art. 26 li legge da lì invece di richiederli.

import { readFromStorage } from "@/lib/dossier/storage-schema";
import type { OversightResult, LogvaultResult, FRIAResult, EUDBResult } from "@/lib/dossier/storage-schema";
import type { AISystem } from "@/lib/inventory/ai-system";
import { determineRoles, assessRisk, computeObligations } from "@/lib/obligations/engine";

export type LinkedState = "ok" | "pending" | "not_required";

export interface LinkedStatus {
  state: LinkedState;
  summary: string;
  href: string;
  linkLabel: string;
}

/** Id degli obblighi del sistema secondo il motore (null se il sistema non è valutato). */
function obligationIds(sys: AISystem): Set<string> | null {
  if (!sys.roleAnswers || !sys.riskAnswers) return null;
  const res = computeObligations(sys.roleAnswers, determineRoles(sys.roleAnswers), assessRisk(sys.riskAnswers), sys.riskAnswers);
  return new Set(res.obligations.map((o) => o.id));
}

export function linkedDeployerStatus(sys: AISystem): {
  oversight: LinkedStatus;
  logs: LinkedStatus;
  fria: LinkedStatus;
  eudb: LinkedStatus;
} {
  const ids = obligationIds(sys);

  // Art. 26(2) — dal tool Sorveglianza umana
  const ov = readFromStorage<OversightResult>("oversight");
  const oversight: LinkedStatus = ov
    ? {
        state: ov.responsiblePersons.length > 0 ? "ok" : "pending",
        summary: ov.responsiblePersons.length > 0
          ? `Persone o ruoli incaricati: ${ov.responsiblePersons.join(", ")}`
          : "Misure registrate, ma nessuna persona incaricata indicata.",
        href: "/dashboard/tools/oversight", linkLabel: "Apri Sorveglianza umana",
      }
    : { state: "pending", summary: "Non ancora indicato chi esercita la sorveglianza umana.", href: "/dashboard/tools/oversight", linkLabel: "Apri Sorveglianza umana" };

  // Art. 26(6) — dal Registro dei log
  const lv = readFromStorage<LogvaultResult>("logvault");
  const months = lv ? Math.round(lv.retentionDays / 30) : 0;
  const logs: LinkedStatus = {
    state: lv && lv.retentionDays >= 180 ? "ok" : "pending",
    summary: !lv ? "Periodo di conservazione dei log non ancora indicato."
      : lv.retentionDays >= 180 ? `Conservazione indicata: circa ${months} mesi.`
      : lv.retentionDays > 0 ? `Conservazione indicata: circa ${months} mesi, sotto il minimo di 6 mesi.`
      : "Periodo di conservazione non indicato.",
    href: "/dashboard/tools/logvault", linkLabel: "Apri Registro dei log",
  };

  // Art. 27 — FRIA
  const friaNeeded = ids ? ids.has("art27") : null;
  const fr = readFromStorage<FRIAResult>("fria");
  const fria: LinkedStatus = friaNeeded === false
    ? { state: "not_required", summary: "In base alla valutazione del sistema, la FRIA non è richiesta (Art. 27(1)).", href: "/dashboard/tools/fria", linkLabel: "Apri FRIA" }
    : {
        state: fr?.completedAt ? "ok" : "pending",
        summary: fr?.completedAt
          ? `FRIA salvata il ${new Date(fr.completedAt).toLocaleDateString("it-IT")}${fr.approvedBy ? `, approvata da ${fr.approvedBy}` : ""}.`
          : friaNeeded ? "FRIA richiesta e non ancora completata." : "Valuta il sistema nell'inventario per sapere se la FRIA è richiesta.",
        href: "/dashboard/tools/fria", linkLabel: "Apri FRIA",
      };

  // Art. 26(8) e 49(3) — banca dati UE
  const eudbNeeded = ids ? ids.has("art26-8") : null;
  const eu = readFromStorage<EUDBResult>("eudb");
  const eudb: LinkedStatus = eudbNeeded === false
    ? { state: "not_required", summary: "Registrazione dell'uso non richiesta: si applica solo ai deployer che sono autorità pubbliche (Art. 26(8)).", href: "/dashboard/compliance-ops/eudb", linkLabel: "Apri Banca dati UE" }
    : {
        state: eu?.registration_number ? "ok" : "pending",
        summary: eu?.registration_number ? `Registrato con il numero ${eu.registration_number}.`
          : eudbNeeded ? "Registrazione dell'uso richiesta e non ancora effettuata." : "Valuta il sistema nell'inventario per sapere se la registrazione è richiesta.",
        href: "/dashboard/compliance-ops/eudb", linkLabel: "Apri Banca dati UE",
      };

  return { oversight, logs, fria, eudb };
}
