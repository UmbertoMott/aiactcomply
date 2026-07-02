import { PlanSelector } from "@/components/billing/PlanSelector";

export default function BillingPage() {
  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1
        className="mb-1"
        style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.5px", color: "#0D1016" }}
      >
        Fatturazione
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "rgba(0,0,0,0.45)" }}>
        Gestisci abbonamento, metodi di pagamento e fatture.
      </p>

      <div className="rounded-xl p-5 mb-4" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
        <h2 className="text-[14px] font-semibold mb-3" style={{ color: "#0D1016" }}>Piano attivo</h2>
        <PlanSelector />
      </div>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.5)" }}>
          Metodi di pagamento e fatture: in fase di sviluppo. Presto potrai gestirli da qui.
        </p>
      </div>
    </div>
  );
}
