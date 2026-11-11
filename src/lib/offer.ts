/**
 * Offerta di lancio — 9 €/mese tutto incluso.
 * Per cambiare scadenza o prezzo modificare SOLO questo file.
 * Il link di pagamento è un Stripe Payment Link impostato in
 * NEXT_PUBLIC_STRIPE_PAYMENT_LINK (variabile d'ambiente, es. su Vercel).
 */
export const OFFER = {
  priceEur: 9,
  // Domenica 15 novembre 2026, ore 23:59:59 ora italiana (CET = UTC+1)
  deadlineIso: "2026-11-15T23:59:59+01:00",
  deadlineLabel: "domenica 15 novembre 2026, ore 23:59",
  paymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "",
};
