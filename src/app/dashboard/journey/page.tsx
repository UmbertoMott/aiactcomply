import { redirect } from "next/navigation";

// Il percorso in 4 passi (inventario → ruolo → rischio → obblighi) è ora nella Home.
export default function JourneyPage() {
  redirect("/dashboard");
}
