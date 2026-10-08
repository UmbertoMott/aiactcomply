"use client";
// Per i clienti: pagina pubblica, passaporto e questionari leggono gli stessi dati del dossier,
// quindi stanno in un'unica pagina con tre schede.

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TrustCenterTool from "@/components/clients/TrustCenterTool";
import TrustPassportTool from "@/components/clients/TrustPassportTool";
import QuestionnaireTool from "@/components/clients/QuestionnaireTool";
import { useT } from "@/i18n/LocaleProvider";

const TABS = ["questionnaire", "passport", "trust-center"] as const;
type Tab = typeof TABS[number];

function ClientsHub() {
  const t = useT("clients");
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "questionnaire";

  return (
    <div>
      <div className="flex gap-1 p-1 rounded-lg w-fit mb-5" style={{ background: "rgba(0,0,0,0.04)" }}>
        {TABS.map((id) => (
          <button key={id} type="button" onClick={() => router.replace(`/dashboard/tools/clients?tab=${id}`)}
            className="text-[13px] font-medium px-4 py-1.5 rounded-lg"
            style={{
              background: tab === id ? "#fff" : "transparent",
              color: tab === id ? "#0D1016" : "rgba(0,0,0,0.5)",
              boxShadow: tab === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
            }}>
            {t(`tab_${id.replace("-", "_")}`)}
          </button>
        ))}
      </div>
      {tab === "questionnaire" && <QuestionnaireTool />}
      {tab === "passport" && <TrustPassportTool />}
      {tab === "trust-center" && <TrustCenterTool />}
    </div>
  );
}

export default function ClientsPage() {
  return <Suspense><ClientsHub /></Suspense>;
}
