import { redirect } from "next/navigation";

// Registro e segnalazione degli incidenti gravi (Art. 73) sono ora nel Post-market.
export default function IncidentPage() {
  redirect("/dashboard/post-market?tab=incidents");
}
