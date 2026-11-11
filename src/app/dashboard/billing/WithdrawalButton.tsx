"use client";

import { useState, useTransition } from "react";
import { requestWithdrawal } from "./actions";

export default function WithdrawalButton({ purchaseId }: { purchaseId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full px-4 py-2 text-[12.5px] font-medium"
        style={{ border: "1px solid rgba(0,0,0,0.2)", color: "#0D1016", background: "#fff" }}
      >
        Esercita il recesso
      </button>
    );
  }

  return (
    <div className="rounded-lg p-3" style={{ background: "#fff", border: "1px solid #fecaca" }}>
      <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: "#7f1d1d" }}>
        Con questa richiesta dichiari di recedere dal contratto. L&rsquo;abbonamento viene annullato
        subito e perdi l&rsquo;accesso all&rsquo;area riservata. Confermi?
      </p>
      {error && <p className="text-[12px] mb-2" style={{ color: "#b91c1c" }}>{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await requestWithdrawal(purchaseId);
              if (!res.ok) setError(res.error ?? "Errore imprevisto.");
            })
          }
          className="rounded-full px-4 py-2 text-[12.5px] font-medium"
          style={{ background: "#b91c1c", color: "#fff", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Invio in corso…" : "Sì, recedo dal contratto"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => { setConfirming(false); setError(""); }}
          className="rounded-full px-4 py-2 text-[12.5px]"
          style={{ border: "1px solid rgba(0,0,0,0.15)", color: "#0D1016", background: "#fff" }}
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
