"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-actions";
import { getStripe } from "@/lib/stripe/server";
import { getPurchasesForEmail } from "@/lib/billing/purchases";
import { fmtAmount, fmtDate } from "@/lib/billing/format";
import { sendWithdrawalEmails } from "@/lib/auth/email";

async function currentEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host") ?? "www.regulaeos.com";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

/** Apre il portale clienti Stripe (fatture, metodo di pagamento, disdetta). */
export async function openBillingPortal(): Promise<void> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const stripe = getStripe();
  const purchase = (await getPurchasesForEmail(email)).find((p) => p.stripe_customer_id);
  if (!stripe || !purchase?.stripe_customer_id) redirect("/dashboard/billing?portal=unavailable");

  const session = await stripe.billingPortal.sessions.create({
    customer: purchase.stripe_customer_id,
    return_url: `${await siteUrl()}/dashboard/billing`,
    locale: "it",
  });
  redirect(session.url);
}

/** Esercizio del diritto di recesso entro 14 giorni dall'acquisto. */
export async function requestWithdrawal(purchaseId: string): Promise<{ ok: boolean; error?: string }> {
  const email = await currentEmail();
  if (!email) return { ok: false, error: "Sessione scaduta: accedi di nuovo." };

  const purchase = (await getPurchasesForEmail(email)).find((p) => p.id === purchaseId);
  if (!purchase) return { ok: false, error: "Acquisto non trovato." };
  if (purchase.withdrawal_requested_at) return { ok: false, error: "Hai già esercitato il recesso per questo acquisto." };
  if (!purchase.withdrawal_deadline || Date.now() > new Date(purchase.withdrawal_deadline).getTime()) {
    return { ok: false, error: "Il termine di 14 giorni per il recesso è scaduto. Puoi comunque disdire l'abbonamento." };
  }

  const stripe = getStripe();
  if (purchase.stripe_subscription_id && stripe) {
    try {
      await stripe.subscriptions.cancel(purchase.stripe_subscription_id);
    } catch (e) {
      console.error("[RECESSO] Annullamento abbonamento non riuscito:", e);
      return { ok: false, error: "Non siamo riusciti a completare la richiesta. Riprova o scrivi a connect@regulaeos.com." };
    }
  }

  const requestedAt = new Date().toISOString();
  const admin = createAdminClient();
  await admin
    .from("purchases")
    .update({ withdrawal_requested_at: requestedAt, status: "withdrawn", updated_at: requestedAt })
    .eq("id", purchase.id);

  try {
    await sendWithdrawalEmails({
      email,
      name: purchase.customer_name,
      product: purchase.product_label,
      amount: fmtAmount(purchase),
      purchasedAt: fmtDate(purchase.created_at),
      requestedAt: fmtDate(requestedAt),
      sessionId: purchase.stripe_session_id,
    });
  } catch (e) {
    console.error("[RECESSO] Email non inviata:", e);
  }

  revalidatePath("/dashboard/billing");
  return { ok: true };
}
