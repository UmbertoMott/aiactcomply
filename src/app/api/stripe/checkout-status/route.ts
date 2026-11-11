import { getStripe } from "@/lib/stripe/server";
import { accountExists, recordCheckoutSession } from "@/lib/billing/purchases";

export const runtime = "nodejs";

/**
 * Stato del pagamento per la pagina /benvenuto.
 * GET ?session_id=cs_...  →  { state: "pending" | "preparing" | "ready" | "invalid", hasAccount?, email? }
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    return Response.json({ state: "invalid" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) return Response.json({ state: "preparing" });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return Response.json({ state: "invalid" }, { status: 404 });
  }

  if (session.status !== "complete" || (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) {
    return Response.json({ state: "pending" });
  }

  try {
    const purchase = await recordCheckoutSession(session);
    if (!purchase) return Response.json({ state: "preparing" });
    const hasAccount = await accountExists(purchase.email);
    return Response.json(
      { state: "ready", hasAccount, email: purchase.email },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[CHECKOUT STATUS]", e);
    return Response.json({ state: "preparing" });
  }
}
