// Acquisti Stripe — solo lato server (usa la service-role key di Supabase).
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server-actions";
import { getStripe } from "@/lib/stripe/server";

export interface Purchase {
  id: string;
  stripe_session_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  email: string;
  customer_name: string | null;
  product_label: string;
  amount_total: number | null;
  currency: string | null;
  status: string;
  invoice_url: string | null;
  invoice_pdf: string | null;
  withdrawal_deadline: string | null;
  withdrawal_requested_at: string | null;
  created_at: string;
}

/** Stati che danno accesso all'area riservata. */
export const ACCESS_STATUSES = ["active", "trialing", "past_due"];

const WITHDRAWAL_DAYS = 14;

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

/**
 * Registra (in modo idempotente) una Checkout Session pagata.
 * Chiamata dal webhook Stripe e, come rete di sicurezza, dalla pagina di benvenuto.
 * Ritorna la riga salvata, oppure null se la sessione non risulta pagata.
 */
export async function recordCheckoutSession(session: Stripe.Checkout.Session): Promise<Purchase | null> {
  if (session.status !== "complete") return null;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return null;
  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!email) return null;

  const admin = createAdminClient();

  const existing = await admin.from("purchases").select("*").eq("stripe_session_id", session.id).maybeSingle();
  if (existing.data) return existing.data as Purchase;

  // Fattura (best effort: per gli abbonamenti Stripe la crea automaticamente)
  let invoice_url: string | null = null;
  let invoice_pdf: string | null = null;
  const invoiceId = idOf(session.invoice as string | { id: string } | null);
  const stripe = getStripe();
  if (invoiceId && stripe) {
    try {
      const inv = await stripe.invoices.retrieve(invoiceId);
      invoice_url = inv.hosted_invoice_url ?? null;
      invoice_pdf = inv.invoice_pdf ?? null;
    } catch (e) {
      console.warn("[BILLING] Fattura non recuperata:", e);
    }
  }

  const createdAt = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000);
  const deadline = new Date(createdAt.getTime() + WITHDRAWAL_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from("purchases")
    .upsert(
      {
        stripe_session_id: session.id,
        stripe_customer_id: idOf(session.customer as string | { id: string } | null),
        stripe_subscription_id: idOf(session.subscription as string | { id: string } | null),
        email,
        customer_name: session.customer_details?.name ?? null,
        amount_total: session.amount_total,
        currency: session.currency,
        status: "active",
        invoice_url,
        invoice_pdf,
        withdrawal_deadline: deadline.toISOString(),
        created_at: createdAt.toISOString(),
      },
      { onConflict: "stripe_session_id", ignoreDuplicates: false },
    )
    .select("*")
    .single();

  if (error) {
    console.error("[BILLING] Salvataggio acquisto fallito:", error.message);
    throw error;
  }
  return data as Purchase;
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
  const admin = createAdminClient();
  // Un recesso già esercitato resta tale anche quando Stripe notifica la cancellazione.
  await admin
    .from("purchases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .neq("status", "withdrawn");
}

export async function getPurchasesForEmail(email: string): Promise<Purchase[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("purchases")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false });
  return (data ?? []) as Purchase[];
}

export async function hasActivePurchase(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("purchases")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .in("status", ACCESS_STATUSES)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn("[BILLING] Verifica acquisto non riuscita:", e);
    return false;
  }
}

export async function accountExists(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000, page });
    if (error) throw error;
    const users = data?.users ?? [];
    if (users.some((u) => u.email?.toLowerCase() === target)) return true;
    if (users.length < 1000) return false;
  }
  return false;
}
