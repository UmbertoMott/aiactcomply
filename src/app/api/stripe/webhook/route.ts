import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { recordCheckoutSession, updateSubscriptionStatus } from "@/lib/billing/purchases";

export const runtime = "nodejs";

/**
 * Webhook Stripe. Da configurare su Stripe → Sviluppatori → Webhook:
 *   URL:    https://www.regulaeos.com/api/stripe/webhook
 *   Eventi: checkout.session.completed, checkout.session.async_payment_succeeded,
 *           customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return new Response("Stripe non configurato", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Firma mancante", { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Firma non valida", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await recordCheckoutSession(event.data.object);
        break;
      case "customer.subscription.updated":
        await updateSubscriptionStatus(event.data.object.id, event.data.object.status);
        break;
      case "customer.subscription.deleted":
        await updateSubscriptionStatus(event.data.object.id, "canceled");
        break;
    }
  } catch (e) {
    console.error("[STRIPE WEBHOOK]", event.type, e);
    // 500 → Stripe ritenta automaticamente
    return new Response("Errore interno", { status: 500 });
  }

  return Response.json({ received: true });
}
