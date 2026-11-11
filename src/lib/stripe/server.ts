import Stripe from "stripe";

/** Client Stripe lato server. null se STRIPE_SECRET_KEY non è configurata. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
