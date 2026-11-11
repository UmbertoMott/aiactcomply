import { PlanSelector } from "@/components/billing/PlanSelector";
import { createClient } from "@/lib/supabase/server";
import { getPurchasesForEmail, ACCESS_STATUSES, type Purchase } from "@/lib/billing/purchases";
import { fmtAmount, fmtDate } from "@/lib/billing/format";
import { openBillingPortal } from "./actions";
import WithdrawalButton from "./WithdrawalButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  active:    { label: "Attivo",            bg: "#ecfdf5", fg: "#065f46" },
  trialing:  { label: "Attivo",            bg: "#ecfdf5", fg: "#065f46" },
  past_due:  { label: "Pagamento in sospeso", bg: "#fffbeb", fg: "#92400e" },
  canceled:  { label: "Disdetto",          bg: "#f1f5f9", fg: "#475569" },
  withdrawn: { label: "Recesso esercitato", bg: "#f1f5f9", fg: "#475569" },
};

async function loadPurchases(): Promise<{ purchases: Purchase[]; now: number }> {
  const now = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { purchases: [], now };
    return { purchases: await getPurchasesForEmail(user.email), now };
  } catch (e) {
    console.warn("[BILLING] Acquisti non caricati:", e);
    return { purchases: [], now };
  }
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const { purchases, now } = await loadPurchases();
  const { portal } = await searchParams;
  const hasCustomer = purchases.some((p) => p.stripe_customer_id);

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="mb-1" style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.5px", color: "#0D1016" }}>
        Fatturazione
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "#0D1016" }}>
        Il tuo acquisto, le fatture e il diritto di recesso.
      </p>

      {portal === "unavailable" && (
        <div className="mb-4 rounded-lg px-4 py-2.5 text-[12px]" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
          La gestione dei pagamenti non è disponibile in questo momento. Scrivi a connect@regulaeos.com.
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="rounded-lg p-5 mb-4" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
          <h2 className="text-[13px] font-semibold mb-3" style={{ color: "#0D1016" }}>Piano attivo</h2>
          <PlanSelector />
        </div>
      ) : (
        purchases.map((p) => {
          const st = STATUS_LABEL[p.status] ?? { label: p.status, bg: "#f1f5f9", fg: "#475569" };
          const withdrawalOpen =
            !p.withdrawal_requested_at &&
            !!p.withdrawal_deadline &&
            new Date(p.withdrawal_deadline).getTime() > now &&
            ACCESS_STATUSES.includes(p.status);
          return (
            <section key={p.id} className="rounded-lg p-5 mb-4" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold" style={{ color: "#0D1016" }}>{p.product_label}</h2>
                  <p className="text-[12px]" style={{ color: "rgba(0,0,0,0.5)" }}>Abbonamento mensile · tutto incluso</p>
                </div>
                <span className="text-[11px] font-medium rounded-full px-2.5 py-1 whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>
                  {st.label}
                </span>
              </div>

              <dl className="text-[13px] divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <Row k="Importo" v={`${fmtAmount(p)} al mese`} />
                <Row k="Data di acquisto" v={fmtDate(p.created_at)} />
                <Row k="Intestatario" v={p.customer_name ? `${p.customer_name} · ${p.email}` : p.email} />
                {p.withdrawal_requested_at && <Row k="Recesso richiesto il" v={fmtDate(p.withdrawal_requested_at)} />}
              </dl>

              {(p.invoice_url || p.invoice_pdf) && (
                <div className="flex flex-wrap gap-4 mt-4 text-[13px]">
                  {p.invoice_url && <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "#0D1016" }}>Vedi la fattura</a>}
                  {p.invoice_pdf && <a href={p.invoice_pdf} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "#0D1016" }}>Scarica PDF</a>}
                </div>
              )}

              {/* Diritto di recesso */}
              <div className="mt-5 rounded-lg p-4" style={{ background: "#fafaf9", border: "1px solid rgba(0,0,0,0.06)" }}>
                <h3 className="text-[13px] font-semibold mb-1.5" style={{ color: "#0D1016" }}>Diritto di recesso</h3>
                {p.withdrawal_requested_at ? (
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(0,0,0,0.6)" }}>
                    Hai esercitato il recesso. L&rsquo;abbonamento è annullato e ti rimborseremo entro 14 giorni
                    dalla richiesta, con lo stesso mezzo di pagamento. Ti abbiamo inviato la conferma via email.
                  </p>
                ) : withdrawalOpen ? (
                  <>
                    <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: "rgba(0,0,0,0.6)" }}>
                      Se hai acquistato come consumatore puoi recedere senza indicare il motivo entro il{" "}
                      <strong style={{ color: "#0D1016" }}>{fmtDate(p.withdrawal_deadline!, false)}</strong>{" "}
                      (14 giorni dall&rsquo;acquisto, artt. 52 ss. D.Lgs. 206/2005). L&rsquo;abbonamento viene
                      annullato subito e ti rimborsiamo entro 14 giorni.
                    </p>
                    <WithdrawalButton purchaseId={p.id} />
                  </>
                ) : (
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(0,0,0,0.6)" }}>
                    Il termine di 14 giorni per il recesso è scaduto
                    {p.withdrawal_deadline ? ` il ${fmtDate(p.withdrawal_deadline, false)}` : ""}. Puoi comunque
                    disdire l&rsquo;abbonamento in qualsiasi momento, senza penali.
                  </p>
                )}
              </div>
            </section>
          );
        })
      )}

      <div className="rounded-lg p-5 space-y-3" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
        <h2 className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>Pagamenti, fatture e disdetta</h2>
        {hasCustomer ? (
          <>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "rgba(0,0,0,0.6)" }}>
              Nel portale sicuro di Stripe puoi scaricare tutte le fatture, cambiare il metodo di pagamento
              e disdire l&rsquo;abbonamento (resta attivo fino alla fine del mese già pagato).
            </p>
            <form action={openBillingPortal}>
              <button type="submit" className="inline-flex items-center rounded-full px-5 py-2.5 text-[13px] font-medium" style={{ background: "#0D1016", color: "#fff" }}>
                Gestisci su Stripe
              </button>
            </form>
          </>
        ) : (
          <p className="text-[13px]" style={{ color: "#0D1016" }}>
            Nessun pagamento associato a questo account. Per assistenza scrivi a connect@regulaeos.com.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt style={{ color: "rgba(0,0,0,0.5)" }}>{k}</dt>
      <dd className="text-right" style={{ color: "#0D1016" }}>{v}</dd>
    </div>
  );
}
