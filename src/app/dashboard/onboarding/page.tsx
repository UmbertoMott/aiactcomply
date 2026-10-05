import { redirect } from "next/navigation";

// Il ruolo si determina per ciascun sistema nell'inventario (Passo 2): l'onboarding separato è stato ritirato.
export default function OnboardingPage() {
  redirect("/dashboard/tools/inventory");
}
