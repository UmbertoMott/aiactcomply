export function fmtAmount(p: { amount_total: number | null; currency: string | null }) {
  if (p.amount_total == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: (p.currency ?? "eur").toUpperCase() }).format(p.amount_total / 100);
}

export function fmtDate(iso: string, withTime = true) {
  return new Date(iso).toLocaleString("it-IT", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Europe/Rome",
  });
}
